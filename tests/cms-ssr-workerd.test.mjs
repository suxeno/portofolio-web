import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Miniflare, convertV4MiniflareOptions} from 'miniflare';
import {readdirSync, mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {baselineSeed} from './helpers/baseline-seed.mjs';

test('one built workerd artifact renders upstream edits, new slugs and hidden 404s', {timeout:180000}, async () => {
 const dir = mkdtempSync(join(tmpdir(), 'cms-ssr-workerd-'));
 let mf;
 try {
  const result = spawnSync('flock', [join(tmpdir(), 'portfolio-ssr-build.lock'), 'node_modules/.bin/astro', 'build', '--outDir', dir], {encoding:'utf8', env:{...process.env, SANITY_PROJECT_ID:'wmzxcxbs', SANITY_DATASET:'production'}, timeout:150000});
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  let docs = baselineSeed();
  let calls = 0;
  const server = join(dir,'server');
  const modules = ['entry.mjs', 'virtual_astro_middleware.mjs', ...readdirSync(join(server,'chunks')).filter(x => x.endsWith('.mjs')).map(x => `chunks/${x}`)].map(path => ({type:'ESModule',path:join(server,path)}));
  const options = convertV4MiniflareOptions({modules,modulesRoot:server,compatibilityDate:'2026-10-28',assets:{directory:join(dir,'client'),binding:'ASSETS'},outboundService:async request => {
    calls++;
    assert.equal(new URL(request.url).hostname, 'wmzxcxbs.apicdn.sanity.io');
    return new Response(JSON.stringify({result:docs}),{headers:{'content-type':'application/json'}});
  }});
  // The v4 converter does not infer this v5 router field for explicit modules.
  options.workers[0].config.assets.hasUserWorker = true;
  options.workers[0].config.cache = {enabled:true};
  options.workers[0].config.exports = {default:{type:'worker',cache:{enabled:false}},CachedPage:{type:'worker',cache:{enabled:true}}};
  options.workers[0].config.assets.runWorkerFirst = true;
  mf = new Miniflare(options);
  let r = await mf.dispatchFetch('http://localhost/'); assert.equal(r.status,200,await r.clone().text()); assert.doesNotMatch(await r.text(),/Fixture changed biography/); assert.equal(calls,1);
  docs=structuredClone(docs); docs.find(x=>x._type==='profile').biography='Fixture changed biography';
  const copy=structuredClone(docs.find(x=>x._type==='writing')); copy._id='writing--fixture-new'; copy.slug.current='fixture-new'; copy.title='Fixture new article'; docs.push(copy);
  // Miniflare does not emulate the platform entrypoint cache. Request bypass
  // explicitly here; live cache hit/expiry is verified by the separate probe.
  r=await mf.dispatchFetch('http://localhost/?refresh=1'); assert.equal(r.status,200); assert.match(await r.text(),/Fixture changed biography/); assert.equal(calls,2);
  r=await mf.dispatchFetch('http://localhost/writing/fixture-new/?refresh=1'); assert.equal(r.status,200); assert.match(await r.text(),/Fixture new article/); assert.equal(calls,3);
  copy.visible=false;
  r=await mf.dispatchFetch('http://localhost/writing/fixture-new/?refresh=1'); assert.equal(r.status,404); assert.equal(calls,4);
 } finally { if(mf) await mf.dispose(); rmSync(dir,{recursive:true,force:true}); }
});
