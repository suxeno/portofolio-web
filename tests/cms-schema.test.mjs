import {test} from 'node:test';
import assert from 'node:assert/strict';
import {schemaTypes} from '../src/cms/schema.mjs';

test('schemas cover approved domains and rich text image accessibility', () => {
  for (const name of ['siteSettings','profile','writing','project','experience','achievement','tool','certificate']) assert.ok(schemaTypes.find(x=>x.name===name),name);
  const writing = schemaTypes.find(x=>x.name==='writing');
  const body = writing.fields.find(x=>x.name==='body');
  assert.ok(body.of.some(x=>x.type==='block'));
  assert.ok(body.of.some(x=>x.type==='codeBlock'));
  const image = body.of.find(x=>x.name==='bodyImage');
  assert.ok(image.fields.find(x=>x.name==='alt' && x.validation));
  assert.ok(image.fields.find(x=>x.name==='caption'));
});
