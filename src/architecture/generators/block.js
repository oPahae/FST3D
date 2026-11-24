import polygonClipping from 'polygon-clipping';
import { U } from '../units.js';
import { buildEdges, buildFacade, floorLevels, pickRule } from '../facade.js';
import { buildRoof } from '../roof.js';
import { buildPassage } from '../passage.js';
import { buildStairs } from '../stairs.js';
import { pointInPolygon } from '../../world/geom.js';

const inPoly = (x, z, poly) => pointInPolygon(x, z, poly.outer) && !poly.holes.some((h) => pointInPolygon(x, z, h));

function nearestEdge(edges, P) {
  let best = null;
  for (const e of edges) {
    if (e.party) continue;
    const dx = e.b[0] - e.a[0], dz = e.b[1] - e.a[1];
    const t = Math.max(0, Math.min(1, ((P[0] - e.a[0]) * dx + (P[1] - e.a[1]) * dz) / (e.len * e.len)));
    const qx = e.a[0] + dx * t, qz = e.a[1] + dz * t;
    const d = Math.hypot(P[0] - qx, P[1] - qz);
    if (!best || d < best.d) best = { e, d, u: t * e.len };
  }
  return best;
}

function placeDoor(edges, spec, shared) {
  let target = null;
  if (spec.nu) {
    const n = nearestEdge(edges, shared.nuToM(spec.nu));
    if (n && n.d < 14) target = n;
  } else {
    const cands = edges.filter((e) => !e.party && (!spec.side || e.side === spec.side) && (!spec.face || e.face === spec.face));
    cands.sort((a, c) => c.len - a.len);
    if (cands.length) target = { e: cands[0], u: cands[0].len * (spec.at ?? 0.5) };
  }
  if (!target) return false;
  const margin = 2.2;
  const u = Math.max(margin, Math.min(target.e.len - margin, target.u));
  target.e.openings.push({ kind: 'door', u, width: spec.width, height: spec.height, arch: spec.arch, canopy: spec.canopy, steps: spec.steps, canopyOut: spec.canopyOut, portal: spec.portal, fill: spec.fill, bars: spec.bars, canopyType: spec.canopyType });
  return true;
}

/** Generic multi-storey block: walls with openings, arcades, doors, tunnels, roof. Used by most buildings. */
export function generateBlock(shared, bld, cfg) {
  const builder = shared.builder;
  const ctx = { b: builder, cfg, collision: shared.collision, tiles: shared.tiles, texList: (k) => shared.texList(k), shared };
  const ys = floorLevels(cfg);
  const topY = ys[cfg.floors];
  const info = { id: bld.id, topY, passages: 0, arcades: 0, doors: 0, edges: 0 };

  for (const poly of shared.polysM(bld.id)) {
    const solidAt = (x, z) => inPoly(x, z, poly);
    const edges = buildEdges(poly, solidAt, (x, z) => shared.otherSolidAt(bld.id, x, z), shared.faceAt);
    info.edges += edges.length;
    for (const e of edges) e.style = pickRule(e, cfg.facades || []);

    for (const d of cfg.doors || []) if (placeDoor(edges, d, shared)) info.doors++;

    const cuts = [];
    if (cfg.prepare) { const r = cfg.prepare(ctx, edges, shared, poly) || {}; for (const c of r.cuts || []) cuts.push(c); }
    for (const p of shared.passagesFor(bld.id)) {
      const r = buildPassage(ctx, edges, p);
      if (r) { cuts.push(r.rect); info.passages++; }
    }

    for (const e of edges) {
      if (e.party) continue;
      const res = buildFacade(ctx, e, e.style);
      if (res.arcade) for (const a of res.arcade) {
        const u0 = a.u0 + 0.25, u1 = a.u1 - 0.25;
        if (u1 - u0 < 1) continue;
        const A0 = [e.a[0] + e.d[0] * u0, e.a[1] + e.d[1] * u0], A1 = [e.a[0] + e.d[0] * u1, e.a[1] + e.d[1] * u1];
        const out = 0.9, inn = a.depth - 0.05;
        cuts.push([[A0[0] + e.n[0] * out, A0[1] + e.n[1] * out], [A1[0] + e.n[0] * out, A1[1] + e.n[1] * out], [A1[0] - e.n[0] * inn, A1[1] - e.n[1] * inn], [A0[0] - e.n[0] * inn, A0[1] - e.n[1] * inn]]);
        info.arcades++;
      }
    }

    if (cfg.interior) { const r = cfg.interior(shared, bld, poly, edges, ctx); for (const c of r.cuts || []) cuts.push(c); }
    buildRoof(ctx, poly, edges, solidAt, topY, shared.roofFeaturesFor(bld.id));
    if (cfg.extra) cfg.extra(shared, bld, poly, ctx);

    // collision: footprint minus passages and gallery strips
    const subject = [poly.outer.map((p) => [p[0], p[1]]), ...poly.holes.map((h) => h.map((p) => [p[0], p[1]]))];
    const mp = cuts.length ? polygonClipping.difference(subject, ...cuts.map((c) => [c.map((p) => [p[0], p[1]])])) : [subject];
    shared.collision.addMulti(mp, bld.id);
  }

  if (cfg.platform) addPlatform(ctx, shared, bld, cfg.platform);
  return { info };
}

function addPlatform(ctx, shared, bld, pf) {
  const { b, collision } = ctx;
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  for (const p of shared.polysM(bld.id)) for (const [x, z] of p.outer) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  const m = pf.margin ?? 2.4, h = pf.h ?? 0.45;
  x0 -= m; x1 += m; z0 -= m; z1 += m;
  b.box('stone', (x0 + x1) / 2, h / 2, (z0 + z1) / 2, x1 - x0, h, z1 - z0);
  b.box('paving', (x0 + x1) / 2, h + 0.01, (z0 + z1) / 2, x1 - x0 - 0.2, 0.02, z1 - z0 - 0.2);
  collision.addSurface([[x0, z0], [x1, z0], [x1, z1], [x0, z1]], h);
  const steps = Math.round(h / U.stepRise);
  const sw = pf.stepWidth ?? 5;
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, T = U.stepTread;
  for (const s of pf.stepsOn || ['N', 'S', 'E', 'W']) {
    if (s === 'N') buildStairs(ctx, { origin: [cx, z0 - steps * T], dir: [0, 1], width: sw, steps, tread: T, mat: 'stone' });
    if (s === 'S') buildStairs(ctx, { origin: [cx, z1 + steps * T], dir: [0, -1], width: sw, steps, tread: T, mat: 'stone' });
    if (s === 'W') buildStairs(ctx, { origin: [x0 - steps * T, cz], dir: [1, 0], width: sw, steps, tread: T, mat: 'stone' });
    if (s === 'E') buildStairs(ctx, { origin: [x1 + steps * T, cz], dir: [-1, 0], width: sw, steps, tread: T, mat: 'stone' });
  }
}
