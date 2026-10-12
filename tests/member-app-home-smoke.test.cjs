const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'member.html'),'utf8');
const css=fs.readFileSync(path.join(root,'assets/member-app-home.css'),'utf8');
const script=html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1]||'';

test('member is a mobile-first white/black/orange app shell',()=>{
 assert.match(html,/meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/);
 assert.match(html,/member-app-home\.css\?v=mobile1/);
 assert.match(css,/\.member-app \.shell\{width:min\(100%,560px\)/);
 assert.match(css,/\.member-app \.shell>main\{padding:16px 17px 22px\}/);
 assert.match(css,/\.member-app \.member-feature\{/);
 assert.match(css,/\.member-app \.member-search input\{/);
 assert.match(css,/\.member-app \.grid\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/\.member-app \.bottomnav\{position:fixed;bottom:0;/);
 assert.match(css,/grid-template-columns:repeat\(4,1fr\)/);
 assert.match(css,/safe-area-inset-bottom/);
});
test('app header and personal greeting keep member controls',()=>{
 for(const id of ['accountBtn','memberName','featureCount','search','passwordReminder','grid','pagination']){
  assert.ok(html.includes('id="'+id+'"'),id+' remains available');
 }
 assert.match(html,/id="memberName">Kak<\/span>/);
 assert.match(script,/function refreshGreeting\(\)/);
 assert.match(script,/currentProfile\?\.name\|\|currentUser\?\.name/);
 assert.match(script,/gate\.classList\.add\('hide'\)/);
 assert.match(script,/currentProfile\.status!=='active'/);
});
test('real category shortcuts include currently published Prompt Viral category',()=>{
 assert.match(script,/const CATEGORIES=\['Prompt Viral','Spontan'/);
 for(const category of ['','Prompt Viral','Bisnis','Spontan','__saved']){
  assert.ok(html.includes('data-category-shortcut="'+category+'"'),category+' shortcut');
 }
 assert.equal([...html.matchAll(/class="quick-category(?: on)?"/g)].length,5);
 assert.match(script,/button\.addEventListener\('click',\(\)=>\{void applyCategory\(button\.dataset\.categoryShortcut,true\)\}/);
 assert.match(script,/categorySelect\.onchange=\(\)=>applyCategory\(categorySelect\.value,true\)/);
 assert.match(script,/Query\.equal\('category',category\)/);
 assert.match(script,/Query\.equal\('is_published',true\)/);
 assert.match(script,/Query\.orderDesc\('sort_order'\)/);
 assert.match(script,/const PAGE_SIZE=12/);
 assert.match(script,/categorySelect\.value=mode==='favorites'\?'__saved':category/);
});
test('four bottom app tabs preserve working saved, affiliate and account actions',()=>{
 const nav=html.match(/<nav class="bottomnav" id="nav">([\s\S]*?)<\/nav>/)?.[1]||'';
 assert.equal([...nav.matchAll(/<button\b/g)].length,4);
 for(const mode of ['all','favorites','affiliate','account'])assert.ok(nav.includes('data-mode="'+mode+'"'),mode+' tab');
 for(const label of ['Beranda','Tersimpan','Affiliate','Akun'])assert.ok(nav.includes(label+'</button>'),label);
 assert.match(script,/b\.dataset\.mode==='favorites'\?'__saved':''/);
 assert.match(script,/if\(b\.dataset\.mode==='affiliate'\)\{affiliateOverlay\.classList\.add\('show'\)/);
 assert.match(script,/if\(b\.dataset\.mode==='account'\)\{openAccount\(\)/);
 assert.match(script,/function syncLibraryChoices\(\)/);
});
test('existing gallery, copy, favorites, pagination and payment login flow are preserved',()=>{
 for(const x of ['id="loginForm"','id="detailOverlay"','id="detailCopy"','id="detailFav"','id="accountForm"','id="tgLinkBtn"','id="firstPasswordOverlay"']){
  assert.ok(html.includes(x),x);
 }
 assert.match(script,/async function loadFavorites\(\)/);
 assert.match(script,/async function toggleFavorite\(id\)/);
 assert.match(script,/function renderPagination\(\)/);
 assert.match(script,/function carouselMarkup\(x,detail=false\)/);
 assert.match(script,/function safeCopy|async function safeCopy/);
 assert.match(script,/await loadProfile\(\)/);
 assert.match(script,/await enterLibrary\(\)/);
 assert.match(script,/await account\.createEmailPasswordSession/);
 assert.doesNotThrow(()=>new vm.Script(script));
});
