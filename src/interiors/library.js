import * as THREE from 'three';
import { Interior } from './Interior.js';
import { mulberry32 } from '../world/geom.js';
import { makePerson, CHAIR_LIB_WOOD, CHAIR_LIB_METAL } from './kit.js';
import { archWindow, rectWindow, louvredDoor, exitSign, tubeLight, acCassette, skirting, extinguisher, curtain } from './roomkit.js';
import { noticeBoardTexture, plaqueTexture } from './textures.js';

/**
 * Bibliothèque (university library / reading hall), modelled from the user's photos:
 *  - one big hall, white walls, light-beige glossy floor tiles, white drop ceiling with twin fluorescent fixtures and AC cassettes
 *  - square white columns, some clad in zellige (blue / teal / brown stars)
 *  - rows of long light-wood tables with grey steel legs, plywood shell chairs with a hand-hole in the backrest
 *  - double-height end with a row of arched windows, brown curtains at tall windows, aluminium glazed partitions
 *  - wooden service counter with a glass partition and staff, notice boards, students reading
 * Plan: x 0..46 (west -> east), z 0..28 (north -> south). The two porch doors of the "NE court bldg" open on the west wall.
 */
export function buildLibrary({ mats, tex }) {
  const W = 46, D = 28, H = 3.4, HN = 6.8, XN = 24;
  const it = new Interior('library', { name: 'Bibliothèque', mats, tex, bg: 0x1a1c20, hemi: [0xffffff, 0xd8ccb4, 0.55], envIntensity: 0.35, ceilingY: H, camDist: 4.6 });
  it.ceilingAt = (x) => (x > XN - 1.5 ? HN : H);
  const k = it.kit, rng = mulberry32(2024);
  const DX = [2.4, 43.6];   // entrance doors: the two corners of the south (window) wall

  // ---- shell ---------------------------------------------------------------------------------------------------------
  k.span('floorLib', 0, W, -0.1, 0, 0, D);
  k.span('ceilTile', 0, XN, H, H + 0.08, 0, D);
  k.span('ceilTile', XN, W, HN, HN + 0.08, 0, D);
  k.span('white', XN - 0.02, XN + 0.02, H, HN, 0, D);
  k.span('white', XN - 0.35, XN, H - 0.28, H, 0, D);
  k.span('wallWhite', 0, XN, 0, H, -0.3, 0); k.span('wallWhite', XN, W, 0, HN, -0.3, 0);   // north
  k.span('wallWhite', W, W + 0.3, 0, HN, 0, D);                                              // east
  k.span('wallWhite', -0.3, 0, 0, H, 0, D);                                                  // west
  // south wall with the two door openings at the corners
  const xs = [0, ...DX.flatMap((x) => [x - 1.35, x + 1.35]), W];
  for (let i = 0; i < xs.length; i += 2) k.span('wallWhite', xs[i], xs[i + 1], 0, xs[i] >= XN ? HN : H, D, D + 0.3);
  k.span('wallWhite', XN, W, H, HN, D, D + 0.3);
  for (const x of DX) { k.span('wallWhite', x - 1.35, x + 1.35, 2.75, H, D, D + 0.3); k.span('black', x - 1.25, x + 1.25, 0, 2.75, D + 0.05, D + 0.3); }
  it.roomWalls(0, 0, W, D);
  skirting(it, 0.02, 0.02, W - 0.02, 0.02); skirting(it, W - 0.02, 0.02, W - 0.02, D - 0.02); skirting(it, 0.02, 0.02, 0.02, D - 0.02);

  // ---- entrance doors (south wall, corners) -----------------------------------------------------------------------------
  DX.forEach((x, i) => {
    louvredDoor(it, { x, z: D - 0.02, yaw: Math.PI, w: 2.4, h: 2.7 });
    exitSign(it, x, 3.0, D - 0.06, Math.PI);
    it.addExit(x, D, 0, -1, i, { standOff: 1.3, doorH: 2.7, markerScale: 0.78, markerY: 2.55, label: 'Sortir' });
    it.spawns.push({ x, z: D - 2.4, yaw: 0 });
  });

  // ---- columns --------------------------------------------------------------------------------------------------------
  const COLX = [9.5, 17.5, 25.5, 33.5, 41.5], COLZ = [8.85, 17.45];
  const ZEL = new Set(['17.5:8.85', '33.5:17.45', '25.5:17.45', '41.5:8.85', '9.5:17.45']);
  for (const cx of COLX) for (const cz of COLZ) {
    const top = cx >= XN ? HN : H;
    k.span('wallWhite', cx - 0.3, cx + 0.3, 0, top, cz - 0.3, cz + 0.3);
    if (ZEL.has(`${cx}:${cz}`)) {
      k.span('zellige', cx - 0.33, cx + 0.33, 0.95, top - 0.35, cz - 0.33, cz + 0.33);
      k.span('white', cx - 0.36, cx + 0.36, 0.9, 0.97, cz - 0.36, cz + 0.36); k.span('white', cx - 0.36, cx + 0.36, top - 0.37, top - 0.3, cz - 0.36, cz + 0.36);
      k.span('wallWhite', cx - 0.34, cx + 0.34, 0, 0.9, cz - 0.34, cz + 0.34);
    }
    it.solid(cx - 0.34, cz - 0.34, cx + 0.34, cz + 0.34, 'column');
  }
  // some columns carry a small notice board and the extinguisher
  extinguisher(it, 9.5, 17.45 - 0.34, Math.PI);
  extinguisher(it, 25.5, 8.85 - 0.34, Math.PI);

  // ---- windows & curtains -----------------------------------------------------------------------------------------------
  // arched row on the east wall (12) and on the nave walls (north / south)
  for (let i = 0; i < 12; i++) archWindow(it, { x: W - 0.01, y: 4.3, z: 1.6 + i * 2.2, yaw: -Math.PI / 2, w: 1.0, h: 1.9 });
  for (let i = 0; i < 9; i++) {
    archWindow(it, { x: XN + 1.7 + i * 2.4, y: 4.3, z: 0.01, yaw: 0, w: 1.0, h: 1.9 });
    archWindow(it, { x: XN + 1.7 + i * 2.4, y: 4.3, z: D - 0.01, yaw: Math.PI, w: 1.0, h: 1.9 });
  }
  // tall curtained windows (east wall, north nave wall)
  for (const z of [5.0, 14.0, 23.0]) {
    rectWindow(it, { x: W - 0.01, y: 0.95, z, yaw: -Math.PI / 2, w: 3.0, h: 2.35, mull: 1.5 });
    for (const sd of [-1, 1]) curtain(it, { x: W - 0.06, z: z + sd * 1.85, yaw: -Math.PI / 2, w: 1.1 });
  }
  for (const x of [29.0, 40.0]) {
    rectWindow(it, { x, y: 0.95, z: 0.01, yaw: 0, w: 3.0, h: 2.35, mull: 1.5 });
    for (const sd of [-1, 1]) curtain(it, { x: x + sd * 1.85, z: 0.06, yaw: 0, w: 1.1 });
  }
  // long run of windows on the south wall (behind the counter)
  for (let i = 0; i < 8; i++) rectWindow(it, { x: 6.6 + i * 4.8, y: 0.85, z: D - 0.01, yaw: Math.PI, w: 4.4, h: 2.1, mull: 1.1 });

  // ---- ceiling fixtures -------------------------------------------------------------------------------------------------
  for (let x = 3.4; x < XN - 1; x += 3.6) for (let z = 2.0; z < D - 1; z += 4.4) {
    tubeLight(it, x, H - 0.015, z, 'x'); tubeLight(it, x, H - 0.015, z + 1.5, 'x');
  }
  for (let x = XN + 2.5; x < W - 1; x += 4.4) for (let z = 2.2; z < D - 1; z += 4.4) tubeLight(it, x, HN - 0.015, z, 'x', 1.2);
  for (let x = 5.4; x < XN; x += 7.2) for (const z of [4.6, 13.6, 22.6]) acCassette(it, x, H, z);
  for (const [x, z] of [[28.4, 7.0], [28.4, 21.0], [40.4, 7.0], [40.4, 21.0]]) acCassette(it, x, HN, z, 1.1);

  // ---- long orange service counter along the south wall, between the two doors; staff area (not accessible) behind it -----------------------
  {
    const x0 = DX[0] + 1.75, x1 = DX[1] - 1.75, z0 = D - 5.0, z1 = z0 + 0.85;
    k.span('counterWood', x0, x1, 0, 1.02, z0, z1);
    k.span('woodLight', x0 - 0.05, x1 + 0.05, 1.02, 1.06, z0 - 0.1, z1 + 0.05);
    k.span('black', x0, x1, 0, 0.08, z0 - 0.02, z1);
    for (let x = x0 + 0.9; x < x1; x += 1.8) k.span('white', x - 0.01, x + 0.01, 0.1, 1.0, z0 - 0.005, z0 + 0.0);
    // glass partition above the counter with aluminium posts
    const zp = z1 + 0.05;
    for (let x = x0; x <= x1 + 0.01; x += 2.4) k.span('frameAlu', x - 0.03, x + 0.03, 1.06, 2.55, zp - 0.03, zp + 0.03);
    k.span('glass', x0, x1, 1.06, 2.5, zp - 0.005, zp + 0.005);
    k.span('frameAlu', x0, x1, 2.5, 2.57, zp - 0.04, zp + 0.04);
    k.span('frameAlu', x0, x1, 1.06, 1.1, zp - 0.04, zp + 0.04);
    for (const [xa, xb] of [[x0 - 0.06, x0], [x1, x1 + 0.06]]) {   // closed on both sides: wooden end panels + glass above
      k.span('counterWood', xa, xb, 0, 1.02, z0 - 0.1, D); k.span('woodLight', xa - 0.02, xb + 0.02, 1.02, 1.06, z0 - 0.1, D);
      k.span('glass', xa + 0.02, xb - 0.02, 1.06, 2.5, z0 - 0.1, D); k.span('frameAlu', xa, xb, 2.5, 2.57, z0 - 0.1, D); k.span('frameAlu', xa, xb, 1.06, 1.1, z0 - 0.1, D);
    }
    it.solid(x0 - 0.1, z0 - 0.1, x1 + 0.1, D, 'counter');
    const sign = plaqueTexture('PRÊT / RETOUR', { bg: '#7a3b18', fg: '#fff3e0', w: 1.4, h: 0.3 });
    if (sign) it.picture(sign, 1.4, 0.3, 23, 1.85, zp - 0.02, Math.PI, { emissive: 0.2 });
    // staff workstations behind the counter: the same tables as outside, with PCs
    const TOPS = [[1.38, 0.035, 0.7, 0, 0.7675, 0]], LG = [];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) LG.push([0.045, 0.75, 0.045, sx * 0.62, 0.375, sz * 0.3]);
    LG.push([1.2, 0.04, 0.04, 0, 0.62, 0.28]);
    const cz = 26.0;
    for (let tx = x0 + 1.2, n = 0; tx < x1 - 1.0; tx += 1.4, n++) {
      for (const sd of [-1, 1]) {
        const tz = cz + sd * 0.36;
        k.place('tblTop', 'woodLight', TOPS, tx, 0, tz, 0); k.place('tblLeg', 'metalGrey', LG, tx, 0, tz, 0);
        k.box('blackGloss', tx, 0.97, cz + sd * 0.2, 0.5, 0.3, 0.035);
        k.box('black', tx, 0.8, cz + sd * 0.2, 0.05, 0.08, 0.05);
        k.box('black', tx, 0.79, cz + sd * 0.5, 0.44, 0.02, 0.15);
        if (n % 2 === 0) k.box('pcCase', tx + 0.5, 0.2, cz + sd * 0.12, 0.2, 0.4, 0.44);
        const yaw = (sd < 0 ? 0 : Math.PI) + (rng() - 0.5) * 0.3;
        k.place('chairLib', 'chairWood', CHAIR_LIB_WOOD, tx + (rng() - 0.5) * 0.2, 0, cz + sd * (0.82 + rng() * 0.15), yaw);
        k.place('chairLibM', 'metalGrey', CHAIR_LIB_METAL, tx, 0, cz + sd * 0.9, yaw);
      }
    }
  }


  // ---- small white corner kiosk (north-west corner, opposite the left door): opaque black glass, closed, not enterable --------------------
  {
    const S = 2.0, h = 1.02, top = 2.0;
    k.span('white', 0.0, S, 0, h, 0.0, S); k.span('black', 0.0, S, 0, 0.08, S - 0.02, S + 0.03); k.span('black', S - 0.02, S + 0.03, 0, 0.08, 0, S);
    k.span('white', 0.0, S + 0.08, h, h + 0.05, 0.0, S + 0.08);                                // counter top slab
    k.span('blackGloss', 0.0, S, h + 0.05, top, S - 0.04, S);                                  // opaque black glass, south face
    k.span('blackGloss', S - 0.04, S, h + 0.05, top, 0.0, S);                                  // opaque black glass, east face
    k.span('white', 0.0, S + 0.04, top, top + 0.06, 0.0, S + 0.04);                             // roof
    k.span('frameAlu', S - 0.06, S, h + 0.05, top, S - 0.06, S);                                // corner post
    it.solid(0, 0, S + 0.1, S + 0.1, 'kiosk');
  }

  // ---- tables + chairs --------------------------------------------------------------------------------------------------------
  const TOP = [[1.38, 0.035, 0.7, 0, 0.7675, 0]];
  const LEGS = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) LEGS.push([0.045, 0.75, 0.045, sx * 0.62, 0.375, sz * 0.3]);
  for (const sx of [-1, 1]) LEGS.push([0.04, 0.04, 0.6, sx * 0.62, 0.62, 0], [0.04, 0.04, 0.6, sx * 0.62, 0.12, 0]);
  LEGS.push([1.2, 0.04, 0.04, 0, 0.62, 0.28]);
  const rows = [2.4, 6.7, 11.0, 15.3, 19.6], cols = [13.5, 21.5, 29.5, 37.5];
  const seats = [];
  for (const cz of rows) for (const cx of cols) {
    for (const rz of [-0.36, 0.36]) for (let u = 0; u < 4; u++) {
      const tx = cx - 2.1 + u * 1.4;
      k.place('tblTop', 'woodLight', TOP, tx, 0, cz + rz, 0);
      k.place('tblLeg', 'metalGrey', LEGS, tx, 0, cz + rz, 0);
    }
    for (const side of [-1, 1]) for (let u = 0; u < 4; u++) {
      const empty = rng() < 0.28;                                           // some chairs are pulled out / askew
      const px = cx - 2.1 + u * 1.4 + (rng() - 0.5) * 0.25, pz = cz + side * (0.82 + (empty ? 0.08 + rng() * 0.22 : rng() * 0.05));
      const yaw = (side < 0 ? 0 : Math.PI) + (rng() - 0.5) * (empty ? 0.7 : 0.2);
      k.place('chairLib', 'chairWood', CHAIR_LIB_WOOD, px, 0, pz, yaw);
      k.place('chairLibM', 'metalGrey', CHAIR_LIB_METAL, px, 0, pz, yaw);
      if (!empty) seats.push({ x: px, z: pz, yaw, tx: cx - 2.1 + u * 1.4, tz: cz + side * 0.36, cz, side });
    }
    it.solid(cx - 2.95, cz - 1.3, cx + 2.95, cz + 1.3, 'table-cluster');
    it.blob(6.6, 3.0, cx, cz, 0.012, 0.55);
  }

  // students reading, bags and papers on the tables
  const skins = [0xe0b48c, 0xd2a07a, 0xc08a62, 0xe8c4a0], tops = [0xf2f2f0, 0x4a6ea8, 0xb35b4a, 0x2f3338, 0x7ea05a, 0xd9c7a0, 0x8a5aa6, 0x2b5d6a], hijabs = [0xd8bfa6, 0xe9e1d3, 0x8a6a58, 0x3a3f4d, 0xb98f78, 0xcfa9a0, 0x6d7a5c, 0xf0ddd0];
  const pick = (a) => a[Math.floor(rng() * a.length)];
  let nPeople = 0;
  for (const s of seats) {
    const r = rng();
    const tableX = s.tx, tableZ = s.cz + s.side * 0.36;
    if (r < 0.34) {
      nPeople++;
      if (rng() < 0.7) { k.box('paper', tableX, 0.79, tableZ, 0.3, 0.012, 0.22, s.yaw); }
      if (rng() < 0.3) { k.box('metalDark', tableX, 0.795, tableZ + s.side * 0.0, 0.34, 0.02, 0.24, 0); k.box('screenOff', tableX, 0.9, tableZ - s.side * 0.12, 0.34, 0.2, 0.012, 0); }
    } else if (r < 0.48) {
      k.box(pick(['black', 'doorGreen', 'accentRed', 'chairWoodDark']), s.x, 0.62, s.z - Math.cos(s.yaw) * 0.0 + 0.0, 0.3, 0.34, 0.14);    // bag left on the chair
    } else if (r < 0.62) {
      k.box('paper', tableX, 0.79, tableZ, 0.28, 0.02, 0.2, s.yaw); k.box('bannerBlue', tableX + 0.2, 0.8, tableZ, 0.2, 0.035, 0.26, 0.2);
    }
  }

  // ---- notice boards & wall details ----------------------------------------------------------------------------------------------------
  const nb = (seed) => noticeBoardTexture(seed);
  [[12.0, 0.03, 0, 1], [20.5, 0.03, 0, 2], [33.0, 0.03, 0, 3], [37.5, 0.03, 0, 4]].forEach(([x, z, yaw, s]) => { const t = nb(s); if (t) it.picture(t, 1.3, 0.97, x, 1.65, z, yaw); });
  const n2 = nb(6); if (n2) it.picture(n2, 1.3, 0.97, 0.03, 1.65, 13.0, Math.PI / 2);
  // wall clock above the nave end
  const clock = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.05, 28), new THREE.MeshStandardMaterial({ color: 0xf5f5f0, roughness: 0.5 }));
  clock.rotation.x = Math.PI / 2; clock.position.set(W - 0.04, 3.2, 14.0); clock.rotation.z = Math.PI / 2; it.group.add(clock);

  // ---- lighting: one source under each fixture row (physical falloff), a little cool daylight at the big east windows ---------------
  for (const x of [6, 14, 21]) for (const z of [5, 14, 22]) it.light(0xfff1dc, 11, x, H - 0.45, z, 13, 2);
  for (const x of [30, 40]) for (const z of [7, 21]) it.light(0xfff1dc, 58, x, HN - 0.5, z, 20, 2);
  for (const z of [5, 14, 23]) it.light(0xdbe8ff, 9, W - 1.5, 2.0, z, 9, 2);

  return it.finalize();
}
