import { cfg, defaults } from './defaults.js';

export const CENTRAL_PAV = cfg('CENTRAL_PAV', {
  floors: 1, groundH: 6.2, wallMat: 'wallSand', turrets: false, roofRise: 2.2, roofRun: 4.2, arcadeFloor: 'floorChevron',
  facades: [
    // v0.7: one continuous covered corridor all round the pavilion (open corners, no end walls)
    { match: { side: ['S', 'N'] }, ground: 'arcade', upper: 'archwin', arcadeDepth: 2.8, arcadeBay: 3.1, backType: 'blank', ring: true },
    // field photos "Central Pavilion": long gallery of tall square pillars, chevron floor, yellow walls with notice boards
    { match: { side: ['E', 'W'] }, ground: 'arcade', upper: 'archwin', arcadeDepth: 2.8, arcadeBay: 3.1, backType: 'blank', ring: true },
    { match: {}, ground: 'archwin', upper: 'archwin' },
  ],
  doors: [],
  platform: { h: 0.51, margin: 2.6, stepWidth: 6, stepsOn: ['N', 'S', 'E', 'W'] },
  provenance: {
    footprint: 'provisional: roof partly hidden by the map label in the satellite',
    gallery: 'verified (field photos "Central Pavilion"): square pillars, chevron tile floor, yellow walls',
    facade: 'verified (field photo 3, "Salle de conférences"): cream walls, front of tall round arches with recessed wall, round columns on the side, green hip roof, entrance step; arch count and sizes are assumed',
    platform: 'assumed: low stepped platform around the pavilion',
    roof: 'verified (field photos): green glazed-tile hip roof',
  },
  notes: 'Conference hall in the centre of the garden (photo 3).',
});

const amphiProv = {
  footprint: 'verified (satellite): free-standing block; identity provisional',
  floors: 'assumed: one tall lecture-hall volume',
  facade: 'verified (field photos "Amphi 2" / "Amphi 6"): cream walls, tall round-arched recesses framed by brick piers, small arched windows inside the recesses, brick entrance recess with a wooden door',
  roof: 'verified (field photos): green glazed-tile hip roof',
  surroundings: 'verified (field photos): hedge-lined paths, brick-faced arcades, checkerboard plaza with green lamp (Amphi 2); mini football pitch behind a fence (Amphi 6)',
};
const amphiFacades = [{ match: {}, ground: 'archarcade', upper: 'archwin', arcadeDepth: 0.6, arcadeBay: 5.0, opening: 3.3, spring: 1.1, backType: 'archwin', backBay: 4.0, brickPiers: true, plinthMat: 'brick' }];
export const AMPHI_6 = cfg('AMPHI_6', {
  wallMat: 'wallCream', floors: 1, groundH: 7.4, turrets: false, roofRise: 2.0,
  facades: amphiFacades,
  doors: [{ nu: [-0.6515, 0.2906], steps: 3, width: 2.8, arch: true, portal: true, canopy: false }, { side: 'S', at: 0.3, steps: 2 }],   // v0.7e: east door at the north end of the face
  provenance: amphiProv, notes: 'Amphi 6 (provisional identity).',
});
export const AMPHI_2 = cfg('AMPHI_2', {
  wallMat: 'wallCream', floors: 1, groundH: 7.4, turrets: false, roofRise: 2.0,
  facades: amphiFacades,
  doors: [{ nu: [0.6424, 0.215], steps: 3, width: 2.8, arch: true, portal: true, canopy: false }, { side: 'S', at: 0.7, steps: 2 }],   // v0.7: the west door is at the north corner, not in the middle
  provenance: amphiProv, notes: 'Amphi 2 (provisional identity).',
});
