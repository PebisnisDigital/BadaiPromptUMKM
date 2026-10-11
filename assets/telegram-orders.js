(()=>{
'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=s=>s?new Date(s).toLocaleString('id-ID',{timeZone:'Asia/Jakarta',dateStyle:'medium',timeStyle:'short'})+' WIB':'—';
const money=n=>'Rp'+Number(n||0).toLocaleString('id-ID');
const label={activated:'PREMIUM AKTIF',paid:'LUNAS',pending:'PENDING',failed:'GAGAL',expired:'EXPIRED'};
let orders=[],buyers=[],orderCursor=null,buyerCursor=null,ordersTotal=0,loadingO=false,loadingB=false,selected=null,loaded=false;
async function request(action,body={}){
 const {jwt}=await account.createJWT(),res=await fetch('/api/telegram/manager',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+jwt},body:JSON.stringify({action,...body})});
 const data=await res.json();if(!res.ok||data.ok===false)throw Error(data.error||'Layanan Telegram belum dapat memproses permintaan.');return data;
}
const cell=(label,value)=>'<div><small>'+esc(label)+'</small>'+esc(value??'—')+'</div>';
function renderOrders(){
 const q=$('tgOrdersSearch').value.trim().toLowerCase(),found=orders.filter(o=>!q||[o.display_name,o.telegram_name,o.telegram_id,o.telegram_username,o.whatsapp,o.invoice_id].some(v=>String(v||'').toLowerCase().includes(q)));
 $('tgOrdersSummary').textContent=orders.length+' dari '+ordersTotal+' order bot terbaca • Lunas: '+orders.filter(x=>['paid','activated'].includes(x.status)).length+' pada halaman dimuat';
 $('tgOrdersList').innerHTML=found.map(o=>'<article class="tg-sales-item"><div class="tg-sales-item-head"><strong>'+esc(o.display_name||o.telegram_username||'Pembeli Telegram')+'</strong><span class="tg-sales-chip '+(['activated','paid'].includes(o.status)?'paid':o.status==='pending'?'wait':'free')+'">'+esc(label[o.status]||o.status)+'</span></div>'+
  '<div class="tg-sales-item-body">'+cell('Sumber','BOT TELEGRAM'+(o.is_test?' • SANDBOX':''))+cell('Nominal',money(o.amount))+cell('Telegram ID',o.telegram_id)+cell('Status member',o.plan==='premium'?'PREMIUM':o.plan==='free'?'FREE':'—')+cell('Waktu order',fmt(o.created_at))+cell('Pembayaran',fmt(o.paid_at))+cell('Invoice',o.invoice_id)+cell('Akses sampai',fmt(o.access_until))+'</div></article>').join('')||'<div class="tg-sales-item">Belum ada order Telegram yang cocok.</div>';
 $('tgOrdersMore').hidden=!orderCursor;
}
function renderBuyers(){
 $('tgBuyersList').innerHTML=buyers.map(b=>{
 const external=b.appwrite_linked&&!b.can_manage;
 return '<article class="tg-sales-item"><div class="tg-sales-item-head"><strong>'+esc(b.first_name||'Member Telegram')+(b.username?' · @'+esc(b.username):'')+'</strong><span class="tg-sales-chip '+(b.plan==='premium'?'paid':'free')+'">'+esc((b.plan||'free').toUpperCase())+'</span></div>'+
 '<div class="tg-sales-item-body">'+cell('Telegram ID',b.telegram_id)+cell('Akses Appwrite',b.appwrite_linked?'Terhubung':'Belum')+cell('Premium sampai',fmt(b.premium_until))+cell('Prompt berikutnya',fmt(b.next_send_at))+cell('Penerimaan',b.is_active?'Aktif':'Nonaktif')+'</div>'+
 '<div class="tg-sales-item-actions"><button type="button" class="btn dark" data-edit-tg="'+esc(b.telegram_id)+'">EDIT MEMBER</button>'+
 '<button type="button" class="btn tg-danger" data-delete-tg="'+esc(b.telegram_id)+'" '+(external?'disabled title="Akun ini dibeli melalui website. Hapus dari order website pada Penjualan."':'')+'>HAPUS MEMBER</button></div>'+
 (external?'<p class="tg-sales-note">Akun ini terhubung dengan order website. Untuk menghapus seluruh aksesnya, gunakan tombol KELOLA pada order website di tabel Penjualan.</p>':'')+'</article>';
 }).join('')||'<div class="tg-sales-item">Belum ada pengguna Telegram.</div>';
 $('tgBuyersMore').hidden=!buyerCursor;
}
async function loadOrders(append=false){
 if(loadingO)return;loadingO=true;$('tgOrdersReload').disabled=true;
 try{const d=await request('telegram-orders-list',{channel:'bot',limit:25,cursor:append?orderCursor||'':''});
  orders=append?[...orders,...d.orders]:d.orders;orderCursor=d.next_cursor||null;ordersTotal=d.total;renderOrders();
 }catch(e){$('tgOrdersSummary').textContent='Gagal memuat order: '+e.message}
 finally{loadingO=false;$('tgOrdersReload').disabled=false}
}
async function loadBuyers(append=false){
 if(loadingB)return;loadingB=true;$('tgBuyersReload').disabled=true;
 try{const d=await request('telegram-buyers-list',{limit:25,cursor:append?buyerCursor||'':''});
  buyers=append?[...buyers,...d.members]:d.members;buyerCursor=d.next_cursor||null;renderBuyers();
 }catch(e){$('tgBuyersList').textContent='Gagal memuat member: '+e.message}
 finally{loadingB=false;$('tgBuyersReload').disabled=false}
}
async function reload(){await Promise.all([loadOrders(),loadBuyers()])}
function closeEditor(){$('tgMemberEditor').classList.remove('show');selected=null}
function openEditor(b){
 selected=b;$('tgEditId').value=b.telegram_id;$('tgEditName').value=b.first_name||'';
 $('tgEditPlan').value=b.plan||'free';$('tgEditUntil').value=b.premium_until?new Date(b.premium_until).toISOString().slice(0,10):'';
 $('tgEditActive').value=String(Boolean(b.is_active));
 $('tgEditPlan').disabled=b.appwrite_linked&&!b.can_manage;
 $('tgEditUntil').disabled=b.appwrite_linked&&!b.can_manage;
 $('tgMemberEditorMsg').textContent=b.appwrite_linked&&!b.can_manage?'Akun ini dibeli via website. Nama dan pengiriman dapat diubah; paket dan masa aktif dikelola dari order website.':'';
 $('tgMemberEditor').classList.add('show');$('tgEditName').focus();
}
$('tgMemberEditorForm').onsubmit=async e=>{
 e.preventDefault();const button=$('tgEditSave');button.disabled=true;$('tgMemberEditorMsg').textContent='Menyimpan perubahan…';
 try{await request('telegram-member-edit',{telegram_id:$('tgEditId').value,first_name:$('tgEditName').value.trim(),
  plan:$('tgEditPlan').value,is_active:$('tgEditActive').value==='true',access_until:$('tgEditPlan').value==='premium'?$('tgEditUntil').value:null});
  closeEditor();await reload();
 }catch(e){$('tgMemberEditorMsg').textContent=e.message}
 finally{button.disabled=false}
};
$('tgEditCancel').onclick=closeEditor;
$('tgBuyersList').onclick=async e=>{
 const edit=e.target.closest('[data-edit-tg]'),del=e.target.closest('[data-delete-tg]');
 const telegramId=(edit||del)?.dataset[edit?'editTg':'deleteTg'];
 const member=buyers.find(b=>b.telegram_id===telegramId);if(!member)return;
 if(edit){openEditor(member);return}
 if(!confirm('Hapus data dan akses Telegram '+(member.first_name||telegramId)+'? Akun dapat /start dan order ulang. Transaksi yang sudah lunas tetap menjadi arsip tanpa identitas pembeli.'))return;
 if(prompt('Ketik HAPUS MEMBER '+telegramId+' untuk mengonfirmasi:')!=='HAPUS MEMBER '+telegramId)return;
 del.disabled=true;
 try{const d=await request('telegram-member-delete',{telegram_id:telegramId,confirmation:'HAPUS MEMBER '+telegramId});
  await reload();alert('Member Telegram berhasil dihapus. Transaksi lama disimpan sebagai arsip; akun bisa /start dan /beli lagi.');
 }catch(e){alert('Tidak berhasil menghapus member: '+e.message);del.disabled=false}
};
$('tgOrdersReload').onclick=reload;$('tgBuyersReload').onclick=()=>loadBuyers();
$('tgOrdersMore').onclick=()=>loadOrders(true);$('tgBuyersMore').onclick=()=>loadBuyers(true);
$('tgOrdersSearch').oninput=renderOrders;
$('tgOrdersChannel').value='bot';
document.querySelector('[data-view="sales"]')?.addEventListener('click',()=>{if(!loaded){loaded=true;reload()}});
if(document.querySelector('[data-view="sales"].on')){loaded=true;reload()}
})();
