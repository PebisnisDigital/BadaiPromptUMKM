let playwright;try{playwright=require('playwright')}catch{playwright=require('/opt/codex/runtimes/cua/lib/node_modules/playwright')}
const {chromium}=playwright,fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..'),output=process.env.UI_ARTIFACTS||path.join(root,'work/telegram/ui');fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH==='playwright'?undefined:(process.env.CHROMIUM_PATH||'/usr/bin/chromium'),args:['--no-sandbox']});
 async function local(page){await page.route('https://badaiprompt.vercel.app/**',r=>{const u=new URL(r.request().url());let p=u.pathname==='/'?'/index.html':u.pathname;if(['/admin','/member'].includes(p))p+='.html';const f=root+p;return fs.existsSync(f)&&fs.statSync(f).isFile()?r.fulfill({path:f}):r.abort()});await page.route('https://sgp.cloud.appwrite.io/**',r=>r.abort());await page.route('https://fonts.googleapis.com/**',r=>r.abort())}
 const fixture=fs.readFileSync(path.join(root,'tests/fixtures/workspace-appwrite.js'),'utf8').replace('class Account{','class Account{async createJWT(){return {jwt:"verified-test-session"}} async create(input){window.mockCalls.push({mutation:"account",...input});return {$id:"test-member",...input}} ');
 const bot={$id:'tg_'+ 'a'.repeat(32),name:'Bot simulasi',username:'TestBadaiBot',bot_user_id:'123456',status:'connected',has_token:true,last_test_at:'2026-10-09T10:00:00Z',webhook_url:'https://badaiprompt.vercel.app/api/telegram/webhook?bot=test'};
 for(const width of [1280,390,320]){
  const page=await browser.newPage({viewport:{width,height:1000}}),errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.type()==='prompt'?d.accept('HAPUS BOT'):d.accept());await local(page);await page.route('**/assets/vendor/appwrite-28.1.0.js',r=>r.fulfill({body:fixture,contentType:'application/javascript'}));
  let shouldFail=false,emptyMembers=true,sendEnabled=false;
  await page.route('**/api/telegram/manager',async r=>{const p=r.request().postDataJSON();requests.push({body:p,authorization:r.request().headers().authorization});if(shouldFail){shouldFail=false;return r.fulfill({status:503,json:{error:'Telegram belum dapat dihubungi.'}})}let data={ok:true};if(p.action==='overview')data={ok:true,bots:[bot],settings:{enabled:false,paused:true,dry_run:true,premium_time:'06:00',free_days:3,premium_days:1,delete_hours:24,term_days:365,batch_size:5,main_bot_id:bot.$id},stats:{users:4,free:2,premium:2,active:1,expired:1,today:3,sent:8,failed:1,deleted:2,blocked:1},errors:[{status:'uncertain',error:'Perlu diperiksa',at:'2026-10-09'}],members:emptyMembers?[]:[{telegram_id:'777',first_name:'Penguji'}],testers:[],prompts:[{id:'published',title:'Prompt asli'}],send_enabled:sendEnabled};if(p.action==='save')data={ok:true,bot};if(p.action==='prepare-switch')data={ok:true,confirmation:'one-use-confirmation',started_members:1};if(p.action==='test-message'||p.action==='test-prompt')data={ok:true,delivery_id:'test-delivery',message_ids:['101']};await r.fulfill({json:data})});
  await page.goto('https://badaiprompt.vercel.app/admin');await page.waitForFunction(()=>!document.getElementById('loading').classList.contains('show'));await page.locator('[data-view=telegram]').click();await page.waitForFunction(()=>document.getElementById('tgStats').children.length===10);assert.equal(await page.locator('#tgStats strong').first().innerText(),'4');assert.match(await page.locator('#tgBotInfo').innerText(),/Tersimpan terenkripsi/);assert.equal(await page.locator('#tgToken').inputValue(),'');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.equal(await page.locator('#tgAuthorizeTester').isDisabled(),true);assert.equal(await page.locator('[data-tg-test=test-message]').isDisabled(),true);assert.match(await page.locator('#tgTesterHelp').innerText(),/Belum ada akun penguji/);assert.equal(await page.locator('#tgStartBot').getAttribute('href'),'https://t.me/TestBadaiBot');emptyMembers=false;await page.locator('#tgRefresh').click();await page.waitForFunction(()=>document.getElementById('tgTester').options.length===2);
  await page.screenshot({path:path.join(output,'telegram-admin-'+width+'.png'),fullPage:true});
  await page.locator('#tgToken').fill('123456:FAKE_TEST_TOKEN_DO_NOT_USE_1234567890');await page.locator('#tgBotForm button[type=submit]').click();await page.waitForFunction(()=>document.getElementById('tgStatus').textContent.includes('Bot tersimpan'));assert.equal(await page.locator('#tgToken').inputValue(),'');assert.equal(await page.evaluate(()=>Object.keys(localStorage).some(k=>/token|telegram/i.test(k))),false);
  await page.locator('[data-tg-action=connection]').click();await page.waitForFunction(()=>document.getElementById('tgStatus').textContent.includes('selesai'));
  shouldFail=true;await page.locator('[data-tg-action=webhook]').click();await page.waitForFunction(()=>document.getElementById('tgStatus').textContent.includes('belum dapat dihubungi'));assert.equal(await page.locator('[data-tg-action=webhook]').isEnabled(),true);
  await page.locator('#tgActivate').click();await page.waitForFunction(()=>document.getElementById('tgStatus').textContent.includes('Bot utama berhasil'));const activation=requests.find(x=>x.body.action==='activate');assert.equal(activation.body.confirmation,'one-use-confirmation');
  await page.locator('#tgTester').selectOption('777');assert.equal(await page.locator('[data-tg-test=test-message]').isDisabled(),true);sendEnabled=true;await page.locator('#tgRefresh').click();await page.waitForFunction(()=>document.getElementById('tgAutomationState').textContent.includes('Izin kirim server: AKTIF'));assert.equal(await page.locator('#tgTester').inputValue(),'777');await page.locator('#tgPrompt').selectOption('published');await page.locator('#tgAuthorizeTester').click();await page.waitForFunction(()=>document.getElementById('tgStatus').textContent.includes('diotorisasi'));
  await page.locator('[data-tg-test=test-prompt]').click();await page.waitForFunction(()=>document.getElementById('tgStatus').textContent.includes('berhasil dikirim'));await page.locator('#tgTestDelete').click();await page.waitForFunction(()=>document.getElementById('tgStatus').textContent.includes('berhasil dihapus'));assert.equal(requests.find(x=>x.body.action==='test-delete').body.delivery_id,'test-delivery');assert(requests.every(x=>x.authorization==='Bearer verified-test-session'));
  assert.deepStrictEqual(errors,[]);await page.close();console.log('Telegram admin '+width+' PASS: layout, real-data rendering, token clearing, JWT, connection/error, switch confirmation, test prompt/delete. Simulated.');
 }
 const member=await browser.newPage({viewport:{width:390,height:900}});await local(member);await member.route('**/assets/vendor/appwrite-28.1.0.js',r=>r.fulfill({body:fixture,contentType:'application/javascript'}));await member.route('**/api/telegram/link',r=>{assert.equal(r.request().headers().authorization,'Bearer verified-test-session');return r.fulfill({json:{ok:true,url:'https://t.me/TestBadaiBot?start=link_simulated',expires_in:600}})});await member.goto('https://badaiprompt.vercel.app/member');await member.waitForFunction(()=>!document.getElementById('loading').classList.contains('show'));await member.locator('#accountBtn').click();await member.locator('#tgLinkBtn').click();await member.locator('#tgLinkOpen').waitFor({state:'visible'});assert.match(await member.locator('#tgLinkOpen').getAttribute('href'),/^https:\/\/t.me\//);assert.match(await member.locator('#tgLinkMsg').innerText(),/10 menit/);await member.screenshot({path:path.join(output,'telegram-member-link.png')});await member.close();
 console.log('Member linking PASS: verified-session request, one-use deep link and expiry. Simulated.');
 for(const amount of [199000]){
  const p=await browser.newPage(),errors=[],calls=[];p.on('pageerror',e=>errors.push(e.message));await local(p);await p.route('**/assets/vendor/appwrite-28.1.0.js',r=>r.fulfill({body:fixture,contentType:'application/javascript'}));
  await p.route('**/functions/payment-api/executions',r=>{const ex=r.request().postDataJSON(),body=JSON.parse(ex.body||'{}');calls.push({path:ex.path,body});let data=ex.path==='/config'?{minimum_price:199000,price:199000,price_mode:'fixed',registration_open:true}:ex.path==='/social-proof'?{enabled:false,items:[]}:ex.path==='/create'?{public_token:'test-order',amount,total_amount:amount,qr_url:'data:image/png;base64,iVBORw0KGgo=',expires_at:new Date(Date.now()+900000).toISOString()}:{status:'pending',access_ready:false};return r.fulfill({json:{responseStatusCode:200,responseBody:JSON.stringify(data)}})});
  await p.goto('https://badaiprompt.vercel.app/');await p.locator('.offer-scroll-cta').click();assert.match((await p.locator('#selectedAmountLabel').innerText()).replace(/\s/g,''),/^Rp199\.000$/);await p.locator('#buyerName').fill('Pembeli Simulasi');await p.locator('#buyerEmail').fill('checkout@example.com');await p.locator('#buyerWa').fill('081234567890');await p.locator('#payBtn').click();await p.waitForFunction(()=>document.getElementById('paymentWrap').style.display==='block');assert.equal(calls.find(x=>x.path==='/create').body.amount,amount);await p.locator('#checkNowBtn').click();await p.waitForFunction(()=>document.getElementById('payStatus').textContent.includes('Belum ada pembayaran'));assert(calls.some(x=>x.path==='/check'));assert.deepStrictEqual(errors,[]);await p.close();console.log('Fixed-price Premium checkout Rp199.000 PASS: account, amount, QR and status polling. Simulated.');
 }
 // Marketing calendar: isolated browser simulation, no real messages or DB mutations.
 for(const width of [1280,390]){
  const page=await browser.newPage({viewport:{width,height:1000}}),pageErrors=[],calls=[],slots=new Map();
  page.on('pageerror',e=>pageErrors.push(e.message));await local(page);
  await page.route('**/assets/vendor/appwrite-28.1.0.js',r=>r.fulfill({body:fixture,contentType:'application/javascript'}));
  let marketingSettings={enabled:false,loop_campaign:false,start_date:'2026-10-10',send_time:'06:00',timezone:'Asia/Jakarta',
    default_offer:'Suka prompt ini? Buka semua prompt Premium Rp199.000.',default_cta_label:'BUKA PREMIUM',default_cta_type:'premium',default_cta_url:''};
  await page.route('**/api/telegram/manager',async route=>{
   const body=route.request().postDataJSON();calls.push(body);
   let reply={ok:true};
   if(body.action==='marketing-get')reply={ok:true,settings:marketingSettings,slots:[...slots.values()],stats:{filled:slots.size,empty:365-slots.size,target:365,active:false,campaign_day:1},server_gate:false};
   if(body.action==='marketing-candidates')reply={ok:true,total:2,next_cursor:null,rows:[
    {source:'scene_prompts',id:'p1',title:'BP001 • Foto Editorial',category:'Foto',preview_url:'https://example.com/p1.jpg',summary:'Prompt visual pertama'},
    {source:'scene_prompts',id:'p2',title:'BP002 • Poster Produk',category:'Bisnis',preview_url:'https://example.com/p2.jpg',summary:'Prompt visual kedua'}]};
   if(body.action==='marketing-slot-save'){const item={...body,title:body.prompt_id==='p1'?'BP001 • Foto Editorial':'BP002 • Poster Produk'};slots.set(body.day,item);reply={ok:true,slot:item}}
   if(body.action==='marketing-slot-delete')slots.delete(body.day);
   if(body.action==='marketing-slot-move'){
     const from=slots.get(body.from),to=slots.get(body.to);
     slots.delete(body.from);if(to)slots.set(body.from,{...to,day:body.from});
     slots.set(body.to,{...from,day:body.to});
   }
   if(body.action==='marketing-settings'){marketingSettings={...marketingSettings,...body};reply={ok:true,settings:marketingSettings}}
   await route.fulfill({json:reply});
  });
  await page.goto('https://badaiprompt.vercel.app/admin');
  await page.waitForFunction(()=>!document.getElementById('loading').classList.contains('show'));
  await page.locator('[data-view="marketing"]').click();
  await page.locator('#mktPromptList .mkt-prompt').first().waitFor();
  assert.match(await page.locator('#mktStats').innerText(),/0\/365/);
  assert.equal(await page.locator('#mktEnabled option[value="true"]').evaluate(el=>el.disabled),true);
  await page.locator('[data-mkt-pick="scene_prompts:p1"]').click();
  await page.locator('[data-mkt-day="1"]').click();
  await page.locator('#mktEditOffer').fill('Coba prompt ini, lalu buka Premium Rp199.000 untuk 365 hari.');
  await page.locator('#mktEditLabel').fill('UPGRADE SEKARANG');
  await page.locator('#mktEditForm button[type="submit"]').click();
  await page.waitForFunction(()=>document.getElementById('mktNotice').textContent.includes('disimpan'));
  assert.match(await page.locator('[data-mkt-day="1"]').innerText(),/Foto Editorial/);
  assert.equal(slots.get(1).cta_label,'UPGRADE SEKARANG');
  if(width===1280){
   await page.locator('[data-mkt-day="1"]').dragTo(page.locator('[data-mkt-day="2"]'));
   await page.waitForFunction(()=>document.getElementById('mktNotice').textContent.includes('dipindahkan'));
   assert.match(await page.locator('[data-mkt-day="2"]').innerText(),/Foto Editorial/);
   assert.equal(slots.get(2).prompt_id,'p1');
  }
  await page.locator('#mktLoop').check();
  await page.locator('#mktSettingsForm button[type="submit"]').click();
  await page.waitForFunction(()=>document.getElementById('mktNotice').textContent.includes('Pengaturan Marketing tersimpan'));
  assert.equal(marketingSettings.loop_campaign,true);
  assert.equal(marketingSettings.enabled,false);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert(calls.filter(x=>x.action?.startsWith('marketing-')).every(x=>x.action!=='marketing-broadcast'));
  assert.deepStrictEqual(pageErrors,[]);
  await page.screenshot({path:path.join(output,'marketing-calendar-'+width+'.png'),fullPage:true});
  await page.close();
  console.log('Marketing Admin '+width+' PASS: Free calendar, prompt select, upsell CTA editor, draft settings'+(width===1280?', drag-and-drop':'')+'. Simulated.');
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
