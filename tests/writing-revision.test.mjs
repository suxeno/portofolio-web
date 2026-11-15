import { test } from 'node:test';
import assert from 'node:assert/strict';
import { orderedWriting, latestWriting } from '../src/writing-order.mjs';
import { mkdtemp, cp, symlink, appendFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createSsrFixture } from './helpers/ssr-fixture.mjs';

test('recent preview caps at three and archive retains all records deterministically', () => {
  const data = [{slug:'draft-a',publishedAt:null},{slug:'old',publishedAt:'2024-01-01'},{slug:'new',publishedAt:'2025-01-01'},{slug:'draft-b',publishedAt:null},{slug:'same',publishedAt:'2025-01-01'}];
  assert.deepEqual(orderedWriting(data).map(x=>x.slug), ['new','same','old','draft-a','draft-b']);
  assert.deepEqual(latestWriting(data).map(x=>x.slug), ['new','same','old']);
  assert.deepEqual(orderedWriting(data).map(x=>x.slug).sort(), data.map(x=>x.slug).sort());
});

test('five source records generate only three home rows and five reachable archive pages', async () => {
  const root = process.cwd();
  const project = await mkdtemp(join(tmpdir(), 'portfolio-writing-source-'));
  let fixture;
  try {
    for (const file of ['src','public','astro.config.mjs','package.json','tsconfig.json','wrangler.jsonc']) await cp(join(root,file),join(project,file),{recursive:true});
    await symlink(join(root,'node_modules'),join(project,'node_modules'));
    await appendFile(join(project,'src/content.ts'), `\nwriting.push({title:'Fixture Four',slug:'fixture-four',excerpt:'Fixture',cover:null,publishedAt:'2025-01-01',body:['Fixture']},{title:'Fixture Five',slug:'fixture-five',excerpt:'Fixture',cover:null,publishedAt:'2026-01-01',body:['Fixture']});\n`);
    fixture = await createSsrFixture({root: project});
    const home = await fixture.html('/');
    const archive = await fixture.html('/writing/');
    assert.equal((home.match(/class="writing-link"/g)||[]).length,3);
    assert.ok(home.includes('Fixture Five') && home.includes('Fixture Four'));
    assert.ok(home.indexOf('Fixture Five') < home.indexOf('Fixture Four'));
    for (const [slug, title, text] of [
      ['reliable-pipelines', 'On building reliable pipelines', 'Sample draft: notes on building reliable data pipelines.'],
      ['model-monitoring', 'Learning from model monitoring', 'Sample draft: notes on monitoring models in production.'],
      ['data-systems', 'Notes on data systems', 'Sample draft: notes on the decisions behind data systems.'],
      ['fixture-four', 'Fixture Four', 'Fixture'], ['fixture-five', 'Fixture Five', 'Fixture'],
    ]) {
      assert.ok(archive.includes(`/writing/${slug}/`),slug);
      const response = await fixture.fetch(`/writing/${slug}/`);
      assert.equal(response.status, 200, slug);
      const body = await response.text();
      assert.match(body, /<title>/);
      assert.ok(body.includes(title), `${slug}: missing title`);
      assert.ok(body.includes(text), `${slug}: missing body`);
    }
  } finally {
    try { if (fixture) await fixture.dispose(); } finally { await rm(project,{recursive:true,force:true}); }
  }
});
