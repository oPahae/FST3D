import * as THREE from 'three';
import { Interior } from './Interior.js';
import { mulberry32 } from '../world/geom.js';
import { makePerson } from './kit.js';
import { rectWindow, skirting, exitSign } from './roomkit.js';
import { plaqueTexture } from './textures.js';
import { createShopMode, updateWallet } from './shop.js';
import { createPoolMode } from './pool.js';

/**
 * Buvette (student cafeteria), modelled from the user's photos: big hall, light beige floor tiles, white walls with a peach end wall,
 * suspended white ceiling with round downlights and grilles, dark-framed windows on the west side and high strip windows on the east,
 * service end with the white glass cash display (caisse, 3apdlah) and the granite bar (comptoir, opama), TV, snack racks, blue doors,
 * Coca-Cola machine, dark bar-back chairs, orange wooden tables, leather banquette, three pool tables.
 * Plan: x 0..26 (west -> east), z 0 (service wall) .. 16 (entrance wall).
 */
function ensureMats(mats, tex) {
  const add = (k, color, o = {}) => { if (!mats[k]) { const m = new THREE.MeshStandardMaterial({ color: o.map ? 0xffffff : color, roughness: 0.7, ...o }); if (o.map) { m.color.set(color); m.userData.tile = o.map.userData.tile; } m.name = k; mats[k] = m; } };
  add('wallPeach', 0xe8c6ab, { map: tex.wallCream || null, roughness: 0.92 });
  add('granite', 0xcdb08f, { map: tex.speckle || null, roughness: 0.38 });
  add('doorBlue', 0x1c6fd2, { roughness: 0.5 });
  add('cokeRed', 0xc61f26, { roughness: 0.35 });
  add('poolGreen', 0x2f8f43, { roughness: 0.95 });
  add('poolCushion', 0x23753a, { roughness: 0.85 });
  add('poolWood', 0xd7ccb4, { map: tex.woodLight || null, roughness: 0.45 });
  add('leather', 0x7b3f22, { roughness: 0.5 });
  add('chairBlack', 0x211915, { roughness: 0.5, metalness: 0.2 });
  add('boxRed', 0xc8352f); add('boxGreen', 0x2f9a4a); add('boxBlue', 0x2f59c4); add('boxYellow', 0xe8c230); add('boxOrange', 0xe9822a); add('boxPurple', 0x7a45a8); add('boxBrown', 0x6a3b22);
  add('silver', 0xc9ccd0, { roughness: 0.3, metalness: 0.7 });
}
const BOXES = ['boxRed', 'boxGreen', 'boxBlue', 'boxYellow', 'boxOrange', 'boxPurple', 'boxBrown'];

function nameTag(text) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 72; const g = c.getContext('2d');
  g.fillStyle = 'rgba(14,18,24,.82)'; g.beginPath(); g.roundRect(4, 6, 248, 60, 16); g.fill();
  g.fillStyle = '#ffd25a'; g.font = 'bold 34px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 128, 38);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false })); s.scale.set(0.95, 0.27, 1); return s;
}

export function buildBuvette({ mats, tex }, mgr) {
  ensureMats(mats, tex);
  const W = 17, D = 27, H = 3.6, BZ = 3.8;          // BZ = depth of the staff room behind the bar (north of the wall)
  const it = new Interior('buvette', { name: 'Buvette', mats, tex, bg: 0x1c1e22, hemi: [0xffffff, 0xe6dccb, 0.6], envIntensity: 0.4, ceilingY: H, camDist: 4.6 });
  const k = it.kit, rng = mulberry32(777);
  const BX0 = 6.6, BX1 = 12.6;                      // opening of the bar in the service wall
  const DZ = 4.9;                                    // entrance door (west wall), next to the cash desk

  // ---- shell ----------------------------------------------------------------------------------------------------------------------
  k.span('floorLib', 0, W, -0.1, 0, 0, D);
  k.span('ceilTile', 0, W, H, H + 0.08, 0, D);
  k.span('wallWhite', W, W + 0.3, 0, H, 0, D);
  k.span('wallWhite', 0, W, 0, H, D, D + 0.3);
  // service wall (north) with the bar opening
  k.span('wallWhite', 0, BX0, 0, H, -0.3, 0); k.span('wallWhite', BX1, W, 0, H, -0.3, 0);
  k.span('wallWhite', BX0, BX1, 2.7, H, -0.3, 0); k.span('granite', BX0, BX1, 0, 1.1, -0.3, 0);
  k.span('wallPeach', 0.05, BX0, 0, H, 0, 0.03); k.span('wallPeach', BX1, 14.2, 0, H, 0, 0.03); k.span('wallPeach', BX0, BX1, 2.7, H, 0, 0.03);
  // west wall with the entrance opening
  k.span('wallWhite', -0.3, 0, 0, H, 0, DZ - 1.0); k.span('wallWhite', -0.3, 0, 0, H, DZ + 1.0, D); k.span('wallWhite', -0.3, 0, 2.7, H, DZ - 1.0, DZ + 1.0);
  k.span('black', -0.3, -0.05, 0, 2.7, DZ - 1.0, DZ + 1.0);
  it.roomWalls(0, 0, W, D);
  skirting(it, 0.02, D - 0.02, W - 0.02, D - 0.02); skirting(it, W - 0.02, 0.02, W - 0.02, D - 0.02); skirting(it, 0.02, DZ + 1.0, 0.02, D - 0.02); skirting(it, 0.02, 0.02, 0.02, DZ - 1.0);

  // back room behind the bar (seen through the opening)
  k.span('floorLib', BX0 - 0.3, BX1 + 0.3, -0.1, 0, -BZ, 0); k.span('ceilTile', BX0 - 0.3, BX1 + 0.3, H, H + 0.08, -BZ, 0);
  k.span('wallWhite', BX0 - 0.35, BX0 - 0.3, 0, H, -BZ, 0); k.span('wallWhite', BX1 + 0.3, BX1 + 0.35, 0, H, -BZ, 0);
  k.span('wallWhite', BX0 - 0.3, BX1 + 0.3, 0, H, -BZ - 0.05, -BZ);
  k.span('wallCream', BX0 - 0.3, BX1 + 0.3, 1.2, 1.9, -BZ + 0.0, -BZ + 0.01);

  // entrance: glazed door with brown frame in the west wall
  {
    const x = 0.06;
    k.span('glass', x - 0.01, x + 0.01, 0.05, 2.55, DZ - 0.95, DZ + 0.95);
    for (const z of [DZ - 0.95, DZ, DZ + 0.95]) k.span('deskDark', x - 0.04, x + 0.04, 0, 2.6, z - 0.05, z + 0.05);
    k.span('deskDark', x - 0.04, x + 0.04, 2.55, 2.62, DZ - 1.0, DZ + 1.0); k.span('deskDark', x - 0.04, x + 0.04, 0, 0.08, DZ - 1.0, DZ + 1.0);
    exitSign(it, 0.1, 3.0, DZ, Math.PI / 2);
    it.addExit(0, DZ, 1, 0, 0, { standOff: 1.3, doorH: 2.6, markerScale: 0.8, markerY: 2.6, label: 'Sortir' });
    it.spawns.push({ x: 2.4, z: DZ, yaw: -Math.PI / 2 });
  }

  // windows: west wall (beyond the door and the Coca machine), high strip windows east, 3 floor-to-ceiling windows south
  for (const z of [10.2, 13.4, 16.6, 19.8, 23.0]) rectWindow(it, { x: 0.01, y: 0.8, z, yaw: Math.PI / 2, w: 2.6, h: 2.3, frameKey: 'metalDark', mull: 1.3 });
  for (const z of [6.0, 13.5, 21.0]) rectWindow(it, { x: W - 0.01, y: 2.45, z, yaw: -Math.PI / 2, w: 3.0, h: 0.75, frameKey: 'metalDark', mull: 1.5 });
  for (const x of [3.0, 8.5, 14.0]) rectWindow(it, { x, y: 0.05, z: D - 0.01, yaw: Math.PI, w: 4.0, h: H - 0.12, frameKey: 'metalDark', mull: 2.0 });

  // ceiling: round downlights + grilles
  for (let x = 3; x < W; x += 4) for (let z = 3; z < D; z += 4) { k.cyl('lamp', x, H - 0.012, z, 0.11, 0.025, 16); k.cyl('white', x, H - 0.005, z, 0.14, 0.012, 16); }
  for (const [x, z] of [[8, 8], [13, 14], [5, 19]]) { k.span('metalGrey', x - 0.4, x + 0.4, H - 0.02, H, z - 0.4, z + 0.4); for (let i = 0; i < 6; i++) k.span('black', x - 0.36, x + 0.36, H - 0.025, H - 0.02, z - 0.34 + i * 0.12, z - 0.3 + i * 0.12); }

  // ---- service end ----------------------------------------------------------------------------------------------------------------------
  const snackShelf = (x0, x1, y0, y1, z0, z1, rows, sgn = 1) => {
    k.span('cabinetGrey', x0, x1, y0, y0 + 0.03, z0, z1);
    for (let r = 0; r < rows; r++) {
      const y = y0 + 0.03 + r * ((y1 - y0) / rows);
      k.span('cabinetGrey', x0, x1, y, y + 0.025, z0, z1);
      for (let x = x0 + 0.1; x < x1 - 0.1; x += 0.24) k.box(BOXES[Math.floor(rng() * BOXES.length)], x, y + 0.025 + 0.14, (z0 + z1) / 2, 0.2, 0.26 + rng() * 0.08, Math.min(0.26, Math.abs(z1 - z0) - 0.04), (rng() - 0.5) * 0.3);
    }
  };
  // caisse (cash desk) in the north-west corner: white glass display + brown-panelled box
  {
    const x0 = 0.05, x1 = 3.5, z0 = 1.85, z1 = 2.55;
    k.span('whiteLam', x0, x1, 0, 0.38, z0, z1);
    for (let x = x0 + 0.12; x < x1 - 0.1; x += 0.16) k.span('white', x, x + 0.04, 0.05, 0.33, z1, z1 + 0.012);
    k.span('glass', x0, x1 - 0.05, 0.4, 0.96, z1 - 0.03, z1 - 0.02);
    for (const x of [x0 + 0.02, (x0 + x1) / 2, x1 - 0.04]) k.span('whiteLam', x - 0.04, x + 0.04, 0.38, 1.0, z0, z1);
    k.span('whiteLam', x0, x1, 0.96, 1.02, z0 - 0.04, z1 + 0.04);
    k.span('paper', x0 + 0.1, (x0 + x1) / 2 - 0.1, 0.45, 0.47, z0 + 0.05, z1 - 0.05);
    for (let i = 0; i < 12; i++) k.box(BOXES[i % BOXES.length], x0 + 0.2 + rng() * 3.0, 1.02 + 0.07, z0 + 0.25 + rng() * 0.3, 0.2, 0.14, 0.18, rng() * 0.6);
    k.span('whiteLam', 3.55, 4.45, 0, 1.08, z0, z1); k.span('woodPine', 3.65, 4.35, 0.1, 1.0, z1, z1 + 0.02); k.span('whiteLam', 3.5, 4.5, 1.08, 1.13, z0 - 0.03, z1 + 0.03);
    for (let i = 0; i < 6; i++) k.box(BOXES[i % BOXES.length], 3.7 + (i % 3) * 0.25, 1.13 + 0.1, z0 + 0.3 + Math.floor(i / 3) * 0.3, 0.2, 0.2, 0.18, rng());
    snackShelf(0.3, 3.0, 0.0, 2.2, 0.06, 0.4, 5);                   // racks behind the cashier
    it.solid(0, 0, 4.6, 2.65, 'caisse');
  }
  // comptoir (bar): flush with the wall, Opama and the back room behind it
  {
    k.span('granite', BX0, BX1, 0, 1.1, -0.9, 0); k.span('granite', BX0 - 0.05, BX1 + 0.05, 1.1, 1.15, -0.95, 0.12);
    const poster = plaqueTexture('Capisco', { bg: '#f1e4de', fg: '#b3202f', w: 1.7, h: 0.4 }); if (poster) it.picture(poster, 1.7, 0.4, BX0 + 1.1, 0.7, 0.012, 0, { rough: 0.5 });
    // the two grey items sit exactly on the bar top (y = 1.15)
    k.span('silver', BX0 + 0.5, BX0 + 1.8, 1.15, 1.62, -0.75, -0.2); k.span('blackGloss', BX0 + 0.5, BX0 + 1.8, 1.15, 1.2, -0.75, -0.2);          // espresso machine
    const sx0 = BX1 - 2.3, sx1 = BX1 - 0.3, sz0 = -0.4, sz1 = 0.1;                                                                               // glass showcase
    k.span('glass', sx0, sx1, 1.17, 1.7, sz0, sz0 + 0.01); k.span('glass', sx0, sx1, 1.17, 1.7, sz1 - 0.01, sz1); k.span('glass', sx0, sx1, 1.69, 1.7, sz0, sz1);
    k.span('frameAlu', sx0, sx1, 1.15, 1.18, sz0, sz1); k.span('frameAlu', sx0, sx1, 1.7, 1.74, sz0, sz1);
    for (const x of [sx0, (sx0 + sx1) / 2, sx1]) k.span('frameAlu', x - 0.02, x + 0.02, 1.15, 1.74, sz0, sz1);
    for (let i = 0; i < 6; i++) k.cyl(['boxRed', 'boxOrange', 'boxBlue', 'boxYellow'][i % 4], BX0 + 2.4 + (i % 3) * 0.14, 1.15 + 0.13, -0.5 + Math.floor(i / 3) * 0.2, 0.04, 0.26, 8);   // bottles
    // back room: fridge, window, shelves
    k.span('whiteLam', BX0 + 0.3, BX0 + 1.1, 0, 1.95, -BZ + 0.05, -BZ + 0.7); k.span('glass', BX0 + 0.32, BX0 + 1.08, 0.5, 1.7, -BZ + 0.7, -BZ + 0.72); k.span('doorBlue', BX0 + 0.3, BX0 + 1.1, 1.95, 2.15, -BZ + 0.05, -BZ + 0.7);
    k.span('black', BX0 + 2.6, BX0 + 4.6, 2.0, 2.7, -BZ + 0.0, -BZ + 0.03); k.span('daylight', BX0 + 2.65, BX0 + 4.55, 2.05, 2.65, -BZ + 0.03, -BZ + 0.04);
    snackShelf(BX1 - 1.6, BX1 + 0.2, 0.0, 2.1, -BZ + 0.05, -BZ + 0.45, 4);
    it.solid(BX0 - 0.2, -1.2, BX1 + 0.2, 0.3, 'comptoir');
  }
  // TV + blue doorway on the service wall
  k.span('blackGloss', 4.9, 6.2, 2.2, 2.95, 0.03, 0.1); k.span('screenOff', 4.95, 6.15, 2.25, 2.9, 0.1, 0.105);
  k.span('doorBlue', 14.4, 14.52, 0, 2.3, 0, 0.2); k.span('doorBlue', 15.4, 15.52, 0, 2.3, 0, 0.2); k.span('doorBlue', 14.4, 15.52, 2.2, 2.3, 0, 0.2); k.span('black', 14.52, 15.4, 0, 2.2, 0.01, 0.05);

  // Coca-Cola machine against the west wall, just left of the door (as seen from inside)
  { const z0 = DZ + 1.3, z1 = z0 + 0.95;
    k.span('cokeRed', 0.05, 0.85, 0, 1.95, z0, z1); k.span('whiteLam', 0.85, 0.87, 0.9, 1.7, z0 + 0.1, z1 - 0.1); k.span('glass', 0.86, 0.88, 0.35, 1.7, z0 + 0.1, z1 - 0.1); k.span('whiteLam', 0.85, 0.88, 1.75, 1.9, z0 + 0.1, z1 - 0.1);
    it.solid(0, z0 - 0.05, 0.95, z1 + 0.05, 'coke'); }

  // staff
  const mkStaff = (name, x, z, opts) => {
    const p = makePerson({ seated: false, ...opts }); it.group.add(p); p.position.set(x, 0, z); p.rotation.y = 0;
    const tag = nameTag(name); tag.position.set(x, 2.1, z); it.group.add(tag); return p;
  };
  mkStaff('3apdlah', 1.8, 1.0, { top: 0x2f6bb8, bottom: 0x2a2f3a, skin: 0xc9966f, hair: 0x1f1610 });
  mkStaff('opama', 9.6, -1.4, { top: 0xf1f1ee, bottom: 0x2a2f3a, skin: 0x7a4a2e, hair: 0x14100c });

  // stations
  const camFor = (x, z0, z1) => ({ pos: new THREE.Vector3(x + 0.9, 1.6, z0), target: new THREE.Vector3(x + 0.9, 1.4, z1), fov: 48 });
  it.stations.push({ x: 3.0, z: 3.05, r: 1.4, label: 'commander', where: '3apdlah · caisse', start: (m) => createShopMode(m, 'caisse', camFor(1.8, 4.3, 1.2)) });
  it.stations.push({ x: 9.6, z: 1.9, r: 1.9, label: 'retirer mes produits', where: 'opama · comptoir', start: (m) => createShopMode(m, 'comptoir', camFor(9.6, 3.3, -1.4)) });

  // ---- pool tables: two, vertical (long side along z), in front of the dining area -------------------------------------------------------------------------
  const POOLS = [[4.8, 22.0], [12.2, 22.0]], PX = 0.92, PZ = 0.46;
  for (const [cx, cz] of POOLS) {
    // local (lx along the long side) -> world: x = cx + lz, z = cz - lx
    const S = (key, lx0, lx1, y0, y1, lz0, lz1) => k.span(key, cx + lz0, cx + lz1, y0, y1, cz - lx1, cz - lx0);
    const C = (key, lx, y, lz, r, h, n, rt = r) => k.cyl(key, cx + lz, y, cz - lx, r, h, n, rt);
    S('poolWood', -1.25, 1.25, 0.5, 0.75, -0.68, 0.68);
    S('poolGreen', -PX, PX, 0.77, 0.80, -PZ, PZ);
    S('poolWood', -1.25, 1.25, 0.77, 0.88, -0.68, -PZ - 0.07); S('poolWood', -1.25, 1.25, 0.77, 0.88, PZ + 0.07, 0.68);
    S('poolWood', -1.25, -PX - 0.07, 0.77, 0.88, -PZ - 0.07, PZ + 0.07); S('poolWood', PX + 0.07, 1.25, 0.77, 0.88, -PZ - 0.07, PZ + 0.07);
    S('poolCushion', -PX - 0.07, PX + 0.07, 0.80, 0.84, -PZ - 0.07, -PZ); S('poolCushion', -PX - 0.07, PX + 0.07, 0.80, 0.84, PZ, PZ + 0.07);
    S('poolCushion', -PX - 0.07, -PX, 0.80, 0.84, -PZ, PZ); S('poolCushion', PX, PX + 0.07, 0.80, 0.84, -PZ, PZ);
    for (const [px, pz] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [0, 1]]) {
      const lx = px === 0 ? 0 : px * (PX + 0.015), lz = pz * (PZ + (px === 0 ? 0.035 : 0.015));
      C('black', lx, 0.889, lz, px === 0 ? 0.05 : 0.056, 0.01, 14);
      if (px !== 0) k.box('silver', cx + pz * 0.665, 0.88, cz - px * 1.225, 0.14, 0.05, 0.14);
    }
    for (const sx of [-1, 1]) { C('woodLight', sx * 0.75, 0.25, 0, 0.21, 0.5, 12, 0.14); C('silver', sx * 0.75, 0.01, 0, 0.23, 0.02, 12); }
    it.solid(cx - 0.8, cz - 1.4, cx + 0.8, cz + 1.4, 'pool');
    it.blob(2.1, 3.4, cx, cz, 0.012, 0.5);
    it.stations.push({ x: cx, z: cz, r: 2.3, label: 'jouer au billard', where: 'golvazer', start: (m) => createPoolMode(m, it, { cx, cz, rot: Math.PI / 2 }) });
  }

  // ---- dining area: dark bar-back chairs, wooden tables (between the service end and the pool tables) -----------------------------------------------------
  const CH_SEAT = [[0.42, 0.04, 0.42, 0, 0.45, 0]];
  const CH_FRAME = (() => { const L = []; for (const sx of [-1, 1]) for (const sz of [-1, 1]) L.push([0.024, 0.45, 0.024, sx * 0.19, 0.225, sz * 0.19]); for (const sx of [-1, 1]) L.push([0.024, 0.52, 0.024, sx * 0.19, 0.71, -0.19]); L.push([0.4, 0.03, 0.022, 0, 0.97, -0.19], [0.4, 0.02, 0.02, 0, 0.62, -0.19]); for (let i = 0; i < 5; i++) L.push([0.014, 0.34, 0.014, -0.15 + i * 0.075, 0.79, -0.19]); L.push([0.36, 0.02, 0.02, 0, 0.18, 0.19]); return L; })();
  const T_TOP = [[1.2, 0.04, 0.75, 0, 0.74, 0]], T_LEG = (() => { const L = []; for (const sx of [-1, 1]) for (const sz of [-1, 1]) L.push([0.04, 0.72, 0.04, sx * 0.54, 0.36, sz * 0.32]); return L; })();
  const chair = (x, z, yaw) => { k.place('chB', 'leather', CH_SEAT, x, 0, z, yaw); k.place('chBf', 'chairBlack', CH_FRAME, x, 0, z, yaw); };
  let ti = 0;
  for (const z of [8.0, 10.8, 13.6, 16.4]) for (const x of [4.6, 8.0, 11.4, 14.6]) {
    const dark = (ti++ % 3) === 0;
    k.place('tbTop', dark ? 'deskDark' : 'woodPine', T_TOP, x, 0, z, 0); k.place('tbLeg', 'chairBlack', T_LEG, x, 0, z, 0);
    for (const sx of [-0.3, 0.3]) { chair(x + sx, z - 0.78 + (rng() - 0.5) * 0.12, 0 + (rng() - 0.5) * 0.3); chair(x + sx, z + 0.78 + (rng() - 0.5) * 0.12, Math.PI + (rng() - 0.5) * 0.3); }
    it.solid(x - 0.7, z - 0.45, x + 0.7, z + 0.45, 'table');
  }

  // ---- lighting ---------------------------------------------------------------------------------------------------------------------------------
  for (const x of [4.5, 12.5]) for (const z of [3, 8, 13, 18, 23]) it.light(0xfff1dc, 6, x, H - 0.45, z, 12, 2);
  it.light(0xfff1dc, 5, 9.6, 3.0, -1.8, 8, 2);
  for (const z of [10.2, 16.6, 23.0]) it.light(0xdbe8ff, 6, 1.4, 2.0, z, 7, 2);
  for (const x of [3.0, 8.5, 14.0]) it.light(0xdbe8ff, 6, x, 2.0, D - 1.4, 7, 2);

  it.updaters.push(() => updateWallet(mgr && mgr.current === 'buvette'));
  return it.finalize();
}
