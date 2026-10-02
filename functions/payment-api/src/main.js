import crypto from 'node:crypto';
import { Client, TablesDB, Users, Teams, ID, Query, Permission, Role } from 'node-appwrite';

const DB=process.env.APP_DB_ID || 'badai_prompt_umkm';
const ORDERS=process.env.ORDERS_TABLE_ID || 'orders';
const SETTINGS='settings';
const COUPONS='coupons';
const PROFILES='member_profiles';
const PAYMENT_SETTINGS='payment_settings';
const TEAM_ID=process.env.PAID_TEAM_ID || 'paid-members';
const FALLBACK_PRICE=Number(process.env.PRODUCT_PRICE || 100000);
const FALLBACK_MINIMUM_PRICE=Number(process.env.MINIMUM_PRICE || 30000);
const MAX_PAY_WHAT_YOU_WANT=5000000;
const APP_URL='https://badaiprompt.vercel.app';

function corsHeaders(extra={}){
  return {
    'Access-Control-Allow-Origin':APP_URL,
    'Access-Control-Allow-Headers':'content-type',
    'Access-Control-Allow-Methods':'GET,POST,OPTIONS',
    'Cache-Control':'no-store',
    ...extra
  };
}
function reply(res,body,status=200){return res.json(body,status,corsHeaders());}
function normalizeWa(value=''){
  let wa=String(value).replace(/\D/g,'');
  if(wa.startsWith('0'))wa='62'+wa.slice(1);
  return wa;
}
function randomToken(bytes=24){return crypto.randomBytes(bytes).toString('hex');}
function safeEqual(a='',b=''){
  const aa=Buffer.from(String(a)),bb=Buffer.from(String(b));
  if(aa.length!==bb.length)return false;
  return crypto.timingSafeEqual(aa,bb);
}
function hmac(secret,body){return 'sha256='+crypto.createHmac('sha256',secret).update(body).digest('hex');}
function rowData(row){return {...(row?.data||row||{}),$id:row?.$id||row?.data?.$id};}
function q(v){return String(v??'').trim();}
function oneYearFrom(value){
  const d=value?new Date(value):new Date();
  const base=Number.isNaN(d.getTime())?new Date():d;
  const out=new Date(base.getTime());
  out.setUTCFullYear(out.getUTCFullYear()+1);
  return out.toISOString();
}
function loginPasswordFor(order){
  const secret=String(process.env.MEMBER_LOGIN_SECRET||'');
  if(!secret)throw Object.assign(new Error('Member login secret belum dikonfigurasi.'),{status:503});
  const seed=String(order.public_token||order.transaction_id||order.$id||'');
  const digest=crypto.createHmac('sha256',secret).update(seed).digest('hex');
  return 'Badai#'+digest.slice(0,10)+'A9';
}

export default async ({req,res,error})=>{
  if(req.method==='OPTIONS')return res.text('ok',200,corsHeaders());

  const key=req.headers['x-appwrite-key'];
  const endpoint=process.env.APPWRITE_FUNCTION_API_ENDPOINT;
  const project=process.env.APPWRITE_FUNCTION_PROJECT_ID;
  if(!key||!endpoint||!project)return reply(res,{error:'Appwrite runtime key unavailable'},500);

  const client=new Client().setEndpoint(endpoint).setProject(project).setKey(key);
  const tables=new TablesDB(client);
  const users=new Users(client);
  const teams=new Teams(client);

  async function getConfig(){
    const r=await tables.listRows({databaseId:DB,tableId:SETTINGS,queries:[Query.limit(20)]});
    const map={};
    for(const row of (r.rows||r.documents||[])){
      const d=rowData(row);
      map[d.key]=d.value;
    }
    const parsed=Number(map.product_price);
    const parsedMinimum=Number(map.minimum_price);
    return {
      product_name:q(map.product_name)||'BADAI PROMPT UMKM',
      price:Number.isFinite(parsed)&&parsed>0?parsed:FALLBACK_PRICE,
      minimum_price:Number.isFinite(parsedMinimum)&&parsedMinimum>0?Math.floor(parsedMinimum):FALLBACK_MINIMUM_PRICE,
      price_mode:'pay_what_you_want',
      registration_open:String(map.registration_open??'true')==='true',
      social_proof_enabled:String(map.social_proof_enabled??'true')==='true',
      social_proof_interval_seconds:Math.min(60,Math.max(10,Number(map.social_proof_interval_seconds||18)))
    };
  }

  async function getPaymentSettings(){
    let row=null;
    try{
      row=rowData(await tables.getRow({databaseId:DB,tableId:PAYMENT_SETTINGS,rowId:'buatqris'}));
    }catch(e){
      if(Number(e?.code)!==404)throw e;
    }
    const accountId=q(row?.account_id);
    const secretToken=q(row?.secret_token);
    return {
      account_id:accountId,
      secret_token:secretToken,
      signing_secret:q(row?.signing_secret),
      qris_method:q(row?.qris_method)||'qris_two',
      fee_by:q(row?.fee_by)||'user',
      umkm_name:q(row?.umkm_name),
      test_mode:row?row.test_mode!==false:true,
      callback_url:q(row?.callback_url)||'https://badaiprompt.vercel.app/api/buatqris-webhook',
      api_url:q(row?.api_url)||'https://app.buatqris.site/api',
      is_active:row?row.is_active!==false:false,
      configured:Boolean(row&&accountId&&secretToken)
    };
  }

  async function getOrderByToken(token){
    const r=await tables.listRows({
      databaseId:DB,tableId:ORDERS,
      queries:[Query.equal('public_token',token),Query.limit(1)]
    });
    return rowData((r.rows||r.documents||[])[0]);
  }
  async function getOrderByTransaction(transactionId){
    const r=await tables.listRows({
      databaseId:DB,tableId:ORDERS,
      queries:[Query.equal('transaction_id',transactionId),Query.limit(1)]
    });
    return rowData((r.rows||r.documents||[])[0]);
  }
  async function updateOrder(id,data){
    return tables.updateRow({databaseId:DB,tableId:ORDERS,rowId:id,data});
  }

  async function getCoupon(code){
    const normalized=q(code).toUpperCase();
    if(!normalized)return null;
    const r=await tables.listRows({
      databaseId:DB,
      tableId:COUPONS,
      queries:[Query.equal('code',normalized),Query.limit(1)]
    });
    return rowData((r.rows||r.documents||[])[0]);
  }

  async function quoteCoupon(code,basePrice){
    const normalized=q(code).toUpperCase();
    if(!normalized){
      return {coupon:null,coupon_code:null,base_price:basePrice,discount_amount:0,total:basePrice};
    }

    const coupon=await getCoupon(normalized);
    if(!coupon?.$id)throw Object.assign(new Error('Kode kupon tidak ditemukan.'),{status:400});
    if(coupon.is_active===false)throw Object.assign(new Error('Kupon sedang tidak aktif.'),{status:400});

    const now=Date.now();
    if(coupon.starts_at&&new Date(coupon.starts_at).getTime()>now){
      throw Object.assign(new Error('Kupon belum mulai berlaku.'),{status:400});
    }
    if(coupon.ends_at&&new Date(coupon.ends_at).getTime()<now){
      throw Object.assign(new Error('Masa berlaku kupon sudah berakhir.'),{status:400});
    }

    const limit=Math.max(Number(coupon.usage_limit)||0,0);
    const claimed=Math.max(Number(coupon.claimed_count)||0,0);
    if(limit>0&&claimed>=limit)throw Object.assign(new Error('Kuota pemakaian kupon sudah habis.'),{status:400});

    const minOrder=Math.max(Number(coupon.min_order)||0,0);
    if(basePrice<minOrder){
      throw Object.assign(new Error('Kupon berlaku untuk minimum belanja '+new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(minOrder)+'.'),{status:400});
    }

    let discount=0;
    const value=Math.max(Number(coupon.discount_value)||0,0);
    if(coupon.discount_type==='percent'){
      discount=Math.floor(basePrice*Math.min(value,100)/100);
    }else{
      discount=Math.min(value,basePrice);
    }
    const maxDiscount=Math.max(Number(coupon.max_discount)||0,0);
    if(maxDiscount>0)discount=Math.min(discount,maxDiscount);
    discount=Math.max(0,Math.min(discount,basePrice));

    return {
      coupon,
      coupon_code:normalized,
      base_price:basePrice,
      discount_amount:discount,
      total:Math.max(0,basePrice-discount)
    };
  }

  async function reserveCouponSlot(quote){
    const coupon=quote?.coupon;
    if(!coupon?.$id)return false;
    const limit=Math.max(Number(coupon.usage_limit)||0,0);
    if(limit<=0)return false;
    try{
      await tables.incrementRowColumn({
        databaseId:DB,
        tableId:COUPONS,
        rowId:coupon.$id,
        column:'claimed_count',
        value:1,
        max:limit
      });
      return true;
    }catch(e){
      throw Object.assign(new Error('Kuota pemakaian kupon sudah habis.'),{status:409});
    }
  }

  async function releaseCouponClaim(order){
    if(!order?.coupon_code||order.coupon_claimed!==true)return;
    try{
      const coupon=await getCoupon(order.coupon_code);
      if(coupon?.$id){
        await tables.decrementRowColumn({
          databaseId:DB,
          tableId:COUPONS,
          rowId:coupon.$id,
          column:'claimed_count',
          value:1,
          min:0
        });
      }
      await updateOrder(order.$id,{coupon_claimed:false});
      order.coupon_claimed=false;
    }catch(e){
      // Best effort. A later cleanup/check can retry without affecting payment status.
    }
  }

  async function countCouponUsage(order){
    if(!order?.coupon_code||order.coupon_counted===true||order.status!=='success')return;
    try{
      const coupon=await getCoupon(order.coupon_code);
      if(coupon?.$id){
        await tables.incrementRowColumn({
          databaseId:DB,
          tableId:COUPONS,
          rowId:coupon.$id,
          column:'used_count',
          value:1
        });
      }
      await updateOrder(order.$id,{coupon_counted:true});
      order.coupon_counted=true;
    }catch(e){
      // Best effort: payment/access must never fail because usage analytics could not update.
    }
  }

  function maskBuyerName(name=''){
    const words=String(name).trim().split(/\s+/).filter(Boolean);
    if(!words.length)return 'Member';
    const honorifics=new Set(['kak','teh','bu','ibu','pak','bapak','mbak','mba','mas','bunda']);
    if(words.length>1&&honorifics.has(words[0].toLowerCase())){
      const n=words[1];
      return words[0]+' '+n.charAt(0).toUpperCase()+'***';
    }
    const n=words[0];
    return n.charAt(0).toUpperCase()+'***';
  }

  async function getSocialProof(){
    const cfg=await getConfig();
    if(!cfg.social_proof_enabled){
      return {ok:true,enabled:false,interval_seconds:cfg.social_proof_interval_seconds,items:[]};
    }
    const r=await tables.listRows({
      databaseId:DB,
      tableId:ORDERS,
      queries:[
        Query.equal('status','success'),
        Query.orderDesc('$updatedAt'),
        Query.limit(20)
      ]
    });
    const items=(r.rows||r.documents||[])
      .map(rowData)
      .filter(o=>o.access_issued===true&&['qris','coupon_free'].includes(String(o.payment_method||'')))
      .slice(0,8)
      .map(o=>({
        display_name:maskBuyerName(o.full_name),
        paid_at:o.paid_at||o.$updatedAt||null
      }));
    return {
      ok:true,
      enabled:true,
      interval_seconds:cfg.social_proof_interval_seconds,
      items
    };
  }

  async function saveMemberBusinessProfile(body){
    const userId=q(req.headers['x-appwrite-user-id']);
    if(!userId)throw Object.assign(new Error('Sesi member tidak terbaca. Silakan login ulang.'),{status:401});

    const profile=rowData(await tables.getRow({
      databaseId:DB,
      tableId:PROFILES,
      rowId:userId
    }));
    if(!profile?.$id)throw Object.assign(new Error('Profil member tidak ditemukan.'),{status:404});
    if(profile.status!=='active')throw Object.assign(new Error('Akses member tidak aktif.'),{status:403});
    if(profile.access_until&&new Date(profile.access_until).getTime()<=Date.now()){
      throw Object.assign(new Error('Masa akses sudah berakhir. Hubungi admin untuk perpanjangan.'),{status:403});
    }

    const data={
      business_name:q(body.business_name)||null,
      city_area:q(body.city_area)||null,
      product_service:q(body.product_service)||null,
      price_text:q(body.price_text)||null,
      target_buyer:q(body.target_buyer)||null,
      advantage:q(body.advantage)||null,
      brand_color:q(body.brand_color)||null,
      available_assets:q(body.available_assets)||null
    };

    const updated=await tables.updateRow({
      databaseId:DB,
      tableId:PROFILES,
      rowId:userId,
      data
    });
    return {ok:true,profile:rowData(updated)};
  }

  async function createPayment(body){
    const cfg=await getConfig();
    if(!cfg.registration_open){
      throw Object.assign(new Error('Pendaftaran BADAI PROMPT UMKM sedang ditutup.'),{status:423});
    }
    const requestedAmount=Math.floor(Number(body.amount));
    if(!Number.isFinite(requestedAmount)){
      throw Object.assign(new Error('Pilih nominal pembayaran dulu.'),{status:400});
    }
    if(requestedAmount<cfg.minimum_price){
      throw Object.assign(new Error('Nominal minimal adalah '+new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(cfg.minimum_price)+' untuk akses 1 tahun.'),{status:400});
    }
    if(requestedAmount>MAX_PAY_WHAT_YOU_WANT){
      throw Object.assign(new Error('Nominal terlalu besar. Maksimal '+new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(MAX_PAY_WHAT_YOU_WANT)+'.'),{status:400});
    }
    const basePrice=requestedAmount;
    const quote=await quoteCoupon(body.coupon_code,basePrice);
    const price=quote.total;
    const fullName=q(body.full_name);
    const email=q(body.email).toLowerCase();
    const whatsapp=normalizeWa(body.whatsapp);
    if(!fullName||!email||!whatsapp)throw Object.assign(new Error('Nama, email, dan WhatsApp wajib diisi'),{status:400});
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Object.assign(new Error('Email belum valid'),{status:400});
    if(!/^62\d{8,13}$/.test(whatsapp))throw Object.assign(new Error('Nomor WhatsApp belum valid'),{status:400});
    if(!Number.isFinite(basePrice)||basePrice<=0)throw new Error('Harga produk belum valid');

    const paid=await tables.listRows({
      databaseId:DB,tableId:ORDERS,
      queries:[Query.equal('email',email),Query.equal('status','success'),Query.limit(1)]
    });
    if((paid.rows||paid.documents||[]).length){
      throw Object.assign(new Error('Email ini sudah memiliki akses aktif'),{status:409});
    }

    const couponClaimed=await reserveCouponSlot(quote);

    if(price===0){
      const publicToken=randomToken(24);
      const now=new Date().toISOString();
      const created=await tables.createRow({
        databaseId:DB,tableId:ORDERS,rowId:ID.unique(),
        data:{
          public_token:publicToken,
          full_name:fullName,
          email,
          whatsapp,
          amount:0,
          total_amount:0,
          amount_uniq:0,
          admin_fee:0,
          transaction_id:'FREE-'+Date.now().toString(36).toUpperCase(),
          status:'success',
          paid_at:now,
          coupon_code:quote.coupon_code,
          discount_amount:quote.discount_amount,
          coupon_counted:false,
          coupon_claimed:couponClaimed,
          payment_method:'coupon_free'
        }
      });
      const order=rowData(created);
      await countCouponUsage(order);
      return {
        success:true,
        public_token:publicToken,
        transaction_id:order.transaction_id,
        amount:0,
        total_amount:0,
        base_price:basePrice,
        minimum_price:cfg.minimum_price,
        selected_amount:requestedAmount,
        discount_amount:quote.discount_amount,
        coupon_code:quote.coupon_code,
        status:'success',
        access_ready:Boolean(order.access_issued),
        free_order:true
      };
    }

    const payCfg=await getPaymentSettings();
    if(!payCfg.configured)throw Object.assign(new Error('Merchant BuatQRIS belum dikonfigurasi di Admin → Pengaturan.'),{status:503});
    if(!payCfg.is_active)throw Object.assign(new Error('Pembayaran BuatQRIS sedang dinonaktifkan oleh admin.'),{status:503});

    const form=new URLSearchParams({
      action:'api_create_qris',
      account_id:payCfg.account_id,
      secret_token:payCfg.secret_token,
      amount:String(price),
      description:(cfg.product_name+' - '+email).slice(0,100),
      fee_by:payCfg.fee_by,
      callback_url:payCfg.callback_url
    });
    form.set('qris_method',payCfg.qris_method||'qris_two');
    if(payCfg.umkm_name)form.set('umkm_name',payCfg.umkm_name.slice(0,15));
    if(payCfg.test_mode)form.set('test','1');

    let qrRes,raw,payload={},data;
    try{
      qrRes=await fetch(payCfg.api_url,{
        method:'POST',
        headers:{'Content-Type':'application/x-www-form-urlencoded','User-Agent':'BADAI-Prompt-UMKM/1.0'},
        body:form.toString()
      });
      raw=await qrRes.text();
      try{payload=JSON.parse(raw)}catch{}
      data=payload?.data??payload;
      if(!qrRes.ok||payload?.success===false||!data?.transaction_id){
        throw Object.assign(new Error(String(payload?.message||payload?.error||'BuatQris gagal membuat transaksi')),{status:502});
      }
    }catch(e){
      if(couponClaimed&&quote.coupon?.$id){
        try{
          await tables.decrementRowColumn({
            databaseId:DB,tableId:COUPONS,rowId:quote.coupon.$id,column:'claimed_count',value:1,min:0
          });
        }catch{}
      }
      throw e;
    }
    const qrUrl=data.qr_url?String(data.qr_url):(data.qris_image?String(data.qris_image):'');
    if(!qrUrl)throw Object.assign(new Error('BuatQris tidak mengembalikan gambar QR'),{status:502});
    const apiExpiry=data.expired_at?new Date(String(data.expired_at)):null;
    const expiresAt=apiExpiry&&!Number.isNaN(apiExpiry.getTime())
      ?apiExpiry.toISOString()
      :new Date(Date.now()+15*60*1000).toISOString();

    const publicToken=randomToken(24);
    const created=await tables.createRow({
      databaseId:DB,tableId:ORDERS,rowId:ID.unique(),
      data:{
        public_token:publicToken,
        full_name:fullName,
        email,
        whatsapp,
        amount:Number(data.amount??price),
        total_amount:Number(data.total_amount??data.amount??price),
        amount_uniq:Number(data.amount_uniq??0),
        admin_fee:Number(data.admin_fee??0),
        transaction_id:String(data.transaction_id),
        qr_url:qrUrl,
        payment_url:data.payment_url?String(data.payment_url):null,
        status:['pending','success','expired','failed'].includes(String(data.status))?String(data.status):'pending',
        expires_at:expiresAt,
        paid_at:String(data.status)==='success'?new Date().toISOString():null,
        coupon_code:quote.coupon_code,
        discount_amount:quote.discount_amount,
        coupon_counted:false,
        coupon_claimed:couponClaimed,
        payment_method:'qris'
      }
    });
    const order=rowData(created);
    if(order.status==='success')await countCouponUsage(order);
    return {
      success:true,
      public_token:publicToken,
      transaction_id:order.transaction_id,
      qr_url:order.qr_url,
      payment_url:order.payment_url,
      amount:order.amount,
      total_amount:order.total_amount,
      base_price:basePrice,
      minimum_price:cfg.minimum_price,
      selected_amount:requestedAmount,
      discount_amount:quote.discount_amount,
      coupon_code:quote.coupon_code,
      status:order.status,
      expires_at:order.expires_at
    };
  }

  async function provisionMemberLogin(order){
    const email=q(order.email).toLowerCase();
    if(!email)throw Object.assign(new Error('Email order kosong.'),{status:400});
    const password=loginPasswordFor(order);

    const found=await users.list({queries:[Query.equal('email',email),Query.limit(1)]});
    let user=(found.users||[])[0]||null;

    if(!user){
      user=await users.create({
        userId:ID.unique(),
        email,
        password,
        name:q(order.full_name||'Member BADAI PROMPT UMKM').slice(0,128)
      });
    }else{
      await users.updatePassword({userId:user.$id,password});
      if(q(order.full_name)){
        try{await users.updateName({userId:user.$id,name:q(order.full_name).slice(0,128)});}catch{}
      }
    }

    try{
      await teams.createMembership({teamId:TEAM_ID,roles:['member'],userId:user.$id});
    }catch(e){
      if(Number(e?.code)!==409)throw e;
    }

    const profile={
      user_id:user.$id,
      name:q(order.full_name),
      email,
      whatsapp:q(order.whatsapp),
      status:'active',
      role:'member',
      access_until:oneYearFrom(order.paid_at||order.$updatedAt||new Date().toISOString())
    };

    try{
      await tables.createRow({
        databaseId:DB,
        tableId:PROFILES,
        rowId:user.$id,
        data:profile,
        permissions:[Permission.read(Role.user(user.$id))]
      });
    }catch(e){
      if(Number(e?.code)===409){
        await tables.updateRow({databaseId:DB,tableId:PROFILES,rowId:user.$id,data:profile});
      }else throw e;
    }

    if(order.user_id!==user.$id||order.access_issued!==true){
      order=rowData(await updateOrder(order.$id,{user_id:user.$id,access_issued:true}));
    }

    return {
      email,
      login_password:password,
      user_id:user.$id,
      access_ready:true,
      access_until:profile.access_until
    };
  }

  async function checkPayment(body){
    const token=q(body.public_token);
    if(!token)throw Object.assign(new Error('public_token wajib diisi'),{status:400});
    let order=await getOrderByToken(token);
    if(!order?.$id)throw Object.assign(new Error('Transaksi tidak ditemukan'),{status:404});

    if(order.status==='success'){
      await countCouponUsage(order);
      const login=await provisionMemberLogin(order);
      return {success:true,status:'success',...login};
    }
    if(['expired','failed'].includes(order.status)){
      await releaseCouponClaim(order);
      return {success:true,status:order.status};
    }

    if(order.expires_at&&new Date(order.expires_at).getTime()<=Date.now()){
      const expired=rowData(await updateOrder(order.$id,{status:'expired'}));
      await releaseCouponClaim(expired);
      return {success:true,status:'expired'};
    }

    const payCfg=await getPaymentSettings();
    if(!payCfg.configured)throw Object.assign(new Error('Merchant BuatQRIS belum dikonfigurasi.'),{status:503});
    const form=new URLSearchParams({
      action:'api_check_status',
      account_id:payCfg.account_id,
      secret_token:payCfg.secret_token,
      transaction_id:String(order.transaction_id)
    });
    const qrRes=await fetch(payCfg.api_url,{
      method:'POST',
      headers:{'Content-Type':'application/x-www-form-urlencoded','User-Agent':'BADAI-Prompt-UMKM/1.0'},
      body:form.toString()
    });
    const raw=await qrRes.text();
    let payload={};try{payload=JSON.parse(raw)}catch{}
    if(qrRes.status===429||payload?.error==='rate_limited'){
      return {success:true,status:'pending',retry_after:Number(payload?.retry_after||20)};
    }
    if(!qrRes.ok||payload?.success===false){
      throw Object.assign(new Error(String(payload?.message||payload?.error||'Gagal mengecek status BuatQris')),{status:502});
    }
    const data=payload?.data??payload;
    const candidate=String(data?.status??order.status);
    const status=['pending','success','expired','failed'].includes(candidate)?candidate:order.status;
    const patch={status};
    if(status==='success')patch.paid_at=new Date().toISOString();
    const updated=rowData(await updateOrder(order.$id,patch));
    if(status==='success'){
      await countCouponUsage(updated);
      const login=await provisionMemberLogin(updated);
      return {success:true,status:'success',...login};
    }
    if(status==='expired'||status==='failed')await releaseCouponClaim(updated);
    return {success:true,status,email:updated.email,access_ready:Boolean(updated.access_issued)};
  }

  async function webhook(){
    const payCfg=await getPaymentSettings();
    const secret=payCfg.signing_secret||'';
    const raw=req.bodyText??req.body??'';
    const given=req.headers['x-buatqris-signature']||req.headers['X-BuatQris-Signature']||'';
    const expected=hmac(secret,String(raw));
    if(!secret||!given||!safeEqual(given,expected))throw Object.assign(new Error('Invalid signature'),{status:401});
    let payload={};try{payload=JSON.parse(String(raw))}catch{throw Object.assign(new Error('Invalid JSON'),{status:400})}
    const eventName=String(payload?.event||req.headers['x-buatqris-event']||'');
    const transactionId=q(payload?.transaction_id||payload?.data?.transaction_id);
    if(!transactionId)throw Object.assign(new Error('transaction_id missing'),{status:400});
    const order=await getOrderByTransaction(transactionId);
    if(!order?.$id)return {ok:true,ignored:true};

    let status=order.status;
    if(eventName==='payment.success')status='success';
    else if(eventName==='payment.expired')status='expired';
    else if(eventName==='payment.failed')status='failed';
    const patch={status};
    if(status==='success')patch.paid_at=new Date().toISOString();
    const updated=rowData(await updateOrder(order.$id,patch));
    if(status==='success')await countCouponUsage(updated);
    if(status==='expired'||status==='failed')await releaseCouponClaim(updated);
    return {ok:true};
  }

  try{
    const path=req.path||'/';
    if(req.method==='GET'&&(path==='/'||path==='/health'||path==='/config')){
      const cfg=await getConfig();
      return reply(res,{
        ok:true,
        service:'BADAI PROMPT UMKM payment-api',
        product_name:cfg.product_name,
        price:cfg.price,
        minimum_price:cfg.minimum_price,
        price_mode:cfg.price_mode,
        registration_open:cfg.registration_open,
        payment_configured:(await getPaymentSettings()).configured
      });
    }
    if(req.method!=='POST')return reply(res,{error:'Method not allowed'},405);
    if(path==='/config'){
      const cfg=await getConfig();
      const payment=await getPaymentSettings();
      return reply(res,{ok:true,...cfg,payment_configured:payment.configured,payment_active:payment.is_active,test_mode:payment.test_mode});
    }
    if(path==='/social-proof')return reply(res,await getSocialProof());
    if(path==='/profile/save')return reply(res,await saveMemberBusinessProfile(req.bodyJson||{}));
    if(path==='/quote'){
      const cfg=await getConfig();
      const supplied=Number(req.bodyJson?.amount);
      const basePrice=Number.isFinite(supplied)&&supplied>0?Math.floor(supplied):cfg.price;
      if(basePrice<cfg.minimum_price){
        return reply(res,{error:'Nominal minimal adalah '+new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(cfg.minimum_price)+'.'},400);
      }
      const quote=await quoteCoupon(req.bodyJson?.coupon_code,basePrice);
      return reply(res,{
        ok:true,
        base_price:quote.base_price,
        discount_amount:quote.discount_amount,
        total:quote.total,
        coupon_code:quote.coupon_code,
        minimum_price:cfg.minimum_price
      });
    }
    if(path==='/create')return reply(res,await createPayment(req.bodyJson||{}));
    if(path==='/check')return reply(res,await checkPayment(req.bodyJson||{}));
    if(path==='/webhook')return reply(res,await webhook());
    return reply(res,{error:'Not found'},404);
  }catch(e){
    error?.(e?.stack||String(e));
    return reply(res,{error:String(e?.message||e||'Server error')},Number(e?.status||e?.code||500));
  }
};