import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Astro owns the static home page', async () => {
  const page = await readFile(new URL('../src/pages/index.astro', import.meta.url), 'utf8').catch(() => '');
  assert.match(page, /<main\b/, 'Astro must render the semantic main document');
});

test('the terminal is a selectively hydrated Vue island', async () => {
  const page = await readFile(new URL('../src/pages/index.astro', import.meta.url), 'utf8');
  assert.match(page, /<Terminal\s+client:load\s*\/>/);
});

test('section records come from centralized typed data', async () => {
  const data = await readFile(new URL('../src/content.ts', import.meta.url), 'utf8').catch(() => '');
  for (const name of ['writing', 'projects', 'experience', 'achievements']) assert.match(data, new RegExp(`export const ${name}\\b`));
});

test('Astro sections render centralized data', async () => {
  const page = await readFile(new URL('../src/pages/index.astro', import.meta.url), 'utf8');
  assert.match(page, /from ['"]\.\.\/content['"]/);
  assert.match(page, /projects\.map/);
});

test('scroll choreography uses GSAP ScrollTrigger rather than WAAPI', async () => {
  const motion = await readFile(new URL('../src/motion.ts', import.meta.url), 'utf8').catch(() => '');
  assert.match(motion, /ScrollTrigger/);
  assert.doesNotMatch(motion, /\.animate\(/);
});
