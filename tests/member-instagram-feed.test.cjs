const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'member.html'),'utf8');
const css=fs.readFileSync(path.join(root,'assets/member-instagram.css'),'utf8');
const script=html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1]||'';

test('Instagram-inspired Member Area only, with three sticky footer tabs',()=>{
 assert.match(html,/<body class="member-app insta-member">/);
 assert.match(html,/member-instagram\.css/);
 const footer=html.match(/<nav class="bottomnav" id="nav"[\s\S]*?<\/nav>/)?.[0]||'';
 assert.deepEqual([...footer.matchAll(/data-mode="([^"]+)"/g)].map(m=>m[1]),['all','affiliate','account']);
 assert.match(footer,/>PROMPT<\/button>/);
 assert.match(footer,/>AFFILIATE<\/button>/);
 assert.match(footer,/>AKUN<\/button>/);
 assert.match(css,/\.insta-member \.grid\{display:grid;grid-template-columns:minmax\(0,1fr\)/);
 assert.match(css,/\.insta-member \.bottomnav\{grid-template-columns:repeat\(3/);
});
test('tap a feed image to open prompt details and leave copy/save intact',()=>{
 assert.match(script,/function render\(\)/);
 assert.match(script,/class="card insta-post"/);
 assert.match(script,/data-open/);
 assert.match(script,/data-save/);
 assert.match(script,/grid\.querySelectorAll\('\[data-open\]'\)/);
 assert.match(script,/grid\.querySelectorAll\('\[data-save\]'\)/);
 assert.match(script,/detailOverlay\.classList\.add\('show'\)/);
 assert.match(script,/detailOverlay\.querySelector\('details'\)\.open=true/);
 assert.match(script,/safeCopy\(current\.prompt_text\)/);
 assert.match(script,/favorites\.has\(current\.\$id\)/);
});
test('vertical swipe controls, keyboard, wheel and cross-page navigation work',()=>{
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
test('authentication, profile, favorites, and affiliate behavior preserved',()=>{
 for(const token of [
  'account.createEmailPasswordSession','loadProfile()','loadFavorites()',
  'tables.createRow','tables.deleteRow','memberApi','accountOverlay',
  'affiliateOverlay','Affiliate sedang disiapkan',
  'showExistingMemberSession','switchMemberAccount'
 ])assert.ok(html.includes(token),token+' is required');
});
