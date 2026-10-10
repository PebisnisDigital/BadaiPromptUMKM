import test from 'node:test';
import assert from 'node:assert/strict';
import {issuePurchaseActivation,validatePurchaseActivation,reservePurchaseActivation} from '../functions/activate-member/src/telegram/telegram-purchase-activation.mjs';

const order=()=>({$id:'order-001',kind:'website_order',status:'paid',data:{transaction_id:'tx-001',paid_at:'2026-10-10T10:00:00Z'}});
function fixture(){
 const db=new Map();
 const unwrap=r=>r?{...r,data:JSON.parse(r.payload||'{}')}:null;
 const store={
  async claim(key,record){if(db.has(key))return null;const row={$id:key,...record};db.set(key,row);return unwrap(row)},
  async state(key){return unwrap(db.get(key))},
  async transaction(fn){
   const staged=new Map(db);
   const tx={
    async state(key){return unwrap(staged.get(key))},
    async put(key,data,meta,exists){
     if(exists&&!staged.has(key))throw Error('Missing row');
     if(!exists&&staged.has(key))throw Error('Conflict');
     const row={$id:key,...meta,payload:JSON.stringify(data)};staged.set(key,row);return unwrap(row);
    }
   };
   const result=await fn(tx);
   for(const [key,row] of staged)db.set(key,row);
   return result;
  }
 };
 return {store,db};
}
test('pending, failed, expired and unverified paid orders cannot issue tokens',async()=>{
 const {store}=fixture();
 for(const status of ['pending','failed','expired','activated'])
  await assert.rejects(issuePurchaseActivation(store,{...order(),status}),/lunas/);
 await assert.rejects(issuePurchaseActivation(store,{...order(),data:{transaction_id:'tx-001'}}),/lunas/);
});
test('token is random and fingerprint only is persisted',async()=>{
 const {store,db}=fixture(),o=order();
 const a=await issuePurchaseActivation(store,o);
 assert.match(a.token,/^[A-Za-z0-9_-]{43}$/);
 assert.equal(JSON.stringify([...db.values()]).includes(a.token),false);
 assert.equal((await validatePurchaseActivation(store,a.token,o)).order_id,o.$id);
});
test('cross-order activation rejected',async()=>{
 const {store}=fixture(),o=order(),a=await issuePurchaseActivation(store,o);
 await assert.rejects(validatePurchaseActivation(store,a.token,{...o,$id:'different'}),/tidak sah/);
});
test('expired token rejected',async()=>{
 const {store}=fixture(),o=order(),a=await issuePurchaseActivation(store,o,{now:100000,ttlMs:60000});
 await assert.rejects(validatePurchaseActivation(store,a.token,o,{now:160000}),/kedaluwarsa/);
});
test('one paid order only binds one Telegram ID even across different tokens',async()=>{
 const {store}=fixture(),o=order();
 const first=await issuePurchaseActivation(store,o),second=await issuePurchaseActivation(store,o);
 const bind=await reservePurchaseActivation(store,first.token,o,'123456789');
 assert.equal(bind.telegram_id,'123456789');
 await assert.rejects(reservePurchaseActivation(store,second.token,o,'987654321'),/tidak sah/);
 await assert.rejects(validatePurchaseActivation(store,first.token,o),/tidak sah/);
});
test('invalid telegram ID rejected with no binding',async()=>{
 const {store}=fixture(),o=order(),a=await issuePurchaseActivation(store,o);
 await assert.rejects(reservePurchaseActivation(store,a.token,o,'-1000'),/tidak sah/);
 assert.equal((await validatePurchaseActivation(store,a.token,o)).order_id,o.$id);
});
