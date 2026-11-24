// Architecture works in METRES. The layout is in NU; CONFIG.unitsPerNU converts (1 NU = 150 m, ASSUMED).
// !! The scale is not measured. It follows from the satellite zoom and the ~8 ha campus figure quoted by a
// third-party catalogue; treat every dimension as +/-30 %. Change CONFIG.unitsPerNU to rescale the world.
export const U = {
  floorH: 3.5,        // storey height
  groundH: 3.9,       // ground storey (a little taller)
  slab: 0.3,
  wallT: 0.4,
  parapet: 0.9,
  bay: 3.6,           // facade module
  winW: 1.5, winH: 1.5, sill: 0.95,
  doorW: 2.2, doorH: 2.6,
  passageH: 3.3,
  colR: 0.28,
  stepRise: 0.17, stepTread: 0.34,
  avatarH: 1.75, avatarR: 0.4,
};
