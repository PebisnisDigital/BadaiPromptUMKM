import test from 'node:test';
import assert from 'node:assert/strict';
import {TelegramLogin} from '../functions/activate-member/src/telegram/login.mjs';
import {id} from '../functions/activate-member/src/telegram/security.mjs';

const BOT={$id:'main-bot'};
const TIME=1791600000000;
const premium=(tg='123456789')=>({$id:id('member',tg),telegram_id:tg,chat_id:tg,first_name:'Teh Vini',plan:'premium',premium_until:new Date(TIME+100*86400000).toISOString(),is_active:true,appwrite_user_id:null});
function make({enabled=true,member=premium(),clock=TIME,existingUser=false}={}){
 const rows=new Map(),members=new Map([[member.$id,member]]),events=[];
 const users={
  async create({userId,name}){events.push(['create',userId,name]);if(existingUser){throw {code:409}}return {$id:userId,name}},
  async get({userId}){events.push(['get',userId]);return {$id:userId,name:'Teh Vini',email:''}},
  async createToken({userId,length,expire}){events.push(['token',userId,length,expire]);return {userId,secret:'secret-from-appwrite'}}
 };
 const store={
  async get(table,key){if(table==='telegram_members')return members.get(key)||null;return null},
  async state(key){let x=rows.get(key);return x?{...x,data:JSON.parse(x.payload||'{}')}:null},
  async claim(key,data){if(rows.has(key))return null;const row={$id:key,...data};rows.set(key,row);return row},
  async update(table,key,data){if(table==='telegram_members'){let m={...members.get(key),...data};members.set(key,m);return m};let d=rows.get(key);if(!d)throw Error('not found');d={...d,...data};rows.set(key,d);return d}
 };
 const s={
  now:()=>clock,passwordlessEnabled:enabled,store,grantPaidAccess:()=>{},
  sync:async m=>m,consent:async()=>({status:'allowed'}),qris:{grant:async()=>events.push(['grant'])}
 };
 return {login:new TelegramLogin(s,users),store,rows,events,members,s,users,member,setClock:t=>{clock=t}};
}
test('must not issue a login for Free or expired member',async()=>{
 const free=premium();free.plan='free';const f=make({member:free});
 await assert.rejects(()=>f.login.issue(f.member,BOT),/Premium/);
 const expired=premium();expired.premium_until=new Date(TIME-1000).toISOString();
 const e=make({member:expired});await assert.rejects(()=>e.login.issue(e.member,BOT),/Premium/);
 assert.equal(f.events.length,0);
});
test('login is disabled by default and cannot redeem when gated off',async()=>{
 const x=make({enabled:false});await assert.rejects(()=>x.login.issue(x.member,BOT),/diaktifkan/);
 await assert.rejects(()=>x.login.redeem('a'.repeat(32)),/tersedia/);
});
test('verified private-chat member is provisioned without a fabricated email',async()=>{
 const x=make();const link=await x.login.issue(x.member,BOT);
 assert.match(link.url,/^https:\/\/badaiprompt\.vercel\.app\/telegram-login\.html#code=[\w-]+$/);
 const uid=x.login.userId(x.member.telegram_id);
 assert.ok(x.events.some(y=>y[0]==='create'&&y[1]===uid));
 assert.equal(x.members.get(x.member.$id).appwrite_user_id,uid);
 assert.ok(x.rows.has(id('userlink',uid)));
 assert.ok(x.rows.has(id('tglink',x.member.telegram_id)));
 const code=new URL(link.url.replace('#code=','?code=')).searchParams.get('code');
 const data=await x.login.redeem(code);
 assert.equal(data.userId,uid);assert.equal(data.secret,'secret-from-appwrite');
 assert.ok(x.events.some(y=>y[0]==='token'&&y[2]===32&&y[3]===180));
 await assert.rejects(()=>x.login.redeem(code),/digunakan/);
});
test('expired links and invalid secrets are rejected without minting Appwrite tokens',async()=>{
 const x=make();const link=await x.login.issue(x.member,BOT);
 const code=link.url.split('#code=')[1];x.setClock(TIME+301000);
 await assert.rejects(()=>x.login.redeem(code),/kedaluwarsa/);
 await assert.rejects(()=>x.login.redeem('not-secret'),/tidak valid/);
 assert.equal(x.events.filter(y=>y[0]==='token').length,0);
});
test('preexisting unrelated Appwrite account is never silently claimed',async()=>{
 const x=make({existingUser:true});
 await assert.rejects(()=>x.login.issue(x.member,BOT),/sudah digunakan/);
 assert.equal(x.members.get(x.member.$id).appwrite_user_id,null);
 assert.ok(!x.events.some(y=>y[0]==='token'));
});
test('browser code cannot change Telegram member or user ID',async()=>{
 const x=make();const link=await x.login.issue(x.member,BOT);
 const code=link.url.split('#code=')[1];
 const uid=x.login.userId(x.member.telegram_id);
 x.members.set(x.member.$id,{...x.members.get(x.member.$id),appwrite_user_id:'someone_else'});
 await assert.rejects(()=>x.login.redeem(code),/tidak cocok/);
 assert.equal(x.events.filter(y=>y[0]==='token').length,0);
});
