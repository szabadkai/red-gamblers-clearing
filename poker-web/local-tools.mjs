import {bossBox} from './bosses.mjs';
import {PlaytestRecorder,observePlaytest} from './playtest.mjs';

// Only the opted-in Node launcher serves this module as runtime.mjs.
export function installLocalTools({world,enterWorld,menu,ready,camera,started}) {
 if(!/^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(window.origin))return;
 window.__RED_REVIEW__={world,enterWorld};
 Object.defineProperty(window,'__POKER_STATE__',{get:()=>({
  cam:Math.round(camera()),x:world.x,y:world.y,vx:world.vx,vy:world.vy,
  mode:started()?world.mode:'ready',grounded:world.grounded,hand:[...world.deck.hand],
  hits:world.deck.hits,banked:world.deck.banked,dark:world.dark,collected:world.collected,
  health:world.health,practice:world.practice,stage:world.stageIndex,storyPhase:world.storyPhase,
  storyLocation:world.storyLocation,dialogue:world.dialogue?{...world.dialogue}:null,
  boss:world.boss?{kind:world.boss.kind,hp:world.boss.hp,max:world.boss.max,state:world.boss.state,pattern:world.boss.pattern}:null,
  objective:world.objective,hitStop:world.hitStop,shakeTime:world.shakeTime,reserve:world.deck.reserve,
  cardDrops:world.cardDrops.map(({id,x,y,blocked})=>({id,x,y,blocked})),
  draft:world.deck.drafts.find(d=>d.id===world.activeDraft)?.cards??null
 })});
 const overlay=document.getElementById('overlay'),home=document.getElementById('menu-home');
 const trigger=document.createElement('button');
 trigger.textContent='Developer tools';trigger.className='menu-link';home.append(trigger);
 const page=document.createElement('section');
 page.id='menu-developer';page.className='menu-page menu-sheet';page.hidden=true;
 page.innerHTML=`<h2>Developer tools</h2><label for="practice" class="menu-row">Explore / practice
 <select id="practice">
  <optgroup label="Poker hands">
   <option value="0">Pair · throw a spare card</option>
   <option value="24">Two pair · split the pairs</option>
   <option value="1">Flush → Dark Red</option>
   <option value="2">Four of a kind → Dark Red</option>
   <option value="3">Card drop → choose a draw</option>
  </optgroup>
  <optgroup label="Foes">
   <option value="4">Boar · lunge</option>
   <option value="5">Hunter · aimed arrow</option>
   <option value="6">Living tree · slam</option>
   <option value="20">Living tree · erupting roots</option>
   <option value="15">Raven · dive</option>
   <option value="16">Stag · charge</option>
   <option value="17">Wisp · blinks away</option>
   <option value="18">Witch · bolt and hex</option>
   <option value="19">Brambles · rooted lash</option>
   <option value="21">Mushroom · spore cloud</option>
   <option value="22">Ghost hunter · phases through</option>
   <option value="23">Bear · roar and rage</option>
  </optgroup>
  <optgroup label="Bosses">
   <option value="10">Briar Hart</option>
   <option value="11">Tollkeeper</option>
   <option value="12">Rowan the Huntsman</option>
   <option value="13">Bell Widow</option>
   <option value="14">The Wolf</option>
  </optgroup>
  <optgroup label="Explore">
   <option value="9">The Huntsman’s Bridge</option>
   <option value="7">Moss Cavern</option>
   <option value="8">Ruined Chapel</option>
  </optgroup>
 </select></label>
 <div class="menu-actions"><button id="deal">Start practice</button><button id="dev-back">Back</button></div>`;
 overlay.append(page);
 trigger.onclick=()=>menu.open('developer',trigger);
 page.querySelector('#dev-back').onclick=()=>{menu.home(false);trigger.focus()};
 page.querySelector('#deal').onclick=()=>{
   if(!ready())return;
   world.practiceDeal(Number(page.querySelector('select').value));enterWorld();
 };
 const recorder=new PlaytestRecorder();
 observePlaytest(world,recorder);
 const recording=document.createElement('section');
 recording.innerHTML=`<h3>Playtest recording</h3>
 <p class="menu-note">Opt-in, local only. Record a journey, then export encounter deaths, gate timing, healing opportunities and card-choice time. Nothing is uploaded.</p>
 <div class="menu-actions"><button id="test-start">Start new recording</button><button id="test-stop" disabled>Stop recording</button><button id="test-export" disabled>Export playtest JSON</button></div>
 <p id="test-status" class="menu-note" role="status">No recording yet. Starting a recording does not start or reset a journey.</p>`;
 page.insertBefore(recording,page.lastElementChild);
 const testStart=recording.querySelector('#test-start'),testStop=recording.querySelector('#test-stop'),testExport=recording.querySelector('#test-export'),testStatus=recording.querySelector('#test-status');
 const summarize=()=>{
   const report=recorder.report(),rows=report.encounters,total=key=>rows.reduce((sum,row)=>sum+row[key],0);
   testStatus.textContent=`${report.active?'Recording':'Stopped'} · ${Math.round(report.activeSeconds)} active seconds · ${total('deaths')} deaths · ${total('drawChoices')} card choices · ${total('deathsWithHealingHand')} deaths holding a healing hand. Practice entries are marked separately.`;
 };
 testStart.onclick=()=>{
   recorder.start(world);testStart.disabled=true;testStop.disabled=false;testExport.disabled=true;summarize();
 };
 testStop.onclick=()=>{
   recorder.stop(world);testStart.disabled=false;testStop.disabled=true;testExport.disabled=false;summarize();
 };
 testExport.onclick=()=>{
   const blob=new Blob([JSON.stringify(recorder.report(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');
   link.href=url;link.download='red-playtest.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 };
 // Keep pause/menu state current even when the fixed-step loop is suspended.
 const sampleTimer=setInterval(()=>{if(recorder.active){recorder.capture(world);if(!page.hidden)summarize();}},250);
 window.addEventListener('pagehide',()=>clearInterval(sampleTimer),{once:true});
 if(!new URLSearchParams(location.search).has('hitboxes'))return;
 return function drawHitboxes(ctx){
 ctx.save();ctx.lineWidth=2;ctx.strokeStyle='#ff4dd2';
 for(const e of world.enemies){const box=e.boss&&bossBox(e);if(box)ctx.strokeRect(box.x0,box.y0,box.x1-box.x0,box.y1-box.y0);else ctx.strokeRect(e.x-4,e.y-4,8,8);}
 ctx.strokeStyle='#4dffea';ctx.strokeRect(world.x-9,world.y-36,18,36);
 if(world.attack>0){const f=world.attackFacing;ctx.strokeStyle='#ffe04d';ctx.strokeRect(f>0?world.x-10:world.x-76,world.y-56,86,56);}
 ctx.restore();
};
}
