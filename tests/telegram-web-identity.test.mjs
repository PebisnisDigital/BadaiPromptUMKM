import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,createHmac} from 'node:crypto';
import {verifyTelegramWebsiteIdentity} from '../functions/activate-member/src/telegram/web-identity.mjs';

const TOKEN='123456789:123456789012345678901234567890ABCDEFGHI';
const now=1791600000;
function signed(input){
 const entries=Object.entries(input).sort(([a],[b])=>a.localeCompare(b,'en'));
 const check=entries.map(([k,v])=>k+'='+String(v)).join('\n');
 const sig=createHmac('sha256',createHash('sha256').update(TOKEN).digest()).update(check).digest('hex');
 return {...input,hash:sig};
}
const valid=()=>signed({id:123456789,first_name:'Rina',username:'rinasahabat',auth_date:now-20});
test('server accepts fresh signed Telegram identity without trusting email or WA',()=>{
 const u=verifyTelegramWebsiteIdentity(valid(),TOKEN,{now});
 assert.equal(u.telegram_id,'123456789');
 assert.equal(u.first_name,'Rina');
 assert.equal(u.username,'rinasahabat');
 assert.equal('email' in u,false);
 assert.equal('whatsapp' in u,false);
});
test('server rejects Telegram ID substitution',()=>assert.throws(()=>verifyTelegramWebsiteIdentity({...valid(),id:987654321},TOKEN,{now}),/tidak terverifikasi/));
test('server rejects expired or future-dated proof',()=>{
 assert.throws(()=>verifyTelegramWebsiteIdentity(signed({id:123456789,auth_date:now-3600}),TOKEN,{now}),/kedaluwarsa/);
 assert.throws(()=>verifyTelegramWebsiteIdentity(signed({id:123456789,auth_date:now+300}),TOKEN,{now}),/kedaluwarsa/);
});
test('server rejects unknown parameters',()=>assert.throws(()=>verifyTelegramWebsiteIdentity({...valid(),is_admin:true},TOKEN,{now}),/tidak dikenal/));
test('server rejects malformed IDs, unsigned payloads, and invalid bot secrets',()=>{
 assert.throws(()=>verifyTelegramWebsiteIdentity(signed({id:'-1',auth_date:now}),TOKEN,{now}),/Telegram ID/);
 assert.throws(()=>verifyTelegramWebsiteIdentity({...valid(),hash:'not a hash'},TOKEN,{now}),/Tanda tangan/);
 assert.throws(()=>verifyTelegramWebsiteIdentity(valid(),'wrong',{now}),/Bot login/);
});
