import { cfg } from './defaults.js';
import { spiralStair } from '../generators/decor.js';
import { pvFront, pvExit, copyFront } from '../generators/details.js';
const satCfg = (id, over) => cfg(id, { wallMat: 'wall', roofStyle: 'flat', frameMat: 'frame', ...over });

const sat = (extra = {}) => ({ footprint: 'verified (satellite only, not in the model)', floors: 'assumed', facade: 'assumed', roof: 'verified: flat roof seen in the satellite', ...extra });
const std = [{ match: {}, ground: 'windows', upper: 'windows', coping: 'trim' }];

export const S1 = satCfg('S1', { floors: 2, roofMat: 'concrete', facades: std, doors: [{ nu: [-0.0728, 0.86], steps: 2 }], provenance: sat({ roof: 'verified: grey flat roof with rooftop vents' }), notes: 'South building S1.' });
export const S2 = satCfg('S2', { floors: 2, roofMat: 'concrete', facades: std, doors: [{ nu: [0.106, 0.86], steps: 2 }], provenance: sat({ roof: 'verified: grey flat roof with rooftop vents' }), notes: 'South building S2.' });
export const S3 = satCfg('S3', { floors: 3, roofMat: 'concrete', facades: std, doors: [{ nu: [0.0908, 1.06], steps: 1, width: 2.6 }], provenance: sat({ roof: 'verified: grey flat roof with rooftop vents' }), notes: 'South building S3, on the entrance axis.' });
export const IT_LEARN = satCfg('IT_LEARN', {
  floors: 2, wallMat: 'wallPeach', roofStyle: 'hip', roofTile: 'tileTeal', frameMat: 'frameGreen', turrets: false, arcadeFloor: 'floorChecker',
  facades: [
    // field photos "IT Learning campus": two-storey arcaded cloister round a lawn court, brick-red balustrades, blue-green tile roof
    { match: { face: 'court' }, ground: 'arcade', upper: 'loggia', arcadeDepth: 3.0, loggiaDepth: 2.6, backType: 'archwin', loggiaBack: 'archwin' },
    { match: {}, ground: 'archwin', upper: 'archwin' },
  ],
  doors: [{ side: 'S', at: 0.5, steps: 3, width: 2.8 }],
  provenance: sat({ facade: 'verified (field photos): peach walls, arcaded loggias with brick balustrades facing the court, wrought-iron gate', roof: 'verified (field photos): blue-green glazed-tile hip roof (the satellite shows blue-grey)', floors: 'verified (field photos): two storeys' }),
  notes: 'IT Learning Campus building (U-shaped, open to the north). Web sources say it has been part of FST Settat since 2005.',
});
const redClad = (id, floors, note, over = {}) => satCfg(id, {
  floors, groundH: 4.2, floorH: 3.4, wallMat: 'wallRed', roofMat: 'roofTerracotta',
  facades: [{ match: {}, ground: 'clad', groundMat: 'wallWhiteClad', upper: 'ribbon', bay: 3.0, plinthMat: 'brick', plinthH: 0.9, screens: true, stringMat: 'wallWhiteClad', stringH: 0.4, stringOut: 0.35, coping: 'trim' }],
  doors: [{ side: 'E', at: 0.5, steps: 2, width: 2.8, canopyTop: 'concrete' }],
  canopyTop: 'concrete',
  provenance: sat({ facade: 'verified (field photos "PV bldg"): terracotta-red cladding panels, white horizontal bands, ribbon windows, white geometric (mashrabiya) screens and a brick plinth at ground level', floors: 'inferred from the photos (three to four storeys)', roof: 'verified: terracotta roof with PV panels (satellite)' }),
  notes: note, ...over });
export const ORANGE_BLDG = redClad('ORANGE_BLDG', 3, 'Terracotta-clad building with PV panels (field photos "PV bldg"); attached to the PV block; spiral steel stair on its east side beside the white building and the passage.', {
  doors: [],
  extra: (shared, bld, poly) => { let x1 = -Infinity, z0 = Infinity; for (const [x, z] of poly.outer) { x1 = Math.max(x1, x); z0 = Math.min(z0, z); } spiralStair(shared, -0.2213 * 150 - 3.6, z0 + 4.4, { h: 8.6 }); },   // v0.7c: on the S1 side of the alley
  prepare: (ctx, edges, shared) => { pvFront(ctx, edges, shared); pvExit(ctx, edges, shared); },
});
export const PV_BLDG = redClad('PV_BLDG', 4, 'Terracotta-clad building with a rooftop PV array (field photos "PV bldg"); spiral steel stair on the west side.', {
  
});
export const SW_CLUSTER = satCfg('SW_CLUSTER', { floors: 2, roofMat: 'concrete', facades: std, doors: [{ side: 'N', at: 0.5, steps: 2 }], provenance: sat(), notes: 'Buildings at the south-west edge.' });
export const E_SMALL1 = satCfg('E_SMALL1', { floors: 1, groundH: 3.6, roofMat: 'concrete', facades: std, doors: [{ side: 'W', at: 0.5, steps: 1 }], provenance: sat(), notes: 'Small east building.' });
export const E_SMALL2 = satCfg('E_SMALL2', { floors: 1, groundH: 3.6, roofMat: 'roofBlue', facades: std, doors: [{ side: 'W', at: 0.5, steps: 1 }], provenance: sat({ roof: 'verified: purple-grey roof' }), notes: 'Small east building.' });
export const E_SMALL3 = satCfg('E_SMALL3', { floors: 1, groundH: 3.8, roofMat: 'concrete', facades: std, doors: [{ side: 'W', at: 0.5, steps: 1 }], provenance: sat(), notes: 'Small building east of the service roads.' });
export const E_WHITE = satCfg('E_WHITE', { floors: 1, groundH: 3.2, roofMat: 'roofWhite', facades: std, doors: [], provenance: sat({ roof: 'verified: bright white surface; roof or paving unknown' }), notes: 'White rectangle at the east edge; treated as a low building (assumption).' });
export const E_PV = satCfg('E_PV', { floors: 1, groundH: 3.4, roofMat: 'concrete', facades: std, doors: [], provenance: sat({ roof: 'verified: PV panel array' }), notes: 'Structure carrying PV panels.' });
export const SB1 = satCfg('SB1', { floors: 1, groundH: 3.8, roofMat: 'concrete', facades: std, doors: [{ side: 'N', at: 0.5, steps: 1 }], provenance: sat(), notes: 'Building south of the south road.' });
export const SB2 = satCfg('SB2', { floors: 1, groundH: 3.8, roofMat: 'concrete', facades: std, doors: [{ side: 'N', at: 0.5, steps: 1 }], provenance: sat(), notes: 'Building south of the south road.' });
export const SB3 = satCfg('SB3', { floors: 1, groundH: 3.6, roofMat: 'roofTerracotta', facades: std, doors: [{ side: 'N', at: 0.5, steps: 1 }], provenance: sat({ roof: 'verified: terracotta roof' }), notes: 'Building south of the south road.' });
export const W_STRIP = cfg('W_STRIP', { generator: 'greenhouse', eaveH: 3.0, ridgeH: 2.4, provenance: { footprint: 'verified (satellite)', structure: 'verified (field photo "Boulevard entre NW court bldg et IT Learning campus"): glass gable greenhouse' }, notes: 'Greenhouse beside the west road.' });
export const W_ACR1 = satCfg('W_ACR1', {
  floors: 1, groundH: 3.4, wallMat: 'wall', roofMat: 'concrete', parapet: 0.45, cornerTiles: false, frameMat: 'frameDark',
  facades: [{ match: { side: ['E'] }, ground: 'blank', plinth: false, coping: 'trim' }, { match: {}, ground: 'windows', upper: 'windows', plinth: false, coping: 'trim' }],
  // v0.7c "centre de copie": green barred door facing the Buvette (south); v0.7e: boulevard (east) face = 3-arch loggia of the photo
  doors: [{ side: 'S', at: 0.5, width: 1.9, height: 2.3, steps: 1, canopy: false, fill: 'frameGreen', bars: true }],
  prepare: (ctx, edges, shared) => { copyFront(ctx, edges, shared); },
  provenance: sat({ facade: 'user list v0.7c' }), notes: 'Copy centre (white), north of the Buvette.',
});

export const IT_ENTRANCE = satCfg('IT_ENTRANCE', {
  floors: 2, wallMat: 'wallPeach', roofStyle: 'hip', roofTile: 'tileTeal', frameMat: 'frameGreen', turrets: false,
  facades: [{ match: {}, ground: 'archwin', upper: 'archwin', pilasters: 'brick', plinthMat: 'brick' }],
  doors: [],
  provenance: sat({ facade: 'verified (user photo "Entree de IT Learning Campus"): peach walls, green frames, central arched passage', footprint: 'inferred: closes the north side of the U-shaped IT Learning building', floors: 'inferred', roof: 'verified: blue-green glazed-tile hip roof as the rest of the building' }),
  notes: 'Entrance block of the IT Learning Campus with an arched walkway to the inner court (v0.6).',
});

// v0.7e: Cité universitaire - 3-storey housing blocks behind the western boundary wall (not accessible)
const citeCfg = (id) => satCfg(id, {
  floors: 3, groundH: 3.2, floorH: 3.0, wallMat: 'wallSand', turrets: false, cornerTiles: false, roofStyle: 'flat', roofMat: 'concrete', parapet: 0.5,
  facades: [{ match: {}, ground: 'windows', upper: 'windows', plinth: false, coping: 'trim' }],
  doors: [],
  provenance: { footprint: 'inferred (user description: 3-storey houses behind the wall = Cité universitaire)', facade: 'assumed' },
  notes: 'Cité universitaire, not accessible.',
});
export const CITE_1 = citeCfg('CITE_1'); export const CITE_2 = citeCfg('CITE_2'); export const CITE_3 = citeCfg('CITE_3');
export const CITE_4 = citeCfg('CITE_4'); export const CITE_5 = citeCfg('CITE_5'); export const CITE_6 = citeCfg('CITE_6');
