import test from 'node:test';
import assert from 'node:assert/strict';
import {assertProviderSettlement,assertAccountOwner,calculatePaidAccessUntil} from '../functions/activate-member/src/telegram/website-checkout-guards.mjs';

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
