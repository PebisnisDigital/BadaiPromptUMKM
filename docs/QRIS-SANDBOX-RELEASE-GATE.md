# QRIS Sandbox pada database BADAI PROMPT yang sudah ada

Owner memilih pengujian menggunakan Appwrite produksi karena aplikasi belum diluncurkan. Pengujian tetap **sandbox BuatQRIS**, bukan transaksi uang asli.

## Pengamanan yang diterapkan
- Endpoint terpisah `/api/guest-checkout`, tidak mengubah checkout Telegram lama.
- Feature flag `BADAI_GUEST_SANDBOX_ENABLED=true` wajib sebelum halaman uji bisa digunakan.
- Pembuatan invoice selalu mengirim `test=1`, tanpa opsi invoice live.
- Order sandbox diberi `is_test:true` dan `checkout_type:'guest'`.
- Webhook wajib HMAC valid dan status pembayaran dikonfirmasi lagi ke provider.
- Akun Appwrite sandbox memakai ID turunan order, tidak mengambil alih akun existing.
- Pengaktifan Telegram menggunakan token acak sekali pakai dengan atomic binding order.
- Halaman pengujian `/uji-qris.html` tidak dipromosikan ke pengunjung.
- Member uji ditandai dari order uji; catat agar dapat dibersihkan sebelum rilis.
- Jangan gunakan `test_pay` untuk invoice biasa (tanpa test=1).
- Perintah `test_pay` hanya boleh dilakukan dengan sesi dashboard BuatQRIS pemilik akun.

## Uji minimum
1. Jalankan `npm test` dan `npm run test:telegram-website` (GitHub CI).
2. Deploy produksi dengan endpoint tetap nonaktif sampai feature flag terpasang.
3. Akses `/uji-qris.html`; buat invoice sandbox.
4. Di dashboard BuatQRIS, lunasi invoice **uji** dengan `test_pay`.
5. Cek status berubah ke activated, satu profil dan team paid dibuat di Appwrite.
6. Klik tautan aktivasi Telegram, tekan START, akun tertaut dan Premium.
7. Coba gunakan token kedua melalui akun Telegram lain; harus ditolak.
8. Pastikan statistik pendapatan asli tidak memasukkan invoice sandbox.

## Batasan
Ini merupakan pengujian sandbox pada database produksi yang dipilih owner, bukan sistem staging. Belum boleh dipakai sebagai checkout pembeli umum sampai uji end-to-end lulus.
