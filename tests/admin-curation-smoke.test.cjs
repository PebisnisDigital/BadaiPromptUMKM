const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=path.resolve(__dirname,'..');
const admin=fs.readFileSync(path.join(base,'admin.html'),'utf8');
const js=fs.readFileSync(path.join(base,'assets/admin-curation.js'),'utf8');
const css=fs.readFileSync(path.join(base,'assets/admin-curation.css'),'utf8');
test('existing published prompt admin is preserved and private tabs are nested',()=>{
 assert.match(admin,/id="v-prompts"/);
 assert.match(admin,/id="promptList"/);
 assert.match(admin,/id="promptLibraryPanel"/);
 assert.match(admin,/data-cur-tab="published"/);
 assert.match(admin,/data-cur-tab="reference"/);
 assert.match(admin,/data-cur-tab="curation"/);
 assert.equal((admin.match(/data-cur-panel=/g)||[]).length,3);
 assert.match(admin,/admin-curation\.js\?v=1/);
 assert.match(admin,/admin-curation\.css\?v=1/);
});
test('references and Excel upload are real forms, not inert mockups',()=>{
 for(const id of ['curAddForm','curTitle','curCategory','curSourceUrl','curLicense','curOriginal','curImportFile','curTemplate','curImportBtn','curList','curEditForm','curAdapted','curPreview','curPreviewImage','curScoreVisual','curScoreHook','curScoreValue','curScoreEasy','curPublish']){
   assert.ok(admin.includes('id="'+id+'"'),id);
 }
 assert.match(admin,/accept="\.xlsx,\.xls,\.csv,\.tsv,text\/csv"/);
 assert.match(js,/function parseCsv\(input,sep\)/);
 assert.match(js,/async function workbookRows\(file\)/);
 assert.match(js,/xlsx\.full\.min\.js/);
 assert.match(js,/const TABLE_REF='curation_refs'/);
 assert.match(js,/tables\.createRow\(\{databaseId:DB,tableId:TABLE_REF/);
 assert.match(js,/if\(items\.length>BATCH\)/);
 assert.match(js,/crypto\.subtle\.digest\('SHA-256',bytes\)/);
 assert.match(js,/idx_curation_fingerprint|fingerprint:/);
});
test('quality, rights, and a genuine image preview must pass before publishing',()=>{
 assert.match(admin,/id="curRightsConfirm"/);
 assert.match(admin,/id="curPreviewImage"/);
 assert.match(js,/data\.score<80/);
 assert.match(js,/source_license==='unknown'/);
 assert.match(js,/samePrompt\(data\.reference_prompt,data\.adapted_prompt\)/);
 assert.match(js,/naturalWidth<1/);
 assert.match(js,/state\.selected\.stage!=='review'/);
 assert.match(js,/!el\('curRightsConfirm'\)\.checked/);
 assert.match(js,/window\.confirm\('Terbitkan prompt/);
 assert.match(js,/rowId='cr_'\+id/);
 assert.match(js,/tableId:LIBRARY/);
 assert.match(js,/is_published:true/);
 assert.match(js,/published_prompt_id:rowId/);
});
test('AI help is honest clipboard brief; no pretend generation or public scraping',()=>{
 assert.match(js,/navigator\.clipboard\.writeText\(brief\)/);
 assert.match(js,/Hasil harus terasa fotografi nyata/);
 assert.doesNotMatch(js,/openai\.com\/v1\/images|api\.openai\.com|gemini.*generateContent/i);
 assert.doesNotMatch(admin,/Generate gambar otomatis sekarang/i);
 assert.match(admin,/Generate\/upload otomatis belum diaktifkan/);
});
test('script parses and existing published collection stays reachable',()=>{
 assert.doesNotThrow(()=>new Function(js));
 assert.match(css,/\.cur-tabs\{/);
 assert.match(css,/\.cur-workspace\{/);
 assert.match(css,/@media\(max-width:560px\)/);
 assert.match(admin,/id="addPromptBtn"/);
 assert.match(admin,/id="importCsvBtn"/);
 assert.match(admin,/id="promptPagination"/);
});
