import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { w2, polygonCentroid, S } from './geom.js';
const topY = (e) => e.topY;

/**
 * HTML labels (CSS2D) so text stays crisp and readable from any camera.
 * Kinds: building:<status>, entrance, place (courtyards), road.
 */
export function buildLabels(layout, buildingEntries, doc = document) {
  const group = new THREE.Group();
  group.name = 'labels';
  const items = [];

  const add = (kind, text, x, y, z, cls, extra = {}) => {
    const el = doc.createElement('div');
    el.className = `lbl ${cls}`;
    el.textContent = text;
    const obj = new CSS2DObject(el);
    obj.position.set(x, y, z);
    group.add(obj);
    items.push({ kind, obj, el, ...extra });
    return obj;
  };

  for (const e of buildingEntries) {
    const b = e.data;
    if (!b.label) continue;
    let text = b.label;
    if (b.status === 'provisional' && !text.includes('?')) text += ' ?';
    add(`building:${b.status}`, text, e.anchor[0], topY(e) + 1.5, e.anchor[1], `lbl-b lbl-${b.status}`, { building: e });
  }

  for (const c of layout.courtyards) {
    const outer = c.polygon || null;
    if (!outer) continue;
    const [cx, cz] = polygonCentroid(outer);
    add('place', c.name, cx * S, 1.2, cz * S, 'lbl-place');
  }

  for (const en of layout.entrances) {
    const [x, z] = w2(en.position);
    add('entrance', en.name + (en.confidence === 'low' ? ' ?' : ''), x, 9, z, 'lbl-entrance');
  }

  for (const r of layout.roads) {
    const pts = r.centerline;
    if (pts && pts.length > 1) {
      const m = pts[Math.floor(pts.length / 2)];
      add('road', r.name, m[0] * S, 0.8, m[1] * S, 'lbl-road');
    } else if (r.ring) {
      const [cx, cz] = w2(r.ring.center);
      add('road', r.name, cx, 0.8, cz + r.ring.radiusNU * S, 'lbl-road');
    }
  }

  return { group, items };
}

/** Re-anchor building labels after the placeholder-height slider changed. */
export function refreshLabelHeights(items) {
  for (const it of items) if (it.building) it.obj.position.y = topY(it.building) + 1.5;
}

export function applyLabelFilter(items, f) {
  for (const it of items) {
    let v = true;
    if (it.kind.startsWith('building:')) {
      const st = it.kind.split(':')[1];
      v = (st === 'named_in_model' && f.named) || (st === 'provisional' && f.provisional) || (st === 'unidentified' && f.unidentified) || (st === 'outside_model' && f.outside);
    } else if (it.kind === 'entrance') v = f.entrances;
    else if (it.kind === 'place') v = f.places;
    else if (it.kind === 'road') v = f.roads;
    it.obj.visible = !!v;
  }
}
