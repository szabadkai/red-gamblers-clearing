import {snap} from './art.mjs';
import {drawGlow} from './lighting.mjs';

// The atlas has six 32x24 cells, all rooted at the bottom and drawn at 2x.
// Placement is stable and cached against level geometry, never random per frame.
const plans=new WeakMap();
const hash=n=>((Math.imul(n+73,1597334677)>>>0)%1000)/1000;
export function floraPlacements(platforms,clearing){
 const out=[],theme=clearing.theme;
 for(const p of platforms){
  if(p.w<96||['bed','mantel','lower'].includes(p.kind))continue;
  if(theme==='bridge'&&!p.ground&&p.kind!=='branch')continue;
  if(theme!=='bridge'&&!p.ground&&p.id%3!==0)continue;
  const seed=p.id*31+Math.round(p.x),branch=p.kind==='branch';
  // One small cluster on a ledge; widely spaced groups on long banks/decks.
  const step=theme==='chapel'?440:branch?300:360;
  for(let x=p.x+36+Math.floor(hash(seed)*30),i=0;x<=p.x+p.w-36;x+=step,i++){
   if((clearing.checkpoints||[]).some(cx=>Math.abs(cx-x)<46))continue;
   if(clearing.exit&&Math.abs(clearing.exit.x-x)<64)continue;
   if((clearing.embers||[]).some(([ex,ey])=>Math.abs(ex-x)<44&&Math.abs(ey-p.y)<70))continue;
   if((clearing.npcs||[]).some(([nx,s])=>Math.abs(nx-x)<46&&platforms[s]?.y===p.y))continue;
   // Omit areas tucked beneath an upper surface, where tall stems would clip.
   if(platforms.some(q=>q!==p&&q.y<p.y&&q.y>p.y-48&&q.x<x+26&&q.x+q.w>x-26))continue;
   const n=hash(seed+i*17);
   const cell=theme==='cave'?4+(n>.55?1:0):branch||theme==='chapel'?(n>.55?1:0):
    p.kind==='bridge'||p.kind==='root'?3:p.ground?(n>.78?1:2+(n>.36?1:0)):(n>.55?1:0);
   out.push({x:snap(x),y:p.y,cell,flip:n>.5});
  }
 }
 return out;
}
export function drawFlora(ctx,images,world,cam){
 // Indoor furniture and guardian arenas keep their authored silhouettes.
 if(world.arena||['inside','arena','home'].includes(world.storyLocation))return;
 const sheet=images.get('woodland-flora');if(!sheet)return;
 let plan=plans.get(world.platforms);
 if(!plan){plan=floraPlacements(world.platforms,world.clearing);plans.set(world.platforms,plan);}
 ctx.save();ctx.imageSmoothingEnabled=false;
 for(const f of plan){
  if(f.x<cam-40||f.x>cam+1000)continue;
  // Constant, low-intensity light: flowers never pulse like a collectible.
  if(f.cell<2){
   drawGlow(ctx,f.x,f.y-26,42,'gold',.65);
   const blooms=f.cell===0?[[24,7],[8,13],[27,17]]:[[23,13],[6,17]];
   for(const [x,y] of blooms)drawGlow(ctx,f.x+(x-16)*2*(f.flip?-1:1),f.y-46+(y+2)*2,14,'gold',.6);
  }else drawGlow(ctx,f.x,f.y-16,30,f.cell>=4?'mint':'gold',f.cell>=4?.5:.24);
  ctx.save();ctx.translate(f.x,snap(f.y));if(f.flip)ctx.scale(-1,1);
  ctx.drawImage(sheet,f.cell*32,0,32,24,-32,-46,64,48);ctx.restore();
 }
 ctx.restore();
}
