import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { getDashboardRoute } from '../app/utils/dashboardRoute.ts';

test('home resolves to real role dashboards, never the retired template',()=>{
  assert.equal(getDashboardRoute(['GENERAL ADMIN']),'/dashboard/dashboardGeneralAdmin');
  assert.equal(getDashboardRoute(['OPERATIONAL']),'/dashboard/dashboardOperational');
  assert.equal(getDashboardRoute(['BRANCH ADMIN']),'/dashboard/dashboardBranchAdmin');
  assert.equal(getDashboardRoute(['BRANCH UNIT ADMIN']),'/dashboard/dashboardBranchUnitAdmin');
  assert.equal(getDashboardRoute([]),'/profile');
  const page=fs.readFileSync(new URL('../app/pages/index.vue',import.meta.url),'utf8');
  assert.doesNotMatch(page,/HomeChart|HomeSales|HomeStats|HomeDateRangePicker|HomePeriodSelect/);
  assert.match(page,/getDashboardRoute\(getRoleNames\(\)\)/);
  const middleware=fs.readFileSync(new URL('../app/middleware/auth.global.ts',import.meta.url),'utf8');
  assert.match(middleware,/to\.path === "\/"/);
  assert.ok(middleware.includes('isAuthenticated.value ? getDashboardRoute(getRoleNames()) : "/login"'));
});

test('actual global middleware redirects home without rendering a template',()=>{
  const source=fs.readFileSync(new URL('../app/middleware/auth.global.ts',import.meta.url),'utf8')
    .replace(/^import .*;\r?\n/gm,'').replace('export default ','handler = ');
  for(const [authenticated,roles,target] of [[true,['GENERAL ADMIN'],'/dashboard/dashboardGeneralAdmin'],[true,['OPERATIONAL'],'/dashboard/dashboardOperational'],[true,[],'/profile'],[false,[],'/login']]){
    const context={handler:null,defineNuxtRouteMiddleware:fn=>fn,getDashboardRoute,
      useAuth:()=>({isAuthenticated:{value:authenticated},getRoleNames:()=>roles,getAllModules:()=>[]}),
      isPathAllowedForModules:()=>true,navigateTo:(path,options)=>({path,replace:options?.replace})};
    vm.runInNewContext(source,context);
    const result=context.handler({path:'/'});
    assert.equal(result.path,target);assert.equal(result.replace,true);
  }
});
