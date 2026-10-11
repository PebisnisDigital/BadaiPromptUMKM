(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 const escape=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 const fmtDate=s=>s?new Date(s).toLocaleString('id-ID',{timeZone:'Asia/Jakarta',dateStyle:'medium',timeStyle:'short'})+' WIB':'—';
 const rp=n=>'Rp'+Number(n||0).toLocaleString('id-ID');
 const chip=(label,klass)=>'<span class="tg-sales-chip '+klass+'">'+escape(label)+'</span>';
 const statusText=s=>({pending:'MENUNGGU QRIS',paid:'LUNAS / AKTIVASI',activated:'AKSES DIAKTIFKAN',expired:'KEDALUWARSA',failed:'GAGAL',uncertain:'PERLU DIPERIKSA'}[s]||String(s||'—').toUpperCase());
 const orderName=r=>r.display_name||r.telegram_username&&'@'+r.telegram_username||'Pembeli';
 let orders=[],members=[],orderCursor=null,memberCursor=null,orderTotal=0,memberTotal=0,orderBusy=false,memberBusy=false,loaded=false;
 async function api(action,data={}){
  const {jwt}=await account.createJWT();
  const response=await fetch('/api/telegram/manager',{method:'POST',headers:{
   'content-type':'application/json',authorization:'Bearer '+jwt},body:JSON.stringify({action,...data})});
  const payload=await response.json();
  if(!response.ok||payload.ok===false)throw Error(payload.error||'Server belum dapat memuat data.');
  return payload;
 }
 function orderMatches(r){
  const s=$('tgOrdersSearch').value.trim().toLowerCase();
  return !s||[r.telegram_id,r.telegram_name,r.telegram_username,r.display_name,r.whatsapp,r.invoice_id,r.id].some(v=>String(v||'').toLowerCase().includes(s));
 }
 function orderCard(r){
  const paid=['activated','paid'].includes(r.status),klass=paid?'paid':r.status==='pending'?'wait':'free';
  return '<article class="tg-sales-item"><div class="tg-sales-item-head"><div><strong>'+escape(orderName(r))+'</strong> '+
   (r.telegram_username?' <small>@'+escape(r.telegram_username)+'</small>':'')+'</div>'+chip(statusText(r.status),klass)+'</div>'+
   '<div class="tg-sales-item-body">'+
   '<div><small>Kanal pembayaran</small>'+escape(r.channel==='bot'?'BOT TELEGRAM':'WEBSITE')+(r.is_test?' • SANDBOX':'')+'</div>'+
   '<div><small>Nominal QRIS</small>'+escape(rp(r.amount))+'</div>'+
   '<div><small>Telegram ID</small>'+escape(r.telegram_id||'Belum terhubung')+'</div>'+
   '<div><small>Status Telegram</small>'+escape(r.plan==='premium'?'PREMIUM':r.plan==='free'?'FREE':'Belum ditautkan')+'</div>'+
   '<div><small>Tanggal order</small>'+escape(fmtDate(r.created_at))+'</div>'+
   '<div><small>Lunas pada</small>'+escape(fmtDate(r.paid_at))+'</div>'+
   '<div><small>Akses hingga</small>'+escape(fmtDate(r.access_until))+'</div>'+
   '<div><small>Invoice</small><code>'+escape(r.invoice_id||r.id)+'</code></div>'+
   (r.whatsapp?'<div><small>WhatsApp pembeli website</small>'+escape(r.whatsapp)+'</div>':'')+
   '</div></article>';
 }
 function buyerCard(m){
  const premium=m.plan==='premium';
  return '<article class="tg-sales-item"><div class="tg-sales-item-head"><strong>'+escape(m.first_name||'Member Telegram')+
   (m.username?' (@'+escape(m.username)+')':'')+'</strong>'+chip(premium?'PREMIUM':'FREE',premium?'paid':'free')+'</div>'+
   '<div class="tg-sales-item-body">'+
   '<div><small>Telegram ID</small>'+escape(m.telegram_id)+'</div>'+
   '<div><small>Appwrite</small>'+escape(m.appwrite_linked?'Terhubung':'Belum')+'</div>'+
   '<div><small>Akses hingga</small>'+escape(fmtDate(m.premium_until))+'</div>'+
   '<div><small>Prompt berikutnya</small>'+escape(fmtDate(m.next_send_at))+'</div>'+
   '<div><small>Status akun</small>'+escape(m.is_active?'Aktif':'Nonaktif')+'</div>'+
   '<div><small>Akun penguji</small>'+escape(m.tester_authorized?'Diotorisasi':'Belum diotorisasi')+'</div></div>'+
   (m.can_reset?'<div class="tg-sales-item-actions"><button class="btn tg-danger" data-telegram-reset="'+escape(m.sandbox_order_id)+'" data-buyer="'+escape(m.telegram_id)+'" type="button">RESET TESTER SANDBOX → FREE</button></div>':'')+
   '</article>';
 }
 function renderOrders(){
  const filtered=orders.filter(orderMatches);
  $('tgOrdersList').innerHTML=filtered.length?filtered.map(orderCard).join(''):'Tidak ada order yang cocok pada halaman yang sudah dimuat.';
  $('tgOrdersMore').hidden=!orderCursor;
  $('tgOrdersSummary').textContent='Order terbaca: '+orders.length+' dari '+orderTotal+
   ' • Lunas/aktif pada daftar: '+orders.filter(r=>['paid','activated'].includes(r.status)).length+
   ' • Status pembayaran tidak bisa diubah manual.';
 }
 function renderBuyers(){
  $('tgBuyersList').innerHTML=members.length?members.map(buyerCard).join(''):'Belum ada akun Telegram terdaftar.';
  $('tgBuyersMore').hidden=!memberCursor;
 }
 async function loadOrders(append=false){
  if(orderBusy)return;orderBusy=true;const button=$('tgOrdersReload');button.disabled=true;
  if(!append){orders=[];orderCursor=null;$('tgOrdersList').textContent='Memuat order Telegram…'}
  try{
   const result=await api('telegram-orders-list',{channel:$('tgOrdersChannel').value,limit:25,cursor:append?orderCursor||'':''});
   const rows=Array.isArray(result.orders)?result.orders:[];
   orders=append?[...orders,...rows]:rows;orderCursor=result.next_cursor||null;orderTotal=Number(result.total)||0;renderOrders();
  }catch(e){$('tgOrdersSummary').textContent='Gagal memuat order: '+e.message;if(!append)$('tgOrdersList').textContent='Coba klik PERBARUI ORDER.'}
  finally{button.disabled=false;orderBusy=false}
 }
 async function loadBuyers(append=false){
  if(memberBusy)return;memberBusy=true;const button=$('tgBuyersReload');button.disabled=true;
  if(!append){members=[];memberCursor=null;$('tgBuyersList').textContent='Memuat member Telegram…'}
  try{
   const result=await api('telegram-buyers-list',{limit:25,cursor:append?memberCursor||'':''});
   const rows=Array.isArray(result.members)?result.members:[];
   members=append?[...members,...rows]:rows;memberCursor=result.next_cursor||null;memberTotal=Number(result.total)||0;renderBuyers();
  }catch(e){$('tgBuyersList').textContent='Gagal memuat akun Telegram: '+e.message}
  finally{button.disabled=false;memberBusy=false}
 }
 async function reload(){await Promise.all([loadOrders(),loadBuyers()]);}
 $('tgOrdersReload').addEventListener('click',reload);
 $('tgBuyersReload').addEventListener('click',()=>loadBuyers());
 $('tgOrdersMore').addEventListener('click',()=>loadOrders(true));
 $('tgBuyersMore').addEventListener('click',()=>loadBuyers(true));
 $('tgOrdersSearch').addEventListener('input',renderOrders);
 $('tgOrdersChannel').addEventListener('change',()=>loadOrders());
 $('tgBuyersList').addEventListener('click',async(event)=>{
  const button=event.target.closest('[data-telegram-reset]');if(!button)return;
  const item=members.find(m=>m.telegram_id===button.dataset.buyer&&m.sandbox_order_id===button.dataset.telegramReset);
  if(!item?.can_reset)return;
  if(!confirm('Reset akun tester '+(item.first_name||item.telegram_id)+' ke FREE? Hanya akun dengan pembelian bot SANDBOX yang diproses. Riwayat pembayaran tetap tersimpan.'))return;
  if(prompt('Ketik RESET SANDBOX untuk melanjutkan. Aksi ini memblokir hak Premium uji dan melepaskan tagihan aktif.')!=='RESET SANDBOX')return;
  button.disabled=true;
  try{
   await api('telegram-tester-reset',{order_id:item.sandbox_order_id,confirmation:'RESET SANDBOX'});
   alert('Berhasil. Akun uji kembali FREE; transaksi sandbox lama tetap tercatat. Sekarang bisa memakai /beli lagi.');
   await reload();
  }catch(e){alert('Reset ditolak: '+e.message);button.disabled=false}
 });
 document.querySelector('[data-view="telegram"]')?.addEventListener('click',()=>{
  if(!loaded){loaded=true;reload()}
 });
})();
