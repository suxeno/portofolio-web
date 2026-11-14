import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('unconfigured admin explicitly reports setup required and is not indexed', async () => {
  const html = await readFile(new URL('../dist/admin/index.html', import.meta.url), 'utf8');
  assert.match(html, /setup (?:is )?required/i);
  assert.match(html, /name=["']robots["'][^>]*content=["']noindex/i);
});
