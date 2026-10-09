// BADAI PROMPT UMKM — IMAGE PROMPTS V2 (401–500)
// Retail Harian & Toko + Event, Wedding & Kreatif
// Semua final image_prompt membawa aturan ANTI AI SLOP.

import { ANTI_AI_SLOP_RULE } from './image-prompts-001-200-v2.js';

const HUMAN = `
REAL HUMAN DETAIL: jika ada manusia, gunakan orang Indonesia yang terlihat nyata dan relatable; anatomi akurat, tangan lima jari, pose natural, ekspresi tidak kaku, skin texture nyata, pakaian mengikuti gravitasi, dan tidak ada anggota tubuh ekstra, duplikat, atau menyatu.
`;

const PRODUCT = `
REFERENCE FIDELITY: jika user memberi foto referensi toko, rak, produk, booth, venue, dekorasi, souvenir, logo, packaging, atau objek utama, pertahankan bentuk, proporsi, warna, material, layout, detail desain, dan identitas visual secara akurat. Jangan mengarang logo, label, tulisan, nomor meja, nama pasangan, tanggal, atau detail brand.
`;

const SURREAL = `
SURREAL REALISM: konsep kreatif boleh fantastis, tetapi eksekusinya harus seperti practical commercial composite / VFX photography profesional. Skala, physics, perspective, shadow, reflection, dan lighting harus konsisten dan believable.
`;

const NO_TEXT = `
LAYOUT RULE: utamakan visual dan sisakan negative space untuk headline, harga, CTA, promo, logo, nama acara, nama pasangan, tanggal, nomor WhatsApp, atau detail lain yang akan ditambahkan saat desain. Jangan mengandalkan AI untuk menulis teks panjang, angka harga, daftar menu, nama, tanggal, label, atau logo.
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
// 401–450 RETAIL HARIAN & TOKO
// =========================
const R='Retail Harian & Toko';
[
['Hero Etalase Toko','Hero Toko','Retail Store Poster',`Buat commercial retail photo [NAMA_TOKO] dengan etalase depan yang rapi dan menarik. Gunakan referensi toko bila tersedia, pertahankan layout, rak, produk utama [PRODUK_UTAMA], dan warna [WARNA_BRAND]. Pencahayaan toko realistis, suasana lokal Indonesia, rasio 4:5.`,['product']],
['Rak Produk Rapi','Hero Toko','Shelf Display Poster',`Buat visual rak [NAMA_TOKO] yang menampilkan [PRODUK_UTAMA] tersusun rapi dan proporsional. Label/packaging tidak boleh berubah atau menghasilkan teks acak, lighting retail realistis, warna [WARNA_BRAND], rasio 4:5.`,['product']],
['Kasir dan Produk','Hero Toko','Checkout Poster',`Buat visual kasir [NAMA_TOKO] dengan staf Indonesia sedang melayani customer secara natural. Tampilkan [PRODUK_UTAMA] di area checkout, mesin kasir realistis, tidak ada struk/angka palsu yang terbaca, rasio 4:5.`,['human','product']],
['Toko Kelontong Modern','Hero Toko','Neighborhood Store Poster',`Buat visual [NAMA_TOKO] sebagai toko kelontong modern Indonesia yang bersih, rapi, dan realistis. Rak berisi [KATEGORI_PRODUK], aisle tidak terlalu sempurna, lighting natural, warna [WARNA_BRAND], rasio 4:5.`,['product']],
['Minimarket Lokal','Hero Toko','Mini Market Poster',`Buat visual minimarket lokal [NAMA_TOKO] dengan customer Indonesia sedang berbelanja secara natural. Pertahankan layout toko referensi bila ada, produk di rak konsisten, tidak ada logo/label palsu, rasio 4:5.`,['human','product']],
['Warung Harian Premium','Hero Toko','Warung Poster',`Buat visual warung [NAMA_TOKO] yang rapi, autentik, dan nyaman. Tampilkan produk harian [PRODUK_UTAMA], owner/staf Indonesia natural, daylight realistis, warna [WARNA_BRAND] sebagai aksen, rasio 4:5.`,['human','product']],
['Produk Best Seller Toko','Hero Toko','Best Seller Product Poster',`Buat hero product photo [PRODUK_UTAMA] sebagai produk unggulan [NAMA_TOKO]. Gunakan kemasan asli/referensi secara akurat, background [WARNA_BRAND], clean retail lighting, area badge best seller kosong, rasio 4:5.`,['product']],
['Keranjang Belanja','Hero Toko','Shopping Basket Poster',`Buat lifestyle retail photo keranjang belanja berisi [DAFTAR_PRODUK] dari [NAMA_TOKO]. Semua produk memiliki scale dan packaging realistis, keranjang tidak deform, background toko natural, rasio 4:5.`,['product']],
['Counter Produk','Hero Toko','Counter Display Poster',`Buat counter display [NAMA_TOKO] dengan [PRODUK_UTAMA] tertata premium. Material kaca/kayu/metal realistis, reflection konsisten, produk tidak duplikat aneh, warna [WARNA_BRAND], rasio 4:5.`,['product']],
['Owner di Depan Toko','Hero Toko','Founder Retail Poster',`Buat owner [NAMA_TOKO] Indonesia berdiri di depan toko dengan ekspresi ramah dan natural. Toko dan signage mengikuti referensi, jangan membuat tulisan/logo baru, warna [WARNA_BRAND], rasio 4:5.`,['human','product']],

['Promo Harga Spesial','Promo','Retail Promo Poster',`Buat key visual promo [PRODUK_UTAMA] di [NAMA_TOKO] dengan area kosong untuk harga aktual [HARGA]. Produk/packaging akurat, background [WARNA_BRAND], clean retail advertising, rasio 4:5.`,['product']],
['Promo Bundling Harian','Promo','Bundle Retail Poster',`Buat visual bundling [PRODUK_1], [PRODUK_2], [PRODUK_3] dalam satu set belanja yang realistis. Semua packaging konsisten, area harga kosong, background [WARNA_BRAND], rasio 4:5.`,['product']],
['Promo Beli Banyak Hemat','Promo','Multi Buy Poster',`Buat visual multi-buy untuk [PRODUK_UTAMA] dengan beberapa unit identik dan proporsional. Hindari pengulangan kemasan yang cacat, area copy promo kosong, warna [WARNA_BRAND], rasio 4:5.`,['product']],
['Promo Weekend Toko','Promo','Weekend Retail Poster',`Buat campaign weekend [NAMA_TOKO] dengan customer Indonesia berbelanja secara natural. Tampilkan [PRODUK_UTAMA], aisle realistis, area promo kosong, warna [WARNA_BRAND], rasio 4:5.`,['human','product']],
['Promo Payday Toko','Promo','Payday Retail Poster',`Buat payday campaign [NAMA_TOKO] dengan shopping scene realistis dan [PRODUK_UTAMA] sebagai hero. Hindari simbol uang berlebihan, sisakan ruang promo aktual, [WARNA_BRAND], rasio 4:5.`,['human','product']],
['Promo Produk Baru','Promo','New Product Retail Poster',`Buat launching visual [PRODUK_UTAMA] di [NAMA_TOKO] dengan shelf/display realistis. Area label NEW kosong, packaging akurat, background [WARNA_BRAND], rasio 4:5.`,['product']],
['Promo Stok Terbatas','Promo','Limited Stock Retail Poster',`Buat visual [PRODUK_UTAMA] dengan jumlah unit terbatas yang believable pada rak [NAMA_TOKO]. Jangan mengarang jumlah stok; sisakan area untuk data aktual, rasio 4:5.`,['product']],
['Promo Member Toko','Promo','Membership Retail Poster',`Buat visual program member [NAMA_TOKO] melalui customer Indonesia di checkout dan pengalaman belanja yang ramah. Jangan buat kartu member/nomor palsu terbaca, area benefit kosong, rasio 4:5.`,['human','product']],
['Promo Paket Sembako','Promo','Grocery Bundle Poster',`Buat paket sembako [DAFTAR_PRODUK] tersusun rapi dalam satu bundle. Kemasan/ukuran realistis, tidak ada merek palsu, area harga kosong, background [WARNA_BRAND], rasio 4:5.`,['product']],
['Promo Flash Sale Toko','Promo','Flash Sale Retail Poster',`Buat key visual flash sale [NAMA_TOKO] dengan [PRODUK_UTAMA] sebagai focal point. Gunakan motion accents secukupnya, jangan terlalu neon/HDR, area waktu/harga kosong, rasio 4:5.`,['product']],

['Keranjang Belanja Raksasa','Hook Visual','Creative Retail Poster',`Buat keranjang belanja raksasa berisi [PRODUK_UTAMA] di depan [NAMA_TOKO] seperti practical commercial composite. Produk, keranjang, shadow, scale dan perspective realistis, rasio 4:5.`,['product','human','surreal']],
['Miniature Store Workers','Hook Visual','Miniature Retail Poster',`Buat miniature workers realistis sedang menata [PRODUK_UTAMA] berukuran besar di rak mini. Macro photography, scale interaction masuk akal, packaging tetap akurat, rasio 4:5.`,['human','product','surreal']],
['Rak Kosong vs Penuh','Hook Visual','Before After Shelf Poster',`Buat split visual rak [NAMA_TOKO] dari angle sama: kiri hampir kosong, kanan tertata penuh [PRODUK_UTAMA]. Rak, kamera, lighting dan produk konsisten, rasio 4:5.`,['product']],
['Toko Sepi vs Ramai','Hook Visual','Retail Before After Poster',`Buat split-scene [NAMA_TOKO] yang sama: sisi kiri sepi, sisi kanan lebih ramai customer Indonesia. Jangan mengklaim sebab-akibat; tampilkan perbedaan suasana secara realistis, rasio 4:5.`,['human','product']],
['Produk Raksasa di Toko','Hook Visual','Giant Product Poster',`Buat [PRODUK_UTAMA] berukuran raksasa di dalam [NAMA_TOKO] seperti advertising composite profesional. Rak dan customer kecil memiliki scale konsisten, packaging akurat, rasio 4:5.`,['product','human','surreal']],
['Produk Melayang dari Rak','Hook Visual','Floating Product Poster',`Buat [PRODUK_UTAMA] seolah melayang keluar dari rak secara terkontrol. Semua unit memiliki shadow, reflection dan depth realistis, packaging tidak berubah, background [WARNA_BRAND], rasio 4:5.`,['product','surreal']],
['Billboard Toko','Hook Visual','Billboard Retail Mockup',`Buat billboard realistis [NAMA_TOKO] di lingkungan kota Indonesia. Gunakan visual [PRODUK_UTAMA] akurat, perspective dan lighting billboard sesuai lokasi, area copy kosong, rasio 4:5.`,['product','surreal']],
['Aisle Sinematik','Hook Visual','Cinematic Store Poster',`Buat aisle [NAMA_TOKO] dengan leading lines sinematik menuju [PRODUK_UTAMA] sebagai focal point. Lighting retail realistis, shelf labels tidak berisi teks acak, rasio 4:5.`,['product']],
['Shopping Bag Burst','Hook Visual','Creative Shopping Poster',`Buat shopping bag [NAMA_TOKO] terbuka dengan [PRODUK_UTAMA] terangkat ringan seperti commercial composite. Tas dan produk tetap realistis, physics dan shadow konsisten, rasio 4:5.`,['product','surreal']],
['Stop Scrolling Retail','Hook Visual','Social Retail Poster',`Buat visual [PRODUK_UTAMA] untuk [NAMA_TOKO] yang sangat kuat secara komposisi namun tetap realistis: produk besar, warna kontras terkontrol, clean background [WARNA_BRAND], ruang hook, rasio 4:5.`,['product']],

['Pelayanan Ramah','Trust','Customer Service Poster',`Buat staf [NAMA_TOKO] Indonesia melayani customer secara ramah di area kasir/rak. Gesture natural, mesin kasir/produk realistis, tidak ada struk/data pribadi terbaca, rasio 4:5.`,['human','product']],
['Rak Tertata Rapi','Trust','Store Organization Poster',`Buat rak [NAMA_TOKO] yang tertata rapi dengan [KATEGORI_PRODUK]. Produk dan packaging konsisten, jarak rak realistis, lighting toko natural, rasio 4:5.`,['product']],
['Owner & Tim Toko','Trust','Retail Team Poster',`Buat owner [NAMA_TOKO] bersama tim kecil Indonesia di depan/dalam toko. Wajah unik, pose group natural, seragam konsisten, toko mengikuti referensi, rasio 4:5.`,['human','product']],
['Proses Restock','Trust','Restock Poster',`Buat staf [NAMA_TOKO] sedang restock [PRODUK_UTAMA] ke rak dengan cara realistis. Kardus, troli dan shelf placement masuk akal, tangan natural, rasio 4:5.`,['human','product']],
['Quality Check Produk','Trust','Retail Quality Poster',`Buat staf memeriksa [PRODUK_UTAMA] sebelum dipajang: packaging, tanggal/kemasan hanya sebagai bentuk visual tanpa teks palsu terbaca. Workspace rapi, rasio 4:5.`,['human','product']],
['Banyak Customer Toko','Trust','Retail Social Proof Poster',`Buat [NAMA_TOKO] dengan beberapa customer Indonesia berbelanja secara wajar. Jumlah orang realistis, wajah unik, tidak seperti crowd AI, aktivitas natural, rasio 4:5.`,['human','product']],
['Packing Pesanan Online','Trust','Online Order Poster',`Buat staf [NAMA_TOKO] sedang packing pesanan online [PRODUK_UTAMA]. Paket rapi, tidak ada nama/alamat/order number palsu terbaca, meja kerja realistis, rasio 4:5.`,['human','product']],
['Testimoni Customer Toko','Trust','Retail Testimonial Poster',`Buat customer Indonesia membawa [PRODUK_UTAMA] dari [NAMA_TOKO] dengan ruang kosong untuk testimoni asli. Jangan mengarang rating, kutipan, nama atau jumlah pembelian, rasio 4:5.`,['human','product']],
['Repeat Customer','Trust','Retail Loyalty Poster',`Buat customer lama kembali berbelanja di [NAMA_TOKO] dengan interaksi hangat bersama staf. Hindari simbol loyalty generik, fokus pada momen natural, rasio 4:5.`,['human','product']],
['Storefront Malam','Trust','Storefront Night Poster',`Buat storefront [NAMA_TOKO] pada malam hari dengan pencahayaan signage/interior realistis. Jangan membuat glow berlebihan atau tulisan palsu, toko tetap akurat, rasio 4:5.`,['product']],

['Ramadhan Retail','Campaign','Ramadhan Retail Poster',`Buat campaign Ramadhan [NAMA_TOKO] dengan [PRODUK_UTAMA], customer Indonesia, dekorasi Islami yang halus, warm retail lighting, warna [WARNA_BRAND], rasio 4:5.`,['human','product']],
['Lebaran Shopping','Campaign','Lebaran Retail Poster',`Buat visual belanja Lebaran di [NAMA_TOKO] dengan keluarga/customer Indonesia. Produk dan toko realistis, festive accents secukupnya, warna [WARNA_BRAND], rasio 4:5.`,['human','product']],
['Back to School Retail','Campaign','Back To School Retail Poster',`Buat campaign back-to-school [NAMA_TOKO] dengan produk [PRODUK_UTAMA] yang relevan. Pelajar/ortu Indonesia natural, rak realistis, area promo kosong, rasio 4:5.`,['human','product']],
['Tahun Baru Toko','Campaign','New Year Retail Poster',`Buat New Year campaign [NAMA_TOKO] dengan storefront/rak dan [PRODUK_UTAMA] sebagai hero. Celebration accents minimal, lighting realistis, warna [WARNA_BRAND], rasio 4:5.`,['product']],
['Hari Kemerdekaan Retail','Campaign','Independence Retail Poster',`Buat campaign 17 Agustus [NAMA_TOKO] dengan aksen merah-putih realistis, customer/staf Indonesia natural, produk tetap akurat, rasio 4:5.`,['human','product']],
['Weekend Shopping','Campaign','Weekend Retail Poster',`Buat weekend shopping visual [NAMA_TOKO] dengan customer Indonesia berbelanja santai. Daylight/retail light natural, produk [PRODUK_UTAMA] terlihat jelas, rasio 4:5.`,['human','product']],
['Payday Shopping','Campaign','Payday Retail Poster',`Buat payday shopping campaign [NAMA_TOKO] dengan [PRODUK_UTAMA] dan customer natural. Hindari money rain/gimmick generik, ruang promo aktual, [WARNA_BRAND], rasio 4:5.`,['human','product']],
['Anniversary Toko','Campaign','Retail Anniversary Poster',`Buat anniversary [NAMA_TOKO] dengan owner/tim dan suasana toko nyata. Jangan mengarang jumlah tahun/customer; sisakan area data aktual, warna [WARNA_BRAND], rasio 4:5.`,['human','product']],
['Grand Opening Toko','Campaign','Grand Opening Poster',`Buat grand opening [NAMA_TOKO] dengan storefront akurat, owner/tim/customer secukupnya, dekorasi opening realistis, area tanggal/alamat kosong, warna [WARNA_BRAND], rasio 4:5.`,['human','product']],
['Custom Retail Campaign','Campaign','Brand Retail Poster',`Buat key visual [NAMA_TOKO] dengan [PRODUK_UTAMA], mempertahankan toko/produk secara akurat, identitas [WARNA_BRAND], high-end retail photography, ruang copy, rasio 4:5.`,['product']]
].forEach((x,i)=>add('RTL',i+1,R,x[1],x[2],x[0],x[3],x[4]));

// =========================
// 451–500 EVENT, WEDDING & KREATIF
// =========================
const W='Event, Wedding & Kreatif';
[
['Hero Wedding Stage','Hero Event','Wedding Stage Poster',`Buat hero photo dekorasi wedding [NAMA_ACARA] berdasarkan [REFERENSI_DEKORASI] bila tersedia. Pertahankan layout panggung, bunga, lighting dan warna [WARNA_TEMA] secara akurat. Jangan menulis nama pasangan/tanggal otomatis, rasio 4:5.`,['product']],
['Meja Resepsi Premium','Hero Event','Reception Table Poster',`Buat wedding reception table [NAMA_ACARA] dengan table setting, floral, candle dan dekorasi [WARNA_TEMA] yang realistis. Material kaca/logam/kain natural, lighting venue believable, rasio 4:5.`,['product']],
['Wedding Couple Portrait','Hero Event','Wedding Couple Poster',`Buat portrait pasangan pengantin Indonesia untuk [NAMA_ACARA] dengan busana [GAYA_BUSANA], pose natural dan elegan. Wajah/anatomi realistis, skin texture natural, venue [LOKASI], warna [WARNA_TEMA], rasio 4:5.`,['human']],
['Event Stage Corporate','Hero Event','Corporate Event Poster',`Buat stage [NAMA_EVENT] di venue [LOKASI] dengan lighting rig, LED screen dan seating yang realistis. Jangan merender logo/nama event palsu di screen; gunakan screen placeholder bersih, warna [WARNA_TEMA], rasio 4:5.`,['product']],
['Birthday Decoration','Hero Event','Birthday Event Poster',`Buat dekorasi ulang tahun [NAMA_ACARA] dengan balon, cake table dan styling [WARNA_TEMA] yang realistis. Hindari balon/dekorasi berulang aneh, area nama/usia kosong, rasio 4:5.`,['product']],
['Booth Event Premium','Hero Event','Event Booth Poster',`Buat booth [NAMA_BRAND/ACARA] di event dengan struktur booth realistis, material akurat, lighting venue natural, area signage kosong kecuali referensi logo diberikan, warna [WARNA_TEMA], rasio 4:5.`,['product']],
['Photobooth Event','Hero Event','Photobooth Poster',`Buat photobooth [NAMA_ACARA] dengan backdrop, props dan lighting yang realistis. Jangan merender nama/tanggal palsu; gunakan area backdrop kosong, warna [WARNA_TEMA], rasio 4:5.`,['product']],
['Invitation Flatlay','Hero Event','Invitation Styling Poster',`Buat flatlay undangan [NAMA_ACARA] dengan envelope, ribbon, flowers dan accessories. Kartu undangan dibiarkan blank/tanpa teks acak, material kertas realistis, warna [WARNA_TEMA], rasio 4:5.`,['product']],
['Souvenir Event Display','Hero Event','Event Souvenir Poster',`Buat display [NAMA_SOUVENIR] untuk [NAMA_ACARA] secara rapi dan premium. Jangan membuat nama/tanggal/logo palsu, packaging konsisten, warna [WARNA_TEMA], rasio 4:5.`,['product']],
['Creative Studio Team','Hero Event','Creative Team Poster',`Buat tim kreatif Indonesia [NAMA_USAHA] sedang menyiapkan [JENIS_EVENT] di venue. Tampilkan alat, dekorasi, laptop, lighting atau props yang relevan, pose candid natural, rasio 4:5.`,['human','product']],

['Promo Wedding Package','Promo Event','Wedding Package Poster',`Buat key visual paket wedding [NAMA_PAKET] dengan venue/dekorasi/pasangan sebagai visual utama. Sisakan area detail paket/harga aktual, jangan mengarang vendor/fasilitas, warna [WARNA_TEMA], rasio 4:5.`,['human','product']],
['Promo Event Organizer','Promo Event','EO Promo Poster',`Buat promo [NAMA_USAHA] sebagai event organizer melalui visual tim sedang mengelola [JENIS_EVENT]. Venue realistis, alat/clipboard generic tanpa teks palsu, area paket kosong, rasio 4:5.`,['human','product']],
['Promo Dekorasi','Promo Event','Decoration Promo Poster',`Buat promo dekorasi [JENIS_DEKORASI] untuk [NAMA_ACARA] dengan hasil dekor yang realistis, material bunga/kain/lampu natural, area harga kosong, warna [WARNA_TEMA], rasio 4:5.`,['product']],
['Promo Fotografi Event','Promo Event','Photography Promo Poster',`Buat promo jasa foto [JENIS_EVENT] dari [NAMA_USAHA], menampilkan fotografer Indonesia bekerja dengan kamera/lens/lighting yang benar. Area paket kosong, venue natural, rasio 4:5.`,['human']],
['Promo Videografi Event','Promo Event','Videography Promo Poster',`Buat visual videographer [NAMA_USAHA] sedang merekam [JENIS_EVENT] menggunakan kamera/gimbal yang realistis. Posture, grip dan gear benar, area paket kosong, rasio 4:5.`,['human']],
['Promo Makeup Wedding','Promo Event','Wedding Makeup Poster',`Buat promo makeup wedding [NAMA_USAHA] dengan pengantin Indonesia dan makeup artist bekerja secara natural. Skin texture tetap nyata, alat makeup realistis, area harga/paket kosong, rasio 4:5.`,['human']],
['Promo Venue','Promo Event','Venue Promo Poster',`Buat key visual venue [NAMA_VENUE] untuk [JENIS_EVENT] berdasarkan referensi aktual. Jangan mengubah kapasitas/layout atau menambah fasilitas, sisakan area harga/jadwal aktual, rasio 4:5.`,['product']],
['Promo Paket Ulang Tahun','Promo Event','Birthday Package Poster',`Buat promo paket ulang tahun [NAMA_PAKET] dengan dekorasi, cake table, seating dan props realistis. Area nama/usia/harga kosong, warna [WARNA_TEMA], rasio 4:5.`,['product']],
['Promo Corporate Event','Promo Event','Corporate Event Promo Poster',`Buat key visual paket corporate event [NAMA_USAHA] dengan stage, audience dan crew profesional. Jangan mengarang logo klien, jumlah peserta atau fasilitas, area detail kosong, rasio 4:5.`,['human','product']],
['Promo Booking Date','Promo Event','Booking Event Poster',`Buat visual booking [NAMA_ACARA/JASA] dengan planner Indonesia dan couple/client berdiskusi di meja konsultasi. Kalender hanya visual generik tanpa tanggal palsu, area jadwal aktual, warna [WARNA_TEMA], rasio 4:5.`,['human']],

['Miniature Wedding Crew','Hook Visual','Miniature Wedding Poster',`Buat miniature wedding crew realistis sedang menyusun dekorasi [NAMA_ACARA] berukuran besar. Macro photography, bunga/kain/lampu memiliki scale dan physics konsisten, rasio 4:5.`,['human','product','surreal']],
['Wedding Stage Raksasa','Hook Visual','Creative Wedding Poster',`Buat stage wedding [NAMA_ACARA] berukuran monumental di venue seperti practical commercial composite. Struktur, bunga, manusia, shadow dan perspective realistis, warna [WARNA_TEMA], rasio 4:5.`,['human','product','surreal']],
['Before After Venue','Hook Visual','Venue Transformation Poster',`Buat split-scene venue [LOKASI] dari angle yang sama sebelum dan sesudah dekorasi [JENIS_DEKORASI]. Struktur venue tidak berubah; hanya dekorasi/lighting yang realistis ditambahkan, rasio 4:5.`,['product']],
['Empty Hall vs Event Ready','Hook Visual','Event Transformation Poster',`Buat hall [LOKASI] kosong di sisi kiri dan siap event [NAMA_ACARA] di sisi kanan dari angle identik. Jangan mengubah ukuran/arsitektur hall, lighting dan decor realistis, rasio 4:5.`,['product']],
['Floating Invitation','Hook Visual','Creative Invitation Poster',`Buat invitation card [NAMA_ACARA] melayang ringan bersama ribbon/flowers seperti high-end product composite. Kartu tetap blank tanpa teks acak, shadow/physics realistis, warna [WARNA_TEMA], rasio 4:5.`,['product','surreal']],
['Confetti Freeze Frame','Hook Visual','Dynamic Event Poster',`Buat high-speed event photo dengan confetti di udara saat momen [JENIS_EVENT]. Confetti memiliki depth/motion realistis, wajah/tangan crowd natural, lighting venue konsisten, rasio 4:5.`,['human','surreal']],
['Billboard Event','Hook Visual','Event Billboard Mockup',`Buat billboard realistis untuk [NAMA_ACARA] di lingkungan kota Indonesia. Gunakan visual event/venue akurat, area nama/tanggal kosong, perspective dan lighting sesuai lokasi, rasio 4:5.`,['product','surreal']],
['Aerial Event Layout','Hook Visual','Aerial Event Poster',`Buat top-view/aerial [NAMA_ACARA] berdasarkan layout [REFERENSI_LAYOUT]. Meja, kursi, stage dan aisle mengikuti geometry realistis, jumlah orang wajar, jangan mengarang layout, rasio 4:5.`,['human','product']],
['Creative Light Tunnel','Hook Visual','Event Lighting Poster',`Buat entrance/light tunnel untuk [NAMA_ACARA] dengan lampu realistis dan struktur aman. Jangan membuat neon/glow berlebihan; reflection dan exposure natural, warna [WARNA_TEMA], rasio 4:5.`,['product']],
['Moment Freeze Wedding','Hook Visual','Wedding Moment Poster',`Buat candid wedding moment pasangan Indonesia saat [MOMEN] dengan guest/venue natural. Gesture, veil, kain, confetti/bunga mengikuti physics, cinematic photography realistis, rasio 4:5.`,['human']],

['Behind The Scene EO','Trust','Event BTS Poster',`Buat behind-the-scenes tim [NAMA_USAHA] sedang setup [JENIS_EVENT]. Tampilkan kabel, lighting, decor, checklist generic tanpa teks palsu, crew Indonesia natural, rasio 4:5.`,['human','product']],
['Tim Event Profesional','Trust','Event Team Poster',`Buat foto tim [NAMA_USAHA] Indonesia di venue [JENIS_EVENT]. Wajah unik, pose group natural, pakaian/seragam konsisten, alat kerja relevan, tidak ada badge palsu, rasio 4:5.`,['human']],
['Proses Dekorasi','Trust','Decoration BTS Poster',`Buat tim dekorasi sedang memasang [JENIS_DEKORASI] secara realistis. Tangga, alat, bunga/kain/lampu digunakan dengan benar, tangan/anatomi natural, rasio 4:5.`,['human','product']],
['Quality Check Venue','Trust','Event Quality Poster',`Buat event planner memeriksa venue [NAMA_ACARA] sebelum tamu datang. Tampilkan pengecekan meja, stage, lighting atau seating secara natural, checklist tanpa teks palsu, rasio 4:5.`,['human','product']],
['Couple Consultation','Trust','Wedding Consultation Poster',`Buat wedding planner [NAMA_USAHA] konsultasi dengan pasangan Indonesia. Moodboard/floorplan di meja dibuat generic tanpa teks acak, gesture natural, suasana profesional, rasio 4:5.`,['human']],
['Client Handover','Trust','Event Client Poster',`Buat client Indonesia melihat hasil akhir [JENIS_EVENT] bersama planner sebelum acara dimulai. Ekspresi natural, venue/dekorasi realistis, tidak ada dokumen/testimoni palsu, rasio 4:5.`,['human','product']],
['Portfolio Event','Trust','Event Portfolio Poster',`Buat grid visual beberapa hasil [JENIS_EVENT] berdasarkan referensi nyata. Jangan menciptakan venue/client baru atau teks palsu; gunakan foto/visual sebagai portfolio clean, warna [WARNA_BRAND], rasio 4:5.`,['product']],
['Testimoni Event','Trust','Event Testimonial Poster',`Buat visual [JENIS_EVENT] dengan client Indonesia dan ruang kosong untuk testimoni asli. Jangan mengarang rating, quote, nama pasangan, tanggal atau venue, rasio 4:5.`,['human','product']],
['Vendor Collaboration','Trust','Vendor Team Poster',`Buat beberapa vendor Indonesia bekerja bersama pada [JENIS_EVENT]: planner, dekor, foto/video atau catering sesuai kebutuhan. Jumlah orang realistis, aktivitas berbeda dan natural, rasio 4:5.`,['human']],
['Event Crowd Natural','Trust','Event Social Proof Poster',`Buat suasana [JENIS_EVENT] dengan crowd Indonesia yang wajar dan natural. Wajah tidak duplikat, tangan/anatomi akurat, seating dan venue realistis, lighting event konsisten, rasio 4:5.`,['human','product']],

['Ramadhan Event','Campaign','Ramadhan Event Poster',`Buat campaign Ramadhan [NAMA_ACARA] dengan venue/dekorasi Islami modern yang halus, tamu Indonesia natural, warm lighting, warna [WARNA_TEMA], rasio 4:5.`,['human','product']],
['Lebaran Gathering','Campaign','Lebaran Event Poster',`Buat visual gathering Lebaran [NAMA_ACARA] dengan keluarga/tim Indonesia, venue realistis, decor festive secukupnya, interaksi natural, rasio 4:5.`,['human','product']],
['Wedding Season Campaign','Campaign','Wedding Campaign Poster',`Buat wedding season campaign [NAMA_USAHA] dengan pasangan Indonesia, venue/dekorasi premium realistis, warna [WARNA_TEMA], ruang paket aktual, rasio 4:5.`,['human','product']],
['Year End Event','Campaign','Year End Event Poster',`Buat year-end event [NAMA_ACARA] dengan stage, audience dan celebration lighting realistis. Hindari confetti/neon berlebihan, area tanggal/nama kosong, rasio 4:5.`,['human','product']],
['Corporate Gathering','Campaign','Corporate Gathering Poster',`Buat campaign corporate gathering [NAMA_ACARA] dengan peserta Indonesia di venue profesional. Jangan mengarang logo perusahaan, jumlah peserta atau sponsor, rasio 4:5.`,['human','product']],
['Birthday Campaign','Campaign','Birthday Event Campaign Poster',`Buat campaign ulang tahun [NAMA_ACARA] dengan dekorasi [WARNA_TEMA], cake table dan tamu natural. Area nama/usia/tanggal kosong, rasio 4:5.`,['human','product']],
['Graduation Event','Campaign','Graduation Event Poster',`Buat graduation event [NAMA_ACARA] dengan graduate Indonesia dan venue realistis. Jangan mengarang nama kampus/logo, cap/gown sesuai referensi bila ada, rasio 4:5.`,['human','product']],
['Anniversary Event Business','Campaign','Event Business Anniversary Poster',`Buat anniversary [NAMA_USAHA] dengan tim dan setup event nyata. Jangan mengarang jumlah tahun/project/client; sisakan area data aktual, warna [WARNA_BRAND], rasio 4:5.`,['human','product']],
['Grand Opening Event','Campaign','Grand Opening Event Poster',`Buat grand opening [NAMA_ACARA/USAHA] dengan entrance, ribbon/decor, owner/tamu Indonesia natural. Jangan merender nama/tanggal/logo palsu, ruang copy kosong, rasio 4:5.`,['human','product']],
['Custom Event Campaign','Campaign','Brand Event Poster',`Buat key visual [NAMA_ACARA] untuk [NAMA_USAHA], mempertahankan venue/dekorasi/identitas [WARNA_TEMA] secara akurat, high-end event photography, ruang nama/tanggal/copy, rasio 4:5.`,['human','product']]
].forEach((x,i)=>add('EVT',i+1,W,x[1],x[2],x[0],x[3],x[4]));

if(data.length!==100) throw new Error('Expected 100 prompts, got '+data.length);

export const prompts = data;
export default prompts;
