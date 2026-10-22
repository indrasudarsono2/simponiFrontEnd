// Run after `npm run build`. Uses a fake localhost API, never a real database.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs';

test('compiled frontend enforces security through actual HTTP middleware/proxy paths', {timeout:60000}, async()=>{
  const registry=fs.readFileSync(new URL('../.output/server/chunks/nitro/nitro.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(registry,/routes\/api\/users\.mjs|routes\/api\/essay\/essay\.mjs/,'Legacy fixture handlers must not ship');
  const requests=[];
  const backend=http.createServer(async(req,res)=>{
    const chunks=[];for await(const chunk of req)chunks.push(chunk);
    requests.push({url:req.url,headers:req.headers,body:Buffer.concat(chunks).toString()});
    res.setHeader('Content-Type','application/json');
    if(!req.headers.cookie?.includes('auth_token=assessment'))res.statusCode=401;
    res.end(JSON.stringify({isolatedSecurityBackend:true}));
  });
  backend.listen(0,'127.0.0.1');await once(backend,'listening');
  const probe=net.createServer();probe.listen(0,'127.0.0.1');await once(probe,'listening');
  const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));
  let log='';
  const child=spawn(process.execPath,['.output/server/index.mjs'],{
    cwd:new URL('../',import.meta.url),
    env:{PATH:process.env.PATH,NODE_ENV:'production',HOST:'127.0.0.1',PORT:String(port),NITRO_HOST:'127.0.0.1',NITRO_PORT:String(port),
      NUXT_API_ORIGIN:`http://127.0.0.1:${backend.address().port}`,NUXT_SECURITY_ORIGINS:'https://performa.airnavindonesia.co.id'},
    stdio:['ignore','pipe','pipe'],
  });
  child.stdout.on('data',chunk=>{log+=chunk});child.stderr.on('data',chunk=>{log+=chunk});
  const origin=`http://127.0.0.1:${port}`;
  const timeout=()=>new Promise(resolve=>setTimeout(resolve,100));
  try{
    let ready=false;
    for(let n=0;n<100;n++){
      assert.equal(child.exitCode,null,log);
      try{const reply=await fetch(origin+'/login');if(reply.status===200){ready=true;break}}catch{}
      await timeout();
    }
    assert.ok(ready,log);
    const login=await fetch(origin+'/login');
    for(const header of ['strict-transport-security','content-security-policy','x-frame-options','x-content-type-options'])assert.ok(login.headers.get(header),header);
    for(const path of ['/api/users','/api/essay/essay','/api/logbook','/api/role-modules'])assert.equal((await fetch(origin+path)).status,404,path);
    assert.equal((await fetch(origin+'/api/essay/image?image=http%3A%2F%2F127.0.0.1%2Fprivate')).status,410);
    assert.equal(requests.length,0);
    const headers={Cookie:'auth_token=assessment; csrf_token=original',Origin:'https://performa.airnavindonesia.co.id','Content-Type':'application/json'};
    for(const extra of [{},{'X-CSRF-Token':'wrong'},{'X-CSRF-Token':'original',Origin:'https://evil.example'}]){
      const response=await fetch(origin+'/backend/api/profile',{method:'POST',headers:{...headers,...extra},body:'{}'});
      assert.equal(response.status,403);
    }
    assert.equal(requests.length,0);
    const response=await fetch(origin+'/backend/api/profile',{method:'POST',headers:{...headers,'X-CSRF-Token':'original'},body:'{"name":"unchanged"}'});
    assert.equal(response.status,200);assert.equal((await response.json()).isolatedSecurityBackend,true);
    assert.equal(requests.at(-1).headers['x-csrf-token'],'original');assert.equal(requests.at(-1).body,'{"name":"unchanged"}');
    const legacy=await fetch(origin+'/api/licenseUser',{method:'POST',headers:{...headers,'X-CSRF-Token':'original'},body:'{}'});
    assert.equal(legacy.status,200);assert.equal(requests.at(-1).url,'/api/licenseUser');
    const form=new FormData();form.append('file',new Blob(['isolated-file'],{type:'application/pdf'}),'fixture.pdf');form.append('note','isolated');
    const upload=await fetch(origin+'/backend/api/licenseUser',{method:'POST',headers:{Cookie:headers.Cookie,Origin:headers.Origin,'X-CSRF-Token':'original'},body:form});
    assert.equal(upload.status,200);assert.match(requests.at(-1).headers['content-type'],/multipart\/form-data/);assert.match(requests.at(-1).body,/isolated-file/);
    assert.equal((await fetch(origin+'/backend/api/profile')).status,401);
    assert.equal((await fetch(origin+'/backend/api/auth/login',{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json'},body:'{}'})).status,403);
  } finally {
    if(child.exitCode===null){child.kill('SIGTERM');await once(child,'exit');}
    backend.closeAllConnections();await new Promise(resolve=>backend.close(resolve));
  }
});
