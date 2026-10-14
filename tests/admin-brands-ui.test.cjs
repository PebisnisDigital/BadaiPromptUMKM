'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../admin.html'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'../assets/admin-brands.css'),'utf8');
const js=fs.readFileSync(path.join(__dirname,'../assets/admin-brands.js'),'utf8');
test('Kelola Brand navigation and responsive layout render inside secure existing admin',()=>{
 assert.match(html,/id="v-brands"/);
 assert.match(html,/data-view="brands"/);
 assert.match(html,/id="brandForm"/);
 assert.match(html,/id="brandList"/);
 assert.match(html,/id="brandCtaEnabled"/);
 assert.match(html,/src="\/assets\/admin-brands\.js\?v=1"/);
 assert.match(html,/admin-brands\.css\?v=1/);
 assert.match(css,/grid-template-columns:repeat\(6/);
 assert.match(css,/@media\(max-width:680px\)/);
});
test('no direct client Appwrite table writes and every call uses admin JWT',()=>{
 assert.match(js,/account\.createJWT\(\)/);
 assert.match(js,/Bearer '\+jwt\.jwt/);
 assert.match(js,/fetch\('\/api\/public-previews\?admin_brands=1'/);
 assert.doesNotMatch(js,/tables\.createRow|tables\.updateRow|APPWRITE_API_KEY|BRAND_ADMIN_APPWRITE_KEY/);
 assert.match(js,/urlOk\(F\.checkout/);
});
