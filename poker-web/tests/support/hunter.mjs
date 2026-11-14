// An invulnerable hunter for soak tests: it walks, hops and drops along the same ledge graph the foes use,
// swings at whatever is nearest in the open section and plays any pair or better. It never dodges.
import {World,evaluate} from '../../model.mjs';
import {nextTransfer} from '../../enemies.mjs';
export function hunt(stage,{limit=900}={}){
 let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
 const w=new World(rnd);w.reset(stage);
 let t=0,last=0,surface=0,hop=null,lastKills=0,stuck=null;
 const under=(x,y)=>w.platforms.filter(p=>x>=p.x&&x<=p.x+p.w&&p.y>=y-1).sort((a,b)=>a.y-b.y)[0];
 while(t<limit){
  if(w.mode==='drafting'){w.chooseDraft(0);continue;}
  if(w.mode!=='playing')break;
  w.health=5;w.invincible=Math.max(w.invincible,.5);
  if(w.grounded&&w.surface>=0){surface=w.surface;hop=null;}
  const open=w.gates.filter(g=>g.open).length,foes=w.enemies.filter(e=>e.section<=open);
  if(!w.enemies.length)break;
  if(w.kills!==lastKills){lastKills=w.kills;last=t;}
  if(t-last>90){stuck={t,x:w.x,y:w.y,surface,foes:foes.map(e=>({kind:e.kind,skin:e.skin,x:Math.round(e.x),y:Math.round(e.y),s:e.surface,state:e.state,hp:e.hp}))};break;}
  const input={axis:0};
  const target=foes.sort((a,b)=>Math.abs(a.x-w.x)+Math.abs(a.y-w.y)-Math.abs(b.x-w.x)-Math.abs(b.y-w.y))[0];
  if(!target){ // section clear but gate logic pending, or foes only beyond: walk right
   input.axis=1;
  }else{
   const dx=target.x-w.x,dy=target.y-w.y,near=Math.abs(dx)<62&&Math.abs(dy)<38;
   const goal=target.fly?(target.aloft?null:under(target.x,target.y)):w.platforms.find(p=>p.id===target.surface);
   if(near){input.axis=Math.abs(dx)>6&&Math.sign(dx)!==w.facing?Math.sign(dx):0;input.sword=true;}
   else if(!w.grounded&&hop){input.axis=Math.sign(hop.target-w.x)*(Math.abs(hop.target-w.x)>4?1:0);}
   else if(!goal){/* hovering bird: wait for the dive */}
   else if(goal.id===surface){input.axis=Math.sign(dx);}
   else{
    const route=nextTransfer(w.platforms,surface,goal.id);
    if(!route){input.axis=Math.sign(dx);}
    else if(Math.abs(w.x-route.launch)>5)input.axis=Math.sign(route.launch-w.x);
    else if(w.grounded){hop=route;if(route.drop)input.drop=true;else{input.jump=true;input.axis=Math.sign(route.target-w.x);}}
   }
   const hand=evaluate(w.deck.hand);
   if(hand.tier>=1&&Math.abs(dy)<30&&Math.abs(dx)<320&&Math.sign(dx)===w.facing)input.play=true;
  }
  w.step(1/60,input);t+=1/60;
 }
 return {stage,name:w.clearing.name,time:+t.toFixed(0),kills:w.kills,left:w.enemies.length,gates:w.gates.filter(g=>g.open).length,falls:w.fallCount,stuck};
}
