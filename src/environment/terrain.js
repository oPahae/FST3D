import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { buildStairs } from '../architecture/stairs.js';
import { pointInPolygon } from '../world/geom.js';
import { ribbon } from './ribbon.js';

/**
 * Relief. The campus is not flat: in the field photos the main buildings stand on raised terraces reached by a short
 * flight of concrete steps, with grassy slopes on both sides of the path (Administration front, NE court building,
 * SE complex, Amphi 2). A terrace is described in WorldLayout.json ("terrain": [...]) as a rectangle (NU), a height and a
 * slope run per side; the same description drives the mesh, the walkable collision slope and the floor level of the
 * buildings that stand on it.
 */
const SIDES = ['N', 'S', 'W', 'E'];

export function terrainModel(layout) {
  if (layout.__terrain) return layout.__terrain;
  const S = CONFIG.unitsPerNU;
  const list = (layout.terrain || []).map((t) => {
    const [x0, z0, x1, z1] = t.rect.map((v) => v * S);
    const run = {}; for (const k of SIDES) run[k] = (typeof t.run === 'number' ? t.run : (t.run && t.run[k])) ?? 3;
    return { ...t, x0, z0, x1, z1, run, h: t.h };
  });
  const heightOf = (t, x, z) => {
    let k = 1;
    if (x < t.x0) k = Math.min(k, 1 - (t.x0 - x) / t.run.W);
    if (x > t.x1) k = Math.min(k, 1 - (x - t.x1) / t.run.E);
    if (z < t.z0) k = Math.min(k, 1 - (t.z0 - z) / t.run.N);
    if (z > t.z1) k = Math.min(k, 1 - (z - t.z1) / t.run.S);
    return t.h * Math.max(0, Math.min(1, k));
  };
  const heightAt = (x, z) => { let h = 0; for (const t of list) { if (x < t.x0 - t.run.W || x > t.x1 + t.run.E || z < t.z0 - t.run.N || z > t.z1 + t.run.S) continue; h = Math.max(h, heightOf(t, x, z)); } return h; };
  const baseYFor = (id) => { const t = list.find((q) => (q.buildings || []).includes(id)); return t ? t.h : 0; };
  return (layout.__terrain = { list, heightAt, heightOf, baseYFor });
}

function axisBreaks(a0, a1, b0, b1, step) {
  const pts = [a0, b0, b1, a1];
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const n = Math.max(1, Math.round((pts[i] - pts[i - 1]) / step));
    for (let k = 1; k <= n; k++) out.push(pts[i - 1] + ((pts[i] - pts[i - 1]) * k) / n);
  }
  return out;
}

export function buildTerrain(layout, env) {
  const { b, collision, toM, mGrass, addMesh, mPaving } = env;
  const model = terrainModel(layout);
  const S = CONFIG.unitsPerNU;
  const holes = layout.buildings.flatMap((bd) => (bd.polys || []).map((p) => p.outer.map(toM)));
  const courts = layout.courtyards.filter((c) => c.buildingCourt && c.polygon).map((c) => c.polygon.map(toM));
  for (const t of model.list) {
    const xs = axisBreaks(t.x0 - t.run.W, t.x1 + t.run.E, t.x0, t.x1, 1.5);
    const zs = axisBreaks(t.z0 - t.run.N, t.z1 + t.run.S, t.z0, t.z1, 1.5);
    const pos = [], uv = [], idx = [];
    for (let j = 0; j < zs.length; j++) for (let i = 0; i < xs.length; i++) { pos.push(xs[i], model.heightOf(t, xs[i], zs[j]) + 0.045, zs[j]); uv.push(xs[i], zs[j]); }
    const W = xs.length;
    for (let j = 0; j < zs.length - 1; j++) for (let i = 0; i < xs.length - 1; i++) {
      const cx = (xs[i] + xs[i + 1]) / 2, cz = (zs[j] + zs[j + 1]) / 2;
      if (holes.some((p) => pointInPolygon(cx, cz, p)) || courts.some((p) => pointInPolygon(cx, cz, p))) continue;   // the buildings (and their courts / passages) bring their own floors
      const a = j * W + i;
      idx.push(a, a + W, a + 1, a + 1, a + W, a + W + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    addMesh(g, mGrass, 0, `terrain:${t.id}`);

    // walkable slope (one surface covering plateau + embankments)
    collision.addSurface([[xs[0], zs[0]], [xs[W - 1], zs[0]], [xs[W - 1], zs[zs.length - 1]], [xs[0], zs[zs.length - 1]]], t.h, `terrain:${t.id}`, (x, z) => model.heightOf(t, x, z));

    if (t.path) addMesh(ribbon(t.path.map(toM), t.pathW ?? 3.6, t.h + 0.07), mPaving, 0, `terrain:${t.id}:path`);
    // concrete flights of steps cut into the embankment, hugging its slope, and a slab landing on the plateau
    const steps = Math.max(2, Math.round(t.h / 0.17)), rise = t.h / steps;
    for (const st of t.stairs || []) {
      const side = st.side, w = st.width ?? 4, at = st.at * S, run = st.run ?? t.run[side], tread = run / steps;
      let origin, dir, edge;
      if (side === 'S') { origin = [at, t.z1 + run]; dir = [0, -1]; edge = [at, t.z1]; }
      if (side === 'N') { origin = [at, t.z0 - run]; dir = [0, 1]; edge = [at, t.z0]; }
      if (side === 'W') { origin = [t.x0 - run, at]; dir = [1, 0]; edge = [t.x0, at]; }
      if (side === 'E') { origin = [t.x1 + run, at]; dir = [-1, 0]; edge = [t.x1, at]; }
      buildStairs({ b, collision }, { origin, dir, width: w, steps, rise, tread, mat: 'concrete' });
      const land = st.landing ?? 8;
      const pts = [edge, [edge[0] + dir[0] * land, edge[1] + dir[1] * land]];
      addMesh(ribbon(pts, w, t.h + 0.07), mPaving, 0, `terrain:${t.id}:landing`);
      // low concrete cheek walls along the flight
      for (const sd of [-1, 1]) b.box('concrete', (origin[0] + edge[0]) / 2 + (-dir[1]) * sd * (w / 2 + 0.12), t.h * 0.5, (origin[1] + edge[1]) / 2 + dir[0] * sd * (w / 2 + 0.12), dir[0] ? run : 0.24, t.h, dir[0] ? 0.24 : run, 0);
    }
  }
}
