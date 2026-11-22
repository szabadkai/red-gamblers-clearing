import {WOOD_TILE_SIZE as TILE} from './tiles.mjs';

const N = 1, E = 2, S = 4, W = 8;
const terrainGroup = r => r.group ?? r.material;
const materials = ['wood', 'house', 'cave', 'chapel', 'coping', 'ruin', 'cave-trim', 'chapel-trim',
  'oak-root', 'thorn-root', 'schist', 'cornice', 'mill-board', 'oak-board', 'quilt', 'rib', 'wood-trim', 'house-trim'];

// Keep the outside pixels at both ends. When a span isn't a multiple of a
// tile, shorten a middle tile. A piece narrower than one tile uses both tips.
function slices(length) {
  const count = Math.ceil(length / TILE);
  const pieces = [];
  let at = 0;
  function add(index, size, offset) {
    if (size > 0) pieces.push({index, at, size, offset});
    at += size;
  }
  for (let i = 0; i < count; i++) {
    if (count === 1 && length < TILE) {
      const half = Math.ceil(length / 2);
      add(i, half, 0);
      add(i, length-half, TILE-(length-half));
    } else {
      let size = TILE;
      if (count === 2) size = i === 0 ? Math.ceil(length/2) : Math.floor(length/2);
      else if (count > 2 && i === count-2) size = length-(count-1)*TILE;
      add(i, size, i === count-1 ? TILE-size : 0);
    }
  }
  return pieces;
}

function variant(col, row, seed) {
  // Disjoint pairs on adjacent squares guarantee no equal horizontal or
  // vertical neighbors. A coordinate hash selects within each pair.
  let n = Math.imul(col+seed, 1597334677) ^ Math.imul(row+17, 3812015801);
  n = Math.imul(n ^ (n >>> 16), 2246822507);
  return ((col + row + seed) & 1) | ((n >>> 17) & 2);
}

// End-to-end rectangles of the same material share a single tile lattice.
// Input and crop coordinates are native pixels. Geometry is never rescaled.
export function surfaceRuns(rects) {
  const rows = [...rects].sort((a,b) => a.material.localeCompare(b.material) ||
    terrainGroup(a).localeCompare(terrainGroup(b)) || a.y-b.y || a.h-b.h || a.x-b.x);
  const runs = [];
  for (const r of rows) {
    const prev = runs.at(-1);
    if (prev && prev.material === r.material && terrainGroup(prev) === terrainGroup(r) && prev.y === r.y && prev.h === r.h && r.x <= prev.x+prev.w) {
      prev.w = Math.max(prev.w, r.x+r.w-prev.x);
    } else runs.push({...r});
  }
  return runs;
}

function splitAt(parts, contacts) {
  const cuts = [...new Set(contacts)].sort((a,b) => a-b);
  if (!cuts.length) return parts;
  return parts.flatMap(p => {
    const end = p.at+p.size;
    const breaks = cuts.filter(c => c > p.at && c < end);
    let at = p.at;
    return [...breaks,end].map(next => {
      const part = {...p, at, size:next-at, offset:p.offset+at-p.at};
      at = next;
      return part;
    });
  });
}

export function surfaceTiles(r, neighbors = [], material = r.material) {
  if (!materials.includes(material)) throw new Error(`unknown autotile material: ${material}`);
  const group = terrainGroup(r);
  const touching = neighbors.filter(q => q !== r && terrainGroup(q) === group &&
    q.x <= r.x+r.w && q.x+q.w >= r.x && q.y <= r.y+r.h && q.y+q.h >= r.y);
  // A ledge can meet just part of a tile. Split the blit at that contact so
  // only the exposed portion receives the bevel, keeping its source offset.
  const xs = splitAt(slices(r.w), touching.flatMap(q => [q.x-r.x, q.x+q.w-r.x]));
  const ys = splitAt(slices(r.h), touching.flatMap(q => [q.y-r.y, q.y+q.h-r.y]));
  const lastCol = xs.at(-1)?.index, lastRow = ys.at(-1)?.index;
  const joinedAt = (x,y) => touching.some(q => x >= q.x && x < q.x+q.w && y >= q.y && y < q.y+q.h);
  const materialRow = materials.indexOf(material) * 4;
  const seed = materials.indexOf(r.material);
  const col = Math.floor(r.x/TILE), row = Math.floor(r.y/TILE);
  const tiles = [];
  for (const sy of ys) for (const sx of xs) {
    const x = r.x+sx.at, y = r.y+sy.at;
    const north = sy.index > 0 || joinedAt(x,r.y-1);
    const south = sy.index < lastRow || joinedAt(x,r.y+r.h);
    const west = sx.index > 0 || joinedAt(r.x-1,y);
    const east = sx.index < lastCol || joinedAt(r.x+r.w,y);
    const mask = (north ? N : 0) | (east ? E : 0) | (south ? S : 0) | (west ? W : 0);
    const v = variant(col+sx.index,row+sy.index,seed);
    tiles.push({x,y,w:sx.size,h:sy.size,sx:mask*TILE+sx.offset,sy:(materialRow+v)*TILE+sy.offset});
  }
  return tiles;
}

export function drawSurface(ctx, atlas, tiles) {
  for (const t of tiles) ctx.drawImage(atlas,t.sx,t.sy,t.w,t.h,t.x,t.y,t.w,t.h);
}
