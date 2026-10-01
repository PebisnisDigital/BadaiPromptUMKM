export const config = { api: { bodyParser: false } };

async function readRaw(req){
  const chunks=[];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}

export default async function handler(req,res){
  if(req.method==='GET'){
    return res.status(200).json({
      ok:true,
      relay:true,
      endpoint:'BADAI PROMPT UMKM BuatQRIS webhook'
    });
  }
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});

  try{
    const raw=await readRaw(req);
    const execution=await fetch('https://sgp.cloud.appwrite.io/v1/functions/payment-api/executions',{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'X-Appwrite-Project':'badai-prompt-umkm'
      },
      body:JSON.stringify({
        body:raw,
        async:false,
        path:'/webhook',
        method:'POST',
        headers:{
          'content-type':String(req.headers['content-type']||'application/json'),
          'x-buatqris-signature':String(req.headers['x-buatqris-signature']||''),
          'x-buatqris-event':String(req.headers['x-buatqris-event']||''),
          'x-buatqris-delivery':String(req.headers['x-buatqris-delivery']||'')
        }
      })
    });

    const ex=await execution.json().catch(()=>({}));
    const status=Number(ex.responseStatusCode||500);
    let payload={};
    try{payload=JSON.parse(ex.responseBody||'{}')}catch{payload={ok:status>=200&&status<300}}
    return res.status(status).json(payload);
  }catch(err){
    return res.status(500).json({error:'Webhook relay failed'});
  }
}