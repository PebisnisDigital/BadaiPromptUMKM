import {createHash} from 'node:crypto';
export const contentHash=p=>createHash('sha256').update(String(p?.prompt_text||'').normalize('NFKC').replace(/\s+/g,' ').trim()).digest('hex');
export function previewReady(p){try{const u=new URL(p?.preview_url);return p?.is_published===true&&Boolean(p.prompt_text?.trim())&&u.protocol==='https:'&&!u.username&&!u.password}catch{return false}}
import {fail} from './security.mjs';
import {DAY, jakartaDay} from './policy.mjs';

const SOURCES=new Set(['scene_prompts','prompts']);
const CTA_TYPES=new Set(['premium','member','url']);
const BASE='https://badaiprompt.vercel.app';
const DEFAULT_OFFER='Suka prompt ini? Upgrade BADAI PROMPT Premium Rp199.000 untuk membuka seluruh koleksi dan rekomendasi prompt setiap hari selama 365 hari.';
const DEFAULT_SETTINGS=Object.freeze({enabled:false,loop_campaign:false,start_date:'',send_time:'06:00',timezone:'Asia/Jakarta',default_offer:DEFAULT_OFFER,default_cta_label:'BUKA PREMIUM',default_cta_type:'premium',default_cta_url:''});
const slotId=day=>'telegram-marketing-'+String(day).padStart(3,'0');
const trim=(v,max)=>String(v??'').trim().slice(0,max);
const validDay=day=>{const n=Number(day);if(!Number.isInteger(n)||n<1||n>365)throw fail('Hari harus antara 1 dan 365.',400);return n};
function validateUrl(url){
 try{
  const u=new URL(String(url));
  if(u.protocol!=='https:'||u.username||u.password||u.port||u.hostname!=='badaiprompt.vercel.app')throw Error('not allowed');
  if(url.length>500)throw Error('too long');
  return u.toString()
 }catch{throw fail('Tujuan CTA harus HTTPS pada domain BADAI PROMPT resmi.',400)}
}
const link=slot=>slot.cta_type==='member'?BASE+'/member':slot.cta_type==='premium'?BASE+'/#harga':validateUrl(slot.cta_url);
function sanitizeSettings(input,old=DEFAULT_SETTINGS){
 const s={...old};
 for(const key of ['start_date','send_time','default_offer','default_cta_label','default_cta_type','default_cta_url']){
  if(Object.hasOwn(input,key))s[key]=input[key];
 }
 if(typeof input.enabled==='boolean')s.enabled=input.enabled;
 if(typeof input.loop_campaign==='boolean')s.loop_campaign=input.loop_campaign;
 if(s.start_date!==''&&!/^\d{4}-\d{2}-\d{2}$/.test(s.start_date))throw fail('Tanggal mulai tidak valid.');
 if(s.start_date){const date=Date.parse(s.start_date+'T00:00:00Z');if(!Number.isFinite(date)||new Date(date).toISOString().slice(0,10)!==s.start_date)throw fail('Tanggal mulai tidak valid.');}
 if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(s.send_time))throw fail('Jam kirim WIB tidak valid.');
 s.timezone='Asia/Jakarta';
 s.default_offer=trim(s.default_offer,850);
 s.default_cta_label=trim(s.default_cta_label,40);
 if(!CTA_TYPES.has(s.default_cta_type))throw fail('Tipe CTA tidak dikenal.');
 if(!s.default_offer||!s.default_cta_label)throw fail('Pesan penjualan dan tulisan tombol wajib diisi.');
 s.default_cta_url=s.default_cta_type==='url'?validateUrl(s.default_cta_url):'';
 if(s.enabled&&!s.start_date)throw fail('Isi tanggal mulai sebelum mengaktifkan jadwal.',409);
 return s;
}
export function campaignDay(startDate,now,loop=false){
 if(!startDate)return 0;
 const today=jakartaDay(now);
 const day=Math.floor((Date.parse(today+'T00:00:00Z')-Date.parse(startDate+'T00:00:00Z'))/DAY)+1;
 if(!Number.isFinite(day))return 0;
 return loop&&day>0?((day-1)%365)+1:day
}
export class Marketing{
 constructor(service){this.s=service}
 async config(){return sanitizeSettings((await this.s.store.state('telegram-marketing-settings'))?.data||{});}
 async entries(){
  const result=[];let cursor;
  do{
   const page=await this.s.store.list('telegram_state',[['equal','kind','marketing_slot'],['equal','status','scheduled']],100,cursor);
   result.push(...page.rows);if(page.rows.length<100)break;
   cursor=page.rows.at(-1)?.$id;
  }while(result.length<365);
  return result.map(x=>({...x.data,$id:x.$id})).sort((a,b)=>a.day-b.day);
 }
 async get(){
  const [settings,slots]=await Promise.all([this.config(),this.entries()]);
  return {ok:true,settings,slots,stats:{filled:slots.length,empty:365-slots.length,target:365,active:settings.enabled&&this.s.marketingEnabled,campaign_day:campaignDay(settings.start_date,this.s.now(),settings.loop_campaign)},server_gate:Boolean(this.s.marketingEnabled),note:'Pengiriman Free tetap mengikuti interval pada Telegram Manager. Kalender mengikuti tanggal kampanye global di zona WIB.'};
 }
 async candidates({source='scene_prompts',cursor}={}){
  if(!SOURCES.has(source))throw fail('Sumber prompt tidak valid.');
  const page=await this.s.store.list(source,[['equal','is_published',true]],50,cursor);
  const rows=page.rows.filter(previewReady).map(p=>({source,id:p.$id,title:p.title,category:p.category||'',preview_url:p.preview_url,summary:trim(p.prompt_text,145)}));
  return {ok:true,rows,total:page.total,next_cursor:page.rows.length===50?page.rows.at(-1).$id:null};
 }
 async saveSettings(input,actor){
  const prev=await this.config(),updated=sanitizeSettings(input,prev);
  // Admin cannot arm a new sender just by toggling a form. Requires explicit server flag.
  if(updated.enabled&&!this.s.marketingEnabled)throw fail('Jadwal tersimpan sebagai DRAF. Pengiriman perlu izin server terpisah.',409);
  if(updated.enabled&&!prev.enabled){const system=await this.s.config();if(!this.s.sendEnabled||!system.enabled||system.paused||system.dry_run)throw fail('Aktifkan bot utama dan nonaktifkan dry-run setelah QA sebelum menjadwalkan.',409);}
  await this.s.store.putState('telegram-marketing-settings',updated,{kind:'marketing_settings',status:updated.enabled?'active':'draft',user_id:actor});
  return {ok:true,settings:updated};
 }
 validateSlot(body,base){
  const day=validDay(body.day),source=String(body.source||''),prompt_id=String(body.prompt_id||'');
  if(!SOURCES.has(source)||!prompt_id||prompt_id.length>80)throw fail('Pilih prompt valid dari Member Area.');
  const offer_text=trim(body.offer_text??base.default_offer,850),cta_label=trim(body.cta_label??base.default_cta_label,40);
  const cta_type=String(body.cta_type||base.default_cta_type),cta_url=String((body.cta_url??base.default_cta_url)||'').trim();
  if(!offer_text||!cta_label||!CTA_TYPES.has(cta_type))throw fail('Lengkapi pesan upselling dan tombol CTA.');
  const data={day,source,prompt_id,offer_text,cta_label,cta_type,cta_url:cta_type==='url'?validateUrl(cta_url):''};
  link(data);return data;
 }
 async save(body,actor){
  const [settings,entries]=await Promise.all([this.config(),this.entries()]);
  const data=this.validateSlot(body,settings),prompt=await this.s.store.get(data.source,data.prompt_id);
  if(!previewReady(prompt))throw fail('Prompt wajib published, memiliki teks dan preview gambar HTTPS.',409);
  if(entries.some(x=>x.day!==data.day&&x.source===data.source&&x.prompt_id===data.prompt_id))throw fail('Prompt sudah ada di hari lain. Hindari pengulangan pada kalender.',409);
  const payload={...data,title:trim(prompt.title,128),category:trim(prompt.category,128),preview_url:prompt.preview_url,fingerprint:contentHash(prompt),updated_at:new Date(this.s.now()).toISOString(),updated_by:actor};
  await this.s.store.putState(slotId(data.day),payload,{kind:'marketing_slot',status:'scheduled',user_id:actor});
  return {ok:true,slot:payload}
 }
 async remove(day,actor){
  day=validDay(day);
  const row=await this.s.store.get('telegram_state',slotId(day));
  if(!row||row.status!=='scheduled')return {ok:true,already_empty:true};
  await this.s.store.putState(slotId(day),{day},{kind:'marketing_slot',status:'empty',user_id:actor});
  return {ok:true};
 }
 async move(from,to,actor){
  from=validDay(from);to=validDay(to);
  if(from===to)return {ok:true,unchanged:true};
  const leftKey=slotId(from),rightKey=slotId(to);
  await this.s.store.transaction(async tx=>{
   const [left,right]=await Promise.all([tx.state(leftKey),tx.state(rightKey)]);
   if(!left||left.status!=='scheduled')throw fail('Slot sumber kosong.',409);
   const move={...left.data,day:to,updated_at:new Date(this.s.now()).toISOString(),updated_by:actor};
   if(right&&right.status==='scheduled'){
    await tx.update('telegram_state',leftKey,{kind:'marketing_slot',status:'scheduled',payload:JSON.stringify({...right.data,day:from,updated_at:new Date(this.s.now()).toISOString(),updated_by:actor})});
    await tx.update('telegram_state',rightKey,{kind:'marketing_slot',status:'scheduled',payload:JSON.stringify(move)});
   }else{
    if(right)await tx.update('telegram_state',rightKey,{kind:'marketing_slot',status:'scheduled',payload:JSON.stringify(move)});
    else await tx.put(rightKey,move,{kind:'marketing_slot',status:'scheduled',user_id:actor});
    await tx.update('telegram_state',leftKey,{status:'empty',payload:JSON.stringify({day:from})});
   }
  });
  return {ok:true,from,to};
 }
 async forFree(now){
  const s=await this.config();
  if(!this.s.marketingEnabled||!s.enabled)return null;
  const day=campaignDay(s.start_date,now,s.loop_campaign);
  if(day<1)return {skip:true,reason:'Kampanye belum dimulai',day};
  if(day>365)return {skip:true,reason:'Kampanye 365 hari telah berakhir',day};
  const slot=await this.s.store.state(slotId(day));
  if(!slot||slot.status!=='scheduled')return {skip:true,reason:'Belum ada prompt dijadwalkan untuk hari '+day,day};
  const data=slot.data;
  const prompt=await this.s.store.get(data.source,data.prompt_id);
  if(!previewReady(prompt)||contentHash(prompt)!==data.fingerprint||prompt.preview_url!==data.preview_url)throw fail('Prompt kalender berubah. Review ulang hari '+day+' sebelum kirim.',409);
  const elapsed=campaignDay(s.start_date,now,false);
  const cycle=s.loop_campaign?Math.floor((elapsed-1)/365):0;
  return {day,prompt:{...prompt,content_source:data.source,marketing_day:day,marketing_cycle:cycle,marketing_offer:{text:data.offer_text,label:data.cta_label,url:link(data)}}};
 }
}
export {DEFAULT_SETTINGS,validateUrl,slotId};
