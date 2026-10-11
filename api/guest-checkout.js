// Dedicated sandbox-only guest checkout. Legacy Telegram-login QRIS remains intact.
// No live QRIS can be generated from this endpoint.
const crypto=require('node:crypto');
const {Client,TablesDB,Users,Teams,Query}=require('node-appwrite');
const BASE='https://badaiprompt.vercel.app',PRICE=199000,DB='badai_prompt_umkm',PROJECT='badai-prompt-umkm';
const json=(res,v,s=200)=>res.status(s).json(v);
const error=(res,message,s=400)=>json(res,{ok:false,error:message},s);
const cookie=(req,name)=>String(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='))?.slice(name.length+1)||'';
const safe=e=>String(e?.message||'Tidak dapat memproses transaksi.').slice(0,160);
const unpack=r=>r?{...r,...(r.data||{})}:null;
let modules;
async function load(){
 if(!modules){
  const [store,sec,guest,grant,activation,guards]=await Promise.all([
   import('../functions/activate-member/src/telegram/store.mjs'),
   import('../functions/activate-member/src/telegram/security.mjs'),
   import('../functions/activate-member/src/telegram/guest-checkout.mjs'),
   import('../functions/activate-member/src/telegram/guest-premium-grant.mjs'),
   import('../functions/activate-member/src/telegram/telegram-purchase-activation.mjs'),
   import('../functions/activate-member/src/telegram/website-checkout-guards.mjs')
  ]);
  modules={Store:store.Store,id:sec.id,...guest,...grant,...activation,...guards};
 }
 return modules;
}
async function app(s){
 const c=new Client().setEndpoint(process.env.APPWRITE_ENDPOINT||'https://sgp.cloud.appwrite.io/v1')
  .setProject(process.env.APPWRITE_PROJECT_ID||PROJECT).setKey(process.env.APPWRITE_API_KEY||'');
 const {Store}=await load();
 return {store:new Store(new TablesDB(c),Query,process.env.APP_DB_ID||DB),users:new Users(c),teams:new Teams(c),tables:new TablesDB(c)};
}
async function body(req){
 let size=0,buffers=[];
 for await(const chunk of req){size+=chunk.length;if(size>12000)throw Error('Data terlalu besar.');buffers.push(chunk)}
 return Buffer.concat(buffers).toString('utf8');
}
async function provider(s){
 const p=unpack(await s.store.get('payment_settings','buatqris'));
 if(!p?.is_active||!p.account_id||!p.secret_token||!p.signing_secret)throw Error('Konfigurasi BuatQRIS belum siap.');
 const prices=await Promise.all(['product_price','minimum_price'].map(k=>s.store.get('settings',k)));
 if(prices.some(p=>Number(unpack(p)?.value)!==PRICE))throw Error('Harga belum cocok.');
 return p;
}
async function call(p,params){
 const endpoint=String(p.api_url||'https://api.buatqris.site');
 if(!/^https:\/\/(api|app)\.buatqris\.(site)(\/api)?\/?$/.test(endpoint))throw Error('Endpoint pembayaran tidak dikenal.');
 const response=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams(params).toString(),signal:AbortSignal.timeout(12000)});
 const raw=await response.text();let result={};try{result=JSON.parse(raw)}catch{}
 if(!response.ok||result.success===false)throw Error('BuatQRIS belum dapat memproses transaksi.');
 return result.data||result;
}
async function session(req,store){
 return (await load()).inspectGuestCheckoutSession(store,cookie(req,'badai_guest_checkout'));
}
async function current(store,identity){
 const m=await load();
 const row=await store.state(m.id('guest-current',identity.session_id));
 return row?.data?.transaction_id?store.state(m.id('website-qris',row.data.transaction_id)):null;
}
async function reconcile(store,p,order,m){
 if(order.status!=='pending')return order;
 const d=order.data;
 const verified=await call(p,{action:'api_check_status',account_id:String(p.account_id),secret_token:String(p.secret_token),transaction_id:d.transaction_id});
 if(String(verified.status)==='success'){
  m.assertProviderSettlement(verified,d);
  // Never let a non-sandbox order enter this checkout route.
  if(d.is_test!==true)throw Error('Transaksi bukan sandbox.');
  await store.update('telegram_state',order.$id,{status:'paid',payload:JSON.stringify({...d,paid_at:new Date().toISOString()})});
  return store.state(order.$id);
 }
 if(['failed','expired'].includes(String(verified.status))||Date.parse(d.expires_at)<=Date.now()){
  await store.update('telegram_state',order.$id,{status:String(verified.status)==='failed'?'failed':'expired'});
  return store.state(order.$id);
 }
 return order;
}
async function create(req,res,s){
 const m=await load(),who=await session(req,s.store),p=await provider(s);
 const curKey=m.id('guest-current',who.session_id),previous=await s.store.state(curKey);
 if(previous){
  if(previous.data?.transaction_id){
   let order=await current(s.store,who);
   if(!order)throw Error('Invoice sebelumnya belum ditemukan. Hubungi admin.');
   if(order.status==='pending')order=await reconcile(s.store,p,order,m);
   return json(res,{ok:true,status:order.status,qr_url:order.status==='pending'?order.data.qr_url:undefined,total_amount:order.data.total_amount,expires_at:order.data.expires_at});
  }
  return error(res,'Pembuatan QRIS sebelumnya belum pasti. Hubungi admin.',409);
 }
 const claimed=await s.store.claim(curKey,{kind:'guest_current',status:'creating',due_at:new Date(Date.now()+86400000).toISOString(),payload:JSON.stringify({guest_session_id:who.session_id})});
 if(!claimed)return error(res,'QRIS sedang dibuat.',409);
 let invoice;
 try{
  invoice=await call(p,{action:'api_create_qris',account_id:String(p.account_id),secret_token:String(p.secret_token),amount:String(PRICE),description:'BADAI PROMPT SANDBOX 365 hari',callback_url:BASE+'/api/guest-checkout?action=webhook',fee_by:String(p.fee_by||'merchant'),qris_method:String(p.qris_method||'qris_two'),test:'1'});
 }catch(e){await s.store.update('telegram_state',curKey,{status:'uncertain'});throw Error('Status pembuatan QRIS tidak pasti. Hubungi admin; jangan ulangi pembayaran.');}
 if(!invoice.transaction_id||!(invoice.qr_url||invoice.qris_image))throw Error('QRIS belum tersedia.');
 const amount=Number(invoice.amount??PRICE),total=Number(invoice.total_amount??amount);
 if(amount!==PRICE||!Number.isFinite(total)||total<PRICE)throw Error('Jumlah tagihan BuatQRIS tidak sesuai.');
 const expiry=new Date(Date.now()+15*60000).toISOString(),tx=String(invoice.transaction_id);
 const payload={checkout_type:'guest',guest_session_id:who.session_id,first_name:who.name,whatsapp:who.whatsapp,
  transaction_id:tx,amount:PRICE,total_amount:total,is_test:true,qr_url:String(invoice.qr_url||invoice.qris_image),
  created_at:new Date().toISOString(),expires_at:expiry,paid_at:null};
 const record=await s.store.claim(m.id('website-qris',tx),{kind:'website_order',status:'pending',due_at:new Date(Date.now()+30*86400000).toISOString(),payload:JSON.stringify(payload)});
 if(!record)throw Error('ID invoice duplikat; hubungi admin.');
 await s.store.update('telegram_state',curKey,{status:'pending',payload:JSON.stringify({guest_session_id:who.session_id,transaction_id:tx})});
 return json(res,{ok:true,status:'pending',qr_url:payload.qr_url,total_amount:total,expires_at:expiry});
}
async function status(req,res,s){
 const m=await load(),who=await session(req,s.store),p=await provider(s);
 let row=await current(s.store,who);
 if(!row)return json(res,{ok:true,status:'none'});
 if(row.status==='pending')row=await reconcile(s.store,p,row,m);
 if(row.status==='paid')row=await m.grantGuestWebsitePremium(s,row);
 return json(res,{ok:true,status:row.status,total_amount:row.data.total_amount,expires_at:row.data.expires_at,
  qr_url:row.status==='pending'?row.data.qr_url:undefined});
}
async function activation(req,res,s){
 const m=await load(),who=await session(req,s.store),row=await current(s.store,who);
 if(!row||row.status!=='activated'||row.data.is_test!==true||row.data.guest_session_id!==who.session_id)
  return error(res,'Pembayaran belum terverifikasi.',403);
 if(await s.store.state(m.id('purchase-binding',row.$id)))return error(res,'Telegram sudah terhubung.',409);
 await s.store.rate(who.session_id,'guest-activation',Date.now(),2);
 const issued=await m.issuePurchaseActivation(s.store,row);
 const bot=await (await import('../functions/activate-member/src/telegram/runtime.mjs')).runtime().main();
 if(!bot?.is_active)return error(res,'Bot Telegram utama belum siap; simpan invoice dan hubungi admin.',503);
 return json(res,{ok:true,url:'https://t.me/'+bot.username+'?start=purchase_'+issued.token,expires_at:issued.expires_at});
}
async function webhook(req,res,s,raw){
 const p=await provider(s),signature=String(req.headers['x-buatqris-signature']||'');
 const expected='sha256='+crypto.createHmac('sha256',String(p.signing_secret)).update(raw).digest('hex');
 const a=Buffer.from(signature),b=Buffer.from(expected);
 if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return error(res,'Webhook signature tidak sah.',401);
 let payload;try{payload=JSON.parse(raw)}catch{return error(res,'JSON tidak valid.',400)}
 const tx=String(payload.transaction_id||payload.data?.transaction_id||'');
 const m=await load(),row=tx.length&&tx.length<=128?await s.store.state(m.id('website-qris',tx)):null;
 if(!row||row.data?.checkout_type!=='guest'||row.data.is_test!==true)return json(res,{ok:true,ignored:true});
 if(String(payload.event||req.headers['x-buatqris-event']||'')!=='payment.success')return json(res,{ok:true,ignored:true});
 if(row.status==='activated')return json(res,{ok:true,already_activated:true});
 const verified=await call(p,{action:'api_check_status',account_id:String(p.account_id),secret_token:String(p.secret_token),transaction_id:tx});
 m.assertProviderSettlement(verified,row.data);
 if(row.status!=='paid')await s.store.update('telegram_state',row.$id,{status:'paid',payload:JSON.stringify({...row.data,paid_at:new Date().toISOString()})});
 const active=await m.grantGuestWebsitePremium(s,await s.store.state(row.$id));
 return json(res,{ok:true,status:active.status});
}
module.exports=async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 const action=String(req.query?.action||'');
 if(action==='config'&&req.method==='GET')return json(res,{ok:true,enabled:process.env.BADAI_GUEST_SANDBOX_ENABLED==='true',sandbox_only:true,price:PRICE});
 if(process.env.BADAI_GUEST_SANDBOX_ENABLED!=='true')return error(res,'Pengujian QRIS belum diaktifkan.',503);
 if(req.method!=='POST')return error(res,'Method not allowed.',405);
 if(action!=='webhook'&&req.headers.origin!==BASE)return error(res,'Origin tidak diizinkan.',403);
 try{
  const raw=await body(req),s=await app();
  if(action==='webhook')return webhook(req,res,s,raw);
  if(action==='start'){
   let data;try{data=JSON.parse(raw||'{}')}catch{return error(res,'Data pembeli tidak valid.')}
   const issued=await (await load()).createGuestCheckoutSession(s.store,data);
   res.setHeader('Set-Cookie','badai_guest_checkout='+issued.token+'; Path=/api/guest-checkout; HttpOnly; Secure; SameSite=Strict; Max-Age=1800');
   return json(res,{ok:true,expires_at:issued.expires_at});
  }
  if(action==='create')return create(req,res,s);
  if(action==='status')return status(req,res,s);
  if(action==='activation')return activation(req,res,s);
  return error(res,'Aksi tidak dikenal.',404);
 }catch(e){return error(res,safe(e),e.status||400);}
};
module.exports.config={api:{bodyParser:false}};
