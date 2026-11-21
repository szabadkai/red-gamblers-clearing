import {test} from 'node:test';
import assert from 'node:assert/strict';
import {StoryWorld,loadStory,saveStory,STORY_SAVE_KEY,RECORDS_KEY,gradeClearing,saveRecord,loadRecords,replayStages} from '../story.mjs';
import {CLEARINGS} from '../journey.mjs';
import {STAGES} from '../story-data.mjs';
const storage=()=>{const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};};
const reload=(s,w)=>{assert.ok(saveStory(s,w));const saved=loadStory(s);assert.ok(saved);const r=new StoryWorld(()=>.7);r.reset(saved.stage,saved);return r;};

for(const [stage,next] of [[0,'boss'],[1,'boss'],[2,'boss'],[3,'boss'],[4,'boss'],[4,'garden']]){
 test(`${CLEARINGS[stage].name} ${next}: both opening choices survive reload and retry`,()=>{
  for(const keep of [true,false]){
   const s=storage(),w=new StoryWorld(()=>.4);
   w.reset(stage,{phase:next==='garden'?'inside':'trail',seen:['prologue',STAGES[stage].encounter]});
   w.deck.hit();const offer=w.deck.reward();w.deck.choose(offer.id,0);w.deck.reward();
   const prepared=w.deck.checkpoint();
   if(next==='garden'){
    for(const knot of w.knots)knot.hp=0;
    w.x=900;w.step(1/60);
   }else{
    w.enemies=[];w.collected=3;w.embers=[];w.x=w.clearing.exit.x;w.y=w.clearing.exit.y;w.step(1/60);
   }
   assert.equal(w.mode,'lantern');assert.equal(w.lanternNext,next);
   const r=reload(s,w);assert.equal(r.mode,'lantern');assert.deepEqual(r.deck.checkpoint(),prepared);
   assert.ok(r.chooseLanternHand(keep));const opening=r.deck.checkpoint();
   if(keep)assert.deepEqual(opening,prepared);
   else{assert.equal(opening.hand.length,5);assert.equal(opening.hits,0);assert.equal(opening.reserve,null);}
   const fight=reload(s,r);assert.deepEqual(fight.deck.checkpoint(),opening);
   fight.advanceDialogue(true);fight.deck.play(0);fight.health=1;fight.retry();
   assert.equal(fight.storyPhase,next);assert.deepEqual(fight.deck.checkpoint(),opening);assert.equal(fight.health,5);
  }
 });
}

test('old boss saves gain a stable opening, without requiring new save fields',()=>{
 for(let stage=0;stage<5;stage++){
  const s=storage();s.setItem(STORY_SAVE_KEY,JSON.stringify({version:3,clearing:CLEARINGS[stage].id,phase:'boss',seen:[]}));
  const saved=loadStory(s);assert.ok(saved);const w=new StoryWorld();w.reset(stage,saved);
  const hand=w.deck.checkpoint();w.deck.play(0);w.retry();assert.deepEqual(w.deck.checkpoint(),hand);
  assert.ok(loadStory({getItem:k=>k===STORY_SAVE_KEY?JSON.stringify(w.snapshot()):null}));
 }
});

test('grades ignore rare hands and record rare-hand achievements independently',()=>{
 const pair=gradeClearing(0,{time:100,hurt:1,retries:0,best:1}),flush=gradeClearing(0,{time:100,hurt:1,retries:0,best:5});
 assert.equal(pair.score,94);assert.equal(flush.score,94);assert.equal(pair.grade,'A');assert.equal(flush.grade,'A');
 assert.equal(pair.rareHand,false);assert.equal(flush.rareHand,true);
 const s=storage();saveRecord(s,'lantern-wood',pair);saveRecord(s,'lantern-wood',{...flush,score:80,time:120});
 assert.deepEqual(loadRecords(s)['lantern-wood'],{score:94,grade:'A',time:100,rules:2,rareHand:true});
 // A legacy score with a luck bonus must not beat a new-rules score forever.
 s.setItem(RECORDS_KEY,JSON.stringify({'lantern-wood':{score:99,grade:'S',time:90}}));
 assert.equal(saveRecord(s,'lantern-wood',pair).better,true);
 assert.equal(loadRecords(s)['lantern-wood'].score,94);assert.equal(loadRecords(s)['lantern-wood'].time,90);
});

test('replay unlocks completed chapters and preserves campaign checkpoint through retries and completion',()=>{
 const s=storage(),w=new StoryWorld();assert.deepEqual(replayStages(s),[]);
 w.reset(2,{phase:'trail',seen:['prologue']});saveStory(s,w);const campaign=s.getItem(STORY_SAVE_KEY);
 assert.deepEqual(replayStages(s),[0,1]);
 saveRecord(s,'ruined-chapel',gradeClearing(3,{time:100,hurt:0,retries:0,best:0}));
 assert.deepEqual(replayStages(s),[0,1,3]);
 assert.ok(w.startReplay(1));assert.equal(w.replay,true);assert.deepEqual(w.tally,{time:0,hurt:0,retries:0,best:-1});
 w.tally.time=10;w.tally.hurt=1;w.retry();assert.equal(w.replay,true);assert.equal(w.tally.retries,1);assert.equal(w.tally.time,10);
 assert.equal(saveStory(s,w),false);w.mode='won';assert.equal(w.advance(),false);assert.equal(saveStory(s,w),false);
 assert.equal(s.getItem(STORY_SAVE_KEY),campaign);
 w.reset(2,loadStory(s));assert.equal(w.replay,false);
 w.reset(2,{phase:'cleared',seen:[]});saveStory(s,w);assert.deepEqual(replayStages(s),[0,1,2,3]);
});

test('corrupt records neither unlock chapters nor poison the next score',()=>{
 const s=storage();s.setItem(RECORDS_KEY,JSON.stringify({'lantern-wood':{score:'bad',time:-10,grade:'S'}}));
 assert.deepEqual(loadRecords(s),{});assert.deepEqual(replayStages(s),[]);
 saveRecord(s,'lantern-wood',gradeClearing(0,{time:80,hurt:0,retries:0,best:-1}));
 assert.deepEqual(replayStages(s),[0]);
});
