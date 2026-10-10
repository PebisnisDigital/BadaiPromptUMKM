export const DAY=86400000;
export const defaults=Object.freeze({enabled:false,paused:true,dry_run:true,premium_time:'06:00',free_days:3,premium_days:1,delete_hours:24,term_days:365,batch_size:5,max_members_per_run:100});
export function settings(input={}){
 const s={...defaults,...input};
 for(const k of ['enabled','paused','dry_run'])if(typeof s[k]!=='boolean')throw Error('Pengaturan boolean tidak valid.');
 if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(s.premium_time))throw Error('Jam kirim tidak valid.');
 for(const [k,min,max] of [['free_days',1,30],['premium_days',1,30],['delete_hours',1,47],['term_days',365,365],['batch_size',1,10],['max_members_per_run',1,200]])if(!Number.isInteger(s[k])||s[k]<min||s[k]>max)throw Error('Pengaturan '+k+' tidak valid.');
 return s;
}
export function nextAt(now,days,time){
 const shifted=new Date(now+7*3600000),[h,m]=time.split(':').map(Number);
 return new Date(Date.UTC(shifted.getUTCFullYear(),shifted.getUTCMonth(),shifted.getUTCDate()+days,h-7,m)).toISOString();
}
export function entitlement(profile,now){
 if(profile?.status!=='active')return {plan:'free',premium_until:null};
 if(!profile.access_until)return {plan:'premium',premium_until:null,legacy:true};
 const until=Date.parse(profile.access_until);return Number.isFinite(until)&&until>now?{plan:'premium',premium_until:new Date(until).toISOString()}:{plan:'free',premium_until:profile.access_until||null};
}
export function renewalUntil(previous,paidAt){return new Date(Math.max(Date.parse(previous)||0,Date.parse(paidAt)||Date.now())+365*DAY).toISOString()}
export const jakartaDay=now=>new Date(now+7*3600000).toISOString().slice(0,10);
export const jakartaStart=now=>jakartaDay(now)+'T00:00:00+07:00';
export function promptChunks(text){
 const escape=c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]||c),chunks=[];let chunk='';
 for(const c of String(text)){const e=escape(c);if(chunk.length+e.length>3800){chunks.push('<pre>'+chunk+'</pre>');chunk=''}chunk+=e}
 if(chunk)chunks.push('<pre>'+chunk+'</pre>');return chunks;
}
