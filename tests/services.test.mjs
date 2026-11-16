import test from 'node:test';
import assert from 'node:assert/strict';
import {VersionService} from '../src/services/version-service.js';
import {LabStorageService,emptyProgress} from '../src/services/storage-service.js';
import {ContentService} from '../src/services/content-service.js';

const baseUrl='https://example.test/value-reference-tutorial/';

test('loaded HTML identity detects both upgrade and rollback by inequality',async()=>{
  const v=new VersionService({baseUrl,loadedBuild:'vr-b',fetcher:async()=>({ok:true,json:async()=>({buildId:'vr-a'})})});
  assert.equal((await v.navigation('#/reference',()=>({dirty:false,saving:false}))).kind,'reload');
  assert.equal(v.loadedBuild,'vr-b');
});

test('dirty input started during version check protects navigation',async()=>{
  let release;let dirty=false;
  const v=new VersionService({baseUrl,loadedBuild:'vr-a',fetcher:()=>new Promise(r=>{release=r;})});
  const move=v.navigation('#/code',()=>({dirty,saving:false}));
  dirty=true;
  release({ok:true,json:async()=>({buildId:'vr-b'})});
  assert.equal((await move).kind,'protect');
});

test('save in flight blocks transition even when dirty flag is false',async()=>{
  const v=new VersionService({baseUrl,loadedBuild:'vr-a',fetcher:async()=>({ok:true,json:async()=>({buildId:'vr-b'})})});
  assert.equal((await v.navigation('#/',()=>({dirty:false,saving:true}))).kind,'protect');
});

test('version failure, bad status, or malformed identity keeps current runtime usable',async()=>{
  for(const fetcher of [async()=>{throw Error('offline');},async()=>({ok:false}),async()=>({ok:true,json:async()=>({buildId:'<bad>'})})]){
    const v=new VersionService({baseUrl,loadedBuild:'vr-a',fetcher});
    assert.equal((await v.navigation('#/',()=>({}))).kind,'spa');
    assert.equal(v.status,'unavailable');
  }
});

test('version timeout resolves unavailable without throwing',async()=>{
  const v=new VersionService({baseUrl,loadedBuild:'vr-a',timeoutMs:15,fetcher:()=>new Promise(()=>{})});
  assert.equal((await v.refresh()).status,'unavailable');
});

test('storage service clones progress, validates actions, and handles blocked storage',async()=>{
  const mem=new Map();
  const storage={getItem:k=>mem.get(k),setItem:(k,v)=>mem.set(k,v)};
  const svc=new LabStorageService({storage});
  const p=emptyProgress();
  p.note='단골 원장으로 참조 통합';
  p.copies.push({side:'order101',stamps:2,memo:'텀블러 지참'});
  await svc.save(p);
  p.note='changed';
  assert.equal(svc.load().note,'단골 원장으로 참조 통합');
  storage.setItem(svc.key,'{broken');
  assert.deepEqual(svc.load(),emptyProgress());
  assert.ok(svc.warning);

  const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw new DOMException('blocked','SecurityError');}});
  try{
    const blocked=new LabStorageService();
    assert.deepEqual(blocked.load(),emptyProgress());
    assert.ok(blocked.warning);
    await assert.rejects(blocked.save(emptyProgress()),/저장/);
  }finally{
    if(previous)Object.defineProperty(globalThis,'localStorage',previous);
    else delete globalThis.localStorage;
  }
});

test('content service rejects HTTP errors and supports AbortController cancellation',async()=>{
  const fail=new ContentService({baseUrl,fetcher:async()=>({ok:false,status:503})});
  await assert.rejects(fail.load(),/503/);
  const abort=new AbortController();abort.abort();
  const cancelled=new ContentService({baseUrl,fetcher:async()=>{throw Error('should not run');}});
  await assert.rejects(cancelled.load(abort.signal),{name:'AbortError'});
});
