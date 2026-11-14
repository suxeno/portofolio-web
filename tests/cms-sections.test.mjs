import {test} from 'node:test';
import assert from 'node:assert/strict';
import {adaptSections} from '../src/cms/site-adapter.mjs';

test('section configuration sorts and hides while preserving omitted defaults',()=>{
 const sections=adaptSections([{id:'experience',order:-1,heading:'TEST Career'},{id:'projects',visible:false}]);
 assert.equal(sections[0].id,'experience');
 assert.equal(sections[0].heading,'TEST Career');
 assert.equal(sections.find(s=>s.id==='projects').visible,false);
 assert.equal(sections.length,7);
});
test('rejects unknown, duplicate and all hidden sections',()=>{
 assert.throws(()=>adaptSections([{id:'unknown'}]));
 assert.throws(()=>adaptSections([{id:'writing'},{id:'writing'}]));
 assert.throws(()=>adaptSections(['writing','projects','tools','experience','achievements','certificates','contact'].map(id=>({id,visible:false}))));
});
