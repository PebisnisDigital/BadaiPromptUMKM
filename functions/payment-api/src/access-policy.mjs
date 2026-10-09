// Annual access for newly activated members; existing lifetime rights remain.
export function manualAccessUntil(previous,status,requested,now=Date.now()){
 if(requested){const time=Date.parse(requested);if(!Number.isFinite(time))throw Object.assign(new Error('Tanggal masa akses tidak valid.'),{status:400});return new Date(time).toISOString()}
 if(previous?.status==='active'&&!previous.access_until)return null;
 if(status!=='active')return previous?.access_until||null;
 if(previous?.status==='active'&&Date.parse(previous.access_until)>now)return previous.access_until;
 return new Date(Math.max(now,Date.parse(previous?.access_until)||0)+365*86400000).toISOString();
}
