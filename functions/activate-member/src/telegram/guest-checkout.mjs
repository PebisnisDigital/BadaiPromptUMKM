import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import {id} from './security.mjs';
const fingerprint=value=>createHash('sha256').update(String(value)).digest('hex');
const normalPhone=value=>String(value||'').replace(/[^0-9]/g,'');
const validPhone=value=>/^08[0-9]{8,11}$/.test(value)||/^628[0-9]{8,11}$/.test(value);
const fail=()=>{throw Error('Sesi checkout tidak sah atau kedaluwarsa.');};
const key=secret=>id('guest-checkout',secret);
/**
 * Anonymous website checkout pre-identity primitive. No payment or membership
 * is created here. Store only a hash of the bearer token in the row ID.
 */
export async function createGuestCheckoutSession(store,{name,whatsapp},{now=Date.now(),ttlMs=30*60000}={}){
 const buyerName=String(name||'').trim().replace(/\s+/g,' ').slice(0,100);
 const phone=normalPhone(whatsapp);
 if(buyerName.length<2||!validPhone(phone))throw Error('Nama atau nomor WhatsApp belum valid.');
 if(ttlMs<60000||ttlMs>86400000)throw Error('Masa berlaku checkout tidak valid.');
 const token=randomBytes(32).toString('base64url');
 const expiresAt=new Date(now+ttlMs).toISOString();
 const result=await store.claim(key(token),{
  kind:'guest_checkout',status:'active',due_at:expiresAt,
  payload:JSON.stringify({name:buyerName,whatsapp:phone,created_at:new Date(now).toISOString()})
 });
 if(!result)throw Error('Tidak dapat membuat sesi checkout.');
 return {token,expires_at:expiresAt};
}
export async function inspectGuestCheckoutSession(store,token,{now=Date.now()}={}){
 if(!/^[A-Za-z0-9_-]{43}$/.test(String(token||'')))fail();
 const row=await store.state(key(token));
 if(!row||row.kind!=='guest_checkout'||row.status!=='active'||!(Date.parse(row.due_at)>now))fail();
 return {session_id:row.$id,name:row.data.name,whatsapp:row.data.whatsapp};
}
