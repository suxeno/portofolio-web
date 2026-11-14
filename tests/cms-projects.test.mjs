import {test} from 'node:test';
import assert from 'node:assert/strict';
import {adaptProjects} from '../src/cms/projects-adapter.mjs';
const config={projectId:'synthetic',dataset:'production'};
const project=(id,extra={})=>({_id:id,_type:'project',title:id,description:'TEST description',repository:'https://example.com/repo',...extra});
test('projects are ordered, filtered and converted to slider data',()=>{
 const result=adaptProjects([project('b',{order:2}),project('a',{order:1}),project('hidden',{visible:false}),project('drafts.secret')],config);
 assert.deepEqual(result.map(x=>x.title),['a','b']);
 assert.equal(result[0].href,'https://example.com/repo');
});
test('projects reject missing title, unsafe links and malformed assets',()=>{
 assert.throws(()=>adaptProjects([project('a',{title:''})],config));
 assert.throws(()=>adaptProjects([project('a',{repository:'javascript:alert(1)'})],config));
 assert.throws(()=>adaptProjects([project('a',{cover:{asset:{_ref:'evil'},alt:'x'}})],config));
});
