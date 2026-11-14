import {test} from 'node:test';
import assert from 'node:assert/strict';
import {safeLink, sectionIdsValid, validYearMonth, validDateRange, schemaTypes} from '../src/cms/schema.mjs';

test('links permit only safe absolute protocols or local paths and fragments', () => {
  for (const value of ['https://example.com/x', 'http://localhost/', 'mailto:a@example.com', '/writing/', '#contact']) assert.equal(safeLink(value), true, value);
  for (const value of ['javascript:alert(1)', '//evil.example', 'data:text/html,x', 'https://example.com\n', '/\\evil']) assert.notEqual(safeLink(value), true, value);
});
test('section identifiers are allowed and unique', () => {
  assert.equal(sectionIdsValid([{id:'writing'}, {id:'contact'}]), true);
  for (const rows of [[{id:'writing'},{id:'writing'}],[{id:'unknown'}]]) assert.notEqual(sectionIdsValid(rows), true);
});
test('partial dates retain precision and ranges reject reversal', () => {
  for (const date of ['2025','2025-01','2025-12']) assert.equal(validYearMonth(date), true);
  for (const date of ['2025-00','2025-13','2025-02-01','nonsense']) assert.notEqual(validYearMonth(date), true);
  assert.equal(validDateRange({startDate:'2024-12',endDate:'2025-01'}), true);
  assert.notEqual(validDateRange({startDate:'2025-02',endDate:'2024-12'}), true);
});
test('tool row uses required integer bounds in the Studio validation chain', () => {
  const row = schemaTypes.find(item => item.name === 'tool').fields.find(field => field.name === 'row');
  const calls = [];
  const rule = Object.fromEntries(['required','integer','min','max'].map(name => [name, (...args) => { calls.push([name, ...args]); return rule; }]));
  row.validation(rule);
  assert.deepEqual(calls, [['required'], ['integer'], ['min',1], ['max',3]]);
});
test('current roles cannot also have an end date', () => {
  assert.notEqual(validDateRange({startDate:'2025',endDate:'2026',current:true}), true);
  assert.equal(validDateRange({startDate:'2025',current:true}), true);
});
test('approved domains have required fields and partial dates', () => {
  const expected = {siteSettings:['navigation','sections','contactQuestion','contactAction','footerCopy','terminalReadme'],profile:['displayName','expertiseLine','biography','email','contactCta','links','photo','resume'],writing:['title','slug','excerpt','cover','body','publishedAt','featured','order','visible','seo'],project:['title','description','cover','screenshots','technologies','repository','links','order','visible','seo'],experience:['role','organization','location','employmentType','startDate','endDate','displayDate','current','description','links','order','visible'],achievement:['title','placement','event','date','displayDate','description','links','evidence','order','visible'],tool:['name','logo','accessibleLabel','row','order','visible'],certificate:['title','issuer','date','expiry','displayDate','credentialId','verificationUrl','image','originalFile','order','visible']};
  for (const [name, fields] of Object.entries(expected)) {
    const doc = schemaTypes.find(item => item.name === name); assert.ok(doc, name);
    for (const name of fields) assert.ok(doc.fields.some(field => field.name === name), `${doc.name}.${name}`);
  }
});
test('rendered site and profile strings are required in Studio with build-compatible bounds', () => {
  const paths={siteSettings:['wordmark','footerBackToTop','contactQuestion','contactAction','terminalReadme'],profile:['displayName','expertiseLine','biography','email']};
  for (const [type,names] of Object.entries(paths)) for (const name of names) {
    const f=schemaTypes.find(d=>d.name===type).fields.find(f=>f.name===name);
    assert.equal(typeof f.validation,'function',`${type}.${name}`);
    const calls=[]; const rule=Object.fromEntries(['required','max','custom'].map(k=>[k,(...args)=>{calls.push([k,...args]);return rule}]));
    f.validation(rule);
    assert.ok(calls.some(([kind])=>kind==='required'),`${type}.${name} required`);
  }
  const ui=schemaTypes.find(d=>d.name==='siteSettings').fields.find(f=>f.name==='writingUi');
  for (const f of ui.fields) assert.equal(typeof f.validation,'function',`writingUi.${f.name}`);
});
