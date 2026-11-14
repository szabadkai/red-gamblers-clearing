import {drawBridgeBackdrop,drawBridgeArchitecture,drawBridgeAtmosphere,drawBriarDock} from './bridge.mjs';
import {CLEARINGS} from './journey.mjs';
import {StoryWorld,loadStory,saveStory,BOSS_DEATH} from './story.mjs';
import {STAGES,SCENES,CAST} from './story-data.mjs';
import {STORY_IMAGES,drawStoryActor,drawStorySet,drawStoryPortrait,bedCover} from './story-art.mjs';
import {drawHazardArt} from './arena-art.mjs';
import {bossBox} from './bosses.mjs';
import {createMusic,tuneFor,BOSS_TUNES} from './music.mjs';
import {prepareScenery,drawBackdrop,drawLandmarks,drawTrailGate,drawGates,drawForeground} from './scenery.mjs';
import {PLAYER_CLIPS,playerClip,playerFrame} from './animation.mjs';
import {drawTerrain,drawHome} from './environment.mjs';
import {snap,characterSize,playerOffset,castShape,shakeOffset} from './art.mjs';
import {World,evaluate,EFFECTS,HANDS,WIDTH,cardName,CORPSE_LIFE,DUST_LIFE,DEATH_TIME} from './model.mjs';
import {CAST as ROSTER,CELL,castFrame,castTop,deathFrame,idleFrame} from './cast.mjs';
const $=id=>document.getElementById(id),canvas=$('game'),screen=canvas.getContext('2d'),raster=document.createElement('canvas');
raster.width=960;raster.height=540;const ctx=raster.getContext('2d');
const world=new StoryWorld(),keys=new Set(),edges=new Set();let releaseJump=false,started=false,loaded=false,muted=false;
let reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,cam=0,accumulator=0,last=0,visual=0,hover=-1,toast='';
let camLead=340,leadFacing=1,facingFor=9,settledFacing=1,previousMode='ready',lastHand='',formClock=0,lastAnim='',cameraSnap=true,lastDraft=null;
const images=new Map(),cards=new Map();
const storage={getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)};
// Advice already shown stays shown across visits; a new journey shows it again.
let hintCount=0;try{for(const key of JSON.parse(storage.getItem('red.poker.hints')||'[]'))world.hinted.add(key);hintCount=world.hinted.size}catch{}
// Sound is on unless this browser was told otherwise; it starts with the first click or key press.
try{muted=storage.getItem('red.poker.sound')==='off'}catch{}
let savedJourney=loadStory(storage),persistedCompletion=false,lastStoryRevision=-1,lastSceneLine="",skipHeld=0,skipStarted=null;
const defs=PLAYER_CLIPS;
const tasks=[];
function loadImage(key,url){tasks.push(new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{images.set(key,image);resolve()};image.onerror=()=>reject(new Error('Could not load '+url));image.src=url}))}
for(const form of ['light','dark'])for(const [state,[count,prefix]] of Object.entries(defs))for(let i=0;i<count;i++)loadImage(`${form}/${state}/${i}`,`./assets/${form}/${state}/${prefix}${form==='light'&&state==='attack3'?String(i).padStart(2,'0'):i}.png`);
for(let i=1;i<=7;i++)loadImage('forest'+i,`./assets/forest/${i}.png`);
for(const [form,fx] of [['light','FX_light'],['light','FX_lighttodark'],['dark','FX_dark'],['dark','FX_darktolight']])for(let i=0;i<36;i++)loadImage(`${fx}/${i}`,`./assets/${form}/${fx}/${fx}${i}.png`);
loadImage('cave','./assets/environment/cave.png');
loadImage('terrain','./assets/environment/terrain.png');loadImage('gothic','./assets/environment/gothic.png');
for(const name of ['forest','stone','thorn-house','oaks','moss-cavern-v2','ruined-chapel-v2','interior-props-v2','masonry-v2'])loadImage('concept-'+name,`./assets/concept/${name==='oaks'?'parallax-oaks':name}.png`);
for(const name of ['bridge-atlas-v1','bridge-distance-v1','bridge-bough-v1'])loadImage('concept-'+name,`./assets/concept/${name}.png`);
for(const [key,url] of Object.entries(STORY_IMAGES))loadImage(key,url);
loadImage('cards','./assets/cards.png');loadImage('dock-branch','./assets/ui/dock_branch.png');loadImage('dock-corner','./assets/ui/dock_corner.png');loadImage('dungeon','./assets/dungeon.png');for(const name of Object.keys(ROSTER))loadImage('cast/'+name,`./assets/cast/${name}_sheet.png`);
const total=tasks.length;let done=0;tasks.forEach(p=>p.then(()=>{$('loading').textContent=`Opening the forest · ${Math.round(++done/total*100)}%`},()=>{}));
Promise.all(tasks).then(()=>{prepareScenery(images);loaded=true;$('begin').disabled=false;$('begin').textContent='Begin journey';$('continue').hidden=!savedJourney;$('continue').textContent=savedJourney?.complete?'Replay final encounter':'Continue journey';$('save-status').textContent=savedJourney?`Saved: ${CLEARINGS[savedJourney.stage].name} · this browser`:'';$('loading').textContent=(matchMedia('(pointer: coarse)').matches?'Touch controls':'Keyboard controls')+' · headphones welcome';updateUI(true)}).catch(err=>{$('begin').textContent='Reload to retry';$('loading').textContent=err.message;console.error(err)});
function sound(name){if(!muted)music.sfx(name)}
// Haptics on touch screens (where the browser supports them): getting hurt, a finisher, a kill, the bear's roar.
const BUZZ={player_hurt:70,finisher:20,enemy_death:12,roar:[40,40,60]};
function buzz(name){if(BUZZ[name]&&navigator.vibrate&&(document.body.classList.contains('touch-seen')||matchMedia('(pointer: coarse)').matches))try{navigator.vibrate(BUZZ[name])}catch{}}
const music=createMusic();
function syncMusic(){
 const silent=muted||!started||world.mode==='paused'||world.mode==='dead'||document.hidden;
 music.play(silent?'':tuneFor(world),world.storyPhase==='cleared'?'victory':'');if(started)music.preload(BOSS_TUNES[world.stageIndex]);
}
function focusGame(){if(!['drafting','cutscene'].includes(world.mode))$('stage').focus({preventScroll:true})}
function clearInput(){skipStarted=null;skipHeld=0;keys.clear();edges.clear();releaseJump=false;accumulator=0}
function enterWorld(){lastAnim='';lastHand='';formClock=0;cam=0;cameraSnap=true;cardPositions.clear();departing.length=0;clearInput();started=true;persistedCompletion=false;$('overlay').hidden=true;updateUI(true);focusGame()}
function persistJourney(){if(world.practice){$('save-status').textContent='Practice leaves your saved journey untouched';return;}const ok=saveStory(storage,world);if(ok)savedJourney=loadStory(storage);lastStoryRevision=world.storyRevision;$('save-status').textContent=ok?'Story checkpoint saved · this browser':'Saving unavailable · keep this tab open';}
function reset(fresh=false){if(fresh){world.hinted.clear();cardSeen.clear();world.reset();}else if(world.practice&&world.bossPractice){world.practiceDeal(world.stageIndex+10)}else if(world.practice){world.reset(savedJourney?.stage||0,savedJourney)}else world.retry();enterWorld();persistJourney()}
function nextClearing(){if(world.advance()){enterWorld();persistJourney();sound('checkpoint')}}
function pause(){if(!started)return;clearInput();if(world.mode==='playing')world.mode='paused';else if(world.mode==='paused')world.mode='playing';updateUI(true)}
function press(code){if(keys.has(code))return;keys.add(code);edges.add(code)}
function release(code){keys.delete(code);if(code==='Space')releaseJump=true}
const controls=['KeyA','KeyD','ArrowLeft','ArrowRight','Space','ShiftLeft','ShiftRight','KeyJ','KeyK','KeyS','ArrowDown','Enter','KeyE','KeyP','Escape','KeyR','Digit1','Digit2','Digit3','Digit4','Digit5'];
window.addEventListener('keydown',e=>{
 if(started&&world.mode==='cutscene'){
  if(['Enter','Space','KeyE','Escape','Tab'].includes(e.code))e.preventDefault();
  if(e.repeat)return;
  if(['Enter','Space','KeyE'].includes(e.code))finishDialogue(e.target.id==='dialogue-skip');
  else if(e.code==='Escape'){skipStarted=performance.now();skipHeld=0;}
  else if(e.code==='Tab'){const buttons=[$('dialogue-next'),$('dialogue-skip')];buttons[document.activeElement===buttons[0]?1:0].focus();}
  return;
 }
 if(world.mode==='drafting'){
  if(e.repeat){e.preventDefault();return;}
  if(e.code==='Digit1'||e.code==='Digit2'){e.preventDefault();finishDraft(Number(e.code.slice(-1))-1)}
  else if(e.code==='Escape'||e.code==='KeyP'){e.preventDefault();finishDraft(null)}
  else if(e.code==='Tab'){e.preventDefault();const buttons=[$('draft-left'),$('draft-right'),$('draft-skip')],i=buttons.indexOf(document.activeElement);buttons[(i+(e.shiftKey?2:1)+3)%3].focus()}
  else if(controls.includes(e.code))e.preventDefault();
  return;
 }
 if(e.target.matches('select,input')||!controls.includes(e.code))return;e.preventDefault();if(e.repeat)return;
 if(e.code==='KeyP'||e.code==='Escape'){pause();return}if(e.code==='KeyR'){if(loaded)reset();return}if(!started||world.mode!=='playing')return;press(e.code)});
window.addEventListener('keyup',e=>{if(e.code==='Escape'){skipStarted=null;skipHeld=0;}if(controls.includes(e.code)){e.preventDefault();release(e.code)}});
window.addEventListener('blur',()=>{clearInput();if(started&&world.mode==='playing'){world.mode='paused';updateUI(true)}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();if(started&&world.mode==='playing'){world.mode='paused';updateUI(true)}}});
$('begin').onclick=()=>{if(!loaded)return;if(world.mode==='paused'){world.mode='playing';clearInput();$('overlay').hidden=true;focusGame()}else if(world.mode==='won'&&world.practice)reset();else if(world.mode==='won'&&world.stageIndex<CLEARINGS.length-1)nextClearing();else reset(!started||world.mode==='won')};
$('continue').onclick=()=>{if(loaded&&savedJourney){world.reset(savedJourney.stage,savedJourney.complete?{phase:'boss',seen:savedJourney.seen}:savedJourney);enterWorld();persistJourney()}};
$('new-journey').onclick=()=>{if(loaded)reset(true)};
$('restart').onclick=()=>{if(loaded)reset()};$('pause').onclick=()=>{pause();focusGame()};
$('play').onclick=()=>{if(started&&world.mode==='playing'){world.play();updateUI(true);focusGame()}};
function showSound(){$('sound').textContent=muted?'Sound off':'Sound on';$('sound').setAttribute('aria-pressed',String(!muted))}showSound();
$('sound').onclick=()=>{muted=!muted;showSound();try{storage.setItem('red.poker.sound',muted?'off':'on')}catch{}if(!muted){music.unlock();sound('meter_full')}focusGame()};
function motion(){document.body.classList.toggle('reduced',reduced);$('motion').textContent=reduced?'Motion off':'Motion on';$('motion').setAttribute('aria-pressed',String(!reduced))}motion();
$('motion').onclick=()=>{reduced=!reduced;motion();focusGame()};
// Full screen (and landscape, where the browser allows locking it) for touch devices whose browser supports it.
const fullscreen=$('fullscreen');fullscreen.hidden=!document.documentElement.requestFullscreen;
fullscreen.onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else{await document.documentElement.requestFullscreen({navigationUI:'hide'});await screen.orientation?.lock?.('landscape').catch(()=>{});}}catch{}};
document.addEventListener('fullscreenchange',()=>{fullscreen.textContent=document.fullscreenElement?'Exit full screen':'Full screen'});
$('rotate').onclick=()=>document.body.classList.add('portrait-ok');
$('deal').onclick=()=>{if(!loaded)return;world.practiceDeal(Number($('practice').value));enterWorld()};
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
 dx<-dead?touchDown('KeyA'):touchUp('KeyA');dx>dead?touchDown('KeyD'):touchUp('KeyD');down?touchDown('KeyS'):touchUp('KeyS');
}
zone.onpointerdown=e=>{if(stickId!==null)return;e.preventDefault();zone.setPointerCapture(e.pointerId);stickId=e.pointerId;origin={x:e.clientX,y:e.clientY};placeStick();stick.classList.add('active');steer(e)};
zone.onpointermove=e=>{if(e.pointerId===stickId)steer(e)};
zone.onpointerup=zone.onpointercancel=zone.onlostpointercapture=e=>{if(e.pointerId!==stickId)return;stickId=null;for(const code of ['KeyA','KeyD','KeyS'])touchUp(code);stick.classList.remove('active');stick.style.left=stick.style.top='';knob.style.transform='';};
zone.oncontextmenu=e=>e.preventDefault();
// Devices that report a fine pointer but get touched still get the controls.
window.addEventListener('touchstart',()=>document.body.classList.add('touch-seen'),{once:true,passive:true});
function holdTouch(){if(started&&world.mode==='playing')for(const code of ['KeyA','KeyD','KeyJ'])if(touchHeld.has(code))keys.add(code);}
// Gamepad (standard mapping): stick or d-pad moves, A jumps, X swings, Y plays the hand, B/RB/RT dash, Start pauses.
const PAD_BUTTONS={0:'Space',1:'ShiftLeft',2:'KeyJ',3:'KeyK',5:'ShiftLeft',7:'ShiftLeft',9:'KeyP',13:'KeyS',14:'KeyA',15:'KeyD'};
const padHeld=new Set();
function padDown(code){
 if(!loaded)return;
 if(!started||!$('overlay').hidden){if(code==='Space')($('continue').hidden?$('begin'):$('continue')).click();else if(code==='KeyP')pause();return;}
 if(world.mode==='cutscene'){if(code==='Space')finishDialogue(false);else if(code==='KeyP')finishDialogue(true);return;}
 if(world.mode==='drafting'){if(code==='KeyA')finishDraft(0);else if(code==='KeyD')finishDraft(1);else if(code==='ShiftLeft')finishDraft(null);return;}
 if(code==='KeyP')pause();else if(world.mode==='playing')press(code);
}
function pollGamepad(){
 const pad=[...(navigator.getGamepads?.()||[])].find(p=>p?.connected),now=new Set();
 if(pad){
  for(const [i,code] of Object.entries(PAD_BUTTONS))if(pad.buttons[i]?.pressed)now.add(code);
  const [x=0,y=0]=pad.axes;if(x<-.4)now.add('KeyA');if(x>.4)now.add('KeyD');if(y>.7)now.add('KeyS');
 }
 for(const code of now)if(!padHeld.has(code))padDown(code);
 for(const code of padHeld)if(!now.has(code))release(code);
 padHeld.clear();for(const code of now)padHeld.add(code);
 // Held directions and the sword survive a pause or scene that cleared the keyboard state.
 if(started&&world.mode==='playing')for(const code of ['KeyA','KeyD','KeyJ'])if(now.has(code))keys.add(code);
}
window.addEventListener('gamepadconnected',()=>{if(!started)$('loading').textContent='Gamepad ready · A jump · X sword · Y hand · B dash'});
function finishDraft(index){
 if(world.mode!=='drafting')return;
 if(index===null)world.dismissDraft();else if(!world.chooseDraft(index))return;
 clearInput();updateUI(true);focusGame();
}
function draftHint(card){
 const hand=world.deck.hand,candidates=hand.length<5?[[...hand,card]]:hand.map((_,slot)=>hand.map((id,i)=>i===slot?card:id));
 const best=candidates.map(evaluate).sort((a,b)=>b.tier-a.tier)[0],suit=Math.floor(card/13),suited=hand.filter(id=>Math.floor(id/13)===suit).length;
 if(suited>=2&&best.tier<=evaluate(hand).tier)return `${Math.min(5,suited+1)} ${['spades','diamonds','clubs','hearts'][suit]} available`;
 return (hand.length===5?'Best swap: ':'Hand becomes: ')+best.name+(best.heal?' · mends a heart':'');
}
function updateDraftUI(){
 const choosing=world.mode==='drafting';$('draft-overlay').hidden=!choosing;
 $('overlay').inert=choosing;document.body.classList.toggle('drafting',choosing);document.querySelector('.table').inert=choosing;document.querySelector('#stage>nav').inert=choosing;
 if(!choosing){lastDraft=null;return;}
 if(lastDraft===world.activeDraft)return;
 lastDraft=world.activeDraft;clearInput();
 const offer=world.deck.drafts.find(d=>d.id===world.activeDraft);
 $('draft-detail').textContent=world.deck.hand.length===5?'Your hand is full. Save one card, then use 1–5 to replace a slot.':'Choose one for your hand. The other card will vanish.';
 offer.cards.forEach((id,i)=>{
  const button=$(i?'draft-right':'draft-left'),c=button.querySelector('canvas').getContext('2d');let rank=id%13+2;if(rank===14)rank=1;
  c.clearRect(0,0,32,48);c.imageSmoothingEnabled=false;c.drawImage(images.get('cards'),32+(Math.floor((rank-1)/3)*4+Math.floor(id/13))*32,32+((rank-1)%3)*48,32,48,0,0,32,48);
  button.querySelector('strong').textContent=cardName(id);button.querySelector('small').textContent=draftHint(id);button.setAttribute('aria-label',`Take ${cardName(id)} (${i+1})`);
 });
 $('draft-left').focus({preventScroll:true});
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
  if(c in VOWEL&&i-speech.last>=2&&!muted){
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
 $('dialogue').hidden=!active;
 document.body.classList.toggle('in-cutscene',!!active);
 document.querySelector('.table').inert=!!active||world.mode==='drafting';
 document.querySelector('#stage>nav').inert=!!active||world.mode==='drafting';
 $('objective').textContent=started?world.objective:'';
 const b=world.boss;
 $('boss-hud').hidden=!started||!b||!!active||world.mode==='won';
 if(b){
  $('boss-name').textContent=STAGES[world.stageIndex].title+(b.garden?' · THE LAST SHADOW':'');
  $('boss-fill').style.width=`${Math.max(0,b.hp)/b.max*100}%`;
  $('boss-health').setAttribute('aria-valuenow',String(Math.max(0,b.hp)));
  $('boss-health').setAttribute('aria-valuemax',String(b.max));
  $('boss-health').setAttribute('aria-label',b.kind==='rowan'?'Huntsman resolve':'Boss health');
  $('boss-tell').textContent=b.state==='windup'?({charge:'ANTLERS DOWN · DODGE',roots:'ROOTS RISING · KEEP MOVING',chain:'CHAIN SWEEP · JUMP',slam:'HOOK RAISED · MOVE AWAY',cut:'AXE RAISED · DODGE BEHIND',axe:'AXE THROW · WATCH THE RETURN',silk:'FALLING SILK · LEAVE THE MARKS',rings:'BELL RINGS · JUMP',bite:'DRAWING BREATH · DODGE',leap:b.chained?'HE LEAPS AGAIN · MOVE':'LEAP · LEAVE THE MARK'}[b.pattern]):b.state==='recover'?'OPENING · STRIKE NOW':b.kind==='rowan'?'BAIT THE AXE · HIS GUARD IS UP':b.phase===2?'SECOND WIND · WATCH THE TELLS':'WATCH. DODGE. STRIKE.';
 }
 if(!active){lastSceneLine='';return;}
 $('skip-progress').style.width=`${Math.min(1,skipHeld)*100}%`;
 const scene=SCENES[world.dialogue.id],line=scene.lines[world.dialogue.index],signature=world.dialogue.id+':'+world.dialogue.index;
 if(signature===lastSceneLine)return;
 lastSceneLine=signature;clearInput();
 const actor=CAST[line.speaker];
 $('scene-title').textContent=scene.title;$('scene-caption').textContent=scene.caption;
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
   if(inBed&&id==='grandma'){drawStoryActor(ctx,images,'disguise',744,368,visual,{facing:-1});ctx.save();ctx.scale(2,2);bedCover(ctx);ctx.restore();continue;}
   drawStoryActor(ctx,images,id,bound?820:inBed?670:inSilk?480:world.x+100+(i++)*80,bound?412:inBed?380:inSilk?356:world.y,0,{facing:-1});
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
function storyFloor(){return world.storyLocation==='inside'||world.storyLocation==='arena'&&[1,4].includes(world.stageIndex);}
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
// ?hitboxes overlays boss body boxes, Red's feet and the sword reach (development aid).
const DEBUG_HITBOX=typeof location!=='undefined'&&new URLSearchParams(location.search).has('hitboxes');
function drawHitboxes(){
 ctx.save();ctx.lineWidth=2;ctx.strokeStyle='#ff4dd2';
 for(const e of world.enemies){const box=e.boss&&bossBox(e);if(box)ctx.strokeRect(box.x0,box.y0,box.x1-box.x0,box.y1-box.y0);else ctx.strokeRect(e.x-4,e.y-4,8,8);}
 ctx.strokeStyle='#4dffea';ctx.strokeRect(world.x-9,world.y-36,18,36);
 if(world.attack>0){const f=world.attackFacing;ctx.strokeStyle='#ffe04d';ctx.strokeRect(f>0?world.x-10:world.x-76,world.y-56,86,56);}
 ctx.restore();
}
function drawArrow(b){
 const len=Math.hypot(b.vx,b.vy)||1,ux=b.vx/len,uy=b.vy/len;
 for(let i=-10;i<=8;i+=2)rect(b.x+ux*i,b.y+uy*i,2,2,i<-6?'#d8c9a8':'#8a6a48');
 rect(b.x+ux*10,b.y+uy*10,2,2,'#e2e4ea');rect(b.x+ux*8-uy*2,b.y+uy*8+ux*2,2,2,'#a9a5b8');rect(b.x+ux*8+uy*2,b.y+uy*8-ux*2,2,2,'#a9a5b8');
 rect(b.x-ux*10-uy*2,b.y-uy*10+ux*2,2,2,'#c4b49a');rect(b.x-ux*10+uy*2,b.y-uy*10-ux*2,2,2,'#c4b49a');
}
function drawStoryPlatforms(){
 const inside=world.storyLocation==='inside',cottage=world.storyLocation==='arena'&&world.stageIndex===4;
 if(!storyFloor())return false;
 for(const p of world.platforms){
  if(cottage&&!p.ground)continue;
  const depth=p.ground?120:18;
  // Inside the Wolf the ledges are flesh with a bone lip.
  rect(p.x,p.y,p.w,depth,inside?'#3f1f2c':'#4b3b36');
  rect(p.x,p.y,p.w,4,inside?'#d3ceae':'#b69a6a');
  rect(p.x,p.y+4,p.w,4,inside?'#8a6a70':'#6e5543');
  for(let x=p.x+4,k=0;x<p.x+p.w-4;x+=32,k++){
   const tone=inside?['#45222f','#3c1d29','#4b2633'][k%3]:['#4b3b36','#433430','#54423b'][(k*7+p.id)%3];
   rect(x+2,p.y+8,30,depth-8,tone);rect(x+2,p.y+8,30,2,inside?'#5a2c3b':'#5e4a40');
   for(let y=p.y+16+(k%3)*6;y<p.y+depth-4;y+=22)rect(x+8+(k%4)*4,y,10,2,inside?'#2a1420':'#3a2c28');
   rect(x,p.y+8,2,depth-8,inside?'#1d0e17':'#28282b');
   rect(x+4,p.y+10,16,2,inside?'#6b3446':'#765c47');
   rect(x+20,p.y+6,2,2,'#c0ad87');
  }
  if(!p.ground){rect(p.x+10,p.y+depth,8,8,inside?'#5a2c3b':'#3c3030');rect(p.x+p.w-18,p.y+depth,8,8,inside?'#5a2c3b':'#3c3030');}
 }
 return true;
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
 updateDraftUI();updateStoryUI();syncMusic();document.body.classList.toggle('at-title',!started);
 $('chapter-label').textContent=world.arena&&world.practice?'PRACTICE ARENA':`${['I','II','III','IV','V'][world.stageIndex]} · ${world.clearing.name.toUpperCase()}`;
 const trailKey=world.arena?'arena':String(world.stageIndex);
 if($('trail-dots').dataset.stage!==trailKey){$('trail-dots').dataset.stage=trailKey;$('trail-dots').innerHTML=CLEARINGS.map((c,i)=>`<i class="${!world.practice&&i<=world.stageIndex?'lit':''}" title="${c.name}"></i>`).join('');$('trail-dots').setAttribute('aria-label',`Clearing ${world.stageIndex+1} of ${CLEARINGS.length}`);}
 const mends=started&&evaluate(world.deck.hand).heal;$('health').innerHTML=Array.from({length:5},(_,i)=>`<i class="heart ${i<world.health?'full':mends&&i===world.health?'mend':''}"></i>`).join('');$('health').setAttribute('aria-label',`${world.health} of 5 health`);$('health').classList.toggle('low',started&&world.health===1);
 $('quest').textContent=world.storyLocation==='trail'&&!world.arena?`${world.collected} / 3 embers · ${world.foesAhead} ${world.foesAhead===1?'foe':'foes'} ahead`:world.storyPhase==='inside'?`${3-world.knots.filter(k=>k.hp>0).length} / 3 knots`:world.boss?'Boss encounter':world.storyPhase==='home'?'The road is open':'Lantern lit';
 const r=evaluate(world.deck.hand);$('combo').textContent=r.name;$('effect').textContent=r.tier<0?'Land sword hits to refill':`${EFFECTS[r.tier]} · ${r.damage} damage${r.heal&&world.health<5?' · +1 heart':''}`;
 $('play').disabled=!started||world.mode!=='playing'||!world.deck.hand.length;
 $('draw-label').textContent=world.deck.banked?'Saved: '+cardName(world.deck.reserve):`Sword hits ${world.deck.hits} / 3`;
 $('draw-help').textContent=world.deck.banked?'1–5: replace a slot with your saved card.':world.cardDrops.length?'Touch a card drop to reveal two choices.':'Three landed swings drop one card.';
 $('deck-count').textContent=`${world.deck.pile.length} in deck · ${world.deck.discard.length} spent${world.cardDrops.length?' · '+world.cardDrops.length+' dropped':''}`;
 [...$('pips').children].forEach((p,i)=>p.classList.toggle('lit',world.deck.banked||i<world.deck.hits));
 const sig=world.deck.hand.join(',');if(sig!==lastHand||force){lastHand=sig;
  for(const [id,el] of cards)if(!world.deck.hand.includes(id)){el.classList.add('out');setTimeout(()=>el.remove(),280);cards.delete(id)}
  $('hand').querySelectorAll('.empty-slot').forEach(e=>e.remove());
  for(let i=0;i<5;i++){const slot=document.createElement('div');slot.className='empty-slot';slot.style.left=`${i*72+15}px`;slot.style.setProperty('--slot',i);$('hand').append(slot)}
  world.deck.hand.forEach((id,i)=>{let el=cards.get(id);if(!el){el=document.createElement('button');el.className='card in';el.innerHTML='<span class="slot"></span><canvas width="32" height="48"></canvas>';const c=el.querySelector('canvas').getContext('2d');let rank=id%13+2;if(rank===14)rank=1;let sx=32+(Math.floor((rank-1)/3)*4+Math.floor(id/13))*32,sy=32+((rank-1)%3)*48;c.drawImage(images.get('cards'),sx,sy,32,48,0,0,32,48);el.onclick=()=>{if(!started||world.mode!=='playing')return;let index=world.deck.hand.indexOf(id);if(world.deck.replace(index)){sound('meter_full');updateUI(true)}else{world.banner='TOUCH A CARD DROP TO CHOOSE YOUR DRAW';world.bannerTime=1.8}focusGame()};el.onpointerenter=()=>hover=id;el.onpointerleave=()=>hover=-1;$('hand').append(el);cards.set(id,el)}
   const rank=id%13+2,label=rank===14?'Ace':rank===13?'King':rank===12?'Queen':rank===11?'Jack':rank;el.setAttribute('aria-label',`Card ${i+1}: ${label} of ${['spades','diamonds','clubs','hearts'][Math.floor(id/13)]}. Click to use a saved replacement.`);el.querySelector('.slot').textContent=String(i+1);el.style.left=`${i*72+13}px`;el.classList.toggle('match',r.indices.includes(i));el.dataset.slot=i;el.style.setProperty('--slot',i);
  });
 }
 $('dark-meter').hidden=world.dark<=0;$('dark-time').textContent=world.dark.toFixed(1)+'s';$('dark-meter').querySelector('i').style.transform=`scaleX(${world.dark/6})`;
 const nextToast=world.bannerTime>0?world.banner:'';if(nextToast!==toast){toast=nextToast;$('toast').textContent=toast}
 $('pause').innerHTML=(world.mode==='paused'?'Resume':'Pause')+' <kbd>P</kbd>';
 if(started&&(world.mode!==previousMode||force)){
  previousMode=world.mode;const overlay=$('overlay');overlay.hidden=['playing','drafting','cutscene'].includes(world.mode);
  $('continue').hidden=true;
  if(!overlay.hidden){
   const won=world.mode==='won',final=world.stageIndex===CLEARINGS.length-1;
   $('story-eyebrow').textContent=won?(final?'THE ROAD IS OPEN':'CLEARING '+(world.stageIndex+1)+' / '+CLEARINGS.length+' · LANTERN LIT'):world.clearing.name.toUpperCase();
   $('story-title').textContent=won?(final?'Room for one more.':'A light in the dark.'):world.mode==='dead'?'One more hand?':'By the lantern.';
   $('story-copy').textContent=won?(world.practice?'Practice complete. Your journey is safe.':final?'Grandmother is safe. The voices are free. There is enough bread to share.':'The way is clear. '+CLEARINGS[world.stageIndex+1]?.name+' lies ahead.'):world.mode==='dead'?(world.arena?'Return to the encounter with full health and a fresh hand.':'Take a fresh hand and try this clearing again.'):'Your hand and the forest will wait right here.';
   $('begin').textContent=won?(world.practice?(world.bossPractice?'Retry encounter':'Back to journey'):final?'Play a new journey':'On to '+CLEARINGS[world.stageIndex+1]?.name):world.mode==='paused'?'Back to the forest':(world.arena?'Retry encounter':'Retry clearing');
   const clock=`${Math.floor(world.time/60)}:${String(Math.floor(world.time%60)).padStart(2,'0')}`,best=world.bestHand>=0?' · best hand: '+HANDS[world.bestHand]:'';
   $('loading').textContent=won?`${world.kills} foes defeated · ${world.fallCount} falls · ${clock}${best}`:'P / Esc resumes · R retries this clearing';
   if(won&&!persistedCompletion){persistedCompletion=true;persistJourney();}
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
 const combo=evaluate(world.deck.hand),t=visual;
 for(const [id,p] of cardPositions)if(!world.deck.hand.includes(id)){departing.push({...p,id,time:t});cardPositions.delete(id)}
 world.deck.hand.forEach((id,i)=>{
  const active=world.mode==='playing'&&(hover===id||document.activeElement===cards.get(id));
  const target={x:266+i*72,y:(combo.indices.includes(i)?416:424)-(active?10:0)};
  let p=cardPositions.get(id);if(!p){const picked=world.lastPicked?.card===id?world.lastPicked:null;p=picked?{x:picked.x-cam-32,y:picked.y-80-48}:{x:960,y:540};cardPositions.set(id,p)}
  p.x+=(target.x-p.x)*.3;p.y+=(target.y-p.y)*.3;
  let rank=id%13+2;if(rank===14)rank=1;const sx=32+(Math.floor((rank-1)/3)*4+Math.floor(id/13))*32,sy=32+((rank-1)%3)*48;
  const pulse=reduced?0:Math.sin(t*2+id)*2,angle=reduced?0:(i-2)*.025+Math.sin(t*2.3+id)*.018;
  ctx.save();ctx.translate(snap(p.x+32),snap(p.y+48+pulse));ctx.rotate(angle);
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
 if(world.dark>0){ctx.fillStyle='#31184c36';ctx.fillRect(0,0,960,480)}
 ctx.save();ctx.translate(-snap(cam),0);
 drawStorySet(ctx,images,world,reduced?0:visual,reduced);
 if(bridge)drawBridgeArchitecture(ctx,images,world.platforms,visual,reduced);else if(!drawStoryPlatforms())drawTerrain(ctx,images,world.platforms,visual,reduced,theme);
 if(!world.arena){
  if(!bridge)drawLandmarks(ctx,images,world,visual,reduced);
  if(world.clearing.theme==='house')drawHome(ctx,images,world.collected,visual,reduced,world.clearing.exit.x);else drawTrailGate(ctx,images,world,visual,reduced);
  drawGates(ctx,world,visual,reduced);
 }
 drawStoryCharacters();
 drawHazards();
 // Ground loot sits behind combatants; cards must never mask an enemy pose.
 for(const drop of world.cardDrops){
  const x=snap(drop.x),y=snap(drop.y-26-(reduced?0:Math.sin(visual*3+drop.id)*2)-Math.sin(Math.min(1,drop.age/.4)*Math.PI)*18);
  circle(x,y,22,'#eac77c18');rect(x-14,y-20,28,40,'#101824');rect(x-12,y-18,24,36,'#e6cc93');rect(x-10,y-16,20,32,'#713843');
  rect(x-8,y-14,16,2,'#ad6262');diamond(x,y,8,'#f6dfa5');diamond(x,y,4,'#8f424d');
  rect(x-8,y-12,2,2,'#ffeab6');rect(x+6,y+10,2,2,'#ffeab6');text('CARD',x-14,y-26,10,'#fff0bc');
 }
 for(const n of (world.practice&&!world.arena&&!world.dialogue?world.npcs:[])||[]){const f=idleFrame(visual,n.x),{w,h}=characterSize(CELL,CELL),near=Math.abs(world.x-n.x)<110&&Math.abs(world.y-n.y)<80;ctx.save();ctx.translate(snap(n.x),snap(n.y));ctx.scale(world.x<n.x?-1:1,1);ctx.drawImage(images.get('cast/'+n.skin),f.x,f.y,f.w,f.h,snap(-w/2),-h,w,h);ctx.restore();if(near&&n.line){ctx.font='12px Silkscreen, monospace';const tw=snap(ctx.measureText(n.line).width+12),top=n.y-h+castTop(n.skin)*2,bx=snap(Math.max(cam+8,Math.min(cam+952-tw,n.x-tw/2)));rect(bx,top-26,tw,20,'#101226d8');text(n.line,bx+6,top-11,12,'#fff2bf');}}
 if(world.bossCorpse){const c=world.bossCorpse;ctx.save();ctx.globalAlpha=Math.min(1,(BOSS_DEATH-c.time)/.4);drawStoryActor(ctx,images,c.kind,c.x,c.y,visual,{facing:c.face,state:'dead',boss:{deadTime:c.time}});ctx.restore();}
 for(const e of world.enemies){if(e.boss||e.storyTarget){if(world.dialogue?.id!=='wolfIntro')drawStoryActor(ctx,images,e.kind,e.x,e.y,visual,{facing:e.face,state:e.state,flash:e.flash,boss:e});continue;}const img=images.get('cast/'+e.skin);const frame=castFrame(e,world.time);ctx.save();ctx.translate(snap(e.x),snap(e.y));ctx.scale(e.face,1);const {w}=characterSize(frame.w,frame.h),h=(CELL-castTop(e.skin))*2;ctx.drawImage(img,frame.x,frame.y,frame.w,frame.h,snap(-w/2),-w,w,w);
  // A braced heavy keeps its slam pose and only flashes: the hit landed, the slam is still coming.
  if(e.brace>0)ctx.drawImage(tinted(img,'#fff4ee'),frame.x,frame.y,frame.w,frame.h,snap(-w/2),-w,w,w);
  ctx.restore();if(e.state!=='blink'){rect(e.x-16,e.y-h-8,32,3,'#26322e');rect(e.x-16,e.y-h-8,32*e.hp/e.max,3,e.enraged?'#e8434a':e.tough?'#bd8fe0':'#ca8072');}if(e.state==='roar')text('ROAR',e.x-16,e.y-h-20,12,'#ffbf80');if(e.wind>0){text(e.arrow?'AIM':e.kind==='mage'?(e.hexing?'HEX':e.puffing?'SPORES':'CAST'):e.erupting?'ROOTS':e.rooted?'LASH':e.tough?'SLAM':e.kind==='charger'?'CHARGE':'!',e.x-(e.kind==='charger'?22:e.tough||e.arrow?14:3),e.y-h-20,12,'#ffbf80');
 if(e.arrow){}else if(e.fly){for(let t=.2;t<1;t+=.16)rect(e.x+(e.aimX-e.x)*t-2,e.y-12+(e.aimY-e.y+12)*t-2,4,4,'#e58955');}else if(e.kind==='mage'){if(!e.hexing&&!e.puffing){diamond(e.x+e.face*18,e.y-24,8,(SHOT_COLORS[e.look]||SHOT_COLORS.orb)[0]);diamond(e.x+e.face*18,e.y-24,4,(SHOT_COLORS[e.look]||SHOT_COLORS.orb)[1])}}else if(e.erupting){}else if(e.rooted)rect(e.x-24*e.strikeDir,e.y-3,144*e.strikeDir,3,'#e58955');else if(e.kind==='charger')rect(e.x,e.y-3,Math.max(e.left,Math.min(e.right,e.x+e.strikeDir*300))-e.x,3,'#e58955');else rect(e.tough?e.x-90:e.x,e.y-3,e.tough?180:88*e.strikeDir,3,'#e58955');}
 if(e.state==='lunge'&&!e.fly){rect(e.x-e.strikeDir*30,e.y-20,e.strikeDir*28,3,'#f1c17d')}
 if(e.state==='chase'&&!e.fly&&e.hopCD<.1)text('•',e.x-2,e.y-h-18,10,'#caa16d');}
 drawChainSweep();
 if(DEBUG_HITBOX)drawHitboxes();
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
 ctx.restore();if(bridge)drawBridgeAtmosphere(ctx,cam,visual,reduced);else if(!storyFloor())drawForeground(ctx,images,cam,world,reduced);
 // Ground marks, roots, flames and spore clouds go over the foreground foliage so a bush never hides a tell.
 ctx.save();ctx.translate(-snap(cam),0);drawPatches();ctx.restore();drawBossCard();if(world.dying>0||world.mode==='dead'){ctx.fillStyle=`rgba(11,8,16,${(world.mode==='dead'?1:1-world.dying/DEATH_TIME)*.55})`;ctx.fillRect(0,0,960,480);}ctx.restore();drawDock();ctx.restore();screen.imageSmoothingEnabled=false;screen.clearRect(0,0,960,540);screen.drawImage(raster,0,0,960,540);
}
function frame(now){let dt=Math.min((now-last)/1000||0, .05);last=now;pollGamepad();holdTouch();if(loaded){if(started&&world.mode==='playing'){accumulator+=dt;let first=true;
  while(accumulator>=1/60){const input={axis:Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft')),sword:keys.has('KeyJ')};if(first&&world.hitStop<=0){input.jump=edges.has('Space');input.jumpRelease=releaseJump;input.dash=edges.has('ShiftLeft')||edges.has('ShiftRight');input.play=edges.has('KeyK');input.drop=edges.has('KeyS')||edges.has('ArrowDown');for(let i=0;i<5;i++)if(edges.has('Digit'+(i+1)))input.replace=i;edges.clear();releaseJump=false;first=false}const before=world.time;world.step(1/60,input);const elapsed=world.time-before;visual+=elapsed;formClock+=elapsed;accumulator-=1/60}
  for(const event of world.events.splice(0)){sound(event);buzz(event);}
 }else accumulator=0;
 if(started&&world.mode==='cutscene')speak(dt);
 if(world.mode==='cutscene'&&skipStarted!==null){skipHeld=(now-skipStarted)/900;if(skipHeld>=1)finishDialogue(true);}
 if(started&&!world.practice&&lastStoryRevision!==world.storyRevision)persistJourney();
 if(world.hinted.size!==hintCount){hintCount=world.hinted.size;try{storage.setItem('red.poker.hints',JSON.stringify([...world.hinted]))}catch{}}
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
// Read-only state for checking the live game; no cheat functions are exposed.
Object.defineProperty(window,'__POKER_STATE__',{get:()=>({cam:Math.round(cam),x:world.x,y:world.y,vx:world.vx,vy:world.vy,mode:started?world.mode:'ready',grounded:world.grounded,hand:[...world.deck.hand],hits:world.deck.hits,banked:world.deck.banked,dark:world.dark,collected:world.collected,health:world.health,practice:world.practice,stage:world.stageIndex,storyPhase:world.storyPhase,storyLocation:world.storyLocation,dialogue:world.dialogue?{...world.dialogue}:null,boss:world.boss?{kind:world.boss.kind,hp:world.boss.hp,max:world.boss.max,state:world.boss.state,pattern:world.boss.pattern}:null,objective:world.objective,hitStop:world.hitStop,shakeTime:world.shakeTime,reserve:world.deck.reserve,cardDrops:world.cardDrops.map(d=>({id:d.id,x:d.x,y:d.y,blocked:d.blocked})),draft:world.deck.drafts.find(d=>d.id===world.activeDraft)?.cards??null})});

// Named exports support the separate local review fixture; the player page exposes no mutation controls.
export {world,enterWorld};
