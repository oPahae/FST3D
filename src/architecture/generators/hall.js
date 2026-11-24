import * as THREE from 'three';

/**
 * White-roofed hall (two long white roofs beside the north service road in the satellite image).
 * Roof colour, ribbing and size are visible in the satellite; the gable profile, posts and wall panels are ASSUMED.
 */
export function generateHall(shared, bld, cfg) {
  const builder = shared.builder;
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  for (const p of shared.polysM(bld.id)) for (const [x, z] of p.outer) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  const L = x1 - x0, W = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const eave = cfg.eaveH ?? 4.6, ridge = cfg.ridgeH ?? 1.8;
  builder.box('concrete', cx, 0.15, cz, L + 0.6, 0.3, W + 0.6);
  builder.box('roofWhite', cx, eave / 2 + 0.3, z0 + 0.1, L, eave, 0.2);
  builder.box('roofWhite', cx, eave / 2 + 0.3, z1 - 0.1, L, eave, 0.2);
  builder.box('roofWhite', x0 + 0.1, eave / 2 + 0.3, cz, 0.2, eave, W);
  builder.box('roofWhite', x1 - 0.1, eave / 2 + 0.3, cz, 0.2, eave, W);
  const nb = Math.max(2, Math.round(L / 5));
  for (let i = 0; i <= nb; i++) {
    const x = x0 + (i / nb) * L;
    for (const z of [z0, z1]) builder.box('metal', x, eave / 2 + 0.3, z, 0.3, eave, 0.3);
  }
  const slope = Math.atan2(ridge, W / 2), slopeLen = Math.hypot(W / 2, ridge);
  const unit = new THREE.BoxGeometry(1, 1, 1);
  for (const s of [-1, 1]) {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-s * slope, 0, 0));
    builder.addGeometry('roofWhite', unit, new THREE.Matrix4().compose(new THREE.Vector3(cx, eave + 0.3 + ridge / 2, cz + s * W / 4), q, new THREE.Vector3(L + 0.4, 0.12, slopeLen + 0.3)));
    for (let i = 0; i <= nb * 2; i++) {
      const x = x0 + (i / (nb * 2)) * L;
      builder.addGeometry('metal', unit, new THREE.Matrix4().compose(new THREE.Vector3(x, eave + 0.3 + ridge / 2 + 0.1, cz + s * W / 4), q, new THREE.Vector3(0.1, 0.16, slopeLen + 0.35)));
    }
  }
  builder.box('metal', cx, eave + 0.3 + ridge + 0.05, cz, L + 0.5, 0.14, 0.2);
  shared.collision.addPolygon([[x0, z0], [x1, z0], [x1, z1], [x0, z1]], [], bld.id);
  return { info: { id: bld.id, topY: eave + ridge + 0.3, passages: 0, arcades: 0, doors: 0, edges: 4 } };
}
