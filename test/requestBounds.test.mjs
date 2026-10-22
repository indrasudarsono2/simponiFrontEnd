import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PassThrough } from 'node:stream';
import { createRequire, stripTypeScriptTypes } from 'node:module';
import { pathToFileURL } from 'node:url';
const require=createRequire(import.meta.resolve('nuxt'));
const h3=pathToFileURL(require.resolve('h3')).href;
const source=stripTypeScriptTypes(fs.readFileSync(new URL('../server/utils/boundedRequest.ts',import.meta.url),'utf8')).replace("from 'h3'",`from ${JSON.stringify(h3)}`);
const {readBoundedRequest}=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const request=(headers={})=>Object.assign(new PassThrough(),{headers});

test('declared and chunked request bodies are bounded and memory is released',async()=>{
  await assert.rejects(readBoundedRequest(request({'content-length':'9'}),8),{statusCode:413});
  const tooLarge=request();const failed=readBoundedRequest(tooLarge,8);tooLarge.end(Buffer.alloc(9));
  await assert.rejects(failed,{statusCode:413});
  const valid=request();const completed=readBoundedRequest(valid,8);valid.end('12345678');
  const result=await completed;assert.equal(result.body.toString(),'12345678');result.release();result.release();
});

test('concurrent buffered uploads cannot exhaust the worker memory budget',async()=>{
  const held=[];
  try{
    for(let i=0;i<2;i++){
      const req=request();const pending=readBoundedRequest(req);req.end(Buffer.alloc(32*1024*1024));held.push(await pending);
    }
    const excess=request();const pending=readBoundedRequest(excess);excess.end('x');
    await assert.rejects(pending,{statusCode:429});
  }finally{for(const result of held)result.release();}
  const req=request();const pending=readBoundedRequest(req);req.end('healthy');
  const result=await pending;assert.equal(result.body.toString(),'healthy');result.release();
});
