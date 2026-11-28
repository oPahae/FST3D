import { pointInPolygon } from '../world/geom.js';

/**
 * 2D collision world, completely separate from decorative geometry.
 *  solids   : polygons (outer ring minus holes) the player cannot enter
 *  circles  : posts, columns, tree trunks, lamps
 *  surfaces : walkable raised areas (steps, platforms) with a top height
 */
export class CollisionWorld {
  constructor(cell = 16) {
    this.cell = cell;
    this.solids = [];
    this.circles = [];
    this.surfaces = [];
    this.grid = null;
    this.bounds = null;
    this.playerY = 0;   // feet height of the player: solids with a finite `top` (benches) are ignored once the feet are near that height
  }

  addPolygon(outer, holes = [], tag = '', top = Infinity) {
    const pts = outer.slice();
    if (pts.length > 1 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1]) pts.pop();
    const hs = holes.map((h) => { const q = h.slice(); if (q.length > 1 && q[0][0] === q[q.length - 1][0] && q[0][1] === q[q.length - 1][1]) q.pop(); return q; });
    const bb = bboxOf(pts);
    const edges = [];
    for (const ring of [pts, ...hs]) for (let i = 0; i < ring.length; i++) { const a = ring[i], b = ring[(i + 1) % ring.length]; edges.push([a[0], a[1], b[0], b[1]]); }
    this.solids.push({ outer: pts, holes: hs, bb, edges, tag, top });
  }

  /** polygon-clipping MultiPolygon: [[ring, hole...], ...] */
  addMulti(mp, tag = '') { for (const poly of mp) this.addPolygon(poly[0], poly.slice(1), tag); }

  addCircle(x, z, r, tag = '') { this.circles.push({ x, z, r, tag }); }

  addSurface(poly, h, tag = '', fn = null) { this.surfaces.push({ poly, h, bb: bboxOf(poly), tag, fn }); }

  finalize() {
    const g = new Map();
    const put = (kind, idx, bb) => {
      for (let cx = Math.floor(bb.minX / this.cell); cx <= Math.floor(bb.maxX / this.cell); cx++)
        for (let cz = Math.floor(bb.minZ / this.cell); cz <= Math.floor(bb.maxZ / this.cell); cz++) {
          const k = cx * 100003 + cz;
          let c = g.get(k);
          if (!c) { c = { s: [], c: [], f: [] }; g.set(k, c); }
          c[kind].push(idx);
        }
    };
    this.solids.forEach((s, i) => put('s', i, s.bb));
    this.circles.forEach((c, i) => put('c', i, { minX: c.x - c.r, maxX: c.x + c.r, minZ: c.z - c.r, maxZ: c.z + c.r }));
    this.surfaces.forEach((s, i) => put('f', i, s.bb));
    this.grid = g;
    return this;
  }

  _near(x, z, r) {
    const out = { s: new Set(), c: new Set(), f: new Set() };
    for (let cx = Math.floor((x - r) / this.cell); cx <= Math.floor((x + r) / this.cell); cx++)
      for (let cz = Math.floor((z - r) / this.cell); cz <= Math.floor((z + r) / this.cell); cz++) {
        const c = this.grid.get(cx * 100003 + cz);
        if (!c) continue;
        c.s.forEach((i) => out.s.add(i)); c.c.forEach((i) => out.c.add(i)); c.f.forEach((i) => out.f.add(i));
      }
    return out;
  }

  solidAt(x, z) {
    const n = this._near(x, z, 0);
    for (const i of n.s) {
      const s = this.solids[i];
      if (x < s.bb.minX || x > s.bb.maxX || z < s.bb.minZ || z > s.bb.maxZ) continue;
      if (pointInPolygon(x, z, s.outer) && !s.holes.some((h) => pointInPolygon(x, z, h))) return s;
    }
    return null;
  }

  /** Highest walkable surface under (x,z); 0 when none. */
  groundHeight(x, z) {
    let h = 0;
    const n = this._near(x, z, 0);
    for (const i of n.f) {
      const s = this.surfaces[i];
      if (x < s.bb.minX || x > s.bb.maxX || z < s.bb.minZ || z > s.bb.maxZ) continue;
      if (s.fn) { if (pointInPolygon(x, z, s.poly)) h = Math.max(h, s.fn(x, z)); continue; }   // sloped terrain
      if (s.h <= h) continue;
      if (pointInPolygon(x, z, s.poly)) h = s.h;
    }
    return h;
  }

  /** True if a circle of radius r at (x,z) overlaps any solid or circle. */
  blocked(x, z, r) {
    const n = this._near(x, z, r + 0.5);
    for (const i of n.c) { const c = this.circles[i]; if (Math.hypot(x - c.x, z - c.z) < r + c.r) return true; }
    for (const i of n.s) {
      const s = this.solids[i];
      if (this.playerY >= s.top - 0.45) continue;
      if (x < s.bb.minX - r || x > s.bb.maxX + r || z < s.bb.minZ - r || z > s.bb.maxZ + r) continue;
      if (pointInPolygon(x, z, s.outer) && !s.holes.some((h) => pointInPolygon(x, z, h))) return true;
      for (const e of s.edges) if (segDist(x, z, e) < r) return true;
    }
    return false;
  }

  /** Push a circle out of everything it overlaps. Returns the corrected [x,z]. */
  resolve(x, z, r) {
    for (let it = 0; it < 5; it++) {
      let moved = false;
      const n = this._near(x, z, r + 1);
      for (const i of n.c) {
        const c = this.circles[i];
        const dx = x - c.x, dz = z - c.z, d = Math.hypot(dx, dz), m = r + c.r;
        if (d < m) { const k = d > 1e-6 ? m / d : 0; if (k) { x = c.x + dx * k; z = c.z + dz * k; } else x += m; moved = true; }
      }
      for (const i of n.s) {
        const s = this.solids[i];
        if (this.playerY >= s.top - 0.45) continue;
        if (x < s.bb.minX - r || x > s.bb.maxX + r || z < s.bb.minZ - r || z > s.bb.maxZ + r) continue;
        const inside = pointInPolygon(x, z, s.outer) && !s.holes.some((h) => pointInPolygon(x, z, h));
        let best = Infinity, qx = 0, qz = 0;
        for (const e of s.edges) {
          const q = closest(x, z, e);
          if (q.d < best) { best = q.d; qx = q.x; qz = q.z; }
        }
        if (inside) {
          const dx = qx - x, dz = qz - z, d = Math.hypot(dx, dz) || 1e-6;
          x = qx + (dx / d) * (r + 0.002); z = qz + (dz / d) * (r + 0.002); moved = true;
        } else if (best < r) {
          const dx = x - qx, dz = z - qz, d = Math.hypot(dx, dz) || 1e-6;
          x = qx + (dx / d) * r; z = qz + (dz / d) * r; moved = true;
        }
      }
      if (!moved) break;
    }
    return [x, z];
  }
}

function bboxOf(pts) {
  let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
  for (const [x, z] of pts) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); }
  return { minX, minZ, maxX, maxZ };
}
function closest(px, pz, [x0, z0, x1, z1]) {
  const dx = x1 - x0, dz = z1 - z0, L2 = dx * dx + dz * dz;
  let t = L2 ? ((px - x0) * dx + (pz - z0) * dz) / L2 : 0;
  t = Math.max(0, Math.min(1, t));
  const x = x0 + dx * t, z = z0 + dz * t;
  return { x, z, d: Math.hypot(px - x, pz - z) };
}
function segDist(px, pz, e) { return closest(px, pz, e).d; }
