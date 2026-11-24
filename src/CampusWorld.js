import * as THREE from 'three';
import { CONFIG } from './config.js';
import { CollisionWorld } from './gameplay/CollisionWorld.js';
import { buildArchitecture } from './architecture/ArchitectureWorld.js';
import { buildEnvironment } from './environment/Environment.js';
import { buildLabels } from './world/labels.js';
import { polygonArea, polygonCentroid } from './world/geom.js';

/**
 * Whole campus: architecture (decorative) + environment (decorative) + collision (separate) + labels.
 * Geography comes only from the layout; configs/generators decide the architecture.
 */
export function buildCampus(layout, { doc } = {}) {
  const S = CONFIG.unitsPerNU;
  const collision = new CollisionWorld();
  const arch = buildArchitecture(layout, collision);
  collision.finalize();
  const env = buildEnvironment(layout, collision, arch.shared);

  const root = new THREE.Group();
  root.name = 'campus';
  root.add(env.group, arch.group);

  const entries = layout.buildings.map((b) => {
    let best = b.polys[0];
    for (const p of b.polys) if (polygonArea(p.outer) > polygonArea(best.outer)) best = p;
    const [cx, cz] = polygonCentroid(best.outer);
    const info = arch.infos.get(b.id);
    return { data: b, anchor: [cx * S, cz * S], topY: info ? info.topY : 8, info, config: info ? info.config : null };
  });
  const labels = buildLabels(layout, entries, doc);
  root.add(labels.group);

  const e = layout.extent;
  const extentWorld = { x0: e.minX * S, x1: e.maxX * S, z0: e.minZ * S, z1: e.maxZ * S };
  const gate = layout.gates[0];
  const entrance = gate ? [gate.position[0] * S, gate.position[1] * S] : [0, extentWorld.z1];

  return { root, layout, collision, arch, env, labels, entries, extentWorld, entrance, stats: { ...arch.stats, ...env.stats } };
}

/** Collision debug lines (red = solids, orange = circles, blue = walkable raised surfaces). */
export function buildCollisionDebug(collision) {
  const group = new THREE.Group();
  group.name = 'collision-debug';
  const lines = (segs, color, y) => {
    const pos = [];
    for (const [x0, z0, x1, z1] of segs) pos.push(x0, y, z0, x1, y, z1);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color, depthTest: false, transparent: true }));
    l.renderOrder = 10; group.add(l);
  };
  lines(collision.solids.flatMap((s) => s.edges), 0xff2020, 0.6);
  const circ = [];
  for (const c of collision.circles) for (let i = 0; i < 8; i++) { const a0 = (i / 8) * 6.2832, a1 = ((i + 1) / 8) * 6.2832; circ.push([c.x + Math.cos(a0) * c.r, c.z + Math.sin(a0) * c.r, c.x + Math.cos(a1) * c.r, c.z + Math.sin(a1) * c.r]); }
  lines(circ, 0xff9a00, 0.6);
  const surf = [];
  for (const s of collision.surfaces) for (let i = 0; i < s.poly.length; i++) { const a = s.poly[i], b = s.poly[(i + 1) % s.poly.length]; surf.push([a[0], a[1], b[0], b[1]]); }
  lines(surf, 0x3080ff, 0.6);
  group.visible = false;
  return group;
}
