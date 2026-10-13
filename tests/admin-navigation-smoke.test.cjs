const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'admin.html'),'utf8');
const tgJs=fs.readFileSync(path.join(root,'assets/telegram-manager.js'),'utf8');
const tgCss=fs.readFileSync(path.join(root,'assets/telegram-manager.css'),'utf8');
const marketJs=fs.readFileSync(path.join(root,'assets/admin-marketing.js'),'utf8');
const marketCss=fs.readFileSync(path.join(root,'assets/admin-marketing.css'),'utf8');

test('bottom navigation has five focused menus, no Telegram shortcut',()=>{
 const navbar=html.match(/<nav class="bottomnav telegram-nav" id="nav">([\s\S]*?)<\/nav>/)?.[1]||'';
 const tabs=[...navbar.matchAll(/data-view="([^"]+)"/g)].map(x=>x[1]);
 assert.deepEqual(tabs,['prompts','sales','affiliate','marketing','settings']);
 assert.doesNotMatch(navbar,/data-view="telegram"/);
 assert.match(marketCss,/nav\.telegram-nav\{grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
});

test('Telegram uses four dedicated tabs, with bot controls moved out of Settings',()=>{
 const telegram=html.match(/<section class="view marketing-view telegram-hub" id="v-marketing"([\s\S]*?)(?=<\/main>)/)?.[0]||'';
 assert.ok(telegram,'Telegram main view is present');
 const buttons=[...telegram.matchAll(/data-tg-tab="([^"]+)"/g)].map(x=>x[1]);
 assert.deepEqual(buttons,['bot','content','broadcast','autoreply']);
 for(const id of ['v-telegram','tgBotForm','tgBotSelect','tgToken','tgSettingsForm','tgEnabled','tgTime','tgFreeDays','tgDeleteHours','tgTester','mktCalendar','mktEditOffer','mktLoop','tgBroadcastForm','tgReplyForm']){
  assert.equal([...html.matchAll(new RegExp('id="'+id+'"','g'))].length,1,id+' stays unique');
  assert.ok(telegram.includes('id="'+id+'"'),id+' moved under main Telegram view');
 }
 const settings=html.match(/<section class="view" id="v-settings">([\s\S]*?)<section class="view marketing-view telegram-hub"/)?.[1]||'';
 assert.doesNotMatch(settings,/data-settings-tab="telegram"|data-settings-panel="telegram"/);
 assert.match(html,/\.settings-tabs\{display:grid;grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
 assert.match(tgCss,/nav\.telegram-nav\{grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
});

test('marketing is dedicated to Telegram content, with scheduling, preview and test send',()=>{
 const marketing=html.match(/<section class="view marketing-view telegram-hub" id="v-marketing"[\s\S]*?(?=<\/main>)/)?.[0]||'';
 assert.match(marketing,/TELEGRAM → KONTEN/);
 assert.match(marketing,/Konten & Kalender 365 Hari/);
 assert.match(marketing,/Pilih prompt, atur jadwal/);
 const contentOrder=['id="mktCalendar"','id="mktEditForm"','id="mktSettingsForm"','id="mktTestForm"'].map(id=>marketing.indexOf(id));
 assert.ok(contentOrder.every(n=>n>=0),'all content tools are visible');
 assert.deepEqual(contentOrder.slice().sort((a,b)=>a-b),contentOrder,'content editor is shown before schedule and test');
 assert.match(marketing,/1 · KELOLA KONTEN/);
 assert.match(marketing,/2 · JADWAL & PENGUJIAN/);
 for(const id of ['mktSettingsForm','mktTestForm','mktCalendar','mktPromptList','mktEditForm','mktMockContent']){
  assert.match(marketing,new RegExp('id="'+id+'"'));
 }
 assert.match(marketJs,/marketing-slot-save/);
 assert.match(marketJs,/marketing-test-send/);
});

test('Telegram Manager now loads lazily from Telegram nav and Bot tab',()=>{
 assert.match(tgJs,/querySelector\('\[data-view="marketing"\]'\)/);
 assert.match(tgJs,/telegramMenu\?\.addEventListener\('click',init\)/);
 assert.doesNotMatch(tgJs,/\[data-view=telegram\]/);
 assert.doesNotThrow(()=>new vm.Script(tgJs));
 assert.doesNotThrow(()=>new vm.Script(marketJs));
 const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
 assert.ok(scripts.length>0);
 scripts.forEach(x=>assert.doesNotThrow(()=>new vm.Script(x[1])));
});
