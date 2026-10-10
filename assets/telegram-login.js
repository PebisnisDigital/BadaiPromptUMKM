(async()=>{
 const status=document.getElementById('status');
 // Never place secret in server URL, history or persistent browser storage.
 const params=new URLSearchParams(location.hash.slice(1));
 const code=params.get('code')||'';
 history.replaceState(null,'',location.pathname);
 if(!/^[a-zA-Z0-9_-]{24,128}$/.test(code)){status.textContent='Tautan login tidak valid. Ketik /login pada bot untuk membuat yang baru.';return}
 if(!window.Appwrite){status.textContent='Koneksi autentikasi gagal dimuat. Segarkan halaman dan mintalah tautan baru dari bot.';return}
 try{
  status.textContent='Memeriksa identitas Telegram dan akses Premium…';
  const response=await fetch('/api/telegram/login',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({code}),cache:'no-store',redirect:'error'});
  const data=await response.json();
  if(!response.ok||!data.ok)throw Error(data.error||'Tautan tidak bisa digunakan.');
  const client=new Appwrite.Client().setEndpoint('https://sgp.cloud.appwrite.io/v1').setProject('badai-prompt-umkm');
  const account=new Appwrite.Account(client);
  // Do not overwrite a member's different existing session without confirmation.
  let prior=null;try{prior=await account.get()}catch{}
  if(prior&&prior.$id!==data.userId)throw Error('Browser sedang masuk sebagai akun lain. Silakan keluar dahulu agar tidak menimpa sesi anggota.');
  if(!prior)await account.createSession({userId:data.userId,secret:data.secret});
  const confirmed=await account.get();
  if(confirmed.$id!==data.userId)throw Error('Sesi tidak cocok dengan akun Premium.');
  status.textContent='Berhasil! Mengalihkan ke Member Area…';
  location.replace('/member');
 }catch(err){status.textContent=err.message||'Login belum berhasil. Ketik /login lagi di Telegram untuk mendapatkan tautan baru.'}
})();
