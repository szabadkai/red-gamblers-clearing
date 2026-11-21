// Renderer-only skin. Simulation controls position, attack windows and hit-stop.
import {DEATH_TIME} from './model.mjs';
import {playerFrame} from './animation.mjs';
export const STORYBOOK_CELL=64;
export const STORYBOOK_PIVOT={x:32,y:54};
const frame=(progress,count=8)=>Math.min(count-1,Math.max(0,Math.floor(progress*count)));

export function storybookFrame(world,state,age){
 if(world.dying>0)return 56+frame(1-world.dying/DEATH_TIME);
 if(world.hurtTime>0)return 48+frame(1-world.hurtTime/.4);
 if(state==='attack1'||state==='attack2'){
  const elapsed=.32-world.attack,base=state==='attack2'?104:96;
  // Distinct strikes; contact art spans the existing 100–150ms damage window.
  return base+(elapsed<.1?frame(elapsed/.1,2):elapsed<.15?2:3+frame((elapsed-.15)/.17,5));
 }
 if(state==='attack3')return 112+frame(1-world.cast/.36);
 if(state==='transform'){
  const progress=1-world.transform/world.morphDuration;
  // Collapse, switch form inside the cloak, then unfold the new form.
  return 120+(progress<.5?frame(progress*2,4):3-frame((progress-.5)*2,4));
 }
 if(state==='dash')return 80+playerFrame('dash',world,age);
 if(state==='jump')return 72+playerFrame('jump',world,age);
 if(state==='fall')return 76+playerFrame('fall',world,age);
 // Landing squash also plays when running out of a jump.
 if(world.land>0)return world.land>.06?84:85;
 // Preserve the original 10/16s light and 10/18s dark stride period.
 if(state==='run')return 64+Math.floor(Math.max(0,age)*(world.dark>0?18:16)*8/10)%8;
 if(state==='look')return 88+playerFrame('look',world,age);
 const blink=Math.max(0,age)%3.4;
 return blink<3.08?0:blink<3.16?3:blink<3.24?4:blink<3.32?3:0;
}

export function storybookForm(world,clip){
 if(clip.state==='transform'&&world.transform/world.morphDuration<=.5)
  return clip.form==='light'?'dark':'light';
 return clip.form;
}

export function prepareStorybook(atlas){
 const result={light:[],dark:[]},cell=STORYBOOK_CELL;
 for(const form of ['light','dark'])for(let i=0;i<128;i++){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=cell;
  const ctx=canvas.getContext('2d');
  ctx.drawImage(atlas,(i%8)*cell,Math.floor(i/8)*cell,cell,cell,0,0,cell,cell);
  if(form==='dark'){
   const pixels=ctx.getImageData(0,0,cell,cell),d=pixels.data;
   for(let p=0;p<d.length;p+=4)if(d[p+3]&&d[p]>d[p+1]*1.6&&d[p]>d[p+2]*1.4){
    const red=d[p];d[p]=Math.round(red*.72);d[p+1]=Math.round(d[p+1]*.8);d[p+2]=Math.min(255,Math.round(red*.82));
   }
   ctx.putImageData(pixels,0,0);
  }
  result[form].push(canvas);
 }
 return result;
}
