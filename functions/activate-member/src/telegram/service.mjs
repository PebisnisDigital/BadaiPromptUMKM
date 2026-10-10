import {Curation} from './curation.mjs';
import {QrisChat} from './qris.mjs';
import {TelegramLogin} from './login.mjs';
import {Delivery} from './delivery.mjs';
import {fail,id,random,masterKey,seal,unseal,equal,numeric,privateIdentity,safeError} from './security.mjs';
import {defaults,settings,entitlement,DAY,jakartaStart} from './policy.mjs';
export class Service{
 constructor({store,telegram,key,now=()=>Date.now(),sendEnabled=false,webhookBase='https://badaiprompt.vercel.app/api/telegram/webhook',verifyUser,verifyAdmin,verifyPaidAccess=async()=>false,qrisEnabled=false,grantPaidAccess=null,fetcher=fetch,passwordlessEnabled=false,users=null}){
  Object.assign(this,{store,telegram,key,now,sendEnabled,webhookBase,verifyUser,verifyAdmin,verifyPaidAccess,qrisEnabled,grantPaidAccess,fetcher,passwordlessEnabled});this.delivery=new Delivery(this);this.curation=new Curation(this);this.qris=new QrisChat(this);this.login=new TelegramLogin(this,users);
 }
 async config(){return settings((await this.store.state('telegram-settings'))?.data||defaults)}
 token(bot){return unseal(bot.token_cipher,masterKey(this.key),'token:'+bot.$id)}
 secret(bot){return unseal(bot.webhook_secret,masterKey(this.key),'webhook:'+bot.$id)}
 publicBot(bot){const {token_cipher,webhook_secret,...publicData}=bot;return {...publicData,has_token:Boolean(token_cipher)}}
 async consent(botId,telegramId){return this.store.state(id('consent',botId,telegramId))}
 async bot(botId){const b=await this.store.get('telegram_bots',botId);if(!b)throw fail('Bot tidak ditemukan.',404);return b}
 async main(){const setting=await this.config();return setting.main_bot_id?await this.store.get('telegram_bots',setting.main_bot_id):null}
 async sync(member){
  const directPaid=await this.qris.entitlement(member);if(directPaid)return directPaid;
  if(!member.appwrite_user_id)return member;
  const profile=await this.store.get('member_profiles',member.appwrite_user_id),access=entitlement(profile,this.now());
  if(access.plan==='premium'&&!await this.verifyPaidAccess(member.appwrite_user_id))access.plan='free';
  // Appwrite profile is authoritative. Never grant or extend website rights from Telegram.
  if(access.plan!==member.plan||access.premium_until!==member.premium_until){member=await this.store.update('telegram_members',member.$id,{plan:access.plan,premium_until:access.premium_until,premium_started_at:access.plan==='premium'?(member.premium_started_at||new Date(this.now()).toISOString()):member.premium_started_at,...(access.plan==='premium'&&member.plan!=='premium'?{next_send_at:new Date(this.now()).toISOString()}:{} )})}
  return member;
 }
 async audit(actor,action,data={}){await this.store.putState(id('audit',random()),{action,...data},{kind:'audit',user_id:actor,status:'recorded',due_at:new Date(this.now()+30*DAY).toISOString()})}
 async requireSend(test=false){if(!this.sendEnabled)throw fail('Pengiriman Telegram belum diizinkan pada server.',503);if(!test){const s=await this.config();if(s.dry_run)throw fail('Mode uji coba aktif; pesan sungguhan tidak dikirim.',409)}}
 async admin(action,body,jwt){
  const actor=await this.verifyAdmin(jwt);await this.store.rate(actor.$id,'admin',this.now(),20);
  if(action==='overview')return this.overview();
  if(action==='content-status')return {ok:true,content:await this.curation.status(),monitor:await this.monitor()};
  if(action==='content-candidates')return this.curation.candidates(body);
  if(action==='content-approve'){const result=await this.curation.approve(body,actor.$id);await this.audit(actor.$id,action,{source:body.source,prompt_id:body.prompt_id});return result}
  if(action==='content-enable'){if(body.enabled!==true)throw fail('Kurasi hanya dapat diaktifkan melalui konfirmasi admin.');const state=await this.curation.status();if(!state.ready_days)throw fail('Setujui konten dengan preview terlebih dahulu.');await this.store.putState('telegram-content-plan',{enabled:true});await this.audit(actor.$id,action);return {ok:true}}
  if(action==='settings'){
   const old=await this.config();const allowed=['enabled','paused','dry_run','premium_time','free_days','premium_days','delete_hours','term_days','batch_size','max_members_per_run'];const filtered=Object.fromEntries(allowed.filter(k=>k in body).map(k=>[k,body[k]]));const s=settings({...old,...filtered});
   if(!this.sendEnabled&&(s.enabled||!s.paused||!s.dry_run))throw fail('Pengiriman belum diizinkan pada server. Pertahankan otomatisasi nonaktif, PAUSE, dan mode uji coba.',409);
   if(s.enabled&&!s.paused&&!s.dry_run){await this.requireSend(true);if(!await this.main())throw fail('Pilih bot utama dengan webhook valid terlebih dahulu.')}
   await this.store.putState('telegram-settings',s);await this.audit(actor.$id,action);return {ok:true,settings:s};
  }
  if(action==='save'){
   const key=masterKey(this.key),token=String(body.token||'').trim();
   if(!/^\d{5,20}:[A-Za-z0-9_-]{20,100}$/.test(token))throw fail('Format token Telegram tidak valid.');
   const me=await this.telegram.call(token,'getMe');if(!me.is_bot||!me.username)throw fail('Token bukan milik bot Telegram.');
   const botId=id('bot',String(me.id)),old=await this.store.get('telegram_bots',botId);
   const bot={bot_user_id:numeric(me.id),username:String(me.username).slice(0,64),name:String(body.name||me.first_name).slice(0,128),token_cipher:seal(token,key,'token:'+botId),webhook_secret:old?.webhook_secret||seal(random(),key,'webhook:'+botId),is_active:old?.is_active||false,status:'connected',last_test_at:new Date(this.now()).toISOString(),created_at:old?.created_at||new Date(this.now()).toISOString(),last_error:null};
   const row=old?await this.store.update('telegram_bots',botId,bot):await this.store.create('telegram_bots',botId,bot);await this.audit(actor.$id,'save',{bot_id:botId});return {ok:true,bot:this.publicBot(row)};
  }
  if(action==='tester'){
   const tg=numeric(body.telegram_id),bot=await this.bot(body.bot_id),consent=await this.consent(bot.$id,tg);if(!consent||consent.status!=='allowed')throw fail('Akun penguji harus START bot yang dipilih.');
   await this.store.putState(id('tester',bot.$id,tg),{authorized:true},{kind:'tester',bot_id:bot.$id,telegram_id:tg,status:'authorized'});await this.audit(actor.$id,'authorize_tester',{bot_id:bot.$id,telegram_id:tg});return {ok:true};
  }
  if(action==='dry-run')return this.scheduler({forceDry:true});
  const bot=await this.bot(String(body.bot_id||''));
  if(action==='rename'){const name=String(body.name||'').trim();if(!name||name.length>128)throw fail('Nama konfigurasi tidak valid.');await this.store.update('telegram_bots',bot.$id,{name});return {ok:true}}
  if(action==='connection'){
   try{const me=await this.telegram.call(this.token(bot),'getMe');if(String(me.id)!==bot.bot_user_id)throw fail('Identitas bot tidak cocok.');const row=await this.store.update('telegram_bots',bot.$id,{status:'connected',last_test_at:new Date(this.now()).toISOString(),last_error:null});return {ok:true,bot:this.publicBot(row),telegram:{id:me.id,username:me.username,first_name:me.first_name}}}
   catch(e){await this.store.update('telegram_bots',bot.$id,{status:'error',last_error:safeError(e),last_test_at:new Date(this.now()).toISOString()});throw e}
  }
  if(['webhook','install-webhook','prepare-switch','activate'].includes(action)){
   const url=this.webhookBase+'?bot='+bot.$id;
   if(['install-webhook','prepare-switch'].includes(action)){
    const me=await this.telegram.call(this.token(bot),'getMe');if(String(me.id)!==bot.bot_user_id)throw fail('Identitas bot tidak cocok.');
    await this.telegram.call(this.token(bot),'setWebhook',{url,secret_token:this.secret(bot),allowed_updates:['message','callback_query'],drop_pending_updates:false});
   }
   const info=await this.telegram.call(this.token(bot),'getWebhookInfo'),valid=info.url===url;
   await this.store.update('telegram_bots',bot.$id,{webhook_url:info.url||null,webhook_checked_at:new Date(this.now()).toISOString(),last_error:info.last_error_date?'Telegram melaporkan error webhook terbaru.':null});
   if(action==='activate'||action==='prepare-switch'){
    if(!valid||info.last_error_date&&this.now()-info.last_error_date*1000<15*60000)throw fail('Webhook belum sehat. Periksa dan uji ulang sebelum aktivasi.');
    const count=(await this.store.list('telegram_state',[['equal','kind','consent'],['equal','bot_id',bot.$id],['equal','status','allowed']],1)).total;
    if(action==='prepare-switch'){
     const confirmation=random();await this.store.putState(id('switch',confirmation),{bot_id:bot.$id,actor:actor.$id,count},{kind:'switch',status:'prepared',due_at:new Date(this.now()+5*60000).toISOString()});return {ok:true,confirmation,started_members:count,webhook_valid:true};
    }
    const preparation=await this.store.state(id('switch',String(body.confirmation||'')));
    if(!preparation||preparation.data.bot_id!==bot.$id||preparation.data.actor!==actor.$id||Date.parse(preparation.due_at)<=this.now())throw fail('Konfirmasi pergantian bot sudah tidak valid.');
    if(!await this.store.claim(id('switch-used',body.confirmation),{kind:'used',status:'used',due_at:new Date(this.now()+DAY).toISOString(),payload:'{}'}))throw fail('Konfirmasi sudah digunakan.',409);
    const old=await this.main();await this.store.putState('telegram-settings',{...await this.config(),main_bot_id:bot.$id});
    if(old&&old.$id!==bot.$id)await this.store.update('telegram_bots',old.$id,{is_active:false});await this.store.update('telegram_bots',bot.$id,{is_active:true,status:'active'});await this.audit(actor.$id,'activate',{bot_id:bot.$id,started_members:count});
    return {ok:true,started_members:count};
   }
   return {ok:true,webhook:{url:info.url||'',valid,pending_update_count:info.pending_update_count,last_error_date:info.last_error_date||null,last_error_message:info.last_error_date?'Telegram melaporkan kegagalan webhook.':null}};
  }
  if(action==='disable'||action==='delete'){
   if(action==='delete'){if(body.confirmation!=='HAPUS BOT')throw fail('Ketik HAPUS BOT untuk konfirmasi.');if((await this.store.list('telegram_deliveries',[['equal','bot_id',bot.$id]],1)).total)throw fail('Bot memiliki riwayat pesan. Nonaktifkan agar pesan tetap dapat dikelola.')}
   const setting=await this.config();if(setting.main_bot_id===bot.$id)await this.store.putState('telegram-settings',{...setting,main_bot_id:null,paused:true});
   await this.telegram.call(this.token(bot),'deleteWebhook',{drop_pending_updates:false});
   if(action==='delete'){if(body.confirmation!=='HAPUS BOT')throw fail('Ketik HAPUS BOT untuk konfirmasi.');const history=(await this.store.list('telegram_deliveries',[['equal','bot_id',bot.$id]],1)).total;
    if(history)throw fail('Bot memiliki riwayat pesan. Nonaktifkan agar token tetap tersedia untuk penghapusan pesan.');await this.store.remove('telegram_bots',bot.$id)
   }else await this.store.update('telegram_bots',bot.$id,{is_active:false,status:'disabled'});
   await this.audit(actor.$id,action,{bot_id:bot.$id});return {ok:true};
  }
  if(['test-message','test-prompt','test-delete'].includes(action)){
   await this.requireSend(true);const tg=numeric(body.telegram_id),tester=await this.store.state(id('tester',bot.$id,tg));if(!tester||tester.status!=='authorized')throw fail('Akun penguji belum diotorisasi.',403);
   const member=await this.store.get('telegram_members',id('member',tg));if(!member)throw fail('Member tidak ditemukan.');
   if(action==='test-delete'){const row=await this.store.get('telegram_deliveries',String(body.delivery_id||''));if(!row||row.kind!=='test'||row.bot_id!==bot.$id||row.telegram_id!==tg)throw fail('Hanya pesan uji milik bot dan penguji ini yang dapat dihapus.',403);return this.delivery.remove(row,{test:true})}
   const request=String(body.request_id||'');if(!/^[\w-]{16,64}$/.test(request))throw fail('Request ID pengujian wajib.');
   return action==='test-prompt'?this.delivery.prompt(member,bot,{key:id('test',bot.$id,tg,request),promptId:String(body.prompt_id||''),test:true}):this.delivery.text(member,bot,'Pesan uji BADAI PROMPT. Koneksi bot berhasil.',id('test',bot.$id,tg,request));
  }
  throw fail('Aksi Telegram tidak ditemukan.',404);
 }
 async overview(){
  const now=this.now(),count=(table,filters)=>this.store.list(table,filters,1).then(r=>r.total),e=(key,value)=>['equal',key,value];
  const [bots,recentErrors,members,testers,prompts,...numbers]=await Promise.all([
   this.store.list('telegram_bots',[],20),this.store.list('telegram_deliveries',[e('dispatch_status',['failed','uncertain','delete_failed','reserved','sending'])],20),this.store.list('telegram_members',[],50),this.store.list('telegram_state',[e('kind','tester')],50),this.store.list('scene_prompts',[e('is_published',true)],50),
   count('telegram_members',[]),count('telegram_members',[e('plan','free')]),count('telegram_members',[e('plan','premium')]),Promise.all([count('telegram_members',[e('plan','premium'),e('is_active',true),['greaterThan','premium_until',new Date(now).toISOString()]]),count('telegram_members',[e('plan','premium'),e('is_active',true),['isNull','premium_until']])]).then(n=>n[0]+n[1]),count('telegram_members',[['lessThanEqual','premium_until',new Date(now).toISOString()]]),
   count('telegram_deliveries',[['greaterThanEqual','sent_at',jakartaStart(now)],e('dispatch_status','sent')]),count('telegram_deliveries',[e('dispatch_status','sent')]),count('telegram_deliveries',[e('dispatch_status',['failed','uncertain','delete_failed'])]),count('telegram_deliveries',[e('dispatch_status','deleted')]),count('telegram_state',[e('kind','consent'),e('status','blocked')])
  ]);
  return {ok:true,bots:bots.rows.map(b=>this.publicBot(b)),settings:await this.config(),stats:Object.fromEntries(['users','free','premium','active','expired','today','sent','failed','deleted','blocked'].map((k,i)=>[k,numbers[i]])),errors:recentErrors.rows.map(r=>({id:r.$id,status:r.dispatch_status,error:r.error_code,at:r.sent_at})),members:members.rows.map(m=>({telegram_id:m.telegram_id,first_name:m.first_name,plan:m.plan})),testers:testers.rows.map(t=>({bot_id:t.bot_id,telegram_id:t.telegram_id})),prompts:prompts.rows.map(p=>({id:p.$id,title:p.title})),send_enabled:this.sendEnabled,scheduler_tolerance_minutes:15};
 }
 async redeemLogin(code){return this.login.redeem(code)}
 async linkToken(jwt){
  const user=await this.verifyUser(jwt);await this.store.rate(user.$id,'link',this.now(),3);const profile=await this.store.get('member_profiles',user.$id);if(!profile)throw fail('Profil member belum tersedia.',403);
  const bot=await this.main();if(!bot)throw fail('Bot utama belum aktif.',503);const token=random();await this.store.putState(id('link',token),{user_id:user.$id},{kind:'link',user_id:user.$id,status:'pending',due_at:new Date(this.now()+10*60000).toISOString()});return {ok:true,url:'https://t.me/'+bot.username+'?start=link_'+token,expires_in:600};
 }
 async link(member,token){
  const key=id('link',token),link=await this.store.state(key);if(!link||Date.parse(link.due_at)<=this.now()||link.status!=='pending')throw fail('Link akun sudah tidak valid. Buat ulang dari Member Area.');
  const userId=link.data.user_id,existing=await this.store.state(id('userlink',userId)),tgExisting=await this.store.state(id('tglink',member.telegram_id));
  if(existing&&existing.data.telegram_id!==member.telegram_id||tgExisting&&tgExisting.data.user_id!==userId||member.appwrite_user_id&&member.appwrite_user_id!==userId)throw fail('Akun sudah terhubung ke identitas lain. Hubungi admin.',409);
  if(!await this.store.claim(id('link-used',token),{kind:'used',status:'used',due_at:new Date(this.now()+DAY).toISOString(),payload:'{}'}))throw fail('Link sudah digunakan.',409);
  if(!existing){const reserved=await this.store.claim(id('userlink',userId),{kind:'userlink',user_id:userId,telegram_id:member.telegram_id,status:'linked',payload:JSON.stringify({telegram_id:member.telegram_id})});if(!reserved){const concurrent=await this.store.state(id('userlink',userId));if(concurrent.data.telegram_id!==member.telegram_id)throw fail('Akun sudah terhubung.',409)}}
  if(!tgExisting){const reserved=await this.store.claim(id('tglink',member.telegram_id),{kind:'tglink',telegram_id:member.telegram_id,user_id:userId,status:'linked',payload:JSON.stringify({user_id:userId})});if(!reserved){const concurrent=await this.store.state(id('tglink',member.telegram_id));if(concurrent.data.user_id!==userId)throw fail('Telegram sudah terhubung.',409)}}
  await this.store.update('telegram_state',key,{status:'used'});member=await this.store.update('telegram_members',member.$id,{appwrite_user_id:userId});await this.qris.grant(member,userId);return this.sync(member);
 }
 async webhook(botId,secret,update){
  const bot=await this.bot(botId);if(!equal(secret,this.secret(bot)))throw fail('Webhook tidak sah.',403);
  if(!Number.isSafeInteger(update.update_id)||update.update_id<0)throw fail('Update ID tidak valid.');
  if(update.callback_query&&/^(upsell|qris):/.test(String(update.callback_query.data||'')))return this.qris.callback(bot,update.callback_query);
  if(update.callback_query){const c=update.callback_query;if(!['status','bantuan'].includes(c.data))return {ok:true,ignored:true};update={...update,message:{...c.message,from:c.from,text:'/'+c.data}}}
  if(!update.message||!update.message.text)return {ok:true,ignored:true};
  const identity=privateIdentity(update);
  if(update.callback_query&&this.sendEnabled){try{await this.telegram.call(this.token(bot),'answerCallbackQuery',{callback_query_id:String(update.callback_query.id)})}catch{}}
  const claim=await this.store.claim(id('update',botId,update.update_id),{kind:'update',bot_id:botId,telegram_id:identity.telegram_id,status:'claimed',due_at:new Date(this.now()+7*DAY).toISOString(),payload:'{}'});if(!claim)return {ok:true,duplicate:true};
  await this.store.rate(identity.telegram_id,'bot',this.now(),5);
  const memberId=id('member',identity.telegram_id);let member=await this.store.get('telegram_members',memberId),fresh=false;
  const [command,arg]=identity.text.split(/\s+/,2),cmd=command.split('@')[0].toLowerCase();
  if(!member){if(cmd!=='/start')return {ok:true,ignored:true};try{member=await this.store.create('telegram_members',memberId,{telegram_id:identity.telegram_id,chat_id:identity.chat_id,first_name:identity.first_name,username:identity.username,plan:'free',is_active:true,joined_at:new Date(this.now()).toISOString(),delivery_day:0,next_send_at:new Date(this.now()).toISOString(),source:'telegram'}) ;fresh=true}catch(e){if(e.code!==409)throw e;member=await this.store.get('telegram_members',memberId)}}
  if(cmd==='/start')await this.store.putState(id('consent',botId,identity.telegram_id),{chat_id:identity.chat_id},{kind:'consent',bot_id:botId,telegram_id:identity.telegram_id,status:'allowed'});
  const consent=await this.consent(botId,identity.telegram_id);if(!consent||consent.status!=='allowed')return {ok:true,ignored:true};
  if(cmd==='/start'&&arg?.startsWith('link_')){try{member=await this.link(member,arg.slice(5))}catch(e){if(this.sendEnabled&&!(await this.config()).dry_run)return this.delivery.text(member,bot,e.status?e.message:'Belum dapat menghubungkan akun. Buat link baru dari Member Area.',id('reply',botId,update.update_id),'reply');return {ok:true,link_failed:true}}}else member=await this.sync(member);
  const setting=await this.config(),main=await this.main();if(!this.sendEnabled||setting.dry_run)return {ok:true,dry_run:true};
  const key=id('reply',botId,update.update_id);
  if(cmd==='/prompt'||cmd==='/start'){
   if(!main||main.$id!==botId)return this.delivery.text(member,bot,'Kamu sudah terdaftar di bot ini. Pengiriman rutin mengikuti bot utama yang dipilih admin.',key,'reply');
   if((fresh||!member.last_sent_at||Date.parse(member.next_send_at)<=this.now())&&member.is_active)return this.delivery.prompt(member,bot,{key:id('period',member.telegram_id,member.plan,member.next_send_at||'first'),welcome:fresh});
   return this.delivery.text(member,bot,'Selamat datang di BADAI PROMPT! Prompt berikutnya: '+new Date(member.next_send_at).toLocaleString('id-ID',{timeZone:'Asia/Jakarta'})+' WIB. Gunakan /status untuk melihat paket.',key,'reply');
  }
  if(cmd==='/login'||cmd==='/akses'){
   if(member.plan!=='premium')return this.delivery.text(member,bot,'Login otomatis hanya untuk member Premium aktif.',id('login-not-premium',botId,update.update_id),'reply');
   const link=await this.login.issue(member,bot);
   return this.delivery.text(member,bot,'BUKA MEMBER AREA BADAI PROMPT\n\nTautan ini sekali pakai dan berlaku 5 menit. Jangan teruskan ke orang lain.',id('login-url',botId,update.update_id),'reply',{inline_keyboard:[[{text:'BUKA MEMBER AREA',url:link.url}]]});
  }
  if(cmd==='/premium'&&member.plan==='free')return this.qris.offer(member,bot,'command');
  if(cmd==='/premium')return this.delivery.text(member,bot,'Premium sudah aktif. Gunakan /status untuk memeriksa masa aktif.',key,'reply');
  if(cmd==='/terms'||cmd==='/paysupport'||cmd==='/support')return this.delivery.text(member,bot,await this.qris.help(cmd),key,'reply');
  if(cmd==='/status')return this.delivery.text(member,bot,'Paket: '+member.plan.toUpperCase()+'\nMasa aktif: '+(member.plan==='premium'?(member.premium_until?new Date(member.premium_until).toLocaleDateString('id-ID',{timeZone:'Asia/Jakarta'}):'Mengikuti hak akses lama'):'Gratis')+'\nPrompt terkirim: '+(member.delivery_day||0),key,'reply');
  return this.delivery.text(member,bot,'Panduan BADAI PROMPT\n/start — daftar gratis\n/prompt — prompt sesuai jadwal\n/premium — informasi premium\n/status — status akun\n/login — masuk Member Area\n/bantuan — panduan\nHubungkan langganan dari menu Akun di Member Area.',key,'reply');
 }
 async monitor(){
  const now=this.now(),counts=async(table,filters)=>(await this.store.list(table,filters,1)).total;
  const [due,deleteDue,retry,uncertain,failed,last]=await Promise.all([
   counts('telegram_members',[['equal','is_active',true],['lessThanEqual','next_send_at',new Date(now).toISOString()]]),
   counts('telegram_deliveries',[['equal','plan','free'],['lessThanEqual','delete_at',new Date(now).toISOString()]]),
   counts('telegram_deliveries',[['equal','dispatch_status','retry']]),counts('telegram_deliveries',[['equal','dispatch_status',['uncertain','reserved','sending']]]),counts('telegram_deliveries',[['equal','dispatch_status',['failed','delete_failed']]]),this.store.state('telegram-scheduler-last')]);
  const config=await this.config(),measured=last?.data?.sent||0;
  return {due,delete_due:deleteDue,retry,uncertain,failed,last_run:last?.data||null,configured_daily_ceiling:config.max_members_per_run*96,measured_daily_estimate:measured*96,estimated_drain_hours:measured?Math.ceil(due/measured)*0.25:null,capacity_note:'Batas konfigurasi bukan jaminan throughput; ukur latency, kuota Appwrite dan batas Telegram sebelum skala 1.000–10.000.'};
 }
 async scheduler({forceDry=false,budgetMs=20000}={}){
  const start=this.now(),wallStart=Date.now(),setting=await this.config(),dry=forceDry||setting.dry_run||!this.sendEnabled,bot=await this.main();
  const remaining=()=>budgetMs-(Date.now()-wallStart),iso=new Date(start).toISOString();
  // A real-time 30-second lease serializes scheduled workers across minute boundaries.
  const leaseOwner=random();if(!dry&&!await this.store.acquireLease(start,leaseOwner))return {ok:true,duplicate:true};
  if(!dry)this.telegram.setDeadline?.(Date.now()+budgetMs-1000);
  const result={ok:true,dry_run:dry,due:0,sent:0,failed:0,deleted:0,reminders:0,processed:0};
  try{
   if(!dry){const cursor=(await this.store.state('telegram-delete-cursor'))?.data.cursor;let deletions=await this.store.list('telegram_deliveries',[['equal','plan','free'],['lessThanEqual','delete_at',iso]],setting.batch_size,cursor);if(cursor&&!deletions.rows.length)deletions=await this.store.list('telegram_deliveries',[['equal','plan','free'],['lessThanEqual','delete_at',iso]],setting.batch_size);let last=null;for(const row of deletions.rows){if(remaining()<9000)break;last=row.$id;try{if((await this.delivery.remove(row)).ok)result.deleted++}catch{result.failed++}}await this.store.putState('telegram-delete-cursor',{cursor:last},{kind:'cursor'});}
   if(!bot)return {...result,paused:true,reason:'Bot utama belum dipilih.'};
   if((!setting.enabled||setting.paused)&&!forceDry)return {...result,paused:true};
   if(!dry&&remaining()>10000){const settled=await this.qris.recover(bot,Math.min(5,setting.batch_size));result.paid_activated=settled.processed}
   if(dry){result.due=(await this.store.list('telegram_members',[['equal','is_active',true],['lessThanEqual','next_send_at',iso]],1)).total;return result;}
   // Reminders have their own cursor and budget priority, so a busy delivery queue cannot starve them.
   const premiumCursor=(await this.store.state('telegram-premium-cursor'))?.data.cursor;
   const premium=await this.store.list('telegram_members',[['equal','plan','premium'],['lessThanEqual','premium_until',new Date(start+30*DAY).toISOString()],['greaterThan','premium_until',iso]],setting.batch_size,premiumCursor);let lastPremium=null;
   for(let member of premium.rows){if(remaining()<9000)break;lastPremium=member.$id;member=await this.sync(member);if(member.plan!=='premium'||!member.premium_until)continue;const consent=await this.consent(bot.$id,member.telegram_id);if(!consent||consent.status!=='allowed')continue;const days=Math.ceil((Date.parse(member.premium_until)-start)/DAY);if(days<1||days>30)continue;const window=days<=7?7:30;
    // Preserve the old seven-day reminder dedup key for already-sent reminders.
    const key=window===7?id('renewal',member.telegram_id,member.premium_until):id('renewal-30',member.telegram_id,member.premium_until);
    const r=await this.delivery.text(member,bot,'Masa Premium berakhir pada '+new Date(member.premium_until).toLocaleDateString('id-ID',{timeZone:'Asia/Jakarta'})+'. Pengingat '+window+' hari: siapkan perpanjangan untuk melanjutkan akses.',key,'reminder');if(r.ok)result.reminders++;
   }
   await this.store.putState('telegram-premium-cursor',{cursor:premium.rows.length<setting.batch_size?null:lastPremium},{kind:'cursor'});
   // Only definitively rejected sends can retry; partial/ambiguous sends remain held for review.
   const retries=await this.store.list('telegram_deliveries',[['equal','dispatch_status','retry'],['lessThanEqual','retry_at',iso]],setting.batch_size);
   for(const row of retries.rows){if(remaining()<9000)break;if(row.attempts>=3||row.bot_id!==bot.$id){await this.store.update('telegram_deliveries',row.$id,{dispatch_status:'failed',retry_at:null,error_code:'Retry dibatasi atau bot berubah; review diperlukan.'});continue}const member=await this.store.get('telegram_members',id('member',row.telegram_id));if(member)try{await this.delivery.prompt(member,bot,{key:row.delivery_key,promptId:row.prompt_id})}catch{result.failed++}}
   let cursor=(await this.store.state('telegram-delivery-cursor'))?.data.cursor,wrapped=false;
   while(result.processed<setting.max_members_per_run&&remaining()>9000){
    const page=await this.store.list('telegram_members',[['equal','is_active',true],['lessThanEqual','next_send_at',iso]],Math.min(setting.batch_size,setting.max_members_per_run-result.processed),cursor);if(result.processed===0)result.due=page.total;
    if(!page.rows.length){if(cursor&&!wrapped&&result.processed===0){cursor=null;wrapped=true;continue}break}
    const outcomes=await Promise.all(page.rows.map(async member=>{try{member=await this.sync(member);const consent=await this.consent(bot.$id,member.telegram_id);if(!consent||consent.status!=='allowed')return {};const r=await this.delivery.prompt(member,bot,{key:id('period',member.telegram_id,member.plan,member.next_send_at||'first')});return r}catch(e){return {ok:false,error:safeError(e)}}}));
    for(const r of outcomes){if(r.ok)result.sent++;else if(r.ok===false)result.failed++}result.processed+=page.rows.length;cursor=page.rows.at(-1).$id;
    await this.store.putState('telegram-delivery-cursor',{cursor},{kind:'cursor'});if(page.rows.length<setting.batch_size)break;
   }
   const expired=await this.store.list('telegram_state',[['equal','kind',['rate','update','attempt','used','switch','run','link','audit']],['lessThanEqual','due_at',iso]],20);for(const row of expired.rows){if(remaining()<1000)break;await this.store.remove('telegram_state',row.$id)}
   await this.store.putState('telegram-scheduler-last',{...result,at:new Date(start).toISOString(),duration_ms:Date.now()-wallStart,budget_ms:budgetMs},{kind:'monitor'});return result;
  }finally{if(!dry){this.telegram.setDeadline?.(null);await this.store.releaseLease(leaseOwner)}}
 }
}
