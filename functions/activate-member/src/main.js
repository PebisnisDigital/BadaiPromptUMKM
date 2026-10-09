import { deleteSalesData } from './delete-sales.js';
import { Client, TablesDB, Users, Teams, ID, Query, Permission, Role } from 'node-appwrite';

const DB=process.env.APP_DB_ID || 'badai_prompt_umkm';
const ORDERS=process.env.ORDERS_TABLE_ID || 'orders';
const PROFILES=process.env.PROFILES_TABLE_ID || 'member_profiles';
const PROMPTS='prompts';
const SETTINGS='settings';
const FAVORITES='favorites';
const HISTORY='prompt_history';
const EVENTS='prompt_usage_events';
const COUPONS='coupons';
const PAYMENT_SETTINGS='payment_settings';
const TEAM_ID=process.env.PAID_TEAM_ID || 'paid-members';

const unpack=(row)=>({...((row&&row.data)||row||{}),$id:row?.$id||row?.data?.$id,$createdAt:row?.$createdAt,$updatedAt:row?.$updatedAt});
const q=(v)=>String(v??'').trim();
const slugify=(s='')=>String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,220);
const oneYearFrom=(value)=>{
  const d=value?new Date(value):new Date();
  const base=Number.isNaN(d.getTime())?new Date():d;
  const out=new Date(base.getTime());
  out.setUTCFullYear(out.getUTCFullYear()+1);
  return out.toISOString();
};

async function listAll(tables,tableId,baseQueries=[]){
  const rows=[];
  for(let offset=0;offset<5000;offset+=100){
    const r=await tables.listRows({
      databaseId:DB,
      tableId,
      queries:[...baseQueries,Query.limit(100),Query.offset(offset)]
    });
    const part=(r.rows||r.documents||[]).map(unpack);
    rows.push(...part);
    if(part.length<100) break;
  }
  return rows;
}

async function expireMemberAccess(tables,teams){
  const now=Date.now();
  const active=await listAll(tables,PROFILES,[Query.equal('status','active')]);
  let expired=0;
  for(const profile of active){
    if(!profile.access_until)continue;
    const until=new Date(profile.access_until).getTime();
    if(!Number.isFinite(until)||until>now)continue;

    const memberships=await teams.listMemberships({
      teamId:TEAM_ID,
      queries:[Query.equal('userId',profile.user_id),Query.limit(10)]
    });
    for(const membership of (memberships.memberships||[])){
      await teams.deleteMembership({teamId:TEAM_ID,membershipId:membership.$id});
    }
    await tables.updateRow({
      databaseId:DB,
      tableId:PROFILES,
      rowId:profile.user_id,
      data:{status:'blocked'}
    });
    expired++;
  }
  return expired;
}

export default async ({req,res,log,error})=>{
  try{
    const client=new Client()
      .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
      .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
      .setKey(req.headers['x-appwrite-key']);

    const tables=new TablesDB(client);
    const users=new Users(client);
    const teams=new Teams(client);
    const path=req.path||'/';
    const body=req.bodyJson||{};

    // Scheduled execution: expire time-limited access without adding another Function.
    if(path==='/' && !body?.$id){
      const expired=await expireMemberAccess(tables,teams);
      return res.json({ok:true,expired});
    }

    // HTTP admin routes. Client execution is restricted to team:admin-users
    // at the Appwrite Function permission layer.
    if(path.startsWith('/admin/')){
      const route=path.slice('/admin'.length);

      if(route==='/health'){
        return res.json({ok:true,service:'BADAI PROMPT UMKM admin-api'});
      }

      if(route==='/dashboard'){
        const [promptRows,orderRows,memberRows,favoriteRows,historyRows,eventRows]=await Promise.all([
          listAll(tables,PROMPTS),
          listAll(tables,ORDERS),
          listAll(tables,PROFILES),
          listAll(tables,FAVORITES),
          listAll(tables,HISTORY),
          listAll(tables,EVENTS)
        ]);

        const paid=orderRows.filter(x=>x.status==='success');
        const promptMap=new Map(promptRows.map(p=>[p.$id,p]));
        const memberMap=new Map(memberRows.map(m=>[m.user_id,m]));

        const usageByPrompt=new Map();
        const usageByUser=new Map();
        let totalUses=0;
        for(const h of historyRows){
          const count=Math.max(Number(h.use_count)||0,0);
          totalUses+=count;
          usageByPrompt.set(h.prompt_id,(usageByPrompt.get(h.prompt_id)||0)+count);
          usageByUser.set(h.user_id,(usageByUser.get(h.user_id)||0)+count);
        }

        const favoritesByPrompt=new Map();
        for(const fav of favoriteRows){
          favoritesByPrompt.set(fav.prompt_id,(favoritesByPrompt.get(fav.prompt_id)||0)+1);
        }

        const topUsed=[...usageByPrompt.entries()]
          .sort((a,b)=>b[1]-a[1])
          .slice(0,5)
          .map(([prompt_id,count])=>({
            prompt_id,
            count,
            title:promptMap.get(prompt_id)?.title||prompt_id,
            niche:promptMap.get(prompt_id)?.niche||''
          }));

        const topFavorites=[...favoritesByPrompt.entries()]
          .sort((a,b)=>b[1]-a[1])
          .slice(0,5)
          .map(([prompt_id,count])=>({
            prompt_id,
            count,
            title:promptMap.get(prompt_id)?.title||prompt_id,
            niche:promptMap.get(prompt_id)?.niche||''
          }));

        const topMembers=[...usageByUser.entries()]
          .sort((a,b)=>b[1]-a[1])
          .slice(0,5)
          .map(([user_id,count])=>({
            user_id,
            count,
            name:memberMap.get(user_id)?.name||memberMap.get(user_id)?.email||user_id,
            email:memberMap.get(user_id)?.email||''
          }));

        const dateKey=(date)=>new Intl.DateTimeFormat('en-CA',{
          timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'
        }).format(date);
        const dayLabel=(date)=>new Intl.DateTimeFormat('id-ID',{
          timeZone:'Asia/Jakarta',weekday:'short',day:'numeric',month:'short'
        }).format(date);

        const daily=[];
        for(let i=6;i>=0;i--){
          const date=new Date(Date.now()-i*86400000);
          const key=dateKey(date);
          daily.push({key,label:dayLabel(date),count:0});
        }
        const dailyMap=new Map(daily.map(d=>[d.key,d]));
        for(const ev of eventRows){
          if(!ev.used_at)continue;
          const key=dateKey(new Date(ev.used_at));
          const bucket=dailyMap.get(key);
          if(bucket)bucket.count+=1;
        }

        const todayKey=dateKey(new Date());
        const usesToday=dailyMap.get(todayKey)?.count||0;

        return res.json({
          ok:true,
          stats:{
            prompts:promptRows.length,
            published:promptRows.filter(x=>x.is_published!==false).length,
            featured:promptRows.filter(x=>x.is_featured===true).length,
            orders:orderRows.length,
            paid_orders:paid.length,
            revenue:paid.reduce((n,x)=>n+Number(x.total_amount||x.amount||0),0),
            pending_orders:orderRows.filter(x=>x.status==='pending').length,
            members:memberRows.filter(x=>x.status==='active').length,
            blocked:memberRows.filter(x=>x.status==='blocked').length,
            total_uses:totalUses,
            uses_today:usesToday,
            total_favorites:favoriteRows.length,
            tracked_events:eventRows.length
          },
          insights:{
            top_used:topUsed,
            top_favorites:topFavorites,
            top_members:topMembers,
            daily_usage:daily
          },
          recent_orders:orderRows
            .sort((a,b)=>String(b.$createdAt||'').localeCompare(String(a.$createdAt||'')))
            .slice(0,8)
        });
      }

      if(route==='/prompts/list'){
        const queries=[
          Query.orderAsc('sort_order'),
          Query.limit(Math.min(Number(body.limit)||50,100)),
          Query.offset(Math.max(Number(body.offset)||0,0))
        ];
        if(q(body.niche)) queries.unshift(Query.equal('niche',q(body.niche)));
        if(q(body.goal)) queries.unshift(Query.equal('goal',q(body.goal)));
        if(body.published===true||body.published===false) queries.unshift(Query.equal('is_published',body.published));
        if(q(body.search)) queries.unshift(Query.search('title',q(body.search)));
        const r=await tables.listRows({databaseId:DB,tableId:PROMPTS,queries});
        return res.json({ok:true,total:r.total||0,rows:(r.rows||r.documents||[]).map(unpack)});
      }

      if(route==='/prompts/save'){
        const data={
          niche:q(body.niche),
          goal:q(body.goal),
          output_type:q(body.output_type),
          title:q(body.title),
          prompt_text:q(body.prompt_text),
          variables:q(body.variables)||null,
          tags:q(body.tags)||null,
          slug:q(body.slug)||slugify(body.title),
          preview_url:q(body.preview_url)||null,
          is_published:body.is_published!==false,
          is_featured:body.is_featured===true,
          sort_order:Number(body.sort_order)||0
        };
        if(!data.niche||!data.goal||!data.output_type||!data.title||!data.prompt_text){
          return res.json({error:'Niche, kebutuhan, tipe output, judul, dan prompt wajib diisi.'},400);
        }
        let saved;
        if(q(body.id)){
          saved=await tables.updateRow({databaseId:DB,tableId:PROMPTS,rowId:q(body.id),data});
        }else{
          saved=await tables.createRow({databaseId:DB,tableId:PROMPTS,rowId:ID.unique(),data});
        }
        return res.json({ok:true,row:unpack(saved)});
      }

      if(route==='/prompts/toggle'){
        const id=q(body.id);
        if(!id)return res.json({error:'id wajib'},400);
        const patch={};
        if(typeof body.is_published==='boolean')patch.is_published=body.is_published;
        if(typeof body.is_featured==='boolean')patch.is_featured=body.is_featured;
        const saved=await tables.updateRow({databaseId:DB,tableId:PROMPTS,rowId:id,data:patch});
        return res.json({ok:true,row:unpack(saved)});
      }

      if(route==='/prompts/delete'){
        const id=q(body.id);
        if(!id)return res.json({error:'id wajib'},400);
        await tables.deleteRow({databaseId:DB,tableId:PROMPTS,rowId:id});
        return res.json({ok:true});
      }

      if(route==='/orders/list'){
        const queries=[
          Query.orderDesc('$createdAt'),
          Query.limit(Math.min(Number(body.limit)||100,100)),
          Query.offset(Math.max(Number(body.offset)||0,0))
        ];
        if(q(body.status))queries.unshift(Query.equal('status',q(body.status)));
        const r=await tables.listRows({databaseId:DB,tableId:ORDERS,queries});
        return res.json({ok:true,total:r.total||0,rows:(r.rows||r.documents||[]).map(unpack)});
      }

      if(route==='/sales/save'){
        const orderId=q(body.order_id);
        if(!orderId)return res.json({error:'order_id wajib'},400);

        const order=unpack(await tables.getRow({databaseId:DB,tableId:ORDERS,rowId:orderId}));
        const userId=q(body.user_id)||q(order.user_id);
        const name=q(body.name)||q(order.full_name);
        const email=q(body.email).toLowerCase()||q(order.email).toLowerCase();
        let whatsapp=q(body.whatsapp).replace(/\D/g,'');
        if(whatsapp.startsWith('0'))whatsapp='62'+whatsapp.slice(1);
        if(!whatsapp)whatsapp=q(order.whatsapp);

        if(!name||!email)return res.json({error:'Nama dan email wajib diisi.'},400);
        if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return res.json({error:'Email belum valid.'},400);

        const paymentStatus=['success','pending','expired','failed'].includes(q(body.payment_status))
          ?q(body.payment_status):q(order.status)||'pending';
        const accessStatus=['active','pending','blocked'].includes(q(body.access_status))
          ?q(body.access_status):'pending';
        const amount=Math.max(Number(body.amount??order.total_amount??order.amount)||0,0);
        const paymentMethod=q(body.payment_method)||q(order.payment_method)||'manual';
        const notes=q(body.notes)||null;

        let accessUntil=null;
        if(q(body.access_until)){
          const d=new Date(q(body.access_until));
          if(Number.isNaN(d.getTime()))return res.json({error:'Tanggal masa akses tidak valid.'},400);
          accessUntil=d.toISOString();
        }

        if(userId){
          try{await users.updateName({userId,name:name.slice(0,128)});}catch{}
          if(email&&email!==q(order.email).toLowerCase()){
            await users.updateEmail({userId,email});
          }

          const profileData={
            name,
            email,
            whatsapp:whatsapp||null,
            status:accessStatus,
            access_until:accessUntil,
            business_name:q(body.business_name)||null,
            city_area:q(body.city_area)||null,
            product_service:q(body.product_service)||null,
            price_text:q(body.price_text)||null,
            target_buyer:q(body.target_buyer)||null,
            advantage:q(body.advantage)||null,
            brand_color:q(body.brand_color)||null,
            available_assets:q(body.available_assets)||null
          };

          try{
            await tables.updateRow({databaseId:DB,tableId:PROFILES,rowId:userId,data:profileData});
          }catch(e){
            if(Number(e?.code)===404){
              await tables.createRow({
                databaseId:DB,
                tableId:PROFILES,
                rowId:userId,
                data:{user_id:userId,role:'member',...profileData},
                permissions:[Permission.read(Role.user(userId))]
              });
            }else throw e;
          }

          const memberships=await teams.listMemberships({
            teamId:TEAM_ID,
            queries:[Query.equal('userId',userId),Query.limit(10)]
          });
          const current=(memberships.memberships||[])[0]||null;
          if(accessStatus==='active'&&!current){
            await teams.createMembership({teamId:TEAM_ID,roles:['member'],userId});
          }
          if(accessStatus!=='active'&&current){
            await teams.deleteMembership({teamId:TEAM_ID,membershipId:current.$id});
          }
        }

        const savedOrder=await tables.updateRow({
          databaseId:DB,
          tableId:ORDERS,
          rowId:orderId,
          data:{
            full_name:name,
            email,
            whatsapp:whatsapp||null,
            amount,
            total_amount:amount,
            status:paymentStatus,
            paid_at:paymentStatus==='success'?(order.paid_at||new Date().toISOString()):null,
            user_id:userId||null,
            access_issued:Boolean(userId&&accessStatus==='active'),
            payment_method:paymentMethod,
            notes
          }
        });

        return res.json({ok:true,order:unpack(savedOrder),user_id:userId||null});
      }

      if(route==='/sales/delete'){
        try{
          const result=await deleteSalesData({
            body,actorId:q(req.headers['x-appwrite-user-id']),tables,users,teams,Query,
            databaseId:DB,ordersTable:ORDERS,profilesTable:PROFILES,paidTeam:TEAM_ID
          });
          return res.json(result);
        }catch(e){return res.json({ok:false,error:String(e?.message||e)},Number(e?.status||e?.code)||500)}
      }

      if(route==='/members/manual-create'){
        const name=q(body.name);
        const email=q(body.email).toLowerCase();
        let whatsapp=q(body.whatsapp).replace(/\D/g,'');
        if(whatsapp.startsWith('0')) whatsapp='62'+whatsapp.slice(1);
        const accessStatus=body.access_status==='active'?'active':'pending';
        const paymentStatus=body.payment_status==='success'?'success':'pending';
        const paymentMethod=q(body.payment_method)||'manual';
        const notes=q(body.notes)||null;
        const amount=Math.max(Number(body.amount)||0,0);

        if(!name||!email||!whatsapp){
          return res.json({error:'Nama, email, dan WhatsApp wajib diisi.'},400);
        }
        if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
          return res.json({error:'Email belum valid.'},400);
        }

        const found=await users.list({queries:[Query.equal('email',email),Query.limit(1)]});
        let user=(found.users||[])[0]||null;
        if(!user){
          user=await users.create({
            userId:ID.unique(),
            email,
            name:name.slice(0,128)
          });
        }

        const profileData={
          user_id:user.$id,
          name,
          email,
          whatsapp,
          status:accessStatus,
          role:'member'
        };

        try{
          await tables.createRow({
            databaseId:DB,
            tableId:PROFILES,
            rowId:user.$id,
            data:profileData,
            permissions:[
              Permission.read(Role.user(user.$id))
            ]
          });
        }catch(e){
          if(Number(e?.code)===409){
            await tables.updateRow({
              databaseId:DB,
              tableId:PROFILES,
              rowId:user.$id,
              data:profileData
            });
          }else throw e;
        }

        const memberships=await teams.listMemberships({
          teamId:TEAM_ID,
          queries:[Query.equal('userId',user.$id),Query.limit(10)]
        });
        const current=(memberships.memberships||[])[0]||null;

        if(accessStatus==='active'&&!current){
          await teams.createMembership({teamId:TEAM_ID,roles:['member'],userId:user.$id});
        }
        if(accessStatus!=='active'&&current){
          await teams.deleteMembership({teamId:TEAM_ID,membershipId:current.$id});
        }

        const stamp=Date.now().toString(36).toUpperCase();
        const order=await tables.createRow({
          databaseId:DB,
          tableId:ORDERS,
          rowId:ID.unique(),
          data:{
            public_token:'MANUAL-'+ID.unique(),
            full_name:name,
            email,
            whatsapp,
            amount,
            total_amount:amount,
            amount_uniq:0,
            admin_fee:0,
            transaction_id:'MANUAL-'+stamp,
            status:paymentStatus,
            paid_at:paymentStatus==='success'?new Date().toISOString():null,
            user_id:user.$id,
            access_issued:accessStatus==='active',
            payment_method:paymentMethod,
            notes
          }
        });

        return res.json({
          ok:true,
          user_id:user.$id,
          access_status:accessStatus,
          payment_status:paymentStatus,
          order:unpack(order)
        });
      }

      if(route==='/members/list'){
        const queries=[
          Query.limit(Math.min(Number(body.limit)||100,100)),
          Query.offset(Math.max(Number(body.offset)||0,0))
        ];
        if(q(body.status))queries.unshift(Query.equal('status',q(body.status)));
        const r=await tables.listRows({databaseId:DB,tableId:PROFILES,queries});
        return res.json({ok:true,total:r.total||0,rows:(r.rows||r.documents||[]).map(unpack)});
      }

      if(route==='/members/get'){
        const userId=q(body.user_id);
        if(!userId)return res.json({error:'user_id wajib'},400);
        const profile=await tables.getRow({
          databaseId:DB,
          tableId:PROFILES,
          rowId:userId
        });
        return res.json({ok:true,row:unpack(profile)});
      }

      if(route==='/members/save'){
        const userId=q(body.user_id);
        if(!userId)return res.json({error:'user_id wajib'},400);

        const status=['pending','active','blocked'].includes(q(body.status))?q(body.status):'pending';
        let whatsapp=q(body.whatsapp).replace(/\D/g,'');
        if(whatsapp.startsWith('0'))whatsapp='62'+whatsapp.slice(1);

        let accessUntil=null;
        if(q(body.access_until)){
          const d=new Date(q(body.access_until));
          if(Number.isNaN(d.getTime()))return res.json({error:'Tanggal masa akses tidak valid.'},400);
          accessUntil=d.toISOString();
        }

        const data={
          name:q(body.name)||null,
          whatsapp:whatsapp||null,
          status,
          access_until:accessUntil,
          business_name:q(body.business_name)||null,
          city_area:q(body.city_area)||null,
          product_service:q(body.product_service)||null,
          price_text:q(body.price_text)||null,
          target_buyer:q(body.target_buyer)||null,
          advantage:q(body.advantage)||null,
          brand_color:q(body.brand_color)||null,
          available_assets:q(body.available_assets)||null
        };

        const profile=await tables.updateRow({
          databaseId:DB,
          tableId:PROFILES,
          rowId:userId,
          data
        });

        const memberships=await teams.listMemberships({
          teamId:TEAM_ID,
          queries:[Query.equal('userId',userId),Query.limit(10)]
        });
        const current=(memberships.memberships||[])[0]||null;

        if(status==='active'&&!current){
          await teams.createMembership({teamId:TEAM_ID,roles:['member'],userId});
        }
        if(status!=='active'&&current){
          await teams.deleteMembership({teamId:TEAM_ID,membershipId:current.$id});
        }

        return res.json({ok:true,row:unpack(profile)});
      }

      if(route==='/members/status'){
        const userId=q(body.user_id);
        const status=q(body.status);
        if(!userId||!['active','blocked'].includes(status)){
          return res.json({error:'Data status member tidak valid.'},400);
        }
        const profile=await tables.updateRow({
          databaseId:DB,tableId:PROFILES,rowId:userId,data:{status}
        });
        const memberships=await teams.listMemberships({
          teamId:TEAM_ID,
          queries:[Query.equal('userId',userId),Query.limit(10)]
        });
        const current=(memberships.memberships||[])[0]||null;
        if(status==='blocked'&&current){
          await teams.deleteMembership({teamId:TEAM_ID,membershipId:current.$id});
        }
        if(status==='active'&&!current){
          await teams.createMembership({teamId:TEAM_ID,roles:['member'],userId});
        }
        return res.json({ok:true,row:unpack(profile)});
      }

      if(route==='/payment/get'){
        let row=null;
        try{
          row=unpack(await tables.getRow({databaseId:DB,tableId:PAYMENT_SETTINGS,rowId:'buatqris'}));
        }catch(e){
          if(Number(e?.code)!==404)throw e;
        }
        return res.json({
          ok:true,
          payment:{
            provider:'buatqris',
            merchant_label:row?.merchant_label||'BADAI PROMPT UMKM',
            account_id:row?.account_id||'',
            qris_method:row?.qris_method||'qris_two',
            fee_by:row?.fee_by||'user',
            umkm_name:row?.umkm_name||'',
            test_mode:row?.test_mode!==false,
            callback_url:row?.callback_url||'https://badaiprompt.vercel.app/api/buatqris-webhook',
            api_url:row?.api_url||'https://app.buatqris.site/api',
            is_active:row?.is_active!==false,
            has_secret_token:Boolean(row?.secret_token),
            has_signing_secret:Boolean(row?.signing_secret),
            configured:Boolean(row?.account_id&&row?.secret_token)
          }
        });
      }

      if(route==='/payment/save'){
        let existing=null;
        try{
          existing=unpack(await tables.getRow({databaseId:DB,tableId:PAYMENT_SETTINGS,rowId:'buatqris'}));
        }catch(e){
          if(Number(e?.code)!==404)throw e;
        }

        const qrisMethod=['qris_one','qris_two','qris_three','qris_four'].includes(q(body.qris_method))
          ?q(body.qris_method):'qris_two';
        const feeBy=['user','buyer'].includes(q(body.fee_by))?q(body.fee_by):'user';
        const umkmName=q(body.umkm_name).slice(0,15);
        const accountId=q(body.account_id);
        const secretToken=q(body.secret_token)||existing?.secret_token||null;
        const signingSecret=q(body.signing_secret)||existing?.signing_secret||null;
        const callbackUrl=q(body.callback_url)||'https://badaiprompt.vercel.app/api/buatqris-webhook';
        const apiUrl=q(body.api_url)||'https://app.buatqris.site/api';

        if(!accountId)return res.json({error:'Account ID BuatQRIS wajib diisi.'},400);
        if(!secretToken)return res.json({error:'Secret Token BuatQRIS wajib diisi.'},400);

        const data={
          provider:'buatqris',
          merchant_label:q(body.merchant_label)||'BADAI PROMPT UMKM',
          account_id:accountId,
          secret_token:secretToken,
          signing_secret:signingSecret,
          qris_method:qrisMethod,
          fee_by:feeBy,
          umkm_name:umkmName||null,
          test_mode:body.test_mode!==false,
          callback_url:callbackUrl,
          api_url:apiUrl,
          is_active:body.is_active!==false
        };

        let saved;
        if(existing){
          saved=await tables.updateRow({databaseId:DB,tableId:PAYMENT_SETTINGS,rowId:'buatqris',data});
        }else{
          saved=await tables.createRow({databaseId:DB,tableId:PAYMENT_SETTINGS,rowId:'buatqris',data});
        }
        const row=unpack(saved);
        return res.json({
          ok:true,
          payment:{
            provider:'buatqris',
            merchant_label:row.merchant_label,
            account_id:row.account_id,
            qris_method:row.qris_method,
            fee_by:row.fee_by,
            umkm_name:row.umkm_name||'',
            test_mode:row.test_mode!==false,
            callback_url:row.callback_url,
            api_url:row.api_url,
            is_active:row.is_active!==false,
            has_secret_token:Boolean(row.secret_token),
            has_signing_secret:Boolean(row.signing_secret),
            configured:Boolean(row.account_id&&row.secret_token)
          }
        });
      }

      if(route==='/payment/test'){
        let row;
        try{
          row=unpack(await tables.getRow({databaseId:DB,tableId:PAYMENT_SETTINGS,rowId:'buatqris'}));
        }catch(e){
          return res.json({error:'Simpan pengaturan BuatQRIS dulu.'},400);
        }
        if(!row?.account_id||!row?.secret_token)return res.json({error:'Account ID / Secret Token belum lengkap.'},400);
        if(row.test_mode===false)return res.json({error:'Aktifkan MODE SANDBOX dulu untuk Test Koneksi.'},400);

        const form=new URLSearchParams({
          action:'api_create_qris',
          account_id:String(row.account_id),
          secret_token:String(row.secret_token),
          amount:'1000',
          description:'Tes koneksi BADAI PROMPT UMKM',
          qris_method:String(row.qris_method||'qris_two'),
          fee_by:String(row.fee_by||'user'),
          test:'1'
        });
        if(row.umkm_name)form.set('umkm_name',String(row.umkm_name).slice(0,15));

        const response=await fetch(row.api_url||'https://app.buatqris.site/api',{
          method:'POST',
          headers:{'Content-Type':'application/x-www-form-urlencoded','User-Agent':'BADAI-Prompt-UMKM/1.0'},
          body:form.toString()
        });
        const raw=await response.text();
        let payload={};try{payload=JSON.parse(raw)}catch{}
        const data=payload?.data??payload;
        if(!response.ok||payload?.success===false||!data?.transaction_id){
          return res.json({error:String(payload?.message||payload?.error||'Koneksi BuatQRIS gagal.')},502);
        }
        return res.json({
          ok:true,
          message:'Koneksi BuatQRIS berhasil.',
          transaction_id:String(data.transaction_id),
          status:String(data.status||'pending'),
          sandbox:true
        });
      }

      if(route==='/coupons/list'){
        const rows=await listAll(tables,COUPONS,[Query.orderDesc('$createdAt')]);
        return res.json({ok:true,rows});
      }

      if(route==='/coupons/save'){
        const id=q(body.id);
        const code=q(body.code).toUpperCase().replace(/\s+/g,'');
        const discountType=body.discount_type==='fixed'?'fixed':'percent';
        const discountValue=Math.max(Number(body.discount_value)||0,0);
        const minOrder=Math.max(Number(body.min_order)||0,0);
        const maxDiscount=Math.max(Number(body.max_discount)||0,0);
        const usageLimit=Math.max(Number(body.usage_limit)||0,0);
        const isActive=body.is_active!==false;

        if(!code||!/^[A-Z0-9_-]{2,64}$/.test(code)){
          return res.json({error:'Kode kupon hanya boleh huruf, angka, garis bawah, atau strip.'},400);
        }
        if(discountValue<=0)return res.json({error:'Nilai diskon harus lebih dari 0.'},400);
        if(discountType==='percent'&&discountValue>100){
          return res.json({error:'Diskon persen maksimal 100%.'},400);
        }

        const toIso=(value)=>{
          if(!q(value))return null;
          const d=new Date(q(value));
          if(Number.isNaN(d.getTime()))throw new Error('Tanggal kupon tidak valid.');
          return d.toISOString();
        };

        const data={
          code,
          discount_type:discountType,
          discount_value:discountValue,
          is_active:isActive,
          min_order:minOrder,
          max_discount:maxDiscount,
          usage_limit:usageLimit,
          starts_at:toIso(body.starts_at),
          ends_at:toIso(body.ends_at),
          notes:q(body.notes)||null
        };

        if(data.starts_at&&data.ends_at&&new Date(data.ends_at)<=new Date(data.starts_at)){
          return res.json({error:'Tanggal berakhir harus setelah tanggal mulai.'},400);
        }

        try{
          let row;
          if(id){
            row=await tables.updateRow({databaseId:DB,tableId:COUPONS,rowId:id,data});
          }else{
            row=await tables.createRow({databaseId:DB,tableId:COUPONS,rowId:ID.unique(),data:{...data,used_count:0}});
          }
          return res.json({ok:true,row:unpack(row)});
        }catch(e){
          if(Number(e?.code)===409)return res.json({error:'Kode kupon sudah dipakai. Gunakan kode lain.'},409);
          throw e;
        }
      }

      if(route==='/coupons/toggle'){
        const id=q(body.id);
        if(!id)return res.json({error:'id wajib'},400);
        const row=await tables.updateRow({
          databaseId:DB,tableId:COUPONS,rowId:id,
          data:{is_active:body.is_active===true}
        });
        return res.json({ok:true,row:unpack(row)});
      }

      if(route==='/coupons/delete'){
        const id=q(body.id);
        if(!id)return res.json({error:'id wajib'},400);
        await tables.deleteRow({databaseId:DB,tableId:COUPONS,rowId:id});
        return res.json({ok:true});
      }

      if(route==='/settings/get'){
        const rows=await listAll(tables,SETTINGS);
        const settings={};
        for(const row of rows)settings[row.key]=row.value;
        return res.json({ok:true,settings});
      }

      if(route==='/settings/save'){
        const allowed=['product_price','minimum_price','registration_open','product_name','social_proof_enabled','social_proof_interval_seconds'];
        for(const key of allowed){
          if(body[key]===undefined)continue;
          const value=String(body[key]);
          try{
            await tables.updateRow({databaseId:DB,tableId:SETTINGS,rowId:key,data:{value}});
          }catch(e){
            if(Number(e?.code)===404){
              await tables.createRow({
                databaseId:DB,tableId:SETTINGS,rowId:key,
                data:{key,value,is_public:true}
              });
            }else throw e;
          }
        }
        return res.json({ok:true});
      }

      return res.json({error:'Admin route not found'},404);
    }

    // Event worker: activate paid member when an order becomes successful.
    const order=unpack(body);
    const autoAccessMethods=['qris','coupon_free'];
    if(!order.$id||order.status!=='success'||order.access_issued===true||(order.payment_method&&!autoAccessMethods.includes(order.payment_method))){
      return res.json({ok:true,skipped:true});
    }

    const email=String(order.email||'').trim().toLowerCase();
    if(!email)throw new Error('Order email kosong');

    const found=await users.list({queries:[Query.equal('email',email),Query.limit(1)]});
    let user=(found.users||[])[0]||null;

    if(!user){
      user=await users.create({
        userId:ID.unique(),
        email,
        name:String(order.full_name||'Member BADAI PROMPT UMKM').slice(0,128)
      });
    }

    try{
      await teams.createMembership({
        teamId:TEAM_ID,
        roles:['member'],
        userId:user.$id
      });
    }catch(e){
      if(Number(e?.code)!==409)throw e;
    }

    const profile={
      user_id:user.$id,
      name:String(order.full_name||''),
      email,
      whatsapp:String(order.whatsapp||''),
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
        permissions:[
          Permission.read(Role.user(user.$id))
        ]
      });
    }catch(e){
      if(Number(e?.code)===409){
        await tables.updateRow({databaseId:DB,tableId:PROFILES,rowId:user.$id,data:profile});
      }else{
        throw e;
      }
    }

    await tables.updateRow({
      databaseId:DB,
      tableId:ORDERS,
      rowId:order.$id,
      data:{user_id:user.$id,access_issued:true}
    });

    log?.('Activated paid member '+user.$id);
    return res.json({ok:true,user_id:user.$id});
  }catch(e){
    error?.(e?.stack||String(e));
    return res.json({ok:false,error:String(e?.message||e)},500);
  }
};