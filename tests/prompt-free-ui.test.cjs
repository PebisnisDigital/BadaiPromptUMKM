const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const script=fs.readFileSync(path.join(__dirname,'../assets/prompt-free.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../prompt-free.html'),'utf8');

function view({pathname='/c/demo-rose/p/BP033',status=200,data}={}){
  const nodes=new Map();
  const ids=['error','loading','prompt-page','brand-name','code','title','category','prompt-text','cover-image','reference-info','offer-copy','checkout','checkout-pending','copy','copy-status','gallery'];
  for(const id of ids)nodes.set(id,{id,hidden:id==='prompt-page'||id==='error'||id==='gallery'||id==='checkout'||id==='reference-info',textContent:'',src:'',href:'',children:[],events:{},
    addEventListener(type,fn){this.events[type]=fn},
    append(el){this.children.push(el);}
  });
  const clipboard=[];
  const root={style:{setProperty(key,val){root[key]=val}}};
  const document={
    title:'Preview',documentElement:root,
    getElementById:id=>nodes.get(id),
    createElement:tag=>({tag,style:{},src:'',alt:'',loading:'',value:'',select(){},remove(){}})
  };
  const response=data||{ok:true,brand:{name:'ROSE CREATIVE',slug:'demo-rose',accent:'#e94b91',checkoutUrl:null},prompt:{
    code:'BP033',title:'Foto Burger',category:'E-Commerce',text:'PROMPT ASLI LENGKAP\nLanjut baris kedua',
    imageUrl:'https://www.dropbox.com/img.jpg?raw=1',
    needsReference:true,extraImages:['https://www.dropbox.com/extra.jpg?raw=1']
  }};
  const context={
    document,location:{pathname,origin:'https://testpreview.vercel.app'},
    fetch:async()=>({ok:status===200,status,json:async()=>response}),
    navigator:{clipboard:{writeText:async t=>clipboard.push(t)}},
    URL,console
  };
  vm.runInNewContext(script,context,{filename:'prompt-free.js'});
  return {nodes,clipboard,document,root,flush:()=>new Promise(resolve=>setImmediate(resolve))};
}

test('page is mobile-ready without any member login fields',()=>{
  assert.match(html,/name="viewport"/);
  assert.match(html,/id="copy"/);
  assert.match(html,/id="prompt-text"/);
  assert.doesNotMatch(html,/<input[^>]+type=["']password/);
});
test('correct BP renders complete text and image and copies exact full prompt',async()=>{
  const w=view();
  await w.flush();
  const node=id=>w.nodes.get(id);
  assert.equal(node('code').textContent,'BP033');
  assert.equal(node('title').textContent,'Foto Burger');
  assert.equal(node('brand-name').textContent,'ROSE CREATIVE');
  assert.equal(node('prompt-text').textContent,'PROMPT ASLI LENGKAP\nLanjut baris kedua');
  assert.equal(node('cover-image').src,'https://www.dropbox.com/img.jpg?raw=1');
  assert.equal(node('gallery').children.length,1);
  assert.equal(node('reference-info').hidden,false);
  assert.equal(node('prompt-page').hidden,false);
  assert.equal(node('loading').hidden,true);
  assert.equal(node('checkout').hidden,true);
  await node('copy').events.click();
  assert.deepEqual(w.clipboard,['PROMPT ASLI LENGKAP\nLanjut baris kedua']);
  assert.match(node('copy-status').textContent,/berhasil disalin/);
});
test('invalid route is rejected before any account/permission lookup',async()=>{
  const w=view({pathname:'/c/demo-rose/p/not-a-code'});
  await w.flush();
  assert.equal(w.nodes.get('error').hidden,false);
  assert.equal(w.nodes.get('prompt-page').hidden,true);
  assert.match(w.nodes.get('error').textContent,/tidak ditemukan/);
});
test('backend refusal never reveals hidden paid prompt',async()=>{
  const w=view({status:404,data:{ok:false,error:'Halaman belum tersedia'}});
  await w.flush();
  assert.equal(w.nodes.get('error').hidden,false);
  assert.equal(w.nodes.get('prompt-page').hidden,true);
  assert.equal(w.nodes.get('prompt-text').textContent,'');
});
