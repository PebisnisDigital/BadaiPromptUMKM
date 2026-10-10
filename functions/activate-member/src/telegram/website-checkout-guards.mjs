// Side-effect-free safety checks for independently purchased website QRIS entitlements.
// These guards are deliberately reusable by webhook and order-status reconciliation.

export function assertProviderSettlement(providerResponse,stored){
  const d=providerResponse?.data||providerResponse;
  if(String(d?.status)!=='success')throw Error('Transaksi belum dinyatakan sukses oleh penyedia pembayaran.');
  if(!stored?.transaction_id||Number(stored.amount)!==199000)throw Error('Tagihan tidak valid.');
  if(d.transaction_id!=null&&String(d.transaction_id)!==String(stored.transaction_id))throw Error('ID transaksi penyedia tidak cocok.');
  if(d.amount!=null&&Number(d.amount)!==Number(stored.amount))throw Error('Nominal transaksi penyedia tidak cocok.');
  if(d.total_amount!=null&&Number(d.total_amount)!==Number(stored.total_amount))throw Error('Total transaksi penyedia tidak cocok.');
  return true;
}

export function assertAccountOwner({telegramId,userId,telegramLink,userLink,botMember}){
  const tg=String(telegramId),uid=String(userId);
  if(telegramLink&&String(telegramLink.data?.user_id||'')!==uid)
    throw Error('Telegram sudah ditautkan dengan akun lain; butuh pemeriksaan admin.');
  if(userLink&&String(userLink.data?.telegram_id||'')!==tg)
    throw Error('Akun sudah ditautkan dengan Telegram lain; butuh pemeriksaan admin.');
  if(botMember?.appwrite_user_id&&String(botMember.appwrite_user_id)!==uid)
    throw Error('Member Telegram terhubung ke akun Appwrite lain; hentikan aktivasi.');
  return true;
}

const YEAR=365*86400000;
export function calculatePaidAccessUntil({paidAt,profile}){
  const paid=Date.parse(String(paidAt||''));
  if(!Number.isFinite(paid))throw Error('Tanggal pembayaran tidak valid.');
  if(profile?.status==='active'&&profile.access_until==null)return null; // Existing permanent access stays permanent.
  const old=profile?.access_until?Date.parse(profile.access_until):NaN;
  const base=Number.isFinite(old)&&old>paid?old:paid;
  return new Date(base+YEAR).toISOString();
}


// Atomic insert of one immutable activation plan per paid order. A concurrent
// webhook and browser check can race, but never produce two different years.
export async function freezeOrderEntitlement({store,key,orderId,userId,telegramId,proposed}){
 if(typeof key!=='string'||!key||!orderId||!userId||!telegramId)throw Error('Identitas rencana aktivasi tidak valid.');
 await store.claim(key,{
  kind:'activation_plan',user_id:userId,telegram_id:telegramId,status:'fixed',
  payload:JSON.stringify({user_id:userId,telegram_id:telegramId,access_until:proposed,order_id:orderId})
 });
 const existing=await store.state(key);
 if(!existing||existing.kind!=='activation_plan'||existing.data?.user_id!==userId||existing.data?.telegram_id!==telegramId||existing.data?.order_id!==orderId)
  throw Error('Rencana aktivasi tidak konsisten; perlu pemeriksaan admin.');
 const value=existing.data.access_until;
 if(value!==null&&(!value||!Number.isFinite(Date.parse(value))))throw Error('Masa akses aktivasi tidak valid.');
 return value;
}
