import {baselineSeed} from './helpers/baseline-seed.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {checkFrozenIds} from '../src/cms/baseline-ids.mjs';
test('baseline identity changes fail rather than creating new seed IDs',()=>{
 const docs=baselineSeed();
 const frozen=JSON.parse(readFileSync('src/cms/baseline-ids.json','utf8'));
 assert.doesNotThrow(()=>checkFrozenIds(docs,frozen));
 const modified=structuredClone(docs); modified[2]._id='writing.changed';
 assert.throws(()=>checkFrozenIds(modified,frozen),/identity/);
});
