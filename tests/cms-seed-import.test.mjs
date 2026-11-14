import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createMissing} from '../src/cms/seed-import.mjs';

test('create-if-absent import is idempotent and never overwrites editor changes', async () => {
 const store = new Map([['profile',{_id:'profile',name:'Edited'}]]);
 const transport = {createIfNotExists: async doc => { if (!store.has(doc._id)) store.set(doc._id, structuredClone(doc)); }};
 const docs = [{_id:'profile',name:'Original'},{_id:'writing--one',name:'Article'}];
 await createMissing(docs,transport); await createMissing(docs,transport);
 assert.deepEqual([...store.values()], [{_id:'profile',name:'Edited'},{_id:'writing--one',name:'Article'}]);
});
test('rejects duplicate or draft IDs before invoking transport', async () => {
 let calls=0; const transport={createIfNotExists:async()=>{calls++;}};
 for (const docs of [[{_id:'x'},{_id:'x'}],[{_id:'drafts.x'}],[{_id:'writing.one'}],[{_id:'versions.release.x'}],[{_id:'bad id'}]]) {
  await assert.rejects(createMissing(docs,transport));
 }
 assert.equal(calls,0);
});
