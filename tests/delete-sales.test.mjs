import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {deleteSalesData} from '../functions/activate-member/src/delete-sales.js';
const Query={equal:(key,values)=>({key,values}),limit:value=>({limit:value}),offset:value=>({offset:value})};
const missing=()=>Object.assign(new Error('Not found'),{code:404});
function fixture(){
 const data={orders:[{$id:'order-a',user_id:'member',email:'member@example.test'},{$id:'order-b',user_id:'member',email:'old@example.test'},{$id:'orphan',email:'member@example.test'},{$id:'foreign',user_id:'other',email:'member@example.test'}],favorites:[{$id:'fav',user_id:'member'},{$id:'foreign-fav',user_id:'other'}],prompt_history:[{$id:'history',user_id:'member'}],prompt_usage_events:[{$id:'event',user_id:'member'}],member_profiles:[{$id:'member',email:'member@example.test'}]};
 const writes=[],accounts=new Map([['member',{email:'member@example.test'}]]);let fail=null;
 const tables={
  async getRow({tableId,rowId}){const row=data[tableId]?.find(row=>row.$id===rowId);if(!row)throw missing();return row},
  async listRows({tableId,queries=[]}){if(!data[tableId])throw missing();let rows=[...data[tableId]],offset=0,limit=100;for(const q of queries){if(q.key)rows=rows.filter(row=>(Array.isArray(q.values)?q.values:[q.values]).includes(row[q.key]));if(q.limit)limit=q.limit;if(q.offset)offset=q.offset}return {rows:rows.slice(offset,offset+limit)}},
  async deleteRow({tableId,rowId}){if(fail===tableId)throw new Error('Storage unavailable');const i=data[tableId]?.findIndex(row=>row.$id===rowId)??-1;if(i<0)throw missing();data[tableId].splice(i,1);writes.push([tableId,rowId]);return ''}
 };
 const users={async get({userId}){if(!accounts.has(userId))throw missing();return accounts.get(userId)},async delete({userId}){if(!accounts.has(userId))throw missing();accounts.delete(userId);writes.push(['users',userId]);return ''}};
 const teams={async listMemberships({teamId,queries}){const id=queries.find(q=>q.key==='userId').values;return {memberships:teamId==='admin-users'?(['admin','other-admin'].includes(id)?[{$id:'admin-link'}]:[]):(id==='member'?[{$id:'paid-link'}]:[])}},async deleteMembership({membershipId}){writes.push(['memberships',membershipId]);return ''}};
 const input={body:{},actorId:'admin',tables,users,teams,Query,databaseId:'db',ordersTable:'orders',profilesTable:'member_profiles',paidTeam:'paid-members'};
 return {data,writes,accounts,input,setFailure:v=>fail=v,run:body=>deleteSalesData({...input,body})};
}
test('order-only deletion leaves account, profile and other orders intact; retry is safe',async()=>{
 const f=fixture();assert.equal((await f.run({order_id:'order-a'})).counts.orders,1);assert.deepEqual(f.writes,[['orders','order-a']]);assert(f.accounts.has('member'));assert.equal((await f.run({order_id:'order-a'})).counts.orders,0);
});
test('member deletion removes linked/orphan orders and dependent rows while preserving another member',async()=>{
 const f=fixture();const d=await f.run({user_id:'member',order_id:'orphan'});assert.equal(d.deleted,'member_and_orders');assert.equal(d.counts.orders,3);assert.deepEqual(f.data.orders.map(r=>r.$id),['foreign']);assert.deepEqual(f.data.favorites.map(r=>r.$id),['foreign-fav']);assert.equal(f.accounts.has('member'),false);assert.deepEqual(f.writes.at(-1),['users','member']);assert.equal(d.counts.history,1);assert.equal(d.counts.usage_events,1);
});
test('paged cleanup has no 100-row or 5000-row cap',async()=>{
 const f=fixture();f.data.prompt_history=Array.from({length:5101},(_,i)=>({$id:'h'+i,user_id:'member'}));assert.equal((await f.run({user_id:'member'})).counts.history,5101);assert.equal(f.data.prompt_history.length,0);
});
test('missing legacy optional tables and partially deleted records allow retry',async()=>{
 const f=fixture();delete f.data.prompt_usage_events;await f.run({user_id:'member'});const d=await f.run({user_id:'member'});assert.equal(d.counts.orders,0);assert.equal(d.counts.users,0);
});
test('unauthorized caller and admin-account deletion are rejected before writes',async()=>{
 for(const [body,actor,status] of [[{},'admin',400],[{order_id:'order-a'},'',401],[{order_id:'order-a'},'outsider',403],[{user_id:'admin'},'admin',403],[{user_id:'other-admin'},'admin',403]]){
  const f=fixture();await assert.rejects(()=>deleteSalesData({...f.input,actorId:actor,body}),e=>e.status===status);assert.equal(f.writes.length,0);
 }
});
test('a selected order belonging to another user rejects the entire operation',async()=>{
 const f=fixture();await assert.rejects(()=>f.run({user_id:'member',order_id:'foreign'}),e=>e.status===400);assert.equal(f.writes.length,0);
});
test('failed child cleanup keeps account for a safe retry',async()=>{
 const f=fixture();f.setFailure('prompt_history');await assert.rejects(()=>f.run({user_id:'member'}),/Storage unavailable/);assert(f.accounts.has('member'));assert(f.data.orders.some(r=>r.$id==='order-a'));f.setFailure(null);await f.run({user_id:'member'});assert.equal(f.accounts.has('member'),false);
});
test('deployed entrypoint dispatches /admin/sales/delete and preserves normal routes',async()=>{
 for(const path of ['../functions/activate-member/src/main.js',process.env.ACTIVE_FUNCTION_SOURCE].filter(Boolean)){
  const file=path.startsWith('/')?path:new URL(path,import.meta.url);const source=readFileSync(file,'utf8').replace(/^import .*;\n/gm,'').replace('export default async','return async');
  class Client{setEndpoint(){return this}setProject(){return this}setKey(){return this}}
  const make=new Function('Client','TablesDB','Users','Teams','ID','Query','Permission','Role','deleteSalesData',source);
  const handler=make(Client,class{},class{},class{}, {},Query,{}, {},deleteSalesData);
  const req={path:'/admin/sales/delete',headers:{},bodyJson:{}};const res={json:(body,status=200)=>({body,status})};
  const d=await handler({req,res});assert.equal(d.status,400);assert.match(d.body.error,/Pilih order/);
  const health=await handler({req:{...req,path:'/admin/health'},res});assert.equal(health.status,200);assert.equal(health.body.ok,true);
 }
});
