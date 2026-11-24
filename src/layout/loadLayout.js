// Loads WorldLayout JSON and normalizes v0.1 and v0.2 into one internal shape.
// The renderer only ever sees the normalized shape, so the JSON can evolve without touching world code.

const STATUS_ALIASES = { labelled: 'named_in_model', hypothesis: 'provisional' };

const asPoly = (fp) => (Array.isArray(fp) ? { outer: fp, holes: [] } : { outer: fp.outer, holes: fp.holes || [] });

export async function loadLayout(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Cannot load layout ${url}: HTTP ${res.status}`);
  return normalizeLayout(await res.json(), url);
}

export function normalizeLayout(raw, source = '') {
  const cs = raw.coordinateSystem || {};
  const originPx = cs.originPx || [360, 340];
  const pxPerNU = cs.pxPerNU || 330;
  const sat = (raw.referenceImages && raw.referenceImages.satellite) || {};
  const sizePx = sat.sizePx || [789, 832];
  const toNU = (px, py) => [(px - originPx[0]) / pxPerNU, (py - originPx[1]) / pxPerNU];
  const [minX, minZ] = toNU(0, 0);
  const [maxX, maxZ] = toNU(sizePx[0], sizePx[1]);

  const buildings = (raw.buildings || []).map((b) => {
    const status = STATUS_ALIASES[b.identityStatus] || b.identityStatus || 'unidentified';
    return {
      id: b.id,
      name: b.name || b.id,
      label: b.label !== undefined ? b.label : b.name || b.id,
      status,
      provisional: b.provisional !== undefined ? !!b.provisional : status !== 'named_in_model',
      identityConfidence: b.identityConfidence || b.placementConfidence || 'unknown',
      footprintConfidence: b.footprintConfidence || 'unknown',
      polys: (b.footprints || []).map(asPoly),
      height: typeof b.height === 'number' ? b.height : null, // null = unknown (renderer uses uniform placeholder)
      notes: b.notes || '',
      satelliteEvidence: b.satelliteEvidence || '',
      modelReference: b.modelReference || '',
      raw: b,
    };
  });

  return {
    source,
    version: (raw.meta && raw.meta.version) || '?',
    meta: raw.meta || {},
    originPx,
    pxPerNU,
    satelliteFile: sat.file || 'reference/satellite.png',
    satelliteSizePx: sizePx,
    extent: { minX, maxX, minZ, maxZ },
    buildings,
    roads: (raw.roads || []).map((r) => ({
      id: r.id, name: r.name, widthNU: r.widthNU, confidence: r.confidence || 'unknown',
      centerline: r.centerline || null, ring: r.ring || null,
      sidewalk: r.sidewalk && r.sidewalk !== 'none' ? (r.sidewalkWidthNU || 0.012) : 0,
    })),
    pathways: (raw.pathways || []).map((p) => ({ id: p.id, name: p.name, widthNU: p.widthNU, confidence: p.confidence || 'unknown', centerline: p.centerline, hedges: !!p.hedges, keepHedges: !!p.keepHedges, surface: p.surface || null })),
    noHedge: raw.noHedge || [],
    terrain: (raw.terrain || []).map((t) => ({ ...t })),
    courtyards: (raw.courtyards || []).map((c) => ({
      id: c.id, name: c.name, type: c.type || 'garden', confidence: c.confidence || 'unknown', notes: c.notes || '',
      polygon: c.polygon || null, circle: c.circle || null, buildingCourt: !!c.buildingCourt, courtStyle: c.courtStyle || 'lawn', raise: c.raise || 0, drop: c.drop || 0,
    })),
    vegetation: (raw.vegetation || []).map((v) => ({
      id: v.id, type: v.type, confidence: v.confidence || 'unknown',
      line: v.line || null, spacingNU: v.spacingNU || 0.04, polygon: v.polygon || null, circle: v.circle || null,
    })),
    entrances: (raw.entrances || []).map((e) => ({ id: e.id, name: e.name, position: e.position, confidence: e.confidence || 'unknown', notes: e.notes || '' })),
    passages: (raw.passages || []).map((p) => ({ id: p.id, building: p.building, p: p.centerline[0], q: p.centerline[1], widthNU: p.widthNU, arch: !!p.arch, style: p.style || null, floor: p.floor || null, portal: p.portal || null, provenance: p.provenance || 'unknown', confidence: p.confidence || 'unknown', evidence: p.evidence || '' })),
    roofFeatures: (raw.roofFeatures || []).map((f) => ({ id: f.id, building: f.building, type: f.type, polygon: f.polygon, provenance: f.provenance || 'unknown' })),
    features: (raw.features || []).map((f) => ({ ...f })),
    fences: (raw.fences || []).map((f) => ({ id: f.id, kind: f.kind || 'fence', gapsNU: f.gapsNU || [], centerline: f.centerline, provenance: f.provenance || 'unknown' })),
    gates: (raw.gates || []).map((g) => ({ id: g.id, position: g.position, widthNU: g.widthNU, kind: g.kind || 'pillars', provenance: g.provenance || 'unknown' })),
    nuToPx: ([x, z]) => [x * pxPerNU + originPx[0], z * pxPerNU + originPx[1]],
  };
}
