import {runtime} from '../../functions/activate-member/src/telegram/runtime.mjs';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 if(req.headers.origin&&req.headers.origin!==('https://'+req.headers.host))return res.status(403).json({error:'Origin tidak diizinkan.'});
 try{return res.status(200).json(await runtime().linkToken(String(req.headers.authorization||'').replace(/^Bearer /,'')))}catch(e){return res.status(e.status||500).json({ok:false,error:e.status?e.message:'Link Telegram belum dapat dibuat.'})}
}
