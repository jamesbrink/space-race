import type { SiteDef } from '../../../../src/types';

/**
 * Site 1 at Tyuratam (NIIP-5, later the Baikonur Cosmodrome): the R-7's first pad, "Gagarin's Start".
 * Nothing of the place is modelled yet (site-1.md): this is where it is on the Earth, so that the sky
 * and the clock of a flight from it are right. When the pad is built, its model's origin is the point
 * given here and `bearingX` becomes a property of that model instead of a convenience.
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
    value: 37.5,
    confidence: 'derived',
    source:
      'no site model yet, so the frame is laid along the way the flight left: the bearing that gives an orbit inclined 64°57′ (OKB-1’s report of ' +
      '3 May 1961) from latitude 45.92°, sin Az = cos i / cos φ, before allowing for the Earth’s turning (which makes the bearing flown over the ground ' +
      'some 3° less). The pad’s own lie (its flame pit, its service towers) is not recorded here',
  },
  // The range and every report of the flight kept Moscow time, three hours ahead of UTC in 1961 (liftoff 09:06:59.7 is 06:06:59.7 UTC).
  // Clocks in the Kyzylorda region round it stood later; the flight's record does not use them.
  zone: { name: 'MSK', utcOffset: 3 },
};
