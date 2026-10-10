import {createHash,randomBytes,timingSafeEqual} from 'node:crypto';

const digest=value=>createHash('sha256').update(String(value)).digest('hex');
const tokenId=token=>'tg_'+digest('purchase-activation\0'+token).slice(0,32);
const validToken=token=>/^[A-Za-z0-9_-]{32,90}$/.test(String(token||''));
const validTelegram=id=>/^[1-9]\d{0,15}$/.test(String(id||''))&&Number.isSafeInteger(Number(id));
const rejected=()=>{throw Error('Tautan aktivasi tidak sah atau sudah kedaluwarsa.');};

// Store is the existing Appwrite-backed telegram_state service.
// Tokens are random bearer credentials: only a SHA-256 fingerprint is persisted.
export async function issuePurchaseActivation(store,order,{now=Date.now(),ttlMs=30*60*1000}={}){
 if(!order?.$id||order.kind!=='website_order'||order.status!=='paid'||!order.data?.transaction_id)
  throw Error('Hanya transaksi QRIS yang telah diverifikasi boleh menerbitkan aktivasi.');
 if(!Number.isSafeInteger(ttlMs)||ttlMs<60000||ttlMs>24*60*60*1000)throw Error('Masa berlaku tidak valid.');
 const token=randomBytes(32).toString('base64url');
 const dueAt=new Date(now+ttlMs).toISOString();
 const claimed=await store.claim(tokenId(token),{
  kind:'purchase_activation',status:'pending',due_at:dueAt,
  payload:JSON.stringify({order_id:order.$id,transaction_hash:digest(order.data.transaction_id),created_at:new Date(now).toISOString()})
 });
 if(!claimed)throw Error('Gagal menerbitkan tautan, silakan ulangi.');
 return {token,expires_at:dueAt};
}

// The caller must fetch the order by order_id and independently verify payment.
// No membership is granted by merely presenting an activation token.
export async function validatePurchaseActivation(store,token,order,{now=Date.now()}={}){
 if(!validToken(token))rejected();
 const row=await store.state(tokenId(token));
 if(!row||row.kind!=='purchase_activation'||row.status!=='pending'||Date.parse(row.due_at)<=now)rejected();
 if(!order||order.$id!==row.data?.order_id||order.kind!=='website_order'||order.status!=='paid')rejected();
 const expected=digest(order.data?.transaction_id||'');
 const stored=String(row.data?.transaction_hash||'');
 if(expected.length!==stored.length||!timingSafeEqual(Buffer.from(expected),Buffer.from(stored)))rejected();
 return {activation_id:row.$id,order_id:order.$id};
}

export async function finalizePurchaseActivation(store,activationId,telegramId){
 if(!validTelegram(telegramId))throw Error('Telegram ID tidak valid.');
 const row=await store.state(activationId);
 if(!row||row.kind!=='purchase_activation'||row.status!=='pending'||Date.parse(row.due_at)<=Date.now())rejected();
 await store.update('telegram_state',activationId,{status:'used',payload:JSON.stringify({...row.data,telegram_id:String(telegramId),used_at:new Date().toISOString()})});
}
