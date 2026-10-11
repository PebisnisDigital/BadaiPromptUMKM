import {id} from './security.mjs';
import {issuePurchaseActivation} from './telegram-purchase-activation.mjs';
const PRICE=199000;
export function assertGuestPaidOrder(order){
 const d=order?.data;
 if(order?.kind!=='website_order'||order.status!=='paid'||d?.checkout_type!=='guest'||!d?.paid_at||!d?.transaction_id||d?.amount!==PRICE||!d?.guest_session_id||!d?.first_name||!d?.whatsapp)throw Error('Transaksi QRIS tamu belum terverifikasi.');
 return d;
}
export async function prepareGuestTelegramActivation(store,order){
 const d=assertGuestPaidOrder(order);
 const linked=await store.state(id('guest-telegram-activation',order.$id));
 if(linked){
  if(linked.kind!=='guest_activation_receipt'||linked.data?.order_id!==order.$id)throw Error('Aktivasi order tidak konsisten.');
  return {status:'already_issued',expires_at:linked.data.expires_at};
 }
 // Claim BEFORE issuing an activation token. A retry must not create multiple
 // activations for the same payment. If issue fails, preserve the claim for
 // explicit administrator recovery (no automatic second issue).
 const claim=await store.claim(id('guest-telegram-activation',order.$id),{
  kind:'guest_activation_receipt',status:'issuing',
  payload:JSON.stringify({order_id:order.$id,guest_session_id:d.guest_session_id})
 });
 if(!claim)return {status:'already_issuing'};
 const issued=await issuePurchaseActivation(store,order);
 await store.update('telegram_state',claim.$id,{
  status:'issued',payload:JSON.stringify({order_id:order.$id,guest_session_id:d.guest_session_id,expires_at:issued.expires_at})
 });
 // Token is shown only once to the verified browser session, never stored.
 return {status:'issued',token:issued.token,expires_at:issued.expires_at};
}
