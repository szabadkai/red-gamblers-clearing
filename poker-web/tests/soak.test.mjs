import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CLEARINGS} from '../journey.mjs';
import {hunt} from './support/hunter.mjs';
// Every gate needs every foe before it dead, so a foe that cannot be reached or hit would lock the clearing.
for(let stage=0;stage<CLEARINGS.length;stage++)test(`${CLEARINGS[stage].name}: every foe can be hunted down and every gate opens`,()=>{
 const run=hunt(stage);
 assert.equal(run.stuck,null,JSON.stringify(run.stuck));assert.equal(run.left,0);assert.equal(run.gates,CLEARINGS[stage].gates.length);
 assert.ok(run.time<300,`took ${run.time}s`);
});
