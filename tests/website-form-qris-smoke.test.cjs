const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'beli-premium.html'),'utf8');
const server=fs.readFileSync(path.join(root,'api/form-checkout.js'),'utf8');
const payments=fs.readFileSync(path.join(root,'functions/payment-api/src/main.js'),'utf8');
const member=fs.readFileSync(path.join(root,'member.html'),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1]||'';

test('one-step cross-channel checkout has three visible data fields, no Telegram login',()=>{
 for(const name of ['full_name','whatsapp','email'])assert.match(html,new RegExp('name="'+name+'"'));
 assert.equal([...html.matchAll(/<input[^>]+required/g)].length,3);
 assert.doesNotMatch(html,/api\/website-login|login Telegram untuk membayar/i);
 assert.match(html,/Rp199\.000/);
 assert.match(html,/LANJUT BAYAR QRIS/);
 assert.match(html,/BUKA MEMBER AREA/);
 assert.match(html,/https:\/\/fonts\.googleapis\.com\/css2\?family=Nunito/);
 assert.match(html,/family=Roboto/);
});

test('checkout stays one card with one small looping row, no FAQ or sticky footer',()=>{
 assert.match(html,/class="checkout-card" id="checkoutPanel"/);
 assert.match(html,/class="order-brief"/);
 assert.match(html,/class="example-strip"/);
 assert.match(html,/class="example-track"/);
 assert.match(html,/Rp199\.000/);
 assert.match(html,/min-height:100svh/);
 assert.match(html,/display:flex;flex-direction:column/);
 assert.match(html,/@media\(max-height:670px\)/);
 assert.match(html,/@media\(max-width:400px\)/);
 assert.doesNotMatch(html,/preview-showcase|marquee-row|marquee-track|previewTrack|@keyframes previewSlide/i);
 assert.equal([...html.matchAll(/class="example-strip"/g)].length,1);
 assert.equal([...html.matchAll(/class="example-set"/g)].length,2);
 assert.match(html,/@keyframes exampleLoop/);
 assert.match(html,/animation:exampleLoop 30s linear infinite/);
 assert.match(html,/aria-hidden="true"/);
 assert.equal([...html.matchAll(/alt="Hasil prompt BP\d+"/g)].length,8);
 assert.doesNotMatch(html,/checkout-faq|<details|id="faqHeading"/i);
 assert.doesNotMatch(html,/sticky-buy|stickyCheckout|setQuickVisibility|position:fixed/i);
 assert.doesNotMatch(html,/<footer\b/i);
 assert.doesNotMatch(script,/fillPreviewSliders|fetch\('\/api\/public-previews'/);
 assert.doesNotThrow(()=>new vm.Script(script));
});
test('the first screen shows concise price, 3 fields and one primary QRIS action',()=>{
 assert.match(html,/PROMPTIONAL Premium/);
 assert.match(html,/Rp199\.000/);
 assert.match(html,/LANJUT BAYAR QRIS/);
 assert.equal([...html.matchAll(/<form\b/g)].length,1);
 assert.equal([...html.matchAll(/<input[^>]+required/g)].length,3);
 assert.equal([...html.matchAll(/id="payButton"/g)].length,1);
 assert.match(html,/Isi Data Member/);
 assert.match(html,/Akses 365 Hari/);
 assert.match(html,/NAMA LENGKAP/);
 assert.match(html,/NOMOR WHATSAPP/);
 assert.match(html,/EMAIL AKSES MEMBER/);
 assert.doesNotMatch(html,/kicker|subtitle|support-links|perks|form-helper|security|<footer/i);
});
test('payment remains in the same card and creates a member session when verified',()=>{
 assert.match(html,/id="paymentStage"/);
 assert.match(html,/id="qrImage"/);
 assert.match(html,/id="qrTotal"/);
 assert.match(html,/id="downloadQr"/);
 assert.match(html,/id="done"/);
 assert.match(script,/document\.body\.dataset\.step=id/);
 assert.match(html,/body\[data-step="paymentStage"\]/);
 assert.match(html,/body\[data-step="paymentStage"\] \.example-strip/);
 assert.match(script,/api\('create',\{full_name:name,whatsapp,email\}\)/);
 assert.match(script,/api\('check',\{public_token:receipt\}\)/);
 assert.match(script,/api\('session-token',\{public_token:receipt\}\)/);
 assert.match(script,/location\.replace\('\/member\?first=1'\)/);
});
test('BuatQRIS is server-side and the buyer cannot choose price or payment outcome',()=>{
 assert.match(server,/data=\{full_name:name,email,whatsapp:wa,amount:199000\}/);
 assert.match(server,/new Set\(\['config','create','check','session-token'\]\)/);
 assert.doesNotMatch(server,/webhook',|payment\.success',|x-appwrite-key.*req\.body/);
 assert.match(server,/origin!==ORIGIN/);
 assert.match(server,/path:'\/'\+action/);
 assert.doesNotThrow(()=>new vm.Script(server));
});

test('only verified fully activated paid receipts can mint short-lived member sessions',()=>{
 assert.match(payments,/order\.status!=='success'\|\|order\.access_issued!==true/);
 assert.match(payments,/memberships\.memberships\|\|\[\]/);
 assert.match(payments,/m\.confirm===true/);
 assert.match(payments,/profile\.status!=='active'/);
 assert.match(payments,/users\.createToken\(\{userId:user\.\$id,length:32,expire:180\}\)/);
 assert.match(payments,/existingAccount=await users\.list/);
 assert.match(payments,/72\*3600000/);
});

test('buyer can safely resume QRIS and auto-enter member without mandatory password prompt',()=>{
 assert.match(script,/sessionStorage\.setItem\('promptional_checkout_receipt'/);
 assert.match(script,/sessionStorage\.getItem\('promptional_checkout_receipt'\)/);
 assert.match(script,/account\.createSession\(\{userId:access\.userId,secret:access\.secret\}\)/);
 assert.match(script,/location\.replace\('\/member\?first=1'\)/);
 assert.match(script,/result\.access_ready/);
 assert.match(member,/id="passwordReminder"/);
 assert.match(member,/await enterLibrary\(\)/);
 assert.doesNotMatch(member,/if\(currentProfile\.must_change_password===true\)\{firstPasswordOverlay\.classList\.add\('show'\);return\}/);
 assert.doesNotThrow(()=>new vm.Script(script));
});
