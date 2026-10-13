const http=require('http'),fs=require('fs'),path=require('path');
const port=process.env.PORT||3000,root=__dirname;
http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  let u=url.pathname;
  const legacyMember=new Set(['/member.html','/member-area','/member-area.html','/akses','/akses.html']);
  if(legacyMember.has(u)){
    res.writeHead(307,{Location:'/member'+url.search});
    return res.end();
  }
  if(u==='/')u='/index.html';
  if(u==='/member')u='/member.html';
  if(u==='/admin')u='/admin.html';
  const f=path.join(root,u);
  if(!f.startsWith(root)){res.writeHead(403);return res.end('Forbidden')}
  fs.readFile(f,(e,d)=>{
    if(e){res.writeHead(404);return res.end('Not found')}
    res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'})[path.extname(u)]||'application/octet-stream');
    res.end(d);
  });
}).listen(port,'0.0.0.0');
