import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Deck,scoringPlays,evaluate} from '../model.mjs';
import {StoryWorld,saveStory} from '../story.mjs';

test('each choice spends exactly the cards it highlights, including alternate suits in a full house',()=>{
 for(const hand of [[],[0],[0,13],[48,35,5,18,1],[0,13,26,1,14],[0,13,26,39,3],[12,0,1,2,3]]){
  const plays=scoringPlays(hand);
  assert.deepEqual(plays[0],evaluate(hand));
  const subsets=plays.map(play=>[...play.indices].sort().join(','));
  assert.equal(new Set(subsets).size,plays.length);
  for(const [i,play] of plays.entries()){
   const spent=play.indices.map(slot=>hand[slot]),result=evaluate(spent);
   assert.equal(result.tier,play.tier);
   assert.deepEqual(result.suits,play.suits);
   assert.equal(result.indices.length,spent.length);
   if(i)assert.ok(play.tier>0&&play.tier<=plays[i-1].tier);
  }
 }
 const fullHouse=scoringPlays([0,13,26,1,14]);
 assert.deepEqual(fullHouse.map(p=>p.tier),[6,3,2,2,2,1,1,1,1]);
});

test('the split-pair practice deals a healing pair and a piercing pair that can be cast in succession',()=>{
 const w=new StoryWorld(()=>.4);
 w.practiceDeal(24);
 assert.equal(saveStory({setItem:()=>assert.fail('practice wrote a save')},w),false);
 assert.equal(w.deck.selectedPlay.name,'Two pair');
 w.step(1/60,{cycle:true,play:true});
 assert.equal(w.health,5);
 assert.equal(w.bolts[0].damage,14);
 assert.equal(w.bolts[0].impact.knock,true);
 assert.equal(w.bolts[0].impact.pierce,false);
 assert.deepEqual(w.deck.hand,[5,18,1]);
 assert.equal(w.deck.selectedPlay.name,'Pair');
 assert.equal(w.deck.playIndex,0);
 for(let i=0;i<24;i++)w.step(1/60);
 w.step(1/60,{play:true});
 assert.equal(w.bolts.at(-1).impact.pierce,true);
 assert.equal(w.deck.hits,1);
 assert.deepEqual(w.deck.hand,[1]);
 assert.equal(w.tally.best,1);
});

test('cycling wraps, respects paused and dying states, and leaves every card in place',()=>{
 const w=new StoryWorld();w.practiceDeal(24);
 const before=structuredClone([w.deck.hand,w.deck.pile,w.deck.discard]);
 for(const mode of ['paused','drafting','cutscene','won','dead']){
  w.mode=mode;assert.equal(w.cyclePlay(),false);
 }
 w.mode='playing';w.dying=.5;assert.equal(w.cyclePlay(),false);assert.equal(w.play(),false);
 w.dying=0;
 for(let i=1;i<=3;i++){assert.equal(w.cyclePlay(),true);assert.equal(w.deck.playIndex,i%3);}
 assert.deepEqual([w.deck.hand,w.deck.pile,w.deck.discard],before);
 w.step(1/60,{play:true});
 assert.equal(w.bolts[0].tier,2);
 assert.deepEqual(w.deck.hand,[1]);
 assert.equal(w.cyclePlay(),false);
});

test('throws, saved swaps, fresh presets and incoming cards restore the best available play',()=>{
 const hand=[48,35,5,18,1],deck=new Deck(()=>.5);
 for(const change of ['throw','replace','preset','draw']){
  deck.preset(hand);deck.nextPlay();
  if(change==='throw')deck.play(4);
  if(change==='replace'){deck.reserve=deck.take();deck.replace(1);}
  if(change==='preset')deck.preset(hand);
  if(change==='draw'){deck.play(4);deck.nextPlay();deck.draw();}
  assert.deepEqual(deck.selectedPlay,evaluate(deck.hand));
  assert.equal(deck.playIndex,0);
 }
 deck.preset(hand);deck.nextPlay();
 const offer=deck.reward(),saved=offer.cards[0];deck.choose(offer.id,0);
 assert.equal(deck.selectedPlay.tier,1,'banking leaves the same hand selected');
 deck.play();
 assert.deepEqual(deck.hand,[5,18,1,saved]);
 const cards=[...deck.hand,...deck.pile,...deck.discard];
 assert.equal(cards.length,52);assert.equal(new Set(cards).size,52);
});
