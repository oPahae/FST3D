import * as THREE from 'three';
import { mulberry32, hashString } from '../../world/geom.js';

/**
 * Rows of white tensile "umbrella" shades over parking bays (field photos "Boulevard entre white halls").
 * In the satellite they are the two long white ribbed roofs beside the north boulevard.
 * Each umbrella: a steel post with a flared head, a shallow pyramid membrane with a thin steel rim.
 * Bay size, post height and the cars are illustrative (the photos show the type, not the dimensions).
 */
export function generateCarport(shared, bld, cfg) {
  const b = shared.builder;
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  for (const p of shared.polysM(bld.id)) for (const [x, z] of p.outer) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  const swap = cfg.axis === 'z';            // v0.7c: carports along the north-south boulevard run along z
  const L = swap ? z1 - z0 : x1 - x0, W = swap ? x1 - x0 : z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const rows = Math.max(1, Math.round(W / 6)), rowD = W / rows;
  const nb = Math.max(2, Math.round(L / 5.6)), pitch = L / nb;
  const eave = cfg.eaveH ?? 2.7, rise = cfg.ridgeH ?? 1.1;
  const rng = mulberry32(hashString(bld.id));
  const carMats = ['carWhite', 'carDark', 'carGrey', 'carWhite'];
  // local frame: u along the long side, v across it
  const bx = (key, u, y, v, su, sy, sv) => (swap ? b.box(key, cx + v, y, cz + u, sv, sy, su) : b.box(key, cx + u, y, cz + v, su, sy, sv));

  bx('asphalt', 0, 0.04, 0, L, 0.08, W);
  for (let i = 0; i <= nb; i++) bx('trim', -L / 2 + i * pitch, 0.09, 0, 0.12, 0.02, W - 0.8);

  const cone = new THREE.ConeGeometry(1, 1, 4, 1, false); cone.rotateY(Math.PI / 4);
  const post = shared.collision;
  for (let r = 0; r < rows; r++) {
    const vc = -W / 2 + (r + 0.5) * rowD;
    for (let i = 0; i < nb; i++) {
      const uc = -L / 2 + (i + 0.5) * pitch;
      bx('metal', uc, eave / 2, vc, 0.24, eave, 0.24);
      bx('metal', uc, eave - 0.05, vc, 0.9, 0.12, 0.9);
      bx('metal', uc - 0.5, eave - 0.45, vc, 0.06, 1.0, 0.06);
      const su = (pitch - 0.25) / Math.SQRT2, sv = (rowD - 0.25) / Math.SQRT2;
      b.addGeometry('membrane', cone, new THREE.Matrix4().compose(new THREE.Vector3(swap ? cx + vc : cx + uc, eave + rise / 2, swap ? cz + uc : cz + vc), new THREE.Quaternion(), swap ? new THREE.Vector3(sv, rise, su) : new THREE.Vector3(su, rise, sv)));
      const hu = (pitch - 0.25) / 2, hv = (rowD - 0.25) / 2;
      bx('trim', uc, eave - 0.02, vc - hv, hu * 2, 0.1, 0.08);
      bx('trim', uc, eave - 0.02, vc + hv, hu * 2, 0.1, 0.08);
      bx('trim', uc - hu, eave - 0.02, vc, 0.08, 0.1, hv * 2);
      bx('trim', uc + hu, eave - 0.02, vc, 0.08, 0.1, hv * 2);
      post.addCircle(swap ? cx + vc : cx + uc, swap ? cz + uc : cz + vc, 0.3, 'carport-post');
      if (rng() < 0.5) {
        const mat = carMats[Math.floor(rng() * carMats.length)];
        const cl = 4.2, cw = 1.75, off = (rng() - 0.5) * 0.4;
        bx(mat, uc + off, 0.55, vc, cw, 0.6, cl);
        bx(mat, uc + off, 1.1, vc - 0.2, cw - 0.2, 0.55, cl * 0.5);
        bx('glass', uc + off, 1.1, vc - 0.2, cw - 0.1, 0.4, cl * 0.5 - 0.1);
        for (const s1 of [-1, 1]) for (const s2 of [-1, 1]) bx('black', uc + off + s1 * (cw / 2 - 0.05), 0.3, vc + s2 * 1.35, 0.22, 0.6, 0.6);
        const wu = uc + off, ex = swap ? cl : cw, ez = swap ? cw : cl, mx = swap ? cx + vc : cx + wu, mz = swap ? cz + wu : cz + vc;
        post.addPolygon([[mx - ez * 0 - (swap ? ex : cw) / 2, mz - (swap ? cw : cl) / 2], [mx + (swap ? ex : cw) / 2, mz - (swap ? cw : cl) / 2], [mx + (swap ? ex : cw) / 2, mz + (swap ? cw : cl) / 2], [mx - (swap ? ex : cw) / 2, mz + (swap ? cw : cl) / 2]], [], 'car');
      }
    }
  }
  return { info: { id: bld.id, topY: eave + rise, passages: 0, arcades: 0, doors: 0, edges: 0 } };
}
