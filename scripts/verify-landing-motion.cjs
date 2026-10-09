let playwright;
try { playwright = require('playwright'); } catch (_) { playwright = require('/opt/codex/runtimes/cua/lib/node_modules/playwright'); }
const {chromium}=playwright; const fs=require('fs'); const root=require('path').resolve(__dirname, '..');const live=process.env.MOTION_LIVE==='1';
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox'],proxy:{server:process.env.HTTPS_PROXY}});let results=[];
for(const mode of ['normal','touch-390','touch-320','legacy-media','reduce','no-observer','stalled-decode','blocked-script']){
const touch=mode.startsWith('touch');const width=mode==='touch-320'?320:touch?390:1280;
const p=await browser.newPage({viewport:{width,height:900},hasTouch:touch,isMobile:touch,reducedMotion:mode==='reduce'?'reduce':'no-preference'});let errors=[];p.on('pageerror',e=>errors.push(e.message));
if(!live)await p.route('https://badaiprompt.vercel.app/**',route=>{const url=new URL(route.request().url());const path=root+(url.pathname==='/'?'/index.html':url.pathname);if(fs.existsSync(path)&&fs.statSync(path).isFile())return route.fulfill({path,contentType:path.endsWith('.html')?'text/html':path.endsWith('.css')?'text/css':path.endsWith('.js')?'application/javascript':'application/octet-stream'});return route.continue()});
if(mode==='legacy-media')await p.addInitScript(()=>{const original=window.matchMedia.bind(window);window.matchMedia=s=>{const m=original(s);m.addEventListener=undefined;return m}});
if(mode==='no-observer')await p.addInitScript(()=>{delete window.IntersectionObserver;delete window.ResizeObserver});
if(mode==='stalled-decode')await p.addInitScript(()=>{HTMLImageElement.prototype.decode=()=>new Promise(()=>{})});
if(mode==='blocked-script')await p.route('**/assets/landing.js*',r=>r.abort());
await p.addInitScript(()=>sessionStorage.setItem('badai-motion','off'));
await p.goto('https://badaiprompt.vercel.app/',{waitUntil:'domcontentloaded'});await p.waitForTimeout(350);
const orbit=p.locator('.hero-spark .spark-icon');const transform=()=>orbit.evaluate(el=>getComputedStyle(el).transform);
if(await p.locator('[data-motion-toggle],#motionToggle').count())throw Error('Motion controls remain');
const first=await transform();await p.waitForTimeout(700);const second=await transform();if(first===second)throw Error(mode+' hero stuck');
if(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error(mode+' overflow');
if(mode==='normal'||touch){await p.screenshot({path:`/workspace/work/motion2-${width}.png`});}
await p.locator('.visual-carousel').scrollIntoViewIfNeeded();await p.locator('.visual-carousel').hover();await p.waitForTimeout(200);const track=p.locator('.visual-carousel .marquee-track');const x1=await track.evaluate(el=>getComputedStyle(el).transform);await p.waitForTimeout(700);const x2=await track.evaluate(el=>getComputedStyle(el).transform);if(x1===x2)throw Error(mode+' gallery stuck while hovered');
if(mode!=='blocked-script'){
 await p.locator('.price-choice').last().click();if(await p.locator('#checkoutModal').evaluate(el=>el.classList.contains('show')))throw Error(mode+' price opens popup');if(!await p.locator('#harga #checkoutForm').isVisible())throw Error(mode+' inline form missing');if(await p.locator('#payBtn').innerText()!=='PROSES DAFTAR SEKARANG!')throw Error(mode+' wrong registration label');
}
if(errors.length)throw Error(mode+': '+errors.join(','));results.push({mode,heroMoves:true,galleryMovesOnHover:true,errors});await p.close();console.log(mode+' PASS');}
fs.writeFileSync('/tmp/badai-motion2-'+(live?'live':'local')+'-results.json',JSON.stringify(results,null,2));await browser.close();})().catch(e=>{console.error(e);process.exit(1)});
