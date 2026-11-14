import {mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';

// Generate from the checked-out sources; never depend on review artifacts.
export function baselineSeed() {
  const dir = mkdtempSync(join(tmpdir(), 'cms-test-seed-'));
  try {
    execFileSync(process.env.BUN_BIN || 'bun', ['scripts/cms-baseline.ts', dir], {stdio: 'pipe'});
    return readFileSync(join(dir, 'baseline.ndjson'), 'utf8').trim().split('\n').map(JSON.parse);
  } finally {
    rmSync(dir, {recursive: true, force: true});
  }
}
