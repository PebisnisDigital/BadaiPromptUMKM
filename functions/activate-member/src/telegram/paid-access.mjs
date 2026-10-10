import {fail,id} from './security.mjs';
// Dedicated server key: users.read, teams.read/write, rows.read/write, tables.read.
// It is never sent to the browser and never creates Appwrite accounts.
export function paidAccessWriter({tables,teams,users,Query,Permission,Role,databaseId='badai_prompt_umkm'}){
 return async function grant(userId,until,verifiedTelegramId=null){
  const user=await users.get({userId});
  const telegramOnly=Boolean(verifiedTelegramId)&&userId===id('tg-user',String(verifiedTelegramId));
  if(!user.email&&!telegramOnly)throw fail('Akun harus memiliki email atau bukti identitas Telegram terverifikasi.',403);
  const memberships=await teams.listMemberships({teamId:'paid-members',queries:[Query.equal('userId',userId),Query.limit(10)]});
  if(!memberships.memberships?.some(m=>m.confirm===true)){
   if(memberships.memberships?.length)throw fail('Keanggotaan perlu diperiksa admin.',409);
   try{await teams.createMembership({teamId:'paid-members',roles:['member'],userId})}catch(e){if(Number(e.code)!==409)throw e}
   const check=await teams.listMemberships({teamId:'paid-members',queries:[Query.equal('userId',userId),Query.limit(10)]});if(!check.memberships?.some(m=>m.confirm===true))throw fail('Sinkronisasi keanggotaan belum selesai.',503);
  }
  const tx=await tables.createTransaction({ttl:60}),base={databaseId,tableId:'member_profiles',rowId:userId,transactionId:tx.$id};
  try{
   let raw;try{raw=await tables.getRow(base)}catch(e){if(Number(e.code)!==404)throw e}
   const old=raw?{...raw,...raw.data}:null,lifetime=old?.status==='active'&&!old.access_until;
   const accessUntil=lifetime||until===null?null:new Date(Math.max(Date.parse(until),Date.parse(old?.access_until)||0)).toISOString();
   const data={status:'active',access_until:accessUntil};
   if(old)await tables.updateRow({...base,data});else await tables.createRow({...base,data:{...data,user_id:userId,email:user.email||null,name:user.name||'Member BADAI PROMPT',whatsapp:'',role:'member'},permissions:[Permission.read(Role.user(userId))]});
   await tables.updateTransaction({transactionId:tx.$id,commit:true});
  }catch(e){try{await tables.updateTransaction({transactionId:tx.$id,rollback:true})}catch{}throw e}
 };
}
