/* PROMPTIONAL private curation pipeline — secure Appwrite admin-team table.
   AI briefing is clipboard-based; no external scraping/generation is claimed. */
(()=>{
'use strict';
const TABLE_REF='curation_refs',LIBRARY='scene_prompts',BATCH=100,LIMIT=50;
const el=id=>document.getElementById(id);
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rowDataCur=row=>({...row,...(row.data||{}),$id:row.$id||row.data?.$id});
const state={tab:'published',page:0,rows:[],total:0,loading:false,selected:null,queue:[],importing:false};
const stages={reference:'Referensi',curation:'Kurasi',review:'Review',published:'Terbit',rejected:'Arsip'};
const licLabels={unknown:'Izin belum jelas',inspiration:'Inspirasi konsep',authorized:'Berizin',original:'Karya sendiri'};
const qs=[['quality_visual','curScoreVisual',35],['quality_hook','curScoreHook',30],['quality_value','curScoreValue',25],['quality_easy','curScoreEasy',10]];
const clean=s=>String(s??'').trim();
const urlValue=s=>{const v=clean(s);if(!v)return null;const u=new URL(v);if(u.protocol!=='https:')throw Error('Gunakan URL HTTPS untuk sumber dan preview.');return u.href};
const trim=(v,max)=>clean(v).slice(0,max);
const announcement=(target,msg,type='')=>{const node=el(target);if(node){node.textContent=msg;node.className='cur-status '+type}};
const refRows=r=>(r.rows||r.documents||[]).map(rowDataCur);
const digest=async x=>{
 const bytes=new TextEncoder().encode(x);
 const hash=await crypto.subtle.digest('SHA-256',bytes);
 return [...new Uint8Array(hash)].map(v=>v.toString(16).padStart(2,'0')).join('');
};
async function fingerprint(row){
 const normalized=(x)=>clean(x).normalize('NFKC').replace(/\s+/g,' ').toLowerCase();
 if(!clean(row.title)||!clean(row.category))throw Error('Judul dan kategori wajib diisi.');
 if(!clean(row.reference_prompt)&&!clean(row.source_url))throw Error('Isi URL sumber atau ringkasan referensi agar dapat diperiksa.');
 return digest([normalized(row.title),normalized(row.source_url),normalized(row.reference_prompt)].join('\u001f'));
}
const scoreVals=()=>{
 const values={},total=qs.reduce((sum,[key,id,max])=>{
  const v=Number(el(id).value||0);
  if(!Number.isInteger(v)||v<0||v>max)throw Error('Nilai '+max+' harus berupa bilangan 0–'+max+'.');
  values[key]=v;return sum+v;
 },0);return {...values,score:total};
};
const showScore=()=>{try{el('curTotalScore').textContent=scoreVals().score+' / 100'}catch{el('curTotalScore').textContent='Skor tidak valid'}};
function updatePreview(){
 const box=el('curPreviewBox'),img=el('curPreviewImage'),status=el('curPreviewStatus');
 let url=null;
 try{url=urlValue(el('curPreview').value)}catch(e){box.hidden=false;img.removeAttribute('src');status.textContent=e.message;return}
 if(!url){box.hidden=true;img.removeAttribute('src');return}
 box.hidden=false;status.textContent='Memuat gambar…';
 img.onload=()=>{status.textContent='Gambar terlihat. Periksa anatomi, teks, tekstur dan pencahayaan sebelum review.'};
 img.onerror=()=>{status.textContent='Gambar tidak dapat ditampilkan. Perbaiki URL sebelum terbit.'};
 if(img.src!==url)img.src=url;
}
el('curPreview').addEventListener('change',updatePreview);
el('curPreview').addEventListener('blur',updatePreview);
const samePrompt=(a,b)=>clean(a).normalize('NFKC').replace(/\s+/g,' ').toLowerCase()===clean(b).normalize('NFKC').replace(/\s+/g,' ').toLowerCase();
qs.forEach(([key,id])=>el(id).addEventListener('input',showScore));
const dataForCreate=async raw=>{
 const title=trim(raw.title,255),category=trim(raw.category,64);
 const source_url=urlValue(raw.source_url);
 const preview_url=urlValue(raw.preview_url);
 const reference_prompt=trim(raw.reference_prompt,25000);
 const fingerprintValue=await fingerprint({title,category,source_url,reference_prompt});
 if(!Object.keys(licLabels).includes(raw.source_license))throw Error('Status hak penggunaan tidak valid.');
 return {
  title,category,source_url,source_creator:trim(raw.source_creator,128),
  source_license:raw.source_license,reference_prompt,adapted_prompt:trim(raw.adapted_prompt,25000),
  preview_url,stage:'reference',fingerprint:fingerprintValue,notes:trim(raw.notes,4000),score:0,
  quality_visual:0,quality_hook:0,quality_value:0,quality_easy:0
 };
};
async function createOne(raw){
 const data=await dataForCreate(raw);
 return tables.createRow({databaseId:DB,tableId:TABLE_REF,rowId:ID.unique(),data});
}
function switchTab(name){
 if(!['published','reference','curation'].includes(name))return;
 state.tab=name;
 document.querySelectorAll('[data-cur-tab]').forEach(b=>{
  const on=b.dataset.curTab===name;b.classList.toggle('on',on);b.setAttribute('aria-selected',String(on));
 });
 document.querySelectorAll('[data-cur-panel]').forEach(p=>p.hidden=p.dataset.curPanel!==name);
 el('v-prompts').classList.toggle('curator-active',name!=='published');
 if(name==='reference')void loadList(true);
 if(name==='curation')void loadQueue();
}
document.querySelectorAll('[data-cur-tab]').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.curTab)));
function drawRows(rows,target,selection=false){
 const node=el(target);
 if(!rows.length){node.innerHTML='<div class="cur-empty">Belum ada referensi pada tampilan ini.</div>';return}
 node.innerHTML=rows.map(row=>{
  const isSelected=state.selected?.$id===row.$id,score=Number(row.score)||0;
  return '<article class="cur-row"><div class="cur-row-icon" aria-hidden="true">'+(row.stage==='published'?'✓':row.stage==='review'?'★':'✦')+'</div>'+
   '<div class="cur-row-meta"><b>'+escape(row.title||'Untitled')+(isSelected?' • PILIHAN':'')+'</b>'+
   '<small>'+escape(row.category)+' · '+escape(stages[row.stage]||row.stage)+' · Skor '+score+'/100</small>'+
   '<small>'+escape(licLabels[row.source_license]||'Izin belum diketahui')+'</small></div>'+
   '<button type="button" class="btn dark sm" data-cur-open="'+escape(row.$id)+'">'+(row.stage==='published'?'LIHAT':'KURASI')+'</button></article>';
 }).join('');
 node.querySelectorAll('[data-cur-open]').forEach(b=>b.addEventListener('click',()=>{
  const row=rows.find(x=>x.$id===b.dataset.curOpen);if(!row)return;
  selectRow(row);switchTab('curation');
 }));
}
async function loadList(reset=false){
 if(state.loading)return;
 if(reset)state.page=0;
 state.loading=true;announcement('curListStatus','Memuat bank referensi…');
 try{
  const stage=el('curStageFilter').value;
  const queries=[Query.orderDesc('$createdAt'),Query.limit(LIMIT),Query.offset(state.page*LIMIT)];
  if(stage)queries.push(Query.equal('stage',stage));
  const r=await tables.listRows({databaseId:DB,tableId:TABLE_REF,queries});
  state.rows=refRows(r);state.total=Number(r.total||0);
  const term=clean(el('curSearch').value).toLowerCase();
  const visible=term?state.rows.filter(x=>[x.title,x.category,x.source_url,x.source_creator,x.reference_prompt].some(y=>String(y||'').toLowerCase().includes(term))):state.rows;
  drawRows(visible,'curList');
  el('curStats').innerHTML='<span>Bank: '+state.total.toLocaleString('id-ID')+' baris'+(stage?' dalam status '+escape(stages[stage]):'')+'</span><span>Halaman '+(state.page+1)+'</span>';
  el('curMore').disabled=state.rows.length<LIMIT;
  announcement('curListStatus',state.rows.length+' data dimuat. Pencarian bekerja untuk halaman ini.','good');
 }catch(e){el('curList').innerHTML='<div class="cur-empty">'+escape(e.message||'Gagal memuat.')+'</div>';announcement('curListStatus','Cek izin admin dan koneksi Appwrite.','bad')}
 finally{state.loading=false}
}
async function loadQueue(){
 try{
  const r=await tables.listRows({databaseId:DB,tableId:TABLE_REF,queries:[Query.orderDesc('$createdAt'),Query.limit(100)]});
  state.queue=refRows(r);
  drawRows(state.queue,'curQueue',true);
  if(state.selected){
   const fresh=state.queue.find(x=>x.$id===state.selected.$id);
   if(fresh)state.selected=fresh;
  }
 }catch(e){el('curQueue').textContent=e.message||'Antrian gagal dimuat.'}
}
function selectRow(row){
 state.selected=row;
 const set=(id,val)=>{el(id).value=val??''};
 set('curEditId',row.$id);set('curEditTitle',row.title);set('curEditCategory',row.category);
 set('curEditSource',row.source_url);set('curEditCreator',row.source_creator);
 set('curEditLicense',row.source_license||'unknown');set('curEditOriginal',row.reference_prompt);
 set('curAdapted',row.adapted_prompt);set('curPreview',row.preview_url);updatePreview();
 set('curNotes',row.notes);
 qs.forEach(([key,id])=>set(id,Number(row[key])||0));
 el('curRightsConfirm').checked=false;
 el('curEditHeading').textContent=row.title||'Kurasi prompt';
 el('curEditInfo').textContent='Status: '+(stages[row.stage]||row.stage)+' · '+(row.published_prompt_id?'ID tayang: '+row.published_prompt_id:'Belum terbit');
 el('curPublish').disabled=row.stage==='published';
 el('curMarkReview').disabled=row.stage==='published';
 el('curSaveDraft').disabled=row.stage==='published';
 announcement('curEditStatus',row.stage==='published'?'Sudah tayang. Perubahan prompt dilakukan lewat Koleksi Member.':'Silakan isi prompt hasil adaptasi dan gambar preview.');
 showScore();
}
function editorRaw(){
 if(!state.selected)throw Error('Pilih referensi dari daftar terlebih dahulu.');
 const title=trim(el('curEditTitle').value,255),category=trim(el('curEditCategory').value,64);
 if(!title||!category)throw Error('Judul dan kategori wajib diisi.');
 const raw={
  title,category,source_url:urlValue(el('curEditSource').value),source_creator:trim(el('curEditCreator').value,128),
  source_license:el('curEditLicense').value,reference_prompt:trim(el('curEditOriginal').value,25000),
  adapted_prompt:trim(el('curAdapted').value,25000),preview_url:urlValue(el('curPreview').value),
  notes:trim(el('curNotes').value,4000),...scoreVals()
 };
 if(!Object.keys(licLabels).includes(raw.source_license))throw Error('Status izin tidak dikenal.');
 return raw;
}
async function saveEditor(nextStage){
 const selected=state.selected;if(!selected)throw Error('Pilih referensi lebih dulu.');
 if(selected.stage==='published')throw Error('Prompt yang sudah terbit dikelola di Koleksi Member.');
 const data=editorRaw();
 data.fingerprint=await fingerprint(data);
 if(nextStage==='review'){
  if(data.adapted_prompt.length<40)throw Error('Lengkapi prompt baru minimal 40 karakter.');
  if(!data.preview_url)throw Error('Siapkan URL preview gambar hasil baru sebelum review.');
  if(data.score<80)throw Error('Skor review harus minimal 80/100.');
  if(data.source_license==='unknown')throw Error('Periksa dulu hak penggunaan sumber.');
  if(data.source_license==='inspiration'&&data.reference_prompt&&samePrompt(data.reference_prompt,data.adapted_prompt))throw Error('Prompt hasil kurasi tidak boleh sama dengan referensi pihak lain.');
  if(el('curPreviewImage').naturalWidth<1)throw Error('Gambar preview belum berhasil ditampilkan. Periksa URL dan tunggu hingga termuat.');
 }
 data.stage=nextStage;
 const saved=await tables.updateRow({databaseId:DB,tableId:TABLE_REF,rowId:selected.$id,data});
 state.selected=rowDataCur(saved);selectRow(state.selected);
 await loadQueue();if(state.tab==='reference')await loadList(true);
 return state.selected;
}
async function withLock(ids,fn,statusId){
 const buttons=ids.map(el).filter(Boolean);if(buttons.some(b=>b.disabled))return;
 buttons.forEach(b=>b.disabled=true);
 try{await fn()}catch(e){announcement(statusId,e?.message||'Proses gagal.','bad')}
 finally{buttons.forEach(b=>b.disabled=false);if(state.selected?.stage==='published'){el('curPublish').disabled=true;el('curSaveDraft').disabled=true;el('curMarkReview').disabled=true}}
}
el('curAddForm').addEventListener('submit',e=>{
 e.preventDefault();void withLock(['curAddBtn'],async()=>{
  const raw={title:el('curTitle').value,category:el('curCategory').value,
   source_url:el('curSourceUrl').value,source_creator:el('curCreator').value,
   source_license:el('curLicense').value,reference_prompt:el('curOriginal').value};
  const saved=await createOne(raw);
  el('curAddForm').reset();
  announcement('curAddStatus','Referensi '+escape(rowDataCur(saved).title)+' tersimpan sebagai draf privat.','good');
  await loadList(true);
 },'curAddStatus');
});
el('curSaveDraft').addEventListener('click',()=>void withLock(['curSaveDraft','curMarkReview','curPublish'],async()=>{
 await saveEditor('curation');announcement('curEditStatus','Kurasi berhasil disimpan. Belum dipublikasikan.','good');
},'curEditStatus'));
el('curMarkReview').addEventListener('click',()=>void withLock(['curSaveDraft','curMarkReview','curPublish'],async()=>{
 await saveEditor('review');announcement('curEditStatus','Siap review manual. Periksa tampilan gambar sebelum terbit.','good');
},'curEditStatus'));
el('curPublish').addEventListener('click',()=>void withLock(['curSaveDraft','curMarkReview','curPublish'],async()=>{
 if(!state.selected)throw Error('Pilih referensi.');
 if(state.selected.stage!=='review')throw Error('Klik SIAP REVIEW setelah menyimpan hasil kurasi sebelum diterbitkan.');
 if(!el('curRightsConfirm').checked)throw Error('Centang konfirmasi izin, originalitas dan kualitas dahulu.');
 const data=editorRaw(),id=state.selected.$id;
 const latestRef=rowDataCur(await tables.getRow({databaseId:DB,tableId:TABLE_REF,rowId:id}));
 if(latestRef.stage!=='review')throw Error('Status referensi berubah. Muat ulang dan review kembali.');
 const reviewedFields=['title','category','source_url','source_license','adapted_prompt','preview_url','score'];
 if(reviewedFields.some(key=>String(latestRef[key]??'')!==String(data[key]??'')))throw Error('Ada perubahan sejak review. Simpan ulang, lalu tandai SIAP REVIEW kembali sebelum terbit.');
 if(data.source_license==='inspiration'&&data.reference_prompt&&samePrompt(data.reference_prompt,data.adapted_prompt))throw Error('Prompt kurasi harus karya baru, bukan salinan sumber.');
 if(el('curPreviewImage').naturalWidth<1)throw Error('Preview belum berhasil ditampilkan. Pastikan URL gambar valid.');
 if(data.score<80||!data.preview_url||data.adapted_prompt.length<40||data.source_license==='unknown')
  throw Error('Belum lolos review: skor 80+, prompt baru, URL gambar HTTPS dan izin wajib.');
 if(!window.confirm('Terbitkan prompt dan preview ini ke Member Area Premium? Ini akan terlihat oleh pembeli.'))return;
 const rowId='cr_'+id;
 let existing=null;
 try{existing=rowDataCur(await tables.getRow({databaseId:DB,tableId:LIBRARY,rowId}))}catch(e){if(Number(e?.code)!==404)throw e}
 if(existing&&!String(existing.source_notes||'').includes('curation-ref:'+id))
  throw Error('ID prompt tayang sudah dipakai oleh data lain. Hubungi admin teknis.');
 if(!existing){
  const latest=await tables.listRows({databaseId:DB,tableId:LIBRARY,queries:[Query.orderDesc('sort_order'),Query.limit(1)]});
  const order=Number(refRows(latest)[0]?.sort_order||0)+1;
  try{
   await tables.createRow({databaseId:DB,tableId:LIBRARY,rowId,data:{
    title:data.title,category:data.category,prompt_text:data.adapted_prompt,preview_url:data.preview_url,
    source_url:data.source_url,source_creator:data.source_creator,
    source_notes:'curation-ref:'+id,sort_order:order,is_published:true,is_featured:false,
    gender:'universal'
   }});
  }catch(e){
   if(Number(e?.code)!==409)throw e;
   const check=rowDataCur(await tables.getRow({databaseId:DB,tableId:LIBRARY,rowId}));
   if(!String(check.source_notes||'').includes('curation-ref:'+id))throw e;
  }
 }
 const saved=await tables.updateRow({databaseId:DB,tableId:TABLE_REF,rowId:id,data:{
  ...data,fingerprint:await fingerprint(data),stage:'published',published_prompt_id:rowId
 }});
 state.selected=rowDataCur(saved);selectRow(state.selected);
 await loadQueue();await loadList(true);
 announcement('curEditStatus','BERHASIL: prompt '+rowId+' sudah terbit di Member Area.','good');
},'curEditStatus'));
el('curEditForm').addEventListener('submit',e=>{e.preventDefault();el('curSaveDraft').click()});
el('curCopyBrief').addEventListener('click',async()=>{
 try{
  const data=editorRaw();
  const brief=[
   'TUGAS: Buat prompt image generation orisinal untuk PROMPTIONAL.',
   'Referensi konsep (untuk inspirasi, jangan salin frasa khas atau identitas kreator):',
   data.reference_prompt||data.title,
   'Kategori: '+data.category,
   'Buat satu prompt baru dalam bahasa Indonesia yang sangat spesifik: subjek, lokasi, komposisi, pencahayaan, lensa kamera, tekstur, dan konteks produk jika relevan.',
   'Hasil harus terasa fotografi nyata: anatomi benar, teks dan label tidak acak, tangan normal, kulit bertekstur, bayangan konsisten, tanpa AI slop.',
   'Hormati hak cipta, jangan tiru gaya khas kreator hidup atau masukkan merek/karakter tanpa izin.',
   'Keluarkan HANYA teks prompt final yang siap disalin ke generator gambar. Tidak perlu penjelasan.'
  ].join('\n\n');
  await navigator.clipboard.writeText(brief);
  announcement('curEditStatus','Brief AI disalin. Jalankan di ChatGPT, tempel hasilnya ke Prompt hasil adaptasi, lalu buat preview.','good');
 }catch(e){announcement('curEditStatus','Gagal menyalin: '+(e.message||e),'bad')}
});
el('curTemplate').addEventListener('click',()=>{
 const csv='\ufeffjudul,kategori,url_sumber,kreator,izin,prompt_referensi\n"Foto produk skincare natural","Bisnis","https://example.com/ide","Sumber Contoh","inspiration","Ide pemotretan natural, bukan menyalin prompt asli"\n';
 const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='PROMPTIONAL-BANK-REFERENSI.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);
});
function parseCsv(input,sep){
 const rows=[],current=[];let cell='',quoted=false;
 for(let i=0;i<input.length;i++){
  const ch=input[i];
  if(ch==='"'){if(quoted&&input[i+1]==='"'){cell+='"';i++}else quoted=!quoted}
  else if(ch===sep&&!quoted){current.push(cell);cell=''}
  else if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&input[i+1]==='\n')i++;current.push(cell);if(current.some(x=>x.trim()))rows.push([...current]);current.length=0;cell=''}
  else cell+=ch;
 }
 if(quoted)throw Error('File CSV tidak valid: tanda kutip belum ditutup.');
 current.push(cell);if(current.some(x=>x.trim()))rows.push(current);
 return rows;
}
async function workbookRows(file){
 const name=file.name.toLowerCase();
 if(!/\.(xlsx|xls|csv|tsv)$/.test(name))throw Error('Gunakan .xlsx, .xls, .csv, atau .tsv.');
 if(file.size>6*1024*1024)throw Error('File terlalu besar. Batasi satu batch sampai 100 baris.');
 if(/\.(xlsx|xls)$/.test(name)){
  if(!window.XLSX){
   await new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src='https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
    script.onload=resolve;script.onerror=()=>reject(Error('Pembaca Excel gagal dimuat. Coba simpan sebagai CSV UTF-8 lalu impor lagi.'));
    document.head.appendChild(script);
   });
  }
  if(!window.XLSX)throw Error('Pembaca Excel belum tersedia. Simpan sebagai CSV UTF-8.');
  const book=window.XLSX.read(await file.arrayBuffer(),{type:'array',raw:false,cellDates:false});
  return window.XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]],{header:1,defval:'',blankrows:false});
 }
 const str=await file.text();
 return parseCsv(str.replace(/^\ufeff/,''),name.endsWith('.tsv')?'\t':(str.split('\n')[0].includes(';')?';':','));
}
const normalizeHeader=h=>String(h||'').normalize('NFKC').trim().toLowerCase().replace(/[\s\-]+/g,'_');
function entriesFromSheet(rows){
 if(!rows.length)throw Error('File kosong.');
 const headers=rows[0].map(normalizeHeader);
 const aliases={
  title:['judul','title','nama_prompt'],category:['kategori','category','niche'],
  source_url:['url_sumber','source_url','url','link'],source_creator:['kreator','creator','source_creator','sumber'],
  source_license:['izin','lisensi','source_license','license'],
  reference_prompt:['prompt_referensi','reference_prompt','prompt','ide','deskripsi']
 };
 const mapping=Object.fromEntries(Object.entries(aliases).map(([key,items])=>[key,headers.findIndex(h=>items.includes(h))]));
 if(mapping.title<0||mapping.category<0)throw Error('Kolom wajib: judul dan kategori.');
 const items=rows.slice(1).filter(r=>r.some(x=>String(x||'').trim())).map(row=>{
  const get=k=>mapping[k]<0?'':String(row[mapping[k]]??'');
  let license=get('source_license').trim().toLowerCase();
  if(['sendiri','original','milik sendiri'].includes(license))license='original';
  else if(['izin','berizin','licensed','authorized'].includes(license))license='authorized';
  else if(['inspirasi','inspiration','inspiration_only'].includes(license))license='inspiration';
  else license='unknown';
  return {title:get('title'),category:get('category'),source_url:get('source_url'),
   source_creator:get('source_creator'),source_license:license,reference_prompt:get('reference_prompt')};
 });
 if(!items.length)throw Error('File tidak memiliki baris data.');
 if(items.length>BATCH)throw Error('Maksimal '+BATCH+' referensi per impor; pecah Excel menjadi beberapa file.');
 return items;
}
el('curImportBtn').addEventListener('click',async()=>{
 if(state.importing)return;
 const file=el('curImportFile').files?.[0];if(!file){announcement('curImportStatus','Pilih file Excel/CSV lebih dulu.','bad');return}
 state.importing=true;el('curImportBtn').disabled=true;let success=0,duplicate=0,failed=0;
 try{
  const items=entriesFromSheet(await workbookRows(file));
  const seen=new Set();
  for(let i=0;i<items.length;i++){
   try{
    const data=await dataForCreate(items[i]);
    if(seen.has(data.fingerprint)){duplicate++;continue}
    seen.add(data.fingerprint);
    await tables.createRow({databaseId:DB,tableId:TABLE_REF,rowId:ID.unique(),data});
    success++;
   }catch(e){if(Number(e?.code)===409)duplicate++;else failed++}
   if(i%5===0||i===items.length-1)announcement('curImportStatus','Diproses '+(i+1)+'/'+items.length+' · masuk '+success+' · duplikat '+duplicate+' · gagal '+failed);
  }
  announcement('curImportStatus','Selesai: '+success+' referensi baru, '+duplicate+' duplikat, '+failed+' gagal. Semua tetap privat.','good');
  await loadList(true);
 }catch(e){announcement('curImportStatus',e?.message||'Impor gagal.','bad')}
 finally{state.importing=false;el('curImportBtn').disabled=false}
});
el('curReload').addEventListener('click',()=>void loadList(true));
el('curStageFilter').addEventListener('change',()=>void loadList(true));
el('curSearch').addEventListener('input',()=>void loadList());
el('curMore').addEventListener('click',()=>{if(state.rows.length<LIMIT)return;state.page++;void loadList()});
el('curQueueRefresh').addEventListener('click',()=>void loadQueue());
})();
