// Admin-only Telegram sales ledger: read verified orders and reset owned SANDBOX bot tester.
import {id,numeric,fail} from './security.mjs';
import {nextAt} from './policy.mjs';

const ST='telegram_state';
const pickOrder=(row,member,binding)=>{
 const d=row.data||{},telegramId=String(d.telegram_id||binding?.data?.telegram_id||'');
 const userId=String(d.user_id||row.user_id||'');
 return {
  id:row.$id,channel:row.kind==='bot_qris_order'?'bot':'website',status:row.status,
  is_test:d.is_test===true,telegram_id:telegramId||null,
  telegram_name:member?.first_name||d.first_name||null,telegram_username:member?.username||null,
  display_name:member?.first_name||d.first_name||d.full_name||null,
  whatsapp:d.whatsapp||null,amount:Number(d.total_amount??d.amount)||0,
  invoice_id:d.transaction_id||null,created_at:d.created_at||row.$createdAt||null,
  paid_at:d.paid_at||null,activated_at:d.activated_at||null,
  linked:Boolean(telegramId&&member?.appwrite_user_id&&member.appwrite_user_id===userId),
  user_id:userId||null,plan:member?.plan||'unlinked',
  access_until:member?.premium_until||d.access_until||null
 };
};
export async function listTelegramSales(service,{cursor='',channel='all',limit=25}={}){
 const take=Math.max(1,Math.min(50,Number(limit)||25));
 if(!['all','bot','website'].includes(channel))throw fail('Filter kanal tidak valid.',400);
 if(cursor&&!/^tg_[a-f0-9]{32}$/.test(String(cursor)))throw fail('Cursor tidak valid.',400);
 const kinds=channel==='all'?['bot_qris_order','website_order']:[channel==='bot'?'bot_qris_order':'website_order'];
 const orders=await service.store.list(ST,[['equal','kind',kinds]],take,cursor||undefined);
 const entries=await Promise.all(orders.rows.map(async row=>{
  const d=JSON.parse(row.payload||'{}');
  const binding=row.kind==='website_order'?await service.store.state(id('purchase-binding',row.$id)):null;
  const tg=String(d.telegram_id||binding?.data?.telegram_id||'');
  const member=tg?await service.store.get('telegram_members',id('member',tg)):null;
  return pickOrder({...row,data:d},member,binding);
 }));
 entries.sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')));
 return {ok:true,orders:entries,total:orders.total,limit:take,next_cursor:orders.rows.length===take?orders.rows.at(-1).$id:null,channel};
}
export async function listTelegramBuyers(service,{cursor='',limit=25}={}){
 const take=Math.max(1,Math.min(50,Number(limit)||25));
 if(cursor&&!/^tg_[a-f0-9]{32}$/.test(String(cursor)))throw fail('Cursor tidak valid.',400);
 const list=await service.store.list('telegram_members',[],take,cursor||undefined);
 const bot=await service.main();
 const items=await Promise.all(list.rows.map(async m=>{
  const tester=bot?await service.store.state(id('tester',bot.$id,m.telegram_id)):null;
  const order=bot?await service.qris.activeOrder(bot,m.telegram_id):null;
  return {telegram_id:m.telegram_id,first_name:m.first_name||'',username:m.username||'',plan:m.plan,
   is_active:m.is_active,premium_until:m.premium_until||null,
   next_send_at:m.next_send_at||null,appwrite_linked:Boolean(m.appwrite_user_id),
   tester_authorized:Boolean(tester?.status==='authorized'),
   sandbox_order_id:order?.kind==='bot_qris_order'&&order.data?.is_test===true?order.$id:null,
   can_reset:Boolean(tester?.status==='authorized'&&order?.kind==='bot_qris_order'&&
     order?.status==='activated'&&order?.data?.is_test===true&&
     m.appwrite_user_id===id('bot-qris-user',m.telegram_id))};
 }));
 return {ok:true,members:items,total:list.total,limit:take,next_cursor:list.rows.length===take?list.rows.at(-1).$id:null};
}
export async function resetSandboxBuyer(service,{order_id,confirmation}={},actorId){
 if(confirmation!=='RESET SANDBOX')throw fail('Ketik RESET SANDBOX untuk mengonfirmasi.',400);
 if(!/^tg_[a-f0-9]{32}$/.test(String(order_id||'')))throw fail('Order tidak valid.',400);
 const order=await service.store.state(order_id),d=order?.data;
 if(order?.kind!=='bot_qris_order'||order.status!=='activated'||d?.is_test!==true||
   d.checkout_type!=='telegram_direct'||!d.telegram_id||!d.user_id)throw fail('Hanya pembelian bot sandbox yang bisa direset.',403);
 const bot=await service.main();
 if(!bot||d.bot_id!==bot.$id)throw fail('Reset hanya boleh pada bot utama yang sama.',403);
 const tg=numeric(d.telegram_id),member=await service.store.get('telegram_members',id('member',tg));
 const tester=await service.store.state(id('tester',bot.$id,tg));
 if(tester?.status!=='authorized')throw fail('Akun wajib diotorisasi sebagai tester terlebih dahulu.',403);
 const expectedUser=id('bot-qris-user',tg);
 if(d.user_id!==expectedUser||member?.appwrite_user_id!==expectedUser||
   member.plan!=='premium')throw fail('Akun bukan pemilik Premium sandbox mandiri. Reset ditolak.',409);
 const active=await service.qris.activeOrder(bot,tg);
 if(active?.$id!==order.$id)throw fail('Order yang dipilih bukan invoice aktif pengguna.',409);
 const profile=await service.store.get('member_profiles',expectedUser);
 if(!profile||profile.status!=='active'||profile.access_until==null)throw fail('Akses Premium tidak dapat direset secara aman.',409);
 // Keep transaction records immutable. Deactivate test entitlement only.
 const memberships=await service.qris.teams.listMemberships({teamId:'paid-members',
   queries:[service.store.Query.equal('userId',expectedUser),service.store.Query.limit(10)]});
 for(const m of (memberships.memberships||[])){
  await service.qris.teams.deleteMembership({teamId:'paid-members',membershipId:m.$id});
 }
 await service.store.update('member_profiles',expectedUser,{status:'blocked'});
 await service.store.update('telegram_members',member.$id,{
  plan:'free',premium_until:null,premium_started_at:null,
  next_send_at:nextAt(service.now(),3,(await service.config()).premium_time)
 });
 await service.store.remove(ST,id('bot-qris-current',bot.$id,tg));
 // Never delete or change the original successful invoice.
 await service.audit(actorId,'reset_bot_qris_sandbox',{order_id:order.$id,bot_id:bot.$id,telegram_id:tg});
 return {ok:true,telegram_id:tg,plan:'free',old_invoice_preserved:true};
}
