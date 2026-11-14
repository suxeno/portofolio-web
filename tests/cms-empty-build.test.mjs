import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, readFileSync, readdirSync, rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {join,resolve} from 'node:path';

// Executes a real static build, with synthetic transport only, into an isolated output.
test('configured build accepts an intentionally empty published writing collection', {timeout:180000}, () => {
 const out=mkdtempSync(join(process.env.TMPDIR || '.', 'cms-empty-'));
 try {
  const result=spawnSync(process.execPath,['--import',resolve('tests/cms-empty-preload.mjs'),'node_modules/astro/bin/astro.mjs','build','--outDir',resolve(out)],{encoding:'utf8',env:{...process.env,SANITY_PROJECT_ID:'synthetic',SANITY_DATASET:'test'},timeout:170000});
  assert.equal(result.status,0,`${result.stdout}\n${result.stderr}`);
  const archive=readFileSync(join(out,'writing/index.html'),'utf8');
  const home=readFileSync(join(out,'index.html'),'utf8');
  for(const text of ['reliable-pipelines','model-monitoring','data-systems','TEST DRAFT MUST NOT APPEAR']) {assert.ok(!archive.includes(text));assert.ok(!home.includes(text));}
  assert.deepEqual(readdirSync(join(out,'writing')),['index.html']);
 } finally {rmSync(out,{recursive:true,force:true});}
});
