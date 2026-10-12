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

test('Telegram Manager is entirely inside Settings > Telegram and its original controls survive',()=>{
 const settings=html.match(/<section class="view" id="v-settings">([\s\S]*?)<section class="view marketing-view"/)?.[1]||'';
 assert.match(settings,/data-settings-tab="telegram"/);
 assert.match(settings,/data-settings-panel="telegram"/);
 const panel=settings.indexOf('data-settings-panel="telegram"'),manager=settings.indexOf('id="v-telegram"');
 assert.ok(panel>=0&&manager>panel);
 for(const id of ['tgStatus','tgStats','tgBotForm','tgBotSelect','tgToken','tgSettingsForm','tgEnabled','tgTime','tgFreeDays','tgPremiumDays','tgPause','tgResume','tgDryTest','tgTester','tgAuthorizeTester','tgTestResult']){
  assert.equal([...html.matchAll(new RegExp('id="'+id+'"','g'))].length,1,id+' remains unique');
  assert.ok(settings.includes('id="'+id+'"'),id+' is inside Settings');
 }
 assert.doesNotMatch(html,/<section class="view telegram-view"/);
 assert.match(html,/\.settings-tabs\{display:grid;grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
 assert.match(tgCss,/html:has\(\[data-settings-panel="telegram"\]\.on\)/);
});

test('marketing is dedicated to Telegram content, with scheduling, preview and test send',()=>{
 const marketing=html.match(/<section class="view marketing-view" id="v-marketing"[\s\S]*?(?=<\/main>)/)?.[0]||'';
 assert.match(marketing,/MARKETING • KONTEN BOT TELEGRAM/);
 assert.match(marketing,/Konten Telegram 365 Hari/);
 assert.match(marketing,/Atur isi pesan yang dikirim oleh bot/);
 for(const id of ['mktSettingsForm','mktTestForm','mktCalendar','mktPromptList','mktEditForm','mktMockContent']){
  assert.match(marketing,new RegExp('id="'+id+'"'));
 }
 assert.match(marketJs,/marketing-slot-save/);
 assert.match(marketJs,/marketing-test-send/);
});

test('Telegram Manager loads lazily from the settings tab without calling a removed nav item',()=>{
 assert.match(tgJs,/querySelector\('\[data-settings-tab="telegram"\]'\)/);
 assert.match(tgJs,/settingsTelegramTab\.addEventListener\('click'/);
 assert.doesNotMatch(tgJs,/\[data-view=telegram\]/);
 assert.doesNotThrow(()=>new vm.Script(tgJs));
 assert.doesNotThrow(()=>new vm.Script(marketJs));
 const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
 assert.ok(scripts.length>0);
 scripts.forEach(x=>assert.doesNotThrow(()=>new vm.Script(x[1])));
});
