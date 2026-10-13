const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'member.html'),'utf8');
const base=fs.readFileSync(path.join(root,'assets/member-app-home.css'),'utf8');
const profile=fs.readFileSync(path.join(root,'assets/member-instagram.css'),'utf8');
const script=html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1]||'';

test('mobile-first member app has an Instagram-style profile, not a one-column feed',()=>{
 assert.match(html,/meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/);
 assert.match(html,/member-app-home\.css\?v=mobile1/);
 assert.match(html,/member-instagram\.css/);
 assert.match(base,/\.member-app \.shell\{width:min\(100%,560px\)/);
 assert.match(profile,/\.insta-member \.grid\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\);gap:2px/);
 assert.match(profile,/\.insta-member \.ig-tile\{position:relative;display:block;width:100%;min-width:0;aspect-ratio:1\/1/);
 assert.match(profile,/safe-area-inset-bottom/);
});
test('profile counts, greeting and controls do not break authentication',()=>{
 for(const id of ['accountBtn','memberName','featureCount','igPromptCount','igCategoryCount','igSavedCount','igSearchToggle','searchArea','search','passwordReminder','grid','pagination']){
   assert.ok(html.includes('id="'+id+'"'),id+' still exists');
 }
 assert.match(html,/src="\/assets\/promptional-icon\.svg"/);
 assert.match(script,/function refreshGreeting\(\)/);
 assert.match(script,/currentProfile\?\.name\|\|currentUser\?\.name/);
 assert.match(script,/gate\.classList\.add\('hide'\)/);
 assert.match(script,/currentProfile\.status!=='active'/);
});
test('story highlights still navigate all, viral, business, spontaneous and favorites',()=>{
 assert.match(script,/const CATEGORIES=\['Prompt Viral','Spontan'/);
 for(const category of ['','Prompt Viral','Bisnis','Spontan','__saved']){
  assert.ok(html.includes('data-category-shortcut="'+category+'"'),category+' highlight');
 }
 assert.equal([...html.matchAll(/class="quick-category(?: on)?"/g)].length,5);
 assert.match(script,/void applyCategory\(button\.dataset\.categoryShortcut,true\)/);
 assert.match(script,/void applyCategory\(categorySelect\.value,true\)/);
 assert.match(script,/Query\.equal\('category',category\)/);
 assert.match(script,/Query\.equal\('is_published',true\)/);
 assert.match(script,/Query\.orderDesc\('sort_order'\)/);
 assert.match(script,/const PAGE_SIZE=12/);
 assert.match(script,/categorySelect\.value=mode==='favorites'\?'__saved':category/);
});
test('three bottom tabs keep saved highlights, affiliate and account actions',()=>{
 const nav=html.match(/<nav class="bottomnav" id="nav"[\s\S]*?<\/nav>/)?.[0]||'';
 assert.deepEqual([...nav.matchAll(/data-mode="([^"]+)"/g)].map(m=>m[1]),['all','affiliate','account']);
 for(const label of ['PROMPT','AFFILIATE','AKUN'])assert.ok(nav.includes(label+'</button>'),label);
 assert.match(script,/if\(b\.dataset\.mode==='affiliate'\)\{affiliateOverlay\.classList\.add\('show'\)/);
 assert.match(script,/if\(b\.dataset\.mode==='account'\)\{openAccount\(\)/);
 assert.match(script,/function syncLibraryChoices\(\)/);
 assert.ok(html.includes('data-category-shortcut="__saved"'));
});
test('gallery detail, copy, favorites, pagination and login are preserved',()=>{
 for(const id of ['loginForm','detailOverlay','detailCopy','detailPrompt','detailCaptionCode','accountForm','tgLinkBtn','firstPasswordOverlay']){
  assert.ok(html.includes('id="'+id+'"'),id);
 }
 assert.match(script,/async function loadFavorites\(\)/);
 assert.match(script,/async function toggleFavorite\(id\)/);
 assert.match(script,/function renderPagination\(\)/);
 assert.match(script,/function carouselMarkup\(x,detail=false\)/);
 assert.match(script,/async function safeCopy/);
 assert.match(script,/await loadProfile\(\)/);
 assert.match(script,/await enterLibrary\(\)/);
 assert.match(script,/await account\.createEmailPasswordSession/);
 assert.doesNotThrow(()=>new vm.Script(script));
});
