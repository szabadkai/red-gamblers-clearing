import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ACTIONS,LAYOUTS,RESERVED,conflicts,createControls,loadControls} from '../input.mjs';

const memory=(init={})=>{const data=new Map(Object.entries(init));return {data,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};};

test('both layouts bind every action once, with no clashes or reserved keys',()=>{
 for(const [name,{keys}] of Object.entries(LAYOUTS)){
  assert.deepEqual(conflicts(keys),[],name);
  for(const {id} of ACTIONS){
   assert.ok(keys[id]?.length,`${name} binds ${id}`);
   for(const code of keys[id])assert.ok(!RESERVED.has(code),`${name} leaves ${code} free`);
  }
 }
});

test('up jumps in both layouts and collecting moves off it',()=>{
 const c=createControls(memory());
 assert.equal(c.action('KeyW'),'jump');assert.equal(c.action('ArrowUp'),'jump');assert.equal(c.action('KeyE'),'interact');
 c.setLayout('arrows');
 assert.equal(c.action('ArrowUp'),'jump');assert.equal(c.action('KeyZ'),'jump');assert.equal(c.action('Enter'),'interact');
 assert.equal(c.action('Escape'),'pause');assert.equal(c.action('Digit3'),'slot3');
});

test('the other layout\'s action keys switch layouts until the player picks one',()=>{
 const c=createControls(memory());
 assert.equal(c.notice('KeyM'),false);
 assert.equal(c.notice('KeyX'),true);
 assert.equal(c.layout,'arrows');assert.equal(c.action('KeyX'),'sword');
 assert.equal(c.notice('Space'),false,'Space jumps in both, so it never flips the layout');
 assert.equal(c.notice('KeyJ'),true);assert.equal(c.layout,'wasd');
 c.setLayout('wasd');
 assert.equal(c.notice('KeyX'),false,'a chosen layout stays');
});

test('rebinding takes the key from its old action and survives a reload',()=>{
 const storage=memory(),c=createControls(storage);
 assert.deepEqual(c.rebind('sword','Tab'),{ok:false});
 assert.deepEqual(c.rebind('play','KeyJ'),{ok:true,orphan:'sword'});
 assert.equal(c.layout,'custom');assert.equal(c.action('KeyJ'),'play');assert.deepEqual(c.keys('sword'),[]);
 assert.equal(c.label('play'),'J');assert.equal(c.label('sword'),'Unbound');
 const again=createControls(storage);
 assert.equal(again.action('KeyJ'),'play');assert.equal(again.notice('KeyX'),false);
});

test('damaged saves fall back to WASD',()=>{
 assert.equal(loadControls(memory({'red.poker.controls.v1':'{oops'})).layout,'wasd');
 const clash={left:['KeyA'],right:['KeyA']};
 assert.equal(loadControls(memory({'red.poker.controls.v1':JSON.stringify({layout:'custom',custom:clash})})).layout,'wasd');
});

test('labels follow the device',()=>{
 const c=createControls(memory());
 assert.equal(c.label('cycle'),'L');assert.equal(c.label('cycle','gamepad'),'LB');assert.equal(c.label('cycle','touch'),'Cycle');
 assert.equal(c.label('dash'),'Shift');assert.equal(c.label('left'),'A');
});
