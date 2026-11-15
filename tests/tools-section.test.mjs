import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createSsrFixture } from './helpers/ssr-fixture.mjs';

let fixture;
before(async () => { fixture = await createSsrFixture(); });
after(async () => { if (fixture) await fixture.dispose(); });

test('tools section has three semantic rows and a reduced motion fallback', async () => {
  const html = await fixture.html('/');
  assert.match(html, /Tools I’ve worked with/);
  assert.equal((html.match(/class="tools-row"/g) || []).length, 3);
  assert.match(html, /aria-hidden="true" class="tools-copy"/);
  const css = readFileSync('src/components/ToolsSection.astro', 'utf8');
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /title-paused/);
});
