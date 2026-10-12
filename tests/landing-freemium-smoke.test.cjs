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

test('single free Telegram hero with interactive floating preview cards',()=>{
 assert.equal([...html.matchAll(/<section\b/gi)].length,1);
 assert.match(html,/<section class="hero" id="hero"/);
 assert.match(html,/class="model-wrap"/);
 assert.match(html,/id="gallery"/);
 assert.equal([...html.matchAll(/class="float-card /g)].length,12);
 assert.match(html,/id="lightbox"/);
 assert.match(script,/card\.addEventListener\("click"/);
 assert.equal([...html.matchAll(/href="https:\/\/t\.me\/BadaiPromptBot\?start=landing_free"/g)].length,1);
 assert.doesNotMatch(html,/<form\b|checkout|LOGIN MEMBER|Rp199\.000/i);
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
test('autoplay is CSS native and runs without pointermove, including on mobile',()=>{
 assert.match(html,/@keyframes galleryAutoplay/);
 assert.match(html, /animation:galleryAutoplay/);
 assert.match(html, /animation-play-state:running/);
 assert.match(html, /@media\(max-width:700px\)/);
 assert.match(html, /@media\(prefers-reduced-motion:reduce\)/);
 assert.doesNotThrow(()=>new vm.Script(script));
});
test('Roboto and Nunito are the only landing typefaces, and START instructions are visible',()=>{
 assert.match(html,/family=Nunito:wght@/);
 assert.match(html,/family=Roboto:wght@/);
 assert.match(html,/--heading:"Roboto"/);
 assert.match(html,/--body:"Nunito"/);
 assert.doesNotMatch(html,/Playfair|DM\+Sans|--serif|--sans/);
 assert.match(html,/CARA MENDAPATKANNYA/);
 assert.match(html,/Klik tombol di atas/);
 assert.match(html,/Tekan <strong>START<\/strong> di bot Telegram/);
 assert.match(html,/tombol START\/MULAI ada di bawah chat/);
 assert.match(html,/class="get-guide"/);
});
test('public feed exposes only published images, never premium prompt text',()=>{
 assert.match(api,/Query\.equal\('is_published',true\)/);
 assert.match(api,/Query\.orderAsc\('sort_order'\)/);
 assert.match(api,/safeUrl\(x\.src\)/);
 assert.match(api,/cache-control/i);
 assert.doesNotMatch(api,/x\.prompt_text|row\.prompt_text|member_email/);
 assert.doesNotThrow(()=>new vm.Script(api));
});
