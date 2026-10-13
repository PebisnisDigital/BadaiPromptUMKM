const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeCode, getDemoTenant, isStagingAllowed, safeImageUrl, safeCheckoutUrl } = require('../lib/marketing-public');

test('accepts 185 valid routes but not arbitrary codes', () => {
  assert.equal(normalizeCode('BP001'), 'BP001');
  assert.equal(normalizeCode('BP185'), 'BP185');
  for (const v of ['BP000','BP186','BP3','bp003','../BP003',undefined,'BP003?x=1']) {
    assert.equal(normalizeCode(v), null);
  }
});
test('staging allows only three approved codes', () => {
  for(const bp of ['BP003','BP033','BP051']) {
    assert.equal(isStagingAllowed({VERCEL_ENV:'preview'},bp), true);
    assert.equal(isStagingAllowed({VERCEL_ENV:'production'},bp), false);
  }
  assert.equal(isStagingAllowed({VERCEL_ENV:'preview'},'BP034'), false);
  assert.equal(isStagingAllowed({},'BP003'), false);
});
test('tenant settings cannot bleed or select prototype pollution', () => {
  assert.equal(getDemoTenant('demo-rose').name,'ROSE CREATIVE');
  assert.equal(getDemoTenant('demo-noir').name,'NOIR STUDIO');
  assert.equal(getDemoTenant('__proto__'),null);
  assert.equal(getDemoTenant('../demo-rose'),null);
});
test('prevents malicious or insecure preview and checkout URLs', () => {
  assert.ok(safeImageUrl('https://www.dropbox.com/scl/fi/a/b.jpg?raw=1'));
  for (const u of ['http://www.dropbox.com/x','https://bad.com/x','javascript:alert(1)','https://www.dropbox.com.bad.site/a']) {
    assert.equal(safeImageUrl(u),null);
  }
  assert.equal(safeCheckoutUrl(null),null);
  assert.equal(safeCheckoutUrl('javascript:alert(1)'),null);
  assert.equal(safeCheckoutUrl('https://shop.example.com/beli'),'https://shop.example.com/beli');
});
