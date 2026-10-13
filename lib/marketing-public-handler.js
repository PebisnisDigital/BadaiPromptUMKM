'use strict';

// Preview-only read-only endpoint. NEVER expose the paid scene_prompts table wholesale.
// Future production activation requires a separate review and per-code public access policy.
const { Client, TablesDB, Query } = require('node-appwrite');
const {
  normalizeCode, getDemoTenant, isStagingAllowed, safeImageUrl, safeCheckoutUrl
} = require('./marketing-public');

const PROJECT = process.env.APPWRITE_PROJECT_ID || 'badai-prompt-umkm';
const DATABASE = process.env.APP_DB_ID || 'badai_prompt_umkm';
const ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1';

function reply(res, code, result) {
  res.statusCode = code;
  res.end(JSON.stringify(result));
}
module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');

  if (req.method !== 'GET') return reply(res, 405, {ok:false,error:'Metode tidak tersedia'});
  const tenant = getDemoTenant(req.query?.client);
  const code = normalizeCode(req.query?.bp);

  if (!tenant || !code || !isStagingAllowed(process.env, code)) {
    return reply(res, 404, {ok:false,error:'Halaman belum tersedia'});
  }
  if (!process.env.APPWRITE_API_KEY) {
    return reply(res, 503, {ok:false,error:'Koneksi konten preview belum dikonfigurasi'});
  }
  try {
    const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT).setKey(process.env.APPWRITE_API_KEY);
    const tables = new TablesDB(client);
    const result = await tables.listRows({
      databaseId: DATABASE,
      tableId: 'scene_prompts',
      queries: [Query.equal('title', code), Query.equal('is_published', true), Query.limit(1)]
    });
    const row = result.rows?.[0];
    if (!row) return reply(res, 404, {ok:false,error:'Prompt belum tersedia'});
    const p = {...row, ...(row.data || {})};
    if (p.title !== code || !p.is_published || !p.prompt_text || !safeImageUrl(p.preview_url)) {
      return reply(res, 404, {ok:false,error:'Konten belum tersedia'});
    }
    return reply(res, 200, {
      ok: true,
      mode: 'preview',
      brand: {
        slug: tenant.slug, name: tenant.name, accent: tenant.accent,
        ctaLabel: tenant.salesLabel, checkoutUrl: safeCheckoutUrl(tenant.checkoutUrl)
      },
      prompt: {
        code: p.title,
        title: String(p.subcategory || p.title).slice(0,180),
        category: String(p.category || 'Prompt AI').slice(0,80),
        text: p.prompt_text, 
        imageUrl: safeImageUrl(p.preview_url),
        extraImages: [p.preview_url_2, p.preview_url_3, p.preview_url_4].map(safeImageUrl).filter(Boolean),
        needsReference: Boolean(p.needs_reference)
      }
    });
  } catch (err) {
    console.error('marketing preview lookup failed', err?.code || err?.name || 'unknown');
    return reply(res, 503, {ok:false,error:'Konten belum bisa dimuat saat ini'});
  }
};
