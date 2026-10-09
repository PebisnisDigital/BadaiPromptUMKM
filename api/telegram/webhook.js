// Keep the handler CommonJS and load the shared ESM runtime dynamically.
module.exports=async function handler(req,res){
 res.setHeader('Cache-Control','no-store');if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 if(Buffer.byteLength(JSON.stringify(req.body||{}))>32768)return res.status(413).json({error:'Payload terlalu besar.'});
 const bot=String(req.query.bot||'');if(!/^tg_[a-f0-9]{32}$/.test(bot))return res.status(400).json({error:'Bot tidak valid.'});
 try{const {runtime}=await import('../../functions/activate-member/src/telegram/runtime.mjs');const result=await runtime().webhook(bot,String(req.headers['x-telegram-bot-api-secret-token']||''),req.body||{});return res.status(200).json(result)}
 catch(e){return res.status(e.status||503).json({ok:false,error:e.status===403?'Webhook tidak sah.':'Update belum diproses.'})}
}

module.exports.config={api:{bodyParser:{sizeLimit:'32kb'}}};
