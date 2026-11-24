// Provenance vocabulary used in every config:
//   verified  - directly visible in the satellite image or the model photos
//   inferred  - strongly suggested by the references (plan symmetry, paths, shadows) but not directly visible
//   assumed   - plausible provisional design with no direct evidence; replace when a better reference exists
// Heights/floors are NEVER measured: floor counts are read from the model photos or assumed, and the metre scale itself is assumed.

export const defaults = {
  generator: 'block',
  floors: 2,
  groundH: 3.9,
  floorH: 3.5,
  wallMat: 'wallOcher',
  roofMat: 'roof',
  roofStyle: 'hip',        // green glazed-tile hip roof (photos); outside_model buildings use 'flat'
  frameMat: 'frameGreen',
  parapet: 0.9,
  cornerTiles: true,
  facades: [{ match: {}, ground: 'archwin', upper: 'archwin', coping: 'trim' }],
  provenance: {},
  notes: '',
};

export const cfg = (id, over) => ({ ...defaults, id, ...over });

/** Wing facades (photos 1-2): pillared gallery at ground level and arched loggias with brick balustrades above on the garden side; arched windows elsewhere. */
export const wingFacades = (extra = []) => [
  ...extra,
  { match: { face: 'garden' }, ground: 'archwin', upper: 'loggia', loggiaDepth: 2.6, loggiaBack: 'archwin' },
  { match: { face: 'court' }, ground: 'archwin', upper: 'archwin' },
  { match: {}, ground: 'archwin', upper: 'archwin' },
];
