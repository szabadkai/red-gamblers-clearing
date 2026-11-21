import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {drawStoryActor, STORY_IMAGES} from '../story-art.mjs';
import {StoryWorld} from '../story.mjs';
import {BOSS_STATS, makeBoss, updateBoss} from '../bosses.mjs';

function cell(boss, time=0) {
  let drawn;
  const sheet={};
  const ctx={
    save(){}, restore(){}, translate(){}, scale(){},
    drawImage(image,x,y,w,h,dx,dy,dw,dh){
      assert.equal(image,sheet);
      assert.deepEqual([w,h,dx,dy,dw,dh],[64,64,-32,-64,64,64]);
      drawn=[x/w,y/h];
    }
  };
  drawStoryActor(ctx,new Map([['boss-widow',sheet]]),'widow',0,0,time,{state:boss.state,boss});
  return drawn;
}

test('Widow walks on distance and plants her feet inside attack range',()=>{
  const w=new StoryWorld();
  w.practiceDeal(13);
  const b=w.boss, startX=b.x, steps=new Set();
  for(let tick=0;tick<180 && b.x-w.x>BOSS_STATS.widow.reach;tick++){
    updateBoss(w,1/60);
    const [frame,row]=cell(b);
    assert.equal(row,1);
    steps.add(frame);
  }
  assert.equal(steps.size,8);
  assert.ok(b.x-w.x<=BOSS_STATS.widow.reach);
  assert.ok(Math.abs(b.walk-(startX-b.x))<1e-6);
  const walked=b.walk;
  updateBoss(w,1/60);
  assert.equal(b.state,'approach');
  assert.equal(b.walk,walked);
  assert.equal(cell(b,1.1)[1],0);
});

test('each Widow attack reserves its release and follow-through for the corresponding combat phases',()=>{
  const b=makeBoss('widow',1),{tell,recovery}=BOSS_STATS.widow;
  for(const [pattern,row] of [['silk',2],['rings',3]]){
    b.pattern=pattern;
    for(const [frame,state,progress] of [[0,'windup',0],[1,'windup',.3],[2,'windup',.6],[3,'windup',.99],[4,'strike',0],[5,'strike',.8]]){
      Object.assign(b,{state,wind:tell*(1-progress),duration:.3,elapsed:.3*progress});
      assert.deepEqual(cell(b),[frame,row]);
    }
    for(const [elapsed,frame] of [[0,6],[.21,7]]){
      Object.assign(b,{state:'recover',timer:recovery-elapsed});
      assert.deepEqual(cell(b),[frame,row]);
    }
    b.timer=recovery-.5;
    assert.equal(cell(b)[1],0);
  }
  b.hurt=.3;
  assert.deepEqual(cell(b),[0,4]);
  Object.assign(b,{state:'dead',deadTime:1.8});
  assert.deepEqual(cell(b),[7,5]);
  const png=readFileSync(new URL('../'+STORY_IMAGES['boss-widow'],import.meta.url));
  assert.deepEqual([png.readUInt32BE(16),png.readUInt32BE(20)],[8*64,6*64]);
});
