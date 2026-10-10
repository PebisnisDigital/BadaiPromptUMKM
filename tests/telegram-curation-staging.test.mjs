import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const load=path=>JSON.parse(fs.readFileSync(new URL(path,import.meta.url),'utf8'));
const review=load('../docs/first-30-curation-20261010.json');
const db=load('../docs/first-30-curation-appwrite-staging.json');
test('first 30 candidates use 30 unique source prompt IDs, quarantine Cuanify-brand example',()=>{
 assert.equal(review.items.length,30);
 assert.equal(new Set(review.items.map(x=>x.prompt_id)).size,30);
 assert.deepEqual(review.items.filter(x=>x.review_status==='pending_brand_review').map(x=>x.code),['BP021']);
 assert.equal(review.items.filter(x=>x.review_status==='approved_editorial').length,29);
 assert.ok(!review.queue_activation);
});
test('approved 29 slots are contiguous and uniquely fingerprinted, no duplicates BP029/BP030',()=>{
 const slots=db.rows.filter(x=>x.kind==='content'),fingerprints=db.rows.filter(x=>x.kind==='content_hash');
 assert.equal(slots.length,29);
 assert.equal(fingerprints.length,29);
 assert.deepEqual(slots.map(x=>JSON.parse(x.payload).position),Array.from({length:29},(_,i)=>i+1));
 assert.equal(new Set(slots.map(x=>JSON.parse(x.payload).fingerprint)).size,29);
 assert.equal(new Set(fingerprints.map(x=>x.$id)).size,29);
 assert.ok(slots.every(x=>/^https:\/\//.test(JSON.parse(x.payload).preview_url)));
 assert.ok(slots.every(x=>x.status==='approved'));
 assert.ok(!review.items.filter(x=>['BP029','BP030'].includes(x.code)).length);
});
