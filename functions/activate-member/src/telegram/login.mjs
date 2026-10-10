import {id,random,fail} from './security.mjs';

const WAIT_MS=5*60*1000;
const HOST='https://badaiprompt.vercel.app';

// A Telegram private-chat message is the authentication factor. Links are
// single-use, sent only into the verified, opted-in Telegram chat, and
// exchanged server-side for Appwrite's short-lived custom session token.
export class TelegramLogin {
  constructor(service,users){this.s=service;this.users=users}
  userId(telegramId){return id('tg-user',String(telegramId))}
  async eligibility(member){
    if(!member||!member.telegram_id)throw fail('Akun Telegram belum ditemukan.',403);
    const current=await this.s.sync(member);
    if(current.plan!=='premium'||current.premium_until&&Date.parse(current.premium_until)<=this.s.now())throw fail('Hanya member Premium aktif yang dapat masuk melalui Telegram.',403);
    return current;
  }
  async ensureAccount(member){
    member=await this.eligibility(member);
    if(member.appwrite_user_id){
      if(this.users)await this.users.get({userId:member.appwrite_user_id});
      return member;
    }
    if(!this.users||!this.s.grantPaidAccess)throw fail('Pembuatan sesi Premium belum dikonfigurasi.',503);
    const userId=this.userId(member.telegram_id);
    const claimed=await this.s.store.state(id('tglink',member.telegram_id));
    if(claimed&&claimed.data.user_id!==userId)throw fail('Identitas Telegram sudah terhubung ke akun lain. Hubungi bantuan.',409);
    // Do not reuse existing accounts silently or ever claim an account linked to other Telegram IDs.
    const userClaim=await this.s.store.state(id('userlink',userId));
    if(userClaim&&userClaim.data.telegram_id!==member.telegram_id)throw fail('Akun sudah terhubung ke identitas Telegram lain.',409);
    try{await this.users.create({userId,name:String(member.first_name||'Member BADAI PROMPT').slice(0,128)})}
    catch(e){
      if(Number(e.code)!==409)throw e;
      // A predictable userId might have been registered by an unrelated account.
      // Never claim it without the prior server-side ownership record.
      if(!userClaim||userClaim.data.telegram_id!==member.telegram_id)throw fail('ID akun sudah digunakan. Hubungi bantuan untuk pemulihan aman.',409);
      await this.users.get({userId});
    }
    if(!claimed){
      const created=await this.s.store.claim(id('tglink',member.telegram_id),{kind:'tglink',telegram_id:member.telegram_id,user_id:userId,status:'linked',payload:JSON.stringify({user_id:userId})});
      if(!created){const other=await this.s.store.state(id('tglink',member.telegram_id));if(other?.data.user_id!==userId)throw fail('Identitas sudah terhubung ke akun lain.',409)}
    }
    if(!userClaim){
      const created=await this.s.store.claim(id('userlink',userId),{kind:'userlink',telegram_id:member.telegram_id,user_id:userId,status:'linked',payload:JSON.stringify({telegram_id:member.telegram_id})});
      if(!created){const other=await this.s.store.state(id('userlink',userId));if(other?.data.telegram_id!==member.telegram_id)throw fail('Akun sudah ditautkan ke Telegram lain.',409)}
    }
    return this.s.store.update('telegram_members',member.$id,{appwrite_user_id:userId});
  }
  async issue(member,bot){
    if(!this.s.passwordlessEnabled||!this.users)throw fail('Login Telegram belum diaktifkan oleh admin.',503);
    member=await this.eligibility(member);
    if((await this.s.consent(bot.$id,member.telegram_id))?.status!=='allowed')throw fail('Tekan START melalui chat pribadi dahulu.',403);
    // Reconcile the paid profile before issuing a link, without creating browser credentials.
    member=await this.ensureAccount(member);
    await this.s.qris.grant(member,member.appwrite_user_id);
    const code=random(),recordId=id('tg-login',code),expiry=new Date(this.s.now()+WAIT_MS).toISOString();
    await this.s.store.claim(recordId,{kind:'login',bot_id:bot.$id,telegram_id:member.telegram_id,user_id:member.appwrite_user_id,status:'pending',due_at:expiry,payload:'{}'});
    return {url:HOST+'/telegram-login.html#code='+encodeURIComponent(code),expires_in:300};
  }
  async redeem(code){
    if(!this.s.passwordlessEnabled||!this.users)throw fail('Login Telegram belum tersedia.',503);
    if(typeof code!=='string'||!/^[a-zA-Z0-9_-]{24,128}$/.test(code))throw fail('Tautan login tidak valid.',400);
    const recordId=id('tg-login',code),state=await this.s.store.state(recordId);
    if(!state||state.kind!=='login'||state.status!=='pending'||Date.parse(state.due_at)<=this.s.now())throw fail('Tautan login sudah kedaluwarsa atau digunakan.',403);
    const member=await this.s.store.get('telegram_members',id('member',state.telegram_id));
    if(!member||member.appwrite_user_id!==state.user_id)throw fail('Tautan login tidak cocok dengan akun.',403);
    await this.eligibility(member);
    // Strict single-use distributed claim before generating Appwrite token.
    const claimed=await this.s.store.claim(id('tg-login-used',recordId),{kind:'used',telegram_id:state.telegram_id,user_id:state.user_id,status:'used',due_at:new Date(this.s.now()+86400000).toISOString(),payload:'{}'});
    if(!claimed)throw fail('Tautan login sudah pernah digunakan.',409);
    await this.s.store.update('telegram_state',recordId,{status:'used'});
    const token=await this.users.createToken({userId:state.user_id,length:32,expire:180});
    if(!token?.secret||token.userId!==state.user_id)throw fail('Token sesi tidak berhasil dibuat.',503);
    return {ok:true,userId:state.user_id,secret:token.secret,expires_in:180};
  }
}
