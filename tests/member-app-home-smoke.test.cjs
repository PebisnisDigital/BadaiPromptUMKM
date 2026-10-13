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

test('member has clean Instagram profile, story highlights, and 3-column gallery',()=>{
 assert.match(html,/meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/);
 assert.match(html,/member-instagram\.css\?v=5/);
 assert.match(base,/\.member-app \.shell\{width:min\(100%,560px\)/);
 assert.match(profile,/\.insta-member \.grid\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\);gap:2px/);
 assert.match(profile,/\.insta-member \.ig-tile\{position:relative;display:block;width:100%;min-width:0;aspect-ratio:1\/1/);
 assert.doesNotMatch(html,/<header class="topbar">/);
 assert.doesNotMatch(html,/id="igSearchToggle"/);
 assert.match(html,/id="pagination"/);
 assert.match(profile,/safe-area-inset-bottom/);
});
test('profile statistics, greeting, and login keep working without a topbar avatar',()=>{
 for(const id of ['memberName','featureCount','igPromptCount','igCategoryCount','igSavedCount','passwordReminder','grid','pagination','pageSelect','pagePrev','pageNext']){
  assert.ok(html.includes('id="'+id+'"'),id+' exists');
 }
 assert.match(html,/src="\/assets\/promptional-icon\.svg"/);
 assert.match(script,/function refreshGreeting\(\)/);
 assert.match(script,/currentProfile\?\.name\|\|currentUser\?\.name/);
 assert.match(script,/gate\.classList\.add\('hide'\)/);
 assert.match(script,/currentProfile\.status!=='active'/);
 assert.doesNotMatch(script,/accountBtn/);
});
test('highlights still filter published prompts and retain saved category',()=>{
 assert.match(script,/const CATEGORIES=\['Ad Creative','E-Commerce','Prompt Viral','Spontan'/);
 for(const c of ['','Prompt Viral','Bisnis','Spontan','__saved'])
  assert.ok(html.includes('data-category-shortcut="'+c+'"'));
 assert.equal([...html.matchAll(/class="quick-category(?: on)?"/g)].length,5);
 assert.match(script,/void applyCategory\(button\.dataset\.categoryShortcut,true\)/);
 assert.match(script,/Query\.equal\('category',category\)/);
 assert.match(script,/Query\.equal\('is_published',true\)/);
 assert.match(script,/Query\.orderDesc\('sort_order'\)/);
 assert.match(script,/const PAGE_SIZE=9/);
 assert.match(script,/categorySelect\.value=mode==='favorites'\?'__saved':category/);
});
test('three bottom tabs still lead to Prompt, Affiliate and Account',()=>{
 const nav=html.match(/<nav class="bottomnav" id="nav"[\s\S]*?<\/nav>/)?.[0]||'';
 assert.deepEqual([...nav.matchAll(/data-mode="([^"]+)"/g)].map(m=>m[1]),['all','affiliate','account']);
 for(const label of ['PROMPT','AFFILIATE','AKUN'])assert.ok(nav.includes(label+'</button>'));
 assert.match(script,/if\(b\.dataset\.mode==='affiliate'\)\{affiliateOverlay\.classList\.add\('show'\)/);
 assert.match(script,/if\(b\.dataset\.mode==='account'\)\{openAccount\(\)/);
 assert.match(script,/function syncLibraryChoices\(\)/);
});
test('Appwrite login, swipe detail, copy, favorites and manual pagination remain functional',()=>{
 for(const id of ['loginForm','detailOverlay','detailCopy','detailPrompt','detailCaptionCode','accountForm','tgLinkBtn','firstPasswordOverlay'])
  assert.ok(html.includes('id="'+id+'"'));
 assert.match(script,/async function loadFavorites\(\)/);
 assert.match(script,/async function toggleFavorite\(id\)/);
 assert.match(script,/async function goToPage\(page,scroll=true\)/);
 assert.match(script,/function renderPagination\(\)/);
 assert.match(script,/function carouselMarkup\(x,detail=false\)/);
 assert.match(script,/async function safeCopy/);
 assert.match(script,/await loadProfile\(\)/);
 assert.match(script,/await enterLibrary\(\)/);
 assert.match(script,/await account\.createEmailPasswordSession/);
 assert.doesNotThrow(()=>new vm.Script(script));
});
