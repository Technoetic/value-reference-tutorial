import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import path from 'node:path';
import {APP,build} from '../scripts/build.mjs';

test('build emits hashed ESM graph with zero unresolved tokens and rejects escape output',async()=>{
  await assert.rejects(build({outDir:'../outside'}),/inside project/);
  await assert.rejects(build({outDir:'src'}),/inside project/);
  const dir=await mkdtemp(path.join(APP,'.qa-build-'));
  try{
    const rel=path.relative(APP,dir);
    const report=await build({outDir:rel,tag:'qa1'});
    assert.match(report.buildId,/^vr-[a-f\d]{12}-qa1$/);
    assert.equal(report.externalDependencies,0);
    const html=await readFile(path.join(dir,'index.html'),'utf8');
    assert.ok(html.includes(`content="${report.buildId}"`));
    assert.doesNotMatch(html,/__[A-Z_]+__/);
    const mainJs=await readFile(path.join(dir,'assets',`main.${report.buildId}.js`),'utf8');
    assert.ok(mainJs.includes(`./services/router.${report.buildId}.js`));
  }finally{
    await rm(dir,{recursive:true,force:true});
  }
});
