'use strict';

/** Demo-only public marketing configuration. No client secrets or payment links. */
const DEMO_TENANTS = Object.freeze({
  'demo-rose': Object.freeze({
    slug: 'demo-rose',
    name: 'ROSE CREATIVE',
    accent: '#e94b91',
    salesLabel: 'LIHAT PAKET',
    checkoutUrl: null
  }),
  'demo-noir': Object.freeze({
    slug: 'demo-noir',
    name: 'NOIR STUDIO',
    accent: '#d29f44',
    salesLabel: 'LIHAT PAKET',
    checkoutUrl: null
  })
});
const STAGING_ALLOWED_BPS = new Set(['BP003', 'BP033', 'BP051']);
const MAX_BP = 185;

function normalizeCode(input) {
  if (typeof input !== 'string' || !/^BP[0-9]{3}$/.test(input)) return null;
  const n = Number(input.slice(2));
  return n >= 1 && n <= MAX_BP ? input : null;
}
function getDemoTenant(slug) {
  return typeof slug === 'string' && Object.hasOwn(DEMO_TENANTS, slug)
    ? DEMO_TENANTS[slug]
    : null;
}
function isStagingAllowed(env, bpCode) {
  // Production always fails closed. Preview is for three explicit marketing test prompts.
  return env.VERCEL_ENV === 'preview' && STAGING_ALLOWED_BPS.has(bpCode);
}
function safeImageUrl(value) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' &&
      ['www.dropbox.com', 'dropbox.com', 'sgp.cloud.appwrite.io', 'i.ibb.co'].includes(url.hostname)
      ? url.toString() : null;
  } catch { return null; }
}
function safeCheckoutUrl(value) {
  if (typeof value !== 'string' || !value) return null;
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && !u.username && !u.password ? u.toString() : null;
  } catch { return null; }
}
module.exports = {DEMO_TENANTS, STAGING_ALLOWED_BPS, MAX_BP,
  normalizeCode, getDemoTenant, isStagingAllowed, safeImageUrl, safeCheckoutUrl};
