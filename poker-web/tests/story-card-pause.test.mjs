import {test} from 'node:test';
import assert from 'node:assert/strict';
import {StoryWorld} from '../story.mjs';

function mill(){
 const w=new StoryWorld(()=>.4);
 w.reset(1,{phase:'boss',seen:[]});
 w.boss.hp=w.boss.max/2;
 w.x=200;w.y=w.platforms[1].y;w.surface=1;w.grounded=true;
 w.hazards.push({kind:'shadow',x:200,y:360,w:64,h:34,delay:1.1,life:.25,age:0});
 return w;
}
function movingState(w){
 return {time:w.time,tally:{...w.tally},x:w.x,y:w.y,platforms:structuredClone(w.platforms),
  boss:structuredClone(w.boss),hazards:structuredClone(w.hazards),hand:[...w.deck.hand]};
}

test('collecting in the moving mill freezes scenery, rider and encounter on the opening tick',()=>{
 const w=mill(),offer=w.deck.reward();
 w.spawnCardDrop(offer,{x:w.x,y:w.y});w.cardDrops[0].age=1;
 const before=movingState(w);
 w.step(1/60,{collect:true,axis:1,sword:true,jump:true,play:true});
 assert.equal(w.mode,'drafting');
 assert.equal(w.activeDraft,offer.id);
 assert.deepEqual(movingState(w),before);
 for(let i=0;i<60;i++)w.step(1/60,{axis:1,sword:true});
 assert.deepEqual(movingState(w),before);
 w.dismissDraft();w.step(1/60);
 assert.ok(w.time>before.time);
 assert.notEqual(w.platforms[1].y,before.platforms[1].y);
});

test('card inspection suspends story encounters and cancellation resumes without changing cards',()=>{
 const w=mill(),before=movingState(w);
 assert.ok(w.openCardSelection());
 for(let i=0;i<60;i++)w.step(1/60,{axis:1,sword:true,play:true,collect:true});
 assert.deepEqual(movingState(w),before);
 w.moveCardSelection(1);w.finishCardSelection(false);
 assert.equal(w.mode,'playing');assert.deepEqual(w.deck.hand,before.hand);
 w.step(1/60);assert.ok(w.time>before.time);
});

test('collect without an eligible drop does not stop story simulation',()=>{
 const w=mill();w.step(1/60,{collect:true});
 assert.equal(w.mode,'playing');assert.ok(w.time>0);
});

test('changing story rooms clears a throw queued from the previous encounter',()=>{
 const w=mill();w.play();w.openCardSelection();w.finishCardSelection(true);
 assert.notEqual(w.pendingSlotCard,null);
 w.setupRoom('arena');
 assert.equal(w.pendingSlotCard,null);
 const hand=[...w.deck.hand];w.step(1/60);
 assert.deepEqual(w.deck.hand,hand);
});
