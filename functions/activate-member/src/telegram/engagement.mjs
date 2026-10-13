import {id,random,fail} from './security.mjs';

const MAX_RULES=50;
const RESERVED=new Set(['/start','/prompt','/premium','/status','/bantuan','/beli','/cek']);
const KEYWORD=/^\/?[\p{L}\p{N}_ -]{2,40}$/u;
const escape=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const KEY=id('telegram','autoreplies');

export function telegramHtml(input,{max=3500}={}){
  const original=String(input??'').trim();
  if(!original||original.length>max)throw fail('Pesan harus diisi dan maksimal '+max+' karakter.');
  const tokens=original.split(/(<[^>]*>)/g),stack=[],out=[];
  for(const t of tokens){
    if(!t)continue;
    if(!t.startsWith('<')){out.push(escape(t));continue}
    const m=t.match(/^<(\/?)(b|i|u|s|code)>$/i);
    if(m){
      const closing=!!m[1],tag=m[2].toLowerCase();
      if(closing){if(stack.pop()!==tag)throw fail('Format Telegram tidak berpasangan. Periksa tag tebal/miring.');out.push('</'+tag+'>')}
      else{stack.push(tag);out.push('<'+tag+'>')}
      continue;
    }
    const href=t.match(/^<a href="(https:\/\/[^"<>]+)">$/i);
    if(href){
      let u;try{u=new URL(href[1]);if(u.protocol!=='https:'||u.username||u.password||u.port)throw Error('bad')}catch{throw fail('Tautan hanya boleh HTTPS yang aman.')}
      stack.push('a');out.push('<a href="'+escape(u.toString())+'">');continue;
    }
    if(/^<\/a>$/i.test(t)){if(stack.pop()!=='a')throw fail('Tag tautan tidak ditutup dengan benar.');out.push('</a>');continue}
    throw fail('Tag Telegram tidak didukung. Gunakan tombol format Tebal, Miring, Garis Bawah, Coret, Kode, atau Tautan.');
  }
  if(stack.length)throw fail('Ada tag format Telegram yang belum ditutup.');
  return out.join('');
}
export function normalKeyword(value){
  const k=String(value??'').trim().toLocaleLowerCase('id-ID').replace(/\s+/g,' ');
  if(!KEYWORD.test(k)||RESERVED.has(k))throw fail('Keyword 2–40 karakter; perintah bawaan bot tidak boleh diganti.');
  return k;
}

export class Engagement{
  constructor(service){this.s=service}
  async listRules(){return (await this.s.store.state(KEY))?.data.rules||[]}
  async rules(){return {ok:true,rules:await this.listRules(),reserved:[...RESERVED]}}
  async saveRule(body,actor){
    const keyword=normalKeyword(body.keyword),reply=telegramHtml(body.reply,{max:3000});
    const prev=await this.listRules(),other=prev.filter(x=>x.keyword!==keyword);
    if(other.length>=MAX_RULES)throw fail('Maksimal 50 autoreply per bot.');
    const rules=[...other,{keyword,reply,enabled:body.enabled!==false}].sort((a,b)=>a.keyword.localeCompare(b.keyword));
    await this.s.store.putState(KEY,{rules},{kind:'autoreply_settings',status:'ready',user_id:actor});
    return {ok:true,rules};
  }
  async deleteRule(body,actor){
    const keyword=normalKeyword(body.keyword),rules=(await this.listRules()).filter(x=>x.keyword!==keyword);
    await this.s.store.putState(KEY,{rules},{kind:'autoreply_settings',status:'ready',user_id:actor});
    return {ok:true,rules};
  }
  async respond(member,bot,original,key){
    const keyword=String(original||'').trim().toLocaleLowerCase('id-ID').replace(/\s+/g,' ');
    const rule=(await this.listRules()).find(x=>x.enabled&&x.keyword===keyword);
    if(!rule)return null;
    return this.s.delivery.text(member,bot,rule.reply,key,'autoreply',{html:true});
  }
  async current(){
    const key=(await this.s.store.state('telegram-broadcast-current'))?.data.campaign_key;
    const item=key?await this.s.store.state(key):null;
    return {ok:true,campaign:item?.data||null,server_enabled:this.s.sendEnabled};
  }
  async draft(body,actor){
    const message=telegramHtml(body.message,{max:3500});
    const bot=await this.s.main();
    if(!bot||!bot.is_active)throw fail('Pilih dan aktifkan bot utama sebelum membuat broadcast.',409);
    const code=random().slice(0,24),key=id('broadcast',code),now=new Date(this.s.now()).toISOString();
    const campaign={id:code,bot_id:bot.$id,message,status:'draft',created_at:now,updated_at:now,created_by:actor,cursor:null,processed:0,sent:0,skipped:0,failed:0};
    await this.s.store.putState(key,campaign,{kind:'broadcast',status:'draft',user_id:actor});
    await this.s.store.putState('telegram-broadcast-current',{campaign_key:key},{kind:'broadcast_current',status:'ready',user_id:actor});
    return {ok:true,campaign};
  }
  async sendBatch(body,actor){
    if(body.confirmation!=='KIRIM BROADCAST')throw fail('Ketik KIRIM BROADCAST sebagai konfirmasi pengiriman.',400);
    await this.s.requireSend();
    const setting=await this.s.config();
    if(!setting.enabled||setting.paused)throw fail('Aktifkan bot dan RESUME terlebih dahulu.',409);
    const code=String(body.id||''),key=id('broadcast',code);
    const record=await this.s.store.state(key),campaign=record?.data;
    if(!campaign||campaign.id!==code)throw fail('Broadcast tidak ditemukan.',404);
    if(!['draft','sending'].includes(campaign.status))throw fail('Broadcast sudah selesai/dibatalkan.',409);
    const bot=await this.s.main();
    if(!bot||!bot.is_active||bot.$id!==campaign.bot_id)throw fail('Bot utama berubah; broadcast dihentikan.',409);
    // Single-writer claim prevents double sending when admin clicks twice or requests overlap.
    const lock=id('broadcast-batch',code,campaign.cursor||'first');
    if(!await this.s.store.claim(lock,{kind:'broadcast_lock',status:'used',due_at:new Date(this.s.now()+30*24*3600000).toISOString(),payload:'{}'}))
      throw fail('Batch ini sedang/ sudah diproses. Segarkan status dahulu.',409);
    const size=Math.min(5,Math.max(1,Number(setting.batch_size)||5));
    const list=await this.s.store.list('telegram_state',[['equal','kind','consent'],['equal','bot_id',bot.$id],['equal','status','allowed']],size,campaign.cursor||undefined);
    let sent=0,skipped=0,failed=0;
    for(const recipient of list.rows){
      const member=await this.s.store.get('telegram_members',id('member',recipient.telegram_id));
      if(!member||!member.is_active){skipped++;continue}
      const consent=await this.s.consent(bot.$id,recipient.telegram_id);
      if(!consent||consent.status!=='allowed'){skipped++;continue}
      const delivery=await this.s.delivery.text(member,bot,campaign.message,id('broadcast',code,recipient.telegram_id),'broadcast',{html:true,noReplyButtons:true});
      if(delivery.ok)sent++;else if(delivery.duplicate)skipped++;else failed++;
    }
    const now=new Date(this.s.now()).toISOString();
    const updated={...campaign,updated_at:now,status:list.rows.length<size?'completed':'sending',
      cursor:list.rows.at(-1)?.$id||campaign.cursor,processed:campaign.processed+list.rows.length,
      sent:campaign.sent+sent,skipped:campaign.skipped+skipped,failed:campaign.failed+failed};
    await this.s.store.putState(key,updated,{kind:'broadcast',status:updated.status,user_id:actor});
    return {ok:true,campaign:updated,batch:{processed:list.rows.length,sent,skipped,failed},done:updated.status==='completed'};
  }
}
