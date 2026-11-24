import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { plainGeometry } from '../architecture/Builder.js';
import { mulberry32, hashString, pointInPolygon, circlePolygon } from '../world/geom.js';

let palmGeos, treeGeos;

function frond(len, width, droop, segs = 6) {
  const pos = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const r = len * t, y = Math.sin(t * 1.6) * len * 0.22 - droop * t * t * len * 0.55;
    const w = width * (1 - t * 0.85) * (t < 0.1 ? 0.5 + t * 5 : 1);
    pos.push(r, y, -w / 2, r, y, w / 2);
  }
  for (let i = 0; i < segs; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function palmGeometries() {
  if (palmGeos) return palmGeos;
  const H = 7.2;
  const trunk = new THREE.CylinderGeometry(0.2, 0.34, H, 8);
  trunk.translate(0, H / 2, 0);
  const fr = [];
  const n = 11;
  for (let i = 0; i < n; i++) {
    const f = frond(3.4 + (i % 3) * 0.35, 0.75, 0.9 + (i % 2) * 0.4);
    f.rotateZ(0.25 - (i % 3) * 0.12);
    f.rotateY((i / n) * Math.PI * 2 + (i % 2) * 0.2);
    f.translate(0, H, 0);
    fr.push(plainGeometry(f));
  }
  const bulb = new THREE.SphereGeometry(0.4, 8, 6); bulb.translate(0, H + 0.1, 0); fr.push(plainGeometry(bulb));
  palmGeos = { trunk, crown: mergeGeometries(fr) };
  return palmGeos;
}

export function treeGeometries() {
  if (treeGeos) return treeGeos;
  const trunk = new THREE.CylinderGeometry(0.18, 0.28, 2.6, 7); trunk.translate(0, 1.3, 0);
  const c1 = new THREE.IcosahedronGeometry(2.1, 1); c1.scale(1, 0.85, 1); c1.translate(0, 4.0, 0);
  const c2 = new THREE.IcosahedronGeometry(1.4, 1); c2.scale(1, 0.85, 1); c2.translate(0.9, 3.4, 0.5);
  treeGeos = { trunk, crown: mergeGeometries([plainGeometry(c1), plainGeometry(c2)]) };
  return treeGeos;
}

/** Adds a palm / tree instance to the builder and a trunk collider. */
export function addPalm(b, collision, x, z, s, rot) {
  const g = palmGeometries();
  const m = new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rot, 0)), new THREE.Vector3(s, s, s));
  b.instance('palm|trunk', 'trunk', () => g.trunk, m);
  b.instance('palm|crown', 'palmLeaf', () => g.crown, m);
  b.instance('palm|paint', 'trim', () => new THREE.CylinderGeometry(0.255, 0.36, 1.3, 8).translate(0, 0.65, 0), m);   // whitewashed trunk base (seen on most palms in the photos)
  collision.addCircle(x, z, 0.38 * s, 'palm');
}
export function addTree(b, collision, x, z, s, rot, alt) {
  const g = treeGeometries();
  const m = new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rot, 0)), new THREE.Vector3(s, s, s));
  b.instance('tree|trunk', 'trunk', () => g.trunk, m);
  b.instance(alt ? 'tree|crown2' : 'tree|crown1', alt ? 'foliage2' : 'foliage', () => g.crown, m);
  collision.addCircle(x, z, 0.3 * s, 'tree');
}

/** Palms and trees from the layout vegetation zones. Species are limited to what the satellite shows (palms + round trees). */
export function plantZones(layout, b, collision, toM, stats) {
  const S = toM([1, 0])[0];
  // keep paths, roads and their margins clear of planting
  const lines = [];
  for (const p of layout.pathways) if (p.centerline) lines.push({ pts: p.centerline.map(toM), clear: Math.max((p.widthNU || 0.012) * S, 2.2) / 2 + 2.2 });
  for (const r of layout.roads) if (r.centerline) lines.push({ pts: r.centerline.map(toM), clear: ((r.widthNU || 0.04) * S) / 2 + (r.sidewalk || 0) * S + 1.5, avenue: true });
  const nearLine = (x, z, skipAvenue) => {
    for (const l of lines) {
      if (skipAvenue && l.avenue) continue;
      for (let i = 0; i < l.pts.length - 1; i++) {
        const [x0, z0] = l.pts[i], [x1, z1] = l.pts[i + 1];
        const dx = x1 - x0, dz = z1 - z0, L2 = dx * dx + dz * dz;
        const t = L2 ? Math.max(0, Math.min(1, ((x - x0) * dx + (z - z0) * dz) / L2)) : 0;
        if (Math.hypot(x - (x0 + dx * t), z - (z0 + dz * t)) < l.clear) return true;
      }
    }
    return false;
  };
  // v0.7c: no planting inside the inner courts of buildings (NW court, SE complex, ...) nor in the staff-buvette yard
  const noPlant = layout.courtyards.filter((c) => c.buildingCourt && c.polygon).map((c) => c.polygon.map(toM));
  for (const f of layout.features || []) if (f.type === 'buvette_profs_garden' || f.type === 'pepper_plaza') { const [a, c, d, e2] = f.rect.map((v) => v * S); noPlant.push([[a, c], [d, c], [d, e2], [a, e2]]); }
  const free = (x, z, r, avenue) => !collision.blocked(x, z, r) && !nearLine(x, z, avenue) && !noPlant.some((pl) => pointInPolygon(x, z, pl));
  for (const v of layout.vegetation) {
    const rng = mulberry32(hashString(v.id));
    if (v.type === 'palm_avenue' && v.line && v.line.length >= 2) {
      const a = toM(v.line[0]), c = toM(v.line[v.line.length - 1]);
      const L = Math.hypot(c[0] - a[0], c[1] - a[1]);
      const step = Math.max((v.spacingNU || 0.04) * S, 6.5);
      const n = Math.floor(L / step);
      for (let i = 0; i <= n; i++) {
        const t = n ? i / n : 0;
        const x = a[0] + (c[0] - a[0]) * t, z = a[1] + (c[1] - a[1]) * t;
        if (free(x, z, 1.2, true)) { addPalm(b, collision, x, z, 0.9 + rng() * 0.3, rng() * 6.28); stats.palms++; }
      }
    } else if (v.type === 'palm_garden' || v.type === 'palm_garden_rect' || v.type === 'mixed_grove') {
      const outer = (v.polygon || (v.circle ? circlePolygon(v.circle.center, v.circle.radiusNU * 0.92) : null));
      if (!outer) continue;
      const poly = outer.map(toM);
      let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
      for (const [x, z] of poly) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
      const palms = v.type !== 'mixed_grove';
      const per = palms ? 70 : 62;
      const n = Math.round(((x1 - x0) * (z1 - z0)) / per);
      let placed = 0;
      for (let t = 0; t < n * 5 && placed < n; t++) {
        const x = x0 + rng() * (x1 - x0), z = z0 + rng() * (z1 - z0);
        if (!pointInPolygon(x, z, poly) || !free(x, z, 2.2)) continue;
        if (!palms && rng() < 0.16) { addCypress(b, collision, x, z, 0.85 + rng() * 0.5); stats.trees++; }
        else if (palms || rng() < 0.18) { addPalm(b, collision, x, z, 0.8 + rng() * 0.45, rng() * 6.28); stats.palms++; }
        else { addTree(b, collision, x, z, 0.75 + rng() * 0.6, rng() * 6.28, rng() < 0.5); stats.trees++; }
        placed++;
      }
    }
  }
}


let fanGeos, cypressGeo, soilGeo;
function fanGeometries() {
  if (fanGeos) return fanGeos;
  const H = 2.3;
  const trunk = new THREE.CylinderGeometry(0.15, 0.24, H, 8); trunk.translate(0, H / 2, 0);
  const bl = [];
  const n = 20;
  for (let i = 0; i < n; i++) {
    const f = frond(2.2, 0.62, 0.3, 4);
    f.rotateZ(0.95 + (i % 2) * 0.25);        // fan blades point up and out
    f.rotateY((i / n) * Math.PI * 2);
    f.translate(0, H, 0);
    bl.push(plainGeometry(f));
  }
  fanGeos = { trunk, crown: mergeGeometries(bl) };
  return fanGeos;
}
function cypressGeometry() {
  if (cypressGeo) return cypressGeo;
  const c = new THREE.IcosahedronGeometry(1, 1); c.scale(0.95, 5.4, 0.95); c.translate(0, 5.6, 0);
  const c2 = new THREE.IcosahedronGeometry(1, 1); c2.scale(0.75, 3, 0.75); c2.translate(0.2, 2.6, 0.1);
  cypressGeo = mergeGeometries([plainGeometry(c), plainGeometry(c2)]);
  return cypressGeo;
}

/** Young fan palm planted in a lawn with a soil ring (photo 1). */
export function addFanPalm(b, collision, x, z, s, rot) {
  const g = fanGeometries();
  const m = new THREE.Matrix4().compose(new THREE.Vector3(x, 0.2, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rot, 0)), new THREE.Vector3(s, s, s));
  b.instance('fan|trunk', 'trunk', () => g.trunk, m);
  b.instance('fan|crown', 'fanPalm', () => g.crown, m);
  if (!soilGeo) { soilGeo = new THREE.CircleGeometry(0.95, 14); soilGeo.rotateX(-Math.PI / 2); soilGeo.translate(0, 0.01, 0); }
  b.instance('soil|disc', 'soil', () => soilGeo, new THREE.Matrix4().makeTranslation(x, 0.2, z));
  collision.addCircle(x, z, 0.25 * s, 'fanpalm');
}
/** Tall slender cypress (several appear in the photos, in pairs flanking the pavilion). */
export function addCypress(b, collision, x, z, s) {
  const g = cypressGeometry();
  b.instance('cypress', 'cypress', () => g, new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion(), new THREE.Vector3(s, s, s)));
  collision.addCircle(x, z, 0.55 * s, 'cypress');
}

let weepGeo;
/** Weeping tree (pepper tree / casuarina type, seen in the "Centre fst" photos): slim trunk, long drooping crown. */
export function addWeeping(b, collision, x, z, s) {
  if (!weepGeo) {
    const trunk = new THREE.CylinderGeometry(0.16, 0.26, 3.4, 7); trunk.translate(0, 1.7, 0);
    const crown = new THREE.ConeGeometry(2.5, 5.2, 9, 1); crown.translate(0, 4.0, 0);
    const top = new THREE.IcosahedronGeometry(1.7, 1); top.scale(1, 0.8, 1); top.translate(0, 6.3, 0);
    weepGeo = { trunk, crown: mergeGeometries([plainGeometry(crown), plainGeometry(top)]) };
  }
  const m = new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion(), new THREE.Vector3(s, s, s));
  b.instance('weep|trunk', 'trunk', () => weepGeo.trunk, m);
  b.instance('weep|crown', 'foliage2', () => weepGeo.crown, m);
  collision.addCircle(x, z, 0.35 * s, 'tree');
}
