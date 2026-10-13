const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','member.html'),'utf8');
const script=html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1]||'';

test('member offers explicit account switch only when another session is active',()=>{
 assert.match(html,/id="switchMemberAccount" type="button" hidden/);
 assert.match(script,/function showExistingMemberSession\(user,reason=''\)/);
 assert.match(script,/showExistingMemberSession\(previous\)/);
 assert.match(script,/button\.addEventListener\('click'/);
 assert.match(script,/await account\.deleteSession\(\{sessionId:'current'\}\)/);
 assert.match(script,/const label=String\(user\?\.email\|\|'akun lain'\)/);
 assert.match(script,/tab Samaran agar sesi admin tetap aktif/);
 const stop=script.indexOf("async function boot(){");
 const submit=script.indexOf("$('loginForm').addEventListener('submit'");
 assert.ok(submit>stop);
 assert.doesNotMatch(script.slice(stop,submit),/deleteSession/);
});
test('login no longer treats all HTTP 401 errors as wrong password',()=>{
 assert.match(script,/await account\.get\(\)/);
 assert.match(script,/err\?\.type==='user_session_already_exists'/);
 assert.match(script,/err\?\.type==='user_invalid_credentials'/);
 assert.doesNotMatch(script,/Number\(err\?\.code\)===401\?'Email atau password belum cocok/);
 assert.match(script,/if\(await boot\(\)\)setMsg\(''\)/);
 assert.doesNotThrow(()=>new vm.Script(script));
});
test('existing member access, recovery, previews and favorites stay intact',()=>{
 for(const text of [
  'account.createEmailPasswordSession','account.createRecovery',
  'await loadProfile()','await enterLibrary()',
  'toggleFavorite(current.$id)', 'safeCopy(current.prompt_text)',
  'id="grid"', 'id="detailOverlay"', 'id="accountOverlay"'
 ])assert.ok(html.includes(text),text+' should remain');
});
