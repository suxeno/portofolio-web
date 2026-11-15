import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFile} from 'node:fs/promises';

test('public routes use request-scoped content rather than virtual build snapshots', async () => {
  for (const path of ['src/pages/index.astro', 'src/pages/writing/index.astro', 'src/pages/writing/[slug].astro']) {
    const source = await readFile(path, 'utf8');
    assert.match(source, /loadRequestContent/);
    assert.doesNotMatch(source, /virtual:cms-/);
  }
});
