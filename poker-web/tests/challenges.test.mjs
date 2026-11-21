import {test} from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../model.mjs';
import {StoryWorld,saveStory,loadStory} from '../story.mjs';
import {STAGES} from '../story-data.mjs';
import {initChallenge,beforeChallengeStep,updateChallenge,challengeHint} from '../challenges.mjs';

function make(stage){
 const w=new World(()=>.4);w.reset(stage);w.enemies=[];w.gates.forEach(g=>g.open=true);w.storyPhase='trail';w.health=3;
 initChallenge(w);return w;
}
function step(w,n=1,input={}){
 for(let i=0;i<n;i++){
  beforeChallengeStep(w,1/60);w.step(1/60,input);updateChallenge(w,1/60,input);
 }
}
function travel(w,target,jump=false){
 if(jump)w.jump();
 for(let i=0;i<300;i++){
  const distance=target-w.x;
  step(w,1,{axis:Math.abs(distance)<1?0:Math.max(-1,Math.min(1,distance/22))});
  if(Math.abs(distance)<4&&Math.abs(w.vx)<10&&w.grounded)return;
 }
 assert.fail(`Could not reach ${target}: ${w.x},${w.y}`);
}
test('wood lantern challenge follows reachable ledges and rewards once',()=>{
 const w=make(0),drops=w.cardDrops.length;
 travel(w,125);travel(w,220,true);assert.equal(w.challenge.index,1);
 travel(w,285);travel(w,405,true);assert.equal(w.challenge.index,2);
 travel(w,465);travel(w,575,true);
 assert.equal(w.challenge.done,true);assert.equal(w.cardDrops.length,drops+1);
 const health=w.health,revision=w.storyRevision;step(w,60);
 assert.equal(w.health,health);assert.equal(w.storyRevision,revision);assert.equal(w.fallCount,0);
});
test('bridge lifts carry passengers and both are reachable above the safe bridge deck',()=>{
 const w=make(1);
 travel(w,100);travel(w,175,true);travel(w,445);assert.equal(w.y,360);
 travel(w,445,true);step(w,42);
 assert.equal(w.challenge.index,1);assert.ok(w.platforms.find(p=>p.id===w.surface)?.challengeLift===0);
 const priorY=w.y;step(w,20);assert.notEqual(w.y,priorY);
 travel(w,475);travel(w,635,true);step(w,42);
 assert.equal(w.challenge.done,true);assert.equal(w.fallCount,0);
 const y=w.platforms.find(p=>p.challengeLift===0).y;w.mode='paused';beforeChallengeStep(w,1);
 assert.equal(w.platforms.find(p=>p.challengeLift===0).y,y);
});
test('cavern descent accepts walking and dropping, but a jump resets the chain',()=>{
 const w=make(2);w.x=2910;w.y=300;w.grounded=true;w.surface=19;
 travel(w,3040,true);assert.equal(w.challenge.index,1);
 step(w,1,{jump:true});assert.equal(w.challenge.index,0);
 step(w,45);assert.equal(w.challenge.index,1);
 travel(w,3260);assert.equal(w.y,300);assert.equal(w.challenge.index,2);
 travel(w,3440);assert.equal(w.y,360);assert.equal(w.challenge.index,3);
 step(w,1,{drop:true});step(w,40);
 assert.equal(w.y,420);assert.equal(w.challenge.done,true);assert.equal(w.fallCount,0);
});
test('chapel bells require intentional nearby interactions in the revealed order',()=>{
 const w=make(3);w.x=2600;w.y=420;
 assert.equal(challengeHint(w).canInteract,true);
 step(w,60);assert.equal(w.challenge.index,0);
 step(w,1,{interact:true});assert.equal(w.challenge.index,1);
 travel(w,2720);step(w,1,{interact:true});assert.equal(w.challenge.index,0);
 travel(w,2600);step(w,1,{interact:true});travel(w,2840);step(w,1,{interact:true});
 assert.equal(w.challenge.index,2);
 travel(w,2720);step(w,1,{interact:true});assert.equal(w.challenge.done,true);
});
test('house flame sprint has a reachable finish and failure costs no health',()=>{
 const w=make(4);w.x=4250;w.y=420;w.surface=16;
 step(w,1,{interact:true});assert.equal(w.challenge.index,1);
 const health=w.health;step(w,721);assert.equal(w.challenge.index,0);assert.equal(w.health,health);
 step(w,1,{interact:true});travel(w,4310,true);travel(w,4370);travel(w,4480,true);travel(w,4535);travel(w,4630,true);
 assert.equal(w.y,300);assert.equal(w.challenge.done,true);assert.equal(w.fallCount,0);
});
test('completed challenges and inactive rooms cannot duplicate rewards',()=>{
 const w=make(0);initChallenge(w,true);w.x=575;w.y=240;
 updateChallenge(w,1);assert.equal(w.cardDrops.length,0);
 w.storyPhase='boss';assert.equal(challengeHint(w),null);
 w.storyPhase='trail';w.practice=true;assert.equal(challengeHint(w),null);
});

const store=()=>{const memory=new Map();return {getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};};
function story(stage){
 const w=new StoryWorld(()=>.4);w.reset(stage,{phase:'trail',seen:['prologue',STAGES[stage].encounter]});
 w.enemies=[];w.gates.forEach(g=>g.open=true);return w;
}
function walkStory(w,target,jump=false){
 if(jump)w.jump();
 for(let i=0;i<300;i++){
  const d=target-w.x;w.step(1/60,{axis:Math.abs(d)<1?0:Math.max(-1,Math.min(1,d/22))});
  if(w.mode==='lantern'||Math.abs(d)<4&&Math.abs(w.vx)<10&&w.grounded)return;
 }
 assert.fail(`Story travel failed: ${w.x},${w.y}`);
}
test('house reward can be collected before the exit and completion persists through both bosses',()=>{
 const w=story(4);w.x=4250;w.y=420;w.surface=16;w.collected=3;w.embers=[];
 w.step(1/60,{interact:true});walkStory(w,4310,true);walkStory(w,4370);walkStory(w,4480,true);walkStory(w,4535);walkStory(w,4630,true);
 assert.equal(w.challenge.done,true);assert.equal(w.mode,'playing');assert.equal(w.cardDrops.length,1);
 for(let i=0;i<30;i++)w.step(1/60);
 assert.ok(w.nearbyCardDrop,'reward stays within collection range before the exit');
 w.step(1/60,{collect:true});assert.equal(w.mode,'drafting');w.chooseDraft(0);
 const banked=w.deck.reserve;assert.notEqual(banked,null);
 walkStory(w,4710);assert.equal(w.mode,'lantern');w.chooseLanternHand(true);
 assert.equal(w.deck.reserve,banked);assert.equal(w.challenge.done,true);
 const s=store();saveStory(s,w);const saved=loadStory(s),restored=new StoryWorld(()=>.2);
 restored.reset(saved.stage,saved);assert.equal(restored.challenge.done,true);
 restored.advanceDialogue(true);restored.retry();assert.equal(restored.challenge.done,true);assert.equal(restored.cardDrops.length,0);
 restored.setupInside();saveStory(s,restored);const inside=loadStory(s);
 assert.equal(inside.challengeDone,true);restored.reset(inside.stage,inside);assert.equal(restored.challenge.done,true);
 restored.prepareLantern('garden');restored.chooseLanternHand(true);restored.retry();assert.equal(restored.challenge.done,true);
});
test('story card menus and hit stop freeze lifts; retry resets an unfinished challenge',()=>{
 const w=story(1),state=()=>({challenge:structuredClone(w.challenge),lifts:w.platforms.filter(p=>p.challengeLift!==undefined).map(p=>p.y)});
 w.challenge.index=1;w.openCardSelection();const paused=state();
 w.step(1,{axis:1,interact:true});assert.deepEqual(state(),paused);
 w.finishCardSelection();w.hitStop=.3;const stopped=state();w.step(.1);assert.deepEqual(state(),stopped);
 w.hitStop=0;w.step(.1);assert.notDeepEqual(state().lifts,stopped.lifts);
 w.retry();assert.equal(w.challenge.index,0);assert.equal(w.challenge.done,false);
});
