(()=>{
'use strict';
const $=id=>document.getElementById(id);
const hub=$('v-marketing');if(!hub)return;
const esc=v=>String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let draft=null,replyRules=[],busy=false,rulesLoaded=false,broadcastLoaded=false;
const tabButtons=[...hub.querySelectorAll('[data-tg-tab]')];
function showTab(id){
 for(const b of tabButtons){const on=b.dataset.tgTab===id;b.classList.toggle('on',on);b.setAttribute('aria-selected',String(on));$(b.getAttribute('aria-controls')).hidden=!on}
 if(id==='broadcast'&&!broadcastLoaded)void readBroadcast();
 if(id==='autoreply'&&!rulesLoaded)void readReplies();
}
tabButtons.forEach(b=>b.addEventListener('click',()=>showTab(b.dataset.tgTab)));
showTab('bot');
async function request(action,body={}){
 const {jwt}=await account.createJWT();
 const r=await fetch('/api/telegram/manager',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+jwt},body:JSON.stringify({action,...body}),cache:'no-store'});
 let j;try{j=await r.json()}catch{throw Error('Server Telegram tidak mengembalikan respons yang valid.')}
 if(!r.ok||j.ok===false)throw Error(j.error||'Permintaan Telegram tidak berhasil.');
 return j;
}
function report(id,msg,bad=false){const el=$(id);el.textContent=msg;el.dataset.error=String(bad)}
function btnDisabled(b,flag){b.disabled=flag}
function preview(el,raw){
 el.replaceChildren();
 const stack=[el],tokens=String(raw||'').split(/(<[^>]*>)/g);
 for(const token of tokens){
  if(!token)continue;
  const start=token.match(/^<(b|i|u|s|code)>$/i);
  if(start){const child=document.createElement(start[1].toLowerCase());stack.at(-1).append(child);stack.push(child);continue}
  const end=token.match(/^<\/(b|i|u|s|code)>$/i);
  if(end){if(stack.length>1&&stack.at(-1).tagName.toLowerCase()===end[1].toLowerCase())stack.pop();else stack.at(-1).append(document.createTextNode(token));continue}
  const link=token.match(/^<a href="(https:\/\/[^"<>]+)">$/i);
  if(link){let safe=null;try{const url=new URL(link[1]);if(url.protocol==='https:'&&!url.username&&!url.password&&!url.port)safe=url.href}catch{}
   if(safe){const a=document.createElement('a');a.href=safe;a.target='_blank';a.rel='noopener noreferrer';stack.at(-1).append(a);stack.push(a);continue}
  }
  if(token.toLowerCase()==='</a>'&&stack.at(-1).tagName==='A'){stack.pop();continue}
  stack.at(-1).append(document.createTextNode(token));
 }
}
function formatToolbar(toolbar){
 const target=$(toolbar.dataset.target);if(!target)return;
 const choices=[['Tebal','b'],['Miring','i'],['Garis bawah','u'],['Coret','s'],['Kode','code'],['Tautan','a']];
 toolbar.replaceChildren();
 for(const [label,tag] of choices){
  const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.format=tag;
  b.addEventListener('click',()=>{
   const start=target.selectionStart,end=target.selectionEnd,selected=target.value.slice(start,end);
   let open='<'+tag+'>',close='</'+tag+'>';
   if(tag==='a'){const url=prompt('Masukkan URL HTTPS yang dituju:');if(!url)return;
    try{const u=new URL(url);if(u.protocol!=='https:'||u.username||u.password||u.port)throw Error('Link HTTPS tidak valid.');open='<a href="'+u.href.replaceAll('&','&amp;')+'">'}catch{return alert('Hanya URL HTTPS aman yang diperbolehkan.')}}
   const sample=selected||'Tulis '+label.toLowerCase()+' di sini',insert=open+sample+close;
   if(target.value.length+insert.length-selected.length>Number(target.maxLength||5000))return alert('Batas panjang pesan tercapai.');
   target.setRangeText(insert,start,end,'end');
   target.focus();target.dispatchEvent(new Event('input',{bubbles:true}));
  });
  toolbar.append(b);
 }
}
hub.querySelectorAll('.tg-format-toolbar[data-target]').forEach(formatToolbar);
for(const id of ['mktEditOffer','mktDefaultOffer']){
 const box=$(id);if(!box)continue;
 const tools=document.createElement('div');tools.className='tg-format-toolbar';tools.dataset.target=id;box.before(tools);formatToolbar(tools);
}
$('tgBroadcastText').addEventListener('input',()=>preview($('tgBroadcastPreview'),$('tgBroadcastText').value));
$('tgReplyText').addEventListener('input',()=>preview($('tgReplyPreview'),$('tgReplyText').value));
const mktOffer=$('mktEditOffer'),mktPreview=$('mktMockOffer');
mktOffer?.addEventListener('input',()=>preview(mktPreview,mktOffer.value));
const domObserver=new MutationObserver(()=>{
 if(!mktOffer||!mktPreview||mktOffer.closest('[hidden]'))return;
 // The original editor updates preview via textContent, so enhance rich format after each update.
 if(!mktPreview.querySelector('b,i,u,s,code,a')&&/<(?:b|i|u|s|code|a\b)/.test(mktOffer.value))preview(mktPreview,mktOffer.value);
});
if(mktPreview)domObserver.observe(mktPreview,{childList:true});
function renderDraft(){
 $('tgBroadcastState').textContent=!draft?'Belum ada draf broadcast.':[
  'Status: '+(draft.status==='completed'?'SELESAI':draft.status==='draft'?'DRAF':'SEDANG DIKIRIM'),
  'Terkirim: '+draft.sent,'Dilewati: '+draft.skipped,'Gagal: '+draft.failed,'Diproses: '+draft.processed
 ].join(' • ');
 const button=$('tgBroadcastSend');button.disabled=!draft||draft.status==='completed'||busy;
 if(draft?.status==='completed')button.textContent='BROADCAST SELESAI';
 else button.textContent='KIRIM BATCH BERIKUTNYA (MAKS. 5 AKUN)';
}
async function readBroadcast(){
 broadcastLoaded=true;
 try{const r=await request('broadcast-get');draft=r.campaign;renderDraft();
  report('tgBroadcastNotice',r.server_enabled?'Siap. Kirim hanya setelah bot aktif dan izin server tersedia.':'Pengiriman belum diizinkan oleh server. Draf tetap bisa disimpan.');
 }catch(e){broadcastLoaded=false;report('tgBroadcastNotice',e.message,true)}
}
$('tgBroadcastForm').addEventListener('submit',async e=>{
 e.preventDefault();if(busy)return;
 if(draft&&draft.status==='sending'&&!confirm('Broadcast sebelumnya masih diproses. Membuat draf baru tidak melanjutkan sisa penerima sebelumnya. Buat draf baru?'))return;
 busy=true;
 try{const r=await request('broadcast-draft',{message:$('tgBroadcastText').value});draft=r.campaign;renderDraft();$('tgBroadcastConfirm').value='';report('tgBroadcastNotice','Draf disimpan. BELUM ADA PESAN yang dikirim. Periksa preview dan ketik konfirmasi sebelum mengirim.')}
 catch(e){report('tgBroadcastNotice',e.message,true)}finally{busy=false;renderDraft()}
});
$('tgBroadcastSend').addEventListener('click',async()=>{
 if(busy||!draft)return;
 if($('tgBroadcastConfirm').value.trim()!=='KIRIM BROADCAST'){report('tgBroadcastNotice','Ketik KIRIM BROADCAST dahulu.',true);return}
 if(!confirm('KIRIM NYATA ke maksimal 5 akun bot yang sudah START? Pesan akan masuk ke chat Telegram mereka.'))return;
 busy=true;renderDraft();
 try{const r=await request('broadcast-send-batch',{id:draft.id,confirmation:'KIRIM BROADCAST'});draft=r.campaign;renderDraft();
 report('tgBroadcastNotice','Batch selesai: '+r.batch.sent+' terkirim, '+r.batch.skipped+' dilewati, '+r.batch.failed+' gagal. '+(r.done?'Broadcast selesai.':'Tekan KIRIM BATCH BERIKUTNYA untuk melanjutkan.'));
 }catch(e){report('tgBroadcastNotice',e.message,true)}finally{busy=false;renderDraft()}
});
function showRules(){
 const target=$('tgReplyList');target.replaceChildren();
 if(!replyRules.length){target.textContent='Belum ada autoreply. Tambahkan keyword pertama di atas.';return}
 for(const item of replyRules){
  const row=document.createElement('div');row.className='tg-reply-row';row.setAttribute('role','listitem');
  const head=document.createElement('div');head.className='tg-reply-title';
  const name=document.createElement('span');name.textContent=item.keyword.toUpperCase();
  const status=document.createElement('small');status.textContent=item.enabled?'AKTIF':'NONAKTIF';head.append(name,status);
  const sample=document.createElement('small');sample.textContent=item.reply.slice(0,240);
  const actions=document.createElement('div');actions.className='tg-reply-buttons';
  const edit=document.createElement('button');edit.type='button';edit.textContent='EDIT';edit.onclick=()=>{
   $('tgReplyKeyword').value=item.keyword;$('tgReplyText').value=item.reply;$('tgReplyEnabled').checked=item.enabled;
   preview($('tgReplyPreview'),item.reply);$('tgReplyKeyword').focus();
  };
  const del=document.createElement('button');del.type='button';del.textContent='HAPUS';del.dataset.delete='true';del.onclick=async()=>{
   if(!confirm('Hapus autoreply keyword '+item.keyword+'?'))return;
   try{const r=await request('autoreply-delete',{keyword:item.keyword});replyRules=r.rules;showRules();report('tgReplyNotice','Keyword berhasil dihapus.')}catch(e){report('tgReplyNotice',e.message,true)}
  };actions.append(edit,del);row.append(head,sample,actions);target.append(row);
 }
}
async function readReplies(){
 rulesLoaded=true;
 try{const r=await request('autoreply-list');replyRules=r.rules||[];showRules();report('tgReplyNotice',replyRules.length+' keyword dimuat.')}
 catch(e){rulesLoaded=false;report('tgReplyNotice',e.message,true)}
}
$('tgReplyForm').addEventListener('submit',async e=>{
 e.preventDefault();if(busy)return;
 busy=true;
 try{const r=await request('autoreply-save',{keyword:$('tgReplyKeyword').value,reply:$('tgReplyText').value,enabled:$('tgReplyEnabled').checked});
 replyRules=r.rules;showRules();report('tgReplyNotice','Autoreply disimpan. Keyword mulai berlaku untuk chat pribadi member yang sudah START.');
 $('tgReplyForm').reset();$('tgReplyEnabled').checked=true;$('tgReplyPreview').textContent='';
 }catch(e){report('tgReplyNotice',e.message,true)}finally{busy=false}
});
})();