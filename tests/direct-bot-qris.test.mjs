import test from 'node:test';
import assert from 'node:assert/strict';
import {id} from '../functions/activate-member/src/telegram/security.mjs';
import {botQrisIds,botQrisPrice} from '../functions/activate-member/src/telegram/bot-qris.mjs';
test('QRIS bot memakai harga tetap dan ID order deterministik',()=>{
 assert.equal(botQrisPrice,199000);
 assert.equal(botQrisIds.orderId('sandbox-1'),id('bot-qris-order','sandbox-1'));
 assert.notEqual(botQrisIds.currentId('bot-A','1'),botQrisIds.currentId('bot-A','2'));
});
import {randomBytes} from 'node:crypto';
import {Query} from 'node-appwrite';
import {Store} from '../functions/activate-member/src/telegram/store.mjs';
import {Service} from '../functions/activate-member/src/telegram/service.mjs';
import {BotQris} from '../functions/activate-member/src/telegram/bot-qris.mjs';
import {defaults,DAY} from '../functions/activate-member/src/telegram/policy.mjs';
import {MemoryTables,MockTelegram} from './fixtures/telegram-memory.mjs';

test('direct bot: free prompt → /beli QR sandbox → /cek verified → Premium Appwrite',async()=>{
 const NOW=Date.parse('2026-10-11T00:00:00Z'),tables=new MemoryTables(),store=new Store(tables,Query),
 telegram=new MockTelegram(),token='123456:FAKE_TEST_TOKEN_01234567890123';
 const memberIds=new Set(),users=new Map();let settled=false;
 const fetcher=async(_url,opts)=>{
  const data=new URLSearchParams(opts.body);
  if(data.get('action')==='api_create_qris')
   return {ok:true,json:async()=>({success:true,data:{transaction_id:'test-invoice-01',amount:199000,total_amount:199000,qr_url:'https://example.org/qris.png'}})};
  return {ok:true,json:async()=>({success:true,data:{transaction_id:'test-invoice-01',amount:199000,total_amount:199000,status:settled?'success':'pending'}})};
 };
 const accounts={
  get:async({userId})=>{if(!users.has(userId))throw Object.assign(Error('Not found'),{code:404});return users.get(userId)},
  create:async({userId})=>{users.set(userId,{$id:userId});return users.get(userId)}
 };
 const teams={
  listMemberships:async()=>({memberships:memberIds.size?[{confirm:true}]:[]}),
  createMembership:async({userId})=>{memberIds.add(userId)}
 };
 const s=new Service({store,telegram,key:randomBytes(32).toString('base64'),now:()=>NOW,
  sendEnabled:true,verifyPaidAccess:async userId=>memberIds.has(userId),verifyAdmin:async()=>({$id:'admin'})});
 s.qris=new BotQris(s,{users:accounts,teams,tables,fetcher,enabled:true});
 await store.create('payment_settings','buatqris',{is_active:true,account_id:'fake-account',
  secret_token:'fake-secret',signing_secret:'fake-signature',api_url:'https://app.buatqris.site/api'});
 const {bot:publicBot}=await s.admin('save',{token,name:'Test bot'},'admin');
 const bot=await s.bot(publicBot.$id);
 await store.putState('telegram-settings',{...defaults,enabled:true,paused:false,dry_run:false,main_bot_id:bot.$id});
 await store.create('scene_prompts','first',{is_published:true,title:'Foto produk',prompt_text:'Prompt gratis'});
 const message=(n,text)=>({update_id:n,message:{chat:{id:2001,type:'private'},from:{id:2001,first_name:'Ibu Test'},text}});
 await s.webhook(bot.$id,s.secret(bot),message(1,'/start'));
 assert.equal(telegram.calls.some(c=>c.method==='sendMessage'&&c.body.reply_markup?.inline_keyboard?.[0]?.[0]?.callback_data==='beli'),false,'Free delivery does not advertise in-bot digital-goods QRIS');
 await s.webhook(bot.$id,s.secret(bot),message(2,'/beli'));
 assert(telegram.calls.some(c=>c.method==='sendPhoto'&&c.body.reply_markup?.inline_keyboard?.[0]?.[0]?.callback_data==='cek_qris'));
 const order=await store.state(botQrisIds.orderId('test-invoice-01'));
 assert.equal(order.status,'pending');assert.equal(order.data.telegram_id,'2001');
 await s.webhook(bot.$id,s.secret(bot),message(3,'/cek'));
 assert.equal((await store.state(order.$id)).status,'pending');
 settled=true;
 await s.webhook(bot.$id,s.secret(bot),message(4,'/cek'));
 const active=await store.state(order.$id),member=await store.get('telegram_members',id('member','2001'));
 assert.equal(active.status,'activated');assert.equal(member.plan,'premium');
 assert.equal(Date.parse(member.premium_until)-NOW,365*DAY);
 assert.equal((await store.get('member_profiles',member.appwrite_user_id)).status,'active');
 await s.webhook(bot.$id,s.secret(bot),message(5,'/beli'));
 assert.equal((await store.state(order.$id)).status,'activated');
});
