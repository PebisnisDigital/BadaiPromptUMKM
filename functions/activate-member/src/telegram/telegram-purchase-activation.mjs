import {createHash,randomBytes,timingSafeEqual} from 'node:crypto';
import {id} from './security.mjs';

const digest=value=>createHash('sha256').update(String(value)).digest('hex');
const tokenId=token=>id('purchase-activation',token);
const validToken=token=>/^[A-Za-z0-9_-]{32,90}$/.test(String(token||''));
const validTelegram=value=>/^[1-9]\\d{0,15}$/.test(String(value||''))&&Number.isSafeInteger(Number(value));
const rejected=()=>{throw Error('Tautan aktivasi tidak sah, telah digunakan, atau sudah kedaluwarsa.');};
const eligible=order=>order?.$id&&order.kind==='website_order'&&order.status==='paid'&&order.data?.transaction_id&&order.data?.paid_at;
const matches=(row,order,now)=> {
 if(!row||row.kind!=='purchase_activation'||row.status!=='pending'||!(Date.parse(row.due_at)>now))rejected();
 if(!eligible(order)||order.$id!==row.data?.order_id)rejected();
 const expected=Buffer.from(digest(order.data.transaction_id));
 const given=Buffer.from(String(row.data?.transaction_hash||''));
 if(expected.length!==given.length||!timingSafeEqual(expected,given))rejected();
};
export async function issuePurchaseActivation(store,order,{now=Date.now(),ttlMs=30*60*1000}={}){
 if(!eligible(order))throw Error('Hanya transaksi QRIS lunas dan terverifikasi yang boleh menerbitkan aktivasi.');
 if(!Number.isSafeInteger(ttlMs)||ttlMs<60000||ttlMs>86400000)throw Error('Masa berlaku tidak valid.');
 const token=randomBytes(32).toString('base64url');
 const dueAt=new Date(now+ttlMs).toISOString();
 const claimed=await store.claim(tokenId(token),{
  kind:'purchase_activation',status:'pending',due_at:dueAt,
  payload:JSON.stringify({order_id:order.$id,transaction_hash:digest(order.data.transaction_id),created_at:new Date(now).toISOString()})
 });
 if(!claimed)throw Error('Tidak dapat membuat token aktivasi.');
 return {token,expires_at:dueAt};
}
export async function validatePurchaseActivation(store,token,order,{now=Date.now()}={}){
 if(!validToken(token))rejected();
 const row=await store.state(tokenId(token));
 matches(row,order,now);
 const binding=await store.state(id('purchase-binding',order.$id));
 if(binding)rejected();
 return {activation_id:row.$id,order_id:order.$id};
}
// Atomic reservation: one verified paid order may be bound to exactly one Telegram identity.
// Caller must create/link Appwrite membership BEFORE consuming the token and must retain
// a recoverable state if downstream activation fails. This primitive grants no membership.
export async function reservePurchaseActivation(store,token,order,telegramId,{now=Date.now()}={}){
 if(!validTelegram(telegramId)||!validToken(token))rejected();
 if(typeof store.transaction!=='function')throw Error('Appwrite transactions wajib tersedia untuk aktivasi.');
 return store.transaction(async tx=>{
  const row=await tx.state(tokenId(token));
  matches(row,order,now);
  const bindingId=id('purchase-binding',order.$id);
  if(await tx.state(bindingId))rejected();
  const data={order_id:order.$id,telegram_id:String(telegramId),activation_id:row.$id,reserved_at:new Date(now).toISOString()};
  await tx.put(bindingId,data,{kind:'purchase_binding',status:'reserved'},false);
  await tx.put(row.$id,{...row.data,telegram_id:String(telegramId),used_at:new Date(now).toISOString()},{kind:'purchase_activation',status:'used',due_at:row.due_at},true);
  return data;
 });
}
