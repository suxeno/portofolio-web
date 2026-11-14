import {test} from 'node:test';
import assert from 'node:assert/strict';
import {offlineValidationClient} from './helpers/cms-offline-client.mjs';

test('offline validation client allows only explicitly mocked reads and rejects all network operations', async () => {
  const client = offlineValidationClient();
  assert.equal(await client.fetch('*', {}, {tag:'validation.slug-is-unique'}), true);
  assert.equal(await client.fetch('*', {}, {tag:'validation.asset-accept'}), null);
  assert.equal(client.withConfig({}), client);
  assert.throws(() => client.mutate([]), /offline/);
  assert.throws(() => client.request({url:'/data'}), /offline/);
  assert.throws(() => client.assets.upload('image', 'x'), /offline/);
  assert.throws(() => client.observable.fetch('*'), /offline/);
  await assert.rejects(client.fetch('*'), /offline/);
});
