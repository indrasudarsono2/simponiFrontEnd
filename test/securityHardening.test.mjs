import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { resolveSignedImage } from '../app/utils/signedImage.ts';
import { mutationSecurityError, legacyBackendPath } from '../server/utils/requestSecurity.ts';
import { escapeHtml } from '../app/utils/escapeHtml.ts';

test('question images accept signed backend paths, never arbitrary fetch targets', () => {
  const path = `/files/1900000000/${'a'.repeat(43)}/essays/example.png`;
  assert.equal(resolveSignedImage(path,'/backend'),`/backend${path}`);
  assert.equal(resolveSignedImage(`/backend${path}`,'/backend'),`/backend${path}`);
  for (const value of ['http://127.0.0.1/private','https://evil.example/image','//evil.example','data:image/svg+xml,test','/uploads/a.png',path+'/../a',path+'?url=x',path+'/%2e%2e/a',path+'/%2fprivate']) assert.equal(resolveSignedImage(value,'/backend'),'');
  const source=fs.readFileSync(new URL('../server/api/essay/image.get.ts',import.meta.url),'utf8');
  assert.match(source,/410/); assert.doesNotMatch(source,/fetch\(/);
});

test('cookie presence cannot replace browser CSRF proof; origin is also checked', () => {
  const request={method:'POST',path:'/api/profile',cookieToken:'secret',headerToken:'secret',origin:'https://performa.airnavindonesia.co.id',allowedOrigins:['https://performa.airnavindonesia.co.id']};
  assert.equal(mutationSecurityError(request),null);
  for(const overrides of [{headerToken:undefined},{headerToken:'forged'},{origin:'https://evil.example'},{origin:'https://sibling.airnavindonesia.co.id'},{origin:'null'},{origin:undefined},{headerToken:'éééééé'}]) assert.ok(mutationSecurityError({...request,...overrides}));
  assert.equal(mutationSecurityError({...request,origin:undefined,referer:'https://performa.airnavindonesia.co.id/profile'}),null);
  assert.equal(mutationSecurityError({...request,method:'GET',headerToken:undefined}),null);
  assert.equal(mutationSecurityError({...request,path:'/api/auth/login',headerToken:undefined}),null);
  assert.ok(mutationSecurityError({...request,path:'/api/auth/login',origin:'https://evil.example'}));
  const proxy=fs.readFileSync(new URL('../server/utils/backendProxy.ts',import.meta.url),'utf8');
  assert.doesNotMatch(proxy,/headers\[.[xX]-csrf-token.\]\s*=/);
});

test('fixture routes are denied while real legacy adapters remain backend-authorized', () => {
  for(const path of ['/api/users','/api/ielp','/api/essay/essay','/api/logbook','/api/members','/api/role-modules','/api/events']) assert.equal(legacyBackendPath(path,'GET'),null);
  assert.equal(legacyBackendPath('/api/events','POST'),'/api/events');
  assert.equal(legacyBackendPath('/api/licenseUser/12','PUT'),'/api/licenseUser/12');
  assert.equal(legacyBackendPath('/api/medexUser/sync-echain','POST'),'/api/medexUser/sync-echain');
  assert.equal(legacyBackendPath('/api/users','POST'),null);
});

test('plain group labels are escaped before HTML list interpolation',()=>{
  assert.equal(escapeHtml('<img src=x onerror="test">'), '&lt;img src=x onerror=&quot;test&quot;&gt;');
});

test('only read-only Nuxt Icon collection paths bypass the legacy API deny rule',()=>{
  const allowed=(path,method)=>['GET','HEAD'].includes(method)&&/^\/api\/_nuxt_icon\/[a-z0-9]+(?:-[a-z0-9]+)*(?:\.json)?$/.test(path);
  assert.ok(allowed('/api/_nuxt_icon/lucide','GET'));
  assert.ok(allowed('/api/_nuxt_icon/lucide.json','GET'));
  assert.ok(allowed('/api/_nuxt_icon/simple-icons','HEAD'));
  for(const [path,method] of [['/api/users','GET'],['/api/_nuxt_icon/lucide','POST'],['/api/_nuxt_icon/lucide/extra','GET'],['/api/_nuxt_icon/../users','GET']]) assert.equal(allowed(path,method),false);
  const source=fs.readFileSync(new URL('../server/middleware/security.ts',import.meta.url),'utf8');
  assert.ok(source.indexOf('_nuxt_icon')<source.indexOf('const backendPath'));
});
