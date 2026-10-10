import test from 'node:test';
import assert from 'node:assert/strict';
import {QrisChat} from '../functions/activate-member/src/telegram/qris.mjs';

const bot={$id:'bot-test'};
const m={telegram_id:'12345678',chat_id:'12345678',plan:'free'};
const merchant={is_active:true,account_id:'acc_demo',secret_token:'redacted-test',callback_url:'https://example.test/hook',api_url:'https://example.test/api',fee_by:'buyer',qris_method:'qris_two'};

function service({qrisEnabled=false,sendEnabled=true,grantPaidAccess=()=>{},settings={},member=m}={}){
 const writes=[],sent=[],calls=[];
 const s={
  qrisEnabled,sendEnabled,grantPaidAccess,now:()=>1780000000000,
  config:async()=>({enabled:true,paused:false,dry_run:false}),
  store:{
   get:async(table,key)=>table==='settings'?{value:settings[key]??'199000'}:table==='payment_settings'?merchant:table==='telegram_members'?member:null,
   claim:async(rowId,data)=>{writes.push({rowId,...data});return {ok:true}},
   rate:async()=>{},
   update:async()=>{},
   state:async()=>null
  },
  sync:async x=>x,
  delivery:{text:async (...args)=>{sent.push(args);return {ok:true}}},
  telegram:{call:async (...args)=>{calls.push(args);return {message_id:1}}},
  token:()=> '12345:fixture',consent:async()=>({status:'allowed'}),
  fetcher:async()=>{throw Error('should not call provider')},
  requireSend:async()=>{}
 };
 return {s,writes,sent,calls};
}
test('Free offer states 24 hours and next prompt in three days',()=>{
 const f=new QrisChat(service().s).freeMessage({delete_hours:24,free_days:3},'delivery_1');
 assert.match(f.text,/24 jam/);assert.match(f.text,/3 hari/);
 assert.equal(f.reply_markup.inline_keyboard[0][0].text,'MAU');
});
test('in-bot QRIS is disabled until an explicit server opt-in',async()=>{
 const x=service();
 assert.equal(await new QrisChat(x.s).ready(),false);
 assert.equal(x.calls.length,0);
});
test('backend fixed-price validation rejects stale or lower settings',async()=>{
 const x=service({settings:{product_price:'59000',minimum_price:'30000'}});
 await assert.rejects(()=>new QrisChat(x.s).settings(),/Rp199\.000/);
});
test('offer carries correct amount and bound inline button',async()=>{
 const x=service(),q=new QrisChat(x.s);
 await q.offer(m,bot,'command');
 assert.equal(x.sent.length,1);
 assert.match(x.sent[0][2],/Rp199\.000/);
 const keyboard=x.sent[0][5].inline_keyboard;
 assert.equal(keyboard[0][0].text,'BELI PREMIUM');
 assert.match(keyboard[0][0].callback_data,/^qris:tg_/);
});
test('invoice does not call provider if feature is disabled',async()=>{
 const x=service(),q=new QrisChat(x.s);
 const result=await q.invoice(m,bot,'tg_example');
 assert.equal(result.ok,true);
 assert.equal(x.calls.length,0);
 assert.match(x.sent[0][2],/belum dibuka/);
});
