import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, mkdtempSync, mkdirSync, existsSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

const workflow = readFileSync('.github/workflows/ci-deploy.yml','utf8');
test('CMS workflow tests local output first, rebuilds once with scoped public variables and deploys that output',()=>{
 assert.match(workflow,/cms-publish:/);
 assert.match(workflow,/SANITY_PROJECT_ID: ''[\s\S]*SANITY_DATASET: ''[\s\S]*bun run test/);
 assert.match(workflow,/bun run test[\s\S]*node scripts\/ci-production-build\.mjs[\s\S]*bun run check:deploy[\s\S]*Deploy tested build/);
 assert.match(workflow,/SANITY_PROJECT_ID: wmzxcxbs/);
 assert.match(workflow,/SANITY_DATASET: production/);
 assert.match(workflow,/run: bun run deploy:tested/);
 const pkg = JSON.parse(readFileSync('package.json','utf8'));
 for (const name of ['check:deploy','deploy:tested']) {
  assert.match(pkg.scripts[name],/validate-ssr-artifact\.mjs/);
  assert.match(pkg.scripts[name],/--config dist\/server\/wrangler\.json/);
 }
 assert.match(pkg.scripts['check:deploy'],/--dry-run/);
});
test('CMS guard rejects absent or partial config and removes stale output before failure',()=>{
 const cwd=mkdtempSync(join(process.env.TMPDIR || tmpdir(),'cms-ci-'));
 try { for(const env of [{CMS_PUBLISH:'true'},{CMS_PUBLISH:'false',SANITY_PROJECT_ID:'only'}]) {
   mkdirSync(join(cwd,'dist'),{recursive:true});
   const result=spawnSync(process.execPath,[resolve('scripts/ci-production-build.mjs'),'--validate-only'],{cwd,env:{PATH:process.env.PATH,...env},encoding:'utf8'});
   assert.notEqual(result.status,0,result.stderr); assert.equal(existsSync(join(cwd,'dist')),false);
 } } finally {rmSync(cwd,{recursive:true,force:true});}
});
