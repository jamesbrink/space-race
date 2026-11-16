import type { SiteDef } from '../../../../src/types.ts';
import { CAPE_CANAVERAL } from './place.ts';

/**
 * Launch Complex 14 on the Earth: where the four orbital Mercury flights left from. The origin is the middle of
 * the launch stand, at the deck the Atlas's launcher stood on; the site's own model is not built yet (the complex
 * is drawn as scenery from Complex 5: places/cape-canaveral/complexes.md, missions/usa/places/cape-canaveral/scenery.ts), so nothing stands on this frame so far
 * and only the sky over it, its grade and its bearing are used. Its record is lc-14.md.
 */
export const LC14: SiteDef = {
  name: 'Cape Canaveral, Launch Complex 14',
  place: CAPE_CANAVERAL,
  latitude: {
    value: 28.491115,
    confidence: 'documented',
    source:
      'OpenStreetMap way 195727091, "Cape Canaveral Launch Complex 14": the middle of the launch stand as it stands today, traced from ' +
      'imagery (a few metres). Wikipedia gives 28.4911 N for the complex. The same point places it as scenery in missions/usa/places/cape-canaveral/scenery.ts. ' +
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
  grade: {
    value: -22 * 0.3048,
    confidence: 'derived',
    source:
      'the deck stands 22 ft over the ground: the ramp "gradually increased to a height of 22\' over the northern six bays" and the stand ' +
      'is the bay north of them, its deck the ramp’s top (HAER FL-8-7, p. 20: documented; that the deck is at the ramp’s top is derived). ' +
      'The NHL nomination (Item 7, p. 9) rounds it to "a 20-foot ramp"; the Cape Canaveral Space Force Museum gives 22 ft',
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
    confidence: 'estimated',
    source:
      'the side the capsule’s hatch faced on the stand (lc-14.md, "The site\'s frame"). The line is documented and derived: "the pitch axis ' +
      'of the launch vehicle is alined on an azimuth of 105 degrees" (Results of the First United States Manned Orbital Space Flight, ' +
      'p. 46), square to the stand’s long axis on 015/195 (OpenStreetMap ways 195727091, 1264624135: derived); the pods lie on it ' +
      '(NASA SP-45, Figures 5-4 and 5-10: derived). The hatch’s place round it is estimated: the window over the long pod and the hatch ' +
      '45 degrees round from it (photographs of MA-6: vehicles/atlas-lv3b.md, "Which way round"), so 60 or 240. Which of the two the ' +
      'documents do not settle. 60 was read off a photograph, not named in the record, taken as having the service structure rolled ' +
      'back south along the ramp at the frame’s left; it parked east of the stand on a transfer table (HAER FL-8-7, p. 22), and read ' +
      'again with that, the same frame gives 60 if the camera stood between north-north-west and east of the stand and 240 if between ' +
      'west and north-north-west. So 60 is ' +
      'kept, and 240 is as likely, until that photograph is found and read again or the complex’s drawings (not cleared for release) are',
  },
  // (where the service structure went, and what else stood on the complex: lc-14.md)
};
