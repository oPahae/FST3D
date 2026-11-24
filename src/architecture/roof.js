import * as THREE from 'three';
import { U } from './units.js';
import { extrudePoly } from './shapes.js';
import { edgeBox } from './facade.js';
import { buildHipRoof, pyramidGeo } from './roofHip.js';
import { pointInPolygon } from '../world/geom.js';

const signedArea = (pts) => { let a = 0; for (let i = 0; i < pts.length; i++) { const [x0, z0] = pts[i], [x1, z1] = pts[(i + 1) % pts.length]; a += x0 * z1 - x1 * z0; } return a / 2; };

/** Flat roof slab + parapets + coping + turquoise tile squares at stepped corners + layout roof features. */
export function buildRoof(ctx, poly, edges, solidAt, topY, features = []) {
  const { b, cfg } = ctx;
  // slab
  const slab = extrudePoly(poly.outer, poly.holes, U.slab);
  slab.translate(0, topY - U.slab, 0);
  b.addGeometry(cfg.roofMat || 'roof', slab);

  if (cfg.roofStyle === 'hip') {
    buildHipRoof(ctx, poly, edges, solidAt, topY);
    for (const f of features) if (f.type === 'teal_pyramid') tilePyramid(ctx, f.polygon, topY);
    return;
  }

  // parapet + coping (turquoise on court / garden edges where the config says so)
  for (const e of edges) {
    if (e.party) continue;
    const S = e.style || {};
    const par = S.parapet ?? cfg.parapet ?? U.parapet;
    if (par > 0) edgeBox(b, S.parapetMat || 'wall', e, 0, e.len, topY, topY + par, 0.0, 0.28);
    const cop = S.coping ?? 'trim';
    if (cop !== 'none') edgeBox(b, cop === 'turq' ? 'turq' : 'trim', e, 0, e.len, topY + par, topY + par + 0.12, 0.07, 0.36);
  }

  // turquoise tile squares at stepped corners and court corners (visible in the model photos)
  if (cfg.cornerTiles !== false) {
    const rings = [{ pts: poly.outer, hole: false }, ...poly.holes.map((h) => ({ pts: h, hole: true }))];
    for (const ring of rings) {
      const A = signedArea(ring.pts);
      const n = ring.pts.length;
      for (let i = 0; i < n; i++) {
        const p0 = ring.pts[(i + n - 1) % n], p1 = ring.pts[i], p2 = ring.pts[(i + 1) % n];
        const d1 = [p1[0] - p0[0], p1[1] - p0[1]], d2 = [p2[0] - p1[0], p2[1] - p1[1]];
        const cr = d1[0] * d2[1] - d1[1] * d2[0];
        const L1 = Math.hypot(...d1), L2 = Math.hypot(...d2);
        if (L1 < 5 || L2 < 5) continue;
        const reflex = ring.hole ? true : cr * A < 0;
        if (!reflex) continue;
        const u1 = [d1[0] / L1, d1[1] / L1], u2 = [d2[0] / L2, d2[1] / L2];
        let bx = u2[0] - u1[0], bz = u2[1] - u1[1];
        const bl = Math.hypot(bx, bz) || 1; bx /= bl; bz /= bl;
        let cand = [p1[0] + bx * 2.4, p1[1] + bz * 2.4];
        if (!solidAt(cand[0], cand[1])) cand = [p1[0] - bx * 2.4, p1[1] - bz * 2.4];
        if (!solidAt(cand[0], cand[1])) continue;
        b.box('turq', cand[0], topY + 0.04, cand[1], 2.4, 0.08, 2.4, Math.atan2(u1[1], u1[0]) * -1);
      }
    }
  }

  // layout roof features: pv arrays, teal pyramids ...
  for (const f of features) {
    if (f.type === 'pv_array') pvArray(b, f.polygon, topY + U.slab * 0 + (cfg.parapet ?? U.parapet) * 0);
    else if (f.type === 'teal_pyramid') tealPyramid(b, f.polygon, topY);
  }
}

function bboxOf(poly) {
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  for (const [x, z] of poly) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  return { x0, z0, x1, z1 };
}

/** Rows of tilted PV panels on a roof region (visible in the satellite image). */
function pvArray(b, polygon, y) {
  const bb = bboxOf(polygon);
  const pw = 1.05, pl = 1.7, gapX = 0.08, gapZ = 0.9;
  const tilt = 0.2;
  for (let z = bb.z0 + 0.5; z + pl < bb.z1; z += pl * Math.cos(tilt) + gapZ) {
    for (let x = bb.x0 + 0.4; x + pw < bb.x1; x += pw + gapX) {
      const cx = x + pw / 2, cz = z + pl / 2;
      if (!pointInPolygon(cx, cz, polygon)) continue;
      const m = new THREE.Matrix4().compose(new THREE.Vector3(cx, y + 0.45, cz), new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, 0, 0)), new THREE.Vector3(1, 1, 1));
      b.instance('pv|panel', 'pv', () => new THREE.BoxGeometry(pw, 0.05, pl), m);
      if ((Math.round(x * 10) + Math.round(z * 10)) % 3 === 0) b.instance('pv|leg', 'metal', () => new THREE.BoxGeometry(0.06, 0.45, 0.06).translate(0, -0.2, 0), m);
    }
  }
}

/** Raised drum + turquoise pyramid roof (the NE courtyard building shows one in the satellite). */
function tealPyramid(b, polygon, topY) {
  const bb = bboxOf(polygon);
  const w = bb.x1 - bb.x0, d = bb.z1 - bb.z0, cx = (bb.x0 + bb.x1) / 2, cz = (bb.z0 + bb.z1) / 2;
  const drumH = 1.6;
  b.box('wall', cx, topY + drumH / 2, cz, w, drumH, d);
  b.box('trim', cx, topY + drumH + 0.08, cz, w + 0.5, 0.16, d + 0.5);
  const h = Math.min(w, d) * 0.55;
  const g = new THREE.ConeGeometry(Math.min(w, d) * 0.5 * Math.SQRT2, h, 4, 1);
  g.rotateY(Math.PI / 4);
  g.translate(cx, topY + drumH + 0.16 + h / 2, cz);
  b.addGeometry('turq', g);
}

/** Green-tile pyramid roof on a raised drum (NE court building: visible in the satellite). */
function tilePyramid(ctx, polygon, topY) {
  const { b, cfg } = ctx;
  const bb = bboxOf(polygon);
  const w = bb.x1 - bb.x0, d = bb.z1 - bb.z0, cx = (bb.x0 + bb.x1) / 2, cz = (bb.z0 + bb.z1) / 2;
  const base = topY + 1.55 - 0.3;
  b.box(cfg.wallMat || 'wall', cx, base + 1.1, cz, w, 2.2, d);
  b.box('trim', cx, base + 2.3, cz, w + 0.6, 0.2, d + 0.6);
  ctx.tiles.push(pyramidGeo(cx, cz, w + 1.6, d + 1.6, Math.min(w, d) * 0.5, base + 2.4));
}
