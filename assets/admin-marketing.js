(()=>{
 const $=id=>document.getElementById(id);
 if(!$('v-marketing'))return;
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const dayName=n=>{
  if(!state?.settings?.start_date)return 'Tanggal belum diatur';
  const date=new Date(state.settings.start_date+'T00:00:00Z');
  date.setUTCDate(date.getUTCDate()+n-1);
  return date.toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
 };
 let state=null,loaded=false,busy=false,page=0,selectedPrompt=null,selectedDay=null,editing=null,candidates=[],candidateCursor=null,candidateSource='scene_prompts',sourceTotal=0;
 async function request(action,body={}){
  const {jwt}=await account.createJWT();
  const response=await fetch('/api/telegram/manager',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json',authorization:'Bearer '+jwt},body:JSON.stringify({action,...body}),cache:'no-store'});
  const data=await response.json();
  if(!response.ok)throw Error(data.error||'Permintaan gagal.');
  return data;
 }
 function notice(message,tone='info'){const el=$('mktNotice');el.textContent=message;el.dataset.tone=tone}
 function lock(v){busy=Boolean(v);$('v-marketing').querySelectorAll('button').forEach(b=>{if(v){b.dataset.wasDisabled=String(b.disabled);b.disabled=true}else{b.disabled=b.dataset.wasDisabled==='true';delete b.dataset.wasDisabled}})}
 async function act(work){if(busy)return;lock(true);try{await work()}catch(e){notice(e.message||'Permintaan gagal.','error')}finally{lock(false)}}
 function settingsForm(){
  const s=state.settings;
  $('mktStartDate').value=s.start_date||'';
  $('mktTime').value=s.send_time||'06:00';
  $('mktLoop').checked=s.loop_campaign===true;
  $('mktEnabled').value=String(Boolean(s.enabled));
  $('mktEnabled').querySelector('option[value="true"]').disabled=!state.server_gate;
  $('mktDefaultOffer').value=s.default_offer||'';
  $('mktDefaultLabel').value=s.default_cta_label||'BUKA PREMIUM';
  $('mktDefaultType').value=s.default_cta_type||'premium';
  $('mktDefaultUrl').value=s.default_cta_url||'';
  $('mktGate').textContent=state.server_gate?'Izin server aktif. Pengiriman tetap memerlukan konfirmasi jadwal dan konfigurasi Telegram Manager.':'PENGIRIMAN MARKETING TIDAK AKTIF: memerlukan izin server terpisah sesudah tes QA.';
  $('mktDefaultUrl').disabled=$('mktDefaultType').value!=='url';
 }
 function statistics(){
  const filled=state.slots.length, current=state.stats.campaign_day;
  const cards=[
   [state.settings.enabled&&state.server_gate?'AKTIF':'DRAF','Status jadwal'],
   [filled+'/365','Hari terisi'],
   [365-filled,'Hari kosong'],
   [current>0&&current<=365?current:'—','Hari kampanye']
  ];
  $('mktStats').innerHTML=cards.map(([n,label])=>'<div class="mkt-stat"><b>'+escape(n)+'</b><span>'+escape(label)+'</span></div>').join('');
 }
 const slots=()=>new Map((state?.slots||[]).map(s=>[s.day,s]));
 function renderCalendar(){
  const source=slots(),first=page*30+1,last=Math.min(365,first+29);
  $('mktPage').innerHTML=Array.from({length:13},(_,i)=>{const f=1+i*30,l=Math.min(365,f+29);return '<option value="'+i+'">Bagian '+(i+1)+' · Hari '+f+'–'+l+'</option>'}).join('');
  $('mktPage').value=String(page);
  $('mktPrev').disabled=page===0;
  $('mktNext').disabled=last===365;
  $('mktPageCount').textContent=first+'–'+last+' dari 365';
  let html='';
  for(let day=first;day<=last;day++){
   const slot=source.get(day),on=selectedDay===day,empty=!slot;
   html+='<button type="button" class="mkt-day '+(empty?'empty':'')+'" aria-selected="'+on+'" data-mkt-day="'+day+'" '+(slot?'draggable="true"':'')+' aria-label="Hari '+day+', '+escape(slot?slot.title:'kosong')+'">'+
    '<span>HARI</span><strong>'+day+'</strong><small>'+escape(slot?slot.title:dayName(day))+'</small>'+
    (slot?'<span class="mkt-pill">● TERJADWAL</span>':'<small>+ TAMBAH</small>')+'</button>';
  }
  $('mktCalendar').innerHTML=html;
  if(selectedDay){
   const slot=source.get(selectedDay);
   $('mktDayDetail').textContent='Hari '+selectedDay+' · '+dayName(selectedDay)+' · '+(slot?'Terisi: '+slot.title:'Belum ada konten.')+(selectedPrompt?' Prompt dipilih: '+selectedPrompt.title:'');
  }else $('mktDayDetail').textContent='Seret prompt atau pilih prompt lalu klik salah satu hari. Slot yang sudah terisi bisa dipindah untuk mengubah urutan.';
  document.querySelectorAll('[data-mkt-day]').forEach(el=>{
   el.addEventListener('click',()=>chooseDay(Number(el.dataset.mktDay)));
   el.addEventListener('dragstart',e=>{
    const day=Number(el.dataset.mktDay);
    if(!source.has(day)){e.preventDefault();return}
    e.dataTransfer.effectAllowed='move';
    e.dataTransfer.setData('text/plain','slot:'+day);
   });
   el.addEventListener('dragover',e=>{e.preventDefault();el.classList.add('drop-target')});
   el.addEventListener('dragleave',()=>el.classList.remove('drop-target'));
   el.addEventListener('drop',e=>{
    e.preventDefault();el.classList.remove('drop-target');
    const payload=e.dataTransfer.getData('text/plain'),target=Number(el.dataset.mktDay);
    if(payload.startsWith('slot:'))return void move(Number(payload.split(':')[1]),target);
    if(payload.startsWith('prompt:')){
     const parts=payload.split(':'),prompt=candidates.find(x=>x.source===parts[1]&&x.id===parts[2]);
     if(prompt){selectedPrompt=prompt;chooseDay(target)}
    }
   });
  });
 }
 function renderCandidates(){
  const q=$('mktSearch').value.trim().toLowerCase();
  const filtered=candidates.filter(p=>[p.title,p.category,p.summary].join(' ').toLowerCase().includes(q));
  $('mktPromptList').innerHTML=filtered.length?filtered.map(p=>{
   const yes=selectedPrompt?.id===p.id&&selectedPrompt?.source===p.source;
   return '<div class="mkt-prompt" draggable="true" data-mkt-prompt="'+escape(p.source+':'+p.id)+'" data-selected="'+yes+'">'+
    '<img src="'+escape(p.preview_url)+'" alt="" loading="lazy" referrerpolicy="no-referrer">'+
    '<div class="mkt-prompt-meta"><strong>'+escape(p.title)+'</strong><p>'+escape(p.category||'Prompt visual')+'</p><button type="button" class="btn dark" data-mkt-pick="'+escape(p.source+':'+p.id)+'">'+(yes?'DIPILIH ✓':'PILIH PROMPT')+'</button></div></div>';
  }).join(''):'<p class="mkt-empty">Tidak ada prompt yang cocok di data yang sudah dimuat. Coba MUAT PROMPT BERIKUTNYA.</p>';
  $('mktLoadMore').hidden=!candidateCursor;
  document.querySelectorAll('[data-mkt-prompt]').forEach(el=>el.addEventListener('dragstart',e=>{
   e.dataTransfer.effectAllowed='copy';e.dataTransfer.setData('text/plain','prompt:'+el.dataset.mktPrompt);
  }));
  document.querySelectorAll('[data-mkt-pick]').forEach(el=>el.addEventListener('click',()=>{
   selectedPrompt=candidates.find(x=>x.source+':'+x.id===el.dataset.mktPick);
   $('mktSelection').textContent=selectedPrompt?selectedPrompt.title+' dipilih':'Belum memilih prompt';
   renderCandidates();renderCalendar();notice('Prompt dipilih. Klik salah satu hari di kalender untuk mengatur pesan dan CTA.','success');
  }));
 }
 async function loadCandidates(reset=false){
  const src=$('mktSource').value;
  if(reset||candidateSource!==src){candidateSource=src;candidates=[];candidateCursor=null}
  const response=await request('marketing-candidates',{source:src,...(candidateCursor?{cursor:candidateCursor}:{})});
  for(const p of response.rows){if(!candidates.some(x=>x.id===p.id&&x.source===p.source))candidates.push(p)}
  candidateCursor=response.next_cursor;
  sourceTotal=response.total;
  renderCandidates();
 }
 function chooseDay(day){
  selectedDay=day;
  const slot=slots().get(day);
  editing=selectedPrompt||slot||null;
  renderCalendar();
  if(!editing){
   $('mktEditor').hidden=true;
   notice('Hari '+day+' kosong. Pilih prompt dari perpustakaan terlebih dahulu.');
   return;
  }
  $('mktEditor').hidden=false;
  $('mktEditDay').textContent=String(day);
  $('mktEditorPrompt').textContent='PROMPT: '+editing.title+' · '+dayName(day)+(slot&&selectedPrompt?' (akan menggantikan '+slot.title+')':'');
  $('mktEditOffer').value=selectedPrompt?(state.settings.default_offer||''):(slot?.offer_text||state.settings.default_offer);
  $('mktEditLabel').value=selectedPrompt?state.settings.default_cta_label:(slot?.cta_label||state.settings.default_cta_label);
  $('mktEditType').value=selectedPrompt?state.settings.default_cta_type:(slot?.cta_type||state.settings.default_cta_type);
  $('mktEditUrl').value=selectedPrompt?state.settings.default_cta_url:(slot?.cta_url||state.settings.default_cta_url);
  $('mktDeleteSlot').disabled=!slot;
  refreshMock();
  $('mktEditor').scrollIntoView({behavior:'smooth',block:'nearest'});
 }
 function refreshMock(){
  $('mktMockContent').textContent='🖼 '+(editing?.title||'PROMPT')+'\n\nIsi prompt lengkap yang dipilih dari Member Area akan dikirim terlebih dahulu.';
  $('mktMockOffer').textContent=$('mktEditOffer').value+'\n\nPesan Gratis akan dihapus 24 jam kemudian.';
  $('mktMockButton').textContent=($('mktEditLabel').value||'BUKA PREMIUM')+' ↗';
  $('mktEditUrl').disabled=$('mktEditType').value!=='url';
 }
 async function move(from,to){
  if(from===to)return;
  await act(async()=>{
   await request('marketing-slot-move',{from,to});
   const updated=await request('marketing-get');state=updated;
   selectedDay=to;selectedPrompt=null;
   statistics();renderCalendar();notice('Konten dari hari '+from+' berhasil '+(slots().has(from)?'ditukar':'dipindahkan')+' ke hari '+to+'.','success');
  });
 }
 async function refresh(){
  state=await request('marketing-get');
  settingsForm();statistics();renderCalendar();
  if(!loaded){await loadCandidates(true);loaded=true}
  notice('Kalender termuat. '+state.slots.length+' dari 365 hari terisi. Jadwal '+(state.settings.enabled&&state.server_gate?'aktif':'masih draf')+'.','success');
 }
 $('mktPage').addEventListener('change',e=>{page=Number(e.target.value);renderCalendar()});
 $('mktPrev').addEventListener('click',()=>{page=Math.max(0,page-1);renderCalendar()});
 $('mktNext').addEventListener('click',()=>{page=Math.min(12,page+1);renderCalendar()});
 $('mktSource').addEventListener('change',()=>void act(()=>loadCandidates(true)));
 $('mktSearch').addEventListener('input',renderCandidates);
 $('mktLoadMore').addEventListener('click',()=>void act(()=>loadCandidates()));
 $('mktRefresh').addEventListener('click',()=>void act(refresh));
 $('mktDefaultType').addEventListener('change',()=>{$('mktDefaultUrl').disabled=$('mktDefaultType').value!=='url'});
 $('mktSettingsForm').addEventListener('submit',e=>{e.preventDefault();void act(async()=>{
  const body={start_date:$('mktStartDate').value,send_time:$('mktTime').value,enabled:$('mktEnabled').value==='true',loop_campaign:$('mktLoop').checked,default_offer:$('mktDefaultOffer').value,default_cta_label:$('mktDefaultLabel').value,default_cta_type:$('mktDefaultType').value,default_cta_url:$('mktDefaultUrl').value};
  const r=await request('marketing-settings',body);state.settings=r.settings;statistics();renderCalendar();
  notice('Pengaturan Marketing tersimpan. Menyimpan tidak otomatis mengirim pesan.','success');
 })});
 $('mktEditForm').addEventListener('submit',e=>{e.preventDefault();void act(async()=>{
  if(!selectedDay||!editing)throw Error('Pilih hari dan prompt dahulu.');
  const body={day:selectedDay,source:editing.source,prompt_id:editing.id||editing.prompt_id,offer_text:$('mktEditOffer').value,cta_label:$('mktEditLabel').value,cta_type:$('mktEditType').value,cta_url:$('mktEditUrl').value};
  await request('marketing-slot-save',body);
  selectedPrompt=null;editing=null;$('mktEditor').hidden=true;
  state=await request('marketing-get');statistics();renderCalendar();renderCandidates();
  $('mktSelection').textContent='Belum memilih prompt';
  notice('Hari '+selectedDay+' disimpan! Preview dan tombol CTA mengikuti pengaturan hari tersebut.','success');
 })});
 $('mktCloseEditor').addEventListener('click',()=>{$('mktEditor').hidden=true;editing=null});
 $('mktDeleteSlot').addEventListener('click',()=>{if(!selectedDay||!confirm('Kosongkan konten hari '+selectedDay+'?'))return;void act(async()=>{
  await request('marketing-slot-delete',{day:selectedDay});
  state=await request('marketing-get');$('mktEditor').hidden=true;editing=null;selectedPrompt=null;statistics();renderCalendar();renderCandidates();notice('Hari '+selectedDay+' dikosongkan.','success');
 })});
 ['mktEditOffer','mktEditLabel','mktEditType','mktEditUrl'].forEach(id=>$(id).addEventListener('input',refreshMock));
 document.querySelector('[data-view="marketing"]')?.addEventListener('click',()=>{if(!loaded)void act(refresh)});
})();
