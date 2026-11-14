import {test} from 'node:test';
import assert from 'node:assert/strict';
import {adaptSite} from '../src/cms/site-adapter.mjs';
const records = [
 {_id:'siteSettings',_type:'siteSettings',title:'TEST SEO',description:'TEST description',wordmark:'TEST WORDMARK',contactQuestion:'TEST question',contactAction:'TEST contact',navigation:[{label:'TEST Writing',url:'#writing'}],footerNavigation:[{label:'TEST Footer',url:'#writing'}],footerBackToTop:'TEST top',terminalReadme:'TEST README',writingUi:{archiveTitle:'TEST Archive',backToPortfolio:'TEST back',backToWritings:'TEST article back',sampleDraft:'TEST draft',dummyCover:'TEST cover',readArticle:'TEST read',seeAllWritings:'TEST all',titleSuffix:'TEST suffix'}},
 {_id:'profile',_type:'profile',displayName:'TEST Person',expertiseLine:'TEST expertise',biography:'TEST bio',email:'test@example.com',links:[{label:'TEST Social',url:'https://example.com'}]}
];
test('published settings and profile map to sanitized site data',()=>{
 const site=adaptSite(records); assert.equal(site.profile.displayName,'TEST Person'); assert.equal(site.settings.navigation[0].label,'TEST Writing');
});
test('missing singleton and unsafe navigation fail closed',()=>{
 assert.throws(()=>adaptSite(records.slice(0,1)),/profile/i);
 assert.throws(()=>adaptSite([{...records[0],navigation:[{label:'bad',url:'javascript:alert(1)'}]},records[1]]),/navigation/i);
});
test('hidden section links are removed for fragment and root-fragment navigation',()=>{
 const s={...records[0],sections:[{id:'projects',visible:false,intro:'Reserved text'}],navigation:[{label:'hidden',url:'/#projects'},{label:'visible',url:'#writing'}],footerNavigation:[{label:'hidden',url:'#projects'}]};
 const site=adaptSite([s,records[1]]);
 assert.deepEqual(site.settings.navigation.map(x=>x.label),['visible']);
 assert.deepEqual(site.settings.footerNavigation,[]);
});
