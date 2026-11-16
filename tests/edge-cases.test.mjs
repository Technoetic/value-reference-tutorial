import test from 'node:test';
import assert from 'node:assert/strict';
import {escapeHTML,won,parseStamps,cleanMemo,parseCustomerId} from '../src/shared/dom.js';
import {Customer,CustomerRepository,LedgerExperiment} from '../src/domain/customer-ledger.js';
import {LabStorageService,emptyProgress} from '../src/services/storage-service.js';
import {retainAssets} from '../scripts/retain-assets.mjs';
import {APP} from '../scripts/build.mjs';
import {mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';

test('escapeHTML escapes all five HTML special characters',()=>{
  assert.equal(escapeHTML(`<img src="x" onerror='alert(1)'>&`),'&lt;img src=&quot;x&quot; onerror=&#39;alert(1)&#39;&gt;&amp;');
  assert.equal(escapeHTML(null),'');
});

test('won formats safe Korean currency integers',()=>{
  assert.equal(won(0),'0원');
  assert.equal(won(12500),'12,500원');
});

test('parseStamps accepts 0..10 integers and rejects decimals, negatives, or >10',()=>{
  assert.equal(parseStamps('0'),0);
  assert.equal(parseStamps(' 10 '),10);
  for(const bad of ['','-1','11','2.5','abc'])assert.throws(()=>parseStamps(bad),RangeError);
});

test('cleanMemo strips control chars and enforces 1..36 length',()=>{
  assert.equal(cleanMemo('  텀블러\t지참\n '),'텀블러지참');
  assert.throws(()=>cleanMemo('   '),RangeError);
  assert.throws(()=>cleanMemo('가'.repeat(37)),RangeError);
});

test('parseCustomerId normalizes case and rejects unsafe characters',()=>{
  assert.equal(parseCustomerId(' c-104 '),'C-104');
  for(const bad of ['A','-BAD','C_104','C-12345678901234567'])assert.throws(()=>parseCustomerId(bad),RangeError);
});

test('Customer tier transitions cleanly at 10 stamps and caps at 999',()=>{
  const c=new Customer({id:'C-500',name:'테스터',stamps:9,memo:'기본'});
  assert.equal(c.tier,'SILVER');
  assert.equal(c.discount,0);
  c.addStamps(1);
  assert.equal(c.tier,'GOLD');
  assert.equal(c.discount,500);
  const nearCap=new Customer({id:'C-501',name:'상한',stamps:995,memo:'기본'});
  assert.throws(()=>nearCap.addStamps(5),RangeError);
});

test('CustomerRepository clear and entries preserve insertion order',()=>{
  const repo=new CustomerRepository();
  repo.register('C-104');
  repo.register('C-208');
  assert.deepEqual(repo.entries().map(c=>c.id),['C-104','C-208']);
  assert.equal(repo.find('C-999'),null);
  repo.clear();
  assert.equal(repo.size,0);
});

test('LedgerExperiment reset clears drift and restores initial snapshot',()=>{
  const lab=new LedgerExperiment({mode:'copies'});
  lab.applyUpdate({side:'order102',stamps:3,memo:'샷 추가'});
  assert.equal(lab.snapshot().hasDrift,true);
  const after=lab.reset();
  assert.equal(after.hasDrift,false);
  assert.equal(after.events.length,0);
  assert.equal(after.order102.customer.stamps,8);
});

test('LedgerExperiment rejects unknown mode or invalid side',()=>{
  assert.throws(()=>new LedgerExperiment({mode:'invalid'}),TypeError);
  const lab=new LedgerExperiment({mode:'reference'});
  assert.throws(()=>lab.applyUpdate({side:'order999',stamps:1}),TypeError);
});

test('LabStorageService rejects overlong notes, bad answer keys, and >60 actions',async()=>{
  const mem=new Map();
  const svc=new LabStorageService({storage:{getItem:k=>mem.get(k),setItem:(k,v)=>mem.set(k,v)}});
  const badNote=emptyProgress();badNote.note='x'.repeat(2001);
  await assert.rejects(svc.save(badNote));
  const badAns=emptyProgress();badAns.answers['bad key!']='a';
  await assert.rejects(svc.save(badAns));
  const tooMany=emptyProgress();
  tooMany.copies=Array.from({length:61},()=>({side:'order101',stamps:1,memo:'메모'}));
  await assert.rejects(svc.save(tooMany));
});

test('retainAssets rejects manifest/version mismatch and path escape names',async()=>{
  const dir=await mkdtemp(path.join(APP,'.qa-ret2-'));
  const mk=(obj)=>({ok:true,status:200,url:'https://technoetic.github.io/value-reference-tutorial/x',body:(async function*(){yield Buffer.from(JSON.stringify(obj));})()});
  try{
    const badPathManifest={schema:1,buildId:'vr-aaaaaaaaaaaa',sourceCommit:'b'.repeat(40),files:{'assets/../evil.js':'c'.repeat(64)}};
    await assert.rejects(retainAssets({outDir:dir,fetcher:async()=>mk(badPathManifest)}),/Invalid previous asset path/);

    const mismatchManifest={schema:1,buildId:'vr-aaaaaaaaaaaa',sourceCommit:'b'.repeat(40),files:{'assets/main.vr-aaaaaaaaaaaa.js':'c'.repeat(64)}};
    await assert.rejects(retainAssets({
      outDir:dir,
      fetcher:async u=>String(u).includes('version.json')?mk({schema:1,buildId:'vr-bbbbbbbbbbbb'}):mk(mismatchManifest)
    }),/mismatch/);
  }finally{
    await rm(dir,{recursive:true,force:true});
  }
});
