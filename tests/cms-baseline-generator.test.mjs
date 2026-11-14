import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {join} from 'node:path';

test('offline baseline generator writes deterministic unique published records and a source manifest', () => {
 const root = mkdtempSync(join(process.cwd(), '.cms-generator-test-'));
 try {
  const script = 'scripts/cms-baseline.ts';
  for (const dir of ['a','b']) execFileSync(process.env.BUN || `${process.env.HOME}/.bun/bin/bun`, [script, join(root, dir)], {stdio:'pipe'});
  const read = (dir, file) => readFileSync(join(root,dir,file),'utf8');
  for (const file of ['baseline.ndjson','manifest.json']) assert.equal(read('a',file), read('b',file));
  const docs = read('a','baseline.ndjson').trim().split('\n').map(JSON.parse);
  const manifest = JSON.parse(read('a','manifest.json'));
  assert.equal(new Set(docs.map(d=>d._id)).size,docs.length);
  assert.ok(docs.every(d=>/^[A-Za-z0-9_-]+$/.test(d._id)), 'baseline IDs must be public root IDs');
  assert.deepEqual(Object.fromEntries(Object.keys(manifest.counts).map(type=>[type,docs.filter(d=>d._type===type).length])),manifest.counts);
  assert.deepEqual(manifest.counts,{siteSettings:1,profile:1,writing:3,project:3,experience:4,achievement:4,tool:18,certificate:3});
  assert.deepEqual(docs.filter(d=>d._type==='writing').map(d=>d.slug.current), ['reliable-pipelines','model-monitoring','data-systems']);
  assert.ok(docs.filter(d=>d._type==='writing').every(d=>d.publishedAt===null));
  assert.equal(docs.filter(d=>d._type==='tool').length,18);
  assert.ok(docs.filter(d=>d._type==='certificate').every(d=>!d.image && !d.originalFile));
 } finally { rmSync(root,{recursive:true,force:true}); }
});
