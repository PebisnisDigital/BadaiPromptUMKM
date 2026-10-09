import {fail,id} from './security.mjs';
const unwrap=r=>r?({...r,...(r.data||{}),$id:r.$id}):null;
export class Store{
 constructor(tables,Query,databaseId='badai_prompt_umkm'){Object.assign(this,{tables,Query,databaseId})}
 query(filters=[],limit=50,cursor){const Q=this.Query;return [...filters.map(([op,key,value])=>value===undefined?Q[op](key):Q[op](key,value)),Q.limit(limit),Q.orderAsc('$id'),...(cursor?[Q.cursorAfter(cursor)]:[])]}
 async get(tableId,rowId){try{return unwrap(await this.tables.getRow({databaseId:this.databaseId,tableId,rowId}))}catch(e){if(e.code===404)return null;throw e}}
 async list(tableId,filters=[],limit=50,cursor){const r=await this.tables.listRows({databaseId:this.databaseId,tableId,queries:this.query(filters,limit,cursor)});return {rows:(r.rows||[]).map(unwrap),total:r.total}}
 async create(tableId,rowId,data){return unwrap(await this.tables.createRow({databaseId:this.databaseId,tableId,rowId,data,permissions:[]}))}
 async update(tableId,rowId,data){return unwrap(await this.tables.updateRow({databaseId:this.databaseId,tableId,rowId,data}))}
 async remove(tableId,rowId){try{await this.tables.deleteRow({databaseId:this.databaseId,tableId,rowId})}catch(e){if(e.code!==404)throw e}}
 async claim(rowId,data){try{return await this.create('telegram_state',rowId,data)}catch(e){if(e.code===409)return null;throw e}}
 async state(rowId){const row=await this.get('telegram_state',rowId);return row?{...row,data:JSON.parse(row.payload||'{}')}:null}
 async putState(rowId,data,meta={}){const payload=JSON.stringify(data),old=await this.get('telegram_state',rowId);const row={kind:'settings',status:'ready',payload,...meta};return old?this.update('telegram_state',rowId,row):this.create('telegram_state',rowId,row)}
 async rate(userId,action,now,max=20){
  const bucket=Math.floor(now/60000),key=id('rate',userId,action,bucket);
  // One row per request slot gives a strict distributed limit without racy counters.
  for(let i=0;i<max;i++)if(await this.claim(id(key,i),{kind:'rate',user_id:userId,status:'used',due_at:new Date(now+120000).toISOString(),payload:'{}'}))return;
  throw fail('Terlalu banyak permintaan. Coba lagi satu menit.',429);
 }
}
