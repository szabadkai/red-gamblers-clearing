// Predictable, readable enemies: scouts can pursue across nearby ledges; brutes hold ground.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const ENEMY_TYPES={
 scout:{hp:14,speed:95,wind:.4,lunge:310,recovery:.65},
 brute:{hp:56,speed:40,wind:.75,lunge:0,recovery:.95},
 runner:{hp:10,speed:145,wind:.3,lunge:390,recovery:.8},
 mage:{hp:18,speed:55,wind:.8,lunge:0,recovery:1.35},
 guard:{hp:42,speed:48,wind:.85,lunge:0,recovery:1.1},
 // rears up, then charges `action` seconds along its ledge from up to `reach` away
 charger:{hp:30,speed:70,wind:.7,lunge:430,recovery:1.1,reach:220,action:.7},
 // speed is flight speed, lunge the dive speed
 flyer:{hp:8,speed:190,wind:.45,lunge:430,recovery:.9}
};
// Build a graph of physically reachable surface transfers, then route one hop at a time.
const graphCache=new WeakMap();
function transfers(platforms){
 if(graphCache.has(platforms))return graphCache.get(platforms);
 const graph=new Map(platforms.map(p=>[p.id,[]]));
 for(const a of platforms)for(const b of platforms){
  if(a===b||a.y-b.y>65)continue;
  let best=null;
  for(const launch of [a.x+18,a.x+a.w-18,clamp(b.x+b.w/2,a.x+18,a.x+a.w-18)]){
   let target=clamp(launch,b.x+18,b.x+b.w-18);const drop=b.y>a.y&&target===launch;
   if(b.y>a.y&&!drop&&target>a.x-10&&target<a.x+a.w+10){
    // A hop down that would land back on its own ledge is aimed so the foe is already clear of the
    // ledge's end when it falls back through the height it jumped from.
    const fall=(430+Math.sqrt(430*430-2*1300*(a.y-b.y)))/1300,level=2*430/1300;
    target=[a.x+a.w+12,a.x-12].map(edge=>launch+(edge-launch)*fall/level).filter(x=>x>=b.x+18&&x<=b.x+b.w-18).sort((p,q)=>Math.abs(p-launch)-Math.abs(q-launch))[0];
    if(target===undefined)continue;
   }
   const flight=drop?Math.sqrt(2*(b.y-a.y)/1300):(430+Math.sqrt(430*430-2*1300*(a.y-b.y)))/1300;
   if(Math.abs(target-launch)>250*flight)continue;
   const edge={to:b.id,launch,target,flight,drop};
   if(!best||Math.abs(target-launch)<Math.abs(best.target-best.launch))best=edge;
  }
  if(best)graph.get(a.id).push(best);
 }
 graphCache.set(platforms,graph);return graph;
}
export function nextTransfer(platforms,from,to){
 if(from===to)return null;const graph=transfers(platforms),queue=[{id:from,first:null}],seen=new Set([from]);
 for(let i=0;i<queue.length;i++){const item=queue[i];for(const edge of graph.get(item.id)||[]){
  if(seen.has(edge.to))continue;const first=item.first||edge;if(edge.to===to)return first;
  seen.add(edge.to);queue.push({id:edge.to,first});
 }}return null;
}
function playerSurface(world){
 return world.platforms.filter(p=>world.x+9>p.x&&world.x-9<p.x+p.w&&p.y>=world.y-.5)
  .sort((a,b)=>a.y-b.y)[0];
}
// Crows and ravens: perch until they notice Red, hover above and to one side, then dive at the ground
// under her. The dive is aimed when its tell begins; the bird sits where it lands until it recovers.
function updateFlyer(world,e,def,dt,aware,dx){
 const flyTo=(x,y,speed)=>{
  const ox=x-e.x,oy=y-e.y,d=Math.hypot(ox,oy);if(d<=speed*dt){e.x=x;e.y=y;return true;}
  e.x+=ox/d*speed*dt;e.y+=oy/d*speed*dt;if(Math.abs(ox)>1)e.face=Math.sign(ox);return false;
 };
 e.cool=Math.max(0,(e.cool||0)-dt);
 if(e.state==='windup'){e.wind-=dt;if(e.wind<=0){e.wind=0;e.state='lunge';e.connected=false;}return;}
 if(e.state==='lunge'){
  const landed=flyTo(e.aimX,e.aimY,def.lunge);
  if(!e.connected&&Math.abs(world.x-e.x)<26&&Math.abs(world.y-e.y)<34){world.hurt(e.x);e.connected=true;}
  if(landed){e.aloft=false;e.rest=def.recovery;e.cool=.5;e.state='recover';}
  return;
 }
 if(!aware){const home=flyTo(e.home.x,e.home.y,def.speed);e.aloft=!home;e.state=home?'idle':'chase';return;}
 const floor=playerSurface(world)?.y??world.y,side=Math.sign(e.x-world.x)||e.face||1;
 const there=flyTo(clamp(world.x+side*100,e.left,e.right),floor-92,def.speed);
 e.aloft=true;e.state='chase';e.face=Math.sign(dx)||e.face;
 if(there&&e.cool<=0){e.state='windup';e.wind=def.wind;e.strikeDir=e.face;e.aimX=world.x;e.aimY=floor;}
}
// Seconds a wisp spends vanishing and reforming; it moves at the halfway point and cannot be hit meanwhile.
export const BLINK=.5;
// A wisp with Red in its face slips past her: 190 to her far side, on a ledge near the one she stands on.
function blinkSpot(world,e){
 const floor=playerSurface(world)?.y??e.y,wall=world.wall;
 for(const side of [Math.sign(world.x-e.x)||1,-(Math.sign(world.x-e.x)||1)]){
  const x=world.x+side*190;
  if(wall&&(x-wall.x)*(e.x-wall.x)<=0)continue;
  const p=world.platforms.filter(p=>Math.abs(p.y-floor)<=130&&x>p.x+20&&x<p.x+p.w-20).sort((a,b)=>Math.abs(a.y-floor)-Math.abs(b.y-floor))[0];
  if(p)return {x,p};
 }
 return null;
}
export function updateEnemies(world,dt){
 // Foes beyond a closed briar gate keep to their side and ignore Red until it opens.
 const wall=world.wall,held=wall?world.gates.indexOf(wall):-1;
 for(const e of world.enemies){
  if(e.boss||e.storyTarget)continue;
  const beyond=wall&&e.section>held;
  if(wall){const side=beyond?1:-1;if((e.x-wall.x)*side<26){e.x=wall.x+side*26;if(e.air)e.airVX=0;}}
  const def=ENEMY_TYPES[e.kind]||ENEMY_TYPES[e.tough?'brute':'scout'];
  e.flash=Math.max(0,e.flash-dt);e.hurt=Math.max(0,(e.hurt||0)-dt);e.brace=Math.max(0,(e.brace||0)-dt);e.hopCD=Math.max(0,(e.hopCD||0)-dt);
  if(e.air){const oldY=e.y;e.vy+=1300*dt;e.x+=e.airVX*dt;e.y+=e.vy*dt;let landing=null;
   if(e.vy>=0)for(const p of world.platforms){if(e.x+8>p.x&&e.x-8<p.x+p.w&&oldY<=p.y+.5&&e.y>=p.y&&(!landing||p.y<landing.y))landing=p}
   if(landing){e.air=false;e.y=landing.y;e.vy=0;e.surface=landing.id;e.left=landing.x+14;e.right=landing.x+landing.w-14;e.x=clamp(e.x,e.left,e.right);e.rest=.16;e.state='recover'}
   if(e.y>540)e.hp=0;
   continue;
  }
  if(e.state==='blink'){
   e.action-=dt;
   if(e.spot&&e.action<=BLINK/2){const {x,p}=e.spot;e.spot=null;e.x=x;e.y=p.y;e.surface=p.id;e.left=p.x+16;e.right=p.x+p.w-16;}
   if(e.action<=0)e.state='recover';
   continue;
  }
  if(e.rest>0){e.rest=Math.max(0,e.rest-dt);e.state=e.flash>0?'stagger':'recover';e.wind=0;continue}
  const dx=world.x-e.x,dy=world.y-e.y;
  // world.calm: the trail's opening scene has not played yet, so nothing hunts Red at the trailhead.
  const visible=!beyond&&!world.calm&&Math.abs(dx)<360&&Math.abs(dy)<210;
  e.alert=visible?5:Math.max(0,(e.alert||0)-dt);
  const aware=visible||e.alert>0;
  if(e.fly){updateFlyer(world,e,def,dt,aware,dx);continue;}
  const destination=playerSurface(world);
  const sameSurface=destination?.id===e.surface;
  if(e.state==='windup'){
   e.wind-=dt;
   if(e.wind<=0){e.wind=0;
    if(e.kind==='mage'){
     const length=Math.hypot(e.aimX,e.aimY)||1;
     // A hex has no projectile: its flames rise from the patch marked when the tell began.
     const patch=e.hexing&&world.patches.find(p=>p.owner===e.id&&p.delay>0);
     if(patch)patch.delay=0;else world.enemyShots.push({x:e.x+e.strikeDir*16,y:e.y-24,vx:e.aimX/length*220,vy:e.aimY/length*220,life:2.2,arrow:!!e.arrow,look:e.look});
     e.hexed=!!e.hexing;e.hexing=false;e.rest=def.recovery;e.state='recover';e.cast=true;
    }else if(e.rooted){
     // Brambles lash one way, further than a slam: get behind them or stay out of reach.
     const ahead=dx*e.strikeDir;if(ahead>-24&&ahead<120&&Math.abs(dy)<34)world.hurt(e.x);
     world.rings.push({x:e.x+e.strikeDir*84,y:e.y-4,radius:40,dark:false,physical:true,life:.25});e.rest=def.recovery;e.state='recover';
    }else if(e.tough){if(Math.abs(dx)<90&&Math.abs(dy)<30)world.hurt(e.x);world.rings.push({x:e.x,y:e.y-4,radius:90,dark:false,physical:true,life:.25});e.rest=def.recovery;e.state='recover'}else{e.state='lunge';e.action=def.action||.17;e.connected=false}
   }
   continue;
  }
  if(e.state==='lunge'){
   e.x=clamp(e.x+e.strikeDir*def.lunge*dt,e.left,e.right);e.action-=dt;
   if(!e.connected&&Math.abs(world.x-e.x)<39&&Math.abs(world.y-e.y)<32){world.hurt(e.x);e.connected=true}
   // A charge also ends where the ledge does.
   if(e.action<=0||(def.action&&(e.x<=e.left||e.x>=e.right))){e.rest=def.recovery;e.state='recover'}continue;
  }
  // Once it has cast, a wisp that finds Red within arm's reach blinks away before it casts again.
  if(e.blink&&e.cast&&aware&&Math.abs(dx)<170&&Math.abs(dy)<110&&(e.spot=blinkSpot(world,e))){
   e.cast=false;e.state='blink';e.action=BLINK;e.face=Math.sign(dx)||e.face;world.emit('dash');continue;
  }
  if(e.kind==='mage'&&aware&&Math.abs(dx)<310&&Math.abs(dy)<110){
   e.state='windup';e.wind=def.wind;e.strikeDir=Math.sign(dx)||e.face;e.face=e.strikeDir;
   // Aim is committed at the beginning of the tell, so movement can evade it.
   e.aimX=dx;e.aimY=dy+2;
   // Every other spell from a witch is a hex on the ground Red stands on as the tell begins.
   e.hexing=!!e.hex&&!!destination&&(e.spells=(e.spells||0)+1)%2===0;e.hexed=false;
   if(e.hexing){e.wind=HEX_TELL;world.patches.push({owner:e.id,x:world.x,y:destination.y,w:56,delay:HEX_TELL,life:HEX_BURN});}
   continue;
  }
  if(aware&&sameSurface&&Math.abs(dx)<(e.rooted?112:def.reach||(e.tough?80:88))&&Math.abs(dy)<32){
   e.state='windup';e.wind=def.wind;e.strikeDir=Math.sign(dx)||e.face;e.face=e.strikeDir;continue;
  }
  if(e.rooted){e.state='idle';if(aware)e.face=Math.sign(dx)||e.face;continue;}
  if(!aware){e.idleClock=(e.idleClock||0)+dt;if(e.idleClock>2.2){e.state='idle';if(e.idleClock>3.1)e.idleClock=0;continue;}}else e.idleClock=0;
  e.state=aware?'chase':'patrol';
  let route=null;
  if(aware&&destination&&!sameSurface)route=nextTransfer(world.platforms,e.surface,destination.id);
  if(route&&wall&&(route.launch-wall.x)*(route.target-wall.x)<0)route=null;
  if(route&&e.hopCD<=0&&Math.abs(e.x-route.launch)<8){
   // Commit to a measured landing point. No steering or teleporting during a jump.
   e.airVX=(route.target-e.x)/route.flight;e.vy=route.drop?0:-430;
   if(route.drop)e.y+=2;
   e.air=true;e.hopCD=.45;e.state=route.drop?'drop':'jump';
   e.face=Math.sign(e.airVX)||e.face;continue;
  }
  let direction=route?Math.sign(route.launch-e.x):(aware?Math.sign(dx):e.patrolDir);
  if(!aware&&(e.x<=e.left+2||e.x>=e.right-2)){e.patrolDir=e.x<=e.left+2?1:-1;direction=e.patrolDir}
  const speed=aware?def.speed:28;
  const oldX=e.x;e.x=clamp(e.x+direction*speed*dt,e.left,e.right);
  if(Math.abs(e.x-oldX)>.01){e.face=direction;e.walk+=dt}
 }
}

// A hex: marked for HEX_TELL seconds while the witch holds her tell, then it burns for HEX_BURN.
export const HEX_TELL=1,HEX_BURN=.5;
export function updatePatches(world,dt){
 for(const p of world.patches){
  if(p.delay>0){
   // Interrupting or killing the witch before the flames rise cancels them.
   const owner=world.enemies.find(e=>e.id===p.owner);if(!owner||owner.state!=='windup')p.life=0;
   continue;
  }
  p.life-=dt;if(Math.abs(world.x-p.x)<p.w/2&&Math.abs(world.y-p.y)<34)world.hurt(p.x);
 }
 world.patches=world.patches.filter(p=>p.life>0);
}
export function updateEnemyShots(world,dt){
 for(const b of world.enemyShots){
  const x=b.x,y=b.y;b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
  // Swept point against Red's center; fast shots cannot skip between frames.
  const dx=b.x-x,dy=b.y-y,length=dx*dx+dy*dy;
  const t=length?clamp(((world.x-x)*dx+(world.y-22-y)*dy)/length,0,1):0;
  if(Math.hypot(x+dx*t-world.x,y+dy*t-(world.y-22))<18){world.hurt(x);b.life=0;}
  for(const p of world.platforms){if(b.x>=p.x&&b.x<=p.x+p.w&&b.y>=p.y&&b.y<=p.y+(p.ground?120:24)){b.life=0;break}}
 }
 world.enemyShots=world.enemyShots.filter(b=>b.life>0);
}
