import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {CLEARINGS,platformsFor} from '../journey.mjs';
import {arenaPlatforms} from '../story-data.mjs';
import {bridgeRegions} from '../bridge-art.mjs';
import {drawTerrain,terrainRegions} from '../environment.mjs';
import {surfaceTiles} from '../autotile.mjs';

test('all five trails and arenas choose native surfaces at the authored landing bounds',async()=>{
 const png=await readFile(new URL('../assets/environment/autotiles.png',import.meta.url));
 const width=png.readUInt32BE(16),height=png.readUInt32BE(20);
 function check(platforms,regions) {
  for(const p of platforms){
   const x=p.x/2, y=p.y/2;
   const r=regions.find(r=>r.x===x && r.y===y && r.w===p.w/2);
   assert.ok(r,'landing has a face at its exact coordinates');
   for(const t of surfaceTiles(r,regions)) {
    assert.ok(t.sx>=0 && t.sy>=0 && t.sx+t.w<=width && t.sy+t.h<=height);
    assert.ok([t.x,t.y,t.sx,t.sy,t.w,t.h].every(Number.isInteger));
   }
  }
 }
 const ledges=['oak-root','mill-board','mill-board','cornice','quilt'];
 CLEARINGS.forEach(({theme},stage)=>{
  const trail=platformsFor(stage);
  if(theme==='bridge'){
   const bridge=bridgeRegions(trail);check([...bridge.keys()],[...bridge.values()]);
  }else check(trail,terrainRegions(trail,theme));
  const arena=arenaPlatforms(stage),regions=terrainRegions(arena,theme,'arena');
  check(arena,regions);
  assert.ok(regions.some(r=>r.material===ledges[stage]));
 });
});

test('final story rooms keep their own surfaces when reusing cottage coordinates',()=>{
 const materials=location=>new Set(terrainRegions(arenaPlatforms(4,location),'house',location).map(r=>r.material));
 assert.deepEqual(materials('arena'),new Set(['oak-board','cornice','quilt']));
 assert.deepEqual(materials('inside'),new Set(['rib']));
 assert.deepEqual(materials('garden'),new Set(['house','thorn-root']));
 assert.deepEqual(materials('home'),new Set(['wood','oak-root']));
});

test('each room bakes integer source pixels once and reuses that surface while moving',t=>{
 let baked=0;
 const images=new Map(['stage-details','autotiles','stage-foundations','terrain','house-bushes'].map(k=>[k,{}]));
 const bake={translate(){},drawImage(img,sx,sy,sw,sh,x,y,w,h){
  assert.ok(img);
  assert.deepEqual([sw,sh],[w,h]);
  assert.ok([sx,sy,x,y,sw,sh].every(Number.isInteger));
  assert.equal(this.imageSmoothingEnabled,false);
 }};
 const prev=globalThis.document;
 globalThis.document={createElement(){baked++;return {getContext:()=>bake}}};
 t.after(()=>{if(prev)globalThis.document=prev;else delete globalThis.document});
 const screen={drawImage(img){assert.ok(img)},save(){},restore(){}};
 for(const [stage,location] of [[0,'arena'],[1,'arena'],[2,'arena'],[3,'arena'],[4,'arena'],[4,'inside'],[4,'garden'],[4,'home']]){
  const platforms=arenaPlatforms(stage,location),theme=location==='home'?'wood':CLEARINGS[stage].theme;
  const before=baked;
  drawTerrain(screen,images,platforms,0,false,theme,location);
  const bakedOnce=baked;
  assert.ok(bakedOnce>before);
  drawTerrain(screen,images,platforms,2,true,theme,location);
  assert.equal(baked,bakedOnce);
 }
});
