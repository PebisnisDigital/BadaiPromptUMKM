'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const handler=require('../api/admin-brands.js');
const {checkedUrl,normalize,slugValid}=handler._test;
const originalFetch=global.fetch, originalKey=process.env.BRAND_ADMIN_APPWRITE_KEY;
const token='a'.repeat(40);
function cleanup(){global.fetch=originalFetch;if(originalKey===undefined)delete process.env.BRAND_ADMIN_APPWRITE_KEY;else process.env.BRAND_ADMIN_APPWRITE_KEY=originalKey;}
function request(action,params={},authorization='Bearer '+token){
 const req={method:'POST',headers:{authorization},body:{action,...params}};
 const res={statusCode:200,headers:{},jsonBody:null,
  setHeader(name,value){this.headers[name]=value;return this},
  status(n){this.statusCode=n;return this},
  json(data){this.jsonBody=data;return this},
  end(data){this.jsonBody=data;return this}};
 return {req,res};
}
const brand=(overrides={})=>({
 slug:'promptional',brand_name:'PROMPTIONAL',accent_color:'#ff852a',
 logo_url:'https://promptional.vercel.app/assets/promptional-icon.svg',
 offer_title:'Upgrade ke PROMPTIONAL Premium',offer_text:'Koleksi prompt AI siap pakai.',
 checkout_url:'https://promptional.vercel.app/beli-premium.html',
 cta_label:'BELI PROMPTIONAL PREMIUM',cta_enabled:true,is_active:true,...overrides
});
function setupFetch({confirmed=true,accountId='user-admin',isMember=true,rows=[]}={}){
 const calls=[];
 process.env.BRAND_ADMIN_APPWRITE_KEY='FAKE_BRAND_ADMIN_KEY';
 global.fetch=async (url,options)=>{
  calls.push({url:String(url),options});
  const u=String(url);
  let body,status=200;
  if(u.endsWith('/account'))body={$id:accountId,email:'owner@example.com'};
  else if(u.includes('/teams/admin-users/memberships'))body={memberships:isMember?[{
    userId:accountId,teamId:'admin-users',confirm:confirmed,$id:'membership1',roles:['admin']
   }]:[]};
  else if(u.includes('/tables/marketing_clients/rows')){
    if(options.method==='POST'||options.method==='PATCH')body={$id:'promptional'};
    else body={rows:rows.map(row=>({$id:row.slug,...row}))};
  }else throw Error('Unexpected Appwrite URL '+u);
  return {ok:status===200,status,json:async()=>body};
 };
 return calls;
}
test('valid brand normalization and HTTPS-only checkout validation',()=>{
 const a=normalize(brand());
 assert.equal(a.slug,'promptional');
 assert.equal(a.cta_enabled,true);
 assert.equal(a.checkout_url,'https://promptional.vercel.app/beli-premium.html');
 assert.equal(checkedUrl('https://example.com'), 'https://example.com/');
 for(const bad of ['http://example.com','javascript:alert(1)','https://localhost','https://127.0.0.1','https://10.0.0.1','https://172.16.0.1','https://192.168.0.1','https://[::1]','https://me:pass@example.com'])assert.equal(checkedUrl(bad),null,bad);
 for(const s of ['__proto__','../hack','x','BP033<script>'])assert.equal(slugValid(s),false);
 assert.throws(()=>normalize(brand({checkout_url:'javascript:alert(1)'})),/HTTPS/);
 assert.throws(()=>normalize(brand({cta_enabled:true,checkout_url:''})),/checkout resmi/);
 assert.throws(()=>normalize(brand({accent_color:'red'})),/warna/);
});
test('unauthenticated requests are rejected before any Appwrite read/write',async()=>{
 const calls=setupFetch();
 try{
  const {req,res}=request('list',{},'');
  await handler(req,res);
  assert.equal(res.statusCode,401);
  assert.equal(calls.length,0);
 }finally{cleanup();}
});
test('JWT must correspond to confirmed Appwrite admin-users membership',async()=>{
 const calls=setupFetch({confirmed:false});
 try{
  const {req,res}=request('save',{brand:brand()});
  await handler(req,res);
  assert.equal(res.statusCode,403);
  assert.equal(calls.filter(c=>/tables\/marketing_clients/.test(c.url)).length,0);
 }finally{cleanup();}
});
test('unlisted member does not get permission to change checkout URL',async()=>{
 const calls=setupFetch({isMember:false});
 try{
  const {req,res}=request('save',{brand:brand({checkout_url:'https://attacker.example/pay'})});
  await handler(req,res);
  assert.equal(res.statusCode,403);
  assert.equal(calls.filter(c=>c.options.method==='POST'&&c.url.includes('/rows')).length,0);
 }finally{cleanup();}
});
test('admin can list existing brands without exposing secrets',async()=>{
 const calls=setupFetch({rows:[brand(),brand({slug:'noir',brand_name:'NOIR',cta_enabled:false})]});
 try{
  const {req,res}=request('list');
  await handler(req,res);
  assert.equal(res.statusCode,200);
  assert.equal(res.jsonBody.rows.length,2);
  assert.equal(res.jsonBody.rows[0].brand_name,'NOIR');
  assert.equal(res.jsonBody.rows[1].slug,'promptional');
  assert.doesNotMatch(JSON.stringify(res.jsonBody),/FAKE_BRAND_ADMIN_KEY|owner@example.com/);
  assert.ok(calls.some(c=>c.url.includes('/teams/admin-users/memberships')));
 }finally{cleanup();}
});
test('admin creates new brand without changing another; fixed slug for edits',async()=>{
 const calls=setupFetch();
 try{
  const {req,res}=request('save',{brand:brand({slug:'toko-cantik',brand_name:'Toko Cantik',cta_enabled:false,checkout_url:''})});
  await handler(req,res);
  assert.equal(res.statusCode,200);
  assert.equal(res.jsonBody.created,true);
  const sent=calls.find(c=>c.url.endsWith('/tables/marketing_clients/rows'));
  assert.equal(sent.options.method,'POST');
  const json=JSON.parse(sent.options.body);
  assert.equal(json.rowId,'toko-cantik');
  assert.equal(json.data.brand_name,'Toko Cantik');
  assert.equal(json.data.cta_enabled,false);
  const update=request('save',{brand:brand(),existing_slug:'promptional'});
  await handler(update.req,update.res);
  assert.equal(update.res.statusCode,200);
  assert.equal(update.res.jsonBody.created,false);
  assert.ok(calls.some(c=>c.url.endsWith('/rows/promptional')&&c.options.method==='PATCH'));
  const rename=request('save',{brand:brand({slug:'new-promptional'}),existing_slug:'promptional'});
  await handler(rename.req,rename.res);
  assert.equal(rename.res.statusCode,400);
 }finally{cleanup();}
});
test('unconfigured brand API key fails closed and exposes no secret',async()=>{
 const calls=setupFetch();
 delete process.env.BRAND_ADMIN_APPWRITE_KEY;
 try{
  const {req,res}=request('list');
  await handler(req,res);
  assert.equal(res.statusCode,503);
  assert.doesNotMatch(JSON.stringify(res.jsonBody),/FAKE_BRAND_ADMIN_KEY/);
  assert.equal(calls.length,1);
 }finally{cleanup();}
});
