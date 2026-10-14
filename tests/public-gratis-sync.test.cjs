'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const page=require('../public-gratis/api/page.js');
const {cleanBP,cleanTenant,securePublicUrl,renderPrompt,renderCatalog,escape}=page._internal;
const originalFetch=global.fetch;
const originalKey=process.env.APPWRITE_RO_KEY;
const demo=(slug='demo-rose',override={})=>({
 $id:slug,data:{
  slug,brand_name:slug==='demo-rose'?'ROSE CREATIVE':'NOIR STUDIO',
  accent_color:slug==='demo-rose'?'#e94b91':'#c3984c',
  offer_title:'Mau Koleksi Prompt Lainnya?',offer_text:'Contoh promo',
  cta_label:'LIHAT PAKET',checkout_url:'',logo_url:'',
  cta_enabled:false,is_active:true,...override
 }
});
const prompt=(text,visible=true)=>({data:{
 title:'BP033',subcategory:'Burger Premium',category:'E-Commerce',
 prompt_text:text,preview_url:'https://www.dropbox.com/pic.jpg?raw=1',
 is_published:visible,sort_order:33
}});
function response(){const hdr={};return{
 statusCode:200,body:'',headers:hdr,
 setHeader(k,v){hdr[k.toLowerCase()]=v;return this},
 status(n){this.statusCode=n;return this},
 end(content){this.body=String(content||'');return this}
};}
async function request(bp,client='demo-rose'){const r=response();await page({method:'GET',query:{bp,client}},r);return r;}
function mock({text='VERSION ONE',publicRow=true,clientRow,checkoutUrl='',ctaEnabled=false}={}){
 const stats={prompts:0,clients:0};
 global.fetch=async (url,options)=>{
  assert.equal(options.headers['X-Appwrite-Key'],'FAKE_READONLY_KEY');
  if(String(url).includes('/tables/marketing_clients/rows/')){
   stats.clients++;
   return clientRow===null?{ok:false,status:404}:{ok:true,json:async()=>clientRow||demo('demo-rose',{checkout_url:checkoutUrl,cta_enabled:ctaEnabled})};
  }
  stats.prompts++;
  assert.ok(String(url).includes('/tables/scene_prompts/rows'));
  const qs=new URL(url).searchParams.getAll('queries[]').map(JSON.parse);
  assert.ok(qs.some(q=>q.method==='equal'&&q.attribute==='title'&&q.values[0]==='BP033'));
  return {ok:true,json:async()=>({rows:[prompt(text,publicRow)]})};
 };
 return stats;
}
function setup(){process.env.APPWRITE_RO_KEY='FAKE_READONLY_KEY';}
function teardown(){global.fetch=originalFetch;if(originalKey===undefined)delete process.env.APPWRITE_RO_KEY;else process.env.APPWRITE_RO_KEY=originalKey;}

test('BP and client slugs are validated; checkout URLs must be HTTPS public hosts',()=>{
 for(const code of ['BP001','BP003','BP033','BP100','BP185'])assert.equal(cleanBP(code),code);
 for(const code of ['BP000','BP186','BP2','bp033'])assert.equal(cleanBP(code),null);
 assert.equal(cleanTenant('__proto__'),null);
 assert.equal(cleanTenant('client-abc'),'client-abc');
 for(const url of ['javascript:alert(1)','http://example.com','https://localhost/path','https://127.0.0.1','https://192.168.1.1','https://user:pass@example.com'])assert.equal(securePublicUrl(url),'');
 assert.equal(securePublicUrl('https://example.com/checkout'),'https://example.com/checkout');
 assert.match(escape('<script>alert(1)</script>'),/&lt;script&gt;/);
});
test('Appwrite edits change server HTML, with no public API call or secret exposure',async()=>{
 setup();let live='VERSION ONE';const stats=mock();
 global.fetch=async(url,options)=>{
  if(String(url).includes('marketing_clients'))return {ok:true,json:async()=>demo()};
  return {ok:true,json:async()=>({rows:[prompt(live)]})};
 };
 try{
  const first=await request('BP033');assert.equal(first.statusCode,200);
  assert.match(first.body,/ROSE CREATIVE/);assert.match(first.body,/VERSION ONE/);
  assert.doesNotMatch(first.body,/APPWRITE_RO_KEY|FAKE_READONLY_KEY|fetch\(/);
  assert.match(first.headers['cache-control'],/s-maxage=60/);
  live='VERSION TWO <script>';
  const second=await request('BP033');assert.equal(second.statusCode,200);
  assert.doesNotMatch(second.body,/VERSION ONE/);
  assert.match(second.body,/VERSION TWO &lt;script&gt;/);
  assert.doesNotMatch(second.body,/VERSION TWO <script>/);
  assert.match(second.body,/id="copy"/);
 }finally{teardown();}
});
test('checkout stays OFF until cta_enabled true and valid URL is set',async()=>{
 setup();try{
  mock({checkoutUrl:'https://checkout.example.com/pay',ctaEnabled:false});
  const off=await request('BP033');
  assert.equal(off.statusCode,200);
  assert.doesNotMatch(off.body,/href="https:\/\/checkout\.example\.com\/pay"/);
  mock({checkoutUrl:'https://checkout.example.com/pay',ctaEnabled:true});
  const on=await request('BP033');
  assert.equal(on.statusCode,200);
  assert.match(on.body,/href="https:\/\/checkout\.example\.com\/pay"/);
  assert.match(on.body,/rel="noopener noreferrer"/);
  mock({checkoutUrl:'javascript:alert(1)',ctaEnabled:true});
  const bad=await request('BP033');
  assert.doesNotMatch(bad.body,/href="javascript:/);
 }finally{teardown();}
});
test('brand content and logo change per tenant, sanitized and isolated',async()=>{
 setup();let slug='demo-rose';
 global.fetch=async(url)=>{
  if(String(url).includes('marketing_clients'))return{ok:true,json:async()=>demo(slug,{
   logo_url:'https://i.ibb.co/logo.png',offer_title:'Brand special '+slug,
   brand_name:slug==='demo-rose'?'ROSE CREATIVE':'NOIR STUDIO'})};
  return {ok:true,json:async()=>({rows:[prompt('Same prompt text')]})};
 };
 try{
  const rose=await request('BP033');slug='demo-noir';const noir=await request('BP033','demo-noir');
  assert.match(rose.body,/ROSE CREATIVE/);
  assert.match(noir.body,/NOIR STUDIO/);
  assert.match(rose.body,/Brand special demo-rose/);
  assert.match(noir.body,/Brand special demo-noir/);
  assert.doesNotMatch(noir.body,/Brand special demo-rose/);
  assert.match(noir.body,/class="logo logo-img"/);
  assert.match(rose.body,/Same prompt text/);
  assert.match(noir.body,/Same prompt text/);
 }finally{teardown();}
});
test('inactive client, missing client and unpublished prompt fail closed',async()=>{
 setup();try{
  let stats=mock({clientRow:demo('demo-rose',{is_active:false})});
  const inactive=await request('BP033');assert.equal(inactive.statusCode,404);
  assert.equal(stats.prompts,0);
  stats=mock({clientRow:null});
  const absent=await request('BP033');assert.equal(absent.statusCode,404);
  assert.equal(stats.prompts,0);
  stats=mock({publicRow:false});
  const privatePrompt=await request('BP033');assert.equal(privatePrompt.statusCode,404);
  assert.doesNotMatch(privatePrompt.body,/VERSION ONE/);
  const invalid=await request('BP999');assert.equal(invalid.statusCode,404);
  assert.equal(stats.prompts,1);
 }finally{teardown();}
});
test('Appwrite outage displays friendly HTML and never leaks credential',async()=>{
 setup();global.fetch=async()=>({ok:false,status:503});
 try{
  const failed=await request('BP033');assert.equal(failed.statusCode,503);
  assert.match(failed.body,/Konten sedang diperbarui/);
  assert.doesNotMatch(failed.body,/FAKE_READONLY_KEY/);
  assert.equal(failed.headers['cache-control'],'no-store');
 }finally{teardown();}
});
test('catalog renders 185 brand-specific links without inline prompt texts',()=>{
 const rows=Array.from({length:185},(_,i)=>({code:'BP'+String(i+1).padStart(3,'0'),title:'Demo '+i,category:'Demo'}));
 const html=renderCatalog({entries:rows,tenant:{slug:'new-client',name:'TEST CLIENT',accent:'#123456',logoUrl:''}});
 assert.equal((html.match(/class="catalog-item"/g)||[]).length,185);
 assert.match(html,/\/c\/new-client\/p\/BP185/);
 assert.doesNotMatch(html,/APPWRITE_RO_KEY/);
});


test('homepage defaults to PROMPTIONAL with its own branded catalog',async()=>{
 setup();
 const catalogRows=Array.from({length:185},(_,i)=>({data:{
  title:'BP'+String(i+1).padStart(3,'0'),subcategory:'Prompt '+(i+1),category:'AI',is_published:true
 }}));
 global.fetch=async(url)=>{
  if(String(url).includes('/tables/marketing_clients/rows/promptional'))return {ok:true,json:async()=>demo('promptional',{
   brand_name:'PROMPTIONAL',accent_color:'#ff852a',
   logo_url:'https://promptional.vercel.app/assets/promptional-icon.svg',
   offer_title:'Upgrade ke PROMPTIONAL Premium',
   checkout_url:'https://promptional.vercel.app/beli-premium.html',cta_enabled:true})};
  const queries=new URL(url).searchParams.getAll('queries[]').map(JSON.parse);
  const offset=queries.find(x=>x.method==='offset')?.values?.[0]||0;
  return {ok:true,json:async()=>({rows:catalogRows.slice(offset,offset+100)})};
 };
 try {
  const resp=response();
  await page({method:'GET',query:{catalog:'1'}},resp);
  assert.equal(resp.statusCode,200);
  assert.match(resp.body,/PROMPTIONAL/);
  assert.match(resp.body,/185 Prompt AI Gratis/);
  assert.match(resp.body,/\/c\/promptional\/p\/BP185/);
  assert.match(resp.body,/promptional-icon.svg/);
  assert.doesNotMatch(resp.body,/ROSE CREATIVE|NOIR STUDIO/);
 }finally{teardown();}
});
