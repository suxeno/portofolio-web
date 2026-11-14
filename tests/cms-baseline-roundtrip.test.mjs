import {baselineSeed} from './helpers/baseline-seed.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSchema} from 'sanity';
import {validateDocumentWithWorkspace} from '@sanity/validation';
import {offlineValidationClient} from './helpers/cms-offline-client.mjs';
import {schemaTypes} from '../src/cms/schema.mjs';
import {loadPublishedSnapshot} from '../src/cms/snapshot.mjs';
import {adaptWriting} from '../src/cms/writing-adapter.mjs';
import {adaptSite} from '../src/cms/site-adapter.mjs';
import {adaptProjects} from '../src/cms/projects-adapter.mjs';
import {adaptCareer} from '../src/cms/career-adapter.mjs';
import {adaptCollections} from '../src/cms/tools-certificates-adapter.mjs';
import {createMissing} from '../src/cms/seed-import.mjs';

const docs=baselineSeed();
const config={projectId:'synthetic',dataset:'test',siteOrigin:'https://portofolio.arvinantobahtiar.workers.dev'};
test('every baseline record passes real compiled Studio validation offline',async()=>{
 const schema=createSchema({name:'test',types:schemaTypes}),client=offlineValidationClient();
 const errors=[];
 for(const document of docs){const markers=await validateDocumentWithWorkspace({document,workspace:{schema,getClient:()=>client},validateReferenceTypes:false,getDocumentExists:async()=>true}); errors.push(...markers.filter(m=>m.level==='error').map(m=>({id:document._id,message:m.message,path:m.path})));}
 assert.deepEqual(errors,[]);
});
test('baseline passes published snapshot and every adapter',async()=>{
 const records=await loadPublishedSnapshot(config,async()=>({ok:true,json:async()=>({result:docs})}));
 assert.equal(records.length,37);
 for (const doc of records.filter(d=>d._type==='siteSettings')) for (const field of ['navigation','footerNavigation','sections']) assert.ok(doc[field].every(item=>item._type === (field==='sections'?'section':'link')),field);
 assert.ok(records.find(d=>d._type==='profile').links.every(item=>item._type==='link'));
 assert.equal(adaptWriting(records,config).length,3);
 assert.ok(adaptSite(records,config)); assert.equal(adaptProjects(records,config).length,3);
 const career=adaptCareer(records); assert.equal(career.experience.length,4); assert.equal(career.achievements.length,4);
 const collections=adaptCollections(records,config); assert.equal(collections.rows.flat().length,18); assert.equal(collections.credentials.length,3);
});
test('baseline create-if-absent preserves editor change across two imports',async()=>{
 const store=new Map();let created=0,skipped=0;
 const transport={createIfNotExists:async doc=>{if(store.has(doc._id)) skipped++; else {store.set(doc._id,structuredClone(doc));created++;}}};
 await createMissing(docs,transport); store.get('profile').displayName='EDITOR CHANGE'; await createMissing(docs,transport);
 assert.equal(created,37);assert.equal(skipped,37);assert.equal(store.get('profile').displayName,'EDITOR CHANGE');
});
