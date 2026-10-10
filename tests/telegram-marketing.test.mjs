import test from 'node:test';
import assert from 'node:assert/strict';
import {Marketing,campaignDay,validateUrl,slotId} from '../functions/activate-member/src/telegram/marketing.mjs';
import {contentHash} from '../functions/activate-member/src/telegram/marketing.mjs';
import fs from 'node:fs';

const NOW=Date.parse('2026-10-10T02:00:00Z');
const p=(id='p1')=>({$id:id,title:'Contoh '+id,category:'Foto AI',is_published:true,prompt_text:'Prompt unik untuk '+id,preview_url:'https://example.com/'+id+'.webp'});
function setup({gate=false,globalSend=false,existing=[]}={}){
 const db=new Map(),changes=[],sources=new Map([['p1',p('p1')],['p2',p('p2')],['p3',p('p3')]]);
 const store={
  async get(table,key){if(table==='scene_prompts'||table==='prompts')return sources.get(key)||null;return db.get(key)||null},
  async state(key){const row=db.get(key);return row?{...row,data:JSON.parse(row.payload||'{}')}:null},
  async list(table,filters=[],limit=50,cursor){
   const rows=table==='telegram_state'?[...db.values()]:[...sources.values()];
   let list=rows.filter(row=>filters.every(([op,key,value])=>op==='equal'?row[key]===value:true)).sort((a,b)=>a.$id.localeCompare(b.$id));
   if(cursor){const idx=list.findIndex(x=>x.$id===cursor);list=list.slice(idx+1)}
   return {rows:list.slice(0,limit).map(x=>({...x,...(x.payload?{data:JSON.parse(x.payload)}:{})})),total:list.length};
  },
  async putState(key,data,meta={}){
   const row={$id:key,kind:meta.kind||'settings',status:meta.status||'ready',payload:JSON.stringify(data),...meta};
   db.set(key,row);changes.push(['put',key]);return row
  },
  async transaction(fn){
   const clone=new Map([...db.entries()].map(([k,v])=>[k,{...v}]));
   const tx={
    async state(key){const row=clone.get(key);return row?{...row,data:JSON.parse(row.payload||'{}')}:null},
    async update(table,key,payload){if(!clone.has(key))throw Error('not found');clone.set(key,{...clone.get(key),...payload})},
    async put(key,data,meta){clone.set(key,{$id:key,payload:JSON.stringify(data),...meta})}
   };
   const res=await fn(tx);db.clear();for(const [k,v] of clone.entries())db.set(k,v);
   return res
  }
 };
 const s={store,now:()=>NOW,sendEnabled:globalSend,marketingEnabled:gate,config:async()=>({enabled:true,paused:false,dry_run:false})};
 const marketing=new Marketing(s);
 return {marketing,store,db,changes,sources,gate};
}
test('global WIB campaign day honors start date and optional loop',()=>{
 assert.equal(campaignDay('2026-10-10',Date.parse('2026-10-09T16:59:59Z')),0);
 assert.equal(campaignDay('2026-10-10',Date.parse('2026-10-09T17:00:00Z')),1);
 assert.equal(campaignDay('2026-10-10',Date.parse('2026-10-10T18:00:00Z')),2);
 assert.equal(campaignDay('2026-10-10',Date.parse('2027-10-08T17:00:00Z')),365);
 assert.equal(campaignDay('2026-10-10',Date.parse('2027-10-09T17:00:00Z')),366);
 assert.equal(campaignDay('2026-10-10',Date.parse('2027-10-09T17:00:00Z'),true),1);
});
test('calendar remains in DRAFT with no server gate and cannot arm delivery',async()=>{
 const x=setup();const original=await x.marketing.get();
 assert.equal(original.server_gate,false);
 assert.equal(original.stats.filled,0);
 await assert.rejects(()=>x.marketing.saveSettings({enabled:true,start_date:'2026-10-10'},'admin'),/DRAF/);
 const saved=await x.marketing.saveSettings({enabled:false,start_date:'2026-10-10',send_time:'06:00',loop_campaign:true},'admin');
 assert.equal(saved.settings.loop_campaign,true);
 assert.equal(saved.settings.enabled,false);
});
test('calendar saves 365 slots references only to real published prompts with preview',async()=>{
 const x=setup();
 const saved=await x.marketing.save({day:1,source:'scene_prompts',prompt_id:'p1',offer_text:'Upgrade Premium untuk akses 365 hari.',cta_type:'premium',cta_label:'BUKA PREMIUM'},'admin');
 assert.equal(saved.slot.title,'Contoh p1');
 assert.equal(saved.slot.fingerprint,contentHash(p('p1')));
 assert.equal((await x.marketing.get()).slots[0].day,1);
 assert.equal((await x.marketing.get()).slots[0].cta_label,'BUKA PREMIUM');
 await assert.rejects(()=>x.marketing.save({day:366,source:'scene_prompts',prompt_id:'p2'},'admin'),/Hari/);
 await assert.rejects(()=>x.marketing.save({day:2,source:'scene_prompts',prompt_id:'p1'},'admin'),/sudah ada di hari lain/);
 await assert.rejects(()=>x.marketing.save({day:2,source:'scene_prompts',prompt_id:'missing'},'admin'),/preview/);
});
test('moving a calendar slot swaps atomically and clears source for empty target',async()=>{
 const x=setup();for(const [day,id] of [[1,'p1'],[2,'p2'],[3,'p3']])await x.marketing.save({day,source:'scene_prompts',prompt_id:id},'admin');
 await x.marketing.move(1,2,'admin');
 assert.deepEqual((await x.marketing.get()).slots.map(x=>[x.day,x.prompt_id]),[[1,'p2'],[2,'p1'],[3,'p3']]);
 await x.marketing.move(2,10,'admin');
 assert.deepEqual((await x.marketing.get()).slots.map(x=>[x.day,x.prompt_id]),[[1,'p2'],[3,'p3'],[10,'p1']]);
 await x.marketing.remove(3,'admin');
 assert.deepEqual((await x.marketing.get()).slots.map(x=>x.day),[1,10]);
});
test('custom CTA is limited to verified HTTPS site and never Telegram in-chat QRIS',()=>{
 assert.equal(validateUrl('https://badaiprompt.vercel.app/#harga'),'https://badaiprompt.vercel.app/#harga');
 for(const url of ['https://evil.example/checkout','http://badaiprompt.vercel.app','javascript:alert(1)','https://user:pass@badaiprompt.vercel.app/','#harga','https://badaiprompt.vercel.app:444/'])
  assert.throws(()=>validateUrl(url),/tujuan|Tujuan/);
});
test('Free campaign reads scheduled day only, refuses updated source and never silently falls back',async()=>{
 const x=setup({gate:true,globalSend:true});
 await x.marketing.saveSettings({enabled:true,start_date:'2026-10-10',send_time:'06:00'},'admin');
 assert.equal((await x.marketing.forFree(NOW)).skip,true);
 await x.marketing.save({day:1,source:'scene_prompts',prompt_id:'p1'},'admin');
 let chosen=await x.marketing.forFree(NOW);assert.equal(chosen.prompt.$id,'p1');
 assert.match(chosen.prompt.marketing_offer.url,/#harga$/);
 assert.ok(chosen.prompt.marketing_offer.text.length>15);
 x.sources.get('p1').prompt_text='changed after scheduling';
 await assert.rejects(()=>x.marketing.forFree(NOW),/berubah/);
});
test('backend and Admin both retain a mandatory server-off gate',()=>{
 const m=fs.readFileSync(new URL('../functions/activate-member/src/telegram/runtime.mjs',import.meta.url),'utf8');
 const d=fs.readFileSync(new URL('../assets/admin-marketing.js',import.meta.url),'utf8');
 const h=fs.readFileSync(new URL('../admin.html',import.meta.url),'utf8');
 assert.match(m,/TELEGRAM_MARKETING_ENABLED==='true'/);
 assert.match(h,/id="v-marketing"/);
 assert.match(h,/id="mktCalendar"/);
 assert.match(h,/id="mktEditOffer"/);
 assert.match(h,/id="mktLoop"/);
 assert.match(d,/addEventListener\('drop'/);
 assert.match(d,/request\('marketing-slot-save'/);
});
