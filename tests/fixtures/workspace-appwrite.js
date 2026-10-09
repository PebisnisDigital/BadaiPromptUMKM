(()=>{
const mode=new URLSearchParams(location.search).get('test');window.mockFailure=mode==='error';
let favoriteData=[];
const fixtures=Array.from({length:26},(_,i)=>({$id:'bp'+String(i+1).padStart(3,'0'),title:['Potret di jalan kota','Ngopi di kafe','Foto produk jualan'][i%3]+' '+(i+1),category:['Hijab','Kafe','Bisnis'][i%3],sort_order:i+1,is_published:true,is_featured:false,prompt_text:'Buat foto seorang perempuan berhijab dengan suasana '+['jalan kota','kafe hangat','toko kecil'][i%3]+'. Gunakan pencahayaan alami dan wajah dari foto referensi. '+(i+1),preview_file_id:['bp533','bp007','bp003'][i%3],preview_url:'https://sgp.cloud.appwrite.io/v1/storage/buckets/prompt-previews/files/'+['bp533','bp007','bp003'][i%3]+'/view?project=badai-prompt-umkm'}));
fixtures[21].preview_url_2=fixtures[20].preview_url;
window.mockCalls=[];window.mockRows=fixtures;window.mockCopies=[];
class Client{setEndpoint(){return this}setProject(){return this}}
class Account{async get(){if(mode==='login')throw {code:401,message:'Unauthorized'};return {$id:'test-user',name:'Ibu Rina',email:'simulasi@example.com'}}async createEmailPasswordSession(){return {}}async deleteSession(){} async createRecovery(){} }
class Teams{async get(){if(mode==='denied')throw {code:403,message:'Akun ini bukan admin'};return {$id:'admin-users'}}}
const Query=new Proxy({},{get:(_,type)=>(...args)=>({type,args})});
class TablesDB{
async getRow(){return {$id:'test-user',name:'Ibu Rina',email:'simulasi@example.com',whatsapp:'081234567890',status:'active',access_until:'2027-10-08'}}
async listRows(input){window.mockCalls.push(input);if(window.mockFailure&&input.tableId==='scene_prompts')throw Error('Simulasi jaringan terputus');if(input.tableId==='favorites')return {total:favoriteData.length,rows:favoriteData};let rows=input.tableId==='orders'?[{$id:'order-sim',full_name:'Pembeli Simulasi',email:'simulasi@example.com',whatsapp:'081234567890',status:'success',amount:59000,total_amount:59000,$createdAt:'2026-10-08T05:00:00Z'}]:fixtures;let offset=0,limit=100;for(const {type,args} of input.queries||[]){if(type==='equal')rows=rows.filter(r=>(Array.isArray(args[1])?args[1].includes(r[args[0]]):r[args[0]]===args[1]));if(type==='search')rows=rows.filter(r=>String(r[args[0]]).toLowerCase().includes(args[1].toLowerCase()));if(type==='limit')limit=args[0];if(type==='offset')offset=args[0]}return {total:rows.length,rows:rows.slice(offset,offset+limit)}}
async createRow(input){window.mockCalls.push({mutation:'create',...input});const row={$id:'sim-fav',...input.data};if(input.tableId==='favorites')favoriteData.push(row);return row}async updateRow(input){window.mockCalls.push({mutation:'update',...input});return {...input.data,$id:input.rowId}}async deleteRow(input){if(input.tableId==='favorites')favoriteData=favoriteData.filter(r=>r.$id!==input.rowId);window.mockCalls.push({mutation:'delete',...input})}
}
class Functions{async createExecution(input){window.mockCalls.push(input);const path=input.xpath;let d={};if(path.includes('/settings/get'))d={settings:{registration_open:true,product_price:100000,minimum_price:30000}};if(path.includes('/self/get'))d={user:{name:'Admin Simulasi',email:'admin@example.com'},membership:{roles:['admin']}};if(path.includes('/team/list')||path.includes('/coupons/list'))d={rows:[]};if(path.includes('/payment/get'))d={payment:{is_active:true,has_secret_token:true}};return {responseStatusCode:200,responseBody:JSON.stringify(d)}}}
window.Appwrite={Client,Account,TablesDB,Functions,Teams,Query,ID:{unique:()=> 'sim-new'},Permission:{read:x=>x,update:x=>x,delete:x=>x},Role:{user:x=>x}};
Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.mockCopies.push(text)}}});
})();
