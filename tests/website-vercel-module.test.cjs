const test=require('node:test');
const assert=require('node:assert/strict');

// Vercel treats /api/*.js entries as CommonJS. A static ESM import breaks
// production with ERR_REQUIRE_ESM before the handler can return JSON.
test('Login and QRIS entrypoints can be loaded by the CommonJS runtime',()=>{
 const login=require('../api/website-login.js');
 const checkout=require('../api/website-checkout.js');
 assert.equal(typeof login,'function');
 assert.equal(typeof checkout,'function');
 assert.equal(checkout.config.api.bodyParser,false);
});

function fakeResponse(){
 const result={statusCode:200,body:null,headers:{}};
 return {
  result,
  setHeader(name,value){result.headers[name]=value;return this;},
  status(code){result.statusCode=code;return this;},
  json(body){result.body=body;return this;},
  redirect(code,url){result.statusCode=code;result.url=url;return this;}
 };
}

test('GET login config returns JSON without importing ESM services or charging QRIS',async()=>{
 const login=require('../api/website-login.js');
 const res=fakeResponse();
 const prev=process.env.TELEGRAM_WEBSITE_LOGIN_ENABLED;
 process.env.TELEGRAM_WEBSITE_LOGIN_ENABLED='false';
 try{
  await login({method:'GET',query:{action:'config'},headers:{}},res);
  assert.equal(res.result.statusCode,200);
  assert.equal(res.result.body.ok,true);
  assert.equal(res.result.body.enabled,false);
  assert.equal(res.result.body.price,199000);
 }finally{
  if(prev===undefined)delete process.env.TELEGRAM_WEBSITE_LOGIN_ENABLED;
  else process.env.TELEGRAM_WEBSITE_LOGIN_ENABLED=prev;
 }
});

test('GET independent QRIS config returns disabled JSON without creating an invoice',async()=>{
 const checkout=require('../api/website-checkout.js');
 const res=fakeResponse();
 const old=process.env.TELEGRAM_SITE_CHECKOUT_ENABLED;
 process.env.TELEGRAM_SITE_CHECKOUT_ENABLED='false';
 try{
  await checkout({method:'GET',query:{action:'config'},headers:{}},res);
  assert.equal(res.result.statusCode,200);
  assert.equal(res.result.body.ok,true);
  assert.equal(res.result.body.enabled,false);
  assert.equal(res.result.body.price,199000);
 }finally{
  if(old===undefined)delete process.env.TELEGRAM_SITE_CHECKOUT_ENABLED;
  else process.env.TELEGRAM_SITE_CHECKOUT_ENABLED=old;
 }
});
