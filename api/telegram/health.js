module.exports=async function handler(req,res){
 res.setHeader('Cache-Control','no-store');if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 try{const {runtime}=await import('../../functions/activate-member/src/telegram/runtime.mjs');const {masterKey}=await import('../../functions/activate-member/src/telegram/security.mjs');const service=runtime();masterKey(service.key);await service.store.get('telegram_state','telegram-settings');return res.status(200).json({ok:true,service:'Telegram backend',sending_enabled:service.sendEnabled})}
 catch{return res.status(503).json({ok:false,error:'Backend Telegram belum siap.'})}
};
