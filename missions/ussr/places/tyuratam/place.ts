import type { Engine, PlaceDef } from '../../../../src/types.ts';
import { ARAL_1960 } from './aral-1960.ts';

/**
 * Tyuratam (NIIP-5, later the Baikonur Cosmodrome), on the steppe by the Syr Darya: the place every Soviet crewed flight
 * left from, and what is the same for every pad in it (site-1.ts): the country round it its flights see, its usual sky,
 * and its quiet. What stands on its land, and the land itself, is the viewer's (ground.ts).
 */
export const TYURATAM: PlaceDef = {
  name: 'tyuratam',
  // What is heard standing here with nothing running: the steppe's wind and a far hum of machinery, and no water: the
  // Aral Sea is 200 km off and the Syr Darya 30, and a flight from here comes down on land. Estimated, as every place's
  // bed is. The wind is the Cape's figure scaled by the air that moved: 2.1 m/s at the neighbouring stations on the
  // morning of 12 April 1961 (the flight's weather.ts) against the Cape's 5.1 m/s on 5 May, so 0.05 x 2.1 / 5.1; the
  // hum is the Cape's own.
  quiet: { wind: 0.02, surf: 0, hum: 0.006, sea: 0 },
  // What a tyre runs on at Site 1: the land is the steppe's clay crust over loam (steppe.ts, "The ground"); the made
  // surfaces are known by their materials' names in the models (site1/), which say what each is
  tread: {
    land: {
      kind: 'steppe',
      confidence: 'derived',
      source: 'the steppe’s clay crust over grey-brown loam (steppe.ts); a road or a track painted on it is not told apart',
    },
    materials: [
      { prefix: 'concrete', kind: 'concrete' },
      { prefix: 'road-gravel', kind: 'gravel' },
      { prefix: 'earth', kind: 'earth' },
      { prefix: 'steel', kind: 'steel' },
      { prefix: 'galvanised', kind: 'steel' },
      { prefix: 'timber', kind: 'timber' },
    ],
    source: 'derived: each material’s name says what it is (concrete, gravel, clay, a steel rail or deck, a timber tie)',
  },
  // The engines of the vehicles at the pad, by the name a vehicle's model gives itself (its extras' `vehicle`) or a move
  // names. Each is the type's usual engine as remembered, not checked against a manual; the locomotive's type is not
  // recorded at all: estimated throughout
  engines: {
    'GAZ-21 Volga, 1958-62': engine('petrol', 4, 550, 4000, 'the ZMZ-21 2.45 litre four'),
    'LAZ-695B': engine('petrol', 6, 450, 2800, 'the ZIL-158’s 5.55 litre straight six'),
    'GAZ-63': engine('petrol', 6, 450, 2800, 'the GAZ-51’s 3.48 litre straight six'),
    'diesel shunting locomotive': engine(
      'diesel',
      6,
      300,
      740,
      'a TEM1’s 2D50 six (which kind of locomotive worked the site’s track is not recorded)',
    ),
  },
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
    pad: 'site-1.ts',
    south: 43.2,
    north: 48.6,
    west: 57.9,
    east: 67.2,
    why:
      'what is seen from over the pad up to 150 km: the Syr Darya and its floodplain 30 km south, with the railway and the town at ' +
      'Tyuratam station on its north bank; the river down past Kazalinsk to its delta, and the Aral Sea as it was, 140 km west at its ' +
      'nearest; the Aral Karakum sands north-west, the clay plains and the sands north and east, and Kyzylorda up the river',
    // What the globe's relief and its land's colours are baked over (tools/globe-surface.mjs): the lower Syr Darya, the
    // Aral Sea of 1961 and the country round, wider than the coast's box. Its colours are April's, the month of every
    // flight from it the region is drawn for: the steppe's short spring.
    surface: { south: 41, north: 50, west: 56, east: 70, centre: [45.5, 63.0], metres: 450, month: 'april' },
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

function engine(fuel: Engine['fuel'], cylinders: number, idle: number, most: number, what: string): Engine {
  return { fuel, cylinders, idle, most, confidence: 'estimated', source: `the type’s usual engine, from memory: ${what}` };
}
