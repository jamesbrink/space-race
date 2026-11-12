import type { SiteDef } from '../../../../src/types';

/**
 * Site 1 at Tyuratam (NIIP-5, later the Baikonur Cosmodrome): the R-7's first pad, "Gagarin's Start".
 * The origin of the pad model's frame is the rocket's axis at the platform's deck (the "zero mark"), and
 * `bearingX` is the way the fixed structure lies: due east, along the centre track and out over the flame pit.
 * It is not the launch azimuth: the launch ring was turned to that (site-1.md, "The site's frame").
 */
export const SITE1: SiteDef = {
  name: 'Tyuratam (Baikonur), Site 1',
  latitude: {
    value: 45.92025,
    confidence: 'documented',
    source:
      'OpenStreetMap way 172571408 ("Гагаринский старт", Gagarin’s Start), the middle of its outline, traced from imagery (a few metres); ' +
      'Wikipedia gives 45°55′13″N. No surveyed coordinate was found: docs/sources.md, "Known, not yet read"',
  },
  longitude: {
    value: 63.34225,
    confidence: 'documented',
    source: 'OpenStreetMap way 172571408, as the latitude; Wikipedia gives 63°20′32″E',
  },
  height: {
    value: 78,
    confidence: 'estimated',
    source:
      'SRTM (30 m) reads 112 m above the geoid at the point, on the pad’s structure over its flame pit, and the EGM96 geoid there ' +
      'is 34 m below the WGS 84 ellipsoid (GeographicLib GeoidEval: -33.73 m). Good to some ten metres: it moves the Sun by nothing that can be measured',
  },
  seaLevel: {
    value: -34,
    confidence: 'estimated',
    source: 'the EGM96 geoid at the point, -33.73 m (GeographicLib GeoidEval), to the nearest metre',
  },
  bearingX: {
    value: 90,
    confidence: 'derived',
    source:
      'the centre track runs onto the platform on 090.1 degrees true (OpenStreetMap way 37547653, its last 60 m), and the flame pit lies ' +
      'east of it; CIA HTA/JR-4/58 (U-2 photography of August 1957): pad and pit "oriented along a west-east axis". The rocket was aimed by ' +
      'turning the launch ring, so the launch azimuth (about 37.5 degrees, derived from the orbit: the flight README) is not this figure',
  },
  // The range and every report of the flight kept Moscow time, three hours ahead of UTC in 1961 (liftoff 09:06:59.7 is 06:06:59.7 UTC).
  // Clocks in the Kyzylorda region round it stood later; the flight's record does not use them.
  zone: { name: 'MSK', utcOffset: 3 },
};
