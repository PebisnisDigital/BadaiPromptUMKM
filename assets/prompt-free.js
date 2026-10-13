(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const error = msg => {
    $('loading').hidden = true;
    $('prompt-page').hidden = true;
    $('error').textContent = msg;
    $('error').hidden = false;
  };
  const match = location.pathname.match(/^\/c\/([a-z0-9-]+)\/p\/(BP\d{3})\/?$/);
  // Query fallback for deployments where dynamic rewrites respond with NOT_FOUND.
  const query = new URLSearchParams(location.search || '');
  const client = match?.[1] || query.get('client');
  const bp = match?.[2] || query.get('bp');
  if (!client || !/^[a-z0-9-]+$/.test(client) || !/^BP\d{3}$/.test(bp || '')) {
    error('Alamat prompt tidak ditemukan.'); return;
  }
  const url = new URL('/api/public-previews', location.origin);
  url.searchParams.set('mode', 'marketing');
  url.searchParams.set('client', client);
  url.searchParams.set('bp', bp);
  fetch(url, {credentials:'omit', cache:'no-store'})
    .then(async response => {
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || 'Prompt belum tersedia');
      return data;
    })
    .then(data => {
      const {brand, prompt} = data;
      document.documentElement.style.setProperty('--accent', brand.accent);
      $('brand-name').textContent = brand.name;
      $('code').textContent = prompt.code;
      $('title').textContent = prompt.title;
      $('category').textContent = prompt.category;
      $('prompt-text').textContent = prompt.text;
      $('cover-image').src = prompt.imageUrl;
      $('cover-image').alt = 'Contoh visual untuk ' + prompt.code;
      $('cover-image').onerror = () => error('Gambar preview belum bisa dibuka.');
      $('reference-info').hidden = !prompt.needsReference;
      $('offer-copy').textContent = 'Lihat koleksi prompt lainnya dari ' + brand.name + '.';
      document.title = prompt.code + ' — ' + prompt.title + ' | ' + brand.name;
      if (Array.isArray(prompt.extraImages) && prompt.extraImages.length) {
        const g = $('gallery');
        prompt.extraImages.forEach(src => {
          const img = document.createElement('img');
          img.src = src; img.alt = 'Variasi contoh visual'; img.loading = 'lazy';
          g.append(img);
        });
        g.hidden = false;
      }
      // No default sales URL. Staging must never route to a production checkout.
      if (brand.checkoutUrl && /^https:\/\//.test(brand.checkoutUrl)) {
        const btn = $('checkout'); btn.href = brand.checkoutUrl;
        btn.textContent = brand.ctaLabel || 'LIHAT PAKET';
        btn.hidden = false; $('checkout-pending').hidden = true;
      }
      $('copy').addEventListener('click', async () => {
        try {
          if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(prompt.text);
          else {
            const temp = document.createElement('textarea');
            temp.value = prompt.text; temp.style.position = 'fixed'; temp.style.top = '-9999px';
            document.body.append(temp); temp.select();
            if (!document.execCommand('copy')) throw new Error('Copy denied');
            temp.remove();
          }
          $('copy-status').textContent = 'Prompt lengkap berhasil disalin.';
        } catch { $('copy-status').textContent = 'Gagal menyalin. Pilih teks prompt lalu salin manual.'; }
      });
      $('loading').hidden = true;
      $('prompt-page').hidden = false;
    })
    .catch(e => error(e.message || 'Gagal memuat konten.'));
})();
