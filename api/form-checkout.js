// Website-only public checkout using the EXISTING Appwrite payment-api and BuatQRIS.
// Telegram login is not required; no direct payment URLs or API secrets reach the browser.
const ORIGIN='https://promptional.vercel.app',PROJECT='badai-prompt-umkm';
const EXECUTE='https://sgp.cloud.appwrite.io/v1/functions/payment-api/executions';
const ALLOWED=new Set(['config','create','check','session-token']);
const only=(v,max)=>String(v??'').trim().slice(0,max);
const emailValid=e=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)&&e.length<=160;
function normalizeWa(v){let s=String(v??'').replace(/\D/g,'');if(s.startsWith('0'))s='62'+s.slice(1);else if(s.startsWith('8'))s='62'+s;return s}
const fail=(res,status,error)=>res.status(status).json({ok:false,error});
module.exports=async function handler(req,res){
 res.setHeader('Cache-Control','no-store, no-cache, must-revalidate');
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('Referrer-Policy','no-referrer');
 const action=only(req.query?.action||'config',30);
 if(!ALLOWED.has(action))return fail(res,404,'Layanan checkout tidak ditemukan.');
 if(req.method==='GET'&&action!=='config')return fail(res,405,'Gunakan POST.');
 if(!['GET','POST'].includes(req.method))return fail(res,405,'Metode tidak diizinkan.');
 if(req.method==='POST'){
  const origin=String(req.headers.origin||'');
  if(origin!==ORIGIN)return fail(res,403,'Asal permintaan tidak diizinkan.');
  if(Number(req.headers['content-length']||0)>4096)return fail(res,413,'Data terlalu besar.');
 }
 let data={};
 try{data=typeof req.body==='string'?JSON.parse(req.body):req.body||{}}catch{return fail(res,400,'Data tidak valid.')}
 if(req.method==='POST'&&action==='create'){
  if(data.website_url||data.company||data.username)return fail(res,400,'Permintaan ditolak.');
  const name=only(data.full_name,120),email=only(data.email,160).toLowerCase(),wa=normalizeWa(data.whatsapp);
  if(name.length<2||!emailValid(email)||!/^62\d{8,13}$/.test(wa))
   return fail(res,400,'Isi nama, email yang valid, dan nomor WhatsApp aktif.');
  // One fixed product; never accept prices/paid status supplied by the browser.
  data={full_name:name,email,whatsapp:wa,amount:199000};
 }else if(['check','session-token'].includes(action)){
  const token=only(data.public_token,60);
  if(!/^[a-f0-9]{48}$/.test(token))return fail(res,400,'Kode transaksi tidak valid.');
  data={public_token:token};
 }else if(action==='config'){data={}}
 try{
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),18000);
  let upstream;
  try{
   upstream=await fetch(EXECUTE,{method:'POST',
    headers:{'Content-Type':'application/json','X-Appwrite-Project':PROJECT},
    body:JSON.stringify({body:JSON.stringify(data),async:false,path:'/'+action,method:'POST',headers:{'content-type':'application/json'}}),
    signal:controller.signal});
  }finally{clearTimeout(timeout)}
  if(!upstream.ok)return fail(res,503,'Layanan pembayaran sementara belum tersedia. Coba lagi sebentar.');
  const execution=await upstream.json();
  const code=Number(execution.responseStatusCode||503);
  let payload;try{payload=JSON.parse(execution.responseBody||'{}')}catch{payload={error:'Respons pembayaran tidak valid.'}}
  if(code<200||code>=300){
   return fail(res,code>=400&&code<500?code:503,
    String(payload.error||'Pembayaran belum bisa diproses.').slice(0,220));
  }
  return res.status(200).json(payload);
 }catch(e){
  console.error('Checkout relay temporarily unavailable:',e?.name||'error');
  return fail(res,503,'Koneksi QRIS sementara terganggu. Jangan bayar dua kali; coba cek kembali.');
 }
};
