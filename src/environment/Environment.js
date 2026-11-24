import * as THREE from 'three';
import polygonClipping from 'polygon-clipping';
import { CONFIG } from '../config.js';
import { Builder } from '../architecture/Builder.js';
import { makeMaterials } from '../architecture/materials.js';
import { getTextures } from './textures.js';
import { ribbon, offsetPolyline, worldUV } from './ribbon.js';
import { flatPoly } from '../architecture/shapes.js';
import { plantZones, addPalm, addTree, addFanPalm, addCypress, addWeeping } from './planting.js';
import { mulberry32, circlePolygon, pointInPolygon } from '../world/geom.js';
import { buildFeatures } from './features.js';
import { buildTerrain, terrainModel } from './terrain.js';
import { buildStairs } from '../architecture/stairs.js';

export function addBench(b, collision, x, z, yaw) {
  return;   // v0.6: all benches / chairs removed on request
  const cs = Math.cos(yaw), sn = Math.sin(yaw);
  b.box('wood', x, 0.46, z, 1.7, 0.08, 0.48, -yaw);
  b.box('wood', x - sn * 0.22, 0.8, z + cs * 0.22 * -1, 1.7, 0.4, 0.07, -yaw);
  for (const sg of [-1, 1]) b.box('metal', x + cs * sg * 0.7, 0.23, z + sn * sg * 0.7, 0.08, 0.46, 0.4, -yaw);
  collision.addCircle(x, z, 0.7, 'bench');
}
export function addLamp(b, collision, x, z) {
  b.box('poleGreen', x, 2.3, z, 0.14, 4.6, 0.14); b.box('poleGreen', x + 0.4, 4.55, z, 0.9, 0.08, 0.08); b.box('lampHead', x + 0.85, 4.45, z, 0.5, 0.18, 0.32);
  collision.addCircle(x, z, 0.22, 'lamp');
}

const _hs = new THREE.SphereGeometry(0.42, 8, 5);
/** Rounded, lumpy clipped hedge (field photos: low, soft, leafy hedges along every path - not hard-edged green blocks). */
export function hedgeLine(b, x0, z0, x1, z1, h = 0.72) {
  const L = Math.hypot(x1 - x0, z1 - z0);
  if (L < 0.05) return;
  b.wallBox('hedge', x0, z0, x1, z1, 0, h * 0.72, 0.7);
  const n = Math.max(1, Math.round(L / 0.7));
  for (let k = 0; k <= n; k++) {
    const t = k / n, j = ((k * 7919) % 13) / 13;
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x0 + (x1 - x0) * t, h * 0.62 + 0.02 + j * 0.05, z0 + (z1 - z0) * t), new THREE.Quaternion(), new THREE.Vector3(0.95 + j * 0.1, 0.7 + j * 0.12, 0.95 + j * 0.1));
    b.addGeometry('hedge', _hs, m);
  }
}

const distSeg = (px, pz, a, c) => { const dx = c[0] - a[0], dz = c[1] - a[1], L2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (pz - a[1]) * dz) / L2)); return Math.hypot(px - a[0] - dx * t, pz - a[1] - dz * t); };
const flat = (map, color, extra = {}) => new THREE.MeshStandardMaterial({ map: map || null, color, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1, side: THREE.DoubleSide, ...extra });

/**
 * Ground, roads + sidewalks + curbs + markings, paths, plazas, lawns, fountain, fences, gates,
 * benches, streetlights, palms and trees. Everything is generated from the layout; furniture
 * positions are illustrative (no reference shows them) and are marked as such in the README.
 */
export function buildEnvironment(layout, collision, archShared) {
  const S = CONFIG.unitsPerNU;
  const toM = ([x, z]) => [x * S, z * S];
  const tex = getTextures();
  const terrain = terrainModel(layout);
  const mats = makeMaterials();
  const b = new Builder(mats, { name: 'environment' });
  const group = new THREE.Group();
  group.name = 'environment';
  const stats = { palms: 0, trees: 0, benches: 0, lamps: 0 };

  const mAsphalt = flat(tex && tex.asphalt, tex ? 0xffffff : 0x5a5e64);
  const mPaving = flat(tex && tex.slab, tex ? 0xffffff : 0xa9a59b);           // weathered grey concrete slabs: garden paths
  const mPlaza = flat(tex && tex.diag, tex ? 0xffffff : 0x9aa0a8);            // diagonal blue-grey / light checker: plazas in front of buildings
  const mBeige = flat(null, 0xdccfae);
  const mGrass = flat(tex && tex.grass, tex ? 0xffffff : 0x72a05a);
  const mGround = new THREE.MeshStandardMaterial({ map: tex ? tex.ground : null, color: tex ? 0xffffff : 0xcfc6a6, roughness: 1 });
  const mSide = flat(tex && tex.slab, tex ? 0xffffff : 0xa9a59b);              // grey concrete sidewalks; only the kerb is painted red / white (field photos)
  const addMesh = (geo, mat, y = 0, name = '') => { const m = new THREE.Mesh(geo, mat); m.position.y = y; m.receiveShadow = true; m.name = name; group.add(m); return m; };

  // ---- ground -------------------------------------------------------------------
  const e = layout.extent, mg = CONFIG.groundMarginNU;
  const gx0 = (e.minX - mg) * S, gx1 = (e.maxX + mg) * S, gz0 = (e.minZ - mg) * S, gz1 = (e.maxZ + mg) * S;
  const gg = new THREE.PlaneGeometry(gx1 - gx0, gz1 - gz0); gg.rotateX(-Math.PI / 2); gg.translate((gx0 + gx1) / 2, -0.02, (gz0 + gz1) / 2); worldUV(gg);
  addMesh(gg, mGround, 0, 'ground');

  // ---- roads, sidewalks, curbs, markings -----------------------------------------------
  const HW = 0.1;                 // sidewalk / curb height
  for (const r of layout.roads) {
    const w = (r.widthNU || 0.04) * S, sw = (r.sidewalk || 0) * S;
    if (r.centerline && r.centerline.length > 1) {
      const pts = r.centerline.map(toM);
      addMesh(ribbon(pts, w, 0.03), mAsphalt, 0, r.id);
      if (sw > 0) for (const side of [1, -1]) {
        const mid = offsetPolyline(pts, side * (w / 2 + sw / 2));
        addMesh(ribbon(mid, sw, HW), mSide, 0, `${r.id}:sidewalk`);
        const inner = offsetPolyline(pts, side * (w / 2)), outer = offsetPolyline(pts, side * (w / 2 + sw));
        for (let i = 0; i < pts.length - 1; i++) {
          { // red / white painted kerb (field photos "Boulevard entre white halls")
            const ax = inner[i][0], az = inner[i][1], cx2 = inner[i + 1][0], cz2 = inner[i + 1][1], Ls = Math.hypot(cx2 - ax, cz2 - az), np = Math.max(1, Math.round(Ls / 2.4));
            for (let k = 0; k < np; k++) b.wallBox((k + i) % 2 ? 'curbRed' : 'trim', ax + ((cx2 - ax) * k) / np, az + ((cz2 - az) * k) / np, ax + ((cx2 - ax) * (k + 1)) / np, az + ((cz2 - az) * (k + 1)) / np, 0, HW, 0.2);
          }
          b.wallBox('concrete', outer[i][0], outer[i][1], outer[i + 1][0], outer[i + 1][1], 0, HW, 0.16);
        }
      }
      if (w > 5.5) {                                  // dashed centre line
        for (let i = 0; i < pts.length - 1; i++) {
          const a = pts[i], c = pts[i + 1], L = Math.hypot(c[0] - a[0], c[1] - a[1]), n = Math.floor(L / 7);
          for (let k = 0; k < n; k++) {
            const t0 = (k * 7 + 1) / L, t1 = (k * 7 + 4) / L;
            b.wallBox('trim', a[0] + (c[0] - a[0]) * t0, a[1] + (c[1] - a[1]) * t0, a[0] + (c[0] - a[0]) * t1, a[1] + (c[1] - a[1]) * t1, 0.03, 0.045, 0.14);
          }
        }
      }
    } else if (r.ring) {
      const [cx, cz] = toM(r.ring.center), R = r.ring.radiusNU * S;
      const ringGeo = (inner, outer, y) => { const g = new THREE.RingGeometry(inner, outer, 96, 1); g.rotateX(-Math.PI / 2); g.translate(cx, y, cz); return worldUV(g); };
      addMesh(ringGeo(R - w / 2, R + w / 2, 0.03), mAsphalt, 0, r.id);
      if (sw > 0) addMesh(ringGeo(R + w / 2, R + w / 2 + sw, HW), mSide, 0, `${r.id}:sidewalk`);
      const isl = (r.ring.islandRadiusNU || 0) * S;
      if (isl) {
        const g = new THREE.CircleGeometry(isl, 64); g.rotateX(-Math.PI / 2); g.translate(cx, HW + 0.05, cz); worldUV(g);
        addMesh(g, mGrass, 0, `${r.id}:island`);
        for (let i = 0; i < 64; i++) { const a0 = (i / 64) * 6.2832, a1 = ((i + 1) / 64) * 6.2832; b.wallBox('concrete', cx + Math.cos(a0) * isl, cz + Math.sin(a0) * isl, cx + Math.cos(a1) * isl, cz + Math.sin(a1) * isl, 0, HW + 0.05, 0.3); }
      }
    }
  }

  // ---- paved courtyards, plazas -----------------------------------------------------------
  const courtById = (id) => layout.courtyards.find((c) => c.id === id);
  for (const c of layout.courtyards) {
    if (!c.polygon) continue;
    const poly = c.polygon.map(toM);
    if (c.type === 'paved') addMesh(worldUV(flatPoly(poly, [], 0.05)), mPlaza, 0, c.id);
  }

  // ---- pedestrian paths -------------------------------------------------------------------------
  for (const p of layout.pathways) if (p.centerline && p.centerline.length > 1) {
    const pts = p.centerline.map(toM), pw = Math.max((p.widthNU || 0.012) * S, 2.2);
    addMesh(ribbon(pts, pw, 0.06), p.surface === 'beige' ? mBeige : mPaving, 0, p.id);
    // v0.7b: low rounded hedges along both sides of every walkway (field photos of the approach paths); pieces that would cross a building,
    // another path, a terrace or a road are skipped so every junction stays open
    if (p.hedges || !/^P_(Q_|AXIS)/.test(p.id)) for (const sd of [-1, 1]) {
      const edge = offsetPolyline(pts, sd * (pw / 2 + 0.55));
      for (let i = 0; i < edge.length - 1; i++) {
        const [ax, az] = edge[i], [bx, bz] = edge[i + 1], L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(L / 3));
        for (let k = 0; k < n; k++) {
          const x0p = ax + ((bx - ax) * k) / n, z0p = az + ((bz - az) * k) / n, x1p = ax + ((bx - ax) * (k + 1)) / n, z1p = az + ((bz - az) * (k + 1)) / n;
          let ok = true;
          for (const t of [0, 0.5, 1]) {
            const qx = x0p + (x1p - x0p) * t, qz = z0p + (z1p - z0p) * t;
            if (terrain.heightAt(qx, qz) > 0.03) { ok = false; break; }
            if (layout.buildings.some((bd) => bd.polys.some((pl) => pointInPolygon(qx, qz, pl.outer.map(toM))))) { ok = false; break; }
            if (layout.pathways.some((o) => o !== p && o.centerline && o.centerline.some((c, m) => m < o.centerline.length - 1 && distSeg(qx, qz, toM(c), toM(o.centerline[m + 1])) < Math.max((o.widthNU || 0.012) * S, 2.2) / 2 + 0.9))) { ok = false; break; }
            if (layout.roads.some((r) => r.centerline && r.centerline.some((c, m) => m < r.centerline.length - 1 && distSeg(qx, qz, toM(c), toM(r.centerline[m + 1])) < ((r.widthNU || 0.04) * S) / 2 + 1))) { ok = false; break; }
          }
          if (ok && !p.keepHedges) { const mx = (x0p + x1p) / 2 / S, mz = (z0p + z1p) / 2 / S; if ((layout.noHedge || []).some(([a, c, d, f]) => mx > a && mx < d && mz > c && mz < f)) ok = false; }
          if (ok) hedgeLine(b, x0p, z0p, x1p, z1p);
        }
      }
    }
  }

  // ---- central garden: lawn beds between the paths, paved crossings, fountain ------------------------
  const garden = courtById('C_CENTRAL');
  const pathById = (id) => layout.pathways.find((p) => p.id === id);
  if (garden && garden.polygon) {
    const gp = garden.polygon.map(toM);
    let gx0b = Infinity, gz0b = Infinity, gx1b = -Infinity, gz1b = -Infinity;
    for (const [x, z] of gp) { gx0b = Math.min(gx0b, x); gx1b = Math.max(gx1b, x); gz0b = Math.min(gz0b, z); gz1b = Math.max(gz1b, z); }
    const xs = [gx0b, ...['P_Q_W', 'P_AXIS_NS', 'P_Q_E'].map((id) => pathById(id)).filter(Boolean).map((p) => toM(p.centerline[0])[0]), gx1b].sort((a, c) => a - c);
    const zs = [gz0b, ...['P_Q_N', 'P_AXIS_EW', 'P_Q_S'].map((id) => pathById(id)).filter(Boolean).map((p) => toM(p.centerline[0])[1]), gz1b].sort((a, c) => a - c);
    const half = 2.0;   // half path width
    const blockers = layout.buildings.flatMap((bd) => bd.polys.map((pl) => pl.outer.map(toM)));
    const rng = mulberry32(4242);
    for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < zs.length - 1; j++) {
      const a = xs[i] + (i === 0 ? 0.8 : half + 0.5), c = xs[i + 1] - (i === xs.length - 2 ? 0.8 : half + 0.5);
      const d = zs[j] + (j === 0 ? 0.8 : half + 0.5), f = zs[j + 1] - (j === zs.length - 2 ? 0.8 : half + 0.5);
      if (c - a < 3 || f - d < 3) continue;
      let cell = [[[a, d], [c, d], [c, f], [a, f]]];
      const cl = (layout.features || []).find((q) => q.type === 'cloister_ring');
      if (cl) { const [rx0, rz0, rx1, rz1] = cl.outerNU.map((v) => v * S), rw = cl.widthNU * S + 0.8; const _ix = polygonClipping.intersection(cell, [[[rx0 + rw, rz0 + rw], [rx1 - rw, rz0 + rw], [rx1 - rw, rz1 - rw], [rx0 + rw, rz1 - rw]]]); if (!_ix.length) continue; cell = _ix[0]; }
      const pav = layout.buildings.find((bd) => bd.id === 'CENTRAL_PAV');
      if (pav) {
        const pm = pav.polys[0].outer.map(toM); let px0 = Infinity, pz0 = Infinity, px1 = -Infinity, pz1 = -Infinity;
        for (const [x, z] of pm) { px0 = Math.min(px0, x); px1 = Math.max(px1, x); pz0 = Math.min(pz0, z); pz1 = Math.max(pz1, z); }
        const mgn = 5.5;
        cell = polygonClipping.difference(cell, [[[px0 - mgn, pz0 - mgn], [px1 + mgn, pz0 - mgn], [px1 + mgn, pz1 + mgn], [px0 - mgn, pz1 + mgn]]]).map((q) => q[0]);
      } else cell = cell.map((q) => q[0]);
      for (const ring of cell) {
        const pts = ring.slice(0, -1);
        if (pts.length < 3) continue;
        const bed = worldUV(flatPoly(pts, [], 0.22));
        addMesh(bed, mGrass, 0, 'lawn');
        for (let k = 0; k < pts.length; k++) {
          const p0 = pts[k], p1 = pts[(k + 1) % pts.length];
          hedgeLine(b, p0[0], p0[1], p1[0], p1[1]);      // clipped hedge along the path edge (photos 1 and 3)
        }
        // young fan palms on a staggered grid with soil rings, a few clipped hedge balls (photo 1)
        let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
        for (const [x, z] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
        const step = 8;
        let row = 0;
        for (let z = z0 + 3.2; z < z1 - 2.4; z += step * 0.9, row++) for (let x = x0 + 3.2 + (row % 2) * step / 2; x < x1 - 2.4; x += step) {
          const jx = x + (rng() - 0.5) * 1.2, jz = z + (rng() - 0.5) * 1.2;
          if (!pointInPolygon(jx, jz, pts)) continue;
          if (rng() < 0.2) { const bm = new THREE.SphereGeometry(0.6, 10, 8); bm.scale(1, 0.9, 1); bm.translate(jx, 0.6, jz); b.addGeometry('hedge', bm); }
          else if (rng() < 0.4) { addFanPalm(b, collision, jx, jz, 0.9 + rng() * 0.35, rng() * 6.28); stats.palms++; }
        }
        // field photos "Centre fst": tall cypresses, weeping trees and clipped shrubs scattered over the lawns
        for (let k = 0; k < 2; k++) if (rng() < 0.7) { const tx = x0 + 3 + rng() * (x1 - x0 - 6), tz = z0 + 3 + rng() * (z1 - z0 - 6); if (pointInPolygon(tx, tz, pts)) { addCypress(b, collision, tx, tz, 0.9 + rng() * 0.4); stats.trees++; } }
        if (rng() < 0.75) { const tx = x0 + 3 + rng() * (x1 - x0 - 6), tz = z0 + 3 + rng() * (z1 - z0 - 6); if (pointInPolygon(tx, tz, pts)) { addWeeping(b, collision, tx, tz, 0.85 + rng() * 0.35); stats.trees++; } }
        if (rng() < 0.5) { const tx = x0 + 3 + rng() * (x1 - x0 - 6), tz = z0 + 3 + rng() * (z1 - z0 - 6); if (pointInPolygon(tx, tz, pts)) { addPalm(b, collision, tx, tz, 0.95 + rng() * 0.2, rng() * 6.28); stats.palms++; } }
      }
    }
    // paved squares where the paths cross
    for (const x of xs.slice(1, -1)) for (const z of zs.slice(1, -1)) b.box('concrete', x, 0.07, z, 6.5, 0.04, 6.5);
    const pv = layout.buildings.find((bd) => bd.id === 'CENTRAL_PAV');
    if (pv) {
      let px0 = Infinity, pz0 = Infinity, px1 = -Infinity, pz1 = -Infinity;
      for (const [x, z] of pv.polys[0].outer.map(toM)) { px0 = Math.min(px0, x); px1 = Math.max(px1, x); pz0 = Math.min(pz0, z); pz1 = Math.max(pz1, z); }
      for (const [dx, dz] of [[-6.5, 4], [-8.5, 7.5], [6.5, 4], [8.5, 7.5], [-6.5, -4], [6.5, -4]]) { addCypress(b, collision, (px0 + px1) / 2 + (dx < 0 ? px0 - (px0 + px1) / 2 + dx + 2.6 : px1 - (px0 + px1) / 2 + dx - 2.6), dz > 0 ? pz1 + dz : pz0 + dz, 0.95 + rng() * 0.3); stats.trees++; }
    }
  }

  // ---- inner courts (building holes): lawn / basin / patio ------------------------------------------------------------
  for (const c of layout.courtyards.filter((q) => q.buildingCourt && q.polygon)) {
    const poly = c.polygon.map(toM);
    let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
    for (const [x, z] of poly) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0;
    const rng = mulberry32(c.id.length * 977 + Math.round(cx));
    const ty0 = terrain.heightAt(cx, cz);
    let raisedRects = null;
    const ty = ty0 + (c.raise || 0) - (c.drop || 0);   // courts inside a terrace are raised with it (c.raise / c.drop: v0.6 raised Administration court, sunken SE court)
    if (c.raise) {
      // the court floor stands above the passage floor: a short flight of steps at each passage mouth (field photo "Administration inner court")
      const ax = (layout.passages.find((q) => q.building === 'ADMIN_C') || { p: [cx / S] }).p[0] * S, st = Math.max(2, Math.round(c.raise / 0.17));
      const stw = 2.6, sl = st * 0.34;
      raisedRects = [[x0, z0 + sl, x1, z1 - sl], [x0, z0, ax - stw, z0 + sl], [ax + stw, z0, x1, z0 + sl], [x0, z1 - sl, ax - stw, z1], [ax + stw, z1 - sl, x1, z1]].filter((q) => q[2] - q[0] > 0.05 && q[3] - q[1] > 0.05);
      for (const q of raisedRects) collision.addSurface([[q[0], q[1]], [q[2], q[1]], [q[2], q[3]], [q[0], q[3]]], ty, `${c.id}:raised`);
      buildStairs({ b, collision }, { origin: [ax, z0], dir: [0, 1], width: 5.2, steps: st, rise: c.raise / st, tread: 0.34, mat: 'concrete', base: ty0 });
      buildStairs({ b, collision }, { origin: [ax, z1], dir: [0, -1], width: 5.2, steps: st, rise: c.raise / st, tread: 0.34, mat: 'concrete', base: ty0 });
    }
    if (c.drop) {
      for (const [ax, az, bx, bz] of [[x0, z0, x1, z0], [x1, z0, x1, z1], [x1, z1, x0, z1], [x0, z1, x0, z0]]) b.wallBox('stone', ax, az, bx, bz, ty, ty0 + 0.1, 0.5);
      const swath = (layout.features || []).find((q) => q.type === 'bridge');
      if (swath) {
        const sw = swath.points.map(toM), hw = (swath.widthM || 4) / 2 + 0.3;
        const strips = [];
        for (let k = 0; k < sw.length - 1; k++) { const [px, pz] = sw[k], [qx, qz] = sw[k + 1]; strips.push([[Math.min(px, qx) - hw, Math.min(pz, qz) - hw], [Math.max(px, qx) + hw, Math.min(pz, qz) - hw], [Math.max(px, qx) + hw, Math.max(pz, qz) + hw], [Math.min(px, qx) - hw, Math.max(pz, qz) + hw]]); }
        let rest = polygonClipping.difference([[[x0, z0], [x1, z0], [x1, z1], [x0, z1]]], ...strips.map((q) => [q]));
        for (const pl of rest) collision.addPolygon(pl[0].slice(0, -1), [], `${c.id}:pit`);
      } else collision.addPolygon([[x0, z0], [x1, z0], [x1, z1], [x0, z1]], [], `${c.id}:pit`);
    }
    b.yOff = ty;
    for (const q of raisedRects || [[x0, z0, x1, z1]]) addMesh(worldUV(flatPoly([[q[0], q[1]], [q[2], q[1]], [q[2], q[3]], [q[0], q[3]]], [], 0.05 + ty)), mPaving, 0, `${c.id}:floor`);
    if (c.courtStyle === 'checker') {
      // dark / cream checkerboard of rectangular pavers, benches, hedge planters and green lamps (field photos: Administration court, Building 4, connector patios)
      for (const q of raisedRects || [[x0, z0, x1, z1]]) addMesh(worldUV(flatPoly([[q[0], q[1]], [q[2], q[1]], [q[2], q[3]], [q[0], q[3]]], [], 0.06 + ty)), mats.floorChecker, 0, `${c.id}:checker`);
      const bx = Math.min(w, d) > 14 ? 5.5 : 3.2;
      for (const [dx, dz, yaw] of [[-1, 0, 0], [1, 0, Math.PI], [0, -1, Math.PI / 2], [0, 1, -Math.PI / 2]]) {
        if (w < 10 && dx === 0) continue;
        addBench(b, collision, cx + dx * (w / 2 - bx * 0.3), cz + dz * (d / 2 - bx * 0.3), yaw); stats.benches++;
      }
      if (Math.min(w, d) > 14) for (const [sx, sz] of [[-1, -1], [1, 1]]) { addLamp(b, collision, cx + sx * (w / 2 - 3.0), cz + sz * (d / 2 - 3.0)); stats.lamps++; }
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const hx = cx + sx * (w / 2 - 1.4), hz = cz + sz * (d / 2 - 1.4); hedgeLine(b, hx - 1.2, hz, hx + 1.2, hz, 0.85); collision.addPolygon([[hx - 1.3, hz - 0.6], [hx + 1.3, hz - 0.6], [hx + 1.3, hz + 0.6], [hx - 1.3, hz + 0.6]], [], 'planter'); }
    } else if (c.courtStyle === 'basin') {
      const bw = w * 0.5, bd = d * 0.34;
      b.box('stone', cx, 0.25, cz, bw + 0.6, 0.5, bd + 0.6);
      b.box('water', cx, 0.47, cz, bw, 0.05, bd);
      b.box('turq', cx, 0.06, cz - bd / 2 - 0.9, bw + 1.6, 0.05, 0.6); b.box('turq', cx, 0.06, cz + bd / 2 + 0.9, bw + 1.6, 0.05, 0.6);
      collision.addPolygon([[cx - bw / 2 - 0.3, cz - bd / 2 - 0.3], [cx + bw / 2 + 0.3, cz - bd / 2 - 0.3], [cx + bw / 2 + 0.3, cz + bd / 2 + 0.3], [cx - bw / 2 - 0.3, cz + bd / 2 + 0.3]], [], `${c.id}:basin`);
      for (const [sx, sz] of [[-1, -1], [1, 1]]) { addPalm(b, collision, cx + sx * (w / 2 - 2.0), cz + sz * (d / 2 - 2.0), 0.8, rng() * 6.28); stats.palms++; }
    } else if (c.courtStyle === 'beige') {
      addMesh(worldUV(flatPoly(poly, [], 0.07 + ty)), mBeige, 0, `${c.id}:beige`);
    } else if (c.courtStyle === 'patio') {
      b.box('turq', cx, 0.07, cz, 3.2, 0.04, 3.2);
      addPalm(b, collision, cx, cz, 0.85, rng() * 6.28); stats.palms++;
    } else {
      const inset = 3.4;
      const lawn = [[x0 + inset, z0 + inset], [x1 - inset, z0 + inset], [x1 - inset, z1 - inset], [x0 + inset, z1 - inset]];
      addMesh(worldUV(flatPoly(lawn, [], 0.2 + ty)), mGrass, 0, `${c.id}:lawn`);
      for (let k = 0; k < 4; k++) { const p0 = lawn[k], p1 = lawn[(k + 1) % 4]; b.wallBox('stone', p0[0], p0[1], p1[0], p1[1], 0, 0.2, 0.3); }
      for (const [dx, dz] of [[-0.22, -0.2], [0.22, 0.2], [0.2, -0.22], [-0.2, 0.22]]) { addPalm(b, collision, cx + dx * w, cz + dz * d, 0.9 + rng() * 0.2, rng() * 6.28); stats.palms++; }
    }
    b.yOff = 0;
  }

  // ---- features read from the layout: curved pergola (replaces the fountain), mini pitch, step terrace, speed bump -----------------------------------
  const updaters = [];
  buildFeatures(layout, { b, collision, toM, mats, addMesh, mPaving, mGrass, group, updaters });
  buildTerrain(layout, { b, collision, toM, mats, addMesh, mPaving, mGrass, mPlaza, hedgeLine });

  // ---- fences: green wrought iron with golden trident finials on a low stone kerb, stone posts (field photos of the perimeter fence) ------------------
  for (const f of layout.fences) {
    const pts = f.centerline.map(toM);
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], c = pts[i + 1], L = Math.hypot(c[0] - a[0], c[1] - a[1]);
      const dx = (c[0] - a[0]) / L, dz = (c[1] - a[1]) / L, yaw = -Math.atan2(dz, dx);
      const gaps = (f.gapsNU || []).map(([g0, g1]) => [toM([g0, 0])[0], toM([g1, 0])[0]]);   // optional openings (distance along the segment, in NU)
      b.wallBox('stone', a[0], a[1], c[0], c[1], 0, 0.35, 0.34);
      b.wallBox('fenceGreen', a[0], a[1], c[0], c[1], 0.55, 0.62, 0.05);
      b.wallBox('fenceGreen', a[0], a[1], c[0], c[1], 1.45, 1.52, 0.05);
      const n = Math.max(1, Math.floor(L / 0.26));
      for (let k = 0; k <= n; k++) {
        const t = (k / n) * L, x = a[0] + dx * t, z = a[1] + dz * t;
        if (gaps.some(([g0, g1]) => t > g0 && t < g1)) continue;
        b.box('fenceGreen', x, 0.95, z, 0.035, 1.2, 0.035);
        b.box('goldTip', x, 1.78, z, 0.03, 0.34, 0.03);
        b.box('goldTip', x + dx * 0.075, 1.68, z + dz * 0.075, 0.025, 0.22, 0.025);
        b.box('goldTip', x - dx * 0.075, 1.68, z - dz * 0.075, 0.025, 0.22, 0.025);
        b.box('goldTip', x, 1.58, z, 0.2, 0.025, 0.025, yaw);
      }
      for (let t = 0; t <= L + 0.1; t += 6) { if (gaps.some(([g0, g1]) => t > g0 - 0.3 && t < g1 + 0.3)) continue; const x = a[0] + dx * t, z = a[1] + dz * t; b.box('stone', x, 1.0, z, 0.45, 2.0, 0.45); b.box('goldTip', x, 2.08, z, 0.3, 0.16, 0.3); }
      const parts = [[0, L]];
      for (const [g0, g1] of gaps) { const last = parts.pop(); if (g0 > last[0]) parts.push([last[0], g0]); if (g1 < last[1]) parts.push([g1, last[1]]); }
      for (const [p0, p1] of parts) collision.addPolygon([[a[0] + dx * p0 - 0.12, a[1] + dz * p0], [a[0] + dx * p1 - 0.12, a[1] + dz * p1], [a[0] + dx * p1 + 0.12, a[1] + dz * p1], [a[0] + dx * p0 + 0.12, a[1] + dz * p0]], [], f.id);
    }
  }
  // ---- gates ---------------------------------------------------------------------------------------------------------------
  for (const g of layout.gates) {
    const [cx, cz] = toM(g.position), half = (g.widthNU * S) / 2;
    for (const s of [-1, 1]) {
      const x = cx + s * half;
      b.box('stone', x, 1.7, cz, 0.9, 3.4, 0.9); b.box('trim', x, 3.5, cz, 1.2, 0.2, 1.2); b.box('turq', x, 3.66, cz, 1.0, 0.14, 1.0);
      b.box('lampHead', x, 4.0, cz, 0.4, 0.5, 0.4);
      collision.addCircle(x, cz, 0.7, g.id);
    }
  }

  // ---- planting zones (palms, groves) ---------------------------------------------------------------------------
  collision.finalize();
  plantZones(layout, b, collision, toM, stats);

  // ---- street furniture ----------------------------------------------------------------------------------------------------
  collision.finalize();
  const lampAt = (x, z) => {
    if (collision.blocked(x, z, 0.8)) return;
    b.box('poleGreen', x, 2.3, z, 0.14, 4.6, 0.14); b.box('poleGreen', x + 0.4, 4.55, z, 0.9, 0.08, 0.08); b.box('lampHead', x + 0.85, 4.45, z, 0.5, 0.18, 0.32);
    collision.addCircle(x, z, 0.22, 'lamp'); stats.lamps++;
  };
  const benchAt = (x, z, yaw) => {
    return;   // v0.6: no benches
    if (collision.blocked(x, z, 1.1)) return;
    const cs = Math.cos(yaw), sn = Math.sin(yaw);
    b.box('wood', x, 0.46, z, 1.7, 0.08, 0.48, -yaw);
    b.box('wood', x - sn * 0.22, 0.8, z + cs * 0.22 * -1, 1.7, 0.4, 0.07, -yaw);
    for (const s of [-1, 1]) b.box('metal', x + cs * s * 0.7, 0.23, z + sn * s * 0.7, 0.08, 0.46, 0.4, -yaw);
    collision.addCircle(x, z, 0.7, 'bench'); stats.benches++;
  };
  const alongLine = (pts, spacing, off, fn) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], c = pts[i + 1], L = Math.hypot(c[0] - a[0], c[1] - a[1]), dx = (c[0] - a[0]) / L, dz = (c[1] - a[1]) / L;
      for (let t = spacing / 2, k = 0; t < L; t += spacing, k++) fn(a[0] + dx * t - dz * off * (k % 2 ? 1 : -1), a[1] + dz * t + dx * off * (k % 2 ? 1 : -1), Math.atan2(dz, dx), k);
    }
  };
  for (const r of layout.roads) if (r.centerline) {
    const w = (r.widthNU || 0.04) * S;
    alongLine(r.centerline.map(toM), 32, w / 2 + 1.4 + ((r.sidewalk || 0) * S) / 4, (x, z) => lampAt(x, z));
  }
  const axis = pathById('P_AXIS_NS');
  if (axis) {
    alongLine(axis.centerline.map(toM), 17, 3.3, (x, z) => lampAt(x, z));
    alongLine(axis.centerline.map(toM), 36, 3.2, (x, z, yaw, k) => benchAt(x, z, 0));
  }
  for (const id of ['P_Q_N', 'P_Q_S']) { const p = pathById(id); if (p) alongLine(p.centerline.map(toM), 34, 3.0, (x, z, yaw, k) => benchAt(x, z, 0)); }
  const walk = pathById('P_S_EW'); if (walk) { alongLine(walk.centerline.map(toM), 26, 2.4, (x, z) => lampAt(x, z)); alongLine(walk.centerline.map(toM), 40, 2.4, (x, z) => benchAt(x, z, 0)); }
  const fore = pathById('P_FORECOURT'); if (fore) alongLine(fore.centerline.map(toM), 14, 7.5, (x, z) => lampAt(x, z));
  const pw = pathById('P_E_PLAZA'); if (pw) alongLine(pw.centerline.map(toM), 20, 3.2, (x, z) => lampAt(x, z));

  group.add(b.finish());
  collision.finalize();
  return { group, stats, updaters };
}
