import {snap} from './art.mjs';

// Renderer-only lighting. Small cached stamps keep the same two-unit
// placement as the sprites; no full-screen blur or per-frame image processing.
const stamps=new Map();
const COLORS={gold:'255,206,119',mint:'136,220,196',violet:'190,133,244',moon:'166,198,226'};
function lightStamp(color){
 if(stamps.has(color))return stamps.get(color);
 const c=document.createElement('canvas');c.width=c.height=96;
 const g=c.getContext('2d'),fill=g.createRadialGradient(48,48,0,48,48,48);
 fill.addColorStop(0,`rgba(${color},.65)`);fill.addColorStop(.18,`rgba(${color},.34)`);
 fill.addColorStop(.5,`rgba(${color},.10)`);fill.addColorStop(1,`rgba(${color},0)`);
 g.fillStyle=fill;g.fillRect(0,0,96,96);stamps.set(color,c);return c;
}
export function drawGlow(ctx,x,y,r,color='gold',strength=1){
 ctx.save();ctx.globalAlpha*=strength;
 ctx.drawImage(lightStamp(COLORS[color]||COLORS.gold),snap(x-r),snap(y-r),snap(r*2),snap(r*2));ctx.restore();
}

const THEMES={wood:{color:'gold',rgb:'244,224,158',strength:.13},
 bridge:{color:'moon',rgb:'175,214,221',strength:.09},
 cave:{color:'mint',rgb:'116,216,207',strength:.07},
 chapel:{color:'moon',rgb:'190,204,243',strength:.16},
 house:{color:'violet',rgb:'200,157,215',strength:.09}};

// Atmospheric planes sit behind terrain and actors, leaving all combat tells
// and landing edges untouched. Decorative movement freezes with Reduced Motion.
export function drawAtmosphere(ctx,cam,time,reduced,theme){
 const look=THEMES[theme]||THEMES.wood,t=reduced?0:time,view=reduced?0:cam;
 ctx.save();
 const shade=ctx.createLinearGradient(0,80,0,470);
 shade.addColorStop(0,'#07111e48');shade.addColorStop(.42,'#07111e00');shade.addColorStop(1,'#07111e65');
 ctx.fillStyle=shade;ctx.fillRect(0,80,960,400);
 // Broad, interrupted shafts instead of a uniform screen-wide color wash.
 for(let i=0;i<3;i++){
  const x=((i*397+170-view*.16)%1240+1240)%1240-180;
  const sway=Math.sin(t*.18+i)*8,width=[90,48,124][i];
  const g=ctx.createLinearGradient(x,80,x-100,430);
  g.addColorStop(0,`rgba(${look.rgb},0)`);g.addColorStop(.18,`rgba(${look.rgb},${look.strength})`);g.addColorStop(1,`rgba(${look.rgb},0)`);
  ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(snap(x+sway),80);ctx.lineTo(snap(x+width+sway),80);
  ctx.lineTo(snap(x+width-130),450);ctx.lineTo(snap(x-210),450);ctx.closePath();ctx.fill();
  drawGlow(ctx,x-65,300,150,look.color,.14);
 }
 // Two wide, low mist banks give depth without covering the playable floor.
 for(let i=0;i<2;i++){
  const x=((i*610-view*.28+t*5)%1460+1460)%1460-250;
  ctx.save();ctx.translate(snap(x),370+i*28);ctx.scale(1,.12);
  drawGlow(ctx,0,0,350,look.color,.22);ctx.restore();
 }
 ctx.restore();
}

// Project only onto an actual surface below the actor, never across a chasm.
// Edge clipping also keeps shadows from painting the air beyond a narrow ledge.
export function contactShadow(actor,platforms,radius=18){
 let surface=null;
 for(const p of platforms)if(actor.x>=p.x&&actor.x<=p.x+p.w&&p.y>=actor.y-4&&p.y-actor.y<130&&(!surface||p.y<surface.y))surface=p;
 if(!surface)return null;
 const height=Math.max(0,surface.y-actor.y),r=radius*(1-height/190);
 const left=Math.max(surface.x,actor.x-r),right=Math.min(surface.x+surface.w,actor.x+r);
 return {x:snap(left),y:snap(surface.y),w:snap(right-left),alpha:.29*(1-height/150)};
}
export function drawContactShadows(ctx,world,cam){
 ctx.save();
 const actors=[world,...world.enemies];
 for(const actor of actors){
  if(actor.x<cam-100||actor.x>cam+1060||actor.state==='blink')continue;
  const s=contactShadow(actor,world.platforms,actor.boss?36:actor.tough?25:18);if(!s||s.w<2)continue;
  ctx.globalAlpha=s.alpha;ctx.fillStyle='#06101b';
  ctx.fillRect(s.x,s.y,s.w,4);ctx.fillRect(s.x+4,s.y-2,Math.max(0,s.w-8),8);
 }
 ctx.restore();
}

export function drawSpellLight(ctx,bolt,time,reduced){
 const dark=bolt.tier>=5,color=dark?'violet':'gold';
 drawGlow(ctx,bolt.x,bolt.y,dark?70:48,color,.7);
 if(reduced)return;
 const phase=Math.floor(time*18)%6;
 ctx.save();ctx.fillStyle=dark?'#dbb0ff':'#ffdf99';
 for(let i=0;i<5;i++){
  const distance=18+i*11+phase*2;
  ctx.globalAlpha=(1-i/5)*.65;
  ctx.fillRect(snap(bolt.x-bolt.dir*distance),snap(bolt.y+Math.sin(i*2.4+phase)*10),i<2?4:2,2);
 }
 ctx.restore();
}
