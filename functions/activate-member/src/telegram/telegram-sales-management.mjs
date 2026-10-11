// Admin-owned Telegram account maintenance. Payment evidence stays in archived
// ledger rows after deletion; never rewrite a successful settlement as unpaid.
import {Query,Permission,Role} from 'node-appwrite';
import {id,numeric,fail} from './security.mjs';
import {nextAt,DAY} from './policy.mjs';

const stateTable='telegram_state';
const botUserId=tg=>id('bot-qris-user',tg),adminUserId=tg=>id('telegram-admin-user',tg);
const dataDate=date=>{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(String(date||'')))throw fail('Isi tanggal akhir Premium.',400);
 const value=new Date(date+'T16:59:59.999Z');
 if(!Number.isFinite(value.getTime())||value.toISOString().slice(0,10)!==date&&value.toISOString().slice(0,10)!==new Date(date+'T00:00:00Z').toISOString().slice(0,10))throw fail('Tanggal tidak valid.',400);
 if(value.getTime()<Date.now()-DAY||value.getTime()>Date.now()+10*365*DAY)throw fail('Tanggal di luar rentang yang diizinkan.',400);
 return value.toISOString();
};
async function teamMemberships(s,userId){
 const data=await s.qris.teams.listMemberships({teamId:'paid-members',queries:[Query.equal('userId',userId),Query.limit(25)]});
 return data.memberships||[];
}
async function ensurePremium(s,member,accessUntil){
 const tg=numeric(member.telegram_id);
 let userId=member.appwrite_user_id||adminUserId(tg);
 const allowed=[botUserId(tg),adminUserId(tg)];
 if(!allowed.includes(userId))throw fail('Akun terhubung checkout website. Ubah akses dari order website di menu Penjualan.',409);
 if(!s.qris.users||!s.qris.tables||!s.qris.teams)throw fail('Layanan member belum lengkap.',503);
 let user;try{user=await s.qris.users.get({userId})}catch(e){if(Number(e.code)!==404)throw e}
 if(!user)try{await s.qris.users.create({userId,name:member.first_name||'Member BADAI'})}catch(e){if(Number(e.code)!==409)throw e}
 const profile=await s.store.get('member_profiles',userId);
 const fields={status:'active',role:'member',access_until:accessUntil};
 if(profile)await s.store.update('member_profiles',userId,fields);
 else try{await s.qris.tables.createRow({databaseId:s.store.databaseId,tableId:'member_profiles',rowId:userId,
   data:{user_id:userId,name:member.first_name||'Member BADAI',...fields},
   permissions:[Permission.read(Role.user(userId))]})}catch(e){if(Number(e.code)!==409)throw e}
 const list=await teamMemberships(s,userId);
 if(!list.some(v=>v.confirm===true)){
  if(list.length)throw fail('Keanggotaan akun belum terkonfirmasi.',409);
  await s.qris.teams.createMembership({teamId:'paid-members',roles:['member'],userId});
  const confirmed=await teamMemberships(s,userId);
  if(!confirmed.some(v=>v.confirm===true))throw fail('Pembuatan akses belum terkonfirmasi.',409);
 }
 return userId;
}
export async function updateTelegramBuyer(s,body={},actorId){
 const tg=numeric(body.telegram_id),member=await s.store.get('telegram_members',id('member',tg));
 if(!member)throw fail('Member Telegram tidak ditemukan.',404);
 const name=String(body.first_name||'').trim().slice(0,128),
  plan=String(body.plan||''),active=body.is_active===true;
 if(!name||!['free','premium'].includes(plan)||typeof body.is_active!=='boolean')
  throw fail('Nama, paket, atau status tidak valid.',400);
 const uid=member.appwrite_user_id;
 const external=uid&&![botUserId(tg),adminUserId(tg)].includes(uid);
 if(external&&(plan!==member.plan||String(body.access_until||'')!==String(member.premium_until||'').slice(0,10)))
  throw fail('Member terhubung pembelian website. Ubah status/masa akses dari order website di Penjualan.',409);
 let until=null,userId=uid;
 if(plan==='premium'){
  until=dataDate(body.access_until);
  if(!external)userId=await ensurePremium(s,{...member,first_name:name},until);
 }else if(uid&&!external){
  for(const membership of await teamMemberships(s,uid))await s.qris.teams.deleteMembership({teamId:'paid-members',membershipId:membership.$id});
  const p=await s.store.get('member_profiles',uid);
  if(p)await s.store.update('member_profiles',uid,{status:'blocked'});
 }
 const next=plan==='premium'&&member.plan!=='premium'
   ?new Date(s.now()).toISOString()
   :member.plan==='premium'&&plan==='free'
    ?nextAt(s.now(),(await s.config()).free_days,(await s.config()).premium_time)
    :member.next_send_at;
 await s.store.update('telegram_members',member.$id,{first_name:name,is_active:active,plan,
  appwrite_user_id:userId||null,premium_until:until,
  ...(plan==='free'?{premium_started_at:null}:{}),next_send_at:next});
 await s.audit(actorId,'telegram_member_edit',{telegram_id:tg,plan,status:active?'active':'disabled'});
 return {ok:true,telegram_id:tg,plan,first_name:name,is_active:active,premium_until:until};
}
async function removePage(s,tableId,filter,{preserve}={}){
 let removed=0;
 for(let pass=0;pass<200;pass++){
  const {rows}=await s.store.list(tableId,filter,50);
  if(!rows.length)return removed;
  for(const row of rows){
   if(preserve)await preserve(row);else await s.store.remove(tableId,row.$id);
   removed++;
  }
 }
 throw fail('Pembersihan terlalu besar; ulangi atau hubungi admin.',503);
}
export async function deleteTelegramBuyer(s,body={},actorId){
 const tg=numeric(body.telegram_id);
 if(String(body.confirmation||'')!=='HAPUS MEMBER '+tg)throw fail('Konfirmasi hapus member tidak cocok.',400);
 const member=await s.store.get('telegram_members',id('member',tg));
 if(!member)return {ok:true,already_removed:true};
 const uid=member.appwrite_user_id||'',allowed=[botUserId(tg),adminUserId(tg)];
 if(uid&&!allowed.includes(uid))throw fail('Member ini terkait checkout website. Hapus lewat order website pada halaman Penjualan.',409);
 // Remove entitlement before detaching Telegram identity. Fail closed if any
 // Appwrite operation fails, so an incomplete deletion can be safely retried.
 if(uid){
  for(const m of await teamMemberships(s,uid))await s.qris.teams.deleteMembership({teamId:'paid-members',membershipId:m.$id});
  await s.store.remove('member_profiles',uid);
  try{await s.qris.users.delete({userId:uid})}catch(e){if(Number(e.code)!==404)throw e}
  await s.store.remove(stateTable,id('userlink',uid));
 }
 await s.store.remove(stateTable,id('tglink',tg));
 const bot=await s.main();
 if(bot){
  await s.store.remove(stateTable,id('bot-qris-current',bot.$id,tg));
  await s.store.remove(stateTable,id('tester',bot.$id,tg));
  await s.store.remove(stateTable,id('consent',bot.$id,tg));
 }
 await s.store.remove(stateTable,id('cursor',tg));
 const deliveries=await removePage(s,'telegram_deliveries',[['equal','telegram_id',tg]]);
 let archived=0;
 await removePage(s,stateTable,[['equal','telegram_id',tg]],{
  preserve:async row=>{
   if(row.kind==='bot_qris_order'){
    // Keep payment proof but strip account identity. Archival removes the order
    // from active sales and the scheduler's pending-order query.
    const d=JSON.parse(row.payload||'{}');
    const record={checkout_type:d.checkout_type,is_test:d.is_test,transaction_id:d.transaction_id,
      amount:d.amount,total_amount:d.total_amount,paid_at:d.paid_at||null,created_at:d.created_at,
      archived_at:new Date(s.now()).toISOString(),prior_status:row.status};
    await s.store.update(stateTable,row.$id,{kind:'archived_bot_qris_order',telegram_id:null,
      user_id:null,status:row.status,payload:JSON.stringify(record)});
    archived++;
   }else{
    await s.store.remove(stateTable,row.$id);
   }
  }});
 await s.store.remove('telegram_members',member.$id);
 await s.audit(actorId,'telegram_member_deleted',{telegram_member_id:member.$id,orders_archived:archived});
 return {ok:true,deleted:true,orders_archived:archived,deliveries_removed:deliveries,
  notice:'Akun Telegram dihapus. Pembeli dapat /start lalu /beli lagi; transaksi lunas lama disimpan tanpa identitas pembeli.'};
}
