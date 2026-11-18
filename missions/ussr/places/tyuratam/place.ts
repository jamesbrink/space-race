import type { Confidence, Measure, PlaceDef } from '../../../../src/types.ts';
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
  // the mains its far hum is at (sound/engine.ts `humOf`)
  mains: {
    value: 50,
    confidence: 'documented',
    source:
      'the Soviet grid’s 50 Hz, as across Europe and Asia and still in Kazakhstan and Russia (Wikipedia, “Utility frequency”; “Mains electricity ' +
      'by country”): that the site’s own power stations ran at it is taken from that. The hum’s level is estimated (quiet)',
  },
  // What a tyre runs on at Site 1: the land is the steppe's clay crust over loam (steppe.ts, "The ground"); the made
  // surfaces are known by their materials' names in the models (site1/), which say what each is
  tread: {
    land: {
      kind: 'steppe',
      confidence: 'derived',
      source: 'the steppe’s clay crust over grey-brown loam (steppe.ts)',
    },
    materials: [
      { prefix: 'concrete', kind: 'concrete' },
      { prefix: 'road-gravel', kind: 'gravel' },
      { prefix: 'earth', kind: 'earth' },
      { prefix: 'steel', kind: 'steel' },
      { prefix: 'galvanised', kind: 'steel' },
      { prefix: 'timber', kind: 'timber' },
    ],
    // What the land is painted as round Site 1 and along the mapped ways (ground.ts `paintedInSite1`).
    painted: {
      apron: {
        kind: 'concrete',
        confidence: 'documented',
        source:
          'concrete slabs west of the platform, the rails flush in them: the film «Первый рейс к звёздам», 43:26 to 43:29 (site-1.md, “The apron”)',
      },
      road: {
        kind: 'concrete',
        confidence: 'estimated',
        source:
          'the roads’ lines are the CIA’s drawing of 1959 (PIC/JR-2/60 Figure 5); that they were concrete slabs is estimated (ground.ts, `ROADS`)',
      },
      'packed-earth': {
        kind: 'earth',
        confidence: 'estimated',
        source:
          'The graded roads and dirt tracks traced on the Corona frames (tyuratam-works.ts), and the dust worn beside the roads (Chertok, Rockets and People, vol. II, p. 314). Their sound is estimated.',
      },
      ballast: {
        kind: 'gravel',
        confidence: 'estimated',
        source: 'the tracks’ beds beyond the modelled rails, drawn as crushed stone (ground.ts, `paint`): ordinary practice',
      },
    },
    source: 'derived: each material’s name says what it is (concrete, gravel, clay, a steel rail or deck, a timber tie)',
  },
  // The engines of the vehicles at the pad, by the name a vehicle's model gives itself (its extras' `vehicle`) or a move
  // names: which engine each type had and the speed it is rated at, from reference works (docs/sources.md, "Site 1
  // (Tyuratam)"); no idle speed was found for any, and each is estimated. The locomotive's type is not recorded.
  engines: {
    'GAZ-21 Volga, 1958-62': {
      fuel: 'petrol',
      cylinders: 4,
      idle: idling(550),
      most: rpm(4000, 'documented', 'the ZMZ-21A’s 70 to 75 hp at 4,000 rpm (ru.wikipedia, «ГАЗ-21», Силовой агрегат)'),
      gears: {
        ratios: [3.12, 1.77, 1],
        confidence: 'documented',
        source: 'the three-speed manual box: 3.12, 1.77 and 1.00, reverse 3.74 (ru.wikipedia, «ГАЗ-21», infobox, Трансмиссия)',
      },
      confidence: 'documented',
      source: 'the ZMZ-21A, a 2,445 cc straight four (ru.wikipedia, «ГАЗ-21», Силовой агрегат and infobox)',
    },
    'LAZ-695B': {
      fuel: 'petrol',
      cylinders: 6,
      idle: idling(450),
      most: rpm(2800, 'documented', '109 hp at 2,800 rpm (ru.wikipedia, «ЗИЛ-158», Технические характеристики)'),
      gears: {
        ratios: [6.24, 3.32, 1.9, 1, 0.8],
        confidence: 'assumed',
        source:
          'The early LAZ-695B five-speed, from the gearbox photograph and ratios in Za Rulyom, «Легендарные автобусы СССР». The Gagarin Museum identifies the pad bus as this model. Its individual transmission has no recorded serial here.',
      },
      confidence: 'documented',
      source:
        'the ZIL-158’s side-valve 5.55 litre straight six (ru.wikipedia, «ЛАЗ-695»; Za Rulyom, «ЛАЗ-695Е: конструкция», 2025): called the ZIL-124 in ' +
        'some sources, the same engine; the ZIL-130 V8 was the 695E’s, from 1963',
    },
    'GAZ-63': {
      fuel: 'petrol',
      cylinders: 6,
      idle: idling(450),
      most: rpm(2800, 'documented', 'the GAZ-51’s 70 hp at 2,800 rpm (ru.wikipedia, «ГАЗ-63», infobox)'),
      gears: {
        ratios: [6.4, 3.09, 1.69, 1],
        confidence: 'documented',
        source: 'the four-speed manual box: 6.4, 3.09, 1.69 and 1.00, reverse 7.82 (ru.wikipedia, «ГАЗ-63», infobox, Трансмиссия)',
      },
      confidence: 'documented',
      source: 'the GAZ-51, a 3,485 cc straight six (ru.wikipedia, «ГАЗ-63» and «ГАЗ-51»)',
    },
    'diesel shunting locomotive': {
      fuel: 'diesel',
      cylinders: 6,
      idle: rpm(
        270,
        'assumed',
        'the D50’s lowest controller position, 270 ± 15 rpm (ru.wikipedia, «ТЭ1», Органы управления), taken for the 2D50 developed from it',
      ),
      most: rpm(
        740,
        'assumed',
        'the TEM1’s 2D50 at 740 rpm, 1,000 hp (ru.wikipedia, «ТЭМ1» and «ТЭМ2»), taken for a locomotive of unrecorded type',
      ),
      confidence: 'assumed',
      source:
        'a TEM1’s 2D50, a six-cylinder diesel (ru.wikipedia, «ТЭМ1»): which kind of locomotive worked the site’s track is not recorded',
    },
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

/** An engine's speed, revolutions a minute, with how sure it is and whose it is. */
function rpm(value: number, confidence: Confidence, source: string): Measure {
  return { value, confidence, source };
}
/** An idle speed no source read gives. */
function idling(value: number): Measure {
  return rpm(value, 'estimated', 'its idle: no source read gives it');
}
