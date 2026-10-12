const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const api=fs.readFileSync(path.join(root,'api/public-previews.js'),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1]||'';
const snapshotMatch=script.match(/const FALLBACK_PREVIEWS=(\[[^\n]+\]);/);

test('hero contains exactly five equal platform choices with no oversized Telegram CTA',()=>{
 assert.equal([...html.matchAll(/<section\b/gi)].length,1);
 assert.match(html,/<section class="hero" id="hero"/);
 assert.match(html,/class="model-wrap"/);
 assert.match(html,/id="gallery"/);
 assert.equal([...html.matchAll(/class="float-card /g)].length,12);
 assert.match(html,/id="lightbox"/);
 assert.match(script,/card\.addEventListener\("click"/);
 assert.equal([...html.matchAll(/class="platform-btn"/g)].length,5);
 assert.doesNotMatch(html,/class="cta"|class="social-link"|class="social-grid"/);
 assert.doesNotMatch(html,/<form\b|checkout|LOGIN MEMBER|Rp199\.000/i);
});
test('five equal clickable channel buttons, with responsive equal-sized last centered button',()=>{
 const channels=[
  ['telegram','https://t.me/BadaiPromptBot?start=landing_free'],
  ['instagram','https://www.instagram.com/promptional/'],
  ['tiktok','https://www.tiktok.com/@promptional'],
  ['facebook','https://www.facebook.com/promptional'],
  ['threads','https://www.threads.com/@promptional']
 ];
 assert.match(html,/PILIH PLATFORM FAVORITMU/);
 assert.match(html,/aria-labelledby="platform-heading"/);
 for(const [key,url] of channels){
  assert.ok(html.includes('href="'+url+'"'),key+' destination');
  assert.ok(html.includes('data-platform="'+key+'"'),key+' matching identity');
 }
 assert.match(html,/\.platform-grid\{width:100%;display:grid;grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
 assert.match(html,/\.platform-grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(html,/\.platform-btn:nth-child\(5\)\{grid-column:1\/-1;width:calc\(\(100% - 7px\)\/2\);justify-self:center\}/);
 assert.match(html,/\.platform-btn\{position:relative;isolation:isolate;overflow:hidden;display:flex/);
 assert.equal([...html.matchAll(/href="\/beli-premium\.html"/g)].length,2);
});
test('every card starts with a published member preview, and 32 previews can cycle',()=>{
 assert.ok(snapshotMatch,'published preview snapshot found');
 const previews=JSON.parse(snapshotMatch[1]);
 assert.ok(previews.length>=12);
 assert.ok(previews.every(x=>/^BP\d+$/.test(x.code)&&x.src.startsWith('https://')));
 const cards=[...html.matchAll(/data-code="(BP\d+)" aria-label="Lihat preview (BP\d+)"[^>]*><img src="([^"]+)"/g)];
 assert.equal(cards.length,12);
 const mapping=new Map(previews.map(x=>[x.code,x.src]));
 for(const [,code,aria,src] of cards){
  assert.equal(code,aria);
  assert.equal(src.replaceAll('&amp;','&'),mapping.get(code));
 }
 assert.match(script,/fetch\("\/api\/public-previews"/);
 assert.match(script,/setInterval\(\(\)=>/);
 assert.match(script,/probe\.onload/);
});
test('orbit moves automatically around the model and layers photos in front and behind',()=>{
 assert.match(html,/id="gallery-front"/);
 assert.match(html,/class="gallery gallery-back"/);
 assert.match(html,/class="gallery gallery-front"/);
 assert.match(script,/requestAnimationFrame\(drawOrbit\)/);
 assert.match(script,/orbitPhase\+=/);
 assert.match(script,/Math\.sin\(angle\)\*radiusX/);
 assert.match(script,/frontDepth\*radiusY/);
 assert.match(script,/frontDepth>\.1\?frontRing:backRing/);
 assert.match(script,/layer\.appendChild\(c\)/);
 assert.match(script,/i<8/);
 assert.match(script,/mobile\?22000:27000/);
 assert.match(html,/@media\(max-width:700px\)/);
 assert.match(html,/@media\(prefers-reduced-motion:reduce\)/);
 assert.doesNotThrow(()=>new vm.Script(script));
});
test('Roboto and Nunito remain in use and platform instructions are accurate',()=>{
 assert.match(html,/family=Nunito:wght@/);
 assert.match(html,/family=Roboto:wght@/);
 assert.match(html,/--heading:"Roboto"/);
 assert.match(html,/--body:"Nunito"/);
 assert.doesNotMatch(html,/Playfair|DM\+Sans|--serif|--sans/);
 assert.match(html,/Telegram:<\/strong> tekan START\/MULAI di bot/);
 assert.match(html,/Media sosial:<\/strong> ikuti @promptional/);
 assert.match(html,/class="get-guide"/);
});
test('headline stamp loops continuously with readable hold and staggered lines',()=>{
 assert.equal([...html.matchAll(/class="stamp-line"/g)].length,3);
 assert.match(html,/@keyframes headlineStamp/);
 assert.match(html,/animation:headlineStamp 6\.6s ease-in-out infinite both/);
 assert.match(html,/scale\(1\.19\)/);
 assert.match(html,/26%,78%\{opacity:1/);
 assert.match(html,/.stamp-line:nth-child\(2\)\{animation-delay:170ms\}/);
 assert.match(html,/.stamp-line:nth-child\(3\)\{animation-delay:340ms\}/);
});
test('all five buttons have identical recurring push, glow and shine with sequential timing',()=>{
 assert.match(html,/animation:platformPush 5\.5s ease-in-out var\(--phase,0s\) infinite/);
 assert.match(html,/@keyframes platformPush/);
 assert.match(html,/translateY\(4px\) scale\(\.95\)/);
 assert.match(html,/translateY\(-3px\) scale\(1\.065\)/);
 assert.match(html,/@keyframes platformShine/);
 assert.match(html,/animation:platformShine 5\.5s ease-in-out var\(--phase,0s\) infinite/);
 for(const [n,delay] of [[1,'0s'],[2,'1.1s'],[3,'2.2s'],[4,'3.3s'],[5,'4.4s']]){
  assert.ok(html.includes('.platform-btn:nth-child('+n+'){--phase:'+delay+'}'));
 }
 assert.match(html,/\.platform-btn:active\{animation-play-state:paused/);
 assert.match(html,/\.stamp-line\{opacity:1!important;transform:none!important;filter:none!important\}/);
 assert.match(html,/\.platform-btn::after\{display:none\}/);
});
test('public feed exposes only published images, never premium prompt text',()=>{
 assert.match(api,/Query\.equal\('is_published',true\)/);
 assert.match(api,/Query\.orderAsc\('sort_order'\)/);
 assert.match(api,/safeUrl\(x\.src\)/);
 assert.match(api,/cache-control/i);
 assert.doesNotMatch(api,/x\.prompt_text|row\.prompt_text|member_email/);
 assert.doesNotThrow(()=>new vm.Script(api));
});
