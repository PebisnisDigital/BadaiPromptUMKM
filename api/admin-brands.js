'use strict';
// Admin-only branding management. The browser never receives the Appwrite API key.
// Every request verifies Appwrite session JWT AND confirmed membership of admin-users.
const ENDPOINT='https://sgp.cloud.appwrite.io/v1';
const PROJECT='badai-prompt-umkm',DB='badai_prompt_umkm',TABLE='marketing_clients';
const TEAM='admin-users',KEY_ENV='BRAND_ADMIN_APPWRITE_KEY';
const HEADERS={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const slugValid=v=>typeof v==='string'&&/^[a-z][a-z0-9-]{1,34}$/.test(v);
const fail=(status,message)=>Object.assign(new Error(message),{status});
function checkedUrl(raw,{allowEmpty=true}={}){
 if(raw==null||raw==='')return allowEmpty?'':null;
 if(typeof raw!=='string'||raw.length>2048)return null;
 try{
  const u=new URL(raw);
  const h=u.hostname.toLowerCase();
  if(u.protocol!=='https:'||u.username||u.password||u.port||!h.includes('.')||
     h==='localhost'||h.endsWith('.localhost')||h.endsWith('.local')||
     h==='0.0.0.0'||h==='169.254.169.254'||h==='[::1]'||
     /^(?:\d{1,3}\.){3}\d{1,3}$/.test(h)||h.startsWith('['))return null;
  return u.href;
 }catch{return null;}
}
function cleanText(x,max,required=true){
 if(typeof x!=='string')return null;
 const a=x.trim();
 return a.length<=max&&(!required||a.length>0)?a:null;
}
function normalize(payload){
 if(!payload||typeof payload!=='object'||Array.isArray(payload))throw fail(400,'Data brand tidak valid.');
 const slug=payload.slug;
 if(!slugValid(slug))throw fail(400,'Kode brand: gunakan huruf kecil, angka, tanda hubung (2–35 karakter).');
 const name=cleanText(payload.brand_name,128);
 const accent=cleanText(payload.accent_color,7);
 const offerTitle=cleanText(payload.offer_title,200);
 const offerText=cleanText(payload.offer_text,1000);
 const ctaLabel=cleanText(payload.cta_label,80);
 if(name==null||!/^#[0-9a-fA-F]{6}$/.test(accent||'')||offerTitle==null||offerText==null||ctaLabel==null)
  throw fail(400,'Nama, warna, judul penawaran, deskripsi, dan tombol CTA wajib benar.');
 const logo=checkedUrl(payload.logo_url);
 const checkout=checkedUrl(payload.checkout_url);
 if(logo===null||checkout===null)throw fail(400,'Logo dan checkout harus menggunakan URL HTTPS publik yang valid.');
 if(typeof payload.cta_enabled!=='boolean'||typeof payload.is_active!=='boolean')
  throw fail(400,'Status brand dan tombol checkout harus benar.');
 if(payload.cta_enabled&&!checkout)throw fail(400,'Masukkan URL checkout resmi sebelum mengaktifkan tombol beli.');
 return {slug,brand_name:name,accent_color:accent,logo_url:logo,
  offer_title:offerTitle,offer_text:offerText,cta_label:ctaLabel,
  checkout_url:checkout,cta_enabled:payload.cta_enabled,is_active:payload.is_active};
}
function adminHeaders(){const key=process.env[KEY_ENV];if(!key)throw fail(503,'Koneksi admin brand belum dikonfigurasi.');return {'X-Appwrite-Project':PROJECT,'X-Appwrite-Key':key,'Content-Type':'application/json','Accept':'application/json'};}
async function fetchJson(url,opts={}){
 let response;
 try{response=await fetch(url,{...opts,signal:AbortSignal.timeout(9000)})}
 catch{throw fail(503,'Koneksi Appwrite sedang terganggu.')}
 let data={};try{data=await response.json()}catch{}
 if(!response.ok)throw fail(response.status>=500?503:response.status,
  response.status===401||response.status===403?'Akses tidak diizinkan.':response.status===409?'Kode brand sudah digunakan.':response.status===404?'Brand tidak ditemukan.':'Operasi Appwrite gagal.');
 return data;
}
const api=p=>ENDPOINT+p;
function rowsUrl(id=''){
 const base='/tablesdb/'+encodeURIComponent(DB)+'/tables/'+encodeURIComponent(TABLE)+'/rows';
 return api(base+(id?'/'+encodeURIComponent(id):''));
}
async function verifyAdmin(token){
 if(typeof token!=='string'||token.length<32||token.length>8192||!/^[A-Za-z0-9._-]+$/.test(token))throw fail(401,'Silakan login ulang sebagai admin.');
 const session=await fetchJson(api('/account'),{headers:{'X-Appwrite-Project':PROJECT,'X-Appwrite-JWT':token,'Accept':'application/json'}});
 if(!session.$id||typeof session.$id!=='string')throw fail(401,'Sesi admin tidak valid.');
 const u=new URL(api('/teams/'+TEAM+'/memberships'));
 // The access key can read memberships, but we check identity and confirmation strictly.
 u.searchParams.append('queries[]',JSON.stringify({method:'equal',attribute:'userId',values:[session.$id]}));
 u.searchParams.append('queries[]',JSON.stringify({method:'limit',values:[100]}));
 const data=await fetchJson(u,{headers:adminHeaders()});
 if(!Array.isArray(data.memberships)||!data.memberships.some(m=>
    m.userId===session.$id&&m.teamId===TEAM&&m.confirm===true
 ))throw fail(403,'Akun ini bukan anggota admin PROMPTIONAL yang terverifikasi.');
 return session.$id;
}
function bodyInput(req){
 if(!req.body)return {};
 if(typeof req.body==='string'){if(req.body.length>12000)throw fail(413,'Data terlalu besar.');try{return JSON.parse(req.body)}catch{throw fail(400,'Format JSON tidak valid.');}}
 return req.body;
}
async function handler(req,res){
 for(const [name,value] of Object.entries(HEADERS))res.setHeader(name,value);
 if(req.method!=='POST')return res.status(405).json({error:'Metode tidak diizinkan.'});
 try{
  const auth=String(req.headers?.authorization||'');
  if(!auth.startsWith('Bearer '))throw fail(401,'Silakan login sebagai admin.');
  await verifyAdmin(auth.slice(7));
  const body=bodyInput(req);
  if(body.action==='list'){
   let rows=[];
   for(let offset=0;offset<1000;offset+=100){
    const u=new URL(rowsUrl());
    u.searchParams.append('queries[]',JSON.stringify({method:'limit',values:[100]}));
    u.searchParams.append('queries[]',JSON.stringify({method:'offset',values:[offset]}));
    const data=await fetchJson(u,{headers:adminHeaders()});
    const part=Array.isArray(data.rows)?data.rows:[];
    rows.push(...part.map(x=>({...x.data,...x})).map(x=>({
     slug:x.slug,brand_name:x.brand_name,accent_color:x.accent_color,
     logo_url:x.logo_url||'',offer_title:x.offer_title,offer_text:x.offer_text,cta_label:x.cta_label,
     checkout_url:x.checkout_url||'',cta_enabled:x.cta_enabled===true,is_active:x.is_active===true
    })));
    if(part.length<100)break;
   }
   rows.sort((a,b)=>String(a.slug).localeCompare(String(b.slug)));
   return res.status(200).json({ok:true,rows});
  }
  if(body.action==='save'){
   const data=normalize(body.brand);
   const existing=body.existing_slug;
   if(existing!==null&&existing!==undefined&&existing!==''&&existing!==data.slug)
    throw fail(400,'Kode brand tidak dapat diganti setelah dibuat. Buat brand baru agar link lama tidak berubah.');
   const update=typeof existing==='string'&&existing.length>0;
   await fetchJson(rowsUrl(update?existing:''),{
    method:update?'PATCH':'POST',
    headers:adminHeaders(),
    body:JSON.stringify(update?{data}:{rowId:data.slug,data,permissions:[]})
   });
   return res.status(200).json({ok:true,slug:data.slug,created:!update});
  }
  throw fail(400,'Aksi tidak tersedia.');
 }catch(error){
  const status=Number(error.status)||500;
  if(status>=500)console.error('admin brands API',error.message||'unknown');
  return res.status([400,401,403,404,405,409,413,503].includes(status)?status:500).json({error:status>=500?'Layanan Admin Brand sedang tidak tersedia.':error.message});
 }
}
module.exports=handler;
module.exports._test={slugValid,checkedUrl,normalize,verifyAdmin,bodyInput,rowsUrl};
