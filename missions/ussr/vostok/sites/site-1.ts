import type { SiteDef } from '../../../../src/types';
import { ARAL_1960 } from './aral-1960.ts';

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
  // What is heard standing here with nothing running: the steppe's wind and a far hum of machinery, and no water: the
  // Aral Sea is 200 km off and the Syr Darya 30, and a flight from here comes down on land. Estimated, as every place's
  // bed is. The wind is the Cape's figure scaled by the air that moved: 2.1 m/s at the neighbouring stations on the
  // morning of 12 April 1961 (the flight's weather.ts) against the Cape's 5.1 m/s on 5 May, so 0.05 x 2.1 / 5.1; the
  // hum is the Cape's own.
  quiet: { wind: 0.02, surf: 0, hum: 0.006, sea: 0 },
  // The sky a flight from here stands under when it has no record of its own day: the steppe's clear, dry air. Every
  // figure is an estimate. Vostok 1 has its day's (its flight's weather.ts).
  weather: {
    observed: { where: 'nowhere: the steppe’s usual clear morning', at: '', source: 'no day’s record: an estimate of the place' },
    wind: {
      from: { value: 45, confidence: 'estimated', source: 'the steppe’s usual quarter in spring: the north-east' },
      speed: { value: 2.5, confidence: 'estimated', source: 'a light breeze' },
    },
    visibility: { value: 60_000, confidence: 'estimated', source: 'dry air: clear' },
    haze: { value: 1500, confidence: 'estimated', source: 'taken to thin over 1.5 km' },
  },
  region: {
    name: 'tyuratam',
    south: 43.2,
    north: 48.6,
    west: 57.9,
    east: 67.2,
    why:
      'what is seen from over the pad up to 150 km: the Syr Darya and its floodplain 30 km south, with the railway and the town at ' +
      'Tyuratam station on its north bank; the river down past Kazalinsk to its delta, and the Aral Sea as it was, 140 km west at its ' +
      'nearest; the Aral Karakum sands north-west, the clay plains and the sands north and east, and Kyzylorda up the river',
    asOf: '1961-04-12',
    // What has changed on the map since 12 April 1961, put back. OpenStreetMap has today's Aral, a remnant of the sea of 1961 (its
    // level fell from about 53 m in 1960 to under 30 m by the 2000s, as the rivers were taken for irrigation): the sea of the
    // late 1950s from a period source, which holds today's remnant inside it.
    later: [
      {
        what: 'the Aral Sea’s floor laid bare as the sea shrank, from the 1960s on',
        built: 1962,
        was: 'water',
        ring: ARAL_1960,
        source:
          'Natural Earth, Historic Lakes (ne_10m_lakes_historic: "Aral Sea", dated "late 1950s"), 67,500 km2; the sea stood at 53 m and ' +
          'about 67,500 km2 in 1960 and began to fall in 1961 (docs/sources.md, "The Aral Sea"). Its islands are not drawn',
      },
    ],
    rivers: [
      {
        match: 'Сырдар|Syr ?Dar',
        width: 150,
        source:
          'OpenStreetMap’s middle line of the Syr Darya (waterway=river), today’s course; its water areas cover only stretches of it. ' +
          'The channel’s width is estimated (150 m), read off today’s imagery at Baikonur and Kazalinsk',
      },
    ],
  },
};
