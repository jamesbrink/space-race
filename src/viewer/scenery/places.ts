import { CAPE_GROUND } from '../../../missions/usa/places/cape-canaveral/ground.ts';
import { TYURATAM_GROUND } from '../../../missions/ussr/places/tyuratam/ground.ts';
import type { GroundSpec } from './ground.ts';

/** Each place's ground, by the place's name (PlaceDef.name): the module beside its place.ts. A new place is a line here. */
export const GROUNDS: Record<string, GroundSpec> = {
  'cape-canaveral': CAPE_GROUND,
  tyuratam: TYURATAM_GROUND,
};
