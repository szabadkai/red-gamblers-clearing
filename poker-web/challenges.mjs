// Optional, authored trail challenges. They never gate the campaign or its grade.
export const CHALLENGES=[
 {id:'lantern-leaps',name:'Lantern leaps',points:[[220,360],[405,300],[575,240]]},
 {id:'mill-riders',name:'Bridge lift riders',points:[[445,330],[635,330]]},
 {id:'quiet-descent',name:'Quiet descent',points:[[3040,240],[3260,300],[3440,360],[3440,420]]},
 {id:'bell-song',name:'The bell song',points:[[2600,420],[2720,420],[2840,420]]},
 {id:'hearth-run',name:'Hearth run',points:[[4250,420],[4630,300]]}
];
const active=w=>w.challenge&&w.storyPhase==='trail'&&!w.practice&&!w.arena;
const near=(w,[x,y],range=42)=>Math.abs(w.x-x)<=range&&Math.abs(w.y-y)<=12&&w.grounded;
export function initChallenge(w,completed=false){
 const def=CHALLENGES[w.stageIndex];
 w.challenge={id:def.id,name:def.name,done:completed===true,index:0,ride:0,remaining:0,clock:0,falls:w.fallCount||0};
 if(w.stageIndex===1&&w.storyPhase==='trail'&&!w.arena){
  let id=Math.max(...w.platforms.map(p=>p.id))+1;
  for(const [i,x] of [400,590].entries())w.platforms.push({id:id++,x,y:330,w:90,ground:false,kind:'ruin',challengeLift:i});
 }
 return w.challenge;
}
// Move before the normal collision step, carrying a grounded passenger with the ledge.
export function beforeChallengeStep(w,dt){
 if(!active(w)||w.mode!=='playing'||w.hitStop>0||w.dying>0)return;
 const c=w.challenge;c.clock+=dt;
 if(w.stageIndex!==1)return;
 for(const p of w.platforms.filter(p=>p.challengeLift!==undefined)){
  const y=330+18*Math.sin(c.clock*1.4+p.challengeLift*Math.PI);
  if(w.grounded&&w.surface===p.id)w.y+=y-p.y;
  p.y=y;
 }
}
function finish(w){
 const c=w.challenge;if(c.done)return;
 c.done=true;c.remaining=0;w.health=Math.min(5,w.health+1);
 w.spawnCardDrop(w.deck.reward(),{x:w.x,y:w.y});
 w.banner='CHALLENGE COMPLETE · +1 HEART & CARD';w.bannerTime=3;
 w.emit('checkpoint');w.storyRevision=(w.storyRevision||0)+1;
}
export function updateChallenge(w,dt,input={}){
 if(!active(w)||w.challenge.done||!['playing','won'].includes(w.mode)||w.dying>0)return;
 const c=w.challenge,points=CHALLENGES[w.stageIndex].points;
 if(w.stageIndex===0){
  if(near(w,points[c.index],30)&&++c.index===points.length)finish(w);
 }else if(w.stageIndex===1){
  const p=w.platforms.find(p=>p.id===w.surface);
  if(w.grounded&&p?.challengeLift===c.index){
   c.ride+=dt;
   if(c.ride>=.65){c.ride=0;c.index++;if(c.index===2)finish(w);}
  }else c.ride=0;
 }else if(w.stageIndex===2){
  if(c.index>0&&(input.jump||(w.fallCount||0)!==c.falls)){c.index=0;return;}
  if(near(w,points[c.index],38)){
   c.falls=w.fallCount||0;c.index++;
   if(c.index===points.length)finish(w);
  }
 }else if(w.stageIndex===3){
  if(!input.interact)return;
  const bell=points.findIndex(point=>near(w,point,44));if(bell<0)return;
  const order=[0,2,1];
  c.index=bell===order[c.index]?c.index+1:bell===0?1:0;
  w.emit('checkpoint');
  if(c.index===3)finish(w);
  else{w.banner=c.index?`BELL SONG · ${c.index}/3`:'TRY LOW · HIGH · MIDDLE';w.bannerTime=1.5;}
 }else if(w.stageIndex===4){
  if(input.interact&&near(w,points[0],48)){c.index=1;c.remaining=12;c.falls=w.fallCount||0;}
  if(c.index===1){
   c.remaining=Math.max(0,c.remaining-dt);
   if(c.remaining===0||(w.fallCount||0)!==c.falls){c.index=0;c.remaining=0;}
   else if(near(w,points[1],42))finish(w);
  }
 }
}
export function challengeHint(w){
 if(!active(w)||w.mode!=='playing')return null;
 const c=w.challenge,points=CHALLENGES[w.stageIndex].points;
 const nearby=w.x>=points[0][0]-170&&w.x<=points.at(-1)[0]+120;
 if(!nearby)return null;
 if(c.done)return {text:`${c.name} complete · bonus heart and card`,canInteract:false};
 const prefix='Optional · ';
 if(w.stageIndex===0)return {text:`${prefix}Lantern leaps · touch the three lights in order (${c.index}/3)`,canInteract:false};
 if(w.stageIndex===1)return {text:`${prefix}Ride each lift until its light fills (${c.index}/2)`,canInteract:false};
 if(w.stageIndex===2)return {text:`${prefix}Quiet descent · follow the four lights without jumping (${c.index}/4); drop through ledges`,canInteract:false};
 if(w.stageIndex===3)return {text:`${prefix}Bell song · LOW, HIGH, MIDDLE (${c.index}/3) · interact beside a bell`,canInteract:points.some(p=>near(w,p,44))};
 return {text:c.index===1?`${prefix}Hearth run · reach the upper lantern · ${c.remaining.toFixed(1)}s`:`${prefix}Hearth run · carry a flame to the upper lantern in 12s`,canInteract:near(w,points[0],48)};
}
