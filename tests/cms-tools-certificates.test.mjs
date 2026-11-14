import {test} from 'node:test';
import assert from 'node:assert/strict';
import {adaptCollections} from '../src/cms/tools-certificates-adapter.mjs';
const config={projectId:'synthetic',dataset:'production'};
const img={asset:{_ref:'image-abcdef-400x300-png'},alt:'TEST alt'};
const tool=(id,row,order=0)=>({_id:id,_type:'tool',name:id,accessibleLabel:id,row,order,logo:img});
const cert=(id,order=0)=>({_id:id,_type:'certificate',title:id,issuer:'TEST issuer',displayDate:'Issued 2025',verificationUrl:'https://example.com',order});
test('projects visible tools into ordered rows and certificates into safe frames',()=>{
 const result=adaptCollections([tool('b',1,2),tool('a',1,1),tool('hidden',2),{...tool('drafts.secret',3)},cert('z',2),{...cert('a',1),image:img},{...cert('hidden',0),visible:false}].map(x=>x._id==='hidden'&&x._type==='tool'?{...x,visible:false}:x),config);
 assert.deepEqual(result.rows.map(r=>r.map(x=>x.name)),[['a','b'],[],[]]);
 assert.deepEqual(result.credentials.map(x=>x.title),['a','z']);
 assert.equal(result.credentials[0].image.alt,'TEST alt');
 assert.match(result.rows[0][0].src,/cdn\.sanity\.io\/images\/synthetic\/production/);
});
test('rejects invalid rows, images, URLs, and order',()=>{
 for(const record of [{...tool('a',4)}, {...tool('a',1),logo:{asset:{_ref:'image-a-1x1-svg'},alt:'x'}}, {...cert('a'),verificationUrl:'javascript:alert(1)'}, {...cert('a'),order:1.5}]) assert.throws(()=>adaptCollections([record],config));
});
test('renders genuine PDF as an original file link',()=>{
 const result=adaptCollections([{...cert('pdf'),originalFile:{asset:{_ref:'file-027401f31c3ac1e6d78c5d539ccd1beff72b9b11-pdf'}}}],config);
 assert.equal(result.credentials[0].file,'https://cdn.sanity.io/files/synthetic/production/027401f31c3ac1e6d78c5d539ccd1beff72b9b11.pdf');
 assert.throws(()=>adaptCollections([{...cert('bad'),originalFile:{asset:{_ref:'file-abcd-html'}}}],config));
 assert.throws(()=>adaptCollections([{...cert('bad'),originalFile:{asset:{_ref:'file-abcdef-pdf'}}}],config));
});
test('empty collections remain empty',()=>assert.deepEqual(adaptCollections([],config),{rows:[[],[],[]],credentials:[]}));
test('curated local logos resolve only exact approved identifiers and require one source',()=>{
 const local={...tool('python',1),logo:undefined,localLogo:'python'};
 assert.equal(adaptCollections([local],config).rows[0][0].src,'/logos/python.svg');
 for(const bad of ['../python','/logos/python.svg','evil','Python']) assert.throws(()=>adaptCollections([{...local,localLogo:bad}],config));
 assert.throws(()=>adaptCollections([{...local,logo:img}],config));
 assert.throws(()=>adaptCollections([{...local,localLogo:undefined}],config));
});
