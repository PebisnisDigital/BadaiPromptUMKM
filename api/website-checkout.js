// Vercel /api/*.js handlers run as CJS. Defer loading ESM business modules,
// avoiding require() of .mjs and keeping the config route payment-free.
const crypto=require('node:crypto');
const {Client,TablesDB,Users,Teams,Query,Permission,Role}=require('node-appwrite');
const {inspectAccount}=require('./website-preflight-helpers.js');
let Store,id,telegramRuntime,notifyVerifiedWebsitePurchase,grantWebsitePremium;
let assertProviderSettlement,assertAccountOwner,calculatePaidAccessUntil,freezeOrderEntitlement,selectVerifiedAccountId;
async function loadEsmModules(){
 const [store,security,runtime,notice,guards,grantModule]=await Promise.all([
  import('../functions/activate-member/src/telegram/store.mjs'),
  import('../functions/activate-member/src/telegram/security.mjs'),
  import('../functions/activate-member/src/telegram/runtime.mjs'),
  import('../functions/activate-member/src/telegram/website-purchase-notice.mjs'),
  import('../functions/activate-member/src/telegram/website-checkout-guards.mjs'),
  import('../functions/activate-member/src/telegram/website-premium-grant.mjs')
 ]);
 ({Store}=store);({id}=security);({runtime:telegramRuntime}=runtime);
 ({notifyVerifiedWebsitePurchase}=notice);
 ({assertProviderSettlement,assertAccountOwner,calculatePaidAccessUntil,freezeOrderEntitlement,selectVerifiedAccountId}=guards);
 ({grantWebsitePremium}=grantModule);
}

const config={api:{bodyParser:false}};
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
 const row=await s.store.state(id('website-current',tg));
 return {key,row};
}
async function checkout(req,res,s){
 const who=await getSession(req,s),tg=who.telegram_id,p=await provider(s),{key,row}=await findIntent(s,tg);
 const already=row;
 if(already&&!already.data?.transaction_id)return err(res,'Pembuatan transaksi sebelumnya belum pasti. Jangan mencoba membayar dua kali sebelum menghubungi bantuan.',409);
 if(already?.data?.transaction_id){
  let purchase=await orderByTransaction(s,already.data.transaction_id);
  if(purchase?.status==='pending')purchase=await reconcilePayment(s,purchase,p);
  if(purchase?.status==='pending'&&Date.parse(purchase.data.expires_at)>Date.now())
   return json(res,{ok:true,status:'pending',qr_url:purchase.data.qr_url,total_amount:purchase.data.total_amount,expires_at:purchase.data.expires_at});
  if(['paid','activated'].includes(purchase?.status))
   return json(res,{ok:true,status:purchase.status});
  if(!['expired','failed'].includes(purchase?.status))
   return err(res,'Status transaksi sebelumnya belum pasti. Hubungi bantuan sebelum membuat tagihan baru.',409);
 }
 const claimed=await s.store.claim(key,{kind:'site_intent',telegram_id:tg,status:'creating',due_at:new Date(Date.now()+1800000).toISOString(),payload:JSON.stringify({created_at:new Date().toISOString()})});
 if(!claimed)return err(res,'Transaksi sedang dibuat. Tunggu sebentar.',409);
 await s.store.putState(id('website-current',tg),{intent_id:key,started_at:new Date().toISOString()},{kind:'site_current',telegram_id:tg,status:'creating',due_at:new Date(Date.now()+86400000).toISOString()});
 let created;
 try{
  created=await callProvider(p,{action:'api_create_qris',account_id:String(p.account_id),secret_token:String(p.secret_token),amount:String(PRICE),description:'BADAI PROMPT Premium Website 365 Hari',fee_by:String(p.fee_by||'merchant'),callback_url:BASE+'/api/website-checkout?action=webhook',qris_method:String(p.qris_method||'qris_two'),...(p.umkm_name?{umkm_name:String(p.umkm_name).slice(0,15)}:{}),...(p.test_mode?{test:'1'}:{})});
 }catch(e){
  await s.store.update('telegram_state',key,{status:'uncertain'});
  await s.store.update('telegram_state',id('website-current',tg),{status:'uncertain'});
  throw Error('BuatQRIS belum dapat dipastikan. Jangan ulangi pembayaran dulu, hubungi bantuan.');
 }
 if(!created.transaction_id||!created.qr_url&&!created.qris_image)throw Error('QRIS belum berhasil dibuat. Hubungi bantuan, jangan ulangi dulu.');
 const tx=String(created.transaction_id),now=Date.now(),providerExpiry=Date.parse(created.expired_at),expiry=Number.isFinite(providerExpiry)&&providerExpiry>now&&providerExpiry<=now+960000?providerExpiry:now+900000;
 const amount=Number(created.amount??PRICE),total=Number(created.total_amount??amount);
 if(amount!==PRICE||!Number.isFinite(total)||total<PRICE)throw Error('Nominal QRIS tidak cocok. Transaksi ditahan untuk review.');
 const payload={telegram_id:tg,telegram_sub:who.sub,first_name:who.name,transaction_id:tx,amount:PRICE,total_amount:total,qr_url:String(created.qr_url||created.qris_image),expires_at:new Date(expiry).toISOString(),created_at:new Date().toISOString(),paid_at:null};
 const stored=await s.store.claim(invoiceId(tx),{kind:'website_order',telegram_id:tg,status:'pending',due_at:new Date(expiry+86400000).toISOString(),payload:JSON.stringify(payload)});
 if(!stored)throw Error('ID transaksi duplikat; hubungi bantuan.');
 await s.store.update('telegram_state',key,{status:'pending',payload:JSON.stringify({transaction_id:tx})});
 await s.store.putState(id('website-current',tg),{transaction_id:tx},{kind:'site_current',status:'pending',telegram_id:tg,due_at:new Date(expiry+86400000).toISOString()});
 return json(res,{ok:true,status:'pending',qr_url:payload.qr_url,total_amount:total,expires_at:payload.expires_at});
}
async function reconcilePayment(s,r,p){
 if(!r)return null;
 if(['activated','paid'].includes(r.status))return r;
 if(['expired','failed'].includes(r.status))return r;
 const d=r.data;
 const checked=await callProvider(p,{action:'api_check_status',account_id:String(p.account_id),secret_token:String(p.secret_token),transaction_id:d.transaction_id});
 if(String(checked.status)==='success'){
  assertProviderSettlement(checked,d);
  const now=new Date().toISOString();
  await s.store.update('telegram_state',r.$id,{status:'paid',payload:JSON.stringify({...d,paid_at:now})});
  return s.store.state(r.$id);
 }
 if(['expired','failed'].includes(String(checked.status))||Date.parse(d.expires_at)<=Date.now()){
  await s.store.update('telegram_state',r.$id,{status:['expired','failed'].includes(String(checked.status))?String(checked.status):'expired'});
  return s.store.state(r.$id);
 }
 return r;
}
async function grant(s,row){
 return grantWebsitePremium(s,row,{
  sendNotice:process.env.TELEGRAM_WEBSITE_PAID_NOTICE_ENABLED==='true',
  send:async({userId,orderId})=>notifyVerifiedWebsitePurchase({service:telegramRuntime(),userId,orderId})
 });
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
 assertProviderSettlement(check,row.data);
 if(row.status==='activated')return json(res,{ok:true,already_activated:true});
 if(row.status!=='paid')await s.store.update('telegram_state',row.$id,{status:'paid',payload:JSON.stringify({...row.data,paid_at:row.data.paid_at||new Date().toISOString()})});
 const updated=await grant(s,await s.store.state(row.$id));
 return json(res,{ok:true,status:updated.status});
}
// Non-payment diagnostic: only a logged-in customer from our own HTTPS website
// may see their own readiness result. No invoice, profile mutation or bot send.
async function preflight(req,res){
 if(req.method!=='POST')return err(res,'Method not allowed.',405);
 if(process.env.TELEGRAM_WEBSITE_LOGIN_ENABLED!=='true')return err(res,'Login Telegram belum diaktifkan.',503);
 if(req.headers.origin!==BASE)return err(res,'Asal permintaan tidak valid.',403);
 try{
  await loadEsmModules();
  const s=sentry({secret:process.env.APPWRITE_API_KEY});
  const who=await getSession(req,s),tg=who.telegram_id;
  const websiteLink=await s.store.state(id('tglink',tg));
  const member=await s.store.get('telegram_members',id('member',tg));
  const userId=selectVerifiedAccountId({telegramLink:websiteLink,botMember:member,fallbackUserId:id('tg-user',tg)});
  const userLink=await s.store.state(id('userlink',userId));
  let conflict=false;
  try{assertAccountOwner({telegramId:tg,userId,telegramLink:websiteLink,userLink,botMember:member})}catch{conflict=true}
  let providerReady=false,providerTestMode=false;
  try{const merchant=await provider(s);providerReady=true;providerTestMode=merchant.test_mode===true}catch{}
  let accountExists=null,profile=null,readAuthorized=false,missingScopes=[];
  if(!conflict){
   const result=await inspectAccount({users:s.users,store:s.store,userId});
   ({accountExists,profile,readAuthorized,missingScopes}=result);
  }
  const premium=Boolean(profile?.status==='active'&&
    (!profile.access_until||Date.parse(profile.access_until)>Date.now()));
  const connected=Boolean(websiteLink?.data?.user_id||member?.appwrite_user_id);
  return json(res,{
   ok:true,telegram_verified:true,provider_ready:providerReady,
   identity_linked:connected,account_exists:accountExists,
   account_check_pending:!readAuthorized,account_permission_ready:readAuthorized,
   missing_appwrite_scopes:missingScopes,
   premium_already_active:premium,account_review_needed:conflict,
   safe_to_test:providerReady&&providerTestMode&&readAuthorized&&!conflict&&!premium,
   merchant_test_mode:providerTestMode,
   checkout_enabled:process.env.TELEGRAM_SITE_CHECKOUT_ENABLED==='true',
   bot_notice_enabled:process.env.TELEGRAM_WEBSITE_PAID_NOTICE_ENABLED==='true',
   price:PRICE
  });
 }catch(e){return err(res,'Pemeriksaan kesiapan tidak berhasil: '+safe(e.message||'Coba lagi.'),400)}
}
module.exports=async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 const action=String(req.query?.action||'status');
 if(req.headers.origin&&req.headers.origin!==BASE)return err(res,'Origin tidak diizinkan.',403);
 const enabled=process.env.TELEGRAM_SITE_CHECKOUT_ENABLED==='true'&&process.env.TELEGRAM_WEBSITE_LOGIN_ENABLED==='true';
 if(action==='config'&&req.method==='GET')return json(res,{ok:true,enabled,price:PRICE});
 if(action==='preflight')return preflight(req,res);
 if(!enabled)return err(res,'Checkout Telegram melalui website belum diaktifkan.',503);
 try{
  if(req.method!=='POST')return err(res,'Method not allowed.',405);
  const raw=await read(req);
  await loadEsmModules();
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

module.exports.config=config;
