const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'member.html'),'utf8');
const css=fs.readFileSync(path.join(root,'assets/member-instagram.css'),'utf8');
const script=html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1]||'';

test('member PROMPT profile is full-screen, without top header, search button or pagination',()=>{
 assert.match(html,/<body class="member-app insta-member">/);
 assert.match(html,/member-instagram\.css\?v=4/);
 assert.doesNotMatch(html,/<header class="topbar">/);
 assert.doesNotMatch(html,/id="igSearchToggle"|id="searchArea"/);
 assert.doesNotMatch(html,/id="pagination"/);
 for(const id of ['igPromptCount','igCategoryCount','igSavedCount','quickCategories','grid','feedSentinel','feedRetry','categoryPanel'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(html,/<div class="ig-profile-photo"><img src="\/assets\/promptional-icon\.svg"/);
 assert.match(html,/class="ig-profile-bio"/);
 const footer=html.match(/<nav class="bottomnav" id="nav"[\s\S]*?<\/nav>/)?.[0]||'';
 assert.deepEqual([...footer.matchAll(/data-mode="([^"]+)"/g)].map(m=>m[1]),['all','affiliate','account']);
 assert.match(css,/\.insta-member \.grid\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\);gap:2px/);
 assert.match(css,/\.insta-member \.ig-tile\{position:relative;display:block;width:100%;min-width:0;aspect-ratio:1\/1/);
});
test('nine prompts per batch are appended automatically near grid bottom',()=>{
 assert.match(script,/const PAGE_SIZE=9/);
 assert.match(script,/Query\.limit\(PAGE_SIZE\)/);
 assert.match(script,/Query\.offset\(\(targetPage-1\)\*PAGE_SIZE\)/);
 assert.match(script,/async function loadPrompts\(requestId=\+\+libraryRequest,append=false\)/);
 assert.match(script,/const targetPage=append\?currentPage\+1:1/);
 assert.match(script,/all\.push\(\.\.\.rows\.filter\(item=>!known\.has\(item\.\$id\)\)\)/);
 assert.match(script,/async function loadNextBatch\(\)/);
 assert.match(script,/function initInfiniteScroll\(\)/);
 assert.match(script,/new IntersectionObserver\(/);
 assert.match(script,/rootMargin:'300px 0px'/);
 assert.match(script,/feedObserver\.observe\(\$\('feedSentinel'\)\)/);
 assert.match(script,/if\(feedRefreshing\|\|feedError\|\|!feedHasMore\)return false/);
 assert.match(script,/await loadFavorites\(\);fillFilters\(\);await refreshPrompts\(\);initInfiniteScroll\(\)/);
 assert.doesNotMatch(script,/renderPagination\(/);
});
test('tap a grid tile to see uncropped photo and visible prompt caption with copy only',()=>{
 assert.match(script,/class="ig-tile"/);
 assert.match(script,/grid\.querySelectorAll\('\[data-open\]'\)/);
 assert.match(script,/detailOverlay\.classList\.add\('show'\)/);
 assert.match(script,/safeCopy\(current\.prompt_text\)/);
 const modal=html.split('<div class="overlay" id="detailOverlay">')[1]?.split('<div class="overlay" id="affiliateOverlay">')[0]||'';
 assert.match(modal,/class="detailimage" id="detailImage"/);
 assert.match(modal,/class="ig-post-caption"/);
 assert.match(modal,/class="ig-caption-text" id="detailPrompt"/);
 assert.match(modal,/>SALIN PROMPT<\/button>/);
 assert.doesNotMatch(modal,/id="detailFav"|>Simpan<\/button>/);
 assert.match(css,/\.insta-member #detailOverlay \.detailimage>\.singlepreview,[\s\S]*?object-fit:contain/);
});
test('highlights filter data; vertical viewer navigates across loaded and future batches',()=>{
 for(const name of ['','Prompt Viral','Bisnis','Spontan','__saved'])
  assert.ok(html.includes('data-category-shortcut="'+name+'"'),name+' highlight');
 assert.match(script,/void applyCategory\(button\.dataset\.categoryShortcut,true\)/);
 assert.match(script,/void applyCategory\(categorySelect\.value,true\)/);
 assert.match(script,/Query\.equal\('category',category\)/);
 assert.match(script,/async function navigateDetail\(direction\)/);
 assert.match(script,/const adjacent=rows\[index\+direction\]/);
 assert.match(script,/const loaded=await loadNextBatch\(\)/);
 assert.match(script,/const next=loaded\?filteredRows\(\)\[index\+1\]:null/);
 assert.match(script,/swipeSurface\.addEventListener\('touchend'/);
 assert.match(script,/dy<0\?1:-1/);
 assert.match(script,/swipeSurface\.addEventListener\('wheel'/);
 assert.match(script,/e\.key==='ArrowDown'/);
 assert.doesNotThrow(()=>new vm.Script(script));
});
test('Appwrite authentication, profile, affiliate and favorites are not removed',()=>{
 for(const token of ['account.createEmailPasswordSession','loadProfile()','loadFavorites()',
  'tables.createRow','tables.deleteRow','memberApi','accountOverlay',
  'affiliateOverlay','Affiliate sedang disiapkan','showExistingMemberSession','switchMemberAccount'])
  assert.ok(html.includes(token),token+' must remain');
});
