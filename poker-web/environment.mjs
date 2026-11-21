import {snap,PIXEL} from './art.mjs';
import {WOOD_TILE_SIZE as TILE} from './tiles.mjs';
import {surfaceRuns,surfaceTiles,drawSurface} from './autotile.mjs';

// Source rectangles reference the original project sheets; source pixels always render at 2x.
function painter(ctx,images){
 const rect=(x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(snap(x),snap(y),snap(w),snap(h))};
 const sprite=(sheet,sx,sy,w,h,x,y)=>ctx.drawImage(images.get(sheet),sx,sy,w,h,snap(x),snap(y),w*PIXEL,h*PIXEL);
 return {rect,sprite};
}

const terrainPlans = new WeakMap();

const terrainStyles = {
 wood: {floor:'wood', ledge:'oak-root', details:'wood'},
 cave: {floor:'cave', ledge:'schist', details:'cave'},
 chapel: {floor:'chapel', ledge:'cornice', details:'chapel'},
 house: {floor:'house', ledge:'thorn-root', details:'house'},
 mill: {floor:'mill-board', ledge:'mill-board'},
 camp: {floor:'cave', ledge:'mill-board', details:'cave'},
 cottage: {floor:'oak-board', ledge:'oak-board'},
 inside: {floor:'rib', ledge:'rib'}
};

function terrainStyle(theme,location) {
 if (location==='inside') return terrainStyles.inside;
 if (location==='home') return terrainStyles.wood;
 if (location==='arena') {
  if (theme==='bridge') return terrainStyles.mill;
  if (theme==='cave') return terrainStyles.camp;
  if (theme==='house') return terrainStyles.cottage;
 }
 return terrainStyles[theme] ?? terrainStyles.wood;
}

// Derive every stamp from the landing geometry, including furniture that Red can stand on.
export function terrainRegions(platforms,theme,location='trail') {
 const style = terrainStyle(theme,location);
 return surfaceRuns(platforms.map(p => {
  const x = Math.round(p.x/PIXEL), y = Math.round(p.y/PIXEL);
  const furniture = p.kind==='bed' || p.kind==='mantel';
  const material = furniture ? (p.kind==='bed' ? 'quilt' : 'cornice') : p.ground ? style.floor : style.ledge;
  const h = p.ground ? 80 : p.kind==='bed' ? 12 : p.kind==='mantel' ? 8 : 16;
  return {x,y,w:Math.round((p.x+p.w)/PIXEL)-x,h,material,group:furniture ? p.kind : style.floor};
 }));
}

const detailRows = ['wood','cave','chapel','house'];
const detailSize = 32, detailTop = 12;
function decorateSurface(c,atlas,r,regions,family) {
 const row = detailRows.indexOf(family);
 if (row<0 || r.w<detailSize+10) return;
 // Give each run a stable, uneven rhythm. Leave both ends clear for jumps.
 let seed = (Math.imul(r.x+41,1597334677) ^ Math.imul(r.y+7,3812015801)) >>> 0;
 function next() {
  seed = (Math.imul(seed,1664525)+1013904223) >>> 0;
  return seed >>> 8;
 }
 let x = r.x+5+next()%Math.min(24,r.w-detailSize-9);
 let v = next()%4;
 while (x+detailSize<=r.x+r.w-5) {
  const pendant = r.material==='cornice' || r.material==='schist' && v%2===1;
  const y = r.y-detailTop+(pendant ? r.h-7 : 0);
  // An adjoining platform can cover only part of a cell at a step.
  if (!regions.some(q=>q!==r && q.x<x+detailSize && q.x+q.w>x && q.y<y+detailSize && q.y+q.h>y))
   c.drawImage(atlas,v*detailSize,row*detailSize,detailSize,detailSize,x,y,detailSize,detailSize);
  x += 56+next()%54;
  v = (v+1+next()%3)%4;
 }
}

// A macro pattern is four by three native cells. Adjacent sections share their
// boundary code so a single rock stratum or ashlar can cross an atlas boundary.
function foundation(c,sheet,r,row) {
 const sectionWidth=4*TILE, sectionHeight=3*TILE;
 const edge=(col,course) => {
  const n=Math.imul(col+51,1597334677)^Math.imul(course+row+13,3812015801);
  return (n^(n>>>15))&1;
 };
 for (let y=0; y<r.h; y+=TILE) for (let x=0; x<r.w; x+=TILE) {
  const col=Math.floor(x/sectionWidth)+Math.floor(r.x/sectionWidth);
  const course=Math.floor(y/sectionHeight);
  const code=edge(col,course)*4+edge(col+1,course)*2+((col+course)&1);
  const sx=code*sectionWidth+x%sectionWidth, sy=row*sectionHeight+y%sectionHeight;
  const w=Math.min(TILE,r.w-x), h=Math.min(TILE,r.h-y);
  c.drawImage(sheet,sx,sy,w,h,r.x+x,r.y+y,w,h);
 }
}

function drawBracket(c,sheet,r,regions,family) {
 const seed=(Math.imul(r.x+19,2654435761)^Math.imul(r.y,1597334677))>>>0;
 if (r.w<48 || seed%3===0) return;
 const x=r.x+5+(seed>>>8)%(r.w-detailSize-9);
 const y=r.y+r.h-4;
 let height=detailSize;
 for(const q of regions)
  if(q.y>r.y && q.x<x+detailSize && q.x+q.w>x) height=Math.min(height,q.y-y);
 if (height<=0) return;
 const row=detailRows.indexOf(family)+detailRows.length;
 const variant=family==='chapel' && height===detailSize ? 1+(seed&1) : (seed>>>6)%4;
 c.drawImage(sheet,variant*detailSize,row*detailSize,detailSize,height,x,y,detailSize,height);
}

function terrainPlan(platforms,theme,location,images) {
 let plans = terrainPlans.get(platforms);
 if (!plans) terrainPlans.set(platforms, plans = new Map());
 const style = terrainStyle(theme,location);
 if (plans.has(style)) return plans.get(style);
 const atlas = images.get('autotiles'), regions = terrainRegions(platforms,theme,location);
 const runs = regions.map(r => {
  const image = document.createElement('canvas');
  image.width = r.w;
  image.height = r.h+detailTop+detailSize;
  const c = image.getContext('2d'), y = r.y-detailTop;
  c.imageSmoothingEnabled = false;
  c.translate(-r.x,-y);
  const details = images.get('stage-details');
  if (style.details && r.material===style.ledge && r.material!==style.floor && r.material!=='mill-board')
   drawBracket(c,details,r,regions,style.details);
  drawSurface(c,atlas,surfaceTiles(r,regions));
  const foundationRow = detailRows.indexOf(r.material);
  if (foundationRow>=0) {
   c.globalCompositeOperation = 'source-atop';
   foundation(c,images.get('stage-foundations'),r,foundationRow);
   c.globalCompositeOperation = 'source-over';
   drawSurface(c,atlas,surfaceTiles(r,regions,r.material+'-trim'));
  }
  // Decorations grow from a compatible surface. Keep the camp's sawn beams bare.
  if (style.details && r.material!=='mill-board')
   decorateSurface(c,details,r,regions,style.details);
  return {x:r.x*PIXEL,y:y*PIXEL,image};
 });
 plans.set(style,runs);
 return runs;
}

export function drawTerrain(ctx,images,platforms,time,reduced,theme='wood',location='trail'){
 const {rect,sprite}=painter(ctx,images),ground=platforms.filter(p=>p.ground).sort((a,b)=>a.x-b.x);
 const runs=terrainPlan(platforms,theme,location,images);
 ctx.save();ctx.imageSmoothingEnabled=false;
 for(let i=1;i<ground.length;i++){
  const left=ground[i-1].x+ground[i-1].w,right=ground[i].x,y=ground[i].y;
  if(right<=left)continue;
  // The shadowed returns inside a pit use the actual banks' native faces.
  // Sample below the turf so the returns never read as another landing.
  rect(left,y,right-left,200,'#09151e');
  ctx.save();ctx.beginPath();ctx.rect(left,y,right-left,200);ctx.clip();
  ctx.globalAlpha=.42;
  for (const [edge,direction] of [[left,1],[right,-1]]) {
   const bank=runs.find(run=>run.y+detailTop*PIXEL===y &&
    (direction===1 ? run.x+run.image.width*PIXEL : run.x)===edge);
   if (!bank) continue;
   for(let row=0;row<5;row++){
    const width=Math.min(bank.image.width,Math.ceil((right-left)/(PIXEL*2)),12-row*2);
    const sx=direction===1 ? bank.image.width-width : 0;
    const sy=detailTop+TILE+(row%3)*TILE;
    const x=direction===1 ? edge : edge-width*PIXEL;
    ctx.drawImage(bank.image,sx,sy,width,TILE,x,y+row*TILE*PIXEL,width*PIXEL,TILE*PIXEL);
   }
  }
  ctx.restore();
 }
 ctx.restore();
 ctx.save();
 ctx.imageSmoothingEnabled=false;
 for(const {image,x,y} of runs)
  ctx.drawImage(image,x,y,image.width*PIXEL,image.height*PIXEL);
 ctx.restore();
 // Larger plants root in the banks. The native motifs carry the floating ledges.
 if (location!=='inside' && (theme==='wood' || theme==='house' && location!=='arena')) {
  for (const p of ground) if (p.w>300) {
   if (theme==='house') ctx.drawImage(images.get('house-bushes'),0,0,32,16,snap(p.x+140),p.y-28,64,32);
   else sprite('terrain',416,32,32,16,p.x+140,p.y-28);
  }
 }
 // Broken timber and hanging rope mark the two sides of each missing crossing.
 for(let i=1;i<ground.length;i++){
  const left=ground[i-1].x+ground[i-1].w,right=ground[i].x,y=ground[i].y;
  if(right<=left)continue;
  if(theme!=='cave'&&theme!=='chapel'){
   sprite('terrain',288,24,8,20,left-12,y+4);
   sprite('terrain',344,24,8,20,right-4,y+6);
  }
 }
}

export function drawHome(ctx,images,collected,time,reduced,x=2310){
 const {rect,sprite}=painter(ctx,images),ready=collected===3;
 ctx.save();ctx.translate(x-2310,0);
 // A small sanctuary assembled from the original gothic roof/walls, door and timber assets.
 // Authored around a doorway at (2310, 300), then moved onto the clearing's exit.
 sprite('terrain',288,16,64,8,2246,300);
 sprite('terrain',288,24,8,40,2246,316);
 sprite('terrain',344,24,8,40,2358,316);
 sprite('gothic',236,24,52,58,2258,184);
 rect(2294,254,32,46,ready?'#ffd083':'#1b2632');
 sprite('gothic',68,144,20,32,2290,236);
 if(ready){
  rect(2300,266,20,34,'#ffe4a6');rect(2298,296,24,4,'#fff1c1');
  ctx.globalAlpha=.12;rect(2288,276,44,24,'#ffe4a6');ctx.globalAlpha=1;
 }
 // Three inset ember sockets communicate why the entrance is still closed.
 for(let i=0;i<3;i++){
  rect(2294+i*12,230,8,8,'#101722');rect(2296+i*12,232,4,4,i<collected?'#ffe7a0':'#59645d');
 }
 // A planted timber sign and hanging lantern make the destination legible at a glance.
 sprite('terrain',288,24,8,28,2212,244);
 rect(2198,240,58,26,'#17202a');rect(2200,242,54,22,'#78523e');
 rect(2202,244,50,2,'#b68a58');rect(2202,260,50,2,'#49352e');
 ctx.fillStyle='#fff0b8';ctx.font='14px Silkscreen, monospace';ctx.fillText('HOME',2206,258);
 const frame=reduced?0:Math.floor(time*6)%3;
 rect(2346,242,4,44,'#342b2c');rect(2342,240,14,4,'#a58b5b');
 rect(2340,248,16,24,'#111a25');rect(2344,252,8,14,ready?'#ffeab2':'#e4ad60');
 rect(2346,254+frame*2,4,8,ready?'#fff9d8':'#ffdb8d');
 sprite('terrain',416,48,32,16,2328,280);
 ctx.restore();
}
