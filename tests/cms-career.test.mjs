import test from 'node:test';
import assert from 'node:assert/strict';
import {adaptCareer} from '../src/cms/career-adapter.mjs';

test('projects visible published experience and achievements in stable order', () => {
 const rows = [
  {_id:'e2',_type:'experience',role:'Second',organization:'Org',displayDate:'2025',order:2},
  {_id:'e1',_type:'experience',role:'First',organization:'Studio',displayDate:'JUL 2026 — PRESENT',current:true,order:1},
  {_id:'a1',_type:'achievement',title:'2025 — Winner · Event',order:0},
  {_id:'a2',_type:'achievement',title:'Hidden',visible:false},
  {_id:'drafts.e3',_type:'experience',role:'Secret',organization:'Secret',displayDate:'2026'}
 ];
 const result = adaptCareer(rows);
 assert.deepEqual(result.experience.map(x=>x.title), ['First','Second']);
 assert.equal(result.experience[0].date, 'JUL 2026 — PRESENT');
 assert.deepEqual(result.achievements,['2025 — Winner · Event']);
 assert.deepEqual(adaptCareer([]),{experience:[],achievements:[]});
});

test('rejects invalid visible career records', () => {
 for (const row of [
  {_id:'1',_type:'experience',role:' ',organization:'Org',displayDate:'2025'},
  {_id:'1',_type:'experience',role:'Role',organization:'Org'},
  {_id:'1',_type:'experience',role:'Role',organization:'Org',displayDate:'2025',current:true,endDate:'2025'},
  {_id:'1',_type:'achievement',title:' '},
  {_id:'1',_type:'achievement',title:'Title',order:1.5},
 ]) assert.throws(()=>adaptCareer([row]));
});
