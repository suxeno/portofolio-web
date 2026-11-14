// CI only: discard baseline test output before validating or building production.
import {rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {cmsConfig} from '../src/cms/config.mjs';

rmSync('dist', {recursive:true, force:true});
try {
  const config = cmsConfig(process.env);
  if (process.env.CMS_PUBLISH === 'true' && !config) throw new Error('CMS publish requires SANITY_PROJECT_ID and SANITY_DATASET');
  if (!process.argv.includes('--validate-only')) {
    const result = spawnSync('bun', ['run','build'], {stdio:'inherit', env:process.env});
    if (result.error || result.status !== 0) throw result.error || new Error(`Production build failed: ${result.status}`);
  }
} catch (error) {
  rmSync('dist', {recursive:true, force:true});
  console.error(error.message);
  process.exitCode = 1;
}
