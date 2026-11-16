import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import {APP,build} from '../scripts/build.mjs';
import {createStaticServer,PREFIX} from '../scripts/server.mjs';

test('static server sets cache/CSP headers, supports 304 on immutable assets, and returns real 404s',async()=>{
  const dir=await mkdtemp(path.join(APP,'.qa-srv-'));
  const report=await build({outDir:path.relative(APP,dir)});
  const server=createStaticServer({root:dir});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const port=server.address().port;
  const base=`http://127.0.0.1:${port}`;
  try{
    const redir=await fetch(base+'/',{redirect:'manual'});
    assert.equal(redir.status,302);

    const htmlRes=await fetch(base+PREFIX);
    assert.equal(htmlRes.status,200);
    assert.equal(htmlRes.headers.get('cache-control'),'no-store');
    assert.ok(htmlRes.headers.get('content-security-policy')?.includes("default-src 'self'"));

    const assetRes=await fetch(`${base}${PREFIX}assets/main.${report.buildId}.js`);
    assert.equal(assetRes.status,200);
    assert.match(assetRes.headers.get('cache-control'),/immutable/);
    const etag=assetRes.headers.get('etag');
    const cached=await fetch(`${base}${PREFIX}assets/main.${report.buildId}.js`,{headers:{'if-none-match':etag}});
    assert.equal(cached.status,304);

    for(const missing of [`${base}${PREFIX}assets/nope.js`,`${base}${PREFIX}data/nope.json`,`${base}/unknown`]){
      const r404=await fetch(missing);
      assert.equal(r404.status,404);
    }
    const post=await fetch(base+PREFIX,{method:'POST'});
    assert.equal(post.status,405);
  }finally{
    await new Promise(r=>server.close(r));
    await rm(dir,{recursive:true,force:true});
  }
});
