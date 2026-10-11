// Telegram Mini App + BuatQRIS sandbox backend. No buyer-supplied Telegram IDs are trusted.
// Sandbox-only while this integration is being verified.
const {Client,TablesDB,Teams,Users,Query}=require('node-appwrite');
const {createHmac,timingSafeEqual}=require('node:crypto');
const URL_APP='https://badaiprompt.vercel.app',DB='badai_prompt_umkm',PROJECT='badai-prompt-umkm',PRICE=199000;
const respond=(res,body,code=200)=>res.status(code).json(body);
const reject=(res,message,code=400)=>respond(res,{ok:false,error:message},code);
let modules;
async function esm(){
 if(!modules){
  const [r,s,m,b,g]=await Promise.all([
   import('../functions/activate-member/src/telegram/runtime.mjs'),
   import('../functions/activate-member/src/telegram/security.mjs'),
   import('../functions/activate-member/src/telegram/bot-qris.mjs'),
   import('../functions/activate-member/src/telegram/website-checkout-guards.mjs'),
   import('../functions/activate-member/src/telegram/guest-checkout.mjs')
  ]);
  modules={...r,...s,...m,...b,...g};
 }
 return modules;
}
async function context(){
 const m=await esm();
 const client=new Client().setEndpoint(process.env.APPWRITE_ENDPOINT||'https://sgp.cloud.appwrite.io/v1')
  .setProject(process.env.APPWRITE_PROJECT_ID||PROJECT).setKey(process.env.APPWRITE_API_KEY||'');
 const telegramService=m.runtime();
 const bot=await telegramService.main();
 if(!bot?.is_active)throw m.fail('Bot utama belum aktif.',503);
 return {m,bot,telegramService,store:telegramService.store,users:new Users(client),teams:new Teams(client),tables:new TablesDB(client)};
}
async function receive(req){
 let bytes=0,chunks=[];
 for await(const chunk of req){bytes+=chunk.length;if(bytes>16000)throw Error('Payload terlalu besar.');chunks.push(chunk)}
 return Buffer.concat(chunks).toString('utf8');
}
function providerRow(p){
 if(!p?.is_active||!p.account_id||!p.secret_token||!p.signing_secret)throw Error('BuatQRIS belum dikonfigurasi.');
 const url=String(p.api_url||'https://app.buatqris.site/api');
 if(!/^https:\/\/(?:app\.buatqris\.site\/api|api\.buatqris\.site)\/?$/.test(url))throw Error('Alamat API BuatQRIS tidak sah.');
 return {...p,api_url:url};
}
async function provider(s){
 return providerRow(await s.store.get('payment_settings','buatqris'));
}
async function call(p,params){
 const response=await fetch(p.api_url,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
  body:new URLSearchParams({account_id:String(p.account_id),secret_token:String(p.secret_token),...params}).toString(),
  signal:AbortSignal.timeout(12000)});
 let data={};try{data=await response.json()}catch{}
 if(!response.ok||data.success===false)throw Error('Penyedia pembayaran belum dapat memproses transaksi.');
 return data.data||data;
}
async function identity(s,raw){
 const data=String(raw||'');
 const telegram=s.m.verifyMiniAppInitData(data,s.telegramService.token(s.bot));
 const member=await s.store.get('telegram_members',s.m.id('member',telegram.telegram_id));
 const consent=await s.telegramService.consent(s.bot.$id,telegram.telegram_id);
 if(!member?.is_active||!consent||consent.status!=='allowed')throw s.m.fail('Tekan START di bot terlebih dahulu.',403);
 return {telegram,member};
}
const currentKey=(s,tg)=>s.m.id('bot-qris-current',s.bot.$id,tg);
async function current(s,tg){
 const pointer=await s.store.state(currentKey(s,tg));
 return pointer?.data?.order_id?await s.store.state(pointer.data.order_id):null;
}
async function paid(s,order,payment){
 if(order.status==='activated')return order;
 if(order.data?.is_test!==true)throw Error('Hanya transaksi sandbox yang dapat diproses.');
 if(order.status!=='paid'){
  s.m.assertProviderSettlement(payment,order.data);
  await s.store.update('telegram_state',order.$id,{status:'paid',payload:JSON.stringify({...order.data,paid_at:new Date().toISOString()})});
 }
 const result=await s.m.grantBotQrisPremium({store:s.store,users:s.users,teams:s.teams,tables:s.tables,telegramService:s.telegramService},await s.store.state(order.$id));
 // Notification is best-effort and uses a unique delivery key to avoid replays.
 try{
  if(process.env.TELEGRAM_SEND_ENABLED==='true'){
   const member=await s.store.get('telegram_members',s.m.id('member',order.data.telegram_id));
   await s.telegramService.delivery.text(member,s.bot,'Pembayaran berhasil! Akun BADAI PROMPT kamu sekarang PREMIUM. Prompt dikirim setiap hari pukul 06.00 WIB. Cek /status untuk melihat masa aktif.',s.m.id('bot-qris-paid',order.$id),'reply');
  }
 }catch{}
 return s.store.state(order.$id);
}
async function reconcile(s,order,p){
 if(!order||order.kind!=='bot_qris_order')throw Error('Invoice tidak ditemukan.');
 if(order.status==='activated')return order;
 if(!['pending','paid'].includes(order.status))return order;
 if(order.status==='paid')return paid(s,order,{status:'success',transaction_id:order.data.transaction_id,amount:order.data.amount,total_amount:order.data.total_amount});
 const payment=await call(p,{action:'api_check_status',transaction_id:String(order.data.transaction_id)});
 if(String(payment.status)==='success')return paid(s,order,payment);
 if(['failed','expired'].includes(String(payment.status))||Date.parse(order.data.expires_at)<Date.now()){
  await s.store.update('telegram_state',order.$id,{status:String(payment.status)==='failed'?'failed':'expired'});
  return s.store.state(order.$id);
 }
 return order;
}
function display(order){
 if(!order)return {ok:true,status:'none'};
 const d=order.data;
 return {ok:true,status:order.status,amount:d.amount,total_amount:d.total_amount,
  qr_url:order.status==='pending'?d.qr_url:null,expires_at:d.expires_at,
  access_until:order.status==='activated'?d.access_until:null,sandbox:true};
}
async function start(s,tg){
 const member=await s.store.get('telegram_members',s.m.id('member',tg));
 if(member?.plan==='premium')return {ok:true,status:'activated',already_premium:true,access_until:member.premium_until};
 const p=await provider(s);
 let order=await current(s,tg);
 if(order&&['pending','paid','activated'].includes(order.status)){
  order=await reconcile(s,order,p);
  if(['pending','activated'].includes(order.status))return display(order);
 }
 await s.store.rate(tg,'bot-qris-start',Date.now(),2);
 const lock=await s.store.claim(s.m.id('bot-qris-lock',tg,Math.floor(Date.now()/300000)),{
  kind:'bot_qris_lock',status:'creating',due_at:new Date(Date.now()+300000).toISOString(),
  payload:JSON.stringify({telegram_id:tg})
 });
 if(!lock)throw s.m.fail('QRIS masih diproses. Buka lagi beberapa saat.',409);
 const info=await call(p,{action:'api_create_qris',amount:String(PRICE),qris_method:String(p.qris_method||'qris_two'),
  fee_by:String(p.fee_by||'merchant'),description:'UJI BADAI PROMPT Premium 365 hari',
  callback_url:URL_APP+'/api/bot-qris?action=webhook',test:'1'});
 if(!info.transaction_id||!info.qr_url)throw Error('QRIS BuatQRIS belum tersedia.');
 const amount=Number(info.amount??PRICE),total=Number(info.total_amount??PRICE);
 if(amount!==PRICE||!Number.isFinite(total)||total<PRICE)throw Error('Nominal pembayaran tidak cocok.');
 const now=Date.now(),id=s.m.id('bot-qris-order',String(info.transaction_id));
 const data={telegram_id:tg,bot_id:s.bot.$id,transaction_id:String(info.transaction_id),amount:PRICE,total_amount:total,
  is_test:true,qr_url:String(info.qr_url),created_at:new Date(now).toISOString(),
  expires_at:new Date(now+15*60000).toISOString(),paid_at:null};
 if(!await s.store.claim(id,{kind:'bot_qris_order',telegram_id:tg,bot_id:s.bot.$id,status:'pending',
  due_at:new Date(now+30*86400000).toISOString(),payload:JSON.stringify(data)}))throw Error('Invoice duplikat.');
 await s.store.putState(currentKey(s,tg),{order_id:id,telegram_id:tg},{kind:'bot_qris_current',telegram_id:tg,status:'ready'});
 return display(await s.store.state(id));
}
async function webhook(req,res,s,raw){
 const p=await provider(s);
 const signature=String(req.headers['x-buatqris-signature']||'');
 const expected='sha256='+createHmac('sha256',String(p.signing_secret)).update(raw).digest('hex');
 const a=Buffer.from(signature),b=Buffer.from(expected);
 if(a.length!==b.length||!timingSafeEqual(a,b))return reject(res,'Tanda tangan webhook tidak sah.',401);
 let body;try{body=JSON.parse(raw)}catch{return reject(res,'Webhook tidak valid.')}
 const tx=String(body.transaction_id||body.data?.transaction_id||'');
 if(!/^[A-Za-z0-9_-]{1,128}$/.test(tx))return reject(res,'Transaction ID tidak valid.',400);
 const order=await s.store.state(s.m.id('bot-qris-order',tx));
 if(!order||order.kind!=='bot_qris_order'||order.data?.is_test!==true)return respond(res,{ok:true,ignored:true});
 if(String(body.event||req.headers['x-buatqris-event']||'')!=='payment.success')return respond(res,{ok:true,ignored:true});
 if(order.status==='activated')return respond(res,{ok:true,duplicate:true});
 const verified=await call(p,{action:'api_check_status',transaction_id:tx});
 s.m.assertProviderSettlement(verified,order.data);
 const updated=await paid(s,order,verified);
 return respond(res,{ok:true,status:updated.status});
}
module.exports=async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 const action=String(req.query?.action||'');
 if(action==='config'&&req.method==='GET')return respond(res,{ok:true,enabled:process.env.BADAI_BOT_QRIS_SANDBOX_ENABLED==='true',sandbox:true,price:PRICE});
 if(process.env.BADAI_BOT_QRIS_SANDBOX_ENABLED!=='true')return reject(res,'QRIS Mini App belum diaktifkan.',503);
 if(req.method!=='POST')return reject(res,'Method not allowed.',405);
 if(action!=='webhook'&&req.headers.origin!==URL_APP)return reject(res,'Asal permintaan tidak diizinkan.',403);
 try{
  const raw=await receive(req),s=await context();
  if(action==='webhook')return webhook(req,res,s,raw);
  let body={};try{body=JSON.parse(raw||'{}')}catch{return reject(res,'JSON tidak valid.')}
  const {telegram}=await identity(s,body.init_data);
  if(action==='create')return respond(res,await start(s,telegram.telegram_id));
  if(action==='status'){
   const order=await current(s,telegram.telegram_id);
   return respond(res,display(order?await reconcile(s,order,await provider(s)):null));
  }
  return reject(res,'Aksi tidak dikenal.',404);
 }catch(e){
  return reject(res,e.status?e.message:'Layanan QRIS Mini App belum dapat menyelesaikan permintaan.',e.status||503);
 }
};
module.exports.config={api:{bodyParser:false}};
