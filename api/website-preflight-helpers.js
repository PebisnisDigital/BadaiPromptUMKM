// Safe, read-only scope detection for the independent website checkout
// readiness screen. This must never grant access or create invoices.
function missingUsersRead(error){
 const message=String(error?.message||'');
 const type=String(error?.type||'');
 return /users\.read/.test(message)&&(/missing scopes?/i.test(message)||/unauthorized.scope/i.test(type)||Number(error?.code)===401||Number(error?.code)===403);
}

async function inspectAccount({users,store,userId}){
 let accountExists=null,readAuthorized=true,missingScopes=[];
 try{
  await users.get({userId});
  accountExists=true;
 }catch(e){
  if(Number(e?.code)===404){accountExists=false}
  else if(missingUsersRead(e)){
   readAuthorized=false;
   missingScopes=['users.read'];
  }else throw e; // never hide unrelated failures
 }
 // Existing Premium data lives in member_profiles and remains readable
 // even if the Users service key lacks a scope.
 const profile=await store.get('member_profiles',userId);
 return {accountExists,readAuthorized,missingScopes,profile};
}
module.exports={inspectAccount,missingUsersRead};
