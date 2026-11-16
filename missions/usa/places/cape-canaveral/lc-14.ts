import type { SiteDef } from '../../../../src/types.ts';
import { CAPE_CANAVERAL } from './place.ts';

/**
 * Launch Complex 14 on the Earth: where the four orbital Mercury flights left from. The origin is the vehicle's axis at
 * the deck of the launch stand; the complex's model is built in this frame (places/cape-canaveral/lc_14.py, lc14/site.py).
 * Its record is lc-14.md.
 */
export const LC14: SiteDef = {
  name: 'Cape Canaveral, Launch Complex 14',
  place: CAPE_CANAVERAL,
  latitude: {
    value: 28.491152,
    confidence: 'derived',
    source:
      'the vehicle’s axis: 14 ft (estimated, 6 ft either way: lc-14.md, "Where the vehicle stood") along 015 degrees from the middle of ' +
      'the launch stand as it survives, 28.491115 N, 80.546898 W (OpenStreetMap way 195727091, traced from imagery to a few metres; ' +
      'Wikipedia gives 28.4911 N for the complex). The stand’s northern part was razed in 1976 (HAER FL-8-7, p. 21), so the middle of ' +
      'what survives is not where the launcher stood. No surveyed coordinate has been read',
  },
  longitude: {
    value: -80.546887,
    confidence: 'derived',
    source: 'as the latitude: OpenStreetMap way 195727091, and 14 ft along the stand’s axis; Wikipedia gives 80.5469 W',
  },
  height: {
    value: -20,
    confidence: 'estimated',
    source:
      'the stand’s deck: 22 ft (6.7 m; HAER FL-8-7, p. 20) over ground taken as about 2 m above mean sea level, as at Complex 5, and mean ' +
      'sea level at the Cape is about 29 m below the WGS 84 ellipsoid (EGM96, to the nearest metre). The ground’s own height there has ' +
      'not been read. It moves the Sun by nothing that can be measured',
  },
  grade: {
    value: -(22 * 0.3048 + 0.12),
    confidence: 'derived',
    source:
      'the deck stands 22 ft over the paving at its foot: the ramp "gradually increased to a height of 22\'" (HAER FL-8-7, p. 20: ' +
      'documented; the Cape Canaveral Space Force Museum gives 22 ft too, the NHL nomination (Item 7, p. 9) "a 20-foot ramp"), and the ' +
      'land is drawn 12 cm under that paving, as it is under the pads at Complex 5 (rendering.md, "Nothing lies close above the terrain")',
  },
  // Eastern Standard Time: Florida kept no daylight time in February 1962, and the reports of the flights give their times in EST
  zone: { name: 'EST', utcOffset: -5 },
  seaLevel: {
    value: -29,
    confidence: 'estimated',
    source: 'the EGM96 geoid at the Cape, read to the nearest metre: the figure Complex 5’s record uses',
  },
  bearingX: {
    value: 105,
    confidence: 'documented',
    source:
      'the frame’s +X lies on the vehicle’s pitch axis: "the launch pad is oriented so that the pitch axis of the launch vehicle is alined ' +
      'on an azimuth of 105 degrees" (Results of the First United States Manned Orbital Space Flight, p. 46). It is square to the stand ' +
      'and ramp’s long axis, 015/195 (OpenStreetMap ways 195727091 and 1264624135, to half a degree: derived), which is the frame’s ' +
      'other axis, and it is the line the transfer table’s tracks lie on (ways 1264975420 and 1264975421). Until November 2026 the ' +
      'frame’s +X was the side the capsule’s hatch faced, taken as 60 degrees: the hatch faced 240 (lc-14.md, "Which way the hatch ' +
      'faced"), and the vehicle now stands turned in this frame (lc-14.parts.ts `HATCH_TURN`)',
  },
  // (what stood on the complex, and where: lc-14.md)
};
