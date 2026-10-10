import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assessLaunchReadiness} from '../functions/activate-member/src/telegram/launch-readiness.mjs';

const base={
 content:{target:365,approved:0,ready_days:0,scene_candidates:32,prompt_candidates_total:500,enabled:false},
 monitor:{due:2,delete_due:0,retry:0,uncertain:0,failed:0},
 settings:{enabled:true,paused:false,dry_run:false},
 mainBot:{username:'BadaiPromptBot'},
 pricing:{price:199000,minimum:199000},
 flags:{qrisEnabled:false,passwordlessEnabled:false},
 members:{registered:2,free:2,premium:0}
};
test('realistic 32 visual candidates do not masquerade as 365 ready days',()=>{
 const result=assessLaunchReadiness(base);
 assert.equal(result.status,'NOT_READY');
 assert.equal(result.stock.curated,0);
 assert.equal(result.stock.visual_candidates,32);
 assert.equal(result.stock.needed_for_365,365);
 assert.ok(result.blockers.some(x=>x.code==='content_runway'));
 assert.ok(result.warnings.some(x=>x.code==='annual_stock'));
 assert.ok(result.next.some(x=>x.code==='approve_visual'));
});
test('30 approved contiguous prompt days allow technical review but never claim product launch approval',()=>{
 const obj={...base,content:{...base.content,approved:32,ready_days:32,enabled:true}};
 const r=assessLaunchReadiness(obj);
 assert.equal(r.status,'REQUIRES_MANUAL_REVIEW');
 assert.equal(r.stock.needed_for_365,333);
 assert.equal(r.stock.days_until_content_gap,32);
 assert.ok(r.next.some(x=>x.code==='isolated_real_check'));
 assert.doesNotMatch(r.status,/GO|READY$/);
});
test('in-bot QRIS policy and payment anomalies always block even with a full content library',()=>{
 const obj={...base,content:{...base.content,approved:365,ready_days:365,scene_candidates:365},flags:{qrisEnabled:true,passwordlessEnabled:true},monitor:{...base.monitor,uncertain:1,failed:2}};
 const r=assessLaunchReadiness(obj);
 assert.equal(r.status,'NOT_READY');
 assert.ok(r.blockers.some(x=>x.code==='qris_in_bot_policy'));
 assert.ok(r.blockers.some(x=>x.code==='uncertain_delivery'));
 assert.ok(r.blockers.some(x=>x.code==='failed_delivery'));
});
test('no claims of pricing consistency when backend settings drift',()=>{
 const r=assessLaunchReadiness({...base,content:{...base.content,ready_days:365},pricing:{price:59000,minimum:30000}});
 assert.equal(r.checks.site_price_correct,false);
 assert.ok(r.blockers.some(x=>x.code==='website_price'));
});
test('readiness renderer escapes source message text and audit contains no mutable actions',()=>{
 const admin=fs.readFileSync(new URL('../admin.html',import.meta.url),'utf8');
 const js=fs.readFileSync(new URL('../assets/telegram-manager.js',import.meta.url),'utf8');
 assert.match(admin,/id="tgLaunchStatus"/);assert.match(admin,/id="tgLaunchMetrics"/);
 assert.match(admin,/id="tgLaunchChecklist"/);
 assert.match(js,/function renderLaunch\(l\)/);
 assert.match(js,/escape\(x.message\)/);
 assert.match(js,/request\('content-status'\)/);
});
