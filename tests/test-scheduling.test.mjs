import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('normal test entrypoint bounds parallel fixture builds', () => {
  const {scripts} = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)));
  assert.match(scripts.test, /node --test --test-concurrency=2 tests\/\*\.test\.mjs/);
});
