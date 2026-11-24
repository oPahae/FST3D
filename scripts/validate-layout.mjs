// Sanity checks for WorldLayout JSON (any version). Usage: npm run validate [-- path/to/layout.json]
import fs from 'node:fs';

const file = process.argv[2] || 'public/data/WorldLayout.json';
const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
const issues = [];
const warn = (m) => issues.push(m);

const cs = raw.coordinateSystem || {};
const origin = cs.originPx || [360, 340], ppn = cs.pxPerNU || 330;
const size = (raw.referenceImages?.satellite?.sizePx) || [789, 832];
const ext = { minX: (0 - origin[0]) / ppn, maxX: (size[0] - origin[0]) / ppn, minZ: (0 - origin[1]) / ppn, maxZ: (size[1] - origin[1]) / ppn };
const m = 0.05;

const area = (pts) => { let a = 0; for (let i = 0; i < pts.length; i++) { const [x0, z0] = pts[i], [x1, z1] = pts[(i + 1) % pts.length]; a += x0 * z1 - x1 * z0; } return Math.abs(a) / 2; };
const inside = ([x, z]) => x >= ext.minX - m && x <= ext.maxX + m && z >= ext.minZ - m && z <= ext.maxZ + m;

const ids = new Set();
for (const b of raw.buildings || []) {
  if (ids.has(b.id)) warn(`duplicate building id ${b.id}`);
  ids.add(b.id);
  const fps = (b.footprints || []).map((f) => (Array.isArray(f) ? { outer: f, holes: [] } : f));
  if (!fps.length) warn(`${b.id}: no footprint`);
  for (const f of fps) {
    if (f.outer.length < 3) warn(`${b.id}: outer ring < 3 points`);
    if (area(f.outer) < 1e-5) warn(`${b.id}: degenerate area`);
    if (!/^CITE_/.test(b.id) && !f.outer.every(inside)) warn(`${b.id}: vertex outside satellite coverage`);   // v0.7e: Cité is beyond the satellite crop
    for (const h of f.holes || []) if (area(h) >= area(f.outer)) warn(`${b.id}: hole larger than outer ring`);
  }
  if (b.height !== null && b.height !== undefined && typeof b.height !== 'string' && typeof b.height !== 'number') warn(`${b.id}: invalid height`);
  if (typeof b.height === 'number') warn(`${b.id}: has a numeric height - make sure it is measured, not guessed`);
}
for (const r of raw.roads || []) {
  if (!(r.centerline || r.ring)) warn(`road ${r.id}: no geometry`);
  if (r.centerline && !r.centerline.every(inside)) warn(`road ${r.id}: point outside coverage`);
}
for (const e of raw.entrances || []) if (!inside(e.position)) warn(`entrance ${e.id}: outside coverage`);

for (const p of raw.passages || []) {
  if (!ids.has(p.building)) warn(`passage ${p.id}: unknown building ${p.building}`);
  if (!p.provenance) warn(`passage ${p.id}: no provenance`);
}
for (const f of raw.roofFeatures || []) if (!ids.has(f.building)) warn(`roof feature ${f.id}: unknown building ${f.building}`);
const count = (k) => (raw[k] || []).length;
console.log(`${file}  version ${raw.meta?.version ?? '?'}`);
console.log(`buildings ${count('buildings')}, roads ${count('roads')}, pathways ${count('pathways')}, courtyards ${count('courtyards')}, vegetation zones ${count('vegetation')}, entrances ${count('entrances')}`);
const st = {};
for (const b of raw.buildings || []) { const s = b.identityStatus; st[s] = (st[s] || 0) + 1; }
console.log('identity status:', st);
console.log(issues.length ? `\n${issues.length} issue(s):\n- ${issues.join('\n- ')}` : '\nNo issues found.');
process.exit(issues.length ? 1 : 0);
