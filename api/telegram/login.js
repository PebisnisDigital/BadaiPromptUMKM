module.exports=async function handler(req,res){
 res.setHeader('Cache-Control','no-store, private');
 res.setHeader('Pragma','no-cache');
 res.setHeader('Referrer-Policy','no-referrer');
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 const origin=String(req.headers.origin||'');
 if(origin!=='https://badaiprompt.vercel.app'&&(!process.env.VERCEL_ENV||process.env.VERCEL_ENV!=='preview'||origin!=='https://'+String(req.headers.host||''))){
  return res.status(403).json({error:'Origin tidak diizinkan.'});
 }
 try{
  const code=req.body&&typeof req.body.code==='string'?req.body.code:'';
  if(Buffer.byteLength(JSON.stringify(req.body||{}))>2048)return res.status(413).json({error:'Data terlalu besar.'});
  const {runtime}=await import('../../functions/activate-member/src/telegram/runtime.mjs');
  return res.status(200).json(await runtime().redeemLogin(code));
 }catch(e){return res.status(e.status||500).json({ok:false,error:e.status?e.message:'Login belum dapat diproses.'})}
};
module.exports.config={api:{bodyParser:{sizeLimit:'2kb'}}};
