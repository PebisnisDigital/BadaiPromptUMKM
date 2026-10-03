// BADAI PROMPT UMKM — IMAGE PROMPTS V2 (201–300)
// Pendidikan & Kursus + Properti & Hunian
// Semua final image_prompt membawa aturan ANTI AI SLOP.

import { ANTI_AI_SLOP_RULE } from './image-prompts-001-200-v2.js';

const HUMAN = `
REAL HUMAN DETAIL: jika ada manusia, gunakan orang Indonesia yang terlihat nyata dan relatable; anatomi akurat, tangan lima jari, pose natural, wajah tidak beauty-filter berlebihan, skin texture nyata, pakaian mengikuti gravitasi, dan tidak ada anggota tubuh ekstra/menyatu.
`;

const PRODUCT = `
REFERENCE FIDELITY: jika user memberi foto referensi tempat, gedung, produk, materi kelas, logo, atau objek utama, pertahankan bentuk, proporsi, warna, material, layout, dan identitas visual secara akurat. Jangan mengarang logo, teks, sertifikat, dokumen, atau detail properti.
`;

const SURREAL = `
SURREAL REALISM: konsep kreatif boleh fantastis, tetapi eksekusinya harus seperti practical commercial composite / VFX photography profesional. Skala, physics, perspective, shadow, reflection, dan lighting harus konsisten dan believable.
`;

const NO_TEXT = `
LAYOUT RULE: utamakan visual dan sisakan negative space untuk headline, harga, CTA, logo, nama kelas, nama properti, atau detail lain yang akan ditambahkan saat desain. Jangan mengandalkan AI untuk menulis teks panjang, angka harga, sertifikat, dokumen legal, atau logo.
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
// 201–250 PENDIDIKAN & KURSUS
// =========================
const E='Pendidikan & Kursus';
[
['Mentor Mengajar Premium','Hero Kelas','Education Poster',`Buat visual promosi [NAMA_KELAS] dengan mentor Indonesia [NAMA_MENTOR] sedang mengajar secara natural di ruang belajar modern. Tampilkan [TOPIK_KELAS] melalui aktivitas belajar nyata, bukan teks panjang. Gunakan warna [WARNA_BRAND], commercial education photography, ruang headline, rasio 4:5.`,['human']],
['Online Course di Laptop','Hero Kelas','Online Course Visual',`Buat visual [NAMA_KELAS] sebagai online course yang tampil pada laptop di meja belajar nyata. Di sekitar laptop ada notebook, alat tulis dan elemen [TOPIK_KELAS] yang relevan. Screen jangan berisi teks acak; gunakan layout generik bersih. Warna [WARNA_BRAND], rasio 4:5.`,['product']],
['Kelas Tatap Muka','Hero Kelas','Classroom Poster',`Buat foto kelas [NAMA_KELAS] dengan mentor dan peserta Indonesia dalam sesi tatap muka yang aktif. Pose candid, interaksi natural, ruang kelas nyata, pencahayaan natural-commercial, aksen [WARNA_BRAND], rasio 4:5.`,['human']],
['Workshop Praktik','Hero Kelas','Workshop Poster',`Buat visual workshop [NAMA_KELAS] yang menunjukkan peserta Indonesia sedang mempraktikkan [SKILL] dengan alat yang benar. Mentor mendampingi secara natural, workspace rapi, commercial training photography, rasio 4:5.`,['human']],
['Modul Belajar Premium','Hero Kelas','Learning Material Poster',`Buat flatlay materi [NAMA_KELAS] berupa workbook, tablet, alat tulis dan elemen visual [TOPIK_KELAS]. Jangan merender teks isi modul; gunakan halaman dengan layout placeholder bersih. Warna [WARNA_BRAND], realistic product photography, rasio 4:5.`,['product']],
['Belajar dari Rumah','Hero Kelas','Lifestyle Learning Visual',`Buat peserta Indonesia sedang mengikuti [NAMA_KELAS] dari rumah menggunakan laptop. Suasana meja belajar nyaman dan realistis, expression fokus natural, daylight, elemen [TOPIK_KELAS] secukupnya, rasio 4:5.`,['human']],
['Mentor dengan Alat Praktik','Hero Kelas','Mentor Skill Poster',`Buat mentor [NAMA_MENTOR] memperagakan [SKILL] dengan alat/perangkat yang benar. Background learning studio nyata, pose natural, professional training photography, aksen [WARNA_BRAND], rasio 4:5.`,['human']],
['Kelas untuk Pemula','Hero Kelas','Beginner Course Poster',`Buat visual [NAMA_KELAS] untuk pemula: peserta Indonesia terlihat belajar langkah awal dengan mentor yang ramah, suasana tidak mengintimidasi, alat belajar sederhana, warna [WARNA_BRAND], rasio 4:5.`,['human']],
['Bundle Kelas','Hero Kelas','Course Bundle Visual',`Buat visual bundle [DAFTAR_KELAS] sebagai beberapa perangkat belajar/modul visual yang tersusun premium. Hindari cover dengan teks acak; gunakan simbol/visual sesuai topik. Background [WARNA_BRAND], rasio 4:5.`,['product']],
['Skill Transformation','Hero Kelas','Learning Journey Poster',`Buat visual perjalanan belajar [SKILL] dari pemula menuju lebih terampil melalui tiga momen realistis orang Indonesia yang sama. Identitas orang konsisten, progress terlihat lewat aktivitas dan hasil kerja, bukan transformasi fisik, rasio 4:5.`,['human']],
['Diskon Kelas','Promo Kelas','Promo Poster',`Buat key visual promo [NAMA_KELAS] dengan mentor/peserta dan ruang khusus untuk diskon [BESAR_DISKON] yang ditambahkan saat desain. Education photography modern, warna [WARNA_BRAND], rasio 4:5.`,['human']],
['Early Bird Kelas','Promo Kelas','Early Bird Poster',`Buat visual early bird [NAMA_KELAS] dengan suasana pendaftaran kelas yang profesional. Gunakan elemen waktu secara visual tanpa angka palsu, mentor/peserta natural, warna [WARNA_BRAND], ruang copy, rasio 4:5.`,['human']],
['Bundle Hemat Kelas','Promo Kelas','Bundle Promo Poster',`Buat visual bundle [KELAS_1], [KELAS_2], [KELAS_3] melalui tiga learning scenes yang konsisten dalam satu layout. Jangan menulis nama kelas otomatis; sisakan area label. Warna [WARNA_BRAND], rasio 4:5.`,['human']],
['Promo Kelas Baru','Promo Kelas','Launching Course Poster',`Buat launching visual [NAMA_KELAS] dengan mentor [NAMA_MENTOR] dan aktivitas [TOPIK_KELAS]. Fresh, modern, believable, area NEW kosong untuk desain, background [WARNA_BRAND], rasio 4:5.`,['human']],
['Kelas Weekend','Promo Kelas','Weekend Learning Poster',`Buat visual [NAMA_KELAS] versi weekend dengan peserta Indonesia belajar santai namun fokus. Suasana cozy, realistic lifestyle learning, warna [WARNA_BRAND], ruang jadwal aktual, rasio 4:5.`,['human']],
['Kelas Batch Baru','Promo Kelas','Cohort Poster',`Buat visual batch baru [NAMA_KELAS] dengan kelompok kecil peserta Indonesia dan mentor. Jangan mengarang jumlah seat; tampilkan group learning scene realistis, warna [WARNA_BRAND], rasio 4:5.`,['human']],
['Promo Kursus Anak','Promo Kelas','Kids Course Poster',`Buat visual [NAMA_KELAS] untuk anak dengan kegiatan belajar [AKTIVITAS] yang aman, natural dan menyenangkan. Anak-anak Indonesia terlihat nyata, proporsi akurat, mentor mengawasi, warna [WARNA_BRAND], rasio 4:5.`,['human']],
['Promo Kursus Profesional','Promo Kelas','Professional Course Poster',`Buat visual [NAMA_KELAS] untuk profesional Indonesia dengan aktivitas [SKILL] di workspace nyata. Styling rapi, modern, tidak seperti stock photo generik, warna [WARNA_BRAND], ruang promo, rasio 4:5.`,['human']],
['Promo Sertifikasi','Promo Kelas','Certification Poster',`Buat visual [NAMA_KELAS] dengan peserta memegang sertifikat kosong/generik setelah menyelesaikan pelatihan. Jangan menciptakan lembaga, logo, nomor atau klaim sertifikasi palsu. Gunakan hanya bila sertifikasi nyata, rasio 4:5.`,['human']],
['Promo Konsultasi Belajar','Promo Kelas','Consultation Poster',`Buat mentor [NAMA_MENTOR] melakukan konsultasi belajar satu lawan satu dengan peserta Indonesia. Tampilkan laptop/notebook, gesture natural, suasana profesional dan hangat, warna [WARNA_BRAND], rasio 4:5.`,['human']],
['Buku Raksasa','Hook Visual','Creative Education Poster',`Buat buku/notebook raksasa bertema [TOPIK_KELAS] di lingkungan belajar nyata dengan peserta kecil berinteraksi seperti practical advertising composite. Jangan isi halaman dengan teks acak, warna [WARNA_BRAND], rasio 4:5.`,['human','surreal']],
['Miniature Learners','Hook Visual','Miniature Learning Poster',`Buat miniature learners Indonesia sedang belajar [SKILL] di atas meja belajar raksasa. Macro photography, alat belajar relevan, scale dan shadow realistis, rasio 4:5.`,['human','surreal']],
['Before After Skill','Hook Visual','Skill Transformation Poster',`Buat split-scene orang Indonesia yang sama sebelum dan setelah belajar [SKILL]. Sisi kiri kebingungan pada tugas, sisi kanan lebih terampil mengerjakan tugas yang sama. Identitas orang dan environment konsisten, rasio 4:5.`,['human']],
['Masalah vs Solusi Belajar','Hook Visual','Split Concept Poster',`Buat split visual: kiri masalah [MASALAH_BELAJAR], kanan situasi lebih terarah setelah mengikuti [NAMA_KELAS]. Hindari klaim hasil pasti; tampilkan perubahan perilaku belajar yang realistis, rasio 4:5.`,['human']],
['Lampu Ide Realistis','Hook Visual','Creative Learning Poster',`Buat peserta Indonesia mendapat ide saat mempelajari [TOPIK_KELAS], divisualkan dengan practical light motif seperti lampu meja/soft light halo yang realistis, bukan ikon bohlam AI generik. Warna [WARNA_BRAND], rasio 4:5.`,['human']],
['Tangga Skill','Hook Visual','Learning Journey Visual',`Buat konsep visual peserta Indonesia menaiki beberapa level platform nyata yang merepresentasikan progress [SKILL], seperti advertising composite profesional. Setiap level berisi alat/hasil kerja relevan, bukan teks, rasio 4:5.`,['human','surreal']],
['Billboard Kelas','Hook Visual','Billboard Mockup',`Buat billboard realistis untuk [NAMA_KELAS] di lingkungan kota/kampus Indonesia. Billboard menampilkan mentor/aktivitas kelas tanpa teks acak, perspective dan lighting menyatu dengan lingkungan, [WARNA_BRAND], rasio 4:5.`,['human','surreal']],
['Alat Skill Melayang','Hook Visual','Floating Skill Poster',`Buat alat-alat yang relevan untuk [SKILL] melayang mengelilingi mentor/peserta seperti high-end commercial composite. Semua objek memiliki scale, shadow, depth dan perspective realistis, warna [WARNA_BRAND], rasio 4:5.`,['human','surreal']],
['Jalan Menuju Skill','Hook Visual','Journey Poster',`Buat visual seorang peserta Indonesia berjalan melalui ruang belajar menuju workstation [SKILL] yang lebih maju. Gunakan perspektif sinematik realistis, bukan portal fantasi, warna [WARNA_BRAND], rasio 4:5.`,['human']],
['Mentor Spotlight','Hook Visual','Mentor Authority Poster',`Buat portrait mentor [NAMA_MENTOR] sebagai focal point dengan alat/hasil [SKILL] di sekelilingnya secara nyata. Professional education advertising, ekspresi natural, warna [WARNA_BRAND], rasio 4:5.`,['human']],
['Profil Mentor','Trust','Mentor Profile Poster',`Buat portrait profesional mentor [NAMA_MENTOR] di environment [TOPIK_KELAS]. Tampilkan pengalaman melalui alat/aktivitas nyata, bukan badge atau gelar palsu. Skin texture natural, warna [WARNA_BRAND], rasio 4:5.`,['human']],
['Aktivitas Kelas Nyata','Trust','Class Activity Poster',`Buat dokumentasi komersial kelas [NAMA_KELAS] yang sedang berlangsung dengan peserta Indonesia dan mentor. Interaksi candid, tidak ada wajah duplikat, ruangan realistis, rasio 4:5.`,['human']],
['Peserta Sedang Praktik','Trust','Student Practice Poster',`Buat peserta Indonesia mempraktikkan [SKILL] dengan alat yang tepat setelah materi dijelaskan. Fokus pada proses belajar, bukan klaim hasil berlebihan, realistic training photography, rasio 4:5.`,['human']],
['Portfolio Hasil Belajar','Trust','Portfolio Poster',`Buat layout visual beberapa hasil latihan [SKILL] yang realistis. Jangan membuat angka pencapaian atau testimonial palsu; gunakan hasil karya sebagai focal point, grid clean, [WARNA_BRAND], rasio 4:5.`,['product']],
['Behind The Scene Materi','Trust','Behind The Scene Poster',`Buat mentor [NAMA_MENTOR] menyiapkan materi [NAMA_KELAS] di meja kerja: laptop, catatan, alat [SKILL]. Screen dan halaman tidak berisi teks acak, authentic behind-the-scenes, rasio 4:5.`,['human']],
['Testimoni Peserta','Trust','Testimonial Poster',`Buat visual testimoni [NAMA_KELAS] dengan foto peserta/kelas dan ruang kosong untuk review asli. Jangan mengarang nama, kutipan, rating atau hasil. Warna [WARNA_BRAND], rasio 4:5.`,['human']],
['Komunitas Belajar','Trust','Community Poster',`Buat komunitas belajar [NAMA_KELAS] dengan beberapa peserta Indonesia berdiskusi dalam kelompok kecil. Wajah unik, gesture natural, tidak seperti crowd AI, ruang nyata, rasio 4:5.`,['human']],
['Sesi Tanya Jawab','Trust','Q&A Poster',`Buat mentor dan peserta [NAMA_KELAS] dalam sesi tanya jawab yang natural. Tangan terangkat dan gesture harus anatomis, kelas realistis, professional education photography, rasio 4:5.`,['human']],
['Sertifikat Kelulusan','Trust','Completion Poster',`Buat peserta Indonesia memegang sertifikat kelulusan kosong/generik untuk [NAMA_KELAS]. Jangan membuat logo, gelar, institusi, tanda tangan atau nomor sertifikat palsu. Gunakan hanya jika memang ada sertifikat nyata, rasio 4:5.`,['human']],
['Tim Pengajar','Trust','Instructor Team Poster',`Buat foto tim pengajar [NAMA_KELAS] dengan pose group yang natural, wajah unik, profesi/alat relevan dengan [TOPIK_KELAS], warna [WARNA_BRAND], rasio 4:5.`,['human']],
['Ramadhan Belajar','Campaign','Ramadhan Education Poster',`Buat campaign Ramadhan [NAMA_KELAS] dengan peserta Indonesia belajar dalam suasana hangat, dekorasi Islami halus, aktivitas [TOPIK_KELAS] nyata, warna [WARNA_BRAND], rasio 4:5.`,['human']],
['Back to School','Campaign','Back To School Poster',`Buat campaign back-to-school [NAMA_KELAS] dengan pelajar Indonesia belajar [TOPIK_KELAS]. Environment sekolah/belajar realistis, ekspresi natural, warna [WARNA_BRAND], rasio 4:5.`,['human']],
['Persiapan Ujian','Campaign','Exam Prep Poster',`Buat visual persiapan ujian untuk [NAMA_KELAS] dengan peserta Indonesia belajar serius namun natural. Meja belajar realistis, catatan tanpa teks acak, pencahayaan malam/pagi yang believable, rasio 4:5.`,['human']],
['New Year New Skill','Campaign','New Year Learning Poster',`Buat campaign Tahun Baru bertema belajar [SKILL], peserta Indonesia memulai aktivitas baru dengan workspace rapi. Celebration accents minimal, warna [WARNA_BRAND], rasio 4:5.`,['human']],
['Payday Upgrade Skill','Campaign','Payday Learning Poster',`Buat payday campaign [NAMA_KELAS] dengan visual investasi waktu untuk belajar [SKILL]. Hindari simbol uang berlebihan; fokus pada mentor, alat dan proses belajar, warna [WARNA_BRAND], rasio 4:5.`,['human']],
['Weekend Learning','Campaign','Weekend Education Poster',`Buat weekend learning [NAMA_KELAS] dengan peserta Indonesia belajar santai di rumah/kafe/co-learning space yang nyata. Natural light, casual-professional mood, rasio 4:5.`,['human']],
['Career Skill Campaign','Campaign','Career Education Poster',`Buat campaign [NAMA_KELAS] untuk skill karier [SKILL], peserta dewasa Indonesia berlatih di workspace nyata. Jangan menjanjikan pekerjaan/gaji; fokus pada kegiatan belajar, rasio 4:5.`,['human']],
['Holiday Class','Campaign','Holiday Learning Poster',`Buat holiday class [NAMA_KELAS] dengan aktivitas belajar [AKTIVITAS] yang menyenangkan dan realistis. Peserta sesuai target usia, environment aman, warna [WARNA_BRAND], rasio 4:5.`,['human']],
['Anniversary Kelas','Campaign','Anniversary Education Poster',`Buat anniversary [NAMA_KELAS] dengan mentor dan komunitas belajar dalam perayaan sederhana. Jangan mengarang jumlah tahun/peserta; sisakan ruang data aktual, [WARNA_BRAND], rasio 4:5.`,['human']],
['Custom Education Campaign','Campaign','Brand Education Poster',`Buat key visual [NAMA_KELAS] tentang [TOPIK_KELAS], menampilkan mentor/peserta dan alat belajar nyata, identitas [WARNA_BRAND], commercial education photography, ruang copy, rasio 4:5.`,['human']]
].forEach((x,i)=>add('EDU',i+1,E,x[1],x[2],x[0],x[3],x[4]));

// =========================
// 251–300 PROPERTI & HUNIAN
// =========================
const P='Properti & Hunian';
[
['Hero Rumah Premium','Hero Properti','Property Poster',`Buat hero photo [NAMA_PROPERTI] berdasarkan [REFERENSI_PROPERTI] bila tersedia. Tampilkan fasad secara akurat pada golden hour yang realistis, material bangunan natural, landscaping wajar, sky tidak dramatis berlebihan, warna [WARNA_BRAND] sebagai aksen desain, rasio 4:5.`,['product']],
['Interior Ruang Tamu','Hero Properti','Interior Poster',`Buat interior photo ruang tamu [NAMA_PROPERTI] berdasarkan layout/referensi aktual. Furniture memiliki scale benar, material realistis, natural window light, tidak menambah pintu/jendela yang tidak ada, rasio 4:5.`,['product']],
['Interior Dapur','Hero Properti','Kitchen Poster',`Buat commercial interior photo dapur [NAMA_PROPERTI]. Pertahankan layout aktual jika referensi diberikan, material kabinet dan countertop realistis, daylight natural, appliances proporsional, rasio 4:5.`,['product']],
['Interior Kamar Tidur','Hero Properti','Bedroom Poster',`Buat interior bedroom [NAMA_PROPERTI] yang realistis dan nyaman, mempertahankan layout serta bukaan aktual dari referensi. Soft daylight, furniture proporsional, bedding natural, rasio 4:5.`,['product']],
['Aerial Properti','Hero Properti','Drone Property Visual',`Buat aerial/drone style visual [NAMA_PROPERTI] berdasarkan lokasi/referensi yang benar. Jalan, rumah dan lingkungan memiliki geometry konsisten, jangan mengarang fasilitas sekitar, daylight realistis, rasio 4:5.`,['product']],
['Fasad Malam Hari','Hero Properti','Night Exterior Poster',`Buat exterior [NAMA_PROPERTI] pada blue hour/malam dengan lampu interior/eksterior yang realistis. Pertahankan arsitektur aktual, reflection dan exposure natural, tidak terlalu glowing, rasio 4:5.`,['product']],
['Rumah untuk Keluarga','Hero Properti','Lifestyle Property Poster',`Buat keluarga Indonesia berada di [NAMA_PROPERTI] dalam aktivitas rumah yang natural. Properti tetap focal point, anatomy dan interaction natural, interior sesuai referensi, rasio 4:5.`,['human','product']],
['Unit Siap Huni','Hero Properti','Ready Unit Poster',`Buat visual [NAMA_PROPERTI] sebagai unit siap huni dengan kondisi bersih, rapi dan realistis. Jangan menambahkan furniture/fasilitas yang tidak termasuk bila tidak ada referensi. Sisakan ruang copy aktual, rasio 4:5.`,['product']],
['Detail Material Rumah','Hero Properti','Material Detail Poster',`Buat close-up material [NAMA_PROPERTI] seperti [MATERIAL_UTAMA], kusen, flooring atau finishing. Tekstur dan sambungan konstruksi harus realistis, lighting architectural photography, rasio 4:5.`,['product']],
['Area Depan Rumah','Hero Properti','Exterior Lifestyle Poster',`Buat exterior lifestyle [NAMA_PROPERTI] dengan halaman/teras/depan rumah sesuai referensi. Tambahkan manusia/kendaraan hanya jika scale masuk akal dan tidak mengubah properti, daylight natural, rasio 4:5.`,['human','product']],
['Promo Harga Properti','Promo Properti','Sales Property Poster',`Buat key visual [NAMA_PROPERTI] dengan foto properti akurat dan area kosong untuk harga aktual [HARGA]. Jangan merender angka harga otomatis. Background/design accents [WARNA_BRAND], rasio 4:5.`,['product']],
['Promo Open House','Promo Properti','Open House Poster',`Buat visual open house [NAMA_PROPERTI] dengan agent dan calon pembeli Indonesia sedang melihat unit secara natural. Properti akurat, ruang untuk tanggal/jam aktual, warna [WARNA_BRAND], rasio 4:5.`,['human','product']],
['Promo DP','Promo Properti','Payment Promo Poster',`Buat key visual [NAMA_PROPERTI] dengan ruang untuk informasi DP [INFO_DP] yang akan ditambahkan saat desain. Jangan mengarang nominal/skema. Gunakan foto properti akurat, clean real-estate advertising, rasio 4:5.`,['product']],
['Launching Cluster','Promo Properti','Launching Property Poster',`Buat launching visual [NAMA_CLUSTER] berdasarkan masterplan/referensi aktual. Tampilkan beberapa unit dengan arsitektur konsisten, lingkungan believable, area label launching kosong, [WARNA_BRAND], rasio 4:5.`,['product']],
['Unit Terbatas','Promo Properti','Availability Poster',`Buat visual [NAMA_PROPERTI] dengan ruang untuk keterangan ketersediaan unit aktual. Jangan membuat klaim “tinggal 1” atau scarcity palsu. Properti tetap hero, warna [WARNA_BRAND], rasio 4:5.`,['product']],
['Promo Weekend Visit','Promo Properti','Weekend Visit Poster',`Buat keluarga/calon pembeli Indonesia melakukan weekend visit di [NAMA_PROPERTI]. Agent mendampingi natural, cuaca realistis, arsitektur sesuai referensi, ruang jadwal, rasio 4:5.`,['human','product']],
['Promo Rumah Pertama','Promo Properti','First Home Poster',`Buat visual pasangan/keluarga muda Indonesia mengunjungi [NAMA_PROPERTI] sebagai rumah pertama. Hindari simbol kunci raksasa generik, fokus pada momen melihat rumah yang autentik, rasio 4:5.`,['human','product']],
['Promo Rumah Keluarga','Promo Properti','Family Home Poster',`Buat visual [NAMA_PROPERTI] untuk keluarga: aktivitas natural di ruang keluarga/teras, properti akurat, ekspresi realistis, daylight, warna [WARNA_BRAND], rasio 4:5.`,['human','product']],
['Promo Properti Komersial','Promo Properti','Commercial Property Poster',`Buat key visual [NAMA_PROPERTI] untuk properti komersial dengan pelaku usaha Indonesia melihat ruang aktual. Jangan mengarang potensi omzet/traffic; fokus pada space, layout dan akses visual, rasio 4:5.`,['human','product']],
['Promo Booking Survey','Promo Properti','Site Visit Poster',`Buat agent [NAMA_AGENT] mengajak calon pembeli melakukan survey [NAMA_PROPERTI]. Interaksi natural, lokasi akurat, ruang untuk jadwal/kontak aktual, [WARNA_BRAND], rasio 4:5.`,['human','product']],
['Before After Renovasi','Hook Visual','Renovation Before After',`Buat split-scene properti yang sama sebelum dan sesudah renovasi [JENIS_RENOVASI]. Struktur utama, kamera dan perspektif harus konsisten; perubahan hanya sesuai scope renovasi realistis, rasio 4:5.`,['product']],
['Miniature Construction','Hook Visual','Miniature Property Poster',`Buat miniature construction workers realistis mengerjakan model [NAMA_PROPERTI] berukuran besar seperti macro advertising photography. Alat, scale, shadow dan material konsisten, rasio 4:5.`,['human','product','surreal']],
['Kunci Rumah Raksasa','Hook Visual','Creative Property Poster',`Buat kunci rumah raksasa sebagai visual metafora di depan [NAMA_PROPERTI] dalam practical advertising composite. Properti tidak berubah, scale/perspective/shadow realistis, rasio 4:5.`,['product','surreal']],
['Cutaway Rumah','Hook Visual','Architectural Cutaway',`Buat architectural cutaway [NAMA_PROPERTI] hanya berdasarkan layout/floorplan referensi yang tersedia. Jangan mengarang ruang baru. Interior memiliki scale benar, material realistis, presentation premium, rasio 4:5.`,['product','surreal']],
['Siang vs Malam','Hook Visual','Day Night Split',`Buat split visual [NAMA_PROPERTI] dari angle yang sama pada siang dan malam. Arsitektur identik, hanya pencahayaan dan sky berubah secara realistis, exposure natural, rasio 4:5.`,['product']],
['Kosong vs Furnished','Hook Visual','Staging Before After',`Buat ruang [NAMA_PROPERTI] dari angle yang sama: sisi kiri kosong, sisi kanan furnished secara proporsional. Jangan mengubah dinding, jendela, pintu atau ukuran ruang, rasio 4:5.`,['product']],
['Drone Top View','Hook Visual','Top View Property Poster',`Buat top-down drone style [NAMA_PROPERTI] berdasarkan site plan/lokasi aktual. Jalan, kavling, atap dan landscape harus konsisten; jangan mengarang fasilitas, rasio 4:5.`,['product']],
['Billboard Properti','Hook Visual','Billboard Mockup',`Buat billboard realistis [NAMA_PROPERTI] di lingkungan kota Indonesia. Perspective dan lighting billboard menyatu dengan lokasi, gunakan foto properti akurat dan area copy kosong, [WARNA_BRAND], rasio 4:5.`,['product','surreal']],
['Pintu Menuju Rumah','Hook Visual','Creative Property Visual',`Buat visual pintu terbuka yang mengarah secara perspektif ke [NAMA_PROPERTI] sebagai practical composite, bukan portal fantasy. Cahaya dan geometry konsisten, properti akurat, rasio 4:5.`,['product','surreal']],
['Lifestyle Lingkungan','Hook Visual','Neighborhood Lifestyle Poster',`Buat lifestyle scene lingkungan sekitar [NAMA_PROPERTI] hanya berdasarkan fasilitas yang benar-benar tersedia [FASILITAS_AKTUAL]. Warga Indonesia natural, daylight, jangan mengarang taman/sekolah/mall, rasio 4:5.`,['human','product']],
['Agent dan Properti','Trust','Agent Property Poster',`Buat agent [NAMA_AGENT] Indonesia berdiri di depan [NAMA_PROPERTI] yang akurat. Pose ramah profesional, outfit natural, tidak ada papan nama/sertifikasi palsu, [WARNA_BRAND], rasio 4:5.`,['human','product']],
['Site Visit Nyata','Trust','Site Visit Poster',`Buat calon pembeli Indonesia melakukan site visit [NAMA_PROPERTI] bersama agent. Tampilkan inspeksi ruang yang natural, property fidelity tinggi, interaction believable, rasio 4:5.`,['human','product']],
['Progress Pembangunan','Trust','Construction Progress Poster',`Buat visual progress pembangunan [NAMA_PROPERTI] berdasarkan tahap aktual [TAHAP_PEMBANGUNAN]. Jangan membuat progres lebih maju dari data referensi. Safety gear dan struktur konstruksi realistis, rasio 4:5.`,['human','product']],
['Material Konstruksi','Trust','Construction Quality Poster',`Buat visual detail material [MATERIAL_UTAMA] yang digunakan pada [NAMA_PROPERTI]. Tampilkan texture, instalasi dan craftsmanship realistis tanpa klaim kualitas yang tidak didukung, rasio 4:5.`,['product']],
['Serah Terima Kunci','Trust','Handover Poster',`Buat momen serah terima [NAMA_PROPERTI] antara agent/developer dan pembeli Indonesia. Kunci/gesture natural, properti aktual sebagai background, jangan mengarang dokumen/teks, rasio 4:5.`,['human','product']],
['Inspeksi Unit','Trust','Property Inspection Poster',`Buat inspector/agent dan pembeli memeriksa [NAMA_PROPERTI] secara profesional. Tampilkan pengecekan pintu, dinding atau detail fisik yang masuk akal, tanpa dokumen teks palsu, rasio 4:5.`,['human','product']],
['Dokumen Legal Visual','Trust','Legal Process Poster',`Buat visual proses administrasi properti [NAMA_PROPERTI] secara generik: agent dan pembeli berdiskusi dengan dokumen blank/tidak terbaca. Jangan mengarang sertifikat, nomor dokumen, logo instansi atau status legal, rasio 4:5.`,['human']],
['Fasilitas Lingkungan','Trust','Neighborhood Facility Poster',`Buat visual fasilitas aktual [FASILITAS_AKTUAL] di sekitar [NAMA_PROPERTI] berdasarkan referensi. Jangan menambah fasilitas yang tidak ada. Orang Indonesia natural, daylight, rasio 4:5.`,['human','product']],
['Unit Aktual','Trust','Actual Unit Poster',`Buat foto unit aktual [NAMA_PROPERTI] dengan styling minimal. Pertahankan semua bentuk bangunan dan finishing dari referensi; jangan melakukan virtual renovation kecuali diminta, rasio 4:5.`,['product']],
['Tim Properti','Trust','Property Team Poster',`Buat foto tim [NAMA_DEVELOPER/AGEN] Indonesia di lokasi [NAMA_PROPERTI]. Wajah unik, pose group natural, properti nyata sebagai background, tidak ada logo/ID palsu, rasio 4:5.`,['human','product']],
['Ramadhan Home','Campaign','Ramadhan Property Poster',`Buat campaign Ramadhan [NAMA_PROPERTI] dengan keluarga Indonesia di rumah dalam suasana hangat, dekorasi Islami minimal dan realistis, properti akurat, [WARNA_BRAND], rasio 4:5.`,['human','product']],
['Lebaran di Rumah Baru','Campaign','Lebaran Property Poster',`Buat visual Lebaran di [NAMA_PROPERTI] dengan keluarga Indonesia berkumpul natural. Interior/fasad sesuai referensi, festive styling secukupnya, rasio 4:5.`,['human','product']],
['New Year New Home','Campaign','New Year Property Poster',`Buat campaign Tahun Baru [NAMA_PROPERTI] dengan keluarga/pasangan Indonesia memasuki rumah, celebration accents minimal, arsitektur akurat, [WARNA_BRAND], rasio 4:5.`,['human','product']],
['Rumah untuk Keluarga Baru','Campaign','Family Property Poster',`Buat pasangan/keluarga baru Indonesia berada di [NAMA_PROPERTI] dengan aktivitas natural. Jangan mengubah desain rumah; fokus pada lifestyle yang believable, rasio 4:5.`,['human','product']],
['Rumah untuk Pasangan','Campaign','Couple Home Poster',`Buat pasangan dewasa Indonesia melihat/menata [NAMA_PROPERTI]. Interaction natural, interior akurat, soft daylight, ruang copy, rasio 4:5.`,['human','product']],
['Musim Hujan Hunian','Campaign','Rainy Season Property Poster',`Buat [NAMA_PROPERTI] pada musim hujan dengan kondisi cuaca realistis, drainase/atap hanya divisualkan sesuai yang terlihat di referensi. Jangan mengarang klaim tahan banjir, rasio 4:5.`,['product']],
['Weekend Open House','Campaign','Weekend Open House Poster',`Buat weekend open house [NAMA_PROPERTI] dengan beberapa calon pembeli Indonesia dan agent. Jumlah orang wajar, suasana natural, properti tetap akurat, ruang jadwal, rasio 4:5.`,['human','product']],
['Anniversary Developer','Campaign','Property Anniversary Poster',`Buat anniversary [NAMA_DEVELOPER] dengan tim dan [NAMA_PROPERTI] sebagai background. Jangan mengarang jumlah tahun/unit; sisakan ruang untuk data aktual, [WARNA_BRAND], rasio 4:5.`,['human','product']],
['Campaign Investasi Visual','Campaign','Investment Property Poster',`Buat campaign [NAMA_PROPERTI] untuk audiens yang mempertimbangkan investasi, menggunakan visual unit/lokasi yang akurat. Jangan menjanjikan return, kenaikan harga atau yield; sisakan area fakta aktual, rasio 4:5.`,['product']],
['Custom Property Campaign','Campaign','Brand Property Poster',`Buat key visual [NAMA_PROPERTI] berdasarkan referensi aktual, identitas [WARNA_BRAND], high-end real-estate photography, area copy untuk fakta/harga aktual, tanpa mengarang fasilitas atau klaim, rasio 4:5.`,['product']]
].forEach((x,i)=>add('PRO',i+1,P,x[1],x[2],x[0],x[3],x[4]));

if(data.length!==100) throw new Error('Expected 100 prompts, got '+data.length);

export const prompts = data;
export default prompts;
