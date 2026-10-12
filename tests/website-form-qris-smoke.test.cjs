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
 assert.match(html,/QRIS resmi BuatQRIS/);
 assert.match(html,/BUKA MEMBER AREA/);
 assert.match(html,/https:\/\/fonts\.googleapis\.com\/css2\?family=Nunito/);
 assert.match(html,/family=Roboto/);
});

test('checkout visually showcases three seamlessly looping published Member Area preview rows before the form',()=>{
 const intro=html.indexOf('class="intro"');
 const gallery=html.indexOf('class="preview-showcase"');
 const formPanel=html.indexOf('id="checkoutPanel"');
 const form=html.indexOf('id="checkoutForm"');
 assert.ok(intro>=0 && gallery>intro && formPanel>gallery && form>formPanel);
 assert.equal([...html.matchAll(/class="marquee-row(?: reverse)?"/g)].length,3);
 assert.match(html,/id="previewTrack0"/);
 assert.match(html,/id="previewTrack1"/);
 assert.match(html,/id="previewTrack2"/);
 assert.match(html,/@keyframes previewSlide/);
 assert.match(html,/animation:previewSlide var\(--speed,38s\) linear infinite/);
 assert.match(html,/\.marquee-row\.reverse \.marquee-track\{animation-direction:reverse\}/);
 assert.match(html,/track\.append\(makeSet\(false\),makeSet\(true\)\)/);
 assert.match(html,/set\.setAttribute\('aria-hidden','true'\)/);
 assert.match(html,/fetch\('\/api\/public-previews'/);
 assert.match(html,/fillPreviewSliders\(previewSnapshot\)/);
 const snapshot=script.match(/const previewSnapshot=(\[[^\n]+\]);/);
 assert.ok(snapshot,'published image fallback is bundled');
 const previews=JSON.parse(snapshot[1]);
 assert.equal(previews.length,24);
 assert.ok(previews.every(x=>/^BP\d{3}$/.test(x.code)&&x.src.startsWith('https://')));
 assert.match(html,/@media\(prefers-reduced-motion:reduce\)/);
 assert.doesNotThrow(()=>new vm.Script(script));
});
test('payment stage scrolls into view and buyer fields remain the only required fields',()=>{
 assert.equal([...html.matchAll(/<input[^>]+required/g)].length,3);
 assert.match(script,/checkoutPanel'\)\.scrollIntoView/);
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
