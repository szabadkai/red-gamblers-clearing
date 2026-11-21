import test from 'node:test';
import assert from 'node:assert/strict';
import {World,DEATH_TIME} from '../model.mjs';
import {playerClip,playerFrame} from '../animation.mjs';
import {storybookFrame,storybookForm} from '../storybook.mjs';

test('distinct storybook melee strokes contact at the simulation damage beat',()=>{
 const w=new World();w.practiceDeal(0);w.enemies=[];w.spawn(w.x+30,0);
 const e=w.enemies[0];e.hp=100;w.sword();
 assert.equal(storybookFrame(w,playerClip(w).state,0),96);
 for(let i=0;i<7;i++)w.step(1/60);
 assert.equal(e.hp,98);
 assert.equal(storybookFrame(w,playerClip(w).state,.117),98);
 assert.equal(storybookFrame(w,'attack2',.117),106);
 assert.equal(playerFrame('attack1',w,.117),1);
});

test('movement uses dedicated frames and preserves original stride and airtime timing',()=>{
 for(const dark of [0,6]){
  const w={dark},period=10/(dark?18:16);
  assert.equal(storybookFrame(w,'run',0),64);
  assert.equal(storybookFrame(w,'run',period/2),68);
  assert.equal(storybookFrame(w,'run',period+.0001),64);
 }
 assert.equal(storybookFrame({},'jump',3),75);
 assert.equal(storybookFrame({},'fall',3),79);
 assert.equal(storybookFrame({land:.1},'run',0),84);
 assert.equal(storybookFrame({land:.03},'run',0),85);
 assert.equal(storybookFrame({dash:.14},'dash',0),80);
 assert.equal(storybookFrame({dash:.07},'dash',0),82);
 assert.equal(storybookFrame({dash:.001},'dash',0),83);
});

test('blink and look retain their original cadence instead of substituting a long blink loop',()=>{
 assert.equal(storybookFrame({},'idle_blink',2),0);
 assert.equal(storybookFrame({},'idle_blink',3.2),4);
 assert.equal(storybookFrame({},'idle_blink',3.35),0);
 assert.equal(storybookFrame({idleTime:4.01},'look',0),88);
 assert.equal(storybookFrame({idleTime:4.8},'look',.8),93);
});

test('hurt and defeat override movement and combat poses',()=>{
 assert.equal(storybookFrame({hurtTime:.4},'run',2),48);
 assert.equal(storybookFrame({hurtTime:.001},'attack1',2),55);
 assert.equal(storybookFrame({dying:DEATH_TIME,hurtTime:.4},'run',2),56);
 assert.equal(storybookFrame({dying:.001},'run',2),63);
});

test('morph collapses, switches form inside the cloak, and unfolds in both directions',()=>{
 for(const form of ['light','dark']){
  const clip={form,state:'transform'},other=form==='light'?'dark':'light';
  for(const [remaining,pose,color] of [[1,120,form],[.51,123,form],[.49,123,other],[.001,120,other]]){
   const w={transform:remaining,morphDuration:1};
   assert.equal(storybookFrame(w,'transform',0),pose);
   assert.equal(storybookForm(w,clip),color);
  }
  assert.equal(storybookForm({transform:.1,morphDuration:1},{form,state:'attack1'}),form);
 }
 assert.equal(storybookFrame({cast:.36},'attack3',0),112);
 assert.equal(storybookFrame({cast:.001},'attack3',0),119);
});
