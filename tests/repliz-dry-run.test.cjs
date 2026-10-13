const test=require('node:test');
const assert=require('node:assert/strict');
const {buildPlan,scheduledAt,pageUrl}=require('../scripts/repliz-dry-run.cjs');
const master=require('../data/repliz-master-30.json');

test('30 posts are unique, image-backed and preserve selected BP mapping',()=>{
  assert.equal(master.items.length,30);
  assert.deepEqual(master.items.slice(0,3).map(x=>x.bpCode),['BP033','BP003','BP051']);
  assert.equal(new Set(master.items.map(x=>x.bpCode)).size,30);
  assert.ok(master.items.every(x=>x.imageUrl.startsWith('https://')&&x.captionTemplate.includes('{BRAND}')));
});
test('WIB schedule converts to correct UTC and advances by day',()=>{
  assert.equal(scheduledAt('2026-10-15','07:00',1),'2026-10-15T00:00:00.000Z');
  assert.equal(scheduledAt('2026-10-15','07:00',3),'2026-10-17T00:00:00.000Z');
  assert.equal(scheduledAt('2026-12-31','06:30',2),'2026-12-31T23:30:00.000Z');
  for(const d of ['2026-02-30','2026-13-09','x'])assert.throws(()=>scheduledAt(d,'07:00',1));
  assert.throws(()=>scheduledAt('2026-10-15','25:00',1));
});
test('three dry-run posts map MAU to different URLs + automation templates',()=>{
  const p=buildPlan({days:3,client:'demo-rose',startDate:'2026-10-15'});
  assert.equal(p.matched,true);
  assert.equal(p.previewEnabled,3);
  assert.equal(p.count,3);
  assert.deepEqual(p.entries.map(x=>x.code),['BP033','BP003','BP051']);
  assert.equal(new Set(p.entries.map(x=>x.landingUrl)).size,3);
  for(const x of p.entries){
    assert.equal(x.commentKeyword,'MAU');
    assert.ok(x.template.config.message.condition.keywords.includes('MAU'));
    assert.equal(x.template.config.message.type,'opening');
    assert.equal(x.template.config.message.opening.postback.button.title,'AMBIL PROMPT');
    assert.equal(x.template.config.message.opening.webUrl.buttons[0].url,x.landingUrl);
    assert.equal(x.schedule.templateId,'DRY_RUN_TEMPLATE_'+x.code);
    assert.equal(x.schedule.accountId,'DEMO_ACCOUNT_NOT_CONNECTED');
    assert.equal(x.schedule.additionalInfo.isDraft,true);
    assert.equal(x.canPublish,false);
  }
});
test('full 30-day dry run blocks codes without preview release (no accidental publishing)',()=>{
  const plan=buildPlan({days:30,client:'demo-rose'});
  assert.equal(plan.count,30);
  assert.equal(plan.previewEnabled,3);
  assert.ok(plan.entries.slice(3).every(x=>!x.previewWhitelisted));
  assert.equal(plan.blocked,30);
  assert.equal(new Set(plan.entries.map(x=>x.idempotencyKey)).size,30);
  assert.deepEqual(plan.entries.map(x=>x.idempotencyKey),buildPlan({days:30,client:'demo-rose'}).entries.map(x=>x.idempotencyKey));
});
test('two brands get distinct URLs, same correct BP, and separate identities',()=>{
  const a=buildPlan({client:'demo-rose',days:3});
  const b=buildPlan({client:'demo-noir',days:3});
  for(let i=0;i<3;i++){
    assert.equal(a.entries[i].code,b.entries[i].code);
    assert.notEqual(a.entries[i].landingUrl,b.entries[i].landingUrl);
    assert.notEqual(a.entries[i].idempotencyKey,b.entries[i].idempotencyKey);
    assert.ok(!a.entries[i].schedule.description.includes('NOIR STUDIO'));
    assert.ok(b.entries[i].schedule.description.includes('NOIR STUDIO'));
  }
});
test('untrusted host and tenant names cannot be used',()=>{
  assert.throws(()=>pageUrl('https://evil.example','demo-rose','BP003'));
  assert.throws(()=>pageUrl('http://promptional.vercel.app','demo-rose','BP003'));
  assert.throws(()=>pageUrl('https://promptional.vercel.app','__proto__','BP003'));
  assert.throws(()=>pageUrl('https://promptional.vercel.app','demo-rose','BP999'));
  assert.throws(()=>buildPlan({client:'unknown',days:3}));
  assert.throws(()=>buildPlan({days:4}));
});
