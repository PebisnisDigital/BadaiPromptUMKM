'use strict';
// PROMPTIONAL GRATIS — server-rendered public prompts with live Appwrite rows.
// Browser makes NO API/fetch request. Appwrite token is used exclusively server-side.
// Only BP001–BP185 published rows are eligible, as approved by the owner.
const APPWRITE_ENDPOINT='https://sgp.cloud.appwrite.io/v1';
const APPWRITE_PROJECT='badai-prompt-umkm';
const APPWRITE_DATABASE='badai_prompt_umkm';
const APPWRITE_TABLE='scene_prompts';
const CLIENT_TABLE='marketing_clients';
const BPS=185;
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cleanBP=s=>/^BP\d{3}$/.test(String(s||''))&&Number(s.slice(2))>=1&&Number(s.slice(2))<=BPS?s:null;
const cleanTenant=s=>typeof s==='string'&&/^[a-z][a-z0-9-]{1,34}$/.test(s)?s:null;
function imageUrl(s){
 if(typeof s!=='string'||!/^https:\/\//i.test(s))return '';
 try{
   const u=new URL(s);
   return ['dropbox.com','www.dropbox.com','sgp.cloud.appwrite.io','i.ibb.co'].includes(u.hostname)&&!u.username&&!u.password?u.href:'';
 }catch{return '';}
}
function securePublicUrl(s){
 if(typeof s!=='string'||s.length>2048||!s)return '';
 try {
  const u=new URL(s);
  const host=u.hostname.toLowerCase();
  if(u.protocol!=='https:'||u.username||u.password||!host.includes('.')||host==='localhost'||
     host.endsWith('.localhost')||host.endsWith('.local')||host==='127.0.0.1'||
     host==='0.0.0.0'||host==='169.254.169.254'||host==='[::1]'||
     /^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\.|^127\./.test(host))return '';
  return u.href;
 }catch{return '';}
}
function appwriteHeaders(){
 if(!process.env.APPWRITE_RO_KEY)throw new Error('Appwrite read-only credential missing');
 return {'X-Appwrite-Project':APPWRITE_PROJECT,'X-Appwrite-Key':process.env.APPWRITE_RO_KEY,'Accept':'application/json'};
}
async function getTenant(slug) {
 if(!cleanTenant(slug))return null;
 const endpoint=APPWRITE_ENDPOINT+'/tablesdb/'+encodeURIComponent(APPWRITE_DATABASE)+'/tables/'+
  encodeURIComponent(CLIENT_TABLE)+'/rows/'+encodeURIComponent(slug);
 const res=await fetch(endpoint,{method:'GET',headers:appwriteHeaders(),signal:AbortSignal.timeout(8000)});
 if(res.status===404)return null;
 if(!res.ok){const e=new Error('Client configuration read failed');e.status=res.status;throw e;}
 const data=await res.json(),r={...data,...(data.data||{})};
 if((r.$id&&r.$id!==slug)||r.slug!==slug||r.is_active!==true)return null;
 const name=String(r.brand_name||'').trim().slice(0,128);
 if(!name)return null;
 const accent=/^#[0-9a-fA-F]{6}$/.test(String(r.accent_color))?r.accent_color:'#141415';
 const checkoutUrl=securePublicUrl(r.checkout_url);
 const logoUrl=securePublicUrl(r.logo_url);
 return {slug,name,accent,logoUrl,
  offer:String(r.offer_title||'Lihat Pilihan Prompt Lainnya').slice(0,200),
  offerText:String(r.offer_text||'').slice(0,1000),
  ctaLabel:String(r.cta_label||'LIHAT PAKET').slice(0,80),
  checkoutUrl:r.cta_enabled===true?checkoutUrl:''
 };
}
function query(method,params){
 return JSON.stringify({method,...params});
}
async function getRows(queries){
 if(!process.env.APPWRITE_RO_KEY)throw new Error('Appwrite read-only credential missing');
 const base=APPWRITE_ENDPOINT+'/tablesdb/'+encodeURIComponent(APPWRITE_DATABASE)+'/tables/'+encodeURIComponent(APPWRITE_TABLE)+'/rows';
 const u=new URL(base);
 queries.forEach(q=>u.searchParams.append('queries[]',q));
 const response=await fetch(u,{method:'GET',headers:appwriteHeaders(),signal:AbortSignal.timeout(8000)});
 if(!response.ok){
  const error=new Error('Appwrite query failed');
  error.status=response.status;
  throw error;
 }
 const data=await response.json();
 if(!Array.isArray(data.rows))throw new Error('Appwrite result invalid');
 return data.rows.map(x=>({...x,...(x.data||{})}));
}
async function getPrompt(code){
 const rows=await getRows([query('equal',{attribute:'title',values:[code]}),
  query('equal',{attribute:'is_published',values:[true]}),query('limit',{values:[1]})]);
 const r=rows[0];
 if(!r||r.title!==code||r.is_published!==true||typeof r.prompt_text!=='string'||!r.prompt_text.trim())return null;
 return {code,title:String(r.subcategory||code).slice(0,180),category:String(r.category||'Prompt AI').slice(0,80),
  prompt:r.prompt_text,image:imageUrl(r.preview_url)||imageUrl(r.preview_file_id?
    APPWRITE_ENDPOINT+'/storage/buckets/prompt-previews/files/'+encodeURIComponent(r.preview_file_id)+'/view?project='+APPWRITE_PROJECT:''),
  images:[r.preview_url_2,r.preview_url_3,r.preview_url_4].map(imageUrl).filter(Boolean),
  needsReference:!!r.needs_reference};
}
async function getCatalog(){
 const common=[query('equal',{attribute:'is_published',values:[true]}),query('orderAsc',{attribute:'sort_order'})];
 const [a,b]=await Promise.all([
 getRows([...common,query('limit',{values:[100]}),query('offset',{values:[0]})]),
 getRows([...common,query('limit',{values:[100]}),query('offset',{values:[100]})])
 ]);
 return [...a,...b].filter(x=>cleanBP(x.title)&&x.is_published===true)
  .map(x=>({code:x.title,title:String(x.subcategory||x.title).slice(0,180),
   category:String(x.category||'Prompt AI').slice(0,80)}));
}
const css=String.raw`:root{--accent:#e94b91;--ink:#131315;--muted:#6d7077;--line:#e9e9ec;color-scheme:light;font-family:Inter,"Segoe UI",Arial,sans-serif}
*{box-sizing:border-box}html{background:#f4f4f5}body{margin:0;color:var(--ink)}
.wrap{max-width:660px;min-height:100vh;margin:0 auto;background:white;padding:0 23px;box-shadow:0 6px 32px #00000009}
header{display:flex;align-items:center;gap:12px;padding:19px 0;border-bottom:1px solid var(--line)}
.logo{height:43px;width:43px;border-radius:13px;display:grid;place-items:center;background:#121213;color:white;font-size:25px;font-weight:900}
.brand{flex:1}.brand strong{font-size:15px;letter-spacing:.03em}.brand small{display:block;font-size:11px;color:var(--muted);margin-top:3px}
.mode{border:1px solid var(--line);padding:6px 8px;font-weight:800;font-size:10px;border-radius:20px}
main{padding:31px 0 42px}.eyebrow{color:var(--accent);font-size:11px;letter-spacing:.1em;font-weight:850;text-transform:uppercase}
h1{font-size:clamp(30px,7.6vw,45px);letter-spacing:-.055em;line-height:1.1;margin:13px 0 12px}
.intro{color:var(--muted);line-height:1.7;font-size:14px;margin:0 0 24px}
figure{padding:0;margin:0 0 20px}.cover{width:100%;max-height:600px;min-height:180px;border-radius:17px;object-fit:contain;background:#f6f6f7;border:1px solid var(--line);display:block}
figcaption{font-size:11px;color:var(--muted);margin-top:8px}
.gallery{display:flex;gap:8px;overflow-x:auto;margin:0 0 25px}.gallery img{width:90px;height:90px;object-fit:cover;border-radius:10px;border:1px solid var(--line)}
.panel{border:1px solid var(--line);border-radius:18px;padding:21px 17px}.topline{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:15px}
h2{font-size:21px;margin:0;letter-spacing:-.035em}.tag{color:var(--accent);font-size:10px;font-weight:900;letter-spacing:.08em}
pre{white-space:pre-wrap;overflow-wrap:anywhere;color:#34343a;background:#f8f8f9;border:1px solid #ededf0;border-radius:12px;padding:17px;margin:0 0 12px;font:13px/1.75 "Segoe UI",sans-serif}
button,.sales{font:inherit;font-weight:900;letter-spacing:.045em;display:flex;justify-content:center;align-items:center;min-height:53px;padding:13px 17px;width:100%;cursor:pointer;border-radius:12px;text-decoration:none;font-size:13px}
button{border:0;color:white;background:#141415}.sales{background:var(--accent);color:white}.note{font-size:12px;color:#595963;line-height:1.7;margin:13px 0 0}
#copy-status{color:#178551;font-size:12px;margin-top:9px;min-height:16px}
.offer{border-radius:18px;background:#f7f7f8;margin-top:23px;padding:23px 20px}.offer h2{margin:11px 0}.offer p{color:var(--muted);font-size:13px;line-height:1.7}.logo-img{object-fit:contain;background:white;border:1px solid var(--line)}
.disabled-cta{display:block;border-radius:12px;border:1px solid #dddde1;text-align:center;font-weight:800;padding:15px;color:#96969c;font-size:12px}
.search-label{font-size:12px;color:var(--muted);font-weight:700;display:block;margin:0 0 7px}
#catalog-search{width:100%;border:1px solid #dbdbe0;border-radius:12px;padding:13px 15px;font-size:15px;outline-offset:3px}
.catalog-count{font-size:12px;color:var(--muted);margin:14px 0}.catalog-items{display:grid;gap:8px;margin-bottom:18px}
.catalog-item{border:1px solid var(--line);border-radius:12px;display:block;padding:13px 15px;text-decoration:none;color:var(--ink)}
.catalog-item:hover{border-color:var(--accent)}.catalog-code{color:var(--accent);font-weight:900;font-size:11px;margin-bottom:5px;letter-spacing:.07em}
.catalog-title{font-size:14px;font-weight:750;line-height:1.35}.catalog-category{color:var(--muted);font-size:11px;margin-top:5px}
footer{border-top:1px solid var(--line);padding:25px 0 36px;text-align:center;color:var(--muted);font-size:11px}
@media(max-width:480px){.wrap{padding:0 17px}main{padding-top:25px}.panel{padding:17px 13px}pre{padding:13px}}`;
function shell({tenant,title,content}){
 return '<!doctype html><html lang="id"><head><meta charset="utf-8">'+
 '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'+
 '<meta name="robots" content="noindex,nofollow,noarchive"><meta name="theme-color" content="#111113">'+
 '<meta name="referrer" content="no-referrer"><title>'+escape(title)+' | PROMPTIONAL GRATIS</title>'+
 '<style>'+css+'</style></head><body><div class="wrap"><header>'+
 ''+(tenant?.logoUrl?'<img class="logo logo-img" src="'+escape(tenant.logoUrl)+'" alt="Logo '+escape(tenant.name)+'" referrerpolicy="no-referrer">':'<span class="logo" aria-hidden="true">P</span>')+'<span class="brand"><strong>'+
 escape(tenant?.name||'PROMPTIONAL')+'</strong><small>Prompt AI Siap Salin</small></span>'+
 '<span class="mode">PROMPT GRATIS</span></header><main>'+content+'</main>'+
 '<footer>Powered by <strong>PROMPTIONAL</strong> · Materi yang dibagikan gratis.</footer></div></body></html>';
}
function renderPrompt({tenant,row}){
 const visuals=row.images.length?'<div class="gallery">'+row.images.map(x=>'<img src="'+escape(x)+'" alt="Variasi gambar '+escape(row.code)+'" loading="lazy">').join('')+'</div>':'';
 const cover=row.image?'<figure><img class="cover" src="'+escape(row.image)+'" alt="Contoh visual '+escape(row.code)+'" loading="eager" referrerpolicy="no-referrer"><figcaption>Contoh visual dari katalog PROMPTIONAL.</figcaption></figure>':'';
 const body='<div class="eyebrow">'+escape(row.code)+' / '+escape(row.category)+'</div>'+
 '<h1>'+escape(row.title)+'</h1><p class="intro">Gunakan gambar sebagai inspirasi, lalu salin prompt aslinya secara lengkap.</p>'+
 cover+visuals+'<section class="panel"><div class="topline"><h2>Prompt Lengkap</h2><span class="tag">SIAP SALIN</span></div>'+
 '<pre id="prompt" tabindex="0">'+escape(row.prompt)+'</pre>'+
 '<button id="copy" type="button">SALIN PROMPT ↗</button><div id="copy-status" role="status" aria-live="polite"></div>'+
 (row.needsReference?'<p class="note">Tip: Prompt ini membutuhkan foto referensi. Gunakan foto yang memang berhak kamu pakai.</p>':'')+
 '</section><section class="offer"><div class="eyebrow">IDE SELANJUTNYA</div><h2>'+escape(tenant.offer)+'</h2><p>'+escape(tenant.offerText)+'</p>'+
 (tenant.checkoutUrl?'<a class="sales" href="'+escape(tenant.checkoutUrl)+'" target="_blank" rel="noopener noreferrer">'+escape(tenant.ctaLabel)+' ↗</a>':'<span class="disabled-cta">Paket premium belum diaktifkan untuk brand ini.</span>')+'</section>'+
 '<script>(function(){var b=document.getElementById("copy");b.addEventListener("click",async function(){'+
 'var t=document.getElementById("prompt").textContent;var s=document.getElementById("copy-status");'+
 'try{if(navigator.clipboard&&navigator.clipboard.writeText)await navigator.clipboard.writeText(t);'+
 'else{var x=document.createElement("textarea");x.value=t;x.style.position="fixed";x.style.left="-9999px";'+
 'document.body.appendChild(x);x.select();if(!document.execCommand("copy"))throw Error("copy");x.remove();}'+
 's.textContent="Prompt lengkap berhasil disalin!";}catch(e){s.textContent="Gagal menyalin otomatis. Tekan lama teks prompt untuk menyalin.";}'+
 '});})();</script>';
 return shell({tenant,title:row.title,content:body}).replace('<style>'+css+'</style>','<style>'+css+'</style><style>:root{--accent:'+tenant.accent+'}</style>');
}
function renderCatalog({entries,tenant}){
 const cards=entries.map(x=>'<a class="catalog-item" href="/c/'+tenant.slug+'/p/'+escape(x.code)+'" '+
 'data-search="'+escape((x.code+' '+x.title+' '+x.category).toLowerCase())+'">'+
 '<div class="catalog-code">'+escape(x.code)+'</div><div class="catalog-title">'+escape(x.title)+'</div>'+
 '<div class="catalog-category">'+escape(x.category)+'</div></a>').join('');
 const body='<div class="eyebrow">KATALOG PROMPT GRATIS</div><h1>'+entries.length+' Prompt AI Gratis</h1>'+
 '<p class="intro">Pilih prompt yang ingin kamu coba. Semuanya bisa langsung disalin tanpa login.</p>'+
 '<label for="catalog-search" class="search-label">Cari kode, judul, atau kategori</label>'+
 '<input id="catalog-search" type="search" placeholder="Contoh: BP033 atau Burger" autocomplete="off">'+
 '<div class="catalog-count" id="catalog-count">'+entries.length+' prompt ditemukan</div>'+
 '<div class="catalog-items" id="catalog-items">'+cards+'</div>'+
 '<script>(function(){var input=document.getElementById("catalog-search"),cards=[...document.querySelectorAll(".catalog-item")];'+
 'input.addEventListener("input",function(){var v=input.value.toLowerCase().trim(),n=0;'+
 'cards.forEach(function(c){var show=!v||c.getAttribute("data-search").includes(v);c.hidden=!show;if(show)n++;});'+
 'document.getElementById("catalog-count").textContent=n+" prompt ditemukan";});})();</script>'+
 '<style>.catalog-item[hidden]{display:none}</style>';
 return shell({tenant,title:'Katalog Prompt AI Gratis',content:body}).replace('<style>'+css+'</style>','<style>'+css+'</style><style>:root{--accent:'+tenant.accent+'}</style>');
}
function renderMessage(status,title,message){
 return shell({title,content:'<h1>'+escape(title)+'</h1><p class="intro">'+escape(message)+'</p>'+
 '<a href="/" class="catalog-item">Kembali ke katalog prompt gratis</a>'});
}
module.exports=async function handler(req,res){
 res.setHeader('Content-Type','text/html; charset=utf-8');
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('X-Robots-Tag','noindex, nofollow, noarchive');
 res.setHeader('Referrer-Policy','no-referrer');
 if(req.method!=='GET'&&req.method!=='HEAD')return res.status(405).end('Metode tidak diizinkan');
 const catalog=req.query?.catalog==='1'||(!req.query?.bp&&!req.query?.client);
 const slug=cleanTenant(req.query?.client||'demo-rose');
 const code=catalog?null:cleanBP(req.query?.bp);
 if(!slug||(!catalog&&!code)){
   res.setHeader('Cache-Control','public, s-maxage=60');
   return res.status(404).end(renderMessage(404,'Halaman belum tersedia','Kode prompt atau brand tidak tersedia.'));
 }
 try{
  const tenant=await getTenant(slug);
  if(!tenant){res.setHeader('Cache-Control','public, s-maxage=30');return res.status(404).end(renderMessage(404,'Brand tidak tersedia','Brand tidak ditemukan atau belum aktif.'));}
  if(catalog){
   const entries=await getCatalog();
   res.setHeader('Cache-Control','public, s-maxage=60, stale-while-revalidate=60');
   return res.status(200).end(renderCatalog({entries,tenant}));
  }
  const row=await getPrompt(code);
  if(!row){
    res.setHeader('Cache-Control','public, s-maxage=30');
    return res.status(404).end(renderMessage(404,'Prompt belum tersedia','Prompt belum diterbitkan atau sudah dinonaktifkan.'));
  }
  res.setHeader('Cache-Control','public, s-maxage=60, stale-while-revalidate=60');
  return res.status(200).end(renderPrompt({tenant,row}));
 }catch(e){
  console.error('PROMPTIONAL public sync read unavailable',String(e?.status||e?.name||'unknown'));
  res.setHeader('Cache-Control','no-store');
  return res.status(503).end(renderMessage(503,'Konten sedang diperbarui','Silakan coba lagi beberapa saat. Tidak ada login yang diperlukan.'));
 }
};
module.exports._internal={cleanBP,cleanTenant,imageUrl,securePublicUrl,getTenant,getPrompt,getCatalog,renderPrompt,renderCatalog,renderMessage,escape};
