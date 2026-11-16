import type { SiteDef } from '../../../../src/types.ts';
import { CAPE_CANAVERAL } from './place.ts';

/**
 * Launch Complex 5 on the Earth: the origin of the pad model's frame (the launcher's centre on
 * the hardstand) and which way that frame lies. See lc-5.md, "The site's frame". The viewer's
 * compass (missions/usa/places/cape-canaveral/ground.ts: COMPASS) and the sky over the pad (src/world) both come from here.
 */
export const LC5: SiteDef = {
  name: 'Cape Canaveral, Launch Complex 5',
  place: CAPE_CANAVERAL,
  latitude: {
    value: 28.439426,
    confidence: 'documented',
    source:
      'OpenStreetMap relation 16884747, the launcher at the middle of the hardstand, traced from imagery (a few metres); ' +
      'Wikipedia gives 28.43944 N for the complex. No surveyed coordinate was found: docs/sources.md, "Known, not yet read"',
  },
  longitude: {
    value: -80.573292,
    confidence: 'documented',
    source: 'OpenStreetMap relation 16884747, as the latitude; Wikipedia gives 80.57333 W',
  },
  height: {
    value: -27,
    confidence: 'estimated',
    source:
      'about 2 m above mean sea level (USGS GNIS feature 285392, "Launch Complex 5": 6 ft), and mean sea level at the Cape is ' +
      'about 29 m below the WGS 84 ellipsoid (EGM96 geoid, read to the nearest metre). It moves the Sun by nothing that can be measured',
  },
  // Eastern Standard Time: Florida kept no daylight time in 1961, and every report of the flight gives its times in EST
  zone: { name: 'EST', utcOffset: -5 },
  seaLevel: {
    value: -29,
    confidence: 'estimated',
    source: 'the EGM96 geoid at the Cape, read to the nearest metre: the same figure the height above stands on',
  },
  bearingX: {
    value: 295,
    confidence: 'estimated',
    source:
      'square to the rails, which run 025/205 degrees true (OpenStreetMap, within 1 degree), on the side the blockhouse and the ' +
      'cherry picker’s truck are (TM X-53107 Figure 7-6; liftoff photograph 6100884). It is not the way the capsule’s hatch faced: the ' +
      'vehicle stood turned to its azimuth on the launcher, the hatch 55 or 60 degrees round from here (lc-5.md, "Which way round the vehicle stood")',
  },
  grade: {
    value: -0.12,
    confidence: 'estimated',
    source:
      'the hardstand and the roads were laid at grade (the photographs of July 1961: lc-5.md, "The land"), so the sand is a hand’s ' +
      'breadth under the concrete: 12 cm is chosen, more than the 5 to 6 cm at which parallel faces seen from across the site ' +
      'flicker (docs/agents/rendering.md). lc5/site.py GROUND is the same in feet, and the neighbouring complexes are built on it: change them together',
  },
  // When the pad's floods were lit (viewer/lamps.ts `lampsLit`).
  lamps: {
    on: { value: 0, confidence: 'estimated', source: 'switched on at sunset: when is not recorded' },
    off: {
      value: 14,
      confidence: 'estimated',
      source:
        'MR-4’s count had the pad-area searchlights “secured” at T−30 (TM X-53107 8.3.2; This New Ocean, note 63 to MR-4), half an hour ' +
        'before a liftoff with the Sun 20.6 degrees up, so about 14 degrees; taken for every morning here',
    },
    warm: {
      value: 300,
      confidence: 'estimated',
      source:
        'what lamps they were is not recorded; taken as mercury-vapour floods, which take minutes to come to their light: the GE lamp ' +
        'catalogue of 1960 gives 7 minutes for its H25-DE, Westinghouse 5 for its H33-1-GL/W (as lamptech.co.uk quotes them)',
    },
  },
};
