const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'admin.html'),'utf8');
const ui=fs.readFileSync(path.join(root,'assets/admin-telegram-tabs.js'),'utf8');
const style=fs.readFileSync(path.join(root,'assets/admin-telegram-tabs.css'),'utf8');
const manager=fs.readFileSync(path.join(root,'assets/telegram-manager.js'),'utf8');
const marketing=fs.readFileSync(path.join(root,'assets/admin-marketing.js'),'utf8');
const api=fs.readFileSync(path.join(root,'api/telegram/manager.js'),'utf8');
test('Telegram replaces Marketing in footer without changing route or QRIS Sales',()=>{
 assert.match(html,/data-view="marketing"><b>▦<\/b>Telegram<\/button>/);
 assert.match(html,/id="salesTableBody"/);
 assert.match(html,/id="salesPaidRevenue"/);
 assert.doesNotMatch(html,/data-settings-tab="telegram"|data-settings-panel="telegram"/);
});
test('tabs are Bot, Konten, Broadcast and Autoreply only',()=>{
 assert.deepEqual([...html.matchAll(/data-tg-tab="([^"]+)"/g)].map(x=>x[1]),['bot','content','broadcast','autoreply']);
 for(const id of ['tgTabBot','tgTabContent','tgTabBroadcast','tgTabAutoreply'])assert.ok(html.includes('id="'+id+'"'));
 assert.match(style,/\.telegram-hub \.tg-main-tabs/);
});
test('Bot and 365-day Content controls stay wired, with adjustable daily interval and deletion',()=>{
 for(const id of ['v-telegram','tgBotForm','tgToken','tgActivate','tgSettingsForm','tgFreeDays','tgDeleteHours','mktCalendar','mktEditOffer','mktDefaultOffer','mktLoop','mktTestForm'])assert.ok(html.includes('id="'+id+'"'));
 assert.match(html,/id="tgDeleteHours"[^>]*value="24"[^>]*min="1"[^>]*max="47"/);
 assert.match(manager,/querySelector\('\[data-view="marketing"\]'\)/);
 assert.match(marketing,/querySelector\('\[data-tg-tab="content"\]'\)/);
});
test('Broadcast requires separate draft, explicit send, throttling, opt-in and pause',()=>{
 for(const id of ['tgBroadcastForm','tgBroadcastConfirm','tgBroadcastSend','tgBroadcastPause','tgBroadcastPreview'])assert.ok(html.includes('id="'+id+'"'));
 assert.match(ui,/request\('broadcast-draft'/);
 assert.match(ui,/request\('broadcast-send-batch'/);
 assert.match(ui,/broadcastWait\(3500\)/);
 assert.match(ui,/tgBroadcastPause/);
 assert.match(ui,/KIRIM BROADCAST/);
 for(const key of ['broadcast-get','broadcast-draft','broadcast-send-batch'])assert.ok(api.includes("'"+key+"'"));
});
test('Autoreply uses exact keyword list and rich-text toolbar without immediate sending',()=>{
 for(const id of ['tgReplyForm','tgReplyKeyword','tgReplyText','tgReplyEnabled','tgReplyList'])assert.ok(html.includes('id="'+id+'"'));
 assert.match(ui,/request\('autoreply-save'/);
 assert.match(ui,/request\('autoreply-delete'/);
 assert.match(ui,/\.tg-format-toolbar\[data-target\]/);
 for(const key of ['autoreply-list','autoreply-save','autoreply-delete'])assert.ok(api.includes("'"+key+"'"));
 assert.doesNotThrow(()=>new vm.Script(ui));
 assert.doesNotThrow(()=>new vm.Script(manager));
 assert.doesNotThrow(()=>new vm.Script(marketing));
});
