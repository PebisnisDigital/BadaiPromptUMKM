const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'member.html'),'utf8');
const css=fs.readFileSync(path.join(root,'assets/member-instagram.css'),'utf8');
const script=html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1]||'';

test('profile, highlights and Instagram-like 3-column image grid remain unchanged',()=>{
 assert.match(html,/<body class="member-app insta-member">/);
 assert.match(html,/member-instagram\.css\?v=5/);
 assert.doesNotMatch(html,/<header class="topbar">/);
 assert.doesNotMatch(html,/id="igSearchToggle"|id="searchArea"/);
 for(const id of ['igPromptCount','igCategoryCount','igSavedCount','quickCategories','grid','categoryPanel'])
  assert.ok(html.includes('id="'+id+'"'),id);
 const footer=html.match(/<nav class="bottomnav" id="nav"[\s\S]*?<\/nav>/)?.[0]||'';
 assert.deepEqual([...footer.matchAll(/data-mode="([^"]+)"/g)].map(m=>m[1]),['all','affiliate','account']);
 assert.match(css,/\.insta-member \.grid\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\);gap:2px/);
});
test('nine per page with manual options dropdown, previous and next; no auto-loading',()=>{
 assert.match(script,/const PAGE_SIZE=9/);
 assert.match(script,/Query\.limit\(PAGE_SIZE\)/);
 assert.match(script,/Query\.offset\(\(currentPage-1\)\*PAGE_SIZE\)/);
 assert.match(script,/async function loadPrompts\(requestId=\+\+libraryRequest\)/);
 assert.match(script,/async function goToPage\(page,scroll=true\)/);
 assert.match(script,/function renderPagination\(\)/);
 assert.match(script,/\$\('pageSelect'\)\.onchange=\(\)=>/);
 assert.match(script,/\$\('pagePrev'\)\.onclick=\(\)=>/);
 assert.match(script,/\$\('pageNext'\)\.onclick=\(\)=>/);
 assert.match(script,/\$\('pageJump'\)\.onsubmit=e=>/);
 for(const id of ['pagination','pageSelect','pageTotalLabel','pagePrev','pageNext','pageJump','pageJumpInput'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.doesNotMatch(html,/id="feedSentinel"|id="feedRetry"/);
 assert.doesNotMatch(script,/new IntersectionObserver|loadNextBatch\(|initInfiniteScroll\(|mayLoadMore\(|feedObserver/);
 assert.match(css,/\.insta-member \.ig-page-control\{/);
});
test('large collections offer page selection without rendering hundreds of thousands of options',()=>{
 assert.match(script,/totalPages<=300\?Array\.from/);
 assert.match(script,/jump\.hidden=totalPages<=300/);
 assert.match(script,/\$\('pageJumpInput'\)\.max=String\(totalPages\)/);
 assert.match(script,/if\(desired===currentPage\)\{renderPagination\(\);return\}/);
});
test('full-image caption modal and copy-only action remain',()=>{
 const modal=html.split('<div class="overlay" id="detailOverlay">')[1]?.split('<div class="overlay" id="affiliateOverlay">')[0]||'';
 assert.match(modal,/class="detailimage" id="detailImage"/);
 assert.match(modal,/class="ig-post-caption"/);
 assert.match(modal,/class="ig-caption-text" id="detailPrompt"/);
 assert.match(modal,/>SALIN PROMPT<\/button>/);
 assert.doesNotMatch(modal,/detailFav|>Simpan<\/button>/);
 assert.match(script,/safeCopy\(current\.prompt_text\)/);
 assert.match(css,/\.insta-member #detailOverlay \.detailimage>\.singlepreview,[\s\S]*?object-fit:contain/);
});
test('highlights reset page and detail swipe crosses page boundaries safely',()=>{
 assert.match(script,/void applyCategory\(button\.dataset\.categoryShortcut,true\)/);
 assert.match(script,/currentPage=1;\s*syncLibraryChoices\(\);/);
 assert.match(script,/Query\.equal\('category',category\)/);
 assert.match(script,/async function navigateDetail\(direction\)/);
 assert.match(script,/const nextPage=currentPage\+direction/);
 assert.match(script,/await loadPrompts\(requestId\)/);
 assert.match(script,/swipeSurface\.addEventListener\('touchend'/);
 assert.match(script,/dy<0\?1:-1/);
 assert.match(script,/swipeSurface\.addEventListener\('wheel'/);
 assert.doesNotThrow(()=>new vm.Script(script));
});
test('Appwrite access and account, affiliate, favorites are untouched',()=>{
 for(const token of ['account.createEmailPasswordSession','loadProfile()','loadFavorites()','tables.createRow',
 'tables.deleteRow','memberApi','accountOverlay','affiliateOverlay','showExistingMemberSession','switchMemberAccount'])
  assert.ok(html.includes(token),token);
});
