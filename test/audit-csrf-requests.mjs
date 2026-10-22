import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { fileURLToPath } from 'node:url';

export function auditCsrfRequests(base=new URL('../app/',import.meta.url)) {
 const results=[];
 function walk(dir) {for(const entry of fs.readdirSync(dir,{withFileTypes:true})) {
  const file=path.join(dir,entry.name);
  if(entry.isDirectory()){walk(file);continue;}
  if(!/\.(vue|ts)$/.test(file))continue;
  const raw=fs.readFileSync(file,'utf8');
  const content=file.endsWith('.vue')?(raw.match(/<script\b[^>]*>([\s\S]*?)<\/script>/)?.[1]||''):raw;
  const source=ts.createSourceFile(file,content,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
  function visit(node) {
   if(ts.isCallExpression(node)) {
    const callee=node.expression.getText(source);
    const opts=node.arguments[1];let method='GET';
    if(opts && ts.isObjectLiteralExpression(opts)) {
     const p=opts.properties.find(p=>(ts.isPropertyAssignment(p)||ts.isShorthandPropertyAssignment(p))&&p.name.getText(source).replace(/['"]/g,'')==='method');
     if(p && ts.isPropertyAssignment(p) && ts.isStringLiteral(p.initializer))method=p.initializer.text.toUpperCase();
     else if(p)method='DYNAMIC';
    }
    if(['POST','PUT','PATCH','DELETE','DYNAMIC'].includes(method))results.push({file:path.relative(fileURLToPath(new URL('../',import.meta.url)),file),callee,method,line:source.getLineAndCharacterOfPosition(node.getStart()).line+1,url:node.arguments[0]?.getText(source)});
   }
   ts.forEachChild(node,visit);
  }visit(source);
 }}walk(base instanceof URL?fileURLToPath(base):base);return results;
}
if(process.argv[1]===fileURLToPath(import.meta.url))console.log(JSON.stringify(auditCsrfRequests(),null,2));
