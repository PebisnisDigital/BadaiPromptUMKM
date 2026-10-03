// BADAI PROMPT UMKM — IMAGE PROMPTS V2 (001–200)
// Semua prompt di file ini adalah PROMPT IMAGE GENERATION untuk materi promosi UMKM.
// Setiap image_prompt FINAL otomatis membawa aturan ANTI AI SLOP.

const QUALITY_BASE = `
QUALITY & REALISM — WAJIB:
Hasil akhir harus terlihat seperti karya commercial photography / advertising photography profesional yang benar-benar dipotret dan diarahkan manusia, bukan gambar AI. Hindari tampilan generik, terlalu sempurna, plastik, terlalu glossy, terlalu HDR, oversharpened, bloom berlebihan, neon acak, lens flare palsu, bokeh tidak logis, detail meleleh, pola berulang aneh, benda ganda, perspektif kacau, refleksi mustahil, bayangan yang tidak konsisten, tekstur sintetis, atau background yang terasa generatif. Gunakan pencahayaan yang masuk akal secara fisik, arah cahaya konsisten, shadow dan reflection konsisten, material realistis, warna natural, dynamic range natural, depth of field seperti kamera nyata, framing profesional, dan detail yang believable.

Jika ada manusia: anatomi harus akurat dan natural; tangan normal dengan lima jari, lengan dan kaki tidak berlebih, wajah tidak simetris secara artifisial, ekspresi tidak kaku, mata dan gigi natural, pori kulit tetap terlihat, rambut realistis, pakaian mengikuti gravitasi, pose masuk akal, proporsi tubuh realistis, dan tidak ada anggota tubuh yang menyatu atau terpotong aneh.

Jika ada produk/kemasan: pertahankan bentuk, proporsi, material, warna, tutup, label, logo, dan detail produk secara konsisten bila referensi produk diberikan. Jangan mengarang logo atau tulisan merek. Jangan menghasilkan label acak, huruf rusak, kemasan meleleh, bentuk ganda, atau detail produk yang berubah. Jika teks promosi belum diberikan sebagai referensi, sisakan negative space untuk headline, harga, CTA, dan logo; jangan mencoba menulis teks panjang di dalam gambar.

Walaupun konsepnya surreal, miniature, produk raksasa, melayang, meledak, atau fantastis, eksekusinya harus tetap believable seperti high-end advertising photography: skala, cahaya, perspektif, interaksi objek, material, physics, shadow, dan reflection harus konsisten. Tidak ada watermark, signature, frame AI, atau artefak generatif.
`;

const HUMAN = `
REAL HUMAN DETAIL: gunakan model Indonesia yang terlihat nyata dan relatable bila ada manusia; jangan membuat wajah beauty-filter berlebihan, kulit lilin, mata terlalu besar, gigi terlalu putih, atau pose mannequin.
`;

const PRODUCT = `
PRODUCT FIDELITY: jika user memberikan foto referensi produk, gunakan produk tersebut sebagai sumber utama dan pertahankan desain serta identitas visualnya secara akurat. Jangan mengganti kemasan atau membuat versi produk baru.
`;

const NO_TEXT = `
LAYOUT RULE: utamakan visual. Sisakan area kosong yang rapi untuk copywriting yang nanti ditambahkan saat desain. Jangan mengandalkan AI untuk merender headline panjang, harga, nomor WhatsApp, atau logo.
`;

const SURREAL = `
SURREAL REALISM: ide boleh tidak mungkin secara dunia nyata, tetapi hasil harus tetap seperti practical commercial composite / VFX photography kelas iklan, bukan fantasy AI art.
`;

function varsOf(text){
  return [...new Set((text.match(/\[[^\]]+\]/g)||[]))];
}
function finalPrompt(base, flags=[]){
  let extra = '';
  if(flags.includes('human')) extra += HUMAN;
  if(flags.includes('product')) extra += PRODUCT;
  if(flags.includes('surreal')) extra += SURREAL;
  extra += NO_TEXT;
  return `${base.trim()}\n\n${QUALITY_BASE.trim()}\n${extra.trim()}`.trim();
}

const data = [];

function add(prefix, start, niche, goal, outputType, title, base, flags=[]){
  const code = `${prefix}-${String(start).padStart(2,'0')}`;
  const image_prompt = finalPrompt(base, flags);
  data.push({
    code,
    title,
    niche,
    goal,
    output_type: outputType,
    image_prompt,
    placeholders: varsOf(image_prompt),
    anti_ai_slop: true,
    version: 2
  });
}

// =========================
// 001–050 KULINER & MINUMAN
// =========================
const K='Kuliner & Minuman';
[
['Foto Produk Premium','Hero Produk','Poster Produk',`Buat foto iklan premium [NAMA_PRODUK] sebagai focal point utama. Produk terlihat fresh, menggugah selera dan realistis, dengan detail tekstur makanan yang jelas. Tambahkan [BAHAN_UTAMA] sebagai elemen pendukung secukupnya, background clean [WARNA_BRAND], lighting food photography profesional, komposisi modern, negative space untuk copy, rasio vertikal 4:5.`,['product']],
['Produk Melayang Sinematik','Hero Produk','Visual Iklan',`Buat visual iklan [NAMA_PRODUK] melayang di tengah frame dengan [BAHAN_UTAMA] beterbangan terkontrol di sekelilingnya. Gunakan dramatic studio lighting yang realistis, detail produk sangat tajam, background [WARNA_BRAND], komposisi high-end food advertising, rasio 4:5.`,['product','surreal']],
['Flatlay Menu Elegan','Hero Produk','Feed Instagram',`Buat flatlay premium [NAMA_PRODUK] dari top view bersama [TOPPING], alat makan dan kemasan yang tertata rapi. Gunakan cahaya natural lembut, background [WARNA_BRAND], styling food editorial modern, rasio 4:5.`,['product']],
['Produk dengan Bahan Pendukung','Hero Produk','Poster Menu',`Buat foto produk [NAMA_PRODUK] dengan [BAHAN_UTAMA] dan [BAHAN_UTAMA_2] mengelilingi produk secara natural. Tampilkan bahan segar, warna realistis, lighting commercial food photography, background [WARNA_BRAND], rasio 4:5.`,['product']],
['Close Up Detail Produk','Hero Produk','Foto Iklan',`Buat extreme close-up [NAMA_PRODUK] yang menonjolkan tekstur, lapisan, saus, topping atau detail permukaan secara menggugah selera. Gunakan macro food photography, cahaya realistis, background sederhana [WARNA_BRAND], rasio 4:5.`,['product']],
['Produk dengan Minuman Pendamping','Hero Produk','Bundle Visual',`Buat foto bundle [NAMA_PRODUK] bersama [MINUMAN_PENDAMPING] dalam satu meja iklan yang rapi. Komposisi seimbang, pencahayaan hangat natural, background [WARNA_BRAND], commercial menu photography, rasio 4:5.`,['product']],
['Produk di Meja Kafe','Hero Produk','Lifestyle Product Shot',`Buat lifestyle photo [NAMA_PRODUK] di atas meja kafe Indonesia yang estetik dan believable. Produk tetap menjadi focal point, interior hanya sebagai konteks, natural window light, warna brand [WARNA_BRAND] sebagai aksen halus, rasio 4:5.`,['product']],
['Hero Produk dengan Uap Hangat','Hero Produk','Visual Menu',`Buat hero photo [NAMA_PRODUK] yang baru matang dengan uap hangat natural. Detail makanan harus realistis, uap mengikuti arah panas secara masuk akal, dramatic warm lighting, background [WARNA_BRAND], rasio 4:5.`,['product']],
['Produk dalam Kemasan Menarik','Hero Produk','Poster Packaging',`Buat visual promosi [NAMA_PRODUK] bersama kemasan [JENIS_KEMASAN]. Tampilkan produk dan packaging secara realistis, clean, rapi, premium, background [WARNA_BRAND], studio lighting, rasio 4:5.`,['product']],
['Hero Produk di Latar Glowing','Hero Produk','Poster Premium',`Buat hero advertising photo [NAMA_PRODUK] di tengah frame dengan soft halo light yang realistis dari belakang, bukan glow berlebihan. Gunakan background [WARNA_BRAND], shadow konsisten, produk tajam, premium, rasio 4:5.`,['product']],
['Poster Diskon Besar','Promo','Poster Diskon',`Buat key visual promo untuk [NAMA_PRODUK] dengan komposisi yang menyediakan area jelas untuk badge diskon [BESAR_DISKON]. Produk harus dominan dan menggugah selera, background [WARNA_BRAND], modern retail advertising, rasio 4:5.`,['product']],
['Promo Buy 1 Get 1','Promo','Poster Promo',`Buat visual buy 1 get 1 untuk [NAMA_PRODUK] dengan dua produk identik yang realistis, komposisi simetris namun natural, warna brand [WARNA_BRAND], lighting food advertising, area kosong untuk copy promo, rasio 4:5.`,['product']],
['Promo Bundling Menu','Promo','Combo Poster',`Buat visual bundling [NAMA_PRODUK_1], [NAMA_PRODUK_2], dan [NAMA_PRODUK_3] dalam satu komposisi menu yang jelas. Semua produk memiliki skala realistis, lighting konsisten, background [WARNA_BRAND], area kosong untuk harga paket, rasio 4:5.`,['product']],
['Promo Flash Sale','Promo','Poster Flash Sale',`Buat visual flash sale [NAMA_PRODUK] yang energik namun tetap realistis dan premium. Gunakan directional lighting, motion accents secukupnya, background [WARNA_BRAND], negative space untuk informasi promo, rasio 4:5.`,['product']],
['Promo Payday','Promo','Campaign Poster',`Buat key visual payday untuk [NAMA_PRODUK], produk sebagai hero, nuansa akhir bulan yang modern tanpa ikon uang berlebihan, background [WARNA_BRAND], commercial food photography, area headline bersih, rasio 4:5.`,['product']],
['Promo Weekend','Promo','Promo Poster',`Buat visual weekend untuk [NAMA_PRODUK] dengan suasana santai, natural dan appetizing. Gunakan lifestyle food setup, cahaya hangat, background/aksen [WARNA_BRAND], ruang promo, rasio 4:5.`,['product']],
['Promo Menu Baru','Promo','Launching Poster',`Buat launching visual untuk menu baru [NAMA_PRODUK]. Produk terlihat fresh dan belum pernah dilihat, hero composition, clean studio/lifestyle food photography, background [WARNA_BRAND], area kecil untuk label NEW yang nanti ditambahkan saat desain, rasio 4:5.`,['product']],
['Promo Harga Coret','Promo','Sales Poster',`Buat key visual sales [NAMA_PRODUK] yang menyediakan area khusus untuk harga lama dan harga baru. Produk tetap menjadi hero, background [WARNA_BRAND], lighting natural-commercial, rasio 4:5.`,['product']],
['Promo Stok Terbatas','Promo','Scarcity Poster',`Buat visual promo [NAMA_PRODUK] dengan mood limited batch yang believable, misalnya beberapa produk siap kirim atau tray produksi kecil. Jangan menciptakan scarcity palsu; hanya sediakan area untuk informasi stok aktual. Background [WARNA_BRAND], rasio 4:5.`,['product']],
['Promo Best Seller','Promo','Best Seller Poster',`Buat visual [NAMA_PRODUK] sebagai hero best seller dengan product photography premium dan area badge best seller yang nanti ditambahkan saat desain. Background [WARNA_BRAND], clean, rasio 4:5.`,['product']],
['Produk Raksasa','Hook Visual','Poster Unik',`Buat [NAMA_PRODUK] berukuran raksasa di lingkungan kota Indonesia dengan manusia dan bangunan berskala konsisten. Jadikan seperti high-end advertising composite photography, cahaya dan shadow realistis, aksen [WARNA_BRAND], rasio 4:5.`,['product','human','surreal']],
['Miniature Worker','Hook Visual','Visual Kreatif',`Buat miniature workers realistis sedang menata, memasak atau memberi finishing pada [NAMA_PRODUK] berukuran besar. Gunakan macro photography, realistic miniature set, scale interaction masuk akal, background [WARNA_BRAND], rasio 4:5.`,['product','human','surreal']],
['Before vs After Lapar','Hook Visual','Split Visual',`Buat split-scene realistis: sisi kiri seorang customer Indonesia sebelum makan terlihat lapar/lesu secara natural; sisi kanan orang yang sama terlihat lebih ceria setelah menikmati [NAMA_PRODUK]. Produk terlihat jelas, lighting konsisten, rasio 4:5.`,['human','product']],
['Toko Sepi vs Ramai','Hook Visual','Visual Before After',`Buat split-scene [NAMA_USAHA]: sisi kiri toko dalam kondisi sepi, sisi kanan toko yang sama lebih ramai dengan pelanggan nyata. [NAMA_PRODUK] terlihat sebagai hero visual, bukan klaim sebab-akibat. Lingkungan UMKM Indonesia realistis, rasio 4:5.`,['human','product']],
['Produk Meledak','Hook Visual','Dynamic Poster',`Buat high-speed advertising composite [NAMA_PRODUK] dengan [TOPPING], saus dan bahan pendukung seolah meledak keluar secara terkontrol. Produk tetap utuh dan realistis, physics bahan masuk akal, background [WARNA_BRAND], rasio 4:5.`,['product','surreal']],
['Billboard Jalanan','Hook Visual','Billboard Mockup',`Buat mockup realistis iklan [NAMA_PRODUK] di billboard besar pada jalan kota Indonesia. Billboard memiliki perspektif, pencahayaan dan refleksi sesuai lingkungan. Desain billboard clean dengan produk sebagai hero dan area copy kosong, rasio 4:5.`,['product','surreal']],
['Stop Scrolling Poster','Hook Visual','Social Media Poster',`Buat visual social media [NAMA_PRODUK] yang sangat kuat secara komposisi tanpa terlihat norak: produk besar, warna kontras terkontrol, lighting realistis, background clean, negative space untuk hook, rasio 4:5.`,['product']],
['Produk di Tengah Hujan Bahan','Hook Visual','Dramatic Ad',`Buat [NAMA_PRODUK] sebagai hero dengan [BAHAN_UTAMA] dan [TOPPING] jatuh mengelilingi produk seperti high-speed studio shoot. Semua partikel memiliki motion, shadow dan scale realistis, background [WARNA_BRAND], rasio 4:5.`,['product','surreal']],
['Produk Muncul dari Kemasan','Hook Visual','Creative Poster',`Buat [NAMA_PRODUK] seolah muncul dari [JENIS_KEMASAN] dalam commercial composite photography. Kemasan tetap utuh dan believable, produk tidak berubah bentuk, background [WARNA_BRAND], rasio 4:5.`,['product','surreal']],
['Produk dengan Api / Asap Dramatis','Hook Visual','Dramatic Food Poster',`Buat visual [NAMA_PRODUK] dengan api kecil atau smoke effect yang relevan untuk menu grilled/pedas. Api dan asap harus mengikuti physics dan sumber panas yang jelas, tidak menutupi produk, cinematic food advertising, rasio 4:5.`,['product']],
['Testimoni Visual','Trust','Testimoni Poster',`Buat layout visual testimoni [NAMA_PRODUK] dengan foto produk realistis dan ruang untuk review asli pelanggan yang akan ditambahkan saat desain. Jangan membuat nama, kutipan atau rating palsu. Gunakan background [WARNA_BRAND], clean trustworthy look, rasio 4:5.`,['product']],
['Review Bintang 5','Trust','Review Poster',`Buat key visual review [NAMA_PRODUK] dengan produk sebagai hero dan area kosong untuk rating/review aktual. Jangan mengarang bintang, jumlah review atau kalimat pelanggan. Background [WARNA_BRAND], rasio 4:5.`,['product']],
['Banyak Pesanan Masuk','Trust','Social Proof Visual',`Buat suasana produksi [NAMA_PRODUK] dengan beberapa paket nyata siap kirim di meja kerja yang rapi. Tampilkan volume yang believable untuk UMKM, tanpa order palsu atau data pelanggan, lighting natural, rasio 4:5.`,['product','human']],
['Antrian Pembeli','Trust','Social Proof Poster',`Buat suasana [NAMA_USAHA] dengan antrean pelanggan Indonesia yang natural membeli [NAMA_PRODUK]. Jumlah orang realistis, interaksi tidak kaku, pencahayaan lokasi konsisten, rasio 4:5.`,['human','product']],
['Owner dan Produk','Trust','Branding Poster',`Buat owner UMKM Indonesia memegang [NAMA_PRODUK] dengan ekspresi ramah dan natural. Background usaha nyata, pakaian rapi, lighting portrait komersial, aksen [WARNA_BRAND], rasio 4:5.`,['human','product']],
['Proses Produksi Bersih','Trust','Behind The Scene Visual',`Buat behind-the-scenes [NAMA_USAHA] saat memproduksi [NAMA_PRODUK] secara bersih, higienis dan rapi. Tampilkan prosedur yang masuk akal, alat nyata, pekerja natural, dokumentary-commercial style, rasio 4:5.`,['human','product']],
['Packaging Profesional','Trust','Packaging Poster',`Buat foto packaging [NAMA_PRODUK] yang rapi dan profesional dengan material kemasan realistis, branding [WARNA_BRAND] sebagai aksen, product photography clean, rasio 4:5.`,['product']],
['Produk Best Seller dengan Badge','Trust','Best Seller Badge Poster',`Buat product hero [NAMA_PRODUK] dengan komposisi premium dan area kosong untuk badge best seller yang hanya digunakan bila datanya benar. Background [WARNA_BRAND], rasio 4:5.`,['product']],
['Repeat Order Visual','Trust','Social Proof Poster',`Buat visual repeat order [NAMA_PRODUK] berupa beberapa paket siap kirim dan suasana customer loyalty yang believable. Jangan mengarang data pribadi, chat, jumlah order atau testimoni. Rasio 4:5.`,['product','human']],
['Ramai di Marketplace / Online','Trust','Online Store Poster',`Buat visual [NAMA_PRODUK] dengan konteks order online yang aktif melalui meja packing dan beberapa paket siap kirim. Hindari screenshot chat palsu atau angka transaksi fiktif. Modern ecommerce photography, rasio 4:5.`,['product']],
['Promo Ramadhan','Campaign','Ramadhan Poster',`Buat campaign Ramadhan untuk [NAMA_PRODUK] dengan styling Islami Indonesia yang elegan: lampu hangat, bulan sabit sebagai dekorasi halus, warna [WARNA_BRAND], produk tetap focal point, rasio 4:5.`,['product']],
['Promo Lebaran','Campaign','Lebaran Poster',`Buat visual Lebaran [NAMA_PRODUK] dengan suasana keluarga Indonesia yang hangat dan natural, dekorasi Idulfitri secukupnya, produk sebagai hero, aksen [WARNA_BRAND], rasio 4:5.`,['human','product']],
['Promo Tahun Baru','Campaign','New Year Poster',`Buat campaign Tahun Baru [NAMA_PRODUK] dengan confetti realistis, warm celebration lighting, produk tetap dominant, background [WARNA_BRAND], ruang copy, rasio 4:5.`,['product']],
['Promo Hari Ibu','Campaign','Special Day Poster',`Buat visual Hari Ibu untuk [NAMA_PRODUK] dengan ibu dan anak dewasa Indonesia dalam momen hangat yang natural. Produk menjadi bagian dari momen, bukan ditempel paksa, soft commercial lighting, rasio 4:5.`,['human','product']],
['Promo Ulang Tahun','Campaign','Birthday Campaign Poster',`Buat campaign ulang tahun [NAMA_PRODUK] dengan dekorasi balon/pita yang realistis dan rapi, product hero premium, background [WARNA_BRAND], rasio 4:5.`,['product']],
['Promo Back to School','Campaign','Thematic Poster',`Buat visual back-to-school [NAMA_PRODUK] dengan konteks bekal atau konsumsi anak sekolah Indonesia yang aman dan natural, styling ceria namun realistis, warna [WARNA_BRAND], rasio 4:5.`,['human','product']],
['Campaign Musim Hujan','Campaign','Seasonal Poster',`Buat campaign musim hujan [NAMA_PRODUK] dengan suasana hangat di rumah/warung, jendela dengan hujan realistis, steam natural bila cocok, cozy commercial photography, aksen [WARNA_BRAND], rasio 4:5.`,['product']],
['Promo Weekend Santai','Campaign','Weekend Poster',`Buat weekend lifestyle visual [NAMA_PRODUK] dalam suasana santai yang believable, natural light, pelanggan Indonesia secukupnya, produk tetap hero, warna [WARNA_BRAND], rasio 4:5.`,['human','product']],
['Promo Payday Spesial','Campaign','Payday Campaign Poster',`Buat payday campaign [NAMA_PRODUK] dengan food advertising premium dan ruang untuk penawaran aktual. Jangan menampilkan uang beterbangan atau gimmick generik berlebihan. Background [WARNA_BRAND], rasio 4:5.`,['product']],
['Campaign Custom Brand','Campaign','Brand Campaign Poster',`Buat key visual campaign [NAMA_BRAND] untuk [NAMA_PRODUK], mengikuti identitas [WARNA_BRAND], commercial photography premium, produk konsisten, negative space untuk copy, rasio 4:5.`,['product']]
].forEach((x,i)=>add('KUL',i+1,K,x[1],x[2],x[0],x[3],x[4]));

// =========================
// 051–100 FASHION & HIJAB
// =========================
const F='Fashion & Hijab';
[
['Hero Fashion Premium','Hero Produk','Poster Produk',`Buat campaign photo [NAMA_PRODUK] pada model Indonesia dengan styling elegan dan modern. Tonjolkan potongan busana, jatuh kain, tekstur dan detail jahitan. Gunakan background [WARNA_BRAND], soft directional fashion lighting, rasio 4:5.`,['human','product']],
['Flatlay Fashion Estetik','Hero Produk','Feed Product Shot',`Buat flatlay [NAMA_PRODUK] bersama [AKSESORIS] dengan susunan editorial yang rapi. Tekstur kain harus realistis, lipatan mengikuti gravitasi, background [WARNA_BRAND], natural studio light, rasio 4:5.`,['product']],
['Close-Up Detail Bahan','Hero Produk','Detail Product Visual',`Buat macro close-up [NAMA_PRODUK] untuk menonjolkan [JENIS_BAHAN], jahitan, motif dan finishing. Gunakan lighting textile photography realistis, warna akurat, background [WARNA_BRAND], rasio 4:5.`,['product']],
['Produk dengan Model Full Body','Hero Produk','Fashion Campaign',`Buat full-body campaign [NAMA_PRODUK] pada model Indonesia dengan pose natural dan percaya diri. Outfit jatuh realistis, anatomi tepat, background clean [WARNA_BRAND], fashion catalog lighting, rasio 4:5.`,['human','product']],
['Hero Hijab Anggun','Hero Produk','Hijab Poster',`Buat beauty-fashion portrait model Indonesia memakai hijab [NAMA_PRODUK]. Tampilkan jatuh kain, drape, tekstur dan warna secara akurat, pose anggun natural, soft light, background [WARNA_BRAND], rasio 4:5.`,['human','product']],
['Outfit di Studio Minimalis','Hero Produk','Studio Fashion Shot',`Buat foto studio minimalis [NAMA_PRODUK] pada model Indonesia, pose editorial sederhana, pencahayaan fashion profesional, background [WARNA_BRAND], detail garment tajam, rasio 4:5.`,['human','product']],
['Produk dan Packaging','Hero Produk','Packaging Poster',`Buat visual [NAMA_PRODUK] bersama packaging [NAMA_BRAND] yang realistis. Susun produk dan kemasan premium, clean, material nyata, background [WARNA_BRAND], rasio 4:5.`,['product']],
['Produk Gantung Elegan','Hero Produk','Catalog Poster',`Buat catalog photo [NAMA_PRODUK] digantung dengan hanger yang benar, kain jatuh natural, warna [WARNA_PRODUK] akurat, background [WARNA_BRAND], soft shadow, rasio 4:5.`,['product']],
['Lifestyle Outfit','Hero Produk','Lifestyle Visual',`Buat lifestyle campaign [NAMA_PRODUK] pada model Indonesia di [LOKASI]. Pose dan aktivitas terlihat candid, pakaian bergerak natural, cahaya sesuai lokasi, aksen [WARNA_BRAND], rasio 4:5.`,['human','product']],
['Outfit dengan Aksesoris Pendukung','Hero Produk','Style Guide Poster',`Buat styling visual [NAMA_PRODUK] bersama [AKSESORIS] dalam satu look yang believable. Semua material, ukuran dan warna konsisten, clean fashion advertising, background [WARNA_BRAND], rasio 4:5.`,['product']],
['Diskon Fashion Elegan','Promo','Poster Promo',`Buat key visual promo [NAMA_PRODUK] pada model Indonesia dengan area kosong untuk diskon [BESAR_DISKON]. Fashion photography premium, background [WARNA_BRAND], rasio 4:5.`,['human','product']],
['Promo Buy 1 Get 1 Fashion','Promo','Promo Poster',`Buat visual buy 1 get 1 [NAMA_PRODUK] dengan dua produk/warna yang konsisten dan realistis. Tampilkan tekstur kain jelas, background [WARNA_BRAND], area promo kosong, rasio 4:5.`,['product']],
['Promo Bundling Outfit','Promo','Bundle Poster',`Buat fashion bundle [NAMA_PRODUK_1], [NAMA_PRODUK_2], [NAMA_PRODUK_3] dalam satu styling lengkap. Proporsi tiap item realistis, warna harmonis, background [WARNA_BRAND], rasio 4:5.`,['product']],
['Flash Sale Fashion','Promo','Flash Sale Poster',`Buat key visual flash sale [NAMA_PRODUK] dengan model dan produk tetap premium. Gunakan motion accent secukupnya, warna [WARNA_BRAND], negative space untuk informasi sale, rasio 4:5.`,['human','product']],
['Promo Harga Coret','Promo','Sale Poster',`Buat visual sales [NAMA_PRODUK] pada model/flatlay dengan ruang terstruktur untuk harga lama dan baru yang ditambahkan saat desain. Background [WARNA_BRAND], clean fashion advertising, rasio 4:5.`,['human','product']],
['Promo Stok Terbatas','Promo','Scarcity Poster',`Buat visual limited stock [NAMA_PRODUK] berupa rak atau beberapa item nyata yang tersisa. Jangan mengarang jumlah stok; sediakan area copy untuk data aktual. Premium boutique aesthetic, [WARNA_BRAND], rasio 4:5.`,['product']],
['Promo Best Seller','Promo','Best Seller Poster',`Buat hero visual [NAMA_PRODUK] dengan styling premium dan area badge best seller yang akan ditambahkan jika datanya benar. Background [WARNA_BRAND], rasio 4:5.`,['human','product']],
['Promo Launching Koleksi Baru','Promo','Launch Poster',`Buat campaign launching [NAMA_PRODUK] sebagai koleksi baru. Gunakan model Indonesia, styling fresh, fashion editorial lighting, background [WARNA_BRAND], ruang label NEW, rasio 4:5.`,['human','product']],
['Promo Payday Fashion','Promo','Campaign Poster',`Buat payday fashion campaign [NAMA_PRODUK] dengan styling shopping modern, model natural, background [WARNA_BRAND], ruang penawaran aktual, rasio 4:5.`,['human','product']],
['Promo Weekend Shopping','Promo','Weekend Poster',`Buat weekend lifestyle campaign [NAMA_PRODUK] dengan model Indonesia dalam suasana santai, fashion-forward namun relatable, cahaya natural, aksen [WARNA_BRAND], rasio 4:5.`,['human','product']],
['Outfit Raksasa','Hook Visual','Creative Poster',`Buat [NAMA_PRODUK] dalam skala raksasa di lingkungan mall/kota Indonesia seperti practical advertising composite. Kain, shadow, scale dan perspektif harus konsisten, warna [WARNA_BRAND], rasio 4:5.`,['product','human','surreal']],
['Miniature Tailor Concept','Hook Visual','Miniature Visual',`Buat miniature tailors realistis sedang mengukur, menjahit dan merapikan [NAMA_PRODUK] berukuran besar. Macro photography, realistic scale, kain dan alat menjahit detail, rasio 4:5.`,['human','product','surreal']],
['Before vs After Penampilan','Hook Visual','Before After Poster',`Buat split-scene orang Indonesia yang sama: sebelum styling terlihat biasa, setelah memakai [NAMA_PRODUK] terlihat lebih rapi dan percaya diri. Jangan mengubah identitas wajah atau tubuh, lighting konsisten, rasio 4:5.`,['human','product']],
['Produk Muncul dari Gift Box','Hook Visual','Creative Ad',`Buat [NAMA_PRODUK] seolah keluar dari gift box premium dalam commercial composite. Kain dan box memiliki material realistis, physics masuk akal, background [WARNA_BRAND], rasio 4:5.`,['product','surreal']],
['Billboard Fashion','Hook Visual','Billboard Mockup',`Buat mockup iklan [NAMA_PRODUK] pada billboard kota Indonesia. Model fashion terlihat realistis di billboard, perspective dan lighting sesuai lingkungan, ruang copy clean, [WARNA_BRAND], rasio 4:5.`,['human','product','surreal']],
['Stop Scrolling Fashion Poster','Hook Visual','Social Poster',`Buat fashion social visual [NAMA_PRODUK] yang kuat secara komposisi: model Indonesia, pose editorial natural, warna kontras terkontrol, background bersih, negative space hook, rasio 4:5.`,['human','product']],
['Outfit dengan Efek Angin Dramatis','Hook Visual','Dynamic Fashion Poster',`Buat model Indonesia memakai [NAMA_PRODUK] dengan kain/hijab tertiup angin secara realistis. Arah kain harus sesuai sumber angin dan gravitasi, lighting editorial, [WARNA_BRAND], rasio 4:5.`,['human','product']],
['Outfit Meledak dengan Elemen Fashion','Hook Visual','Dynamic Poster',`Buat [NAMA_PRODUK] sebagai hero dengan kain, pita atau aksesori bergerak eksplosif namun terkontrol. Semua elemen memiliki motion dan shadow realistis, premium fashion composite, rasio 4:5.`,['product','surreal']],
['Gaya Mirror Selfie Premium','Hook Visual','Lifestyle Fashion Visual',`Buat mirror selfie premium model Indonesia memakai [NAMA_PRODUK]. Refleksi harus benar secara geometri, tangan dan smartphone natural, interior estetik, cahaya realistic, rasio 4:5.`,['human','product']],
['Fashion di Runway Mini','Hook Visual','Runway Poster',`Buat model Indonesia memakai [NAMA_PRODUK] berjalan di mini runway/boutique event yang believable. Audience secukupnya, pose walking natural, lighting runway realistis, [WARNA_BRAND], rasio 4:5.`,['human','product']],
['Testimoni Visual Fashion','Trust','Testimoni Poster',`Buat visual testimoni [NAMA_PRODUK] dengan product/model photo dan area kosong untuk review pelanggan asli. Jangan mengarang testimoni atau rating. Background [WARNA_BRAND], clean, rasio 4:5.`,['human','product']],
['Banyak Pelanggan Puas','Trust','Social Proof Poster',`Buat beberapa customer Indonesia memakai [NAMA_PRODUK] dengan styling berbeda dalam satu campaign yang natural. Jangan membuat wajah kembar; masing-masing individu unik dan realistis, rasio 4:5.`,['human','product']],
['Repeat Order Fashion','Trust','Social Proof Visual',`Buat meja packing [NAMA_PRODUK] dengan beberapa paket repeat order yang rapi. Jangan tampilkan data customer atau angka palsu. Ecommerce fashion photography, rasio 4:5.`,['product','human']],
['Packaging Rapi dan Mewah','Trust','Packaging Trust Poster',`Buat packaging [NAMA_PRODUK] yang rapi dan premium dengan material box, tissue, sticker atau pouch yang realistis. Background [WARNA_BRAND], clean product photography, rasio 4:5.`,['product']],
['Owner dan Produk Fashion','Trust','Branding Poster',`Buat owner [NAMA_BRAND] Indonesia bersama [NAMA_PRODUK] dalam portrait komersial yang ramah dan profesional. Workshop/boutique sebagai konteks, lighting natural, rasio 4:5.`,['human','product']],
['Proses Jahit / Produksi','Trust','Behind The Scene',`Buat behind-the-scenes produksi [NAMA_PRODUK] di [NAMA_USAHA], menampilkan proses ukur, potong, jahit atau QC yang masuk akal. Pekerja Indonesia natural, alat nyata, rasio 4:5.`,['human','product']],
['Best Seller Badge Fashion','Trust','Best Seller Poster',`Buat hero fashion [NAMA_PRODUK] dengan area badge best seller yang akan ditambahkan hanya bila benar. Fashion photography premium, background [WARNA_BRAND], rasio 4:5.`,['human','product']],
['Variasi Warna Favorit','Trust','Catalog Trust Poster',`Buat catalog [NAMA_PRODUK] dalam variasi [DAFTAR_WARNA]. Pastikan bentuk dan detail produk konsisten antar warna, tekstur kain sama, lighting seragam, rasio 4:5.`,['product']],
['Ramai Pesanan Online','Trust','Online Store Poster',`Buat suasana packing [NAMA_PRODUK] dengan beberapa order yang realistis. Hindari screenshot chat/angka transaksi palsu; fokus pada paket, meja kerja, dan tim yang rapi, rasio 4:5.`,['product','human']],
['Model Multi Customer Style','Trust','Community Poster',`Buat beberapa model/customer Indonesia memakai [NAMA_PRODUK] dengan styling berbeda. Wajah, anatomi dan pose tiap orang unik serta realistis, produk tetap konsisten, rasio 4:5.`,['human','product']],
['Ramadhan Fashion Campaign','Campaign','Ramadhan Poster',`Buat campaign Ramadhan [NAMA_PRODUK] dengan model Indonesia berhijab/berbusana sopan, dekorasi Islami modern yang halus, warna [WARNA_BRAND], premium fashion photography, rasio 4:5.`,['human','product']],
['Lebaran Collection','Campaign','Lebaran Campaign Poster',`Buat Lebaran collection [NAMA_PRODUK] pada keluarga/model Indonesia dengan outfit rapi dan natural. Gestur hangat, festive decor realistis, aksen [WARNA_BRAND], rasio 4:5.`,['human','product']],
['Hari Ibu Fashion Promo','Campaign','Special Day Poster',`Buat visual Hari Ibu [NAMA_PRODUK] dengan ibu dan anak perempuan dewasa Indonesia, interaksi hangat natural, fashion styling premium, [WARNA_BRAND], rasio 4:5.`,['human','product']],
['Promo Tahun Baru Fashion','Campaign','New Year Poster',`Buat fashion campaign Tahun Baru [NAMA_PRODUK] dengan model Indonesia, confetti realistis dan celebration lighting elegan, background [WARNA_BRAND], rasio 4:5.`,['human','product']],
['Back to Campus / School','Campaign','Thematic Poster',`Buat back-to-campus visual [NAMA_PRODUK] pada model remaja/dewasa muda Indonesia, aktivitas kampus natural, styling rapi, cahaya nyata, aksen [WARNA_BRAND], rasio 4:5.`,['human','product']],
['Weekend Fashion Vibes','Campaign','Weekend Campaign Poster',`Buat weekend fashion lifestyle [NAMA_PRODUK] dengan model Indonesia di lokasi santai, candid natural, soft daylight, warna [WARNA_BRAND] sebagai aksen, rasio 4:5.`,['human','product']],
['Payday Fashion Campaign','Campaign','Payday Poster',`Buat payday campaign [NAMA_PRODUK] dengan fashion photography premium dan ruang untuk penawaran aktual. Hindari simbol uang generik berlebihan, background [WARNA_BRAND], rasio 4:5.`,['human','product']],
['Koleksi Couple / Keluarga','Campaign','Family/Couple Poster',`Buat couple/family campaign [NAMA_PRODUK] pada keluarga Indonesia dengan outfit serasi. Anatomi semua orang akurat, interaksi natural, warna produk konsisten, background [WARNA_BRAND], rasio 4:5.`,['human','product']],
['Ulang Tahun Brand Fashion','Campaign','Anniversary Poster',`Buat anniversary campaign [NAMA_BRAND] untuk [NAMA_PRODUK], model/product hero premium, dekorasi celebration minimal, background [WARNA_BRAND], negative space, rasio 4:5.`,['human','product']],
['Campaign Custom Brand','Campaign','Brand Campaign Poster',`Buat key visual brand [NAMA_BRAND] dengan [NAMA_PRODUK], identitas [WARNA_BRAND], fashion commercial photography premium, produk dan model natural, negative space untuk copy, rasio 4:5.`,['human','product']]
].forEach((x,i)=>add('FAS',i+1,F,x[1],x[2],x[0],x[3],x[4]));

// =========================
// 101–150 BEAUTY & PERAWATAN
// =========================
const B='Beauty & Perawatan';
[
['Skincare Hero Premium','Hero Produk','Poster Produk',`Buat commercial skincare photo [NAMA_PRODUK] di atas pedestal minimalis dengan [BAHAN_AKTIF] sebagai elemen pendukung yang realistis. Soft studio light, material kemasan akurat, background [WARNA_BRAND], luxury beauty aesthetic tanpa plastik berlebihan, rasio 4:5.`,['product']],
['Produk Melayang dengan Splash','Hero Produk','Beauty Advertising',`Buat [NAMA_PRODUK] melayang bersama splash air realistis dan [BAHAN_AKTIF]. Gunakan high-speed cosmetic photography, droplet natural, shadow/reflection konsisten, background [WARNA_BRAND], rasio 4:5.`,['product','surreal']],
['Serum dengan Droplet','Hero Produk','Product Photography',`Buat macro advertising photo serum [NAMA_PRODUK] dengan tetesan serum dan droplet air yang realistis pada botol. Glass/material akurat, soft studio lighting, background [WARNA_BRAND], rasio 4:5.`,['product']],
['Skincare di Batu Marmer','Hero Produk','Luxury Product Poster',`Buat [NAMA_PRODUK] di atas batu marmer natural bersama [BAHAN_AKTIF] dan botanical elements secukupnya. Natural sunlight, realistic shadow, premium spa aesthetic, warna [WARNA_BRAND], rasio 4:5.`,['product']],
['Makeup Close-up Glam','Hero Produk','Makeup Poster',`Buat close-up beauty campaign [NAMA_PRODUK] dengan model Indonesia memakai warna [WARNA_PRODUK]. Skin texture natural, pori terlihat, makeup realistis, beauty studio lighting, rasio 4:5.`,['human','product']],
['Produk Salon Premium','Hero Produk','Salon Poster',`Buat campaign [NAMA_USAHA] yang menampilkan model Indonesia setelah [JENIS_TREATMENT]. Rambut/hasil treatment sehat dan believable, salon clean, soft directional light, [WARNA_BRAND], rasio 4:5.`,['human']],
['Produk Spa Relaxing','Hero Produk','Spa Campaign',`Buat visual spa [NAMA_USAHA] dengan [NAMA_PRODUK], handuk, lilin dan bunga yang tertata natural. Interior premium namun realistis, warm ambient light, [WARNA_BRAND], rasio 4:5.`,['product']],
['Packaging Kosmetik','Hero Produk','Packaging Poster',`Buat product lineup packaging [NAMA_PRODUK] yang konsisten dan realistis. Material plastik/kaca memiliki reflection yang benar, clean luxury cosmetic lighting, background [WARNA_BRAND], rasio 4:5.`,['product']],
['Produk dengan Bahan Alami','Hero Produk','Natural Beauty Poster',`Buat [NAMA_PRODUK] bersama [BAHAN_1], [BAHAN_2], [BAHAN_3] yang benar-benar terlihat natural, tidak berlebihan. Morning light, realistic botanicals, background [WARNA_BRAND], rasio 4:5.`,['product']],
['Skincare Set Lengkap','Hero Produk','Product Set Poster',`Buat satu set skincare [NAMA_BRAND] berisi [DAFTAR_PRODUK] dalam commercial lineup yang rapi. Semua kemasan konsisten, scale benar, shadow realistis, background [WARNA_BRAND], rasio 4:5.`,['product']],
['Diskon Skincare','Promo','Poster Diskon',`Buat key visual promo [NAMA_PRODUK] dengan area untuk diskon [BESAR_DISKON]. Produk tetap premium dan realistis, background [WARNA_BRAND], clean beauty advertising, rasio 4:5.`,['product']],
['Buy 1 Get 1 Beauty','Promo','Promo Poster',`Buat visual buy 1 get 1 [NAMA_PRODUK] dengan dua unit yang benar-benar identik dan proporsional. Lighting/reflection konsisten, background [WARNA_BRAND], area promo kosong, rasio 4:5.`,['product']],
['Paket Skincare','Promo','Bundle Poster',`Buat bundle [PRODUK_1], [PRODUK_2], [PRODUK_3] dalam beauty commercial layout. Scale, kemasan dan material konsisten, background [WARNA_BRAND], rasio 4:5.`,['product']],
['Flash Sale Beauty','Promo','Flash Sale Poster',`Buat key visual flash sale [NAMA_PRODUK] yang energik namun tidak norak. Produk sebagai hero, accents secukupnya, background [WARNA_BRAND], ruang copy, rasio 4:5.`,['product']],
['Promo Treatment Salon','Promo','Treatment Poster',`Buat promo [JENIS_TREATMENT] di [NAMA_USAHA] dengan model Indonesia dan hasil treatment natural. Jangan membuat perubahan tubuh/wajah berlebihan. Salon clean, [WARNA_BRAND], rasio 4:5.`,['human']],
['Promo Facial','Promo','Facial Poster',`Buat visual treatment [NAMA_TREATMENT] pada model Indonesia di klinik/salon bersih. Prosedur terlihat profesional dan masuk akal, kulit natural, soft beauty light, [WARNA_BRAND], rasio 4:5.`,['human']],
['Launching Produk Baru','Promo','Launching Poster',`Buat launching visual [NAMA_PRODUK] dengan reveal lighting yang realistis, clean cosmetic photography, background [WARNA_BRAND], area label NEW kosong, rasio 4:5.`,['product']],
['Promo Payday Beauty','Promo','Payday Poster',`Buat payday beauty campaign [NAMA_PRODUK] yang modern, product hero premium, background [WARNA_BRAND], ruang promo aktual, tanpa ikon uang generik berlebihan, rasio 4:5.`,['product']],
['Best Seller Beauty','Promo','Bestseller Poster',`Buat hero visual [NAMA_PRODUK] dengan area badge best seller yang hanya dipakai jika benar. Premium cosmetic lighting, clean background [WARNA_BRAND], rasio 4:5.`,['product']],
['Promo Member Salon','Promo','Membership Poster',`Buat visual membership [NAMA_USAHA] dengan beberapa layanan [LAYANAN] yang divisualkan melalui suasana salon/spa realistis. Model dan therapist natural, [WARNA_BRAND], ruang copy, rasio 4:5.`,['human']],
['Produk Kosmetik Raksasa','Hook Visual','Creative Poster',`Buat [NAMA_PRODUK] berukuran raksasa di lingkungan urban premium seperti realistic advertising composite. Skala, shadow dan perspective konsisten, [WARNA_BRAND], rasio 4:5.`,['product','human','surreal']],
['Miniature Beauty Lab','Hook Visual','Miniature Poster',`Buat miniature workers realistis sedang mencampur, membersihkan dan menata [NAMA_PRODUK] berukuran besar. Macro photography, scale interaction believable, rasio 4:5.`,['human','product','surreal']],
['Before After Wajah','Hook Visual','Before After',`Buat split-screen model Indonesia yang sama sebelum dan sesudah [NAMA_TREATMENT]. Identitas wajah harus sama, perubahan hanya realistis dan sesuai treatment, skin texture tetap natural, lighting konsisten, rasio 4:5.`,['human']],
['Before After Rambut','Hook Visual','Before After',`Buat split-screen model Indonesia yang sama sebelum dan sesudah [NAMA_TREATMENT]. Rambut sebelum kusam/berantakan secara natural dan sesudah lebih rapi/sehat tanpa terlihat wig/plastik, rasio 4:5.`,['human']],
['Produk Meledak dengan Bahan Aktif','Hook Visual','Dynamic Poster',`Buat [NAMA_PRODUK] dengan [BAHAN_AKTIF], splash air dan partikel seolah meledak terkontrol. Produk tetap utuh, physics partikel realistis, background [WARNA_BRAND], rasio 4:5.`,['product','surreal']],
['Billboard Beauty','Hook Visual','Billboard Mockup',`Buat mockup campaign [NAMA_PRODUK] pada billboard urban premium. Billboard, perspective dan lighting menyatu dengan lingkungan, model Indonesia natural, [WARNA_BRAND], rasio 4:5.`,['human','product','surreal']],
['Serum Menembus Air','Hook Visual','Creative Product Ad',`Buat botol serum [NAMA_PRODUK] menembus permukaan air seperti high-speed photography. Splash dan droplet mengikuti physics, botol tidak berubah bentuk, background [WARNA_BRAND], rasio 4:5.`,['product','surreal']],
['Makeup Floating','Hook Visual','Floating Product Poster',`Buat produk makeup [NAMA_PRODUK] melayang bersama brush/pigment dalam komposisi dynamic. Semua objek memiliki shadow dan depth realistis, background [WARNA_BRAND], rasio 4:5.`,['product','surreal']],
['Mirror Beauty','Hook Visual','Lifestyle Poster',`Buat model Indonesia bercermin setelah memakai [NAMA_PRODUK]. Refleksi benar secara geometri, wajah sama di cermin, tangan natural, interior estetik, soft light, rasio 4:5.`,['human','product']],
['Produk Keluar dari Gift Box','Hook Visual','Creative Poster',`Buat [NAMA_PRODUK] keluar dari gift box premium dengan ribbon dan cahaya realistis. Material box/botol akurat, physics believable, background [WARNA_BRAND], rasio 4:5.`,['product','surreal']],
['Testimoni Beauty','Trust','Testimonial Poster',`Buat visual testimoni [NAMA_PRODUK] dengan foto produk/model dan ruang kosong untuk review asli. Jangan menciptakan rating, nama atau kutipan pelanggan. Background [WARNA_BRAND], rasio 4:5.`,['human','product']],
['Banyak Paket Siap Kirim','Trust','Social Proof Visual',`Buat beberapa paket [NAMA_PRODUK] siap dikirim dalam jumlah yang believable untuk UMKM. Meja packing rapi, tidak ada data customer palsu, background [WARNA_BRAND], rasio 4:5.`,['product']],
['Owner Beauty Brand','Trust','Founder Poster',`Buat owner [NAMA_BRAND] Indonesia memegang [NAMA_PRODUK] dalam portrait profesional dan natural. Skin texture real, background studio/workspace, [WARNA_BRAND], rasio 4:5.`,['human','product']],
['Beauty Consultant','Trust','Professional Service Poster',`Buat beauty consultant/therapist Indonesia di [NAMA_USAHA] melayani customer secara profesional. Gesture natural, alat rapi, interior clean, lighting believable, rasio 4:5.`,['human']],
['Proses Treatment','Trust','Behind The Scene',`Buat proses [NAMA_TREATMENT] dilakukan profesional di ruangan higienis. Terapis memakai perlengkapan sesuai, alat nyata, model natural, dokumentary-commercial style, rasio 4:5.`,['human']],
['Beauty Product Quality Check','Trust','Production Poster',`Buat proses quality control [NAMA_PRODUK] di workspace bersih: kemasan diperiksa dan disusun secara realistis. Jangan membuat laboratorium fiktif berlebihan, rasio 4:5.`,['product','human']],
['Banyak Customer Salon','Trust','Social Proof Poster',`Buat suasana [NAMA_USAHA] dengan beberapa customer Indonesia sedang mendapat layanan. Jumlah orang realistis, wajah unik, interaksi natural, interior premium, rasio 4:5.`,['human']],
['Skincare Shelf Premium','Trust','Store Display',`Buat rak display [NAMA_BRAND] dengan produk tersusun rapi dan konsisten. Kemasan tidak berubah antar item, lighting retail realistis, background [WARNA_BRAND], rasio 4:5.`,['product']],
['Repeat Order Beauty','Trust','Repeat Order Visual',`Buat visual repeat order [NAMA_PRODUK] melalui beberapa paket siap kirim yang realistis. Jangan membuat screenshot chat, nama pelanggan atau angka transaksi palsu, rasio 4:5.`,['product']],
['Best Seller Shelf','Trust','Bestseller Visual',`Buat [NAMA_PRODUK] sebagai hero pada display premium, dengan area badge best seller jika klaim benar. Lighting cosmetic retail realistis, [WARNA_BRAND], rasio 4:5.`,['product']],
['Ramadhan Beauty','Campaign','Ramadhan Poster',`Buat campaign Ramadhan [NAMA_PRODUK] dengan dekorasi Islami modern yang halus, produk tetap hero, warm light, [WARNA_BRAND], rasio 4:5.`,['product']],
['Lebaran Glow','Campaign','Lebaran Poster',`Buat Lebaran beauty campaign [NAMA_PRODUK] dengan model Indonesia tampil fresh natural, bukan kulit plastik. Festive decor realistis, [WARNA_BRAND], rasio 4:5.`,['human','product']],
['Hari Ibu Beauty','Campaign','Special Day Poster',`Buat Hari Ibu visual [NAMA_PRODUK] dengan ibu dan anak perempuan dewasa Indonesia dalam interaksi hangat, skin texture natural, product gift setup believable, rasio 4:5.`,['human','product']],
['Valentine Beauty','Campaign','Valentine Poster',`Buat Valentine beauty campaign [NAMA_PRODUK] dengan romantic lighting lembut, gift aesthetic realistis, warna pink sebagai aksen secukupnya, rasio 4:5.`,['product']],
['Payday Glow','Campaign','Payday Poster',`Buat payday campaign [NAMA_PRODUK] dengan premium beauty photography dan ruang penawaran aktual. Hindari money rain/gimmick generik, background [WARNA_BRAND], rasio 4:5.`,['product']],
['Weekend Self Care','Campaign','Lifestyle Poster',`Buat lifestyle weekend self-care dengan [NAMA_PRODUK], model Indonesia di rumah yang cozy, bathrobe natural, morning light, skin texture realistis, rasio 4:5.`,['human','product']],
['Tahun Baru New Glow','Campaign','New Year Poster',`Buat Tahun Baru campaign [NAMA_PRODUK] dengan shimmer dan celebration light yang halus, model/product premium, background [WARNA_BRAND], rasio 4:5.`,['human','product']],
['Birthday Beauty Brand','Campaign','Anniversary Poster',`Buat anniversary [NAMA_BRAND] untuk [NAMA_PRODUK], product hero dengan ribbon/confetti realistis, clean luxury composition, [WARNA_BRAND], rasio 4:5.`,['product']],
['Travel Beauty Kit','Campaign','Travel Campaign',`Buat [NAMA_PRODUK] sebagai travel beauty kit bersama pouch, sunglasses dan travel essentials nyata. Natural sunlight, material realistis, clean lifestyle photography, rasio 4:5.`,['product']],
['Custom Beauty Campaign','Campaign','Brand Campaign',`Buat key visual [NAMA_BRAND] dengan [NAMA_PRODUK], identitas [WARNA_BRAND], modern premium cosmetic photography, produk konsisten, ruang copy, rasio 4:5.`,['product']]
].forEach((x,i)=>add('BEA',i+1,B,x[1],x[2],x[0],x[3],x[4]));

// =========================
// 151–200 JASA LOKAL
// =========================
const J='Jasa Lokal';
[
['Hero Jasa Profesional','Hero Jasa','Service Poster',`Buat commercial service photo [JENIS_JASA] untuk [NAMA_USAHA]. Tampilkan tenaga profesional Indonesia sedang bekerja dengan alat yang benar, lokasi lokal realistis, warna [WARNA_BRAND] sebagai aksen, ruang headline, rasio 4:5.`,['human']],
['Teknisi Sedang Bekerja','Hero Jasa','Professional Service Ad',`Buat teknisi Indonesia sedang mengerjakan [JENIS_JASA] dengan seragam rapi [NAMA_USAHA], alat nyata dan prosedur masuk akal. Gesture natural, environment realistis, rasio 4:5.`,['human']],
['Cleaning Service Premium','Hero Jasa','Cleaning Poster',`Buat petugas cleaning [NAMA_USAHA] sedang membersihkan rumah/kantor modern Indonesia. Alat cleaning realistis, ruang tampak rapi tanpa transformasi mustahil, cahaya natural, rasio 4:5.`,['human']],
['Laundry Profesional','Hero Jasa','Laundry Poster',`Buat visual laundry [NAMA_USAHA] dengan pakaian bersih terlipat rapi, mesin laundry nyata dan staf Indonesia profesional. Interior bersih, warna [WARNA_BRAND], rasio 4:5.`,['human']],
['Servis AC','Hero Jasa','Technician Poster',`Buat teknisi [NAMA_USAHA] sedang melakukan servis AC dengan alat yang benar dan posisi kerja aman. Rumah Indonesia realistis, seragam rapi, dokumentary-commercial photography, rasio 4:5.`,['human']],
['Bengkel Elektronik','Hero Jasa','Repair Poster',`Buat teknisi [NAMA_USAHA] memperbaiki [BARANG] di workshop rapi. Komponen dan alat harus relevan, tangan/anatomi akurat, cahaya kerja realistis, rasio 4:5.`,['human']],
['Barbershop','Hero Jasa','Barber Poster',`Buat barber [NAMA_USAHA] memotong rambut customer pria Indonesia di barbershop modern. Gunting/clipper benar, tangan natural, rambut realistis, cinematic practical lighting, rasio 4:5.`,['human']],
['Jasa Jahit','Hero Jasa','Tailor Poster',`Buat penjahit [NAMA_USAHA] sedang mengukur/menjahit pakaian dengan mesin jahit nyata. Kain, benang dan alat tertata, tangan natural, warm commercial photography, rasio 4:5.`,['human']],
['Fotografer Lokal','Hero Jasa','Photography Service Poster',`Buat fotografer [NAMA_USAHA] melakukan sesi [JENIS_FOTO] dengan kamera dan lighting setup yang realistis. Client Indonesia natural, studio believable, rasio 4:5.`,['human']],
['Jasa Desain / Printing','Hero Jasa','Creative Service Poster',`Buat [NAMA_USAHA] mengerjakan [JENIS_JASA] dengan komputer/printer/hasil produksi yang relevan. Workspace kreatif realistis, warna [WARNA_BRAND], rasio 4:5.`,['human']],
['Diskon Jasa','Promo','Promo Poster',`Buat key visual promo [JENIS_JASA] dengan tenaga profesional saat bekerja dan area kosong untuk diskon [BESAR_DISKON]. Warna [WARNA_BRAND], clean trustworthy look, rasio 4:5.`,['human']],
['Paket Hemat Jasa','Promo','Bundle Service Poster',`Buat visual [PAKET_JASA] dari [NAMA_USAHA] melalui beberapa momen layanan yang konsisten dalam satu layout. Pekerja sama/seragam konsisten, area harga kosong, [WARNA_BRAND], rasio 4:5.`,['human']],
['Promo Pelanggan Baru','Promo','New Customer Poster',`Buat customer Indonesia baru menerima [JENIS_JASA] dari [NAMA_USAHA] dengan suasana ramah dan profesional. Interaksi natural, ruang welcome offer, rasio 4:5.`,['human']],
['Promo Weekend Service','Promo','Weekend Poster',`Buat visual weekend [JENIS_JASA] dengan tenaga profesional bekerja di lokasi nyata, customer santai, warna [WARNA_BRAND], ruang promo, rasio 4:5.`,['human']],
['Promo Home Service','Promo','Home Service Poster',`Buat petugas [JENIS_JASA] tiba di rumah customer Indonesia membawa alat profesional. Seragam rapi, alat masuk akal, suasana aman dan ramah, rasio 4:5.`,['human']],
['Promo Langganan','Promo','Subscription Poster',`Buat visual layanan berkala [JENIS_JASA] melalui calendar/lifecycle yang minimal dan realistis, pekerja profesional, lokasi konsisten, ruang paket langganan, rasio 4:5.`,['human']],
['Promo Booking Hari Ini','Promo','Booking Poster',`Buat tenaga [JENIS_JASA] siap berangkat melayani customer dengan alat lengkap dan kendaraan/transport relevan bila perlu. Kesan sigap tanpa motion berlebihan, [WARNA_BRAND], rasio 4:5.`,['human']],
['Promo Paket Keluarga','Promo','Family Service Poster',`Buat keluarga Indonesia menerima [JENIS_JASA] dengan suasana aman dan ramah. Semua orang natural, layanan terlihat jelas, environment rumah realistis, rasio 4:5.`,['human']],
['Promo Kantor','Promo','B2B Service Poster',`Buat tim [JENIS_JASA] bekerja di kantor Indonesia modern. Seragam konsisten, alat profesional, pekerja dan staf kantor natural, brand [NAMA_USAHA], rasio 4:5.`,['human']],
['Paket Premium','Promo','Premium Service Poster',`Buat premium service visual [JENIS_JASA] dengan tenaga profesional, alat berkualitas dan hasil rapi. Jangan membuat fasilitas terlalu mewah/tidak realistis untuk UMKM lokal, [WARNA_BRAND], rasio 4:5.`,['human']],
['Before After Jasa','Hook Visual','Before After Poster',`Buat split-scene sebelum/sesudah [JENIS_JASA] pada lokasi/objek yang sama. Perspektif, cahaya dan struktur objek harus sama; hanya kondisi relevan yang berubah secara realistis, rasio 4:5.`,[]],
['Miniature Workers','Hook Visual','Miniature Ad',`Buat miniature workers realistis sedang melakukan [JENIS_JASA] pada objek berukuran besar. Gunakan macro photography, scale interaction masuk akal, alat sesuai pekerjaan, rasio 4:5.`,['human','surreal']],
['Alat Kerja Raksasa','Hook Visual','Surreal Poster',`Buat [ALAT_KERJA] raksasa di lingkungan kota Indonesia dengan pekerja kecil yang melakukan [JENIS_JASA]. Perspective, shadow, scale dan material harus seperti practical advertising composite, rasio 4:5.`,['human','surreal']],
['Rumah Kotor vs Bersih','Hook Visual','Transformation Poster',`Buat split-scene ruangan yang sama sebelum dan sesudah [JENIS_JASA]: kiri kotor/berantakan secara realistis, kanan lebih bersih dan rapi. Struktur ruangan, kamera dan cahaya tetap konsisten, rasio 4:5.`,[]],
['Teknisi Superhero','Hook Visual','Creative Service Poster',`Buat teknisi [JENIS_JASA] dari [NAMA_USAHA] dengan heroic low-angle pose yang realistis, bukan kostum fantasi. Seragam kerja nyata, alat profesional, dramatic practical lighting, rasio 4:5.`,['human']],
['Problem vs Solution','Hook Visual','Split Concept Poster',`Buat split visual [MASALAH] di sisi kiri dan hasil setelah [JENIS_JASA] di sisi kanan. Gunakan objek/lokasi yang sama, transformation realistis, no impossible makeover, rasio 4:5.`,[]],
['Billboard Jasa Lokal','Hook Visual','Billboard Mockup',`Buat billboard realistis [NAMA_USAHA] untuk [JENIS_JASA] di kawasan kota Indonesia. Perspective dan lighting billboard sesuai lingkungan, foto pekerja natural, [WARNA_BRAND], rasio 4:5.`,['human','surreal']],
['Fast Response Visual','Hook Visual','Dynamic Poster',`Buat petugas [JENIS_JASA] bergerak sigap menuju customer, dengan kendaraan/alat relevan bila perlu. Gunakan motion blur ringan yang realistis, anatomi natural, rasio 4:5.`,['human']],
['Extreme Close-up Skill','Hook Visual','Detail Service Poster',`Buat macro close-up tangan profesional melakukan [JENIS_JASA]. Alat, posisi jari dan tindakan harus benar secara teknis, cinematic practical light, rasio 4:5.`,['human']],
['Hasil Kerja Dramatis','Hook Visual','Transformation Ad',`Buat hasil akhir [JENIS_JASA] sebagai focal point dengan dramatic but plausible lighting. Detail hasil rapi dan realistic, before-state hanya sebagai konteks halus, rasio 4:5.`,[]],
['Testimoni Pelanggan','Trust','Testimonial Poster',`Buat customer Indonesia puas bersama hasil [JENIS_JASA] dan ruang kosong untuk testimoni asli. Jangan mengarang quote/rating/nama customer. Warna [WARNA_BRAND], rasio 4:5.`,['human']],
['Tim Profesional','Trust','Team Poster',`Buat foto tim [NAMA_USAHA] memakai seragam konsisten bersama perlengkapan [JENIS_JASA]. Semua wajah unik, anatomi natural, pose group photo realistis, rasio 4:5.`,['human']],
['Alat Lengkap','Trust','Equipment Poster',`Buat flatlay/workbench perlengkapan [JENIS_JASA] yang benar dan tertata rapi bersama teknisi. Tidak ada alat fiktif atau bentuk meleleh, rasio 4:5.`,['human']],
['Banyak Customer','Trust','Social Proof Visual',`Buat [NAMA_USAHA] melayani beberapa customer Indonesia secara wajar. Jumlah orang realistis, wajah tidak duplikat, interaksi natural, lokasi nyata, rasio 4:5.`,['human']],
['Seragam dan ID Card','Trust','Professional Branding Poster',`Buat pekerja [NAMA_USAHA] dengan seragam rapi, ID card tanpa teks palsu yang terbaca, dan alat [JENIS_JASA]. Pose profesional natural, rasio 4:5.`,['human']],
['Quality Check Hasil Kerja','Trust','Quality Control Poster',`Buat pekerja memeriksa hasil [JENIS_JASA] bersama customer. Tampilkan checklist/inspection secara visual tanpa teks palsu, gesture natural, hasil realistis, rasio 4:5.`,['human']],
['Owner & Tim','Trust','Founder Branding',`Buat owner [NAMA_USAHA] bersama tim di workshop/lokasi usaha nyata. Pose ramah profesional, wajah unik, seragam konsisten, aksen [WARNA_BRAND], rasio 4:5.`,['human']],
['Repeat Customer','Trust','Loyalty Poster',`Buat customer lama kembali menggunakan [JENIS_JASA] dengan interaksi hangat yang natural. Hindari simbol loyalty generik berlebihan, fokus pada human moment, rasio 4:5.`,['human']],
['Hasil Pekerjaan Banyak','Trust','Portfolio Poster',`Buat layout portfolio beberapa hasil [JENIS_JASA] yang realistis dan konsisten. Gunakan grid visual bersih, tidak ada text filler, [WARNA_BRAND], rasio 4:5.`,[]],
['Pelayanan Ramah','Trust','Customer Experience Poster',`Buat pekerja [JENIS_JASA] berinteraksi ramah dengan customer Indonesia setelah pekerjaan selesai. Gesture natural, environment bersih, authentic local-business photography, rasio 4:5.`,['human']],
['Ramadhan Service','Campaign','Ramadhan Poster',`Buat campaign Ramadhan [JENIS_JASA] untuk [NAMA_USAHA] dengan dekorasi Ramadhan ringan dan realistis. Tenaga profesional tetap focal point, warm light, rasio 4:5.`,['human']],
['Lebaran Bersih-Bersih','Campaign','Lebaran Campaign',`Buat campaign menjelang Lebaran untuk [JENIS_JASA], rumah/tempat usaha Indonesia menjadi lebih rapi secara realistis, keluarga/pekerja natural, festive decor halus, rasio 4:5.`,['human']],
['Musim Hujan','Campaign','Seasonal Poster',`Buat campaign [JENIS_JASA] di musim hujan dengan masalah yang memang relevan dan tenaga profesional menanganinya. Hujan, genangan dan cahaya harus realistis, rasio 4:5.`,['human']],
['Tahun Baru','Campaign','New Year Poster',`Buat campaign Tahun Baru [NAMA_USAHA] dengan hasil [JENIS_JASA] yang rapi dan suasana fresh start. Celebration accents minimal, clean realistic visual, rasio 4:5.`,['human']],
['Back to Office','Campaign','Business Campaign',`Buat campaign [JENIS_JASA] untuk persiapan kembali ke kantor. Tim profesional bekerja di kantor nyata, alat relevan, pekerja natural, rasio 4:5.`,['human']],
['Promo Weekend','Campaign','Weekend Campaign',`Buat campaign weekend [JENIS_JASA] dengan customer santai sementara tenaga profesional bekerja. Lifestyle scene Indonesia realistis, warm light, rasio 4:5.`,['human']],
['Payday Service','Campaign','Payday Poster',`Buat payday campaign [JENIS_JASA] untuk [NAMA_USAHA] dengan visual tenaga profesional dan hasil pekerjaan. Sediakan area promo aktual, hindari gimmick uang generik, rasio 4:5.`,['human']],
['Hari Kemerdekaan','Campaign','Independence Poster',`Buat campaign 17 Agustus [NAMA_USAHA] untuk [JENIS_JASA], menggunakan elemen merah putih secara halus, tim Indonesia bekerja natural, festive but professional, rasio 4:5.`,['human']],
['Anniversary Usaha','Campaign','Anniversary Poster',`Buat anniversary [NAMA_USAHA] dengan owner/tim, alat kerja dan customer dalam suasana perayaan sederhana. Wajah dan anatomi natural, [WARNA_BRAND], rasio 4:5.`,['human']],
['Custom Campaign','Campaign','Brand Campaign',`Buat key visual [NAMA_USAHA] untuk [JENIS_JASA], menampilkan tenaga profesional dan hasil kerja nyata, identitas [WARNA_BRAND], commercial local-business photography, ruang copy, rasio 4:5.`,['human']]
].forEach((x,i)=>add('JAS',i+1,J,x[1],x[2],x[0],x[3],x[4]));

if(data.length !== 200) throw new Error('Expected 200 prompts, got '+data.length);

export const ANTI_AI_SLOP_RULE = QUALITY_BASE;
export const prompts = data;
export default prompts;
