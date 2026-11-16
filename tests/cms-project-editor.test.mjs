import test from 'node:test';
import assert from 'node:assert/strict';
import {schemaTypes} from '../src/cms/schema.mjs';

test('project editing exposes destination and retains legacy data without normal controls', () => {
 const project = schemaTypes.find(x => x.name === 'project');
 const fields = Object.fromEntries(project.fields.map(x => [x.name, x]));
 assert.equal(fields.repository.title, 'Destination URL');
 for (const name of ['screenshots','technologies','seo']) assert.equal(fields[name].hidden, true);
 assert.equal(fields.links.hidden({document:{repository:'https://example.com'}}), true);
 assert.equal(fields.links.hidden({document:{links:[{url:'https://example.com'}]}}), false);
 assert.equal(fields.order.fieldset, 'display');
 assert.equal(fields.visible.fieldset, 'display');
 assert.equal(project.fieldsets.find(x=>x.name==='display').options.collapsible, true);
});
