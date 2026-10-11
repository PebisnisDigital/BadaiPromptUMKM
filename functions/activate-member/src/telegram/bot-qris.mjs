// Direct-chat QRIS sandbox: one Telegram identity, one invoice, zero buyer forms.
// Off by default. No live payment path or Mini App is exposed.
import {Query,Permission,Role} from 'node-appwrite';
import {id,fail,numeric,safeError} from './security.mjs';
import {calculatePaidAccessUntil,assertProviderSettlement} from './website-checkout-guards.mjs';

const PRICE=199000,BASE='https://badaiprompt.vercel.app';
const unpack=r=>r?({...r,...r.data}):null;
const orderId=tx=>id('bot-qris-order',tx);
const currentId=(botId,telegramId)=>id('bot-qris-current',botId,telegramId);
export const botQrisIds={orderId,currentId};
export const botQrisPrice=PRICE;

export async function grantBotQrisPremium(q,order){
 const data=order?.data;
 if(order?.kind!=='bot_qris_order'||!['paid','activated'].includes(order.status)||
  data?.is_test!==true||!data.telegram_id||!data.transaction_id||
  !data.paid_at||Number(data.amount)!==PRICE)throw fail('Pembayaran belum terverifikasi.',403);
 const tg=numeric(data.telegram_id),member=await q.store.get('telegram_members',id('member',tg));
 if(!member?.is_active)throw fail('Akun Telegram tidak aktif.',409);
 const userId=member.appwrite_user_id||id('bot-qris-user',tg);
 const tgLink=await q.store.state(id('tglink',tg));
 const userLink=await q.store.state(id('userlink',userId));
 if(tgLink&&tgLink.data.user_id!==userId)throw fail('Telegram ditautkan ke akun berbeda.',409);
 if(userLink&&userLink.data.telegram_id!==tg)throw fail('Akun sudah ditautkan ke Telegram berbeda.',409);
 if(order.status==='activated'){
  if(data.user_id!==userId)throw fail('Identitas order berubah.',409);
  return {user_id:userId,access_until:data.access_until,duplicate:true};
 }
 const profile=await q.store.get('member_profiles',userId),planId=id('bot-qris-plan',order.$id);
 await q.store.claim(planId,{kind:'activation_plan',status:'fixed',user_id:userId,telegram_id:tg,
  payload:JSON.stringify({order_id:order.$id,user_id:userId,access_until:calculatePaidAccessUntil({paidAt:data.paid_at,profile})})});
 const plan=await q.store.state(planId);
 if(!plan||plan.data?.order_id!==order.$id||plan.data.user_id!==userId||
  (plan.data.access_until!==null&&!Number.isFinite(Date.parse(plan.data.access_until))))throw fail('Rencana akses tidak cocok.',409);
 const until=plan.data.access_until;
 if(!q.users||!q.teams||!q.tables)throw fail('Server member belum lengkap.',503);
 let user;try{user=await q.users.get({userId})}catch(e){if(Number(e.code)!==404)throw e}
 if(!user){try{await q.users.create({userId,name:String(member.first_name||'Member BADAI').slice(0,128)})}catch(e){if(Number(e.code)!==409)throw e}}
 const check=()=>q.teams.listMemberships({teamId:'paid-members',queries:[Query.equal('userId',userId),Query.limit(10)]});
 let memberships=await check();
 if(!memberships.memberships?.some(m=>m.confirm===true)){
  if(memberships.memberships?.length)throw fail('Keanggotaan masih pending.',409);
  try{await q.teams.createMembership({teamId:'paid-members',roles:['member'],userId})}catch(e){if(Number(e.code)!==409)throw e}
  memberships=await check();
  if(!memberships.memberships?.some(m=>m.confirm===true))throw fail('Keanggotaan belum dikonfirmasi.',409);
 }
 const fields={status:'active',role:'member',access_until:until};
 if(profile)await q.store.update('member_profiles',userId,fields);
 else try{await q.tables.createRow({databaseId:q.store.databaseId,tableId:'member_profiles',rowId:userId,
  data:{...fields,user_id:userId,name:String(member.first_name||'Member BADAI').slice(0,128)},
  permissions:[Permission.read(Role.user(userId))]})}catch(e){if(Number(e.code)!==409)throw e}
 // Existing link rows are immutable ownership claims. No account can be silently reassigned.
 if(!userLink){await q.store.claim(id('userlink',userId),{kind:'userlink',status:'linked',user_id:userId,telegram_id:tg,payload:JSON.stringify({telegram_id:tg})})}
 if(!tgLink){await q.store.claim(id('tglink',tg),{kind:'tglink',status:'linked',user_id:userId,telegram_id:tg,payload:JSON.stringify({user_id:userId})})}
 const finalUserLink=await q.store.state(id('userlink',userId)),finalTgLink=await q.store.state(id('tglink',tg));
 if(finalUserLink?.data?.telegram_id!==tg||finalTgLink?.data?.user_id!==userId)throw fail('Kepemilikan akun berubah.',409);
 await q.store.update('telegram_members',member.$id,{appwrite_user_id:userId});
 await q.service.sync(await q.store.get('telegram_members',member.$id));
 await q.store.update('telegram_state',order.$id,{status:'activated',user_id:userId,
  payload:JSON.stringify({...data,user_id:userId,access_until:until,activated_at:new Date(q.service.now()).toISOString()})});
 return {user_id:userId,access_until:until,duplicate:false};
}

export class BotQris{
 constructor(service,{users,teams,tables,fetcher=fetch,enabled=false}={}){
  this.service=service;this.store=service.store;this.users=users;this.teams=teams;this.tables=tables;this.fetcher=fetcher;this.enabled=enabled;
 }
 ensure(){if(!this.enabled)throw fail('Pembayaran QRIS langsung di bot belum diaktifkan.',503)}
 async provider(){
  const p=unpack(await this.store.get('payment_settings','buatqris'));
  if(!p?.is_active||!p.account_id||!p.secret_token||!p.signing_secret)throw fail('Pengaturan BuatQRIS belum siap.',503);
  const url=String(p.api_url||'https://api.buatqris.site');
  if(!/^https:\/\/(?:api\.buatqris\.site|app\.buatqris\.site\/api)\/?$/.test(url))throw fail('Endpoint pembayaran tidak dikenal.',503);
  return {...p,url};
 }
 async call(p,params){
  let response;try{response=await this.fetcher(p.url,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({action:params.action,account_id:String(p.account_id),secret_token:String(p.secret_token),...params}).toString(),
    signal:AbortSignal.timeout(12000)})}catch{throw fail('Koneksi BuatQRIS belum tersedia.',503)}
  let data={};try{data=await response.json()}catch{throw fail('Respons BuatQRIS tidak valid.',503)}
  if(!response.ok||data.success===false)throw fail('BuatQRIS gagal memproses transaksi.',503);
  return data.data||data;
 }
 async activeOrder(bot,tg){
  const pointer=await this.store.state(currentId(bot.$id,tg));
  return pointer?.data?.order_id?this.store.state(pointer.data.order_id):null;
 }
 async create(member,bot){
  this.ensure();
  const tg=numeric(member.telegram_id);
  if(member.plan==='premium')return {alreadyPremium:true};
  const p=await this.provider();
  const existing=await this.activeOrder(bot,tg);
  if(existing){
   const row=await this.reconcile(existing,p);
   if(row.status==='pending'||row.status==='paid'||row.status==='activated')return {order:row,duplicate:true};
  }
  await this.store.rate(tg,'bot-qris-create',this.service.now(),2);
  const lockId=id('bot-qris-lock',bot.$id,tg,Math.floor(this.service.now()/300000));
  const lock=await this.store.claim(lockId,{kind:'bot_qris_lock',status:'creating',telegram_id:tg,bot_id:bot.$id,
   due_at:new Date(this.service.now()+300000).toISOString(),payload:'{}'});
  if(!lock)throw fail('QRIS sedang diproses. Cek dengan /cek.',409);
  let invoice;
  try{invoice=await this.call(p,{action:'api_create_qris',amount:String(PRICE),
   description:'BADAI PROMPT 365 hari - SANDBOX',callback_url:BASE+'/api/bot-qris-webhook',
   fee_by:String(p.fee_by||'merchant'),qris_method:String(p.qris_method||'qris_two'),test:'1'})}
  catch(e){await this.store.update('telegram_state',lockId,{status:'uncertain'});throw e}
  const tx=String(invoice.transaction_id||''),image=String(invoice.qr_url||invoice.qris_image||'');
  if(!/^[a-zA-Z0-9_-]{1,128}$/.test(tx)||!/^https:\/\//.test(image))throw fail('Invoice QRIS tidak lengkap.',503);
  const amount=Number(invoice.amount??PRICE),total=Number(invoice.total_amount??amount);
  if(amount!==PRICE||!Number.isFinite(total)||total<PRICE)throw fail('Nominal BuatQRIS salah.',503);
  const now=this.service.now(),newId=orderId(tx);
  const data={checkout_type:'telegram_direct',bot_id:bot.$id,telegram_id:tg,transaction_id:tx,
   amount:PRICE,total_amount:total,is_test:true,qr_url:image,created_at:new Date(now).toISOString(),
   expires_at:new Date(now+15*60000).toISOString(),paid_at:null};
  if(!await this.store.claim(newId,{kind:'bot_qris_order',bot_id:bot.$id,telegram_id:tg,status:'pending',
    due_at:new Date(now+30*86400000).toISOString(),payload:JSON.stringify(data)}))
   throw fail('Nomor transaksi sudah ada.',409);
  await this.store.putState(currentId(bot.$id,tg),{order_id:newId,telegram_id:tg},{kind:'bot_qris_current',telegram_id:tg,bot_id:bot.$id});
  await this.store.update('telegram_state',lockId,{status:'completed'});
  return {order:await this.store.state(newId)};
 }
 async reconcile(order,p){
  this.ensure();
  if(!order||order.kind!=='bot_qris_order'||order.data?.is_test!==true)throw fail('Invoice tidak valid.',403);
  if(order.status==='activated')return order;
  if(order.status==='paid')return this.activate(order);
  if(order.status!=='pending')return order;
  p=p||await this.provider();
  const check=await this.call(p,{action:'api_check_status',transaction_id:order.data.transaction_id});
  if(String(check.status)==='success'){
   assertProviderSettlement(check,order.data);
   await this.store.update('telegram_state',order.$id,{status:'paid',
    payload:JSON.stringify({...order.data,paid_at:new Date(this.service.now()).toISOString()})});
   return this.activate(await this.store.state(order.$id));
  }
  if(['failed','expired'].includes(String(check.status))||Date.parse(order.data.expires_at)<this.service.now()){
   await this.store.update('telegram_state',order.$id,{status:String(check.status)==='failed'?'failed':'expired'});
   return this.store.state(order.$id);
  }
  return order;
 }
 async activate(order){
  const grant=await grantBotQrisPremium(this,order);
  const activated=await this.store.state(order.$id);
  if(!grant.duplicate&&this.service.sendEnabled){
   try{
    const bot=await this.service.bot(order.data.bot_id),
      member=await this.store.get('telegram_members',id('member',order.data.telegram_id));
    await this.service.delivery.text(member,bot,'Pembayaran sudah LUNAS. BADAI PROMPT Premium aktif 365 hari! Prompt berikutnya dikirim otomatis pukul 06.00 WIB. Gunakan /status untuk melihat paket.',id('bot-qris-success',order.$id),'reply');
   }catch{/* Membership must remain activated if confirmation message delivery fails. */}
  }
  return activated;
 }
 async recover(limit=2){
  this.ensure();
  const due=await this.store.list('telegram_state',[
   ['equal','kind','bot_qris_order'],['equal','status',['pending','paid']]
  ],limit);
  const result={checked:0,activated:0,failed:0};
  for(const order of due.rows){
   result.checked++;
   try{const after=await this.reconcile(await this.store.state(order.$id));if(after?.status==='activated')result.activated++}
   catch{result.failed++}
  }
  return result;
 }
 async buy(member,bot){
  this.ensure();
  const current=await this.service.sync(member);
  if(current.plan==='premium')return this.service.delivery.text(current,bot,
   'Paket kamu sudah PREMIUM. Cek /status untuk masa aktif.',id('qris-already',bot.$id,current.telegram_id,Math.floor(this.service.now()/60000)),'reply');
  const r=await this.create(current,bot);
  if(r.alreadyPremium)return {ok:true,already_premium:true};
  const order=r.order;
  if(order.status==='activated')return {ok:true,already_activated:true};
  if(order.status==='paid')return {ok:true,processing:true};
  const consent=await this.service.consent(bot.$id,current.telegram_id);
  const key=id('bot-qris-qr',order.$id),msgId=id('delivery',key);
  const already=await this.store.get('telegram_deliveries',msgId);
  if(already)return {ok:true,duplicate:true};
  await this.store.create('telegram_deliveries',msgId,{telegram_id:current.telegram_id,chat_id:consent.data.chat_id,
   bot_id:bot.$id,prompt_id:'invoice',message_id:'pending',message_ids:'[]',plan:'free',day_number:0,
   delivery_key:key,sent_at:new Date(this.service.now()).toISOString(),dispatch_status:'sending',kind:'reply',attempts:1});
  const caption='UJI QRIS BADAI PROMPT\nPremium 365 hari — Rp'+order.data.total_amount.toLocaleString('id-ID')+
   '\n\nIni invoice SANDBOX. Jangan bayar dengan uang asli. Gunakan test_pay di dashboard BuatQRIS.'+
   '\n\nSetelah pembayaran uji, tekan CEK PEMBAYARAN di bawah ini.';
  try{
   const result=await this.service.telegram.call(this.service.token(bot),'sendPhoto',{
    chat_id:consent.data.chat_id,photo:order.data.qr_url,caption,
    reply_markup:{inline_keyboard:[[{text:'CEK PEMBAYARAN',callback_data:'cek_qris'}],[{text:'Lihat paket',callback_data:'status'}]]}});
   await this.store.update('telegram_deliveries',msgId,{dispatch_status:'sent',message_id:String(result.message_id),
     message_ids:JSON.stringify([String(result.message_id)]),sent_at:new Date(this.service.now()).toISOString()});
   return {ok:true,order_id:order.$id};
  }catch(e){
   await this.store.update('telegram_deliveries',msgId,{dispatch_status:e.ambiguous?'uncertain':'failed',error_code:safeError(e)});
   throw e;
  }
 }
 async check(member,bot){
  this.ensure();
  const order=await this.activeOrder(bot,numeric(member.telegram_id));
  if(!order)return this.service.delivery.text(member,bot,'Belum ada invoice QRIS. Ketik /beli untuk mulai.',id('qris-check',member.telegram_id,Math.floor(this.service.now()/60000)),'reply');
  const row=await this.reconcile(order);
  const status=row.status==='activated'?'LUNAS — PREMIUM AKTIF':row.status==='pending'?'BELUM LUNAS':row.status==='paid'?'LUNAS — AKTIVASI DIPROSES':row.status.toUpperCase();
  const message='Status QRIS: '+status+(row.status==='activated'?'\nPrompt otomatis pukul 06.00 WIB.':'\nKetik /cek untuk memeriksa lagi.');
  return this.service.delivery.text(await this.store.get('telegram_members',member.$id),bot,message,
   id('qris-check',bot.$id,member.telegram_id,Math.floor(this.service.now()/30000)),'reply');
 }
}