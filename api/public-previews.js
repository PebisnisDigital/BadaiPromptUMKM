// Public, read-only feed for the PROMPTIONAL landing visual gallery.
// Exposes only published preview images. Never exposes premium prompt text or member data.
const {Client,TablesDB,Query}=require('node-appwrite');
const DATABASE=process.env.APP_DB_ID||'badai_prompt_umkm';
const PROJECT=process.env.APPWRITE_PROJECT_ID||'badai-prompt-umkm';
const APPWRITE_STORAGE='https://sgp.cloud.appwrite.io/v1/storage/buckets/prompt-previews/files/';
function urlFor(row){
 const fileId=String(row.preview_file_id||'').trim();
 if(fileId)return APPWRITE_STORAGE+encodeURIComponent(fileId)+'/view?project='+encodeURIComponent(PROJECT);
 return String(row.preview_url||'').trim();
}
function safeUrl(url){
 try{const u=new URL(url);
  return u.protocol==='https:'&&['www.dropbox.com','dropbox.com','sgp.cloud.appwrite.io','i.ibb.co','i.ibb.co.com'].includes(u.hostname);
 }catch{return false}
}
module.exports=async function handler(req,res){
  if(req.query?.admin_brands==='1'){
    return require('../lib/admin-brands-handler')(req,res);
  }
  if(req.query?.mode==='marketing'){
    return require('../lib/marketing-public-handler')(req,res);
  }
 res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=600');
 if(req.method!=='GET')return res.status(405).json({ok:false,error:'Method not allowed'});
 if(!process.env.APPWRITE_API_KEY)return res.status(503).json({ok:false,error:'Preview feed unavailable'});
 try{
  const client=new Client().setEndpoint(process.env.APPWRITE_ENDPOINT||'https://sgp.cloud.appwrite.io/v1').setProject(PROJECT).setKey(process.env.APPWRITE_API_KEY);
  const tables=new TablesDB(client);
  const result=await tables.listRows({databaseId:DATABASE,tableId:'scene_prompts',queries:[
   Query.equal('is_published',true),Query.orderAsc('sort_order'),Query.limit(100)
  ]});
  const previews=(result.rows||[]).map(row=>{
   const x={...row,...(row.data||{})};return {code:String(x.title||'').trim().slice(0,20),src:urlFor(x)};
  }).filter(x=>/^BP\d{1,6}$/.test(x.code)&&safeUrl(x.src)).slice(0,60);
  return res.status(200).json({ok:true,count:previews.length,previews});
 }catch(e){
  console.error('Public preview feed read failed:',e?.code||e?.name||'unknown');
  return res.status(503).json({ok:false,error:'Preview feed temporarily unavailable'});
 }
};
