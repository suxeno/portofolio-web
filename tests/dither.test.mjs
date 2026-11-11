import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('each major section reserves an aria-hidden dither artwork', async () => {
  const page = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  for (const motif of ['writing', 'projects', 'experience', 'achievements', 'contact']) {
    assert.match(page, new RegExp(`data-dither="${motif}"[^>]*aria-hidden="true"`));
  }
});
