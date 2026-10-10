import {fail,id,privateIdentity} from './security.mjs';
import {DAY} from './policy.mjs';

// Server-only opt-in. In-bot third-party payments for digital products are not
// compliant with Telegram's digital-goods Stars policy. Do not enable by default.
const PRICE=199000;
const money=v=>'Rp'+Number(v).toLocaleString('id-ID');
const rawData=r=>({...r,...(r?.data||{})});
const REWARD='BADAI PROMPT Premium — akses 365 hari';
export class QrisChat{
 constructor(service){this.s=service}
 async settings(){
  const [price,min,provider]=await Promise.all([
   this.s.store.get('settings','product_price'),
   this.s.store.get('settings','minimum_price'),
   this.s.store.get('payment_settings','buatqris')
  ]);
  const amount=Number(rawData(price).value),floor=Number(rawData(min).value);
  // Never silently accept old multi-price marketing settings.
  if(amount!==PRICE||floor!==PRICE)throw fail('Harga backend belum sama dengan Rp199.000. QRIS bot terkunci.',409);
  const p=rawData(provider);
  if(!p.is_active||!p.account_id||!p.secret_token||!p.callback_url||!p.api_url)throw fail('Merchant buatqris belum siap.',503);
  return {price:amount,p};
 }
 async ready(){
  const cfg=await this.s.config();
  return Boolean(this.s.qrisEnabled&&this.s.sendEnabled&&!cfg.dry_run&&cfg.enabled&&!cfg.paused&&this.s.grantPaidAccess&&this.s.passwordlessEnabled);
 }
 freeMessage(setting,deliveryId){
  return {text:'Pesan gratis ini akan dihapus setelah '+setting.delete_hours+' jam.\nPrompt gratis berikutnya dikirim '+setting.free_days+' hari lagi.\nMau semua koleksi Premium + rekomendasi setiap hari selama 365 hari?',reply_markup:{inline_keyboard:[[{text:'MAU',callback_data:'upsell:'+deliveryId}]]}};
 }
 async offer(member,bot,origin='command'){
  member=await this.s.sync(member);
  if(member.plan!=='free')return {ok:true,already_premium:true};
  const key=id('qris-offer',bot.$id,member.telegram_id,origin==='command'?Math.floor(this.s.now()/60000):origin);
  await this.s.store.claim(key,{kind:'qris_offer',bot_id:bot.$id,telegram_id:member.telegram_id,status:'offered',payload:JSON.stringify({price:PRICE})});
  const text='BADAI PROMPT PREMIUM\n\nBuka seluruh perpustakaan prompt di Member Area.\nDapat rekomendasi prompt setiap hari selama 365 hari.\nPesan Premium tidak dihapus bot.\nUpdate koleksi mengikuti masa aktif.\n\nHarga: '+money(PRICE)+' untuk 365 hari.\nPerpanjangan dilakukan secara manual.\n\nPembayaran melalui QRIS buatqris. Syarat dan bantuan: /terms dan /paysupport.';
  return this.s.delivery.text(member,bot,text,key,'upsell',{inline_keyboard:[[{text:'BELI PREMIUM',callback_data:'qris:'+key}]]});
 }
 async callback(bot,c){
  const who=privateIdentity({message:{...c.message,from:c.from}});
  const member=await this.s.store.get('telegram_members',id('member',who.telegram_id));
  if(!member||((await this.s.consent(bot.$id,member.telegram_id))?.status!=='allowed'))return {ok:true,ignored:true};
  const [action,ref]=String(c.data||'').split(':',2);
  if(action==='upsell'&&ref!=='command'){
   const delivery=await this.s.store.get('telegram_deliveries',ref);
   if(!delivery||delivery.kind!=='prompt'||delivery.plan!=='free'||delivery.dispatch_status!=='sent'||delivery.telegram_id!==member.telegram_id||delivery.bot_id!==bot.$id)throw fail('Penawaran tidak sesuai.',403);
  }
  if(action==='qris'){
   const offer=await this.s.store.state(ref);
   if(!offer||offer.kind!=='qris_offer'||offer.telegram_id!==member.telegram_id||offer.bot_id!==bot.$id)throw fail('Penawaran tidak ditemukan.',403);
  }
  try{await this.s.telegram.call(this.s.token(bot),'answerCallbackQuery',{callback_query_id:String(c.id)})}catch{}
  const current=await this.s.sync(member);
  if(current.plan!=='free')return {ok:true,already_premium:true};
  if(action==='upsell')return this.offer(current,bot,ref);
  if(action==='qris')return this.invoice(current,bot,ref);
  return {ok:true,ignored:true};
 }
 async invoice(member,bot,ref){
  if(!await this.ready())return this.s.delivery.text(member,bot,'Checkout QRIS belum dibuka. Tidak ada tagihan dibuat. Silakan gunakan /paysupport.',id('qris-not-ready',bot.$id,member.telegram_id,ref),'reply');
  const c=await this.settings();
  const intent=id('qris-intent',bot.$id,member.telegram_id,ref);
  if(!await this.s.store.claim(intent,{kind:'qris_intent',bot_id:bot.$id,telegram_id:member.telegram_id,status:'creating',payload:'{}'}))return {ok:true,duplicate:true};
  await this.s.store.rate(member.telegram_id,'checkout',this.s.now(),2);
  const form=new URLSearchParams({
   action:'api_create_qris',account_id:String(c.p.account_id),secret_token:String(c.p.secret_token),
   amount:String(c.price),description:REWARD+' (Telegram)',fee_by:String(c.p.fee_by||'merchant'),
   callback_url:String(c.p.callback_url),qris_method:String(c.p.qris_method||'qris_two')
  });
  if(c.p.umkm_name)form.set('umkm_name',String(c.p.umkm_name).slice(0,15));
  if(c.p.test_mode)form.set('test','1');
  let result;
  try{
   const response=await this.s.fetcher(String(c.p.api_url),{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:form.toString(),signal:AbortSignal.timeout(8000)});
   const payload=await response.json();result=payload.data||payload;
   if(!response.ok||payload.success===false||!result.transaction_id||!result.qr_url&&!result.qris_image)throw fail('BuatQRIS tidak dapat membuat QR.',502);
  }catch(e){
   // Provider may have created a transaction before the network failed. Hold for review.
   await this.s.store.update('telegram_state',intent,{status:'uncertain'});
   throw fail('Status checkout belum pasti. Hubungi admin sebelum membuat transaksi baru.',503);
  }
  const transactionId=String(result.transaction_id);
  const expires=Date.parse(result.expired_at)||this.s.now()+15*60000;
  const invoiceId=id('qris-invoice',transactionId);
  await this.s.store.claim(invoiceId,{kind:'bot_qris_invoice',bot_id:bot.$id,telegram_id:member.telegram_id,status:'pending',due_at:new Date(expires).toISOString(),payload:JSON.stringify({transaction_id:transactionId,price:c.price,total_amount:Number(result.total_amount||result.amount||c.price),intent_id:intent,created_at:new Date(this.s.now()).toISOString()})});
  await this.s.store.update('telegram_state',intent,{status:'created'});
  const qr=String(result.qr_url||result.qris_image);
  const message='QRIS BADAI PROMPT PREMIUM\n\nTagihan: '+money(result.total_amount||result.amount||c.price)+'\nMasa akses: 365 hari\nBatas pembayaran: '+new Date(expires).toLocaleString('id-ID',{timeZone:'Asia/Jakarta'})+' WIB\n\nSetelah pembayaran terverifikasi, status Premium diaktifkan otomatis. Tidak perlu kirim bukti transfer.';
  try{
   await this.s.telegram.call(this.s.token(bot),'sendPhoto',{chat_id:member.chat_id,photo:qr,caption:message.slice(0,1000)});
  }catch(e){
   // Do not create a second payment if Telegram delivery was ambiguous.
   await this.s.store.update('telegram_state',invoiceId,{status:'qr_delivery_uncertain'});
   throw e;
  }
  return {ok:true,invoice_id:invoiceId,expires_at:new Date(expires).toISOString()};
 }
 async entitlement(member){
  const row=await this.s.store.state(id('qris-access',member.telegram_id));
  if(!row||row.status!=='active')return null;
  const until=Date.parse(row.data.until);
  if(!row.data.lifetime&&(!Number.isFinite(until)||until<=this.s.now()))return null;
  const target=row.data.lifetime?null:row.data.until;
  if(member.plan!=='premium'||member.premium_until!==target){
   member=await this.s.store.update('telegram_members',member.$id,{plan:'premium',premium_until:target,premium_started_at:member.premium_started_at||row.data.paid_at,next_send_at:new Date(this.s.now()).toISOString()});
  }
  return member;
 }
 async complete(invoice,bot){
  if(!invoice||!['paid','activated'].includes(invoice.status)||invoice.kind!=='bot_qris_invoice'||invoice.bot_id!==bot.$id)return {ignored:true};
  const memberId=id('member',invoice.telegram_id),accessId=id('qris-access',invoice.telegram_id);
  let member=await this.s.store.get('telegram_members',memberId);
  if(!member)throw fail('Member untuk QRIS ini tidak ditemukan.',503);
  const paidAt=invoice.data.paid_at||new Date(this.s.now()).toISOString();
  await this.s.store.transaction(async tx=>{
   const state=await tx.state(invoice.$id),old=await tx.state(accessId),current=await tx.get('telegram_members',memberId);
   if(state.status!=='paid')return;
   const lifetime=Boolean(old?.data.lifetime)||(current.plan==='premium'&&!current.premium_until);
   const until=lifetime?null:new Date(Math.max(Date.parse(paidAt),Date.parse(old?.data.until)||0,Date.parse(current.premium_until)||0)+365*DAY).toISOString();
   await tx.put(accessId,{until,lifetime,paid_at:paidAt,transaction_id:state.data.transaction_id},{kind:'qris_access',telegram_id:invoice.telegram_id,status:'active'},Boolean(old));
   await tx.update('telegram_members',memberId,{plan:'premium',premium_until:until,premium_started_at:current.premium_started_at||paidAt,is_active:true,next_send_at:paidAt});
   await tx.update('telegram_state',invoice.$id,{status:'activated',payload:JSON.stringify({...state.data,activated_at:new Date(this.s.now()).toISOString(),until})});
  });
  member=await this.s.store.get('telegram_members',memberId);
  // A successful payment first provisions/reconciles a verified Telegram identity.
  member=await this.s.login.ensureAccount(member);
  await this.grant(member,member.appwrite_user_id);
  const link=await this.s.login.issue(member,bot);
  await this.s.delivery.text(member,bot,'Pembayaran QRIS terverifikasi! Premium aktif 365 hari. Tekan BUKA MEMBER AREA untuk masuk tanpa formulir. Tautan berlaku 5 menit.',id('qris-paid-notice',invoice.$id),'reply',{inline_keyboard:[[{text:'BUKA MEMBER AREA',url:link.url}]]});
  try{await this.s.delivery.prompt(member,bot,{key:id('qris-first',invoice.$id)})}catch{}
  return {ok:true};
 }
 async grant(member,userId=member.appwrite_user_id){
  const access=await this.s.store.state(id('qris-access',member.telegram_id));
  if(!userId||!access||access.status!=='active')return;
  if(!this.s.grantPaidAccess)throw fail('Sinkronisasi Member Area belum tersedia.',503);
  await this.s.grantPaidAccess(userId,access.data.until,member.telegram_id);
  await this.s.store.putState(id('qris-linked',member.telegram_id),{user_id:userId,until:access.data.until},{kind:'qris_linked',telegram_id:member.telegram_id,user_id:userId,status:'synced'});
 }
 async recover(bot,budget=5){
  if(!this.s.qrisEnabled||!this.s.grantPaidAccess)return {processed:0};
  const page=await this.s.store.list('telegram_state',[['equal','kind','bot_qris_invoice'],['equal','bot_id',bot.$id],['equal','status',['paid','activated']]],budget);
  let processed=0;
  for(const raw of page.rows){
   const invoice=await this.s.store.state(raw.$id);
   try{await this.complete(invoice,bot);processed++}catch{} 
  }
  return {processed};
 }
 async help(cmd){return cmd==='/terms'?'BADAI PROMPT Premium: akses 365 hari, perpanjangan manual. Syarat lengkap: https://badaiprompt.vercel.app/terms.html':'Bantuan pembayaran BADAI PROMPT: https://badaiprompt.vercel.app/support.html';}
}