import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = () => readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
test('centralized section data appears in the built HTML', async () => {
  const page = await html();
  for (const text of ['On building reliable pipelines', 'Drowsiness detection camera', 'Eratani', 'DINAMIKA']) assert.ok(page.includes(text));
});
test('contact follows the fourth section with index 05', async () => {
  assert.match(await html(), /05 \/ CONTACT/);
});
test('README directory entry has a real readable no-script target', async () => {
  const page = await html();
  assert.match(page, /href="#readme"[^>]*>README\.md/);
  assert.match(page, /id="readme"/);
});
