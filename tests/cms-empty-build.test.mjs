import {test} from 'node:test';
import assert from 'node:assert/strict';
import {baselineSeed} from './helpers/baseline-seed.mjs';
import {createSsrFixture} from './helpers/ssr-fixture.mjs';

// TEST ONLY: synthetic published snapshot, with a draft deliberately returned
// by transport as a defense-in-depth check against accidental draft leakage.
test('configured runtime renders an intentionally empty published writing collection', {timeout: 180000}, async () => {
  const docs = baselineSeed().filter(doc => doc._type !== 'writing');
  docs.push({_id:'drafts.test-hidden', _type:'writing', title:'TEST DRAFT MUST NOT APPEAR', slug:{current:'test-hidden'}});
  let calls = 0;
  const fixture = await createSsrFixture({cms: {projectId:'synthetic', dataset:'test'}, outbound: async request => {
    const url = new URL(request.url);
    assert.equal(url.origin, 'https://synthetic.apicdn.sanity.io');
    assert.equal(url.pathname, '/v2025-02-19/data/query/test');
    assert.equal(url.searchParams.get('perspective'), 'published');
    calls++;
    return new Response(JSON.stringify({result: docs}), {headers:{'content-type':'application/json'}});
  }});
  try {
    const home = await fixture.html('/');
    const archive = await fixture.html('/writing/');
    for (const text of ['reliable-pipelines','model-monitoring','data-systems','On building reliable pipelines','Learning from model monitoring','SAMPLE DRAFT','TEST DRAFT MUST NOT APPEAR','test-hidden']) {
      assert.ok(!archive.includes(text), `archive leaked ${text}`);
      assert.ok(!home.includes(text), `home leaked ${text}`);
    }
    for (const slug of ['reliable-pipelines','model-monitoring','data-systems','test-hidden']) {
      const response = await fixture.fetch(`/writing/${slug}/`);
      assert.equal(response.status, 404, slug);
      assert.doesNotMatch(await response.text(), /TEST DRAFT MUST NOT APPEAR/);
    }
    assert.ok(calls >= 2, 'configured requests must use synthetic Sanity transport');
  } finally { await fixture.dispose(); }
});
