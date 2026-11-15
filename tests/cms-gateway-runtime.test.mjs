import {test} from 'node:test';
import assert from 'node:assert/strict';
import {baselineSeed} from './helpers/baseline-seed.mjs';
import {createSsrFixture} from './helpers/ssr-fixture.mjs';

test('real SSR gateway applies cache headers and fails closed', {timeout: 180000}, async () => {
  const docs = baselineSeed();
  let fail = false;
  const fixture = await createSsrFixture({cms:{projectId:'synthetic',dataset:'test'}, outbound: async () => fail
    ? new Response('synthetic upstream failure', {status: 503})
    : new Response(JSON.stringify({result:docs}), {headers:{'content-type':'application/json'}})});
  try {
    for (const path of ['/', '/writing/', '/writing/reliable-pipelines/']) {
      const response = await fixture.fetch(path);
      assert.equal(response.status, 200, path);
      assert.equal(response.headers.get('cache-control'), 'public, max-age=0', path);
      assert.equal(response.headers.get('cdn-cache-control'), 'public, max-age=60', path);
      assert.match(response.headers.get('x-portfolio-render') || '', /^[0-9a-f-]{36}$/);
    }
    for (const [path, init] of [
      ['/', {headers:{cookie:'test=1'}}], ['/', {headers:{authorization:'Bearer synthetic'}}],
      ['/?preview=1', {}], ['/', {headers:{'cache-control':'no-cache'}}],
      ['/', {headers:{pragma:'no-cache'}}], ['/', {method:'HEAD'}],
    ]) {
      const response = await fixture.fetch(path, init);
      assert.equal(response.headers.get('cache-control'), 'no-store', `${path} ${JSON.stringify(init)}`);
      assert.equal(response.headers.get('cdn-cache-control'), null);
    }
    const missing = await fixture.fetch('/writing/not-found/');
    assert.equal(missing.status,404);
    assert.equal(missing.headers.get('cache-control'),'no-store');
    assert.equal(missing.headers.get('cdn-cache-control'),null);
    fail = true;
    const error = await fixture.fetch('/?force-upstream=1');
    assert.ok(error.status >= 500, `failed upstream returned ${error.status}`);
    assert.equal(error.headers.get('cache-control'),'no-store');
    assert.equal(error.headers.get('cdn-cache-control'),null);
    assert.doesNotMatch(await error.text(), /On building reliable pipelines/);
  } finally { await fixture.dispose(); }
});
