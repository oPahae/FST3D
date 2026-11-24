import * as THREE from 'three';
import { mulberry32, hashString } from '../../world/geom.js';

/**
 * Interior of the Buvette, from the photo supplied by the user: light tiled floor, suspended white ceiling with
 * light panels, a service counter with snack racks and a TV at the far end, a pool table (white/grey-wood sides,
 * green cloth, coloured balls) in the middle, dark tables with black chairs along the walls.
 * Returns the walkable cut-outs for the collision world (the room + the entrance alcove).
 */
export function cafeInterior(shared, bld, poly, edges, ctx) {
  const b = shared.builder, col = shared.collision, cfg = ctx.cfg;
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  for (const [x, z] of poly.outer) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  const H = cfg.groundH;
  const eE = edges.find((e) => e.side === 'E' && !e.party && e.openings.some((o) => o.kind === 'door'));
  const gd = (eE && eE.style && eE.style.arcadeDepth) || 3.0;
  const door = eE ? eE.openings.find((o) => o.kind === 'door') : null;
  const zDoor = eE && door ? eE.a[1] + eE.d[1] * door.u : (z0 + z1) / 2;
  const rx0 = x0 + 0.45, rx1 = x1 - gd - 0.45, rz0 = z0 + 0.45, rz1 = z1 - 0.45;
  const cx = (rx0 + rx1) / 2, rw = rx1 - rx0, rl = rz1 - rz0;
  const rng = mulberry32(hashString(bld.id));
  const rect = (a, c, d, e2) => [[a, d], [c, d], [c, e2], [a, e2]];
  const solid = (a, c, d, e2) => col.addPolygon(rect(a, c, d, e2), [], 'buvette-furniture');

  // floor and ceiling
  b.box('floorTile', cx, 0.04, (rz0 + rz1) / 2, rw, 0.08, rl);
  b.box('floorTile', (rx1 + x1 - 0.45) / 2, 0.04, zDoor, (x1 - 0.45) - rx1 + 0.1, 0.08, 3.0);
  b.box('ceiling', cx, H - 0.3, (rz0 + rz1) / 2, rw, 0.06, rl);
  for (let k = 0; k < Math.floor(rl / 3.4); k++) for (const sx of [-1, 1]) b.box('lampHead', cx + sx * rw * 0.25, H - 0.34, rz0 + 2.0 + k * 3.4, 0.3, 0.03, 1.2);

  // service counter along the north wall, staff area behind it
  const cz = rz0 + 3.3;
  b.box('wood', cx, 0.52, cz, rw - 0.2, 1.04, 0.7);
  b.box('stone', cx, 1.08, cz, rw - 0.1, 0.07, 0.85);
  b.box('turqDark', rx1 - 1.3, 1.5, rz0 + 1.4, 2.2, 3.0, 1.2);                                  // blue cashier booth (photo)
  b.box('glass', rx1 - 1.3, 1.7, rz0 + 2.02, 1.5, 0.9, 0.04);
  solid(rx0, rx1, rz0, cz + 0.45);
  // snack racks on the north wall
  const palette = ['wallRed', 'stripeY', 'turq', 'frameGreen', 'wall', 'brick'];
  for (let r = 0; r < 3; r++) {
    const rxc = rx0 + 1.5 + r * 2.5;
    b.box('frame', rxc, 1.0, rz0 + 0.3, 2.1, 2.0, 0.4);
    for (let sh = 0; sh < 4; sh++) for (let k = 0; k < 7; k++) b.box(palette[Math.floor(rng() * palette.length)], rxc - 0.9 + k * 0.3, 0.3 + sh * 0.48, rz0 + 0.45, 0.22, 0.3, 0.12);
  }
  b.box('black', cx - 1.0, 2.7, rz0 + 0.1, 1.5, 0.85, 0.08);                                   // TV on the wall (photo)
  b.box('glass', cx - 1.0, 2.7, rz0 + 0.16, 1.4, 0.75, 0.02);
  // fridge + water cooler near the booth
  b.box('frame', rx0 + 0.6, 0.9, rz0 + 2.6, 0.7, 1.8, 0.7);
  b.box('frame', rx1 - 0.4, 0.55, cz + 1.3, 0.35, 1.1, 0.35); b.box('glass', rx1 - 0.4, 1.3, cz + 1.3, 0.25, 0.4, 0.25);
  col.addCircle(rx1 - 0.4, cz + 1.3, 0.3, 'cooler');

  // pool table, long axis along z
  const pz = cz + 6.0, TL = 2.8, TW = 1.55;
  b.box('poolWood', cx, 0.4, pz, TW, 0.8, TL);
  b.box('poolFelt', cx, 0.86, pz, TW - 0.34, 0.04, TL - 0.34);
  for (const s of [-1, 1]) { b.box('poolWood', cx + s * (TW / 2 - 0.08), 0.86, pz, 0.16, 0.12, TL); b.box('poolWood', cx, 0.86, pz + s * (TL / 2 - 0.08), TW, 0.12, 0.16); }
  for (const sx of [-1, 1]) for (const sz of [-1, 0, 1]) b.box('black', cx + sx * (TW / 2 - 0.1), 0.92, pz + sz * (TL / 2 - 0.1) * (sz === 0 ? 0 : 1), 0.14, 0.05, 0.14);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box('metal', cx + sx * (TW / 2 - 0.04), 0.88, pz + sz * (TL / 2 - 0.04), 0.2, 0.1, 0.2);
  b.box('metal', cx, 0.1, pz, 0.5, 0.2, 1.2);
  const ballGeo = () => new THREE.SphereGeometry(0.03, 8, 6);
  const balls = [['ballW', 0, 0.7], ['ballY', -0.07, -0.5], ['ballR', 0.07, -0.5], ['ballY', 0, -0.57], ['ballR', -0.14, -0.57], ['ballY', 0.14, -0.57], ['ballR', -0.07, -0.64], ['ballY', 0.07, -0.64], ['ballR', -0.21, -0.64], ['ballY', 0.21, -0.64], ['ballR', 0, -0.71]];
  for (const [m, dx, dz] of balls) b.instance(`ball|${m}`, m, ballGeo, new THREE.Matrix4().makeTranslation(cx + dx, 0.91, pz + dz));
  solid(cx - TW / 2 - 0.15, cx + TW / 2 + 0.15, pz - TL / 2 - 0.15, pz + TL / 2 + 0.15);

  // tables with four black chairs
  const table = (x, z) => {
    b.box('wood', x, 0.76, z, 1.1, 0.04, 0.75);
    b.box('metal', x, 0.38, z, 0.12, 0.76, 0.12);
    for (const [dx, dz] of [[-0.75, 0], [0.75, 0]]) { b.box('black', x + dx, 0.45, z + dz, 0.42, 0.05, 0.42); b.box('black', x + dx + Math.sign(dx) * 0.2, 0.7, z + dz, 0.05, 0.45, 0.42); }
    for (const dz of [-0.55, 0.55]) { b.box('black', x, 0.45, z + dz, 0.42, 0.05, 0.42); b.box('black', x, 0.7, z + dz + Math.sign(dz) * 0.2, 0.42, 0.45, 0.05); }
    col.addCircle(x, z, 0.8, 'table');
  };
  for (let z = cz + 2.2; z < rz1 - 1.2; z += 3.2) { if (Math.abs(z - pz) < 2.4) continue; table(rx0 + 1.35, z); }
  for (let z = cz + 2.2; z < rz1 - 1.2; z += 3.2) { if (Math.abs(z - pz) < 2.4) continue; table(rx1 - 1.35, z); }
  for (const dx of [-1.9, 1.9]) table(cx + dx, cz + 2.4);

  // lights
  for (let k = 0; k < 3; k++) { const l = new THREE.PointLight(0xfff0dc, 22, 14, 1.6); l.position.set(cx, H - 0.9, rz0 + rl * (0.2 + k * 0.3)); shared.extras.push(l); }

  return { cuts: [rect(rx0, rx1, rz0, rz1), rect(rx1 - 0.1, x1 + 0.3, zDoor - 1.3, zDoor + 1.3)] };
}
