import test from 'node:test';
import assert from 'node:assert/strict';
import {surfaceRuns, surfaceTiles} from '../autotile.mjs';
import {WOOD_TILE_SIZE as TILE} from '../tiles.mjs';

const rect = (x,y,w,h,material='wood') => ({x,y,w,h,material});
const mask = tile => Math.floor(tile.sx/TILE);
const variant = tile => Math.floor(tile.sy/TILE)%4;

test('cardinal neighbors select the four corners, edges, center and isolated tile', () => {
  const tiles = surfaceTiles(rect(0,0,48,48));
  assert.deepEqual(tiles.map(mask),[6,14,12,7,15,13,3,11,9]);
  assert.equal(mask(surfaceTiles(rect(0,0,16,16))[0]),0);
  assert.throws(() => surfaceTiles(rect(0,0,16,16,'stone')), /unknown autotile material/);
});

test('adjoining and overlapping runs join only compatible surfaces', () => {
  const a=rect(3,6,34,16), b=rect(35,6,18,16), c=rect(53,6,20,16), gap=rect(74,6,7,16);
  assert.deepEqual(surfaceRuns([gap,b,c,a]),[rect(3,6,70,16),gap]);
  const deck={...rect(24,6,48,16,'coping'),group:'stone'};
  const ledge={...rect(0,6,32,16,'ruin'),group:'stone'};
  assert.ok(mask(surfaceTiles(deck,[ledge])[0])&8);
  assert.ok(mask(surfaceTiles(ledge,[deck]).at(-1))&2);
  assert.equal(mask(surfaceTiles(deck,[{...ledge,group:'wood'}])[0])&8,0);
  assert.equal(mask(surfaceTiles(deck,[{...ledge,w:23}])[0])&8,0);
});

test('a partial side contact only joins the covered native pixels', () => {
  const block=rect(0,0,16,16), joining=rect(16,3,32,6);
  const tiles=surfaceTiles(block,[joining]);
  assert.deepEqual(tiles.map(t=>[t.y,t.h,mask(t)]),[[0,3,0],[3,6,2],[9,7,0]]);
  const upper=rect(4,-16,8,16);
  assert.deepEqual(surfaceTiles(block,[upper]).map(t=>[t.x,t.w,mask(t)]),[[0,4,0],[4,8,1],[12,4,0]]);
});

test('partial and short platforms preserve both tips, area and original source pixels', () => {
  for (let w=1; w<=65; w++) for (const h of [1,3,12,16,19,33]) {
    const area=rect(7,19,w,h), occupied=new Uint8Array(w*h), tiles=surfaceTiles(area);
    for (const t of tiles) {
      assert.ok(t.sx%TILE+t.w<=TILE && t.sy%TILE+t.h<=TILE);
      if (t.x===area.x) assert.equal(t.sx%TILE,0);
      if (t.x+t.w===area.x+w && w>1) assert.equal(t.sx%TILE+t.w,TILE);
      if (t.y===area.y) assert.equal(t.sy%TILE,0);
      if (t.y+t.h===area.y+h && h>1) assert.equal(t.sy%TILE+t.h,TILE);
      for (let y=0; y<t.h; y++) for (let x=0; x<t.w; x++)
        occupied[(t.y-area.y+y)*w+t.x-area.x+x]++;
    }
    assert.ok(occupied.every(n=>n===1));
  }
});

test('variant selection is stable and adjacent cells draw different alternatives', () => {
  const r=rect(25,17,32*TILE,8*TILE), tiles=surfaceTiles(r);
  assert.deepEqual(surfaceTiles(r),tiles);
  assert.equal(new Set(tiles.map(variant)).size,4);
  for (let i=0; i<tiles.length; i++) {
    if (i%32) assert.notEqual(variant(tiles[i]),variant(tiles[i-1]));
    if (i>=32) assert.notEqual(variant(tiles[i]),variant(tiles[i-32]));
  }
});
