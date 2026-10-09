const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'assets/landing-freemium.css'),'utf8');
test('free Telegram and Premium pathways are explicit',()=>{
 assert.match(html,/href="https:\/\/t\.me\/BadaiPromptBot\?start=landing_free"/);
 assert.match(html,/COBA GRATIS/);
 assert.match(html,/BUKA SEMUA/);
 assert.match(html,/id="cara-kerja"/);
 assert.match(html,/id="faq"/);
 assert.match(html,/1 PROMPT \/ 3 HARI/);
 assert.match(html,/24 jam/);
 assert.match(html,/Rp199\.000/);
 assert.doesNotMatch(html,/Mulai 59K|openCheckout\(59000\)|openCheckout\(159000\)/);
});
test('payment and member access elements remain unique',()=>{
 const ids=['checkoutForm','payBtn','checkoutModal','paymentWrap','successBox','memberLink','buyerName','buyerEmail','buyerWa','checkNowBtn','productTour'];
 for(const id of ids){
  assert.equal([...html.matchAll(new RegExp('id="'+id+'"','g'))].length,1,id+' count');
 }
 assert.match(html,/runPayment\('\/create'/);
 assert.match(html,/prepareMemberAccount/);
 assert.match(html,/handlePaid/);
 assert.match(html,/let registrationOpen=true,minimumPrice=199000,officialPrice=199000,selectedAmount=199000/);
});
test('embedded payment code parses without errors',()=>{
 const inline=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x=>x[1]).filter(x=>x.trim());
 assert.ok(inline.length>0);
 for(const js of inline)assert.doesNotThrow(()=>new vm.Script(js));
});
test('responsive design and reduced motion are present',()=>{
 assert.match(html,/landing-freemium\.css/);
 assert.match(css,/@media\(max-width:430px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(html,/simulasi tampilan/);
 assert.match(html,/testimoni khusus pembelian BADAI PROMPT/);
});
