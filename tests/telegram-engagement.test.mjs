import test from 'node:test';
import assert from 'node:assert/strict';
import {Engagement,telegramHtml,normalKeyword} from '../functions/activate-member/src/telegram/engagement.mjs';
import fs from 'node:fs';

test('Telegram formatting supports safe tags and rejects unsafe or unbalanced markup',()=>{
 assert.equal(telegramHtml('Halo <b>Kak</b>! <i>Yuk</i>'),'Halo <b>Kak</b>! <i>Yuk</i>');
 assert.equal(telegramHtml('Kelas <u>baru</u>'),'Kelas <u>baru</u>');
 assert.throws(()=>telegramHtml('<script>alert(1)</script>'),/Tag Telegram/);
 assert.throws(()=>telegramHtml('<b>Belum selesai'),/belum ditutup/);
 assert.throws(()=>telegramHtml('<a href="javascript:alert(1)">Klik</a>'),/Tag Telegram/);
 assert.equal(normalKeyword('  MAU  '),'mau');
 assert.throws(()=>normalKeyword('/start'),/perintah bawaan/);
});
function env(){
 const data=new Map(),members=new Map(),calls=[];let seq=0;
 const store={
  state:async k=>data.get(k)||null,
  putState:async(k,value,meta)=>{const row={$id:k,...meta,data:value};data.set(k,row);return row},
  claim:async(k,body)=>{if(data.has(k))return null;data.set(k,{$id:k,...body});return true},
  get:async(table,k)=>table==='telegram_members'?members.get(k)||null:null,
  list:async(table,filters=[],limit=5,cursor)=>{
   const all=[...data.values()].filter(x=>filters.every(([op,key,v])=>op==='equal'?x[key]===v:true)).sort((a,b)=>a.$id.localeCompare(b.$id));
   const rows=cursor?all.filter(x=>x.$id>cursor):all;
   return {rows:rows.slice(0,limit),total:all.length};
  }
 };
 const bot={$id:'bot-1',is_active:true};
 const svc={store,sendEnabled:true,now:()=>Date.UTC(2026,9,13,8),main:async()=>bot,
  requireSend:async()=>true,config:async()=>({enabled:true,paused:false,batch_size:5}),
  consent:async(b,t)=>store.state('consent:'+b+':'+t),
  delivery:{text:async(m,b,text,key,kind,opt)=>{calls.push({member:m.telegram_id,key,kind,opt});return {ok:true}}}
 };
 return {svc,store,members,data,calls,bot};
}
test('autoreply saves exact keyword, supports edits, and leaves built-in commands alone',async()=>{
 const x=env(),e=new Engagement(x.svc);
 await e.saveRule({keyword:'HARGA',reply:'Halo <b>Kak</b>!'},'owner');
 assert.deepEqual((await e.rules()).rules.map(x=>x.keyword),['harga']);
 assert.equal(await e.respond({telegram_id:'11'},x.bot,'Tidak cocok','request'),null);
 await e.respond({telegram_id:'11'},x.bot,'HaRgA','request');
 assert.equal(x.calls.length,1);assert.equal(x.calls[0].kind,'autoreply');assert.equal(x.calls[0].opt.html,true);
 await e.deleteRule({keyword:'harga'},'owner');assert.equal((await e.rules()).rules.length,0);
});
test('broadcast creates a no-send draft and sends only eligible opted-in members after confirmation',async()=>{
 const x=env(),e=new Engagement(x.svc);
 for(const tg of ['111','222','333']){const key='consent:'+x.bot.$id+':'+tg;x.data.set(key,{$id:key,kind:'consent',bot_id:x.bot.$id,status:'allowed',telegram_id:tg,data:{chat_id:tg}});
  x.members.set('member:'+tg,{$id:'member:'+tg,telegram_id:tg,is_active:true})}
 // Override hashes for mock semantics: persisted rows use production SHA-derived IDs.
 const {id}=await import('../functions/activate-member/src/telegram/security.mjs');
 for(const tg of ['111','222','333'])x.members.set(id('member',tg),{$id:id('member',tg),telegram_id:tg,is_active:true});
 const c=await e.draft({message:'Promo <b>Baru</b>!'},'owner');
 assert.equal(x.calls.length,0);assert.equal(c.campaign.status,'draft');
 await assert.rejects(()=>e.sendBatch({id:c.campaign.id,confirmation:'BELUM'},'owner'),/KIRIM BROADCAST/);
 const sent=await e.sendBatch({id:c.campaign.id,confirmation:'KIRIM BROADCAST'},'owner');
 assert.equal(sent.batch.sent,3);assert.equal(sent.campaign.status,'completed');
 assert.equal(x.calls.length,3);assert(x.calls.every(y=>y.opt.html===true&&y.opt.noReplyButtons===true));
 await assert.rejects(()=>e.sendBatch({id:c.campaign.id,confirmation:'KIRIM BROADCAST'},'owner'),/selesai/);
});
test('the server action allowlist protects new routes',()=>{
 const src=fs.readFileSync(new URL('../api/telegram/manager.js',import.meta.url),'utf8');
 for(const action of ['autoreply-list','autoreply-save','autoreply-delete','broadcast-get','broadcast-draft','broadcast-send-batch'])
  assert.ok(src.includes("'"+action+"'"),action);
});
