import { cfg } from './defaults.js';

const prov = {
  footprint: 'verified (satellite): teal-roofed central pavilion flanked by four roof bars',
  floors: 'inferred: the model shows the central pavilion rising above the bars; floor counts are assumed',
  facade: 'inferred: window rhythm assumed; arched openings follow the entrance porch seen in the model',
  roof: 'verified (field photos): green-tile hip roofs and pyramid turrets; the model shows turquoise elements on the pavilion roof',
  passage: 'inferred from the axial plan (layout passages PS_ADM_S / PS_ADM_N); inner court assumed',
  color: 'verified (field photos "Administration inner court"): salmon walls, square pillars, black/cream chevron floors, checkerboard court, green hip roofs with turrets',
  portico: 'assumed: colonnaded front on the forecourt side (the model shows a projecting entrance porch)',
};

export const ADMIN_C = cfg('ADMIN_C', {
  floors: 3, groundH: 4.6, arcadeFloor: 'floorChevron', wallMat: 'wallSalmon', provenance: prov,
  facades: [
    { match: { face: 'court' }, ground: 'archwin', upper: 'archwin' },
    { match: { face: 'garden' }, ground: 'archwin', upper: 'loggia', loggiaDepth: 2.8 },
    { match: { side: ['S'], minLen: 12 }, ground: 'arcade', upper: 'archwin', arcadeDepth: 3.4, arcadeBay: 4.4, backType: 'archwin', backBay: 3.6 },
    { match: {}, ground: 'archwin', upper: 'archwin' },
  ],
  doors: [],
  notes: 'Entrance pavilion on the main axis with a walkable arched passage between the forecourt and the central garden.',
});
export const ADMIN_W1 = cfg('ADMIN_W1', { floors: 2, wallMat: 'wallSalmon', provenance: prov, facades: [{ match: {}, ground: 'archwin', upper: 'archwin' }], doors: [], notes: 'North-west bar of the Administration front.' });
export const ADMIN_E1 = cfg('ADMIN_E1', { floors: 2, wallMat: 'wallSalmon', provenance: prov, facades: [{ match: {}, ground: 'archwin', upper: 'archwin' }], doors: [], notes: 'North-east bar of the Administration front.' });
export const ADMIN_W2 = cfg('ADMIN_W2', {
  floors: 2, arcadeFloor: 'floorChevron', wallMat: 'wallSalmon', provenance: { ...prov, arcade: 'inferred: covered walkway along the south front (white posts under projecting roof in the model photo)' },
  facades: [{ match: { side: ['S'], minLen: 20 }, ground: 'arcade', upper: 'archwin', arcadeDepth: 3.0 }, { match: {}, ground: 'archwin', upper: 'archwin' }],
  doors: [], notes: 'South-west bar with a covered walkway along the forecourt side.',
});
export const ADMIN_E2 = cfg('ADMIN_E2', {
  floors: 2, arcadeFloor: 'floorChevron', wallMat: 'wallSalmon', provenance: { ...prov, arcade: 'inferred: covered walkway along the south front (white posts under projecting roof in the model photo)' },
  facades: [{ match: { side: ['S'], minLen: 20 }, ground: 'arcade', upper: 'archwin', arcadeDepth: 3.0 }, { match: {}, ground: 'archwin', upper: 'archwin' }],
  doors: [], notes: 'South-east bar with a covered walkway along the forecourt side.',
});
