import test from 'node:test';
import assert from 'node:assert/strict';
import {id} from '../functions/activate-member/src/telegram/security.mjs';
import {grantWebsitePremium} from '../functions/activate-member/src/telegram/website-premium-grant.mjs';

function fixture({orderStatus='paid',telegramId='123456789',memberLinkedTo=null,membershipDenied=false,existingUser=false}={}){
 const fallbackUserId=id('tg-user',telegramId),userId=memberLinkedTo||fallbackUserId,orderId=id('fake-website-order','integration-test');
 const now='2026-10-10T11:00:00.000Z',counts={createdUsers:0,memberships:0,profiles:0,notice:0};
 const db=new Map(),users=new Map(),members=new Map();
 const order={$id:orderId,kind:'website_order',status:orderStatus,data:{telegram_id:telegramId,transaction_id:'fake-tx-nonpaid',paid_at:now,amount:199000,first_name:'Test Buyer'}};
 db.set('telegram_state:'+orderId,structuredClone(order));
 if(existingUser)users.set(userId,{$id:userId,name:'Existing Buyer'});
 if(memberLinkedTo)db.set('telegram_members:'+id('member',telegramId),{$id:id('member',telegramId),telegram_id:telegramId,appwrite_user_id:memberLinkedTo});
 const store={
  async state(k){const r=db.get('telegram_state:'+k);return r?{...r,data:JSON.parse(r.payload||'{}')}:null},
  async get(table,k){return db.get(table+':'+k)||null},
  async claim(k,record){const key='telegram_state:'+k;if(db.has(key))return null;db.set(key,{$id:k,...record});return db.get(key)},
  async update(table,k,fields){const key=table+':'+k,old=db.get(key);if(!old)throw Error('Unexpected row update '+key);const r={...old,...fields};db.set(key,r);return r}
 };
 const s={
  store,users:{
   async get({userId:id}){if(!users.has(id))throw Object.assign(new Error('Not found'),{code:404});return users.get(id)},
   async create({userId:id,name}){if(users.has(id))throw Object.assign(new Error('Conflict'),{code:409});const user={$id:id,name};users.set(id,user);counts.createdUsers++;return user}
  },
  teams:{
   async listMemberships({teamId}){assert.equal(teamId,'paid-members');return {memberships:[...members.values()]}},
   async createMembership({teamId,userId:id,roles}){assert.equal(teamId,'paid-members');assert.deepEqual(roles,['member']);if(membershipDenied)throw Object.assign(new Error('Missing team scope'),{code:401});members.set(id,{userId:id,confirm:true});counts.memberships++;return {userId:id,confirm:true}}
  },
  tables:{
   async createRow({databaseId,tableId,rowId,data}){assert.equal(databaseId,'badai_prompt_umkm');assert.equal(tableId,'member_profiles');assert.equal(rowId,userId);if(db.has('member_profiles:'+rowId))throw Error('Duplicate profile');db.set('member_profiles:'+rowId,{$id:rowId,...data});counts.profiles++;return db.get('member_profiles:'+rowId)}
  }
 };
 const send=async({userId:id,orderId:oid})=>{assert.equal(id,userId);assert.equal(oid,orderId);counts.notice++};
 return {order,s,send,counts,users,members,db,userId,now};
}

test('paid independently verified website order creates one email-free Appwrite user, paid team, 365-day profile and a bot notification',async()=>{
 const t=fixture();
 const result=await grantWebsitePremium(t.s,t.order,{sendNotice:true,send:t.send});
 assert.equal(result.status,'activated');
 assert.deepEqual(t.counts,{createdUsers:1,memberships:1,profiles:1,notice:1});
 assert.equal(t.users.get(t.userId).name,'Test Buyer');
 const profile=t.db.get('member_profiles:'+t.userId);
 assert.equal(profile.email,null);
 assert.equal(profile.whatsapp,null);
 assert.equal(profile.status,'active');
 assert.equal(Date.parse(profile.access_until)-Date.parse(t.now),365*86400000);
 const duplicate=await grantWebsitePremium(t.s,result,{sendNotice:true,send:t.send});
 assert.equal(duplicate.status,'activated');
 assert.deepEqual(t.counts,{createdUsers:1,memberships:1,profiles:1,notice:1});
});
test('failed and unpaid invoices never create account or activate membership',async()=>{
 for(const status of ['pending','expired','failed']){
  const t=fixture({orderStatus:status});
  await assert.rejects(()=>grantWebsitePremium(t.s,t.order),/belum terverifikasi/);
  assert.deepEqual(t.counts,{createdUsers:0,memberships:0,profiles:0,notice:0});
 }
});
test('missing teams.write refuses Premium grant; missing membership cannot produce an active profile',async()=>{
 const t=fixture({membershipDenied:true});
 await assert.rejects(()=>grantWebsitePremium(t.s,t.order),/Missing team scope/);
 assert.equal(t.counts.memberships,0);
 assert.equal(t.counts.profiles,0);
 assert.equal(t.counts.notice,0);
});
test('previously linked Telegram account with deleted Appwrite user is blocked, not silently recreated',async()=>{
 const t=fixture({memberLinkedTo:'deleted_appwrite_user'});
 await assert.rejects(()=>grantWebsitePremium(t.s,t.order),/Akun tertaut tidak ditemukan/);
 assert.deepEqual(t.counts,{createdUsers:0,memberships:0,profiles:0,notice:0});
});
test('previously linked Telegram user with existing Appwrite account is reused safely',async()=>{
 const t=fixture({memberLinkedTo:'existing_real_member',existingUser:true});
 const result=await grantWebsitePremium(t.s,t.order,{sendNotice:true,send:t.send});
 assert.equal(result.status,'activated');
 assert.equal(result.data.user_id,'existing_real_member');
 assert.deepEqual(t.counts,{createdUsers:0,memberships:1,profiles:1,notice:1});
});
test('a database write failure cannot mark a payment order activated',async()=>{
 const t=fixture();t.s.tables.createRow=async()=>{throw Error('DB temporarily unavailable')};
 await assert.rejects(()=>grantWebsitePremium(t.s,t.order),/DB temporarily unavailable/);
 const row=t.db.get('telegram_state:'+t.order.$id);
 assert.equal(row.status,'paid');
 assert.equal(t.counts.notice,0);
});
