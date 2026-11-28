import { niche } from '../generators/details.js';
import { cfg, wingFacades } from './defaults.js';

const wingProv = {
  color: 'verified (field photos "Passages dans les blocks", "East connector patio"): salmon / peach walls with square pillars of the same colour; the earlier ochre came from the first model photos',
  footprint: 'verified (satellite, traced from zoomed crops)',
  floors: 'verified (user list v0.6): Blocks A-D have three storeys',
  facade: 'verified (field photos): ochre walls, arched windows with green frames; bay width and window sizes are assumed',
  arcade: 'verified (field photo of Block D): pillared gallery at ground level and arched loggias with brick-red balustrades on the upper floor, garden side; depths are assumed',
  roof: 'verified (field photos): green glazed-tile hip roof with pyramid-roofed turrets at stepped corners; the model photos show these as turquoise squares',
  doors: 'assumed: entrance positions are not visible',
};

export const BLK_A = cfg('BLK_A', {
  floors: 3, wallMat: 'wallSalmon', provenance: wingProv,
  facades: wingFacades(),
  doors: [{ side: 'E', face: 'outer', at: 0.3, steps: 3, arch: false }],
  notes: 'East wing, south half. The label "Block A" may instead belong to the SE courtyard complex (see discrepancy notes).',
});
export const BLK_B = cfg('BLK_B', {
  floors: 3, wallMat: 'wallSalmon', provenance: wingProv,
  facades: wingFacades(),
  doors: [{ nu: [0.4939, -0.4288], steps: 2 }],
  // v0.7c: two recessed entrances (5 m wide, 3 m deep) in the garden-side corridor, each with a window and a green door at the back and green doors on the side walls
  // v0.7d: end of the corridor - niche - niche - East connector patio are equally spaced (second niche is on the connector wing)
  prepare: (ctx, edges, shared) => ({ cuts: (niche(ctx, edges, shared, { nu: [0.3879, -0.2989], w: 5, d: 3, face: 'garden' }) || {}).cuts || [] }),
  notes: 'East wing, north half.',
});
export const BLK_C = cfg('BLK_C', {
  floors: 3, wallMat: 'wallSalmon', provenance: wingProv,
  facades: wingFacades(),
  doors: [],
  notes: 'West wing, north half; its west wall is shared with the NW court building.',
});
export const BLK_D = cfg('BLK_D', {
  floors: 3, wallMat: 'wallSalmon', provenance: wingProv,
  facades: wingFacades(),
  doors: [{ side: 'W', face: 'outer', at: 0.35, steps: 3 }],
  notes: 'West wing, south half, ending in a block that meets the Administration front.',
});

const connProv = { ...wingProv, passage: 'inferred: a paved path meets each connector on both sides (satellite) and the model shows a path crossing the wing here' };
export const WING_W_MID = cfg('WING_W_MID', {
  floors: 3, wallMat: 'wallSalmon', provenance: connProv, facades: wingFacades(), doors: [],
  notes: 'Stepped connector between C and D. Contains a walkable east-west passage between the west outside and the garden.',
});
export const WING_E_MID = cfg('WING_E_MID', {
  floors: 3, wallMat: 'wallSalmon', provenance: connProv, facades: wingFacades(), doors: [],
  prepare: (ctx, edges, shared) => ({ cuts: (niche(ctx, edges, shared, { nu: [0.3879, -0.1509], w: 5, d: 3, face: 'garden', label: 'D04', enter: 'd04' }) || {}).cuts || [] }),
  notes: 'Stepped connector between B and A. Contains a walkable east-west passage between the garden and the east plaza.',
});
