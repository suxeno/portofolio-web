import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = () => readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
test('centralized section data appears in the built HTML', async () => {
  const page = await html();
  for (const text of ['On building reliable pipelines', 'Drowsiness detection camera', 'Eratani', 'DINAMIKA']) assert.ok(page.includes(text));
});
test('contact follows achievements without redundant section labels', async () => {
  const page = await html();
  assert.ok(page.indexOf('id="achievements"') < page.indexOf('id="contact"'));
  assert.doesNotMatch(page, /05 \/ CONTACT/);
});
test('footer no longer contains the retired README target', async () => {
  const page = await html();
  assert.doesNotMatch(page, /href="#readme"|id="readme"/);
});
