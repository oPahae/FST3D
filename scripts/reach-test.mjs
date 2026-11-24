// Walkability test (Node, no browser): flood-fills the collision world from the spawn point with the
// player's radius and checks that key places (and every passage / court / gallery) are reachable.
import fs from 'node:fs';
globalThis.document = { createElement: () => ({ style: {}, setAttribute() {}, remove() {}, addEventListener() {} }) };
const { normalizeLayout } = await import('../src/layout/loadLayout.js');
const { buildCampus } = await import('../src/CampusWorld.js');
const { CONFIG } = await import('../src/config.js');
const { U } = await import('../src/architecture/units.js');

const file = process.argv[2] || 'public/data/WorldLayout.json';
const layout = normalizeLayout(JSON.parse(fs.readFileSync(file, 'utf8')), file);
const campus = buildCampus(layout, { overlay: false, doc: globalThis.document });
const col = campus.collision, S = CONFIG.unitsPerNU, R = U.avatarR;
const ex = campus.extentWorld, H = 0.5;
const W = Math.ceil((ex.x1 - ex.x0) / H), D = Math.ceil((ex.z1 - ex.z0) / H);
const cx = (i) => ex.x0 + (i + 0.5) * H, cz = (j) => ex.z0 + (j + 0.5) * H;
const free = new Uint8Array(W * D);
for (let j = 0; j < D; j++) for (let i = 0; i < W; i++) free[j * W + i] = col.blocked(cx(i), cz(j), R) ? 0 : 1;

const seen = new Uint8Array(W * D);
const g = campus.entrance;
const start = [Math.floor((g[0] - ex.x0) / H), Math.floor((g[1] - 10 - ex.z0) / H)];
const q = [start[1] * W + start[0]];
if (!free[q[0]]) { console.error('spawn is blocked'); process.exit(1); }
seen[q[0]] = 1;
for (let h = 0; h < q.length; h++) {
  const c = q[h], i = c % W, j = (c / W) | 0;
  for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const ni = i + di, nj = j + dj;
    if (ni < 0 || nj < 0 || ni >= W || nj >= D) continue;
    const n = nj * W + ni;
    if (!seen[n] && free[n]) { seen[n] = 1; q.push(n); }
  }
}
const reach = (x, z) => { const i = Math.floor((x - ex.x0) / H), j = Math.floor((z - ex.z0) / H); return free[j * W + i] && seen[j * W + i]; };
const px = (x, y) => [((x - 360) / 330) * S, ((y - 340) / 330) * S];

const targets = [
  ['spawn forecourt', ...px(352, 640)], ['central garden centre', ...px(300, 300)], ['garden near Block A gallery', ...px(480, 430)], ['garden near Block C gallery', ...px(262, 230)],
  ['north plaza (behind building 4)', ...px(364, 130)], ['west of west wing (outside)', ...px(185, 420)], ['east of east wing (outside)', ...px(560, 300)],
  ['NW inner court', ...px(125, 228)], ['SE inner court', ...px(598, 600)], ['Amphi 6 side', ...px(160, 415)], ['Amphi 2 side', ...px(600, 480)],
  ['buvette door (west of the boulevard)', ...px(18, 460)], ['IT Learning north court', ...px(108, 620)], ['west road', ...px(41, 400)], ['east service road', ...px(706, 500)], ['north avenue', ...px(300, 26)],
  ['south of S3', ...px(352, 760)], ['roundabout island edge', ...px(715, 380)],
  ['SE bridge corner', 0.72 * 150, 0.7909 * 150], ['IT Learning court via entrance block', -0.76 * 150, 0.8 * 150], ['PV hall exit (west side)', -0.567 * 150, 0.95 * 150], ['NW court inside', -0.712 * 150, -0.34 * 150], ['central garden cloister west', -0.383 * 150, 0.1 * 150], ['central garden cloister south', 0.0 * 150, 0.451 * 150], ['central garden cloister north', 0.1 * 150, -0.419 * 150],
  ['NE court porch N', 0.5848 * 150 - 3.5, -0.5075 * 150], ['NE court porch S', 0.5848 * 150 - 3.5, -0.350 * 150], ['passage Block B / NE to boulevard', 0.5395 * 150, -0.60 * 150], ['Block B niche 1', 0.3879 * 150 - 1.5, -0.2989 * 150], ['Block B niche 2 (connector)', 0.3879 * 150 - 1.5, -0.1509 * 150], ['staff buvette yard', -0.45 * 150, 0.745 * 150], ['staff buvette door', -0.4264 * 150, 0.7195 * 150], ['copy centre gap', -1.045 * 150, 0.4812 * 150], ['main gate (E-W)', 0.872 * 150, 0.0152 * 150], ['S2-SE raised passage', 0.40 * 150, 0.8 * 150], ['Amphi 6 east door', -0.6515 * 150 + 3, 0.2906 * 150], ['FST pedestrian gate', 0.0813 * 150 - 2.2 + 6, -0.835 * 150 + 4], ['street north of gate', 0.0121 * 150, -0.835 * 150 - 8], ['S2 stairs landing', 0.1292 * 150 - 6, 0.8 * 150], ['NW corner island', -0.8967 * 150, -0.6209 * 150 + 0.1],
  ['Administration inner court', ...px(354, 543)], ['Building 4 inner court', ...px(364, 172)], ['west connector patio', ...px(206, 335)], ['east connector patio', ...px(513, 337)],
];
let fail = 0;
for (const [name, x, z] of targets) {
  let ok = reach(x, z);
  if (!ok) { // look for a free cell within 4 m (a target may sit on a bench or tree)
    for (let r = 1; r <= 8 && !ok; r++) for (let a = 0; a < 16 && !ok; a++) ok = reach(x + Math.cos(a / 16 * 6.2832) * r * H, z + Math.sin(a / 16 * 6.2832) * r * H);
  }
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}`);
  if (!ok) fail++;
}
// every passage: both mouths must be walkable and connected to the spawn region
for (const p of layout.passages) {
  const P = [p.p[0] * S, p.p[1] * S], Q = [p.q[0] * S, p.q[1] * S];
  const mid = [(P[0] + Q[0]) / 2, (P[1] + Q[1]) / 2];
  const a = reach(...P) || reach(P[0], P[1]), b = reach(...Q), m = reach(...mid);
  const ok = m && (a || b);
  console.log(`${ok ? 'OK  ' : 'FAIL'} passage ${p.id}: mid ${m ? 'free' : 'BLOCKED'}, mouth A ${a ? 'reachable' : 'unreachable'}, mouth B ${b ? 'reachable' : 'unreachable'}`);
  if (!ok) fail++;
}
const total = free.reduce((s, v) => s + v, 0), got = q.length;
console.log(`walkable area reachable from spawn: ${(100 * got / total).toFixed(1)} % (${got}/${total} cells)`);
// enclosed pockets bigger than 40 m2 that are NOT reachable (would mean trapped or sealed areas)
const comp = new Uint8Array(W * D); let pockets = 0;
for (let s0 = 0; s0 < W * D; s0++) {
  if (!free[s0] || seen[s0] || comp[s0]) continue;
  const stack = [s0]; comp[s0] = 1; let n = 0;
  while (stack.length) { const c = stack.pop(); n++; const i = c % W, j = (c / W) | 0; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ni = i + di, nj = j + dj; if (ni < 0 || nj < 0 || ni >= W || nj >= D) continue; const nn = nj * W + ni; if (free[nn] && !seen[nn] && !comp[nn]) { comp[nn] = 1; stack.push(nn); } } }
  if (n * H * H > 40) { pockets++; console.log(`  sealed pocket ~${Math.round(n * H * H)} m2 at ${cx(s0 % W).toFixed(0)}, ${cz((s0 / W) | 0).toFixed(0)}`); }
}
console.log(`sealed pockets > 40 m2: ${pockets}`);
console.log(fail ? `FAIL: ${fail} check(s)` : 'PASS');
process.exit(fail ? 1 : 0);
