// Generates ARCHITECTURE_ASSUMPTIONS.md from the per-building configs and the layout (single source of truth).
import fs from 'node:fs';
const { CONFIGS } = await import('../src/architecture/configs/index.js');
const layout = JSON.parse(fs.readFileSync('public/data/WorldLayout.json', 'utf8'));
const tag = (t = '') => (t.split(':')[0].match(/verified|inferred|assumed|provisional/) || ['-'])[0];
let md = `# Architecture assumptions and provenance (generated)

Generated from \`src/architecture/configs/*\` and \`public/data/WorldLayout.json\` (v${layout.meta.version}). Do not edit by hand: change the config and run \`npm run assumptions\`.

**Global assumptions**

- **Scale:** 1 NU = 150 m (assumed; +/-30 %). All dimensions below are in metres on that assumption.
- **Storey heights:** 3.9 m ground storey, 3.5 m upper storeys, 3.6 m bays, 1.5 x 1.5 m windows: typical values, not measured.
- **Interiors:** buildings are hollow shells and cannot be entered. Doors are modelled with canopies and steps but lead nowhere. Only passages, arcades, courts and walkways are walkable.
- **Furniture, lamps, benches, lawn beds and tree positions** are illustrative: no reference shows them.
- **Verified** = visible in the satellite or model photos. **Inferred** = strongly suggested (plan symmetry, paths, shadows). **Assumed** = plausible provisional design; replace when a better reference exists.

## Passages and courts (layout)

| id | building | provenance | confidence | basis |
|---|---|---|---|---|
`;
for (const p of layout.passages) md += `| ${p.id} | ${p.building} | ${p.provenance} | ${p.confidence} | ${p.evidence} |\n`;
md += `\n| court | style | provenance | note |\n|---|---|---|---|\n`;
for (const c of layout.courtyards.filter((q) => q.buildingCourt)) md += `| ${c.id} | ${c.courtStyle} | ${c.provenance || '-'} | ${c.notes} |\n`;
md += `\n## Roof features (layout)\n\n| id | building | type | provenance |\n|---|---|---|---|\n`;
for (const f of layout.roofFeatures) md += `| ${f.id} | ${f.building} | ${f.type} | ${f.provenance} |\n`;
md += `\n## Per-building provenance\n`;
for (const b of layout.buildings) {
  const c = CONFIGS[b.id];
  md += `\n### ${b.name} (\`${b.id}\`)\n\n- identity: ${b.identityStatus} (${b.identityConfidence}); footprint confidence: ${b.footprintConfidence}\n`;
  if (!c) { md += '- no config (generic fallback)\n'; continue; }
  md += `- generator: ${c.generator}; floors: ${c.floors}${c.groundH !== 3.9 ? `; ground storey ${c.groundH} m` : ''}\n`;
  for (const [k, v] of Object.entries(c.provenance || {})) md += `- ${k} [${tag(v)}]: ${v}\n`;
  if (c.notes) md += `- note: ${c.notes}\n`;
}
fs.writeFileSync('ARCHITECTURE_ASSUMPTIONS.md', md);
console.log('wrote ARCHITECTURE_ASSUMPTIONS.md', md.length, 'bytes');
