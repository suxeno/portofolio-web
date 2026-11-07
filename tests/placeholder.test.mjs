import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('the placeholder provides a readable, script-independent introduction', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /<main[\s>]/i);
  assert.match(html, /Arvinanto Bahtiar/);
  assert.match(html, /portfolio is being prepared/i);
});
