import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {validateArtifact} from '../scripts/validate-ssr-artifact.mjs';

const arrays = 'kv_namespaces workflows migrations send_email connect r2_buckets d1_databases vectorize ai_search_namespaces agent_memory hyperdrive services analytics_engine_datasets dispatch_namespaces mtls_certificates pipelines k2 secrets_store_secrets artifacts unsafe_hello_world flagship worker_loaders ratelimits vpc_services vpc_networks'.split(' ');
function fixture() {
 const dir = mkdtempSync(join(process.env.TMPDIR || tmpdir(), 'packaging-test-'));
 const put=(path, value)=>{mkdirSync(join(dir,path,'..'),{recursive:true}); writeFileSync(join(dir,path),value)};
 const cfg = {name:'portofolio',main:'entry.mjs',compatibility_date:'2026-10-28',assets:{binding:'ASSETS',directory:'../client'},no_bundle:true,cache:{enabled:true},exports:{default:{type:'worker',cache:{enabled:false}},CachedPage:{type:'worker',cache:{enabled:true}}},durable_objects:{bindings:[]},queues:{producers:[],consumers:[]},logfwdr:{bindings:[]},vars:{}};
 for(const key of arrays) cfg[key]=[];
 put('server/wrangler.json', JSON.stringify(cfg));
 put('server/entry.mjs', 'ctx.exports.CachedPage.fetch(request); export { CachedPage, handler as default };');
 put('client/admin/index.html','studio'); put('client/_astro/client.js','client'); put('client/logos/python.svg','logo');
 return {dir,cfg,put,close:()=>rmSync(dir,{recursive:true,force:true})};
}
test('missing or static output is rejected before Wrangler can deploy it', () => {
 const dir = mkdtempSync(join(process.env.TMPDIR || tmpdir(), 'packaging-test-'));
 try { assert.throws(() => validateArtifact(dir), /artifact/i); } finally { rmSync(dir, {recursive:true, force:true}); }
});
test('seal rejects stale output and unexpected resources', () => {
 const f=fixture(); try {
  assert.throws(()=>validateArtifact(f.dir), /seal missing/);
  validateArtifact(f.dir,{seal:true}); validateArtifact(f.dir);
  f.put('client/admin/index.html','changed'); assert.throws(()=>validateArtifact(f.dir),/seal mismatch/);
  f.cfg.kv_namespaces=[{binding:'SESSION'}]; f.put('server/wrangler.json',JSON.stringify(f.cfg));
  assert.throws(()=>validateArtifact(f.dir,{seal:true}),/unexpected kv_namespaces/);
  f.cfg.kv_namespaces=[]; f.cfg.images={binding:'IMAGES'}; f.put('server/wrangler.json',JSON.stringify(f.cfg));
  assert.throws(()=>validateArtifact(f.dir,{seal:true}),/unexpected/);
 } finally {f.close()}
});
test('wrong worker export, client path and server exposure fail closed',()=>{
 const f=fixture(); try {
  f.put('server/entry.mjs','export default {}'); assert.throws(()=>validateArtifact(f.dir,{seal:true}),/exports missing/);
  f.put('server/entry.mjs','ctx.exports.CachedPage.fetch(request); export { CachedPage, handler as default };');
  f.cfg.assets.directory='../'; f.put('server/wrangler.json',JSON.stringify(f.cfg)); assert.throws(()=>validateArtifact(f.dir,{seal:true}),/assets mismatch/);
  f.cfg.assets.directory='../client'; f.put('server/wrangler.json',JSON.stringify(f.cfg)); f.put('client/.dev.vars','secret'); assert.throws(()=>validateArtifact(f.dir,{seal:true}),/server files exposed/);
 } finally {f.close()}
});
