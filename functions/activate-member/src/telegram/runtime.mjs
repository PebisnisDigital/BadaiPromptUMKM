import {Client,Account,TablesDB,Teams,Users,Query,Permission,Role} from 'node-appwrite';
import {Store} from './store.mjs';
import {paidAccessWriter} from './paid-access.mjs';
import {Service} from './service.mjs';
import {Telegram} from './transport.mjs';
import {fail} from './security.mjs';
import {identityVerifier} from './auth.mjs';
export function runtime({apiKey=process.env.APPWRITE_API_KEY,env=process.env,fetcher=fetch}={}){
 const endpoint=env.APPWRITE_ENDPOINT||env.APPWRITE_FUNCTION_API_ENDPOINT||'https://sgp.cloud.appwrite.io/v1',project=env.APPWRITE_PROJECT_ID||env.APPWRITE_FUNCTION_PROJECT_ID||'badai-prompt-umkm';
 if(!apiKey)throw fail('Server Telegram belum dikonfigurasi.',503);
 const server=new Client().setEndpoint(endpoint).setProject(project).setKey(apiKey),teams=new Teams(server);
 const identity=identityVerifier({getAccount:jwt=>new Account(new Client().setEndpoint(endpoint).setProject(project).setJWT(jwt)).get(),listAdmins:async userId=>(await teams.listMemberships({teamId:'admin-users',queries:[Query.equal('userId',userId),Query.limit(10)]})).memberships||[]});
 const verifyUser=identity.user,verifyAdmin=identity.admin;
 const premiumServer=env.APPWRITE_PREMIUM_API_KEY?new Client().setEndpoint(endpoint).setProject(project).setKey(env.APPWRITE_PREMIUM_API_KEY):null;
 const grantPaidAccess=premiumServer?paidAccessWriter({tables:new TablesDB(premiumServer),teams:new Teams(premiumServer),users:new Users(premiumServer),Query,Permission,Role,databaseId:env.APP_DB_ID||'badai_prompt_umkm'}):null;
 return new Service({store:new Store(new TablesDB(server),Query,env.APP_DB_ID||'badai_prompt_umkm'),telegram:new Telegram(fetcher),key:env.TELEGRAM_MASTER_KEY,sendEnabled:env.TELEGRAM_SEND_ENABLED==='true',webhookBase:env.TELEGRAM_WEBHOOK_BASE||'https://badaiprompt.vercel.app/api/telegram/webhook',verifyUser,verifyAdmin,fetcher,qrisEnabled:env.TELEGRAM_QRIS_ENABLED==='true',passwordlessEnabled:env.TELEGRAM_PASSWORDLESS_ENABLED==='true',marketingEnabled:env.TELEGRAM_MARKETING_ENABLED==='true',users:premiumServer?new Users(premiumServer):null,grantPaidAccess,verifyPaidAccess:async userId=>{const memberships=await teams.listMemberships({teamId:'paid-members',queries:[Query.equal('userId',userId),Query.limit(10)]});return memberships.memberships?.some(m=>m.confirm===true)||false}});
}
