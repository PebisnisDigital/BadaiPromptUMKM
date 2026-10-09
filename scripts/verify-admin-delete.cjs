let playwright;try{playwright=require('playwright')}catch{playwright=require('/opt/codex/runtimes/cua/lib/node_modules/playwright')}
const {chromium}=playwright,fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{for(const width of [1280,390]){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://badaiprompt.vercel.app/**',r=>{const u=new URL(r.request().url());let f=root+u.pathname;if(u.pathname==='/admin')f+='.html';return fs.existsSync(f)&&fs.statSync(f).isFile()?r.fulfill({path:f}):r.abort()});
  await page.route('**/assets/vendor/appwrite-28.1.0.js',r=>r.fulfill({path:path.join(root,'tests/fixtures/workspace-appwrite.js'),contentType:'application/javascript'}));
  // All Appwrite traffic is simulated; deletion tests cannot reach production.
  await page.route('https://sgp.cloud.appwrite.io/**',r=>r.abort());
  await page.goto('https://badaiprompt.vercel.app/admin');
  await page.waitForFunction(()=>!document.getElementById('loading').classList.contains('show'));
  await page.evaluate(()=>{
   const original=api;api=async(p,b)=>p==='/member/get'?{user:{$id:'member-sim',email:'simulasi@example.com',name:'Pembeli Simulasi'},profile:{status:'active'}}:original(p,b);
   window.deletionCalls=[];memberAdminApi=(p,b)=>{deletionCalls.push({path:p,body:b});return new Promise((resolve,reject)=>{window.finishDelete=resolve;window.failDelete=reject})};
  });
  await page.locator('[data-view=sales]').click();
  const open=async()=>{await page.evaluate(()=>detailOrder('order-sim'));await page.locator('#orderModal.show').waitFor();assert.equal(await page.locator('#deleteManagedMemberBtn').isEnabled(),true)};
  let dialogMode='cancel',dialogs=[];
  page.on('dialog',async d=>{dialogs.push(d.type());if(dialogMode==='cancel')await d.dismiss();else if(d.type()==='prompt')await d.accept(dialogMode==='wrong'?'NO':'HAPUS MEMBER');else await d.accept()});
  await open();await page.locator('#deleteManagedOrderBtn').click();assert.equal(await page.evaluate(()=>deletionCalls.length),0);
  dialogMode='wrong';await page.locator('#deleteManagedMemberBtn').click();assert.equal(await page.evaluate(()=>deletionCalls.length),0);
  dialogMode='accept';await page.locator('#deleteManagedOrderBtn').click();
  await page.waitForFunction(()=>deletionCalls.length===1);
  assert.deepStrictEqual(await page.evaluate(()=>deletionCalls[0]),{path:'/sales/delete',body:{order_id:'order-sim'}});
  for(const id of ['deleteManagedOrderBtn','deleteManagedMemberBtn','saveManagedMemberBtn'])assert.equal(await page.locator('#'+id).isDisabled(),true);
  await page.evaluate(()=>deleteManagedData('member'));assert.equal(await page.evaluate(()=>deletionCalls.length),1);
  await page.keyboard.press('Escape');assert.equal(await page.locator('#orderModal').isVisible(),true);
  await page.evaluate(()=>failDelete(new Error('Simulasi jaringan gagal')));
  await page.waitForFunction(()=>document.getElementById('manageMemberMsg').textContent.includes('Simulasi jaringan gagal'));
  assert.equal(await page.locator('#deleteManagedOrderBtn').isEnabled(),true);assert.equal(await page.locator('#deleteManagedOrderBtn').innerText(),'HAPUS ORDER');
  await page.locator('#deleteManagedOrderBtn').click();await page.waitForFunction(()=>deletionCalls.length===2);
  await page.evaluate(()=>finishDelete({ok:true}));await page.locator('#orderModal.show').waitFor({state:'hidden'});
  await page.waitForFunction(()=>!managedDeletePending);assert.equal(await page.locator('#deleteManagedOrderBtn').textContent(),'HAPUS ORDER');
  await open();await page.locator('#deleteManagedMemberBtn').click();await page.waitForFunction(()=>deletionCalls.length===3);
  assert.deepStrictEqual(await page.evaluate(()=>deletionCalls[2].body),{order_id:'order-sim',user_id:'member-sim'});
  await page.evaluate(()=>finishDelete({}));await page.waitForFunction(()=>document.getElementById('manageMemberMsg').textContent.includes('belum dikonfirmasi server'));
  assert.equal(await page.locator('#orderModal').isVisible(),true);
  await page.locator('#deleteManagedMemberBtn').click();await page.waitForFunction(()=>deletionCalls.length===4);
  await page.evaluate(()=>{loadSalesPage=async()=>{throw Error('Refresh failed')};finishDelete({ok:true})});
  await page.locator('#orderModal.show').waitFor({state:'hidden'});await page.waitForFunction(()=>!managedDeletePending);
  assert.equal(await page.locator('#deleteManagedMemberBtn').textContent(),'HAPUS MEMBER');
  assert.deepStrictEqual(errors,[]);assert(dialogs.includes('prompt')&&dialogs.includes('alert'));
  console.log('Admin deletion '+width+' PASS: confirmation, payloads, request lock, error retry, success reset, refresh failure. Data simulated.');await page.close();
 }}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
