import {updateEnemies,updateEnemyShots,updatePatches,ENEMY_TYPES} from './enemies.mjs';
import {CLEARINGS,TRAIL_WIDTH,platformsFor} from './journey.mjs';
import {skinFor,traits} from './cast.mjs';
import {bossBox,extendBossRecovery,cutBossHazards} from './bosses.mjs';
export const CORPSE_LIFE=1.2;
// Enemy hit reaction: a white flash, then the hit row, readable at the game's speed.
export const HIT_TIME=.32;
// Dust kicked up by a jump, a landing or a ground dash.
export const DUST_LIFE=.3;
// Seconds a sword chain survives without another landed swing.
export const COMBO_WINDOW=1.1;
// The last hit plays out in slow motion for this long before the retry screen.
export const DEATH_TIME=.9;
// A knocked-back foe slides: its push becomes a velocity that dies away in about a fifth of a second.
export const SLIDE=14;
// A foe staggers from this many sword hits in a row; after that it keeps fighting until the blade lets up
// for POISE_GAP seconds, so a held swing can't pin it and its wind-up still has to be read.
export const POISE_HITS=3,POISE_GAP=.6;
export const HANDS=['High card','Pair','Two pair','Three of a kind','Straight','Flush','Full house','Four of a kind','Straight flush'];
export const SPLIT_PAIRS=[48,35,5,18,1]; // J♥ J♣ 7♠ 7♦ 3♠
export const DAMAGE=[6,14,20,26,32,40,52,64,90];
export const EFFECTS=['Quick bolt','Heavy bolt','Explosive shot','Piercing lance','Piercing beam','Dark wave','Twin dark waves','Royal burst','Royal burst + wave'];
export const SUITS=['spades','diamonds','clubs','hearts'];
// Each suit among the cards a pair or better spends adds its flavour: spades pierce every foe in line, each diamond
// fills a notch of the draw meter, clubs daze foes or extend a recovering boss's opening, hearts mend a heart.
export const FLAVOURS=['pierces','draw','knocks back','+1 heart'];
// Seconds a club-struck foe stays dazed.
export const DAZE=1.2;
export function flavourText(r){return r.suits.map(s=>s===1?`+${r.diamonds} draw`:FLAVOURS[s]).join(' · ');}
export function cardName(id){const rank=id%13+2;return `${({11:'Jack',12:'Queen',13:'King',14:'Ace'})[rank]||rank} of ${SUITS[Math.floor(id/13)]}`;}
export function evaluate(cards){
 if(!cards.length)return {tier:-1,name:'Empty hand',damage:0,indices:[],heal:false,suits:[],diamonds:0};
 const groups=new Map();cards.forEach((c,i)=>{let r=c%13+2;if(!groups.has(r))groups.set(r,[]);groups.get(r).push(i)});
 const ranks=[...groups.keys()].sort((a,b)=>groups.get(b).length-groups.get(a).length||b-a);
 const sorted=[...ranks].sort((a,b)=>a-b),count=groups.get(ranks[0]).length;
 const flush=cards.length===5&&cards.every(c=>Math.floor(c/13)===Math.floor(cards[0]/13));
 const straight=sorted.length===5&&(sorted[4]-sorted[0]===4||sorted.join(',')==='2,3,4,5,14');
 let tier=0,indices=[groups.get(ranks[0])[0]];
 if(straight&&flush)tier=8;
 else if(count===4){tier=7;indices=[...groups.get(ranks[0])]}
 else if(count===3&&groups.get(ranks[1])?.length===2)tier=6;
 else if(flush)tier=5;else if(straight)tier=4;
 else if(count===3){tier=3;indices=[...groups.get(ranks[0])]}
 else if(count===2){tier=1;indices=[...groups.get(ranks[0])];if(groups.get(ranks[1])?.length===2){tier=2;indices.push(...groups.get(ranks[1]))}}
 if([4,5,6,8].includes(tier))indices=cards.map((_,i)=>i);
 const spent=tier>=1?indices.map(i=>Math.floor(cards[i]/13)):[],suits=[...new Set(spent)].sort();
 return {tier,name:HANDS[tier],damage:DAMAGE[tier],indices,heal:suits.includes(3),suits,diamonds:spent.filter(s=>s===1).length};
}
// Pure previews share the evaluator used by actual casts and never move deck cards.
export function previewDraw(hand,card){
 const options=hand.length<5?[{slot:null,hand:[...hand,card]}]:
  hand.map((_,slot)=>({slot,hand:hand.map((id,i)=>i===slot?card:id)}));
 return options.map(option=>({...option,result:evaluate(option.hand)}));
}
// Describe attainable patterns in the resulting hand, without promising the next draw.
function potentialPatterns(hand){
 const hints=[];
 for(let suit=0;suit<4;suit++){
  const count=hand.filter(card=>Math.floor(card/13)===suit).length;
  if(count>=3&&count<5)hints.push({count,text:`${count} ${SUITS[suit]} toward a flush`});
 }
 const ranks=new Set(hand.map(card=>card%13+2));if(ranks.has(14))ranks.add(1);
 let run=0;for(let low=1;low<=10;low++)run=Math.max(run,[0,1,2,3,4].filter(n=>ranks.has(low+n)).length);
 if(run===4)hints.push({count:run,text:'4 of 5 ranks toward a straight'});
 return hints;
}
export function handPotential(hand){return potentialPatterns(hand).map(hint=>hint.text);}
export function bestDrawPreview(hand,card){
 const score=cards=>Math.max(0,...potentialPatterns(cards).map(hint=>hint.count));
 return previewDraw(hand,card).sort((a,b)=>b.result.tier-a.result.tier||score(b.hand)-score(a.hand))[0];
}
// K leads with the normal best hand. Offer each smaller scoring combination once,
// including different suits of the same rank. Single cards already have slot controls.
export function scoringPlays(hand){
 const best=evaluate(hand),plays=[best];
 if(best.tier<=1)return plays;
 const bestMask=best.indices.reduce((mask,slot)=>mask|(1<<slot),0);
 const fullMask=(1<<hand.length)-1;
 for(let mask=1;mask<fullMask;mask++){
  if(mask===bestMask)continue;
  const slots=[];
  for(let slot=0;slot<hand.length;slot++)if(mask&(1<<slot))slots.push(slot);
  if(slots.length<2)continue;
  const play=evaluate(slots.map(slot=>hand[slot]));
  if(play.tier>0&&play.indices.length===slots.length)plays.push({...play,indices:slots});
 }
 return plays.sort((a,b)=>b.tier-a.tier);
}
export class Deck{
 constructor(random=Math.random){this.random=random;this.reset()}
 shuffle(a){for(let i=a.length-1;i>0;i--){let j=Math.floor(this.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
 reset(){this.handKey=null;this.hand=[];this.pile=this.shuffle(Array.from({length:52},(_,i)=>i));this.discard=[];this.hits=0;this.reserve=null;this.drafts=[];this.nextDraft=0;for(let i=0;i<5;i++)this.draw()}
 // Unclaimed trail drops stay behind. Return their cards to the discard pile.
 checkpoint(){
  return {hand:[...this.hand],pile:[...this.pile],discard:[...this.discard,...this.drafts.flatMap(d=>d.cards)],
   reserve:this.reserve,hits:this.hits};
 }
 restore(checkpoint){
  this.hand=[...checkpoint.hand];this.pile=[...checkpoint.pile];this.discard=[...checkpoint.discard];
  this.reserve=checkpoint.reserve;this.hits=checkpoint.hits;this.handKey=null;this.drafts=[];this.nextDraft=0;
 }
 get plays(){
  const key=this.hand.join(',');
  if(this.handKey!==key){this.handKey=key;this.handPlays=scoringPlays(this.hand);this.playIndex=0;}
  return this.handPlays;
 }
 get selectedPlay(){return this.plays[this.playIndex];}
 nextPlay(){
  const count=this.plays.length;
  if(count<2)return false;
  this.playIndex=(this.playIndex+1)%count;
  return true;
 }
 get banked(){return this.reserve!==null}
 take(){if(!this.pile.length)this.pile=this.shuffle(this.discard.splice(0));return this.pile.pop()}
 draw(){if(this.hand.length>=5)return;const card=this.take();if(card!==undefined)this.hand.push(card)}
 hit(){this.hits=Math.min(3,this.hits+1);return this.release();}
 // A full meter waits while a draw is saved and pays out once the saved card is used.
 release(){
  if(this.banked||this.hits<3)return null;
  const draft=this.reward();if(draft)this.hits=0;return draft;
 }
 // A draft outside the meter: every kill drops one.
 reward(){
  const a=this.take(),b=this.take();
  if(a===undefined||b===undefined){if(a!==undefined)this.pile.push(a);return null;}
  const draft={id:this.nextDraft++,cards:[a,b]};this.drafts.push(draft);return draft;
 }
 choose(id,index){
  const draft=this.drafts.find(d=>d.id===id);if(!draft||![0,1].includes(index)||(this.hand.length===5&&this.banked))return null;
  const card=draft.cards[index];this.discard.push(draft.cards[1-index]);this.drafts=this.drafts.filter(d=>d.id!==id);
  if(this.hand.length<5)this.hand.push(card);else this.reserve=card;
  return {card,banked:this.banked};
 }
 play(slot=null){
  let result;
  if(slot===null){
   result=this.selectedPlay;
  }else{
   if(!Number.isInteger(slot)||slot<0||slot>=this.hand.length)return null;
   const card=this.hand[slot];
   result={...evaluate([card]),indices:[slot],thrownCard:card};
  }
  for(const index of [...result.indices].sort((a,b)=>b-a)){
   this.discard.push(...this.hand.splice(index,1));
  }
  if(this.banked&&this.hand.length<5){
   this.hand.push(this.reserve);
   this.reserve=null;
  }
  return result;
 }
 replace(i){if(!this.banked||i<0||i>=this.hand.length)return false;this.discard.push(this.hand[i]);this.hand[i]=this.reserve;this.reserve=null;return true}
 preset(cards){this.handKey=null;this.hand=[...cards];this.pile=this.shuffle(Array.from({length:52},(_,i)=>i).filter(c=>!cards.includes(c)));this.discard=[];this.hits=0;this.reserve=null;this.drafts=[];this.nextDraft=0}
}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const approach=(a,b,n)=>a<b?Math.min(a+n,b):Math.max(a-n,b);
export const WIDTH=2400;
export function level(){return platformsFor(0)}
export class World{
 // hinted: advice already shown this session; it survives resets so a retry does not repeat it.
 constructor(random=Math.random){this.deck=new Deck(random);this.hinted=new Set();this.reset()}
 reset(stageIndex=0){
  this.stageIndex=stageIndex;this.clearing=CLEARINGS[stageIndex];this.arena=false;this.width=TRAIL_WIDTH;
  // Briar gates split the trail into sections; each opens once every foe before it has fallen.
  this.gates=this.clearing.gates.map(x=>({x,open:false,age:0}));
  this.gateGuide=null;this.gateGuideArmed=true;
  this.deck.reset();this.x=60;this.y=420;this.vx=0;this.vy=0;this.facing=1;this.grounded=true;this.surface=0;
  this.coyote=.12;this.buffer=0;this.drop=0;this.health=5;this.invincible=0;this.dash=0;this.dashCD=0;
  this.attack=0;this.swordPending=0;this.attackFacing=1;this.cast=0;this.dark=0;this.transform=0;this.land=0;this.time=0;this.fallCount=0;
  this.pendingSlotCard=null;this.attackForm='light';this.castForm='light';this.castFacing=1;
  this.morphFrom='light';this.morphDuration=.75;this.morphPose=false;this.morphFacing=1;
  this.hitStop=0;this.shakeTime=0;this.shakeDuration=0;this.shakePower=0;
  this.cardDrops=[];this.activeDraft=null;this.lastPicked=null;this.dying=0;this.combo=0;this.comboTime=0;
  this.platforms=platformsFor(stageIndex);this.embers=this.clearing.embers.map(([x,y])=>({x,y}));this.collected=0;
  this.checkpoint={x:60,y:420};this.checkpointId=0;this.mode='playing';this.practice=false;this.kills=0;this.bestHand=-1;
  // tally: the whole clearing for its grade; unlike time, kills and bestHand it survives retries.
  this.tally={time:0,hurt:0,retries:0,best:-1};
  this.impacts=[];this.corpses=[];this.bolts=[];this.enemyShots=[];this.patches=[];this.rings=[];this.texts=[];this.particles=[];this.dust=[];this.events=[];this.banner='';this.bannerTime=0;this.nextId=0;
  this.npcs=(this.clearing.npcs||[]).map(([x,s,skin,line])=>({x,y:this.platforms[s].y,skin,line}));
  this.enemies=[];
  for(const [x,s,t] of this.clearing.enemies)this.spawn(x,s,t||false);
 }
 advance(){
  if(this.mode!=='won'||this.practice||this.stageIndex>=CLEARINGS.length-1)return false;
  this.reset(this.stageIndex+1);this.banner=this.clearing.name.toUpperCase();this.bannerTime=2.8;return true;
 }
 retry(){const open=this.gates.filter(g=>g.open).length,left=this.embers,tally=this.tally;this.reset(this.stageIndex);this.resume(open,left);this.tally=tally;tally.retries++;}
 // A retry on the trail returns to the last opened gate; the sections behind it stay cleared.
 resume(open,embers){
  if(!open)return;
  this.gates.slice(0,open).forEach(g=>{g.open=true;g.age=9});
  this.enemies=this.enemies.filter(e=>e.section>=open);
  this.embers=embers.map(e=>({...e}));this.collected=3-this.embers.length;
  this.x=this.gates[open-1].x-40;this.checkpoint={x:this.x,y:420};
  this.checkpointId=this.clearing.checkpoints.filter(x=>x<=this.x).length;
 }
 get wall(){return this.gates.find(g=>!g.open);}
 // Foes that still hold the next gate shut (or the exit, once every gate is open).
 get gateFoes(){const i=this.gates.findIndex(g=>!g.open);return this.enemies.filter(e=>e.hp>0&&!e.boss&&!e.storyTarget&&(i<0||e.section<=i));}
 get foesAhead(){return this.gateFoes.length;}
 get guidedFoe(){return this.gateGuide&&this.gateFoes.find(e=>e.id===this.gateGuide.targetId);}
 updateGates(dt){
  for(const g of this.gates)if(g.open)g.age+=dt;
  if(this.gateGuide){this.gateGuide.time-=dt;if(this.gateGuide.time<=0)this.gateGuide=null;}
  const g=this.wall;if(!g){this.gateGuide=null;return;}
  if(this.x<g.x-160)this.gateGuideArmed=true;
  if(this.foesAhead===0){
   g.open=true;this.gateGuide=null;this.gateGuideArmed=true;this.emit('checkpoint');const healed=this.health<5;if(healed)this.health++;
   this.banner=healed?'GATE SAVED · +1 HEART':'GATE SAVED';this.bannerTime=2.2;
  }else{
   if(this.x>g.x-90&&this.gateGuideArmed){this.gateGuide={time:3,targetId:null};this.gateGuideArmed=false;}
   if(this.gateGuide&&!this.guidedFoe){
    const nearest=this.gateFoes.reduce((a,b)=>Math.hypot(a.x-this.x,a.y-this.y)<Math.hypot(b.x-this.x,b.y-this.y)?a:b);
    this.gateGuide.targetId=nearest.id;
   }
   if(this.x>g.x-15){
    this.x=g.x-15;this.vx=Math.min(this.vx,0);
    if(this.bannerTime<=0){const n=this.foesAhead;this.banner=`THE BRIARS HOLD · ${n} ${n===1?'FOE':'FOES'} LEFT`;this.bannerTime=1.6;}
   }
  }
 }
 spawn(x,s,type=false){const platform=this.platforms[s];if(!platform)return;const kind=typeof type==='string'?type:type?'brute':'scout',def=ENEMY_TYPES[kind];if(!def)return;const tough=kind==='brute'||kind==='guard',section=this.gates.filter(g=>g.x<x).length;const slot=this.enemies.filter(e=>e.kind===kind).length,skin=skinFor(kind,this.clearing.id,slot);
  // Flyers roam their whole gated section and remember the perch they started on.
  const fly=kind==='flyer',from=this.gates[section-1]?.x,to=this.gates[section]?.x,roam=fly?{fly,home:{x,y:platform.y},left:from===undefined?16:from+26,right:to===undefined?this.width-16:to-26}:{left:platform.x+16,right:platform.x+platform.w-16};
  this.enemies.push({id:this.nextId++,kind,...traits(skin),section,x,y:platform.y,...roam,hp:def.hp,max:def.hp,tough,wind:0,rest:.3,flash:0,walk:0,face:-1,state:'patrol',surface:s,patrolDir:this.nextId%2?1:-1,air:false,airVX:0,vy:0,hopCD:0,action:0,strikeDir:-1,connected:false})}
 practiceDeal(kind){
  const splitPairs=kind===24;
  if(splitPairs)kind=0;
  // Extra single-foe practices: [behaviour, spawn x, banner, skin]
  const extra={15:['flyer',420,'RAVEN · SIDESTEP THE DIVE, STRIKE WHERE IT LANDS'],16:['charger',520,'STAG · JUMP THE CHARGE, STRIKE WHILE IT RECOVERS'],17:['mage',400,'WISP · CATCH IT BEFORE IT BLINKS AWAY','will_o_wisp'],18:['mage',400,'WITCH · LEAVE THE MARKED GROUND','forest_witch'],19:['guard',330,'BRAMBLES · STAY OUT OF THE LASH OR GET BEHIND IT','thorn_brambles'],20:['guard',400,'TREE · LEAVE THE CRACKED GROUND','living_tree'],21:['mage',400,'MUSHROOM · BACK OFF WHEN IT SWELLS','spore_mushroom'],22:['mage',400,'GHOST HUNTER · IT SLIPS THROUGH YOU','ghost_hunter'],23:['brute',330,'BEAR · IT ROARS AT HALF HEALTH, THEN SPEEDS UP','brown_bear']}[kind];if(extra)kind=4;
  if(kind>=7){this.reset(kind===9?1:kind===7?2:3);this.practice=true;this.banner='EXPLORE · '+this.clearing.name.toUpperCase();this.bannerTime=3;return;}
  this.reset();this.practice=true;this.arena=true;this.width=WIDTH;this.gates=[];this.platforms=[{id:0,x:0,y:420,w:2400,ground:true}];this.embers=[];this.npcs=[];this.x=180;this.enemies=[];
  if(splitPairs){
   this.deck.preset(SPLIT_PAIRS);this.health=4;
   this.banner='SPLIT THE PAIRS · CYCLE ONCE TO MEND';this.bannerTime=4;
   this.spawn(530,0,'scout');this.spawn(700,0,'runner');return;
  }
  this.deck.preset([[5,18,2,9,24],[0,2,5,8,11],[5,18,31,44,8]][kind]||[5,18,2,9,24]);
  for(let i=0;i<3;i++)this.spawn(300+i*100,0,i===2);
  this.banner='PRACTICE · '+evaluate(this.deck.hand).name;this.bannerTime=2;
  if(kind===0){
   this.banner='THROW THE JACK (4) · PLAY THE PAIR (K)';
   this.bannerTime=4;
  }
  if(kind===3){this.deck.pile=this.deck.pile.filter(c=>c!==31&&c!==12);this.deck.pile.push(12,31);this.deck.hit();this.deck.hit();this.spawnCardDrop(this.deck.hit(),{x:240,y:420});this.banner='COLLECT THE CARD · CHOOSE YOUR DRAW'}if(kind>=4){this.enemies=[];this.spawn(extra?extra[1]:330,0,extra?extra[0]:['runner','mage','guard'][kind-4]);this.banner=extra?extra[2]:['BOAR · DODGE THE LUNGE','HUNTER · JUMP OR SLASH THE ARROW','LIVING TREE · BAIT THE SLAM'][kind-4];
   if(extra?.[3])Object.assign(this.enemies[0],traits(extra[3]));this.bannerTime=4;}}
 emit(type){this.events.push(type)}
 puff(kind){this.dust.push({x:this.x,y:this.y,dir:this.facing,kind,life:DUST_LIFE})}
 jump(){this.buffer=.14;this.tryJump()}
 tryJump(){if(this.buffer>0&&(this.grounded||this.coyote>0)){this.vy=-430;this.grounded=false;this.coyote=0;this.buffer=0;this.emit('jump');this.puff('jump')}}
 releaseJump(){if(this.vy < -170)this.vy=-170}
 dropDown(){if(this.grounded&&!this.platforms.find(p=>p.id===this.surface)?.ground){this.drop=.22;this.y+=3;this.grounded=false;this.coyote=0}}
 startDash(){if(this.dashCD>0||this.mode!=='playing')return;this.dash=.14;this.dashCD=.7;this.vy=0;this.invincible=Math.max(this.invincible,.14);this.emit('dash');if(this.grounded)this.puff('dash')}
 sword(){if(this.attack>0||this.mode!=='playing')return;this.attack=.32;this.swordPending=.10;this.attackFacing=this.facing;
  // A swing that would be the chain's finisher uses the pack's rising crescent slash.
  this.attackMove=(this.comboTime>0?this.combo:0)%3===2?'attack2':'attack1';this.attackForm=this.dark>0?'dark':'light';this.morphPose=false;this.emit('attack1');}
 resolveSword(){let source=null;
  // Every third landed swing in a row is a heavy finisher; a pause or taking a hit breaks the chain.
  const chain=this.comboTime>0?this.combo:0,finisher=chain%3===2,base=this.attackForm==='dark'?4:2,first=this.impacts.length;
  this.enemyShots=this.enemyShots.filter(b=>{const d=(b.x-this.x)*this.attackFacing;if(d>=-10&&d<76&&Math.abs(b.y-(this.y-22))<36){this.impacts.push({x:b.x,y:b.y,amount:2,life:.25});this.emit('attack3');return false;}return true;});
  for(const e of this.enemies){const box=e.boss&&bossBox(e);let hit;
   if(box){const f=this.attackFacing,a0=f>0?this.x-10:this.x-76,a1=f>0?this.x+76:this.x+10;hit=a1>box.x0&&a0<box.x1&&this.y-56<box.y1&&this.y>box.y0;}
   else{const d=(e.x-this.x)*this.attackFacing;hit=d>=-10&&d<76&&Math.abs(e.y-this.y)<40;}
   if(hit){if(this.damage(e,finisher?base*2.5:base,(finisher?26:10)*this.attackFacing,true)!==false)source??=e}}
  if(source){this.combo=chain+1;this.comboTime=COMBO_WINDOW;
   if(finisher){for(const hit of this.impacts.slice(first))hit.heavy=true;this.hitStop=Math.max(this.hitStop,2/60);this.shakePower=2;this.shakeDuration=.1;this.shakeTime=.1;this.emit('finisher');}
   this.emit('hit');this.hinted.add('sword');const draft=this.deck.hit();if(draft){this.spawnCardDrop(draft,source);source.dropped=true;this.emit('meter_full');this.banner='CARD DROP · COLLECT WHEN READY';this.bannerTime=1.5}}this.removeDead();
 }
 spawnCardDrop(draft,source){
  if(!draft)return;
  const below=this.platforms.filter(p=>p.y>=source.y-2&&source.x>=p.x&&source.x<=p.x+p.w);
  const lower=this.platforms.filter(p=>p.y>=source.y-2),candidates=below.length?below:lower.length?lower:this.platforms;
  const p=[...candidates].sort((a,b)=>{
   const score=p=>Math.abs(clamp(source.x,p.x+18,p.x+p.w-18)-source.x)*2+Math.abs(p.y-source.y);
   return score(a)-score(b);
  })[0];
  const x=clamp(source.x,p.x+18,p.x+p.w-18),y=p.y;
  this.cardDrops.push({id:draft.id,x,y,age:0,blocked:Math.abs(x-this.x)<28&&Math.abs(y-this.y)<30});
 }
 get nearbyCardDrop(){
  if(this.mode!=='playing'||this.dying>0||(this.deck.banked&&this.deck.hand.length===5))return null;
  return this.cardDrops.filter(drop=>drop.age>=.4&&Math.abs(drop.y-this.y)<=30&&Math.abs(drop.x-this.x)<=48)
   .sort((a,b)=>Math.abs(a.x-this.x)-Math.abs(b.x-this.x)||a.id-b.id)[0]||null;
 }
 collectCard(){const drop=this.nearbyCardDrop;return drop?this.openDraft(drop):false;}
 openCardSelection(){
  if(this.mode!=='playing'||this.dying>0||!this.deck.hand.length)return false;
  this.selectedSlot=0;this.mode='cards';return true;
 }
 moveCardSelection(direction){
  if(this.mode!=='cards')return false;
  this.selectedSlot=(this.selectedSlot+Math.sign(direction)+this.deck.hand.length)%this.deck.hand.length;return true;
 }
 finishCardSelection(confirm=false){
  if(this.mode!=='cards')return false;
  this.mode='playing';
  if(!confirm)return true;
  if(!this.deck.banked&&this.cast>0){this.pendingSlotCard=this.deck.hand[this.selectedSlot];return true;}
  return this.useSlot(this.selectedSlot);
 }
 openDraft(drop){
  if(this.mode!=='playing'||this.dying>0||(this.deck.banked&&this.deck.hand.length===5))return false;
  if(!this.deck.drafts.some(d=>d.id===drop.id))return false;
  this.activeDraft=drop.id;this.mode='drafting';return true;
 }
 chooseDraft(index){
  if(this.mode!=='drafting')return false;
  const result=this.deck.choose(this.activeDraft,index);if(!result)return false;
  const drop=this.cardDrops.find(d=>d.id===this.activeDraft);
  this.lastPicked={card:result.card,x:drop.x,y:drop.y-26};
  this.cardDrops=this.cardDrops.filter(d=>d.id!==this.activeDraft);this.activeDraft=null;this.mode='playing';
  this.suppressNearbyDrops();
  this.emit('pickup_essence');this.banner=(result.banked?'SAVED: ':'DREW: ')+cardName(result.card).toUpperCase();this.bannerTime=1.8;return true;
 }
 dismissDraft(){
  if(this.mode!=='drafting')return;
  this.suppressNearbyDrops();
  this.activeDraft=null;this.mode='playing';
 }
 suppressNearbyDrops(){for(const drop of this.cardDrops)if(Math.abs(drop.x-this.x)<32&&Math.abs(drop.y-this.y)<40)drop.blocked=true;}
 useSlot(slot){
  if(this.mode!=='playing'||this.dying>0||!Number.isInteger(slot)||slot<0||slot>=this.deck.hand.length)return false;
  if(this.deck.banked){const replaced=this.deck.replace(slot);if(replaced)this.releaseDraw();return replaced;}
  return this.play(slot);
 }
 releaseDraw(){const draft=this.deck.release();if(draft){this.spawnCardDrop(draft,{x:this.x+this.facing*40,y:this.y});this.emit('meter_full');}}
 cyclePlay(){return this.mode==='playing'&&this.dying===0&&this.deck.nextPlay();}
 play(slot=null){
  if(this.cast>0||this.dying>0||!this.deck.hand.length||this.mode!=='playing')return false;
  const r=this.deck.play(slot);
  if(!r)return false;
  this.releaseDraw();
  this.bestHand=Math.max(this.bestHand??-1,r.tier);this.tally.best=Math.max(this.tally.best,r.tier);
  this.cast=.36;this.banner=r.thrownCard===undefined?r.name.toUpperCase():cardName(r.thrownCard).toUpperCase();this.bannerTime=1.5;this.emit('attack3');
  if(r.suits.some(s=>s<3)){this.banner+=' · '+flavourText({...r,suits:r.suits.filter(s=>s<3)}).toUpperCase();this.bannerTime=2;}
  if(r.heal&&this.health<5){this.health++;this.banner+=' · +1 HEART';this.bannerTime=2;this.emit('pickup_essence');}
  for(let i=0;i<r.diamonds;i++){const draft=this.deck.hit();if(draft){this.spawnCardDrop(draft,{x:this.x+this.facing*40,y:this.y});this.emit('meter_full');}}
  if(r.tier>=5){if(this.dark<=0)this.startMorph('light',.75);this.dark=6;this.invincible=Math.max(this.invincible,.75);this.emit('transform_dark')}
  this.castForm=this.dark>0?'dark':'light';this.castFacing=this.facing;
  const impact={tier:r.tier,spent:false,pierce:r.suits.includes(0),knock:r.suits.includes(2)};
  if(r.tier>=7)this.blast(this.x,this.y-22,270,r.damage,true,impact);
  if(r.tier<7||r.tier===8)this.fire(r,this.facing,impact);
  if(r.tier===6)this.fire(r,-this.facing,impact);this.removeDead();
  return true;
 }
 startMorph(from,duration){this.morphFrom=from;this.morphDuration=duration;this.transform=duration;this.morphFacing=this.facing;this.morphPose=this.grounded&&Math.abs(this.vx)<=10&&this.attack<=0&&this.dash<=0;}
 pokerImpact(impact,killed=false){
  if(!impact||impact.spent||impact.tier<1)return;impact.spent=true;
  // One pulse per played hand, shared by piercing hits, explosions and twin waves.
  const frames=impact.tier>=7?5:impact.tier>=5?4:impact.tier>=2?3:2;
  this.hitStop=Math.max(this.hitStop,frames/60);
  this.shakePower=frames*2-2;this.shakeDuration=.1+frames*.025;this.shakeTime=this.shakeDuration;
 }
 fire(r,dir,impact){this.bolts.push({x:this.x+dir*20,y:this.y-23,dir,damage:r.damage,tier:r.tier,card:r.thrownCard,life:1.5,hit:new Set(),impact})}
 blast(x,y,radius,damage,dark=false,impact=null,hit=null){this.rings.push({x,y,radius,dark,life:.45});for(const e of this.enemies){const box=e.boss&&bossBox(e);if((box?Math.hypot(clamp(x,box.x0,box.x1)-x,clamp(y,box.y0,box.y1)-y)<=radius:Math.hypot(e.x-x,e.y-22-y)<=radius)&&!hit?.has(e.id)){hit?.add(e.id);if(this.damage(e,damage,Math.sign(e.x-x)*40)!==false&&impact?.knock)this.knockBack(e,Math.sign(e.x-x)||this.facing);this.pokerImpact(impact,e.hp<=0)}}}
 knockBack(e,dir){if(e.boss){extendBossRecovery(this,e);return;}if(e.storyTarget||e.hp<=0||e.state==='blink')return;e.slide=(e.slide||0)+dir*90*SLIDE;e.rest=Math.max(e.rest||0,DAZE);e.dazed=DAZE;}
 damage(e,amount,push,sword=false){if(this.wall&&e.x>this.wall.x||e.state==='blink')return false;e.hp-=amount;e.flash=.15;
  // A brute or guard that has begun its slam, and a stag rearing or charging, braces through sword hits;
  // only a played hand breaks it.
  const charging=e.kind==='charger'&&(e.state==='windup'||e.state==='lunge');
  if(sword){e.poise=this.time-(e.swordAt??-Infinity)<POISE_GAP?(e.poise||0)+1:1;e.swordAt=this.time;}
  const shrugs=sword&&e.poise>POISE_HITS;
  if(sword&&(charging||e.tough&&e.state==='windup'||shrugs)){e.brace=.15;if(this.bannerTime<=0){this.banner=charging?'IT WON\'T FLINCH · JUMP THE CHARGE':shrugs&&!(e.tough&&e.state==='windup')?'IT SHRUGS OFF THE BLADE · DODGE, THEN STRIKE':'IT BRACES · STEP BACK, STRIKE AFTER THE SLAM';this.bannerTime=1.8;}}else{e.slide=(e.slide||0)+push*SLIDE;e.wind=0;e.rest=.22;e.hurt=HIT_TIME;e.state='stagger';}
  this.texts.push({x:e.x,y:e.y-55,text:String(amount),life:.7});this.impacts.push({x:e.x,y:e.y-25,amount,life:.25,knockout:e.hp<=0});
  for(let i=0;i<7;i++)this.particles.push({x:e.x,y:e.y-22,vx:Math.cos(i*2.4)*90,vy:-40-i*12,life:.4});}
 removeDead(){if(this.enemies.some(e=>e.hp<=0))this.emit('enemy_death');for(const e of this.enemies)if(e.hp<=0){
   // A bird killed in the air drops to the ground below it.
   const floor=Math.min(...this.platforms.filter(p=>e.x>=p.x&&e.x<=p.x+p.w&&p.y>=e.y-1).map(p=>p.y),e.fly?Infinity:e.y);
   this.corpses.push({kind:e.kind,skin:e.skin,x:e.x,y:e.y,floor:Number.isFinite(floor)?floor:e.y,face:e.face,life:CORPSE_LIFE});
   if(!e.dropped)this.spawnCardDrop(this.deck.reward(),{x:e.x,y:floor});}this.kills+=this.enemies.filter(e=>e.hp<=0).length;this.enemies=this.enemies.filter(e=>e.hp>0)}
 hurt(fromX){if(this.invincible>0||this.dying>0)return;this.health--;this.tally.hurt++;this.invincible=1;this.combo=0;this.emit('player_hurt');
  const dir=fromX===undefined?-this.facing:Math.sign(this.x-fromX)||-this.facing;
  this.vx=dir*320;this.vy=Math.min(this.vy,-250);this.grounded=false;this.dash=0;this.knock=.3;this.hurtTime=.4;
  this.hitStop=Math.max(this.hitStop,.05);this.shakePower=4;this.shakeDuration=.18;this.shakeTime=.18;
  if(this.health<=0){this.dying=DEATH_TIME;this.hitStop=.14;this.shakePower=6;this.shakeDuration=.3;this.shakeTime=.3;
   for(let i=0;i<14;i++)this.particles.push({x:this.x,y:this.y-22,vx:Math.cos(i*.9)*(70+i*9),vy:-170+Math.sin(i*.9)*90,life:.7});}}
 step(dt,input={}){
  if(this.mode!=='playing')return;
  this.shakeTime=Math.max(0,this.shakeTime-dt);
  if(this.hitStop>0){this.hitStop=Math.max(0,this.hitStop-dt-1e-9);return;}
  if(input.collect&&this.collectCard())return;
  // Death beat: Red's fall plays out slowed and out of the player's hands; nothing can hurt her again.
  if(this.dying>0){this.dying=Math.max(0,this.dying-dt);if(!this.dying){this.mode='dead';return;}dt*=.4;input={};}
  this.time+=dt;this.tally.time+=dt;const wasDark=this.dark>0;
  for(const key of ['invincible','dash','dashCD','attack','cast','dark','transform','land','drop','buffer','bannerTime','knock','hurtTime','comboTime'])this[key]=Math.max(0,this[key]-dt);
  if(wasDark&&this.dark===0)this.startMorph('dark',.6);
  const knocked=this.knock>0;
  if(!knocked){if(input.jump)this.jump();if(input.jumpRelease)this.releaseJump();if(input.drop)this.dropDown();if(input.dash)this.startDash();}
  const axis=knocked?0:clamp(input.axis||0,-1,1);if(axis)this.facing=axis>0?1:-1;
  this.vx=this.dash>0?this.facing*570:knocked?approach(this.vx,0,700*dt):approach(this.vx,axis*(this.dark>0?300:260),(this.grounded?2600:1700)*dt);
  if(this.swordPending>0){this.swordPending=Math.max(0,this.swordPending-dt);if(this.swordPending===0)this.resolveSword();}
  if(input.sword)this.sword();
  if(input.cycle)this.cyclePlay();
  if(this.pendingSlotCard!==null&&this.cast<=0){const slot=this.deck.hand.indexOf(this.pendingSlotCard);this.pendingSlotCard=null;if(slot>=0)this.play(slot);}
  if(input.play)this.play();
  else if(input.cardSlot!==undefined)this.useSlot(input.cardSlot);
  else if(input.replace!==undefined){if(this.deck.replace(input.replace))this.releaseDraw();}
  this.coyote=this.grounded?.12:Math.max(0,this.coyote-dt);this.tryJump();
  const oldX=this.x,oldY=this.y,wasGround=this.grounded;this.x=clamp(this.x+this.vx*dt,12,this.width-12);this.updateGates(dt);
  if(!this.dash)this.vy+=1300*dt;this.y+=this.vy*dt;this.grounded=false;this.surface=-1;
  if(this.vy>=0){let landing=null;for(const p of this.platforms){if(this.drop>0&&!p.ground)continue;if(this.x+9>p.x&&this.x-9<p.x+p.w&&oldY<=p.y+.5&&this.y>=p.y&&(!landing||p.y<landing.y))landing=p}if(landing){this.y=landing.y;this.vy=0;this.grounded=true;this.surface=landing.id;if(!wasGround){this.land=.12;this.emit('land');this.puff('land')}this.tryJump()}}
  if(!this.grounded||Math.abs(this.vx)>10||this.attack>0||this.dash>0)this.morphPose=false;
  this.idleTime=this.grounded&&Math.abs(this.vx)<=10&&!this.attack&&!this.cast&&!this.dash&&!this.transform&&!input.axis?(this.idleTime||0)+dt:0;
  if(this.y>530&&this.dying>0){this.dying=0;this.mode='dead';return;}
  if(this.y>530){this.invincible=0;this.hurt();this.fallCount++;this.x=this.checkpoint.x;this.y=this.checkpoint.y;this.vx=0;this.vy=0;this.dash=0;this.buffer=0;this.grounded=true;this.coyote=.12}
  if(!this.arena){
   this.clearing.checkpoints.forEach((x,i)=>{if(this.x>x&&this.checkpointId<i+1){this.checkpointId=i+1;this.checkpoint={x,y:420};this.emit('checkpoint');this.banner='LANTERN LIT · FALL RECOVERY';this.bannerTime=2.2;}});
  }
  this.embers=this.embers.filter(e=>{if(Math.hypot(e.x-this.x,e.y-(this.y-18))<24){this.collected++;this.emit('pickup_essence');this.banner=this.collected===3?'THREE FLAMES · THE WAY IS OPEN':`FLAME ${this.collected} / 3`;this.bannerTime=1.8;return false}return true});
  if(!this.arena&&this.collected===3&&Math.hypot(this.x-this.clearing.exit.x,this.y-this.clearing.exit.y)<28){
   if(!this.foesAhead){this.mode='won';return}
   if(this.bannerTime<=0){this.banner='FOES STILL ROAM THE CLEARING';this.bannerTime=1.6;}
  }
  updateEnemies(this,dt);updateEnemyShots(this,dt);updatePatches(this,dt);
  if(!this.practice&&this.health<5&&this.bannerTime<=0&&!this.hinted.has('heal')&&this.deck.selectedPlay.heal){this.hinted.add('heal');this.banner='HEARTS MEND · PLAY THIS HAND TO HEAL';this.bannerTime=3.2;}
  for(const b of this.bolts){let old=b.x;b.x+=b.dir*680*dt;b.life-=dt;if(this.wall&&b.x>this.wall.x-8){b.life=0;continue}cutBossHazards(this,b,old);for(const e of this.enemies){const box=e.boss&&bossBox(e),lo=Math.min(old,b.x),hi=Math.max(old,b.x),reach=b.tier>=5?65:30;
   const miss=box?hi+6<box.x0||lo-6>box.x1||b.y<box.y0-reach/2||b.y>box.y1+4:e.x<lo-22||e.x>hi+22||Math.abs(e.y-23-b.y)>reach;
   if(miss||b.hit.has(e.id))continue;b.hit.add(e.id);if(b.tier===2)this.blast(e.x,e.y-22,100,b.damage,false,b.impact,b.blasted??=new Set());else{if(this.damage(e,b.damage,b.dir*(30+b.tier*5))!==false&&b.impact?.knock)this.knockBack(e,b.dir);this.pokerImpact(b.impact,e.hp<=0)}if(b.tier<3&&!b.impact?.pierce){b.life=0;break}}}
  this.bolts=this.bolts.filter(b=>b.life>0);this.removeDead();
  for(const r of this.impacts)r.life-=dt;this.impacts=this.impacts.filter(r=>r.life>0);
  for(const r of this.corpses){r.life-=dt;if(r.y<r.floor)r.y=Math.min(r.floor,r.y+500*dt);}this.corpses=this.corpses.filter(r=>r.life>0);
  for(const r of this.rings)r.life-=dt;this.rings=this.rings.filter(r=>r.life>0);
  for(const r of this.dust)r.life-=dt;this.dust=this.dust.filter(r=>r.life>0);
  for(const n of this.texts){n.life-=dt;n.y-=35*dt}this.texts=this.texts.filter(n=>n.life>0);
  for(const p of this.particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=250*dt}this.particles=this.particles.filter(p=>p.life>0);
  for(const drop of this.cardDrops)drop.age+=dt;

 }
}
