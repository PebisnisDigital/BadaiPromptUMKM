import {fail} from './security.mjs';
const METHODS=new Set(['getMe','getWebhookInfo','setWebhook','deleteWebhook','sendMessage','sendPhoto','deleteMessage','answerCallbackQuery']);
export class Telegram{
 constructor(fetcher=fetch){this.fetcher=fetcher;this.tail=Promise.resolve();this.chatTimes=new Map();this.globalTime=0}
 async call(token,method,body={}){
  if(!METHODS.has(method))throw fail('Metode Telegram tidak diizinkan.');
  if(method.startsWith('send')){const chat=token.split(':')[0]+':'+String(body.chat_id);const slot=this.tail.then(async()=>{const delay=Math.max(0,this.globalTime+50-Date.now(),(this.chatTimes.get(chat)||0)+1100-Date.now());if(delay)await new Promise(resolve=>setTimeout(resolve,delay));this.globalTime=Date.now();this.chatTimes.set(chat,this.globalTime)});this.tail=slot.catch(()=>{});await slot}
  let response;try{response=await this.fetcher('https://api.telegram.org/bot'+token+'/'+method,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(8000)})}
  catch{throw Object.assign(fail('Telegram tidak dapat dihubungi.',502),{ambiguous:method.startsWith('send')})}
  let data;try{data=await response.json()}catch{throw Object.assign(fail('Respons Telegram tidak valid.',502),{ambiguous:method.startsWith('send')})}
  if(!data.ok)throw Object.assign(fail('Telegram menolak operasi ('+(data.error_code||response.status)+').',502),{telegramCode:data.error_code||response.status,retryAfter:data.parameters?.retry_after,blocked:data.error_code===403,alreadyDeleted:data.error_code===400&&/message to delete not found/i.test(String(data.description||''))});
  return data.result;
 }
}
