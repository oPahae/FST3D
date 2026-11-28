import * as THREE from 'three';
import { exitSignTexture } from './textures.js';

/** Reusable room parts: arched windows, ceiling light fixtures, AC cassettes, double doors, signs, skirting. */

const _t = new THREE.Matrix4(), _r = new THREE.Matrix4();
const place = (x, y, z, yaw = 0) => _t.makeTranslation(x, y, z).multiply(_r.makeRotationY(yaw)).clone();

/** Arch-topped shape: width w, rectangular part hr, semicircular top. Origin at the bottom centre. */
export function archShape(w, hr, seg = 14) {
  const s = new THREE.Shape(), r = w / 2;
  s.moveTo(-r, 0); s.lineTo(r, 0); s.lineTo(r, hr);
  for (let i = 1; i <= seg; i++) { const a = (i / seg) * Math.PI; s.lineTo(Math.cos(a) * r, hr + Math.sin(a) * r); }
  s.lineTo(-r, 0);
  return s;
}

/** Arched window drawn on a wall (white frame, bright pane, cross bars). `yaw`: direction the wall faces (0 = +Z, PI = -Z, PI/2 = +X, -PI/2 = -X). */
export function archWindow(it, { x, y, z, yaw, w = 1.0, h = 1.8, pane = 'daylight', bars = true, frame = 0.08 }) {
  const k = it.kit, hr = h - w / 2;
  k.geo('white', new THREE.ShapeGeometry(archShape(w + frame * 2, hr + frame * 0.5)), place(x, y - frame * 0.5, z, yaw).multiply(new THREE.Matrix4().makeTranslation(0, 0, 0.012)));
  k.geo(pane, new THREE.ShapeGeometry(archShape(w, hr)), place(x, y, z, yaw).multiply(new THREE.Matrix4().makeTranslation(0, 0, 0.026)));
  if (bars) {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const at = (dx, dy, dz) => [x + dx * c + dz * s, y + dy, z - dx * s + dz * c];
    const [bx, by, bz] = at(0, hr * 0.55, 0.04);
    k.box('white', bx, by, bz, Math.abs(c) > 0.5 ? 0.04 : 0.04, hr * 1.1, Math.abs(c) > 0.5 ? 0.04 : 0.04, 0);
  }
}

/** Plain rectangular window (aluminium frame, bright pane) on a wall; `yaw` as above. */
export function rectWindow(it, { x, y, z, yaw, w, h, pane = 'daylight', frameKey = 'frameAlu', mull = 1.0, bar = 0.05 }) {
  const k = it.kit, c = Math.cos(yaw), s = Math.sin(yaw);
  const P = (dx, dy, dz) => [x + dx * c + dz * s, y + dy, z - dx * s + dz * c];
  const Sz = (sx, sy, sz) => (Math.abs(s) > 0.5 ? [sz, sy, sx] : [sx, sy, sz]);
  const box = (key, dx, dy, dz, sx, sy, sz) => { const [px, py, pz] = P(dx, dy, dz); const [a, b, d] = Sz(sx, sy, sz); k.box(key, px, py, pz, a, b, d); };
  box(pane, 0, h / 2, 0.02, w, h, 0.02);
  box(frameKey, 0, bar / 2, 0.05, w + bar * 2, bar, 0.1); box(frameKey, 0, h - bar / 2, 0.05, w + bar * 2, bar, 0.1);
  box(frameKey, -w / 2 - bar / 2, h / 2, 0.05, bar, h, 0.1); box(frameKey, w / 2 + bar / 2, h / 2, 0.05, bar, h, 0.1);
  const n = Math.max(1, Math.round(w / mull));
  for (let i = 1; i < n; i++) box(frameKey, -w / 2 + (w * i) / n, h / 2, 0.05, bar, h, 0.08);
}

/** Double-leaf louvred door seen from inside (same dark-green leaves as the library porch outside). */
export function louvredDoor(it, { x, z, yaw, w = 2.4, h = 2.65, key = 'frameGreen' }) {
  const k = it.kit, c = Math.cos(yaw), s = Math.sin(yaw);
  const P = (dx, dy, dz) => [x + dx * c + dz * s, dy, z - dx * s + dz * c];
  const Sz = (sx, sy, sz) => (Math.abs(s) > 0.5 ? [sz, sy, sx] : [sx, sy, sz]);
  const box = (m, dx, dy, dz, sx, sy, sz) => { const [px, py, pz] = P(dx, dy, dz); const [a, b, d] = Sz(sx, sy, sz); k.box(m, px, py, pz, a, b, d); };
  box('frameGreen', -w / 2 - 0.07, h / 2, 0.04, 0.14, h, 0.16); box('frameGreen', w / 2 + 0.07, h / 2, 0.04, 0.14, h, 0.16); box('frameGreen', 0, h + 0.07, 0.04, w + 0.28, 0.14, 0.16);
  for (const sd of [-1, 1]) {
    box(key, sd * (w / 4 + 0.01), h / 2, 0.05, w / 2 - 0.03, h - 0.02, 0.06);
    for (let i = 0; i < 12; i++) box('metalDark', sd * (w / 4 + 0.01), 0.35 + i * 0.19, 0.09, w / 2 - 0.2, 0.03, 0.025);
    box('metalGrey', sd * 0.1, 1.05, 0.11, 0.03, 0.5, 0.04);                      // pull handle
  }
  box('metalDark', 0, h / 2, 0.09, 0.02, h - 0.1, 0.03);
}

export function exitSign(it, x, y, z, yaw, text = 'SORTIE') {
  const tex = exitSignTexture(text);
  if (tex) it.picture(tex, 0.6, 0.22, x, y, z, yaw, { emissive: 0.9 });
}

/** Recessed twin fluorescent fixture (long axis along x or z). */
export function tubeLight(it, x, y, z, axis = 'x', len = 1.2) {
  const k = it.kit, sx = axis === 'x' ? len : 0.34, sz = axis === 'x' ? 0.34 : len;
  k.box('whiteLam', x, y, z, sx + 0.04, 0.03, sz + 0.04);
  for (const o of [-0.075, 0.075]) k.box('lamp', axis === 'x' ? x : x + o, y - 0.02, axis === 'x' ? z + o : z, axis === 'x' ? len - 0.04 : 0.05, 0.02, axis === 'x' ? 0.05 : len - 0.04);
}

/** Ceiling air-conditioning cassette (white square with dark vents). */
export function acCassette(it, x, y, z, s = 0.9) {
  const k = it.kit;
  k.box('white', x, y - 0.05, z, s, 0.1, s);
  k.box('metalDark', x, y - 0.105, z, s * 0.78, 0.012, s * 0.78);
  k.box('white', x, y - 0.115, z, s * 0.3, 0.012, s * 0.3);
}

/** Dark skirting board along a wall segment. */
export function skirting(it, x0, z0, x1, z1, h = 0.1, key = 'skirt') {
  const dx = x1 - x0, dz = z1 - z0, L = Math.hypot(dx, dz);
  it.kit.box(key, (x0 + x1) / 2, h / 2, (z0 + z1) / 2, L, h, 0.03, -Math.atan2(dz, dx));
}

/** Red wall-mounted fire extinguisher with its sign. */
export function extinguisher(it, x, z, yaw) {
  const k = it.kit, c = Math.cos(yaw), s = Math.sin(yaw);
  const px = x + s * 0.1, pz = z + c * 0.1;
  k.cyl('red', px, 0.95, pz, 0.075, 0.45, 12);
  k.cyl('metalDark', px, 1.22, pz, 0.03, 0.08, 8);
  k.box('red', x + s * 0.015, 1.7, z + c * 0.015, 0.3, 0.3, 0.02, yaw);
  k.box('white', x + s * 0.03, 1.7, z + c * 0.03, 0.18, 0.18, 0.01, yaw);
}

/** Straight Shape helper: curtain panel (pleated), hung from a rail. */
export function curtain(it, { x, z, yaw, w, top = 3.2, bottom = 0.1, key = 'curtainBrown' }) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  const h = top - bottom;
  const hz = Math.abs(s) > 0.5;
  const px = x + s * 0.09, pz = z + c * 0.09;
  it.kit.box(key, px, bottom + h / 2, pz, hz ? 0.16 : w, h, hz ? w : 0.16, 0);
  it.kit.box('metalDark', x + s * 0.09, top + 0.05, z + c * 0.09, hz ? 0.05 : w + 0.1, 0.04, hz ? w + 0.1 : 0.05, 0);
}
