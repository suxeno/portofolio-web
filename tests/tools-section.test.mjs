import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('tools section has three semantic rows and a reduced motion fallback', () => {
  const html = readFileSync('dist/index.html', 'utf8');
  assert.match(html, /Tools I’ve worked with/);
  assert.equal((html.match(/class="tools-row"/g) || []).length, 3);
  assert.match(html, /aria-hidden="true" class="tools-copy"/);
  const css = readFileSync('src/components/ToolsSection.astro', 'utf8');
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /title-paused/);
});
