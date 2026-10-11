import test from 'node:test';
import assert from 'node:assert/strict';
import {createGuestCheckoutSession,inspectGuestCheckoutSession} from '../functions/activate-member/src/telegram/guest-checkout.mjs';
function fixture(){const rows=new Map();return {rows,store:{async claim(k,meta){if(rows.has(k))return null;const row={$id:k,...meta,data:JSON.parse(meta.payload)};rows.set(k,row);return row},async state(k){return rows.get(k)||null}}}}
test('anonymous customer can create checkout identity without Telegram login',async()=>{
 const {rows,store}=fixture();
 const session=await createGuestCheckoutSession(store,{name:'  Ibu   Rina ',whatsapp:'0812-3456-7890'});
 const who=await inspectGuestCheckoutSession(store,session.token);
 assert.equal(who.name,'Ibu Rina');assert.equal(who.whatsapp,'081234567890');
 assert.equal(JSON.stringify([...rows.values()]).includes(session.token),false);
});
test('invalid buyer identity cannot create session',async()=>{
 const {store}=fixture();
 await assert.rejects(createGuestCheckoutSession(store,{name:'A',whatsapp:'0812'}),/valid/);
});
test('invalid token cannot recover checkout identity',async()=>{
 const {store}=fixture();
 await assert.rejects(inspectGuestCheckoutSession(store,'forged'),/tidak sah/);
});
test('expired session refuses buyer access',async()=>{
 const {store}=fixture();
 const x=await createGuestCheckoutSession(store,{name:'Ibu Rina',whatsapp:'081234567890'},{now:100000,ttlMs:60000});
 await assert.rejects(inspectGuestCheckoutSession(store,x.token,{now:160000}),/kedaluwarsa/);
});
