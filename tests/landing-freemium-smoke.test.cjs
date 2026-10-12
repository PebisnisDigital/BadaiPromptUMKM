const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('landing page contains exactly one hero section', () => {
  assert.equal([...html.matchAll(/<section\b/gi)].length, 1);
  assert.match(html, /<section class="landing" id="home" aria-labelledby="hero-title">/);
  assert.match(html, /<h1 id="hero-title">PROMPT AI/);
  assert.match(html, /SETIAP HARI/);
  assert.match(html, /DI TELEGRAM/);
});

test('one clear Telegram path without website registration', () => {
  const botLinks = [...html.matchAll(/href="https:\/\/t\.me\/BadaiPromptBot\?start=landing_free"/g)];
  assert.equal(botLinks.length, 1);
  assert.match(html, /AMBIL PROMPT GRATIS/);
  assert.match(html, /Tanpa daftar di website/);
  assert.doesNotMatch(html, /<form\b|checkout|href="#harga"|LOGIN MEMBER|Rp199\.000|BUKA SEMUA/i);
});

test('visual preview is clearly identified as a simulation', () => {
  assert.match(html, /PREVIEW PROMPT/);
  assert.match(html, /SIMULASI TAMPILAN/);
  assert.match(html, /alt="Contoh hasil prompt AI/);
});

test('mobile layout, accessibility, and reduced motion are supported', () => {
  assert.match(html, /<meta name="viewport"/);
  assert.match(html, /@media\(max-width:520px\)/);
  assert.match(html, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(html, /:focus-visible/);
  assert.match(html, /<a class="skip-link"/);
  assert.match(html, /<link rel="canonical" href="https:\/\/promptional\.vercel\.app\/">/);
});
