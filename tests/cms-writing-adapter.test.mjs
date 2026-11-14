import test from 'node:test';
import assert from 'node:assert/strict';
import {adaptWriting} from '../src/cms/writing-adapter.mjs';

const config = {projectId:'example',dataset:'production'};
test('TEST ONLY writing assets become safe geometry and drafts do not become pages', () => {
 const records = [{_id:'writing.a',_type:'writing',title:'One',slug:{current:'one'},body:[{_type:'bodyImage',asset:{_ref:'image-abcdef-400x300-png'},alt:'Meaningful'}]}, {_id:'drafts.writing.b',_type:'writing',title:'Draft',slug:{current:'draft'}}];
 const result=adaptWriting(records,config);
 assert.equal(result.length,1);
 assert.equal(result[0].body[0].url,'https://cdn.sanity.io/images/example/production/abcdef-400x300.png');
 assert.equal(result[0].body[0].width,400);
});
test('rejects invalid image references and malformed published bodies', () => {
 for (const body of [[{_type:'bodyImage',asset:{_ref:'image-../-1x1-png'},alt:'bad'}], 'bad']) {
  assert.throws(()=>adaptWriting([{_id:'a',_type:'writing',title:'A',slug:{current:'a'},body}],config));
 }
});
