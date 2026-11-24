import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { plainGeometry } from './Builder.js';

/** Extruded polygon in metres; result stands on y=0 and rises by `depth`. Points are [x,z]. */
export function extrudePoly(outer, holes, depth) {
  const shape = new THREE.Shape(outer.map(([x, z]) => new THREE.Vector2(x, -z)));
  for (const h of holes || []) shape.holes.push(new THREE.Path(h.map(([x, z]) => new THREE.Vector2(x, -z))));
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  g.rotateX(-Math.PI / 2);
  return g;
}

export function flatPoly(outer, holes, y = 0) {
  const shape = new THREE.Shape(outer.map(([x, z]) => new THREE.Vector2(x, -z)));
  for (const h of holes || []) shape.holes.push(new THREE.Path(h.map(([x, z]) => new THREE.Vector2(x, -z))));
  const g = new THREE.ShapeGeometry(shape);
  g.rotateX(-Math.PI / 2);
  g.translate(0, y, 0);
  return g;
}

/** Box with explicit extents in the LOCAL facade frame (x along the wall, y up, z inward). */
export function boxGeo(x0, x1, y0, y1, z0, z1) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return g;
}

const bayCache = new Map();

/** Wall bay: a w x h slab of thickness t with an optional opening (rect or arch). Local frame: x along, y up, z inward. */
export function bayGeometry(w, h, t, op) {
  const key = `${w.toFixed(2)}|${h.toFixed(2)}|${t}|${op ? `${op.kind}:${op.ow.toFixed(2)}:${op.oh.toFixed(2)}:${op.y0.toFixed(2)}` : '-'}`;
  let g = bayCache.get(key);
  if (g) return { key, geo: g };
  const s = new THREE.Shape();
  s.moveTo(0, 0); s.lineTo(w, 0); s.lineTo(w, h); s.lineTo(0, h); s.closePath();
  if (op) {
    const x0 = (w - op.ow) / 2, x1 = x0 + op.ow, y0 = op.y0, y1 = y0 + op.oh;
    const hole = new THREE.Path();
    if (op.kind === 'arch') {
      const r = op.ow / 2, yc = y1 - r;
      hole.moveTo(x0, y0); hole.lineTo(x1, y0); hole.lineTo(x1, yc);
      hole.absarc((x0 + x1) / 2, yc, r, 0, Math.PI, false);
      hole.lineTo(x0, y0);
    } else {
      hole.moveTo(x0, y0); hole.lineTo(x1, y0); hole.lineTo(x1, y1); hole.lineTo(x0, y1); hole.closePath();
    }
    s.holes.push(hole);
  }
  g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false, curveSegments: 6 });
  bayCache.set(key, g);
  return { key, geo: g };
}

const unitCache = new Map();

/** Frame + glass geometry for an opening, in the bay's local frame (centred on the bay). */
export function openingUnit(w, op) {
  const key = `${w.toFixed(2)}|${op.kind}:${op.ow.toFixed(2)}:${op.oh.toFixed(2)}:${op.y0.toFixed(2)}:${op.door ? 'd' : 'w'}`;
  let u = unitCache.get(key);
  if (u) return { key, ...u };
  const x0 = (w - op.ow) / 2, x1 = x0 + op.ow, y0 = op.y0, y1 = y0 + op.oh;
  const ft = 0.07, zf0 = 0.1, zf1 = 0.24;
  const frame = [];
  if (op.kind === 'arch') {
    // arched window: glass follows the arch, frame is a jamb pair + sill
    frame.push(boxGeo(x0, x0 + ft, y0, y1 - op.ow / 2, zf0, zf1), boxGeo(x1 - ft, x1, y0, y1 - op.ow / 2, zf0, zf1), boxGeo(x0, x1, y0, y0 + ft, zf0, zf1));
    const sill = boxGeo(x0 - 0.1, x1 + 0.1, y0 - 0.07, y0, -0.12, 0.2);
    frame.push(sill);
    const r = op.ow / 2, yc = y1 - r;
    const sh = new THREE.Shape();
    sh.moveTo(x0, y0); sh.lineTo(x1, y0); sh.lineTo(x1, yc); sh.absarc((x0 + x1) / 2, yc, r, 0, Math.PI, false); sh.lineTo(x0, y0);
    const glass = new THREE.ExtrudeGeometry(sh, { depth: 0.03, bevelEnabled: false, curveSegments: 10 });
    glass.translate(0, 0, 0.15);
    const arch = new THREE.TorusGeometry(r, ft / 2, 6, 12, Math.PI);
    arch.translate((x0 + x1) / 2, yc, 0.17);
    frame.push(arch);
    u = { frame: mergeGeometries(frame.map(plainGeometry)), glass };
  } else {
    // jambs, head, sill, transom/mullion
    frame.push(boxGeo(x0, x0 + ft, y0, y1, zf0, zf1), boxGeo(x1 - ft, x1, y0, y1, zf0, zf1), boxGeo(x0, x1, y1 - ft, y1, zf0, zf1));
    if (op.door) {
      frame.push(boxGeo(x0, x1, y0, y0 + 0.05, zf0 - 0.05, zf1));                     // threshold
      frame.push(boxGeo((x0 + x1) / 2 - ft / 2, (x0 + x1) / 2 + ft / 2, y0, y1, zf0, zf1)); // leaf split
      frame.push(boxGeo(x0, x1, y0 + 1.0, y0 + 1.06, zf0, zf1));                       // kick rail
    } else {
      frame.push(boxGeo(x0, x1, y0, y0 + ft, zf0, zf1));
      frame.push(boxGeo(x0 - 0.1, x1 + 0.1, y0 - 0.07, y0, -0.12, 0.2));              // projecting sill
      if (op.ow > 1.2) frame.push(boxGeo((x0 + x1) / 2 - ft / 2, (x0 + x1) / 2 + ft / 2, y0, y1, zf0, zf1));
    }
    u = { frame: mergeGeometries(frame.map(plainGeometry)), glass: boxGeo(x0 + ft, x1 - ft, y0 + (op.door ? 0.06 : ft), y1 - ft, 0.15, 0.18) };
  }
  unitCache.set(key, u);
  return { key, ...u };
}
