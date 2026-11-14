import {baselineSeed} from './helpers/baseline-seed.mjs';
// Run with Bun: actual TypeScript source compared with seed projections.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {writing,projects,experience,achievements} from '../src/content';
import {runCommand} from '../src/shell';
import {adaptWriting} from '../src/cms/writing-adapter.mjs';
import {adaptProjects} from '../src/cms/projects-adapter.mjs';
import {adaptCareer} from '../src/cms/career-adapter.mjs';
import {adaptSite} from '../src/cms/site-adapter.mjs';
const docs=baselineSeed();
const config={projectId:'synthetic',dataset:'test'};
assert.deepEqual(adaptWriting(docs,config).map(({title,slug,excerpt,publishedAt,cover,body})=>({title,slug,excerpt,publishedAt,cover,body:body.map(b=>b.children[0].text)})),writing);
assert.deepEqual(adaptProjects(docs,config).map(({title,detail,href})=>({title,detail,href})),projects);
const career=adaptCareer(docs);assert.deepEqual(career.experience,experience);assert.deepEqual(career.achievements,achievements);
assert.equal(adaptSite(docs,config).settings.terminalReadme,runCommand('/home/arvin','cat README.md').output);
console.log('PASS: writing, projects, career, achievements and decoded shell README match actual source');
