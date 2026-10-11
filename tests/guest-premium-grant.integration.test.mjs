import test from 'node:test';
import assert from 'node:assert/strict';
import {grantGuestWebsitePremium} from '../functions/activate-member/src/telegram/guest-premium-grant.mjs';
import {id} from '../functions/activate-member/src/telegram/security.mjs';

const paid=()=>({$id:id('website-qris','fake-guest-tx'),kind:'website_order',status:'paid',data:{
 checkout_type:'guest',guest_session_id:'guest-session',first_name:'Ibu Rina',whatsapp:'081234567890',
 transaction_id:'fake-guest-tx',amount:199000,total_amount:199000,is_test:true,paid_at:'2026-10-10T12:00:00Z'}});
function fixture(){
 const docs=new Map(),users=new Map(),teams=new Set();let membershipCreates=0,profileCreates=0,userCreates=0;
 const key=(t,k)=>t+':'+k;const order=paid();
 const save=(t,k,r)=>{docs.set(key(t,k),{$id:k,...r});return docs.get(key(t,k))};
 save('telegram_state',order.$id,{...order,payload:JSON.stringify(order.data)});
 const store={
  async get(t,k){return docs.get(key(t,k))||null},
  async state(k){const r=docs.get(key('telegram_state',k));return r?{...r,data:JSON.parse(r.payload||'{}')}:null},
  async claim(k,r){if(docs.has(key('telegram_state',k)))return null;return save('telegram_state',k,r)},
  async update(t,k,r){const old=docs.get(key(t,k));if(!old)throw Error('missing');return save(t,k,{...old,...r})}
 };
 const service={
  store,users:{
   async get({userId}){if(!users.has(userId))throw Object.assign(Error('missing'),{code:404});return users.get(userId)},
   async create({userId,name}){userCreates++;users.set(userId,{$id:userId,name});return users.get(userId)}
  },
  teams:{
   async listMemberships(){return {memberships:[...teams].map(userId=>({userId,confirm:true}))}},
   async createMembership({userId}){membershipCreates++;teams.add(userId)}
  },
  tables:{async createRow({tableId,rowId,data}){assert.equal(tableId,'member_profiles');profileCreates++;return save(tableId,rowId,data)}}
 };
 return {service,order,users,docs,counts:()=>({membershipCreates,profileCreates,userCreates})};
}
test('verified sandbox payment creates one Appwrite user, one paid team membership and active annual profile',async()=>{
 const t=fixture();
 const first=await grantGuestWebsitePremium(t.service,t.order);
 assert.equal(first.status,'activated');
 const userId=id('guest-user',t.order.$id);
 assert.equal(first.data.user_id,userId);
 const profile=t.docs.get('member_profiles:'+userId);
 assert.equal(profile.whatsapp,'081234567890');assert.equal(profile.status,'active');
 assert.equal(Date.parse(profile.access_until)-Date.parse(t.order.data.paid_at),365*86400000);
 assert.deepEqual(t.counts(),{membershipCreates:1,profileCreates:1,userCreates:1});
 const second=await grantGuestWebsitePremium(t.service,first);
 assert.equal(second.status,'activated');
 assert.deepEqual(t.counts(),{membershipCreates:1,profileCreates:1,userCreates:1});
});
test('pending or fake live payment cannot mint a paid Appwrite member',async()=>{
 for(const change of [{status:'pending'},{data:{...paid().data,is_test:false}},{data:{...paid().data,amount:999}}]){
  const t=fixture();await assert.rejects(grantGuestWebsitePremium(t.service,{...t.order,...change}),/belum lunas/);
  assert.deepEqual(t.counts(),{membershipCreates:0,profileCreates:0,userCreates:0});
 }
});
test('guest endpoint is disabled by default and cannot request sandbox QRIS',async()=>{
 const mod=await import('../api/guest-checkout.js');
 const handler=mod.default||mod;
 const before=process.env.BADAI_GUEST_SANDBOX_ENABLED;
 delete process.env.BADAI_GUEST_SANDBOX_ENABLED;
 try{
  let status,payload;
  const res={setHeader(){},status(n){status=n;return this},json(o){payload=o;return this}};
  await handler({method:'POST',query:{action:'create'},headers:{origin:'https://badaiprompt.vercel.app'}},res);
  assert.equal(status,503);assert.equal(payload.ok,false);
 }finally{if(before!==undefined)process.env.BADAI_GUEST_SANDBOX_ENABLED=before}
});
