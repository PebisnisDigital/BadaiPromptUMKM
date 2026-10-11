import test from 'node:test';
import assert from 'node:assert/strict';
import {assertGuestPaidOrder,prepareGuestTelegramActivation} from '../functions/activate-member/src/telegram/guest-payment-activation.mjs';
const order=()=>({$id:'order-a',kind:'website_order',status:'paid',data:{checkout_type:'guest',guest_session_id:'guest-1',first_name:'Ibu Rina',whatsapp:'081234567890',paid_at:'2026-10-11T00:00:00Z',transaction_id:'invoice-a',amount:199000}});
function fixture(){const rows=new Map();return {rows,store:{async state(k){const r=rows.get(k);return r?{...r,data:JSON.parse(r.payload||'{}')}:null},async claim(k,r){if(rows.has(k))return null;const row={$id:k,...r};rows.set(k,row);return row},async update(table,k,r){const old=rows.get(k);if(!old)throw Error('missing');rows.set(k,{...old,...r})}}}}
test('guest paid validation refuses pending or missing buyer details',()=>{
 for(const change of [{status:'pending'},{data:{...order().data,whatsapp:''}},{data:{...order().data,amount:99000}}])
  assert.throws(()=>assertGuestPaidOrder({...order(),...change}),/belum terverifikasi/);
});
test('one paid order issues at most one activation token',async()=>{
 const {store,rows}=fixture(),o=order();
 const first=await prepareGuestTelegramActivation(store,o);
 assert.equal(first.status,'issued');assert.match(first.token,/^[A-Za-z0-9_-]{43}$/);
 const second=await prepareGuestTelegramActivation(store,o);
 assert.equal(second.status,'already_issued');assert.equal(second.token,undefined);
 assert.equal(JSON.stringify([...rows.values()]).includes(first.token),false);
});
