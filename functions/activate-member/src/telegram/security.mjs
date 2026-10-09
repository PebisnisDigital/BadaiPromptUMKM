import {randomBytes,createCipheriv,createDecipheriv,createHash,timingSafeEqual} from 'node:crypto';
export const fail=(message,status=400)=>Object.assign(new Error(message),{status});
export const id=(...parts)=>'tg_'+createHash('sha256').update(parts.join('\0')).digest('hex').slice(0,32);
export const random=()=>randomBytes(24).toString('base64url');
export function masterKey(value){
 const key=Buffer.from(value||'','base64');if(key.length!==32)throw fail('Master key Telegram belum dikonfigurasi.',503);return key;
}
export function seal(text,key,context){
 const nonce=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,nonce);cipher.setAAD(Buffer.from(context));
 return 'v1.'+nonce.toString('base64url')+'.'+Buffer.concat([cipher.update(text,'utf8'),cipher.final()]).toString('base64url')+'.'+cipher.getAuthTag().toString('base64url');
}
export function unseal(value,key,context){
 const [version,nonce,body,tag]=String(value||'').split('.');if(version!=='v1')throw fail('Rahasia bot belum terenkripsi. Konfigurasi ulang melalui admin.',503);
 try{const decipher=createDecipheriv('aes-256-gcm',key,Buffer.from(nonce,'base64url'));decipher.setAAD(Buffer.from(context));decipher.setAuthTag(Buffer.from(tag,'base64url'));return Buffer.concat([decipher.update(Buffer.from(body,'base64url')),decipher.final()]).toString('utf8')}
 catch{throw fail('Rahasia bot tidak dapat dibuka. Periksa master key.',503)}
}
export function equal(a,b){const x=Buffer.from(String(a||'')),y=Buffer.from(String(b||''));return x.length>0&&x.length===y.length&&timingSafeEqual(x,y)}
export function numeric(value){const s=String(value??'');if(!/^[1-9]\d{0,15}$/.test(s)||!Number.isSafeInteger(Number(s)))throw fail('Telegram ID tidak valid.');return s}
export function privateIdentity(update){
 const m=update.message;if(!m||m.chat?.type!=='private'||m.from?.is_bot||numeric(m.from?.id)!==numeric(m.chat?.id))throw fail('Gunakan bot melalui chat pribadi.');
 return {telegram_id:numeric(m.from.id),chat_id:numeric(m.chat.id),first_name:String(m.from.first_name||'').slice(0,128),username:String(m.from.username||'').slice(0,64),text:String(m.text||'').slice(0,512)};
}
export function safeError(e){return e?.telegramCode?'Telegram '+e.telegramCode:(e?.status===503?'Konfigurasi server belum lengkap.':'Operasi belum selesai. Silakan ulangi atau periksa log admin.')} 
