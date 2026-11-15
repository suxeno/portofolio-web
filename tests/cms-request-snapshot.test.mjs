import {test} from 'node:test';
import assert from 'node:assert/strict';
import {baselineSeed} from './helpers/baseline-seed.mjs';
import {loadRequestContent} from '../src/cms/request-content.mjs';

const config = {projectId:'synthetic',dataset:'test'};
const docs = baselineSeed();

test('each request projects one fresh published CDN snapshot through every adapter', async () => {
  let calls = 0;
  let current = structuredClone(docs);
  const transport = async (url, options) => {
    calls++;
    assert.equal(new URL(url).hostname, 'synthetic.apicdn.sanity.io');
    assert.equal(new URL(url).searchParams.get('perspective'), 'published');
    assert.ok(options.signal);
    return new Response(JSON.stringify({result:current}), {status:200});
  };
  const first = await loadRequestContent(config, {transport});
  current = structuredClone(docs);
  current.find(d => d._type === 'profile').biography = 'Changed biography';
  const second = await loadRequestContent(config, {transport});
  assert.equal(calls, 2);
  assert.notEqual(first.site.profile.biography, second.site.profile.biography);
  assert.equal(second.site.profile.biography, 'Changed biography');
  assert.equal(second.writing.length, 3);
  assert.equal(second.projects.length, 3);
  assert.equal(second.career.experience.length, 4);
  assert.equal(second.collections.rows.flat().length, 18);
});

test('unavailable and malformed upstream never produce projected content', async () => {
  await assert.rejects(loadRequestContent(config, {transport: async () => new Response('', {status:429})}), /429/);
  const invalid = structuredClone(docs);
  invalid.find(d => d._type === 'profile').biography = '';
  await assert.rejects(loadRequestContent(config, {transport: async () => new Response(JSON.stringify({result:invalid}))}));
});

test('transport receives timeout signal and can abort', async () => {
  const transport = async (_url, {signal}) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason), {once:true});
    // Keep the test process alive while AbortSignal's unref timer is pending.
    setTimeout(() => reject(new Error('timeout signal not delivered')), 200);
  });
  await assert.rejects(loadRequestContent(config, {transport, timeoutMs:10}), {name:'TimeoutError'});
});
