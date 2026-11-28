import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeInteriorTextures, blobTexture } from './textures.js';

/** Material dictionary shared by the three interior worlds (one material per key, so the Kit can merge geometry per key). */
export function makeInteriorMaterials() {
  const T = makeInteriorTextures() || {};
  const m = {};
  const std = (key, color, o = {}) => {
    const map = o.map || null;
    const mat = new THREE.MeshStandardMaterial({ color: map ? 0xffffff : color, roughness: 0.8, metalness: 0, ...o, map });
    if (map) mat.userData.tile = map.userData.tile;
    mat.name = key; m[key] = mat; return mat;
  };
  const tinted = (key, color, tex, o = {}) => { const mat = std(key, color, { ...o, map: tex || null }); if (tex) mat.color.set(color); return mat; };

  std('floorLib', 0xd9cdb6, { map: T.floorLib, roughness: 0.22, metalness: 0.0 });
  std('ceilTile', 0xf2f1ec, { map: T.ceilTile, roughness: 0.95 });
  std('zellige', 0xffffff, { map: T.zellige, roughness: 0.28 });
  std('speckle', 0xb7b6af, { map: T.speckle, roughness: 0.97 });
  std('terrazzo', 0xc4c0b4, { map: T.terrazzo, roughness: 0.5 });
  std('tileGrey', 0xd3d1ca, { map: T.tileGrey, roughness: 0.45 });
  std('labFloor', 0xd7d5ce, { map: T.labFloor, roughness: 0.4 });
  std('woodPine', 0xa9611f, { map: T.woodPine, roughness: 0.65 });
  std('woodLight', 0xdcae72, { map: T.woodLight, roughness: 0.38 });
  std('concrete', 0xa3a29c, { map: T.concrete, roughness: 0.95 });
  std('wallWhite', 0xf1efea, { map: T.wallWhite, roughness: 0.92 });
  std('wallCream', 0xe3d9bd, { map: T.wallCream, roughness: 0.92 });
  std('wallYellow', 0xe9dcab, { map: T.wallYellow, roughness: 0.92 });
  std('curtainBrown', 0x6a3b22, { map: T.curtainBrown, roughness: 0.9, side: THREE.DoubleSide });
  std('curtainBlue', 0x1c3fb0, { map: T.curtainBlue, roughness: 0.9, side: THREE.DoubleSide });

  std('white', 0xf3f2ee, { roughness: 0.6 });
  std('whiteLam', 0xf6f5f1, { roughness: 0.35 });
  std('black', 0x1a1a1d, { roughness: 0.55 });
  std('blackGloss', 0x0d0d10, { roughness: 0.18, metalness: 0.2 });
  std('skirt', 0x17191c, { roughness: 0.7 });
  std('metalGrey', 0x8d9298, { roughness: 0.4, metalness: 0.6 });
  std('metalDark', 0x3b3f45, { roughness: 0.45, metalness: 0.55 });
  std('metalGreen', 0x2a6a4c, { roughness: 0.5, metalness: 0.45 });
  std('cabinetGrey', 0xb5b8bb, { roughness: 0.5, metalness: 0.35 });
  std('chairWood', 0xd9ad72, { roughness: 0.55 });
  std('chairWoodDark', 0x8a5a34, { roughness: 0.6 });
  std('frameAlu', 0xd4d7da, { roughness: 0.35, metalness: 0.7 });
  std('frameGreen', 0x2f6d4d, { roughness: 0.55 });
  std('doorGreen', 0x3a8a5e, { roughness: 0.55 });
  std('doorTeal', 0x4d8c92, { roughness: 0.6 });
  std('doorMint', 0x86c4a8, { roughness: 0.6 });
  std('counterWood', 0xb8622a, { roughness: 0.45 });
  std('deskDark', 0x2d1f17, { roughness: 0.4 });
  std('red', 0xc0392b, { roughness: 0.45 });
  std('lamp', 0xffffff, { emissive: 0xfff6e2, emissiveIntensity: 2.2, roughness: 0.5 });
  std('lampWarm', 0xffffff, { emissive: 0xffe9bb, emissiveIntensity: 1.6, roughness: 0.5 });
  std('daylight', 0xffffff, { emissive: 0xe9f3ff, emissiveIntensity: 2.4, roughness: 1 });
  std('screenOff', 0x07080b, { roughness: 0.12, metalness: 0.3 });
  std('glass', 0xbfdce8, { roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide });
  std('glassBlue', 0x9fc4d6, { roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide });
  std('paper', 0xf4f2ea, { roughness: 0.9 });
  std('cable', 0x15161a, { roughness: 0.7 });
  std('pcCase', 0x16171b, { roughness: 0.35, metalness: 0.4 });
  std('accentRed', 0xd0212c, { roughness: 0.4 });
  std('screenWhite', 0xf1f3f6, { roughness: 0.8, emissive: 0xdfe6ee, emissiveIntensity: 0.35 });
  std('bannerBlue', 0x3a3f9a, { roughness: 0.8 });
  std('floorBlob', 0x000000, { roughness: 1 });
  T.blob = blobTexture();
  return { mats: m, tex: T };
}

// ---------------------------------------------------------------------------------------------------------------------
const _box = new THREE.BoxGeometry(1, 1, 1).toNonIndexed();
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler();

/** Unit box with UVs in world metres (divided by the material's texture tile), scaled to sx,sy,sz and positioned at c. */
function boxGeo(tile, sx, sy, sz, cx, cy, cz, aligned) {
  const g = _box.clone();
  const pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) * sx, y = pos.getY(i) * sy, z = pos.getZ(i) * sz;
    const ax = Math.abs(nor.getX(i)), ay = Math.abs(nor.getY(i));
    const ox = aligned ? cx : 0, oy = aligned ? cy : 0, oz = aligned ? cz : 0;
    let u, v;
    if (ax > 0.5) { u = z + oz; v = y + oy; } else if (ay > 0.5) { u = x + ox; v = z + oz; } else { u = x + ox; v = y + oy; }
    uv.setXY(i, u / tile[0], v / tile[1]);
    pos.setXYZ(i, x, y, z);
  }
  return g;
}

/**
 * Collects geometry per material key and merges it (few draw calls); InstancedMesh batches for repeated parts.
 * Everything is axis-aligned or rotated about Y, like the rest of the project.
 */
export class Kit {
  constructor(mats, name = 'interior') {
    this.mats = mats; this.name = name;
    this.buckets = new Map(); this.batches = new Map();
    this.group = new THREE.Group(); this.group.name = name;
    this.extras = [];
  }
  _bucket(key) { if (!this.buckets.has(key)) this.buckets.set(key, []); return this.buckets.get(key); }
  tile(key) { return (this.mats[key] && this.mats[key].userData.tile) || [1, 1]; }

  /** Axis-aligned or Y-rotated box centred at (cx,cy,cz). */
  box(key, cx, cy, cz, sx, sy, sz, ry = 0) {
    const g = boxGeo(this.tile(key), sx, sy, sz, cx, cy, cz, !ry);
    _p.set(cx, cy, cz); _q.setFromEuler(_e.set(0, ry, 0)); _s.set(1, 1, 1);
    _m.compose(_p, _q, _s); g.applyMatrix4(_m);
    this._bucket(key).push(g);
  }
  /** Box spanning x0..x1, y0..y1, z0..z1. */
  span(key, x0, x1, y0, y1, z0, z1) { this.box(key, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0); }
  /** Arbitrary geometry (needs position + normal + uv). */
  geo(key, g, matrix) {
    let out = g.index ? g.toNonIndexed() : g.clone();
    if (!out.attributes.uv) out.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(out.attributes.position.count * 2), 2));
    for (const k of Object.keys(out.attributes)) if (!['position', 'normal', 'uv'].includes(k)) out.deleteAttribute(k);
    if (matrix) out.applyMatrix4(matrix);
    this._bucket(key).push(out);
  }
  cyl(key, cx, cy, cz, r, h, seg = 14, rTop = r) {
    this.geo(key, new THREE.CylinderGeometry(rTop, r, h, seg), new THREE.Matrix4().makeTranslation(cx, cy, cz));
  }
  /** Flat quad facing +Z (rotate with ry) with its own world-size UV 0..1. */
  mesh(obj) { obj.castShadow = false; obj.receiveShadow = false; this.group.add(obj); return obj; }

  /** Instanced part built from a list of boxes [sx,sy,sz,cx,cy,cz] (merged once per batch). */
  instance(batchKey, matKey, boxes, matrix) {
    let b = this.batches.get(batchKey);
    if (!b) {
      const geos = boxes.map(([sx, sy, sz, cx, cy, cz]) => { const g = boxGeo([1, 1], sx, sy, sz, cx, cy, cz, false); g.applyMatrix4(new THREE.Matrix4().makeTranslation(cx, cy, cz)); return g; });
      b = { geo: mergeGeometries(geos, false), matKey, mats: [] };
      this.batches.set(batchKey, b);
    }
    b.mats.push(matrix.clone());
  }
  place(batchKey, matKey, boxes, x, y, z, ry = 0, s = 1) {
    _p.set(x, y, z); _q.setFromEuler(_e.set(0, ry, 0)); _s.set(s, s, s);
    this.instance(batchKey, matKey, boxes, new THREE.Matrix4().compose(_p, _q, _s));
  }

  finish() {
    for (const [key, list] of this.buckets) {
      if (!list.length) continue;
      const merged = mergeGeometries(list, false);
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, this.mats[key]);
      mesh.name = `${this.name}:${key}`;
      mesh.castShadow = mesh.receiveShadow = false;
      this.group.add(mesh);
      for (const g of list) g.dispose();
    }
    for (const [key, b] of this.batches) {
      const im = new THREE.InstancedMesh(b.geo, this.mats[b.matKey], b.mats.length);
      b.mats.forEach((mm, i) => im.setMatrixAt(i, mm));
      im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere();
      im.name = `${this.name}:${key}`;
      this.group.add(im);
    }
    return this.group;
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Shared furniture / props
// ---------------------------------------------------------------------------------------------------------------------

/** Plywood shell chair with a hand-hole in the backrest and grey tubular legs (library). Faces +Z (seat front). */
export const CHAIR_LIB_WOOD = (() => {
  const L = [[0.42, 0.04, 0.42, 0, 0.45, 0]];
  const bz = -0.205;   // backrest plane
  L.push([0.42, 0.16, 0.025, 0, 0.67, bz], [0.42, 0.08, 0.025, 0, 0.85, bz], [0.13, 0.06, 0.025, -0.145, 0.76, bz], [0.13, 0.06, 0.025, 0.145, 0.76, bz]);
  return L;
})();
export const CHAIR_LIB_METAL = (() => {
  const L = [];
  for (const sx of [-1, 1]) { L.push([0.025, 0.43, 0.025, sx * 0.18, 0.215, 0.18], [0.025, 0.43, 0.025, sx * 0.18, 0.215, -0.17], [0.025, 0.025, 0.4, sx * 0.18, 0.12, 0.0], [0.025, 0.4, 0.025, sx * 0.19, 0.64, -0.22]); }
  L.push([0.36, 0.025, 0.025, 0, 0.2, 0.18]);
  return L;
})();

/** Simple classroom chair: wooden seat + back, dark metal frame (lab D04). Faces +Z. */
export const CHAIR_LAB_WOOD = [[0.4, 0.03, 0.4, 0, 0.45, 0], [0.38, 0.2, 0.02, 0, 0.72, -0.19]];
export const CHAIR_LAB_METAL = (() => {
  const L = [];
  for (const sx of [-1, 1]) { L.push([0.022, 0.44, 0.022, sx * 0.18, 0.22, 0.17], [0.022, 0.44, 0.022, sx * 0.18, 0.22, -0.17], [0.022, 0.5, 0.022, sx * 0.18, 0.7, -0.21], [0.022, 0.022, 0.36, sx * 0.18, 0.16, 0]); }
  L.push([0.36, 0.022, 0.022, 0, 0.3, -0.17], [0.36, 0.022, 0.022, 0, 0.94, -0.21]);
  return L;
})();

const _pm = new Map();
function pmat(hex, r = 0.75) { const k = hex + ':' + r; if (!_pm.has(k)) _pm.set(k, new THREE.MeshStandardMaterial({ color: hex, roughness: r })); return _pm.get(k); }

/**
 * Low-poly person for the interiors (same visual language as the player avatar): seated (hips at the seat) or standing.
 * Origin = floor under the hips, faces +Z.
 */
export function makePerson({ top = 0x3a5a9a, bottom = 0x2a2f3a, skin = 0xd9b08c, hair = 0x2a1d14, hijab = null, seated = true, shoes = 0xf0f0ee, bag = null, armsForward = 0.35 } = {}) {
  const g = new THREE.Group();
  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.scale.set(sx, sy, sz); g.add(o); return o; };
  const cap = (r, l) => new THREE.CapsuleGeometry(r, l, 3, 8), sph = (r) => new THREE.SphereGeometry(r, 12, 9);
  const hipY = seated ? 0.47 : 0.93;
  const mTop = pmat(top), mBot = pmat(bottom), mSkin = pmat(skin, 0.6), mShoe = pmat(shoes, 0.5);
  add(cap(0.165, 0.3), mTop, 0, hipY + 0.3, 0, 0, 0, 0, 1.12, 1, 0.74);            // torso
  add(cap(0.05, 0.05), mSkin, 0, hipY + 0.68, 0);                                 // neck
  const headY = hipY + 0.82;
  add(sph(0.115), mSkin, 0, headY, 0.01, 0, 0, 0, 0.92, 1.08, 1);                 // head
  if (hijab != null) {
    add(sph(0.135), pmat(hijab, 0.8), 0, headY + 0.015, -0.008, 0, 0, 0, 0.95, 1.05, 1.02);
    add(new THREE.ConeGeometry(0.2, 0.34, 14, 1, true), pmat(hijab, 0.85), 0, hipY + 0.6, -0.02, 0, 0, 0, 1.1, 1, 0.9).material.side = THREE.DoubleSide;
    add(sph(0.095), mSkin, 0, headY - 0.005, 0.06, 0, 0, 0, 0.9, 1.0, 0.7);        // face opening
  } else add(new THREE.SphereGeometry(0.122, 12, 9, 0, 6.283, 0, 1.75), pmat(hair, 0.9), 0, headY + 0.01, -0.005, 0, 0, 0, 0.95, 1.05, 1.0);
  const arm = (sx) => {
    if (seated) {   // upper arm hangs, forearm reaches forward onto the desk
      add(cap(0.052, 0.18), mTop, sx * 0.235, hipY + 0.48, 0.04, 0.35, 0, 0);
      add(cap(0.045, 0.2), mTop, sx * 0.235, hipY + 0.3, 0.2, 1.45, 0, 0);
      add(sph(0.05), mSkin, sx * 0.235, hipY + 0.27, 0.34);
    } else {
      add(cap(0.052, 0.3), mTop, sx * 0.25, hipY + 0.34, 0, 0, 0, sx * 0.05);
      add(sph(0.05), mSkin, sx * 0.26, hipY + 0.06, 0);
    }
  };
  arm(-1); arm(1);
  for (const sx of [-1, 1]) {
    if (seated) {
      add(cap(0.085, 0.3), mBot, sx * 0.1, hipY - 0.02, 0.2, 1.5708, 0, 0);       // thigh
      add(cap(0.07, 0.3), mBot, sx * 0.1, hipY - 0.25, 0.42);                       // shin
      add(new THREE.BoxGeometry(0.11, 0.07, 0.25), mShoe, sx * 0.1, 0.04, 0.5);
    } else {
      add(cap(0.085, 0.62), mBot, sx * 0.1, hipY - 0.45, 0);
      add(new THREE.BoxGeometry(0.11, 0.07, 0.26), mShoe, sx * 0.1, 0.04, 0.05);
    }
  }
  if (bag != null) add(new THREE.BoxGeometry(0.3, 0.38, 0.12), pmat(bag), 0, hipY + 0.34, -0.2);
  return g;
}

/** Soft dark blob under furniture (cheap contact shadow). */
export function blobShadow(tex, w, d, x, z, y = 0.012, opacity = 0.5) {
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity, depthWrite: false });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.renderOrder = 1;
  return m;
}
