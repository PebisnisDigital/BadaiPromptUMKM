import { Client, TablesDB, Users, Query } from 'node-appwrite';

const DB=process.env.APP_DB_ID || 'badai_prompt_umkm';
const ORDERS=process.env.ORDERS_TABLE_ID || 'orders';

const rowData=(row)=>({...((row&&row.data)||row||{}),$id:row?.$id||row?.data?.$id});
const q=(v)=>String(v??'').trim();

export default async ({req,res,error})=>{
  try{
    if(req.method!=='POST')return res.json({error:'Method not allowed'},405);

    const runtimeKey=req.headers['x-appwrite-key'];
    const endpoint=process.env.APPWRITE_FUNCTION_API_ENDPOINT;
    const project=process.env.APPWRITE_FUNCTION_PROJECT_ID;
    if(!runtimeKey||!endpoint||!project)return res.json({error:'Runtime key unavailable'},500);

    const publicToken=q(req.bodyJson?.public_token);
    if(!publicToken)return res.json({error:'Token transaksi wajib diisi.'},400);

    const client=new Client().setEndpoint(endpoint).setProject(project).setKey(runtimeKey);
    const tables=new TablesDB(client);
    const users=new Users(client);

    const found=await tables.listRows({
      databaseId:DB,
      tableId:ORDERS,
      queries:[Query.equal('public_token',publicToken),Query.limit(1)]
    });
    const order=rowData((found.rows||found.documents||[])[0]);

    if(!order?.$id)return res.json({error:'Transaksi tidak ditemukan.'},404);
    if(order.status!=='success')return res.json({error:'Pembayaran belum berhasil.'},403);
    if(order.access_issued!==true||!order.user_id){
      return res.json({error:'Akses member sedang disiapkan. Coba lagi sebentar.'},409);
    }

    const token=await users.createToken({
      userId:order.user_id,
      length:64,
      expire:600
    });

    return res.json({
      ok:true,
      user_id:order.user_id,
      email:q(order.email).toLowerCase(),
      name:q(order.full_name),
      secret:token.secret,
      expires_at:token.expire
    });
  }catch(e){
    error?.(e?.stack||String(e));
    return res.json({error:String(e?.message||e||'Bootstrap member gagal.')},500);
  }
};
