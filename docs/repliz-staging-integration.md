# PROMPTIONAL x Repliz — STAGING / DRY RUN

STATUS: Ini simulasi. Repliz belum terhubung, Instagram belum diubah, PR #25 masih draft.

## Yang sudah dibuat
- Route dinamis /c/:client/p/BPxxx untuk semua nomor BP001–BP185.
- The old Appwrite preview API remains limited to BP003, BP033, BP051 on VERCEL_ENV=preview; main production API remains fail-closed. Separate public microsite promptional-gratis.vercel.app now serves BP001-BP185 as static, explicitly public content.
- Konten prompt asli diambil dari Appwrite scene_prompts secara read-only.
- 30 konten media/caption non-rahasia tersimpan di data/repliz-master-30.json.
- Simulator scripts/repliz-dry-run.cjs tidak memiliki aksi jaringan, tidak membuat template/jadwal Repliz dan tidak menyimpan credential.
- Semua output simulator canPublish=false dan draft=true. Kini 30 dari 30 halaman sudah tersedia pada microsite publik, tetapi akun Instagram dan checkout belum diotorisasi.

## Jalankan simulasi
node scripts/repliz-dry-run.cjs --brand=demo-rose --days=3 --start=2026-10-15 --time=07:00
node scripts/repliz-dry-run.cjs --brand=demo-noir --days=30 --start=2026-10-15 --time=07:00
node --test tests/marketing-public.test.cjs tests/marketing-public-handler.test.cjs tests/repliz-dry-run.test.cjs tests/prompt-free-ui.test.cjs

## Menghubungkan Repliz MCP ke Codex (di perangkat yang diizinkan)
Dokumentasi resmi: https://docs.repliz.com/tutorial/mcp/codex
Pemilik Repliz membuat Access Key dan Secret Key di Settings > Public API.
Jangan masukkan credential dalam chat, repository, spreadsheet atau script.
Codex CLI/IDE menggunakan ~/.codex/config.toml, dan environment variable REPLIZ_AUTHORIZATION berisi Basic Base64(AccessKey:SecretKey).
Server URL: https://mcp.repliz.com/mcp
Contoh konfigurasi TOML:
[mcp_servers.repliz]
url = "https://mcp.repliz.com/mcp"
env_http_headers = { "Authorization" = "REPLIZ_AUTHORIZATION" }
Restart Codex, lalu periksa codex mcp list. Hanya lakukan operasi baca akun terlebih dahulu.
Dokumentasi Create Template (Gold+): https://docs.repliz.com/api/template/create-template
Dokumentasi Create Schedule (Premium+): https://docs.repliz.com/api/schedule/create-schedule

## Rencana instalasi nyata (belum diimplementasikan)
1. Verifikasi kepemilikan IG dan izin klien, akun Repliz dan paket Gold.
2. Aktifkan hanya kode BP yang berlisensi gratis untuk dibagikan.
3. Siapkan brand, URL checkout HTTPS tervalidasi dan halaman publik tanpa login.
4. Periksa URL media, izin gambar, format 4:5, caption, tanggal WIB, dan kesesuaian kode BP.
5. Buat template DM khusus setiap kode: keyword MAU, Opening tombol AMBIL PROMPT, follow-up tombol BUKA PROMPT.
6. Buat jadwal per kode dengan templateId yang sesuai, lalu simpan scheduleId dan kunci deduplikasi.
7. Uji tiga konten pada akun Instagram TEST sebelum meminta persetujuan untuk produksi.

## Pengaman
- Gunakan URL publik permanen https://promptional-gratis.vercel.app/c/<brand>/p/<BP>. URL Vercel Preview lama dilindungi SSO dan tidak boleh dibagikan kepada lead Instagram.
- Kunci Repliz dan token IG harus berada di penyimpanan aman milik operator.
- Prompt yang publik bisa disalin/dibagikan ulang; wajib ada izin khusus gratis per kode.
- Jangan kirim DM, menjadwalkan posting, mengubah produksi, atau merge PR tanpa persetujuan baru.
