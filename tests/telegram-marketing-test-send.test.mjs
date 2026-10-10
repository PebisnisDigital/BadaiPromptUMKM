import test from 'node:test';
import assert from 'node:assert/strict';
import {Service} from '../functions/activate-member/src/telegram/service.mjs';

const TG='778812345',bot={$id:'bot-authorized',is_active:true};
function fixture({sendEnabled=true,authorized=true,consented=true,memberActive=true,mainBot=bot}={}){
 const calls=[],admin={ $id:'admin-1' }, member={ $id:'member-1',telegram_id:TG,chat_id:TG,is_active:memberActive,plan:'free' };
 const ctx={
  sendEnabled,
  verifyAdmin:async jwt=>{assert.equal(jwt,'valid-admin-jwt');return admin},
  now:()=>Date.parse('2026-10-10T01:00:00Z'),
  requireSend:async()=>{if(!sendEnabled)throw Object.assign(new Error('Pengiriman Telegram tidak tersedia.'),{status:503})},
  main:async()=>mainBot,
  consent:async()=>consented?{status:'allowed',data:{chat_id:TG}}:null,
  store:{
    rate:async(...args)=>{calls.push(['rate',...args])},
    state:async()=>authorized?{status:'authorized'}:null,
    get:async(table)=>table==='telegram_members'?member:null
  },
  marketing:{
    previewTestSlot:async day=>{calls.push(['preview',day]);return {day:Number(day),prompt_id:'bp001',fingerprint:'mock-fingerprint',offer:{text:'Upgrade ke Premium',label:'BUKA PREMIUM',url:'https://badaiprompt.vercel.app/#harga'}}}
  },
  delivery:{
    prompt:async (...args)=>{calls.push(['send',...args]);return {ok:true,delivery_id:'d-test',warning:null}}
  },
  audit:async(...args)=>{calls.push(['audit',...args])}
 };
 return {ctx,calls,member};
}
const action=(ctx,body)=>Service.prototype.admin.call(ctx,'marketing-test-send',body,'valid-admin-jwt');
const payload={telegram_id:TG,day:1,request_id:'valid_test_request_1234567890'};
test('admin Marketing test only sends to pre-authorized tester, not Free population',async()=>{
 const {ctx,calls}=fixture();
 const result=await action(ctx,payload);
 assert.equal(result.status,'sent');
 assert.equal(result.test,true);
 const send=calls.find(x=>x[0]==='send');
 assert.ok(send);
 assert.equal(send[1].telegram_id,TG);
 assert.equal(send[3].test,true);
 assert.equal(send[3].promptId,'bp001');
 assert.equal(send[3].marketingTestFingerprint,'mock-fingerprint');
 assert.equal(send[3].marketingTestOffer.label,'BUKA PREMIUM');
 assert.equal(calls.filter(x=>x[0]==='send').length,1);
});
for(const [label,opts,match] of [
 ['server send disabled',{sendEnabled:false},/tidak tersedia/],
 ['tester not authorized',{authorized:false},/belum disetujui/],
 ['user consent missing',{consented:false},/belum START/],
 ['member inactive',{memberActive:false},/tidak tersedia/],
 ['no primary bot',{mainBot:null},/bot utama belum aktif/i]
]){
 test('no Telegram delivery when '+label,async()=>{
  const {ctx,calls}=fixture(opts);
  await assert.rejects(()=>action(ctx,payload),match);
  assert.equal(calls.filter(x=>x[0]==='send').length,0);
 });
}
test('request ID required, preventing accidental duplicated sends',async()=>{
 const {ctx,calls}=fixture();
 await assert.rejects(()=>action(ctx,{...payload,request_id:'short'}),/Request ID/);
 assert.equal(calls.filter(x=>x[0]==='send').length,0);
});
