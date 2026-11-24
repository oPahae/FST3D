import { cfg } from './defaults.js';

const prov = {
  walls: 'verified (field photo 1): golden-yellow walls, three storeys with arched loggias on the garden side, green pyramid turret on the central block',
  footprint: 'provisional: satellite shows three small roofs where the model shows a larger stepped cluster (discrepancy D3); gaps of 2-4 m were closed',
  floors: 'inferred: the model shows building 4 standing higher than 3 and 5, and a long two-storey front facing the garden',
  facade: 'inferred: long mostly blank white garden front with narrow tall slit windows; arched openings at the central loggia (model oblique photo)',
  roof: 'verified: flat roofs with a turquoise feature on the central entrance (model); stepped heights inferred',
};
prov.color = 'verified (field photo "Building 4 inner court"): peach-orange walls, brick pylons around a three-arch portal, checkerboard forecourt';
const garden = { match: { face: 'garden' }, ground: 'archwin', upper: 'loggia', loggiaDepth: 2.6 };   // the ground-floor gallery is the continuous cloister ring (features.js)
const outer = { match: {}, ground: 'archwin', upper: 'archwin' };

export const N_NW = cfg('N_NW', { wallMat: 'wallSalmon', floors: 2, provenance: prov, facades: [garden, outer], doors: [{ side: 'N', at: 0.4 }], notes: 'West block of the north range.' });
export const N5 = cfg('N5', { wallMat: 'wallSalmon', floors: 2, provenance: prov, facades: [garden, outer], doors: [], notes: 'Building 5 (provisional identity).' });
export const N4 = cfg('N4', {
  wallMat: 'wallSalmon', floors: 3, provenance: prov,
  facades: [{ match: { face: 'court' }, ground: 'archwin', upper: 'archwin' }, { match: { face: 'garden' }, ground: 'archwin', upper: 'loggia', loggiaDepth: 2.8 }, outer],
  doors: [], notes: 'Building 4 (provisional identity): taller central block with an arched loggia and a walkable covered passage (with an inner court) on the garden axis.',
});
export const N3 = cfg('N3', { wallMat: 'wallSalmon', floors: 2, provenance: prov, facades: [garden, outer], doors: [], notes: 'Building 3 (provisional identity).' });
export const N_NE = cfg('N_NE', { wallMat: 'wallSalmon', floors: 2, provenance: prov, facades: [garden, outer], doors: [{ side: 'N', at: 0.6 }], notes: 'East block of the north range.' });
