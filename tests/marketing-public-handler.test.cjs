const test=require('node:test');
const assert=require('node:assert/strict');
const Module=require('node:module');

const stored={
  BP003:{title:'BP003',subcategory:'Poster 3D',category:'Prompt Viral',prompt_text:'PROMPT_ASLI_Bp003',preview_url:'https://www.dropbox.com/scl/fi/a/pic03.jpg?raw=1',is_published:true},
  BP033:{title:'BP033',subcategory:'Burger Komersial',category:'E-Commerce',prompt_text:'PROMPT_ASLI_BP033',preview_url:'https://www.dropbox.com/scl/fi/a/pic33.jpg?raw=1',is_published:true},
  BP051:{title:'BP051',subcategory:'Smoothie',category:'Ad Creative',prompt_text:'PROMPT_ASLI_BP051',preview_url:'https://www.dropbox.com/scl/fi/a/pic51.jpg?raw=1',is_published:true}
};
const state={calls:[]};
class Client{
  setEndpoint(){return this}
  setProject(){return this}
  setKey(){return this}
}
class TablesDB{
  async listRows({databaseId,tableId,queries}){
    state.calls.push({databaseId,tableId,queries});
    assert.equal(tableId,'scene_prompts');
    const q=queries.find(x=>x.kind==='equal'&&x.field==='title');
    const row=stored[q.value];
    if(!row)return {rows:[]};
    return {rows:[{data:row,$id:'demo'}]};
  }
}
const Query={
  equal:(field,value)=>({kind:'equal',field,value}),
  limit:(value)=>({kind:'limit',value})
};
const orig=Module._load;
Module._load=function(id,parent,isMain){
  if(id==='node-appwrite')return {Client,TablesDB,Query};
  return orig.call(this,id,parent,isMain);
};
const handler=require('../api/public-previews.js');
// Shared public handler is loaded lazily; preload it while node-appwrite is mocked.
require('../lib/marketing-public-handler.js');
Module._load=orig;

const response=()=>{
  const headers={};
  return {
    statusCode:200,headers,body:undefined,
    setHeader(name,val){headers[name.toLowerCase()]=val;return this},
    status(v){this.statusCode=v;return this},
    json(v){this.body=v;return this},
    end(v){this.body=JSON.parse(v);return this}
  };
};
async function run(client,bp,env='preview',mode='marketing'){
  process.env.VERCEL_ENV=env;
  process.env.APPWRITE_API_KEY='FAKE_TEST_KEY_NO_ACCESS';
  const res=response();
  await handler({method:'GET',query:{mode,client,bp}},res);
  return res;
}
test('preview only selects one exact BP from Appwrite and correct tenant branding',async()=>{
  state.calls.length=0;
  const x=await run('demo-rose','BP033');
  assert.equal(x.statusCode,200);
  assert.equal(x.body.prompt.text,'PROMPT_ASLI_BP033');
  assert.equal(x.body.prompt.code,'BP033');
  assert.equal(x.body.brand.name,'ROSE CREATIVE');
  assert.equal(x.body.brand.checkoutUrl,null);
  assert.equal(state.calls.length,1);
  assert.deepEqual(state.calls[0].queries.find(q=>q.kind==='equal'&&q.field==='title').value,'BP033');
  const y=await run('demo-noir','BP003');
  assert.equal(y.body.prompt.text,'PROMPT_ASLI_Bp003');
  assert.equal(y.body.brand.name,'NOIR STUDIO');
  assert.notEqual(x.body.brand.accent,y.body.brand.accent);
});
test('cannot read paid prompt or another tenant by invalid slug',async()=>{
  state.calls.length=0;
  for(const [client,bp] of [['demo-rose','BP034'],['__proto__','BP033'],['demo-rose','BP186'],['demo-noir','bp003']]){
    const r=await run(client,bp);
    assert.equal(r.statusCode,404);
    assert.equal(r.body.ok,false);
  }
  assert.equal(state.calls.length,0);
});
test('production always blocks marketing prompt export',async()=>{
  state.calls.length=0;
  const r=await run('demo-rose','BP033','production');
  assert.equal(r.statusCode,404);
  assert.equal(state.calls.length,0);
});
test('no Appwrite key returns fail closed; never exposes mock prompt text',async()=>{
  process.env.VERCEL_ENV='preview';
  delete process.env.APPWRITE_API_KEY;
  const res=response();
  await handler({method:'GET',query:{mode:'marketing',client:'demo-rose',bp:'BP033'}},res);
  assert.equal(res.statusCode,503);
  assert.equal(JSON.stringify(res.body).includes('PROMPT_ASLI'),false);
});
