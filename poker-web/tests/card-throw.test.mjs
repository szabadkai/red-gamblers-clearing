import {test} from 'node:test';
import assert from 'node:assert/strict';
import {World,evaluate,DAMAGE} from '../model.mjs';

const tick=1/60;
function arena(){
 const world=new World();
 world.practiceDeal(0);
 world.enemies=[];
 return world;
}

test('throw a spare card, hit a foe, then cast the pair left in hand',()=>{
 const w=arena();
 const card=w.deck.hand[3];
 w.spawn(w.x+80,0);
 const foe=w.enemies[0],hp=foe.hp;
 w.step(tick,{cardSlot:3});
 assert.equal(w.bolts[0].card,card);
 assert.equal(w.useSlot(0),false,'cooldown prevents a second spend');
 for(let i=0;i<30;i++)w.step(tick);
 assert.equal(foe.hp,hp-DAMAGE[0]);
 assert.equal(w.deck.hits,0);
 assert.deepEqual(w.deck.hand,[5,18,2,24]);
 assert.equal(evaluate(w.deck.hand).name,'Pair');
 w.step(tick,{play:true});
 assert.deepEqual(w.deck.hand,[2,24]);
 assert.deepEqual(new Set([...w.deck.hand,...w.deck.pile,...w.deck.discard]).size,52);
});

test('slot controls honor a saved replacement and never spend on invalid input or while paused',()=>{
 const w=arena();
 w.deck.preset([0,1,2,3,4]);
 const hand=[...w.deck.hand];
 w.mode='paused';
 assert.equal(w.useSlot(0),false);
 w.mode='playing';
 for(const slot of [-1,5,1.5,undefined])assert.equal(w.useSlot(slot),false);
 assert.deepEqual(w.deck.hand,hand);
 w.deck.hit();w.deck.hit();
 const offer=w.deck.hit(),pick=offer.cards[0];
 w.deck.choose(offer.id,0);
 w.step(tick,{cardSlot:0});
 assert.equal(w.deck.hand[0],pick);
 assert.equal(w.deck.reserve,null);
 assert.deepEqual(w.bolts,[]);
 assert.equal(w.cast,0);
});

test('the last card can be thrown, including card zero, and only one cast is issued per input frame',()=>{
 const w=arena();
 w.deck.preset([0,13]);
 w.step(tick,{play:true,cardSlot:0});
 assert.equal(w.bolts.length,1);
 assert.equal(w.bolts[0].tier,1);
 w.deck.preset([0]);w.cast=0;
 assert.equal(w.useSlot(0),true);
 assert.equal(w.bolts.at(-1).card,0);
 assert.deepEqual(w.deck.discard,[0]);
 assert.deepEqual(w.deck.hand,[]);
 assert.equal(w.dark,0);
});
