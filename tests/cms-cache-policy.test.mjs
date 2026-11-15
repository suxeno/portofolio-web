import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cacheEligible} from '../src/cms/cache-policy.mjs';

test('only anonymous canonical public page GET requests are cache eligible', () => {
  for (const path of ['/', '/writing/', '/writing/example-slug/']) assert.equal(cacheEligible(new Request(`https://example.test${path}`)), true, path);
  for (const path of ['/admin/', '/admin', '/_astro/foo.js', '/writing/example/?x=1', '/writing/a/b/', '/other/', '/writing/%2f/']) assert.equal(cacheEligible(new Request(`https://example.test${path}`)), false, path);
  for (const headers of [{cookie:'session=x'}, {authorization:'Bearer x'}, {'cache-control':'no-cache'}, {range:'bytes=0-1'}]) assert.equal(cacheEligible(new Request('https://example.test/', {headers})), false);
  assert.equal(cacheEligible(new Request('https://example.test/', {method:'POST'})), false);
});
