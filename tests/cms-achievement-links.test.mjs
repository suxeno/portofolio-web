import test from 'node:test';
import assert from 'node:assert/strict';
import {adaptCareer} from '../src/cms/career-adapter.mjs';

const award = links => ({_id:'award',_type:'achievement',title:'Winner',links});
test('projects first safe achievement link without losing title', () => {
 assert.deepEqual(adaptCareer([award([{url:'https://example.org/evidence'},{url:'https://example.org/second'}])]).achievements, [{title:'Winner',href:'https://example.org/evidence'}]);
});
test('missing or unsafe first link remains plain text', () => {
 for (const links of [undefined, [], [{url:''}], [{url:'javascript:alert(1)'},{url:'https://example.org'}], [{url:'https://'}]]) {
  assert.deepEqual(adaptCareer([award(links)]).achievements,['Winner']);
 }
});
