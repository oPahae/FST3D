import { terrainModel } from '../environment/terrain.js';
import { CONFIG } from '../config.js';
import { makeMaterials } from './materials.js';
import { Builder } from './Builder.js';
import { configFor } from './configs/index.js';
import { generateBlock } from './generators/block.js';
import { generateHall } from './generators/hall.js';
import { generateCarport } from './generators/carport.js';
import { generateGreenhouse } from './generators/greenhouse.js';
import { pointInPolygon } from '../world/geom.js';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Make every textured geometry mergeable: non-indexed, position + normal + uv only. */
function normTex(g) {
  let out = g.index ? g.toNonIndexed() : g;
  if (!out.attributes.normal) out.computeVertexNormals();
  for (const k of Object.keys(out.attributes)) if (!['position', 'normal', 'uv'].includes(k)) out.deleteAttribute(k);
  return out;
}

const GENERATORS = { block: generateBlock, hall: generateHall, carport: generateCarport, greenhouse: generateGreenhouse };

/**
 * Builds every building of the layout from its own architecture config.
 * Decorative geometry goes to the returned group, collision geometry to `collision` (separate objects).
 */
export function buildArchitecture(layout, collision) {
  const S = CONFIG.unitsPerNU;
  const toM = ([x, z]) => [x * S, z * S];
  const mats = makeMaterials();

  const polys = new Map();
  const bbs = new Map();
  for (const b of layout.buildings) {
    const ps = b.polys.map((p) => ({ outer: p.outer.map(toM), holes: p.holes.map((h) => h.map(toM)) }));
    polys.set(b.id, ps);
    let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
    for (const p of ps) for (const [x, z] of p.outer) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    bbs.set(b.id, { x0, z0, x1, z1 });
  }

  const court = (id) => { const c = layout.courtyards.find((q) => q.id === id); return c && c.polygon ? c.polygon.map(toM) : null; };
  const garden = court('C_CENTRAL');
  const innerCourts = layout.courtyards.filter((c) => c.buildingCourt && c.polygon).map((c) => c.polygon.map(toM));
  let gb = null;
  if (garden) { gb = { x0: Infinity, z0: Infinity, x1: -Infinity, z1: -Infinity }; for (const [x, z] of garden) { gb.x0 = Math.min(gb.x0, x); gb.x1 = Math.max(gb.x1, x); gb.z0 = Math.min(gb.z0, z); gb.z1 = Math.max(gb.z1, z); } }
  const GZ = 12; // metres: faces within this distance of the garden count as garden-facing

  const builder = new Builder(mats, { name: 'architecture' });
  const shared = {
    mats, collision, layout, builder, tiles: [], extras: [], texMap: {},
    /** Textured geometry (needs UVs, so it bypasses the Builder): one merged mesh per material key. */
    texList(key) { return (this.texMap[key] ||= []); },
    nuToM: toM,
    polysM: (id) => polys.get(id) || [],
    faceAt: (x, z) => {
      for (const c of innerCourts) if (pointInPolygon(x, z, c)) return 'court';
      if (gb && x > gb.x0 - GZ && x < gb.x1 + GZ && z > gb.z0 - GZ && z < gb.z1 + GZ) return 'garden';
      return 'outer';
    },
    otherSolidAt: (selfId, x, z) => {
      for (const [id, ps] of polys) {
        if (id === selfId || id === 'BUVETTE_PROFS' || selfId === 'BUVETTE_PROFS') continue;   // v0.7e: the staff buvette must not erase the walls of the buildings it touches
        const bb = bbs.get(id);
        if (x < bb.x0 || x > bb.x1 || z < bb.z0 || z > bb.z1) continue;
        for (const p of ps) if (pointInPolygon(x, z, p.outer) && !p.holes.some((h) => pointInPolygon(x, z, h))) return true;
      }
      return false;
    },
    passagesFor: (id) => layout.passages.filter((p) => p.building === id).map((p) => ({ id: p.id, p: toM(p.p), q: toM(p.q), width: p.widthNU * S, arch: p.arch, style: p.style, floor: p.floor, portal: p.portal })),
    roofFeaturesFor: (id) => layout.roofFeatures.filter((f) => f.building === id).map((f) => ({ type: f.type, polygon: f.polygon.map(toM) })),
  };

  const infos = new Map();
  for (const b of layout.buildings) {
    const cfg = configFor(b.id);
    const gen = GENERATORS[cfg.generator] || generateBlock;
    shared.baseY = terrainModel(layout).baseYFor(b.id);   // floor level of buildings that stand on a terrace
    shared.tiles = shared.texList(cfg.roofTile || 'tile');
    // everything a generator emits is built from y = 0; buildings standing on a terrace are lifted afterwards so their walls start at the
    // terrace floor (v0.7b: before, the lower storey was buried in the terrace), and a podium fills the space below
    const lenB = new Map([...builder.buckets].map(([k, l]) => [k, l.length])), lenI = new Map([...builder.batches].map(([k, v]) => [k, v.mats.length]));
    const lenT = new Map(Object.entries(shared.texMap).map(([k, l]) => [k, l.length])), lenX = shared.extras.length;
    const res = gen(shared, b, cfg);
    if (shared.baseY) {
      const y = shared.baseY;
      for (const [k, l] of builder.buckets) for (let i = lenB.get(k) || 0; i < l.length; i++) l[i].translate(0, y, 0);
      for (const [k, v] of builder.batches) for (let i = lenI.get(k) || 0; i < v.mats.length; i++) v.mats[i].elements[13] += y;
      for (const [k, l] of Object.entries(shared.texMap)) for (let i = lenT.get(k) || 0; i < l.length; i++) l[i].translate(0, y, 0);
      for (let i = lenX; i < shared.extras.length; i++) shared.extras[i].position.y += y;
      for (const pl of shared.polysM(b.id)) for (const ring of [pl.outer, ...(pl.holes || [])]) for (let i = 0; i < ring.length; i++) { const a = ring[i], c = ring[(i + 1) % ring.length]; builder.wallBox('concrete', a[0], a[1], c[0], c[1], 0, y + 0.05, 0.5); }
    }
    infos.set(b.id, { ...res.info, config: cfg });
  }
  const group = builder.finish();
  group.name = 'architecture';
  shared.texMap.tile = shared.texMap.tile || [];
  for (const [key, list] of Object.entries(shared.texMap)) {
    if (!list.length) continue;
    const merged = mergeGeometries(list.map(normTex), false);
    const mesh = new THREE.Mesh(merged, mats[key]);
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.name = `architecture:${key}`;
    group.add(mesh);
  }
  for (const o of shared.extras) group.add(o);
  return { group, infos, shared, stats: builder.stats };
}
