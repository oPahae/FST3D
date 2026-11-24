import { cfg } from './defaults.js';
import * as wings from './wings.js';
import * as admin from './administration.js';
import * as north from './northRange.js';
import * as flank from './flanking.js';
import * as courts from './courts.js';
import * as sat from './satelliteOnly.js';

/** id -> architecture config. Each building has its own entry; unknown ids fall back to a generic block (flagged). */
export const CONFIGS = Object.fromEntries(
  [wings, admin, north, flank, courts, sat].flatMap((m) => Object.values(m).filter((v) => v && v.id).map((v) => [v.id, v]))
);

export function configFor(id) {
  return CONFIGS[id] || cfg(id, { provenance: { footprint: 'layout', floors: 'assumed (no config yet)' }, notes: 'Generic fallback: add a config in src/architecture/configs.' });
}
