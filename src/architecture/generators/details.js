import * as THREE from 'three';
import { edgeBox, floorLevels } from '../facade.js';
import { bayGeometry } from '../shapes.js';
import { basis } from '../Builder.js';
import { buildStairs } from '../stairs.js';

/** Hand-modelled architectural details taken from the user's field photos (v0.7c). All helpers work in an edge frame (u along, out = outward). */

const doorsOf = (edges) => edges.flatMap((e) => e.openings.filter((o) => o.kind === 'door').map((o) => ({ e, o })));
const pt = (e, u, out) => [e.a[0] + e.d[0] * u + e.n[0] * out, e.a[1] + e.d[1] * u + e.n[1] * out];
const rectOf = (e, u0, u1, o0, o1) => [pt(e, u0, o0), pt(e, u1, o0), pt(e, u1, o1), pt(e, u0, o1)];

/** Recessed entrance (photo list v0.7c, Block B corridor): w x dep metres, back wall with a window (left) and a green door (right), green doors on both side walls. */
export function niche(ctx, edges, shared, spec) {
  const { b } = ctx;
  const P = shared.nuToM(spec.nu);
  let best = null;
  for (const e of edges) {
    if (e.party || (spec.face && e.face !== spec.face)) continue;
    const u = (P[0] - e.a[0]) * e.d[0] + (P[1] - e.a[1]) * e.d[1], out = (P[0] - e.a[0]) * e.n[0] + (P[1] - e.a[1]) * e.n[1];
    if (u < 0 || u > e.len) continue;
    if (!best || Math.abs(out) < Math.abs(best.out)) best = { e, u, out };
  }
  if (!best) return null;
  const { e } = best, u = Math.max(spec.w / 2 + 2.5, Math.min(e.len - spec.w / 2 - 2.5, best.u)), w = spec.w ?? 5, dep = spec.d ?? 3, H = spec.h ?? 3.1;
  e.openings.push({ kind: 'passage', u, width: w, height: H, arch: false });
  const wall = ctx.cfg.wallMat || 'wallCream';
  edgeBox(b, wall, e, u - w / 2 - 0.25, u - w / 2, 0, H + 0.2, 0, dep + 0.25);       // side walls
  edgeBox(b, wall, e, u + w / 2, u + w / 2 + 0.25, 0, H + 0.2, 0, dep + 0.25);
  edgeBox(b, wall, e, u - w / 2, u + w / 2, 0, H + 0.2, -dep, dep + 0.25);            // back wall
  edgeBox(b, 'floorTile', e, u - w / 2, u + w / 2, 0, 0.06, 0.05, dep);
  edgeBox(b, 'ceiling', e, u - w / 2, u + w / 2, H, H + 0.12, 0.05, dep);
  const dl = (uu, o0, o1) => edgeBox(b, 'frameGreen', e, uu - 0.5, uu + 0.5, 0, 2.3, o0, o1);
  dl(u - w * 0.25, -(dep - 0.12), dep);                                               // back wall: green door on the right (viewer inside, facing the back)
  edgeBox(b, 'frameGreen', e, u + w * 0.25 - 0.78, u + w * 0.25 + 0.78, 0.92, 2.32, -(dep - 0.1), dep);   // window frame on the left
  edgeBox(b, 'glass', e, u + w * 0.25 - 0.66, u + w * 0.25 + 0.66, 1.04, 2.2, -(dep - 0.14), dep - 0.04);
  for (const sd of [-1, 1]) {                                                          // green doors on the left and right walls
    const uu = u + sd * (w / 2 - 0.02);
    edgeBox(b, 'frameGreen', e, uu - (sd > 0 ? 0.1 : 0), uu + (sd > 0 ? 0 : 0.1), 0, 2.3, -(dep / 2 - 0.55), dep / 2 + 0.55);
    edgeBox(b, 'frameDark', e, uu - (sd > 0 ? 0.12 : 0), uu + (sd > 0 ? 0 : 0.12), 1.0, 1.1, -(dep / 2 - 0.5), dep / 2 + 0.5);
  }
  if (spec.label && typeof document !== 'undefined' && document.createElement('canvas').getContext) {   // door plaque on the right-hand side-wall door (the one beside the back-right door)
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128;
    const g = cv.getContext('2d'); g.fillStyle = '#1f6b3a'; g.fillRect(0, 0, 256, 128); g.strokeStyle = '#f2f2ea'; g.lineWidth = 6; g.strokeRect(6, 6, 244, 116);
    g.fillStyle = '#f2f2ea'; g.font = 'bold 78px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(spec.label, 128, 68);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.4), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }));
    const [px, pz] = pt(e, u - w / 2 + 0.14, -dep / 2);
    m.position.set(px, 2.55, pz); m.rotation.y = Math.atan2(e.d[0], e.d[1]);                  // faces +d (into the niche)
    shared.extras.push(m);
  }
  if (spec.enter) {   // v0.8: the plaque door (left side wall of the niche) leads to an interior world
    const [dx, dz] = pt(e, u - w / 2 + 0.02, -dep / 2);
    shared.enterDoors.push({ building: ctx.cfg.id, world: spec.enter, slot: spec.slot ?? 0, x: dx, z: dz, nx: e.d[0], nz: e.d[1], standOff: 0.95, doorH: 2.3, markerScale: 0.45, id: `${ctx.cfg.id}#${spec.enter}` });
  }
  return { cuts: [rectOf(e, u - w / 2, u + w / 2, 0.9, -(dep - 0.05))] };
}

/** Porch of the "bibliothèque" door (photos porte de bibliothèque 1 & 2): two square concrete piers carrying a flat slab over a dark-green louvred double door. */
export function libraryPortico(ctx, edges, shared, spec) {
  const { b } = ctx;
  const P = shared.nuToM(spec.nu);
  let best = null;
  for (const { e, o } of doorsOf(edges)) { const q = pt(e, o.u, 0), d = Math.hypot(q[0] - P[0], q[1] - P[1]); if (!best || d < best.d) best = { e, o, d }; }
  if (!best) return;
  const { e, o } = best, u = o.u, dh = 2.7, sl = 3.5;
  edgeBox(b, 'concrete', e, u - 2.7, u + 2.7, sl, sl + 0.4, 2.7, 0.35);                  // canopy slab
  edgeBox(b, 'trim', e, u - 2.7, u + 2.7, sl + 0.4, sl + 0.5, 2.75, 0.3);
  for (const sd of [-1, 1]) {
    edgeBox(b, 'concrete', e, u + sd * 2.2 - 0.38, u + sd * 2.2 + 0.38, 0, sl, 2.55, -1.8);   // front piers
    edgeBox(b, 'trim', e, u + sd * 1.45 - 0.3, u + sd * 1.45 + 0.3, 0, sl + 0.4, 0.28, 0);      // pilasters beside the door
  }
  edgeBox(b, 'frameGreen', e, u - 1.15, u + 1.15, 0.05, dh, 0.1, 0);                         // louvred leaves
  for (let k = 0; k < 14; k++) edgeBox(b, 'frameDark', e, u - 1.1, u + 1.1, 0.35 + k * 0.17, 0.4 + k * 0.17, 0.14, 0);
  edgeBox(b, 'trim', e, u - 0.02, u + 0.02, 0.05, dh, 0.16, 0);
  edgeBox(b, 'stone', e, u - 1.5, u + 1.5, 0, 0.12, 1.0, 0);                                   // marble step
  // stepped recess and arched window above the porch (photo 2)
  for (const sd of [-1, 1]) { edgeBox(b, 'trim', e, u + sd * 1.25 - 0.14, u + sd * 1.25 + 0.14, sl + 0.5, sl + 3.4, 0.1, 0); edgeBox(b, 'trim', e, u + sd * 1.0 - 0.1, u + sd * 1.0 + 0.1, sl + 0.5, sl + 3.1, 0.18, 0); }
  edgeBox(b, 'trim', e, u - 1.45, u + 1.45, sl + 3.4, sl + 3.6, 0.12, 0);
  edgeBox(b, 'trim', e, u - 1.2, u + 1.2, sl + 3.6, sl + 3.8, 0.2, 0);
}

/** West face of the PV building (photo "passage pv bldg"): red cladding block cantilevered over the white ground floor, white soffit, railing with pointed posts, small red entrance box. */
export function pvFront(ctx, edges, shared, spec) {
  const { b, collision } = ctx;
  const ys = floorLevels(ctx.cfg), topY = ys[ctx.cfg.floors], H0 = ys[1];
  const cands = edges.filter((e) => !e.party && e.side === 'W').sort((p, q) => q.len - p.len);
  const e = cands[0]; if (!e) return;
  const proj = 1.5, L = e.len;
  edgeBox(b, 'wallRed', e, 2, L - 2, H0, topY, proj, 0);
  edgeBox(b, 'wallWhiteClad', e, 2, L - 2, H0 - 0.08, H0 + 0.02, proj, 0);
  for (let f = 1; f < ctx.cfg.floors; f++) {
    edgeBox(b, 'wallWhiteClad', e, 2, L - 2, ys[f] + 0.9, ys[f] + 1.0, proj + 0.03, 0);
    const n = Math.max(2, Math.round((L - 5) / 3.2));
    for (let k = 0; k < n; k++) { const u0 = 3 + ((L - 6) * k) / n + 0.3, u1 = 3 + ((L - 6) * (k + 1)) / n - 0.3; edgeBox(b, 'glass', e, u0, u1, ys[f] + 1.3, ys[f] + 2.55, proj + 0.04, -(proj - 0.02)); }
  }
  // v0.7e (photo "passage pv bldg"): ground floor clad in white panels with dark joints, brick base, a single lattice panel at the near end
  edgeBox(b, 'wallWhiteClad', e, 2, L - 2, 0.9, H0, 0.35, 0);
  edgeBox(b, 'brick', e, 2, L - 2, 0, 0.9, 0.4, 0);
  edgeBox(b, 'mashrabiya', e, 2.4, 6.4, 1.1, H0 - 0.25, 0.4, 0.3);
  for (const y of [1.8, 2.6]) edgeBox(b, 'frameDark', e, 6.4, L - 2, y, y + 0.03, 0.37, 0);
  for (let u = 8; u < L - 2; u += 3.6) edgeBox(b, 'frameDark', e, u, u + 0.03, 0.9, H0, 0.37, 0);
  // mouth of the PV passage on this edge: no railing there
  let um = null;
  for (const ps of shared.passagesFor(ctx.cfg.id)) { const mz = ps.p[1]; um = (e.a[0] - e.a[0]) * e.d[0] + (mz - e.a[1]) * e.d[1]; }
  const gap = um == null ? null : [um - 5.2, um + 5.2];
  const out = 1.0, posts = [];
  for (let u = 2.5; u <= L - 2.5; u += 3) if (!gap || u < gap[0] || u > gap[1]) posts.push(u);
  for (const u of posts) { edgeBox(b, 'trim', e, u - 0.13, u + 0.13, 0, 1.2, out + 0.13, -(out - 0.13)); edgeBox(b, 'trim', e, u - 0.08, u + 0.08, 1.2, 1.38, out + 0.08, -(out - 0.08)); }
  const runs = []; let cur = null;
  for (let u = 2.5; u <= L - 2.5 + 1e-6; u += 3) { const ok = !gap || u < gap[0] || u > gap[1]; if (ok) { if (!cur) cur = [u, u]; else cur[1] = u; } else if (cur) { runs.push(cur); cur = null; } }
  if (cur) runs.push(cur);
  for (const [u0, u1] of runs) {
    if (u1 - u0 < 0.5) continue;
    for (const y of [0.45, 0.8, 1.12]) edgeBox(b, 'trim', e, u0, u1, y, y + 0.05, out + 0.03, -(out - 0.03));
    edgeBox(b, 'brick', e, u0, u1, 0, 0.5, out - 0.35 + 0.1, -(out - 0.35 - 0.1));   // low brick plinth behind the rails
    collision.addPolygon(rectOf(e, u0 - 0.15, u1 + 0.15, out + 0.1, out - 0.1), [], 'pv-railing');
  }
  // small red entrance box with a dark doorway, near the far end
  const ue = L - 6.5;
  edgeBox(b, 'wallRed', e, ue - 1.3, ue + 1.3, 0, H0 + 0.1, 1.2, 0);
  edgeBox(b, 'black', e, ue - 0.75, ue + 0.75, 0, 2.5, 1.24, -1.0);
  collision.addPolygon(rectOf(e, ue - 1.3, ue + 1.3, 1.2, 0), [], 'pv-box');
}

/** West mouth of the PV passage (photo "sortie pv bldg"): white cladding canopy, square brick pier, low brick wall with a white railing, orange door, curved brick balconies. */
export function pvExit(ctx, edges, shared) {
  const { b, collision } = ctx;
  const ys = floorLevels(ctx.cfg);
  const e = edges.filter((q) => !q.party && q.side === 'E').sort((p, q) => q.len - p.len)[0]; if (!e) return;   // v0.7e: the exit is on the back (east) face
  const ps = shared.passagesFor(ctx.cfg.id)[0]; if (!ps) return;
  const proj = (q) => (q[0] - e.a[0]) * e.d[0] + (q[1] - e.a[1]) * e.d[1], off = (q) => Math.abs((q[0] - e.a[0]) * e.n[0] + (q[1] - e.a[1]) * e.n[1]);
  const u = proj(off(ps.p) < off(ps.q) ? ps.p : ps.q);
  const w = ps.width;
  edgeBox(b, 'wallWhiteClad', e, u - w / 2 - 2.2, u + w / 2 + 6.5, 3.5, 4.3, 3.8, 0);          // canopy
  edgeBox(b, 'wallWhiteClad', e, u - w / 2 - 2.2, u + w / 2 + 6.5, 4.3, 4.45, 3.85, 0);
  const up = u + w / 2 + 3.3;
  edgeBox(b, 'brick', e, up - 0.6, up + 0.6, 0, 3.5, 3.6, 2.4);                                   // brick pier
  collision.addPolygon(rectOf(e, up - 0.6, up + 0.6, 3.6, 2.4), [], 'pv-pier');
  edgeBox(b, 'brick', e, u + w / 2 + 0.4, u + w / 2 + 6.2, 0, 1.0, 3.0, -2.7);                      // low brick wall in front of the white recess
  for (const y of [1.2, 1.55]) edgeBox(b, 'trim', e, u + w / 2 + 0.4, u + w / 2 + 6.2, y, y + 0.05, 3.0, -2.95);
  for (let k = 0; k <= 5; k++) edgeBox(b, 'trim', e, u + w / 2 + 0.5 + k * 1.1 - 0.04, u + w / 2 + 0.5 + k * 1.1 + 0.04, 1.0, 1.6, 3.0, -2.95);
  collision.addPolygon(rectOf(e, u + w / 2 + 0.3, u + w / 2 + 6.3, 3.0, 2.7), [], 'pv-lowwall');
  edgeBox(b, 'wallWhiteClad', e, u + w / 2 + 0.4, u + w / 2 + 6.8, 0, 3.5, 0.3, 0);               // white recessed wall + orange door
  edgeBox(b, 'orange', e, u + w / 2 + 3.2, u + w / 2 + 5.0, 0, 2.6, 0.36, 0);
  edgeBox(b, 'frameDark', e, u + w / 2 + 3.9, u + w / 2 + 4.3, 1.0, 1.8, 0.4, 0);
  // curved brick balconies on the red face, to the other side of the opening
  const ub = u - w / 2 - 3.3, c = pt(e, ub, 0);
  for (const f of [1, 2]) {
    const y = ys[f] + 1.2;
    const g = new THREE.CylinderGeometry(1.7, 1.7, 1.1, 16, 1, false, 0, Math.PI);
    b.addGeometry('brick', g, new THREE.Matrix4().compose(new THREE.Vector3(c[0], y, c[1]), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.atan2(-e.n[1], e.n[0]), 0)), new THREE.Vector3(1, 1, 1)));
    const r = new THREE.CylinderGeometry(1.75, 1.75, 0.08, 16, 1, false, 0, Math.PI);
    b.addGeometry('trim', r, new THREE.Matrix4().compose(new THREE.Vector3(c[0], y + 0.6, c[1]), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.atan2(-e.n[1], e.n[0]), 0)), new THREE.Vector3(1, 1, 1)));
  }
}


const sideEdge = (edges, side) => edges.filter((q) => !q.party && q.side === side).sort((p, q) => q.len - p.len)[0];

/** Boulevard face of the copy centre (photo "centre de copie"): white render, three round arches (small - wide - small) with green doors, lattice grille, plain wall on the right. */
export function copyFront(ctx, edges, shared) {
  const { b, collision } = ctx;
  const e = sideEdge(edges, 'E'); if (!e) return;
  const H = (ctx.cfg.groundH || 3.4) - 0.1, proj = 1.3, t = 0.35, UP = new THREE.Vector3(0, 1, 0);
  const D3 = new THREE.Vector3(e.d[0], 0, e.d[1]), N3 = new THREE.Vector3(e.n[0], 0, e.n[1]);
  const bays = [[2.2, 1.7, 2.5], [3.0, 2.5, 3.0], [2.2, 1.7, 2.5]];
  let u = 1.6; const u0 = u;
  edgeBox(b, 'stone', e, u0 - 0.1, u0 + 7.5, 0, 0.4, proj + 0.5, 0);                        // raised platform + step in front of the arcade
  for (const [w, ow, oh] of bays) {
    const { geo } = bayGeometry(w, H, t, { kind: 'arch', ow, oh, y0: 0.4 });
    const o = pt(e, u, proj);
    b.addGeometry('wall', geo, basis(new THREE.Vector3(o[0], 0, o[1]), D3, UP, N3.clone().multiplyScalar(-1)));
    u += w;
  }
  const u1 = u;
  edgeBox(b, 'trim', e, u0, u1, H, H + 0.12, proj + 0.1, 0);                                 // cornice
  edgeBox(b, 'wall', e, u0, u1, H - 0.05, H + 0.02, proj, 0);
  for (const uu of [u0, u1 - 0.3]) edgeBox(b, 'wall', e, uu, uu + 0.3, 0.4, H, proj, 0);      // loggia end walls
  edgeBox(b, 'wall', e, u0, u1, H - 0.4, H, proj, 0);                                        // loggia roof / lintel
  // back wall of the loggia: doors and windows
  const cB = u0 + 2.2 + 1.5;
  edgeBox(b, 'frameGreen', e, cB - 0.85, cB + 0.85, 0.4, 2.7, 0.12, 0);                      // central green double door
  edgeBox(b, 'frameDark', e, cB - 0.03, cB + 0.03, 0.4, 2.7, 0.16, 0);
  edgeBox(b, 'frameGreen', e, cB + 0.95, cB + 1.25, 0.6, 2.7, 0.12, 0);                      // lattice grille beside it
  for (let k = 0; k < 4; k++) edgeBox(b, 'frameGreen', e, cB + 0.95, cB + 1.25, 0.8 + k * 0.5, 0.86 + k * 0.5, 0.15, 0);
  const cA = u0 + 1.1, cC = u1 - 1.1;
  edgeBox(b, 'frameGreen', e, cA - 0.95, cA - 0.2, 0.4, 2.35, 0.12, 0); edgeBox(b, 'glass', e, cA + 0.05, cA + 0.7, 1.2, 2.3, 0.1, 0);   // left arch: door left, window right
  edgeBox(b, 'glass', e, cC - 0.7, cC - 0.05, 1.2, 2.3, 0.1, 0); edgeBox(b, 'frameGreen', e, cC + 0.2, cC + 0.95, 0.4, 2.35, 0.12, 0);   // right arch: window left, door right
  collision.addPolygon(rectOf(e, u0 - 0.1, u1 + 0.1, proj + 0.5, proj - 0.2), [], 'copy-arcade');
}

/** Face of the Buvette that looks at the copy centre (photo "derrière buvette"): brick piers, three brown-framed glazed shop doors, full-width granite steps, granite cheek wall. */
export function buvetteFront(ctx, edges, shared) {
  const { b, collision } = ctx;
  const e = sideEdge(edges, 'N'); if (!e) return;
  const L = e.len, H = ctx.cfg.groundH || 4.2, plat = 1.4, steps = 4, rise = 0.15, tread = 0.36, PH = steps * rise;
  const cuts = [[1.4, 5.3], [6.4, 9.6], [10.5, 12.4]];
  edgeBox(b, 'brick', e, 0, L, 0, H, 0.12, 0);                                               // brick skin
  let first = true;
  for (const [a, c] of cuts) {
    const cc = Math.min(c, L - 0.4);
    edgeBox(b, 'wallCream', e, a, cc, PH, H - 0.9, 0.16, 0);                                   // recessed glazing zone
    edgeBox(b, 'glass', e, a + 0.1, cc - 0.1, PH + 0.05, H - 1.0, 0.2, 0);
    edgeBox(b, 'frameDark', e, a, cc, PH, PH + 0.1, 0.24, 0); edgeBox(b, 'frameDark', e, a, cc, H - 1.1, H - 1.0, 0.24, 0);
    const n = Math.max(2, Math.round((cc - a) / 1.3));
    for (let k = 0; k <= n; k++) { const uu = a + ((cc - a) * k) / n; edgeBox(b, 'frameDark', e, uu - 0.05, uu + 0.05, PH, H - 1.0, 0.26, 0); }
    edgeBox(b, 'trim', e, a - 0.1, cc + 0.1, H - 0.9, H - 0.8, 0.5, 0);                        // lintel slab
    first = false;
  }
  edgeBox(b, 'stone', e, 0, L, 0, PH, plat, 0);                                              // granite platform
  collision.addSurface(rectOf(e, 0.3, L - 0.3, plat, 0.02), PH, 'buv-platform');
  const mid = (e.a[0] + e.d[0] * L / 2), midz = e.a[1] + e.d[1] * L / 2;
  const o = pt(e, L / 2, plat + steps * tread);
  buildStairs({ b, collision }, { origin: o, dir: [-e.n[0], -e.n[1]], width: L - 0.8, steps, rise, tread, mat: 'stone' });
  edgeBox(b, 'stone', e, L - 0.4, L, 0, PH + 0.9, plat + steps * tread, 0);                  // granite cheek wall on one side
  collision.addPolygon(rectOf(e, L - 0.4, L, plat + steps * tread, 0), [], 'buv-cheek');
  // v0.9: enter marker only (the façade is unchanged) on the boulevard (east) face
  const eE = sideEdge(edges, 'E');
  if (eE && shared && shared.enterDoors) { const u = eE.len * 0.3 + (eE.d[1] > 0 ? 1.9 : -1.9), p = pt(eE, u, 0); shared.enterDoors.push({ building: 'BUVETTE', world: 'buvette', slot: 0, x: p[0], z: p[1], nx: eE.n[0], nz: eE.n[1], standOff: 1.8, doorH: 2.6, markerScale: 0.8, markerY: 2.8, id: 'BUVETTE#0' }); }
}
