import * as THREE from 'three';
import { Interior } from './Interior.js';
import { mulberry32 } from '../world/geom.js';
import { rectWindow, tubeLight, skirting, exitSign } from './roomkit.js';
import { slideTexture, whiteboardTexture } from './textures.js';

/**
 * Amphithéâtre (lecture hall) of Amphi 2 / Amphi 6 / S1 / S2 / S3, modelled from the user's photos:
 *  - raked concrete benches with white laminate tops, pine edge strips and folding wooden seats
 *  - speckled grey/white spray-plaster side walls and pilasters, cream front wall, black skirting
 *  - projection screen above two white boards, two wall TVs, teacher's dark desk, ceiling projector
 *  - stepped white ceiling with twin LED strips, teal and green steel doors, green-framed windows, red fire cabinet
 * Plan: x 0..18, z 0 (front wall / stage) .. 22 (rear landing). Tiers 1 m deep, 0.28 m rise.
 */
export function buildAmphi({ mats, tex }) {
  const W = 18, N = 13, Z0 = 5.0, PITCH = 1.0, RISE = 0.28, ZR = Z0 + N * PITCH, ZEND = 22, HL = RISE * N;   // HL = landing height
  const AISLE = 1.8;
  const it = new Interior('amphi', { name: 'Amphithéâtre', mats, tex, bg: 0x1b1d21, hemi: [0xf4f1ea, 0xbdb8aa, 0.5], envIntensity: 0.2, ceilingY: 4.4, camDist: 4.4 });
  const k = it.kit, rng = mulberry32(77);
  const ceil = [[0, 7, 4.4], [7, 12.2, 5.7], [12.2, 17, 6.7], [17, ZEND, 7.3]];
  it.ceilingAt = (x, z) => { for (const [a, b, h] of ceil) if (z < b) return h; return 7.3; };
  const floorY = (z) => (z < Z0 ? 0 : z >= ZR ? HL : RISE * (Math.floor(z - Z0) + 1));

  // ---- floor: stage + tiers + landing ----------------------------------------------------------------------------------
  k.span('terrazzo', 0, W, -0.1, 0, 0, Z0);
  for (let i = 0; i < N; i++) {
    const z0 = Z0 + i * PITCH, y = RISE * (i + 1);
    k.span('concrete', 0, W, 0, y - 0.03, z0, z0 + PITCH);                                   // body / riser
    k.span('terrazzo', 0, W, y - 0.03, y, z0, z0 + PITCH);                                   // tread
    it.floorSurface(0.2, z0, W - 0.2, z0 + PITCH, y);
  }
  k.span('concrete', 0, W, 0, HL - 0.03, ZR, ZEND); k.span('terrazzo', 0, W, HL - 0.03, HL, ZR, ZEND);
  it.floorSurface(0.2, ZR, W - 0.2, ZEND - 0.2, HL);

  // ---- ceiling (stepped) -----------------------------------------------------------------------------------------------
  for (const [a, b, h] of ceil) k.span('wallWhite', 0, W, h, h + 0.35, a, b);
  for (let i = 1; i < ceil.length; i++) k.span('wallWhite', 0, W, ceil[i - 1][2], ceil[i][2], ceil[i][0] - 0.02, ceil[i][0] + 0.02);
  for (let i = 1; i < ceil.length; i++) k.span('whiteLam', 0, W, ceil[i - 1][2] - 0.22, ceil[i - 1][2], ceil[i][0] - 0.5, ceil[i][0]);   // downstand beams

  // ---- walls -------------------------------------------------------------------------------------------------------------------
  const TOP = 7.4;
  k.span('speckle', -0.3, 0, 0, TOP, 0, ZEND); k.span('speckle', W, W + 0.3, 0, TOP, 0, ZEND);          // side walls
  k.span('speckle', 0, W, 0, TOP, ZEND, ZEND + 0.3);                                                      // rear wall
  k.span('speckle', 0, 4.4, 0, TOP, -0.3, 0); k.span('speckle', 13.6, W, 0, TOP, -0.3, 0);               // front wall sides
  k.span('wallYellow', 4.4, 13.6, 0, TOP, -0.3, 0);                                                       // cream centre
  for (const x0 of [3.3, 13.6]) k.span('speckle', x0, x0 + 1.1, 0, 4.4, 0, 0.5);                           // pilasters flanking the screen wall
  for (const [x0, x1] of [[0, 1.0], [W - 1.0, W]]) k.span('speckle', x0, x1, 0, 4.4, 0, 0.45);
  it.roomWalls(0, 0, W, ZEND);

  // skirting: black band along the walls, following the tiers
  skirting(it, 0.02, 0.02, 4.4, 0.02); skirting(it, 13.6, 0.02, W - 0.02, 0.02);
  for (let i = 0; i < N; i++) { const z0 = Z0 + i * PITCH, y = RISE * (i + 1); for (const x of [0.015, W - 0.015]) k.box('skirt', x, y + 0.05, z0 + PITCH / 2, 0.03, 0.1, PITCH); }
  k.box('skirt', 0.015, 0.05, Z0 / 2, 0.03, 0.1, Z0); k.box('skirt', W - 0.015, 0.05, Z0 / 2, 0.03, 0.1, Z0);

  // ---- front wall equipment ---------------------------------------------------------------------------------------------
  const cx = W / 2;
  k.span('metalDark', cx - 1.8, cx + 1.8, 4.1, 4.3, 0.0, 0.3);                                            // screen casing
  const slide = slideTexture();
  if (slide) it.picture(slide, 3.4, 2.05, cx, 2.98, 0.09, 0, { emissive: 0.55, rough: 0.9 }); else k.span('screenWhite', cx - 1.7, cx + 1.7, 1.95, 4.05, 0.05, 0.08);
  k.span('black', cx - 1.74, cx + 1.74, 1.9, 1.95, 0.04, 0.1); k.span('black', cx - 1.74, cx - 1.7, 1.9, 4.1, 0.04, 0.1); k.span('black', cx + 1.7, cx + 1.74, 1.9, 4.1, 0.04, 0.1);
  // two white boards under the screen
  for (const sd of [-1, 1]) {
    const bx = cx + sd * 0.92; k.span('frameAlu', bx - 0.9, bx + 0.9, 0.8, 1.84, 0.02, 0.06);
    const bt = whiteboardTexture([], { w: 1.8, h: 1.0 });
    if (bt) it.picture(bt, 1.76, 1.0, bx, 1.32, 0.075, 0, { rough: 0.35 }); else k.span('whiteLam', bx - 0.88, bx + 0.88, 0.82, 1.82, 0.06, 0.07);
  }
  k.span('metalGrey', cx - 1.85, cx + 1.85, 0.74, 0.8, 0.02, 0.1);                                        // board rail
  // two wall-mounted TVs
  for (const x of [cx - 3.2, cx + 3.2]) { k.span('black', x - 0.62, x + 0.62, 2.35, 3.05, 0.02, 0.07); k.span('screenOff', x - 0.58, x + 0.58, 2.39, 3.01, 0.07, 0.075); k.span('metalDark', x - 0.1, x + 0.1, 2.9, 3.05, 0.0, 0.02); }
  // projector on the ceiling
  k.span('metalDark', cx - 0.03, cx + 0.03, 3.5, 4.4, 2.97, 3.03); k.span('whiteLam', cx - 0.3, cx + 0.3, 3.38, 3.52, 2.8, 3.25); k.cyl('black', cx, 3.45, 2.76, 0.07, 0.1, 10);
  // teacher's desk and chair
  {
    const dx = 6.6, dz = 1.7;
    k.span('deskDark', dx - 0.85, dx + 0.85, 0.72, 0.76, dz - 0.4, dz + 0.4); k.span('deskDark', dx - 0.85, dx - 0.8, 0, 0.72, dz - 0.4, dz + 0.4); k.span('deskDark', dx + 0.8, dx + 0.85, 0, 0.72, dz - 0.4, dz + 0.4); k.span('deskDark', dx - 0.85, dx + 0.85, 0.2, 0.72, dz - 0.4, dz - 0.36);
    k.box('black', dx + 0.2, 0.78, dz + 0.05, 0.34, 0.02, 0.24); k.box('screenOff', dx + 0.2, 0.9, dz - 0.07, 0.34, 0.22, 0.012);
    k.box('black', dx - 0.4, 0.84, dz - 0.05, 0.3, 0.14, 0.3);
    it.solid(dx - 0.9, dz - 0.45, dx + 0.9, dz + 0.45, 'teacher-desk');
    for (const x of [cx + 1.8, 7.6]) {   // small metal chairs with wooden seats near the boards
      k.box('chairWoodDark', x, 0.45, 1.2, 0.4, 0.03, 0.4); k.box('chairWoodDark', x, 0.72, 1.0, 0.38, 0.22, 0.02);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box('metalDark', x + sx * 0.18, 0.22, 1.2 + sz * 0.17, 0.022, 0.44, 0.022);
    }
    k.span('deskDark', 11.6, 12.4, 0.74, 0.78, 1.0, 1.6); k.span('metalDark', 11.62, 11.66, 0, 0.74, 1.0, 1.04); k.span('metalDark', 12.34, 12.38, 0, 0.74, 1.56, 1.6);
    it.blob(2.2, 1.6, dx, dz, 0.012, 0.5);
  }
  // entrance: a teal steel door in the WEST side wall at stage level (not facing the benches)
  {
    const z = 2.7;
    k.span('frameGreen', 0, 0.14, 0, 2.2, z - 0.6, z + 0.6);
    k.span('doorTeal', 0.02, 0.1, 0, 2.12, z - 0.5, z + 0.5);
    k.span('metalGrey', 0.1, 0.17, 1.0, 1.04, z + 0.3, z + 0.4);
    it.addExit(0, z, 1, 0, 0, { standOff: 1.1, doorH: 2.1, markerScale: 0.8, markerY: 2.6, label: 'Sortir' });
    exitSign(it, 0.06, 2.55, z, Math.PI / 2);
  }
  // red fire cabinet and framed notice on the front wall
  k.span('red', 14.0, 14.45, 0.95, 1.95, 0.5, 0.64);

  // ---- tiers: two blocks of benches with a central aisle ------------------------------------------------------------------------
  const BLOCKS = [[0.9, W / 2 - 0.7], [W / 2 + 0.7, W - 0.9]];
  const SEAT = [[0.46, 0.035, 0.4, 0, 0.45, 0], [0.46, 0.2, 0.025, 0, 0.74, 0.2]];
  for (let i = 0; i < N; i++) {
    const z0 = Z0 + i * PITCH, y = RISE * (i + 1);
    for (const [X0, X1] of BLOCKS) {
      k.span('concrete', X0, X1, y, y + 0.7, z0 + 0.04, z0 + 0.46);
      k.span('woodPine', X0, X1, y + 0.7, y + 0.76, z0 + 0.02, z0 + 0.09);
      k.span('woodPine', X0, X1, y + 0.7, y + 0.76, z0 + 0.41, z0 + 0.48);
      k.span('whiteLam', X0, X1, y + 0.7, y + 0.74, z0 + 0.09, z0 + 0.41);
      it.solid(X0, z0, X1, z0 + 0.5, 'bench', y + 0.76);                       // can be climbed by jumping
      it.collision.addSurface([[X0, z0], [X1, z0], [X1, z0 + 0.5], [X0, z0 + 0.5]], y + 0.76, 'bench-top');
      const nSeat = Math.floor((X1 - X0) / 0.5);
      for (let s2 = 0; s2 < nSeat; s2++) {
        const x = X0 + ((X1 - X0) / nSeat) * (s2 + 0.5);
        k.place('amphiSeat', 'woodPine', SEAT, x, y, z0 + 0.8, 0);
      }
    }
    for (const x of [0.9, W - 0.9]) k.span('skirt', x - 0.7, x + 0.7, y - 0.28, y - 0.2, z0, z0 + 0.02);
  }

  // ---- landing: doors, table, windows, lights --------------------------------------------------------------------------------------------
  // green-framed windows high on both side walls (blue-ish glass, daylight behind)
  for (const z of [3.6, 8.2, 12.8, 17.4]) {
    rectWindow(it, { x: 0.01, y: 3.0, z, yaw: Math.PI / 2, w: 1.0, h: 1.9, pane: 'daylight', frameKey: 'frameGreen', mull: 1.0 });
    rectWindow(it, { x: W - 0.01, y: 3.0, z, yaw: -Math.PI / 2, w: 1.0, h: 1.9, pane: 'daylight', frameKey: 'frameGreen', mull: 1.0 });
  }
  // ceiling twin LED strips + lights
  for (const z of [1.8, 5.2, 8.6, 11.6, 14.4, 17.6, 20.4]) for (const x of [4.2, 9, 13.8]) tubeLight(it, x, it.ceilingAt(x, z) - 0.02, z, 'x', 1.5);
  it.light(0xfff2e0, 9, 9, 3.6, 3.0, 16, 1.6); it.light(0xfff2e0, 10, 9, 5.0, 8.8, 16, 1.6); it.light(0xfff2e0, 11, 9, 6.0, 13.5, 18, 1.6); it.light(0xfff2e0, 11, 9, 6.6, 19.5, 18, 1.6);
  

  // ---- spawn points ----------------------------------------------------------------------------------------------------------------------------------------
  it.spawns[0] = { x: 2.4, z: 2.7, yaw: -Math.PI / 2 };   // side door at the bottom: looking along the stage
  return it.finalize();
}
