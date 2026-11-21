import {WOOD_TILE_SIZE as TILE} from './tiles.mjs';
import {PIXEL} from './art.mjs';
import {bridgeLedge,bridgeSpan,bridgeLayout} from './bridge-stone.mjs';
// Huntsman's Bridge foreground. The chapel, oak and shrine use the concept atlas.
// Tiled stone arches and ledges sit on the collision surfaces in a two-world-unit pixel cache.
// Lamps, banners and water animate over the cache in bridge.mjs.
export const P = {
  mortar: '#1a1616', stone: ['#2c2828', '#433b3a', '#5a4f4c', '#6f625a', '#8a7c6e'],
  moss: ['#25562e', '#468232', '#75a743', '#a8ca58'], bark: ['#22161a', '#3c2827', '#5a3a31', '#7b5340', '#99704f'],
  ivy: ['#4e1220', '#8e1e2c', '#c8352f', '#e2584a'], warm: ['#7a3c18', '#d0782c', '#f3b052', '#ffe2a1'],
  red: ['#4a1621', '#7a2230', '#a83a3a'], cream: '#d9b98a', wood: ['#3a2620', '#5e3e2c', '#83603f']
};
const H = 280;              // cache height in pixels (560 world units)
export const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

export function painter(c) {
  const R = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); };
  const D = (x, y, col) => R(x, y, 1, 1, col);
  return { R, D };
}

// Staggered stone blocks: mortar, per-block tone, lit top/right edge, dark bottom, the odd missing block.
export function masonry(c, x0, y0, w, h, seed = 0) {
  const { R } = painter(c);
  c.save(); c.beginPath(); c.rect(x0, y0, w, h); c.clip();
  R(x0, y0, w, h, P.mortar);
  for (let row = 0, y = y0; y < y0 + h; row++, y += 7) {
    let x = x0 - (row % 2 ? 7 : 0) - Math.floor(hash(seed + row) * 5);
    for (let k = 0; x < x0 + w; k++) {
      const n = hash(seed * 31 + row * 17 + k * 7), bw = 9 + Math.floor(n * 7);
      if (n > .955) { R(x + 1, y + 1, bw - 1, 5, '#1f242b'); x += bw; continue; }
      const t = n < .3 ? 1 : n < .8 ? 2 : 3;
      R(x, y, bw - 1, 6, P.stone[t]);
      R(x, y, bw - 1, 1, P.stone[t + 1]); R(x + bw - 2, y + 1, 1, 4, P.stone[t + 1]);
      R(x, y + 5, bw - 1, 1, P.stone[t - 1]);
      if (n > .62 && n < .66) R(x + 3, y + 2, 2, 1, P.stone[t - 1]);
      x += bw;
    }
  }
  c.restore();
}
// Moss lip along a walkable edge, with drips and grass tufts.
export function mossTop(c, x0, y, w, seed = 0) {
  const { R, D } = painter(c);
  R(x0, y, w, 1, P.moss[3]); R(x0, y + 1, w, 2, P.moss[2]);
  for (let x = x0; x < x0 + w; x++) {
    const n = hash(seed + x * 3.1);
    if (n > .55) R(x, y + 3, 1, 1 + Math.floor(n * 4), n > .8 ? P.moss[1] : P.moss[0]);
    if (n < .12) { D(x, y - 1, P.moss[3]); if (n < .05) D(x, y - 2, P.moss[2]); }
  }
}
// Hanging red ivy: a thin stem with alternating leaves.
export function ivy(c, x, y, len, seed = 0) {
  const { R, D } = painter(c);
  for (let i = 0; i < len; i++) {
    const dx = Math.round(Math.sin(i * .35 + seed) * 1.5);
    D(x + dx, y + i, P.bark[1]);
    if (i % 3 === 1) {
      const s = (i / 3) % 2 ? 1 : -2, lx = x + dx + s;
      R(lx, y + i, 2, 2, P.ivy[1]); D(lx + (s > 0 ? 1 : 0), y + i, P.ivy[2]);
      if (hash(seed + i) > .6) D(lx + (s > 0 ? 2 : -1), y + i + 1, P.ivy[0]);
    }
  }
  R(x - 1, y + len, 3, 2, P.ivy[2]); D(x, y + len, P.ivy[3]);
}
// A cluster of leaves (canopy / ivy mats).
export function leaves(c, cx, cy, r, ramp, seed = 0) {
  const { D } = painter(c);
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
    const d = (x * x + y * y) / (r * r), n = hash(seed + x * 13.3 + y * 7.7);
    if (d > 1 || (d > .55 && n > .6)) continue;
    const lit = (x - y) / (2 * r) + (n - .5) * .5;
    D(cx + x, cy + y, lit > .35 ? ramp[3] : lit > 0 ? ramp[2] : lit > -.35 ? ramp[1] : ramp[0]);
  }
}
export function mushroom(c, x, y) {
  const { R, D } = painter(c);
  R(x, y - 3, 1, 3, P.cream); R(x - 2, y - 5, 5, 2, P.ivy[2]); D(x - 1, y - 5, P.ivy[3]); D(x + 1, y - 4, P.cream);
}

// Source-to-world scales for the atlas scenery and the separate mossy bough.
const S = .55;
const PIECES = { tower: [24, 30, 550, 590, 575], oak: [620, 20, 640, 600, 583], shrine: [640, 740, 610, 410, 396] };
function piece(c, img, name, x, y, flip = false) {
  const [sx, sy, sw, sh] = PIECES[name], w = sw * S / 2, h = sh * S / 2;
  c.save(); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
  if (flip) { c.translate(Math.round(x / 2 + w), 0); c.scale(-1, 1); c.drawImage(img, sx, sy, sw, sh, 0, Math.round(y / 2), w, h); }
  else c.drawImage(img, sx, sy, sw, sh, Math.round(x / 2), Math.round(y / 2), w, h);
  c.restore();
}
// Place the painted ground line at world y.
const seat = (name, y) => y - PIECES[name][4] * S;
// Mossy bough cut from the long concept log at its own scale: ivy tip at each end, mossy middle.
function boughPiece(c, img, x, y, w, seed) {
  const X = Math.round(x / PIXEL), Y = Math.round((y - 3) / PIXEL), W = Math.round(w / PIXEL);
  const tip = Math.min(27, Math.floor(W / 2));
  const middleWidth = W - tip * 2;
  const start = 39 + Math.floor(hash(seed) * 90);
  c.save(); c.imageSmoothingEnabled = false;
  // Tile the body if the span grows beyond the strip. All slices stay 1:1.
  for (let dx = 0; dx < middleWidth;) {
    const width = Math.min(middleWidth - dx, img.width - start);
    c.drawImage(img, start, 0, width, img.height, X + tip + dx, Y, width, img.height);
    dx += width;
  }
  c.drawImage(img, 2, 0, tip, img.height, X, Y, tip, img.height);
  c.translate(X + W, 0); c.scale(-1, 1);
  c.drawImage(img, 2, 0, tip, img.height, 0, Y, tip, img.height);
  c.restore();
}
// Hard silhouettes on reduced concept pieces. Keep native terrain colors intact.
function crisp(c) {
  const d = c.getImageData(0, 0, c.canvas.width, c.canvas.height), p = d.data;
  for (let i = 0; i < p.length; i += 4) {
    if (p[i + 3] < 140) { p[i + 3] = 0; continue; }
    p[i + 3] = 255;
  }
  c.putImageData(d, 0, 0);
}

const OAKS = [[915, false], [1715, true], [2360, false], [3375, false], [4055, true], [4770, false]];
const cache = new WeakMap();
export function bridgeRegions(platforms) {
  const regions = new Map();
  for (const p of platforms) {
    if (p.kind === 'branch' || p.kind === 'root') continue;
    const x = Math.round(p.x/PIXEL), y = Math.round(p.y/PIXEL);
    const material = p.ground ? 'wood' : p.kind === 'bridge' ? 'coping' : 'ruin';
    regions.set(p, {x, y, w:Math.round((p.x+p.w)/PIXEL)-x, h:p.ground ? H-y : TILE,
      material, group:p.ground ? 'wood' : 'stone'});
  }
  return regions;
}

function render(platforms, images) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(...platforms.map(p => p.x + p.w)) / PIXEL; canvas.height = H;
  const c = canvas.getContext('2d');
  const atlas = images.get('concept-bridge-atlas-v1'), log = images.get('bridge-bough');
  const regions = bridgeRegions(platforms);
  const surface = {atlas:images.get('autotiles'), regions:[...regions.values()]};
  if (atlas) {
    for (const [x, flip] of OAKS) piece(c, atlas, 'oak', flip ? x - 352 + 253 : x - 253, seat('oak', 420), flip);
    piece(c, atlas, 'tower', -40, seat('tower', 420));
    piece(c, atlas, 'shrine', 4375, seat('shrine', 420));
  }
  const tiles = images.get('bridge-tiles');
  const spans = platforms.filter(p => p.kind === 'bridge');
  for (const p of platforms) {
    if (['bridge', 'branch', 'root'].includes(p.kind)) continue;
    const pier = p.x + p.w - 34;
    const support = spans.find(span => span.x <= pier && pier < span.x + span.w && p.y < span.y);
    const baseY = p.ground ? H : Math.round((support?.y ?? 420) / PIXEL);
    bridgeLedge(c, regions.get(p), p.ground ? 'bank' : p.kind, p.id * 137 + 17, baseY, tiles, surface);
  }
  for (const p of spans) bridgeSpan(c, regions.get(p), p.id + 1, tiles, surface, bridgeLayout(p));
  for (const p of platforms) {
    if ((p.kind === 'branch' || p.kind === 'root') && log) {
      // boughs near an oak grow out of its trunk instead of floating beside it
      let x0 = p.x, x1 = p.x + p.w;
      for (const [t] of OAKS) { if (t > x1 && t - x1 < 260) x1 = t - 30; if (t < x0 && x0 - t < 260) x0 = t + 30; }
      boughPiece(c, log, x0, p.y, x1 - x0, p.id * 7);
    }
  }
  crisp(c);
  return canvas;
}

export function drawBridgePixels(c, platforms, images) {
  let art = cache.get(platforms);
  if (!art) { art = render(platforms, images); cache.set(platforms, art); }
  c.save(); c.imageSmoothingEnabled = false; c.drawImage(art, 0, 0, art.width * PIXEL, H * PIXEL); c.restore();
}
