import {test} from 'node:test';
import assert from 'node:assert/strict';
import {StoryWorld,loadStory,saveStory} from '../story.mjs';

const opening=()=>{
 const w=new StoryWorld(()=>.4);
 w.reset(0,{phase:'trail',seen:['prologue','stranger']});
 w.hinted.add('sword');
 return w;
};
const tick=(w,frames,input={})=>{for(let i=0;i<frames;i++)w.step(1/60,input);};

test('opening lesson persists through other banners and follows selecting and casting both pairs',()=>{
 const w=opening();
 assert.equal(w.tutorialHint.id,'jacks-cycle');
 w.invincible=30;w.banner='CARD DROP';w.bannerTime=1;
 tick(w,360);
 assert.equal(w.bannerTime,0);
 assert.equal(w.tutorialHint.id,'jacks-cycle','the lesson outlives transient feedback');
 w.step(1/60,{cycle:true});
 assert.equal(w.tutorialHint.id,'jacks-play');
 w.step(1/60,{play:true});
 assert.deepEqual(w.deck.hand,[5,18,1]);
 assert.equal(w.tutorialHint.id,'sevens-play');
 assert.deepEqual(w.tutorialHint.cards,[5,18]);
 tick(w,25);
 w.step(1/60,{play:true});
 assert.equal(w.tutorialHint,null);
});

test('opening lesson respects alternate combinations, throws and replacements',()=>{
 const together=opening();
 together.step(1/60,{play:true});
 assert.equal(together.tutorialHint,null,'playing both pairs needs no obsolete instructions');

 const reverse=opening();
 reverse.cyclePlay();reverse.cyclePlay();
 reverse.play();
 assert.equal(reverse.tutorialHint.id,'jacks-play','the other pair remains teachable');
 assert.doesNotMatch(reverse.tutorialHint.detail,/Keep the sevens/);

 const thrown=opening();
 thrown.useSlot(0);
 assert.equal(thrown.tutorialHint.id,'sevens-play','a broken jack pair is never requested');

 const replaced=opening();
 const offer=replaced.deck.reward();replaced.deck.choose(offer.id,0);replaced.useSlot(0);
 assert.equal(replaced.tutorialHint.id,'sevens-play');
});

test('opening lesson follows checkpoints and is hidden outside active opening play',()=>{
 const w=opening();
 w.cyclePlay();w.play();
 assert.equal(w.tutorialHint.id,'sevens-play');
 w.retry();
 assert.equal(w.tutorialHint.id,'jacks-cycle','retry restores the original opening hand');
 const data=new Map(),storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};
 saveStory(storage,w);
 const saved=loadStory(storage),restored=new StoryWorld(()=>.5);
 restored.reset(saved.stage,saved);
 assert.equal(restored.tutorialHint.id,'jacks-cycle','Continue matches its restored opening hand');
 for(const mode of ['paused','drafting','cutscene','dead']){
  w.mode=mode;assert.equal(w.tutorialHint,null);
 }
 w.mode='playing';w.dying=.2;assert.equal(w.tutorialHint,null);w.dying=0;
 w.gates[0].open=true;assert.equal(w.tutorialHint,null);
 w.retry();assert.equal(w.tutorialHint,null,'an opened gate ends the opening lesson');
 const fresh=new StoryWorld();assert.equal(fresh.tutorialHint,null,'wait for the stranger scene');
 const practice=opening();practice.practice=true;assert.equal(practice.tutorialHint,null);
 const later=new StoryWorld();later.reset(1,{phase:'trail',seen:['prologue','stranger','pip']});assert.equal(later.tutorialHint,null);
});

test('after the card lesson the sword lesson shows until a swing lands',()=>{
 const w=opening();w.hinted.delete('sword');
 assert.equal(w.tutorialHint.id,'jacks-cycle','the card lesson comes first');
 w.gates[0].open=true;
 assert.equal(w.tutorialHint.id,'sword');assert.equal(w.tutorialHint.action,'sword');
 w.enemies=[];w.spawn(w.x+40,0);w.enemies[0].hp=99;w.facing=1;w.sword();tick(w,8);
 assert.ok(w.hinted.has('sword'));assert.equal(w.tutorialHint,null);
});
