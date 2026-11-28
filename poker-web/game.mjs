import {drawFlora} from './flora.mjs';
import {drawAtmosphere,drawContactShadows,drawGlow,drawSpellLight} from './lighting.mjs';
import {drawBridgeBackdrop,drawBridgeArchitecture,drawBridgeAtmosphere,drawBriarDock} from './bridge.mjs';
import {CLEARINGS} from './journey.mjs';
import {StoryWorld,loadStory,saveStory,BOSS_DEATH,loadRecords,saveRecord,replayStages} from './story.mjs';
import {challengeHint} from './challenges.mjs';
import {drawChallenge} from './challenge-art.mjs';
import {STAGES,SCENES,CAST} from './story-data.mjs';
import {STORY_IMAGES,drawStoryActor,drawStorySet,drawStoryPortrait,bedCover} from './story-art.mjs';
import {CHAPEL_COCOON,drawHazardArt} from './arena-art.mjs';
import {installLocalTools} from './runtime.mjs';
import {createMenu} from './menu.mjs';
import {loadSettings,bindSettings,bindKeyboard} from './settings.mjs';
import {ACTIONS,createControls,keyName,LAYOUTS,PAD_BUTTONS,SLOT_KEYS} from './input.mjs';
import {createMusic,tuneFor,BOSS_TUNES} from './music.mjs';
import {prepareScenery,drawBackdrop,drawLandmarks,drawTrailGate,drawGates,drawGateGuide,drawForeground} from './scenery.mjs';
import {PLAYER_CLIPS,playerClip,playerFrame} from './animation.mjs';
import {drawTerrain,drawHome} from './environment.mjs';
import {snap,characterSize,playerOffset,castShape,shakeOffset} from './art.mjs';
import {World,evaluate,previewDraw,handPotential,bestDrawPreview,DAMAGE,flavourText,EFFECTS,HANDS,WIDTH,cardName,CORPSE_LIFE,DUST_LIFE,DEATH_TIME} from './model.mjs';
import {CAST as ROSTER,CELL,castFrame,castTop,deathFrame,idleFrame} from './cast.mjs';
const $=id=>document.getElementById(id),canvas=$('game'),screen=canvas.getContext('2d'),raster=document.createElement('canvas');
raster.width=960;raster.height=540;const ctx=raster.getContext('2d');
const world=new StoryWorld(),keys=new Set(),edges=new Set();let releaseJump=false,started=false,loaded=false,loadFailed=false;
let inputDevice='keyboard',lastReserve=null,lastSlotView='';
let reduced=false,cam=0,accumulator=0,last=0,visual=0,hover=-1,toast='';
let camLead=340,leadFacing=1,facingFor=9,settledFacing=1,previousMode='ready',lastHand='',formClock=0,lastAnim='',cameraSnap=true,lastDraft=null;
const images=new Map(),cards=new Map();
const storage={getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)};
// Advice already shown stays shown across visits; a new journey shows it again.
let hintCount=0;try{for(const key of JSON.parse(storage.getItem('red.poker.hints')||'[]'))world.hinted.add(key);hintCount=world.hinted.size}catch{}
const controls=createControls(storage),settings=loadSettings(storage),deviceMotion=matchMedia('(prefers-reduced-motion: reduce)');
const menu=createMenu(()=>{if(started&&world.mode==='paused')pause()});
let checkpointSaved=true;
let savedJourney=loadStory(storage),persistedCompletion=false,lastStoryRevision=-1,lastSceneLine="",skipHeld=0,skipStarted=null,replayHints=null;
const defs=PLAYER_CLIPS;
// Clearing grades: the best per clearing sits beside its name on the title trail; recorded once per result.
let recorded=null,recordNote=null;
const clock=s=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
function showRecords(){const all=loadRecords(storage);$('journey-trail').querySelectorAll('span').forEach((el,i)=>{const r=all[CLEARINGS[i].id];el.querySelector('b')?.remove();if(r){const b=document.createElement('b');b.className='grade-'+r.grade;b.textContent=r.grade+(r.rules===2?'':' · Legacy');b.title=`${r.rules===2?'Best':'Legacy grade'} ${r.grade} · fastest ${clock(r.time)}${r.rareHand?' · Rare hand achieved':''}`;el.append(b)}})}
function openReplay(){
 const unlocked=new Set(replayStages(storage,savedJourney)),records=loadRecords(storage);
 $('replay-list').replaceChildren();
 CLEARINGS.forEach((clearing,stage)=>{
  const button=document.createElement('button'),name=document.createElement('strong'),detail=document.createElement('span'),record=records[clearing.id];
  button.dataset.replayStage=stage;button.disabled=!unlocked.has(stage);
  name.textContent=`${['I','II','III','IV','V'][stage]} · ${clearing.name}`;
  detail.textContent=button.disabled?'Locked · complete this clearing in your journey':record?
   `${record.rules===2?'Best':'Legacy'} ${record.grade} · fastest ${clock(record.time)}${record.rareHand?' · Rare hand achieved':''}`:'Completed · set your first replay record';
  button.append(name,detail);
  button.onclick=()=>{
   if(!loaded||!unlocked.has(stage))return;
   replayHints=new Set(world.hinted);world.startReplay(stage);cardSeen.clear();recorded=null;recordNote=null;
   menu.home(false);enterWorld();
  };
  $('replay-list').append(button);
 });
 $('replay-note').textContent=unlocked.size?'Scores from replays count toward your chapter records.':'Finish a clearing to unlock its replay.';
 menu.open('replay',$('open-replay').hidden?$('continue'):$('open-replay'));
}
showRecords();
const tasks=[];
function loadImage(key,url){tasks.push(new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{images.set(key,image);resolve()};image.onerror=()=>reject(new Error('Could not load '+url));image.src=url}))}
for(const form of ['light','dark'])for(const [state,[count,prefix]] of Object.entries(defs))for(let i=0;i<count;i++)loadImage(`${form}/${state}/${i}`,`./assets/${form}/${state}/${prefix}${form==='light'&&state==='attack3'?String(i).padStart(2,'0'):i}.png`);
for(let i=1;i<=7;i++)loadImage('forest'+i,`./assets/forest/${i}.png`);
for(const [form,fx] of [['light','FX_light'],['light','FX_lighttodark'],['dark','FX_dark'],['dark','FX_darktolight']])for(let i=0;i<36;i++)loadImage(`${fx}/${i}`,`./assets/${form}/${fx}/${fx}${i}.png`);
loadImage('cave','./assets/environment/cave.png');
loadImage('terrain','./assets/environment/terrain.png');loadImage('gothic','./assets/environment/gothic.png');
for(const name of ['forest','stone','thorn-house','oaks','moss-cavern-v2','ruined-chapel-v2','interior-props-v2','masonry-v2'])loadImage('concept-'+name,`./assets/concept/${name==='oaks'?'parallax-oaks':name}.png`);
for(const name of ['bridge-atlas-v1','bridge-distance-v1'])loadImage('concept-'+name,`./assets/concept/${name}.png`);
for(const [key,url] of Object.entries(STORY_IMAGES))loadImage(key,url);
loadImage('bridge-bough','./assets/bridge/moss-bough.png');
loadImage('stage-foundations','./assets/environment/stage-foundations.png');
loadImage('stage-details','./assets/environment/stage-details.png');
loadImage('woodland-flora','./assets/environment/woodland-flora.png');
loadImage('autotiles','./assets/environment/autotiles.png');
loadImage('bridge-tiles','./assets/bridge/stone-tiles.png');
loadImage('cards','./assets/cards.png');loadImage('dock-branch','./assets/ui/dock_branch.png');loadImage('dock-corner','./assets/ui/dock_corner.png');loadImage('dungeon','./assets/dungeon.png');for(const name of Object.keys(ROSTER))loadImage('cast/'+name,`./assets/cast/${name}_sheet.png`);
const total=tasks.length;let done=0;tasks.forEach(p=>p.then(()=>{$('loading').textContent=`Opening the forest · ${Math.round(++done/total*100)}%`},()=>{}));
function titleMenu() {
 const saved=savedJourney;
 $('title-brand').hidden=false;
 $('story-eyebrow').hidden=$('story-title').hidden=$('grade').hidden=true;
 $('story-copy').textContent='Carry Grandmother’s cards into the woods.';
 $('begin').disabled=!loaded&&!loadFailed;
 $('begin').textContent=loadFailed?'Reload game':saved?'New journey':'Begin journey';
 $('begin').classList.toggle('menu-primary',!saved||loadFailed);
 $('continue').hidden=!loaded||!saved;
 $('continue').textContent=saved?.complete?'Replay chapters':'Continue journey';
 $('save-status').textContent=saved?'Saved journey · '+CLEARINGS[saved.stage].name:'';
 $('open-replay').hidden=!loaded||!!saved?.complete;
 $('restart').hidden=$('return-title').hidden=true;
 $('open-credits').hidden=false;
}
function focusTitleAction() {
 if(document.activeElement===document.body||document.activeElement===$('stage'))menu.focusPrimary();
}
Promise.all(tasks).then(()=>{
 prepareScenery(images);loaded=true;titleMenu();$('loading').textContent='';updateUI(true);focusTitleAction();
}).catch(err=>{
 loadFailed=true;titleMenu();$('loading').textContent='The forest could not be loaded. Check your connection and try again.';focusTitleAction();console.error(err);
});
function sound(name){if(settings.sound)music.sfx(name)}
// Haptics on touch screens (where the browser supports them): getting hurt, a finisher, a kill, the bear's roar.
const BUZZ={player_hurt:70,finisher:20,enemy_death:12,roar:[40,40,60]};
function buzz(name){if(BUZZ[name]&&navigator.vibrate&&(document.body.classList.contains('touch-seen')||matchMedia('(pointer: coarse)').matches))try{navigator.vibrate(BUZZ[name])}catch{}}
const music=createMusic();
function syncMusic(){
 const silent=!settings.sound||!started||world.mode==='paused'||world.mode==='dead'||document.hidden;
 music.play(silent?'':tuneFor(world),world.storyPhase==='cleared'?'victory':'');if(started)music.preload(BOSS_TUNES[world.stageIndex]);
}
function focusGame(){if(started&&world.mode==='playing')$('stage').focus({preventScroll:true})}
function clearInput(){skipStarted=null;skipHeld=0;keys.clear();edges.clear();heldCodes.clear();releaseJump=false;accumulator=0}
function enterWorld(){lastAnim='';lastHand='';formClock=0;cam=0;cameraSnap=true;cardPositions.clear();departing.length=0;clearInput();started=true;persistedCompletion=false;$('overlay').hidden=true;updateUI(true);focusGame()}
function persistJourney(){
 if(world.practice||world.replay)return;
 checkpointSaved=saveStory(storage,world);
 if(checkpointSaved)savedJourney=loadStory(storage);
 lastStoryRevision=world.storyRevision;
}
function reset(fresh=false){if(fresh){world.hinted.clear();cardSeen.clear();world.reset();}else if(world.practice&&world.bossPractice){world.practiceDeal(world.stageIndex+10)}else if(world.practice){world.reset(savedJourney?.stage||0,savedJourney)}else world.retry();enterWorld();persistJourney()}
function nextClearing(){if(world.advance()){enterWorld();persistJourney();sound('checkpoint')}}
function pause(){
 if(!started||!['playing','paused'].includes(world.mode))return;
 clearInput();
 world.mode=world.mode==='playing'?'paused':'playing';
 updateUI(true);focusGame();
}
function returnToTitle(){
 if(replayHints){world.hinted=new Set(replayHints);hintCount=world.hinted.size;replayHints=null;}
 started=false;clearInput();previousMode='ready';
 $('overlay').hidden=false;$('loading').textContent='';
 titleMenu();menu.home();updateUI(true);
}
// Held actions from every device. A key remembers the action it pressed, so a rebind mid-hold still releases it.
const heldCodes=new Map();
function press(action){if(keys.has(action))return;keys.add(action);edges.add(action)}
function release(action){keys.delete(action);if(action==='jump')releaseJump=true}
const inControl=e=>e.target instanceof Element&&e.target.closest('button,summary,a');
// Choice screens take the same commands from the keyboard and the gamepad.
const MODALS={
 cards:{buttons:['slot-prev','slot-next','slot-confirm','slot-cancel'],prev:()=>world.moveCardSelection(-1),next:()=>world.moveCardSelection(1),confirm:()=>finishCardSelection(true),cancel:()=>finishCardSelection(false)},
 lantern:{buttons:['lantern-keep','lantern-deal'],prev:()=>$('lantern-keep').focus(),next:()=>$('lantern-deal').focus(),confirm:()=>finishLantern(true),choose:i=>finishLantern(i===0)},
 cutscene:{buttons:['dialogue-next','dialogue-skip'],confirm:()=>finishDialogue(false),cancel:()=>finishDialogue(true)},
 drafting:{buttons:['draft-left','draft-right','draft-skip'],prev:()=>$('draft-left').focus(),next:()=>$('draft-right').focus(),confirm:()=>finishDraft(0),cancel:()=>finishDraft(null),choose:i=>finishDraft(i)}
};
const inModal=()=>world.mode==='cards'||started&&$('overlay').hidden&&!!MODALS[world.mode];
function modalCommand(command,arg){
 const modal=MODALS[world.mode];if(!modal)return;
 const buttons=modal.buttons.map($),i=buttons.indexOf(document.activeElement);
 if(command==='confirm'){if(i>=0)buttons[i].click();else modal.confirm();}
 else if(command==='tab')buttons[(i+(arg?buttons.length-1:1)+buttons.length)%buttons.length].focus();
 else modal[command]?.(arg);
}
function keyCommand(e,action){
 const code=e.code,slot=SLOT_KEYS.indexOf(code);
 if(code==='Tab')return ['tab',e.shiftKey];
 if(code==='ArrowLeft'||action==='left')return ['prev'];
 if(code==='ArrowRight'||action==='right')return ['next'];
 if(code==='Enter'||code==='Space'||action==='interact')return ['confirm'];
 // Escape holds to skip a scene (see the frame loop); elsewhere it backs out, as does the pause key.
 if(world.mode!=='cutscene'&&(action==='pause'||world.mode==='cards'&&action==='cards'))return ['cancel'];
 if(slot===0||slot===1)return ['choose',slot];
 return null;
}
const layoutBanner=()=>`${LAYOUTS[controls.layout].name.toUpperCase()} · ${controls.label('jump')} JUMP · ${controls.label('sword')} SWORD · ${controls.label('play')} PLAY`;
window.addEventListener('keydown',e=>{
 inputDevice='keyboard';
 let action=controls.action(e.code);
 if(inModal()){
  if(world.mode==='cutscene'&&e.code==='Escape'){e.preventDefault();if(!e.repeat){skipStarted=performance.now();skipHeld=0;}return;}
  const command=keyCommand(e,action);
  if(command||action)e.preventDefault();
  if(command&&!e.repeat)modalCommand(...command);
  return;
 }
 if(!$('overlay').hidden){
  if(!e.repeat&&action==='retry'&&started&&!$('menu-home').hidden){
   if(world.mode==='dead')reset();else if(world.mode==='paused')$('restart').click();
  }else menu.key(e,action);
  return;
 }
 if(inControl(e)&&['Enter','Space'].includes(e.code))return;
 if(e.target instanceof Element&&e.target.matches('select,input'))return;
 if(!action&&started&&world.mode==='playing'&&controls.notice(e.code)){action=controls.action(e.code);world.banner=layoutBanner();world.bannerTime=3;}
 if(!action)return;
 e.preventDefault();if(e.repeat)return;
 if(action==='pause'){pause();return}
 if(action==='retry'){if(started&&world.mode==='playing'){pause();$('restart').click();}return}
 if(!started||world.mode!=='playing')return;
 if(action==='cards'){openCardSelection();return;}
 heldCodes.set(e.code,action);press(action);
});
window.addEventListener('keyup',e=>{
 if(e.code==='Escape'){skipStarted=null;skipHeld=0;}
 const action=heldCodes.get(e.code);if(!action)return;
 heldCodes.delete(e.code);if(!inControl(e))e.preventDefault();
 if(![...heldCodes.values()].includes(action))release(action);
});
window.addEventListener('blur',()=>{clearInput();if(started&&world.mode==='playing'){world.mode='paused';updateUI(true)}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();if(started&&world.mode==='playing'){world.mode='paused';updateUI(true)}}});
function newJourney() {
 if(savedJourney)menu.confirm($('begin'),'Start a new journey?','Your new journey will replace the saved checkpoint in '+CLEARINGS[savedJourney.stage].name+'. Your clearing records stay with you.','Start new journey',()=>reset(true));
 else reset(true);
}
$('begin').onclick=()=>{
 if(loadFailed){location.reload();return;}
 if(!loaded)return;
 if(!started){newJourney();return;}
 if(world.mode==='paused')pause();
 else if(world.mode==='won'&&world.replay){returnToTitle();openReplay();}
 else if(world.mode==='won'&&!world.practice){if(world.stageIndex<CLEARINGS.length-1)nextClearing();else newJourney();}
 else reset();
};
$('continue').onclick=()=>{if(loaded&&savedJourney){if(savedJourney.complete){openReplay();return;}world.reset(savedJourney.stage,savedJourney);enterWorld();persistJourney()}};
$('open-replay').onclick=openReplay;
$('restart').onclick=()=>{
 if(world.practice){reset();return;}
 menu.confirm($('restart'),world.arena?'Retry this encounter?':'Retry from the saved gate?',world.arena?(world.lanternDeck?'Your chosen opening hand returns. This adds one retry to your grade.':'Restart this room with a fresh hand. This adds one retry to your grade.'):'Restart at the last opened briar gate, or the clearing entrance if none are open. Lantern posts recover falls only. This adds one retry to your grade.','Retry',()=>reset());
};
$('return-title').onclick=()=>{
 if(world.mode!=='paused'||world.practice){returnToTitle();return;}
 menu.confirm($('return-title'),'Return to the title?',world.replay?'End this replay? Your campaign checkpoint stays unchanged.':checkpointSaved?'Continue will pick up at your saved gate or encounter.':'Browser storage is unavailable. Progress from this visit may be lost.','Return to title',returnToTitle);
};
$('pause').onclick=pause;
$('play').onclick=()=>{if(started&&world.mode==='playing'){world.play();updateUI(true);focusGame()}};
$('collect-card').onclick=()=>{if(world.collectCard()){clearInput();updateUI(true)}};
$('challenge-interact').onclick=()=>{if(started&&world.mode==='playing'){world.interactChallenge();clearInput();updateUI(true);focusGame();}};
$('inspect-cards').onclick=openCardSelection;
$('slot-prev').onclick=()=>{world.moveCardSelection(-1);updateUI()};
$('slot-next').onclick=()=>{world.moveCardSelection(1);updateUI()};
$('slot-confirm').onclick=()=>finishCardSelection(true);
$('slot-cancel').onclick=()=>finishCardSelection(false);
$('cycle').onclick=()=>{if(started&&world.cyclePlay()){updateUI();focusGame()}};
function applySettings(){
 reduced=settings.motion==='system'?deviceMotion.matches:settings.motion==='reduced';
 document.body.classList.toggle('reduced',reduced);
 music.setLevels(settings.sound?settings.music/100:0,settings.sound?settings.effects/100:0);
}
bindSettings(settings,storage,applySettings);
bindKeyboard(controls,ACTIONS,keyName);
// Key names written into the page: the field guide, the screen-reader description and the shortcut hints.
function showKeys(){
 const k=id=>controls.label(id);
 for(const el of document.querySelectorAll('[data-key]'))el.textContent=k(el.dataset.key);
 $('stage').setAttribute('aria-label',`Platforming game. ${k('left')} and ${k('right')} move, ${k('jump')} jumps, ${k('dash')} dashes, ${k('down')} drops through ledges, ${k('sword')} attacks, ${k('cycle')} cycles scoring combinations and ${k('play')} plays the highlighted cards. Keys 1 to 5 throw a single card or replace it with your saved draw. ${k('interact')} collects nearby drops or interacts with challenge markers. ${k('cards')} opens the paused card inspector.`);
 $('pause').setAttribute('aria-keyshortcuts',`${k('pause')} Escape`);$('cycle').setAttribute('aria-keyshortcuts',k('cycle'));$('inspect-cards').setAttribute('aria-keyshortcuts',k('cards'));
}
controls.onChange(showKeys);showKeys();
deviceMotion.addEventListener('change',applySettings);
$('effects-level').addEventListener('change',()=>sound('pickup_essence'));
$('sound').addEventListener('change',()=>sound('pickup_essence'));
$('rotate').onclick=()=>document.body.classList.add('portrait-ok');
$('stage').addEventListener('pointerdown',event=>{if(world.mode!=='drafting'&&!event.target.closest('button,select,summary,a'))focusGame()});
$('draft-left').onclick=()=>finishDraft(0);$('draft-right').onclick=()=>finishDraft(1);$('draft-skip').onclick=()=>finishDraft(null);
// Touch controls: a floating joystick on the left half of the world (it centres wherever the thumb lands and
// trails the thumb past its rim; pull down to drop through a ledge) and round action buttons on the right,
// each held by its own finger. Held moves and the sword survive a pause or scene that cleared the keyboard state.
const touchHeld=new Set();
function touchDown(code,el){el?.classList.add('on');if(touchHeld.has(code))return;touchHeld.add(code);if(started&&world.mode==='playing')press(code);}
function touchUp(code,el){el?.classList.remove('on');if(!touchHeld.delete(code))return;release(code);}
for(const button of document.querySelectorAll('[data-hold]')){const code=button.dataset.hold;button.onpointerdown=e=>{e.preventDefault();button.setPointerCapture(e.pointerId);touchDown(code,button)};button.onpointerup=button.onpointercancel=button.onlostpointercapture=()=>touchUp(code,button);button.oncontextmenu=e=>e.preventDefault()}
const zone=$('stickzone'),stick=$('stick'),knob=$('knob');let stickId=null,origin=null;
function placeStick(){const z=zone.getBoundingClientRect();stick.style.left=origin.x-z.left+'px';stick.style.top=origin.y-z.top+'px';}
function steer(e){
 const r=stick.offsetWidth/2;let dx=e.clientX-origin.x,dy=e.clientY-origin.y,d=Math.hypot(dx,dy);
 if(d>r){origin.x+=dx*(1-r/d);origin.y+=dy*(1-r/d);dx*=r/d;dy*=r/d;placeStick();}
 knob.style.transform=`translate(${dx}px,${dy}px)`;
 const dead=r*.3,down=dy>r*.6&&dy>Math.abs(dx);
 dx<-dead?touchDown('left'):touchUp('left');dx>dead?touchDown('right'):touchUp('right');down?touchDown('down'):touchUp('down');
}
zone.onpointerdown=e=>{if(stickId!==null)return;e.preventDefault();zone.setPointerCapture(e.pointerId);stickId=e.pointerId;origin={x:e.clientX,y:e.clientY};placeStick();stick.classList.add('active');steer(e)};
zone.onpointermove=e=>{if(e.pointerId===stickId)steer(e)};
zone.onpointerup=zone.onpointercancel=zone.onlostpointercapture=e=>{if(e.pointerId!==stickId)return;stickId=null;for(const code of ['left','right','down'])touchUp(code);stick.classList.remove('active');stick.style.left=stick.style.top='';knob.style.transform='';};
zone.oncontextmenu=e=>e.preventDefault();
// Devices that report a fine pointer but get touched still get the controls.
window.addEventListener('touchstart',()=>{inputDevice='touch';document.body.classList.add('touch-seen')},{passive:true});
function holdTouch(){if(started&&world.mode==='playing')for(const code of ['left','right','sword'])if(touchHeld.has(code))keys.add(code);}
// Gamepad (standard mapping, see PAD_BUTTONS): stick or d-pad moves, A jumps, X swings, Y plays the hand, B/RB/RT dash, Start pauses.
const padHeld=new Set(),PAD_CANCEL={cards:['dash','cards','pause'],cutscene:['pause'],drafting:['dash']};
function padDown(action){
 inputDevice='gamepad';
 if(inModal()){
  const command={left:'prev',right:'next',jump:'confirm'}[action]??(PAD_CANCEL[world.mode]?.includes(action)?'cancel':null);
  if(command)modalCommand(command);
  return;
 }
 if(!$('overlay').hidden){menu.pad(action);return;}
 if(!loaded||!started)return;
 if(action==='pause')pause();else if(world.mode==='playing'){if(action==='cards')openCardSelection();else press(action==='up'?'interact':action);}
}
function pollGamepad(){
 const pad=[...(navigator.getGamepads?.()||[])].find(p=>p?.connected),now=new Set();
 if(pad){
  for(const [i,action] of Object.entries(PAD_BUTTONS))if(pad.buttons[i]?.pressed)now.add(action);
  const [x=0,y=0]=pad.axes;if(x<-.4)now.add('left');if(x>.4)now.add('right');if(y>.7)now.add('down');if(y<-.7)now.add('up');
 }
 for(const action of now)if(!padHeld.has(action))padDown(action);
 for(const action of padHeld)if(!now.has(action))release(action==='up'?'interact':action);
 padHeld.clear();for(const action of now)padHeld.add(action);
 // Held directions and the sword survive a pause or scene that cleared the keyboard state.
 if(started&&world.mode==='playing')for(const action of ['left','right','sword'])if(now.has(action))keys.add(action);
}
function finishDraft(index){
 if(world.mode!=='drafting')return;
 if(index===null)world.dismissDraft();else if(!world.chooseDraft(index))return;
 clearInput();updateUI(true);focusGame();
}
function finishLantern(keep){
 if(!world.chooseLanternHand(keep))return;
 clearInput();cameraSnap=true;persistJourney();updateUI(true);
}
$('lantern-keep').onclick=()=>finishLantern(true);
$('lantern-deal').onclick=()=>finishLantern(false);
function draftHint(card){
 const best=bestDrawPreview(world.deck.hand,card);
 const flavour=flavourText(best.result),potential=handPotential(best.hand);
 return `${best.slot===null?'Add to hand':`Replace slot ${best.slot+1}`} → ${best.result.name} · ${best.result.damage} damage${best.result.tier>=5?' · Dark Red':''}${flavour?' · '+flavour:''}${potential.length?' · '+potential.join(' · '):''}`;
}
function updateDraftUI(){
 const choosing=started&&world.mode==='drafting';$('draft-overlay').hidden=!choosing;
 $('overlay').inert=choosing||world.mode==='cards';document.body.classList.toggle('drafting',choosing);
 if(!choosing){lastDraft=null;return;}
 if(lastDraft===world.activeDraft)return;
 lastDraft=world.activeDraft;clearInput();
 const offer=world.deck.drafts.find(d=>d.id===world.activeDraft);
 $('draft-detail').textContent=world.deck.hand.length===5?'Your hand is full. Save one card, then open Cards to choose a replacement slot.':'Choose one for your hand. The other card will vanish.';
 offer.cards.forEach((id,i)=>{
  const button=$(i?'draft-right':'draft-left'),c=button.querySelector('canvas').getContext('2d');let rank=id%13+2;if(rank===14)rank=1;
  c.clearRect(0,0,32,48);c.imageSmoothingEnabled=false;c.drawImage(images.get('cards'),32+(Math.floor((rank-1)/3)*4+Math.floor(id/13))*32,32+((rank-1)%3)*48,32,48,0,0,32,48);
  button.querySelector('strong').textContent=cardName(id);button.querySelector('small').textContent=draftHint(id);button.setAttribute('aria-label',`Take ${cardName(id)} (${i+1}). ${draftHint(id)}`);
 });
 $('draft-left').focus({preventScroll:true});
}
function drawCardFace(canvas,id){
 const context=canvas.getContext('2d'),rank=(id%13+1)%13,suit=Math.floor(id/13);
 context.clearRect(0,0,32,48);context.imageSmoothingEnabled=false;
 context.drawImage(images.get('cards'),32+(Math.floor(rank/3)*4+suit)*32,32+(rank%3)*48,32,48,0,0,32,48);
}
function openCardSelection(){if(world.openCardSelection()){clearInput();lastSlotView='';updateUI(true);$('slot-confirm').focus()}}
function finishCardSelection(confirm){if(world.mode!=='cards')return;world.finishCardSelection(confirm);clearInput();updateUI(true);focusGame();}
// Key names for the current device: K follows touch too, B labels buttons that show a key or gamepad button.
const K=id=>controls.label(id,inputDevice),B=id=>controls.label(id,inputDevice==='gamepad'?'gamepad':'keyboard');
function updateCardControls(){
 const selecting=started&&world.mode==='cards';$('card-select').hidden=!selecting;
 $('inspect-cards').disabled=!started||world.mode!=='playing'||!world.deck.hand.length||world.dying>0;
 $('inspect-cards').querySelector('kbd').textContent=B('cards');
 $('play').querySelector('kbd').textContent=B('play');$('cycle').querySelector('kbd').textContent=B('cycle');$('pause').querySelector('kbd').textContent=B('pause');
 const near=started&&world.nearbyCardDrop;$('collect-card').hidden=!near;
 const challenge=started&&world.mode==='playing'&&!near&&!world.tutorialHint?challengeHint(world):null;
 $('chapter-challenge').hidden=!challenge;
 $('challenge-hint').setAttribute('aria-live',world.stageIndex===4&&world.challenge?.index===1?'off':'polite');
 if($('challenge-hint').textContent!==(challenge?.text||''))$('challenge-hint').textContent=challenge?.text||'';
 $('challenge-interact').hidden=!challenge?.canInteract;
 $('challenge-interact').textContent=inputDevice==='touch'?'Interact':'Interact · '+B('interact');
 $('draft-help').textContent=inputDevice==='gamepad'?'Left / Right select · A choose · B leave':'1 / 2 choose · Esc leave';
 $('draft-skip').textContent=inputDevice==='gamepad'?'Leave it · B':'Leave it · Esc';
 $('collect-card').textContent=inputDevice==='touch'?'Collect card':'Collect card · '+B('interact');
 const tutorial=started?world.tutorialHint:null;$('tutorial-hint').hidden=!tutorial;
 if(tutorial){
  $('tutorial-hint').querySelector('strong').textContent=`${K(tutorial.action)}: ${tutorial.text}`;
  $('tutorial-hint').querySelector('span').textContent=tutorial.detail;
 }
 const reserve=world.deck.reserve;$('saved-card').hidden=reserve===null;
 if(reserve!==null&&reserve!==lastReserve&&loaded){drawCardFace($('saved-card').querySelector('canvas'),reserve);$('saved-card').querySelector('strong').textContent=cardName(reserve)}
 lastReserve=reserve;
 if(!selecting){lastSlotView='';return;}
 const slot=world.selectedSlot,id=world.deck.hand[slot],sig=[slot,...world.deck.hand,reserve,inputDevice].join(':');
 if(sig===lastSlotView)return;lastSlotView=sig;
 drawCardFace($('slot-card'),id);$('slot-name').textContent=cardName(id);$('slot-position').textContent=`${slot+1} / ${world.deck.hand.length}`;
 const next=reserve===null?world.deck.hand.filter((_,i)=>i!==slot):world.deck.hand.map((card,i)=>i===slot?reserve:card),result=evaluate(next),potential=handPotential(next);
 $('slot-preview').textContent=(reserve===null?`Throw for 6 damage. Keep ${result.name}.`:`Replace with ${cardName(reserve)} → ${result.name} · ${result.damage} damage.`)+(potential.length?' '+potential.join(' · '):'');
 $('slot-confirm').textContent=(reserve===null?(world.cast>0?'Queue throw on resume':'Throw card'):'Replace card')+(inputDevice==='gamepad'?' · A':'');
 $('slot-cancel').textContent=inputDevice==='gamepad'?'Cancel · B':'Cancel · Esc';
 $('slot-help').textContent=inputDevice==='gamepad'?'Left / Right · A confirm · B cancel':'Left / Right · Enter confirm · Esc cancel';
}
// Dialogue lines type out while the speaker mumbles: one repitched syllable per vowel.
const speech={text:'',shown:0,clock:0,wait:0,last:-9,voice:null},VOWEL={a:0,e:3,i:5,o:-2,u:-4,y:2};
$('dialogue-text').innerHTML='<span class="sr-only"></span><span aria-hidden="true"><span></span><span class="unsaid"></span></span>';
const [spokenFull,spokenLive]=$('dialogue-text').children,[said,unsaid]=spokenLive.children;
// On touch screens the keyboard hints in the dialogue panel become tap hints.
if(matchMedia('(pointer: coarse)').matches){const hint=document.querySelector('.dialogue-copy small');if(hint?.firstChild?.nodeType===3)hint.firstChild.textContent='Tap to continue ';}
function showSpeech(){said.textContent=speech.text.slice(0,speech.shown);unsaid.textContent=speech.text.slice(speech.shown)}
function say(text,voice){Object.assign(speech,{text,voice,shown:reduced?text.length:0,clock:0,wait:0,last:-9});spokenFull.textContent=text;showSpeech()}
function speak(dt){
 if(speech.shown>=speech.text.length)return;
 if(speech.wait>0){speech.wait-=dt;return;}
 speech.clock+=dt*36;
 while(speech.clock>=1&&speech.shown<speech.text.length&&speech.wait<=0){
  speech.clock--;const i=speech.shown++,c=speech.text[i].toLowerCase();
  if(c in VOWEL&&i-speech.last>=2&&settings.sound){
   // Vowels set the pitch, with a little wander; a question lifts at the end.
   speech.last=i;const lift=speech.text.endsWith('?')&&speech.text.length-i<8?3:0,[name,rate]=speech.voice;
   music.sfx(name,0,rate*2**((VOWEL[c]+i*7%3-1+lift)/12));
  }
  if(',;:'.includes(c))speech.wait=.12;else if('.?!…—'.includes(c))speech.wait=.2;
 }
 showSpeech();
}
function finishDialogue(skip=false){
 // The first press finishes a line that is still being spoken; the next one moves on.
 if(!skip&&world.mode==='cutscene'&&speech.shown<speech.text.length){speech.shown=speech.text.length;showSpeech();return;}
 if(!world.advanceDialogue(skip))return;
 clearInput();lastSceneLine='';cameraSnap=true;updateUI(true);focusGame();
}
$('dialogue-next').onclick=()=>finishDialogue(false);
// Tapping or clicking anywhere in a scene (outside its buttons) finishes the line, then moves on.
$('dialogue').addEventListener('click',e=>{if(!e.target.closest('button'))finishDialogue(false)});
$('dialogue-skip').onclick=()=>finishDialogue(true);
function updateStoryUI(){
 const active=started&&world.mode==='cutscene'&&world.dialogue;
 const atLantern=started&&world.mode==='lantern';
 if(atLantern&&$('lantern').hidden){
  clearInput();
  const {hand,reserve}=world.deck;
  $('lantern-chapter').textContent=world.clearing.name.toUpperCase();
  $('lantern-title').textContent=world.lanternNext==='garden'?'Face the last shadow':`Face ${world.stageStory.title}`;
  $('lantern-hand').textContent=(hand.length?`${evaluate(hand).name} · ${hand.length} ${hand.length===1?'card':'cards'}`:'Empty hand')+` · ${world.deck.hits}/3 draw${reserve===null?'':' · saved '+cardName(reserve)}`;
  $('lantern-keep').setAttribute('aria-label',['Keep my hand',...hand.map(cardName),reserve===null?'':'Saved '+cardName(reserve)].filter(Boolean).join(', '));
  $('lantern').hidden=false;
  $(hand.length?'lantern-keep':'lantern-deal').focus({preventScroll:true});
 }else if(!atLantern)$('lantern').hidden=true;
 document.body.classList.toggle('at-lantern',atLantern);
 $('dialogue').hidden=!active;
 document.body.classList.toggle('in-cutscene',!!active);
 const locked=!started||world.mode!=='playing';
 document.querySelector('.table').inert=locked;
 document.querySelector('#stage>nav').inert=locked;
 $('objective').textContent=started?world.objective:'';
 const b=world.boss;
 $('boss-hud').hidden=!started||!b||!!active||world.mode==='won';
 if(b){
  $('boss-name').textContent=STAGES[world.stageIndex].title+(b.garden?' · THE LAST SHADOW':'');
  $('boss-fill').style.width=`${Math.max(0,b.hp)/b.max*100}%`;
  $('boss-health').setAttribute('aria-valuenow',String(Math.max(0,b.hp)));
  $('boss-health').setAttribute('aria-valuemax',String(b.max));
  $('boss-health').setAttribute('aria-label',b.kind==='rowan'?'Huntsman resolve':'Boss health');
  $('boss-tell').textContent=b.state==='windup'?({charge:'ANTLERS DOWN · DODGE',roots:'ROOTS RISING · KEEP MOVING',chain:'CHAIN SWEEP · JUMP',slam:'HOOK RAISED · MOVE AWAY',cut:'AXE RAISED · DODGE BEHIND',axe:'AXE THROW · WATCH THE RETURN',silk:'FALLING SILK · LEAVE THE MARKS',rings:'BELL RINGS · JUMP',bite:'DRAWING BREATH · DODGE',leap:b.chained?'HE LEAPS AGAIN · MOVE':'LEAP · LEAVE THE MARK'}[b.pattern]):b.state==='recover'?(b.clubExtended?'CLUBS · EXTENDED OPENING':'OPENING · STRIKE NOW'):b.kind==='rowan'?'BAIT THE AXE · HIS GUARD IS UP':b.phase===2?'SECOND WIND · WATCH THE TELLS':'WATCH. DODGE. STRIKE.';
 }
 if(!active){lastSceneLine='';return;}
 $('skip-progress').style.width=`${Math.min(1,skipHeld)*100}%`;
 const scene=SCENES[world.dialogue.id],line=scene.lines[world.dialogue.index],signature=world.dialogue.id+':'+world.dialogue.index;
 if(signature===lastSceneLine)return;
 lastSceneLine=signature;clearInput();
 const actor=CAST[line.speaker];
 $('scene-title').textContent=scene.title;$('scene-caption').textContent=line.caption;
 $('dialogue-speaker').textContent=actor.name;$('dialogue-speaker').style.color=actor.color;
 const who=line.speaker==='grandma'&&world.dialogue.id==='wolfIntro'?'disguise':line.speaker;
 say(line.text,who==='disguise'?['voice_gruff',1.3]:actor.voice);
 $('dialogue-count').textContent=`${world.dialogue.index+1} / ${scene.lines.length}`;
 $('dialogue-next').textContent=world.dialogue.index===scene.lines.length-1?'Continue →':'Next →';
 const portrait=$('portrait'),pctx=portrait.getContext('2d');
 pctx.clearRect(0,0,portrait.width,portrait.height);pctx.imageSmoothingEnabled=false;
 drawStoryPortrait(pctx,images,who,0);
 $('dialogue-next').focus({preventScroll:true});
}
function drawStoryCharacters(){
 if(!started||(world.practice&&!world.bossPractice&&!world.dialogue))return;
 if(world.storyPhase==='inside'){
  rect(800,352,40,65,'#433c39');rect(804,356,32,40,'#75634e');
  rect(798,400,44,8,'#aa8963');rect(802,408,6,12,'#433c39');rect(832,408,6,12,'#433c39');
  if(world.knots.some(k=>k.hp>0))for(let y=372;y<408;y+=10){rect(796,y,48,3,'#859360');rect(794,y-3,6,9,'#526b44');rect(836,y-3,6,9,'#526b44');}
 }
 if(world.dialogue){
  const scene=SCENES[world.dialogue.id];let i=0;
  for(let id of scene.cast){
   if(id==='red'||id===world.boss?.kind)continue;
   if(id==='grandma'&&world.dialogue.id==='wolfIntro'&&world.dialogue.index===scene.lines.length-1)id='wolf';
   const bound=world.storyPhase==='inside'&&id==='grandma',inBed=world.dialogue.id==='wolfIntro',inSilk=world.dialogue.id==='widowIntro'&&id==='wren';
   if(inBed&&id==='grandma'){drawStoryActor(ctx,images,'disguise',744,368,visual,{facing:-1});ctx.save();ctx.scale(2,2);bedCover(ctx,images);ctx.restore();continue;}
   drawStoryActor(ctx,images,id,bound?820:inBed?670:inSilk?CHAPEL_COCOON.x*2:world.x+100+(i++)*80,bound?412:inBed?380:inSilk?(CHAPEL_COCOON.y+4)*2:world.y,0,{facing:-1});
  }
 }else if(world.storyPhase==='inside')drawStoryActor(ctx,images,'grandma',820,412,visual,{facing:-1});
 else if(world.storyPhase==='home'){
  drawStoryActor(ctx,images,'grandma',Math.max(100,world.x-65),420,visual,{facing:1,state:Math.abs(world.vx)>10?'walk':'idle'});
  drawStoryActor(ctx,images,'mother',865,420,visual,{facing:-1});
  drawStoryActor(ctx,images,'pip',105,420,visual,{facing:1});
 }else if(world.storyPhase==='garden'){
  drawStoryActor(ctx,images,'grandma',36,360,visual);drawStoryActor(ctx,images,'rowan',925,360,visual,{facing:-1});
 }else if(world.storyLocation==='trail'&&!world.seen.has(world.stageStory.encounter)){
  const id=['stranger','pip','rowan','wren','rowan'][world.stageIndex];drawStoryActor(ctx,images,id,245,420,visual,{facing:-1});
 }
}
// Arrow from a bowman: shaft, iron head and pale fletching on the 2-unit pixel grid.
const tintCanvas=document.createElement('canvas');
function tinted(img,color){
 tintCanvas.width=img.width;tintCanvas.height=img.height;const t=tintCanvas.getContext('2d');
 t.clearRect(0,0,img.width,img.height);t.drawImage(img,0,0);t.globalCompositeOperation='source-atop';t.fillStyle=color;t.fillRect(0,0,img.width,img.height);t.globalCompositeOperation='source-over';
 return tintCanvas;
}
// Tollkeeper's chain sweep: links from his fist down to the floor and out to the travelling tip.
function drawChainSweep(){
 const b=world.boss;if(!b||b.pattern!=='chain'||b.state!=='strike'||b.chainTip==null)return;
 const hx=b.x+b.face*20,hy=b.y-34,tx=b.chainTip,ty=b.y-10,n=Math.max(4,Math.ceil(Math.abs(tx-hx)/7));
 for(let i=0;i<=n;i++){const t=i/n,x=hx+(tx-hx)*t,y=hy+(ty-hy)*Math.sqrt(t)+Math.sin(t*Math.PI)*6;rect(x-2,y-2,4,4,i%2?'#4d4b5a':'#a9a5b8');}
 rect(tx-4,ty-6,8,4,'#e2e4ea');rect(tx+(tx>b.x?2:-6),ty-2,4,6,'#a9a5b8');
}
function drawArrow(b){
 const len=Math.hypot(b.vx,b.vy)||1,ux=b.vx/len,uy=b.vy/len;
 for(let i=-10;i<=8;i+=2)rect(b.x+ux*i,b.y+uy*i,2,2,i<-6?'#d8c9a8':'#8a6a48');
 rect(b.x+ux*10,b.y+uy*10,2,2,'#e2e4ea');rect(b.x+ux*8-uy*2,b.y+uy*8+ux*2,2,2,'#a9a5b8');rect(b.x+ux*8+uy*2,b.y+uy*8-ux*2,2,2,'#a9a5b8');
 rect(b.x-ux*10-uy*2,b.y-uy*10+ux*2,2,2,'#c4b49a');rect(b.x-ux*10+uy*2,b.y-uy*10-ux*2,2,2,'#c4b49a');
}
// Boss title card: a band across the arena with the boss's name and role, the first time each fight begins.
const cardSeen=new Set();let cardStart=-9;
function drawBossCard(){
 const b=world.boss;if(!b||world.mode!=='playing')return;
 const key=world.stageIndex+(b.garden?':garden':'');
 if(!cardSeen.has(key)){cardSeen.add(key);cardStart=visual;}
 const age=visual-cardStart,LENGTH=2.2;if(age>LENGTH)return;
 const open=reduced?1:Math.min(1,age/.2,(LENGTH-age)/.25),half=snap(480*open);
 // Sits under the boss hint banner (the HTML toast) and above the fighters' heads.
 const top=272;rect(480-half,top,half*2,62,'#0b0a12e6');rect(480-half,top,half*2,2,'#e3be7f');rect(480-half,top+60,half*2,2,'#e3be7f');
 if(open<1)return;
 const actor=CAST[b.kind];ctx.textAlign='center';
 text((STAGES[world.stageIndex].title+(b.garden?' · the last shadow':'')).toUpperCase(),480,top+34,28,'#fff2bf');
 text(actor.role.toUpperCase(),480,top+53,12,actor.color);ctx.textAlign='left';
}
const SHOT_COLORS={orb:['#111d2b','#8de0cf','#fff0c2'],hex:['#1d1230','#b46bfa','#f3dcff'],spore:['#3a2a2a','#d9a98c','#f2d7c0']};
// Patches: a tell on the ground (or around a mushroom) while their owner winds up, then the harmful part.
// A witch's hex is a violet mark and flames, a tree's roots a cracked line and spikes, a mushroom's a spore cloud.
function drawPatches(){
 for(const p of world.patches){
  const left=p.x-p.w/2,roots=p.look==='roots',tick=reduced?0:Math.floor(visual*8);
  if(p.look==='spores'){
   if(p.delay>0)continue;
   // Puffs hang in three staggered rows and thin out as the cloud fades.
   const size=p.life>.5?10:p.life>.25?8:6;
   for(let i=0;i<9;i++){
    const x=left+12+i*16+(reduced?0:Math.sin(visual*2+i)*4),y=p.y-12-i%3*14-(reduced?0:Math.sin(visual*3+i*2)*3);
    circle(x,y,size+2,'#3a2a2a');circle(x,y,size,i%2?'#b98570':'#d9a98c');circle(x-2,y-2,size-6,'#f2d7c0');
   }
   continue;
  }
  if(p.delay>0&&roots){
   // Roots: a dark crack across the floor with green tips pushing up through it as the tell runs out.
   const owner=world.enemies.find(e=>e.id===p.owner),grow=owner?.windTotal?1-Math.max(0,owner.wind)/owner.windTotal:0;
   rect(left-2,p.y-4,p.w+4,6,'#1a110c');rect(left,p.y-3,p.w,2,'#5a3b26');
   for(let i=0;i<4;i++){const x=left+6+i*12,h=2+Math.round(grow*8)*2;rect(x-2,p.y-h-2,6,h+2,'#1a110c');rect(x,p.y-h,2,h,'#7fbf4a');}
   text('!',p.x-4,p.y-26,16,'#ffd27a');
   continue;
  }
  if(p.delay>0){
   const mark=roots?'#8a6a48':'#b46bfa',mote=roots?'#c9a777':'#d9a8ff';
   rect(left,p.y-3,p.w,3,mark);text('!',p.x-4,p.y-20,14,mote);
   for(let i=0;i<4;i++)rect(left+6+i*(p.w-12)/3-2,p.y-9-(tick+i)%3*3,4,4,mote);
   continue;
  }
  if(roots){
   // Four roots of different heights, each a tapering spike with a leaf at its tip.
   for(let i=0;i<4;i++){
    const cx=left+6+i*12,h=[30,44,36,24][i];
    for(const [w,from,to,color] of [[12,0,.45,'#2b1c14'],[8,.45,.8,'#2b1c14'],[4,.8,1,'#2b1c14'],[8,0,.45,'#6e4a30'],[4,.45,.8,'#8a6a48'],[2,0,.4,'#b08a60']])rect(cx-w/2,p.y-h*to,w,h*(to-from),color);
    rect(cx-2,p.y-h-2,4,4,'#6fa04a');
   }
   continue;
  }
  // Five tapering tongues of different heights, flickering unless Motion is off.
  for(let i=0;i<5;i++){
   const cx=left+7+i*11,h=22+[8,18,4,14,10][i]+(reduced?0:(i*7+Math.floor(visual*14))%3*4);
   for(const [w,from,to,color] of [[14,0,.5,'#3b1d6e'],[10,.5,.8,'#3b1d6e'],[6,.8,1,'#3b1d6e'],[10,0,.5,'#7a3fd0'],[6,.5,.78,'#7a3fd0'],[2,.78,.96,'#b46bfa'],[6,0,.4,'#c58bff'],[2,0,.3,'#f3dcff']])
    rect(cx-w/2,p.y-h*to,w,h*(to-from),color);
  }
 }
}
// Pixel ellipse in 2-unit rows: shadows on the floor.
function ellipseRows(x,y,rx,ry,color){for(let r=-ry;r<=ry;r+=2){const half=Math.floor(rx*Math.sqrt(Math.max(0,1-r*r/(ry*ry)))/2)*2;if(half>0)rect(x-half,y+r,half*2,2,color);}}
// Boss and room warnings: each kind has its own shape on the floor, and all of them brighten and pulse as the hit nears.
function drawHazards(){
 for(const h of world.hazards||[]){
  if(h.delay<=0){drawHazardArt(ctx,h,visual);continue;}
  h.total??=h.delay;const k=Math.min(1,1-h.delay/h.total),left=h.x-h.w/2,late=k>.66&&(reduced||Math.floor(visual*12)%2===0);
  const warm=late?'#fff1c1':'#f1c27b';
  if(h.kind==='landing'||h.kind==='silk'){
   // Something is coming down here: its shadow grows on the floor (a silk thread marks the Widow's drop).
   if(h.kind==='silk')for(let y=60;y<h.y-12;y+=8)rect(h.x-1,y,2,5,'#c8c6d8');
   const rx=h.w*(.35+.3*k);ellipseRows(h.x,h.y-2,rx+4,8,warm);ellipseRows(h.x,h.y-2,rx,6,'#0b0a12');
   for(const side of [-1,1]){const x=h.x+side*h.w*(.35+.3*k)-(side>0?4:0);rect(x,h.y-6,4,8,warm);}
  }else if(h.kind==='roots'){
   rect(left-2,h.y-4,h.w+4,6,'#1a110c');rect(left,h.y-3,h.w,2,'#5a3b26');
   for(let x=left+4;x<left+h.w-2;x+=10){const t=2+Math.round(k*7)*2;rect(x-2,h.y-t-2,6,t+2,'#1a110c');rect(x,h.y-t,2,t,'#7fbf4a');}
  }else{
   // Slams and shadows: a scorched band with jagged cracks and sparks lifting off it.
   rect(left-2,h.y-5,h.w+4,7,'#1a1016');rect(left,h.y-3,h.w,3,warm);
   for(let x=left+6;x<left+h.w-6;x+=18)rect(x,h.y-8-((x+Math.floor(visual*8))%3)*2,4,4,warm);
   rect(left,h.y-14,2,12,warm);rect(left+h.w-2,h.y-14,2,12,warm);
  }
  text('!',h.x-5,h.y-30-(late?2:0),20,late?'#fff1c1':'#ffd27a');
 }
 if(world.storyPhase==='inside'&&world.knots.every(k=>k.hp<=0)){
  text('FOLLOW THE RED THREAD →',540,190,16,'#f1c27b');
  for(let x=650;x<920;x+=12)rect(x,330+Math.sin(x/70)*25,12,3,'#d9717c');
 }
}
function updateUI(force=false){
 updateDraftUI();updateCardControls();updateStoryUI();syncMusic();document.body.classList.toggle('at-title',!started);
 $('chapter-label').textContent=world.arena&&world.practice?'PRACTICE ARENA':`${['I','II','III','IV','V'][world.stageIndex]} · ${world.clearing.name.toUpperCase()}`;
 const trailKey=world.arena?'arena':String(world.stageIndex);
 if($('trail-dots').dataset.stage!==trailKey){$('trail-dots').dataset.stage=trailKey;$('trail-dots').innerHTML=CLEARINGS.map((c,i)=>`<i class="${!world.practice&&i<=world.stageIndex?'lit':''}" title="${c.name}"></i>`).join('');$('trail-dots').setAttribute('aria-label',`Clearing ${world.stageIndex+1} of ${CLEARINGS.length}`);}
 const deck=world.deck,r=deck.selectedPlay,playCount=deck.plays.length;
 const mends=started&&r.heal;$('health').innerHTML=Array.from({length:5},(_,i)=>`<i class="heart ${i<world.health?'full':mends&&i===world.health?'mend':''}"></i>`).join('');$('health').setAttribute('aria-label',`${world.health} of 5 health`);$('health').classList.toggle('low',started&&world.health===1);
 $('quest').textContent=world.storyLocation==='trail'&&!world.arena?`${world.collected} / 3 embers · ${world.foesAhead} ${world.foesAhead===1?'foe':'foes'} ahead`:world.storyPhase==='inside'?`${3-world.knots.filter(k=>k.hp>0).length} / 3 knots`:world.boss?'Boss encounter':world.storyPhase==='home'?'The road is open':'Lantern lit';
 $('hand-label').textContent=playCount>1?`COMBO ${deck.playIndex+1} / ${playCount}`:'POKER HAND';
 $('cycle').hidden=playCount<=1;
 $('cycle').disabled=!started||world.mode!=='playing'||world.dying>0;
 const rank=deck.hand[r.indices[0]]%13;
 $('combo').textContent=r.tier===1?`Pair of ${['twos','threes','fours','fives','sixes','sevens','eights','nines','tens','jacks','queens','kings','aces'][rank]}`:r.name;
 $('effect').textContent=r.tier<0?'Land sword hits to refill':`${EFFECTS[r.tier]} · ${r.damage} damage`;const fl=flavourText({...r,suits:r.suits.filter(s=>s<3||world.health<5)});$('flavour').textContent=fl;$('flavour').hidden=!fl;
 $('play').disabled=!started||world.mode!=='playing'||world.dying>0||!deck.hand.length;
 $('draw-label').textContent=world.deck.banked?'Saved: '+cardName(world.deck.reserve)+(world.deck.hits>=3?' · meter full':''):`Sword hits ${world.deck.hits} / 3`;
 $('deck-count').textContent=`${world.deck.pile.length} in deck · ${world.deck.discard.length} spent${world.cardDrops.length?' · '+world.cardDrops.length+' dropped':''}`;
 [...$('pips').children].forEach((p,i)=>p.classList.toggle('lit',i<world.deck.hits));
 const sig=deck.hand.join(',')+':'+deck.reserve+':'+deck.playIndex;if(sig!==lastHand||force){lastHand=sig;
  const spent=r.indices.map(i=>cardName(deck.hand[i])).join(', ');
  const description=spent?`${r.name}, ${r.damage} damage. Spend ${spent}. ${flavourText(r)}`:'Empty hand';
  if($('play-description').textContent!==description)$('play-description').textContent=description;
  const swaps=world.deck.banked?previewDraw(world.deck.hand,world.deck.reserve):[];
  for(const [id,el] of cards)if(!world.deck.hand.includes(id)){el.classList.add('out');setTimeout(()=>el.remove(),280);cards.delete(id)}
  $('hand').querySelectorAll('.empty-slot').forEach(e=>e.remove());
  for(let i=0;i<5;i++){const slot=document.createElement('div');slot.className='empty-slot';slot.style.left=`${i*72+15}px`;slot.style.setProperty('--slot',i);$('hand').append(slot)}
  world.deck.hand.forEach((id,i)=>{let el=cards.get(id);if(!el){el=document.createElement('button');el.className='card in';el.innerHTML='<span class="slot"></span><canvas width="32" height="48"></canvas>';const c=el.querySelector('canvas').getContext('2d');let rank=id%13+2;if(rank===14)rank=1;let sx=32+(Math.floor((rank-1)/3)*4+Math.floor(id/13))*32,sy=32+((rank-1)%3)*48;c.drawImage(images.get('cards'),sx,sy,32,48,0,0,32,48);el.onclick=()=>{
    if(!started||world.mode!=='playing')return;
    const wasBanked=world.deck.banked;
    if(world.useSlot(world.deck.hand.indexOf(id))){
     if(wasBanked)sound('meter_full');
     updateUI(true);
    }
    focusGame();
   };el.onpointerenter=()=>hover=id;el.onpointerleave=()=>hover=-1;$('hand').append(el);cards.set(id,el)}
   const replacement=swaps.find(option=>option.slot===i);
   let description;
   if(replacement){
    const result=replacement.result;
    description=`Replace with ${cardName(world.deck.reserve)} → ${result.name} · ${result.damage} damage${result.tier>=5?' · Dark Red':''}`;
   }else{
    const remaining=evaluate(world.deck.hand.filter(card=>card!==id));
    const next=remaining.tier<0?'Hand will be empty':`Keep ${remaining.name} · ${remaining.damage} damage`;
    description=`Throw for ${DAMAGE[0]} damage. ${next}.`;
   }
   el.setAttribute('aria-label',`Card ${i+1}: ${cardName(id)}. ${description}`);el.title=description;el.querySelector('.slot').textContent=String(i+1);el.style.left=`${i*72+13}px`;el.classList.toggle('match',r.indices.includes(i));el.dataset.slot=i;el.style.setProperty('--slot',i);
  });
 }
 const focused=document.activeElement;
 const inspected=focused?.matches('#hand .card:not(.out)')?focused:cards.get(hover);
 let drawHelp=`${K('sword')}: three landed swings drop one card.`;
 if(inspected)drawHelp=inspected.title;
 else if(world.deck.banked)drawHelp=inputDevice==='gamepad'?'LT: inspect cards, then A to replace with your saved draw.':inputDevice==='touch'?'Tap a card to replace it with your saved draw.':'1–5 or click: replace a card with your saved draw.';
 else if(world.cardDrops.length)drawHelp=inputDevice==='gamepad'?'D-pad Up near a drop: collect and choose.':inputDevice==='touch'?'Tap Collect near a drop to choose.':`Press ${B('interact')} near a drop, or Collect, to choose.`;
 else if(world.deck.hand.length)drawHelp=inputDevice==='gamepad'?'LT: choose a card to throw. Y: play the combo.':inputDevice==='touch'?'Tap a card to throw it. Play casts the combo.':`1–5 or click: throw one card. ${B('play')}: play the combo.`;
 $('draw-help').textContent=drawHelp;
 $('dark-meter').hidden=world.dark<=0;$('dark-time').textContent=world.dark.toFixed(1)+'s';$('dark-meter').querySelector('i').style.transform=`scaleX(${world.dark/6})`;
 const nextToast=world.bannerTime>0?world.banner:'';if(nextToast!==toast){toast=nextToast;$('toast').textContent=toast}
 if(started&&(world.mode!==previousMode||force)){
  const changed=previousMode!==world.mode||$('overlay').hidden;
  previousMode=world.mode;
  const overlay=$('overlay');overlay.hidden=['playing','drafting','cards','cutscene','lantern'].includes(world.mode);
  if(!overlay.hidden){
   const won=world.mode==='won',final=world.stageIndex===CLEARINGS.length-1,paused=world.mode==='paused';
   $('title-brand').hidden=$('continue').hidden=$('open-credits').hidden=$('open-replay').hidden=true;
   $('story-title').hidden=$('story-eyebrow').hidden=false;
   $('restart').hidden=!paused;$('return-title').hidden=false;
   $('restart').textContent=world.practice&&!world.bossPractice?'Leave practice':world.arena?'Retry encounter':'Retry clearing';
   $('story-eyebrow').textContent=world.clearing.name;
   $('story-title').textContent=paused?(world.replay?'Replay paused':'Journey paused'):world.mode==='dead'?'One more hand?':world.practice?'Practice complete':world.replay?'Chapter complete':final?'Room for one more.':'A light in the dark.';
   $('story-copy').textContent=paused?world.objective:world.mode==='dead'?(world.lanternDeck?'Return to the encounter with the opening hand you chose.':world.arena?'Return to this room with a fresh hand.':world.gates.some(g=>g.open)?'Return to your last opened briar gate with a fresh hand.':'Return to the clearing entrance with a fresh hand.'):won&&world.practice?'Your campaign checkpoint is safe.':world.replay?'Your replay is complete. Your campaign checkpoint is unchanged.':final?'Grandmother is safe. There is enough bread to share.':'The way to '+CLEARINGS[world.stageIndex+1]?.name+' is open.';
   $('begin').classList.add('menu-primary');
   $('begin').textContent=paused?(world.replay?'Resume replay':'Resume journey'):won&&world.replay?'Return to chapters':won&&!world.practice?(final?'New journey':'Continue to '+CLEARINGS[world.stageIndex+1].name):world.practice&&!world.bossPractice?'Back to journey':world.arena?'Retry encounter':'Retry clearing';
   const best=world.bestHand>=0?' · best hand: '+HANDS[world.bestHand]:'',r=won&&!world.practice?world.result:null;
   $('loading').textContent=won&&!r?`${world.kills} foes defeated · ${world.fallCount} falls · ${clock(world.time)}${best}`:'';
   $('grade').hidden=!r;
   if(r){$('grade-letter').textContent=r.grade;$('grade-letter').className='grade-'+r.grade;
    const plural=(n,w)=>`${n} ${w}${n===1?'':'s'}`,note=recordNote&&recorded===r&&!recordNote.first?[recordNote.better&&'NEW BEST GRADE',recordNote.faster&&'NEW BEST TIME'].filter(Boolean).join(' · '):'';
    $('grade-line').textContent=`${plural(r.hurt,'heart')} lost · ${r.retries} ${r.retries===1?'retry':'retries'} · ${clock(r.time)} / par ${clock(r.par)}`;
    $('grade-note').textContent=[note,r.best>=5?`RARE HAND · ${HANDS[r.best]}`:'',world.challenge?.done?'CHAPTER CHALLENGE COMPLETE':''].filter(Boolean).join(' · ');}
   if(won&&!persistedCompletion){persistedCompletion=true;persistJourney();}
   $('save-status').textContent=world.replay?'Chapter replay · campaign checkpoint unchanged':world.practice?'Practice session':checkpointSaved?'Opened gates and encounters save in this browser.':'Saving unavailable · keep this tab open';
   if(changed)menu.home();
  }
 }

}
function sprite(img,x,y,w,h){if(img)ctx.drawImage(img,snap(x),snap(y),snap(w),snap(h))}
function effect(name,frame,x,feet,scale=2,dir=1){const img=images.get(`${name}/${Math.min(35,Math.max(0,Math.floor(frame)))}`);if(!img)return;ctx.save();ctx.translate(snap(x),snap(feet));ctx.scale(dir,1);sprite(img,-img.width*scale/2,-img.height*scale,img.width*scale,img.height*scale);ctx.restore()}
function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(snap(x),snap(y),snap(w),snap(h))}
function circle(x,y,r,color){for(let row=-Math.floor(r/2);row<=Math.floor(r/2);row++){const half=Math.floor(Math.sqrt(Math.max(0,r*r-row*row*4))/2)*2;rect(x-half,y+row*2,half*2,2,color)}}
function text(str,x,y,size=14,color='#e3be7f'){ctx.fillStyle=color;ctx.font=`${size}px Silkscreen, monospace`;ctx.fillText(str,Math.round(x),Math.round(y))}
function polygon(points,color){ctx.fillStyle=color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(snap(x),snap(y)):ctx.moveTo(snap(x),snap(y)));ctx.closePath();ctx.fill()}
function diamond(x,y,r,color){polygon([[x,y-r],[x+r,y],[x,y+r],[x-r,y]],color)}
function drawEmber(e){
 // Four held poses keep the glint crisp; all shapes use the world's native pixel grid.
 const frame=reduced?0:Math.floor(visual*6+e.x)%4;
 const x=snap(e.x),y=snap(e.y+(reduced?0:[0,-2,0,2][frame]));
 const ink='#17202c',gold='#f6b63e',cream='#fff0a3',white='#ffffeb';
 // Broken rays read as a collectible halo, with a steady bright center rather than a flash.
 const reach=[18,20,18,16][frame];
 for(const side of [-1,1]){
  rect(x+side*reach-2,y-2,4,4,ink);
  rect(x+side*reach,y-2,2,2,cream);
  rect(x-2,y+side*reach-2,4,4,ink);
  rect(x-2,y+side*reach,2,2,cream);
 }
 drawGlow(ctx,x,y,42,'gold',.8);
 circle(x,y,12,ink);circle(x,y,10,gold);circle(x-2,y-2,8,cream);circle(x-2,y-2,5,white);
 // Hard shadow and offset specular highlight give the orb a drawn, rounded silhouette.
 rect(x+4,y+4,4,2,'#ce7627');rect(x,y+8,4,2,'#ce7627');
 rect(x-6,y-6,4,2,white);rect(x-6,y-4,2,4,white);
 const spark=(sx,sy,r)=>{
  const points=[[0,-r],[2,-2],[r,0],[2,2],[0,r],[-2,2],[-r,0],[-2,-2]];
  polygon(points.map(([px,py])=>[sx+px,sy+py]),ink);
  rect(sx-1,sy-r+2,2,r*2-4,white);rect(sx-r+2,sy-1,r*2-4,2,white);
 };
 spark(x-16,y-14,frame<2?6:4);spark(x+16,y+10,frame>=2?6:4);
}
// Dust: ink-edged puffs that drift out from Red's feet, shrink and rise as they settle.
function drawDust(d){
 const p=1-d.life/DUST_LIFE,r=p<.35?8:p<.7?6:4,rise=p*8;
 const puff=(x,y,size)=>{if(size<2)return;circle(x,y,size+2,'#4f4a40');circle(x,y,size,'#cfc4a6');if(size>=6)circle(x-2,y-2,size-4,'#efe7cf');};
 if(d.kind==='dash'){for(let i=0;i<3;i++)puff(d.x-d.dir*(i*14+p*10),d.y-6-rise-i*2,r-i*2);return;}
 const reach=d.kind==='land'?18:8,size=d.kind==='land'?r:r-2;
 for(const side of [-1,1]){puff(d.x+side*(10+p*reach),d.y-6-rise,size);puff(d.x+side*(4+p*reach/2),d.y-4-rise/2,size-2);}
}
const cardPositions=new Map(),departing=[];
function drawDock(){
 drawBriarDock(ctx,images);
 const combo=world.deck.selectedPlay,hasChoice=world.deck.plays.length>1,t=visual;
 for(const [id,p] of cardPositions)if(!world.deck.hand.includes(id)){departing.push({...p,id,time:t});cardPositions.delete(id)}
 world.deck.hand.forEach((id,i)=>{
  const active=world.mode==='playing'&&(hover===id||document.activeElement===cards.get(id));
  const target={x:266+i*72,y:(combo.indices.includes(i)?416:424)-(active?10:0)};
  let p=cardPositions.get(id);if(!p){const picked=world.lastPicked?.card===id?world.lastPicked:null;p=picked?{x:picked.x-cam-32,y:picked.y-80-48}:{x:960,y:540};cardPositions.set(id,p)}
  p.x+=(target.x-p.x)*.3;p.y+=(target.y-p.y)*.3;
  let rank=id%13+2;if(rank===14)rank=1;const sx=32+(Math.floor((rank-1)/3)*4+Math.floor(id/13))*32,sy=32+((rank-1)%3)*48;
  const pulse=reduced?0:Math.sin(t*2+id)*2,angle=reduced?0:(i-2)*.025+Math.sin(t*2.3+id)*.018;
  ctx.save();ctx.translate(snap(p.x+32),snap(p.y+48+pulse));ctx.rotate(angle);
  if(hasChoice&&combo.indices.includes(i)){
   for(const x of [-34,26])for(const y of [-50,48]){
    rect(x,y,8,2,'#ffe3a3');rect(x<0?x:x+6,y<0?y:y-6,2,8,'#ffe3a3');
   }
  }
  if(active){rect(-36,-52,72,104,'#101c19');rect(-34,-50,68,100,'#f6dda0')}
  ctx.drawImage(images.get('cards'),sx,sy,32,48,-32,-48,64,96);ctx.restore();
 });
 for(let i=departing.length-1;i>=0;i--){const p=departing[i],age=t-p.time;if(age>.25){departing.splice(i,1);continue}let rank=p.id%13+2;if(rank===14)rank=1;ctx.globalAlpha=1-age*4;ctx.drawImage(images.get('cards'),32+(Math.floor((rank-1)/3)*4+Math.floor(p.id/13))*32,32+((rank-1)%3)*48,32,48,snap(p.x+age*200),snap(p.y-age*220),64,96);ctx.globalAlpha=1;}
}
function draw(){
 ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,960,540);ctx.save();ctx.save();ctx.beginPath();ctx.rect(0,0,960,400);ctx.clip();ctx.translate(0,-80);
 const shake=shakeOffset(world.shakeTime,world.shakeDuration,world.shakePower,reduced);ctx.translate(shake.x,shake.y);
 const bridge=world.clearing.theme==='bridge'&&!world.arena;
 // The walk home is back in Lantern Wood at dawn, whatever clearing the story ended in.
 const theme=world.storyLocation==='home'?'wood':world.clearing.theme;
 if(bridge)drawBridgeBackdrop(ctx,images,cam,visual,reduced);else drawBackdrop(ctx,images,cam,visual,reduced,theme,world.worldWidth);
 drawAtmosphere(ctx,cam,visual,reduced,theme);
 if(world.dark>0){ctx.fillStyle='#31184c36';ctx.fillRect(0,0,960,480)}
 ctx.save();ctx.translate(-snap(cam),0);
 drawStorySet(ctx,images,world,reduced?0:visual,reduced);
 if(bridge)drawBridgeArchitecture(ctx,images,world.platforms,visual,reduced,world);else drawTerrain(ctx,images,world.platforms,visual,reduced,theme,world.storyLocation);
 if(!world.arena){
  if(!bridge)drawLandmarks(ctx,images,world,visual,reduced);
  if(world.clearing.theme==='house')drawHome(ctx,images,world.collected,visual,reduced,world.clearing.exit.x);else drawTrailGate(ctx,images,world,visual,reduced);
  drawGates(ctx,world,visual,reduced);
  drawChallenge(ctx,world);
 }
 drawFlora(ctx,images,world,cam);
 drawContactShadows(ctx,world,cam);
 drawStoryCharacters();
 drawHazards();
 // Ground loot sits behind combatants; cards must never mask an enemy pose.
 for(const drop of world.cardDrops){
  const x=snap(drop.x),y=snap(drop.y-26-(reduced?0:Math.sin(visual*3+drop.id)*2)-Math.sin(Math.min(1,drop.age/.4)*Math.PI)*18);
  drawGlow(ctx,x,y,48,'gold',.55);circle(x,y,22,'#eac77c18');rect(x-14,y-20,28,40,'#101824');rect(x-12,y-18,24,36,'#e6cc93');rect(x-10,y-16,20,32,'#713843');
  rect(x-8,y-14,16,2,'#ad6262');diamond(x,y,8,'#f6dfa5');diamond(x,y,4,'#8f424d');
  rect(x-8,y-12,2,2,'#ffeab6');rect(x+6,y+10,2,2,'#ffeab6');text('CARD',x-14,y-26,10,'#fff0bc');
 }
 for(const n of (world.practice&&!world.arena&&!world.dialogue?world.npcs:[])||[]){const f=idleFrame(visual,n.x),{w,h}=characterSize(CELL,CELL),near=Math.abs(world.x-n.x)<110&&Math.abs(world.y-n.y)<80;ctx.save();ctx.translate(snap(n.x),snap(n.y));ctx.scale(world.x<n.x?-1:1,1);ctx.drawImage(images.get('cast/'+n.skin),f.x,f.y,f.w,f.h,snap(-w/2),-h,w,h);ctx.restore();if(near&&n.line){ctx.font='12px Silkscreen, monospace';const tw=snap(ctx.measureText(n.line).width+12),top=n.y-h+castTop(n.skin)*2,bx=snap(Math.max(cam+8,Math.min(cam+952-tw,n.x-tw/2)));rect(bx,top-26,tw,20,'#101226d8');text(n.line,bx+6,top-11,12,'#fff2bf');}}
 if(world.bossCorpse){const c=world.bossCorpse;ctx.save();ctx.globalAlpha=Math.min(1,(BOSS_DEATH-c.time)/.4);drawStoryActor(ctx,images,c.kind,c.x,c.y,visual,{facing:c.face,state:'dead',boss:{deadTime:c.time}});ctx.restore();}
 for(const e of world.enemies){if(e.boss||e.storyTarget){if(world.dialogue?.id!=='wolfIntro')drawStoryActor(ctx,images,e.kind,e.x,e.y,visual,{facing:e.face,state:e.state,flash:e.flash,boss:e});continue;}const img=images.get('cast/'+e.skin);const frame=castFrame(e,world.time);ctx.save();ctx.translate(snap(e.x),snap(e.y));ctx.scale(e.face,1);const {w}=characterSize(frame.w,frame.h),h=(CELL-castTop(e.skin))*2;ctx.drawImage(img,frame.x,frame.y,frame.w,frame.h,snap(-w/2),-w,w,w);
  // A braced heavy keeps its slam pose and only flashes: the hit landed, the slam is still coming.
  if(e.brace>0)ctx.drawImage(tinted(img,'#fff4ee'),frame.x,frame.y,frame.w,frame.h,snap(-w/2),-w,w,w);
  ctx.restore();if(e.state!=='blink'&&e.hp<e.max){rect(e.x-16,e.y-h-8,32,3,'#26322e');rect(e.x-16,e.y-h-8,32*e.hp/e.max,3,e.enraged?'#e8434a':e.tough?'#bd8fe0':'#ca8072');}if(e.state==='roar')text('ROAR',e.x-16,e.y-h-20,12,'#ffbf80');if(e.dazed>0)for(let i=0;i<3;i++){const a=(reduced?0:world.time*6)+i*2.09,sx=e.x+Math.cos(a)*13,sy=e.y-h-14+Math.sin(a)*3;rect(sx-2,sy,6,2,'#f2d16b');rect(sx,sy-2,2,6,'#f2d16b');}if(e.wind>0){text(e.arrow?'AIM':e.kind==='mage'?(e.hexing?'HEX':e.puffing?'SPORES':'CAST'):e.erupting?'ROOTS':e.rooted?'LASH':e.tough?'SLAM':e.kind==='charger'?'CHARGE':'!',e.x-(e.kind==='charger'?22:e.tough||e.arrow?14:3),e.y-h-20,12,'#ffbf80');
 if(e.arrow){}else if(e.fly){for(let t=.2;t<1;t+=.16)rect(e.x+(e.aimX-e.x)*t-2,e.y-12+(e.aimY-e.y+12)*t-2,4,4,'#e58955');}else if(e.kind==='mage'){if(!e.hexing&&!e.puffing){diamond(e.x+e.face*18,e.y-24,8,(SHOT_COLORS[e.look]||SHOT_COLORS.orb)[0]);diamond(e.x+e.face*18,e.y-24,4,(SHOT_COLORS[e.look]||SHOT_COLORS.orb)[1])}}else if(e.erupting){}else if(e.rooted)rect(e.x-24*e.strikeDir,e.y-3,144*e.strikeDir,3,'#e58955');else if(e.kind==='charger')rect(e.x,e.y-3,Math.max(e.left,Math.min(e.right,e.x+e.strikeDir*300))-e.x,3,'#e58955');else rect(e.tough?e.x-90:e.x,e.y-3,e.tough?180:88*e.strikeDir,3,'#e58955');}
 if(e.state==='lunge'&&!e.fly){rect(e.x-e.strikeDir*30,e.y-20,e.strikeDir*28,3,'#f1c17d')}
 if(e.state==='chase'&&!e.fly&&e.hopCD<.1)text('•',e.x-2,e.y-h-18,10,'#caa16d');}
 drawChainSweep();
 drawLocalOverlay?.(ctx);
 for(const b of world.enemyShots){
  if(b.arrow){drawArrow(b);continue;}
  // A mushroom spits a spore puff with a smaller one trailing; a witch throws a violet bolt; wisps a teal orb.
  if(b.look==='spore'){const len=Math.hypot(b.vx,b.vy)||1;circle(b.x-b.vx/len*12,b.y-b.vy/len*12,6,'#3a2a2a');circle(b.x-b.vx/len*12,b.y-b.vy/len*12,4,'#b98570');circle(b.x,b.y,10,'#3a2a2a');circle(b.x,b.y,8,'#d9a98c');circle(b.x-2,b.y-2,4,'#f2d7c0');continue;}
  const [ink,mid,core]=SHOT_COLORS[b.look]||SHOT_COLORS.orb;diamond(b.x,b.y,10,ink);diamond(b.x,b.y,7,mid);diamond(b.x,b.y,3,core);
 }
 for(const e of world.embers)drawEmber(e);

 const clip=playerClip(world),{form,state,facing}=clip,key=form+'/'+state;
 if(key!==lastAnim){lastAnim=key;formClock=0}
 const index=playerFrame(state,world,formClock),img=images.get(`${form}/${state}/${index}`);
 ctx.save();ctx.translate(snap(world.x),snap(world.y));ctx.scale(facing,1);
 if(world.invincible>0&&world.transform<=0&&Math.floor(visual*18)%2===0)ctx.globalAlpha=.65;
 if(img){
  const {x,y}=playerOffset(form,state,img.width,img.height),{w,h}=characterSize(img.width,img.height);
  if(world.dash>0&&!reduced){for(let i=2;i>0;i--){ctx.globalAlpha=.12*(3-i);sprite(img,x-i*14,y,w,h)}ctx.globalAlpha=1}
  sprite(img,x,y,w,h);
  // Hurt flash: Red's silhouette goes white, then red, for the first beat of the knockback.
  if(world.hurtTime>.24){ctx.globalAlpha=1;sprite(tinted(img,world.hurtTime>.33?'#fff4ee':'#e8434a'),x,y,w,h);}
  // Death beat: her silhouette burns red and thins out as the scene dims.
  else if(world.dying>0){ctx.globalAlpha=Math.min(1,world.dying/DEATH_TIME*1.6);sprite(tinted(img,'#b02a3c'),x,y,w,h);}
 }
 ctx.restore();
 if(world.transform>0)effect(world.morphFrom==='light'?'FX_lighttodark':'FX_darktolight',(1-world.transform/world.morphDuration)*36,world.x,world.y,2,world.facing);
 for(const b of world.bolts){
  if(b.card!==undefined){
   const rank=(b.card%13+1)%13,suit=Math.floor(b.card/13);
   const sx=32+(Math.floor(rank/3)*4+suit)*32,sy=32+(rank%3)*48;
   ctx.save();
   ctx.translate(snap(b.x),snap(b.y));
   ctx.rotate(reduced?0:b.dir*(1.5-b.life)*15);
   ctx.drawImage(images.get('cards'),sx,sy,32,48,-8,-12,16,24);
   ctx.restore();
   continue;
  }
  drawSpellLight(ctx,b,visual,reduced);
  const shape=castShape(b.tier),dark=b.tier>=5,c=dark?'#b46bfa':'#f35a47',phase=Math.floor((1.5-b.life)*18)%3;
  ctx.save();ctx.translate(snap(b.x),snap(b.y));ctx.scale(b.dir,1);
  // Three stepped silhouettes, never a scaled-up aura sprite. Bright core and ink outline.
  polygon([[-shape.length,-8],[-22,-shape.height/2],[10,-10],[20,0],[10,10],[-22,shape.height/2],[-shape.length,8],[-42,0]],'#101226');
  polygon([[-shape.length+6,-4],[-20,-shape.height/2+4],[8,-6],[14,0],[8,6],[-20,shape.height/2-4],[-shape.length+6,4],[-32,0]],c);
  polygon([[-shape.length+14,-2],[-14,-8-phase*2],[8,0],[-14,8+phase*2],[-shape.length+14,2],[-24,0]],'#fff4cd');
  rect(-28,-4,30,8,'#fff8ec');ctx.restore();
 }
 for(const r of world.rings){const progress=1-r.life/(r.physical?.25:.45);
  if(r.physical){for(let i=-3;i<=3;i++){const x=r.x+i*12+Math.sign(i)*progress*24,y=r.y-progress*(14-Math.abs(i)*2);rect(x,y,6,4,'#978875');}continue;}
  effect(r.dark?'FX_dark':'FX_light',progress*36,r.x,r.y+22,2);
  for(let i=0;i<8;i++){const angle=i*Math.PI/4,reach=r.radius*progress;diamond(r.x+Math.cos(angle)*reach,r.y+Math.sin(angle)*reach,8,r.dark?'#cf94ff':'#ffcf77');}
 }
 for(const hit of world.impacts){const progress=1-hit.life/.25,size=(hit.amount>=14?40:hit.heavy?30:20)*(progress<.2?.7+progress*2:1.1-(progress-.2)*.55);ctx.save();ctx.translate(snap(hit.x),snap(hit.y));
  const points=[];for(let i=0;i<16;i++){const r=i%2?size*.38:size;points.push([Math.cos(i*Math.PI/8)*r,Math.sin(i*Math.PI/8)*r]);}
  polygon(points,'#101226');polygon(points.map(([x,y])=>[x*.8,y*.8]),'#fff2bf');polygon(points.map(([x,y])=>[x*.42,y*.42]),'#f68152');ctx.restore();
  if(hit.amount>=14){const word=hit.knockout?'K.O.!':hit.amount>=40?'KRAK!':'WHAM!',x=snap(hit.x-34),y=snap(hit.y-54-progress*10);for(const [dx,dy] of [[-2,0],[2,0],[0,-2],[0,2]])text(word,x+dx,y+dy,24,'#101226');text(word,x,y,24,'#fff2bf');}
 }
 for(const dead of world.corpses){ctx.save();ctx.translate(snap(dead.x),snap(dead.y));ctx.scale(dead.face,1);ctx.globalAlpha=Math.min(1,dead.life/CORPSE_LIFE*3);const f=deathFrame(dead.life,CORPSE_LIFE),{w,h}=characterSize(f.w,f.h);ctx.drawImage(images.get('cast/'+dead.skin),f.x,f.y,f.w,f.h,snap(-w/2),-h,w,h);ctx.restore();}
 if(!reduced)for(const d of world.dust)drawDust(d);
 for(const p of world.particles)rect(p.x,p.y,3,3,'#eacd88');for(const n of world.texts)text(n.text,n.x,n.y,20,'#ffe4a2');
 // Depth foreground around the floor rather than across landing surfaces.
 ctx.restore();if(bridge)drawBridgeAtmosphere(ctx,cam,visual,reduced);else drawForeground(ctx,images,cam,world,reduced);
 // Ground marks, roots, flames and spore clouds go over the foreground foliage so a bush never hides a tell.
 ctx.save();ctx.translate(-snap(cam),0);drawPatches();drawGateGuide(ctx,world,cam,960);ctx.restore();drawBossCard();if(world.dying>0||world.mode==='dead'){ctx.fillStyle=`rgba(11,8,16,${(world.mode==='dead'?1:1-world.dying/DEATH_TIME)*.55})`;ctx.fillRect(0,0,960,480);}ctx.restore();drawDock();ctx.restore();screen.imageSmoothingEnabled=false;screen.clearRect(0,0,960,540);screen.drawImage(raster,0,0,960,540);
}
function frame(now){let dt=Math.min((now-last)/1000||0, .05);last=now;pollGamepad();holdTouch();if(loaded&&started){if(started&&world.mode==='playing'){accumulator+=dt;let first=true;
  while(accumulator>=1/60){const input={axis:Number(keys.has('right'))-Number(keys.has('left')),sword:keys.has('sword')};if(first&&world.hitStop<=0){input.jump=edges.has('jump');input.jumpRelease=releaseJump;input.dash=edges.has('dash');input.play=edges.has('play');input.cycle=edges.has('cycle');input.collect=edges.has('interact');input.interact=input.collect;input.drop=edges.has('down');for(let i=0;i<5;i++)if(edges.has('slot'+(i+1)))input.cardSlot=i;edges.clear();releaseJump=false;first=false}const before=world.time;world.step(1/60,input);const elapsed=world.time-before;visual+=elapsed;formClock+=elapsed;accumulator-=1/60}
  for(const event of world.events.splice(0)){sound(event);buzz(event);}
 }else accumulator=0;
 if(started&&world.mode==='cutscene')speak(dt);
 if(world.mode==='cutscene'&&skipStarted!==null){skipHeld=(now-skipStarted)/900;if(skipHeld>=1)finishDialogue(true);}
 if(started&&!world.practice&&!world.replay&&lastStoryRevision!==world.storyRevision)persistJourney();
 if(started&&!world.practice&&world.result&&world.result!==recorded){recorded=world.result;recordNote=saveRecord(storage,world.clearing.id,world.result);showRecords();}
 if(!world.replay&&world.hinted.size!==hintCount){hintCount=world.hinted.size;try{storage.setItem('red.poker.hints',JSON.stringify([...world.hinted]))}catch{}}
 // Look-ahead: Red sits in the left third facing right and the right third facing left; the shift eases in slowly
 // so a quick turn to swing does not swing the view.
 if(world.facing!==leadFacing){leadFacing=world.facing;facingFor=0;}else facingFor+=dt;
 if(facingFor>.4||cameraSnap)settledFacing=world.facing;
 const lead=settledFacing<0?600:340;camLead=cameraSnap?lead:camLead+(lead-camLead)*(1-Math.exp(-dt*1.8));
 const target=Math.max(0,Math.min((world.worldWidth||WIDTH)-960,world.x-camLead));cam=cameraSnap?target:cam+(target-cam)*(1-Math.exp(-dt*8));cameraSnap=false;
 draw();updateUI();for(const [id,el] of cards){let i=Number(el.dataset.slot),match=el.classList.contains('match'),active=hover===id;
 const t=visual,wiggle=reduced?0:Math.sin(t*2.3+id)*1.4+Math.sin(t*18)*Math.pow(Math.max(0,Math.sin(t*1.5+i*1.7)),12)*5;
 el.style.transform=`translateY(${(match?-7:0)+(active?-10:0)+(reduced?0:Math.sin(t*2+i)*2)}px) rotate(${reduced?0:(i-2)*2+wiggle}deg)`;el.style.zIndex=active?20:5+i;
 }}requestAnimationFrame(frame)}requestAnimationFrame(frame);
const drawLocalOverlay=installLocalTools({world,enterWorld,menu,ready:()=>loaded,camera:()=>cam,started:()=>started});
