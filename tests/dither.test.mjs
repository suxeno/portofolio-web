import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createSsrFixture } from './helpers/ssr-fixture.mjs';

let fixture;
before(async () => { fixture = await createSsrFixture(); });
after(async () => { if (fixture) await fixture.dispose(); });

test('each major section reserves an aria-hidden artwork', async () => {
  const page = await fixture.html('/');
  assert.match(page, /data-writing-art[\s\S]*?aria-hidden="true"/);
  assert.match(page, /class="section-art achievement-static"[^>]*achievements-static\.svg/);
  for (const motif of ['projects', 'experience', 'contact']) {
    assert.match(page, new RegExp(`data-dither="${motif}"[^>]*aria-hidden="true"`));
  }
});
