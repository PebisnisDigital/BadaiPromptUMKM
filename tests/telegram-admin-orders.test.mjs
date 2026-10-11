import test from 'node:test';
import assert from 'node:assert/strict';
import {Query} from 'node-appwrite';
import {Store} from '../functions/activate-member/src/telegram/store.mjs';
import {Service} from '../functions/activate-member/src/telegram/service.mjs';
import {BotQris,botQrisIds} from '../functions/activate-member/src/telegram/bot-qris.mjs';
import {id} from '../functions/activate-member/src/telegram/security.mjs';
import {defaults} from '../functions/activate-member/src/telegram/policy.mjs';
import {MemoryTables,MockTelegram} from './fixtures/telegram-memory.mjs';

const NOW=Date.parse('2026-10-11T05:00:00Z');
async function setup(){
 const store=new Store(new MemoryTables(),Query);
 const memberships=new Map([['paid-user',new Set(['membership-1'])]]);
 const teams={
  listMemberships:async({queries})=>{
   const eq=queries.find(v=>JSON.parse(v).attribute==='userId');
   const uid=JSON.parse(eq).values[0];
   return {memberships:[...(memberships.get(uid)||[])].map($id=>({$id,confirm:true}))};
  },
  deleteMembership:async({membershipId})=>{for(const ids of memberships.values())ids.delete(membershipId)}
 };
 const s=new Service({store,telegram:new MockTelegram(),now:()=>NOW,
  verifyAdmin:async jwt=>{if(jwt!=='admin-jwt')throw Object.assign(Error('Tidak diizinkan'),{status:403});return {$id:'admin-tester'}}});
 s.qris=new BotQris(s,{teams,enabled:true});
 const botId=id('bot','test-bot'),tg='777777';
 await store.create('telegram_bots',botId,{username:'TestBadaiBot',name:'Test Bot',is_active:true});
 await store.putState('telegram-settings',{...defaults,main_bot_id:botId,paused:false,enabled:true,dry_run:false});
 await store.create('telegram_members',id('member',tg),{telegram_id:tg,first_name:'Ibu Tester',username:'user_tester',
  plan:'premium',is_active:true,appwrite_user_id:id('bot-qris-user',tg),
  premium_until:'2027-10-11T05:00:00Z',next_send_at:'2026-10-12T23:00:00Z'});
 const userId=id('bot-qris-user',tg),orderId=botQrisIds.orderId('sandbox-111');
 memberships.set(userId,new Set(['member-sandbox']));
 await store.create('member_profiles',userId,{user_id:userId,status:'active',role:'member',access_until:'2027-10-11T05:00:00Z'});
 await store.claim(orderId,{kind:'bot_qris_order',bot_id:botId,telegram_id:tg,status:'activated',
  payload:JSON.stringify({checkout_type:'telegram_direct',is_test:true,transaction_id:'sandbox-111',
   amount:199000,total_amount:199000,telegram_id:tg,bot_id:botId,user_id:userId,paid_at:'2026-10-11T04:00:00Z',
   access_until:'2027-10-11T05:00:00Z'})});
 await store.putState(botQrisIds.currentId(botId,tg),{order_id:orderId,telegram_id:tg},{kind:'bot_qris_current',telegram_id:tg});
 await store.claim(id('website-qris','sandbox-website'),{kind:'website_order',status:'activated',
  payload:JSON.stringify({checkout_type:'guest',is_test:true,amount:199000,total_amount:199000,transaction_id:'sandbox-website',
  first_name:'Ibu Website',whatsapp:'628100000000',paid_at:'2026-10-11T02:00:00Z',user_id:'guest-user',access_until:'2027-10-11T02:00:00Z'})});
 return {s,store,teams,memberships,orderId,botId,tg,userId};
}

test('only verified admin can retrieve Telegram QRIS orders and buyer identity',async()=>{
 const f=await setup();
 await assert.rejects(f.s.admin('telegram-orders-list',{},'fake'),e=>e.status===403);
 const result=await f.s.admin('telegram-orders-list',{channel:'all'},'admin-jwt');
 assert.equal(result.total,2);
 assert.equal(result.orders.length,2);
 assert(result.orders.some(o=>o.channel==='bot'&&o.plan==='premium'&&o.is_test));
 assert(result.orders.some(o=>o.channel==='website'&&o.display_name==='Ibu Website'));
 const buyers=await f.s.admin('telegram-buyers-list',{},'admin-jwt');
 assert.equal(buyers.total,1);
 assert.equal(buyers.members[0].can_reset,false);
 const filtered=await f.s.admin('telegram-orders-list',{channel:'bot'},'admin-jwt');
 assert.equal(filtered.orders.length,1);
});
test('sandbox reset refuses real purchases and unapproved testers without changing membership',async()=>{
 const f=await setup(),invalid=await f.store.state(f.orderId);
 await assert.rejects(f.s.admin('telegram-tester-reset',{order_id:f.orderId,confirmation:'RESET SANDBOX'},'fake'),e=>e.status===403);
 await assert.rejects(f.s.admin('telegram-tester-reset',{order_id:f.orderId,confirmation:'RESET SANDBOX'},'admin-jwt'),e=>e.status===403);
 await f.store.putState(id('tester',f.botId,f.tg),{authorized:true},{kind:'tester',bot_id:f.botId,telegram_id:f.tg,status:'authorized'});
 await f.store.update('telegram_state',f.orderId,{payload:JSON.stringify({...invalid.data,is_test:false})});
 await assert.rejects(f.s.admin('telegram-tester-reset',{order_id:f.orderId,confirmation:'RESET SANDBOX'},'admin-jwt'),e=>e.status===403);
 assert.equal((await f.store.get('member_profiles',f.userId)).status,'active');
 assert.equal(f.memberships.get(f.userId).size,1);
});
test('authorized sandbox tester reset preserves paid invoice, demotes to FREE, clears only active pointer',async()=>{
 const f=await setup();
 await f.store.putState(id('tester',f.botId,f.tg),{authorized:true},{kind:'tester',bot_id:f.botId,telegram_id:f.tg,status:'authorized'});
 const listed=await f.s.admin('telegram-buyers-list',{},'admin-jwt');
 assert.equal(listed.members[0].can_reset,true);
 const result=await f.s.admin('telegram-tester-reset',{order_id:f.orderId,confirmation:'RESET SANDBOX'},'admin-jwt');
 assert(result.ok);
 assert.equal((await f.store.get('member_profiles',f.userId)).status,'blocked');
 assert.equal((await f.store.get('telegram_members',id('member',f.tg))).plan,'free');
 assert.equal(f.memberships.get(f.userId).size,0);
 assert.equal(await f.store.state(botQrisIds.currentId(f.botId,f.tg)),null);
 assert.equal((await f.store.state(f.orderId)).status,'activated');
 assert.equal((await f.s.admin('telegram-buyers-list',{},'admin-jwt')).members[0].can_reset,false);
});
