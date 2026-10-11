// BuatQRIS signed callback for direct Telegram bot QRIS sandbox purchases.
// Always verify settlement via BuatQRIS status API; never trust callback body as payment proof.
const {createHmac,timingSafeEqual}=require('node:crypto');
const result=(res,code,data)=>res.status(code).json(data);
let runtime;
async function load(){if(!runtime)runtime=(await import('../functions/activate-member/src/telegram/runtime.mjs')).runtime;return runtime}
async function rawBody(req){
 let n=0,chunks=[];for await(const chunk of req){n+=chunk.length;if(n>12000)throw Error('Callback terlalu besar.');chunks.push(chunk)}
 return Buffer.concat(chunks).toString('utf8');
}
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return result(res,405,{ok:false,error:'Metode tidak diizinkan.'});
 // Never accept production transactions while this flow is experimental.
 if(process.env.TELEGRAM_BOT_QRIS_SANDBOX_ENABLED!=='true')
  return result(res,503,{ok:false,error:'Webhook QRIS bot sandbox belum aktif.'});
 try{
  const s=(await load())(),p=await s.qris.provider(),raw=await rawBody(req);
  const signature=String(req.headers['x-buatqris-signature']||'');
  const expected='sha256='+createHmac('sha256',String(p.signing_secret)).update(raw).digest('hex');
  const a=Buffer.from(signature),b=Buffer.from(expected);
  if(a.length!==b.length||!timingSafeEqual(a,b))return result(res,401,{ok:false,error:'Signature tidak sah.'});
  let data;try{data=JSON.parse(raw)}catch{return result(res,400,{ok:false,error:'JSON tidak valid.'})}
  const tx=String(data.transaction_id||data.data?.transaction_id||'');
  if(!/^[a-zA-Z0-9_-]{1,128}$/.test(tx))return result(res,400,{ok:false,error:'ID transaksi tidak valid.'});
  const order=await s.store.state((await import('../functions/activate-member/src/telegram/bot-qris.mjs')).botQrisIds.orderId(tx));
  if(!order||order.kind!=='bot_qris_order'||order.data?.is_test!==true)return result(res,200,{ok:true,ignored:true});
  if(order.status==='activated')return result(res,200,{ok:true,duplicate:true});
  if(!['pending','paid'].includes(order.status))return result(res,200,{ok:true,ignored:true});
  if(String(data.event||req.headers['x-buatqris-event']||'')!=='payment.success')
   return result(res,200,{ok:true,ignored:true});
  const updated=await s.qris.reconcile(order,p);
  if(updated.status!=='activated')return result(res,503,{ok:false,error:'Pembayaran belum selesai diverifikasi.'});
  return result(res,200,{ok:true,status:'activated'});
 }catch(e){
  return result(res,503,{ok:false,error:'Status pembayaran sedang diverifikasi. Coba /cek di Telegram.'});
 }
};
module.exports.config={api:{bodyParser:false}};
