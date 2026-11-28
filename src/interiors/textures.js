import * as THREE from 'three';
import { mulberry32 } from '../world/geom.js';

/**
 * Procedural canvas textures for the interior worlds. Every texture mimics a surface seen in the user's field photos
 * (glossy beige library tiles, zellige columns, speckled spray-plaster of the lecture halls, pine bench edges, blue curtains...).
 * `userData.tile` = size of one texture repeat in metres (the Kit maps UVs in world metres).
 */
function cv(w, h) {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  return ctx ? { c, ctx, w, h } : null;
}
function finish(o, tile, { repeat = true } = {}) {
  const t = new THREE.CanvasTexture(o.c);
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.userData.tile = tile;
  return t;
}
const rgb = (r, g, b, a = 1) => `rgba(${r | 0},${g | 0},${b | 0},${a})`;

function speckled(o, rng, base, specks, count, size = [0.6, 2.2]) {
  const { ctx, w, h } = o;
  ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < count; i++) {
    const s = specks[Math.floor(rng() * specks.length)];
    ctx.fillStyle = s;
    const x = rng() * w, y = rng() * h, r = size[0] + rng() * (size[1] - size[0]);
    for (const [ox, oy] of [[0, 0], [-w, 0], [w, 0], [0, -h], [0, h]]) {   // wrap around so the texture tiles seamlessly
      if (ox && !(x + ox > -r && x + ox < w + r)) continue;
      ctx.beginPath(); ctx.ellipse(x + ox, y + oy, r, r * (0.6 + rng() * 0.6), rng() * 3, 0, 6.3); ctx.fill();
    }
  }
}

export function makeInteriorTextures() {
  if (!cv(8, 8)) return null;
  const T = {};

  // ---- library floor: large glossy beige ceramic tiles, 0.8 m, with thin grout ---------------------------------------
  {
    const o = cv(512, 512), { ctx } = o, rng = mulberry32(11);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      const v = (rng() - 0.5) * 9;
      ctx.fillStyle = rgb(222 + v, 211 + v, 190 + v); ctx.fillRect(i * 256, j * 256, 256, 256);
      const g = ctx.createLinearGradient(i * 256, j * 256, i * 256 + 256, j * 256 + 256);
      g.addColorStop(0, 'rgba(255,255,255,0.10)'); g.addColorStop(1, 'rgba(120,100,70,0.06)');
      ctx.fillStyle = g; ctx.fillRect(i * 256, j * 256, 256, 256);
      for (let k = 0; k < 14; k++) {   // soft veins
        ctx.strokeStyle = rgb(170, 150, 120, 0.05 + rng() * 0.05); ctx.lineWidth = 1 + rng() * 3;
        ctx.beginPath(); let x = i * 256 + rng() * 256, y = j * 256 + rng() * 256; ctx.moveTo(x, y);
        for (let s = 0; s < 4; s++) { x += rng() * 90 - 45; y += rng() * 90 - 45; ctx.lineTo(x, y); } ctx.stroke();
      }
    }
    ctx.strokeStyle = 'rgba(176,164,140,0.95)'; ctx.lineWidth = 3;
    for (const p of [0, 256, 512]) { ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, 512); ctx.moveTo(0, p); ctx.lineTo(512, p); ctx.stroke(); }
    T.floorLib = finish(o, [1.6, 1.6]);
  }

  // ---- drop ceiling: 0.6 m mineral-fibre tiles -------------------------------------------------------------------------
  {
    const o = cv(256, 256), { ctx } = o, rng = mulberry32(12);
    ctx.fillStyle = '#f2f1ec'; ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2600; i++) { ctx.fillStyle = `rgba(150,148,140,${0.08 + rng() * 0.12})`; ctx.fillRect(rng() * 256, rng() * 256, 1 + rng() * 2, 1); }
    ctx.strokeStyle = 'rgba(150,150,145,0.9)'; ctx.lineWidth = 3;
    for (const p of [0, 128, 256]) { ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, 256); ctx.moveTo(0, p); ctx.lineTo(256, p); ctx.stroke(); }
    T.ceilTile = finish(o, [1.2, 1.2]);
  }

  // ---- zellige: eight-point stars in blue / teal / brown (library columns) ---------------------------------------------
  {
    const o = cv(512, 512), { ctx } = o, N = 8, C = 512 / N;
    const pal = ['#1d5b8a', '#27a095', '#7c4527', '#2b3f86', '#c8742f'];
    ctx.fillStyle = '#e9e1cd'; ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const cx = i * C + C / 2, cz = j * C + C / 2, c1 = pal[(i + j) % pal.length], c2 = pal[(i * 2 + j + 2) % pal.length];
      ctx.fillStyle = '#4a2f20'; ctx.fillRect(i * C, j * C, C, C);
      for (const [r, col] of [[C * 0.47, c1], [C * 0.3, '#f1ead6'], [C * 0.18, c2]]) {
        ctx.fillStyle = col;
        for (const a of [0, Math.PI / 4]) {
          ctx.save(); ctx.translate(cx, cz); ctx.rotate(a); ctx.fillRect(-r * 0.72, -r * 0.72, r * 1.44, r * 1.44); ctx.restore();
        }
      }
      ctx.strokeStyle = '#f3ecda'; ctx.lineWidth = 1.5; ctx.strokeRect(i * C + 0.75, j * C + 0.75, C - 1.5, C - 1.5);
    }
    T.zellige = finish(o, [1.0, 1.0]);
  }

  // ---- speckled grey/white spray plaster of the lecture halls ---------------------------------------------------------
  {
    const o = cv(512, 512), rng = mulberry32(13);
    speckled(o, rng, '#b7b6af', [rgb(95, 95, 92, 0.55), rgb(130, 130, 125, 0.45), rgb(248, 248, 244, 0.85), rgb(238, 236, 228, 0.8), rgb(160, 150, 130, 0.35)], 9000, [0.8, 3.6]);
    for (let i = 0; i < 30; i++) {   // larger darker splatters
      o.ctx.fillStyle = rgb(120, 120, 116, 0.07); o.ctx.beginPath(); o.ctx.ellipse(rng() * 512, rng() * 512, 14 + rng() * 40, 8 + rng() * 26, rng() * 3, 0, 6.3); o.ctx.fill();
    }
    T.speckle = finish(o, [1.4, 1.4]);
  }

  // ---- terrazzo floor (lecture hall stage / steps) ----------------------------------------------------------------------
  const terrazzo = (seed, base, chips, n) => { const o = cv(512, 512), rng = mulberry32(seed); speckled(o, rng, base, chips, n, [0.7, 3.2]); return o; };
  T.terrazzo = finish(terrazzo(14, '#c4c0b4', [rgb(90, 90, 88, 0.55), rgb(250, 250, 246, 0.8), rgb(140, 135, 120, 0.55), rgb(60, 60, 60, 0.4)], 5200), [2.0, 2.0]);
  T.tileGrey = finish(terrazzo(15, '#d3d1ca', [rgb(150, 150, 146, 0.4), rgb(255, 255, 255, 0.55), rgb(110, 110, 106, 0.3)], 3200), [2.0, 2.0]);
  {
    // light-grey speckled floor tiles of the computer lab, with grout every 0.4 m
    const o = terrazzo(16, '#d7d5ce', [rgb(150, 148, 142, 0.38), rgb(255, 255, 255, 0.5), rgb(105, 105, 100, 0.28)], 2400), { ctx } = o;
    ctx.strokeStyle = 'rgba(150,146,136,0.55)'; ctx.lineWidth = 2;
    for (let p = 0; p <= 512; p += 128) { ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, 512); ctx.moveTo(0, p); ctx.lineTo(512, p); ctx.stroke(); }
    T.labFloor = finish(o, [1.6, 1.6]);
  }

  // ---- pine bench edges (orange-brown, visible grain) -----------------------------------------------------------------
  {
    const o = cv(512, 128), { ctx } = o, rng = mulberry32(17);
    ctx.fillStyle = '#a9611f'; ctx.fillRect(0, 0, 512, 128);
    for (let i = 0; i < 90; i++) {
      const y = rng() * 128, dark = rng() < 0.6;
      ctx.strokeStyle = dark ? `rgba(90,40,10,${0.1 + rng() * 0.25})` : `rgba(230,160,80,${0.1 + rng() * 0.2})`; ctx.lineWidth = 0.6 + rng() * 2;
      ctx.beginPath(); ctx.moveTo(0, y); for (let x = 0; x <= 512; x += 64) ctx.lineTo(x, y + Math.sin(x * 0.02 + i) * 2 + (rng() - 0.5) * 2); ctx.stroke();
    }
    for (let i = 0; i < 5; i++) { ctx.fillStyle = 'rgba(70,30,5,0.35)'; ctx.beginPath(); ctx.ellipse(rng() * 512, 10 + rng() * 108, 5 + rng() * 6, 2.5 + rng() * 2, 0, 0, 6.3); ctx.fill(); }
    T.woodPine = finish(o, [2.0, 0.5]);
  }

  // ---- light laminate wood of the library / lab tables -----------------------------------------------------------------
  {
    const o = cv(256, 256), { ctx } = o, rng = mulberry32(18);
    ctx.fillStyle = '#dcae72'; ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 60; i++) { ctx.strokeStyle = `rgba(150,100,45,${0.05 + rng() * 0.1})`; ctx.lineWidth = 0.6 + rng() * 1.6; const y = rng() * 256; ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(80, y + (rng() - 0.5) * 8, 170, y + (rng() - 0.5) * 8, 256, y + (rng() - 0.5) * 3); ctx.stroke(); }
    T.woodLight = finish(o, [1.2, 1.2]);
  }

  // ---- rough grey concrete -----------------------------------------------------------------------------------------------
  {
    const o = cv(256, 256), rng = mulberry32(19);
    speckled(o, rng, '#a3a29c', [rgb(120, 120, 115, 0.3), rgb(205, 204, 198, 0.3), rgb(80, 80, 76, 0.18)], 4200, [0.6, 2.4]);
    T.concrete = finish(o, [1.5, 1.5]);
  }

  // ---- cream / beige painted walls with faint stains ------------------------------------------------------------------
  const paint = (seed, base, stain) => {
    const o = cv(256, 256), { ctx } = o, rng = mulberry32(seed);
    ctx.fillStyle = base; ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1800; i++) { ctx.fillStyle = `rgba(${stain},${0.02 + rng() * 0.05})`; ctx.fillRect(rng() * 256, rng() * 256, 1 + rng() * 3, 1 + rng() * 3); }
    for (let i = 0; i < 9; i++) { const g = ctx.createRadialGradient(0, 0, 1, 0, 0, 40 + rng() * 40); g.addColorStop(0, `rgba(${stain},0.06)`); g.addColorStop(1, `rgba(${stain},0)`); ctx.save(); ctx.translate(rng() * 256, rng() * 256); ctx.fillStyle = g; ctx.fillRect(-90, -90, 180, 180); ctx.restore(); }
    return o;
  };
  T.wallWhite = finish(paint(20, '#f1efea', '120,110,90'), [2.0, 2.0]);
  T.wallCream = finish(paint(21, '#e3d9bd', '130,110,70'), [2.0, 2.0]);
  T.wallYellow = finish(paint(22, '#e9dcab', '140,120,60'), [2.0, 2.0]);

  // ---- curtains: vertical pleats ----------------------------------------------------------------------------------------
  const curtain = (seed, base, lo, hi) => {
    const o = cv(256, 256), { ctx } = o, rng = mulberry32(seed);
    ctx.fillStyle = base; ctx.fillRect(0, 0, 256, 256);
    const folds = 8, w = 256 / folds;
    for (let f = 0; f < folds; f++) {
      const g = ctx.createLinearGradient(f * w, 0, (f + 1) * w, 0);
      g.addColorStop(0, lo); g.addColorStop(0.5, hi); g.addColorStop(1, lo);
      ctx.globalAlpha = 0.92; ctx.fillStyle = g; ctx.fillRect(f * w, 0, w, 256);
    }
    ctx.globalAlpha = 1;
    for (let i = 0; i < 500; i++) { ctx.fillStyle = `rgba(0,0,0,${rng() * 0.08})`; ctx.fillRect(rng() * 256, 0, 1, 256); }
    return o;
  };
  T.curtainBrown = finish(curtain(23, '#6a3b22', '#4a2916', '#a0693f'), [1.0, 1.0]);
  T.curtainBlue = finish(curtain(24, '#1c3fb0', '#0f2680', '#3b62e0'), [1.0, 1.0]);

  // ---- parquet / brown mashrabiya spare ------------------------------------------------------------------------------------
  return T;
}

// ---- one-off canvases (not tiled) ----------------------------------------------------------------------------------------

function single(o, w, h) {
  const t = new THREE.CanvasTexture(o.c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  t.userData.tile = [w, h];
  return t;
}

/** Whiteboard with handwritten C string functions, as seen on the board of room D04. */
export function whiteboardTexture(lines, { w = 1.9, h = 1.15, ink = '#2d4fb5', seed = 5 } = {}) {
  const o = cv(512, 310); if (!o) return null;
  const { ctx } = o, rng = mulberry32(seed);
  ctx.fillStyle = '#f4f4f1'; ctx.fillRect(0, 0, 512, 310);
  for (let i = 0; i < 900; i++) { ctx.fillStyle = `rgba(150,150,140,${rng() * 0.06})`; ctx.fillRect(rng() * 512, rng() * 310, 2 + rng() * 6, 1); }
  ctx.fillStyle = ink; ctx.font = 'italic 21px "Segoe Print","Comic Sans MS","Bradley Hand",cursive'; ctx.textBaseline = 'middle';
  lines.forEach((l, i) => { ctx.save(); ctx.translate(18, 28 + i * 34); ctx.rotate((rng() - 0.5) * 0.03); ctx.fillText(l, 0, 0); ctx.restore(); });
  // ghost marks of an old erased text
  for (let i = 0; i < 40; i++) { ctx.fillStyle = `rgba(120,130,170,${0.03 + rng() * 0.04})`; ctx.fillRect(rng() * 500, rng() * 300, 20 + rng() * 60, 6); }
  return single(o, w, h);
}

/** Interactive smart panel of room D04: launcher with five app icons over a live "classroom camera" view. */
export function smartPanelTexture() {
  const o = cv(512, 288); if (!o) return null;
  const { ctx } = o;
  const g = ctx.createLinearGradient(0, 0, 0, 288); g.addColorStop(0, '#dfe6ee'); g.addColorStop(1, '#a9b7c6');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 288);
  // room view: blue curtains + desks silhouette + four seated people
  ctx.fillStyle = '#2b4bc0'; ctx.fillRect(300, 40, 130, 100); ctx.fillStyle = '#c9b48d'; ctx.fillRect(0, 150, 512, 138);
  ctx.fillStyle = '#7a5a3a'; ctx.fillRect(20, 170, 470, 14);
  const cols = ['#9fb0c8', '#1b1b1f', '#6b5b4a', '#d9c9a8'];
  cols.forEach((c, i) => { const x = 120 + i * 78; ctx.fillStyle = c; ctx.fillRect(x, 150, 46, 90); ctx.fillStyle = '#d9b08c'; ctx.beginPath(); ctx.arc(x + 23, 138, 16, 0, 6.3); ctx.fill(); });
  const icons = ['#e8453c', '#2aa5ff', '#f2c230', '#33b36b', '#8a5cf0'];
  icons.forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.roundRect(110 + i * 62, 24, 38, 38, 9); ctx.fill(); });
  ctx.fillStyle = 'rgba(20,30,45,0.9)'; ctx.fillRect(6, 40, 16, 200);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'right'; ctx.fillText('09:02 AM', 500, 16);
  return single(o, 1.9, 1.07);
}

/** A projected lecture slide (hexagon diagram + bullet list), as on the screen of the lecture halls. */
export function slideTexture() {
  const o = cv(512, 320); if (!o) return null;
  const { ctx } = o;
  ctx.fillStyle = '#e4eefa'; ctx.fillRect(0, 0, 512, 320);
  ctx.fillStyle = '#f08a3c'; ctx.fillRect(14, 14, 120, 20);
  ctx.fillStyle = '#243a6b'; ctx.font = 'bold 15px sans-serif'; ctx.fillText('Le Module', 20, 30);
  const hex = (cx, cy, r, c) => { ctx.fillStyle = c; ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke(); };
  hex(74, 120, 34, '#4a7bd0'); hex(134, 120, 34, '#6aa0e8'); hex(104, 170, 34, '#2f5fb8'); hex(44, 170, 34, '#7fb2f0');
  ctx.fillStyle = '#2a3552'; for (let i = 0; i < 11; i++) ctx.fillRect(210, 52 + i * 22, 130 + ((i * 53) % 120), 7);
  ctx.fillStyle = '#f08a3c'; for (let i = 0; i < 11; i++) ctx.fillRect(192, 52 + i * 22, 8, 7);
  return single(o, 3.2, 2.0);
}

/** Pinned notice board: paper sheets of different sizes. */
export function noticeBoardTexture(seed = 3) {
  const o = cv(256, 192); if (!o) return null;
  const { ctx } = o, rng = mulberry32(seed);
  ctx.fillStyle = '#c9a56a'; ctx.fillRect(0, 0, 256, 192);
  ctx.fillStyle = '#b48d52'; ctx.fillRect(0, 0, 256, 6); ctx.fillRect(0, 186, 256, 6);
  for (let i = 0; i < 9; i++) {
    const x = 10 + rng() * 190, y = 10 + rng() * 130, w = 36 + rng() * 40, h = 36 + rng() * 40;
    ctx.fillStyle = ['#fafafa', '#fdf3c8', '#cfe6ff', '#ffd9d9'][Math.floor(rng() * 4)]; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(40,40,60,0.55)'; for (let k = 0; k < 6; k++) ctx.fillRect(x + 4, y + 6 + k * 6, w - 8 - rng() * 14, 2);
    ctx.fillStyle = '#d33'; ctx.beginPath(); ctx.arc(x + w / 2, y + 3, 2.2, 0, 6.3); ctx.fill();
  }
  return single(o, 1.3, 0.97);
}

/** Door / room plaque. */
export function plaqueTexture(text, { bg = '#1f6b3a', fg = '#f2f2ea', w = 0.8, h = 0.4 } = {}) {
  const o = cv(256, 128); if (!o) return null;
  const { ctx } = o;
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 256, 128); ctx.strokeStyle = fg; ctx.lineWidth = 6; ctx.strokeRect(6, 6, 244, 116);
  ctx.fillStyle = fg; ctx.font = 'bold 60px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 128, 68);
  return single(o, w, h);
}

/** Exit sign (green running man replaced by text, high contrast). */
export function exitSignTexture(text = 'SORTIE') {
  const o = cv(256, 96); if (!o) return null;
  const { ctx } = o;
  ctx.fillStyle = '#0f8a4a'; ctx.fillRect(0, 0, 256, 96); ctx.fillStyle = '#fff'; ctx.font = 'bold 44px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 128, 50);
  return single(o, 0.6, 0.22);
}

/** Sheet of grey dither used as soft blob shadow under furniture. */
export function blobTexture() {
  const o = cv(128, 128); if (!o) return null;
  const { ctx } = o;
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(0.6, 'rgba(0,0,0,0.25)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(o.c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
