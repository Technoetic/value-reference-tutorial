import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import {APP} from '../scripts/build.mjs';
import {ContentService} from '../src/services/content-service.js';

test('lessons.json passes ContentService validation and has 6 unique lessons and questions',async()=>{
  const raw=await readFile(path.join(APP,'data/lessons.json'),'utf8');
  const parsed=JSON.parse(raw);
  const svc=new ContentService({
    baseUrl:'https://example.test/value-reference-tutorial/',
    fetcher:async()=>({ok:true,status:200,json:async()=>parsed})
  });
  const data=await svc.load();
  assert.equal(data.lessons.length,6);
  assert.equal(data.questions.length,6);
  assert.equal(new Set(data.questions.map(q=>q.id)).size,6);
});

test('module boundaries keep domain and services free of screen imports',async()=>{
  for(const folder of ['domain','services','shared']){
    const dir=path.join(APP,'src',folder);
    for(const file of await readdir(dir)){
      const text=await readFile(path.join(dir,file),'utf8');
      assert.doesNotMatch(text,/screens\//,`${folder}/${file} must not import screens`);
    }
  }
});
