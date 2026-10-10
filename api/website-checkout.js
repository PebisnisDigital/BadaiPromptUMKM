import crypto from 'node:crypto';
import {Client,TablesDB,Users,Teams,Query,Permission,Role} from 'node-appwrite';
import {Store} from '../functions/activate-member/src/telegram/store.mjs';
import {id} from '../functions/activate-member/src/telegram/security.mjs';
import {runtime as telegramRuntime} from '../functions/activate-member/src/telegram/runtime.mjs';
import {notifyVerifiedWebsitePurchase} from '../functions/activate-member/src/telegram/website-purchase-notice.mjs';

export const config={api:{bodyParser:false}};
const BASE='https://badaiprompt.vercel.app',PROJECT='badai-prompt-umkm',DB='badai_prompt_umkm',PRICE=199000,PERIOD=365*86400000;
const json=(res,data,status=200)=>res.status(status).json(data);
const err=(res,message,status=400)=>json(res,{ok:false,error:message},status);
const unpack=r=>r?{...r,...(r.data||{})}:null;
const cookie=(req,key)=>String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(key+'='))?.slice(key.length+1)||'';
const validId=id=>/^[1-9]\d{0,15}$/.test(String(id||''))&&Number.isSafeInteger(Number(id));
const safe=(value)=>String(value??'').slice(0,180);
const hash=(value)=>crypto.createHash('sha256').update(String(value)).digest('hex');
const secret=()=>crypto.randomBytes(24).toString('base64url');
const equal=(a,b)=>{const x=Buffer.from(String(a||'')),y=Buffer.from(String(b||''));return x.length>0&&x.length===y.length&&crypto.timingSafeEqual(x,y)};
const invoiceId=tx=>id('website-qris',String(tx));
const sentry=({secret:token})=>{if(!token)throw Error('Appwrite API belum tersedia.');const c=new Client().setEndpoint(process.env.APPWRITE_ENDPOINT||'https://sgp.cloud.appwrite.io/v1').setProject(process.env.APPWRITE_PROJECT_ID||PROJECT).setKey(token);return {client:c,tables:new TablesDB(c),store:new Store(new TablesDB(c),Query,process.env.APP_DB_ID||DB),users:new Users(c),teams:new Teams(c)};};
async function provider(s){
 const raw=await s.store.get('payment_settings','buatqris'),p=unpack(raw);
 if(!p||!p.is_active||!p.account_id||!p.secret_token||!p.signing_secret)throw Error('QRIS belum dikonfigurasi lengkap.');
 const settings=await Promise.all(['product_price','minimum_price'].map(k=>s.store.get('settings',k)));
 if(settings.some(x=>Number(unpack(x)?.value)!==PRICE))throw Error('Harga server belum cocok dengan Rp199.000.');
 return p;
}
async function callProvider(p,form){
 const response=await fetch(String(p.api_url||'https://app.buatqris.site/api'),{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams(form).toString(),signal:AbortSignal.timeout(9000)});
 const raw=await response.text();let data={};try{data=JSON.parse(raw)}catch{}
 if(!response.ok||data.success===false)throw Error('BuatQRIS belum dapat memproses transaksi.');
 return data.data||data;
}
async function read(req){let size=0;const pieces=[];for await(const chunk of req){size+=chunk.length;if(size>14000)throw Error('Payload terlalu besar.');pieces.push(chunk)}return Buffer.concat(pieces).toString('utf8')}
async function getSession(req,s){
 const token=cookie(req,'badai_website_session');
 if(!/^[\w-]{32,90}$/.test(token))throw Error('Identitas pembeli belum terverifikasi.');
 const record=await s.store.state(id('website-session',token));
 if(!record||record.kind!=='site_session'||record.status!=='active'||Date.parse(record.due_at)<=Date.now()||!validId(record.data.telegram_id))throw Error('Sesi verifikasi pembeli telah berakhir.');
 return record.data;
}
const orderFrom=r=>{if(!r||!['website_order'].includes(r.kind))throw Error('Pesanan tidak ditemukan.');return r.data};
async function orderByTransaction(s,tx){
 if(!tx||String(tx).length>128)return null;
 return s.store.state(invoiceId(tx));
}
async function findIntent(s,tg){
 const epoch=Math.floor(Date.now()/900000),key=id('website-intent',tg,epoch);
 const row=await s.store.state(key);
 return {key,row};
}
async function checkout(req,res,s){
 const who=await getSession(req,s),tg=who.telegram_id,p=await provider(s),{key,row}=await findIntent(s,tg);
 const already=row;
 if(already){
  if(already.status==='pending'&&already.data?.transaction_id){
   const purchase=await orderByTransaction(s,already.data.transaction_id);
   if(purchase?.status==='pending'&&Date.parse(purchase.data.expires_at)>Date.now())
    return json(res,{ok:true,status:'pending',qr_url:purchase.data.qr_url,total_amount:purchase.data.total_amount,expires_at:purchase.data.expires_at});
  }
  return err(res,'Checkout baru saja dibuat atau status transaksi belum pasti. Tunggu 15 menit atau hubungi bantuan agar tidak tertagih dua kali.',409);
 }
 const claimed=await s.store.claim(key,{kind:'site_intent',telegram_id:tg,status:'creating',due_at:new Date(Date.now()+1800000).toISOString(),payload:JSON.stringify({created_at:new Date().toISOString()})});
 if(!claimed)return err(res,'Transaksi sedang dibuat. Tunggu sebentar.',409);
 let created;
 try{
  created=await callProvider(p,{action:'api_create_qris',account_id:String(p.account_id),secret_token:String(p.secret_token),amount:String(PRICE),description:'BADAI PROMPT Premium Website 365 Hari',fee_by:String(p.fee_by||'merchant'),callback_url:BASE+'/api/website-checkout?action=webhook',qris_method:String(p.qris_method||'qris_two'),...(p.umkm_name?{umkm_name:String(p.umkm_name).slice(0,15)}:{}),...(p.test_mode?{test:'1'}:{})});
 }catch(e){
  await s.store.update('telegram_state',key,{status:'uncertain'});
  throw Error('BuatQRIS belum dapat dipastikan. Jangan ulangi pembayaran dulu, hubungi bantuan.');
 }
 if(!created.transaction_id||!created.qr_url&&!created.qris_image)throw Error('QRIS belum berhasil dibuat. Hubungi bantuan, jangan ulangi dulu.');
 const tx=String(created.transaction_id),expiry=Date.parse(created.expired_at)||Date.now()+900000;
 const amount=Number(created.amount??PRICE),total=Number(created.total_amount??amount);
 if(amount!==PRICE||!Number.isFinite(total)||total<PRICE)throw Error('Nominal QRIS tidak cocok. Transaksi ditahan untuk review.');
 const payload={telegram_id:tg,telegram_sub:who.sub,first_name:who.name,transaction_id:tx,amount:PRICE,total_amount:total,qr_url:String(created.qr_url||created.qris_image),expires_at:new Date(expiry).toISOString(),created_at:new Date().toISOString(),paid_at:null};
 const stored=await s.store.claim(invoiceId(tx),{kind:'website_order',telegram_id:tg,status:'pending',due_at:new Date(expiry+86400000).toISOString(),payload:JSON.stringify(payload)});
 if(!stored)throw Error('ID transaksi duplikat; hubungi bantuan.');
 await s.store.update('telegram_state',key,{status:'pending',payload:JSON.stringify({transaction_id:tx})});
 return json(res,{ok:true,status:'pending',qr_url:payload.qr_url,total_amount:total,expires_at:payload.expires_at});
}
async function reconcilePayment(s,r,p){
 if(!r)return null;
 if(['activated','paid'].includes(r.status))return r;
 if(['expired','failed'].includes(r.status))return r;
 const d=r.data;
 if(Date.parse(d.expires_at)<=Date.now()&&r.status==='pending'){await s.store.update('telegram_state',r.$id,{status:'expired'});return s.store.state(r.$id)}
 const checked=await callProvider(p,{action:'api_check_status',account_id:String(p.account_id),secret_token:String(p.secret_token),transaction_id:d.transaction_id});
 if(String(checked.status)==='success'){
  const now=new Date().toISOString();
  await s.store.update('telegram_state',r.$id,{status:'paid',payload:JSON.stringify({...d,paid_at:now})});
  return s.store.state(r.$id);
 }
 if(['expired','failed'].includes(String(checked.status))){
  await s.store.update('telegram_state',r.$id,{status:String(checked.status)});
  return s.store.state(r.$id);
 }
 return r;
}
async function grant(s,row){
 if(row.status==='activated')return row;
 if(row.status!=='paid')throw Error('Pembayaran belum terverifikasi.');
 const data=orderFrom(row),tg=data.telegram_id;
 if(!validId(tg)||data.amount!==PRICE||!data.transaction_id||!data.paid_at)throw Error('Transaksi memerlukan review manual.');
 const currentLink=await s.store.state(id('tglink',tg));
 const userId=currentLink?.data.user_id||id('tg-user',tg);
 const owned=await s.store.state(id('userlink',userId));
 if(currentLink&&currentLink.data.telegram_id&&currentLink.data.telegram_id!==tg||owned&&owned.data.telegram_id!==tg)throw Error('Akun terhubung ke identitas lain. Hubungi admin.');
 let user;try{user=await s.users.get({userId})}catch(e){if(Number(e.code)!==404)throw e}
 if(!user){
  if(currentLink||owned)throw Error('Akun tertaut tidak ditemukan. Hubungi admin.');
  try{user=await s.users.create({userId,name:String(data.first_name||'Member BADAI PROMPT').slice(0,128)})}
  catch(e){if(Number(e.code)!==409)throw e;throw Error('Identitas Appwrite sudah terdaftar; perlu pemeriksaan admin.')}
 }
 if(!currentLink){
  const ok=await s.store.claim(id('tglink',tg),{kind:'tglink',telegram_id:tg,user_id:userId,status:'linked',payload:JSON.stringify({user_id:userId})});
  if(!ok)throw Error('Identitas sedang terhubung oleh sesi lain.');
 }
 if(!owned){
  const ok=await s.store.claim(id('userlink',userId),{kind:'userlink',telegram_id:tg,user_id:userId,status:'linked',payload:JSON.stringify({telegram_id:tg})});
  if(!ok)throw Error('Akun terhubung ke Telegram lain.');
 }
 const memberships=await s.teams.listMemberships({teamId:'paid-members',queries:[Query.equal('userId',userId),Query.limit(10)]});
 if(!memberships.memberships?.some(m=>m.confirm===true)){
  if(memberships.memberships?.length)throw Error('Keanggotaan belum terkonfirmasi, butuh admin.');
  try{await s.teams.createMembership({teamId:'paid-members',roles:['member'],userId})}catch(e){if(Number(e.code)!==409)throw e}
  const verified=await s.teams.listMemberships({teamId:'paid-members',queries:[Query.equal('userId',userId),Query.limit(10)]});
  if(!verified.memberships?.some(m=>m.confirm===true))throw Error('Keanggotaan masih pending.');
 }
 const profile=await s.store.get('member_profiles',userId);
 const paidUntil=new Date(Date.parse(data.paid_at)+PERIOD).toISOString();
 const before=profile?.access_until&&Date.parse(profile.access_until)>0?Date.parse(profile.access_until):0;
 const until=profile?.status==='active'&&!profile?.access_until?null:new Date(Math.max(before,Date.parse(paidUntil))).toISOString();
 const fields={status:'active',access_until:until,role:'member'};
 if(profile)await s.store.update('member_profiles',userId,fields);
 else await s.tables.createRow({databaseId:process.env.APP_DB_ID||DB,tableId:'member_profiles',rowId:userId,data:{...fields,user_id:userId,name:String(user.name||data.first_name||'Member BADAI PROMPT').slice(0,128),email:null,whatsapp:null},permissions:[Permission.read(Role.user(userId))]});
 // Membership grant + profile above are authoritative. Only now finalize this paid order.
 await s.store.update('telegram_state',row.$id,{status:'activated',user_id:userId,payload:JSON.stringify({...data,user_id:userId,access_until:until,activated_at:new Date().toISOString()})});
 const botMember=await s.store.get('telegram_members',id('member',tg));
 if(botMember&&!botMember.appwrite_user_id)await s.store.update('telegram_members',botMember.$id,{appwrite_user_id:userId});
 if(botMember?.appwrite_user_id&&botMember.appwrite_user_id!==userId)throw Error('Telegram member telah terhubung dengan akun lain.');
 if(process.env.TELEGRAM_WEBSITE_PAID_NOTICE_ENABLED==='true'){
  try{const service=telegramRuntime();await notifyVerifiedWebsitePurchase({service,userId,orderId:row.$id})}catch{}
 }
 return s.store.state(row.$id);
}
async function status(req,res,s,p){
 const who=await getSession(req,s);
 const lookup=await findIntent(s,who.telegram_id);
 const tx=lookup.row?.data?.transaction_id;
 if(!tx)return json(res,{ok:true,status:'none'});
 let order=await orderByTransaction(s,tx);
 if(!order||order.data.telegram_id!==who.telegram_id)return err(res,'Transaksi tidak ditemukan.',404);
 if(order.status==='pending')order=await reconcilePayment(s,order,p);
 if(order.status==='paid')order=await grant(s,order);
 return json(res,{ok:true,status:order.status,expires_at:order.data.expires_at,total_amount:order.data.total_amount,qr_url:order.status==='pending'?order.data.qr_url:undefined});
}
async function webhook(req,res,s,raw){
 const p=await provider(s),signature=String(req.headers['x-buatqris-signature']||'');
 if(!p.signing_secret||!equal(signature,'sha256='+crypto.createHmac('sha256',String(p.signing_secret)).update(raw).digest('hex')))return err(res,'Signature webhook tidak sah.',401);
 let payload={};try{payload=JSON.parse(raw)}catch{return err(res,'Invalid JSON.',400)}
 const tx=String(payload.transaction_id||payload.data?.transaction_id||''),event=String(payload.event||req.headers['x-buatqris-event']||'');
 const row=await orderByTransaction(s,tx);
 if(!row)return json(res,{ok:true,ignored:true});
 if(event!=='payment.success')return json(res,{ok:true,ignored:true});
 const check=await callProvider(p,{action:'api_check_status',account_id:String(p.account_id),secret_token:String(p.secret_token),transaction_id:tx});
 if(String(check.status)!=='success')return err(res,'Pembayaran belum dikonfirmasi penyedia.',409);
 if(row.status==='activated')return json(res,{ok:true,already_activated:true});
 if(row.status!=='paid')await s.store.update('telegram_state',row.$id,{status:'paid',payload:JSON.stringify({...row.data,paid_at:row.data.paid_at||new Date().toISOString()})});
 const updated=await grant(s,await s.store.state(row.$id));
 return json(res,{ok:true,status:updated.status});
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 const action=String(req.query?.action||'status');
 if(req.headers.origin&&req.headers.origin!==BASE)return err(res,'Origin tidak diizinkan.',403);
 const enabled=process.env.TELEGRAM_SITE_CHECKOUT_ENABLED==='true'&&process.env.TELEGRAM_WEBSITE_LOGIN_ENABLED==='true';
 if(action==='config'&&req.method==='GET')return json(res,{ok:true,enabled,price:PRICE});
 if(!enabled)return err(res,'Checkout Telegram melalui website belum diaktifkan.',503);
 try{
  if(req.method!=='POST')return err(res,'Method not allowed.',405);
  const raw=await read(req);
  const s=sentry({secret:process.env.APPWRITE_API_KEY});
  if(action==='webhook')return webhook(req,res,s,raw);
  if(req.headers.origin!==BASE)return err(res,'Asal permintaan tidak valid.',403);
  if(action==='create')return checkout(req,res,s);
  if(action==='status')return status(req,res,s,await provider(s));
  if(action==='session-token'){
   const who=await getSession(req,s);
   const lookup=await findIntent(s,who.telegram_id),row=lookup.row?.data?.transaction_id?await orderByTransaction(s,lookup.row.data.transaction_id):null;
   if(!row||row.status!=='activated'||row.data.telegram_id!==who.telegram_id)return err(res,'Premium belum aktif.',403);
   const user=await s.users.get({userId:row.data.user_id});
   if(!user)return err(res,'Akun belum tersedia.',403);
   const token=await s.users.createToken({userId:user.$id,length:32,expire:180});
   return json(res,{ok:true,userId:token.userId,secret:token.secret});
  }
  return err(res,'Aksi checkout tidak ditemukan.',404);
 }catch(e){
  return err(res,safe(e.message||'Checkout belum dapat diproses.'),e.status===401?401:400);
 }
}
