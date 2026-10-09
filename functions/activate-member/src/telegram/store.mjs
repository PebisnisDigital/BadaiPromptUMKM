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
 async acquireLease(now,owner){
  const tx=await this.tables.createTransaction({ttl:60});try{let row;try{row=await this.tables.getRow({databaseId:this.databaseId,tableId:'telegram_state',rowId:'telegram-scheduler-lease',transactionId:tx.$id});row=unwrap(row)}catch(e){if(Number(e.code)!==404)throw e}if(row?.status==='claimed'&&Date.parse(row.due_at)>now){await this.tables.updateTransaction({transactionId:tx.$id,rollback:true});return false}const data={kind:'lease',status:'claimed',due_at:new Date(now+45000).toISOString(),payload:JSON.stringify({owner})};const args={databaseId:this.databaseId,tableId:'telegram_state',rowId:'telegram-scheduler-lease',data,transactionId:tx.$id};if(row)await this.tables.updateRow(args);else await this.tables.createRow({...args,permissions:[]});await this.tables.updateTransaction({transactionId:tx.$id,commit:true});return true}catch(e){try{await this.tables.updateTransaction({transactionId:tx.$id,rollback:true})}catch{}if(Number(e.code)===409)return false;throw e}
 }
 async releaseLease(owner){const tx=await this.tables.createTransaction({ttl:60});try{const raw=await this.tables.getRow({databaseId:this.databaseId,tableId:'telegram_state',rowId:'telegram-scheduler-lease',transactionId:tx.$id}),row=unwrap(raw);if(JSON.parse(row.payload||'{}').owner!==owner){await this.tables.updateTransaction({transactionId:tx.$id,rollback:true});return}await this.tables.updateRow({databaseId:this.databaseId,tableId:'telegram_state',rowId:'telegram-scheduler-lease',data:{status:'released',due_at:new Date(0).toISOString()},transactionId:tx.$id});await this.tables.updateTransaction({transactionId:tx.$id,commit:true})}catch(e){try{await this.tables.updateTransaction({transactionId:tx.$id,rollback:true})}catch{}if(Number(e.code)!==409)throw e}}
 async createStatesAtomically(entries){
  const tx=await this.tables.createTransaction({ttl:60});try{for(const e of entries){const args={databaseId:this.databaseId,tableId:'telegram_state',rowId:e.rowId,data:{kind:'settings',status:'ready',payload:JSON.stringify(e.data),...e.meta},transactionId:tx.$id};if(e.update)await this.tables.updateRow(args);else await this.tables.createRow({...args,permissions:[]})}await this.tables.updateTransaction({transactionId:tx.$id,commit:true})}catch(e){try{await this.tables.updateTransaction({transactionId:tx.$id,rollback:true})}catch{}if(Number(e.code)===409)throw fail('Konten duplikat atau antrean berubah. Perbarui sebelum menyetujui.',409);throw e}
 }
 async transaction(fn){
  const transaction=await this.tables.createTransaction({ttl:60}),transactionId=transaction.$id,base={databaseId:this.databaseId,transactionId};
  const get=async(tableId,rowId)=>{try{return unwrap(await this.tables.getRow({...base,tableId,rowId}))}catch(e){if(Number(e.code)===404)return null;throw e}};
  const tx={get,state:async rowId=>{const row=await get('telegram_state',rowId);return row?{...row,data:JSON.parse(row.payload||'{}')}:null},update:(tableId,rowId,data)=>this.tables.updateRow({...base,tableId,rowId,data}),put:async(rowId,data,meta={},exists=false)=>{const args={...base,tableId:'telegram_state',rowId,data:{payload:JSON.stringify(data),...meta}};return exists?this.tables.updateRow(args):this.tables.createRow({...args,permissions:[]})}};
  try{const result=await fn(tx);await this.tables.updateTransaction({transactionId,commit:true});return result}catch(e){try{await this.tables.updateTransaction({transactionId,rollback:true})}catch{}if(Number(e.code)===409)throw fail('Transaksi pembayaran bentrok; ulangi webhook dengan Charge ID yang sama.',503);throw e}
 }
 async rate(userId,action,now,max=20){
  const bucket=Math.floor(now/60000),key=id('rate',userId,action,bucket);
  // One row per request slot gives a strict distributed limit without racy counters.
  for(let i=0;i<max;i++)if(await this.claim(id(key,i),{kind:'rate',user_id:userId,status:'used',due_at:new Date(now+120000).toISOString(),payload:'{}'}))return;
  throw fail('Terlalu banyak permintaan. Coba lagi satu menit.',429);
 }
}
