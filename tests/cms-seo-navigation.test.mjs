import {test} from 'node:test';
import assert from 'node:assert/strict';
import {adaptSite} from '../src/cms/site-adapter.mjs';
import {adaptWriting} from '../src/cms/writing-adapter.mjs';
import {validProjectLink} from '../src/cms/schema.mjs';
const config={projectId:'synthetic',dataset:'test',siteOrigin:'https://portfolio.example'};
const image={asset:{_ref:'image-abcdef-400x300-png'},alt:'Social image'};
const settings={_type:'siteSettings',title:'Site',description:'Site description',wordmark:'Wordmark',contactQuestion:'Question',contactAction:'Contact',navigation:[{label:'Hidden',url:'https://portfolio.example/#projects'},{label:'External',url:'https://elsewhere.example/#projects'}],footerNavigation:[],footerBackToTop:'Top',terminalReadme:'Readme',sections:[{id:'projects',visible:false}],writingUi:Object.fromEntries(['archiveTitle','backToPortfolio','backToWritings','sampleDraft','dummyCover','readArticle','seeAllWritings','titleSuffix'].map(k=>[k,k])),socialImage:image};
const profile={_type:'profile',displayName:'Name',expertiseLine:'Role',biography:'Bio',email:'a@example.com',links:[]};
test('site social image and same-origin hidden navigation are projected',()=>{const site=adaptSite([settings,profile],config); assert.equal(site.settings.socialImage.url,'https://cdn.sanity.io/images/synthetic/test/abcdef-400x300.png'); assert.deepEqual(site.settings.navigation.map(x=>x.label),['External']);});
test('writing SEO is validated and projected',()=>{const record={_id:'writing.test',_type:'writing',title:'Article',slug:{current:'article'},body:[],seo:{title:'Override',description:'Description',socialImage:image}}; const item=adaptWriting([record],config)[0];assert.equal(item.seo.title,'Override'); assert.equal(item.seo.socialImage.width,400);assert.throws(()=>adaptWriting([{...record,seo:{title:'x'.repeat(201)}}],config),/SEO/);assert.throws(()=>adaptSite([{...settings,socialImage:{asset:{_ref:'image-abc-0x3-png'},alt:'x'}},profile],config),/image/i);});
test('project schema requires a safe link, accepting repository or first link',()=>{assert.equal(validProjectLink({repository:'https://example.com'}),true);assert.equal(validProjectLink({links:[{url:'/project'}]}),true);assert.notEqual(validProjectLink({}),true);assert.notEqual(validProjectLink({repository:'javascript:alert(1)'}),true);});
test('blank optional article SEO values fall back rather than failing the build',()=>{
 const item=adaptWriting([{_id:'writing.test',_type:'writing',title:'Article',slug:{current:'article'},body:[],seo:{title:'   ',description:''}}],config)[0];
 assert.equal(item.seo.title,undefined);
 assert.equal(item.seo.description,undefined);
});
test('profile links to hidden local sections are filtered just like navigation',()=>{
 const result=adaptSite([settings,{...profile,links:[{label:'Hidden profile link',url:'/#projects'},{label:'External',url:'https://elsewhere.example/#projects'}]}],config);
 assert.deepEqual(result.profile.links.map(link=>link.label),['External']);
});
