import {test} from 'node:test';
import assert from 'node:assert/strict';
import {StoryWorld,loadStory,saveStory} from '../story.mjs';

// The card lessons, with every movement and sword lesson already done.
const opening=()=>{
 const w=new StoryWorld(()=>.4);
 w.reset(0,{phase:'trail',seen:['prologue','stranger']});
 for(const id of ['move','jump','sword','dash'])w.hinted.add(id);
 return w;
};
const tick=(w,frames,input={})=>{for(let i=0;i<frames;i++)w.step(1/60,input);};
const skip=w=>{while(w.mode==='cutscene')w.advanceDialogue(true);};

test('lessons follow the verbs: walk, jump, drop, sword, collect, cards, dash',()=>{
 const w=new StoryWorld(()=>.4);
 assert.equal(w.tutorialHint,null,'the prologue plays first');
 skip(w);
 assert.equal(w.tutorialHint.id,'move');assert.deepEqual(w.tutorialHint.action,['left','right']);
 for(let f=0;f<60&&w.mode==='playing';f++)w.step(1/60,{axis:1});
 skip(w);
 assert.equal(w.tutorialHint.id,'jump');
 w.step(1/60,{jump:true});tick(w,60);
 assert.equal(w.tutorialHint.id,'drop','standing on the ledge above the trailhead');
 w.step(1/60,{drop:true});tick(w,60);
 assert.equal(w.tutorialHint.id,'sword');
 // A sturdy foe beside Red takes the swing; the trail's own foes stay put, so the first gate stays shut.
 w.facing=1;w.spawn(w.x+40,0);const dummy=w.enemies.at(-1);dummy.hp=99;w.sword();tick(w,8);
 assert.notEqual(w.tutorialHint?.id,'sword');
 w.enemies=w.enemies.filter(e=>e!==dummy);w.spawnCardDrop(w.deck.reward(),{x:w.x+40,y:w.y});tick(w,30);
 assert.equal(w.tutorialHint.id,'collect');assert.equal(w.tutorialHint.action,'interact');
 w.step(1/60,{collect:true});assert.equal(w.mode,'drafting');w.chooseDraft(0);
 assert.equal(w.tutorialHint.id,'sevens-cycle');
 w.gates[0].open=true;
 assert.equal(w.tutorialHint.id,'dash','dash comes once the cards are done');
 w.step(1/60,{dash:true});
 assert.equal(w.tutorialHint,null);
});

test('foes hold back while a lesson is showing',()=>{
 const w=opening();
 assert.equal(w.sight,200);
 w.tutorials=false;
 assert.equal(w.tutorialHint,null);assert.equal(w.sight,360);
});

test('opening lesson persists through other banners and follows selecting and casting both pairs',()=>{
 const w=opening();
 assert.equal(w.tutorialHint.id,'sevens-cycle');
 w.invincible=30;w.banner='CARD DROP';w.bannerTime=1;
 tick(w,360);
 assert.equal(w.bannerTime,0);
 assert.equal(w.tutorialHint.id,'sevens-cycle','the lesson outlives transient feedback');
 w.step(1/60,{cycle:true});
 assert.equal(w.tutorialHint.id,'sevens-cycle','one cycle selects the jacks');
 w.step(1/60,{cycle:true});
 assert.equal(w.tutorialHint.id,'sevens-play');
 assert.match(w.tutorialHint.detail,/Keep the jacks/);
 w.step(1/60,{play:true});
 assert.equal(w.tutorialHint.id,'jacks-play');
 assert.equal(w.deck.hand.length,3);
 tick(w,25);
 w.step(1/60,{play:true});
 assert.equal(w.tutorialHint,null);
});

test('opening lesson respects alternate combinations, throws and replacements',()=>{
 const together=opening();
 together.step(1/60,{play:true});
 assert.equal(together.tutorialHint,null,'playing both pairs needs no obsolete instructions');

 const reverse=opening();
 reverse.cyclePlay();
 reverse.play();
 assert.equal(reverse.tutorialHint.id,'sevens-play','the other pair remains teachable');
 assert.doesNotMatch(reverse.tutorialHint.detail,/Keep the jacks/);

 const thrown=opening();
 thrown.useSlot(0);
 assert.equal(thrown.tutorialHint.id,'sevens-play','a broken jack pair is never requested');
 assert.doesNotMatch(thrown.tutorialHint.detail,/Keep the jacks/);

 const replaced=opening();
 const offer=replaced.deck.reward();replaced.deck.choose(offer.id,0);replaced.useSlot(0);
 assert.equal(replaced.tutorialHint.id,'sevens-play');
});

test('opening lesson follows checkpoints and is hidden outside active opening play',()=>{
 const w=opening();
 w.cyclePlay();w.play();
 assert.equal(w.tutorialHint.id,'sevens-play');
 w.retry();
 assert.equal(w.tutorialHint.id,'sevens-cycle','retry restores the original opening hand');
 const data=new Map(),storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};
 saveStory(storage,w);
 const saved=loadStory(storage),restored=new StoryWorld(()=>.5);
 restored.reset(saved.stage,saved);
 for(const id of w.hinted)restored.hinted.add(id);
 assert.equal(restored.tutorialHint.id,'sevens-cycle','Continue matches its restored opening hand');
 for(const mode of ['paused','drafting','cutscene','dead']){
  w.mode=mode;assert.equal(w.tutorialHint,null);
 }
 w.mode='playing';w.dying=.2;assert.equal(w.tutorialHint,null);w.dying=0;
 w.gates[0].open=true;assert.equal(w.tutorialHint,null);
 w.retry();assert.equal(w.tutorialHint,null,'an opened gate ends the opening lesson');
 const practice=opening();practice.practice=true;assert.equal(practice.tutorialHint,null);
 const later=new StoryWorld();later.reset(1,{phase:'trail',seen:['prologue','stranger','pip']});assert.equal(later.tutorialHint,null);
});
