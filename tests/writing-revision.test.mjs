import { test } from 'node:test';
import assert from 'node:assert/strict';
import { orderedWriting, latestWriting } from '../src/writing-order.mjs';
import { mkdir, mkdtemp, cp, symlink, appendFile, readFile, rm, access } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';
test('recent preview caps at three and archive retains all records deterministically', () => {
  const data = [{slug:'draft-a',publishedAt:null},{slug:'old',publishedAt:'2024-01-01'},{slug:'new',publishedAt:'2025-01-01'},{slug:'draft-b',publishedAt:null},{slug:'same',publishedAt:'2025-01-01'}];
  assert.deepEqual(orderedWriting(data).map(x=>x.slug), ['new','same','old','draft-a','draft-b']);
  assert.deepEqual(latestWriting(data).map(x=>x.slug), ['new','same','old']);
  assert.deepEqual(orderedWriting(data).map(x=>x.slug).sort(), data.map(x=>x.slug).sort());
});

test('five source records generate only three home rows and five reachable archive pages', async () => {
  const root=process.cwd();
  await mkdir(join(root,'.art-evidence'),{recursive:true});
  const fixture=await mkdtemp(join(root,'.art-evidence','writing-fixture-'));
  try {
    for (const file of ['src','public','astro.config.mjs','package.json','tsconfig.json']) await cp(join(root,file),join(fixture,file),{recursive:true});
    await symlink(join(root,'node_modules'),join(fixture,'node_modules'));
    await appendFile(join(fixture,'src/content.ts'), `\nwriting.push({title:'Fixture Four',slug:'fixture-four',excerpt:'Fixture',cover:null,publishedAt:'2025-01-01',body:['Fixture']},{title:'Fixture Five',slug:'fixture-five',excerpt:'Fixture',cover:null,publishedAt:'2026-01-01',body:['Fixture']});\n`);
    await promisify(execFile)(process.execPath,[join(root,'node_modules/.bin/astro'),'build'],{cwd:fixture,timeout:120000});
    const home=await readFile(join(fixture,'dist/index.html'),'utf8');
    const archive=await readFile(join(fixture,'dist/writing/index.html'),'utf8');
    assert.equal((home.match(/class="writing-link"/g)||[]).length,3);
    assert.ok(home.indexOf('Fixture Five') < home.indexOf('Fixture Four'));
    for (const slug of ['reliable-pipelines','model-monitoring','data-systems','fixture-four','fixture-five']) {
      assert.ok(archive.includes(`/writing/${slug}/`),slug);
      await access(join(fixture,'dist/writing',slug,'index.html'));
    }
  } finally { await rm(fixture,{recursive:true,force:true}); }
});
