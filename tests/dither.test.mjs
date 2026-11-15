import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createSsrFixture } from './helpers/ssr-fixture.mjs';

let fixture;
before(async () => { fixture = await createSsrFixture(); });
after(async () => { if (fixture) await fixture.dispose(); });

test('each major section reserves an aria-hidden dither artwork', async () => {
  const page = await fixture.html('/');
  for (const motif of ['writing', 'projects', 'experience', 'achievements', 'contact']) {
    assert.match(page, new RegExp(`data-dither="${motif}"[^>]*aria-hidden="true"`));
  }
});
