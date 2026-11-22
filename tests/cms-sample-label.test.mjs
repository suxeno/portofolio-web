import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('published CMS articles with no date retain the existing sample draft label', () => {
  const page=readFileSync(new URL('../src/pages/writing/[slug].astro',import.meta.url),'utf8');
  assert.match(page, /!item\.publishedAt[^\n]*sampleDraft/);
  const home=readFileSync(new URL('../src/pages/index.astro',import.meta.url),'utf8');
  assert.doesNotMatch(home, /sampleDraft|sample draft/i);
});
