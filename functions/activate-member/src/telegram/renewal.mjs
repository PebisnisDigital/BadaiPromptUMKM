import {renewalUntil} from './policy.mjs';
// Profile term and order's issued flag commit together. Retried webhook events
// cannot add another year, and concurrent renewals conflict rather than overwrite.
export async function commitPaidAccess({tables,databaseId,profileTable,ordersTable,orderId,user,Permission,Role}){
 for(let attempt=0;attempt<3;attempt++){
  const tx=await tables.createTransaction({ttl:60}),transactionId=tx.$id;
  try{
   const raw=await tables.getRow({databaseId,tableId:ordersTable,rowId:orderId,transactionId}),order={...raw,...(raw.data||{})};
   if(order.status!=='success'||order.access_issued){await tables.updateTransaction({transactionId,rollback:true});return {duplicate:true}}
   let previous=null;try{const rawProfile=await tables.getRow({databaseId,tableId:profileTable,rowId:user.$id,transactionId});previous={...rawProfile,...(rawProfile.data||{})}}catch(e){if(Number(e.code)!==404)throw e}
   const accessUntil=previous?.status==='active'&&!previous.access_until?null:renewalUntil(previous?.access_until,order.paid_at||order.$updatedAt);
   const profile={user_id:user.$id,name:String(order.full_name||user.name||''),email:user.email,whatsapp:String(order.whatsapp||''),status:'active',role:'member',access_until:accessUntil,must_change_password:previous?Boolean(previous.must_change_password):true};
   if(previous)await tables.updateRow({databaseId,tableId:profileTable,rowId:user.$id,data:profile,transactionId});
   else await tables.createRow({databaseId,tableId:profileTable,rowId:user.$id,data:profile,permissions:[Permission.read(Role.user(user.$id))],transactionId});
   await tables.updateRow({databaseId,tableId:ordersTable,rowId:orderId,data:{user_id:user.$id,access_issued:true},transactionId});
   await tables.updateTransaction({transactionId,commit:true});return {ok:true,access_until:accessUntil};
  }catch(e){try{await tables.updateTransaction({transactionId,rollback:true})}catch{}if(Number(e.code)===409&&attempt<2)continue;throw e}
 }
}
