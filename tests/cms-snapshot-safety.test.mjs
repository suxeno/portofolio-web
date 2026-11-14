import test from 'node:test';
import assert from 'node:assert/strict';
import {loadPublishedSnapshot} from '../src/cms/snapshot.mjs';
const config = {projectId:'example',dataset:'production'};
const run = result => loadPublishedSnapshot(config, async () => ({ok:true,json:async()=>({result})}));
test('rejects unsafe published link and inaccessible image', async () => {
  await assert.rejects(run([{_id:'p',_type:'project',repository:'javascript:alert(1)'}]));
  await assert.rejects(run([{_id:'w',_type:'writing',title:'Title',slug:{current:'title'},cover:{_type:'image',asset:{_ref:'image-123'},alt:''}}]));
});
test('rejects invalid partial date and tool row', async () => {
  await assert.rejects(run([{_id:'e',_type:'experience',startDate:'2025-14'}]));
  await assert.rejects(run([{_id:'t',_type:'tool',row:4}]));
});
