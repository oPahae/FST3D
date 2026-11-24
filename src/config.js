// Rendering configuration. NOTHING in this file is geographic data.
// Geography lives in public/data/WorldLayout*.json (normalized units, "NU").

export const CONFIG = {
  // 1 NU (normalized unit) -> world units. Purely a display scale; real metres are unknown.
  unitsPerNU: 150,   // 1 NU = 150 m: ASSUMED scale (see README); world units are metres

  // !!! PLACEHOLDER !!! Building heights are UNKNOWN. Every building is extruded to the same
  // arbitrary height so volumes are visible. This is not data and must never be read as a floor count.
  placeholderBuildingHeight: 3,
  heightSliderRange: [0.2, 4],

  // Vertical layering of flat items (world units) to avoid z-fighting.
  y: { ground: 0, grove: 0.04, garden: 0.08, paved: 0.1, sidewalk: 0.12, road: 0.16, path: 0.2, overlay: 0.28, marker: 0.3 },

  // Ground plane margin around the satellite coverage (NU).
  groundMarginNU: 9,

  colors: {
    ground: 0xd8d0b4,
    road: 0x50545b,
    roadLow: 0x666a70,        // low-confidence roads are drawn lighter
    sidewalk: 0xc9c4b4,
    path: 0xe0d4b4,
    garden: 0x7fa36c,
    paved: 0xdacfae,
    grove: 0x9db98a,
    palmCrown: 0x2f6a35,
    treeCrown: 0x4f8040,
    trunk: 0x6a5238,
    entrance: 0xffb000,
    extentLine: 0x777777,
    status: {
      named_in_model: { roof: 0xe8d6b0, wall: 0xcdb98f, edge: 0x6a5632 },
      provisional:    { roof: 0xf2d9a8, wall: 0xdcb780, edge: 0xff7a00 },
      unidentified:   { roof: 0xcfcfcf, wall: 0xa9a9a9, edge: 0x5f5f5f },
      outside_model:  { roof: 0xc4d2db, wall: 0xa2b4c0, edge: 0x45697c },
    },
  },

  // Tree sizes are symbolic (not surveyed).
  tree: { palmTrunkH: 4.2, palmCrownR: 1.7, treeTrunkH: 1.4, treeCrownR: 1.6, groveAreaPerTree: 24 },

  walk: { speed: 14, runSpeed: 36, radius: 1.0, camDistance: 14, camHeight: 7, turnSpeed: 1.8 },
};

export const LAYOUT_URL = 'data/WorldLayout.json';
