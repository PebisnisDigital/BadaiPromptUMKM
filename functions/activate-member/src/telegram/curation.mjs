import {createHash} from 'node:crypto';
import {fail,id} from './security.mjs';
const SOURCES=new Set(['scene_prompts','prompts']);
export const contentHash=p=>createHash('sha256').update(String(p.prompt_text||'').normalize('NFKC').replace(/\s+/g,' ').trim()).digest('hex');
export function previewReady(p){try{const u=new URL(p?.preview_url);return p?.is_published===true&&Boolean(p.prompt_text?.trim())&&u.protocol==='https:'&&!u.username&&!u.password}catch{return false}}
const slotId=n=>'telegram-content-'+String(n).padStart(3,'0');
export class Curation{
 constructor(service){this.s=service}
 async entries(){const rows=[];let cursor;do{const p=await this.s.store.list('telegram_state',[['equal','kind','content'],['equal','status','approved']],100,cursor);rows.push(...p.rows);cursor=p.rows.at(-1)?.$id;if(p.rows.length<100)break}while(rows.length<365);return rows.map(r=>({...r,data:JSON.parse(r.payload)}))}
 async candidates({source='scene_prompts',cursor}={}){if(!SOURCES.has(source))throw fail('Sumber kurasi tidak valid.');const page=await this.s.store.list(source,[],50,cursor);return {ok:true,total:page.total,next_cursor:page.rows.length===50?page.rows.at(-1).$id:null,rows:page.rows.map(p=>({id:p.$id,title:p.title,preview_url:p.preview_url||'',ready:previewReady(p),reason:previewReady(p)?null:'Wajib published, teks, dan preview HTTPS sebelum disetujui.'}))}}
 async approve({source,prompt_id,position,replace=false},actor){
  if(!SOURCES.has(source))throw fail('Sumber kurasi tidak valid.');const p=await this.s.store.get(source,prompt_id);if(!previewReady(p))throw fail('Konten wajib published, memiliki teks dan preview HTTPS.');const entries=await this.entries(),amend=position!==undefined;
  if(amend&&(!replace||!Number.isInteger(position)||position<1||position>entries.length))throw fail('Posisi review ulang tidak valid.');if(!amend)position=entries.length+1;if(position>365)throw fail('Antrean 365 konten sudah penuh.',409);
  const fingerprint=contentHash(p),hashId=id('content-fingerprint',fingerprint),oldHash=await this.s.store.state(hashId);if(oldHash&&(!amend||oldHash.data.position!==position))throw fail('Konten duplikat; tidak dapat masuk antrean dua kali.',409);
  const data={source,prompt_id:p.$id,fingerprint,preview_url:p.preview_url,position,approved_by:actor,approved_at:new Date(this.s.now()).toISOString()},records=[{rowId:slotId(position),data,meta:{kind:'content',status:'approved'},update:amend}];
  if(!oldHash)records.push({rowId:hashId,data:{position},meta:{kind:'content_hash',status:'approved'}});await this.s.store.createStatesAtomically(records);return {ok:true,position,replaced:amend};
 }
 async status(){
  const entries=await this.entries(),jobs=[];
  for(const source of SOURCES){const ids=entries.filter(e=>e.data.source===source).map(e=>e.data.prompt_id);for(let offset=0;offset<ids.length;offset+=100)jobs.push(this.s.store.list(source,[['equal','$id',ids.slice(offset,offset+100)]],100).then(r=>r.rows.map(p=>({source,p}))))}
  const current=new Map((await Promise.all(jobs)).flat().map(({source,p})=>[source+':'+p.$id,p]));let ready=0;
  for(const entry of entries){const p=current.get(entry.data.source+':'+entry.data.prompt_id);if(!previewReady(p)||contentHash(p)!==entry.data.fingerprint||p.preview_url!==entry.data.preview_url)break;ready++}
  const [scene,prompts,plan]=await Promise.all([this.s.store.list('scene_prompts',[['equal','is_published',true]],100),this.s.store.list('prompts',[['equal','is_published',true]],1),this.s.store.state('telegram-content-plan')]);
  return {target:365,approved:entries.length,ready_days:ready,missing_days:365-ready,enabled:plan?.data.enabled===true,scene_candidates:scene.rows.filter(previewReady).length,prompt_candidates_total:prompts.total,entries:entries.map(r=>({position:r.data.position,source:r.data.source,prompt_id:r.data.prompt_id}))};
 }
 async previouslySent(member,prompt,fingerprint){const use=await this.s.store.state(id('content-use',member.telegram_id,fingerprint));if(use)return use;const old=await this.s.store.list('telegram_deliveries',[['equal','telegram_id',member.telegram_id],['equal','prompt_id',prompt.$id],['equal','kind','prompt'],['equal','dispatch_status',['sent','deleted','delete_failed']]],1);return old.rows.length?{legacy:true}:null}
 async resolve(member){const plan=await this.s.store.state('telegram-content-plan');if(plan?.data.enabled){let position=Number((await this.s.store.state(id('curated-cursor',member.telegram_id)))?.data.position||0)+1;for(;position<=365;position++){const slot=await this.s.store.state(slotId(position));if(!slot||slot.status!=='approved')throw fail('Stok kurasi habis. Tambahkan konten baru; pengulangan dihentikan.',409);const {source,prompt_id,fingerprint,preview_url}=slot.data,p=await this.s.store.get(source,prompt_id);if(!previewReady(p)||contentHash(p)!==fingerprint||p.preview_url!==preview_url)throw fail('Konten kurasi berubah atau preview tidak tersedia. Perlu review admin.',409);if(await this.previouslySent(member,p,fingerprint))continue;return {...p,content_source:source,content_position:position}}
 throw fail('365 konten kurasi telah dikirim; pengulangan dihentikan.',409)}
 // Legacy rollout remains scene-only. Never wrap the cursor back to old content.
 const cursor=(await this.s.store.state(id('cursor',member.telegram_id)))?.data.prompt_id;let after=cursor&&await this.s.store.get('scene_prompts',cursor)?cursor:undefined;
 while(true){const page=await this.s.store.list('scene_prompts',[['equal','is_published',true]],50,after);for(const p of page.rows)if(previewReady(p)&&!await this.previouslySent(member,p,contentHash(p)))return {...p,content_source:'scene_prompts'};if(page.rows.length<50)throw fail('Belum ada prompt published baru dengan preview; pengulangan dihentikan.',409);after=page.rows.at(-1).$id}
 }
 async reserve(member,prompt,deliveryId){const key=id('content-use',member.telegram_id,contentHash(prompt)),existing=await this.s.store.state(key);if(existing)return existing.data.delivery_id===deliveryId;return Boolean(await this.s.store.claim(key,{kind:'content_use',telegram_id:member.telegram_id,status:'reserved',payload:JSON.stringify({delivery_id:deliveryId,source:prompt.content_source||'scene_prompts',prompt_id:prompt.$id})}))}
 async advance(member,prompt){if(prompt.content_position)await this.s.store.putState(id('curated-cursor',member.telegram_id),{position:prompt.content_position},{kind:'cursor',telegram_id:member.telegram_id});await this.s.store.putState(id('cursor',member.telegram_id),{prompt_id:prompt.$id},{kind:'cursor',telegram_id:member.telegram_id})}
}
