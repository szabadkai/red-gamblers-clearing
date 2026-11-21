import test from 'node:test';
import assert from 'node:assert/strict';
import {World,SPLIT_PAIRS} from '../model.mjs';
import {PlaytestRecorder,observePlaytest} from '../playtest.mjs';

test('playtest recorder observes real deaths and healing opportunities without changing simulation',()=>{
  const a=new World(()=>.42),b=new World(()=>.42),recorder=new PlaytestRecorder(()=>0);
  const detach=observePlaytest(a,recorder);
  a.deck.preset(SPLIT_PAIRS);b.deck.preset(SPLIT_PAIRS);
  a.health=b.health=1;recorder.start(a);
  a.hurt();b.hurt();
  for(let i=0;i<80;i++){a.step(1/60);b.step(1/60);}
  recorder.stop(a);
  assert.equal(a.mode,'dead');
  assert.deepEqual([a.x,a.y,a.health,a.time,a.deck.hand],[b.x,b.y,b.health,b.time,b.deck.hand]);
  const report=recorder.report();
  assert.equal(report.encounters[0].deaths,1);
  assert.equal(report.encounters[0].deathsWithHealingHand,1);
  assert.equal(report.encounters[0].hitsTaken,1);
  detach();
});

test('recorder distinguishes simulation time, paused choice time, and practice sessions',()=>{
  let now=0;const w=new World(()=>.42),recorder=new PlaytestRecorder(()=>now);
  observePlaytest(w,recorder);w.enemies=[];w.health=4;w.deck.preset(SPLIT_PAIRS);
  recorder.start(w);
  w.step(.1);
  const draft=w.deck.reward();w.spawnCardDrop(draft,{x:w.x+50,y:w.y});
  w.openDraft(w.cardDrops[0]);now=2500;w.step(.1);w.chooseDraft(0);
  w.mode='paused';now=9000;w.step(.1);
  w.practice=true;w.mode='playing';recorder.capture(w);w.step(.1);recorder.stop(w);
  const report=recorder.report(),journey=key=>report.encounters.filter(row=>!row.practice).reduce((sum,row)=>sum+row[key],0),practice=report.encounters.find(row=>row.practice);
  assert.equal(journey('drawChoices'),1);
  assert.equal(journey('drawDecisionSeconds'),2.5);
  assert.equal(journey('activeSeconds'),.1);
  assert.equal(journey('secondsWithHealingAvailable'),.1);
  assert.equal(practice.activeSeconds,.1);
  assert.equal(report.activeSeconds,.2);
});

test('gate intervals, retries and healing casts retain encounter context and fresh sessions reset totals',()=>{
  const w=new World(()=>.42),recorder=new PlaytestRecorder(()=>0);
  observePlaytest(w,recorder);w.enemies=[];w.health=4;w.deck.preset(SPLIT_PAIRS);
  recorder.start(w);w.play();w.step(.1);
  w.gates[0].open=true;recorder.capture(w);
  recorder.action('retry',w);recorder.stop(w);
  const report=recorder.report();
  assert.equal(report.encounters[0].healingCasts,1);
  assert.equal(report.encounters[0].casts,1);
  assert.equal(report.events.find(event=>event.type==='gate').gate,1);
  assert.equal(report.encounters.reduce((sum,row)=>sum+row.retries,0),1);
  recorder.start(w);recorder.stop(w);
  assert.equal(recorder.report().encounters.reduce((sum,row)=>sum+row.casts,0),0);
});
