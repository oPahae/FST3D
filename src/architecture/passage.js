import { U } from './units.js';
import { floorLevels, portalFrame } from './facade.js';
import { flatPoly } from './shapes.js';
import { worldUV } from '../environment/ribbon.js';

/** Intersection of segment PQ with an edge; returns distance u along the edge, or null. */
function hit(e, P, Q) {
  const rx = Q[0] - P[0], rz = Q[1] - P[1];
  const sx = e.b[0] - e.a[0], sz = e.b[1] - e.a[1];
  const den = rx * sz - rz * sx;
  if (Math.abs(den) < 1e-9) return null;
  const qpx = e.a[0] - P[0], qpz = e.a[1] - P[1];
  const t = (qpx * sz - qpz * sx) / den;
  const u = (qpx * rz - qpz * rx) / den;
  if (t < -0.001 || t > 1.001 || u < -0.001 || u > 1.001) return null;
  return { t, u: u * e.len };
}

/**
 * A walkable tunnel through a building. Registers openings on the edges it crosses,
 * builds the tunnel interior (side walls, ceiling, floor) and returns the free rectangle
 * that must be cut out of the collision footprint.
 */
export function buildPassage(ctx, edges, pass) {
  const { b } = ctx;
  const P = pass.p, Q = pass.q;
  const ys = floorLevels(ctx.cfg);
  const pw = pass.width, ph = pass.height ?? (pass.arch ? Math.min(ys[1] - 0.6, 4.4) : U.passageH);
  const hits = [];
  for (const e of edges) {
    if (e.party) continue;
    const h = hit(e, P, Q);
    if (h) { hits.push({ e, ...h }); }
  }
  if (hits.length < 2) return null;
  hits.sort((x, y) => x.t - y.t);
  const first = hits[0], last = hits[hits.length - 1];
  for (const h of [first, last]) {
    h.e.openings.push({ kind: 'passage', u: h.u, width: pw, height: ph, arch: !!pass.arch });
    if (pass.portal) portalFrame(ctx, h.e, h.u, pw, ph, ys, pass.portal);
  }

  const dx = Q[0] - P[0], dz = Q[1] - P[1], L = Math.hypot(dx, dz);
  const dir = [dx / L, dz / L], nrm = [-dir[1], dir[0]];
  const A = [P[0] + dx * first.t, P[1] + dz * first.t];
  const B = [P[0] + dx * last.t, P[1] + dz * last.t];
  const len = Math.hypot(B[0] - A[0], B[1] - A[1]);
  const mid = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
  const yaw = -Math.atan2(dir[1], dir[0]);
  const wallM = ctx.cfg.wallMat || 'wallWarm';
  for (const sd of [-1, 1]) {
    const ox = nrm[0] * (pw / 2 + 0.2) * sd, oz = nrm[1] * (pw / 2 + 0.2) * sd;
    b.wallBox(wallM, A[0] + ox, A[1] + oz, B[0] + ox, B[1] + oz, 0, ph + 0.3, 0.4);
  }
  b.box(wallM, mid[0], ph + 0.15, mid[1], len, 0.3, pw + 0.8, yaw);
  if (pass.style === 'colonnade') {
    // square pillars standing against both side walls (field photos "Administration inner court" / "Passages dans les blocks"), chevron floor
    const n = Math.max(2, Math.round(len / 3.6));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      for (const sd of [-1, 1]) {
        const x = A[0] + dx / L * len * t + nrm[0] * (pw / 2 - 0.1) * sd, z = A[1] + dz / L * len * t + nrm[1] * (pw / 2 - 0.1) * sd;
        b.box(wallM, x, (ph + 0.15) / 2, z, 0.8, ph + 0.15, 0.8, yaw);
        b.box('plinth', x, 0.2, z, 0.95, 0.4, 0.95, yaw);
        b.box('trim', x, ph - 0.1, z, 1.0, 0.3, 1.0, yaw);
      }
    }
    for (const sd of [-1, 1]) {
      const ox = nrm[0] * (pw / 2 - 0.1) * sd, oz = nrm[1] * (pw / 2 - 0.1) * sd;
      b.wallBox('trim', A[0] + ox, A[1] + oz, B[0] + ox, B[1] + oz, ph - 0.25, ph + 0.05, 0.7);
    }
    const P = (t, sd) => [A[0] + dx / L * len * t + nrm[0] * (pw / 2) * sd, A[1] + dz / L * len * t + nrm[1] * (pw / 2) * sd];
    ctx.texList('floorChevron').push(worldUV(flatPoly([P(0, -1), P(1, -1), P(1, 1), P(0, 1)], [], 0.07)));
  } else if (pass.floor === 'grey') {
    b.box('concrete', mid[0], 0.04, mid[1], len, 0.08, pw, yaw);   // plain grey concrete floor (user list v0.7)
  } else {
    const Pq = (t, sd) => [A[0] + dx / L * len * t + nrm[0] * (pw / 2) * sd, A[1] + dz / L * len * t + nrm[1] * (pw / 2) * sd];
    ctx.texList('floorHerring').push(worldUV(flatPoly([Pq(0, -1), Pq(1, -1), Pq(1, 1), Pq(0, 1)], [], 0.07)));   // herringbone of blue-grey bricks (photo "Passages")
  }
  // a lamp strip so the tunnel does not read as a black hole
  b.box('lampHead', mid[0], ph - 0.05, mid[1], Math.max(0.5, len - 0.6), 0.06, 0.3, yaw);

  const ex = 0.35;
  const cx = [A[0] - dir[0] * ex, A[1] - dir[1] * ex], cy = [B[0] + dir[0] * ex, B[1] + dir[1] * ex];
  const h2 = pass.style === 'colonnade' ? pw / 2 - 0.45 : pw / 2;
  return {
    rect: [
      [cx[0] + nrm[0] * h2, cx[1] + nrm[1] * h2], [cy[0] + nrm[0] * h2, cy[1] + nrm[1] * h2],
      [cy[0] - nrm[0] * h2, cy[1] - nrm[1] * h2], [cx[0] - nrm[0] * h2, cx[1] - nrm[1] * h2],
    ],
    from: A, to: B, width: pw,
  };
}
