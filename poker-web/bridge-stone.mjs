import {HIGH_ARCH, SMALL_ARCH, MILL_HIGH_ARCH, MILL_SMALL_ARCH, DETAILS, WALLS} from './bridge-arches.mjs';
import {surfaceTiles, drawSurface} from './autotile.mjs';
import {PIXEL} from './art.mjs';
import {WOOD_TILE_SIZE as TILE} from './tiles.mjs';

const WALL_HEIGHT = 7 * TILE;
const AIR = -1;
const atlasColumns = 8;
// Cropping an outside edge removes exactly the same source and destination pixels.
function stamp(ctx, atlas, id, x, y, width = TILE, height = TILE) {
  ctx.drawImage(atlas, id % atlasColumns * TILE, Math.floor(id / atlasColumns) * TILE,
    width, height, x, y, width, height);
}

function fill(ctx, atlas, x, y, w, h, pick) {
  for (let dy = 0; dy < h; dy += TILE) {
    for (let dx = 0; dx < w; dx += TILE) {
      stamp(ctx, atlas, pick(dx / TILE, dy / TILE), x + dx, y + dy,
        Math.min(TILE, w - dx), Math.min(TILE, h - dy));
    }
  }
}

// Adjacent wall tiles share an edge code. Bricks cross tile boundaries.
function hash(col, row, seed) {
  let n = Math.imul(col + seed, 1597334677) ^ Math.imul(row + 9, 3812015801);
  n = Math.imul(n ^ (n >>> 16), 2246822507);
  return (n ^ (n >>> 13)) >>> 0;
}
function wall(col, row, seed, columns) {
  const left = hash(col, row, seed), right = hash(col + 1, row, seed);
  const code = (col === 0 ? 0 : left & 1) * 4 + (col + 1 === columns ? 0 : right & 1) * 2 + ((col + row + seed) & 1);
  const wear = hash(Math.floor(col / 2), row, seed) % 5;
  const finish = wear === 0 ? 'chipped' : wear === 1 ? (row < 2 ? 'lichen' : 'damp') : 'cut';
  return WALLS[finish][code];
}

// Spend whole columns on complete round openings. Surplus stone goes into
// the piers. Alternating the two authored profiles changes both width and rise.
export function planBridge(w, seed) {
  let available = Math.floor(w / TILE) - 1;
  const profiles = [];
  const high = seed % 2 ? MILL_HIGH_ARCH : HIGH_ARCH;
  const small = seed % 2 ? MILL_SMALL_ARCH : SMALL_ARCH;
  let next = seed % 2 ? small : high;
  while (available >= SMALL_ARCH.rows[0].length + 1) {
    const profile = next.rows[0].length + 1 <= available ? next : small;
    profiles.push(profile);
    available -= profile.rows[0].length + 1;
    next = profile === high ? small : high;
  }
  const pierColumns = Math.floor(w / TILE) - profiles.reduce((sum, shape) => sum + shape.rows[0].length, 0);
  const piers = [], arches = [];
  let x = 0;
  for (let i = 0; i <= profiles.length; i++) {
    const before = Math.round(i * pierColumns / (profiles.length + 1));
    const after = Math.round((i + 1) * pierColumns / (profiles.length + 1));
    const width = i === profiles.length ? w - x : (after - before) * TILE;
    piers.push({x, width});
    x += width;
    if (i < profiles.length) {
      arches.push({x, profile: profiles[i]});
      x += profiles[i].rows[0].length * TILE;
    }
  }
  return {piers, arches};
}

const layouts = new WeakMap();
export function bridgeLayout(platform) {
  if (!layouts.has(platform)) layouts.set(platform, planBridge(Math.round(platform.w / PIXEL), platform.id + 1));
  return layouts.get(platform);
}

function arch(ctx, atlas, x, y, profile) {
  const width = profile.rows[0].length;
  profile.rows.forEach((row, j) => row.forEach((id, i) => {
    if (id !== AIR) stamp(ctx, atlas, id, x + i * TILE, y + j * TILE);
  }));
  for (let dy = profile.rows.length * TILE; dy < WALL_HEIGHT; dy += TILE) {
    stamp(ctx, atlas, profile.feet[0], x, y + dy);
    stamp(ctx, atlas, profile.feet[1], x + (width - 1) * TILE, y + dy);
  }
}

// Every motif is a small map of native cells. Even a cropped last column
// takes exactly one source pixel per destination pixel.
function detail(ctx, atlas, name, x, y, width) {
  const rows = DETAILS[name];
  for (const [j, row] of rows.entries()) {
    for (const [i, id] of row.entries()) {
      const dx = i * TILE;
      if (id !== AIR && dx < width) stamp(ctx, atlas, id, x + dx, y + j * TILE, Math.min(TILE, width - dx));
    }
  }
}

const parapets = [
  [[0, ['stump']], [.28, ['newel', 'rail0', 'rail1', 'rail2', 'farNewel', 'brokenRail']],
   [.80, ['brokenLeft', 'rail2', 'farNewel']]],
  [[.02, ['newel', 'rail1', 'brokenRail']], [.40, ['stump', 'timber', 'brace', 'timber', 'brace', 'stump']],
   [.83, ['brokenLeft', 'rail0', 'farNewel']]]
];
function parapet(ctx, atlas, x, y, w, style) {
  let end = 0;
  for (const [at, run] of parapets[style]) {
    let dx = Math.floor(w * at / TILE) * TILE;
    if (dx < end) continue;
    for (const name of run) {
      const rows = DETAILS[name];
      detail(ctx, atlas, name, x + dx, y - rows.length * TILE, w - dx);
      dx += rows[0].length * TILE;
    }
    end = dx;
  }
}

const plantings = [
  [[.03,'mossBank'], [.08,'longIvy'], [.40,'mossSeam'], [.49,'hangingMoss'],
   [.64,'mossLip'], [.79,'forkIvy'], [.83,'mossBank'], [.98,'hangingMoss']],
  [[.02,'mossLip'], [.19,'mossSeam'], [.28,'hangingMoss'], [.37,'forkIvy'],
   [.74,'mossBank'], [.88,'hangingMoss'], [.91,'longIvy']]
];

function finish(ctx, surface, area) {
  drawSurface(ctx, surface.atlas, surfaceTiles(area, surface.regions));
}

export function bridgeSpan(ctx, area, seed, atlas, surface, layout = planBridge(area.w, seed)) {
  const {x, y, w} = area;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const style = seed % 2;
  for (const {x: dx, width} of layout.piers) {
    const col = Math.floor(dx / TILE);
    const columns = Math.ceil(width / TILE);
    // Leave the outer stone faces to the silhouette tiles. Cropping the
    // masonry here lets stepped ends reveal the background all the way down.
    const left = dx === 0 ? Math.min(4,width) : 0;
    const right = dx+width === w ? Math.min(4,width-left) : 0;
    for (let j=0; j<WALL_HEIGHT/TILE; j++) for (let i=0; i<columns; i++) {
      const start = Math.max(i*TILE,left), end = Math.min((i+1)*TILE,width-right);
      if (end <= start) continue;
      const id = wall(i,j,seed+col,columns);
      ctx.drawImage(atlas,id%atlasColumns*TILE+start-i*TILE,Math.floor(id/atlasColumns)*TILE,
        end-start,TILE,x+dx+start,y+j*TILE,end-start,TILE);
    }
  }
  const pierFace = {...area, material:'ruin', h:WALL_HEIGHT};
  // Use the frame of the same connected masonry tile as the upper ledges.
  for (const t of surfaceTiles(pierFace,surface.regions)) {
    const leftSize = Math.max(0,Math.min(t.w, x+Math.min(w,4)-t.x));
    const rightStart = Math.max(leftSize, x+Math.max(0,w-4)-t.x, 0);
    if (leftSize) ctx.drawImage(surface.atlas,t.sx,t.sy,leftSize,t.h,t.x,t.y,leftSize,t.h);
    if (rightStart<t.w) ctx.drawImage(surface.atlas,t.sx+rightStart,t.sy,t.w-rightStart,t.h,
      t.x+rightStart,t.y,t.w-rightStart,t.h);
  }
  for (const {x: dx, profile} of layout.arches) arch(ctx, atlas, x + dx, y, profile);
  for (const [i, pier] of layout.piers.entries()) {
    if (pier.width < TILE) continue;
    const center = Math.floor(pier.x + pier.width / 2);
    fill(ctx, atlas, x + center - TILE / 2, y + 47, TILE, WALL_HEIGHT - 47,
      (_, row) => DETAILS[(row + i) % 2 ? 'shaftFoot' : 'shaft'][0][0]);
    const cap = Math.max(0, center - TILE);
    detail(ctx, atlas, i % 2 ? 'farImpost' : 'impost', x + cap, y + 42, w - cap);
  }
  parapet(ctx, atlas, x, y, w, style);
  finish(ctx, surface, area);
  if (layout.arches.length) {
    for (const [at, name] of plantings[style]) {
      const dx = Math.round(at * (w - DETAILS[name][0].length * TILE));
      detail(ctx, atlas, name, x + dx, y, w - dx);
    }
  }
  ctx.restore();
}

export function bridgeLedge(ctx, area, kind, seed, baseY, atlas, surface) {
  const {x, y, w} = area;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const cols = Math.ceil(w / TILE);
  if (kind === 'bank') {
    finish(ctx, surface, area);
  } else {
    if (kind !== 'lower' && w >= TILE) {
      const pier = Math.max(0, w - 25);
      fill(ctx, atlas, x + pier, y + 8, TILE, baseY - y - 8,
        (_, j) => DETAILS[j % 2 ? 'shaftFoot' : 'shaft'][0][0]);
      const capital = Math.max(0, pier - 8);
      detail(ctx, atlas, 'farImpost', x + capital, y + 13, w - capital);
    }
    finish(ctx, surface, area);
    const moss = seed % 3 === 0 ? 'mossBank' : 'mossSeam';
    const dx = hash(1, 0, seed) % Math.max(1, w - DETAILS[moss][0].length * TILE);
    detail(ctx, atlas, moss, x + dx, y, w - dx);
    if (kind === 'lower') {
      for (let col = 1; col < cols; col += 4) detail(ctx, atlas, 'corbel', x + col*TILE, y + 14, w - col*TILE);
    }
  }
  if (w >= 3*TILE && kind !== 'lower') {
    const plant = 1 + hash(1, 7, seed) % (Math.floor(w / TILE) - 1);
    const name = kind === 'bank' ? (seed % 2 ? 'sprig' : 'fern') : 'grass';
    detail(ctx, atlas, name, x + plant*TILE, y - TILE, w - plant*TILE);
  }
  ctx.restore();
}
