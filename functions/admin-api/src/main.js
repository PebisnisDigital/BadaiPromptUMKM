import { Client, TablesDB, Teams, ID, Query } from 'node-appwrite';

const DB='badai_prompt_umkm';
const PROMPTS='prompts';
const ORDERS='orders';
const PROFILES='member_profiles';
const SETTINGS='settings';
const PAID_TEAM='paid-members';

function unpack(row){return {...(row?.data||row||{}),$id:row?.$id||row?.data?.$id,$createdAt:row?.$createdAt,$updatedAt:row?.$updatedAt};}
function out(res,body,status=200){return res.json(body,status,{'Cache-Control':'no-store'});}
function q(v){return String(v??'').trim();}
async function listAll(tables,tableId,baseQueries=[]){
  const rows=[];
  for(let offset=0;offset<5000;offset+=100){
    const r=await tables.listRows({databaseId:DB,tableId,queries:[...baseQueries,Query.limit(100),Query.offset(offset)]});
    const part=(r.rows||r.documents||[]).map(unpack); rows.push(...part);
    if(part.length<100) break;
  }
  return rows;
}
function slugify(s=''){
  return String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,220);
}

export default async ({req,res,error})=>{
  try{
    const client=new Client()
      .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
      .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
      .setKey(req.headers['x-appwrite-key']);
    const tables=new TablesDB(client);
    const teams=new Teams(client);
    const path=req.path||'/';
    const body=req.bodyJson||{};

    if(req.method==='GET' && (path==='/'||path==='/health')) return out(res,{ok:true,service:'admin-api'});

    if(path==='/dashboard'){
      const [promptRows,orderRows,memberRows]=await Promise.all([
        listAll(tables,PROMPTS),
        listAll(tables,ORDERS),
        listAll(tables,PROFILES)
      ]);
      const paid=orderRows.filter(x=>x.status==='success');
      return out(res,{
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
          blocked:memberRows.filter(x=>x.status==='blocked').length
        },
        recent_orders:orderRows.sort((a,b)=>String(b.$createdAt||'').localeCompare(String(a.$createdAt||''))).slice(0,8)
      });
    }

    if(path==='/prompts/list'){
      let queries=[Query.orderAsc('sort_order'),Query.limit(Math.min(Number(body.limit)||50,100)),Query.offset(Math.max(Number(body.offset)||0,0))];
      if(q(body.niche)) queries.unshift(Query.equal('niche',q(body.niche)));
      if(q(body.goal)) queries.unshift(Query.equal('goal',q(body.goal)));
      if(body.published===true||body.published===false) queries.unshift(Query.equal('is_published',body.published));
      if(q(body.search)) queries.unshift(Query.search('title',q(body.search)));
      const r=await tables.listRows({databaseId:DB,tableId:PROMPTS,queries});
      return out(res,{ok:true,total:r.total||0,rows:(r.rows||r.documents||[]).map(unpack)});
    }

    if(path==='/prompts/save'){
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
        return out(res,{error:'Niche, kebutuhan, tipe output, judul, dan prompt wajib diisi.'},400);
      }
      let saved;
      if(q(body.id)){
        saved=await tables.updateRow({databaseId:DB,tableId:PROMPTS,rowId:q(body.id),data});
      }else{
        saved=await tables.createRow({databaseId:DB,tableId:PROMPTS,rowId:ID.unique(),data});
      }
      return out(res,{ok:true,row:unpack(saved)});
    }

    if(path==='/prompts/toggle'){
      const id=q(body.id); if(!id)return out(res,{error:'id wajib'},400);
      const patch={};
      if(typeof body.is_published==='boolean') patch.is_published=body.is_published;
      if(typeof body.is_featured==='boolean') patch.is_featured=body.is_featured;
      const saved=await tables.updateRow({databaseId:DB,tableId:PROMPTS,rowId:id,data:patch});
      return out(res,{ok:true,row:unpack(saved)});
    }

    if(path==='/prompts/delete'){
      const id=q(body.id); if(!id)return out(res,{error:'id wajib'},400);
      await tables.deleteRow({databaseId:DB,tableId:PROMPTS,rowId:id});
      return out(res,{ok:true});
    }

    if(path==='/orders/list'){
      const queries=[Query.orderDesc('$createdAt'),Query.limit(Math.min(Number(body.limit)||100,100)),Query.offset(Math.max(Number(body.offset)||0,0))];
      if(q(body.status)) queries.unshift(Query.equal('status',q(body.status)));
      const r=await tables.listRows({databaseId:DB,tableId:ORDERS,queries});
      return out(res,{ok:true,total:r.total||0,rows:(r.rows||r.documents||[]).map(unpack)});
    }

    if(path==='/members/list'){
      const queries=[Query.limit(Math.min(Number(body.limit)||100,100)),Query.offset(Math.max(Number(body.offset)||0,0))];
      if(q(body.status)) queries.unshift(Query.equal('status',q(body.status)));
      const r=await tables.listRows({databaseId:DB,tableId:PROFILES,queries});
      return out(res,{ok:true,total:r.total||0,rows:(r.rows||r.documents||[]).map(unpack)});
    }

    if(path==='/members/status'){
      const id=q(body.user_id), status=q(body.status);
      if(!id || !['active','blocked'].includes(status)) return out(res,{error:'Data status member tidak valid.'},400);
      const profile=await tables.updateRow({databaseId:DB,tableId:PROFILES,rowId:id,data:{status}});
      const memberships=await teams.listMemberships({teamId:PAID_TEAM,queries:[Query.equal('userId',id),Query.limit(10)]});
      const current=(memberships.memberships||[])[0]||null;
      if(status==='blocked' && current){
        await teams.deleteMembership({teamId:PAID_TEAM,membershipId:current.$id});
      }
      if(status==='active' && !current){
        await teams.createMembership({teamId:PAID_TEAM,roles:['member'],userId:id});
      }
      return out(res,{ok:true,row:unpack(profile)});
    }

    if(path==='/settings/get'){
      const rows=await listAll(tables,SETTINGS);
      const settings={};
      for(const row of rows)settings[row.key]=row.value;
      return out(res,{ok:true,settings});
    }

    if(path==='/settings/save'){
      const allowed=['product_price','registration_open','product_name'];
      for(const key of allowed){
        if(body[key]===undefined) continue;
        const value=String(body[key]);
        try{
          await tables.updateRow({databaseId:DB,tableId:SETTINGS,rowId:key,data:{value}});
        }catch(e){
          if(Number(e?.code)===404){
            await tables.createRow({databaseId:DB,tableId:SETTINGS,rowId:key,data:{key,value,is_public:true}});
          }else throw e;
        }
      }
      return out(res,{ok:true});
    }

    return out(res,{error:'Not found'},404);
  }catch(e){
    error?.(e?.stack||String(e));
    return out(res,{error:String(e?.message||e||'Admin API error')},Number(e?.code||500));
  }
};