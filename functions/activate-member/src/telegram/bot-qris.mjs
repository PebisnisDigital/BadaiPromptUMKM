import {createHmac,timingSafeEqual} from 'node:crypto';
import {Query,Permission,Role} from 'node-appwrite';
import {id,numeric,fail} from './security.mjs';
import {calculatePaidAccessUntil} from './website-checkout-guards.mjs';

export const BOT_QRIS_PRICE=199000;
export function verifyMiniAppInitData(value,botToken,{now=Date.now(),maxAge=3600000}={}){
 if(typeof value!=='string'||value.length>8192)throw fail('Data Telegram tidak valid.',401);
 const query=new URLSearchParams(value),hash=query.get('hash');
 if(!hash||!/^[a-f0-9]{64}$/i.test(hash))throw fail('Verifikasi Telegram gagal.',401);
 const date=Number(query.get('auth_date'));
 if(!Number.isSafeInteger(date)||date*1000>now+60000||date*1000<now-maxAge)throw fail('Sesi Telegram sudah kedaluwarsa.',401);
 const check=[...query.entries()].filter(([k])=>k!=='hash'&&k!=='signature')
   .sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>k+'='+v).join('\n');
 const secret=createHmac('sha256','WebAppData').update(botToken).digest();
 const expected=createHmac('sha256',secret).update(check).digest();
 const given=Buffer.from(hash,'hex');
 if(given.length!==expected.length||!timingSafeEqual(given,expected))throw fail('Data Telegram tidak sah.',401);
 let person;
 try{person=JSON.parse(query.get('user')||'{}')}catch{throw fail('Identitas Telegram tidak valid.',401)}
 if(person.is_bot||!person.id)throw fail('Telegram user wajib.',401);
 return {telegram_id:numeric(person.id),first_name:String(person.first_name||'').slice(0,128)};
}
export function assertBotOrder(order,{sandboxOnly=true}={}){
 const d=order?.data;
 if(order?.kind!=='bot_qris_order'||!['paid','activated'].includes(order.status)||
  !d?.telegram_id||!d?.transaction_id||!d?.paid_at||Number(d?.amount)!==BOT_QRIS_PRICE||
  (sandboxOnly&&d.is_test!==true))throw fail('Pembayaran QRIS belum terverifikasi.',403);
 return d;
}
export async function grantBotQrisPremium(s,order,{sandboxOnly=true}={}){
 const d=assertBotOrder(order,{sandboxOnly});
 const telegramId=numeric(d.telegram_id),member=await s.store.get('telegram_members',id('member',telegramId));
 if(!member||!member.is_active)throw fail('Member Telegram tidak ditemukan.',409);
 const userId=member.appwrite_user_id||id('bot-qris-user',telegramId);
 const userlink=await s.store.state(id('userlink',userId));
 const tglink=await s.store.state(id('tglink',telegramId));
 if((userlink&&userlink.data?.telegram_id!==telegramId)||
    (tglink&&tglink.data?.user_id!==userId))throw fail('Akun Telegram sudah terhubung ke identitas lain.',409);
 if(order.status==='activated'){
  if(d.user_id!==userId)throw fail('Aktivasi order tidak konsisten.',409);
  return {user_id:userId,order_id:order.$id,access_until:d.access_until,duplicate:true};
 }
 const existing=await s.store.get('member_profiles',userId);
 const planId=id('bot-qris-plan',order.$id);
 await s.store.claim(planId,{kind:'activation_plan',status:'fixed',user_id:userId,telegram_id:telegramId,
  payload:JSON.stringify({order_id:order.$id,user_id:userId,access_until:calculatePaidAccessUntil({paidAt:d.paid_at,profile:existing})})});
 const plan=await s.store.state(planId);
 if(!plan||plan.data?.order_id!==order.$id||plan.data?.user_id!==userId)throw fail('Rencana Premium tidak konsisten.',409);
 const until=plan.data.access_until;
 let user;try{user=await s.users.get({userId})}catch(e){if(Number(e.code)!==404)throw e}
 if(!user){
  try{await s.users.create({userId,name:String(member.first_name||'Member BADAI').slice(0,128)})}
  catch(e){if(Number(e.code)!==409)throw e}
 }
 const memberships=await s.teams.listMemberships({teamId:'paid-members',queries:[Query.equal('userId',userId),Query.limit(10)]});
 if(!memberships.memberships?.some(m=>m.confirm===true)){
  if(memberships.memberships?.length)throw fail('Keanggotaan masih menunggu konfirmasi.',409);
  try{await s.teams.createMembership({teamId:'paid-members',roles:['member'],userId})}
  catch(e){if(Number(e.code)!==409)throw e}
  const verified=await s.teams.listMemberships({teamId:'paid-members',queries:[Query.equal('userId',userId),Query.limit(10)]});
  if(!verified.memberships?.some(m=>m.confirm===true))throw fail('Keanggotaan belum aktif.',409);
 }
 const profile=await s.store.get('member_profiles',userId);
 if(profile)await s.store.update('member_profiles',userId,{status:'active',role:'member',access_until:until});
 else try{
  await s.tables.createRow({databaseId:s.store.databaseId,tableId:'member_profiles',rowId:userId,
   data:{user_id:userId,name:String(member.first_name||'Member BADAI').slice(0,128),status:'active',role:'member',access_until:until},
   permissions:[Permission.read(Role.user(userId))]});
 }catch(e){if(Number(e.code)!==409)throw e}
 if(!userlink){
  const claimed=await s.store.claim(id('userlink',userId),{kind:'userlink',status:'linked',user_id:userId,telegram_id:telegramId,payload:JSON.stringify({telegram_id:telegramId})});
  if(!claimed&&(await s.store.state(id('userlink',userId)))?.data.telegram_id!==telegramId)throw fail('Konflik tautan akun.',409);
 }
 if(!tglink){
  const claimed=await s.store.claim(id('tglink',telegramId),{kind:'tglink',status:'linked',user_id:userId,telegram_id:telegramId,payload:JSON.stringify({user_id:userId})});
  if(!claimed&&(await s.store.state(id('tglink',telegramId)))?.data.user_id!==userId)throw fail('Konflik tautan Telegram.',409);
 }
 const updated=await s.store.update('telegram_members',member.$id,{appwrite_user_id:userId});
 await s.telegramService.sync(updated);
 await s.store.update('telegram_state',order.$id,{status:'activated',user_id:userId,
  payload:JSON.stringify({...d,user_id:userId,access_until:until,activated_at:new Date().toISOString()})});
 return {order_id:order.$id,user_id:userId,access_until:until,duplicate:false};
}
