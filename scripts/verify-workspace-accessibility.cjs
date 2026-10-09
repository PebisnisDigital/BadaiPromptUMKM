const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert').strict;
const root=path.resolve(__dirname,'..'),out=process.env.UI_ARTIFACTS||path.resolve(root,'../work/member-admin');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 async function open(surface,width,height,test){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
  page.errors=[];page.on('pageerror',e=>page.errors.push(e.message));
  await page.route('https://badaiprompt.vercel.app/**',r=>{
   const url=new URL(r.request().url());let f=root+url.pathname;if(['/member','/admin'].includes(url.pathname))f+='.html';
   if(url.pathname.includes('appwrite-28.1.0'))f=root+'/tests/fixtures/workspace-appwrite.js';
   if(fs.existsSync(f))return r.fulfill({path:f,contentType:f.endsWith('.html')?'text/html':f.endsWith('.css')?'text/css':'application/javascript'});return r.abort();
  });
  await page.route('https://sgp.cloud.appwrite.io/**',r=>{const fid=new URL(r.request().url()).pathname.split('/').at(-2),f=out+'/'+fid+'.webp';return fs.existsSync(f)?r.fulfill({path:f,contentType:'image/webp'}):r.abort()});
  await page.goto('https://badaiprompt.vercel.app/'+surface+'?test='+test,{waitUntil:'networkidle'});return page;
 }
 for(const surface of ['member','admin']){
  const p=await open(surface,390,320,'login');
  assert.equal(await p.locator('.shell,.app').evaluate(el=>el.inert),true);
  assert.equal(await p.locator('.bottomnav').evaluate(el=>el.inert),true);
  await p.keyboard.press('Shift+Tab');assert.equal(await p.evaluate(()=>!!document.activeElement.closest('#gate')),true);
  await p.keyboard.press('Tab');assert.equal(await p.evaluate(()=>!!document.activeElement.closest('#gate')),true);
  await p.keyboard.press('Escape');assert.equal(await p.locator('#gate').isVisible(),true);
  await p.locator(surface==='member'?'#forgotBtn':'#forgotBtn').focus();
  assert.equal(await p.locator('#forgotBtn').evaluate(el=>{const r=el.getBoundingClientRect();return r.bottom<=innerHeight&&r.top>=0}),true);
  assert.deepEqual(p.errors,[]);await p.close();console.log(surface,'PASS login keyboard isolation and short viewport');
 }
 const m=await open('member',390,740,'');await m.locator('#accountBtn').click();
 await m.evaluate(()=>document.getElementById('firstPasswordOverlay').classList.add('show'));
 await m.waitForFunction(()=>document.activeElement.closest('#firstPasswordOverlay'));
 assert.equal(await m.locator('#accountOverlay').evaluate(el=>el.inert),true);
 await m.keyboard.press('Escape');assert.equal(await m.locator('#firstPasswordOverlay').isVisible(),true);
 await m.evaluate(()=>document.getElementById('firstPasswordOverlay').classList.remove('show'));
 await m.waitForFunction(()=>document.activeElement.closest('#accountOverlay'));await m.keyboard.press('Escape');await m.close();console.log('PASS mandatory password takes focus over account dialog');
 for(const width of [320,390,744,1440]){
  const p=await open('admin',width,950,'');await p.locator('[data-view=settings]').click();
  assert.equal(await p.locator('[data-view=settings]').getAttribute('aria-current'),'page');
  await p.locator('[data-settings-tab=pricing]').focus();await p.keyboard.press('ArrowRight');
  assert.equal(await p.locator('[data-settings-tab=payments]').getAttribute('aria-selected'),'true');
  await p.keyboard.press('End');assert.equal(await p.locator('[data-settings-tab=admin]').getAttribute('aria-selected'),'true');
  await p.keyboard.press('Home');assert.equal(await p.locator('[data-settings-tab=pricing]').getAttribute('aria-selected'),'true');
  await p.locator('[data-view=sales]').click();
  await p.evaluate(()=>{document.getElementById('salesPaidRevenue').textContent='Rp12.500.000';document.getElementById('salesPendingRevenue').textContent='Rp125.000.000'});
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.equal(await p.locator('.sales-revenue-stats .stat').evaluateAll(nodes=>nodes.every(el=>el.scrollWidth<=el.clientWidth)),true);
  await p.screenshot({path:out+'/admin-revenue-'+width+'.png'});
  assert.deepEqual(p.errors,[]);await p.close();console.log('PASS',width,'settings keyboard, nav semantics, large revenue amounts');
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
