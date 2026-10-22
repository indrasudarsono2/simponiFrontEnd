import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { auditCsrfRequests } from './audit-csrf-requests.mjs';

function loadPolicy(){
 let token=fs.readFileSync(new URL('../app/utils/csrfToken.ts',import.meta.url),'utf8').replaceAll('export function','function');
 let source=fs.readFileSync(new URL('../app/utils/csrfFetch.ts',import.meta.url),'utf8').replace(/^import .*$/gm,'').split('/** Explicitly wrap mutations;')[0].replaceAll('export function','function');
 return new Function(stripTypeScriptTypes(token+'\n'+source)+';return {csrfRequestOptions,isSameOriginApi};')();
}
test('every page/component/composable mutation explicitly uses an audited CSRF-aware client',()=>{
 const requests=auditCsrfRequests();
 assert.ok(requests.length>=204);
 assert.deepEqual(requests.filter(r=>!['csrfFetch','apiFetch','submitApiFetch'].includes(r.callee)),[]);
});
test('POST PUT PATCH DELETE and shorthand methods use the fresh cookie without changing payloads',()=>{
 const {csrfRequestOptions}=loadPolicy();
 const origin='http://localhost:44440';
 const body=new FormData();body.append('file',new Blob(['test']),'test.txt');
 for(const method of ['POST','PUT','PATCH','DELETE','post']){
  const options=csrfRequestOptions('/backend/api/test',{method,body,headers:{'X-CSRF-Token':'outdated'}},'csrf_token=current',origin);
  assert.equal(options.headers.get('X-CSRF-Token'),'current');
  assert.equal(options.credentials,'include');assert.equal(options.body,body);
  assert.equal(options.headers.has('Content-Type'),false);
 }
 const options=csrfRequestOptions('/api/test',{method:'POST',headers:new Headers({'X-CSRF-Token':'old'})},'',origin);
 assert.equal(options.headers.has('X-CSRF-Token'),false);
});
test('CSRF secret is never added to external or non-API URLs',()=>{
 const {csrfRequestOptions,isSameOriginApi}=loadPolicy();
 const origin='http://localhost:44440';
 for(const url of ['https://external.example/api/upload','//external.example/api/upload','/document/file','/backend/api/../file']){
  assert.equal(isSameOriginApi(url,origin),false);
  const input={method:'POST',body:'unchanged'};
  assert.equal(csrfRequestOptions(url,input,'csrf_token=private',origin),input);
 }
 for(const url of ['/api/test','/backend/api/test',origin+'/backend/api/test'])assert.equal(isSameOriginApi(url,origin),true);
 for(const method of ['GET','HEAD','OPTIONS'])assert.equal(csrfRequestOptions('/backend/api/test',{method},'csrf_token=private',origin).headers.has('X-CSRF-Token'),false);
});
