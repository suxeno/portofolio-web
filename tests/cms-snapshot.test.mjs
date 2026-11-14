import test from 'node:test';
import assert from 'node:assert/strict';
import {loadPublishedSnapshot} from '../src/cms/snapshot.mjs';

const config = {projectId: 'example', dataset: 'production'};
test('fetches a single published, non-CDN snapshot and filters drafts', async () => {
  let calls = 0;
  const result = await loadPublishedSnapshot(config, async (url) => {
    calls++;
    const parsed = new URL(url);
    assert.equal(parsed.hostname, 'example.api.sanity.io');
    assert.equal(parsed.searchParams.get('perspective'), 'published');
    return {ok:true, json:async () => ({result:[{_id:'writing.one',_type:'writing',title:'One',slug:{current:'one'}},{_id:'drafts.writing.two',_type:'writing',title:'Secret',slug:{current:'two'}}]})};
  });
  assert.equal(calls, 1);
  assert.deepEqual(result.map(x => x._id), ['writing.one']);
});
test('rejects invalid published slugs and duplicate ids', async () => {
  for (const result of [[{_id:'one',_type:'writing',title:'One',slug:{current:'../oops'}}], [{_id:'one',_type:'project'},{_id:'one',_type:'project'}]]) {
    await assert.rejects(loadPublishedSnapshot(config, async () => ({ok:true,json:async()=>({result})})));
  }
});
test('fails closed when the API fails', async () => {
  await assert.rejects(loadPublishedSnapshot(config, async () => ({ok:false,status:503})));
});
