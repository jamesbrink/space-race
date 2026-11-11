import type { SiteDef } from '../../../../src/types';

/**
 * Launch Complex 5 on the Earth: the origin of the pad model's frame (the launcher's centre on
 * the hardstand) and which way that frame lies. See lc-5.md, "The site's frame". The viewer's
 * compass (viewer/cape.ts: COMPASS) and the sky over the pad (src/world) both come from here.
 */
export const LC5: SiteDef = {
  name: 'Cape Canaveral, Launch Complex 5',
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
  bearingX: {
    value: 295,
    confidence: 'estimated',
    source:
      'the hatch side is square to the rails, which run 025/205 degrees true (OpenStreetMap, within 1 degree); which of the ' +
      'two sides it was is read from TM X-53107 Figure 7-6 and liftoff photograph 6100884 (lc-5.md)',
  },
};
