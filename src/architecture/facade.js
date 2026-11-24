import * as THREE from 'three';
import { U } from './units.js';
import { basis } from './Builder.js';
import { bayGeometry, openingUnit, flatPoly } from './shapes.js';
import { worldUV } from '../environment/ribbon.js';

const UP = new THREE.Vector3(0, 1, 0);

/**
 * Oriented edges of a polygon (metres). Outward normal n = (dz, -dx) for every edge.
 * Edges are split where they touch a neighbouring building ("party" runs get no facade).
 */
export function buildEdges(poly, solidAt, otherSolidAt, faceAt) {
  const edges = [];
  const rings = [{ pts: poly.outer, hole: false }, ...poly.holes.map((h) => ({ pts: h, hole: true }))];
  for (const ring of rings) {
    const n = ring.pts.length;
    for (let i = 0; i < n; i++) {
      let a = ring.pts[i], b = ring.pts[(i + 1) % n];
      let dx = b[0] - a[0], dz = b[1] - a[1];
      const L = Math.hypot(dx, dz);
      if (L < 0.05) continue;
      let d = [dx / L, dz / L], nr = [d[1], -d[0]];
      const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
      if (solidAt(mx + nr[0] * 0.3, mz + nr[1] * 0.3)) { [a, b] = [b, a]; d = [-d[0], -d[1]]; nr = [d[1], -d[0]]; }
      const side = nr[1] < -0.7 ? 'N' : nr[1] > 0.7 ? 'S' : nr[0] > 0.7 ? 'E' : nr[0] < -0.7 ? 'W' : 'D';
      // runs of party / free along the edge
      const step = 1.0, ns = Math.max(1, Math.ceil(L / step));
      const flags = [];
      for (let k = 0; k < ns; k++) {
        const u = ((k + 0.5) / ns) * L;
        flags.push(otherSolidAt(a[0] + d[0] * u + nr[0] * 0.4, a[1] + d[1] * u + nr[1] * 0.4));
      }
      let start = 0;
      for (let k = 1; k <= ns; k++) {
        if (k === ns || flags[k] !== flags[start]) {
          const u0 = (start / ns) * L, u1 = (k / ns) * L;
          if (u1 - u0 > 0.05) {
            const sa = [a[0] + d[0] * u0, a[1] + d[1] * u0], sb = [a[0] + d[0] * u1, a[1] + d[1] * u1];
            const um = (u0 + u1) / 2;
            const face = faceAt(a[0] + d[0] * um + nr[0] * 2.0, a[1] + d[1] * um + nr[1] * 2.0);
            edges.push({ a: sa, b: sb, len: u1 - u0, d, n: nr, side, face, hole: ring.hole, party: flags[start], openings: [], index: edges.length });
          }
          start = k;
        }
      }
    }
  }
  return edges;
}

export function edgeFrame(e, u = 0, y = 0) {
  const o = new THREE.Vector3(e.a[0] + e.d[0] * u, y, e.a[1] + e.d[1] * u);
  return basis(o, new THREE.Vector3(e.d[0], 0, e.d[1]), UP, new THREE.Vector3(-e.n[0], 0, -e.n[1]));
}

/** Box hugging an edge: from u0..u1, y0..y1, projecting `out` outward and `inn` inward. */
export function edgeBox(b, key, e, u0, u1, y0, y1, out, inn) {
  const L = u1 - u0;
  if (L < 1e-3) return;
  const mu = (u0 + u1) / 2, off = (out - inn) / 2;
  b.box(key, e.a[0] + e.d[0] * mu + e.n[0] * off, (y0 + y1) / 2, e.a[1] + e.d[1] * mu + e.n[1] * off, L, y1 - y0, out + inn, -Math.atan2(e.d[1], e.d[0]));
}

export function floorLevels(cfg) {
  const ys = [0];
  for (let f = 0; f < cfg.floors; f++) ys.push(ys[f] + (f === 0 ? cfg.groundH ?? U.groundH : cfg.floorH ?? U.floorH));
  return ys;
}

function pickRule(e, rules) {
  for (const r of rules) {
    const m = r.match || {};
    if (m.face && m.face !== e.face) continue;
    if (m.side && !m.side.includes(e.side)) continue;
    if (m.hole !== undefined && m.hole !== e.hole) continue;
    if (m.minLen && e.len < m.minLen) continue;
    if (m.maxLen && e.len > m.maxLen) continue;
    return r;
  }
  return {};
}
export { pickRule };

function bayOpening(type, S, y0floorH, groundFloor) {
  const sill = S.sill ?? U.sill;
  switch (type) {
    case 'windows': return { kind: 'rect', ow: S.winW ?? U.winW, oh: S.winH ?? U.winH, y0: sill };
    case 'tall': return { kind: 'rect', ow: S.winW ?? 1.4, oh: (y0floorH - sill - 0.7), y0: sill };
    case 'slits': return { kind: 'rect', ow: 0.55, oh: Math.min(2.2, y0floorH - 1.4), y0: 0.9 };
    case 'archwin': return { kind: 'arch', ow: 1.45, oh: Math.min(2.9, y0floorH - 0.9), y0: 0.75 };
    case 'clad': return { kind: 'rect', ow: 2.0, oh: 2.3, y0: 0.95 };
    case 'ribbon': return { kind: 'rect', ow: Math.min(2.5, (S.bay ?? U.bay) - 0.55), oh: 1.25, y0: 1.0 };            // long horizontal window of the red-clad buildings
    case 'shop': return { kind: 'rect', ow: 3.9, oh: 2.5, y0: 0.85 };                                       // large glazed shop-front window (buvette, photo)
    case 'shutter': return { kind: 'rect', ow: 2.3, oh: 1.45, y0: 0.95, fill: 'shutter', counter: true };      // roller-shutter kiosk window (NE court / buvette)
    case 'high': return { kind: 'rect', ow: 2.4, oh: 0.9, y0: y0floorH - 1.7 };   // clerestory band
    default: return null;                                                            // blank
  }
}

function placeBay(ctx, e, u0, w, y0, h, op, matKey, unitKind) {
  const { b } = ctx;
  const { key, geo } = bayGeometry(w, h, U.wallT, op);
  const m = edgeFrame(e, u0, y0);
  b.instance(`bay|${matKey}|${key}`, matKey, () => geo, m);
  if (op && unitKind !== 'none') {
    const un = openingUnit(w, { ...op, door: unitKind === 'door' });
    const fm = unitKind === 'door' ? 'frameDark' : (ctx.cfg.frameMat || 'frame');
    b.instance(`frame|${fm}|${un.key}`, fm, () => un.frame, m);
    const fill = op.fill || 'glass';
    b.instance(`${fill}|${un.key}`, fill, () => un.glass, m);
    if (op.counter) edgeBox(b, 'black', e, u0 + (w - op.ow) / 2 - 0.08, u0 + (w + op.ow) / 2 + 0.08, y0 + op.y0 - 0.1, y0 + op.y0 + 0.02, 0.28, 0.0);
  }
}

/** Splits [0,len] around the given opening spans; returns solid gaps [u0,u1] and the openings. */
function splitByOpenings(len, ops) {
  const sorted = [...ops].sort((p, q) => p.u0 - q.u0);
  const gaps = [];
  let cur = 0;
  for (const o of sorted) {
    if (o.u0 > cur + 0.01) gaps.push([cur, o.u0]);
    cur = Math.max(cur, o.u1);
  }
  if (cur < len - 0.01) gaps.push([cur, len]);
  return { gaps, ops: sorted };
}

/** One floor of one edge segment as wall bays. */
function wallSegment(ctx, e, u0, u1, floor, ys, S, type) {
  const { b } = ctx;
  const L = u1 - u0;
  if (L < 0.05) return;
  const H = ys[floor + 1] - ys[floor];
  const matKey = (floor === 0 && S.groundMat) || S.wallMat || ctx.cfg.wallMat || 'wall';
  const bay = S.bay ?? U.bay;
  const nb = L < bay * 0.6 ? 1 : Math.max(1, Math.round(L / bay));
  const bw = nb > 1 || L > 1.4 ? Math.floor((L / nb) * 4) / 4 : L / nb;   // quantised bay width (fewer unique geometries)
  const rest = L - bw * nb;
  const pier = rest > 0.04 ? rest / 2 : 0;
  let u = u0;
  if (pier) { placeBay(ctx, e, u, pier, ys[floor], H, null, matKey, 'none'); u += pier; }
  for (let i = 0; i < nb; i++) {
    let t = type;
    if (type === 'slits' && i % 2 === 1) t = 'blank';
    if (bw < 1.4) t = 'blank';
    const op = bayOpening(t, S, H, floor === 0);
    placeBay(ctx, e, u, bw, ys[floor], H, op, matKey, op ? 'window' : 'none');
    u += bw;
  }
  if (pier) placeBay(ctx, e, u, pier, ys[floor], H, null, matKey, 'none');
  if (S.brickFrame && floor === 0) {
    let uu = u0 + pier;
    for (let i = 0; i < nb; i++) {
      const op = bayOpening(type, S, H, true);
      if (op && bw >= 1.4) {
        const cx = uu + bw / 2, hw = op.ow / 2 + 0.3, y0f = ys[floor] + op.y0, y1f = y0f + op.oh;
        edgeBox(b, 'brick', e, cx - hw, cx + hw, y1f, y1f + 0.4, 0.12, 0.0);
        edgeBox(b, 'brick', e, cx - hw, cx - hw + 0.3, y0f - 0.1, y1f, 0.12, 0.0);
        edgeBox(b, 'brick', e, cx + hw - 0.3, cx + hw, y0f - 0.1, y1f, 0.12, 0.0);
        edgeBox(b, 'brick', e, cx - hw, cx + hw, y0f - 0.35, y0f - 0.05, 0.14, 0.0);
      }
      uu += bw;
    }
  }
  if (S.pilasters && nb > 1) {
    const pm = S.pilasters === 'brick' ? 'brick' : 'trim', pw = S.pilasters === 'brick' ? 0.5 : 0.3;
    for (let i = 2; i < nb; i += 2) { const uu = u0 + pier + i * bw; edgeBox(b, pm, e, uu - pw / 2, uu + pw / 2, ys[floor], ys[floor + 1] - 0.05, 0.09, 0.0); }
  }
}

function galleryFloor(ctx, e, u0, u1, gd, S) {
  const P = (u, off) => [e.a[0] + e.d[0] * u + e.n[0] * off, e.a[1] + e.d[1] * u + e.n[1] * off];
  ctx.texList(S.floorTex || ctx.cfg.arcadeFloor || 'floorChevron').push(worldUV(flatPoly([P(u0, 0.9), P(u1, 0.9), P(u1, -gd), P(u0, -gd)], [], 0.07)));
}

/** Ground-floor open gallery: columns on the edge line, back wall set in, covered by the upper floor. */
function arcadeSegment(ctx, e, u0, u1, ys, S) {
  const { b, collision } = ctx;
  const gd = S.arcadeDepth ?? 3.0;
  const L = u1 - u0;
  if (L < 2) { wallSegment(ctx, e, u0, u1, 0, ys, S, 'blank'); return; }
  const H = ys[1];
  const bay = S.arcadeBay ?? 4.2;
  const nb = Math.max(1, Math.round(L / bay));
  const bw = L / nb;
  // columns (square pillars like the garden galleries in the photos; round when the config asks)
  const round = S.pillar === 'round';
  for (let i = 0; i <= nb; i++) {
    const u = u0 + i * bw;
    const x = e.a[0] + e.d[0] * u - e.n[0] * 0.5, z = e.a[1] + e.d[1] * u - e.n[1] * 0.5;
    const cm = new THREE.Matrix4().makeTranslation(x, 0, z);
    const yaw = new THREE.Matrix4().makeRotationY(-Math.atan2(e.d[1], e.d[0])).setPosition(x, 0, z);
    if (round) {
      b.instance(`col|shaft|${H.toFixed(2)}`, 'trim', () => new THREE.CylinderGeometry(U.colR, U.colR * 1.08, H - 0.3, 14).translate(0, (H - 0.3) / 2 + 0.12, 0), cm);
      b.instance('col|base', 'plinth', () => new THREE.CylinderGeometry(U.colR * 1.35, U.colR * 1.45, 0.24, 14).translate(0, 0.12, 0), cm);
      b.instance(`col|cap|${H.toFixed(2)}`, 'trim', () => new THREE.BoxGeometry(U.colR * 3, 0.38, U.colR * 3).translate(0, H - 0.31, 0), cm);
    } else {
      b.instance(`pil|shaft|${S.pillarMat || 'wallCream'}|${H.toFixed(2)}`, S.pillarMat || 'wallCream', () => new THREE.BoxGeometry(0.72, H - 0.25, 0.72).translate(0, (H - 0.25) / 2, 0), yaw);
      b.instance('pil|base', 'plinth', () => new THREE.BoxGeometry(0.9, 0.5, 0.9).translate(0, 0.25, 0), yaw);
      b.instance(`pil|cap|${H.toFixed(2)}`, 'trim', () => new THREE.BoxGeometry(0.95, 0.3, 0.95).translate(0, H - 0.4, 0), yaw);
    }
    collision.addCircle(x, z, 0.5, 'column');
  }
  // beam above the columns and gallery ceiling
  edgeBox(b, 'trim', e, u0, u1, H - 0.5, H, 0.05, 0.9);
  edgeBox(b, S.beamBand || 'plinth', e, u0, u1, H - 0.56, H - 0.5, 0.07, 0.9);
  edgeBox(b, 'trim', e, u0, u1, H - 0.3, H, 0.0, gd + 0.2);
  // paved gallery floor
  if (S.floorTex || ctx.cfg.arcadeFloor) {
    const P = (u, off) => [e.a[0] + e.d[0] * u + e.n[0] * off, e.a[1] + e.d[1] * u + e.n[1] * off];
    const g = worldUV(flatPoly([P(u0, 0.9), P(u1, 0.9), P(u1, -gd), P(u0, -gd)], [], 0.07));
    ctx.texList(S.floorTex || ctx.cfg.arcadeFloor).push(g);
  } else edgeBox(b, 'paving', e, u0, u1, 0, 0.06, 0.0, gd);
  // back wall: bays on the inset line
  const back = { a: [e.a[0] - e.n[0] * gd, e.a[1] - e.n[1] * gd], d: e.d, n: e.n, len: e.len };
  const rg = !!S.ring;   // ring gallery: back wall stops short of the corners and there are no end walls, so the corridor turns the corner
  if (!rg || L - 2 * gd > 2) wallSegment(ctx, back, rg ? u0 + gd : u0, rg ? u1 - gd : u1, 0, ys, { ...S, bay: S.backBay ?? 3.6 }, S.backType || 'windows');
  // end walls so the gallery is closed at both ends
  for (const u of (rg ? [] : [u0, u1])) {
    const p0 = [e.a[0] + e.d[0] * u, e.a[1] + e.d[1] * u];
    b.wallBox(S.wallMat || ctx.cfg.wallMat || 'wall', p0[0], p0[1], p0[0] - e.n[0] * gd, p0[1] - e.n[1] * gd, 0, H, 0.35);
  }
  return { u0, u1, depth: gd };
}

/**
 * Arched loggia / arch arcade: wall bays with large round-arch openings on the edge line, a back wall set in,
 * a brick balustrade across each opening (upper floors) and slabs. Matches the photos of the garden facades.
 */
function archBays(ctx, e, u0, u1, floor, ys, S, o) {
  const { b } = ctx;
  const L = u1 - u0;
  if (L < 2.5) { wallSegment(ctx, e, u0, u1, floor, ys, S, 'blank'); return null; }
  const H = ys[floor + 1] - ys[floor], y0 = ys[floor];
  const gd = o.gd ?? 2.6;
  const matKey = S.wallMat || ctx.cfg.wallMat || 'wall';
  const nb = Math.max(1, Math.round(L / (o.bay ?? 4.2)));
  const bw = Math.floor((L / nb) * 4) / 4, rest = L - bw * nb, pier = rest > 0.04 ? rest / 2 : 0;
  const ow = Math.min(bw - 0.95, o.opening ?? 3.3), oh = H - (o.spring ?? 0.8);
  let u = u0;
  if (pier) { placeBay(ctx, e, u, pier, y0, H, null, matKey, 'none'); u += pier; }
  for (let i = 0; i < nb; i++) {
    placeBay(ctx, e, u, bw, y0, H, { kind: 'arch', ow, oh, y0: 0 }, matKey, 'none');
    if (o.balustrade) {
      const x0 = (bw - ow) / 2 + 0.05, x1 = bw - (bw - ow) / 2 - 0.05;
      const key = `bal|${x0.toFixed(2)}|${x1.toFixed(2)}`;
      const m = edgeFrame(e, u, y0);
      b.instance(key, 'brick', () => new THREE.BoxGeometry(x1 - x0, 1.05, 0.22).translate((x0 + x1) / 2, 0.525, 0.22), m);
      b.instance(key + '|cap', 'trim', () => new THREE.BoxGeometry(x1 - x0 + 0.1, 0.08, 0.34).translate((x0 + x1) / 2, 1.09, 0.2), m);
    }
    u += bw;
  }
  if (pier) placeBay(ctx, e, u, pier, y0, H, null, matKey, 'none');
  if (o.brickPiers) {
    const w = bw - ow - 0.12;
    for (let i = 0; i <= nb; i++) {
      const uu = u0 + pier + i * bw;
      if (i === 0 || i === nb) { if (pier < 0.4) continue; }
      const half = (i === 0 || i === nb) ? Math.min(pier, w) / 2 : w / 2;
      if (half < 0.15) continue;
      const c = i === 0 ? uu - half : i === nb ? uu + half : uu;
      edgeBox(b, 'brick', e, c - half, c + half, y0, y0 + H - 0.3, 0.1, 0.0);
    }
  }
  const back = { a: [e.a[0] - e.n[0] * gd, e.a[1] - e.n[1] * gd], d: e.d, n: e.n, len: e.len };
  const bt = o.backType || 'archwin';
  if (gd > 0.5) wallSegment(ctx, back, u0, u1, floor, ys, { ...S, bay: S.backBay ?? 3.6 }, bt);
  else wallSegment(ctx, back, u0, u1, floor, ys, { ...S, bay: bw }, 'blank');
  edgeBox(b, 'trim', e, u0, u1, y0 - 0.3, y0 + (floor === 0 ? 0 : 0.02), 0.05, gd + 0.2);
  if (gd > 0.5) for (const uu of [u0, u1]) {
    const p0 = [e.a[0] + e.d[0] * uu, e.a[1] + e.d[1] * uu];
    b.wallBox(matKey, p0[0], p0[1], p0[0] - e.n[0] * gd, p0[1] - e.n[1] * gd, y0, y0 + H, 0.35);
  }
  return { u0, u1, depth: gd };
}

function doorUnit(ctx, e, d, ys, S) {
  const { b, collision } = ctx;
  const bayW = Math.max(3.8, (d.width ?? U.doorW) + 1.4);
  const u0 = Math.max(0, d.u - bayW / 2), u1 = Math.min(e.len, d.u + bayW / 2);
  const dw = d.width ?? U.doorW, dh = d.height ?? U.doorH;
  const H = ys[1];
  const op = { kind: d.arch ? 'arch' : 'rect', ow: dw, oh: d.arch ? dh + dw / 2 : dh, y0: 0, fill: d.fill };
  placeBay(ctx, e, u0, u1 - u0, 0, H, op, S.wallMat || ctx.cfg.wallMat || 'wall', 'door');
  if (d.bars) { for (let k = 0; k <= 6; k++) edgeBox(b, 'frameDark', e, d.u - dw / 2 + 0.1 + (k * (dw - 0.2)) / 6 - 0.02, d.u - dw / 2 + 0.1 + (k * (dw - 0.2)) / 6 + 0.02, 0.1, dh - 0.1, 0.12, 0); for (const yy of [0.6, dh * 0.5, dh - 0.3]) edgeBox(b, 'frameDark', e, d.u - dw / 2 + 0.1, d.u + dw / 2 - 0.1, yy, yy + 0.05, 0.12, 0); }
  if (d.portal) portalFrame(ctx, e, d.u, dw + 0.2, d.arch ? dh + dw / 2 : dh, ys, 'brick');
  // canopy
  if (d.canopy !== false) {
    const cw = dw + 1.8, out = d.canopyOut ?? 1.6;
    edgeBox(b, 'trim', e, d.u - cw / 2, d.u + cw / 2, dh + 0.55, dh + 0.8, out, 0.3);
    edgeBox(b, ctx.cfg.canopyTop || 'turq', e, d.u - cw / 2, d.u + cw / 2, dh + 0.55, dh + 0.64, out + 0.04, 0.3);
    for (const s of [-1, 1]) edgeBox(b, 'trim', e, d.u + s * (cw / 2 - 0.12) - 0.08, d.u + s * (cw / 2 - 0.12) + 0.08, dh + 0.1, dh + 0.55, 0.12, 0.1);
  }
  // steps in front of the door (walkable)
  const n = d.steps ?? 2;
  for (let k = 0; k < n; k++) {
    const top = U.stepRise * (n - k);
    const out0 = k * U.stepTread, out1 = out0 + U.stepTread;
    edgeBox(b, 'concrete', e, d.u - dw / 2 - 0.4, d.u + dw / 2 + 0.4, 0, top, out1, 0);
    const pts = [0, 1, 2, 3].map((c) => {
      const uu = c === 0 || c === 3 ? d.u - dw / 2 - 0.4 : d.u + dw / 2 + 0.4;
      const oo = c < 2 ? out0 : out1;
      return [e.a[0] + e.d[0] * uu + e.n[0] * oo, e.a[1] + e.d[1] * uu + e.n[1] * oo];
    });
    collision.addSurface([pts[0], pts[1], pts[2], pts[3]], top);
  }
}

/** Full facade of one edge: ground floor (with openings / arcade) + upper floors + string courses + plinth. */
export function buildFacade(ctx, e, S) {
  const { b, cfg } = ctx;
  const ys = floorLevels(cfg);
  const floors = cfg.floors;
  const groundType = S.ground || 'windows';
  const upperType = S.upper || 'windows';
  const result = { arcade: null };

  // ground floor: split by doors and passages
  const spans = e.openings.map((o) => {
    const half = (o.kind === 'door' ? Math.max(3.8, (o.width ?? U.doorW) + 1.4) : (o.width + 2.0)) / 2;
    return { u0: Math.max(0, o.u - half), u1: Math.min(e.len, o.u + half), o };
  });
  const { gaps } = splitByOpenings(e.len, spans);

  for (const o of spans) {
    if (o.o.kind === 'door') doorUnit(ctx, e, o.o, ys, S);
    else {
      const H = ys[1], pw = o.o.width, ph = o.o.height ?? U.passageH;
      const op = { kind: o.o.arch ? 'arch' : 'rect', ow: pw, oh: Math.min(ph, H - 0.15), y0: 0 };
      placeBay(ctx, e, o.u0, o.u1 - o.u0, 0, H, op, S.wallMat || cfg.wallMat || 'wall', 'none');
      edgeBox(b, 'trim', e, o.u0, o.u1, 0, 0.06, 0.4, 0);
    }
  }
  for (const [g0, g1] of gaps) {
    if (groundType === 'arcade') { const seg = arcadeSegment(ctx, e, g0, g1, ys, S); if (seg) result.arcade = (result.arcade || []).concat([seg]); }
    else if (groundType === 'archarcade') { const seg = archBays(ctx, e, g0, g1, 0, ys, S, { gd: S.arcadeDepth ?? 0.9, bay: S.arcadeBay ?? 4.4, opening: S.opening ?? 3.0, spring: S.spring ?? 0.9, backType: S.backType, brickPiers: S.brickPiers }); if (seg && seg.depth >= 1.5) { result.arcade = (result.arcade || []).concat([seg]); galleryFloor(ctx, e, g0, g1, seg.depth, S); } }
    else {
      wallSegment(ctx, e, g0, g1, 0, ys, S, groundType);
      if (S.plinth !== false) edgeBox(b, S.plinthMat || 'plinth', e, g0, g1, 0, S.plinthH ?? 0.55, 0.06, 0.0);
      if (S.screens) addScreens(ctx, e, g0, g1, ys);
      if (S.band) edgeBox(b, S.band, e, g0, g1, 0.6, 0.95, 0.09, 0.0);
    }
  }

  // upper floors on the full edge
  for (let f = 1; f < floors; f++) {
    if (upperType === 'loggia') archBays(ctx, e, 0, e.len, f, ys, S, { gd: S.loggiaDepth ?? 2.6, balustrade: true, brickPiers: S.brickPiers, bay: S.loggiaBay ?? 4.2, backType: S.loggiaBack || 'archwin' });
    else wallSegment(ctx, e, 0, e.len, f, ys, S, upperType);
  }

  // string courses at each slab line
  if (S.strings !== false) for (let f = 1; f <= floors; f++) {
    const y = ys[f];
    edgeBox(b, S.stringMat || 'trim', e, 0, e.len, y - (S.stringH ?? 0.32), y + (f === floors ? 0.0 : 0.05), S.stringOut ?? 0.14, 0.0);
  }
  return result;
}

/** White geometric screens (mashrabiya) in front of the ground floor of the red-clad buildings (field photos "PV bldg"). */
function addScreens(ctx, e, g0, g1, ys) {
  const H = ys[1], L = g1 - g0;
  if (L < 4) return;
  const n = Math.max(1, Math.round(L / 3.4)), bw = L / n;
  for (let i = 0; i < n; i++) {
    if (i % 3 === 1) continue;
    const w = bw - 0.5, u = g0 + i * bw + 0.25;
    const g = new THREE.PlaneGeometry(w, H - 0.9, 1, 1);
    const uv = g.attributes.uv;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * (w / 1.3), uv.getY(k) * ((H - 0.9) / 1.3));
    g.translate(w / 2, 0.6 + (H - 0.9) / 2, -0.12);
    g.applyMatrix4(edgeFrame(e, u, 0));
    ctx.texList('mashrabiya').push(g);
  }
}

/** Brick pylons, sign plaque and a cornice around a passage mouth (field photos: Building 4 portal, NW court portal, connector portals). */
export function portalFrame(ctx, e, u, pw, ph, ys, kind) {
  const { b, cfg } = ctx;
  const topY = ys[cfg.floors];
  const pyH = Math.max(ys[1] + 1.2, topY - 0.45);
  const w = 1.05, gap = pw / 2 + 0.04;
  edgeBox(b, 'brick', e, u - gap - w, u - gap, 0, pyH, 0.38, 0.0);
  edgeBox(b, 'brick', e, u + gap, u + gap + w, 0, pyH, 0.38, 0.0);
  edgeBox(b, 'trim', e, u - gap - w - 0.1, u - gap - w + 0.05, 0, pyH + 0.1, 0.42, 0.0);
  edgeBox(b, 'trim', e, u + gap + w - 0.05, u + gap + w + 0.1, 0, pyH + 0.1, 0.42, 0.0);
  edgeBox(b, 'trim', e, u - gap - 0.05, u + gap + 0.05, ph + 0.55, ph + 0.8, 0.3, 0.0);                    // lintel / cornice above the arch
  if (kind === 'arch3') {                                                                                     // plaque + iron-gate leaves folded back against the pylons
    edgeBox(b, 'frameGreen', e, u - 1.4, u + 1.4, ph + 0.95, ph + 1.45, 0.14, 0.0);
    for (const sd of [-1, 1]) edgeBox(b, 'frameDark', e, u + sd * (gap - 0.12) - 0.07, u + sd * (gap - 0.12) + 0.07, 0, ph - 0.8, 0.1, 0.0);
  } else edgeBox(b, 'frameGreen', e, u - 1.1, u + 1.1, ph + 0.95, ph + 1.4, 0.14, 0.0);
}

export { UP };
