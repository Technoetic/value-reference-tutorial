import test from 'node:test';
import assert from 'node:assert/strict';
import {ROUTES,normalizePath,parseRoute,routeUrl} from '../src/shared/routes.js';

test('six navigable routes normalize hashes and detect unknown paths',()=>{
  assert.equal(ROUTES.length,6);
  assert.equal(normalizePath(''),'/');
  assert.equal(normalizePath('#/copies/'),'/copies');
  assert.deepEqual(parseRoute('#/repository'),{path:'/repository',id:'repository',known:true});
  assert.deepEqual(parseRoute('#/missing-step'),{path:'/missing-step',id:null,known:false});
  const u=routeUrl('/practice','https://example.test/value-reference-tutorial/');
  assert.equal(u.href,'https://example.test/value-reference-tutorial/#/practice');
});
