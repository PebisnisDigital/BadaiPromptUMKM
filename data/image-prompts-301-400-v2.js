// BADAI PROMPT UMKM — IMAGE PROMPTS V2 (301–400)
// Otomotif & Kendaraan + Kerajinan, Hampers & Souvenir
// Semua final image_prompt membawa aturan ANTI AI SLOP.

import { ANTI_AI_SLOP_RULE } from './image-prompts-001-200-v2.js';

const HUMAN = `
REAL HUMAN DETAIL: jika ada manusia, gunakan orang Indonesia yang terlihat nyata dan relatable; anatomi akurat, tangan lima jari, pose natural, ekspresi tidak kaku, skin texture nyata, pakaian mengikuti gravitasi, dan tidak ada anggota tubuh ekstra, duplikat, atau menyatu.
`;

const PRODUCT = `
REFERENCE FIDELITY: jika user memberi foto referensi kendaraan, produk, kemasan, kerajinan, hampers, logo, atau objek utama, pertahankan bentuk, proporsi, warna, material, detail desain, dan identitas visual secara akurat. Jangan mengarang logo, nomor polisi, teks label, motif, atau bagian produk.
`;

const SURREAL = `
SURREAL REALISM: konsep kreatif boleh fantastis, tetapi eksekusinya harus seperti practical commercial composite / VFX photography profesional. Skala, physics, perspective, shadow, reflection, dan lighting harus konsisten dan believable.
`;

const NO_TEXT = `
LAYOUT RULE: utamakan visual dan sisakan negative space untuk headline, harga, CTA, promo, logo, nomor WhatsApp, atau detail lain yang akan ditambahkan saat desain. Jangan mengandalkan AI untuk menulis teks panjang, angka harga, nomor polisi, label, sertifikat, atau logo.
`;

function finalPrompt(base, flags=[]){
  let x=base.trim()+'\n\n'+ANTI_AI_SLOP_RULE.trim();
  if(flags.includes('human')) x+='\n'+HUMAN.trim();
  if(flags.includes('product')) x+='\n'+PRODUCT.trim();
  if(flags.includes('surreal')) x+='\n'+SURREAL.trim();
  x+='\n'+NO_TEXT.trim();
  return x.trim();
}
function varsOf(text){return [...new Set((text.match(/\[[^\]]+\]/g)||[]))]}
const data=[];
function add(prefix,n,niche,goal,output,title,base,flags=[]){
  const image_prompt=finalPrompt(base,flags);
  data.push({
    code:`${prefix}-${String(n).padStart(2,'0')}`,
    title,niche,goal,output_type:output,image_prompt,
    placeholders:varsOf(image_prompt),
    anti_ai_slop:true,version:2
  });
}

// =========================
// 301–350 OTOMOTIF & KENDARAAN
// =========================
const O='Otomotif & Kendaraan';
[
['Hero Mobil Premium','Hero Produk','Automotive Poster',`Buat commercial automotive photo [NAMA_KENDARAAN] berdasarkan [REFERENSI_KENDARAAN] bila tersedia. Tampilkan kendaraan tiga-perempat depan dengan body panel, velg, lampu, grille dan proporsi tetap akurat. Gunakan lokasi [LOKASI] yang realistis, dramatic but plausible lighting, warna [WARNA_BRAND] sebagai aksen, rasio 4:5.`,['product']],
['Hero Motor Premium','Hero Produk','Motorcycle Poster',`Buat hero advertising photo [NAMA_KENDARAAN] motor dari angle rendah tiga-perempat, mempertahankan fairing, velg, lampu, knalpot dan detail referensi. Gunakan background [LOKASI], realistic road lighting, warna [WARNA_BRAND], rasio 4:5.`,['product']],
['Detail Eksterior Mobil','Hero Produk','Automotive Detail Poster',`Buat close-up premium [NAMA_KENDARAAN] yang menonjolkan [DETAIL_KENDARAAN] seperti velg, lampu, grille atau body line. Paint reflection harus realistis, tidak meleleh, material metal/kaca akurat, rasio 4:5.`,['product']],
['Interior Kendaraan','Hero Produk','Interior Automotive Poster',`Buat interior photo [NAMA_KENDARAAN] berdasarkan referensi aktual. Dashboard, steering wheel, layar, jok dan layout harus konsisten; jangan menambah tombol atau panel fiktif. Natural cabin light, rasio 4:5.`,['product']],
['Mobil di Jalan Kota','Hero Produk','Lifestyle Automotive Visual',`Buat [NAMA_KENDARAAN] sedang melaju pelan di jalan kota Indonesia yang realistis. Kendaraan tetap tajam, motion blur hanya pada background secukupnya, wheel rotation believable, perspective dan reflection konsisten, rasio 4:5.`,['product']],
['Motor di Jalan Pegunungan','Hero Produk','Lifestyle Motorcycle Visual',`Buat [NAMA_KENDARAAN] motor melintas di jalan pegunungan Indonesia. Rider memakai perlengkapan aman, pose riding natural, motor sesuai referensi, cahaya pagi realistis, background believable, rasio 4:5.`,['human','product']],
['Kendaraan di Studio Gelap','Hero Produk','Studio Automotive Poster',`Buat studio photo [NAMA_KENDARAAN] di ruang gelap premium dengan strip light yang memantul realistis pada body. Jangan membuat glow berlebihan, jaga proporsi kendaraan akurat, background [WARNA_BRAND] sebagai aksen, rasio 4:5.`,['product']],
['Mobil Keluarga','Hero Produk','Family Automotive Poster',`Buat keluarga Indonesia berada di samping [NAMA_KENDARAAN] dalam suasana perjalanan keluarga yang natural. Kendaraan tetap akurat, orang tidak menutupi detail penting, daylight realistic, rasio 4:5.`,['human','product']],
['Kendaraan dan Aksesoris','Hero Produk','Accessory Bundle Poster',`Buat visual [NAMA_KENDARAAN] bersama [AKSESORIS] yang relevan seperti helm, box, roof rack atau detailing kit. Semua ukuran dan attachment masuk akal, product styling clean, background [WARNA_BRAND], rasio 4:5.`,['product']],
['Detail Velg dan Ban','Hero Produk','Wheel Detail Poster',`Buat macro automotive photo velg dan ban [NAMA_KENDARAAN]. Tread, sidewall, brake disc dan material metal harus realistis, bebas deformasi, lighting studio natural, rasio 4:5.`,['product']],

['Promo Servis Berkala','Promo','Service Promo Poster',`Buat key visual promo servis berkala [JENIS_KENDARAAN] di [NAMA_BENGKEL]. Tampilkan teknisi Indonesia sedang bekerja dengan alat benar, kendaraan sesuai referensi, area kosong untuk paket/harga aktual, warna [WARNA_BRAND], rasio 4:5.`,['human','product']],
['Promo Ganti Oli','Promo','Oil Change Poster',`Buat visual promo ganti oli [JENIS_KENDARAAN] di [NAMA_BENGKEL]. Tampilkan proses penggantian oli secara realistis dengan alat yang sesuai, tangan teknisi natural, tidak ada tumpahan mustahil, ruang promo, rasio 4:5.`,['human','product']],
['Promo Cuci Mobil','Promo','Car Wash Poster',`Buat promo car wash [NAMA_USAHA] dengan [NAMA_KENDARAAN] sedang dicuci secara profesional. Foam, air dan reflection realistis, pekerja Indonesia natural, area harga kosong, warna [WARNA_BRAND], rasio 4:5.`,['human','product']],
['Promo Detailing','Promo','Detailing Poster',`Buat visual detailing [NAMA_KENDARAAN] di [NAMA_USAHA]. Tampilkan polishing, microfiber, lampu inspeksi dan body reflection realistis, sebelum-sesudah tidak berlebihan, ruang promo, rasio 4:5.`,['human','product']],
['Promo Ban','Promo','Tire Promo Poster',`Buat key visual promo ban untuk [JENIS_KENDARAAN], menampilkan ban [TIPE_BAN] dan kendaraan yang sesuai. Ban harus memiliki bentuk/tread realistis, area diskon kosong, background [WARNA_BRAND], rasio 4:5.`,['product']],
['Promo Aksesoris Kendaraan','Promo','Accessory Promo Poster',`Buat visual promo [AKSESORIS] untuk [JENIS_KENDARAAN]. Tampilkan aksesori terpasang secara benar pada kendaraan atau dalam clean product layout, area harga kosong, warna [WARNA_BRAND], rasio 4:5.`,['product']],
['Promo Bengkel Weekend','Promo','Weekend Service Poster',`Buat weekend service campaign [NAMA_BENGKEL] dengan beberapa kendaraan dan teknisi Indonesia sedang bekerja secara realistis. Workshop rapi, jumlah orang wajar, area promo kosong, rasio 4:5.`,['human','product']],
['Promo Paket Tune Up','Promo','Tune Up Poster',`Buat visual paket tune up [JENIS_KENDARAAN] di [NAMA_BENGKEL]. Tampilkan aktivitas pengecekan mesin, filter, busi atau alat scan yang relevan, tanpa alat fiktif, ruang harga, rasio 4:5.`,['human','product']],
['Promo Kendaraan Bekas','Promo','Used Vehicle Poster',`Buat key visual [NAMA_KENDARAAN] bekas yang menampilkan kondisi aktual dengan jujur dan realistis. Jangan menghilangkan cacat atau mengubah fitur kendaraan dari referensi. Sisakan area harga dan spesifikasi aktual, rasio 4:5.`,['product']],
['Promo Booking Service','Promo','Booking Service Poster',`Buat visual booking service [NAMA_BENGKEL] dengan kendaraan [JENIS_KENDARAAN] dan teknisi siap menerima unit. Clean workshop, gesture natural, area jadwal aktual, warna [WARNA_BRAND], rasio 4:5.`,['human','product']],

['Mobil Raksasa di Kota','Hook Visual','Creative Automotive Poster',`Buat [NAMA_KENDARAAN] berukuran raksasa di jalan kota Indonesia seperti practical advertising composite. Proporsi kendaraan tetap akurat, shadow, scale, reflection dan perspective konsisten, manusia/kendaraan kecil realistis, rasio 4:5.`,['product','human','surreal']],
['Miniature Mechanic','Hook Visual','Miniature Automotive Poster',`Buat miniature mechanics realistis sedang melakukan servis pada [NAMA_KENDARAAN] berukuran besar. Macro photography, alat otomotif benar, scale interaction believable, body kendaraan tidak berubah, rasio 4:5.`,['human','product','surreal']],
['Before After Detailing','Hook Visual','Before After Automotive Poster',`Buat split-scene [NAMA_KENDARAAN] dari angle yang sama sebelum dan sesudah detailing. Body shape, warna dan lighting konsisten; perubahan hanya kebersihan, gloss dan finishing yang realistis, rasio 4:5.`,['product']],
['Kotor vs Bersih','Hook Visual','Transformation Poster',`Buat [NAMA_KENDARAAN] yang sama dalam split visual: sisi kiri kotor secara realistis, sisi kanan bersih setelah wash/detailing. Jangan mengubah desain kendaraan, velg atau warna cat, rasio 4:5.`,['product']],
['Exploded View Aksesoris','Hook Visual','Exploded Automotive Visual',`Buat visual exploded-view [NAMA_KENDARAAN] dengan beberapa [AKSESORIS] utama melayang terpisah secara terstruktur seperti technical advertising composite. Kendaraan dan aksesori harus tetap realistis, scale dan perspective konsisten, rasio 4:5.`,['product','surreal']],
['Kendaraan Menembus Splash','Hook Visual','Dynamic Automotive Poster',`Buat [NAMA_KENDARAAN] bergerak melewati splash air atau hujan ringan seperti high-speed automotive photography. Splash mengikuti ban dan arah gerak, reflection realistis, kendaraan tetap akurat, rasio 4:5.`,['product','surreal']],
['Billboard Otomotif','Hook Visual','Billboard Mockup',`Buat billboard realistis untuk [NAMA_KENDARAAN] atau [NAMA_USAHA] di kota Indonesia. Perspective dan lighting billboard sesuai lingkungan, gunakan visual kendaraan akurat, area copy kosong, warna [WARNA_BRAND], rasio 4:5.`,['product','surreal']],
['Detail Mesin Dramatis','Hook Visual','Engine Detail Poster',`Buat close-up dramatis mesin [NAMA_KENDARAAN] berdasarkan referensi, dengan lighting directional realistis. Jangan menciptakan komponen baru atau layout mesin fiktif, material metal/plastik akurat, rasio 4:5.`,['product']],
['Refleksi Jalan Malam','Hook Visual','Night Automotive Poster',`Buat [NAMA_KENDARAAN] di jalan malam basah dengan reflection lampu kota yang realistis. Kendaraan tetap tajam, body reflection mengikuti bentuk panel, tidak neon berlebihan, rasio 4:5.`,['product']],
['Split City vs Adventure','Hook Visual','Dual Lifestyle Poster',`Buat split-scene [NAMA_KENDARAAN] di dua lingkungan: kota dan adventure [LOKASI_ADVENTURE]. Kendaraan identik di kedua sisi, angle sebanding, lighting sesuai masing-masing lokasi, rasio 4:5.`,['product']],

['Teknisi Profesional','Trust','Mechanic Trust Poster',`Buat teknisi [NAMA_BENGKEL] Indonesia berdiri bersama [JENIS_KENDARAAN] dan alat kerja yang benar. Seragam rapi, tangan/anatomi natural, workshop nyata, tidak ada sertifikat/logo palsu, rasio 4:5.`,['human','product']],
['Proses Servis Nyata','Trust','Service Process Poster',`Buat dokumentasi proses servis [JENIS_KENDARAAN] di [NAMA_BENGKEL] secara realistis. Tampilkan teknisi, lift/alat yang relevan, prosedur masuk akal, workshop bersih, rasio 4:5.`,['human','product']],
['Quality Check Kendaraan','Trust','Inspection Poster',`Buat teknisi melakukan final inspection [NAMA_KENDARAAN] setelah servis/detailing. Tampilkan pengecekan lampu, ban atau body yang masuk akal, customer dapat hadir natural, rasio 4:5.`,['human','product']],
['Customer Serah Terima','Trust','Handover Poster',`Buat momen serah terima [NAMA_KENDARAAN] antara staf [NAMA_USAHA] dan customer Indonesia. Gesture natural, kendaraan tetap akurat, jangan tampilkan dokumen/plat palsu yang terbaca, rasio 4:5.`,['human','product']],
['Workshop Rapi','Trust','Workshop Poster',`Buat interior workshop [NAMA_BENGKEL] yang rapi, realistis dan aktif. Beberapa kendaraan dan teknisi bekerja natural, alat/hoist proporsional, warna [WARNA_BRAND] sebagai aksen, rasio 4:5.`,['human','product']],
['Banyak Kendaraan Dilayani','Trust','Social Proof Automotive Poster',`Buat [NAMA_BENGKEL] melayani beberapa kendaraan secara wajar. Jumlah kendaraan/teknisi realistis, tidak ada model duplikat, aktivitas tiap teknisi masuk akal, rasio 4:5.`,['human','product']],
['Owner Bengkel','Trust','Founder Automotive Poster',`Buat owner [NAMA_BENGKEL] Indonesia berdiri di workshop bersama tim dan satu kendaraan. Pose ramah profesional, wajah natural, alat nyata, tidak ada badge/penghargaan palsu, rasio 4:5.`,['human','product']],
['Before After Servis','Trust','Service Result Poster',`Buat before-after hasil [JENIS_SERVIS] pada [NAMA_KENDARAAN] hanya jika perubahannya visual dan nyata. Angle, body, warna dan environment konsisten; hindari klaim performa yang tidak bisa terlihat, rasio 4:5.`,['product']],
['Rak Sparepart Rapi','Trust','Sparepart Display Poster',`Buat display sparepart [JENIS_SPAREPART] di [NAMA_USAHA] yang tertata profesional. Bentuk sparepart realistis, packaging tidak berisi teks acak, lighting retail natural, rasio 4:5.`,['product']],
['Testimoni Customer Otomotif','Trust','Testimonial Automotive Poster',`Buat customer Indonesia bersama [NAMA_KENDARAAN] setelah layanan [NAMA_USAHA], dengan ruang kosong untuk testimoni asli. Jangan mengarang rating, nama, kutipan atau hasil teknis, rasio 4:5.`,['human','product']],

['Mudik Campaign','Campaign','Mudik Automotive Poster',`Buat campaign persiapan mudik untuk [NAMA_BENGKEL] dengan kendaraan keluarga Indonesia sedang dicek secara profesional. Nuansa perjalanan realistis, hindari klaim keselamatan absolut, warna [WARNA_BRAND], rasio 4:5.`,['human','product']],
['Ramadhan Service','Campaign','Ramadhan Automotive Poster',`Buat campaign Ramadhan [NAMA_BENGKEL] dengan teknisi Indonesia melayani kendaraan secara natural, dekorasi Ramadhan ringan, workshop realistis, warna [WARNA_BRAND], rasio 4:5.`,['human','product']],
['Lebaran Road Trip','Campaign','Lebaran Automotive Poster',`Buat visual Lebaran road trip dengan keluarga Indonesia dan [NAMA_KENDARAAN] di rest area/jalan yang realistis. Kendaraan akurat, gesture natural, festive accent minimal, rasio 4:5.`,['human','product']],
['Musim Hujan Kendaraan','Campaign','Rainy Season Automotive Poster',`Buat campaign musim hujan [NAMA_USAHA] dengan [NAMA_KENDARAAN] di jalan basah dan teknisi memeriksa ban/wiper/rem secara visual. Hindari klaim keselamatan palsu, hujan/reflection realistis, rasio 4:5.`,['human','product']],
['Tahun Baru Kendaraan','Campaign','New Year Automotive Poster',`Buat New Year campaign [NAMA_KENDARAAN] atau [NAMA_USAHA] dengan kendaraan bersih di studio/lokasi malam yang realistis. Celebration accents minimal, warna [WARNA_BRAND], ruang copy, rasio 4:5.`,['product']],
['Weekend Ride','Campaign','Weekend Automotive Poster',`Buat weekend ride visual [NAMA_KENDARAAN] dengan pengendara Indonesia di [LOKASI]. Gunakan gear aman, pose riding natural, kendaraan akurat, cahaya pagi realistis, rasio 4:5.`,['human','product']],
['Payday Upgrade Kendaraan','Campaign','Payday Automotive Poster',`Buat payday campaign untuk [AKSESORIS/JASA] pada [JENIS_KENDARAAN]. Tampilkan produk/jasa secara nyata, hindari simbol uang berlebihan, warna [WARNA_BRAND], ruang promo aktual, rasio 4:5.`,['product']],
['Hari Kemerdekaan Otomotif','Campaign','Independence Automotive Poster',`Buat campaign 17 Agustus [NAMA_USAHA] dengan [NAMA_KENDARAAN] dan tim Indonesia. Gunakan merah-putih sebagai aksen dekorasi nyata, bukan wrap palsu pada kendaraan kecuali diminta, rasio 4:5.`,['human','product']],
['Anniversary Bengkel','Campaign','Anniversary Automotive Poster',`Buat anniversary [NAMA_BENGKEL] dengan owner, tim dan kendaraan di workshop. Jangan mengarang jumlah tahun/customer; sisakan area data aktual, warna [WARNA_BRAND], rasio 4:5.`,['human','product']],
['Custom Automotive Campaign','Campaign','Brand Automotive Poster',`Buat key visual [NAMA_USAHA] untuk [NAMA_KENDARAAN/JASA], mempertahankan kendaraan/produk secara akurat, identitas [WARNA_BRAND], high-end automotive photography, ruang copy, rasio 4:5.`,['product']]
].forEach((x,i)=>add('OTO',i+1,O,x[1],x[2],x[0],x[3],x[4]));

// =========================
// 351–400 KERAJINAN, HAMPERS & SOUVENIR
// =========================
const H='Kerajinan, Hampers & Souvenir';
[
['Hero Hampers Premium','Hero Produk','Hampers Poster',`Buat hero product photo [NAMA_HAMPERS] berisi [ISI_HAMPERS]. Susun setiap item rapi dan proporsional dalam box/basket [JENIS_KEMASAN], material realistis, background [WARNA_BRAND], soft commercial lighting, rasio 4:5.`,['product']],
['Flatlay Hampers','Hero Produk','Flatlay Hampers Poster',`Buat top-view flatlay [NAMA_HAMPERS] dengan [ISI_HAMPERS] tersusun rapi, ribbon, kartu kosong tanpa teks, dan material packaging nyata. Background [WARNA_BRAND], natural soft light, rasio 4:5.`,['product']],
['Kerajinan Handmade Close-up','Hero Produk','Craft Detail Poster',`Buat macro close-up [NAMA_PRODUK] handmade yang menonjolkan tekstur [MATERIAL], jahitan/ukiran/anyaman atau finishing secara realistis. Hindari pola repetitif AI, lighting natural, rasio 4:5.`,['product']],
['Souvenir Set Premium','Hero Produk','Souvenir Poster',`Buat product lineup [NAMA_SOUVENIR] dalam beberapa unit konsisten, tersusun premium. Bentuk, warna dan motif harus sama antar unit kecuali variasi diminta, background [WARNA_BRAND], rasio 4:5.`,['product']],
['Hampers dengan Gift Box','Hero Produk','Gift Box Poster',`Buat [NAMA_HAMPERS] dalam gift box premium [JENIS_KEMASAN] yang terbuka, menampilkan [ISI_HAMPERS] secara jelas. Ribbon, tissue, box dan produk memiliki material realistis, [WARNA_BRAND], rasio 4:5.`,['product']],
['Produk Handmade di Meja Kerja','Hero Produk','Lifestyle Craft Poster',`Buat [NAMA_PRODUK] handmade di atas meja kerja pengrajin dengan alat relevan di sekelilingnya. Produk tetap focal point, workshop kecil Indonesia believable, warm natural light, rasio 4:5.`,['product']],
['Kerajinan Kayu Premium','Hero Produk','Wood Craft Poster',`Buat hero photo [NAMA_PRODUK] berbahan kayu [JENIS_KAYU]. Tampilkan grain, sambungan, ukiran dan finishing yang realistis, tanpa tekstur kayu sintetis berulang, background [WARNA_BRAND], rasio 4:5.`,['product']],
['Kerajinan Kain Premium','Hero Produk','Textile Craft Poster',`Buat hero visual [NAMA_PRODUK] berbahan [JENIS_KAIN], tonjolkan tekstur, jahitan, motif dan lipatan natural. Jangan membuat motif meleleh/duplikat aneh, background [WARNA_BRAND], rasio 4:5.`,['product']],
['Souvenir Custom','Hero Produk','Custom Souvenir Poster',`Buat visual [NAMA_SOUVENIR] custom dalam layout premium. Area nama/logo harus kosong atau mengikuti referensi yang diberikan; jangan mengarang tulisan. Material realistis, background [WARNA_BRAND], rasio 4:5.`,['product']],
['Hampers Lifestyle','Hero Produk','Lifestyle Gift Poster',`Buat [NAMA_HAMPERS] dalam suasana gifting yang natural di rumah/kantor Indonesia. Tangan/orang hanya sebagai konteks, gift set tetap hero, warm soft light, warna [WARNA_BRAND], rasio 4:5.`,['human','product']],

['Promo Hampers','Promo','Hampers Promo Poster',`Buat key visual promo [NAMA_HAMPERS] dengan isi [ISI_HAMPERS] terlihat jelas, packaging realistis, area kosong untuk harga/promo aktual, background [WARNA_BRAND], rasio 4:5.`,['product']],
['Promo Bundling Souvenir','Promo','Bundle Souvenir Poster',`Buat visual bundling [SOUVENIR_1], [SOUVENIR_2], [SOUVENIR_3] dalam satu gift set yang proporsional. Jangan mengubah bentuk produk, background [WARNA_BRAND], area harga kosong, rasio 4:5.`,['product']],
['Promo Custom Nama','Promo','Personalized Gift Poster',`Buat [NAMA_PRODUK] dengan area personalisasi yang mengikuti referensi atau dibiarkan kosong. Jangan menghasilkan nama random. Tampilkan opsi custom secara visual melalui blank tag/plate, background [WARNA_BRAND], rasio 4:5.`,['product']],
['Promo Wedding Souvenir','Promo','Wedding Souvenir Poster',`Buat visual [NAMA_SOUVENIR] untuk wedding dengan styling elegan, floral accents realistis, packaging premium, area nama pasangan/tanggal kosong, warna [WARNA_BRAND], rasio 4:5.`,['product']],
['Promo Corporate Gift','Promo','Corporate Gift Poster',`Buat [NAMA_HAMPERS] sebagai corporate gift premium. Packaging clean, isi rapi, area logo perusahaan kosong kecuali referensi diberikan, background [WARNA_BRAND], professional gift photography, rasio 4:5.`,['product']],
['Promo Hampers Lebaran','Promo','Lebaran Hampers Poster',`Buat promo [NAMA_HAMPERS] Lebaran dengan isi [ISI_HAMPERS], dekorasi Islami modern yang halus, packaging realistis, area harga kosong, [WARNA_BRAND], rasio 4:5.`,['product']],
['Promo Hampers Natal','Promo','Christmas Hampers Poster',`Buat visual [NAMA_HAMPERS] untuk Natal dengan dekorasi festive yang realistis dan tidak berlebihan, isi [ISI_HAMPERS] jelas, background [WARNA_BRAND], ruang promo, rasio 4:5.`,['product']],
['Promo Hampers Ulang Tahun','Promo','Birthday Hampers Poster',`Buat [NAMA_HAMPERS] untuk hadiah ulang tahun dengan ribbon/balon secukupnya, gift set tetap hero, material realistis, background [WARNA_BRAND], area harga kosong, rasio 4:5.`,['product']],
['Promo Hampers Wisuda','Promo','Graduation Gift Poster',`Buat visual [NAMA_HAMPERS] untuk wisuda dengan elemen graduation cap/flowers realistis. Area nama kampus/orang kosong, gift set premium, [WARNA_BRAND], rasio 4:5.`,['product']],
['Promo Hampers Custom Budget','Promo','Custom Budget Poster',`Buat visual beberapa opsi [NAMA_HAMPERS] dengan variasi isi [ISI_HAMPERS] dan ukuran packaging yang realistis. Jangan merender nominal harga otomatis; sisakan area untuk paket aktual, rasio 4:5.`,['product']],

['Hampers Raksasa','Hook Visual','Creative Hampers Poster',`Buat [NAMA_HAMPERS] berukuran raksasa di ruang/event Indonesia seperti practical commercial composite. Isi hampers tetap proporsional, box/material realistis, manusia kecil dengan scale konsisten, rasio 4:5.`,['human','product','surreal']],
['Miniature Gift Makers','Hook Visual','Miniature Craft Poster',`Buat miniature workers realistis sedang menyusun [NAMA_HAMPERS] berukuran besar. Macro photography, alat packing/craft masuk akal, ribbon dan box mengikuti physics, rasio 4:5.`,['human','product','surreal']],
['Before After Packaging','Hook Visual','Packaging Transformation Poster',`Buat split-scene isi [ISI_HAMPERS] sebelum dikemas dan setelah menjadi [NAMA_HAMPERS]. Semua item identik di kedua sisi, hanya susunan/packaging berubah, angle dan lighting konsisten, rasio 4:5.`,['product']],
['Box Meledak Terbuka','Hook Visual','Exploding Gift Poster',`Buat [NAMA_HAMPERS] seolah gift box terbuka dengan [ISI_HAMPERS] terangkat ringan di sekitarnya seperti high-end commercial composite. Setiap item tetap utuh, scale/shadow realistis, background [WARNA_BRAND], rasio 4:5.`,['product','surreal']],
['Produk Keluar dari Ribbon','Hook Visual','Creative Gift Visual',`Buat [NAMA_PRODUK] dikelilingi ribbon yang membentuk gerakan dinamis realistis. Ribbon tidak memotong produk secara aneh, shadow dan depth konsisten, background [WARNA_BRAND], rasio 4:5.`,['product','surreal']],
['Souvenir Display Raksasa','Hook Visual','Creative Souvenir Poster',`Buat [NAMA_SOUVENIR] sebagai display besar di venue/event seperti practical advertising composite. Produk tetap konsisten, manusia/ruang berskala benar, lighting realistis, rasio 4:5.`,['human','product','surreal']],
['Gift Box Floating','Hook Visual','Floating Gift Poster',`Buat gift box [NAMA_HAMPERS] melayang sedikit dengan ribbon dan beberapa item [ISI_HAMPERS] tersusun di sekitarnya. Eksekusi seperti studio composite nyata, physics/shadow konsisten, [WARNA_BRAND], rasio 4:5.`,['product','surreal']],
['Craft Process Macro','Hook Visual','Craft Macro Poster',`Buat extreme macro tangan pengrajin membuat [NAMA_PRODUK] menggunakan [ALAT/MATERIAL]. Posisi jari dan alat harus benar, material detail, documentary-commercial style, rasio 4:5.`,['human','product']],
['Billboard Hampers','Hook Visual','Billboard Gift Mockup',`Buat billboard realistis [NAMA_HAMPERS] di lingkungan mall/kota Indonesia. Perspective dan lighting billboard sesuai lokasi, visual produk premium, area copy kosong, [WARNA_BRAND], rasio 4:5.`,['product','surreal']],
['Gift Moment Sinematik','Hook Visual','Lifestyle Gift Poster',`Buat momen pemberian [NAMA_HAMPERS] antara dua orang Indonesia secara natural. Tangan/anatomi akurat, emosi hangat tidak berlebihan, gift set tetap terlihat jelas, soft cinematic daylight, rasio 4:5.`,['human','product']],

['Proses Handmade Nyata','Trust','Behind The Scene Craft Poster',`Buat pengrajin Indonesia sedang membuat [NAMA_PRODUK] secara manual di workshop kecil yang nyata. Tampilkan alat, material dan proses yang sesuai, tangan natural, authentic documentary photography, rasio 4:5.`,['human','product']],
['Quality Check Produk','Trust','Craft Quality Poster',`Buat pengrajin memeriksa kualitas [NAMA_PRODUK] sebelum packing. Detail produk realistis, tangan benar, meja kerja rapi, jangan tampilkan stempel sertifikasi palsu, rasio 4:5.`,['human','product']],
['Owner & Produk','Trust','Founder Craft Poster',`Buat owner [NAMA_USAHA] Indonesia memegang [NAMA_PRODUK] dengan latar workshop/packing area nyata. Ekspresi natural, produk sesuai referensi, warna [WARNA_BRAND], rasio 4:5.`,['human','product']],
['Tim Packing Hampers','Trust','Packing Team Poster',`Buat tim kecil Indonesia sedang packing [NAMA_HAMPERS] secara rapi. Wajah unik, tangan natural, isi hampers konsisten, meja kerja believable, rasio 4:5.`,['human','product']],
['Banyak Pesanan Hampers','Trust','Social Proof Hampers Poster',`Buat beberapa [NAMA_HAMPERS] siap kirim dalam jumlah wajar untuk UMKM. Jangan menampilkan nama customer, angka order atau bukti transaksi palsu. Packaging konsisten, rasio 4:5.`,['product']],
['Packaging Rapi','Trust','Packaging Trust Poster',`Buat close-up packaging [NAMA_HAMPERS] yang rapi: box, ribbon, tissue, sticker/label mengikuti referensi. Jangan mengarang logo atau teks, material realistis, rasio 4:5.`,['product']],
['Testimoni Hampers','Trust','Testimonial Gift Poster',`Buat visual [NAMA_HAMPERS] bersama customer Indonesia yang menerima hadiah, dengan ruang kosong untuk testimoni asli. Jangan mengarang quote/rating/nama, rasio 4:5.`,['human','product']],
['Portfolio Custom Order','Trust','Portfolio Craft Poster',`Buat grid visual beberapa hasil custom [NAMA_PRODUK] berdasarkan referensi berbeda. Tiap item harus konsisten dengan referensi, tidak ada teks acak, clean portfolio layout, [WARNA_BRAND], rasio 4:5.`,['product']],
['Material Berkualitas','Trust','Material Detail Poster',`Buat close-up [MATERIAL] yang digunakan untuk [NAMA_PRODUK], menampilkan texture dan craftsmanship nyata. Jangan membuat klaim kualitas yang tidak didukung; fokus pada detail visual, rasio 4:5.`,['product']],
['Serah Terima Pesanan','Trust','Order Handover Poster',`Buat momen serah terima [NAMA_HAMPERS] dari owner/staf kepada customer Indonesia. Gesture natural, gift set terlihat jelas, tidak ada invoice/data pribadi terbaca, rasio 4:5.`,['human','product']],

['Ramadhan Hampers','Campaign','Ramadhan Hampers Poster',`Buat campaign Ramadhan [NAMA_HAMPERS] dengan isi [ISI_HAMPERS], dekorasi Islami modern yang halus, warm light, packaging realistis, warna [WARNA_BRAND], rasio 4:5.`,['product']],
['Lebaran Hampers','Campaign','Lebaran Gift Poster',`Buat visual Lebaran [NAMA_HAMPERS] di suasana keluarga Indonesia yang hangat. Gift set tetap hero, dekorasi festive realistis, interaction natural, rasio 4:5.`,['human','product']],
['Natal Hampers','Campaign','Christmas Gift Poster',`Buat Christmas campaign [NAMA_HAMPERS] dengan styling festive premium, warm light, gift box/isi realistis, background [WARNA_BRAND], rasio 4:5.`,['product']],
['Hari Ibu Gift','Campaign','Mothers Day Gift Poster',`Buat visual Hari Ibu dengan [NAMA_HAMPERS] sebagai hadiah dari anak dewasa kepada ibu Indonesia. Ekspresi natural, gift set terlihat jelas, soft daylight, rasio 4:5.`,['human','product']],
['Valentine Gift','Campaign','Valentine Gift Poster',`Buat Valentine campaign [NAMA_HAMPERS] dengan romantic styling yang elegan, tidak penuh ikon hati generik. Packaging premium, background [WARNA_BRAND], rasio 4:5.`,['product']],
['Wisuda Gift','Campaign','Graduation Gift Poster',`Buat campaign wisuda [NAMA_HAMPERS] dengan graduate Indonesia memegang gift set. Wajah/tangan natural, area nama kampus/orang kosong, suasana nyata, rasio 4:5.`,['human','product']],
['Corporate Gift Campaign','Campaign','Corporate Gift Poster',`Buat [NAMA_HAMPERS] sebagai corporate gift di meja kantor Indonesia modern. Packaging clean, area logo perusahaan kosong kecuali referensi diberikan, professional photography, rasio 4:5.`,['product']],
['Wedding Souvenir Campaign','Campaign','Wedding Souvenir Poster',`Buat [NAMA_SOUVENIR] sebagai wedding favor di meja resepsi yang elegan. Jumlah souvenir realistis, area nama/tanggal kosong, floral styling natural, warna [WARNA_BRAND], rasio 4:5.`,['product']],
['Anniversary Brand Gift','Campaign','Anniversary Gift Poster',`Buat anniversary [NAMA_USAHA] dengan [NAMA_HAMPERS] sebagai hero, owner/tim bila perlu, celebration accents minimal. Jangan mengarang jumlah tahun/order; sisakan area data aktual, rasio 4:5.`,['human','product']],
['Custom Gift Campaign','Campaign','Brand Gift Poster',`Buat key visual [NAMA_USAHA] untuk [NAMA_HAMPERS/PRODUK], mempertahankan produk dan packaging secara akurat, identitas [WARNA_BRAND], premium gift photography, ruang copy, rasio 4:5.`,['product']]
].forEach((x,i)=>add('KHS',i+1,H,x[1],x[2],x[0],x[3],x[4]));

if(data.length!==100) throw new Error('Expected 100 prompts, got '+data.length);

export const prompts = data;
export default prompts;
