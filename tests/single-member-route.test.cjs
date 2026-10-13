const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const config=JSON.parse(fs.readFileSync(path.join(root,'vercel.json'),'utf8'));
const html=fs.readFileSync(path.join(root,'member.html'),'utf8');
const server=fs.readFileSync(path.join(root,'server.js'),'utf8');

test('one canonical Member Area route stays on mobile-first member.html',()=>{
 const canonical=config.rewrites.filter(r=>r.source==='/member');
 assert.equal(canonical.length,1);
 assert.equal(canonical[0].destination,'/member.html');
 assert.equal(config.rewrites.filter(r=>r.source==='/member-area').length,0);
 assert.match(html,/<link rel="canonical" href="https:\/\/promptional\.vercel\.app\/member">/);
 assert.match(html,/member-app-home\.css/);
 assert.match(html,/id="loginForm"/);
 assert.match(html,/id="grid"/);
});
test('all old member URLs redirect to the same canonical route',()=>{
 for(const url of ['/member-area','/member-area.html','/member.html','/akses','/akses.html']){
  const rules=config.redirects.filter(r=>r.source===url);
  assert.equal(rules.length,1,url+' must have one rule');
  assert.deepEqual(rules[0],{source:url,destination:'/member',permanent:false});
  assert.ok(server.includes("'"+url+"'"));
 }
 assert.match(server,/Location:'\/member'\+url\.search/);
});
test('access remains functional for paid members',()=>{
 for(const phrase of [
  "account.createEmailPasswordSession",
  "await loadProfile()",
  "Query.equal('is_published',true)",
  "api('session-token'"
 ]){
  const files=html+fs.readFileSync(path.join(root,'beli-premium.html'),'utf8');
  assert.ok(files.includes(phrase),phrase);
 }
});
