import * as THREE from 'three';

/**
 * Glass gable greenhouse (field photo "Boulevard entre NW court bldg et IT Learning campus"): thin white frame,
 * glazed walls and roof, low plinth, double door at one end. In the satellite it is the small white-roofed strip beside the west road.
 */
export function generateGreenhouse(shared, bld, cfg) {
  const b = shared.builder;
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  for (const p of shared.polysM(bld.id)) for (const [x, z] of p.outer) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, W = x1 - x0, L = z1 - z0;     // long axis along z
  const eave = cfg.eaveH ?? 3.0, ridge = cfg.ridgeH ?? 2.4;
  b.box('concrete', cx, 0.2, cz, W + 0.3, 0.4, L + 0.3);
  const hw = W / 2;
  const slope = Math.atan2(ridge, hw), sl = Math.hypot(hw, ridge);
  const n = Math.max(3, Math.round(L / 3));
  // glazed walls
  b.box('glassHouse', cx - hw, 0.4 + eave / 2, cz, 0.04, eave, L);
  b.box('glassHouse', cx + hw, 0.4 + eave / 2, cz, 0.04, eave, L);
  b.box('glassHouse', cx, 0.4 + eave / 2, z0, W, eave, 0.04);
  b.box('glassHouse', cx, 0.4 + eave / 2, z1, W, eave, 0.04);
  // gable ends (rectangle up to the eave + two triangular halves approximated by stepped panes)
  for (const zz of [z0, z1]) for (let k = 0; k < 4; k++) {
    const t0 = k / 4, t1 = (k + 1) / 4, wk = W * (1 - (t0 + t1) / 2), hk = ridge * (t1 - t0);
    b.box('glassHouse', cx, 0.4 + eave + ridge * (t0 + t1) / 2, zz, wk, hk, 0.04);
  }
  return buildRoofPanes(shared, b, { cx, cz, hw, L, eave, ridge, slope, sl, n, z0, z1 }, bld);
}

function buildRoofPanes(shared, b, g, bld) {
  const { cx, cz, hw, L, eave, ridge, slope, sl, n, z0, z1 } = g;
  const unit = new THREE.BoxGeometry(1, 1, 1);
  for (const sgn of [-1, 1]) {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, sgn * slope));
    b.addGeometry('glassHouse', unit, new THREE.Matrix4().compose(new THREE.Vector3(cx - sgn * hw / 2, 0.4 + eave + ridge / 2, cz), q, new THREE.Vector3(sl, 0.04, L)));
    // rafters
    for (let i = 0; i <= n; i++) {
      const z = z0 + (i / n) * L;
      b.addGeometry('frame', unit, new THREE.Matrix4().compose(new THREE.Vector3(cx - sgn * hw / 2, 0.4 + eave + ridge / 2 + 0.03, z), q, new THREE.Vector3(sl, 0.08, 0.08)));
      b.box('frame', cx + sgn * hw, 0.4 + eave / 2, z, 0.08, eave, 0.08);
    }
  }
  b.box('frame', cx, 0.4 + eave + ridge, cz, 0.1, 0.1, L);
  b.box('frame', cx - hw, 0.4 + eave, cz, 0.08, 0.08, L); b.box('frame', cx + hw, 0.4 + eave, cz, 0.08, 0.08, L);
  // door leaf at the south end
  b.box('frame', cx, 0.4 + 1.1, z1 + 0.03, 1.8, 2.2, 0.06);
  shared.collision.addPolygon([[cx - hw, z0], [cx + hw, z0], [cx + hw, z1], [cx - hw, z1]], [], bld.id);
  return { info: { id: bld.id, topY: 0.4 + eave + ridge, passages: 0, arcades: 0, doors: 1, edges: 4 } };
}
