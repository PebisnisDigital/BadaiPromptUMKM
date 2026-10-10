import {Client,TablesDB,Query} from 'node-appwrite';
import {Store} from '../functions/activate-member/src/telegram/store.mjs';
import {id} from '../functions/activate-member/src/telegram/security.mjs';
import {randomSecret,loginUrl,exchangeAuthorizationCode,validateToken} from '../functions/activate-member/src/telegram/website-oidc.mjs';

const ORIGIN='https://badaiprompt.vercel.app',REDIRECT=ORIGIN+'/api/website-login';
const TTL=600,SESSION_TTL=1800;
const name='badai_website_session',flow='badai_oidc_state';
const parseCookie=(req,key)=>String(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(key+'='))?.slice(key.length+1)||'';
const setCookie=(key,value,maxAge,path='/')=>key+'='+value+'; Max-Age='+maxAge+'; Path='+path+'; Secure; HttpOnly; SameSite=Lax';
const store=()=>{const key=process.env.APPWRITE_API_KEY;if(!key)throw new Error('Appwrite belum dikonfigurasi.');const client=new Client().setEndpoint(process.env.APPWRITE_ENDPOINT||'https://sgp.cloud.appwrite.io/v1').setProject(process.env.APPWRITE_PROJECT_ID||'badai-prompt-umkm').setKey(key);return new Store(new TablesDB(client),Query,process.env.APP_DB_ID||'badai_prompt_umkm')};
const active=()=>process.env.TELEGRAM_WEBSITE_LOGIN_ENABLED==='true'&&/^[1-9]\d{4,19}$/.test(String(process.env.TELEGRAM_OIDC_CLIENT_ID||''))&&Boolean(process.env.TELEGRAM_OIDC_CLIENT_SECRET);
const fail=(res,message,code=400)=>res.status(code).json({ok:false,error:message});
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='GET')return fail(res,'Method not allowed.',405);
 if(req.headers.origin&&req.headers.origin!==ORIGIN)return fail(res,'Origin tidak diizinkan.',403);
 const action=String(req.query?.action||(req.query?.code?'callback':'config'));
 if(action==='callback'&&req.query?.error)return fail(res,'Login Telegram ditolak atau dibatalkan.',403);
 if(action==='config')return res.status(200).json({ok:true,enabled:active(),price:199000});
 if(!active())return fail(res,'Login Telegram website belum diaktifkan. Checkout biasa tetap tersedia.',503);
 try{
  const db=store();
  if(action==='start'){
   const state=randomSecret(),verifier=randomSecret()+randomSecret().slice(0,20);
   await db.putState(id('website-oidc-flow',state),{verifier},{kind:'site_login',status:'pending',due_at:new Date(Date.now()+TTL*1000).toISOString()});
   res.setHeader('Set-Cookie',setCookie(flow,state,TTL,'/api/website-login'));
   return res.redirect(302,loginUrl({clientId:process.env.TELEGRAM_OIDC_CLIENT_ID,redirectUri:REDIRECT,state,verifier}));
  }
  if(action==='session'){
   const secret=parseCookie(req,name);
   if(!/^[\w-]{32,90}$/.test(secret))return res.status(200).json({ok:true,authenticated:false});
   const session=await db.state(id('website-session',secret));
   if(!session||session.kind!=='site_session'||session.status!=='active'||Date.parse(session.due_at)<=Date.now())return res.status(200).json({ok:true,authenticated:false});
   return res.status(200).json({ok:true,authenticated:true,name:session.data.name});
  }
  if(action==='callback'||req.query?.code){
   const state=String(req.query.state||''),code=String(req.query.code||''),cookie=parseCookie(req,flow);
   if(!/^[\w-]{32,90}$/.test(state)||state!==cookie)return fail(res,'Sesi Telegram tidak cocok.',403);
   const item=await db.state(id('website-oidc-flow',state));
   if(!item||item.kind!=='site_login'||item.status!=='pending'||Date.parse(item.due_at)<=Date.now())return fail(res,'Sesi login telah kedaluwarsa.',403);
   const used=await db.claim(id('website-oidc-used',state),{kind:'used',status:'used',due_at:new Date(Date.now()+86400000).toISOString(),payload:'{}'});
   if(!used)return fail(res,'Login ini sudah pernah diproses.',409);
   await db.update('telegram_state',item.$id,{status:'used'});
   const jwt=await exchangeAuthorizationCode({code,clientId:process.env.TELEGRAM_OIDC_CLIENT_ID,clientSecret:process.env.TELEGRAM_OIDC_CLIENT_SECRET,redirectUri:REDIRECT,verifier:item.data.verifier});
   const identity=await validateToken(jwt,{clientId:process.env.TELEGRAM_OIDC_CLIENT_ID});
   const secret=randomSecret();
   await db.putState(id('website-session',secret),identity,{kind:'site_session',status:'active',telegram_id:identity.telegram_id,due_at:new Date(Date.now()+SESSION_TTL*1000).toISOString()});
   res.setHeader('Set-Cookie',[setCookie(flow,'',0,'/api/website-login'),setCookie(name,secret,SESSION_TTL)]);
   return res.redirect(303,'/beli-premium.html');
  }
  return fail(res,'Aksi login tidak ditemukan.',404);
 }catch(e){
  const msg=String(e?.message||'Login Telegram gagal.').slice(0,200);
  return fail(res,msg,/belum|tidak tersedia/.test(msg)?503:400);
 }
}
