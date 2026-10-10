import test from 'node:test';
import assert from 'node:assert/strict';
import {QrisChat} from '../functions/activate-member/src/telegram/qris.mjs';
import {id} from '../functions/activate-member/src/telegram/security.mjs';

const TIME=1791600000000;
function rig(){
 const tg='777123456',memberId=id('member',tg),invoiceId=id('qris-invoice','txn_paid_simulation'),bot={$id:'our-main-bot'};
 const records=new Map(),members=new Map([[memberId,{$id:memberId,telegram_id:tg,chat_id:tg,first_name:'Tester',plan:'free',premium_until:null,appwrite_user_id:null}]]);
 const payload=JSON.stringify({transaction_id:'txn_paid_simulation',price:199000,total_amount:199000,paid_at:new Date(TIME).toISOString()});
 records.set(invoiceId,{$id:invoiceId,kind:'bot_qris_invoice',telegram_id:tg,bot_id:bot.$id,status:'paid',payload});
 const granted=[],sent=[],login=[];
 const state=async key=>{const r=records.get(key);return r?{...r,data:JSON.parse(r.payload||'{}')}:null};
 const store={
  state,
  get:async(table,key)=>table==='telegram_members'?members.get(key):null,
  update:async(table,key,data)=>{
   const map=table==='telegram_members'?members:records;const row=map.get(key);if(!row)throw Error('unknown row');const next={...row,...data};map.set(key,next);return next},
  putState:async(key,data,meta={})=>{records.set(key,{$id:key,kind:meta.kind||'test',status:meta.status||'ready',telegram_id:meta.telegram_id,payload:JSON.stringify(data)})},
  transaction:async cb=>{
   const tx={
    state,
    get:async(table,key)=>store.get(table,key),
    update:async(table,key,data)=>store.update(table,key,data),
    put:async(key,data,meta={})=>{records.set(key,{$id:key,...meta,payload:JSON.stringify(data)})}
   };
   return cb(tx)
  },
  list:async(table,filters)=>({rows:[...records.values()].filter(x=>filters.every(([op,k,v])=>op!=='equal'||(Array.isArray(v)?v.includes(x[k]):x[k]===v))),total:records.size})
 };
 const service={
  store,now:()=>TIME,qrisEnabled:true,grantPaidAccess:async (...x)=>granted.push(x),
  config:async()=>({enabled:true,paused:false,dry_run:false}),
  sync:async m=>m,consent:async()=>({status:'allowed'}),
  login:{ensureAccount:async member=>{
    login.push(member.telegram_id);
    const updated={...member,appwrite_user_id:id('tg-user',tg)};
    members.set(memberId,updated);return updated
  }},
  delivery:{
   text:async(_member,_bot,text,key,kind,keyboard)=>{sent.push({text,key,kind,keyboard});return {ok:true}},
   prompt:async()=>({ok:true})
  },
  telegram:{call:async()=>({message_id:1})},token:()=> 'fake:token'
 };
 const qris=new QrisChat(service);
 return {qris,records,members,invoiceId,bot,tg,granted,sent,login};
}
test('a verified paid QRIS invoice activates 365-day Premium and grants Member Area once',async()=>{
 const x=rig();
 const outcome=await x.qris.complete(await x.qris.s.store.state(x.invoiceId),x.bot);
 assert.equal(outcome.ok,true);
 assert.equal(x.members.get(id('member',x.tg)).plan,'premium');
 assert.equal(x.members.get(id('member',x.tg)).appwrite_user_id,id('tg-user',x.tg));
 assert.equal(x.granted.length,1);
 assert.equal(x.granted[0][2],x.tg);
 assert.equal(x.records.get(x.invoiceId).status,'delivered');
 assert.equal(x.sent.length,1);
 assert.equal(x.sent[0].keyboard.inline_keyboard[0][0].callback_data,'login');
 const second=await x.qris.complete(await x.qris.s.store.state(x.invoiceId),x.bot);
 assert.equal(second.ignored,true);
 assert.equal(x.granted.length,1);
});
test('unpaid, expired, or unrelated bot invoices cannot activate Premium',async()=>{
 for(const status of ['pending','expired','failed']){
  const x=rig();
  x.records.get(x.invoiceId).status=status;
  assert.equal((await x.qris.complete(await x.qris.s.store.state(x.invoiceId),x.bot)).ignored,true);
  assert.equal(x.granted.length,0);
 }
 const other=rig();
 assert.equal((await other.qris.complete(await other.qris.s.store.state(other.invoiceId),{$id:'other-bot'})).ignored,true);
 assert.equal(other.granted.length,0);
});
test('renewal cannot grant Premium without server-side, paid invoice state',async()=>{
 const x=rig();x.records.get(x.invoiceId).status='qr_delivery_uncertain';
 const value=await x.qris.complete(await x.qris.s.store.state(x.invoiceId),x.bot);
 assert.equal(value.ignored,true);
 assert.equal(x.members.get(id('member',x.tg)).plan,'free');
});
