import {test} from 'node:test';
import assert from 'node:assert/strict';
import {World,handPotential,bestDrawPreview} from '../model.mjs';
const tick=(w,n,input={})=>{for(let i=0;i<n;i++)w.step(1/60,input)};
const fixture=()=>{const w=new World();w.practiceDeal(3);w.enemies=[];return w;};
test('walking and dashing past a card never interrupt combat; collect requires a nearby mature drop',()=>{
 const w=fixture(),drop=w.cardDrops[0];w.x=drop.x;assert.equal(w.collectCard(),false);
 tick(w,30);assert.equal(w.mode,'playing');assert.equal(w.nearbyCardDrop.id,drop.id);
 tick(w,30,{axis:1,dash:true});assert.equal(w.mode,'playing');assert.equal(w.collectCard(),false);
 w.x=drop.x;w.y=drop.y;w.vx=0;w.step(1/60,{collect:true});assert.equal(w.mode,'drafting');
});
test('slot inspector freezes combat, wraps selection, and cancellation spends nothing',()=>{
 const w=fixture(),before=w.deck.checkpoint();assert.equal(w.openCardSelection(),true);
 const state={x:w.x,time:w.time,health:w.health};tick(w,60,{axis:1,sword:true,play:true});
 assert.deepEqual({x:w.x,time:w.time,health:w.health},state);
 w.moveCardSelection(-1);assert.equal(w.selectedSlot,4);w.moveCardSelection(1);assert.equal(w.selectedSlot,0);
 assert.equal(w.finishCardSelection(false),true);assert.equal(w.mode,'playing');assert.deepEqual(w.deck.checkpoint(),before);
});
test('slot inspector throws precisely the selected card or replaces it with the saved draw',()=>{
 const w=fixture(),chosen=w.deck.hand[1];w.openCardSelection();w.moveCardSelection(1);assert.equal(w.finishCardSelection(true),true);
 assert.ok(!w.deck.hand.includes(chosen));assert.equal(w.bolts[0].card,chosen);
 const v=fixture(),offer=v.deck.drafts[0];v.deck.choose(offer.id,0);const reserve=v.deck.reserve,old=v.deck.hand[4];
 v.openCardSelection();v.moveCardSelection(-1);assert.equal(v.finishCardSelection(true),true);
 assert.equal(v.deck.hand[4],reserve);assert.ok(v.deck.discard.includes(old));assert.equal(v.deck.reserve,null);assert.equal(v.bolts.length,0);
});
test('confirming a throw during cast recovery queues that exact card once instead of losing the action',()=>{
 const w=fixture();w.play();const chosen=w.deck.hand[0];w.openCardSelection();w.finishCardSelection(true);
 assert.equal(w.pendingSlotCard,chosen);assert.ok(w.deck.hand.includes(chosen));
 tick(w,24);assert.equal(w.pendingSlotCard,null);assert.ok(!w.deck.hand.includes(chosen));
 assert.equal(w.deck.discard.filter(id=>id===chosen).length,1);
 w.reset();assert.equal(w.pendingSlotCard,null);
});
test('future-hand hints count suits and distinct ranks, including ace-low straights',()=>{
 assert.deepEqual(handPotential([39,41,45]),['3 hearts toward a flush']);
 assert.ok(handPotential([12,13,27,41]).includes('4 of 5 ranks toward a straight'));
 assert.equal(handPotential([0,13,26,39]).some(h=>h.includes('straight')),false);
 assert.deepEqual(handPotential([0,1,2,3,4]),[]);
});

test('equivalent immediate draws recommend four suited cards over three',()=>{
 const best=bestDrawPreview([0,3,7,40,45],9);
 assert.equal(best.result.tier,0);assert.equal(best.slot,3);
 assert.ok(handPotential(best.hand).includes('4 spades toward a flush'));
 const made=bestDrawPreview([0,3,7,40,45],13);
 assert.equal(made.result.tier,1);assert.ok(made.hand.includes(0));
});
