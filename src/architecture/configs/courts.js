import { cfg } from './defaults.js';
import { libraryPortico, buvetteFront } from '../generators/details.js';

export const NW_COURT = cfg('NW_COURT', {
  floors: 3, wallMat: 'wallPink',
  facades: [
    { match: { face: 'court' }, ground: 'arcade', upper: 'loggia', arcadeDepth: 2.8, loggiaDepth: 2.4 },
    { match: {}, ground: 'archwin', upper: 'archwin' },
  ],
  doors: [{ side: 'W', face: 'outer', at: 0.5, steps: 6, width: 3.8, arch: true, portal: true, canopy: false }],
  provenance: {
    facade: 'verified (field photos "NW court bldg"): pink-beige walls, green-framed windows, central brick portal with a large round arch and a name plaque; arcaded two-storey loggias with brick balustrades around the inner court (seen through the iron gate)',
    footprint: 'verified (satellite): building ring around a dark inner court', floors: 'inferred: two storeys as the neighbouring wings',
    arcade: 'assumed: cloister gallery around the inner court (typical for courtyard buildings; not visible in the references)',
    passage: 'assumed: court entrance not visible (layout passage PS_NW_COURT)', roof: 'verified: turquoise elements at the court corners (model)',
  },
  notes: 'Courtyard building at the north-west, identity unknown.',
});
export const NE_COURT = cfg('NE_COURT', {
  floors: 2, wallMat: 'wallCream', canopyTop: 'concrete', arcadeFloor: 'floorChecker',
  facades: [
    // field photos "NE court bldg": cream walls, brick pillars and arches, roller-shutter kiosk windows in the recessed gallery, arched windows above
    // v0.7c: the face towards Block B (west) is a plain wall with the library porch (photos "porte de bibliothèque 1/2")
    { match: { side: ['W'] }, ground: 'windows', upper: 'archwin', pilasters: 'brick', plinthMat: 'brick', plinthH: 0.7, winW: 1.2, winH: 1.5 },
    { match: { side: ['S', 'E'], minLen: 20 }, ground: 'arcade', upper: 'archwin', pillarMat: 'brick', beamBand: 'brick', arcadeDepth: 3.0, arcadeBay: 4.2, backType: 'shutter', backBay: 3.4, pilasters: 'brick' },
    { match: {}, ground: 'archwin', upper: 'archwin', pilasters: 'brick', plinthMat: 'brick' },
  ],
  // v0.7d: two doors, at the two ends of the face towards Block B
  doors: [-0.5075, -0.350].map((z, i) => ({ nu: [0.5848, z], steps: 2, width: 2.4, height: 2.7, canopy: false, fill: 'frameGreen', enter: 'library', slot: i, markerY: 2.45, markerScale: 0.7 })),   // v0.8: both porch doors lead to the library
  prepare: (ctx, edges, shared) => { for (const z of [-0.5075, -0.350]) libraryPortico(ctx, edges, shared, { nu: [0.5848, z] }); },
  provenance: { footprint: 'verified (satellite)', floors: 'verified (field photos): two storeys', facade: 'verified (field photos): cream walls, brick pillars/piers, arcade with kiosk shutters, concrete portal canopy over a dark glazed door', roof: 'verified: green-tile pyramid roof on a raised drum (satellite, matches the tiles in the field photos)' },
  notes: 'Courtyard building at the north-east with a green-tile pyramid roof. Its exterior is also the model for the Buvette.',
});
export const SE_COMPLEX = cfg('SE_COMPLEX', {
  floors: 3,
  facades: [
    { match: { face: 'court' }, ground: 'arcade', upper: 'loggia', arcadeDepth: 3.0, loggiaDepth: 2.4 },
    { match: { face: 'outer', side: ['S', 'W'], minLen: 24 }, ground: 'arcade', upper: 'archwin', arcadeDepth: 3.0 },
    { match: {}, ground: 'archwin', upper: 'archwin' },
  ],
  doors: [{ side: 'E', face: 'outer', at: 0.5, steps: 2 }],
  provenance: {
    footprint: 'verified (satellite): ring around a green court, larger than in the model (D4)',
    floors: 'inferred: two storeys', arcade: 'inferred: the model shows a recessed white ground floor with posts under a projecting roof on the south and west sides; court cloister assumed',
    passage: 'assumed: court entrance not visible (layout passage PS_SE_COURT)', roof: 'verified: PV arrays on the east part (satellite), turquoise corner tiles (model)',
  },
  notes: 'South-east courtyard complex. Block A label ambiguity: see layout notes.',
});
const carProv = { footprint: 'verified (satellite): long white ribbed roof beside the north boulevard', structure: 'verified (field photos "Boulevard entre white halls"): rows of white tensile umbrella shades on steel posts over parking bays, open on all sides; bay size and cars assumed' };
export const HALL_W = cfg('HALL_W', { generator: 'carport', eaveH: 2.7, ridgeH: 1.1, provenance: carProv, notes: 'Carports beside the north boulevard ("white hall").' });
export const HALL_E = cfg('HALL_E', { generator: 'carport', eaveH: 2.7, ridgeH: 1.1, provenance: carProv, notes: 'Carports beside the north boulevard ("white hall").' });

export const BUVETTE = cfg('BUVETTE', {
  floors: 1, groundH: 4.2, wallMat: 'wallCream', turrets: false, cornerTiles: false, roofStyle: 'flat', roofMat: 'concrete', parapet: 0.5, frameMat: 'frameDark',
  facades: [
    { match: { side: ['N'] }, ground: 'blank', plinth: false, coping: 'trim' },   // v0.7e: face towards the copy centre built by buvetteFront
    // field photo "Buvette": long single-storey building, beige render, wide glazed shop-front windows each framed in brick, tan brick-tile base, shallow metal roof
    { match: { side: ['E'] }, ground: 'shop', upper: 'windows', bay: 6.2, brickFrame: true, plinthMat: 'brick', plinthH: 0.95, coping: 'trim' },
    { match: {}, ground: 'windows', plinthMat: 'brick', plinthH: 0.95 },
  ],
  prepare: (ctx, edges, shared) => { buvetteFront(ctx, edges, shared); },
  doors: [],   // v0.9: the enter marker is added by buvetteFront (no door geometry)
  provenance: {
    footprint: 'inferred: footprint of the satellite-only building across the west road at the former Bibliothèque latitude',
    facade: 'verified (user photo of the real Buvette, 2026-11-20): beige render, large brick-framed glazed windows, brick-tile base, concrete entrance steps on the left, grey shed roof',
    interior: 'verified (user photo): pool table, tables and black chairs, service counter with racks and TV, suspended ceiling, light tiled floor; dimensions assumed',
    roof: 'verified (user photo): low grey metal roof',
  },
  notes: 'Buvette (cafeteria) across the boulevard, replacing the removed Bibliothèque. Not enterable (v0.6).',
});

export const BUVETTE_PROFS = cfg('BUVETTE_PROFS', {
  floors: 1, groundH: 3.6, wallMat: 'wall', turrets: false, cornerTiles: false, roofStyle: 'flat', roofMat: 'concrete', parapet: 0.55, frameMat: 'frameDark',
  facades: [
    // photo "buvette profs": low white building, glazed double door between two shuttered windows, flat roof
    { match: { side: ['S'] }, ground: 'shutter', bay: 3.6, plinth: false, coping: 'trim' },
    { match: { side: ['N', 'E'] }, ground: 'blank', plinth: false, coping: 'trim' },   // v0.7e: sides glued to Block D / Administration
    { match: {}, ground: 'windows', plinth: false, coping: 'trim' },
  ],
  doors: [{ side: 'S', at: 0.5, width: 2.4, height: 2.5, steps: 2, canopy: false }],
  provenance: { footprint: 'inferred: empty space between IT Learning Campus, Administration and Block D', facade: 'verified (user photo "buvette profs")' },
  notes: 'Staff cafeteria (v0.7c).',
});
const hallProv = { footprint: 'inferred (user photo "boulevard buvette")', structure: 'white tensile carports on both sides of the boulevard' };
export const HALL_BW = cfg('HALL_BW', { generator: 'carport', axis: 'z', eaveH: 2.7, ridgeH: 1.1, provenance: hallProv, notes: 'White hall west of the boulevard to the Buvette.' });
export const HALL_BE = cfg('HALL_BE', { generator: 'carport', axis: 'z', eaveH: 2.7, ridgeH: 1.1, provenance: hallProv, notes: 'White hall east of the boulevard to the Buvette.' });
export const GATE_BOOTH = cfg('GATE_BOOTH', {
  floors: 1, groundH: 3.2, wallMat: 'wallPink', turrets: false, cornerTiles: false, roofStyle: 'flat', roofMat: 'concrete', parapet: 0.3,
  facades: [{ match: {}, ground: 'windows', upper: 'windows', plinth: false, coping: 'trim' }],
  doors: [{ side: 'W', at: 0.5, steps: 1, width: 1.2 }],
  provenance: { footprint: 'inferred', facade: 'verified (user photo "entree principale"): pink guard building beside the gate' },
  notes: 'Guard booth beside the main gate.',
});
