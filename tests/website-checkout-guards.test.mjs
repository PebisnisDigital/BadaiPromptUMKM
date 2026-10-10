import test from 'node:test';
import assert from 'node:assert/strict';
import {assertProviderSettlement,assertAccountOwner,calculatePaidAccessUntil,freezeOrderEntitlement,selectVerifiedAccountId} from '../functions/activate-member/src/telegram/website-checkout-guards.mjs';

const invoice={transaction_id:'invoice-ABC001',amount:199000,total_amount:200500};
const good=()=>({transaction_id:'invoice-ABC001',status:'success',amount:199000,total_amount:200500});

test('independent website payment amount and invoice must match known provider record',()=>{
 assert.equal(assertProviderSettlement(good(),invoice),true);
 assert.equal(assertProviderSettlement({status:'success'},invoice),true); // Status API may omit optional amount.
 for(const [name,change] of [
  ['lower amount',{amount:99000}],['changed provider transaction',{transaction_id:'invoice-OTHER'}],
  ['different total',{total_amount:10000}],['not paid',{status:'pending'}]
 ]){
  assert.throws(()=>assertProviderSettlement({...good(),...change},invoice),undefined,name);
 }
 assert.throws(()=>assertProviderSettlement(good(),{...invoice,amount:59000}),/tidak valid/);
});
test('one Telegram ID cannot activate a different linked Appwrite member',()=>{
 assert.equal(assertAccountOwner({telegramId:'123',userId:'userA'}),true);
 assert.equal(assertAccountOwner({telegramId:'123',userId:'userA',telegramLink:{data:{user_id:'userA'}},userLink:{data:{telegram_id:'123'}},botMember:{appwrite_user_id:'userA'}}),true);
 for(const changed of [
  {telegramLink:{data:{user_id:'userB'}}},
  {userLink:{data:{telegram_id:'999'}}},
  {botMember:{appwrite_user_id:'userB'}}
 ])assert.throws(()=>assertAccountOwner({telegramId:'123',userId:'userA',...changed}),/lain|lainnya|akun/);
});
test('new 365-day access starts at paid timestamp',()=>{
 const start='2026-10-10T01:00:00.000Z';
 const until=calculatePaidAccessUntil({paidAt:start});
 assert.equal(Date.parse(until)-Date.parse(start),365*86400000);
});
test('early renewals add an entire 365 days without deleting remaining time',()=>{
 const start='2026-10-10T01:00:00.000Z',existing='2027-04-10T01:00:00.000Z';
 const until=calculatePaidAccessUntil({paidAt:start,profile:{status:'active',access_until:existing}});
 assert.equal(Date.parse(until)-Date.parse(existing),365*86400000);
});
test('expired subscriptions renew from settlement date, lifetime remains lifetime',()=>{
 const paidAt='2026-10-10T01:00:00.000Z';
 const expired=calculatePaidAccessUntil({paidAt,profile:{status:'blocked',access_until:'2025-10-10T01:00:00.000Z'}});
 assert.equal(Date.parse(expired)-Date.parse(paidAt),365*86400000);
 assert.equal(calculatePaidAccessUntil({paidAt,profile:{status:'active',access_until:null}}),null);
 assert.throws(()=>calculatePaidAccessUntil({paidAt:'bad date',profile:null}),/Tanggal/);
});

test('simultaneous browser poll and verified webhook freeze ONE 365-day activation plan',async()=>{
 const rows=new Map();
 const store={
  async claim(key,meta){
   // Emulates unique Appwrite document ID atomic creation.
   if(rows.has(key))return null;
   const row={kind:meta.kind,data:JSON.parse(meta.payload)};
   rows.set(key,row);
   return row;
  },
  async state(key){return rows.get(key)||null}
 };
 const key='activation-order-01',paidAt='2026-10-10T01:00:00Z';
 const first=calculatePaidAccessUntil({paidAt,profile:{status:'pending'}});
 const second=calculatePaidAccessUntil({paidAt,profile:{status:'active',access_until:first}});
 assert.notEqual(first,second); // A race must NOT allow a second year's extension.
 const [a,b]=await Promise.all([
  freezeOrderEntitlement({store,key,orderId:'order-01',userId:'userA',telegramId:'123',proposed:first}),
  freezeOrderEntitlement({store,key,orderId:'order-01',userId:'userA',telegramId:'123',proposed:second})
 ]);
 assert.equal(a,first);
 assert.equal(b,first);
 assert.equal(rows.size,1);
 await assert.rejects(()=>freezeOrderEntitlement({store,key,orderId:'order-01',userId:'userB',telegramId:'123',proposed:first}),/tidak konsisten/);
});

test('website QRIS resolves already-linked Appwrite member without a duplicate user',()=>{
 const fallbackUserId='tg_new_hash_user';
 const linked={data:{user_id:'existing_appwrite_user'}};
 const member={appwrite_user_id:'existing_appwrite_user'};
 assert.equal(selectVerifiedAccountId({telegramLink:linked,botMember:member,fallbackUserId}),'existing_appwrite_user');
 assert.equal(selectVerifiedAccountId({telegramLink:null,botMember:member,fallbackUserId}),'existing_appwrite_user');
 assert.equal(selectVerifiedAccountId({telegramLink:null,botMember:null,fallbackUserId}),fallbackUserId);
 assert.throws(()=>selectVerifiedAccountId({
  telegramLink:{data:{user_id:'wrong_appwrite_user'}},botMember:member,fallbackUserId
 }),/dua akun Appwrite berbeda/);
});
