import {fail,id,numeric,privateIdentity} from './security.mjs';
import {DAY} from './policy.mjs';
const BASE={price:null,checkout_enabled:false,terms:'',support:''};
export class Stars{
 constructor(service){this.s=service}
 async config(){return {...BASE,...(await this.s.store.state('telegram-stars-settings'))?.data}}
 async configure(body){
  const old=await this.config(),price=body.price;
  if(!Number.isSafeInteger(price)||price<1||price>1000000)throw fail('Harga Stars harus bilangan bulat 1–1.000.000 XTR.');
  if(typeof body.checkout_enabled!=='boolean')throw fail('Status checkout tidak valid.');
  const terms=String(body.terms||'').trim(),support=String(body.support||'').trim();
  if(terms.length>2000||support.length>500)throw fail('Syarat atau bantuan terlalu panjang.');
  if(body.checkout_enabled&&(!this.s.starsEnabled||!this.s.grantPaidAccess))throw fail('Aktivasi pembayaran belum diizinkan server.',409);
  if(body.checkout_enabled&&(!terms||!support))throw fail('Isi syarat pembelian dan kontak bantuan pembayaran.');
  const config={...old,price,terms,support,checkout_enabled:body.checkout_enabled};
  await this.s.store.putState('telegram-stars-settings',config);return {ok:true,config};
 }
 async ready(){const c=await this.config(),s=await this.s.config();return Boolean(this.s.starsEnabled&&this.s.sendEnabled&&this.s.grantPaidAccess&&c.checkout_enabled&&c.price&&c.terms&&c.support&&!s.dry_run)}
 freeMessage(setting,deliveryId){return {text:`Pesan Free ini akan dihapus setelah ${setting.delete_hours} jam.\nPrompt gratis berikutnya hadir ${setting.free_days} hari lagi.\nMau prompt pilihan setiap hari dan akses Premium selama 365 hari?`,reply_markup:{inline_keyboard:[[{text:'MAU',callback_data:'upsell:'+deliveryId}]]}}}
 async event(kind,key,member,bot){await this.s.store.claim(id(kind,key),{kind,telegram_id:member.telegram_id,bot_id:bot.$id,status:'recorded',payload:'{}'})}
 async offer(member,bot,key){
  member=await this.s.sync(member);if(member.plan!=='free')return {ok:true,ignored:true};
  const c=await this.config(),text='BUKA SEMUA — PREMIUM BADAI PROMPT\n\nSemua koleksi Member Area langsung terbuka setelah akun dihubungkan.\nPrompt pilihan dikirim setiap hari.\nPesan Premium tidak dihapus otomatis.\nUpdate koleksi selama masa aktif.\nMasa akses 365 hari; perlu perpanjangan setelah berakhir.\n\n'+(c.price?`Harga: ${c.price} Telegram Stars (XTR).\n`:'Harga Stars sedang disiapkan.\n')+'Pembelian di bot memakai Telegram Stars.\n'+(c.terms?'Syarat pembelian:\n'+c.terms+'\n\n':'')+'Dengan DAFTAR SEKARANG, kamu menyetujui syarat pembelian. Bantuan: /paysupport.';
  const offerId=id('stars-offer',bot.$id,member.telegram_id,key==='command'?id('command',Math.floor(this.s.now()/60000),c.price,c.terms):key);
  await this.s.store.claim(offerId,{kind:'stars_offer',bot_id:bot.$id,telegram_id:member.telegram_id,status:'offered',payload:JSON.stringify({price:c.price,terms:c.terms})});
  return this.s.delivery.text(member,bot,text,offerId,'upsell',{inline_keyboard:[[{text:'DAFTAR SEKARANG',callback_data:'stars:'+offerId}]]});
 }
 async callback(bot,c){
  const identity=privateIdentity({message:{...c.message,from:c.from}}),member=await this.s.store.get('telegram_members',id('member',identity.telegram_id));
  if(!member)return {ok:true,ignored:true};
  const consent=await this.s.consent(bot.$id,member.telegram_id);if(consent?.status!=='allowed')return {ok:true,ignored:true};
  await this.s.requireSend();
  const [action,key]=String(c.data).split(':',2);
  if(action==='stars'){const offered=await this.s.store.state(key);const message=await this.s.store.get('telegram_deliveries',id('delivery',key));if(!offered||offered.kind!=='stars_offer'||offered.bot_id!==bot.$id||offered.telegram_id!==member.telegram_id||message?.dispatch_status!=='sent')throw fail('Penawaran belum tersedia.',403)}
  if(action==='upsell'&&key!=='command'){
   const delivery=await this.s.store.get('telegram_deliveries',key);
   if(!delivery||delivery.bot_id!==bot.$id||delivery.telegram_id!==member.telegram_id||delivery.plan!=='free'||delivery.kind!=='prompt'||delivery.dispatch_status!=='sent')throw fail('Penawaran tidak valid.',403);
  }
  try{await this.s.telegram.call(this.s.token(bot),'answerCallbackQuery',{callback_query_id:String(c.id)})}catch{}
  const current=await this.s.sync(member);if(current.plan!=='free')return {ok:true,ignored:true};
  // One tracked click/offer/invoice per actual prompt; command purchases use a separate key.
  if(action==='upsell'){await this.event('stars_click',id(bot.$id,member.telegram_id,key),member,bot);return this.offer(current,bot,key)}
  if(action==='stars')return this.invoice(current,bot,key);
  return {ok:true,ignored:true};
 }
 async invoice(member,bot,key){
  if(!await this.ready())return this.s.delivery.text(member,bot,'Pembayaran Stars belum dibuka. Tidak ada tagihan dibuat. Gunakan /paysupport untuk bantuan.',id('stars-disabled',bot.$id,member.telegram_id,key),'reply');
  const c=await this.config(),offer=await this.s.store.state(key);if(!offer||offer.data.price!==c.price||offer.data.terms!==c.terms)throw fail('Harga atau syarat berubah. Minta penawaran baru melalui /premium.');
  const rowId=id('stars-invoice',bot.$id,member.telegram_id,key),now=this.s.now();
  const row=await this.s.store.claim(rowId,{kind:'stars_invoice',bot_id:bot.$id,telegram_id:member.telegram_id,status:'sending',due_at:new Date(now+30*60000).toISOString(),payload:JSON.stringify({amount:c.price,currency:'XTR',terms:c.terms,terms_accepted_at:new Date(now).toISOString(),created_at:new Date(now).toISOString()})});
  if(!row)return {ok:true,duplicate:true};
  try{
   const response=await this.s.telegram.call(this.s.token(bot),'sendInvoice',{chat_id:member.telegram_id,title:'BADAI PROMPT Premium 365 hari',description:'Semua koleksi Member Area, prompt pilihan harian dan update koleksi selama 365 hari. Pesan Premium tidak dihapus otomatis. Perlu perpanjangan.',payload:rowId,provider_token:'',currency:'XTR',prices:[{label:'Premium 365 hari',amount:c.price}],start_parameter:'premium',protect_content:true});
   await this.s.store.transaction(async tx=>{const current=await tx.state(rowId);await tx.put(rowId,{...current.data,message_id:String(response.message_id)},{kind:'stars_invoice',bot_id:bot.$id,telegram_id:member.telegram_id,status:current.status==='sending'?'sent':current.status,due_at:row.due_at},true)});
   return {ok:true,invoice_id:rowId};
  }catch(e){await this.s.store.transaction(async tx=>{const current=await tx.state(rowId);if(current.status==='sending')await tx.update('telegram_state',rowId,{status:e.ambiguous?'uncertain':'failed'})});throw e}
 }
 async validate(bot,userId,payment,{checkout=false}={}){
  const row=await this.s.store.state(String(payment.invoice_payload||''));
  if(!row||row.kind!=='stars_invoice'||row.bot_id!==bot.$id||row.telegram_id!==numeric(userId)||payment.currency!=='XTR'||!Number.isSafeInteger(payment.total_amount)||payment.total_amount!==row.data.amount)throw fail('Invoice, pembeli, mata uang, atau jumlah tidak sesuai.',403);
  if(checkout&&(!['sending','sent','approved'].includes(row.status)||Date.parse(row.due_at)<=this.s.now()||!await this.ready()))throw fail('Checkout belum tersedia atau invoice kedaluwarsa.');
  if(!checkout&&row.status!=='paid'){const proof=await this.s.store.state(id('stars-precheckout',row.$id));if(!proof||proof.bot_id!==bot.$id||proof.telegram_id!==row.telegram_id||proof.data.amount!==row.data.amount||proof.data.currency!=='XTR')throw fail('Pembayaran belum melewati validasi checkout.',403);}
  return row;
 }
 async precheckout(bot,q){
  let ok=false,timer;const started=Date.now();
  const validate=async()=>{
   const user=numeric(q.from?.id),invoiceId=String(q.invoice_payload||'');
   const [row,c,setting,access]=await Promise.all([this.s.store.state(invoiceId),this.config(),this.s.config(),this.s.store.state(id('stars-access',user))]);
   if(q.from?.is_bot||!row||row.kind!=='stars_invoice'||row.bot_id!==bot.$id||row.telegram_id!==user||q.currency!=='XTR'||!Number.isSafeInteger(q.total_amount)||q.total_amount!==row.data.amount||!['sending','sent','approved'].includes(row.status)||Date.parse(row.due_at)<=this.s.now())throw fail('Invoice tidak valid.');
   if(!this.s.starsEnabled||!this.s.sendEnabled||!this.s.grantPaidAccess||!c.checkout_enabled||setting.dry_run)throw fail('Pembayaran belum diizinkan.');
   if(access?.status==='active'&&(!access.data.until||Date.parse(access.data.until)>this.s.now()))throw fail('Premium sudah aktif.');
   const proofId=id('stars-precheckout',invoiceId),proof=await this.s.store.claim(proofId,{kind:'stars_precheckout',bot_id:bot.$id,telegram_id:user,status:'approved',payload:JSON.stringify({query_id:String(q.id),amount:row.data.amount,currency:'XTR'})});
   if(!proof){const previous=await this.s.store.state(proofId);if(previous?.data.query_id!==String(q.id))throw fail('Invoice sedang diproses. Minta invoice baru melalui /premium.');}
   return true;
  };
  try{ok=await Promise.race([validate(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(fail('Validasi terlalu lama.')),4000)})])}catch{}finally{clearTimeout(timer)}
  // Reserve response time inside Telegram's mandatory 10-second window.
  this.s.telegram.setDeadline?.(started+9000);
  try{await this.s.telegram.call(this.s.token(bot),'answerPreCheckoutQuery',{pre_checkout_query_id:String(q.id),ok,...(!ok?{error_message:'Invoice belum tersedia, sudah dibayar, atau tidak sesuai. Gunakan /paysupport.'}:{})})}finally{this.s.telegram.setDeadline?.(null)}
  return {ok:true,checkout_approved:ok};
 }
 async entitlement(member){
  const state=await this.s.store.state(id('stars-access',member.telegram_id));
  if(!state||state.status!=='active')return null;
  if(state.data.until&&Date.parse(state.data.until)<=this.s.now()){if(!member.appwrite_user_id)return this.s.store.update('telegram_members',member.$id,{plan:'free',premium_until:state.data.until});return null;}
  // Preserve later website renewals and legacy lifetime access alongside the Stars ledger.
  let until=state.data.until;
  if(member.appwrite_user_id){const profile=await this.s.store.get('member_profiles',member.appwrite_user_id);if(profile?.status==='active'&&(!profile.access_until||Date.parse(profile.access_until)>this.s.now())&&await this.s.verifyPaidAccess(member.appwrite_user_id)){if(!profile.access_until)until=null;else if(until&&Date.parse(profile.access_until)>Date.parse(until))until=profile.access_until}}
  // Access originates only in the authenticated successful_payment transaction.
  if(member.plan!=='premium'||member.premium_until!==until)member=await this.s.store.update('telegram_members',member.$id,{plan:'premium',premium_until:until,premium_started_at:member.premium_started_at||state.data.paid_at,is_active:true});
  return member;
 }
 async payment(bot,identity,payment){
  const invoice=await this.validate(bot,identity.telegram_id,payment),charge=String(payment.telegram_payment_charge_id||'');
  if(!charge||charge.length>512||payment.is_recurring||payment.is_first_recurring||payment.subscription_expiration_date)throw fail('Charge ID atau jenis pembayaran tidak valid.',403);
  const chargeId=id('stars-charge',charge),memberId=id('member',identity.telegram_id),accessId=id('stars-access',identity.telegram_id),paidAt=new Date(this.s.now()).toISOString();
  let existing=await this.s.store.state(chargeId);
  if(existing){if(existing.bot_id!==bot.$id||existing.data.invoice_id!==invoice.$id||existing.telegram_id!==identity.telegram_id||existing.data.charge_id!==charge)throw fail('Charge ID sudah terikat pembayaran lain.',409);return this.complete(existing,bot)}
  // Synchronize legacy paid rights before the transactional merge; never reduce a lifetime term.
  const original=await this.s.store.get('telegram_members',memberId);if(!original)throw fail('Member tidak ditemukan.',404);await this.s.sync(original);
  await this.s.store.transaction(async tx=>{
   const issued=await tx.state(invoice.$id),proof=await tx.state(id('stars-precheckout',invoice.$id)),seen=await tx.state(chargeId),access=await tx.state(accessId),member=await tx.get('telegram_members',memberId);
   if(seen)throw fail('Pembayaran sedang diproses. Ulangi webhook.',503);
   if(!proof||proof.bot_id!==bot.$id||proof.telegram_id!==identity.telegram_id||proof.data.amount!==payment.total_amount||proof.data.currency!=='XTR'||!issued||!['sent','sending','approved'].includes(issued.status)||issued.bot_id!==bot.$id||issued.telegram_id!==identity.telegram_id||issued.data.amount!==payment.total_amount)throw fail('Invoice sudah diproses atau berubah.',409);
   const lifetime=member.plan==='premium'&&!member.premium_until||access?.status==='active'&&!access.data.until;
   const until=lifetime?null:new Date(Math.max(Date.parse(paidAt),Date.parse(member.premium_until)||0,Date.parse(access?.data.until)||0)+365*DAY).toISOString();
   const data={invoice_id:issued.$id,charge_id:charge,amount:payment.total_amount,currency:'XTR',paid_at:paidAt,until};
   await tx.put(chargeId,data,{kind:'stars_payment',bot_id:bot.$id,telegram_id:identity.telegram_id,status:'pending'},false);
   await tx.put(accessId,{until,paid_at:paidAt,charge_id:chargeId},{kind:'stars_access',telegram_id:identity.telegram_id,status:'active'},Boolean(access));
   await tx.put(issued.$id,{...issued.data,charge_id:chargeId},{kind:'stars_invoice',bot_id:bot.$id,telegram_id:identity.telegram_id,status:'paid'},true);
   await tx.update('telegram_members',memberId,{plan:'premium',premium_until:until,premium_started_at:member.premium_started_at||paidAt,is_active:true,next_send_at:paidAt});
  });
  existing=await this.s.store.state(chargeId);return this.complete(existing,bot);
 }
 async cancelFree(member){
  let cursor;do{const page=await this.s.store.list('telegram_deliveries',[['equal','telegram_id',member.telegram_id],['equal','plan','free'],['isNotNull','delete_at']],50,cursor);for(const d of page.rows)await this.s.store.update('telegram_deliveries',d.$id,{delete_at:null,retry_at:null});cursor=page.rows.length===50?page.rows.at(-1).$id:null}while(cursor);
 }
 async grant(member,userId=member.appwrite_user_id){
  const access=await this.s.store.state(id('stars-access',member.telegram_id));if(!userId||!access||access.status!=='active'||access.data.until&&Date.parse(access.data.until)<=this.s.now())return;
  if(!this.s.grantPaidAccess)throw fail('Sinkronisasi Member Area belum dikonfigurasi.',503);
  await this.s.grantPaidAccess(userId,access.data.until);
  await this.s.store.putState(id('stars-linked',member.telegram_id),{user_id:userId,until:access.data.until},{kind:'stars_linked',telegram_id:member.telegram_id,user_id:userId,status:'synced'});
 }
 async complete(ledger,bot){
  if(ledger.status==='complete')return {ok:true,duplicate:true};
  let member=await this.s.store.get('telegram_members',id('member',ledger.telegram_id));
  await this.cancelFree(member);await this.grant(member);
  if(!this.s.sendEnabled||(await this.s.config()).dry_run)return {ok:true,activation_pending_delivery:true};
  const welcome=await this.s.delivery.text(member,bot,'Selamat! Premium BADAI PROMPT aktif selama 365 hari.\nPesan Premium tidak dihapus otomatis.\n'+(member.appwrite_user_id?'Member Area kamu sudah disinkronkan.':'Untuk membuka Member Area, masuk atau buat akun dengan email asli lalu hubungkan Telegram. Data pembayaran tidak perlu diisi ulang.')+'\nBantuan pembayaran: /paysupport.',id('stars-welcome',ledger.$id),'premium_welcome',{inline_keyboard:[[{text:member.appwrite_user_id?'BUKA MEMBER AREA':'HUBUNGKAN MEMBER AREA',url:'https://badaiprompt.vercel.app/'+(member.appwrite_user_id?'member':'telegram-access')}]]});
  if(welcome.ok===false||welcome.duplicate&&welcome.delivery?.dispatch_status!=='sent')return {ok:true,activation_pending_delivery:true};
  const first=await this.s.delivery.prompt(member,bot,{key:id('stars-first',ledger.$id)});
  if(first.ok===false||first.uncertain||first.retry_pending||first.duplicate&&first.delivery?.dispatch_status!=='sent')return {ok:true,activation_pending_delivery:true};
  await this.s.store.update('telegram_state',ledger.$id,{status:'complete'});
  return {ok:true,premium_activated:true,until:ledger.data.until};
 }
 async recover(bot){const page=await this.s.store.list('telegram_state',[['equal','kind','stars_payment'],['equal','bot_id',bot.$id],['equal','status','pending']],2);for(const row of page.rows)try{await this.complete({...row,data:JSON.parse(row.payload)},bot)}catch{}}
 async help(cmd){const c=await this.config();return cmd==='/terms'?(c.terms||'Syarat Premium sedang disiapkan; pembayaran belum dibuka.'):'Bantuan pembayaran BADAI PROMPT: '+(c.support||'kontak bantuan sedang disiapkan; pembayaran belum dibuka.')+'\nHubungi pengelola BADAI PROMPT untuk pembelian, akses atau pengembalian Stars. Telegram Support tidak menangani pembelian bot ini.'}
 async status(){
  const config=await this.config(),count=async(kind,status)=>(await this.s.store.list('telegram_state',[['equal','kind',kind],...(status?[['equal','status',status]]:[])],1)).total;
  const [clicks,checkouts,payments,pending,linked,failedCheckouts]=await Promise.all([count('stars_click'),count('stars_invoice'),count('stars_payment'),count('stars_payment','pending'),count('stars_linked'),count('stars_invoice',['failed','uncertain'])]);
  return {ok:true,config,server_enabled:this.s.starsEnabled,account_sync_ready:Boolean(this.s.grantPaidAccess),checkout_ready:await this.ready(),stats:{clicks,checkouts,payments,failed_checkouts:failedCheckouts,activated:payments,pending_delivery:pending,linked,conversion_percent:checkouts?Math.round(payments/checkouts*10000)/100:0}};
 }
}
