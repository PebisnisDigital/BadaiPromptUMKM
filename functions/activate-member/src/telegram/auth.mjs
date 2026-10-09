import {fail} from './security.mjs';
export function identityVerifier({getAccount,listAdmins}){
 const user=async jwt=>{if(!jwt||typeof jwt!=='string'||jwt.length>4096)throw fail('Login diperlukan.',401);try{const account=await getAccount(jwt);if(!account?.$id||account.status===false)throw Error('Disabled account');return account}catch{throw fail('Sesi login sudah tidak valid.',401)}};
 const admin=async jwt=>{const account=await user(jwt),memberships=await listAdmins(account.$id);if(!memberships.some(m=>m.confirm===true))throw fail('Hanya admin terverifikasi yang dapat mengelola Telegram.',403);return account};
 return {user,admin};
}
