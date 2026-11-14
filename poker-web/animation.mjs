export const PLAYER_CLIPS={idle_blink:[3,'idle_blink'],run:[10,'run'],jump:[4,'jump'],fall:[4,'fall'],dash:[4,'dash'],attack1:[10,'attack1_'],attack2:[10,'attack2_'],look:[6,'look_intro'],attack3:[11,'attack3_'],transform:[38,'transform']};
export function playerClip(w){
 const form=w.dark>0?'dark':'light';
 if(w.attack>0)return {form:w.attackForm,state:w.attackMove||'attack1',facing:w.attackFacing};
 if(w.dash>0)return {form,state:'dash',facing:w.facing};
 if(w.transform>0&&w.morphPose)return {form:w.morphFrom,state:'transform',facing:w.morphFacing};
 if(w.cast>0)return {form:w.castForm,state:'attack3',facing:w.castFacing};
 // Standing still for a while, Red glances around now and then (the pack's look_intro row).
 if(w.grounded&&Math.abs(w.vx)<=10&&lookPhase(w)>=0)return {form,state:'look',facing:w.facing};
 return {form,state:!w.grounded?(w.vy<0?'jump':'fall'):Math.abs(w.vx)>10?'run':'idle_blink',facing:w.facing};
}
// Seconds into the current glance, or -1: the first comes after 4 s still, then one every 7 s.
export const LOOK=.9;
export function lookPhase(w){const t=w.idleTime||0;if(t<4)return -1;const p=(t-4)%7;return p<LOOK?p:-1;}
export function playerFrame(state,w,age){
 if(state==='look')return Math.min(5,Math.floor(Math.max(0,lookPhase(w))/LOOK*6));
 if(state==='transform')return Math.min(37,Math.floor((1-w.transform/w.morphDuration)*38));
 if(state==='attack1'||state==='attack2'){
  const elapsed=.32-w.attack;
  // The original sheet has its contact slash at frame 1, followed by recovery poses.
  return elapsed<.10?0:elapsed<.15?1:Math.min(9,2+Math.floor((elapsed-.15)/.17*8));
 }
 if(state==='attack3')return Math.min(10,1+Math.floor(Math.max(0,.36-w.cast-.06)/.30*10));
 if(state==='dash')return Math.min(3,Math.floor((1-w.dash/.14)*4));
 if(state==='idle_blink'){
  const blink=age%3.4,open=w.dark>0?2:0,closed=2-open;
  return blink<3.08?open:blink<3.16?1:blink<3.24?closed:blink<3.32?1:open;
 }
 if(state==='run')return Math.floor(age*(w.dark>0?18:16))%10;
 // Rise and fall settle into their final pose instead of restarting the takeoff repeatedly.
 return Math.min(3,Math.floor(age*16));
}
