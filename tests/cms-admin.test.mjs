import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSsrFixture } from './helpers/ssr-fixture.mjs';

test('unconfigured admin explicitly reports setup required and is not indexed', async t => {
  const fixture = await createSsrFixture();
  t.after(() => fixture.dispose());
  const html = await fixture.html('/admin/');
  assert.match(html, /setup (?:is )?required/i);
  assert.match(html, /name=["']robots["'][^>]*content=["']noindex/i);
});
