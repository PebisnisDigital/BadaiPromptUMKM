import {id,safeError,fail} from './security.mjs';
import {DAY,nextAt,promptChunks} from './policy.mjs';
export class Delivery{
 constructor(service){this.s=service}
 async prompt(member,bot,{key,kind='prompt',promptId,test=false,welcome=false,now=this.s.now()}={}){
  const s=this.s,setting=await s.config(),consent=await s.consent(bot.$id,member.telegram_id);
  if(!consent||consent.status!=='allowed')throw fail('Pengguna belum START bot ini atau telah memblokirnya.');
  const profile=await s.sync(member);member=profile;
  let prompt=promptId?await s.store.get('scene_prompts',promptId):null;
  if(promptId&&!prompt?.is_published)throw fail('Prompt belum dipublikasikan.');
  if(!prompt){
   const cursor=(await s.store.state(id('cursor',member.telegram_id)))?.data.prompt_id;
   const validCursor=cursor&&await s.store.get('scene_prompts',cursor)?cursor:null;
   let page=await s.store.list('scene_prompts',[['equal','is_published',true]],1,validCursor);
   if(!page.rows.length)page=await s.store.list('scene_prompts',[['equal','is_published',true]],1);
   prompt=page.rows[0];
  }
  if(!prompt||!prompt.prompt_text)throw fail('Belum ada prompt published yang bisa dikirim.');
  const deliveryKey=key||id(member.telegram_id,member.next_send_at||'first',kind),rowId=id('delivery',deliveryKey);
  let row=await s.store.get('telegram_deliveries',rowId);
  if(row&&row.dispatch_status!=='retry'){
   if(!test&&row.dispatch_status==='sent'&&row.kind==='prompt'&&Number(member.delivery_day||0)<Number(row.day_number)){await s.store.update('telegram_members',member.$id,{delivery_day:row.day_number,last_sent_at:row.sent_at,next_send_at:nextAt(Date.parse(row.sent_at),row.plan==='premium'?setting.premium_days:setting.free_days,setting.premium_time)})}
   return {duplicate:true,delivery:row};
  }
  if(row&&row.bot_id!==bot.$id)return {duplicate:true,requires_review:true};
  if(!row){try{row=await s.store.create('telegram_deliveries',rowId,{telegram_id:member.telegram_id,chat_id:consent.data.chat_id,bot_id:bot.$id,prompt_id:prompt.$id,message_id:'pending',message_ids:'[]',plan:member.plan,day_number:(member.delivery_day||0)+1,delivery_key:deliveryKey,sent_at:new Date(now).toISOString(),dispatch_status:'reserved',kind:test?'test':kind,attempts:0})}catch(e){if(e.code===409)return {duplicate:true};throw e}}
  const lock=await s.store.claim(id('attempt',rowId,row.attempts||0),{kind:'attempt',bot_id:bot.$id,status:'claimed',due_at:new Date(now+7*DAY).toISOString(),payload:'{}'});
  if(!lock)return {duplicate:true};
  const ids=JSON.parse(row.message_ids||'[]');
  if(ids.length)return {uncertain:true}; // Never replay a partly sent prompt.
  await s.store.update('telegram_deliveries',rowId,{dispatch_status:'sending',attempts:(row.attempts||0)+1});
  const token=s.token(bot);let warning=null;
  try{
   const image=String(prompt.preview_url||'');
   if(image&&/^https:\/\//.test(image)){
    try{const photo=await s.telegram.call(token,'sendPhoto',{chat_id:consent.data.chat_id,photo:image,caption:((welcome?'Selamat datang di BADAI PROMPT! Kamu sudah terdaftar.\n\n':'')+String(prompt.title||'Prompt BADAI PROMPT')).slice(0,900)});ids.push(String(photo.message_id));await s.store.update('telegram_deliveries',rowId,{message_id:ids[0],message_ids:JSON.stringify(ids)})}
    catch(e){if(e.ambiguous||e.blocked||e.retryAfter)throw e;warning='Preview tidak dapat dikirim.'}
   }
   if(!ids.length){const intro=await s.telegram.call(token,'sendMessage',{chat_id:consent.data.chat_id,text:(welcome?'Selamat datang di BADAI PROMPT!\n\n':'')+String(prompt.title||'Prompt BADAI PROMPT').slice(0,200)});ids.push(String(intro.message_id));await s.store.update('telegram_deliveries',rowId,{message_id:ids[0],message_ids:JSON.stringify(ids)})}
   for(const text of promptChunks(prompt.prompt_text)){
    const message=await s.telegram.call(token,'sendMessage',{chat_id:consent.data.chat_id,text,parse_mode:'HTML'});ids.push(String(message.message_id));
    await s.store.update('telegram_deliveries',rowId,{message_id:ids[0],message_ids:JSON.stringify(ids)});
   }
   await s.store.update('telegram_deliveries',rowId,{dispatch_status:'sent',plan:member.plan,sent_at:new Date(now).toISOString(),error_code:warning,delete_at:member.plan==='free'?new Date(now+setting.delete_hours*3600000).toISOString():null});
   if(!test){
    await s.store.putState(id('cursor',member.telegram_id),{prompt_id:prompt.$id},{kind:'cursor',telegram_id:member.telegram_id});
    await s.store.update('telegram_members',member.$id,{delivery_day:(member.delivery_day||0)+1,last_sent_at:new Date(now).toISOString(),next_send_at:nextAt(now,member.plan==='premium'?setting.premium_days:setting.free_days,setting.premium_time)});
   }
   return {ok:true,message_ids:ids,delivery_id:rowId,prompt_id:prompt.$id,warning};
  }catch(e){
   const uncertain=e.ambiguous||ids.length>0,status=uncertain?'uncertain':e.retryAfter?'retry':'failed';
   await s.store.update('telegram_deliveries',rowId,{dispatch_status:status,error_code:safeError(e),message_ids:JSON.stringify(ids),message_id:ids[0]||'pending',retry_at:status==='retry'?new Date(now+Math.max(60,e.retryAfter)*1000).toISOString():null,delete_at:ids.length&&member.plan==='free'?new Date(now+setting.delete_hours*3600000).toISOString():null});
   if(e.blocked)await s.store.putState(id('consent',bot.$id,member.telegram_id),consent.data,{kind:'consent',bot_id:bot.$id,telegram_id:member.telegram_id,status:'blocked'});
   return {ok:false,status,error:safeError(e),delivery_id:rowId};
  }
 }
 async text(member,bot,text,key,kind='test'){
  const s=this.s,consent=await s.consent(bot.$id,member.telegram_id);if(!consent||consent.status!=='allowed')throw fail('Pengguna belum START bot ini.');
  const rowId=id('delivery',key);let row;
  try{row=await s.store.create('telegram_deliveries',rowId,{telegram_id:member.telegram_id,bot_id:bot.$id,chat_id:consent.data.chat_id,prompt_id:'notice',message_id:'pending',message_ids:'[]',plan:member.plan,day_number:member.delivery_day||0,delivery_key:key,sent_at:new Date(s.now()).toISOString(),dispatch_status:'sending',kind,attempts:1})}catch(e){if(e.code===409)return {duplicate:true};throw e}
  try{const response=await s.telegram.call(s.token(bot),'sendMessage',{chat_id:consent.data.chat_id,text,reply_markup:{inline_keyboard:[[{text:'Status saya',callback_data:'status'}],[{text:'Bantuan',callback_data:'bantuan'}]]}});await s.store.update('telegram_deliveries',rowId,{dispatch_status:'sent',message_id:String(response.message_id),message_ids:JSON.stringify([String(response.message_id)])});return {ok:true,message_id:response.message_id,delivery_id:rowId}}
  catch(e){await s.store.update('telegram_deliveries',rowId,{dispatch_status:e.ambiguous?'uncertain':'failed',error_code:safeError(e)});if(e.blocked)await s.store.putState(id('consent',bot.$id,member.telegram_id),consent.data,{kind:'consent',bot_id:bot.$id,telegram_id:member.telegram_id,status:'blocked'});return {ok:false,error:safeError(e)}}
 }
 async remove(row){
  if(row.dispatch_status==='deleted')return {ok:true,already_deleted:true};
  if(!JSON.parse(row.message_ids||'[]').length)throw fail('Pesan belum memiliki Message ID yang dapat dihapus.');
  const s=this.s,bot=await s.store.get('telegram_bots',row.bot_id);if(!bot)return {ok:false,error:'Konfigurasi bot tidak ditemukan.'};
  const remaining=[];for(const message_id of JSON.parse(row.message_ids||'[]'))try{await s.telegram.call(s.token(bot),'deleteMessage',{chat_id:row.chat_id,message_id:Number(message_id)})}catch(e){if(!e.alreadyDeleted)remaining.push(message_id)}
  if(!remaining.length){await s.store.update('telegram_deliveries',row.$id,{dispatch_status:'deleted',status:'deleted',deleted_at:new Date(s.now()).toISOString(),message_ids:'[]',delete_at:null});return {ok:true}}
  await s.store.update('telegram_deliveries',row.$id,{delete_at:s.now()-Date.parse(row.sent_at)>47*3600000?null:row.delete_at,dispatch_status:'delete_failed',status:'delete_failed',message_ids:JSON.stringify(remaining),retry_at:new Date(s.now()+15*60000).toISOString()});return {ok:false,error:'Sebagian pesan belum dapat dihapus.'};
 }
}
