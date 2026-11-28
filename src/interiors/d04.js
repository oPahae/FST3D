import * as THREE from 'three';
import { Interior } from './Interior.js';
import { mulberry32 } from '../world/geom.js';
import { CHAIR_LAB_WOOD, CHAIR_LAB_METAL } from './kit.js';
import { rectWindow, skirting, curtain } from './roomkit.js';
import { whiteboardTexture, plaqueTexture } from './textures.js';
import { BoardWriter, createBoardMode, createPcMode } from './d04Activities.js';
import { createVideoMode } from './d04Video.js';

/**
 * Salle D04 (computer lab), modelled from the user's photos. Plan: x 0..12, z 0 (board wall) .. 11, height 4.
 * Activities: write on the left board (first person, animated hand) and sit at any PC (Windows login -> pahae.online).
 */
export function buildD04({ mats, tex }) {
  const W = 12, D = 11, H = 4.0;
  const it = new Interior('d04', { name: 'Salle D04', mats, tex, bg: 0x1c1e22, hemi: [0xffffff, 0xd9d0bd, 0.7], envIntensity: 0.4, ceilingY: H, camDist: 3.9 });
  const k = it.kit, rng = mulberry32(404);

  // ---- shell -----------------------------------------------------------------------------------------------------------------
  k.span('labFloor', 0, W, -0.1, 0, 0, D);
  k.span('ceilTile', 0, W, H, H + 0.1, 0, D);
  k.span('wallCream', -0.3, 0, 0, H, 0, D); k.span('wallCream', W, W + 0.3, 0, H, 0, D);
  k.span('wallCream', 0, W, 0, H, -0.3, 0); k.span('wallCream', 0, W, 0, H, D, D + 0.3);
  it.roomWalls(0, 0, W, D);
  skirting(it, 0.02, 0.02, W - 0.02, 0.02, 0.12, 'cabinetGrey'); skirting(it, 0.02, D - 0.02, W - 0.02, D - 0.02, 0.12, 'cabinetGrey');
  skirting(it, 0.02, 0.02, 0.02, D - 0.02, 0.12, 'cabinetGrey'); skirting(it, W - 0.02, 0.02, W - 0.02, D - 0.02, 0.12, 'cabinetGrey');
  k.span('white', 0, W, 1.05, 1.08, 0.0, 0.03);                                                     // surface conduit along the board wall

  // ---- front wall: mint door, boards, smart panel ----------------------------------------------------------------------------
  const BOARD = { x: 4.3, y: 1.85, w: 2.3, h: 1.18, z: 0.078 };
  {
    const dx = 1.6;
    k.span('doorMint', dx - 0.55, dx + 0.55, 0, 2.3, -0.02, 0.1);
    k.span('doorMint', dx - 0.46, dx + 0.46, 0.03, 2.25, 0.1, 0.15);
    k.span('glass', dx - 0.28, dx + 0.28, 1.3, 2.05, 0.151, 0.16);
    k.span('metalGrey', dx + 0.3, dx + 0.42, 1.0, 1.04, 0.15, 0.2);
    it.addExit(dx, 0, 0, 1, 0, { standOff: 1.05, doorH: 2.3, markerScale: 0.72, markerY: 2.7, label: 'Sortir' });
    const plaque = plaqueTexture('D04', { bg: '#4a8f6c', fg: '#ffffff', w: 0.5, h: 0.22 });
    if (plaque) it.picture(plaque, 0.5, 0.22, dx, 2.5, 0.17, 0);
    k.span('frameAlu', 3.1, 10.7, 1.2, 1.25, 0.02, 0.1);
    k.span('frameAlu', 3.12, 5.48, 1.22, 2.5, 0.02, 0.07); k.span('frameAlu', 8.32, 10.68, 1.22, 2.5, 0.02, 0.07);
    // left board: writable, starts with the signature
    const W_ = new BoardWriter(BOARD, 'By Pahae Ras Lpota\n');
    it.picture(W_.texture, BOARD.w, BOARD.h, BOARD.x, BOARD.y, BOARD.z, 0, { rough: 0.3 });
    const BOARD2 = { x: 9.5, y: 1.85, w: 2.3, h: 1.18, z: 0.078 };
    const W2 = new BoardWriter(BOARD2, '');
    it.picture(W2.texture, BOARD2.w, BOARD2.h, BOARD2.x, BOARD2.y, BOARD2.z, 0, { rough: 0.3 });
    const B1 = { ...BOARD, writer: W_ }, B2 = { ...BOARD2, writer: W2 };
    // 86" smart panel between the boards: the photo, exactly
    k.span('black', 5.6, 8.2, 1.1, 2.6, 0.02, 0.09);
    const ph = new THREE.TextureLoader().load(import.meta.env.BASE_URL + 'textures/d04-screen.jpg'); ph.colorSpace = THREE.SRGBColorSpace; ph.anisotropy = 8;
    const pw = 2.3, pH = pw * 1200 / 1920;
    const pm = it.picture(ph, pw, pH, 6.9, 1.85, 0.095, 0, { emissive: 0.7, rough: 0.2 });
    it.stations.push({ x: 6.9, z: 1.15, r: 1.0, label: "démarrer l'écran", where: 'écran', start: (m) => createVideoMode(m, it, { mesh: pm, x: 6.9, y: 1.85, z: 0.095, w: pw, h: pH }) });
    k.span('metalGrey', 6.5, 7.3, 1.02, 1.1, 0.02, 0.16);
    k.span('white', 8.5, 9.4, 0.35, 0.37, 0.02, 0.09);
    k.span('metalDark', 6.87, 6.93, 3.4, H, 1.57, 1.63); k.span('whiteLam', 6.6, 7.2, 3.28, 3.42, 1.4, 1.85);
    // station: write on the board
    for (const B of [B1, B2]) it.stations.push({ x: B.x, z: 1.25, r: 1.5, label: 'écrire', where: 'au tableau', start: (m) => createBoardMode(m, it, B) });
  }
  // wall-mounted split air conditioner (rear wall, high)
  k.span('whiteLam', 6.9, 8.4, 3.1, 3.5, D - 0.25, D); k.span('metalGrey', 6.95, 8.35, 3.13, 3.17, D - 0.18, D - 0.04);
  // surface-mounted twin fluorescent fixtures
  for (const z of [2.2, 5.6, 9.0]) for (const x of [3.4, 8.0]) { k.box('whiteLam', x, H - 0.05, z, 0.22, 0.07, 1.3); for (const o of [-0.05, 0.05]) k.box('lamp', x + o, H - 0.09, z, 0.04, 0.02, 1.2); }

  // ---- windows with royal-blue curtains (west wall) -----------------------------------------------------------------------------------
  for (const z of [2.7, 5.5, 8.3]) {
    rectWindow(it, { x: 0.01, y: 1.4, z, yaw: Math.PI / 2, w: 1.8, h: 2.1, frameKey: 'frameGreen', mull: 0.9 });
    for (const sd of [-1, 1]) curtain(it, { x: 0.06, z: z + sd * 1.12, yaw: Math.PI / 2, w: 1.2, top: 3.5, bottom: 0.2, key: 'curtainBlue' });
  }
  rectWindow(it, { x: 1.7, y: 1.4, z: D - 0.01, yaw: Math.PI, w: 1.6, h: 2.1, frameKey: 'frameGreen', mull: 0.8 });
  for (const sd of [-1, 1]) curtain(it, { x: 1.7 + sd * 1.0, z: D - 0.06, yaw: Math.PI, w: 1.1, top: 3.5, bottom: 0.2, key: 'curtainBlue' });

  // ---- cabinets on the rear wall -------------------------------------------------------------------------------------------------------------
  {
    const z1 = D - 0.02;
    k.span('whiteLam', 3.2, 4.4, 0, 2.2, z1 - 0.5, z1); k.span('metalGrey', 3.75, 3.78, 0, 2.2, z1 - 0.51, z1 - 0.5);
    it.solid(3.2, z1 - 0.55, 4.4, z1, 'cabinet');
    k.span('cabinetGrey', 4.6, 6.0, 0, 2.2, z1 - 0.45, z1);
    for (let i = 0; i < 31; i++) k.span('metalGrey', 4.64, 5.96, 0.05 + i * 0.068, 0.07 + i * 0.068, z1 - 0.46, z1 - 0.45);
    k.span('metalGrey', 4.6, 6.0, 2.17, 2.23, z1 - 0.47, z1);
    it.solid(4.6, z1 - 0.5, 6.0, z1, 'cabinet');
    // network rack
    const rx0 = 9.2, rx1 = 10.66;
    k.span('cabinetGrey', rx0, rx0 + 0.06, 0, 2.2, z1 - 0.45, z1); k.span('cabinetGrey', rx1 - 0.06, rx1, 0, 2.2, z1 - 0.45, z1); k.span('cabinetGrey', rx0, rx1, 2.18, 2.24, z1 - 0.46, z1);
    for (const y of [0.02, 0.55, 1.05, 1.55]) k.span('cabinetGrey', rx0, rx1, y, y + 0.03, z1 - 0.45, z1);
    for (let i = 0; i < 4; i++) { const y = 0.6 + i * 0.12; k.span('metalDark', rx0 + 0.18, rx1 - 0.18, y, y + 0.07, z1 - 0.42, z1 - 0.18); for (let p = 0; p < 12; p++) k.box('doorGreen', rx0 + 0.24 + p * 0.088, y + 0.035, z1 - 0.425, 0.04, 0.03, 0.01); }
    for (let i = 0; i < 26; i++) k.box('bannerBlue', rx0 + 0.1 + rng() * 1.3, 1.1 + rng() * 0.95, z1 - 0.3 - rng() * 0.1, 0.012, 0.15 + rng() * 0.5, 0.012);
    k.span('metalDark', rx0 + 0.1, rx1 - 0.1, 0.1, 0.5, z1 - 0.35, z1 - 0.1);
    it.solid(rx0 - 0.05, z1 - 0.5, rx1 + 0.05, z1, 'rack');
  }

  // ---- computer tables (two double-sided islands running along z) ----------------------------------------------------------------------------
  const TOP = [[0.7, 0.03, 1.4, 0, 0.725, 0]];
  const LEG = (() => { const L = []; for (const sx of [-1, 1]) for (const sz of [-1, 1]) L.push([0.04, 0.71, 0.04, sx * 0.31, 0.355, sz * 0.62]); L.push([0.6, 0.04, 0.04, 0, 0.62, -0.62], [0.6, 0.04, 0.04, 0, 0.62, 0.62], [0.04, 0.04, 1.2, -0.31, 0.62, 0], [0.04, 0.04, 1.2, 0.31, 0.62, 0]); return L; })();
  const TOWER = [[0.2, 0.42, 0.44, 0, 0.21, 0]], ACC = [[0.012, 0.15, 0.02, -0.07, 0.3, 0.225]];
  const MON = [[0.54, 0.32, 0.035, 0, 0.4, 0]], MONFOOT = [[0.04, 0.18, 0.03, 0, 0.1, -0.03], [0.22, 0.015, 0.18, 0, 0.008, -0.02]];
  const KB = [[0.44, 0.02, 0.15, 0, 0.01, 0.34], [0.06, 0.03, 0.1, 0.34, 0.015, 0.34]];
  const ISLANDS = [3.4, 8.0], Z0 = 2.7;
  const seatsAt = [];
  for (const ix of ISLANDS) {
    for (const s of [-1, 1]) {
      for (let u = 0; u < 4; u++) {
        const tz = Z0 + 0.7 + u * 1.4, tx = ix + s * 0.35;
        k.place('d04Top', 'woodLight', TOP, tx, 0, tz, 0);
        k.place('d04Leg', 'metalGreen', LEG, tx, 0, tz, 0);
        for (const o of [-0.35, 0.35]) {
          const pz = tz + o, yaw = s > 0 ? Math.PI / 2 : -Math.PI / 2;
          k.place('pcMon', 'blackGloss', MON, ix + s * 0.1, 0.74, pz, yaw);
          k.place('pcFoot', 'black', MONFOOT, ix + s * 0.1, 0.74, pz, yaw);
          k.place('pcKb', 'black', KB, ix + s * 0.1, 0.74, pz, yaw);
          if (rng() < 0.85) { k.place('pcTower', 'pcCase', TOWER, ix + s * 0.55, 0.74, pz, yaw + (rng() - 0.5) * 0.12); k.place('pcAcc', 'accentRed', ACC, ix + s * 0.55, 0.74, pz, yaw); }
          const seat = { x: ix + s * 1.1, z: pz, yaw: s > 0 ? Math.PI / 2 + Math.PI : -Math.PI / 2 + Math.PI };
          seatsAt.push(seat);
          it.stations.push({ x: seat.x, z: pz, r: 0.62, label: 'démarrer le PC', where: 'poste', start: (m) => createPcMode(m, { mx: ix + s * 0.1, my: 0.74 + 0.4, mz: pz, s }) });
        }
      }
    }
    it.solid(ix - 0.85, Z0 - 0.1, ix + 0.85, Z0 + 5.7, 'island');
    it.blob(2.9, 6.4, ix, Z0 + 2.8, 0.012, 0.45);
  }
  k.box('whiteLam', ISLANDS[0] + 0.35, 0.745, Z0 + 3.2, 0.06, 0.03, 0.5);
  for (let i = 0; i < 18; i++) {
    const ix = ISLANDS[Math.floor(rng() * 2)] + (rng() < 0.5 ? -1 : 1) * (0.5 + rng() * 0.45), z = Z0 + rng() * 5.4, len = 0.6 + rng() * 1.6, a = rng() * Math.PI;
    k.box('cable', ix, 0.012, z, len, 0.014, 0.014, a);
  }
  for (const s of seatsAt) {
    const slide = rng() * 0.25, yaw = s.yaw + (rng() - 0.5) * 0.5;
    const dxo = Math.round(Math.sin(s.yaw)) * slide;
    k.place('chairLab', 'chairWood', CHAIR_LAB_WOOD, s.x + dxo, 0, s.z, yaw);
    k.place('chairLabM', 'metalDark', CHAIR_LAB_METAL, s.x + dxo, 0, s.z, yaw);
  }
  // ---- east wall: windows + a single row of PC tables attached to them ----------------------------------------------------------------
  for (const z of [4.3, 6.4, 8.5]) rectWindow(it, { x: W - 0.01, y: 1.4, z, yaw: -Math.PI / 2, w: 1.7, h: 2.1, frameKey: 'frameGreen', mull: 0.85 });
  for (const z of [3.1, 5.35, 7.45, 9.6]) curtain(it, { x: W - 0.06, z, yaw: -Math.PI / 2, w: 0.85, top: 3.5, bottom: 0.2, key: 'curtainBlue' });
  {
    const tx = W - 0.35;
    for (let u = 0; u < 4; u++) {
      const tz = 3.6 + u * 1.4;
      k.place('d04Top', 'woodLight', TOP, tx, 0, tz, 0); k.place('d04Leg', 'metalGreen', LEG, tx, 0, tz, 0);
      for (const o of [-0.35, 0.35]) {
        const pz = tz + o, yaw = -Math.PI / 2, mx = W - 0.3;
        k.place('pcMon', 'blackGloss', MON, mx, 0.74, pz, yaw); k.place('pcFoot', 'black', MONFOOT, mx, 0.74, pz, yaw); k.place('pcKb', 'black', KB, mx, 0.74, pz, yaw);
        k.place('pcTower', 'pcCase', TOWER, W - 0.62, 0.74, pz, yaw + (rng() - 0.5) * 0.12); k.place('pcAcc', 'accentRed', ACC, W - 0.62, 0.74, pz, yaw);
        const sx = W - 1.4, slide = rng() * 0.2;
        k.place('chairLab', 'chairWood', CHAIR_LAB_WOOD, sx + slide, 0, pz, Math.PI / 2 + (rng() - 0.5) * 0.4); k.place('chairLabM', 'metalDark', CHAIR_LAB_METAL, sx + slide, 0, pz, Math.PI / 2);
        it.stations.push({ x: sx, z: pz, r: 0.62, label: 'démarrer le PC', where: 'poste', start: (m) => createPcMode(m, { mx, my: 0.74 + 0.4, mz: pz, s: -1 }) });
      }
    }
    it.solid(W - 0.85, 2.85, W, 8.95, 'wall-tables');
  }
  // corner next to the blue chair: iron cabinet (cables + connectors) and a standing server
  {
    const x1 = W - 0.04, x0 = x1 - 0.62;
    k.span('cabinetGrey', x0, x1, 0, 2.15, 0.05, 1.15);                                    // body
    k.span('metalDark', x0 - 0.02, x0 + 0.02, 0.0, 2.15, 0.05, 0.08); k.span('metalDark', x0 - 0.02, x0 + 0.02, 0.0, 2.15, 1.12, 1.15);   // door frame edges (door open)
    k.span('black', x0 + 0.02, x1 - 0.02, 0.08, 2.05, 0.12, 1.08);                         // dark interior
    for (const y of [0.45, 0.95, 1.45]) k.span('metalGrey', x0 + 0.02, x1 - 0.02, y, y + 0.03, 0.12, 1.08);
    for (const y of [0.6, 1.1, 1.6]) { k.span('metalDark', x0 + 0.04, x0 + 0.2, y, y + 0.16, 0.2, 1.0); for (let p = 0; p < 12; p++) k.box('doorGreen', x0 + 0.045, y + 0.08, 0.26 + p * 0.062, 0.012, 0.03, 0.03); }   // patch panels with ports
    for (let i = 0; i < 40; i++) k.box(['bannerBlue', 'cable', 'accentRed', 'doorGreen'][i % 4], x0 + 0.14 + rng() * 0.3, 0.5 + rng() * 1.4, 0.2 + rng() * 0.85, 0.012, 0.2 + rng() * 0.6, 0.012);   // hanging cables
    k.span('cabinetGrey', x0 - 0.02, x0 + 0.0, 0.0, 2.15, 0.05, 0.62);                       // open door leaf folded back
    it.solid(x0 - 0.1, 0.0, x1, 1.2, 'iron-cabinet');
    // server: tall standing parallelepiped with a grille and status LEDs
    const sz0 = 1.32, sz1 = 1.98, sx0 = x1 - 0.78;
    k.span('metalDark', sx0, x1, 0, 1.9, sz0, sz1);
    k.span('black', sx0 - 0.01, sx0 + 0.01, 0.1, 1.8, sz0 + 0.04, sz1 - 0.04);
    for (let i = 0; i < 12; i++) k.span('metalGrey', sx0 - 0.012, sx0 + 0.004, 0.2 + i * 0.12, 0.22 + i * 0.12, sz0 + 0.07, sz1 - 0.07);
    for (let i = 0; i < 6; i++) k.box(i % 3 ? 'doorGreen' : 'accentRed', sx0 - 0.015, 1.6 + (i % 3) * 0.06, sz0 + 0.14 + Math.floor(i / 3) * 0.06, 0.012, 0.018, 0.018);
    it.solid(sx0 - 0.05, sz0 - 0.05, x1, sz1 + 0.05, 'server');
  }
  // blue swivel chair and the white table in front of it
  k.cyl('bannerBlue', 10.4, 0.5, 1.2, 0.25, 0.08, 14); k.cyl('metalDark', 10.4, 0.27, 1.2, 0.03, 0.5, 8); k.cyl('metalDark', 10.4, 0.02, 1.2, 0.26, 0.04, 10); k.box('bannerBlue', 10.4, 0.8, 1.02, 0.46, 0.5, 0.07);
  k.span('whiteLam', 9.8, 11.0, 0.72, 0.76, 1.85, 2.55);
  for (const [x, z] of [[9.86, 1.9], [10.94, 1.9], [9.86, 2.5], [10.94, 2.5]]) k.box('metalGrey', x, 0.36, z, 0.04, 0.72, 0.04);
  it.solid(9.75, 1.8, 11.05, 2.6, 'white-table');

  // ---- lights: one source under each fixture, plus a little cool daylight at the windows ------------------------------------------------
  for (const x of [3.4, 8.0]) for (const z of [2.4, 6.0, 9.4]) it.light(0xfff1dc, 15, x, H - 0.5, z, 12, 2);
  for (const z of [2.7, 5.5, 8.3]) it.light(0xdbe8ff, 7, 1.4, 2.2, z, 7, 2);
  for (const z of [4.3, 6.4, 8.5]) it.light(0xdbe8ff, 7, W - 1.4, 2.2, z, 7, 2);

  it.spawns[0] = { x: 1.6, z: 1.9, yaw: Math.PI };
  return it.finalize();
}
