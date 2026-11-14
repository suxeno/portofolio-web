import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cmsConfig} from '../src/cms/config.mjs';

test('CMS setup requires both public identifiers and rejects partial setup', () => {
  assert.equal(cmsConfig({}), null);
  assert.throws(() => cmsConfig({SANITY_PROJECT_ID:'abc123'}), /both/i);
  assert.deepEqual(cmsConfig({SANITY_PROJECT_ID:'abc123', SANITY_DATASET:'production'}), {projectId:'abc123',dataset:'production'});
});
