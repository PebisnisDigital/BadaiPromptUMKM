import {Query,Permission,Role} from 'node-appwrite';
import {id} from './security.mjs';
import {calculatePaidAccessUntil} from './website-checkout-guards.mjs';

const DB='badai_prompt_umkm',PRICE=199000;
const isGuest=order=>order?.kind==='website_order'&&order.data?.checkout_type==='guest';
export function assertGuestSettlement(order){
 if(!isGuest(order)||!['paid','activated'].includes(order.status)||!order.data?.paid_at||
    !order.data?.transaction_id||Number(order.data?.amount)!==PRICE||
    !order.data?.guest_session_id||!order.data?.first_name||!order.data?.whatsapp||order.data?.is_test!==true)
   throw Error('Transaksi tamu belum lunas atau tidak lengkap.');
 return order.data;
}
export async function grantGuestWebsitePremium(s,order){
 const data=assertGuestSettlement(order);
 const userId=id('guest-user',order.$id);
 if(order.status==='activated'){
  if(order.data.user_id!==userId)throw Error('Identitas order tidak konsisten.');
  return order;
 }
 let user;
 try{user=await s.users.get({userId});}
 catch(e){if(Number(e.code)!==404)throw e;}
 if(!user){
  try{user=await s.users.create({userId,name:String(data.first_name).slice(0,128)});}
  catch(e){if(Number(e.code)!==409)throw e;user=await s.users.get({userId});}
 }
 const list=await s.teams.listMemberships({teamId:'paid-members',queries:[Query.equal('userId',userId),Query.limit(10)]});
 if(!list.memberships?.some(m=>m.confirm===true)){
  if(list.memberships?.length)throw Error('Keanggotaan Appwrite belum terkonfirmasi.');
  try{await s.teams.createMembership({teamId:'paid-members',roles:['member'],userId});}
  catch(e){if(Number(e.code)!==409)throw e;}
  const check=await s.teams.listMemberships({teamId:'paid-members',queries:[Query.equal('userId',userId),Query.limit(10)]});
  if(!check.memberships?.some(m=>m.confirm===true))throw Error('Keanggotaan Appwrite belum aktif.');
 }
 const profile=await s.store.get('member_profiles',userId);
 const planId=id('guest-access-plan',order.$id);
 await s.store.claim(planId,{kind:'activation_plan',user_id:userId,status:'fixed',
  payload:JSON.stringify({order_id:order.$id,user_id:userId,access_until:calculatePaidAccessUntil({paidAt:data.paid_at,profile:null})})});
 const plan=await s.store.state(planId);
 if(!plan||plan.data.order_id!==order.$id||plan.data.user_id!==userId)throw Error('Rencana akses tidak konsisten.');
 const accessUntil=plan.data.access_until;
 const fields={status:'active',role:'member',access_until:accessUntil};
 if(profile)await s.store.update('member_profiles',userId,fields);
 else try{
  await s.tables.createRow({databaseId:process.env.APP_DB_ID||DB,tableId:'member_profiles',rowId:userId,
   data:{...fields,user_id:userId,name:String(data.first_name).slice(0,128),email:null,whatsapp:data.whatsapp},
   permissions:[Permission.read(Role.user(userId))]});
 }catch(e){if(Number(e.code)!==409)throw e;}
 await s.store.update('telegram_state',order.$id,{status:'activated',user_id:userId,
   payload:JSON.stringify({...data,user_id:userId,access_until:accessUntil,activated_at:new Date().toISOString()})});
 return s.store.state(order.$id);
}
