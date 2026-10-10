# BADAI PROMPT — audit setelah PR #2

Tanggal: 10 Oktober 2026, WIB. Semua perubahan untuk review di feature branch; tidak ada merge atau deployment tahap ini. Bot produksi tetap aktif. Pembayaran buatqris tidak diubah.

## Baseline dan stok nyata

Production main `9a62e289f9cf0f44fbf6c89c99d8fa1dcfa8ed4b`, Vercel `dpl_851rBcDWEUcq2pP19HWBVQ5JbZGS`. Function activate-member `6ac924f9e8f8872e98d3`; payment-api `6ac911aab855c7d0be9a`.

Audit seluruh 500 baris prompts, bukan hanya halaman pertama:

| Sumber | Published | Preview HTTPS | Kandidat kirim |
|---|---:|---:|---:|
| scene_prompts | 32 | 32 | 32 |
| prompts | 500 | 0 | 0 |

Ada **kekurangan minimal 333 konten dengan preview** untuk 365 kiriman unik. Published dan URL valid belum membuktikan kualitas/kecocokan preview; admin perlu melihat preview sebelum menyetujui. Pemeriksaan HEAD ke Dropbox dibatasi jaringan workspace, sehingga kesehatan seluruh 32 gambar tidak diklaim terverifikasi. Tes produksi sebelumnya sudah berhasil mengirim satu preview; pengujian tahap ini tidak mengirim Telegram sungguhan.

Member Area saat ini membaca scene_prompts; tes UI membuktikan akses seluruh 32 visual yang tersedia. 500 prompt teks tidak otomatis dicampur ke antrean visual atau library tersebut.

## Perubahan

- Hero dan bagian freemium: DAFTAR GRATIS ke `https://t.me/BadaiPromptBot?start=landing_free`, BUKA SEMUA ke harga Premium. QRIS tiga harga, form, callback dan polling existing dipertahankan. Kode payment-api tetap identik dengan baseline.
- Admin: kandidat dari kedua sumber dipisahkan; hanya published + teks + preview HTTPS dapat disetujui. Target antrean 365 posisi, indikator hari siap, sumber konten, review ulang posisi, backlog, retry, hasil worker dan catatan kapasitas.
- Persetujuan slot dan fingerprint dilakukan dalam transaksi Appwrite; normalisasi teks mencegah duplikat lintas sumber. Konten berubah setelah disetujui ditahan hingga review ulang; mengganti posisi tidak mengulang slot yang sudah diterima member.
- Histori lama dan claim per-member/per-konten mencegah pengulangan saat migrasi atau eksekusi berbarengan. Cursor tidak berputar ke awal saat stok habis. Antrean kurasi baru dipakai setelah admin mengaktifkannya; jalur legacy tetap scene-only dan kini juga berhenti saat stok unik habis.
- Reminder 30 dan 7 hari memakai kunci terpisah per masa aktif. Kunci tujuh hari lama dipertahankan, sehingga rilis tidak mengulang reminder yang sudah terkirim. Langganan lifetime tidak diberi reminder kedaluwarsa.
- Worker: lease transaksional lintas batas menit, beberapa batch per eksekusi, konkurensi antar chat dibatasi batch, checkpoint cursor, retry yang diketahui gagal dibatasi, partial/ambiguous delivery ditahan. Deadline transport mengikuti sisa budget; scan expiry memakai query due dengan batas dan budget tersendiri.
- Penghapusan mengambil ulang delivery aktual, hanya Free yang due atau pesan test melalui jalur test khusus; retry memakai ID yang masih tersisa. Tidak menghapus sebelum delete_at/retry_at; status deleted idempoten.

## Kapasitas dan batas operasional

Worker lama batch 5 setiap 15 menit: maksimum teoritis 480 member/hari, sebelum latency. Worker baru dapat melanjutkan beberapa batch dalam budget 20 detik; batch 1–10 dan maksimum 1–200 member per run, default 100. Batas konfigurasi 100 × 96 = 9.600/hari, **bukan throughput terukur atau SLA**. Menaikkan cap 200 memberi ceiling 19.200/hari, tetapi tidak menambah waktu komputasi.

Simulasi antrean 1.000/10.000 member menguji paging, fairness, checkpoint dan dedup tanpa API eksternal; dengan cap 200, antrean selesai dalam 5/50 eksekusi. Pada cron 15 menit itu setara minimum 1,25/12,5 jam jika setiap run mencapai cap. Belum membuktikan 10.000 Premium terkirim sekitar 06:00 WIB.

Batas Telegram per-instance transport, 429 dari bot secara keseluruhan, latency Appwrite, 30-second Function timeout, pertumbuhan delivery/claim rows dan kuota Free perlu load test terisolasi dengan latency realistis serta monitoring sebelum onboarding 1.000–10.000 member. Satu worker singkat per 15 menit bukan arsitektur untuk burst 10.000 member tepat jam yang sama. Skalabilitas tersebut tetap blocker; tidak ada upgrade atau worker berbayar diaktifkan.

Scan expiry kini dibatasi 10 profile due per tick; lonjakan expiry besar juga memerlukan kapasitas tambahan. Pembaruan profile dan membership Teams belum satu transaksi lintas layanan; race renewal-vs-expiry tetap perlu pengujian dan mitigasi lanjutan sebelum skala besar.

## Tes dan integrasi aman

- Tes otomatis mencakup 365 konten unik sampai exhaustion, duplikat lintas sumber, preview hilang/berubah, review ulang, migrasi histori, reminder 30/7 dan renewal, due/partial delete retry, lease concurrent, serta 1.000/10.000 queue paging.
- Tes browser desktop/390/320px: START/otorisasi penguji, kurasi, tombol nonaktif untuk konten tanpa preview, activation kurasi, token clearing dan JWT. Freemium CTA dan checkout QRIS tiga harga tetap diuji create/poll melalui simulasi.
- `scripts/verify-premium-isolated.mjs`: entrypoint payment-api yang tidak berubah menerima webhook HMAC sandbox; Appwrite user, transaksi row, membership team QA dan password login sungguhan; Member Area 32-item; JWT link sekali pakai; transport Telegram mock untuk identitas mirror penguji terotorisasi; prompt Premium pertama tanpa Free deletion; renewal +365 dan dedup event. Delapan pemeriksaan integrasi lulus.
- Fixture ditulis hanya ke table QA terisolasi, bukan orders/member_profiles/telegram_members produksi. User, team dan table QA sudah dibersihkan. Kredensial privat lokal dihapus; key sementara memiliki expiry, tanpa key pengujian permanen.

## Penghapusan Free 11 Oktober: belum jatuh tempo

| Delivery | Due WIB | Hasil audit sekarang |
|---|---|---|
| tg_1a7cf3e25426534991e08aa1dbe2d8a5 (test prompt) | 11 Okt 00:27:49 | sent; 2 ID; not_due |
| tg_cbe7bd310b918a6179705fd3e56332ed | 11 Okt 00:34:03 | sent; 2 ID; not_due |
| tg_481937673065750e89e59918294c554c | 11 Okt 00:34:06 | sent; 2 ID; not_due |

Tidak ada penghapusan manual atau retry dini. Dengan cron */15, pemeriksaan hasil dilakukan **11 Oktober setelah 00:50 WIB** agar tick 00:30/00:45 dan antrean mendapat waktu. `scripts/audit-free-deletions.mjs` hanya membaca tiga ID manifest: exit 0 deleted, 3 belum due, 2 perlu pemeriksaan/retry. Jalankan dengan key rows.read sementara, jangan masukkan token ke chat. Retry hanya setelah status delete_failed dan retry_at due; worker mempertahankan ID tersisa dan batas window Telegram 47 jam. Hasil nyata tanggal 11 belum dapat diklaim hari ini.

## Review dan rilis

1. Review PR, stok preview dan batas kapasitas; jangan merge/deploy sebelum persetujuan pemilik.
2. Terapkan index tambahan dari diff docs/telegram-schema.json hanya setelah approval: delivery member/prompt/history, Free delete due, profile expiry. Tidak ada schema/index produksi diterapkan pada tahap ini.
3. Sesudah approval, rilis backend activate-member dan Vercel dari SHA yang sama. payment-api tidak perlu diganti; pertahankan token/master key, fungsi, flags produksi aktif, serta seluruh data/member lama.
4. Review dan setujui konten secara eksplisit. Antrean 365 tidak mengklaim siap bila baru ada 32 preview; sediakan 333 preview/konten lain dahulu untuk target penuh.
5. Feature branch memuat `git.deploymentEnabled=false` khusus nama branch ini, untuk mencegah Vercel preview otomatis ketika PR diterbitkan. Main dan produksi tidak diubah oleh pengaturan tersebut.

Rollback setelah rilis mendatang: rollback hanya candidate frontend/backend ke baseline di atas; pertahankan bot dan pembayaran serta ledger delivery. Jangan restore database atau mengulang kiriman uncertain. Index tambahan non-destruktif dapat dipertahankan. Jangan menghapus approved slots/claims untuk memaksa replay.
