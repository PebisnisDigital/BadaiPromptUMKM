'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const page=require('../public-gratis/api/page.js');
const {cleanBP,cleanTenant,renderPrompt,renderCatalog,escape}=page._internal;
const originalFetch=global.fetch;
const originalKey=process.env.APPWRITE_RO_KEY;

function res(){
 const hdr={};return {
  statusCode:200,body:'',headers:hdr,
  setHeader(k,v){hdr[k.toLowerCase()]=v;return this},
  status(n){this.statusCode=n;return this},
  end(content){this.body=String(content||'');return this}
 };
}
function sample(text,visible=true){return {data:{
  title:'BP033',subcategory:'Burger Premium',category:'E-Commerce',
  prompt_text:text,preview_url:'https://www.dropbox.com/pic.jpg?raw=1',
  is_published:visible,sort_order:33
 }};}
async function request(bp,client='demo-rose'){
 const response=res();
 await page({method:'GET',query:{bp,client}},response);
 return response;
}
test('strict allowlist 185 BPs, known tenant and XSS escaping',()=>{
 for(const b of ['BP001','BP003','BP033','BP100','BP185'])assert.equal(cleanBP(b),b);
 for(const b of ['BP000','BP186','BP2','bp033','BP033<script>'])assert.equal(cleanBP(b),null);
 assert.equal(cleanTenant('__proto__'),null);
 assert.match(escape('<script>alert(1)</script>'),/&lt;script&gt;/);
});
test('server HTML changes when Appwrite prompt changes; client makes no fetch',async()=>{
 process.env.APPWRITE_RO_KEY='TEST_KEY_NOT_REAL';
 let live='VERSION ONE';
 global.fetch=async u=>{
  const qs=new URL(u).searchParams.getAll('queries[]').map(JSON.parse);
  assert.ok(qs.some(q=>q.method==='equal'&&q.attribute==='title'&&q.values[0]==='BP033'));
  return {ok:true,json:async()=>({rows:[sample(live)]})};
 };
 try{
  const first=await request('BP033');
  assert.equal(first.statusCode,200);
  assert.match(first.body,/VERSION ONE/);
  assert.doesNotMatch(first.body,/APPWRITE_RO_KEY|TEST_KEY_NOT_REAL|fetch\(/);
  assert.match(first.headers['cache-control'],/s-maxage=60/);
  live='VERSION TWO <script>';
  const next=await request('BP033');
  assert.equal(next.statusCode,200);
  assert.doesNotMatch(next.body,/VERSION ONE/);
  assert.match(next.body,/VERSION TWO &lt;script&gt;/);
  assert.doesNotMatch(next.body,/VERSION TWO <script>/);
  assert.match(next.body,/id="copy"/);
 }finally{global.fetch=originalFetch;process.env.APPWRITE_RO_KEY=originalKey;}
});
test('unpublished data is not exposed, unknown code fails closed',async()=>{
 process.env.APPWRITE_RO_KEY='TEST_KEY_NOT_REAL';
 let calls=0;
 global.fetch=async()=>{calls++;return {ok:true,json:async()=>({rows:[sample('HIDDEN PREMIUM',false)]})}};
 try{
  const r=await request('BP033');
  assert.equal(r.statusCode,404);
  assert.doesNotMatch(r.body,/HIDDEN PREMIUM/);
  const n=await request('BP999');
  assert.equal(n.statusCode,404);
  assert.equal(calls,1);
 }finally{global.fetch=originalFetch;process.env.APPWRITE_RO_KEY=originalKey;}
});
test('read-only API error renders friendly HTML, never leaks credential',async()=>{
 process.env.APPWRITE_RO_KEY='TEST_KEY_NOT_REAL';
 global.fetch=async()=>({ok:false,status:503});
 try{
  const r=await request('BP033');
  assert.equal(r.statusCode,503);
  assert.match(r.body,/Konten sedang diperbarui/);
  assert.doesNotMatch(r.body,/TEST_KEY_NOT_REAL/);
  assert.equal(r.headers['cache-control'],'no-store');
 }finally{global.fetch=originalFetch;process.env.APPWRITE_RO_KEY=originalKey;}
});
test('catalog renders 185 cards with no inline prompt texts',()=>{
 const rows=Array.from({length:185},(_,i)=>({code:'BP'+String(i+1).padStart(3,'0'),title:'Demo '+i,category:'Demo'}));
 const html=renderCatalog({entries:rows,tenant:{slug:'demo-rose',name:'ROSE',accent:'#e94b91'}});
 assert.equal((html.match(/class="catalog-item"/g)||[]).length,185);
 assert.match(html,/BP185/);
 assert.doesNotMatch(html,/APPWRITE_RO_KEY/);
});
