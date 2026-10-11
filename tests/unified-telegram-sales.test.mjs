import test from 'node:test';
import assert from 'node:assert/strict';
import {Query} from 'node-appwrite';
import {Store} from '../functions/activate-member/src/telegram/store.mjs';
import {Service} from '../functions/activate-member/src/telegram/service.mjs';
import {BotQris,botQrisIds} from '../functions/activate-member/src/telegram/bot-qris.mjs';
import {id} from '../functions/activate-member/src/telegram/security.mjs';
import {defaults} from '../functions/activate-member/src/telegram/policy.mjs';
import {MemoryTables,MockTelegram} from './fixtures/telegram-memory.mjs';

const NOW=Date.parse('2026-10-11T05:00:00Z'),tg='700700',uid=id('bot-qris-user',tg),botId=id('bot','test');
async function setup({premium=true,external=false}={}){
 const tables=new MemoryTables(),store=new Store(tables,Query),users=new Map();
 const memberUser=external?'guest-website-user':uid;
 if(premium)users.set(memberUser,{$id:memberUser});
 const membership=new Set(premium?[memberUser]:[]);
 const teams={
  listMemberships:async({teamId,queries})=>{
   const q=queries.find(v=>JSON.parse(v).attribute==='userId'),userId=q&&JSON.parse(q).values[0];
   return {memberships:teamId==='paid-members'&&membership.has(userId)?[{$id:'paid-'+userId,confirm:true,userId}]:[]};
  },
  deleteMembership:async({membershipId})=>{membership.delete(membershipId.slice(5))},
  createMembership:async({userId})=>{membership.add(userId);return {confirm:true,userId}}
 };
 const userApi={
  get:async({userId})=>{if(!users.has(userId))throw Object.assign(Error('not found'),{code:404});return users.get(userId)},
  create:async({userId,name})=>{const u={$id:userId,name};users.set(userId,u);return u},
  delete:async({userId})=>{users.delete(userId)}
 };
 const service=new Service({store,telegram:new MockTelegram(),now:()=>NOW,
  verifyAdmin:async jwt=>{if(jwt!=='verified-admin')throw Object.assign(Error('not allowed'),{status:403});return {$id:'admin'}}});
 service.qris=new BotQris(service,{users:userApi,teams,tables,enabled:true});
 await store.create('telegram_bots',botId,{username:'TestBadaiBot',name:'Test bot',is_active:true});
 await store.putState('telegram-settings',{...defaults,main_bot_id:botId,enabled:true,paused:false,dry_run:false});
 await store.create('telegram_members',id('member',tg),{telegram_id:tg,first_name:'Ibu Rina',
  username:'ibu_rina',plan:premium?'premium':'free',is_active:true,
  appwrite_user_id:premium?memberUser:null,premium_until:premium?'2027-10-11T05:00:00.000Z':null});
 await store.putState(id('consent',botId,tg),{chat_id:tg},{kind:'consent',bot_id:botId,telegram_id:tg,status:'allowed'});
 if(premium){
  await store.create('member_profiles',memberUser,{user_id:memberUser,status:'active',access_until:'2027-10-11T05:00:00.000Z'});
  await store.claim(id('userlink',memberUser),{kind:'userlink',user_id:memberUser,telegram_id:tg,status:'linked',payload:JSON.stringify({telegram_id:tg})});
  await store.claim(id('tglink',tg),{kind:'tglink',user_id:memberUser,telegram_id:tg,status:'linked',payload:JSON.stringify({user_id:memberUser})});
 }
 const orderId=botQrisIds.orderId('sandbox-test');
 await store.claim(orderId,{kind:'bot_qris_order',telegram_id:tg,bot_id:botId,status:'activated',
  payload:JSON.stringify({checkout_type:'telegram_direct',telegram_id:tg,user_id:premium?memberUser:null,
   bot_id:botId,is_test:true,transaction_id:'sandbox-test',amount:199000,total_amount:199000,
   paid_at:'2026-10-11T04:00:00Z',access_until:'2027-10-11T05:00:00.000Z'})});
 await store.putState(botQrisIds.currentId(botId,tg),{order_id:orderId},{kind:'bot_qris_current',telegram_id:tg,bot_id:botId});
 return {service,store,tables,users,membership,orderId,memberUser};
}
test('unified sales actions require verified admin',async()=>{
 const f=await setup();
 await assert.rejects(f.service.admin('telegram-member-delete',{telegram_id:tg,confirmation:'HAPUS MEMBER '+tg},'fake'),e=>e.status===403);
 await assert.rejects(f.service.admin('telegram-member-edit',{telegram_id:tg,first_name:'Uji',plan:'free',is_active:true},'fake'),e=>e.status===403);
 assert.equal((await f.store.get('telegram_members',id('member',tg))).plan,'premium');
});
test('edit Telegram member name, receiving status and premium term from unified sales',async()=>{
 const f=await setup();
 const result=await f.service.admin('telegram-member-edit',{telegram_id:tg,first_name:'Ibu Rina Edit',plan:'premium',access_until:'2027-12-01',is_active:false},'verified-admin');
 assert.equal(result.first_name,'Ibu Rina Edit');
 const m=await f.store.get('telegram_members',id('member',tg));
 assert.equal(m.first_name,'Ibu Rina Edit');assert.equal(m.is_active,false);
 assert.match(m.premium_until,/2027-12-01/);
 assert.equal((await f.store.get('member_profiles',uid)).access_until,m.premium_until);
});
test('admin can upgrade FREE Telegram member with Appwrite team and verified profile',async()=>{
 const f=await setup({premium:false});
 await f.service.admin('telegram-member-edit',{telegram_id:tg,first_name:'Ibu Rina',plan:'premium',access_until:'2027-10-11',is_active:true},'verified-admin');
 const m=await f.store.get('telegram_members',id('member',tg));
 assert.equal(m.plan,'premium');assert.equal(m.appwrite_user_id,id('telegram-admin-user',tg));
 assert(f.membership.has(m.appwrite_user_id));
 assert.equal((await f.store.get('member_profiles',m.appwrite_user_id)).status,'active');
});
test('delete Telegram member cleans access and current checkout, archives settled invoice and allows same Telegram ID again',async()=>{
 const f=await setup();
 await f.store.create('telegram_deliveries','delivery-1',{telegram_id:tg,dispatch_status:'sent'});
 const r=await f.service.admin('telegram-member-delete',{telegram_id:tg,confirmation:'HAPUS MEMBER '+tg},'verified-admin');
 assert.equal(r.deleted,true);assert.equal(r.orders_archived,1);
 assert.equal(await f.store.get('telegram_members',id('member',tg)),null);
 assert.equal(await f.store.get('member_profiles',uid),null);
 assert.equal(f.users.has(uid),false);
 assert.equal(f.membership.has(uid),false);
 assert.equal(await f.store.state(botQrisIds.currentId(botId,tg)),null);
 assert.equal(await f.store.get('telegram_deliveries','delivery-1'),null);
 const archived=await f.store.state(f.orderId);
 assert.equal(archived.kind,'archived_bot_qris_order');assert.equal(archived.data.transaction_id,'sandbox-test');
 assert.equal(archived.status,'activated');assert.equal(archived.telegram_id,null);
 const sales=await f.service.admin('telegram-orders-list',{channel:'bot'},'verified-admin');
 assert.equal(sales.orders.length,0);
 await f.store.create('telegram_members',id('member',tg),{telegram_id:tg,plan:'free',is_active:true,first_name:'Beli Lagi'});
 assert.equal((await f.store.get('telegram_members',id('member',tg))).plan,'free');
});
test('website-linked Telegram member cannot be deleted independently of website order',async()=>{
 const f=await setup({external:true});
 await assert.rejects(f.service.admin('telegram-member-delete',{telegram_id:tg,confirmation:'HAPUS MEMBER '+tg},'verified-admin'),e=>e.status===409);
 assert(f.users.has('guest-website-user'));
 assert.equal((await f.store.state(f.orderId)).kind,'bot_qris_order');
});
