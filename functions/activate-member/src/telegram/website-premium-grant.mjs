import {Query,Permission,Role} from 'node-appwrite';
import {id} from './security.mjs';
import {assertAccountOwner,calculatePaidAccessUntil,freezeOrderEntitlement,selectVerifiedAccountId} from './website-checkout-guards.mjs';

const DB='badai_prompt_umkm',PRICE=199000;
const validId=x=>/^[1-9]\d{0,15}$/.test(String(x||''))&&Number.isSafeInteger(Number(x));
const orderFrom=r=>{if(!r||r.kind!=='website_order')throw Error('Pesanan tidak ditemukan.');return r.data};

export async function grantWebsitePremium(s,row,{sendNotice=false,send=async()=>{}}={}){
 if(row.status==='activated')return row;
 if(row.status!=='paid')throw Error('Pembayaran belum terverifikasi.');
 const data=orderFrom(row),tg=data.telegram_id;
 if(!validId(tg)||data.amount!==PRICE||!data.transaction_id||!data.paid_at)throw Error('Transaksi memerlukan review manual.');
 const currentLink=await s.store.state(id('tglink',tg));
 const botMember=await s.store.get('telegram_members',id('member',tg));
 const userId=selectVerifiedAccountId({telegramLink:currentLink,botMember,fallbackUserId:id('tg-user',tg)});
 const owned=await s.store.state(id('userlink',userId));
 assertAccountOwner({telegramId:tg,userId,telegramLink:currentLink,userLink:owned,botMember});
 let user;try{user=await s.users.get({userId})}catch(e){if(Number(e.code)!==404)throw e}
 if(!user){
  if(currentLink||owned||botMember?.appwrite_user_id)throw Error('Akun tertaut tidak ditemukan. Hubungi admin.');
  try{user=await s.users.create({userId,name:String(data.first_name||'Member BADAI PROMPT').slice(0,128)})}
  catch(e){if(Number(e.code)!==409)throw e;throw Error('Identitas Appwrite sudah terdaftar; perlu pemeriksaan admin.')}
 }
 if(!currentLink){
  const ok=await s.store.claim(id('tglink',tg),{kind:'tglink',telegram_id:tg,user_id:userId,status:'linked',payload:JSON.stringify({user_id:userId})});
  if(!ok)throw Error('Identitas sedang terhubung oleh sesi lain.');
 }
 if(!owned){
  const ok=await s.store.claim(id('userlink',userId),{kind:'userlink',telegram_id:tg,user_id:userId,status:'linked',payload:JSON.stringify({telegram_id:tg})});
  if(!ok)throw Error('Akun terhubung ke Telegram lain.');
 }
 const memberships=await s.teams.listMemberships({teamId:'paid-members',queries:[Query.equal('userId',userId),Query.limit(10)]});
 if(!memberships.memberships?.some(m=>m.confirm===true)){
  if(memberships.memberships?.length)throw Error('Keanggotaan belum terkonfirmasi, butuh admin.');
  try{await s.teams.createMembership({teamId:'paid-members',roles:['member'],userId})}catch(e){if(Number(e.code)!==409)throw e}
  const verified=await s.teams.listMemberships({teamId:'paid-members',queries:[Query.equal('userId',userId),Query.limit(10)]});
  if(!verified.memberships?.some(m=>m.confirm===true))throw Error('Keanggotaan masih pending.');
 }
 const profile=await s.store.get('member_profiles',userId);
 // The plan is an atomic, immutable per-order entitlement target. Retried
 // webhook and concurrent website polling can only use this one value.
 const until=await freezeOrderEntitlement({
  store:s.store,key:id('website-activation-plan',row.$id),orderId:row.$id,
  userId,telegramId:tg,
  proposed:calculatePaidAccessUntil({paidAt:data.paid_at,profile})
 });
 const fields={status:'active',access_until:until,role:'member'};
 if(profile)await s.store.update('member_profiles',userId,fields);
 else await s.tables.createRow({databaseId:process.env.APP_DB_ID||DB,tableId:'member_profiles',rowId:userId,data:{...fields,user_id:userId,name:String(user.name||data.first_name||'Member BADAI PROMPT').slice(0,128),email:null,whatsapp:null},permissions:[Permission.read(Role.user(userId))]});
 // Membership grant + profile above are authoritative. Only now finalize this paid order.
 await s.store.update('telegram_state',row.$id,{status:'activated',user_id:userId,payload:JSON.stringify({...data,user_id:userId,access_until:until,activated_at:new Date().toISOString()})});
 if(botMember&&!botMember.appwrite_user_id)await s.store.update('telegram_members',botMember.$id,{appwrite_user_id:userId});
 if(sendNotice){
  try{await send({userId,orderId:row.$id})}catch{}
 }
 return s.store.state(row.$id);
}
