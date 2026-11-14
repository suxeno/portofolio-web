import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSchema} from 'sanity';
import {validateDocumentWithWorkspace} from '@sanity/validation';
import {offlineValidationClient} from './helpers/cms-offline-client.mjs';
import {schemaTypes} from '../src/cms/schema.mjs';

const schema=createSchema({name:'test',types:schemaTypes});
// Synthetic client rejects all non-allowlisted operations, without a real network client.
const client=offlineValidationClient();
async function markers(document) {
  const result=await validateDocumentWithWorkspace({document,workspace:{schema,getClient:()=>client},validateReferenceTypes:false,getDocumentExists:async()=>true});
  return result.filter(m=>m.level==='error');
}
const profile={_id:'drafts.profile',_type:'profile',displayName:'Name',expertiseLine:'Expert',biography:'Biography',email:'a@example.com',links:[]};
test('compiled schema validates required profile links for drafts',async()=>{
  assert.deepEqual(await markers(profile),[]);
  assert.ok((await markers({...profile,links:undefined})).length);
});
test('compiled schema validates navigation and section rules',async()=>{
 const ui=Object.fromEntries(['archiveTitle','backToPortfolio','backToWritings','sampleDraft','dummyCover','readArticle','seeAllWritings','titleSuffix'].map(k=>[k,'text']));
 const doc={_id:'drafts.site',_type:'siteSettings',title:'Title',description:'Description',wordmark:'Name',footerBackToTop:'Top',writingUi:ui,navigation:[],footerNavigation:[],contactQuestion:'Question',contactAction:'Action',terminalReadme:'Readme'};
 assert.deepEqual(await markers(doc),[]);
 for(const bad of [{navigation:undefined},{navigation:Array.from({length:21},(_,i)=>({_key:String(i),_type:'link',label:'ok',url:'#top'}))},{navigation:[{_key:'a',_type:'link',label:' ',url:'#top'}]},{navigation:[{_key:'a',_type:'link',label:'ok',url:'#unknown'}]},{sections:[{_key:'a',_type:'section',id:'writing',order:1.5}]},{sections:[{_key:'a',_type:'section',id:'writing',intro:' '.repeat(4001)}]},{sections:['writing','projects','tools','experience','achievements','certificates','contact'].map(id=>({_key:id,_type:'section',id,visible:false}))}]) assert.ok((await markers({...doc,...bad})).length,JSON.stringify(bad));
});
test('compiled schema checks writing drafts through actual renderer',async()=>{
 const doc={_id:'drafts.article',_type:'writing',title:'Title',slug:{_type:'slug',current:'title'},body:[{_key:'one',_type:'block',style:'normal',children:[{_key:'span',_type:'span',text:'text',marks:[]}],markDefs:[]}]};
 assert.deepEqual(await markers(doc),[]);
 for(const bad of [{body:[{_key:'bad',_type:'codeBlock',code:'x',language:'bad value'}]},{slug:{_type:'slug',current:'Bad Slug'}},{order:Number.MAX_SAFE_INTEGER+1},{publishedAt:'not-a-date'},{cover:{_type:'image',asset:{_type:'reference',_ref:'image-bad'},alt:'alt'}}]) assert.ok((await markers({...doc,...bad})).length,JSON.stringify(bad));
});
test('compiled schema validates each remaining domain and PDF assets',async()=>{
 const docs=[
  [{_id:'drafts.project',_type:'project',title:'P',description:'D',repository:'https://example.com'}, {description:' '}],
  [{_id:'drafts.exp',_type:'experience',role:'R',organization:'O',displayDate:'2025'}, {role:''}],
  [{_id:'drafts.achievement',_type:'achievement',title:'Award'}, {title:''}],
  [{_id:'drafts.tool',_type:'tool',name:'Tool',accessibleLabel:'Tool',localLogo:'python',row:1}, {row:4}],
  [{_id:'drafts.cert',_type:'certificate',title:'Cert',issuer:'Issuer',displayDate:'2025',verificationUrl:'https://example.com',image:{_type:'image',asset:{_type:'reference',_ref:'image-abcdef1234567890abcdef1234567890abcdef12-800x600-png'},alt:'Synthetic certificate'},originalFile:{_type:'file',asset:{_type:'reference',_ref:'file-abcdef1234567890abcdef1234567890abcdef12-pdf'}}}, {originalFile:{_type:'file',asset:{_type:'reference',_ref:'file-bad-pdf'}}}],
 ];
 for(const [doc,bad] of docs) {assert.deepEqual(await markers(doc),[],doc._type); assert.ok((await markers({...doc,...bad})).length,doc._type);}
});
