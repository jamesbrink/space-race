import type { SiteDef } from '../../../../src/types.ts';
import { CAPE_CANAVERAL } from './place.ts';

export const LC34_FT = 0.3048;
export const LC34_MOUNT = 27 * LC34_FT;
export const LC34_MODEL = 'models/usa/places/cape-canaveral/lc34/1968-10.glb';
export const LC34_KIT = 'NASA Apollo 7 press kit (68-168K), pp. 41–44';
const PLAN = 'LC-34 master plan, Moonport (NASA SP-4204), chapter 2';
const POSITION = 'Approximate WGS 84 centre of the surviving pedestal in the Cape Canaveral imagery survey (scenery.ts)';
const HISTORICAL_POSITION =
  'The AS-205/CSM-101 Postflight Trajectory report, §2.0, gives 28.521963° N and 80.561141° W on the Fischer 1960 ellipsoid';

export const LC34: SiteDef = {
  name: 'Cape Kennedy, Launch Complex 34',
  place: CAPE_CANAVERAL,
  latitude: { value: 28.521839, confidence: 'estimated', source: `${POSITION}. ${HISTORICAL_POSITION}` },
  longitude: { value: -80.561182, confidence: 'estimated', source: `${POSITION}. ${HISTORICAL_POSITION}` },
  height: {
    value: -29 + 16 * LC34_FT + LC34_MOUNT,
    confidence: 'estimated',
    source:
      'EGM96 at the Cape (−29 m), the apron’s 16 ft above sea level, and the 27 ft pedestal above the apron (Apollo 7 press kit, p. 42)',
  },
  grade: {
    value: -LC34_MOUNT - 0.12,
    confidence: 'estimated',
    source:
      'The 27 ft pedestal is documented (Apollo 7 press kit, p. 42). Adjacent terrain is taken 0.12 m below apron top to match the LC-34 build.',
  },
  bearingX: { value: 42, confidence: 'derived', source: `Northeast along the service structure rails, read from imagery and ${PLAN}` },
  seaLevel: { value: -29, confidence: 'estimated', source: 'EGM96 geoid at the Cape, rounded to a metre' },
  zone: { name: 'EDT', utcOffset: -4 },
};
