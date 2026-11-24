import * as THREE from 'three';
import { flatPoly } from './shapes.js';
import { edgeBox } from './facade.js';
import { pointInPolygon } from '../world/geom.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const area = (pts) => { let a = 0; for (let i = 0; i < pts.length; i++) { const [x0, z0] = pts[i], [x1, z1] = pts[(i + 1) % pts.length]; a += x0 * z1 - x1 * z0; } return a / 2; };

/** Offset a ring by d metres toward the solid interior (negative d = outward). Mitred; rectilinear-friendly. */
export function offsetRing(pts, d, solidAt) {
  const n = pts.length, lines = [];
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1;
    let nx = dz / L, nz = -dx / L;
    const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
    if (!solidAt(mx + nx * 0.3, mz + nz * 0.3)) { nx = -nx; nz = -nz; }   // (nx,nz) now points into the solid
    lines.push({ px: a[0] + nx * d, pz: a[1] + nz * d, dx: dx / L, dz: dz / L });
  }
  const out = [];
  for (let i = 0; i < n; i++) {
    const A = lines[(i + n - 1) % n], B = lines[i];
    const den = A.dx * B.dz - A.dz * B.dx;
    if (Math.abs(den) < 1e-6) { out.push([B.px, B.pz]); continue; }
    const t = ((B.px - A.px) * B.dz - (B.pz - A.pz) * B.dx) / den;
    out.push([A.px + A.dx * t, A.pz + A.dz * t]);
  }
  return out;
}

/** Four-sided tile pyramid with metric UVs (for the tile texture). */
export function pyramidGeo(cx, cz, w, d, h, y) {
  const x0 = cx - w / 2, x1 = cx + w / 2, z0 = cz - d / 2, z1 = cz + d / 2;
  const A = [x0, y, z0], B = [x1, y, z0], C = [x1, y, z1], D = [x0, y, z1], T = [cx, y + h, cz];
  const sl = Math.hypot(w / 2, h);
  const tri = (p, q, r, uvs) => ({ p: [p, q, r], uv: uvs });
  const faces = [tri(A, B, T, [[0, 0], [w, 0], [w / 2, sl]]), tri(B, C, T, [[0, 0], [d, 0], [d / 2, sl]]), tri(C, D, T, [[0, 0], [w, 0], [w / 2, sl]]), tri(D, A, T, [[0, 0], [d, 0], [d / 2, sl]])];
  const pos = [], uv = [];
  for (const f of faces) for (let k = 0; k < 3; k++) { pos.push(...f.p[k]); uv.push(...f.uv[k]); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

/**
 * Green-tiled hip roof: sloped skirts around every ring (eave overhang -> inset line) plus a low flat
 * deck, and small square turrets with pyramid roofs at stepped corners (as in the photos).
 * Slope and run are stylized (not measured).
 */
export function buildHipRoof(ctx, poly, edges, solidAt, topY) {
  const { b, cfg } = ctx;
  const over = 0.6;
  let run = cfg.roofRun ?? 3.1, rise = cfg.roofRise ?? 1.55;
  const rings = [{ pts: poly.outer, hole: false }, ...poly.holes.map((h) => ({ pts: h, hole: true }))];
  const base = Math.abs(area(poly.outer));
  let insets = null;
  for (const r of [1, 0.78, 0.55, 0.38, 0.25, 0.15]) {
    const d = run * r;
    const cand = rings.map((rg) => offsetRing(rg.pts, d, solidAt));
    const okOuter = Math.abs(area(cand[0])) > base * 0.05 && Math.sign(area(cand[0])) === Math.sign(area(poly.outer)) && cand.every((c) => c.every((p) => Number.isFinite(p[0]) && Number.isFinite(p[1])));
    const okHoles = cand.slice(1).every((h) => h.every((p) => pointInPolygon(p[0], p[1], cand[0])));   // v0.7c: a court inset must stay inside the outer inset, otherwise the deck closes the court
    if (okOuter && okHoles) { insets = cand; run = d; rise = (cfg.roofRise ?? 1.55) * r; break; }
  }
  if (!insets) { run = 0.6; rise = 0.3; insets = rings.map((rg) => offsetRing(rg.pts, run, solidAt)); }
  const eaves = rings.map((rg) => offsetRing(rg.pts, -over, solidAt));
  const geos = [];
  rings.forEach((rg, ri) => {
    const E = eaves[ri], I = insets[ri], n = E.length;
    let s = 0;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const e0 = E[i], e1 = E[j], i0 = I[i], i1 = I[j];
      const len = Math.hypot(e1[0] - e0[0], e1[1] - e0[1]);
      const slope = Math.hypot(run + over, rise);
      const pos = [e0[0], topY, e0[1], e1[0], topY, e1[1], i1[0], topY + rise, i1[1], e0[0], topY, e0[1], i1[0], topY + rise, i1[1], i0[0], topY + rise, i0[1]];
      const uv = [s, 0, s + len, 0, s + len, slope, s, 0, s + len, slope, s, slope];
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.computeVertexNormals();
      geos.push(g);
      s += len;
    }
  });
  // deck
  const deck = flatPoly(insets[0], insets.slice(1), topY + rise);
  geos.push(deck);
  for (const g of geos) { const gg = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(gg.attributes)) if (!['position', 'normal', 'uv'].includes(k)) gg.deleteAttribute(k); ctx.tiles.push(gg); }

  // cornice / fascia under the eaves
  for (const e of edges) {
    if (e.party) continue;
    edgeBox(b, 'trim', e, 0, e.len, topY - 0.42, topY + 0.04, over - 0.05, 0.05);
    edgeBox(b, 'brick', e, 0, e.len, topY - 0.52, topY - 0.42, over - 0.15, 0.05);
  }

  // turrets with pyramid roofs at stepped corners and around courts
  if (cfg.turrets !== false) {
    const wallKey = cfg.wallMat || 'wall';
    const rings2 = rings;
    rings2.forEach((rg, ri) => {
      const A = area(rg.pts), n = rg.pts.length;
      for (let i = 0; i < n; i++) {
        const p0 = rg.pts[(i + n - 1) % n], p1 = rg.pts[i], p2 = rg.pts[(i + 1) % n];
        const d1 = [p1[0] - p0[0], p1[1] - p0[1]], d2 = [p2[0] - p1[0], p2[1] - p1[1]];
        const cr = d1[0] * d2[1] - d1[1] * d2[0];
        const L1 = Math.hypot(...d1), L2 = Math.hypot(...d2);
        if (L1 < 6 || L2 < 6) continue;
        const reflex = rg.hole ? false : cr * A < 0;      // stepped corners of the outer ring only
        if (!reflex) continue;
        const u1 = [d1[0] / L1, d1[1] / L1], u2 = [d2[0] / L2, d2[1] / L2];
        let bx = u2[0] - u1[0], bz = u2[1] - u1[1]; const bl = Math.hypot(bx, bz) || 1; bx /= bl; bz /= bl;
        let c = [p1[0] + bx * 3.4, p1[1] + bz * 3.4];
        if (!solidAt(c[0], c[1])) c = [p1[0] - bx * 3.4, p1[1] - bz * 3.4];
        if (!solidAt(c[0], c[1])) continue;
        const w = 4.6, y0 = topY + rise - 0.5, wh = 3.0;
        b.box(wallKey, c[0], y0 + wh / 2, c[1], w, wh, w);
        b.box('trim', c[0], y0 + wh + 0.05, c[1], w + 0.5, 0.2, w + 0.5);
        for (const [fx, fz, ry] of [[0, 1, 0], [0, -1, 0], [1, 0, Math.PI / 2], [-1, 0, Math.PI / 2]]) b.box('glass', c[0] + fx * (w / 2 + 0.02), y0 + 1.7, c[1] + fz * (w / 2 + 0.02), 0.9, 1.5, 0.06, ry);
        const g = pyramidGeo(c[0], c[1], w + 1.4, w + 1.4, 2.5, y0 + wh + 0.15);
        ctx.tiles.push(g);
      }
    });
  }
}
