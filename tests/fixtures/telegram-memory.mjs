export class MemoryTables{
 constructor(){this.rows=new Map;this.writes=[];this.version=0;this.transactions=new Map}
 key(table,id){return table+':'+id}
 missing(){return Object.assign(Error('Missing'),{code:404})}
 async getRow({tableId,rowId,transactionId}){const key=this.key(tableId,rowId),tx=this.transactions.get(transactionId),source=tx?tx.snapshot:this.rows;const row=source.get(key);if(tx)tx.reads.add(key);if(!row)throw this.missing();return structuredClone(row)}
 async listRows({tableId,queries=[]}){let rows=[...this.rows.entries()].filter(([k])=>k.startsWith(tableId+':')).map(([,r])=>structuredClone(r)),limit=50,cursor,offset=0;
  for(const raw of queries){const q=JSON.parse(raw),k=q.attribute,v=q.values?.[0];switch(q.method){case 'equal':rows=rows.filter(r=>q.values.includes(r[k]));break;case 'lessThanEqual':rows=rows.filter(r=>r[k]!=null&&r[k]<=v);break;case 'greaterThanEqual':rows=rows.filter(r=>r[k]!=null&&r[k]>=v);break;case 'greaterThan':rows=rows.filter(r=>r[k]!=null&&r[k]>v);break;case 'isNull':rows=rows.filter(r=>r[k]==null);break;case 'isNotNull':rows=rows.filter(r=>r[k]!=null);break;case 'limit':limit=v;break;case 'offset':offset=v;break;case 'cursorAfter':cursor=v;break}}
  rows.sort((a,b)=>a.$id.localeCompare(b.$id));const total=rows.length;if(cursor)rows=rows.filter(r=>r.$id>cursor);return {total,rows:rows.slice(offset,offset+limit)}
 }
 async createRow({tableId,rowId,data,transactionId}){const key=this.key(tableId,rowId),tx=this.transactions.get(transactionId);if((tx?.snapshot||this.rows).has(key))throw Object.assign(Error('Conflict'),{code:409});const row={$id:rowId,...data,_version:++this.version};if(tx){tx.reads.add(key);tx.pending.set(key,row)}else{this.rows.set(key,row);this.writes.push({tableId,rowId,data})}return structuredClone(row)}
 async updateRow({tableId,rowId,data,transactionId}){const key=this.key(tableId,rowId),tx=this.transactions.get(transactionId),source=tx?.snapshot||this.rows;if(!source.has(key))throw this.missing();const row={...source.get(key),...data,_version:++this.version};if(tx){tx.reads.add(key);tx.pending.set(key,row)}else{this.rows.set(key,row);this.writes.push({tableId,rowId,data})}return structuredClone(row)}
 async deleteRow({tableId,rowId}){const key=this.key(tableId,rowId);if(!this.rows.has(key))throw this.missing();this.rows.delete(key);this.writes.push({tableId,rowId,deleted:true});return {}}
 async createTransaction(){const key='tx'+(++this.version);this.transactions.set(key,{snapshot:structuredClone(this.rows),pending:new Map,reads:new Set});return {$id:key}}
 async updateTransaction({transactionId,commit}){const tx=this.transactions.get(transactionId);if(commit){for(const k of tx.reads)if(tx.snapshot.get(k)?._version!==this.rows.get(k)?._version)throw Object.assign(Error('Conflict'),{code:409});for(const [k,v] of tx.pending)this.rows.set(k,v)}this.transactions.delete(transactionId);return {}}
}
export class MockTelegram{
 constructor(){this.calls=[];this.nextId=100;this.failMethod=null;this.error=null;this.webhook=''}
 async call(token,method,body={}){this.calls.push({method,body});if(method===this.failMethod)throw this.error||Object.assign(Error('Telegram offline'),{ambiguous:true});if(method==='getMe')return {id:123456,is_bot:true,username:'TestBadaiBot',first_name:'Bot simulasi'};if(method==='getWebhookInfo')return {url:this.webhook,pending_update_count:0};if(method==='setWebhook'){this.webhook=body.url;return true}if(method==='deleteMessage'||method==='deleteWebhook')return true;return {message_id:this.nextId++}}
}
