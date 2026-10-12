const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1] || '';

test('one cinematic hero and correctly centered photo sphere', () => {
  assert.equal([...html.matchAll(/<section\b/gi)].length, 1);
  assert.match(html, /<section id="hero"/);
  assert.match(html, /<div id="world"><div id="orb"><\/div>/);
  assert.match(html, /#world\s*\{\s*position:absolute;top:50%;left:50%;width:0;height:0/);
  assert.match(html, /margin-left:calc\(var\(--hw\) \/ -2\)/);
  assert.match(html, /transform:translateY\(-50%\)/);
  assert.match(script, /rotateX\(/);
  assert.match(script, /translateZ\(/);
});

test('21 real visual previews, drag, grid and preview modal', () => {
  assert.equal([...html.matchAll(/\{code:"BP\d{3}",src:/g)].length, 21);
  assert.match(html, /id="gridBtn"/);
  assert.match(html, /id="grid"/);
  assert.match(html, /id="lit"/);
  assert.match(script, /Fibonacci|GA=Math\.PI/);
  assert.match(script, /pointerdown/);
  assert.match(script, /pointermove/);
  assert.match(script, /function openShot/);
});

test('only one conversion path: free Telegram, no website registration', () => {
  assert.equal([...html.matchAll(/href="https:\/\/t\.me\/BadaiPromptBot\?start=landing_free"/g)].length, 1);
  assert.match(html, /AMBIL PROMPT GRATIS/);
  assert.match(html, /Setiap hari\./);
  assert.match(html, /Tanpa isi formulir di website/);
  assert.doesNotMatch(html, /<form\b|checkout|LOGIN MEMBER|Rp199\.000|BUKA SEMUA/i);
});

test('standalone CSS and JavaScript, accessible reduced-motion fallback', () => {
  assert.match(html, /<style>/);
  assert.equal([...html.matchAll(/<script\b/g)].length, 1);
  assert.doesNotMatch(html, /<script[^>]+src=/);
  assert.match(html, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(script, /setAttribute\("aria-label","Buka preview visual "/);
  assert.match(html, /<a class="skip-link"/);
  assert.doesNotThrow(() => new vm.Script(script));
});
