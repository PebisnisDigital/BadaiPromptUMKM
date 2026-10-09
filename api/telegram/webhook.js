import {runtime} from '../../functions/activate-member/src/telegram/runtime.mjs';
export const config={api:{bodyParser:{sizeLimit:'32kb'}}};
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 const bot=String(req.query.bot||'');if(!/^tg_[a-f0-9]{32}$/.test(bot))return res.status(400).json({error:'Bot tidak valid.'});
 try{const result=await runtime().webhook(bot,String(req.headers['x-telegram-bot-api-secret-token']||''),req.body||{});return res.status(200).json(result)}
 catch(e){return res.status(e.status||503).json({ok:false,error:e.status===403?'Webhook tidak sah.':'Update belum diproses.'})}
}
