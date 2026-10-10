import test from 'node:test';
import assert from 'node:assert/strict';
import {notifyVerifiedWebsitePurchase} from '../functions/activate-member/src/telegram/website-purchase-notice.mjs';
function fixture({sendEnabled=true,dry=false,main=true,linked=true,consented=true,premium=true}={}){
 const calls=[];
 const member={$id:'member-1',telegram_id:'123456789',appwrite_user_id:'user-1',plan:premium?'premium':'free'};
 const service={
  sendEnabled,
  async config(){return {dry_run:dry}},
  async main(){return main?{$id:'primary-bot',is_active:true}:null},
  store:{async list(){return {rows:linked?[member]:[]}}},
  async consent(){return consented?{status:'allowed'}:null},
  async sync(x){return x},
  delivery:{async text(...args){calls.push(args);return {ok:true}}}
 };
 return {service,calls};
}
test('website purchase notification is sent only to consented, linked, paid member',async()=>{
 const {service,calls}=fixture();
 const r=await notifyVerifiedWebsitePurchase({service,userId:'user-1',orderId:'order-1'});
 assert.equal(r.notified,1);
 assert.equal(calls.length,1);
 assert.match(calls[0][2],/Pembayaran di website/);
 assert.match(calls[0][2],/\/member/);
 assert.equal(calls[0][4],'premium_paid');
});
for(const [name,opts] of [
 ['bot disabled',{sendEnabled:false}],['dry-run',{dry:true}],['no active main bot',{main:false}],
 ['buyer not linked',{linked:false}],['buyer did not START',{consented:false}],['buyer is still Free',{premium:false}]
]){
 test('website purchase notification is NOT sent when '+name,async()=>{
  const {service,calls}=fixture(opts);
  const result=await notifyVerifiedWebsitePurchase({service,userId:'user-1',orderId:'order-1'});
  assert.equal(result.notified||0,0);
  assert.equal(calls.length,0);
 });
}
test('notification uses an idempotency key per website order',async()=>{
 const {service,calls}=fixture();
 await notifyVerifiedWebsitePurchase({service,userId:'user-1',orderId:'order-1'});
 await notifyVerifiedWebsitePurchase({service,userId:'user-1',orderId:'order-1'});
 await notifyVerifiedWebsitePurchase({service,userId:'user-1',orderId:'order-2'});
 assert.equal(calls[0][3],calls[1][3]);
 assert.notEqual(calls[0][3],calls[2][3]);
});
