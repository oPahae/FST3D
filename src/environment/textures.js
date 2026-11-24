import * as THREE from 'three';

let cache;
function canvas(w, h) {
  if (typeof document === 'undefined' || !document.createElement) return null;
  const c = document.createElement('canvas');
  if (!c.getContext) return null;
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  return ctx ? { c, ctx } : null;
}
function noise(ctx, w, h, base, amp, n) {
  ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) {
    const v = (Math.random() - 0.5) * amp;
    ctx.fillStyle = `rgba(${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${Math.abs(v) / 255})`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 1 + Math.random() * 3);
  }
}
function tex(c, repeat) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) t.repeat.set(repeat, repeat);
  return t;
}

/** Procedural tiling textures. Returns null outside a browser (Node smoke tests). */
export function getTextures() {
  if (cache !== undefined) return cache;
  const a = canvas(256, 256);
  if (!a) return (cache = null);
  const out = {};

  noise(a.ctx, 256, 256, '#e9e4d8', 40, 5000);
  out.stucco = tex(a.c);

  const r = canvas(256, 256);
  noise(r.ctx, 256, 256, '#d2b68a', 36, 4000);
  out.roof = tex(r.c);

  const p = canvas(256, 256);          // paving: 4 x 4 tiles with grout
  p.ctx.fillStyle = '#d9cfb6'; p.ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 4000; i++) { p.ctx.fillStyle = `rgba(120,100,70,${Math.random() * 0.06})`; p.ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); }
  p.ctx.strokeStyle = 'rgba(110,95,70,0.55)'; p.ctx.lineWidth = 2;
  for (let i = 0; i <= 4; i++) { p.ctx.beginPath(); p.ctx.moveTo(i * 64, 0); p.ctx.lineTo(i * 64, 256); p.ctx.moveTo(0, i * 64); p.ctx.lineTo(256, i * 64); p.ctx.stroke(); }
  out.paving = tex(p.c, 1 / 3);

  // wild, slightly unkempt lawn (field photos: uneven grass with darker and drier patches, never a clean carpet)
  const g = canvas(256, 256);
  noise(g.ctx, 256, 256, '#6c8f45', 50, 9000);
  for (let i = 0; i < 60; i++) { g.ctx.fillStyle = `rgba(${i % 3 ? '52,92,36' : '150,140,80'},${0.04 + Math.random() * 0.05})`; g.ctx.beginPath(); g.ctx.ellipse(Math.random() * 256, Math.random() * 256, 10 + Math.random() * 40, 6 + Math.random() * 20, Math.random() * 3, 0, 6.3); g.ctx.fill(); }
  for (let i = 0; i < 1800; i++) { g.ctx.strokeStyle = `rgba(${i % 4 ? '90,130,55' : '160,150,90'},0.45)`; g.ctx.lineWidth = 1; const x = Math.random() * 256, y = Math.random() * 256; g.ctx.beginPath(); g.ctx.moveTo(x, y); g.ctx.lineTo(x + Math.random() * 3 - 1.5, y - 3 - Math.random() * 4); g.ctx.stroke(); }
  out.grass = tex(g.c, 1 / 5);

  const s = canvas(256, 256);
  noise(s.ctx, 256, 256, '#6b6f75', 44, 7000);
  out.asphalt = tex(s.c, 1 / 5);

  // open ground between the buildings: rough grass over dry soil (the satellite sand colour is only the dry patches)
  const d = canvas(256, 256);
  noise(d.ctx, 256, 256, '#7d8f4c', 40, 7000);
  for (let i = 0; i < 50; i++) { d.ctx.fillStyle = `rgba(${i % 3 ? '62,98,40' : '150,128,84'},${0.04 + Math.random() * 0.06})`; d.ctx.beginPath(); d.ctx.ellipse(Math.random() * 256, Math.random() * 256, 12 + Math.random() * 44, 6 + Math.random() * 22, Math.random() * 3, 0, 6.3); d.ctx.fill(); }
  for (let i = 0; i < 1200; i++) { d.ctx.strokeStyle = `rgba(${i % 5 ? '100,140,60' : '170,150,95'},0.4)`; const x = Math.random() * 256, y = Math.random() * 256; d.ctx.beginPath(); d.ctx.moveTo(x, y); d.ctx.lineTo(x + Math.random() * 3 - 1.5, y - 4); d.ctx.stroke(); }
  out.ground = tex(d.c, 1 / 7);

  // weathered grey concrete slabs with cracks and stains (garden paths in every field photo)
  const sl = canvas(256, 256);
  noise(sl.ctx, 256, 256, '#a9a59b', 34, 7000);
  for (let i = 0; i < 26; i++) { sl.ctx.fillStyle = `rgba(90,80,60,${0.05 + Math.random() * 0.07})`; sl.ctx.beginPath(); sl.ctx.arc(Math.random() * 256, Math.random() * 256, 8 + Math.random() * 24, 0, 6.3); sl.ctx.fill(); }
  sl.ctx.strokeStyle = 'rgba(70,66,58,0.7)'; sl.ctx.lineWidth = 2;
  for (const y of [0, 128]) { sl.ctx.beginPath(); sl.ctx.moveTo(0, y); sl.ctx.lineTo(256, y); sl.ctx.stroke(); }
  for (const [x, y0] of [[64, 0], [192, 128]]) { sl.ctx.beginPath(); sl.ctx.moveTo(x, y0); sl.ctx.lineTo(x, y0 + 128); sl.ctx.stroke(); }
  sl.ctx.strokeStyle = 'rgba(60,56,50,0.45)'; sl.ctx.lineWidth = 1;
  for (let i = 0; i < 7; i++) { let x = Math.random() * 256, y = Math.random() * 256; sl.ctx.beginPath(); sl.ctx.moveTo(x, y); for (let k = 0; k < 6; k++) { x += Math.random() * 18 - 9; y += Math.random() * 16; sl.ctx.lineTo(x, y); } sl.ctx.stroke(); }
  out.slab = tex(sl.c, 1 / 4);

  // large dark slate-grey slabs (approach to the connector gates, photo "East connector")
  const st = canvas(256, 256);
  noise(st.ctx, 256, 256, '#555b63', 30, 6000);
  st.ctx.strokeStyle = 'rgba(150,150,145,0.55)'; st.ctx.lineWidth = 3;
  for (let i = 0; i <= 2; i++) { st.ctx.beginPath(); st.ctx.moveTo(i * 128, 0); st.ctx.lineTo(i * 128, 256); st.ctx.moveTo(0, i * 128); st.ctx.lineTo(256, i * 128); st.ctx.stroke(); }
  out.slate = tex(st.c, 1 / 3.6);

  // rounded, leafy hedge surface
  const hd = canvas(128, 128);
  noise(hd.ctx, 128, 128, '#3c7231', 60, 3000);
  for (let i = 0; i < 260; i++) { hd.ctx.fillStyle = `rgba(${i % 3 ? '96,150,60' : '24,60,26'},0.45)`; hd.ctx.beginPath(); hd.ctx.arc(Math.random() * 128, Math.random() * 128, 2 + Math.random() * 4, 0, 6.3); hd.ctx.fill(); }
  out.hedgeLeaf = tex(hd.c, 1);

  const t = canvas(256, 256);          // green glazed roof tiles: courses with a lighter edge, staggered joints
  t.ctx.fillStyle = '#1f7d57'; t.ctx.fillRect(0, 0, 256, 256);
  for (let r = 0; r < 8; r++) {
    const y = r * 32;
    t.ctx.fillStyle = r % 2 ? '#1b7350' : '#23865f'; t.ctx.fillRect(0, y, 256, 30);
    t.ctx.fillStyle = 'rgba(8,50,34,0.55)'; t.ctx.fillRect(0, y + 30, 256, 2);
    for (let x = (r % 2) * 16; x < 256; x += 32) { t.ctx.fillStyle = 'rgba(8,50,34,0.35)'; t.ctx.fillRect(x, y, 1.5, 30); }
  }
  for (let i = 0; i < 2500; i++) { t.ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`; t.ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); }
  out.tile = tex(t.c, 1 / 2);
  out.tileTeal = tileTexture(['#2c8f8c', '#27857f', '#33998f']);   // IT Learning campus: blue-green glazed tiles (field photos)

  // --- floors seen in the field photos ---------------------------------------------------------------
  // chevron / herringbone: black + cream bands (Administration gallery, Central Pavilion gallery, wing galleries)
  const cv = canvas(256, 256);
  cv.ctx.fillStyle = '#e6dbc2'; cv.ctx.fillRect(0, 0, 256, 256);
  for (let r = 0; r < 8; r++) {
    const y0 = r * 32;
    cv.ctx.strokeStyle = r % 4 === 3 ? '#8a5a3c' : '#2a2a2e'; cv.ctx.lineWidth = 11;
    cv.ctx.beginPath();
    for (let x = 0; x <= 256; x += 32) { const y = y0 + (((x / 32) | 0) % 2 ? 6 : 26); if (x === 0) cv.ctx.moveTo(x, y); else cv.ctx.lineTo(x, y); }
    cv.ctx.stroke();
  }
  out.chevron = tex(cv.c, 1 / 1.8);

  // checkerboard of rectangular pavers, dark blue-grey / cream (inner courts, patios, plazas)
  const ck = canvas(256, 256);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    const dark = (i + j) % 2 === 0, vert = (i + j) % 2 === 1;
    ck.ctx.fillStyle = dark ? '#56606c' : '#e4dcc6'; ck.ctx.fillRect(i * 64, j * 64, 64, 64);
    ck.ctx.fillStyle = dark ? '#3f4852' : '#c9bfa5';
    for (let k = 1; k < 4; k++) { if (vert) ck.ctx.fillRect(i * 64 + k * 16 - 1, j * 64, 2, 64); else ck.ctx.fillRect(i * 64, j * 64 + k * 16 - 1, 64, 2); }
  }
  out.checker = tex(ck.c, 1 / 3.2);
  out.checker.center.set(0.5, 0.5); out.checker.rotation = Math.PI / 4;   // field photos: the pavers run on the diagonal

  // diagonal checkerboard of blue-grey slabs and light grooved slabs (plazas in front of the buildings, connector gates)
  const dg = canvas(256, 256);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    const dark = (i + j) % 2 === 0;
    dg.ctx.fillStyle = dark ? '#6b7683' : '#d9d5c6'; dg.ctx.fillRect(i * 64, j * 64, 64, 64);
    if (dark) { for (let k = 0; k < 220; k++) { dg.ctx.fillStyle = `rgba(${k % 2 ? '255,255,255' : '20,28,40'},0.07)`; dg.ctx.fillRect(i * 64 + Math.random() * 62, j * 64 + Math.random() * 62, 2, 2); } }
    else { dg.ctx.fillStyle = '#b9b4a4'; for (let k = 1; k < 5; k++) dg.ctx.fillRect(i * 64 + 2, j * 64 + k * 12 - 1, 60, 2); }
    dg.ctx.strokeStyle = 'rgba(60,62,66,0.55)'; dg.ctx.lineWidth = 1.5; dg.ctx.strokeRect(i * 64, j * 64, 64, 64);
  }
  out.diag = tex(dg.c, 1 / 2.6);
  out.diag.center.set(0.5, 0.5); out.diag.rotation = Math.PI / 4;

  // herringbone of small blue-grey bricks (gallery of the connectors, photo "Passages")
  const hb = canvas(256, 256);
  hb.ctx.fillStyle = '#2f3944'; hb.ctx.fillRect(0, 0, 256, 256);
  for (let r = 0; r < 16; r++) for (let c = 0; c < 8; c++) {
    const x = c * 32, y = r * 16, up = (c + r) % 2;
    hb.ctx.fillStyle = `hsl(212,${10 + ((r * 7 + c * 5) % 8)}%,${34 + ((r * 5 + c * 9) % 10)}%)`;
    hb.ctx.beginPath(); if (up) { hb.ctx.moveTo(x, y + 14); hb.ctx.lineTo(x + 16, y); hb.ctx.lineTo(x + 30, y); hb.ctx.lineTo(x + 14, y + 14); } else { hb.ctx.moveTo(x, y); hb.ctx.lineTo(x + 16, y + 14); hb.ctx.lineTo(x + 30, y + 14); hb.ctx.lineTo(x + 14, y); }
    hb.ctx.closePath(); hb.ctx.fill();
  }
  out.herring = tex(hb.c, 1 / 2);

  // red-brown pavers (sidewalks along the boulevards)
  const bp = canvas(256, 256);
  bp.ctx.fillStyle = '#b3735a'; bp.ctx.fillRect(0, 0, 256, 256);
  for (let r = 0; r < 8; r++) for (let c = 0; c < 4; c++) {
    const x = c * 64 + (r % 2) * 32, y = r * 32;
    bp.ctx.fillStyle = `hsl(${12 + ((r * 7 + c * 13) % 9)},38%,${50 + ((r * 5 + c * 11) % 8)}%)`;
    bp.ctx.fillRect(x + 1.5, y + 1.5, 61, 29);
  }
  out.brickPave = tex(bp.c, 1 / 2.4);

  // artificial turf with mowing stripes (mini football pitch)
  const tf = canvas(256, 256);
  noise(tf.ctx, 256, 256, '#2f7a3b', 40, 6000);
  for (let i = 0; i < 4; i += 2) { tf.ctx.fillStyle = 'rgba(0,0,0,0.07)'; tf.ctx.fillRect(0, i * 64, 256, 64); }
  out.turf = tex(tf.c, 1 / 8);

  // white perforated screen: dense interlaced star-and-cross lattice (photos of the red-clad buildings), cut-outs show the dark wall behind
  const ms = canvas(128, 128);
  ms.ctx.fillStyle = '#f2f0ea'; ms.ctx.fillRect(0, 0, 128, 128);
  ms.ctx.globalCompositeOperation = 'destination-out';
  const star = (cx, cy, R, r, n) => { ms.ctx.beginPath(); for (let k = 0; k < n * 2; k++) { const a = (k / (n * 2)) * Math.PI * 2 - Math.PI / 2, rr = k % 2 ? r : R; ms.ctx[k ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } ms.ctx.closePath(); ms.ctx.fill(); };
  for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) { star(i * 32, j * 32, 13.5, 7, 8); star(i * 32 + 16, j * 32 + 16, 6, 3, 4); }
  ms.ctx.globalCompositeOperation = 'source-over';
  const mt = tex(ms.c); mt.repeat.set(1, 1); out.mashrabiya = mt;
  return (cache = out);
}

function tileTexture(cols) {
  const t = canvas(256, 256);
  t.ctx.fillStyle = cols[0]; t.ctx.fillRect(0, 0, 256, 256);
  for (let r = 0; r < 8; r++) {
    const y = r * 32;
    t.ctx.fillStyle = r % 2 ? cols[1] : cols[2]; t.ctx.fillRect(0, y, 256, 30);
    t.ctx.fillStyle = 'rgba(8,40,40,0.55)'; t.ctx.fillRect(0, y + 30, 256, 2);
    for (let x = (r % 2) * 16; x < 256; x += 32) { t.ctx.fillStyle = 'rgba(8,40,40,0.35)'; t.ctx.fillRect(x, y, 1.5, 30); }
  }
  return tex(t.c, 1 / 2);
}
