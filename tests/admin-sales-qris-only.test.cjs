const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const admin=fs.readFileSync(path.join(root,'admin.html'),'utf8');
const sales=admin.match(/<section class="view" id="v-sales">([\s\S]*?)<section class="view" id="v-affiliate">/)?.[1]||'';

test('Sales focuses on website QRIS without legacy Telegram bot orders',()=>{
 assert.ok(sales,'sales screen is present');
 assert.match(sales,/Kelola order checkout QRIS website/);
 assert.doesNotMatch(sales,/tgOrdersPanel|tgOrdersChannel|tgOrdersSearch|tgOrdersList|tgBuyersList|Akun Telegram|Order Telegram/);
 assert.doesNotMatch(admin,/telegram-orders\.js|id="tgMemberEditor"|id="tgOrdersPanel"/);
});
test('website checkout order search, revenue, export and member controls stay in Sales',()=>{
 for(const id of [
 'addMemberBtn','salesPaidRevenue','salesPendingRevenue','salesOrderTotal',
 'salesPageSize','salesSearch','salesStatus','salesExportBtn',
 'salesTableBody','salesMobileList','salesPaginationBar','salesPaginationInfo'
 ])assert.match(sales,new RegExp('id="'+id+'"'),id);
 for(const id of ['orderModal','managePassword','manageOrderId','manageUserId','deleteManagedOrderBtn','deleteManagedMemberBtn'])
  assert.ok(admin.includes('id="'+id+'"'),id);
});
test('Telegram four-tab hub and bot manager remain independent of QRIS sales',()=>{
 assert.match(admin,/id="tgTabBot"/);
 assert.match(admin,/id="tgTabContent"/);
 assert.match(admin,/id="tgTabBroadcast"/);
 assert.match(admin,/id="tgTabAutoreply"/);
 assert.match(admin,/id="v-telegram"/);
 assert.match(admin,/id="v-marketing"/);
 assert.match(admin,/src="\/assets\/telegram-manager\.js\?v=2"/);
 assert.match(admin,/src="\/assets\/admin-marketing\.js/);
 const js=[...admin.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
 assert.ok(js.length>0);
 js.forEach(code=>assert.doesNotThrow(()=>new vm.Script(code)));
});
