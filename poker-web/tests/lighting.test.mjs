import {test} from 'node:test';
import assert from 'node:assert/strict';
import {contactShadow,drawAtmosphere,drawSpellLight} from '../lighting.mjs';

test('contact shadows choose the nearest surface below and never bridge a gap',()=>{
 const platforms=[{x:0,y:420,w:200},{x:300,y:420,w:200},{x:40,y:300,w:80}];
 assert.equal(contactShadow({x:250,y:400},platforms),null);
 assert.equal(contactShadow({x:80,y:310},platforms).y,420,'ignore the ledge above the actor');
 assert.equal(contactShadow({x:80,y:290},platforms).y,300);
 const edge=contactShadow({x:198,y:420},platforms);
 assert.ok(edge.x+edge.w<=200);
 assert.equal(contactShadow({x:80,y:100},platforms),null,'no detached shadow far below');
 const grounded=contactShadow({x:350,y:420},platforms),jump=contactShadow({x:350,y:340},platforms);
 assert.ok(jump.alpha<grounded.alpha&&jump.w<grounded.w);
});

// Capture the drawing commands: reduced decoration must not depend on either
// the moving camera or clock, while the projectile itself remains positioned.
function recorder(){
 const commands=[];
 const ctx=new Proxy({globalAlpha:1},{get(target,key){
  if(key in target)return target[key];
  if(key==='createLinearGradient')return (...args)=>{commands.push([key,...args]);return {addColorStop:(...a)=>commands.push(['stop',...a])}};
  return (...args)=>commands.push([key,...args]);
 },set(target,key,value){target[key]=value;commands.push([key,value?.addColorStop?'gradient':value]);return true}});
 return {ctx,commands};
}
test('Reduced Motion freezes atmosphere and removes decorative projectile trails',()=>{
 // Supply only the offscreen canvas API needed to prepare a cached light.
 const previous=globalThis.document;
 globalThis.document={createElement:()=>({getContext:()=>({createRadialGradient:()=>({addColorStop(){}}),fillRect(){}})})};
 try{
  for(const theme of ['wood','bridge','cave','chapel','house']){
   const a=recorder(),b=recorder();drawAtmosphere(a.ctx,0,0,true,theme);drawAtmosphere(b.ctx,640,20,true,theme);
   assert.deepEqual(a.commands,b.commands,theme);
  }
  const bolt={x:100,y:250,tier:5,dir:1},a=recorder(),b=recorder();
  drawSpellLight(a.ctx,bolt,0,true);drawSpellLight(b.ctx,bolt,12,true);assert.deepEqual(a.commands,b.commands);
 }finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});
