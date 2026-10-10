// Non-mutating launch gate for BADAI PROMPT Telegram operations.
// Never treats simulated checks as a successful production payment test.
const n=v=>Number.isFinite(Number(v))?Math.max(0,Math.floor(Number(v))):0;
export function assessLaunchReadiness({content={},monitor={},settings={},mainBot=null,pricing={},flags={},members={}}={}){
 const curated=n(content.ready_days),approved=n(content.approved),visual=n(content.scene_candidates),library=n(content.prompt_candidates_total);
 const due=n(monitor.due),deleteDue=n(monitor.delete_due),uncertain=n(monitor.uncertain),failed=n(monitor.failed),retry=n(monitor.retry);
 const flagsOut={
  site_price_correct:Number(pricing.price)===199000&&Number(pricing.minimum)===199000,
  bot_selected:Boolean(mainBot&&mainBot.username),
  schedule_enabled:settings.enabled===true&&settings.paused!==true&&settings.dry_run!==true,
  in_bot_qris_disabled:flags.qrisEnabled!==true,
  passwordless_enabled:flags.passwordlessEnabled===true
 };
 const blockers=[],warnings=[],next=[];
 const block=(code,message)=>blockers.push({code,message});
 const warn=(code,message)=>warnings.push({code,message});
 const task=(code,message)=>next.push({code,message});
 if(!flagsOut.site_price_correct)block('website_price','Harga dan minimum checkout website harus sama-sama Rp199.000.');
 if(!flagsOut.bot_selected)block('main_bot','Belum ada bot Telegram utama yang dipilih.');
 if(curated<30)block('content_runway','Antrean kurasi valid baru '+curated+' hari; target minimum uji coba terjadwal adalah 30 hari.');
 if(uncertain>0)block('uncertain_delivery',uncertain+' pengiriman memiliki hasil tidak pasti; review manual wajib.');
 if(failed>0)block('failed_delivery',failed+' pengiriman gagal; selesaikan sebelum perluasan.');
 if(!flagsOut.in_bot_qris_disabled)block('qris_in_bot_policy','QRIS langsung di bot untuk produk digital tidak mengikuti ketentuan pembayaran Telegram. Jangan aktifkan checkout ini.');
 if(!flagsOut.schedule_enabled)warn('paused_or_dry','Scheduler nonaktif, PAUSE, atau masih mode simulasi; jangan anggap kiriman rutin sudah terbukti.');
 if(curated<365)warn('annual_stock','Baru '+curated+' dari target 365 hari yang siap dan disetujui. Belum boleh mengklaim stok 365 prompt unik telah tersedia.');
 if(visual>curated)task('approve_visual','Tinjau dan setujui '+Math.min(visual-curated,365-curated)+' kandidat visual dengan preview yang saat ini belum masuk antrean.');
 if(library>0&&visual<365)task('generate_previews','Audit '+library+' prompt teks di koleksi lain dan siapkan preview serta kurasi untuk kekurangan '+(365-curated)+' hari.');
 if(deleteDue>0)warn('delete_overdue',deleteDue+' penghapusan pesan Free sudah jatuh tempo. Pantau worker dan retry.');
 if(retry>0)warn('retry',retry+' pengiriman menunggu retry.');
 if(!flagsOut.passwordless_enabled)warn('passwordless_off','Login otomatis Telegram sedang terkunci. Pastikan akses website dari pembeli sudah diuji dengan akun terotorisasi.');
 task('isolated_real_check','Verifikasi secara manual dengan akun penguji: login Appwrite, webhook pembayaran, hak Premium, pengiriman, dan penghapusan 24 jam.');
 task('hosting_compliance','Pastikan paket hosting mengizinkan penggunaan komersial sebelum menerima pembeli massal.');
 return {
  status:blockers.length?'NOT_READY':'REQUIRES_MANUAL_REVIEW',
  disclaimer:'Status ini hanya pemeriksaan otomatis; bukan persetujuan untuk deploy, pembayaran, atau broadcast.',
  stock:{curated,approved,visual_candidates:visual,text_library:library,needed_for_365:Math.max(0,365-curated),days_until_content_gap:curated,pilot_target_days:30,annual_target_days:365},
  members:{registered:n(members.registered),free:n(members.free),premium:n(members.premium)},
  monitor:{due,delete_due:deleteDue,retry,uncertain,failed},
  checks:flagsOut,blockers,warnings,next
 };
}
