import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const between = (text, start, end) => text.split(start)[1].split(end)[0];
test('baseline source record inventory has expected counts', () => {
  const content = read('src/content.ts');
  const count = (start,end,pattern) => [...between(content,start,end).matchAll(pattern)].length;
  assert.equal(count('export const writing:', 'export const projects:', /\{ title:/g), 3);
  assert.equal(count('export const projects:', 'export const experience:', /\{ title:/g), 3);
  assert.equal(count('export const experience:', 'export const achievements:', /\{ date:/g), 4);
  assert.equal([...content.matchAll(/^  '\d{4}/gm)].length, 4);
  assert.equal([...read('src/components/ToolsSection.astro').matchAll(/\['[^']+','[^']+'\]/g)].length,18);
  assert.equal([...read('src/components/CertificatesSection.astro').matchAll(/^  \{ title:/gm)].length,3);
});
