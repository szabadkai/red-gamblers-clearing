import {CHALLENGES} from './challenges.mjs';

// These markers use their own outlines and numerals; hue is never the only cue.
export function drawChallenge(ctx,w){
 const c=w.challenge;
 if(!c||w.storyPhase!=='trail'||w.arena||w.practice)return;
 const points=CHALLENGES[w.stageIndex].points;
 ctx.save();ctx.textAlign='center';ctx.font='10px Silkscreen, monospace';
 points.forEach(([x,y],i)=>{
  const lift=w.stageIndex===1?w.platforms.find(p=>p.challengeLift===i):null;
  if(lift){x=lift.x+lift.w/2;y=lift.y;}
  const lit=c.done||(w.stageIndex===3?[0,2,1].slice(0,c.index).includes(i):i<c.index);
  ctx.fillStyle='#16231f';ctx.fillRect(x-13,y-45,26,29);
  ctx.strokeStyle=lit?'#ffe8a8':'#b8c5c1';ctx.lineWidth=2;ctx.strokeRect(x-12,y-44,24,27);
  ctx.fillStyle=lit?'#ffe8a8':'#c1d2c4';
  if(w.stageIndex===3){
   ctx.beginPath();ctx.moveTo(x-7,y-25);ctx.lineTo(x-5,y-34-i*2);ctx.lineTo(x+5,y-34-i*2);ctx.lineTo(x+7,y-25);ctx.closePath();ctx.fill();
   ctx.fillRect(x-2,y-23,4,3);
  }else ctx.fillText(lit?'✓':String(i+1),x,y-25);
  ctx.fillStyle='#697d73';ctx.fillRect(x-1,y-15,2,15);
  if(lift){
   const px=lift.x,py=Math.round(lift.y);
   // Telescoping supports end on the safe bridge deck. The broad wooden top
   // reads as a solid landing surface at exactly the collision height.
   for(const offset of [12,lift.w-16]){
    ctx.fillStyle='#172a2c';ctx.fillRect(px+offset-2,py+8,8,360-py-8);
    ctx.fillStyle='#80908a';ctx.fillRect(px+offset,py+8,3,360-py-8);
    ctx.fillStyle='#394d4b';ctx.fillRect(px+offset-5,356,14,4);
   }
   ctx.fillStyle='#17231f';ctx.fillRect(px,py,lift.w,13);
   ctx.fillStyle='#78583d';ctx.fillRect(px+2,py+2,lift.w-4,8);
   ctx.fillStyle='#b08a52';ctx.fillRect(px+2,py,lift.w-4,3);
   ctx.fillStyle='#493a2e';ctx.fillRect(px+2,py+9,lift.w-4,2);
   for(const offset of [23,45,67]){ctx.fillRect(px+offset,py+3,2,6);}
   for(const offset of [5,lift.w-10]){
    ctx.fillStyle='#3e504d';ctx.fillRect(px+offset,py+1,5,10);
    ctx.fillStyle='#c3c1a2';ctx.fillRect(px+offset+1,py+3,2,2);ctx.fillRect(px+offset+1,py+7,2,2);
   }
   const fill=lit?1:c.index===i?Math.min(1,c.ride/.65):0;
   ctx.fillStyle='#182820';ctx.fillRect(px+13,py+4,lift.w-26,4);
   ctx.fillStyle='#f1d59a';ctx.fillRect(px+14,py+5,(lift.w-28)*fill,2);
  }
  if(w.stageIndex===3){ctx.fillStyle='#18251f';ctx.fillRect(x-29,y+6,58,17);ctx.fillStyle='#e1d5b8';ctx.fillText(['LOW','MIDDLE','HIGH'][i],x,y+18);}
 });
 ctx.restore();
}
