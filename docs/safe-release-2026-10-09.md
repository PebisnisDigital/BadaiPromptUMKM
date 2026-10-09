# SAFE RELEASE PREPARATION — BADAI PROMPT

PR: https://github.com/PebisnisDigital/BadaiPromptUMKM/pull/1

Preview review: https://badaipromptumkm2026.vercel.app/admin

Tahap ini menyiapkan rilis. Production belum diganti, PR belum digabung, dan dua Function baru belum diaktifkan. Token BotFather belum tersedia. Tidak ada pesan Telegram, broadcast, penghapusan pesan pelanggan, atau perubahan akun pelanggan.

## Status permintaan

| Langkah | Status | Bukti / batas pengujian |
|---|---|---|
| 1. Review PR dan tes | Siap | Perubahan warisan website dipisahkan dari delta Telegram terhadap production; 42 tes backend lulus, UI dan checkout regression lulus. Suite landing lama memiliki assertion untuk layout/hash lama dan belum menjadi release gate. |
| 2. Rekonsiliasi main | Siap | Candidate mencakup `main` (`86bb681`) dan frontend production `d85e766`; entrypoint Function dicocokkan dengan arsip deployment aktif. Main belum diubah. |
| 3. Auth preview Appwrite Free | Selesai | Hostname `badaipromptumkm2026.vercel.app` sudah terdaftar di Appwrite dan sebelumnya tidak memiliki alias Vercel aktif. Alias diarahkan hanya ke preview proyek `badaiprompt`. Tidak ada platform dihapus/diubah atau upgrade paket. Login Appwrite nyata dari origin tersebut lulus. |
| 4. Token, database, admin | Siap | AES-256-GCM; password field dan token clearing; JWT baru per request; confirmed admin team; secret tidak dikirim kembali. Empat tabel Telegram server-only dan menolak request member nyata dengan 401. |
| 5. Kandidat rilis | Siap, belum aktif | Kandidat `activate-member`: `6ac91ac78b467375e925`; `payment-api`: `6ac911aab855c7d0be9a`. Keduanya ready dan inactive. Tetap dua Function existing, Node 22, `src/main.js`, build `npm ci`. |
| 6. Checkout, member, admin lama | Siap | HTML production `/`, `/admin`, `/member` persis baseline `d85e766`. Candidate checkout HTML, relay BuatQRIS dan kode payment setelah `getConfig` tetap identik. Hak akses lama tanpa expiry dipertahankan. |
| 7. Flag dan settings | Terkunci aman | Vercel preview/production dan Function `activate-member` eksplisit `TELEGRAM_ENABLED=false`, `TELEGRAM_SEND_ENABLED=false`. Database: enabled=false, paused=true, dry_run=true. Guard tambahan menolak enable/resume/non-dry ketika izin server masih false. |
| 8. Tidak ada Telegram nyata | Terpenuhi | Harness melarang transport Telegram dan mencatat 0 percobaan. Tidak ada bot utama/token/webhook, broadcast, atau delete pesan pelanggan. |
| 9. Smoke test | Lulus dengan batas jelas | Login email/password admin dan member sementara, library published, lifetime profile, nonadmin denial, fresh JWT, dashboard data aktual, dry scheduler dan endpoint security memakai Appwrite nyata. Aset candidate dan handler POST dijalankan lokal pada origin preview terdaftar. GET halaman/health preview Vercel nyata 200; GET manager/link/webhook 405. Checkout create/poll tiga harga memakai API simulasi; belum ada pembayaran QRIS sungguhan. |
| 10. Rollback | Siap | Deployment aktif sebelumnya masih ready; source archive keduanya sudah diunduh dan checksum dicatat. Gate hanya baca memeriksa baseline kembali sebelum rilis. |

## Pemeriksaan dan bukti

- `npm test`: 42/42 (34 Telegram/security/scheduling/renewal/API dan 8 deletion regression).
- `npm run test:telegram-ui`: 1280/390/320 px lulus; simulasi QRIS Rp59.000, Rp159.000, Rp199.000 lulus.
- `npm run test:workspace`, `node scripts/verify-admin-delete.cjs`: member/admin dan deletion regression lulus; seluruh mutasi memakai doubles.
- `scripts/verify-safe-release.cjs`: login password member dan admin dengan Appwrite nyata; published library; lifetime profile; JWT/account/team verifikasi; hak nonadmin; origin/method protection; data dashboard aktual; dry scheduler. Akun uji, dua membership, profile uji, sesi (melalui penghapusan akun), rate rows milik harness dan file kredensial sudah dibersihkan. Tidak memakai password pemilik.
- Transaksi Appwrite kosong berhasil rollback memakai key dengan scope sempit; tidak ada customer row diubah. Ini belum merupakan tes pembayaran/renewal nyata.
- Tabel Telegram memakai permissions `[]`, rowSecurity=false. Semua columns/indexes available. `member_profiles` tetap rowSecurity=true dengan user read permission; existing profile permissions tidak diubah.
- Key Telegram Manager hanya `tables.read`, `rows.read`, `rows.write`, `teams.read`. Master key tetap secret pada kedua runtime; tidak dirotasi. Tidak ada secret ditulis ke repository/laporan.
- Backup source aktif: activation persis baseline `019d310` + fix deletion; payment persis file git `86bb681`. Arsip payment berisi seluruh repo baseline, sehingga entrypoint diperiksa dari `functions/payment-api/src/main.js` sesuai folder deployment.
- Downloader connector gagal pada respons binary; backup berhasil melalui REST regional dengan ephemeral key `functions.read` selama 600 detik. Key ephemeral tidak menjadi key permanen dan kedaluwarsa otomatis. Nilainya dibuang setelah unduhan; tidak disimpan ke GitHub.

Manifest `safe-release-manifest.json` mencatat hash file aplikasi/backend, project IDs, release/rollback IDs dan flag wajib. File aplikasi hanya berubah satu guard selama tahap ini; tidak ada implementasi ulang Telegram Manager atau perubahan checkout.

## Urutan rilis setelah persetujuan pemilik

1. Ambil HEAD PR yang sudah CI hijau, catat SHA hasil review, fetch main terbaru. Jalankan `python scripts/check-safe-release.py`; jalankan `--remote` dengan ephemeral read key (`functions.read`, `tables.read`, `rows.read`) untuk memeriksa baseline, build dan flag aktual. STOP jika production/main berubah; review perubahan baru lebih dahulu.
2. Pertahankan flag false dan settings disabled/paused/dry-run. Jangan mengubah execute permissions, scopes, events atau cron. Candidate activation memakai schedule existing `*/15 * * * *`, timeout 30 detik; payment tetap public dengan proteksi admin internal. Jangan deploy folder `member-bootstrap` atau membuat Function tambahan.
3. Sesudah persetujuan production, aktifkan candidate kedua Function pada ID existing dengan `functions_update_function_deployment`. Lakukan smoke read-only checkout config/health, akses member dan admin; rollback segera bila gagal. Verifikasi cron expiry existing tetap berjalan sementara Telegram worker terlewati oleh flag false.
4. Gabungkan PR yang sudah direview ke main hanya setelah persetujuan. Vercel terhubung ke production branch `main`; merge dapat memicu deployment production otomatis. Karena itu merge juga merupakan bagian release yang membutuhkan persetujuan. Pastikan deployment memakai tree yang diapprove, bukan checkout main lama. Jangan mengaktifkan preview env sebagai production secara manual tanpa memastikan secrets production.
5. Verifikasi `/`, `/admin`, `/member`, checkout config, login/member rights, Telegram health dan unauthorized endpoint. Pastikan health `sending_enabled:false`, database settings masih aman. Jika ada masalah, jalankan rollback di bawah.
6. Pemilik kemudian dapat login ke admin → Telegram → memasukkan token BotFather di password field → SIMPAN BOT. Penyimpanan memanggil `getMe` untuk memverifikasi identitas dan menyimpan ciphertext; tidak mengirim pesan. Jangan install webhook, pilih bot utama, authorize tester, resume atau mengubah flag kirim pada tahap ini. Test pesan/START/link/delete dan broadcast menunggu persetujuan terpisah.

## Rollback terarah

| Layanan | Candidate | Rollback |
|---|---|---|
| Vercel production | Deployment dari tree PR yang diapprove | `dpl_5WRnV9oPUsZRtMYWr9oPtFo8Ttme` |
| `activate-member` | `6ac91ac78b467375e925` | `6ac8fad9ae172fb04d94` |
| `payment-api` | `6ac911aab855c7d0be9a` | `6ac6fb7200126b22072d` |

Jika smoke gagal, hentikan tahapan berikutnya. Pastikan flag false dan settings disabled/paused/dry-run, aktifkan kembali dua Appwrite rollback IDs dengan operator `functions_update_function_deployment`. Untuk frontend, gunakan mekanisme rollback Vercel ke deployment lama sehingga production domain kembali menunjuk baseline; cek kembali domain `badaiprompt.vercel.app`, bukan hanya deployment status. Jangan hanya mengubah alias preview.

Jika main sudah digabung, siapkan revert commit dari merge untuk mencegah redeploy tree gagal pada push berikutnya; review sebelum push production. Jangan force-reset main. Jangan rollback database, menghapus schema additive, mengganti master key, menimpa profile/order snapshot, atau menjalankan cleanup pelanggan. Perubahan database di tahap ini hanya metadata/schema Telegram dan settings aman; mengembalikan snapshot lama dapat menghilangkan transaksi yang terjadi selama rilis.

Source backup berada di workspace ignored `work/release/rollback/` dengan mode 0600 dan checksum manifest; bukan download publik. Bila deployment lama tidak tersedia lagi, rebuild source backup dengan folder/entrypoint asli, verifikasi ulang, lalu aktifkan hanya dalam recovery yang disetujui. Gate memeriksa readiness rollback tepat sebelum rilis agar kondisi ini tidak terlewat.

## Blocker dan pekerjaan pemilik

Tidak ada lagi blocker kuota platform preview. Production activation masih membutuhkan persetujuan eksplisit pemilik. Bot belum diuji nyata karena token belum dimasukkan. Konfirmasi pembayaran QRIS nyata dan renewal/expiry nyata belum dilakukan; regression saat ini memakai controlled doubles, ditambah pemeriksaan source aktif identik. Itu perlu diuji terkontrol sesudah release approval, tanpa menyentuh pelanggan lama.

Pemilik hanya perlu menyetujui rilis dashboard/backend dalam mode nonaktif, lalu memasukkan token melalui dashboard production. Jangan kirim token atau password di chat. Persetujuan rilis ini tidak mengizinkan tes pesan, webhook, broadcast atau penghapusan pesan pelanggan; semuanya tetap menunggu persetujuan tes langsung terpisah.
