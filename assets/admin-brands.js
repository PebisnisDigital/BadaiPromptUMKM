(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 const view=$('v-brands');if(!view)return;
 const F={
  slug:$('brandSlug'),name:$('brandName'),accent:$('brandAccent'),picker:$('brandAccentPicker'),
  logo:$('brandLogo'),title:$('brandOfferTitle'),offer:$('brandOfferText'),
  checkout:$('brandCheckout'),cta:$('brandCtaLabel'),enabled:$('brandCtaEnabled'),active:$('brandIsActive')
 };
 let rows=[],activeSlug='',busy=false;
 const publicOrigin='https://promptional-gratis.vercel.app';
 const validSlug=v=>/^[a-z][a-z0-9-]{1,34}$/.test(v);
 const urlOk=v=>{try{const u=new URL(v);return u.protocol==='https:'&&!!u.hostname.includes('.')&&!u.username&&!u.password&&!u.port}catch{return false}};
 function inform(text,kind=''){
  const e=$('brandMessage');e.textContent=text;e.className='brand-message'+(kind?' '+kind:'');
 }
 function setBusy(on){busy=on;view.querySelectorAll('button').forEach(b=>{b.disabled=on});$('brandSave').textContent=on?'MENYIMPAN…':activeSlug?'SIMPAN PERUBAHAN':'SIMPAN BRAND'}
 async function api(action,params={}){
  if(!window.Appwrite||typeof account?.createJWT!=='function')throw Error('Login admin tidak tersedia.');
  const jwt=await account.createJWT();
  if(!jwt?.jwt)throw Error('Sesi admin kedaluwarsa. Silakan login ulang.');
  const resp=await fetch('/api/public-previews?admin_brands=1',{method:'POST',credentials:'same-origin',
   headers:{'content-type':'application/json','authorization':'Bearer '+jwt.jwt},
   body:JSON.stringify({action,...params}),cache:'no-store'});
  const body=await resp.json().catch(()=>({}));
  if(!resp.ok||body.ok!==true)throw Error(body.error||'Operasi Admin Brand gagal.');
  return body;
 }
 function itemEl(tag,cls,txt){
  const el=document.createElement(tag);
  if(cls)el.className=cls;
  if(txt!==undefined)el.textContent=txt;
  return el;
 }
 function stat(){
  $('brandTotal').textContent=rows.length;
  $('brandActive').textContent=rows.filter(r=>r.is_active===true).length;
  $('brandUpsell').textContent=rows.filter(r=>r.is_active===true&&r.cta_enabled===true&&r.checkout_url).length;
 }
 function renderList(){
  const root=$('brandList');
  root.replaceChildren();
  const q=$('brandSearch').value.trim().toLowerCase();
  const found=rows.filter(r=>(String(r.brand_name)+' '+String(r.slug)).toLowerCase().includes(q));
  if(!found.length){
   root.append(itemEl('p','brand-hint',rows.length?'Tidak ada brand yang cocok.':'Belum ada brand. Klik + Brand Baru.'));
   return;
  }
  found.forEach(r=>{
   const card=itemEl('article','brand-card'),head=itemEl('div','brand-cardhead');
   if(r.logo_url&&urlOk(r.logo_url)){
    const img=itemEl('img','brand-avatar');img.src=r.logo_url;img.loading='lazy';img.alt='Logo '+r.brand_name;
    img.referrerPolicy='no-referrer';head.append(img);
   }else head.append(itemEl('div','brand-avatar-default',(r.brand_name||'B').charAt(0).toUpperCase()));
   const info=itemEl('div','brand-cardtext');info.append(itemEl('strong','',r.brand_name),itemEl('small','',r.slug));
   head.append(info);
   const pills=itemEl('div','brand-pills');
   pills.append(itemEl('span','brand-pill '+(r.is_active?'good':'warn'),r.is_active?'AKTIF':'NONAKTIF'));
   pills.append(itemEl('span','brand-pill '+(r.cta_enabled?'good':'warn'),r.cta_enabled?'UPSELLING ON':'UPSELLING OFF'));
   const actions=itemEl('div','brand-cardactions');
   const edit=itemEl('button','','EDIT BRAND');edit.type='button';edit.addEventListener('click',()=>editRow(r));
   const open=itemEl('a','','LIHAT HALAMAN ↗');open.href=publicOrigin+'/c/'+encodeURIComponent(r.slug)+'/p/BP033';open.target='_blank';open.rel='noopener noreferrer';
   actions.append(edit,open);card.append(head,pills,actions);root.append(card);
  });
 }
 function preview(){
  const c=/^#[0-9a-fA-F]{6}$/.test(F.accent.value)?F.accent.value:'#ff852a';
  view.style.setProperty('--brand-accent',c);
  $('brandPreviewName').textContent=F.name.value.trim()||'NAMA BRAND';
  $('brandPreviewOffer').textContent=F.title.value.trim()||'Penawaran produkmu muncul di sini';
  const cta=$('brandPreviewCta');
  cta.textContent=(F.cta.value.trim()||'BELI SEKARANG')+' ↗';
  cta.classList.toggle('off',!F.enabled.checked||!F.active.checked);
  $('brandPreviewSymbol').textContent=(F.name.value.trim()||'P').charAt(0).toUpperCase();
  $('brandOpen').hidden=!activeSlug;
  if(activeSlug)$('brandOpen').href=publicOrigin+'/c/'+encodeURIComponent(activeSlug)+'/p/BP033';
 }
 function reset(){
  activeSlug='';$('brandForm').reset();
  F.slug.readOnly=false;
  $('brandFormTitle').textContent='Tambah Brand Baru';
  F.accent.value=F.picker.value='#ff852a';
  F.cta.value='BELI SEKARANG';F.active.checked=true;F.enabled.checked=false;
  $('brandSave').textContent='SIMPAN BRAND';$('brandOpen').hidden=true;
  inform('Tambahkan brand baru. Link checkout akan tetap nonaktif sampai diizinkan.');
  preview();
 }
 function editRow(r){
  activeSlug=r.slug;
  F.slug.value=r.slug;F.slug.readOnly=true;
  F.name.value=r.brand_name||'';
  F.accent.value=F.picker.value=r.accent_color||'#ff852a';
  F.logo.value=r.logo_url||'';
  F.title.value=r.offer_title||'';
  F.offer.value=r.offer_text||'';
  F.checkout.value=r.checkout_url||'';
  F.cta.value=r.cta_label||'BELI SEKARANG';
  F.enabled.checked=r.cta_enabled===true;
  F.active.checked=r.is_active===true;
  $('brandFormTitle').textContent='Edit Brand — '+r.brand_name;
  $('brandSave').textContent='SIMPAN PERUBAHAN';
  inform('URL brand sudah tetap. Mengubah penawaran tidak mengganti link 185 prompt.');
  preview();
  $('brandForm').scrollIntoView({behavior:'smooth',block:'start'});
 }
 async function load(){
  if(busy)return;
  setBusy(true);
  inform('Mengambil daftar brand dari Appwrite…');
  try{
   const data=await api('list');
   rows=(data.rows||[]).filter(r=>r&&validSlug(r.slug));
   stat();renderList();inform('Data brand terbaru berhasil dimuat.','good');
  }catch(e){inform(e.message||'Gagal memuat data brand.','bad')}
  finally{setBusy(false)}
 }
 async function save(e){
  e.preventDefault();if(busy)return;
  const slug=F.slug.value.trim().toLowerCase();
  if(!validSlug(slug)){inform('Kode brand harus huruf kecil/angka/tanda hubung, 2–35 karakter.','bad');F.slug.focus();return;}
  if(activeSlug&&activeSlug!==slug){inform('Kode brand tidak boleh diganti setelah dibuat.','bad');return;}
  if(!/^#[0-9a-fA-F]{6}$/.test(F.accent.value)){inform('Warna harus format #RRGGBB.','bad');return;}
  if(F.enabled.checked&&!urlOk(F.checkout.value.trim())){inform('Aktifkan upselling hanya setelah memasukkan link checkout HTTPS resmi.','bad');F.checkout.focus();return;}
  const data={
   slug,brand_name:F.name.value.trim(),accent_color:F.accent.value.trim(),
   logo_url:F.logo.value.trim(),offer_title:F.title.value.trim(),offer_text:F.offer.value.trim(),
   checkout_url:F.checkout.value.trim(),cta_label:F.cta.value.trim(),
   cta_enabled:F.enabled.checked,is_active:F.active.checked
  };
  if(!data.brand_name||!data.offer_title||!data.offer_text||!data.cta_label){inform('Isi semua kolom yang wajib diisi.','bad');return;}
  if(!data.is_active&&activeSlug&&!window.confirm('Nonaktifkan brand ini? Seluruh halaman prompt brand akan menjadi tidak tersedia.'))return;
  setBusy(true);inform('Menyimpan pengaturan brand…');
  try{
   await api('save',{brand:data,existing_slug:activeSlug||null});
   const response=await api('list');
   rows=response.rows||[];activeSlug=slug;stat();renderList();
   editRow(rows.find(r=>r.slug===slug)||data);
   inform('Berhasil disimpan! Perubahan halaman publik biasanya terlihat dalam 1–2 menit.','good');
  }catch(err){inform(err.message||'Gagal menyimpan brand.','bad')}
  finally{setBusy(false)}
 }
 $('brandAdd').addEventListener('click',()=>{reset();$('brandForm').scrollIntoView({behavior:'smooth',block:'start'})});
 $('brandCancel').addEventListener('click',reset);
 $('brandRefresh').addEventListener('click',load);
 $('brandSearch').addEventListener('input',renderList);
 $('brandForm').addEventListener('submit',save);
 F.picker.addEventListener('input',()=>{F.accent.value=F.picker.value;preview()});
 F.accent.addEventListener('input',()=>{if(/^#[0-9a-fA-F]{6}$/.test(F.accent.value))F.picker.value=F.accent.value;preview()});
 for(const field of Object.values(F))field.addEventListener('input',preview);
 F.enabled.addEventListener('change',preview);F.active.addEventListener('change',preview);
 const link=document.querySelector('#nav [data-view="brands"]');
 if(link)link.addEventListener('click',()=>{if(!rows.length)void load()});
 reset();
})();
