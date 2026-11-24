import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _e = new THREE.Euler();

let _unitBox;
function unitBox() {
  if (!_unitBox) {
    _unitBox = new THREE.BoxGeometry(1, 1, 1).toNonIndexed();
    _unitBox.deleteAttribute('uv');
  }
  return _unitBox;
}

export function plainGeometry(g) {
  let out = g.index ? g.toNonIndexed() : g;
  if (out === g) out = g.clone();
  if (out.attributes.uv) out.deleteAttribute('uv');
  for (const k of Object.keys(out.attributes)) if (!['position', 'normal'].includes(k)) out.deleteAttribute(k);
  out.clearGroups();
  return out;
}

/** Matrix from an origin and a right-handed basis (x, y, z axes). */
export function basis(origin, x, y, z) {
  return new THREE.Matrix4().makeBasis(x, y, z).setPosition(origin);
}

/**
 * Collects geometry per material key, merges it at the end (few draw calls),
 * and keeps InstancedMesh batches for repeated parts (wall bays, windows, columns, trees...).
 */
export class Builder {
  constructor(materials, { name = 'group', shadows = true } = {}) {
    this.mats = materials;
    this.name = name;
    this.shadows = shadows;
    this.buckets = new Map();   // matKey -> geometry[]
    this.batches = new Map();   // batchKey -> { geo, matKey, mats: Matrix4[] }
    this.stats = { boxes: 0, instances: 0 };
    this.yOff = 0;   // vertical offset applied to boxes (furniture standing on a terrace)
  }

  addGeometry(key, geo, matrix) {
    const g = plainGeometry(geo);
    if (matrix) g.applyMatrix4(matrix);
    if (!this.buckets.has(key)) this.buckets.set(key, []);
    this.buckets.get(key).push(g);
  }

  /** Axis-aligned box centred at (cx,cy,cz), rotated ry about Y. */
  box(key, cx, cy, cz, sx, sy, sz, ry = 0) {
    _p.set(cx, cy + this.yOff, cz);
    _q.setFromEuler(_e.set(0, ry, 0));
    _s.set(sx, sy, sz);
    _m.compose(_p, _q, _s);
    this.addGeometry(key, unitBox(), _m);
    this.stats.boxes++;
  }

  /** Box from floor level y0..y1 spanning a line (x0,z0)->(x1,z1) with the given thickness. */
  wallBox(key, x0, z0, x1, z1, y0, y1, thick) {
    const dx = x1 - x0, dz = z1 - z0;
    const L = Math.hypot(dx, dz);
    if (L < 1e-4) return;
    this.box(key, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, L, y1 - y0, thick, -Math.atan2(dz, dx));
  }

  /** Register (once) a geometry for instancing and add one instance. */
  instance(batchKey, matKey, makeGeo, matrix) {
    let b = this.batches.get(batchKey);
    if (!b) { b = { geo: plainGeometry(makeGeo()), matKey, mats: [] }; this.batches.set(batchKey, b); }
    b.mats.push(matrix.clone());
    this.stats.instances++;
  }

  finish() {
    const group = new THREE.Group();
    group.name = this.name;
    for (const [key, list] of this.buckets) {
      if (!list.length) continue;
      const merged = mergeGeometries(list, false);
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, this.mats[key]);
      mesh.castShadow = mesh.receiveShadow = this.shadows;
      mesh.name = `${this.name}:${key}`;
      group.add(mesh);
      for (const g of list) g.dispose();
    }
    for (const [key, b] of this.batches) {
      const im = new THREE.InstancedMesh(b.geo, this.mats[b.matKey], b.mats.length);
      b.mats.forEach((m, i) => im.setMatrixAt(i, m));
      im.instanceMatrix.needsUpdate = true;
      im.castShadow = im.receiveShadow = this.shadows;
      im.name = `${this.name}:${key}`;
      im.computeBoundingSphere();
      group.add(im);
    }
    return group;
  }
}
