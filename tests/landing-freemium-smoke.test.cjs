const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1]||'';

test('one hero contains centered model, floating image gallery and headline',()=>{
 assert.equal([...html.matchAll(/<section\b/gi)].length,1);
 assert.match(html,/<section class="hero" id="hero"/);
 assert.match(html,/class="model-wrap"/);
 assert.match(html,/class="model"/);
 assert.match(html,/id="gallery"/);
 assert.equal([...html.matchAll(/class="float-card /g)].length,12);
 assert.match(html,/PROMPT AI <em>GRATIS\.<\/em>/);
 assert.match(html,/DI TELEGRAM\./);
});

test('image preview and gentle parallax are interactive',()=>{
 assert.match(html,/id="lightbox"/);
 assert.match(html,/id="close-preview"/);
 assert.match(script,/pointermove/);
 assert.match(script,/requestAnimationFrame/);
 assert.match(script,/card\.addEventListener\("click"/);
 assert.match(script,/e\.key==="Escape"/);
});

test('single free Telegram CTA with no registration or pricing',()=>{
 assert.equal([...html.matchAll(/href="https:\/\/t\.me\/BadaiPromptBot\?start=landing_free"/g)].length,1);
 assert.match(html,/AMBIL PROMPT GRATIS/);
 assert.match(html,/Tanpa isi formulir di website/);
 assert.doesNotMatch(html,/<form\b|checkout|LOGIN MEMBER|Rp199\.000|BUKA SEMUA/i);
});

test('mobile and reduced-motion styles, metadata, syntax',()=>{
 assert.match(html,/@media\(max-width:700px\)/);
 assert.match(html,/@media\(max-width:380px\)/);
 assert.match(html,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(html,/rel="canonical" href="https:\/\/promptional\.vercel\.app\/"/);
 assert.match(html,/href="#hero" class="skip"/);
 assert.doesNotThrow(()=>new vm.Script(script));
});
