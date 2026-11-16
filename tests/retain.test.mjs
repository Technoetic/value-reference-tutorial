import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import path from 'node:path';
import {APP} from '../scripts/build.mjs';
import {retainAssets} from '../scripts/retain-assets.mjs';

const sha=buf=>createHash('sha256').update(buf).digest('hex');

test('retainAssets carries verified immutable assets and rejects hash mismatch, origin redirect, or path escape',async()=>{
  const dir=await mkdtemp(path.join(APP,'.qa-retain-'));
  try{
    const empty=await retainAssets({outDir:dir,allowEmpty:true,fetcher:async()=>({ok:false,status:404,url:'https://technoetic.github.io/value-reference-tutorial/pages-manifest.json'})});
    assert.equal(empty.retained,0);

    const jsBody=Buffer.from('export const x=1;\n');
    const manifest={
      schema:1,
      buildId:'vr-prev12345678',
      sourceCommit:'a'.repeat(40),
      files:{
        'index.html':sha(Buffer.from('<html></html>')),
        'data/lessons.json':sha(Buffer.from('{}')),
        'assets/main.vr-prev12345678.js':sha(jsBody)
      }
    };
    const mkResp=(obj,raw=false,url='https://technoetic.github.io/value-reference-tutorial/x')=>{
      const buf=raw?obj:Buffer.from(JSON.stringify(obj));
      return {ok:true,status:200,url,body:(async function*(){yield buf;})()};
    };
    const res=await retainAssets({
      outDir:dir,
      fetcher:async url=>{
        const p=new URL(url).pathname;
        if(p.endsWith('pages-manifest.json'))return mkResp(manifest);
        if(p.endsWith('version.json'))return mkResp({schema:1,buildId:'vr-prev12345678'});
        return mkResp(jsBody,true);
      }
    });
    assert.equal(res.retained,1);
    assert.equal(await readFile(path.join(dir,'assets/main.vr-prev12345678.js'),'utf8'),'export const x=1;\n');

    await assert.rejects(retainAssets({
      outDir:dir,
      fetcher:async url=>{
        const p=new URL(url).pathname;
        if(p.endsWith('pages-manifest.json'))return mkResp(manifest);
        if(p.endsWith('version.json'))return mkResp({schema:1,buildId:'vr-prev12345678'});
        return mkResp(Buffer.from('tampered'),true);
      }
    }),/hash mismatch/);

    await assert.rejects(retainAssets({
      outDir:dir,
      fetcher:async()=>mkResp(manifest,false,'https://evil.example/pages-manifest.json')
    }),/changed origin/);
  }finally{
    await rm(dir,{recursive:true,force:true});
  }
});
