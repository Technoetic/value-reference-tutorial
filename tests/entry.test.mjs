import test from 'node:test';
import assert from 'node:assert/strict';
import {VersionService} from '../src/services/version-service.js';
import {EntryService} from '../src/services/entry-service.js';

const baseUrl='https://example.test/value-reference-tutorial/';

test('stale cached entry redirects once preserving hash and stops loop if CDN still serves old HTML',async()=>{
  let redirected=null;
  const v1=new VersionService({baseUrl,loadedBuild:'vr-old',fetcher:async()=>({ok:true,json:async()=>({buildId:'vr-new'})})});
  const e1=new EntryService({version:v1,currentURL:baseUrl+'#/repository',replace:u=>{redirected=u;}});
  assert.equal(await e1.start(),'replaced');
  assert.match(redirected,/_vr=vr-new-/);
  assert.ok(redirected.endsWith('#/repository'));

  let secondRedirect=null;
  const v2=new VersionService({baseUrl,loadedBuild:'vr-old',fetcher:async()=>({ok:true,json:async()=>({buildId:'vr-new'})})});
  const e2=new EntryService({version:v2,currentURL:redirected,replace:u=>{secondRedirect=u;}});
  assert.equal(await e2.start(),'continue');
  assert.equal(secondRedirect,null);
});
