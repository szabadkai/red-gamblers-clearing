import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {platformsFor} from '../journey.mjs';
import {bridgeRegions} from '../bridge-art.mjs';
import {bridgeSpan, bridgeLedge, bridgeLayout, planBridge} from '../bridge-stone.mjs';
import {HIGH_ARCH, SMALL_ARCH, MILL_HIGH_ARCH, MILL_SMALL_ARCH} from '../bridge-arches.mjs';
import {WOOD_TILE_SIZE as TILE} from '../tiles.mjs';

const png = await readFile(new URL('../assets/bridge/stone-tiles.png', import.meta.url));
const atlas = {width: png.readUInt32BE(16), height: png.readUInt32BE(20)};

const edgePng = await readFile(new URL('../assets/environment/autotiles.png', import.meta.url));
const surface = {atlas:{width:edgePng.readUInt32BE(16),height:edgePng.readUInt32BE(20)}, regions:[]};

function record(platform, draw) {
  const stamps = [];
  const ctx = {
    save() {}, restore() {},
    drawImage(image, sx, sy, sw, sh, x, y, w, h) {
      assert.equal(this.imageSmoothingEnabled, false);
      assert.ok(image === atlas || image === surface.atlas);
      assert.deepEqual([sw, sh], [w, h], 'tile pixels must be copied 1:1');
      assert.ok([sx, sy, x, y, w, h].every(Number.isInteger));
      assert.ok(w > 0 && w <= TILE && h > 0 && h <= TILE);
      assert.equal(Math.floor(sx/TILE),Math.floor((sx+w-1)/TILE));
      assert.equal(Math.floor(sy/TILE),Math.floor((sy+h-1)/TILE));
      assert.ok(sx >= 0 && sx + w <= image.width && sy >= 0 && sy + h <= image.height);
      assert.ok(x >= platform.x && x + w <= platform.x + platform.w, 'stay inside the platform ends');
      stamps.push({image, sx, sy, x, y, w, h});
    }
  };
  draw(ctx);
  return stamps;
}

function checkDeck(platform, stamps, materialRow, joinsWest=false, joinsEast=false) {
  const deck = stamps.filter(s => s.image === surface.atlas && Math.floor(s.sy/(TILE*4)) === materialRow && s.y === platform.y);
  let edge = platform.x;
  for (const tile of deck) {
    assert.equal(tile.x, edge, 'walkable edge has neither gaps nor overlaps');
    edge += tile.w;
  }
  assert.equal(edge, platform.x + platform.w);
  const first=deck[0], last=deck.at(-1);
  assert.equal(Boolean(Math.floor(first.sx/TILE) & 8),joinsWest,'left end connects only where supported');
  assert.equal(Boolean(Math.floor(last.sx/TILE) & 2),joinsEast,'right end connects only where supported');
  if (platform.w>1) assert.equal(last.sx%TILE+last.w,TILE,'rightmost source tip survives a partial span');
}

const woodlandGround = 0, coping = 4, ruin = 5;

test('both crossings and their approaches render on Lantern Wood’s native terrain grid', () => {
  const regions = bridgeRegions(platformsFor(1));
  const landscape = {...surface, regions:[...regions.values()]};
  for (const [p,area] of regions) {
    if (p.kind === 'bridge') {
      const layout = bridgeLayout(p);
      const stamps = record(area, ctx => bridgeSpan(ctx, area, p.id + 1, atlas, landscape, layout));
      checkDeck(area, stamps, coping, true);
      for (const {x, profile} of layout.arches) {
        const underneath = area.x + x + profile.rows[0].length * TILE / 2;
        const feet = area.y + 50; // Lower passage
        assert.ok(!stamps.some(s => underneath >= s.x && underneath < s.x+s.w && feet >= s.y && feet < s.y+s.h));
      }
    } else {
      const stamps = record(area, ctx => bridgeLedge(ctx, area, p.kind, p.id, 280, atlas, landscape));
      const joinsDeck = p.kind === 'ruin' && landscape.regions.some(r =>
        r.material === 'coping' && r.y === area.y && r.x < area.x+area.w && r.x+r.w > area.x+area.w);
      checkDeck(area, stamps, p.ground ? woodlandGround : ruin, false, joinsDeck);
    }
  }
});

test('the two crossings alternate a high round opening and a smaller relief arch', () => {
  const [first, last] = platformsFor(1).filter(p => p.kind === 'bridge').map(bridgeLayout);
  assert.deepEqual(first.arches.map(a => a.profile), [HIGH_ARCH, SMALL_ARCH]);
  assert.deepEqual(last.arches.map(a => a.profile), [MILL_SMALL_ARCH, MILL_HIGH_ARCH]);
  for (const profile of [HIGH_ARCH, SMALL_ARCH, MILL_HIGH_ARCH, MILL_SMALL_ARCH]) {
    assert.ok(profile.rows.every(row => row.length === profile.rows[0].length));
    const diameter = profile.rows[0].length * TILE;
    // The array includes the small margin at the crown and the final spring tile.
    assert.ok(Math.abs(profile.rows.length * TILE - diameter / 2) <= TILE);
  }
});

test('short, long and partial spans fill their exact bounds without resizing any arch or tile', () => {
  for (const w of [1, 15, 16, 17, 79, 127, 143, 144, 159, 191, 311, 319, 328, 330, 347, 512, 731]) {
    const platform = {x:13, y:97, w, h:TILE, material:'coping', group:'stone'};
    const layout = planBridge(w, 17);
    const stamps = record(platform, ctx => bridgeSpan(ctx, platform, 17, atlas, surface, layout));
    checkDeck(platform, stamps, coping);
    const stone = layout.piers.reduce((sum, p) => sum + p.width, 0);
    assert.equal(stone + layout.arches.reduce((sum, a) => sum + a.profile.rows[0].length * TILE, 0), w);
  }
});
