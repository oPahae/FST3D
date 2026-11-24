import * as THREE from 'three';
import { flatPoly, bayGeometry } from '../architecture/shapes.js';
import { basis } from '../architecture/Builder.js';
import { addPalm, addCypress, addWeeping } from './planting.js';
import { hedgeLine } from './Environment.js';
import { worldUV } from './ribbon.js';
import { buildStairs } from '../architecture/stairs.js';

const ARC = (cx, cz, R, a) => [cx + Math.cos(a) * R, cz + Math.sin(a) * R];

/** Curved band of sloped roof with metric UVs (for the tile texture). Inner edge higher than the outer one. */
function arcRoof(cx, cz, r0, r1, a0, a1, y0, y1, n) {
  const pos = [], uv = [], idx = [];
  let s = 0;
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    const [xi, zi] = ARC(cx, cz, r0, a), [xo, zo] = ARC(cx, cz, r1, a);
    if (i) s += ((a1 - a0) / n) * ((r0 + r1) / 2);
    pos.push(xi, y0, zi, xo, y1, zo);
    uv.push(s, 0, s, Math.hypot(r1 - r0, y0 - y1));
  }
  for (let i = 0; i < n; i++) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

/** Semicircular pergola at the south end of the forecourt (field photos "South forecourt plaza"). */
function curvedPergola(f, { b, collision, toM, mats, addMesh, mPaving }) {
  const [cx, cz] = toM(f.center), R = f.radiusNU * toM([1, 0])[0];
  const A0 = 0, A1 = Math.PI;
  const H = f.platformH || 0;   // v0.6: the pergola stands on a raised platform (field photo "South forecourt plaza": two doors at its base, flights of steps left and right)
  if (H) {
    const RP = R + 1.8, pl = [[cx - RP, cz]]; for (let i = 0; i <= 32; i++) pl.push(ARC(cx, cz, RP, Math.PI - (i / 32) * Math.PI));
    collision.addSurface(pl.map(([x, z]) => [x, z]), H, `${f.id}:platform`);
    b.yOff = 0;
    for (let i = 0; i < 32; i++) { const a0 = (i / 32) * Math.PI, a1 = ((i + 1) / 32) * Math.PI, [x0, z0] = ARC(cx, cz, RP, a0), [x1, z1] = ARC(cx, cz, RP, a1); b.wallBox('wallOcher', x0, z0, x1, z1, 0, H, 0.6); b.wallBox('plinth', x0, z0, x1, z1, 0, 0.5, 0.75); b.wallBox('trim', x0, z0, x1, z1, H, H + 0.12, 0.8); }
    const stairX = [-(R - 1.6), R - 1.6], sw = 3.2, steps = Math.round(H / 0.17), tread = 0.34;
    const segs = [[-RP, stairX[0] - sw / 2 - 0.25], [stairX[0] + sw / 2 + 0.25, stairX[1] - sw / 2 - 0.25], [stairX[1] + sw / 2 + 0.25, RP]];
    for (const [u0, u1] of segs) { b.wallBox('wallOcher', cx + u0, cz - 0.3, cx + u1, cz - 0.3, 0, H, 0.6); b.wallBox('plinth', cx + u0, cz - 0.3, cx + u1, cz - 0.3, 0, 0.5, 0.75); b.wallBox('trim', cx + u0, cz - 0.3, cx + u1, cz - 0.3, H, H + 0.12, 0.8); }
    for (const sx of stairX) {
      buildStairs({ b, collision }, { origin: [cx + sx, cz - 0.3 - steps * tread], dir: [0, 1], width: sw, steps, rise: H / steps, tread, mat: 'concrete' });
      for (const sd of [-1, 1]) { b.box('wallOcher', cx + sx + sd * (sw / 2 + 0.15), H * 0.5, cz - 0.3 - (steps * tread) / 2, 0.3, H, steps * tread); b.box('trim', cx + sx + sd * (sw / 2 + 0.15), H + 0.06, cz - 0.3 - (steps * tread) / 2, 0.4, 0.12, steps * tread + 0.2); }
    }
    // two doors at the base of the platform wall (decorative, they do not open)
    for (const dx of [-2.6, 2.6]) {
      b.box('trim', cx + dx, 0.95, cz - 0.64, 2.0, 1.9, 0.1); b.box('black', cx + dx, 0.9, cz - 0.7, 1.5, 1.7, 0.06);
      b.box('frameDark', cx + dx, 0.9, cz - 0.75, 0.05, 1.7, 0.03); b.box('trim', cx + dx, 1.95, cz - 0.66, 2.3, 0.14, 0.2);
    }
    b.yOff = H;
  }
  // paved semicircle (rectangular pavers)
  const pts = [[cx - R - 1.2, cz]];
  for (let i = 0; i <= 32; i++) pts.push(ARC(cx, cz, R + 1.2, Math.PI - (i / 32) * Math.PI));
  addMesh(worldUV(flatPoly(pts.map(([x, z]) => [x, z]).reverse(), [], 0.09 + H)), mPaving, 0, `${f.id}:floor`);
  // posts avoid the forecourt axis (angle 90 deg) so the axial path stays open
  const angles = []; for (let k = 0; k < 8; k++) angles.push(Math.PI * (0.0625 + k * 0.125));
  for (const a of angles) {
    const [x, z] = ARC(cx, cz, R, a);
    b.box('plinth', x, 0.3, z, 0.8, 0.6, 0.8, -a);
    b.box('wallSand', x, 1.9, z, 0.55, 3.2, 0.55, -a);
    b.box('wallOcher', x, 0.8, z, 0.62, 0.5, 0.62, -a);
    collision.addCircle(x, z, 0.4, 'pergola-post');
  }
  // curved fascia between the posts
  for (let i = 0; i < angles.length - 1; i++) {
    if (Math.abs(angles[i] + angles[i + 1] - Math.PI) < 0.01) continue;       // gap on the axis
    const [x0, z0] = ARC(cx, cz, R, angles[i]), [x1, z1] = ARC(cx, cz, R, angles[i + 1]);
    b.wallBox('wallSand', x0, z0, x1, z1, 3.0, 3.7, 0.7);
  }
  // green tile band, higher on the inner side
  const roof = arcRoof(cx, cz, R - 1.7, R + 1.7, A0 + 0.04, A1 - 0.04, 4.1, 3.55, 40);
  addMesh(roof, mats.tile, H, `${f.id}:roof`);
  // curved low wall in front (yellow render, dark green cap), open on the axis
  for (let i = 0; i < 24; i++) {
    const a0 = (i / 24) * Math.PI, a1 = ((i + 1) / 24) * Math.PI;
    if (Math.abs((a0 + a1) / 2 - Math.PI / 2) < 0.2) continue;
    const [x0, z0] = ARC(cx, cz, R - 1.9, a0), [x1, z1] = ARC(cx, cz, R - 1.9, a1);
    b.wallBox('wallOcher', x0, z0, x1, z1, 0, 0.62, 0.45);
    b.wallBox('frameGreen', x0, z0, x1, z1, 0.62, 0.7, 0.55);
    collision.addPolygon([[x0 - 0.2, z0], [x1 - 0.2, z1], [x1 + 0.2, z1], [x0 + 0.2, z0]], [], `${f.id}:wall`);
  }
  b.yOff = 0;
}

/** Mini football pitch with artificial turf, markings, goals and a fence on a low wall (field photos in the "Amphi 6" folder). */
function pitch(f, { b, collision, toM, mats, addMesh }) {
  const pts = f.polygon.map(toM);
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  for (const [x, z] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, W = x1 - x0, L = z1 - z0;
  addMesh(worldUV(flatPoly([[x0, z0], [x1, z0], [x1, z1], [x0, z1]], [], 0.1)), mats.turf, 0, `${f.id}:turf`);
  const m = 1.2;   // markings inset
  const line = (ax, az, bx, bz) => b.wallBox('trim', ax, az, bx, bz, 0.1, 0.12, 0.1);
  line(x0 + m, z0 + m, x1 - m, z0 + m); line(x1 - m, z0 + m, x1 - m, z1 - m); line(x1 - m, z1 - m, x0 + m, z1 - m); line(x0 + m, z1 - m, x0 + m, z0 + m);
  line(x0 + m, cz, x1 - m, cz);
  for (let i = 0; i < 24; i++) { const a0 = (i / 24) * 6.2832, a1 = ((i + 1) / 24) * 6.2832; line(cx + Math.cos(a0) * 2.2, cz + Math.sin(a0) * 2.2, cx + Math.cos(a1) * 2.2, cz + Math.sin(a1) * 2.2); }
  for (const zz of [z0 + m, z1 - m]) { for (const s of [-1, 1]) b.box('trim', cx + s * 1.5, 1.0, zz, 0.1, 2.0, 0.1); b.box('trim', cx, 2.0, zz, 3.1, 0.1, 0.1); }
  // low wall + chain-link fence
  const ring = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
  for (let i = 0; i < 4; i++) {
    const a = ring[i], c = ring[(i + 1) % 4];
    b.wallBox('wallOcher', a[0], a[1], c[0], c[1], 0, 0.7, 0.3);
    b.wallBox('glassHouse', a[0], a[1], c[0], c[1], 0.7, 3.6, 0.03);
    b.wallBox('frameGreen', a[0], a[1], c[0], c[1], 3.55, 3.62, 0.06);
    const n = Math.max(2, Math.round(Math.hypot(c[0] - a[0], c[1] - a[1]) / 3));
    for (let k = 0; k <= n; k++) b.box('frameGreen', a[0] + ((c[0] - a[0]) * k) / n, 2.1, a[1] + ((c[1] - a[1]) * k) / n, 0.1, 4.2, 0.1);
  }
  collision.addPolygon(ring, [], f.id);
}

/** Concrete steps across a garden path (field photos "East connector patio"): steps up, a short paved landing, steps down. */
function stepTerrace(f, { b, collision, toM }) {
  const [cx, cz] = toM(f.center);
  const steps = f.steps ?? 4, rise = 0.17, T = 0.34, h = rise * steps, L = f.lengthM ?? 6, W = f.widthM ?? 3.8;
  const ctx = { b, collision };
  b.box('stone', cx, h / 2, cz, L, h, W);
  b.box('paving', cx, h + 0.02, cz, L - 0.1, 0.04, W - 0.1);
  collision.addSurface([[cx - L / 2, cz - W / 2], [cx + L / 2, cz - W / 2], [cx + L / 2, cz + W / 2], [cx - L / 2, cz + W / 2]], h, f.id);
  buildStairs(ctx, { origin: [cx - L / 2 - steps * T, cz], dir: [1, 0], width: W, steps, rise, tread: T, mat: 'stone' });
  buildStairs(ctx, { origin: [cx + L / 2 + steps * T, cz], dir: [-1, 0], width: W, steps, rise, tread: T, mat: 'stone' });
  // low cheek walls along the sides of the landing
  for (const s of [-1, 1]) b.box('stone', cx, h + 0.2, cz + s * (W / 2 + 0.15), L, 0.4, 0.3);
}

/** Yellow/black speed bump across the boulevard (field photo "Boulevard entre white halls"). */
function speedBump(f, { b, toM, layout }) {
  const [x, z] = toM(f.position);
  const road = layout.roads.find((r) => r.id === f.road);
  const w = ((road && road.widthNU) || 0.05) * toM([1, 0])[0];
  const n = Math.round(w / 0.9);
  for (let i = 0; i < n; i++) b.box(i % 2 ? 'black' : 'stripeY', x, 0.08, z - w / 2 + ((i + 0.5) * w) / n, 0.7, 0.1, w / n);
}

/** Continuous covered corridor (cloister) round the central garden, attached to the building faces: flat roof on square
 *  pillars along the lawn side, chevron floor, openings where paths cross it. The south side runs along the Administration
 *  terrace (raised by f.southRaise) and the two side corridors climb to it with a flight of steps. */
function cloisterRing(f, { b, collision, toM, mats, addMesh, layout }) {
  const [x0, z0, x1, z1] = [toM([f.outerNU[0], f.outerNU[1]]), toM([f.outerNU[2], f.outerNU[3]])].flat();
  const w = f.widthNU * toM([1, 0])[0], R = f.southRaise || 0;
  const ix0 = x0 + w, iz0 = z0 + w, ix1 = x1 - w, iz1 = z1 - w;
  const sl = R ? Math.round(R / 0.17) * 0.34 : 0;                  // length of the flights at the end of the side corridors
  const floor = (a, c, d, e, y) => addMesh(worldUV(flatPoly([[a, c], [d, c], [d, e], [a, e]], [], y)), mats.floorGrey, 0, `${f.id}:floor`);
  floor(x0, z0, x1, iz0, 0.075);                                     // north strip
  floor(x0, iz0, ix0, iz1 - sl, 0.075); floor(ix1, iz0, x1, iz1 - sl, 0.075);   // west / east strips
  floor(x0, iz1, x1, z1, 0.075 + R);                                 // south strip (raised)
  const H = 3.6;
  const roof = (ax, az, bx, bz, y) => b.wallBox('trim', ax, az, bx, bz, y + H, y + H + 0.3, w + 0.3);
  const mid = w / 2;
  roof(x0 - 0.15, z0 + mid, x1 + 0.15, z0 + mid, 0);
  roof(x0 + mid, z0, x0 + mid, iz1 + 0.15, 0); roof(x1 - mid, z0, x1 - mid, iz1 + 0.15, 0);
  roof(x0 - 0.15, z1 - mid, x1 + 0.15, z1 - mid, R);
  const pth = (id) => layout.pathways.find((p) => p.id === id);
  const xs = ['P_Q_W', 'P_AXIS_NS', 'P_Q_E'].map(pth).filter(Boolean).map((p) => toM(p.centerline[0])[0]);
  const zs = ['P_Q_N', 'P_AXIS_EW', 'P_Q_S'].map(pth).filter(Boolean).map((p) => toM(p.centerline[0])[1]);
  const xsSouth = xs.concat((layout.terrain.find((t) => t.id === 'T_ADMIN') || { stairs: [] }).stairs.map((st) => st.at * toM([1, 0])[0]));
  for (const p of layout.passages) if (/^PS_(W|E)_CONN/.test(p.id)) zs.push(toM(p.p)[1]);
  const gap = 3.0;
  const post = (x, z, y) => {
    b.yOff = y;
    b.box('graphite', x, (H - 0.3) / 2 + 0.3, z, 0.7, H - 0.6, 0.7); b.box('graphite', x, 0.25, z, 0.9, 0.5, 0.9); b.box('graphite', x, H - 0.15, z, 0.95, 0.3, 0.95);
    b.yOff = 0; collision.addCircle(x, z, 0.5, 'cloister-post');
  };
  const run = (ax, az, bx, bz, crossings, horiz, y, skipEnd = 0) => {
    const L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(L / 4.4));
    b.yOff = y; b.wallBox('graphite', ax, az, bx, bz, H - 0.5, H, 0.5); b.yOff = 0;
    for (let i = 0; i <= n; i++) {
      const x = ax + ((bx - ax) * i) / n, z = az + ((bz - az) * i) / n, u = horiz ? x : z;
      if (crossings.some((c) => Math.abs(c - u) < gap)) continue;
      if (skipEnd && (horiz ? false : (bz > az ? z > bz - skipEnd : z < bz + skipEnd))) continue;
      post(x, z, y);
    }
  };
  run(ix0, iz0 + 0.1, ix1, iz0 + 0.1, xs, true, 0);
  run(ix1 - 0.1, iz0, ix1 - 0.1, iz1 - sl, zs, false, 0); run(ix0 + 0.1, iz1 - sl, ix0 + 0.1, iz0, zs, false, 0);
  run(ix1, iz1 + 0.1, ix0, iz1 + 0.1, xsSouth, true, R);
  if (R) {
    const st = Math.round(R / 0.17);
    for (const [sx, wx] of [[x0 + mid, w], [x1 - mid, w]]) {
      buildStairs({ b, collision }, { origin: [sx, iz1 - sl], dir: [0, 1], width: wx - 0.3, steps: st, rise: R / st, tread: 0.34, mat: 'concrete' });
    }
  }
}

/** Open raised walkway outside the SE complex (field photo "Pont de SE court complex"): plain concrete deck, no walls and no roof,
 *  green iron railings and posts at the sides holding it. It links the raised walkway coming from S2 with the Amphi 2 passage. */
function bridge(f, { b, collision, toM }) {
  const pts = f.points.map(toM), w = f.widthM || 3.4, hw = w / 2, base = f.level || 2.4, RH = 1.05;
  const gaps = (f.gaps || []).map(([gx, gz, gh]) => [...toM([gx, gz]), gh]);
  const dirs = [];
  for (let i = 0; i < pts.length - 1; i++) { const dx = pts[i + 1][0] - pts[i][0], dz = pts[i + 1][1] - pts[i][1], L = Math.hypot(dx, dz); dirs.push([dx / L, dz / L, L]); }
  for (let i = 0; i < pts.length - 1; i++) {
    const [dx, dz, L] = dirs[i], [px, pz] = pts[i], nx = -dz, nz = dx;
    const s0 = i === 0 ? -hw : -hw, s1 = L + (i === pts.length - 2 ? 0 : hw);
    const A = [px + dx * s0, pz + dz * s0], Bp = [px + dx * s1, pz + dz * s1];
    b.wallBox('concrete', A[0], A[1], Bp[0], Bp[1], base - 0.4, base + 0.05, w);
    b.wallBox('paving', A[0], A[1], Bp[0], Bp[1], base + 0.05, base + 0.08, w - 0.2);
    const xs = [A[0] + nx * hw, A[0] - nx * hw, Bp[0] + nx * hw, Bp[0] - nx * hw], zs = [A[1] + nz * hw, A[1] - nz * hw, Bp[1] + nz * hw, Bp[1] - nz * hw];
    collision.addSurface([[Math.min(...xs), Math.min(...zs)], [Math.max(...xs), Math.min(...zs)], [Math.max(...xs), Math.max(...zs)], [Math.min(...xs), Math.max(...zs)]], base + 0.08, `${f.id}:deck`);
    for (const sd of [-1, 1]) {
      // railing ranges along this side; the side that faces a turn stays open, and so do the spots where a passage meets the deck
      let ranges = [[0, L]];
      const cut = (c0, c1) => { ranges = ranges.flatMap(([r0, r1]) => { const o = []; if (c0 > r0) o.push([r0, Math.min(r1, c0)]); if (c1 < r1) o.push([Math.max(r0, c1), r1]); return o; }); };
      if (i < pts.length - 2) { const [ex, ez] = dirs[i + 1]; if ((nx * sd) * ex + (nz * sd) * ez > 0.5) cut(L - hw - 0.4, L + 5); }
      if (i > 0) { const [ex, ez] = dirs[i - 1]; if ((nx * sd) * -ex + (nz * sd) * -ez > 0.5) cut(-5, hw + 0.4); }
      for (const [gx, gz, gh] of gaps) { const t = (gx - px) * dx + (gz - pz) * dz, off = (gx - px) * nx + (gz - pz) * nz; if (Math.abs(off) < hw + 0.5 || true) { if (t > -gh && t < L + gh && Math.abs(off - sd * hw) < hw + gh) cut(t - gh, t + gh); } }
      const ox = nx * sd * (hw - 0.1), oz = nz * sd * (hw - 0.1);
      for (const [r0, r1] of ranges) {
        if (r1 - r0 < 0.3) continue;
        const qx = px + dx * r0 + ox, qz = pz + dz * r0 + oz, rx = px + dx * r1 + ox, rz = pz + dz * r1 + oz;
        b.wallBox('frameGreen', qx, qz, rx, rz, base + RH - 0.08, base + RH + 0.04, 0.1);
        b.wallBox('frameGreen', qx, qz, rx, rz, base + 0.45, base + 0.53, 0.07);
        const n = Math.max(1, Math.round((r1 - r0) / 1.6));
        for (let k = 0; k <= n; k++) b.box('frameGreen', qx + ((rx - qx) * k) / n, base + RH / 2 + 0.05, qz + ((rz - qz) * k) / n, 0.1, RH, 0.1);
        const wd = [[qx - nx * sd * 0.12, qz - nz * sd * 0.12], [rx - nx * sd * 0.12, rz - nz * sd * 0.12], [rx + nx * sd * 0.12, rz + nz * sd * 0.12], [qx + nx * sd * 0.12, qz + nz * sd * 0.12]];
        collision.addPolygon(wd, [], `${f.id}:rail`);
      }
      // green steel legs beside the deck
      const n = Math.max(1, Math.round(L / 3.5));
      for (let k = 0; k <= n; k++) {
        const x = px + dx * (L * k) / n + nx * sd * (hw + 0.15), z = pz + dz * (L * k) / n + nz * sd * (hw + 0.15);
        b.box('frameGreen', x, (base - 0.3) / 2, z, 0.22, base - 0.3, 0.22);
        b.box('frameGreen', x - nx * sd * 0.15, base - 0.25, z - nz * sd * 0.15, 0.3, 0.12, 0.3);
        collision.addCircle(x, z, 0.3, 'bridge-leg');
      }
    }
  }
  // flight of steps down at the free end (the other end rests on the raised walkway)
  const last = pts[pts.length - 1], [ddx, ddz] = dirs[dirs.length - 1], st = Math.round(base / 0.17);
  buildStairs({ b, collision }, { origin: [last[0] + ddx * st * 0.34, last[1] + ddz * st * 0.34], dir: [-ddx, -ddz], width: w - 0.4, steps: st, rise: base / st, tread: 0.34, mat: 'concrete' });
  for (const sd of [-1, 1]) b.wallBox('frameGreen', last[0] + -ddz * sd * (hw - 0.1), last[1] + ddx * sd * (hw - 0.1), last[0] + ddx * st * 0.34 + -ddz * sd * (hw - 0.1), last[1] + ddz * st * 0.34 + ddx * sd * (hw - 0.1), base - 0.02 + 0.8, base + 0.9, 0.08);
}

/** Main entrance of the FST (user photo "entree principale"): brick-orange portal, large central arch + two small side arches, cream cornice. */
function mainGate(f, { b, collision, toM, mats, addMesh }) {
  const [cx, cz] = toM(f.center), D = 2.6, H = 6.0;
  const bays = [[3.6, 2.0, 3.4], [7.2, 4.6, 4.9], [3.6, 2.0, 3.4]];
  const W = bays.reduce((s, q) => s + q[0], 0);
  const UPV = new THREE.Vector3(0, 1, 0);
  let s = -W / 2; const solid = [];
  for (const [w, ow, oh] of bays) {
    const { geo } = bayGeometry(w, H, D, { kind: 'arch', ow, oh, y0: 0 });
    b.addGeometry('wallCream', geo, basis(new THREE.Vector3(cx + D / 2, 0, cz + s), new THREE.Vector3(0, 0, 1), UPV, new THREE.Vector3(-1, 0, 0)));
    solid.push([s, s + (w - ow) / 2], [s + (w + ow) / 2, s + w]);
    // v0.7f (photo "entrée fst"): warm orange lining inside the arches
    b.box('orange', cx, 0.04, cz + s + w / 2, D - 0.1, 0.02, ow);
    for (const sd of [-1, 1]) b.box('orange', cx, oh / 2 - 0.2, cz + s + w / 2 + sd * (ow / 2 - 0.02), D - 0.15, oh - 0.4, 0.04);
    s += w;
  }
  const merged = []; for (const q of solid) { const l = merged[merged.length - 1]; if (l && Math.abs(l[1] - q[0]) < 0.01) l[1] = q[1]; else merged.push([...q]); }
  for (const [a, c] of merged) collision.addPolygon([[cx - D / 2, cz + a], [cx + D / 2, cz + a], [cx + D / 2, cz + c], [cx - D / 2, cz + c]], [], f.id);
  b.box('trim', cx, H + 0.25, cz, D + 0.7, 0.5, W + 0.8);
  b.box('wallSand', cx, H + 0.7, cz, D + 0.2, 0.4, W - 0.2);
  b.box('trim', cx, H + 1.05, cz, D + 0.5, 0.3, W + 0.4);
  // brick-pattern pillars at both ends
  for (const sd of [-1, 1]) b.box('brick', cx, (H + 1.2) / 2, cz + sd * (W / 2 + 0.8), D + 0.4, H + 1.2, 1.6);
  // black iron grilles closing the two small arches (the large one stays open)
  for (const sd of [-1, 1]) {
    const gz = cz + sd * 5.4, ow = 2.0;
    for (let i = 0; i <= 8; i++) b.box('frameDark', cx, 1.2, gz - ow / 2 + (ow * i) / 8, 0.05, 2.4, 0.04);
    b.box('frameDark', cx, 2.4, gz, 0.06, 0.06, ow); b.box('frameDark', cx, 0.1, gz, 0.06, 0.06, ow);
    collision.addPolygon([[cx - 0.1, gz - ow / 2], [cx + 0.1, gz - ow / 2], [cx + 0.1, gz + ow / 2], [cx - 0.1, gz + ow / 2]], [], f.id + ':grille');
  }
  b.box('frameGreen', cx - D / 2 - 0.1, H + 0.7, cz, 0.1, 0.45, 5.0);   // name plaque
  b.box('stone', cx, 0.04, cz, D + 2.0, 0.08, W + 1.0);
  // checkerboard plaza inside the campus (photo "entrée fst"): grey/white brick paving, benches, green lamp pole, clipped hedge
  const px1 = cx - D / 2 - 1.0, px0 = px1 - 16, pz0 = cz - 11, pz1 = cz + 11;
  addMesh(worldUV(flatPoly([[px0, pz0], [px1, pz0], [px1, pz1], [px0, pz1]], [], 0.13)), mats.floorChecker, 0, `${f.id}:plaza`);
  b.box('poleGreen', px0 + 8, 2.6, cz + 3.5, 0.18, 5.2, 0.18); b.box('stone', px0 + 8, 0.25, cz + 3.5, 0.9, 0.5, 0.9);
  collision.addCircle(px0 + 8, cz + 3.5, 0.6, f.id + ':pole');
  for (const sd of [-1, 1]) {
    const bz = cz + sd * 8, bx = px0 + 6;
    b.box('wood', bx, 0.45, bz, 0.5, 0.06, 2.0); b.box('wood', bx - 0.22, 0.8, bz, 0.05, 0.4, 2.0);
    b.box('metal', bx, 0.22, bz - 0.85, 0.45, 0.44, 0.06); b.box('metal', bx, 0.22, bz + 0.85, 0.45, 0.44, 0.06);
    collision.addCircle(bx, bz, 1.0, f.id + ':bench');
  }
}

/** Corner of the boulevard (user photo "coins de la fst"): tight kerb, grass island with a clipped hedge and palms, white lattice fence behind. */
function roadCorner(f, { b, collision, toM, mGrass, addMesh }) {
  const [cx, cz] = toM(f.center), R = f.radiusNU * toM([1, 0])[0];
  const ri = R - 3.86 - 1.8 - 0.3;                       // inner edge of the sidewalk
  const g = new THREE.CircleGeometry(ri, 40); g.rotateX(-Math.PI / 2); g.translate(cx, 0.12, cz); worldUV(g);
  addMesh(g, mGrass, 0, `${f.id}:island`);
  const hr = ri - 1.2;
  for (let i = 0; i < 24; i++) { const a0 = (i / 24) * 6.2832, a1 = ((i + 1) / 24) * 6.2832; hedgeLine(b, cx + Math.cos(a0) * hr, cz + Math.sin(a0) * hr, cx + Math.cos(a1) * hr, cz + Math.sin(a1) * hr, 0.9); }
  addPalm(b, collision, cx - 0.4, cz - 0.3, 1.0, 0.3);
  addPalm(b, collision, cx + 1.3, cz + 0.9, 0.85, 1.7);
  collision.addCircle(cx, cz, hr + 0.4, `${f.id}:hedge`);
  // white lattice fence behind the outer sidewalk, in the NW quadrant
  const Ro = R + 3.86 + 1.8 + 1.2;
  for (let i = 0; i < 14; i++) {
    const a0 = Math.PI + (i / 14) * (Math.PI / 2), a1 = Math.PI + ((i + 1) / 14) * (Math.PI / 2);
    const x0 = cx + Math.cos(a0) * Ro, z0 = cz + Math.sin(a0) * Ro, x1 = cx + Math.cos(a1) * Ro, z1 = cz + Math.sin(a1) * Ro;
    b.wallBox('wall', x0, z0, x1, z1, 0.3, 1.45, 0.12); b.wallBox('trim', x0, z0, x1, z1, 1.45, 1.55, 0.2);
    b.box('trim', x0, 0.8, z0, 0.3, 1.6, 0.3);
    collision.addPolygon([[x0 - 0.15, z0 - 0.15], [x1 + 0.15, z1 - 0.15], [x1 + 0.15, z1 + 0.15], [x0 - 0.15, z0 + 0.15]], [], f.id);
  }
}

/** Yard of the staff Buvette (v0.7d): brown earth with café tables and chairs. */
function buvetteGarden(f, { b, collision, toM }) {
  const k = toM([1, 1])[0], [x0, z0, x1, z1] = f.rect.map((v) => v * k);
  b.box('soil', (x0 + x1) / 2, 0.02, (z0 + z1) / 2, x1 - x0, 0.04, z1 - z0);
  const cols = [x0 + 5, (x0 + x1) / 2, x1 - 5], rows = [z0 + 4.2, z1 - 2.6];
  let n = 0;
  for (const zz of rows) for (const xx of cols) {
    if (n++ >= 6) break;
    b.box('metal', xx, 0.37, zz, 0.1, 0.74, 0.1); b.box('wood', xx, 0.76, zz, 0.95, 0.05, 0.95); b.box('metal', xx, 0.04, zz, 0.5, 0.05, 0.5);
    for (const [dx, dz] of [[-1.0, 0], [1.0, 0], [0, -1.0]]) {
      const cx = xx + dx, cz = zz + dz;
      b.box('frameDark', cx, 0.45, cz, 0.42, 0.05, 0.42);
      for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.box('frameDark', cx + lx * 0.17, 0.22, cz + lz * 0.17, 0.04, 0.44, 0.04);
      b.box('frameDark', cx + (dx ? dx * 0.19 : 0), 0.72, cz + (dz ? dz * 0.19 : 0), dx ? 0.04 : 0.42, 0.5, dz ? 0.04 : 0.42);
    }
    collision.addCircle(xx, zz, 1.1, f.id);
  }
}

/** Boundary wall of the FST (v0.7e): plain rendered wall with a cap and pilasters; the Cité universitaire stands behind it. */
function boundaryWall(f, { b, collision, toM }) {
  const H = f.heightM || 2.8, pts = f.points.map(toM);
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, z0] = pts[i], [x1, z1] = pts[i + 1], L = Math.hypot(x1 - x0, z1 - z0), ux = (x1 - x0) / L, uz = (z1 - z0) / L;
    b.wallBox('wall', x0, z0, x1, z1, 0, H, 0.3);
    b.wallBox('trim', x0, z0, x1, z1, H, H + 0.12, 0.42);
    b.wallBox('plinth', x0, z0, x1, z1, 0, 0.5, 0.38);
    const n = Math.max(1, Math.round(L / 8));
    for (let k = 0; k <= n; k++) { const x = x0 + ux * L * k / n, z = z0 + uz * L * k / n; b.box('trim', x, H / 2, z, 0.55, H, 0.55); b.box('trim', x, H + 0.2, z, 0.7, 0.16, 0.7); }
    const nx = -uz * 0.2, nz = ux * 0.2;
    collision.addPolygon([[x0 + nx, z0 + nz], [x1 + nx, z1 + nz], [x1 - nx, z1 - nz], [x0 - nx, z0 - nz]], [], f.id);
  }
}

/** Vehicle gate of the FST (v0.7e): same brick portal as the main entrance, wide opening for cars closed by a red/white barrier arm that lifts when somebody comes near, plus a pedestrian arch on the east side. */
function carGate(f, { b, collision, toM, group, updaters }) {
  const [cx, cz] = toM(f.center), D = 2.4, UPV = new THREE.Vector3(0, 1, 0);
  const bays = [{ w: 12, H: 7.2, op: { kind: 'rect', ow: 8.4, oh: 6.3, y0: 0 } }, { w: 4.4, H: 5.0, op: { kind: 'arch', ow: 2.4, oh: 3.7, y0: 0 } }];
  let s = -6; const solid = [];
  for (const { w, H, op } of bays) {
    const { geo } = bayGeometry(w, H, D, op);
    b.addGeometry('brick', geo, basis(new THREE.Vector3(cx + s, 0, cz - D / 2), new THREE.Vector3(1, 0, 0), UPV, new THREE.Vector3(0, 0, 1)));
    solid.push([s, s + (w - op.ow) / 2], [s + (w + op.ow) / 2, s + w]);
    b.box('trim', cx + s + w / 2, H + 0.2, cz, w + 0.4, 0.4, D + 0.6);
    b.box('wallSand', cx + s + w / 2, H + 0.55, cz, w, 0.3, D);
    s += w;
  }
  const merged = []; for (const q of solid) { const l = merged[merged.length - 1]; if (l && Math.abs(l[1] - q[0]) < 0.01) l[1] = q[1]; else merged.push([...q]); }
  for (const [a, c] of merged) collision.addPolygon([[cx + a, cz - D / 2], [cx + c, cz - D / 2], [cx + c, cz + D / 2], [cx + a, cz + D / 2]], [], f.id);
  b.box('frameGreen', cx, 7.2 + 1.0, cz + D / 2 + 0.05, 5.0, 0.45, 0.1);   // name plaque
  b.box('stone', cx + 2.2, 0.04, cz, 16.4 + 1.0, 0.08, D + 1.0);
  // barrier: post + red/white arm
  const px = cx + 3.8, pz = cz + 0.2, LEN = 7.6;
  const white = new THREE.MeshStandardMaterial({ color: 0xf4f4f0, roughness: 0.5 }), red = new THREE.MeshStandardMaterial({ color: 0xc8261e, roughness: 0.5 }), grey = new THREE.MeshStandardMaterial({ color: 0x4a4e55, roughness: 0.6 });
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.2, 0.4), grey); post.position.set(px + 0.1, 0.6, pz); group.add(post);
  const piv = new THREE.Group(); piv.position.set(px, 1.0, pz); group.add(piv);
  const nseg = 8, sl = LEN / nseg;
  for (let k = 0; k < nseg; k++) { const m = new THREE.Mesh(new THREE.BoxGeometry(sl, 0.14, 0.1), k % 2 ? red : white); m.position.set(-(k + 0.5) * sl, 0, 0); piv.add(m); }
  const arm = [[px - LEN, pz - 0.15], [px, pz - 0.15], [px, pz + 0.15], [px - LEN, pz + 0.15]];
  collision.addPolygon(arm, [], f.id + ':arm');
  const solidArm = collision.solids[collision.solids.length - 1], keep = { outer: solidArm.outer, edges: solidArm.edges };
  let ang = 0;
  updaters.push((dt, pos) => {
    const near = Math.hypot(pos.x - cx, pos.z - cz) < 9;
    ang += ((near ? 1.35 : 0) - ang) * Math.min(1, dt * 3.5);
    piv.rotation.z = -ang;
    const open = ang > 0.9;
    solidArm.outer = open ? [] : keep.outer; solidArm.edges = open ? [] : keep.edges;
  });
}

/** Space behind Amphi 6 (photo "derrière amphi 6"): reddish concrete slabs, weeping pepper trees, wooden benches, low wall with a grass strip. */
function pepperPlaza(f, { b, collision, toM, mats, addMesh, mPaving, mGrass }) {
  // v0.7i (user ASCII plan): lawn everywhere; grey floor only against the south face of Amphi 6 (its width); 3 benches on the floor/lawn line facing the amphi; hedge along the east side of the floor
  const k = toM([1, 1])[0], [x0, z0, x1, z1] = f.rect.map((v) => v * k), zm = (z0 + z1) / 2;
  const ax0 = -0.8091 * k, ax1 = -0.6515 * k, fx1 = -0.6394 * k + 0.3;   // floor runs right up to the passage towards IT Learning (P_W_LINK2)
  addMesh(worldUV(flatPoly([[x0, z0], [x1, z0], [x1, z1], [x0, z1]], [], 0.1)), mGrass, 0, `${f.id}:lawn`);
  addMesh(worldUV(flatPoly([[ax0, z0], [fx1, z0], [fx1, zm], [ax0, zm]], [], 0.12)), mPaving, 0, `${f.id}:floor`);
  const w = fx1 - ax0, xs = [0.2, 0.5, 0.8].map((t) => ax0 + w * t);
  for (const x of xs) {
    b.box('wood', x, 0.45, zm - 0.45, 1.9, 0.06, 0.5); b.box('wood', x, 0.8, zm - 0.22, 1.9, 0.4, 0.05);   // seat + back (back towards the lawn)
    b.box('metal', x - 0.8, 0.22, zm - 0.45, 0.06, 0.44, 0.45); b.box('metal', x + 0.8, 0.22, zm - 0.45, 0.06, 0.44, 0.45);
    collision.addCircle(x, zm - 0.45, 0.75, f.id + ':bench');
  }
  [[ax0 + 3, zm + 4.5], [ax0 + w * 0.6, zm + 6], [x0 + 6, z0 + 9], [x0 + 16, zm + 3]].forEach(([x, z], i) => addWeeping(b, collision, x, z, 0.95 + (i % 3) * 0.1));
  const hx = ax1 + 0.0, hz0 = zm + 1.0;                                              // hedge only along the lawn side, so the floor stays open to the passage
  hedgeLine(b, fx1 - 0.6, hz0, fx1 - 0.6, z1 - 0.5, 0.9);
  collision.addPolygon([[fx1 - 1.1, hz0], [fx1 - 0.1, hz0], [fx1 - 0.1, z1 - 0.5], [fx1 - 1.1, z1 - 0.5]], [], f.id + ':hedge');
}

export function buildFeatures(layout, env) {
  for (const f of layout.features || []) {
    if (f.type === 'curved_pergola') curvedPergola(f, env);
    else if (f.type === 'pitch') pitch(f, env);
    else if (f.type === 'step_terrace') stepTerrace(f, env);
    else if (f.type === 'speed_bump') speedBump(f, { ...env, layout });
    else if (f.type === 'cloister_ring') cloisterRing(f, { ...env, layout });
    else if (f.type === 'bridge') bridge(f, { ...env, layout });
    else if (f.type === 'main_gate') mainGate(f, env);
    else if (f.type === 'road_corner') roadCorner(f, env);
    else if (f.type === 'buvette_profs_garden') buvetteGarden(f, env);
    else if (f.type === 'pepper_plaza') pepperPlaza(f, env);
    else if (f.type === 'boundary_wall') boundaryWall(f, env);
    else if (f.type === 'car_gate') carGate(f, env);
  }
}
