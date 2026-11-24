// Node test: build all architecture + collision without a browser.
import fs from 'node:fs';
globalThis.document = { createElement: () => ({ style: {}, setAttribute() {}, remove() {}, addEventListener() {} }) };
const { normalizeLayout } = await import('../src/layout/loadLayout.js');
const { CollisionWorld } = await import('../src/gameplay/CollisionWorld.js');
const { buildArchitecture } = await import('../src/architecture/ArchitectureWorld.js');
const file = process.argv[2] || 'public/data/WorldLayout.json';
const layout = normalizeLayout(JSON.parse(fs.readFileSync(file, 'utf8')), file);
const collision = new CollisionWorld();
const t0 = Date.now();
const arch = buildArchitecture(layout, collision);
collision.finalize();
let tris = 0, meshes = 0, inst = 0;
arch.group.traverse((o) => {
  if (o.isInstancedMesh) { inst += o.count; meshes++; tris += (o.geometry.attributes.position.count / 3) * o.count; }
  else if (o.isMesh) { meshes++; tris += o.geometry.attributes.position.count / 3; const p = o.geometry.attributes.position.array; for (let i = 0; i < p.length; i++) if (!Number.isFinite(p[i])) throw new Error('NaN in ' + o.name); }
});
console.log(`built ${arch.infos.size} buildings in ${Date.now() - t0} ms: ${meshes} draw calls, ${inst} instances, ~${Math.round(tris / 1000)}k triangles`);
console.log(`collision: ${collision.solids.length} solids, ${collision.circles.length} circles, ${collision.surfaces.length} surfaces`);
let pass = 0, arc = 0, door = 0;
for (const [id, i] of arch.infos) { pass += i.passages; arc += i.arcades; door += i.doors; }
console.log(`passages ${pass}, arcades ${arc}, doors ${door}`);
