import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,createSign,createPublicKey} from 'node:crypto';
import {loginUrl,pkceChallenge,verifyTelegramIdToken,randomSecret} from '../functions/activate-member/src/telegram/website-oidc.mjs';

const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const publicJwk=publicKey.export({format:'jwk'}),clientId='1234567890',kid='telegram-unit-test';
const issuer='https://oauth.telegram.org';
const now=1_791_600_000;
function jwt(claims={},header={}){
 const payload={iss:issuer,aud:clientId,sub:'123456789',id:123456789,name:'Rina',exp:now+360,iat:now-10,...claims};
 const h={alg:'RS256',typ:'JWT',kid,...header};
 const input=Buffer.from(JSON.stringify(h)).toString('base64url')+'.'+Buffer.from(JSON.stringify(payload)).toString('base64url');
 const signature=createSign('RSA-SHA256').update(input).end().sign(privateKey).toString('base64url');
 return input+'.'+signature;
}
const verify=(token,opts={})=>verifyTelegramIdToken(token,{clientId,keys:{keys:[{...publicJwk,kid,kty:'RSA',use:'sig',alg:'RS256'}]},now,...opts});
test('Telegram code flow requires official callback, unique state and S256 PKCE',()=>{
 const verifier=randomSecret()+randomSecret().slice(0,20),state=randomSecret();
 const url=new URL(loginUrl({clientId,redirectUri:'https://badaiprompt.vercel.app/api/website-login',state,verifier}));
 assert.equal(url.origin,'https://oauth.telegram.org');
 assert.equal(url.pathname,'/auth');
 assert.equal(url.searchParams.get('client_id'),clientId);
 assert.equal(url.searchParams.get('response_type'),'code');
 assert.equal(url.searchParams.get('code_challenge'),pkceChallenge(verifier));
 assert.equal(url.searchParams.get('code_challenge_method'),'S256');
 assert.equal(url.searchParams.get('state'),state);
 assert.throws(()=>loginUrl({clientId,redirectUri:'https://attacker.test/api/website-login',state,verifier}),/domain resmi/);
});
test('cryptographically signed RS256 JWT with issuer and audience is accepted',()=>{
 const data=verify(jwt());
 assert.equal(data.telegram_id,'123456789');
 assert.equal(data.name,'Rina');
});
test('tampering signature or payload is rejected',()=>{
 const token=jwt(),pieces=token.split('.');
 const mutated=pieces[0]+'.'+Buffer.from(JSON.stringify({iss:issuer,aud:clientId,sub:'123456789',id:999111333,exp:now+200,iat:now-10})).toString('base64url')+'.'+pieces[2];
 assert.throws(()=>verify(mutated),/Tanda tangan/);
 assert.throws(()=>verify(pieces[0]+'.'+pieces[1]+'.'+pieces[2].slice(0,-5)+'AAAAA'),/Tanda tangan/);
});
for(const [label,claims,re] of [
 ['wrong issuer',{iss:'https://attacker.example'},/Penerbit/],
 ['wrong audience',{aud:'other-bot'},/Penerbit/],
 ['expired',{exp:now-2},/kedaluwarsa/],
 ['future iat',{iat:now+120},/kedaluwarsa/],
 ['bad subject',{sub:''},/Subjek/],
 ['bad Telegram ID',{id:'0'},/ID Telegram/]
])test('deny '+label,()=>assert.throws(()=>verify(jwt(claims)),re));
test('reject algorithm substitution and unknown signing keys',()=>{
 assert.throws(()=>verify(jwt({}, {alg:'none'})),/Algoritma/);
 assert.throws(()=>verify(jwt({}, {kid:'untrusted'})),/Kunci publik/);
});
test('nonce mismatches are not accepted',()=>{
 assert.throws(()=>verify(jwt({nonce:'actual'}),{nonce:'different'}),/Nonce/);
 assert.equal(verify(jwt({nonce:'expected'}),{nonce:'expected'}).telegram_id,'123456789');
});
