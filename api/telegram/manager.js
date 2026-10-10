const ACTIONS=new Set(['marketing-get','marketing-candidates','marketing-settings','marketing-slot-save','marketing-slot-delete','marketing-slot-move','overview','settings','save','tester','rename','connection','webhook','install-webhook','prepare-switch','activate','disable','delete','test-message','test-prompt','test-delete','dry-run']);
module.exports=async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 if(req.headers.origin&&req.headers.origin!==('https://'+req.headers.host))return res.status(403).json({error:'Origin tidak diizinkan.'});
 try{const {runtime}=await import('../../functions/activate-member/src/telegram/runtime.mjs');const body=typeof req.body==='string'?JSON.parse(req.body):req.body||{};if(Buffer.byteLength(JSON.stringify(body))>12000)return res.status(413).json({error:'Payload terlalu besar.'});if(!ACTIONS.has(body.action))return res.status(404).json({error:'Aksi tidak ditemukan.'});
  const jwt=String(req.headers.authorization||'').replace(/^Bearer /,'');const result=await runtime().admin(body.action,body,jwt);return res.status(200).json(result);
 }catch(e){return res.status(e.status||500).json({ok:false,error:e.status?e.message:'Layanan Telegram belum dapat memproses permintaan.'})}
}
