import {fail} from './security.mjs';
const METHODS=new Set(['getMe','getWebhookInfo','setWebhook','deleteWebhook','sendMessage','sendPhoto','deleteMessage','answerCallbackQuery']);
export class Telegram{
 constructor(fetcher=fetch){this.fetcher=fetcher;this.tail=Promise.resolve();this.chatTimes=new Map();this.globalTime=0}
 setDeadline(value){this.deadline=value}
 async call(token,method,body={}){
  if(!METHODS.has(method))throw fail('Metode Telegram tidak diizinkan.');
  if(method.startsWith('send')){const chat=token.split(':')[0]+':'+String(body.chat_id);const slot=this.tail.then(async()=>{const delay=Math.max(0,this.globalTime+50-Date.now(),(this.chatTimes.get(chat)||0)+1100-Date.now());if(delay)await new Promise(resolve=>setTimeout(resolve,delay));this.globalTime=Date.now();this.chatTimes.set(chat,this.globalTime)});this.tail=slot.catch(()=>{});await slot}
  const left=this.deadline?this.deadline-Date.now():8000;if(left<250)throw Object.assign(fail('Budget worker habis; operasi belum dikirim.',503),{retryAfter:60});
  let response;try{
    let outgoing=JSON.stringify(body),headers={'content-type':'application/json'};
    if(method==='sendPhoto'&&typeof body.photo==='string'&&/^data:image\/(?:png|jpeg);base64,/.test(body.photo)){
      const type=body.photo.slice(5,body.photo.indexOf(';')),image=Buffer.from(body.photo.split(',')[1]||'','base64');
      if(!image.length||image.length>6*1024*1024)throw fail('Gambar QR tidak valid atau terlalu besar.',413);
      const form=new FormData();
      for(const [key,value] of Object.entries(body)){
        if(key==='photo')form.append('photo',new Blob([image],{type}),type==='image/png'?'qris.png':'qris.jpg');
        else form.append(key,typeof value==='object'?JSON.stringify(value):String(value));
      }
      outgoing=form;headers={};
    }
    response=await this.fetcher('https://api.telegram.org/bot'+token+'/'+method,{method:'POST',headers,body:outgoing,signal:AbortSignal.timeout(Math.min(8000,Math.max(1,left)))});
  }
  catch{throw Object.assign(fail('Telegram tidak dapat dihubungi.',502),{ambiguous:method.startsWith('send')})}
  let data;try{data=await response.json()}catch{throw Object.assign(fail('Respons Telegram tidak valid.',502),{ambiguous:method.startsWith('send')})}
  if(!data.ok)throw Object.assign(fail('Telegram menolak operasi ('+(data.error_code||response.status)+').',502),{telegramCode:data.error_code||response.status,retryAfter:data.parameters?.retry_after,blocked:data.error_code===403,alreadyDeleted:data.error_code===400&&/message to delete not found/i.test(String(data.description||''))});
  return data.result;
 }
}
