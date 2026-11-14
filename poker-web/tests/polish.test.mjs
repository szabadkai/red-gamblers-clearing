import {test} from 'node:test';
import assert from 'node:assert/strict';
import {enemyFrame,enemySprite,characterSize,playerAnchor,PIXEL,snap,castShape,shakeOffset} from '../art.mjs';
import {World} from '../model.mjs';
import {updateEnemies} from '../enemies.mjs';
test('idle has its own changing frames; walk and combat use separate sequences',()=>{
 const e={id:0,state:'idle',walk:0,air:false};const idle=new Set([0,.25,.5,.75].map(t=>enemyFrame(e,t)));
 assert.ok(idle.size>=3);e.state='chase';assert.equal(enemyFrame(e,0),150);e.state='windup';assert.equal(enemyFrame(e,0),86);
});
test('sprite pitch and anchors are explicit, with distinct light/dark attack pivots',()=>{
 assert.equal(PIXEL,2);assert.equal(snap(13),14);assert.equal(playerAnchor('dark','attack1',65),-52);
 assert.equal(playerAnchor('light','attack1',52),-36);assert.ok(castShape(5).height>castShape(0).height);
});
test('sword impact waits for the contact pose and cannot hit twice per swing',()=>{
 const w=new World();w.practiceDeal(0);w.enemies=[];w.spawn(220,0);w.enemies[0].hp=100;w.sword();
 assert.equal(w.enemies[0].hp,100);for(let i=0;i<7;i++)w.step(1/60);assert.equal(w.enemies[0].hp,98);
 for(let i=0;i<10;i++)w.step(1/60);assert.equal(w.enemies[0].hp,98);assert.equal(w.deck.hits,1);
});
test('enemy melee creates no magical projectile or magic burst',()=>{
 const w=new World();w.practiceDeal(0);w.enemies=[];w.spawn(230,0,true);w.enemies[0].rest=0;
 for(let i=0;i<50;i++)updateEnemies(w,1/60);
 assert.equal(w.bolts.length,0);assert.ok(w.rings.every(r=>r.physical));
});
test('poker freezes the impact pose and simulation, then resumes without catch-up',()=>{
 const w=new World();w.practiceDeal(2);w.play();assert.equal(w.hitStop,5/60);
 const pose={x:w.x,y:w.y,time:w.time,dark:w.dark,cast:w.cast,life:w.impacts[0].life};
 for(let i=0;i<5;i++)w.step(1/60,{axis:1});
 assert.deepEqual({x:w.x,y:w.y,time:w.time,dark:w.dark,cast:w.cast,life:w.impacts[0].life},pose);
 assert.equal(w.hitStop,0);w.step(1/60,{axis:1});assert.ok(w.x>pose.x);assert.equal(w.time,pose.time+1/60);
 w.mode='paused';const shake=w.shakeTime;w.step(1);assert.equal(w.shakeTime,shake);
 w.reset();assert.equal(w.hitStop,0);assert.equal(w.shakeTime,0);
});
test('feedback requires a poker hit and a piercing hand pulses only once',()=>{
 const miss=new World();miss.practiceDeal(1);miss.enemies=[];miss.play();
 for(let i=0;i<100;i++)miss.step(1/60);assert.equal(miss.hitStop,0);assert.equal(miss.shakeTime,0);
 const w=new World();w.practiceDeal(1);w.enemies.forEach(e=>{e.hp=200;e.rest=10});w.play();
 let pulses=0,wasStopped=false;
 for(let i=0;i<110;i++){w.step(1/60);const stopped=w.hitStop>0;if(stopped&&!wasStopped)pulses++;wasStopped=stopped;}
 assert.equal(pulses,1);assert.ok(w.enemies.every(e=>e.hp===160));assert.equal(w.shakeTime,0);
 const sword=new World();sword.practiceDeal(0);sword.enemies=[];sword.spawn(220,0);sword.sword();
 for(let i=0;i<7;i++)sword.step(1/60);assert.equal(sword.hitStop,0);assert.equal(sword.shakeTime,0);
});
test('camera shake stays on the pixel grid, settles, and obeys Motion Off',()=>{
 for(let i=0;i<14;i++){const offset=shakeOffset(.225-i/60,.225,8);assert.equal(Math.abs(offset.x%2),0);assert.equal(Math.abs(offset.y%2),0);assert.ok(Math.abs(offset.x)<=8&&Math.abs(offset.y)<=8);}
 assert.deepEqual(shakeOffset(0,.225,8),{x:0,y:0});
 assert.deepEqual(shakeOffset(.225,.225,8,true),{x:0,y:0});
});

test('all characters share native pixel pitch and scouts use the smaller body',()=>{
 for(const kind of ['scout','runner','mage','guard','brute'])for(const state of ['idle','chase','windup','stagger']){
  const f=enemySprite({kind,id:0,state,walk:.3},.5),size=characterSize(f.w,f.h);
  assert.equal(size.w/f.w,PIXEL);assert.equal(size.h/f.h,PIXEL);
  if(kind!=='brute')assert.equal(f.w,15);
 }
 assert.equal(enemySprite({kind:'scout',id:0,state:'idle'},0).y,202);
 assert.deepEqual(characterSize(15,18),{w:30,h:36});
});
test('a jump, its landing and a ground dash each kick up dust that settles',()=>{
 const w=new World();w.practiceDeal(0);w.enemies=[];const kinds=[];
 const run=(n,input)=>{for(let i=0;i<n;i++){const before=w.dust.length;w.step(1/60,i?{}:input);if(w.dust.length>before)kinds.push(w.dust.at(-1).kind);}};
 run(80,{jump:true});assert.deepEqual(kinds,['jump','land']);assert.equal(w.dust.length,0);
 run(1,{dash:true});assert.deepEqual(kinds,['jump','land','dash']);
 run(1,{jump:true});w.dashCD=0;run(1,{dash:true});assert.equal(kinds.filter(k=>k==='dash').length,1);
});
test('every third landed swing in a row is a heavy finisher; a pause or a hit taken breaks the chain',()=>{
 const w=new World();w.practiceDeal(0);w.enemies=[];w.spawn(220,0);const e=w.enemies[0];e.hp=500;
 const swing=()=>{const hp=e.hp;e.x=220;e.rest=99;w.sword();for(let i=0;i<24;i++)w.step(1/60);return hp-e.hp;};
 assert.deepEqual([swing(),swing(),swing(),swing(),swing(),swing()],[2,2,5,2,2,5]);
 assert.equal(w.events.filter(name=>name==='finisher').length,2);
 swing();swing();e.rest=99;for(let i=0;i<80;i++)w.step(1/60);assert.equal(swing(),2);
 swing();assert.equal(w.combo,2);w.invincible=0;w.hurt(e.x);assert.equal(w.combo,0);
 w.dark=6;w.x=180;w.y=420;w.vx=0;w.vy=0;w.knock=0;w.facing=1;assert.deepEqual([swing(),swing(),swing()],[4,4,10]);
});
test('a pair or better that spends a heart card mends one heart; high cards, kickers and full health do not',()=>{
 const play=(cards,health)=>{const w=new World();w.practiceDeal(0);w.enemies=[];w.deck.preset(cards);w.health=health;w.play();return w;};
 assert.equal(play([5,44,2,9,24],3).health,4);assert.match(play([5,44,2,9,24],3).banner,/PAIR · \+1 HEART/);
 assert.equal(play([5,18,2,9,24],3).health,3);assert.equal(play([5,18,40,9,24],3).health,3);
 assert.equal(play([49,0,15,30,7],3).health,3);assert.equal(play([5,44,2,9,24],5).health,5);
 assert.equal(play([39,40,41,42,43],1).health,2);
});
test('the last hit plays out as a slowed death beat before the retry screen; a pit ends it at once',()=>{
 const w=new World();w.practiceDeal(0);w.enemies=[];w.health=1;w.hurt(w.x+40);
 assert.equal(w.health,0);assert.equal(w.mode,'playing');assert.ok(w.dying>0);
 const x=w.x;for(let i=0;i<30;i++)w.step(1/60,{axis:1,jump:true,sword:true});
 assert.equal(w.mode,'playing');assert.ok(w.x<x,'knocked back, input ignored');assert.equal(w.attack,0);
 w.invincible=0;w.hurt();assert.equal(w.health,0);
 for(let i=0;i<40;i++)w.step(1/60);assert.equal(w.mode,'dead');
 const pit=new World();pit.practiceDeal(0);pit.health=1;pit.hurt();pit.y=600;pit.step(1/60);pit.step(1/60);pit.step(1/60);pit.step(1/60);
 for(let i=0;i<12;i++)pit.step(1/60);assert.equal(pit.mode,'dead');assert.equal(pit.health,0);
 w.reset();assert.equal(w.dying,0);
});
