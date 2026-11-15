import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createSsrFixture } from './helpers/ssr-fixture.mjs';
let fixture;
before(async () => { fixture = await createSsrFixture(); });
after(async () => { if (fixture) await fixture.dispose(); });
test('HTML ships semantic content without relying on client rendering', async () => {
  const html = await fixture.html('/');
  assert.match(html, /<main[\s>]/i);
  assert.match(html, /id="experience"/);
  assert.match(html, /id="contact"/);
});
