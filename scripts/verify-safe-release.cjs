// Opt-in integration rehearsal: real Appwrite, locally served candidate assets
// and Vercel POST handlers. Secrets belong only in an ignored mode-0600 config.
// Never log requests, response bodies, credentials or customer information.
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),{ProxyAgent,setGlobalDispatcher}=require('undici');
const {Client,TablesDB}=require('node-appwrite');
const root=path.resolve(__dirname,'..'),configPath=process.env.RELEASE_SMOKE_CONFIG;
if(!configPath)throw Error('RELEASE_SMOKE_CONFIG must name an ignored temporary credential file.');
if((fs.statSync(configPath).mode&0o077)!==0)throw Error('Temporary credential config must have mode 0600.');
const config=JSON.parse(fs.readFileSync(configPath,'utf8'));
if(process.env.HTTPS_PROXY)setGlobalDispatcher(new ProxyAgent(process.env.HTTPS_PROXY));
Object.assign(process.env,{APPWRITE_API_KEY:config.serverKey,TELEGRAM_MASTER_KEY:config.masterKey,TELEGRAM_ENABLED:'false',TELEGRAM_SEND_ENABLED:'false'});
let browser,tables,telegramAttempts=0;const results=[],ownedStateRows=new Set();
const passed=(name,detail)=>{results.push({name,status:'pass',detail});console.log('PASS: '+name)};
const fetchBefore=global.fetch;
global.fetch=(url,options)=>{if(new URL(String(url)).hostname==='api.telegram.org'){telegramAttempts++;throw Error('Real Telegram is forbidden during release rehearsal.')}return fetchBefore(url,options)};
async function invoke(name,method,headers={},body={},query={}){
 let status=200,payload;await require(path.join(root,'api/telegram/'+name+'.js'))({method,headers,body,query},{setHeader(){},status(code){status=code;return this},json(value){payload=value;return this}});return {status,payload};
}
async function preparePage(context){
 const page=await context.newPage();page.errors=[];page.on('pageerror',e=>page.errors.push(e.name));
 await page.route(config.origin+'/**',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.pathname.startsWith('/api/telegram/')){const response=await invoke(url.pathname.split('/').at(-1),request.method(),{...request.headers(),host:url.host},request.postDataJSON()||{},Object.fromEntries(url.searchParams));return route.fulfill({status:response.status,json:response.payload})}
  let file=url.pathname==='/'?'/index.html':url.pathname;if(['/admin','/member'].includes(file))file+='.html';const absolute=path.join(root,file);
  return absolute.startsWith(root+path.sep)&&fs.existsSync(absolute)&&fs.statSync(absolute).isFile()?route.fulfill({path:absolute}):route.abort();
 });
 // No order creation/check, recovery, profile/favorite/settings or customer write.
 await page.route('https://sgp.cloud.appwrite.io/**',route=>{
  const req=route.request(),u=new URL(req.url()),method=req.method();if(['GET','OPTIONS'].includes(method))return route.continue();
  if(method==='POST'&&['/v1/account/sessions/email','/v1/account/jwts'].includes(u.pathname))return route.continue();
  if(method==='POST'&&u.pathname==='/v1/functions/payment-api/executions'&&['/config','/social-proof','/admin/settings/get','/admin/payment/get','/admin/coupons/list','/admin/self/get','/admin/team/list'].includes(req.postDataJSON().path))return route.continue();
  return route.abort();
 });
 await page.route('https://api.telegram.org/**',r=>{telegramAttempts++;return r.abort()});await page.route('https://fonts.googleapis.com/**',r=>r.abort());return page;
}
(async()=>{
 const {Store}=await import('../functions/activate-member/src/telegram/store.mjs');const create=Store.prototype.create;
 Store.prototype.create=async function(table,id,data){const row=await create.call(this,table,id,data);if(table==='telegram_state'&&data.kind==='rate')ownedStateRows.add(id);return row};
 tables=new TablesDB(new Client().setEndpoint('https://sgp.cloud.appwrite.io/v1').setProject('badai-prompt-umkm').setKey(config.serverKey));
 const tx=await tables.createTransaction({ttl:60});await tables.updateTransaction({transactionId:tx.$id,rollback:true});passed('Real transaction scope','Empty transaction rolled back using the narrowly scoped server key; no customer writes.');
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox'],proxy:process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY}:undefined});
 const memberContext=await browser.newContext({viewport:{width:390,height:900}}),member=await preparePage(memberContext);
 await member.goto(config.origin+'/member');await member.waitForFunction(()=>!document.getElementById('loading').classList.contains('show'));assert.equal(await member.locator('#gate').isVisible(),true);
 await member.locator('#loginEmail').fill(config.user.email);await member.locator('#loginPassword').fill(config.password);await member.locator('#loginForm').evaluate(form=>form.requestSubmit());
 await member.waitForFunction(()=>document.getElementById('gate').classList.contains('hide'),{},{timeout:30000});await member.waitForFunction(()=>document.querySelectorAll('.card').length>0,{},{timeout:30000});assert.equal(await member.evaluate(()=>currentProfile.access_until),null);
 const memberJWT=await member.evaluate(async()=>(await account.createJWT()).jwt);passed('Real member password login and library','Registered preview origin accepted; controlled legacy lifetime profile and paid-team access load published prompts.');
 await member.locator('#accountBtn').click();await member.locator('#tgLinkBtn').click();await member.waitForFunction(()=>document.getElementById('tgLinkMsg').textContent.includes('Bot utama belum aktif'));passed('Member Telegram link fails safely','Verified request returns 503 without a main bot; no START or message.');assert.deepEqual(member.errors,[]);
 await member.goto(config.origin+'/admin');await member.waitForFunction(()=>!document.getElementById('loading').classList.contains('show'));assert.equal(await member.locator('#gate').isVisible(),true);passed('Real nonadmin denied admin page','Authenticated paid member cannot access admin team.');
 const h={host:new URL(config.origin).host,origin:config.origin};
 for(const name of ['manager','link']){assert.equal((await invoke(name,'POST',{...h,'x-appwrite-user-id':'forged-admin'},{action:'overview'})).status,401);assert.equal((await invoke(name,'POST',{...h,authorization:'Bearer forged-jwt'},{action:'overview'})).status,401);assert.equal((await invoke(name,'POST',{...h,origin:'https://attacker.invalid'},{action:'overview'})).status,403);assert.equal((await invoke(name,'GET',h)).status,405)}
 assert.equal((await invoke('manager','POST',{...h,authorization:'Bearer '+memberJWT},{action:'overview'})).status,403);passed('Candidate endpoint security','Real Appwrite rejects forged JWT 401, confirmed nonadmin 403, wrong Origin 403, GET 405.');
 const adminContext=await browser.newContext({viewport:{width:1280,height:950}}),admin=await preparePage(adminContext);await admin.goto(config.origin+'/admin');await admin.waitForFunction(()=>!document.getElementById('loading').classList.contains('show'));
 await admin.locator('#loginEmail').fill(config.admin.email);await admin.locator('#loginPassword').fill(config.adminPassword);await admin.locator('#loginForm').evaluate(form=>form.requestSubmit());await admin.waitForFunction(()=>document.getElementById('gate').classList.contains('hide'),{},{timeout:30000});await admin.waitForFunction(()=>!document.getElementById('loading').classList.contains('show'));
 await admin.locator('[data-view=telegram]').click();await admin.waitForFunction(()=>document.getElementById('tgStats').children.length===10,{},{timeout:30000});assert.match(await admin.locator('#tgAutomationState').innerText(),/NONAKTIF.*SIMULASI.*NONAKTIF/);assert.equal(await admin.locator('#tgToken').getAttribute('type'),'password');assert.equal(await admin.locator('#tgToken').inputValue(),'');assert.equal(await admin.evaluate(()=>Object.keys(localStorage).some(k=>/telegram|token|jwt/i.test(k))),false);
 passed('Real admin password login and dashboard','Controlled temporary admin uses real email/password session, fresh JWT and confirmed admin team; actual database data loads.');
 await admin.locator('#tgDryTest').click();await admin.waitForFunction(()=>document.getElementById('tgStatus').textContent.includes('tanpa mengirim pesan'));assert.deepEqual(admin.errors,[]);passed('Safe scheduler and token form','Disabled, paused, dry-run; masked empty token; no JWT/token storage.');
 const health=await invoke('health','GET');assert.equal(health.status,200);assert.equal(health.payload.sending_enabled,false);assert.equal((await invoke('webhook','POST',h)).status,400);assert.equal((await invoke('webhook','GET',h)).status,405);assert.equal(telegramAttempts,0);passed('Zero real Telegram calls','Rehearsal rejects real transport; observed attempts=0.');
})().catch(e=>{results.push({name:'Release rehearsal',status:'fail',error:e.name+': '+String(e.message).replace(/https?:\/\/\S+/g,'[URL]')});console.error('Release rehearsal failed: '+e.name);process.exitCode=1}).finally(async()=>{
 if(browser)await browser.close();if(tables)for(const rowId of ownedStateRows)await tables.deleteRow({databaseId:'badai_prompt_umkm',tableId:'telegram_state',rowId}).catch(()=>{process.exitCode=1});
 const output=path.join(root,'work/release/smoke-results.json');fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify({at:new Date().toISOString(),origin:config.origin,candidateAssets:'local reviewed source',appwrite:'real',productionDeploymentChanged:false,telegramAttempts,results},null,2));
});
