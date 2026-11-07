import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
test('HTML ships semantic content without relying on client rendering', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /<main[\s>]/i);
  assert.match(html, /id="experience"/);
  assert.match(html, /id="contact"/);
});
