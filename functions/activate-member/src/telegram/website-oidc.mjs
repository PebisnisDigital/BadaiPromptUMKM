import {createHash,createPublicKey,verify as verifySignature,randomBytes} from 'node:crypto';

const ISSUER='https://oauth.telegram.org';
const JWKS_URL='https://oauth.telegram.org/.well-known/jwks.json';
export const randomSecret=()=>randomBytes(32).toString('base64url');
export const pkceChallenge=verifier=>createHash('sha256').update(String(verifier)).digest('base64url');
export const safeIdentifier=id=>{const str=String(id??'');if(!/^[1-9]\d{0,15}$/.test(str)||!Number.isSafeInteger(Number(str)))throw new Error('ID Telegram tidak valid.');return str};
export function loginUrl({clientId,redirectUri,state,verifier}){
 if(!/^[1-9]\d{4,19}$/.test(String(clientId)))throw new Error('Client Telegram belum dikonfigurasi.');
 if(!/^https:\/\/badaiprompt\.vercel\.app\/api\/website-login$/.test(String(redirectUri)))throw new Error('Redirect website harus domain resmi.');
 if(!/^[\w-]{32,90}$/.test(state)||!/^[\w-]{43,128}$/.test(verifier))throw new Error('Parameter login tidak valid.');
 const url=new URL('https://oauth.telegram.org/auth');
 Object.entries({client_id:String(clientId),redirect_uri:redirectUri,response_type:'code',scope:'openid profile',state,code_challenge:pkceChallenge(verifier),code_challenge_method:'S256'}).forEach(([k,v])=>url.searchParams.set(k,v));
 return url.toString();
}
function decode(segment){if(typeof segment!=='string'||segment.length>14000)throw new Error('Token Telegram terlalu besar.');try{return JSON.parse(Buffer.from(segment,'base64url').toString('utf8'))}catch{throw new Error('Token Telegram rusak.')}}
export function verifyTelegramIdToken(jwt,{clientId,keys,nonce,now=Math.floor(Date.now()/1000)}){
 const parts=String(jwt||'').split('.');if(parts.length!==3||parts.some(x=>x.length>14000))throw new Error('Format ID token tidak valid.');
 const header=decode(parts[0]),payload=decode(parts[1]);
 if(header.alg!=='RS256'||!header.kid||header.typ&&header.typ!=='JWT')throw new Error('Algoritma token tidak didukung.');
 if(payload.iss!==ISSUER||!(payload.aud===String(clientId)||Array.isArray(payload.aud)&&payload.aud.length===1&&payload.aud[0]===String(clientId)))throw new Error('Penerbit atau penerima token salah.');
 if(!Number.isInteger(payload.exp)||payload.exp<=now||!Number.isInteger(payload.iat)||payload.iat>now+30||now-payload.iat>600)throw new Error('Token Telegram kedaluwarsa.');
 if(nonce!==undefined&&payload.nonce!==nonce)throw new Error('Nonce Telegram tidak cocok.');
 const jwk=keys?.keys?.find(k=>k.kid===header.kid&&k.kty==='RSA'&&k.use!=='enc'&&(!k.alg||k.alg==='RS256'));
 if(!jwk)throw new Error('Kunci publik Telegram tidak ditemukan.');
 let key;try{key=createPublicKey({key:jwk,format:'jwk'})}catch{throw new Error('Kunci publik Telegram tidak sah.')}
 if(!verifySignature('RSA-SHA256',Buffer.from(parts[0]+'.'+parts[1]),key,Buffer.from(parts[2],'base64url')))throw new Error('Tanda tangan Telegram tidak valid.');
 const tg=safeIdentifier(payload.id??payload.sub);
 if(!payload.sub||typeof payload.sub!=='string')throw new Error('Subjek Telegram kosong.');
 return {telegram_id:tg,sub:payload.sub,name:String(payload.name||payload.given_name||'Member BADAI PROMPT').slice(0,120),username:String(payload.preferred_username||'').slice(0,64)};
}
export async function validateToken(jwt,opts,{fetcher=fetch}={}){
 const response=await fetcher(JWKS_URL,{signal:AbortSignal.timeout(6000)});
 if(!response.ok)throw new Error('Kunci Telegram tidak tersedia.');
 const keys=await response.json();
 return verifyTelegramIdToken(jwt,{...opts,keys});
}
export async function exchangeAuthorizationCode({code,clientId,clientSecret,redirectUri,verifier},{fetcher=fetch}={}){
 if(!/^[A-Za-z0-9._~-]{10,2048}$/.test(String(code))||!/^[\w-]{43,128}$/.test(String(verifier)))throw new Error('Kode login tidak valid.');
 const authorization=Buffer.from(String(clientId)+':'+String(clientSecret)).toString('base64');
 const response=await fetcher('https://oauth.telegram.org/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded',authorization:'Basic '+authorization},body:new URLSearchParams({grant_type:'authorization_code',code:String(code),redirect_uri:redirectUri,client_id:String(clientId),code_verifier:verifier}).toString(),signal:AbortSignal.timeout(8000)});
 const data=await response.json().catch(()=>({}));
 if(!response.ok||typeof data.id_token!=='string')throw new Error('Persetujuan login Telegram tidak berhasil.');
 return data.id_token;
}
