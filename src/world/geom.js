import * as THREE from 'three';
import { CONFIG } from '../config.js';

export const S = CONFIG.unitsPerNU;
/** NU [x,z] -> world [x,z] */
export const w2 = ([x, z]) => [x * S, z * S];

/** Flat ribbon along a polyline (world [x,z] points). Mitred joins, clamped. */
export function ribbonGeometry(pts, width, y = 0) {
  const n = pts.length;
  const hw = width / 2;
  const segN = [];
  for (let i = 0; i < n - 1; i++) {
    const dx = pts[i + 1][0] - pts[i][0];
    const dz = pts[i + 1][1] - pts[i][1];
    const L = Math.hypot(dx, dz) || 1;
    segN.push([-dz / L, dx / L]);
  }
  const pos = [];
  for (let i = 0; i < n; i++) {
    let nx, nz;
    if (i === 0) [nx, nz] = segN[0];
    else if (i === n - 1) [nx, nz] = segN[n - 2];
    else {
      let ax = segN[i - 1][0] + segN[i][0];
      let az = segN[i - 1][1] + segN[i][1];
      const L = Math.hypot(ax, az) || 1;
      ax /= L; az /= L;
      const dot = ax * segN[i][0] + az * segN[i][1];
      const m = Math.min(1 / Math.max(dot, 0.3), 3);
      nx = ax * m; nz = az * m;
    }
    pos.push(pts[i][0] + nx * hw, y, pts[i][1] + nz * hw, pts[i][0] - nx * hw, y, pts[i][1] - nz * hw);
  }
  const idx = [];
  for (let i = 0; i < n - 1; i++) {
    const a = i * 2;
    idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function toShape(outer, holes) {
  // Shape lives in XY; after rotateX(-90deg) shape.y becomes -world z, so feed (x, -z).
  const shape = new THREE.Shape(outer.map(([x, z]) => new THREE.Vector2(x * S, -z * S)));
  for (const h of holes || []) shape.holes.push(new THREE.Path(h.map(([x, z]) => new THREE.Vector2(x * S, -z * S))));
  return shape;
}

/** Flat polygon (NU points) at height y, optional holes. */
export function flatPolygon(outer, holes, y) {
  const g = new THREE.ShapeGeometry(toShape(outer, holes));
  g.rotateX(-Math.PI / 2);
  g.translate(0, y, 0);
  return g;
}

/** Extruded polygon (NU points), flat roof, height in world units. Groups: 0 caps, 1 sides. */
export function extrudedPolygon(outer, holes, height) {
  const g = new THREE.ExtrudeGeometry(toShape(outer, holes), { depth: height, bevelEnabled: false });
  g.rotateX(-Math.PI / 2);
  return g;
}

export function circlePolygon(center, radiusNU, segs = 48) {
  const pts = [];
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    pts.push([center[0] + Math.cos(a) * radiusNU, center[1] + Math.sin(a) * radiusNU]);
  }
  return pts;
}

export function polygonCentroid(pts) {
  let a = 0, cx = 0, cz = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x0, z0] = pts[i];
    const [x1, z1] = pts[(i + 1) % pts.length];
    const f = x0 * z1 - x1 * z0;
    a += f; cx += (x0 + x1) * f; cz += (z0 + z1) * f;
  }
  if (Math.abs(a) < 1e-12) return [pts[0][0], pts[0][1]];
  return [cx / (3 * a), cz / (3 * a)];
}

export function polygonArea(pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x0, z0] = pts[i];
    const [x1, z1] = pts[(i + 1) % pts.length];
    a += x0 * z1 - x1 * z0;
  }
  return Math.abs(a) / 2;
}

export function pointInPolygon(x, z, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i];
    const [xj, zj] = poly[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

export function bbox(pts) {
  let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
  for (const [x, z] of pts) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); }
  return { minX, minZ, maxX, maxZ };
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
