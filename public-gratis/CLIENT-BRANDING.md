# PROMPTIONAL GRATIS — pengaturan branding klien

STATUS: pengaturan sudah disimpan di tabel Appwrite `marketing_clients`, database `badai_prompt_umkm`, project `badai-prompt-umkm`.
Website publik `https://promptional-gratis.vercel.app` membaca tabel ini dari server memakai kunci APPWRITE_RO_KEY berizin **rows.read**.

## Edit atau tambahkan klien
Buka Appwrite Console menggunakan akun admin sendiri. Pilih:
Project `badai-prompt-umkm` → Database `badai_prompt_umkm` → Tabel `marketing_clients`.

Setiap klien = 1 row. `Row ID` harus **sama persis dengan slug** agar URL tidak tertukar. Gunakan slug huruf kecil, angka, tanda hubung; contoh `toko-bunga`.

| Field | Contoh | Fungsi |
| --- | --- | --- |
| slug | `toko-bunga` | identitas unik dan kode di link |
| brand_name | `Toko Bunga Cantik` | nama pada halaman |
| accent_color | `#e94b91` | warna aksen (hex 6 digit) |
| logo_url | `https://...` | logo HTTPS publik (opsional, bisa kosong) |
| offer_title | `Mau prompt lebih banyak?` | judul penawaran |
| offer_text | `Lihat koleksi lengkapnya.` | deskripsi penawaran |
| cta_label | `LIHAT PAKET` | label tombol |
| checkout_url | `https://checkout.example.com/...` | link pembayaran sebenarnya, HTTPS publik |
| cta_enabled | false | **false** sampai link checkout benar dan siap |
| is_active | true | **false** untuk menonaktifkan semua halaman brand |

Pengaturan logo dan checkout berlaku bagi semua BP001 sampai BP185 pada satu brand. Teks prompt dan gambar masih mengikuti `scene_prompts` dari Appwrite, tidak disalin ke masing-masing brand.

## URL
- Katalog khusus klien: `https://promptional-gratis.vercel.app/c/toko-bunga`
- Link BP spesifik: `https://promptional-gratis.vercel.app/c/toko-bunga/p/BP033`
- Setiap post IG boleh memakai kata kunci MAU yang sama; template DM di Repliz nanti harus mengarah ke kode BP sesuai posting.

## Keamanan
- `marketing_clients` memakai permissions kosong (tidak publik), hanya akses server dengan kunci read-only dan admin Appwrite.
- Tidak ada tombol atau endpoint publik untuk menulis/mengubah data klien. Jangan menaruh kunci Appwrite di browser/ChatGPT/GitHub/Sheet.
- Tombol checkout hanya muncul jika `cta_enabled=true` DAN `checkout_url` lolos validasi HTTPS publik. Tidak ada checkout demo yang aktif.
- Nonaktifkan brand dengan `is_active=false`. Brand yang tidak ada/disabled akan 404 tanpa menampilkan teks prompt.
- Hindari logo berisi konten privat; URL logo ditampilkan untuk setiap pengunjung.
- Perubahan biasanya terlihat setelah ~1–2 menit karena CDN cache, tanpa deploy.
- Pengelolaan melalui Appwrite Console dahulu. Belum ada UI pengaturan klien di Admin utama PROMPTIONAL; membangunnya merupakan pekerjaan terpisah dan memerlukan autentikasi admin yang benar.
- Website utama `promptional.vercel.app`, akun Repliz, dan IG belum diubah.
