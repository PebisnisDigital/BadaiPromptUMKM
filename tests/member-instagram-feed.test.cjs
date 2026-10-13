const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'member.html'),'utf8');
const css=fs.readFileSync(path.join(root,'assets/member-instagram.css'),'utf8');
const script=html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1]||'';

test('Instagram-profile Member Area has bio, avatar, counts, highlights, grid and three footer tabs',()=>{
 assert.match(html,/<body class="member-app insta-member">/);
 assert.match(html,/member-instagram\.css/);
 for(const id of ['igPromptCount','igCategoryCount','igSavedCount','quickCategories','grid','igSearchToggle','categoryPanel']){
  assert.ok(html.includes('id="'+id+'"'),id);
 }
 assert.match(html,/<div class="ig-profile-photo"><img src="\/assets\/promptional-icon\.svg"/);
 assert.match(html,/class="ig-profile-bio"/);
 const footer=html.match(/<nav class="bottomnav" id="nav"[\s\S]*?<\/nav>/)?.[0]||'';
 assert.deepEqual([...footer.matchAll(/data-mode="([^"]+)"/g)].map(m=>m[1]),['all','affiliate','account']);
 assert.match(css,/\.insta-member \.grid\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\);gap:2px/);
 assert.match(css,/\.insta-member \.ig-tile\{position:relative;display:block;width:100%;min-width:0;aspect-ratio:1\/1/);
 assert.match(css,/\.insta-member \.bottomnav\{grid-template-columns:repeat\(3/);
});
test('gallery tiles open details; copy and favorite actions remain in the modal',()=>{
 assert.match(script,/function render\(\)/);
 assert.match(script,/class="ig-tile"/);
 assert.match(script,/data-open/);
 assert.match(script,/grid\.querySelectorAll\('\[data-open\]'\)/);
 assert.match(script,/detailOverlay\.classList\.add\('show'\)/);
 assert.match(script,/detailOverlay\.querySelector\('details'\)\.open=true/);
 assert.match(script,/safeCopy\(current\.prompt_text\)/);
 assert.match(script,/favorites\.has\(current\.\$id\)/);
 assert.match(html,/id="detailFav"/);
 assert.match(html,/id="detailCopy"/);
});
test('highlights work and search and all-category selector are optional',()=>{
 assert.match(html,/id="searchArea" hidden/);
 assert.match(html,/id="categoryPanel" hidden/);
 assert.match(script,/void applyCategory\(button\.dataset\.categoryShortcut,true\)/);
 assert.match(script,/\$\('igSearchToggle'\)\.addEventListener\('click'/);
 assert.match(script,/\$\('allCategoriesBtn'\)\.addEventListener\('click'/);
 assert.match(css,/\.ig-search-area\[hidden\],\.insta-member \.ig-category-panel\[hidden\]\{display:none!important\}/);
});
test('vertical swipe, keyboard, wheel and cross-page navigation continue to work',()=>{
 assert.match(html,/id="detailPrev"/);
 assert.match(html,/id="detailNext"/);
 assert.match(html,/id="detailPosition"/);
 assert.match(script,/async function navigateDetail\(direction\)/);
 assert.match(script,/const nextPage=currentPage\+direction/);
 assert.match(script,/await loadPrompts\(requestId\)/);
 assert.match(script,/swipeSurface\.addEventListener\('touchstart'/);
 assert.match(script,/swipeSurface\.addEventListener\('touchend'/);
 assert.match(script,/dy<0\?1:-1/);
 assert.match(script,/swipeSurface\.addEventListener\('wheel'/);
 assert.match(script,/e\.key==='ArrowDown'/);
 assert.match(script,/e\.key==='ArrowUp'/);
 assert.doesNotThrow(()=>new vm.Script(script));
});
test('authentication, profile, favorites and affiliate remain intact',()=>{
 for(const x of ['account.createEmailPasswordSession','loadProfile()','loadFavorites()',
 'tables.createRow','tables.deleteRow','memberApi','accountOverlay','affiliateOverlay',
 'Affiliate sedang disiapkan','showExistingMemberSession','switchMemberAccount']){
  assert.ok(html.includes(x),x+' should remain');
 }
});
