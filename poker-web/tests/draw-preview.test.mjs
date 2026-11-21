import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Deck,evaluate,previewDraw} from '../model.mjs';

test('draw preview identifies every trips swap and agrees with real replacements',()=>{
 const hand=[5,18,2,9,24],before=[...hand];
 const options=previewDraw(hand,31);
 assert.equal(options.length,5);
 assert.deepEqual(options.filter(o=>o.result.tier===3).map(o=>o.slot),[2,3,4]);
 for(const option of options){
  const deck=new Deck();deck.preset(hand);deck.reserve=31;
  assert.equal(deck.replace(option.slot),true);
  assert.deepEqual(option.result,evaluate(deck.hand));
  assert.deepEqual(option.hand,deck.hand);
 }
 assert.deepEqual(hand,before);
});

test('partial and empty hands preview adding card zero without a replacement',()=>{
 for(const hand of [[],[13],[13,26,39]]){
  const [option]=previewDraw(hand,0);
  assert.equal(option.slot,null);
  assert.deepEqual(option.hand,[...hand,0]);
  assert.deepEqual(option.result,evaluate([...hand,0]));
 }
});

test('preview recognizes ace-low straight flush and loss of an existing combination',()=>{
 const hand=[12,0,1,2,17];
 assert.equal(previewDraw(hand,3)[4].result.tier,8);
 const flush=[0,2,5,8,11];
 assert.ok(previewDraw(flush,26).every(o=>o.result.tier<5));
 assert.deepEqual(flush,[0,2,5,8,11]);
});
