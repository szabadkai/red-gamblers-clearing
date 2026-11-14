import {test} from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../model.mjs';
import {updateEnemies,nextTransfer} from '../enemies.mjs';
const tick=(w,n)=>{for(let i=0;i<n;i++)updateEnemies(w,1/60)};
test('scouts patrol outside awareness and chase nearby players',()=>{
 const w=new World();w.enemies=[];w.spawn(500,0);const e=w.enemies[0];e.rest=0;w.x=30;tick(w,1);assert.equal(e.state,'patrol');assert.ok(e.x>=e.left&&e.x<=e.right);
 w.x=330;tick(w,1);assert.equal(e.state,'chase');assert.equal(e.face,-1);
});
test('scouts commit to a telegraphed lunge; dodging behind them works',()=>{
 const w=new World();w.practiceDeal(0);w.enemies=[];w.spawn(300,0);const e=w.enemies[0];e.rest=0;w.x=230;
 tick(w,1);assert.equal(e.state,'windup');assert.equal(e.strikeDir,-1);tick(w,10);assert.equal(w.health,5);
 w.x=430;tick(w,25);assert.ok(e.x<300);assert.equal(w.health,5);
});
test('scouts can leap to a nearby higher ledge instead of camping beneath it',()=>{
 const w=new World();w.enemies=[];w.spawn(260,0);const e=w.enemies[0];e.rest=0;w.x=220;w.y=360;
 tick(w,180);assert.equal(e.y,360);assert.equal(e.surface,3);assert.equal(e.air,false);
});
test('brute slam is telegraphed, jumpable, and followed by recovery',()=>{
 const w=new World();w.practiceDeal(0);w.enemies=[];w.spawn(300,0,true);const e=w.enemies[0];e.rest=0;w.x=240;
 tick(w,1);assert.equal(e.state,'windup');assert.ok(e.wind>.7);w.y=360;tick(w,48);assert.equal(w.health,5);assert.equal(e.state,'recover');assert.ok(e.rest>0);
 w.y=420;tick(w,110);assert.equal(w.health,4);
});
test('hitting a winding-up enemy interrupts its attack',()=>{
 const w=new World();w.practiceDeal(0);w.enemies=[];w.spawn(240,0);const e=w.enemies[0];e.rest=0;tick(w,1);assert.equal(e.state,'windup');w.sword();for(let i=0;i<7;i++)w.step(1/60);assert.equal(e.state,'stagger');assert.equal(e.wind,0);assert.ok(e.rest>0);
});
test('scouts chase up multiple ledges then drop back to the ground',()=>{
 const w=new World();w.enemies=[];w.spawn(260,0);w.x=405;w.y=300;
 tick(w,900);const e=w.enemies[0];assert.equal(e.surface,4);assert.equal(e.y,300);
 w.x=400;w.y=420;tick(w,600);assert.equal(e.surface,0);assert.equal(e.y,420);
});
test('scouts and brutes cross a same-height ground gap without edge camping',()=>{
 for(const tough of [false,true]){const w=new World();w.enemies=[];w.spawn(585,0,tough);w.x=800;w.y=420;
 tick(w,1000);assert.equal(w.enemies[0].surface,1);assert.ok(w.enemies[0].x>=754);assert.equal(w.enemies[0].air,false);}
});
test('an unreachable ledge never causes a teleport or impossible jump',()=>{
 const w=new World();w.platforms=[{id:0,x:0,y:420,w:200},{id:1,x:210,y:100,w:200}];w.enemies=[];w.spawn(160,0);w.x=250;w.y=100;
 tick(w,600);assert.equal(w.enemies[0].surface,0);assert.equal(w.enemies[0].air,false);
});

test('runner chases faster than a scout and commits to a dodgeable lunge',()=>{
 const w=new World();w.practiceDeal(4);const e=w.enemies[0];e.rest=0;w.x=100;const start=e.x;tick(w,30);assert.ok(start-e.x>65);
 w.x=e.x-60;tick(w,1);assert.equal(e.state,'windup');assert.ok(e.wind<=.3);const launch=e.x;w.x=e.x+120;tick(w,31);assert.ok(e.x<launch-40);assert.equal(w.health,5);
});
test('mage locks aim at its tell; jumping evades the shot and hits interrupt casting',()=>{
 const w=new World();w.practiceDeal(5);const e=w.enemies[0];e.rest=0;tick(w,1);assert.equal(e.state,'windup');const aim=e.aimY;
 w.y=340;tick(w,50);assert.equal(w.enemyShots.length,1);assert.equal(e.aimY,aim);assert.ok(Math.abs(w.enemyShots[0].vy)<4);assert.equal(e.state,'recover');
 w.practiceDeal(5);const caster=w.enemies[0];caster.x=w.x+50;caster.rest=0;tick(w,1);w.sword();for(let i=0;i<7;i++)w.step(1/60);assert.equal(caster.state,'stagger');assert.equal(w.enemyShots.length,0);
});
test('guard telegraphs a physical slam that can be jumped and punished',()=>{
 const w=new World();w.practiceDeal(6);const e=w.enemies[0];e.rest=0;w.x=e.x-60;tick(w,1);assert.equal(e.state,'windup');assert.ok(e.wind>.8);
 w.y=350;tick(w,53);assert.equal(w.health,5);assert.equal(w.enemyShots.length,0);assert.ok(e.rest>1);assert.equal(w.rings[0].physical,true);
});
test('all new enemy types can route over a ground gap',()=>{
 for(const kind of ['runner','mage','guard']){
  const w=new World();w.enemies=[];w.spawn(585,0,kind);w.x=800;w.y=420;
  // Mage is deliberately outside its firing height so it must find a route.
  if(kind==='mage'){w.x=800;w.y=240;}
  tick(w,2400);assert.ok(w.enemies[0].surface!==0,kind+' must leave its original ground');
 }
});
test('a guard braces through sword hits once its slam has begun; a played hand still breaks it',()=>{
 const w=new World();w.practiceDeal(6);const e=w.enemies[0];e.rest=0;w.x=e.x-60;tick(w,1);assert.equal(e.state,'windup');const wind=e.wind,x=e.x;
 w.sword();for(let i=0;i<7;i++)w.step(1/60);
 assert.equal(e.hp,e.max-2);assert.equal(e.state,'windup');assert.ok(e.wind>0&&e.wind<wind);assert.equal(e.x,x);assert.ok(e.brace>0);assert.equal(w.deck.hits,1);
 w.play();for(let i=0;i<12;i++)w.step(1/60);assert.equal(e.hp,e.max-16);assert.equal(e.wind,0);assert.ok(e.rest>0);assert.ok(e.x>x);
});
test('a crow perches until it sees Red, hovers beside her, dives at where she stood and rests where it lands',()=>{
 const w=new World();w.practiceDeal(15);const e=w.enemies[0];e.rest=0;assert.equal(e.fly,true);
 w.x=20;tick(w,30);assert.equal(e.state,'idle');assert.equal(e.y,420);
 w.x=200;let n=0;while(e.state!=='windup'&&n++<120)tick(w,1);
 assert.equal(e.state,'windup');assert.deepEqual([e.x,e.y,e.aloft],[300,328,true]);assert.deepEqual([e.aimX,e.aimY],[200,420]);
 w.x=80;n=0;while(e.state!=='recover'&&n++<90)tick(w,1);
 assert.equal(w.health,5);assert.deepEqual([e.x,e.y,e.aloft],[200,420,false]);assert.ok(e.rest>.8);
 w.x=160;w.facing=1;w.sword();for(let i=0;i<7;i++)w.step(1/60);assert.equal(e.hp,e.max-2);
 const still=new World();still.practiceDeal(15);still.enemies[0].rest=0;still.x=200;tick(still,200);assert.equal(still.health,4);
 const away=new World();away.practiceDeal(15);const b=away.enemies[0];b.rest=0;away.x=200;tick(away,60);away.x=1500;tick(away,600);
 assert.deepEqual([b.x,b.y,b.state],[420,420,'idle']);
});
test('a bird killed in the air drops to the ground; flyers stay behind a closed briar gate',()=>{
 const w=new World();w.practiceDeal(15);const e=w.enemies[0];e.y=300;e.hp=0;w.removeDead();
 assert.equal(w.corpses[0].y,300);for(let i=0;i<30;i++)w.step(1/60);assert.equal(w.corpses[0].y,420);
 const trail=new World();trail.reset(1);const gate=trail.gates[0].x,bird=trail.enemies.find(f=>f.fly&&f.section===1);
 assert.ok(bird.left>gate&&bird.right<trail.gates[1].x);trail.x=gate-30;for(let i=0;i<300;i++)updateEnemies(trail,1/60);
 assert.equal(bird.state,'idle');assert.deepEqual([bird.x,bird.y],[bird.home.x,bird.home.y]);
});
test('a stag rears, then charges along its ledge: it can be jumped, will not flinch from the sword, and a hand stops it',()=>{
 const setup=()=>{const w=new World();w.practiceDeal(16);const e=w.enemies[0];e.rest=0;let n=0;while(e.state!=='windup'&&n++<200)tick(w,1);return [w,e];};
 let [w,e]=setup();assert.equal(e.kind,'charger');assert.equal(e.skin,'forest_stag');assert.equal(e.state,'windup');assert.ok(w.x-e.x>-221&&e.wind>.6);
 const from=e.x;let n=0;while(e.state!=='recover'&&n++<120)tick(w,1);assert.equal(w.health,4);assert.ok(from-e.x>250);assert.ok(e.rest>1);
 [w,e]=setup();n=0;while(e.state!=='lunge'&&n++<60)tick(w,1);w.y=360;while(e.state!=='recover'&&n++<200)tick(w,1);assert.equal(w.health,5);
 [w,e]=setup();w.x=e.x-50;w.sword();for(let i=0;i<7;i++)w.step(1/60);assert.equal(e.hp,e.max-2);assert.equal(e.state,'windup');assert.ok(e.brace>0);
 w.play();for(let i=0;i<12;i++)w.step(1/60);assert.equal(e.hp,e.max-16);assert.equal(e.wind,0);assert.notEqual(e.state,'lunge');
 [w,e]=setup();e.x=e.left+40;w.x=e.x-30;n=0;while(e.state!=='recover'&&n++<120)tick(w,1);assert.equal(e.x,e.left);
});
test('a wisp casts, then blinks past Red when she closes in; it cannot be hit mid-blink and casts before it blinks again',()=>{
 const w=new World();w.practiceDeal(17);const e=w.enemies[0];e.rest=0;assert.equal(e.blink,true);
 let n=0;while(!w.enemyShots.length&&n++<120)tick(w,1);assert.equal(w.enemyShots.length,1);
 w.x=300;n=0;while(e.state!=='blink'&&n++<200)tick(w,1);assert.equal(e.state,'blink');assert.equal(e.x,400);
 const hp=e.hp;w.facing=1;w.sword();for(let i=0;i<7;i++)w.step(1/60);assert.equal(e.hp,hp);assert.equal(w.deck.hits,0);
 n=0;while(e.state==='blink'&&n++<60)tick(w,1);assert.equal(e.x,110);assert.equal(e.y,420);
 w.x=150;tick(w,1);assert.equal(e.state,'windup');
 const far=new World();far.practiceDeal(17);const f=far.enemies[0];f.rest=0;tick(far,400);assert.equal(f.x,400);assert.ok(far.enemyShots.length>=0&&f.state!=='blink');
 const boxed=new World();boxed.practiceDeal(17);boxed.platforms=[{id:0,x:150,y:420,w:300,ground:true}];const b=boxed.enemies[0];b.rest=0;b.left=166;b.right=434;b.cast=true;boxed.x=320;tick(boxed,1);assert.equal(b.state,'windup');
});
test('a foe on a ledge that overhangs lower ground hops past the ledge end instead of back onto it',()=>{
 const w=new World();w.reset(4);const hop=nextTransfer(w.platforms,19,14),ledge=w.platforms[19];
 assert.ok(hop.target>ledge.x+ledge.w+8,'lands clear of its own ledge');
 w.enemies=[];w.gates.forEach(g=>g.open=true);w.spawn(3040,19);const e=w.enemies[0];e.rest=0;w.x=3300;w.y=420;tick(w,400);assert.equal(e.surface,14);assert.equal(e.y,420);
});
test('a witch alternates a bolt with a hex: marked ground that burns unless Red leaves it or interrupts her',()=>{
 const run=(w,n)=>{for(let i=0;i<n;i++)w.step(1/60)};
 const hexing=()=>{const w=new World();w.practiceDeal(18);const e=w.enemies[0];e.rest=0;
  let n=0;while(!w.enemyShots.length&&n++<120)run(w,1);assert.equal(w.enemyShots[0].look,'hex');w.enemyShots=[];
  n=0;while(!e.hexing&&n++<200)run(w,1);return [w,e];};
 let [w,e]=hexing();assert.equal(e.state,'windup');assert.equal(w.patches.length,1);assert.deepEqual([w.patches[0].x,w.patches[0].y],[w.x,420]);assert.equal(w.enemyShots.length,0);
 run(w,50);assert.equal(w.health,5);run(w,20);assert.equal(w.health,4);assert.equal(w.enemyShots.length,0);run(w,40);assert.equal(w.patches.length,0);
 [w,e]=hexing();w.x+=90;run(w,100);assert.equal(w.health,5);assert.equal(w.patches.length,0);
 [w,e]=hexing();w.damage(e,2,0);run(w,2);assert.equal(w.patches.length,0);run(w,80);assert.equal(w.health,5);
 const spore=new World();spore.practiceDeal(18);Object.assign(spore.enemies[0],{skin:'spore_mushroom',hex:false,look:'spore',rest:0});
 run(spore,60);assert.equal(spore.enemyShots[0].look,'spore');spore.enemyShots=[];run(spore,200);assert.equal(spore.patches.length,0);
});
test('brambles stay rooted and lash one way: out of reach or behind them is safe',()=>{
 const lash=x=>{const w=new World();w.practiceDeal(19);const e=w.enemies[0];e.rest=0;w.x=250;tick(w,1);assert.equal(e.state,'windup');assert.equal(e.strikeDir,-1);w.x=x;tick(w,60);return [w,e];};
 const still=new World();still.practiceDeal(19);const b=still.enemies[0];b.rest=0;assert.equal(b.rooted,true);tick(still,300);assert.equal(b.x,330);assert.equal(b.state,'idle');
 still.y=360;still.x=250;tick(still,300);assert.equal(b.x,330);assert.equal(b.air,false);
 assert.equal(lash(250)[0].health,4);assert.equal(lash(225)[0].health,4);assert.equal(lash(200)[0].health,5);assert.equal(lash(370)[0].health,5);
 const [w,e]=lash(200);assert.equal(e.state,'recover');assert.ok(e.rest>.9);assert.equal(e.x,330);
});
test('a living tree out of reach sends roots up where Red stood; leaving the spot or a played hand avoids them',()=>{
 const run=(w,n)=>{for(let i=0;i<n;i++)w.step(1/60)};
 const erupting=()=>{const w=new World();w.practiceDeal(20);const e=w.enemies[0];e.rest=0;run(w,1);return [w,e];};
 let [w,e]=erupting();assert.equal(e.erupts,true);assert.equal(e.state,'windup');assert.equal(e.erupting,true);
 assert.deepEqual([w.patches[0].look,w.patches[0].x,w.patches[0].y],['roots',w.x,420]);
 run(w,50);assert.equal(w.health,5);run(w,10);assert.equal(w.health,4);run(w,40);assert.equal(w.patches.length,0);
 assert.ok(e.specialCD>0);run(w,30);assert.notEqual(e.state,'windup');
 [w,e]=erupting();w.x-=70;run(w,90);assert.equal(w.health,5);
 [w,e]=erupting();w.sword();w.x=e.x-50;run(w,7);assert.equal(e.state,'windup');w.x=180;w.damage(e,14,0);run(w,2);assert.equal(w.patches.length,0);run(w,70);assert.equal(w.health,5);
});
test('a crowded mushroom that has spat bursts into a hanging spore cloud, then must spit again first',()=>{
 const run=(w,n)=>{for(let i=0;i<n;i++)w.step(1/60)};
 const w=new World();w.practiceDeal(21);const e=w.enemies[0];e.rest=0;assert.equal(e.cloud,true);
 let n=0;while(!w.enemyShots.length&&n++<120)run(w,1);assert.equal(w.enemyShots[0].look,'spore');w.enemyShots=[];
 w.x=e.x-60;w.invincible=0;n=0;while(!e.puffing&&n++<200)run(w,1);assert.equal(e.state,'windup');assert.equal(w.patches[0].look,'spores');
 run(w,30);assert.equal(w.health,5);run(w,10);assert.equal(w.health,4);assert.equal(w.enemyShots.length,0);
 w.x=e.x-200;run(w,110);assert.equal(w.patches.length,0);
 w.x=e.x-60;n=0;while(e.state!=='windup'&&n++<200)run(w,1);assert.equal(e.puffing,false);
});
test('the ghost hunter glides through Red to her far side and cannot be hit on the way',()=>{
 const w=new World();w.practiceDeal(22);const e=w.enemies[0];e.rest=0;assert.deepEqual([e.arrow,e.blink,e.phase],[true,true,true]);
 let n=0;while(!w.enemyShots.length&&n++<120)tick(w,1);assert.equal(w.enemyShots[0].arrow,true);
 w.x=300;n=0;while(e.state!=='blink'&&n++<200)tick(w,1);tick(w,14);assert.ok(e.x<400&&e.x>110,'part way');
 const hp=e.hp;w.damage(e,5,0);assert.equal(e.hp,hp);
 n=0;while(e.state==='blink'&&n++<60)tick(w,1);assert.equal(e.x,110);
});
test('a bear at half health roars once, then walks faster and slams sooner',()=>{
 const w=new World();w.practiceDeal(23);const e=w.enemies[0];e.rest=0;assert.equal(e.rage,true);w.x=20;
 tick(w,1);const calm=e.x;tick(w,30);const slow=Math.abs(e.x-calm);
 e.hp=e.max/2;tick(w,1);assert.equal(e.state,'roar');assert.equal(e.enraged,true);tick(w,50);assert.notEqual(e.state,'roar');
 const from=e.x;tick(w,30);assert.ok(Math.abs(e.x-from)>slow*1.4);
 w.x=e.x-60;let n=0;while(e.state!=='windup'&&n++<60)tick(w,1);assert.ok(e.wind<.5);
 e.hp=1;e.rest=0;e.state='chase';tick(w,1);assert.notEqual(e.state,'roar');
});
