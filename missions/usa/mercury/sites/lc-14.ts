import type { SiteDef } from '../../../../src/types';

/**
 * Launch Complex 14 on the Earth: where the four orbital Mercury flights left from. The origin is the middle of
 * the launch stand, at the deck the Atlas's launcher stood on; the site's own model is not built yet (the complex
 * is drawn as scenery from Complex 5: sites/cape.md, src/viewer/cape1961.ts), so nothing stands on this frame so far
 * and only the sky over it is used. When it is built its record goes in lc-14.md.
 */
export const LC14: SiteDef = {
  name: 'Cape Canaveral, Launch Complex 14',
  latitude: {
    value: 28.491115,
    confidence: 'documented',
    source:
      'OpenStreetMap way 195727091, "Cape Canaveral Launch Complex 14": the middle of the launch stand as it stands today, traced from ' +
      'imagery (a few metres). Wikipedia gives 28.4911 N for the complex. The same point places it as scenery in src/viewer/cape1961.ts. ' +
      'No surveyed coordinate has been read',
  },
  longitude: {
    value: -80.546898,
    confidence: 'documented',
    source: 'OpenStreetMap way 195727091, as the latitude; Wikipedia gives 80.5469 W',
  },
  height: {
    value: -20,
    confidence: 'estimated',
    source:
      'the stand’s deck: the ramp to it rises 22 ft (6.7 m; Cape Canaveral Space Force Museum, Launch Complex 14) from ground taken as ' +
      'about 2 m above mean sea level, as at Complex 5, and mean sea level at the Cape is about 29 m below the WGS 84 ellipsoid ' +
      '(EGM96, to the nearest metre). The ground’s own height there has not been read. It moves the Sun by nothing that can be measured',
  },
  // Eastern Standard Time: Florida kept no daylight time in February 1962, and the reports of the flights give their times in EST
  zone: { name: 'EST', utcOffset: -5 },
  seaLevel: {
    value: -29,
    confidence: 'estimated',
    source: 'the EGM96 geoid at the Cape, read to the nearest metre: the figure Complex 5’s record uses',
  },
  bearingX: {
    value: 60,
    confidence: 'derived',
    source:
      'the side the capsule’s hatch faced on the stand. "The launch pad is oriented so that the pitch axis of the launch vehicle is alined ' +
      'on an azimuth of 105 degrees" (Results of the First United States Manned Orbital Space Flight, p. 46); the Atlas’s pitch axis is the ' +
      'one its pods and booster engines lie on (NASA SP-45, Figures 5-4 and 5-10); the capsule’s window stood over the long pod and its ' +
      'hatch 45 degrees round from the window (photographs of MA-6 on the stand: vehicles/atlas-lv3b.md, "Which way round"). That puts the ' +
      'hatch on 60 or on 240 degrees; a photograph with the service structure rolled back along the ramp (which runs to 194.5 degrees: ' +
      'OpenStreetMap ways 195727091 and 1264624135) at the left has the hatch toward a camera on the stand’s east side, so 60. Each step but ' +
      'the first is read off photographs: good to perhaps 15 degrees, and to be settled from the complex’s drawings when it is built',
  },
  // (no `region` yet: the country round the Cape is baked for Complex 5's flights, and an orbital flight's is the whole globe)
};
