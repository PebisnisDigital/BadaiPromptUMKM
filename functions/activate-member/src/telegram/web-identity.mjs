import {createHmac,createHash,timingSafeEqual} from 'node:crypto';

// For account linking on the independent website only. Do not trust Telegram IDs
// supplied in query strings or a bot callback without Telegram-signed proof.
export function verifyTelegramWebsiteIdentity(data,token,{now=Math.floor(Date.now()/1000),maxAgeSeconds=300}={}){
 if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('Identitas Telegram tidak ada.');
 const allowed=['id','first_name','last_name','username','photo_url','auth_date','hash'];
 const entries=Object.entries(data).filter(([key])=>allowed.includes(key));
 if(entries.length!==Object.keys(data).length)throw new Error('Parameter identitas tidak dikenal.');
 const id=String(data.id||''),date=Number(data.auth_date),signature=String(data.hash||'');
 if(!/^[1-9]\d{0,15}$/.test(id)||!Number.isSafeInteger(Number(id)))throw new Error('Telegram ID tidak valid.');
 if(!Number.isSafeInteger(date)||date>now+30||now-date>maxAgeSeconds)throw new Error('Persetujuan Telegram kedaluwarsa.');
 if(!/^[a-f0-9]{64}$/i.test(signature))throw new Error('Tanda tangan login tidak valid.');
 if(typeof token!=='string'||!/^\d{5,20}:[a-zA-Z0-9_-]{20,100}$/.test(token))throw new Error('Bot login belum dikonfigurasi.');
 const check=entries.filter(([k])=>k!=='hash').sort(([a],[b])=>a.localeCompare(b,'en')).map(([k,v])=>k+'='+String(v)).join('\n');
 const secret=createHash('sha256').update(token).digest();
 const expected=createHmac('sha256',secret).update(check).digest();
 const supplied=Buffer.from(signature,'hex');
 if(supplied.length!==expected.length||!timingSafeEqual(expected,supplied))throw new Error('Identitas Telegram tidak terverifikasi.');
 return {telegram_id:id,first_name:String(data.first_name||'').slice(0,128),username:String(data.username||'').slice(0,64),authenticated_at:new Date(date*1000).toISOString()};
}
