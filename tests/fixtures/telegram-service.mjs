import {Query} from 'node-appwrite';
import {randomBytes} from 'node:crypto';
import {Store} from '../../functions/activate-member/src/telegram/store.mjs';
import {Service} from '../../functions/activate-member/src/telegram/service.mjs';
import {defaults} from '../../functions/activate-member/src/telegram/policy.mjs';
import {MemoryTables,MockTelegram} from './telegram-memory.mjs';
export async function serviceFixture(){let now=Date.parse('2026-10-10T00:00:00Z');const tables=new MemoryTables,store=new Store(tables,Query),telegram=new MockTelegram,s=new Service({store,telegram,key:randomBytes(32).toString('base64'),now:()=>now,sendEnabled:true,verifyAdmin:async jwt=>{if(jwt!=='admin')throw Object.assign(Error('Denied'),{status:403});return {$id:'admin'}},verifyUser:async jwt=>{if(jwt!=='member')throw Object.assign(Error('Denied'),{status:401});return {$id:'test-user'}},verifyPaidAccess:async()=>true});const {bot}=await s.admin('save',{token:'123456:FAKE_TEST_TOKEN_DO_NOT_USE_1234567890'},'admin');await store.putState('telegram-settings',{...defaults,enabled:true,paused:false,dry_run:false,main_bot_id:bot.$id});return {tables,store,telegram,s,bot:await s.bot(bot.$id),now:()=>now,setNow:value=>now=value}}
export const inbound=(n,text='/start',user=777)=>({update_id:n,message:{text,chat:{type:'private',id:user},from:{id:user,first_name:'Fixture',is_bot:false}}});
export const prompt=(n,extra={})=>({is_published:true,title:'Konten '+n,prompt_text:'Prompt unik '+n,preview_url:'https://example.com/p'+n+'.jpg',...extra});
