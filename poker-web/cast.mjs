import {ENEMY_TYPES} from './enemies.mjs';
// Little Red Riding Hood roster: 32x32 cells, one tag per sheet row, feet on the bottom row.
// Rows: idle(4) run(4) attack(6) special(8) hit(4) death(8). Facing right in the source.
export const CELL=32;
const ROW={idle:[0,4],run:[1,4],attack:[2,6],special:[3,8],hit:[4,4],death:[5,8]};
// Highest opaque source row across the action rows; keeps health bars and lines above the head.
export const CAST={
 big_bad_wolf:5,rogue_hunter:13,forest_witch:5,wild_boar:7,forest_crow:10,living_tree:7,thorn_brambles:7,
 lost_wisp:9,brown_bear:1,forest_stag:0,spore_mushroom:5,ghost_hunter:8,raven:0,will_o_wisp:3,
 wolf_in_disguise:12,mother:6,grandmother:9,woodcutter:6
};
export const castTop=skin=>CAST[skin]??0;
// Bow and crossbow skins shoot arrows (ranged 'mage' behaviour) and draw their bow on the attack row.
export const ARCHERS=new Set(['rogue_hunter','ghost_hunter']);
// Wisps cast on the attack row (the orb leaves their mouth) and vanish and reform on the special row.
export const BLINKERS=new Set(['will_o_wisp','lost_wisp']);
// Witches alternate their bolt with a hex (flames from the ground, special row); brambles are rooted and lash.
export const HEXERS=new Set(['forest_witch']);
export const ROOTED=new Set(['thorn_brambles']);
// Special moves, each on the creature's special row: the living tree sends roots up under Red, the mushroom
// bursts into a spore cloud when crowded, the ghost hunter phases through her, the bear roars into a rage.
export const ERUPTERS=new Set(['living_tree']),CLOUDERS=new Set(['spore_mushroom']),PHASERS=new Set(['ghost_hunter']),RAGERS=new Set(['brown_bear']);
// What a caster's shot looks like; anything else throws the wisps' teal orb.
export const SHOT_LOOK={forest_witch:'hex',spore_mushroom:'spore'};
// Skin-specific behaviour flags, set when a foe is spawned or re-dressed.
export const traits=skin=>({skin,arrow:ARCHERS.has(skin),blink:BLINKERS.has(skin)||PHASERS.has(skin),phase:PHASERS.has(skin),hex:HEXERS.has(skin),rooted:ROOTED.has(skin),erupts:ERUPTERS.has(skin),cloud:CLOUDERS.has(skin),rage:RAGERS.has(skin),look:SHOT_LOOK[skin]||'orb'});
// Each clearing dresses its enemy behaviours in local wildlife. Every flyer uses the raven sheet: the older
// forest_crow sheet has no hover or dive pose and reads poorly against the dark backdrops, so it is unused.
const DEFAULT={scout:['big_bad_wolf'],brute:['brown_bear'],runner:['wild_boar'],flyer:['raven'],charger:['forest_stag'],mage:['forest_witch','will_o_wisp'],guard:['living_tree']};
const THEMES={
 'lantern-wood':{scout:['big_bad_wolf'],mage:['rogue_hunter'],brute:['brown_bear'],runner:['wild_boar']},
 'broken-crossing':{mage:['forest_witch'],runner:['wild_boar']},
 'moss-cavern':{runner:['wild_boar'],mage:['spore_mushroom','lost_wisp'],guard:['living_tree']},
 'ruined-chapel':{guard:['thorn_brambles','living_tree'],mage:['ghost_hunter','will_o_wisp'],runner:['wild_boar']},
 'thorn-house':{scout:['wolf_in_disguise'],runner:['wild_boar'],mage:['forest_witch','will_o_wisp'],guard:['brown_bear','thorn_brambles']}
};
export function skinFor(kind,clearingId,slot=0){
 const list=THEMES[clearingId]?.[kind]||DEFAULT[kind]||DEFAULT.scout;
 return list[slot%list.length];
}
function cell(tag,index){const [row,count]=ROW[tag];return {tag,x:(Math.max(0,index)%count)*CELL,y:row*CELL,w:CELL,h:CELL};}
// Maps the existing enemy state machine onto the roster tags.
export function castFrame(e,time){
 if((e.hurt||0)>0||e.state==='stagger'){const t=.32-(e.hurt||0);return cell('hit',t<.06?0:Math.min(3,1+Math.floor((t-.06)/.087)));}
 if(e.fly){
  // Birds perch on the idle row, fly on the run row and dive on the attack row.
  if(e.state==='windup')return cell('attack',Math.min(1,Math.floor((1-Math.max(0,e.wind||0)/ENEMY_TYPES.flyer.wind)*2)));
  if(e.state==='lunge')return cell('attack',2+Math.floor(time*12)%2);
  return e.aloft?cell('run',Math.floor(time*10+(e.id||0))):cell('idle',Math.floor(time*5+(e.id||0)));
 }
 if(e.state==='blink')return cell('special',1+Math.min(e.phase?3:5,Math.floor((1-Math.max(0,e.action||0)/.5)*(e.phase?4:6))));
 if(e.state==='roar')return cell('special',1+Math.min(4,Math.floor((1-Math.max(0,e.action||0)/.8)*5)));
 const caster=e.kind==='mage';
 if(e.state==='windup'){
  // Every tell is the first half of the attack row; a witch's hex raises the staff on her special row.
  if(e.hexing)return cell('special',Math.min(5,Math.floor((1-Math.max(0,e.wind||0))*6)));
  if(e.erupting)return cell('special',Math.min(4,Math.floor((1-Math.max(0,e.wind||0)/.9)*5)));
  if(e.puffing)return cell('special',Math.min(2,Math.floor((1-Math.max(0,e.wind||0)/.6)*3)));
  const total=e.windTotal||(ENEMY_TYPES[e.kind]||ENEMY_TYPES.scout).wind,progress=1-Math.max(0,e.wind||0)/total;
  return cell('attack',Math.min(2,Math.floor(progress*3)));
 }
 // A stag's charge is the leap on its special row.
 if(e.state==='lunge'&&e.kind==='charger')return cell('special',2+Math.floor(time*12)%3);
 if(e.state==='lunge')return cell('attack',3+Math.min(2,Math.floor((.17-(e.action||0))/.06)));
 if(e.air)return cell('run',e.vy<0?1:3);
 // Follow-through: the shot leaving, the hex burning out, the bramble's vine coming down.
 if(caster&&e.state==='recover'){const since=ENEMY_TYPES.mage.recovery-(e.rest||0);if(e.hexed){if(since<.5)return cell('special',since<.25?6:7);}else if(e.puffed){if(since<.7)return cell('special',3+Math.min(3,Math.floor(since/.175)));}else{if(since<.14)return cell('attack',3);if(since<.4)return cell('attack',5);}}
 if(e.erupted&&e.state==='recover'){const since=ENEMY_TYPES.guard.recovery-(e.rest||0);if(since<.4)return cell('special',since<.2?5:6);}
 if(e.rooted&&e.state==='recover'){const since=ENEMY_TYPES.guard.recovery-(e.rest||0);if(since<.3)return cell('attack',since<.12?3:4);}
 if(['chase','patrol','jump','drop'].includes(e.state))return cell('run',Math.floor((e.walk||0)*10+(e.id||0)));
 return cell('idle',Math.floor(time*5+(e.id||0)));
}
// Corpses play the death row once (90 ms a frame), then hold the last frame while they fade.
export const deathFrame=(life,duration)=>cell('death',Math.min(7,Math.floor((duration-life)/.09)));
export const idleFrame=(time,phase=0)=>cell('idle',Math.floor(time*5+phase));
