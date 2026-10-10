import {id} from './security.mjs';

// Best-effort notification for a verified, independently completed website order.
// Website entitlement is granted by the existing authoritative order event worker.
// This function never creates a payment, grants access, or changes member entitlement.
export async function notifyVerifiedWebsitePurchase({service,userId,orderId}){
 if(!service?.sendEnabled)return {ok:true,skipped:'telegram_sending_disabled'};
 const cfg=await service.config();
 if(cfg.dry_run)return {ok:true,skipped:'telegram_dry_run'};
 const bot=await service.main();
 if(!bot?.is_active)return {ok:true,skipped:'no_active_bot'};
 const page=await service.store.list('telegram_members',[['equal','appwrite_user_id',userId]],5);
 if(!page.rows.length)return {ok:true,skipped:'buyer_not_linked'};
 let sent=0;
 for(const candidate of page.rows){
  const permission=await service.consent(bot.$id,candidate.telegram_id);
  if(permission?.status!=='allowed')continue;
  const member=await service.sync(candidate);
  if(member.plan!=='premium')continue;
  const text='Pembayaran di website BADAI PROMPT sudah terverifikasi!\n\nAkses Premium kakak sudah aktif. Buka koleksi prompt melalui website resmi:\nhttps://badaiprompt.vercel.app/member\n\nGunakan /status untuk memeriksa paket dan masa aktif.';
  const key=id('web-purchase-notice',orderId,member.telegram_id);
  const result=await service.delivery.text(member,bot,text,key,'premium_paid');
  if(result.ok||result.duplicate)sent++;
 }
 return {ok:true,notified:sent};
}
