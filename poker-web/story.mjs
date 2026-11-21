import {World,SPLIT_PAIRS} from './model.mjs';
import {CLEARINGS,loadJourney} from './journey.mjs';
import {STAGES,SCENES,arenaPlatforms} from './story-data.mjs';
import {makeBoss,damageBoss,updateBoss,updateHazards} from './bosses.mjs';

export const STORY_SAVE_KEY='red.poker.story.v3';
// A beaten boss plays its death row and lies there this long before the outro starts.
export const BOSS_DEATH=2.4;
// Clearing grades: about twice a tireless test player's time for the trail and its boss (Thorn House includes the rescue).
export const PAR=[180,195,190,240,330];
export const GRADES=[['S',95],['A',80],['B',60],['C',40],['D',0]];
export const RECORDS_KEY='red.poker.records';
export function gradeClearing(stage,t){
 const late=Math.min(20,Math.floor(Math.max(0,t.time-PAR[stage])/4));
 const score=Math.max(0,Math.min(100,100-6*t.hurt-15*t.retries-late+(t.best>=5?5:0)));
 return {score,grade:GRADES.find(([,min])=>score>=min)[0],time:t.time,hurt:t.hurt,retries:t.retries,best:t.best,par:PAR[stage]};
}
export function loadRecords(storage){
 try{const r=JSON.parse(storage.getItem(RECORDS_KEY)||'{}');return r&&typeof r==='object'&&!Array.isArray(r)?r:{};}catch{return {};}
}
// Keeps the best score and the best time separately; says which of them this clearing beat.
export function saveRecord(storage,id,result){
 const all=loadRecords(storage),old=all[id],better=!old||result.score>old.score,faster=!old||result.time<old.time;
 all[id]={score:better?result.score:old.score,grade:better?result.grade:old.grade,time:faster?result.time:old.time};
 try{storage.setItem(RECORDS_KEY,JSON.stringify(all));}catch{}
 return {better,faster,first:!old};
}
const PHASES=['trail','lantern','boss','inside','garden','cleared','home','complete'];
const allScenes=new Set(Object.keys(SCENES));
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export class StoryWorld extends World{
 reset(stageIndex=0,progress=null){
  super.reset(stageIndex);
  this.storyPhase='trail';this.storyLocation='trail';this.worldWidth=this.width;this.bossPractice=false;
  this.seen=new Set(progress?.seen||[]);this.dialogue=null;this.boss=null;this.hazards=[];
  this.storyRevision=(this.storyRevision||0)+1;this.sceneClock=0;this.rescueClock=0;
  this.lastEncounterX=0;this.pendingVictory=false;this.bossCorpse=null;this.victoryDelay=0;this.knots=[];
  if(progress?.tally)this.tally={...progress.tally};
  this.result=progress?.phase==='cleared'&&progress.tally?gradeClearing(stageIndex,this.tally):null;
  const phase=progress?.phase||'trail';
  this.lanternDeck=progress?.lanternDeck??null;
  if(phase==='trail'&&stageIndex===0&&!progress?.gates)this.deck.preset(SPLIT_PAIRS);
  if(phase==='lantern'){
   this.resume(this.gates.length,[]);this.enemies=[];this.x=this.clearing.exit.x;this.y=this.clearing.exit.y;
   this.deck.restore(this.lanternDeck);this.storyPhase='lantern';this.mode='lantern';
  }
  else if(phase==='boss'||phase==='garden')this.setupArena(phase);
  else if(phase==='inside')this.setupInside();
  else if(phase==='cleared'){this.setupArena(stageIndex===4?'garden':'boss');this.enemies=[];this.boss=null;this.storyPhase='cleared';this.mode='won';}
  else if(phase==='home'||phase==='complete'){this.setupHome();if(phase==='complete'){this.storyPhase='complete';this.mode='won';}}
  // A saved trail resumes at its last opened gate with the embers already carried.
  if(phase==='trail'&&progress?.gates)this.resume(progress.gates,(progress.embers||[0,1,2]).map(i=>({x:this.clearing.embers[i][0],y:this.clearing.embers[i][1]})));
  if(progress?.dialogue)this.startScene(progress.dialogue.id,progress.dialogue.index);
  else if(phase==='trail'&&stageIndex===0&&!this.seen.has('prologue'))this.startScene('prologue');
 }
 get stageStory(){return STAGES[this.stageIndex];}
 get calm(){return !this.practice&&this.storyPhase==='trail'&&!this.seen.has(this.stageStory.encounter);}
 // The opening lesson follows the cards actually held, rather than a timed banner.
 // Retrying/reloading the first section restores its deal, so the lesson naturally restarts;
 // spending or replacing either pair and opening the first gate make its advice disappear.
 get tutorialHint(){
  if(this.practice||this.stageIndex!==0||this.storyPhase!=='trail'||this.mode!=='playing'||this.dying>0||
   !this.seen.has('stranger')||this.gates[0]?.open)return null;
  const hand=this.deck.hand,jacks=SPLIT_PAIRS.slice(0,2),sevens=SPLIT_PAIRS.slice(2,4);
  const has=cards=>cards.every(card=>hand.includes(card));
  const cards=has(jacks)?jacks:has(sevens)?sevens:null;
  if(!cards)return null;
  const jackLesson=cards===jacks,play=this.deck.selectedPlay;
  const selected=play.tier===1&&play.indices.length===2&&play.indices.every(index=>cards.includes(hand[index]));
  const name=jackLesson?'jacks':'sevens',action=selected?'play':'cycle';
  return {id:`${name}-${action}`,action,cards,text:`${selected?'Cast':'Select'} the ${name}`,
   detail:jackLesson?(has(sevens)?'Keep the sevens for a piercing shot.':'This pair knocks foes back and can mend a heart.'):
    'Face foes in a line: the spade pierces, the diamond earns a draw notch.'};
 }
 get objective(){
  if(this.practice)return this.arena?'Practice arena':`Find the three embers · ${this.collected}/3`;
  if(this.dialogue)return SCENES[this.dialogue.id].title;
  if(this.storyPhase==='inside'){
   const remaining=this.knots.filter(k=>k.hp>0).length;
   return remaining ? `Free Grandmother · ${3-remaining}/3 knots` : 'Follow the bell to the opening on the right';
  }
  if(this.storyPhase==='home')return 'Walk home with Grandmother';
  if(this.boss)return this.boss.kind==='rowan'?'Disarm the Huntsman':this.boss.garden?'Open the road home':this.stageStory.title;
  return this.stageStory.objective;
 }
 startScene(id,index=0){
  this.dialogue={id,index:clamp(index,0,SCENES[id].lines.length-1)};
  this.mode='cutscene';this.vx=0;this.vy=0;this.swordPending=0;this.attack=0;this.cast=0;
  this.buffer=0;this.dash=0;this.sceneClock=0;this.storyRevision++;
 }
 advanceDialogue(skip=false){
  if(this.mode!=='cutscene'||!this.dialogue)return false;
  const {id,index}=this.dialogue;
  if(!skip&&index<SCENES[id].lines.length-1){this.dialogue.index++;this.storyRevision++;return true;}
  this.seen.add(id);this.dialogue=null;this.mode='playing';this.storyRevision++;
  this.invincible=Math.max(this.invincible,1);this.vx=0;this.vy=0;this.buffer=0;this.swordPending=0;
  if(id==='stranger'&&!this.hinted.has('split-pairs')&&this.deck.hand.join(',')===SPLIT_PAIRS.join(',')){
   this.hinted.add('split-pairs');this.banner='CYCLE TO THE JACKS · SAVE THE SEVENS TO PIERCE';this.bannerTime=5;
  }
  if(id===this.stageStory.outro&&id!=='breakfast'){this.storyPhase='cleared';this.mode='won';}
  if(id==='swallowed')this.startScene('inside');
  if(id==='breakfast'){this.setupHome();this.startScene('epilogue');}
  return true;
 }
 chooseLanternHand(keep){
  if(this.mode!=='lantern')return false;
  if(!keep){this.deck.reset();this.lanternDeck=this.deck.checkpoint();}
  this.setupArena();this.startScene(this.stageStory.intro);return true;
 }
 setupRoom(location,checkpoint=null){
  this.arena=true;this.storyLocation=location;this.worldWidth=960;this.gates=[];
  this.platforms=arenaPlatforms(this.stageIndex,location);this.x=210;this.y=420;this.surface=0;
  this.vx=0;this.vy=0;this.grounded=true;this.coyote=.12;this.buffer=0;
  this.checkpoint={x:210,y:420};this.health=5;this.invincible=1;
  if(checkpoint)this.deck.restore(checkpoint);else this.deck.reset();
  this.bolts=[];this.enemyShots=[];this.patches=[];this.cardDrops=[];this.activeDraft=null;
  this.enemies=[];this.embers=[];this.hazards=[];this.impacts=[];this.corpses=[];this.rings=[];this.dust=[];
  this.dark=0;this.transform=0;this.dash=0;this.attack=0;this.swordPending=0;this.cast=0;this.pendingSlotCard=null;
  this.hitStop=0;this.shakeTime=0;this.dying=0;this.banner='';this.bannerTime=0;this.boss=null;this.bossCorpse=null;this.victoryDelay=0;
  this.mode='playing';this.storyRevision++;
 }
 setupArena(phase='boss'){
  this.setupRoom(phase==='garden'?'garden':'arena',phase==='boss'?this.lanternDeck:null);this.storyPhase=phase;
  this.boss=makeBoss(this.stageStory.boss,this.nextId++,phase==='garden');this.enemies=[this.boss];
  this.collected=3;
 }
 setupInside(){
  this.setupRoom('inside');this.storyPhase='inside';this.rescueClock=0;
  this.knots=[[240,360],[430,300],[620,240]].map(([x,y])=>({id:this.nextId++,kind:'knot',storyTarget:true,x,y,left:x,right:x,hp:8,max:8,face:1,state:'idle',flash:0,walk:0}));
  this.enemies=[...this.knots];this.collected=3;
 }
 setupHome(){
  this.setupRoom('home');this.storyPhase='home';this.x=180;this.collected=3;
 }
 retry(){
  const progress=this.practice?{phase:'trail',seen:[...this.seen]}:this.snapshot(),tally=this.tally;
  if(progress.phase==='cleared')progress.phase='boss';
  this.reset(this.stageIndex,{...progress,dialogue:null});
  this.tally=tally;tally.retries++;
  if(this.boss){this.banner=this.stageStory.hint;this.bannerTime=4;}
 }
 advance(){
  if(this.mode!=='won'||this.practice||this.stageIndex>=STAGES.length-1)return false;
  const seen=[...this.seen];this.reset(this.stageIndex+1,{phase:'trail',seen});return true;
 }
 practiceDeal(kind){
  if(kind>=10&&kind<15){
   const stage=clamp(kind-10,0,4);this.reset(stage,{phase:'boss',seen:['prologue']});
   this.practice=true;this.bossPractice=true;this.banner=this.stageStory.hint;this.bannerTime=5;return;
  }
  super.practiceDeal(kind);this.worldWidth=this.width;this.dialogue=null;this.mode='playing';this.bossPractice=false;this.storyLocation='trail';
 }
 damage(e,amount,push,sword){
  if(e.boss)return damageBoss(this,e,amount);
  if(e.storyTarget){e.hp-=amount;e.flash=.16;this.impacts.push({x:e.x,y:e.y-20,amount,life:.25});return true;}
  return super.damage(e,amount,push,sword)!==false;
 }
 removeDead(){
  const boss=this.enemies.find(e=>e.boss&&e.hp<=0);
  // Living story characters are freed/disarmed, not sent to the normal corpse renderer.
  const freed=this.enemies.filter(e=>e.storyTarget&&e.hp<=0);
  this.enemies=this.enemies.filter(e=>!(e.boss&&e.hp<=0)&&!(e.storyTarget&&e.hp<=0));
  if(freed.length){this.emit('checkpoint');this.storyRevision++;}
  super.removeDead();if(boss){
   this.pendingVictory=true;this.kills++;this.boss=null;this.hazards=[];this.bolts=[];this.enemyShots=[];
   // The Wolf's first defeat leads straight into the swallowing scene; every other boss falls and stays down a moment.
   if(!(this.stageIndex===4&&this.storyPhase==='boss')){this.bossCorpse={kind:boss.kind,x:boss.x,y:boss.y,face:boss.face,time:0};this.victoryDelay=BOSS_DEATH;}
  }
 }
 step(dt,input={}){
  if(this.mode!=='playing')return;
  const stopped=this.hitStop>0;
  // Collect before moving encounter scenery: opening a choice freezes this whole tick.
  if(!stopped&&input.collect&&this.collectCard())return;
  // The mill wheel carries its two ledges in opposite directions after the lock cracks.
  if(!stopped&&this.boss?.kind==='tollkeeper'&&this.boss.hp<=this.boss.max/2){
   for(const p of this.platforms.slice(1)){
    const nextY=360+Math.sin((this.time+dt)*1.2+(p.id===1?0:Math.PI))*28;
    if(this.grounded&&this.surface===p.id)this.y+=nextY-p.y;
    p.y=nextY;
   }
  }
  const opened=this.gates.filter(g=>g.open).length,held=this.collected;
  super.step(dt,input);
  if(this.storyPhase==='trail'&&(this.collected!==held||this.gates.filter(g=>g.open).length!==opened))this.storyRevision++;
  if(this.practice&&!this.bossPractice)return;
  if(this.mode==='dead'||stopped||this.dying>0)return;
  if(this.storyLocation!=='trail')this.x=clamp(this.x,24,936);
  if(this.bossCorpse)this.bossCorpse.time+=dt;
  if(this.pendingVictory&&this.victoryDelay>0){this.victoryDelay=Math.max(0,this.victoryDelay-dt);if(this.victoryDelay>0)return;}
  if(this.pendingVictory){
   this.pendingVictory=false;this.bossCorpse=null;this.boss=null;this.hazards=[];this.bolts=[];this.enemyShots=[];this.cardDrops=[];this.activeDraft=null;
   if(this.practice){this.mode='won';return;}
   if(this.stageIndex===4&&this.storyPhase==='boss'){this.setupInside();this.startScene('swallowed');}
   else{this.storyPhase='cleared';this.result=gradeClearing(this.stageIndex,this.tally);this.startScene(this.stageStory.outro);}
   return;
  }
  if(this.mode!=='playing'&&this.mode!=='won')return;
  if(this.storyPhase==='trail'){
   // Reaching the lantern opens an authored encounter room rather than completing the story stage.
   if(this.mode==='won'){
    if(this.stageIndex===0){
     this.lanternDeck=this.deck.checkpoint();this.storyPhase='lantern';this.mode='lantern';this.storyRevision++;
    }else{this.setupArena();this.startScene(this.stageStory.intro);}
    return;
   }
   if(this.x>=160&&this.grounded&&!this.seen.has(this.stageStory.encounter)){
    this.startScene(this.stageStory.encounter);return;
   }
  }
  if(this.boss){updateBoss(this,dt);updateHazards(this,dt);}
  if(this.storyPhase==='inside'){
   this.rescueClock+=dt;for(const k of this.knots)k.flash=Math.max(0,k.flash-dt);
   if(this.rescueClock>=3.2){this.rescueClock=0;this.emit('checkpoint');
    this.hazards.push({kind:'shadow',x:this.x,y:this.y,w:64,h:34,delay:1.1,life:.25,age:0});
   }
   updateHazards(this,dt);
   if(this.knots.every(k=>k.hp<=0)&&this.x>840){this.setupArena('garden');this.startScene('garden');return;}
  }
  if(this.storyPhase==='home'&&this.x>=820){this.storyPhase='complete';this.mode='won';this.storyRevision++;}
 }
 snapshot(){
  const t=this.tally,save={version:3,clearing:this.clearing.id,phase:this.storyPhase,seen:[...this.seen],dialogue:this.dialogue?{...this.dialogue}:null,
   tally:{time:Math.round(t.time*10)/10,hurt:t.hurt,retries:t.retries,best:t.best}};
  const gates=this.storyPhase==='trail'?this.gates.filter(g=>g.open).length:0;
  if(gates){save.gates=gates;save.embers=this.embers.map(e=>this.clearing.embers.findIndex(([x,y])=>x===e.x&&y===e.y));}
  if(this.lanternDeck)save.lanternDeck=this.lanternDeck;
  return save;
 }
}
export function loadStory(storage){
 try{
  const raw=storage.getItem(STORY_SAVE_KEY);
  if(!raw){const old=loadJourney(storage);return old?{stage:old.stage,phase:'trail',seen:[],dialogue:null,complete:false}:null;}
  const data=JSON.parse(raw),stage=CLEARINGS.findIndex(c=>c.id===data?.clearing);
  if(data?.version!==3||stage<0||!PHASES.includes(data.phase))return null;
  if(['inside','garden','home','complete'].includes(data.phase)&&stage!==4)return null;
  if(!Array.isArray(data.seen)||data.seen.some(id=>!allScenes.has(id)))return null;
  const d=data.dialogue;
  if(d&&(!allScenes.has(d.id)||!Number.isInteger(d.index)||d.index<0||d.index>=SCENES[d.id].lines.length))return null;
  const allowed={trail:[stage===0?'prologue':null,STAGES[stage].encounter],lantern:[],boss:[STAGES[stage].intro],inside:['swallowed','inside'],garden:['garden'],cleared:[STAGES[stage].outro],home:['epilogue'],complete:[]};
  if(d&&!allowed[data.phase].includes(d.id))return null;
  const trail={};
  if(data.lanternDeck!==undefined||data.phase==='lantern'){
   if(stage!==0||!['lantern','boss','cleared'].includes(data.phase))return null;
   const deck=data.lanternDeck;
   if(!deck||![deck.hand,deck.pile,deck.discard].every(Array.isArray)||deck.hand.length>5||
    !Number.isInteger(deck.hits)||deck.hits<0||deck.hits>3||(deck.reserve!==null&&deck.hand.length!==5))return null;
   const cards=[...deck.hand,...deck.pile,...deck.discard];
   if(deck.reserve!==null)cards.push(deck.reserve);
   if(cards.length!==52||new Set(cards).size!==52||cards.some(id=>!Number.isInteger(id)||id<0||id>51))return null;
   trail.lanternDeck=deck;
  }
  if(data.gates!==undefined){
   const g=data.gates,e=data.embers;
   if(data.phase!=='trail'||!Number.isInteger(g)||g<1||g>CLEARINGS[stage].gates.length)return null;
   if(!Array.isArray(e)||new Set(e).size!==e.length||e.some(i=>!Number.isInteger(i)||i<0||i>2))return null;
   trail.gates=g;trail.embers=e;
  }
  // An older save, or a damaged tally, starts the grade afresh rather than losing the journey.
  const t=data.tally;
  if(t&&[t.time,t.hurt,t.retries].every(n=>Number.isFinite(n)&&n>=0)&&Number.isInteger(t.best)&&t.best>=-1&&t.best<=8)trail.tally={time:t.time,hurt:Math.floor(t.hurt),retries:Math.floor(t.retries),best:t.best};
  return {stage,phase:data.phase,seen:data.seen,dialogue:d||null,complete:data.phase==='complete',...trail};
 }catch{return null;}
}
export function saveStory(storage,world){
 if(world.practice)return false;
 try{storage.setItem(STORY_SAVE_KEY,JSON.stringify(world.snapshot()));return true;}catch{return false;}
}
