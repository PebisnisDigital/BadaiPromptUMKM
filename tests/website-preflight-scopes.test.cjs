const test=require('node:test');
const assert=require('node:assert/strict');
const {inspectAccount,missingUsersRead}=require('../api/website-preflight-helpers.js');

const scopeError=()=>Object.assign(new Error('appbadai-prompt-umkm@service.sgp.cloud.appwrite.io (role: applications) missing scopes (["users.read"])'),{code:401,type:'general_unauthorized_scope'});
test('Appwrite users.read missing yields actionable blocked diagnostic without a payment',async()=>{
 const calls=[];const users={async get(){calls.push('users.get');throw scopeError()}};
 const store={async get(table,id){calls.push('profiles.get');assert.equal(table,'member_profiles');assert.equal(id,'linked-account');return {status:'active',access_until:'2027-10-10T00:00:00Z'}}};
 const result=await inspectAccount({users,store,userId:'linked-account'});
 assert.deepEqual(calls,['users.get','profiles.get']);
 assert.equal(result.readAuthorized,false);
 assert.equal(result.accountExists,null);
 assert.deepEqual(result.missingScopes,['users.read']);
 assert.equal(result.profile.status,'active');
});
test('account read with correct scope identifies existing or absent Appwrite user',async()=>{
 const store={async get(){return null}};
 const existing=await inspectAccount({users:{async get(){return {$id:'member'}}},store,userId:'member'});
 assert.equal(existing.accountExists,true);
 assert.equal(existing.readAuthorized,true);
 const missing=await inspectAccount({users:{async get(){throw {code:404}}},store,userId:'missing'});
 assert.equal(missing.accountExists,false);
 assert.equal(missing.readAuthorized,true);
});
test('scope classification is narrow; unrelated authorization failures are not silently ignored',async()=>{
 assert.equal(missingUsersRead(scopeError()),true);
 assert.equal(missingUsersRead({code:401,message:'Missing scopes (["teams.read"])'}),false);
 assert.equal(missingUsersRead({code:500,message:'users.read internal error'}),false);
 await assert.rejects(()=>inspectAccount({
  users:{async get(){throw Object.assign(new Error('Server down'),{code:503})}},
  store:{async get(){throw Error('should not reach profile on unexpected service failure')}},
  userId:'member'
 }),/Server down/);
});
