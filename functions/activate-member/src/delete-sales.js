// This handler is also checked behind the Function's team:admin-users permission.
const value=v=>String(v??'').trim();
const isMissing=e=>Number(e?.code)===404;
const failure=(message,status)=>Object.assign(new Error(message),{status});
async function optional(read){try{return await read()}catch(e){if(isMissing(e))return null;throw e}}
const rowData=row=>({...((row&&row.data)||row||{}),$id:row?.$id||row?.data?.$id});

export async function deleteSalesData({body,actorId,tables,users,teams,Query,databaseId,ordersTable,profilesTable,paidTeam,adminTeam='admin-users'}){
  const orderId=value(body.order_id),userId=value(body.user_id);
  if(!orderId&&!userId)throw failure('Pilih order atau member yang akan dihapus.',400);
  if(!actorId)throw failure('Sesi admin tidak terbaca. Silakan login ulang.',401);
  const membershipsFor=(teamId,id)=>teams.listMemberships({teamId,queries:[Query.equal('userId',id),Query.limit(100)]});
  const admins=await membershipsFor(adminTeam,actorId);
  if(!(admins.memberships||[]).length)throw failure('Hanya admin yang dapat menghapus data.',403);
  if(userId===actorId)throw failure('Akun admin yang sedang digunakan tidak dapat dihapus.',403);

  const counts={orders:0,favorites:0,history:0,usage_events:0,memberships:0,profiles:0,users:0};
  async function removeRow(tableId,id,key){
    const removed=await optional(()=>tables.deleteRow({databaseId,tableId,rowId:id}));
    // SDK delete endpoints may return an empty string on success, but never null.
    if(removed!==null)counts[key]++;
  }
  if(!userId){
    await removeRow(ordersTable,orderId,'orders');
    return {ok:true,deleted:'order',counts};
  }
  const targetAdmins=await membershipsFor(adminTeam,userId);
  if((targetAdmins.memberships||[]).length)throw failure('Akun admin tidak boleh dihapus melalui menu member.',403);

  // Resolve ownership before deleting anything, including orders created before
  // the login account was attached to checkout.
  const user=await optional(()=>users.get({userId}));
  const profile=await optional(()=>tables.getRow({databaseId,tableId:profilesTable,rowId:userId}));
  const emails=new Set([user?.email,rowData(profile).email].map(value).filter(Boolean).flatMap(email=>[email,email.toLowerCase()]));
  let selected=null;
  if(orderId){
    selected=await optional(()=>tables.getRow({databaseId,tableId:ordersTable,rowId:orderId}));
    if(selected){
      selected=rowData(selected);
      const belongs=value(selected.user_id)===userId||(!value(selected.user_id)&&[...emails].some(e=>e.toLowerCase()===value(selected.email).toLowerCase()));
      if(!belongs)throw failure('Order yang dipilih tidak terhubung ke member ini.',400);
    }
  }
  async function listRows(tableId,queries,allowMissing=false){
    const rows=[];
    for(let offset=0;;offset+=100){
      let result;
      try{result=await tables.listRows({databaseId,tableId,queries:[...queries,Query.limit(100),Query.offset(offset)]})}
      catch(e){if(allowMissing&&isMissing(e))return [];throw e}
      const part=(result.rows||result.documents||[]).map(rowData);rows.push(...part);
      if(part.length<100)return rows;
    }
  }
  const linked=new Map((await listRows(ordersTable,[Query.equal('user_id',userId)])).map(row=>[row.$id,row]));
  if(emails.size){
    const byEmail=await listRows(ordersTable,[Query.equal('email',[...emails])]);
    byEmail.filter(row=>!value(row.user_id)||value(row.user_id)===userId).forEach(row=>linked.set(row.$id,row));
  }
  if(selected)linked.set(selected.$id,selected);
  const dependentTables=[['favorites','favorites'],['prompt_history','history'],['prompt_usage_events','usage_events']];
  // Preflight all reads before the first write; no full-database scan or row cap.
  const dependents=[];
  for(const [tableId,key] of dependentTables)dependents.push({tableId,key,rows:await listRows(tableId,[Query.equal('user_id',userId)],true)});
  const paidMemberships=await membershipsFor(paidTeam,userId);
  for(const {tableId,key,rows} of dependents)for(const row of rows)await removeRow(tableId,row.$id,key);
  for(const row of linked.values())await removeRow(ordersTable,row.$id,'orders');
  for(const membership of paidMemberships.memberships||[]){
    const result=await optional(()=>teams.deleteMembership({teamId:paidTeam,membershipId:membership.$id}));
    if(result!==null)counts.memberships++;
  }
  await removeRow(profilesTable,userId,'profiles');
  const removed=await optional(()=>users.delete({userId}));if(removed!==null)counts.users++;
  return {ok:true,deleted:'member_and_orders',counts};
}
