import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('editable section source stays in sync with the static HTML', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const source = await readFile(new URL('../content/sections.html', import.meta.url), 'utf8').catch(() => '');
  assert.ok(source.length > 0 && html.includes(source.trim()), 'central section source must be present verbatim in HTML');
});

test('contact follows the fourth section with index 05', async () => {
  const source = await readFile(new URL('../content/sections.html', import.meta.url), 'utf8');
  assert.match(source, /05 \/ CONTACT/);
});

test('README directory entry has a real readable no-script target', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /href="#readme"[^>]*>README\.md/);
  assert.match(html, /id="readme"/);
});
