/* Run with Node's test runner and Playwright available to require().
 * Account and payment endpoints are intercepted; these tests never create live accounts or payments.
 * ASSET_MANIFEST can point at originals fetched by scripts/verify-landing-assets.py.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3199';
const manifest = process.env.ASSET_MANIFEST ? JSON.parse(fs.readFileSync(process.env.ASSET_MANIFEST)) : [];
const images = new Map(manifest.map(item => [item.url, item]));
let server, browser;
const qrFixture = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="white"/><text x="10" y="50">TEST QR</text></svg>');

before(async () => {
  if (!process.env.TEST_BASE_URL) {
    server = spawn(process.execPath, ['server.js'], { cwd: root, env: { ...process.env, PORT: '3199' }, stdio: 'ignore' });
    let ready = false;
    for (let i = 0; i < 50; i++) {
      try { const r = await fetch(base); if (r.ok) { ready = true; break; } } catch {}
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.ok(ready, 'Static server starts');
  }
  const executablePath = process.env.CHROMIUM_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
  browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
});
after(async () => { await browser?.close(); server?.kill(); });

async function setup({ width = 390, reducedMotion = 'reduce', config = {}, paymentState = 'pending', createError = false, existingAccount = false, loginError = false } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion });
  const page = await context.newPage();
  const calls = [], errors = [];
  const state = { paymentState, accountEmail: '', amount: 0 };
  page.on('pageerror', error => errors.push(error.message));
  await context.route('https://**/*', async route => {
    const request = route.request(), url = request.url();
    if (images.has(url)) {
      const item = images.get(url), content = fs.readFileSync(item.path);
      assert.equal(crypto.createHash('sha256').update(content).digest('hex'), item.sha256);
      return route.fulfill({ status: 200, contentType: 'image/webp', body: content });
    }
    if (url.includes('/storage/') || url.includes('i.ibb.co.com')) return route.fulfill({ status: 204 });
    if (url.endsWith('/functions/payment-api/executions')) {
      const execution = request.postDataJSON();
      const payload = JSON.parse(execution.body || '{}');
      calls.push({ path: execution.path, payload, execution });
      let data;
      if (execution.path === '/config') data = { minimum_price: 30000, price: 100000, registration_open: true, ...config };
      else if (execution.path === '/social-proof') data = { enabled: false, items: [] };
      else if (execution.path === '/create') {
        state.amount = payload.amount;
        if (createError) return route.fulfill({ json: { responseStatusCode: 400, responseBody: JSON.stringify({ error: 'QRIS belum tersedia. Coba lagi.' }) } });
        data = { public_token: 'test-token', amount: payload.amount, total_amount: payload.amount, qr_url: qrFixture, expires_at: new Date(Date.now() + 900000).toISOString() };
      } else if (execution.path === '/check') data = { status: state.paymentState, access_ready: state.paymentState === 'success', email: state.accountEmail };
      else throw Error('Unexpected payment route: ' + execution.path);
      return route.fulfill({ json: { responseStatusCode: 200, responseBody: JSON.stringify(data) } });
    }
    if (url.endsWith('/v1/account') && request.method() === 'POST') {
      const payload = request.postDataJSON();
      calls.push({ path: '/account', payload });
      state.accountEmail = payload.email;
      return route.fulfill(existingAccount
        ? { status: 409, json: { code: 409, message: 'Account already exists', type: 'user_already_exists' } }
        : { status: 201, json: { $id: 'test-member', email: payload.email, name: payload.name } });
    }
    if (url.endsWith('/v1/account') && request.method() === 'GET') return route.fulfill({ status: 401, json: { code: 401, message: 'Guest' } });
    if (url.includes('/v1/account/sessions/email')) {
      calls.push({ path: '/session', payload: request.postDataJSON() });
      return route.fulfill(loginError
        ? { status: 401, json: { code: 401, message: 'Session unavailable' } }
        : { status: 201, json: { $id: 'test-session' } });
    }
    throw Error('Unexpected external request: ' + url);
  });
  // Do not run the real member application after simulated payment success.
  await context.route('**/member?first=1', route => route.fulfill({ contentType: 'text/html', body: '<h1>Test member redirect</h1>' }));
  await page.goto(base, { waitUntil: 'networkidle' });
  return { page, context, calls, errors, state };
}

async function submitBuyer(page, amount = 59000) {
  await page.locator(`.price-choice[onclick="openCheckout(${amount})"]`).click();
  await page.locator('#buyerName').fill('Penguji BADAI');
  await page.locator('#buyerEmail').fill('test@example.com');
  await page.locator('#buyerWa').fill('081234567890');
  await page.locator('#agreeTerms').check();
  await page.locator('#payBtn').click();
}

// Byte-identical payment contract from the remote v2 head a1722ed.
test('payment/account/config/social-proof script is unchanged', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const script = html.match(/<script>\s*(const APPWRITE_ENDPOINT=[\s\S]*?)<\/script>/)[1];
  assert.equal(crypto.createHash('sha256').update(script).digest('hex'), 'e3fdee4377028c6d377f254db0e4868a947111502f1c5745d4c7a56db3192bad');
  assert.equal((html.match(/<section /g) || []).length, 10);
  assert.ok(!/gsap|hls\.js|badaiLoader|bpu-orbit/.test(html));
});

for (const width of [375, 390, 430, 768, 1440]) {
  test(`responsive layout and CTA targets at ${width}px`, async () => {
    const { page, context, errors } = await setup({ width });
    try {
      assert.equal(await page.locator('main > section').count(), 10);
      assert.equal(await page.locator('h1').count(), 1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.ok(await page.locator('main').evaluate(e => e.getBoundingClientRect().width <= 744));
      const ids = await page.locator('[id]').evaluateAll(elements => elements.map(e => e.id));
      assert.equal(new Set(ids).size, ids.length);
      for (const href of await page.locator('a[href^="#"]').evaluateAll(elements => elements.map(e => e.getAttribute('href')))) assert.equal(await page.locator(href).count(), 1);
      await page.locator('.hero-actions a[href="#member-area"]').click();
      await page.waitForFunction(() => location.hash === '#member-area');
      await page.locator('.hero-actions a[href="#harga"]').click();
      await page.waitForFunction(() => location.hash === '#harga');
      assert.deepEqual(errors, []);
    } finally { await context.close(); }
  });
}

test('each price reaches checkout with exact amount and keyboard focus returns', async () => {
  const { page, context, errors } = await setup();
  try {
    for (const amount of [199000, 159000, 59000]) {
      const selector = `.price-choice[onclick="openCheckout(${amount})"]`;
      await page.locator(selector).click();
      assert.ok(await page.locator('#checkoutModal').isVisible());
      assert.equal(await page.evaluate(() => selectedAmount), amount);
      assert.match(await page.locator('#selectedAmountLabel').innerText(), new RegExp(String(amount).replace(/000$/, '\\.000')));
      assert.equal(await page.locator('main').evaluate(e => e.inert), true);
      await page.keyboard.press('Shift+Tab');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'payBtn');
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.body.classList.contains('modal-open'));
      assert.equal(await page.locator(selector).evaluate(e => e === document.activeElement), true);
    }
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});

for (const amount of [199000, 159000, 59000]) {
  test(`account → QRIS → polling → member redirect: ${amount}`, async () => {
    const { page, context, calls, state, errors } = await setup();
    try {
      await submitBuyer(page, amount);
      await page.locator('#paymentWrap').waitFor({ state: 'visible' });
      const create = calls.find(call => call.path === '/create');
      assert.equal(create.payload.amount, amount);
      assert.equal(create.payload.email, 'test@example.com');
      assert.equal(create.payload.whatsapp, '081234567890');
      assert.ok(calls.find(call => call.path === '/account'));
      assert.equal(await page.locator('#qrImage').getAttribute('src'), qrFixture);
      assert.match(await page.locator('#payCountdown').innerText(), /^\d{2}:\d{2}$/);
      // The original 5-second automatic first poll must actually run.
      await page.waitForFunction(() => document.getElementById('payStatus').textContent.includes('Belum ada pembayaran'), { timeout: 10000 });
      assert.equal(calls.find(call => call.path === '/check').payload.public_token, 'test-token');
      state.paymentState = 'success';
      await page.locator('#checkNowBtn').click();
      await page.waitForURL('**/member?first=1');
      assert.equal(calls.find(call => call.path === '/session').payload.email, 'test@example.com');
      assert.deepEqual(errors, []);
    } finally { await context.close(); }
  });
}

test('closed registration is respected and no account/payment is created', async () => {
  const { page, context, calls } = await setup({ config: { registration_open: false } });
  try {
    let message = '';
    page.on('dialog', async dialog => { message = dialog.message(); await dialog.accept(); });
    await page.locator('.price-choice.recommended').click();
    assert.match(message, /ditutup/);
    assert.equal(await page.locator('#checkoutModal').isVisible(), false);
    assert.equal(calls.some(call => ['/create', '/account'].includes(call.path)), false);
  } finally { await context.close(); }
});

test('QRIS errors, duplicate accounts and login fallback remain visible', async () => {
  for (const scenario of ['createError', 'existingAccount', 'loginError']) {
    const { page, context, calls, errors } = await setup({ [scenario]: true, paymentState: 'success' });
    try {
      await submitBuyer(page);
      if (scenario === 'loginError') {
        await page.locator('#paymentWrap').waitFor({ state: 'visible' });
        await page.locator('#checkNowBtn').click();
        await page.locator('#fallbackLogin').waitFor({ state: 'visible' });
        assert.match(await page.locator('#fallbackPassword').innerText(), /^Badai#/);
        assert.equal(await page.locator('#memberLink').getAttribute('href'), '/member?first=1');
      } else {
        await page.locator('#checkoutMsg.bad').waitFor();
        assert.equal(await page.locator('#payBtn').isEnabled(), true);
        assert.match(await page.locator('#checkoutMsg').innerText(), scenario === 'createError' ? /QRIS belum tersedia/ : /sudah pernah terdaftar/);
        if (scenario === 'existingAccount') assert.equal(calls.some(call => call.path === '/create'), false);
      }
      assert.deepEqual(errors, []);
    } finally { await context.close(); }
  }
});

test('all 22 original screenshots, expand gallery, lightbox, zoom and focus', async () => {
  const { page, context, errors } = await setup();
  try {
    assert.equal(await page.locator('.proof-grid [data-proof-index]').count(), 22);
    assert.equal(await page.locator('.proof-row').count(), 3);
    await page.locator('.more-proof summary').click();
    await page.locator('.proof-grid [data-proof-index="21"]').click();
    assert.equal(await page.locator('#proofLightbox').evaluate(e => e.open), true);
    assert.match(await page.locator('#proofCounter').innerText(), /^22 \/ 22/);
    await page.keyboard.press('ArrowRight');
    assert.match(await page.locator('#proofCounter').innerText(), /^1 \/ 22/);
    await page.locator('#lightboxImage').click();
    assert.equal(await page.locator('.lightbox-image-wrap').evaluate(e => e.classList.contains('zoomed')), true);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#proofLightbox').evaluate(e => e.open), false);
    assert.equal(await page.evaluate(() => document.activeElement.dataset.proofIndex), '21');
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});

test('FAQ, manual tour and reduced-motion preference', async () => {
  const { page, context, errors } = await setup();
  try {
    await page.locator('.faq-list details').first().locator('summary').click();
    assert.equal(await page.locator('.faq-list details').first().getAttribute('open'), '');
    for (const step of [1, 2, 0]) {
      await page.locator(`[data-tour-step-button="${step}"]`).click();
      assert.equal(await page.locator('#productTour').getAttribute('data-tour-step'), String(step));
      assert.equal(await page.locator(`[data-tour-step-button="${step}"]`).getAttribute('aria-pressed'), 'true');
    }
    assert.equal(await page.locator('.marquee-track').first().evaluate(e => getComputedStyle(e).animationName), 'none');
    assert.equal(await page.locator('#motionToggle').getAttribute('aria-pressed'), 'true');
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});

test('viewport animation, automatic tour and pause control', async () => {
  const { page, context, errors } = await setup({ reducedMotion: 'no-preference' });
  try {
    await page.locator('#productTour').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.getElementById('productTour').dataset.tourStep === '1', { timeout: 8000 });
    await page.locator('#motionToggle').click();
    assert.equal(await page.locator('#motionToggle').getAttribute('aria-pressed'), 'true');
    await page.locator('#update').scrollIntoViewIfNeeded();
    assert.equal(await page.locator('.visual-carousel .marquee-track').evaluate(e => getComputedStyle(e).animationPlayState), 'paused');
    await page.locator('#motionToggle').click();
    await page.locator('#update').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.visual-carousel .marquee-track')).animationPlayState === 'running');
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});

test('all verified real images decode in the browser', { skip: !manifest.length && 'Run verify-landing-assets.py and set ASSET_MANIFEST for the real-asset check' }, async () => {
  const { page, context, errors } = await setup();
  try {
    assert.equal(images.size, 30);
    await page.evaluate(async () => {
      const elements = [...document.querySelectorAll('img[src^="https://"]')];
      await Promise.all(elements.map(async image => { image.loading = 'eager'; await image.decode(); }));
    });
    const broken = await page.locator('img[src^="https://"]').evaluateAll(elements => elements.filter(e => !e.naturalWidth).map(e => e.src));
    assert.deepEqual(broken, []);
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});
