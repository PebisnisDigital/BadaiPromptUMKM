import crypto from 'node:crypto';
import { Client, TablesDB, ID, Query } from 'node-appwrite';

const DB=process.env.APP_DB_ID || 'badai_prompt_umkm';
const ORDERS=process.env.ORDERS_TABLE_ID || 'orders';
const SETTINGS='settings';
const COUPONS='coupons';
const FALLBACK_PRICE=Number(process.env.PRODUCT_PRICE || 87000);
const APP_URL=process.env.APP_URL || 'https://badaipromptumkm2026.vercel.app';

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

export default async ({req,res,error})=>{
  if(req.method==='OPTIONS')return res.text('ok',200,corsHeaders());

  const key=req.headers['x-appwrite-key'];
  const endpoint=process.env.APPWRITE_FUNCTION_API_ENDPOINT;
  const project=process.env.APPWRITE_FUNCTION_PROJECT_ID;
  if(!key||!endpoint||!project)return reply(res,{error:'Appwrite runtime key unavailable'},500);

  const client=new Client().setEndpoint(endpoint).setProject(project).setKey(key);
  const tables=new TablesDB(client);

  async function getConfig(){
    const r=await tables.listRows({databaseId:DB,tableId:SETTINGS,queries:[Query.limit(20)]});
    const map={};
    for(const row of (r.rows||r.documents||[])){
      const d=rowData(row);
      map[d.key]=d.value;
    }
    const parsed=Number(map.product_price);
    return {
      product_name:q(map.product_name)||'BADAI PROMPT UMKM',
      price:Number.isFinite(parsed)&&parsed>0?parsed:FALLBACK_PRICE,
      registration_open:String(map.registration_open??'true')==='true'
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
    const used=Math.max(Number(coupon.used_count)||0,0);
    if(limit>0&&used>=limit)throw Object.assign(new Error('Kuota pemakaian kupon sudah habis.'),{status:400});

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

  async function countCouponUsage(order){
    if(!order?.coupon_code||order.coupon_counted===true||order.status!=='success')return;
    try{
      const coupon=await getCoupon(order.coupon_code);
      if(coupon?.$id){
        await tables.updateRow({
          databaseId:DB,
          tableId:COUPONS,
          rowId:coupon.$id,
          data:{used_count:Math.max(Number(coupon.used_count)||0,0)+1}
        });
      }
      await updateOrder(order.$id,{coupon_counted:true});
      order.coupon_counted=true;
    }catch(e){
      // Best effort: payment/access must never fail because usage analytics could not update.
    }
  }

  async function createPayment(body){
    const cfg=await getConfig();
    if(!cfg.registration_open){
      throw Object.assign(new Error('Pendaftaran BADAI PROMPT UMKM sedang ditutup.'),{status:423});
    }
    const basePrice=cfg.price;
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
        discount_amount:quote.discount_amount,
        coupon_code:quote.coupon_code,
        status:'success',
        access_ready:Boolean(order.access_issued),
        free_order:true
      };
    }

    const callback=process.env.PAYMENT_CALLBACK_URL;
    if(!callback)throw new Error('Payment callback belum dikonfigurasi');

    const form=new URLSearchParams({
      action:'api_create_qris',
      account_id:process.env.BUATQRIS_ACCOUNT_ID||'',
      secret_token:process.env.BUATQRIS_SECRET_TOKEN||'',
      amount:String(price),
      description:(cfg.product_name+' - '+email).slice(0,100),
      fee_by:process.env.BUATQRIS_FEE_BY||'buyer',
      callback_url:callback,
      app_name:cfg.product_name,
      app_version:'1.0',
      app_url:APP_URL
    });
    const method=process.env.BUATQRIS_QRIS_METHOD||'default';
    if(method!=='default')form.set('qris_method',method);
    if(String(process.env.BUATQRIS_TEST_MODE).toLowerCase()==='true')form.set('test','1');

    const qrRes=await fetch('https://api.buatqris.site',{
      method:'POST',
      headers:{'Content-Type':'application/x-www-form-urlencoded','User-Agent':'BADAI-Prompt-UMKM/1.0'},
      body:form.toString()
    });
    const raw=await qrRes.text();
    let payload={};try{payload=JSON.parse(raw)}catch{}
    const data=payload?.data??payload;
    if(!qrRes.ok||payload?.success===false||!data?.transaction_id){
      throw Object.assign(new Error(String(payload?.message||payload?.error||'BuatQris gagal membuat transaksi')),{status:502});
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
      discount_amount:quote.discount_amount,
      coupon_code:quote.coupon_code,
      status:order.status,
      expires_at:order.expires_at
    };
  }

  async function checkPayment(body){
    const token=q(body.public_token);
    if(!token)throw Object.assign(new Error('public_token wajib diisi'),{status:400});
    let order=await getOrderByToken(token);
    if(!order?.$id)throw Object.assign(new Error('Transaksi tidak ditemukan'),{status:404});

    if(order.status==='success'){
      await countCouponUsage(order);
      return {success:true,status:'success',email:order.email,access_ready:Boolean(order.access_issued)};
    }
    if(['expired','failed'].includes(order.status))return {success:true,status:order.status};

    if(order.expires_at&&new Date(order.expires_at).getTime()<=Date.now()){
      await updateOrder(order.$id,{status:'expired'});
      return {success:true,status:'expired'};
    }

    const form=new URLSearchParams({
      action:'api_check_status',
      account_id:process.env.BUATQRIS_ACCOUNT_ID||'',
      secret_token:process.env.BUATQRIS_SECRET_TOKEN||'',
      transaction_id:String(order.transaction_id)
    });
    const qrRes=await fetch('https://api.buatqris.site',{
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
    if(status==='success')await countCouponUsage(updated);
    return {success:true,status,email:updated.email,access_ready:Boolean(updated.access_issued)};
  }

  async function webhook(){
    const secret=process.env.BUATQRIS_SIGNING_SECRET||'';
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
        registration_open:cfg.registration_open,
        configured:Boolean(process.env.BUATQRIS_ACCOUNT_ID&&process.env.BUATQRIS_SECRET_TOKEN)
      });
    }
    if(req.method!=='POST')return reply(res,{error:'Method not allowed'},405);
    if(path==='/config'){
      const cfg=await getConfig();
      return reply(res,{ok:true,...cfg});
    }
    if(path==='/quote'){
      const cfg=await getConfig();
      const quote=await quoteCoupon(req.bodyJson?.coupon_code,cfg.price);
      return reply(res,{
        ok:true,
        base_price:quote.base_price,
        discount_amount:quote.discount_amount,
        total:quote.total,
        coupon_code:quote.coupon_code
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