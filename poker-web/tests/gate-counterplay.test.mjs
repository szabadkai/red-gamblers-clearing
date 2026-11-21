import {test} from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../model.mjs';
import {StoryWorld} from '../story.mjs';
import {updateBoss,CLUB_RECOVERY,cutBossHazards} from '../bosses.mjs';

test('gate guidance only appears nearby, picks a living section foe, expires, and rearms on return',()=>{
 const w=new World(()=>.5),gate=w.wall;
 w.enemies=[
  {id:1,x:gate.x-180,y:240,hp:2,section:0},
  {id:2,x:gate.x-40,y:420,hp:0,section:0},
  {id:3,x:gate.x-50,y:420,hp:4,section:1},
  {id:4,x:gate.x-400,y:420,hp:4,section:0}
 ];
 w.updateGates(1/60);assert.equal(w.gateGuide,null);assert.equal(w.foesAhead,2);
 w.x=gate.x-70;w.updateGates(1/60);assert.equal(w.guidedFoe.id,1);
 w.enemies[0].hp=0;w.updateGates(1/60);assert.equal(w.guidedFoe.id,4,'retarget a defeated foe');
 w.updateGates(3);assert.equal(w.gateGuide,null);
 w.updateGates(1);assert.equal(w.gateGuide,null,'standing at the gate does not leave a permanent marker');
 w.x=gate.x-200;w.updateGates(1/60);w.x=gate.x-60;w.updateGates(1/60);assert.equal(w.guidedFoe.id,4);
 w.enemies[3].hp=0;w.updateGates(1/60);assert.equal(gate.open,true);assert.equal(w.gateGuide,null);
 assert.match(w.banner,/GATE SAVED/);
});

test('lantern posts explicitly promise fall recovery, while retry still starts at the saved gate',()=>{
 const w=new World(()=>.5),x=w.clearing.checkpoints[0];
 w.enemies=[];w.x=x+1;w.y=420;w.step(1/60);
 assert.match(w.banner,/FALL RECOVERY/);assert.equal(w.checkpoint.x,x);
 const savedX=w.gates.filter(g=>g.open).at(-1).x-40;
 w.retry();assert.equal(w.x,savedX);
});

test('a landed club pair extends boss recovery once, and each later recovery permits one extension',()=>{
 const w=new StoryWorld(()=>.5);w.reset(0,{phase:'boss',seen:['prologue']});
 const b=w.boss;b.x=300;b.state='recover';b.timer=1.2;
 w.deck.preset([35,48,0,15,30]);w.play();
 for(let i=0;i<9;i++)w.step(1/60);
 assert.equal(b.clubExtended,true);assert.ok(b.timer>1.2,'club impact adds a real opening');
 const first=b.timer;w.knockBack(b,1);assert.equal(b.timer,first,'repeated clubs cannot chain a permanent stun');
 b.state='strike';b.pattern='roots';b.duration=.25;b.elapsed=.25;b.phase=1;
 updateBoss(w,1/60);assert.equal(b.state,'recover');assert.equal(b.clubExtended,false);
 const next=b.timer;w.knockBack(b,1);assert.equal(b.timer,next+CLUB_RECOVERY);
 b.state='windup';b.timer=1;w.knockBack(b,1);assert.equal(b.timer,1,'clubs cannot cancel a tell or attack');
});

test('guarded club shots do not stun Rowan; an ordinary sword does not extend recovery',()=>{
 const w=new StoryWorld(()=>.5);w.reset(2,{phase:'boss',seen:['prologue']});
 const b=w.boss;b.x=300;b.state='windup';b.timer=2;b.wind=2;b.pattern='cut';
 const hp=b.hp;w.deck.preset([35,48,0,15,30]);w.play();for(let i=0;i<9;i++)w.step(1/60);
 assert.equal(b.hp,hp);assert.ok(!b.clubExtended);
 b.state='recover';b.timer=1;w.damage(b,2,0,true);assert.equal(b.timer,1);
});

test('spade pair bolts cut aligned hazards without removing the beam or unrelated ground attacks',()=>{
 const w=new StoryWorld(()=>.5);w.reset(0,{phase:'boss',seen:['prologue']});
 w.boss=null;w.enemies=[];
 const hazard=(kind,x,y,w=30,h=58)=>({kind,x,y,w,h,delay:.8,life:3,age:0});
 w.hazards=[hazard('roots',270,420),hazard('silk',310,420),hazard('axe',350,397,30,30),hazard('ring',390,420,30,20),
  hazard('silk',300,200),hazard('slam',330,420),hazard('landing',340,420),hazard('shadow',350,420)];
 w.deck.preset([5,18,0,15,30]);w.play();for(let i=0;i<18;i++)w.step(1/60);
 assert.deepEqual(w.hazards.map(h=>h.kind),['silk','slam','landing','shadow']);
 assert.equal(w.bolts.length,1);assert.equal(w.texts.filter(t=>t.text==='CUT').length,4);
});

test('hazard cuts use swept bounds in either direction; nonpiercing shots and distant heights cannot cut',()=>{
 const w={hazards:[],texts:[],impacts:[],emit:()=>{}},hazard=()=>({kind:'axe',x:250,y:200,w:30,h:30,delay:0,life:1});
 w.hazards=[hazard()];assert.equal(cutBossHazards(w,{x:200,y:200,tier:1},300),0);
 assert.equal(cutBossHazards(w,{x:200,y:250,tier:3},300),0);
 assert.equal(cutBossHazards(w,{x:200,y:200,tier:3},300),1);
 assert.equal(w.hazards.length,0);
});
