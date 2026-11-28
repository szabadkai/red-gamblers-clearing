import test from 'node:test';
import assert from 'node:assert/strict';
import {serveGame} from '../serve.mjs';
import {loadSettings, saveSettings} from '../settings.mjs';

async function request(url, {devTools=false, host='127.0.0.1:4310', remoteAddress='127.0.0.1'}={}) {
  const response = {
    writeHead(status) { this.status=status; return this; },
    end(body) { this.body=body?.toString() ?? ''; }
  };
  await serveGame({method:'GET', url, headers:{host}, socket:{remoteAddress}}, response, {devTools});
  return response;
}

test('only an explicitly enabled local server installs the practice and inspection hooks', async () => {
  const dev=await request('/runtime.mjs', {devTools:true});
  assert.equal(dev.status,200);
  assert.match(dev.body,/__RED_REVIEW__/);
  const normal=await request('/runtime.mjs?dev=1&hitboxes');
  assert.equal(normal.status,200);
  assert.doesNotMatch(normal.body,/__RED_REVIEW__|practiceDeal|__POKER_STATE__/);
  for (const overrides of [{host:'game.example'},{host:'localhost.example'},{remoteAddress:'192.0.2.18'}]) {
    assert.equal((await request('/runtime.mjs',{devTools:true,...overrides})).body,normal.body);
  }
  assert.equal((await request('/tests/story-review.html')).status,404);
  assert.equal((await request('/tests/story-review.html',{devTools:true})).status,200);
  assert.equal((await request('/local-tools.mjs')).status,404);
  const page=await request('/?dev=1&hitboxes');
  assert.doesNotMatch(page.body,/Explore \/ practice|id="deal"|Developer tools/);
});

test('settings preserve the old mute preference and round trip separately from checkpoints', () => {
  const data=new Map([['red.poker.sound','off'],['red.poker.story.v3','checkpoint']]);
  const storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};
  assert.deepEqual(loadSettings(storage),{sound:false,music:100,effects:100,motion:'system',tutorials:true});
  const changed={sound:true,music:35,effects:0,motion:'reduced',tutorials:false};
  assert.ok(saveSettings(storage,changed));
  assert.deepEqual(loadSettings(storage),changed);
  assert.equal(data.get('red.poker.story.v3'),'checkpoint');
  data.set('red.poker.settings.v1','{"music":999,"effects":"off","sound":null,"motion":"bad"}');
  assert.deepEqual(loadSettings(storage),{sound:false,music:100,effects:100,motion:'system',tutorials:true});
  data.set('red.poker.settings.v1','corrupt');
  assert.equal(loadSettings(storage).sound,false);
  const unavailable={getItem(){throw Error()},setItem(){throw Error()}};
  assert.equal(loadSettings(unavailable).sound,true);
  assert.equal(saveSettings(unavailable,changed),false);
});
