import type { Engine, PlaceDef } from '../../../../src/types.ts';

/**
 * Cape Canaveral: the place every American crewed flight of the 1960s left from, and what is the same for every pad in
 * it (lc-5.ts, lc-14.ts, lc-19.ts): the country round it its flights see, its usual sky, and its quiet. What stands on
 * its land, and the land itself, is the viewer's (ground.ts).
 */
export const CAPE_CANAVERAL: PlaceDef = {
  name: 'cape-canaveral',
  // The sky a flight from the Cape stands under when it has no record of its own day: a fair morning at the Cape. Every
  // figure is an estimate (only the cumulus's usual height is from a record), and no flight is shown under it yet:
  // Freedom 7 and Liberty Bell 7 each have their day's (their flight's weather.ts).
  weather: {
    observed: { where: 'nowhere: the Cape’s usual fair morning', at: '', source: 'no day’s record: an estimate of the place' },
    low: {
      kind: 'cumulus',
      cover: { value: 0.2, confidence: 'estimated', source: 'a fair morning at the Cape has scattered cumulus: two tenths taken' },
      base: {
        value: 720,
        confidence: 'estimated',
        source:
          'the median base of the low cloud on May mornings, 1959 to 1963 (NOAA Integrated Surface Database, station 74794012868, ' +
          'the Skid Strip): documented for those mornings, an estimate for any other',
      },
      depth: { value: 650, confidence: 'estimated', source: 'as fair-weather cumulus of a morning are' },
      size: { value: 1500, confidence: 'estimated', source: 'as fair-weather cumulus are photographed' },
      wind: {
        from: { value: 90, confidence: 'estimated', source: 'the trade wind off the sea' },
        speed: { value: 6, confidence: 'estimated', source: 'a little stronger than at the ground' },
      },
    },
    wind: {
      from: { value: 90, confidence: 'estimated', source: 'the trade wind off the sea' },
      speed: { value: 4, confidence: 'estimated', source: 'a light breeze' },
    },
    visibility: { value: 60_000, confidence: 'estimated', source: 'clear sea air' },
    haze: { value: 1400, confidence: 'estimated', source: 'about twice the height of the cumulus bases' },
  },

  region: {
    name: 'cape-canaveral',
    pad: 'lc-5.ts',
    south: 25.6,
    north: 29.6,
    west: -81.5,
    east: -75.2,
    why:
      'what a suborbital flight from the Cape sees under it: MR-3 flew 487 km to 27.23 N 75.88 W (the flight README), over the ' +
      'Little Bahama Bank with Grand Bahama and Great Abaco south of the track; the box takes in the Florida coast from Flagler ' +
      'Beach to Miami, Lake Okeechobee, and the sea past the landing',
    // What the globe's relief and its land's colours are baked over (tools/globe-surface.mjs), wider than the coast's box:
    // the Bahamas and their banks, the Straits and the Keys, for the flights seen from higher up. `banks`: where the sea's
    // bed is pale carbonate sand under clear water, so that shallow water there is turquoise (viewer/globe.ts:
    // globeWater): each a circle, [latitude, longitude, radius in km], drawn generously round a bank (the bank's own edge
    // is in the relief: it is only the shallows inside a circle that are bright). Read off charts and photographs from
    // orbit: estimated. Elsewhere a shallow bed is taken as dark and the water as less clear.
    surface: {
      south: 20.5,
      north: 31.5,
      west: -84.5,
      east: -72.5,
      centre: [26.0, -78.5],
      metres: 450,
      banks: [
        [26.9, -78.2, 130], // Little Bahama Bank
        [24.9, -78.6, 190], // Great Bahama Bank: Bimini, the Berry Islands, Andros
        [23.0, -76.6, 260], // Great Bahama Bank: the Exumas to the Ragged Islands
        [23.9, -80.3, 60], // Cay Sal Bank
        [24.9, -81.0, 110], // the Florida Keys, Florida Bay and the reef tract
        [22.2, -73.5, 180], // Crooked Island, Acklins and the Caicos Bank's edge
      ],
    },
    asOf: '1961-05-05',
    // Each line read off OpenStreetMap: the road or canal's way, between where it leaves the natural shore (tools/globe-region.mjs's
    // land on both sides within 160 m for a causeway, water between banks for a canal). The widths put back are estimated.
    later: [
      {
        what: 'Bennett Causeway (SR 528) across the Indian River',
        built: 1963,
        was: 'water',
        path: [
          [28.40147, -80.7455],
          [28.40209, -80.73831],
          [28.40325, -80.73124],
          [28.4049, -80.7205],
        ],
        width: 260,
        source: 'its oldest spans built 1963 (FDOT bridge inventory, SR 528 over the Banana River); the Bee Line it carries opened 1967',
      },
      {
        what: 'Bennett Causeway (SR 528) across the Banana River',
        built: 1963,
        was: 'water',
        path: [
          [28.40521, -80.6612],
          [28.40508, -80.6392],
        ],
        width: 260,
        source: 'as the Indian River crossing',
      },
      {
        what: 'NASA Causeway (SR 405) across the Indian River',
        built: 1964,
        was: 'water',
        path: [
          [28.5278, -80.78],
          [28.52725, -80.76835],
          [28.52706, -80.74981],
          [28.5266, -80.73],
        ],
        width: 260,
        source: 'its drawbridge built in 1964 (FDOT, NASA Causeway bridge replacement, 2024)',
      },
      {
        what: 'NASA Causeway East across the Banana River',
        built: 1964,
        was: 'water',
        path: [
          [28.52034, -80.62285],
          [28.51373, -80.6124],
          [28.51203, -80.6097],
          [28.49846, -80.58822],
        ],
        width: 260,
        source: "taken with the Indian River crossing: it joins Complex 39's Merritt Island to the Cape",
      },
      {
        what: 'Canaveral Barge Canal across Merritt Island',
        built: 1965,
        was: 'land',
        path: [
          [28.40605, -80.718],
          [28.40905, -80.69662],
          [28.40905, -80.69371],
          [28.40913, -80.664],
        ],
        width: 140,
        source: 'the canal and the Canaveral Lock were dedicated in 1965 (Wikipedia, Canaveral Barge Canal and Port Canaveral)',
      },
      {
        what: "the Canaveral Lock and its cut from the Banana River to Port Canaveral's west basin",
        built: 1965,
        was: 'land',
        path: [
          [28.40918, -80.6398],
          [28.4092, -80.6265],
        ],
        width: 260,
        source: 'as the barge canal: until the lock the port opened only to the sea (Wikipedia, Port Canaveral)',
      },
      {
        what: "Port Canaveral's Trident basin, north of the entrance channel",
        built: 1978,
        was: 'land',
        path: [
          [28.41228, -80.59195],
          [28.41846, -80.59573],
        ],
        width: 640,
        source:
          'dug by the Navy for its Trident submarines in the late 1970s, its sand put on the beach south of the port (Space Coast Daily, Brevard History: A Growing Port Canaveral, the third decade); the year is approximate, the outline read off the baked map',
      },
      {
        what: "Port Canaveral's west turning basin, north of the channel's west end",
        built: 1980,
        was: 'land',
        path: [
          [28.4151, -80.62912],
          [28.4151, -80.62394],
        ],
        width: 780,
        source:
          'the state let the port dredge its west turning basin in 1979 after two years of delay (the same history): that none of it was open water in 1961 is estimated, and the year it was finished is approximate',
      },
      {
        what: "Complex 39's turning basin by the Vehicle Assembly Building, and its canal to the Banana River",
        built: 1965,
        was: 'land',
        path: [
          [28.58327, -80.64574],
          [28.58378, -80.64244],
        ],
        width: 600,
        source: 'dug for Apollo on Merritt Island, which NASA bought from 1962: not there in 1961 (the year is approximate)',
      },
      {
        what: "Complex 39's barge canal",
        built: 1965,
        was: 'land',
        path: [
          [28.58378, -80.64244],
          [28.58492, -80.64115],
          [28.59294, -80.6206],
        ],
        width: 140,
        source: 'as the turning basin',
      },
    ],
  },
  // What is heard standing here with nothing running: the trade wind, the surf on the beach 1.4 km east of pad 5, a far
  // hum of machinery, and the sea round a spacecraft that has come down in it. Estimated, as every place's bed is
  // (sound/model.ts: the levels are impressions, not measured).
  quiet: { wind: 0.05, surf: 0.035, hum: 0.006, sea: 0.12 },
  // What a tyre runs on round the pads: the land is the Cape's sand under grass and scrub (lc-5.md, "The land"); the made
  // surfaces are known by their materials' names in the models (lc5/, complexes/), which say what each is
  tread: {
    land: {
      kind: 'sand',
      confidence: 'estimated',
      source: 'the Cape’s sand under its grass and scrub (lc-5.md, “The land”)',
    },
    materials: [
      { prefix: 'concrete', kind: 'concrete' },
      { prefix: 'paint-line', kind: 'concrete' },
      { prefix: 'ballast-gravel', kind: 'gravel' },
      { prefix: 'shell-gravel', kind: 'gravel' },
      { prefix: 'steel', kind: 'steel' },
      { prefix: 'galvanised-deck', kind: 'steel' },
      { prefix: 'timber', kind: 'timber' },
    ],
    // the ways the land is painted with (ground.ts `waysOn`, `CAPE_GROUND.painted`)
    painted: {
      'shell-road': {
        kind: 'gravel',
        confidence: 'estimated',
        source:
          'the roads round the pads are drawn as crushed shell (ground.ts, `PAINT`): a loose aggregate, heard as gravel. That they were ' +
          'shell and not asphalt in 1961 is the drawing’s estimate; the site plan (TM X-53107 Figure 7-6) gives their lines, not their surface',
      },
      ballast: {
        kind: 'gravel',
        confidence: 'derived',
        source: 'the rail line’s bed beyond the modelled track: crushed stone (lc-5.md, “Track off the pad”)',
      },
    },
    source: 'derived: each material’s name says what it is (concrete, gravel, a steel rail or deck, a timber tie)',
  },
  // The engines of the vehicles at the pads, by the name each vehicle's model gives itself (its extras' `vehicle`) or a
  // move names. Each is the type's usual engine as remembered, not checked against a manual: estimated throughout
  engines: {
    '1956 Ford Fairlane Town Sedan': engine('petrol', 8, 475, 4400, 'Ford’s 272 or 292 cu in Y-block V8'),
    '1957 Ford Custom 300 Fordor': engine('petrol', 8, 475, 4400, 'Ford’s 272 cu in Y-block V8'),
    '1957 Ford Country Sedan': engine('petrol', 8, 475, 4400, 'Ford’s 272 cu in Y-block V8'),
    '1957-60 Ford F-100 Flareside': engine('petrol', 6, 450, 4000, 'Ford’s 223 cu in straight six, the work truck’s usual'),
    '1957-60 Ford F-100 Flareside with a utility body': engine('petrol', 6, 450, 4000, 'Ford’s 223 cu in straight six'),
    '1958-60 Rambler American': engine('petrol', 6, 550, 4200, 'Nash’s 196 cu in flathead six'),
    '1959 Chevrolet Biscayne sedan': engine('petrol', 6, 475, 4200, 'Chevrolet’s 235 cu in straight six, the Biscayne’s base engine'),
    '1960 Chevrolet Corvair 700 sedan': engine('petrol', 6, 500, 4400, 'the Corvair’s air-cooled 140 cu in flat six'),
    '1960 Chevrolet Suburban Carryall': engine('petrol', 6, 450, 4000, 'Chevrolet’s 235 cu in straight six'),
    'Volkswagen Type 1, 1958-61': engine('petrol', 4, 850, 3900, 'the air-cooled 1192 cc flat four'),
    'M275 2-1/2-ton 6x6 truck tractor, NASA': engine('petrol', 6, 550, 3400, 'the M35 family’s REO Gold Comet straight six'),
    'International Harvester R-series truck': engine('petrol', 6, 450, 3400, 'an IH Black Diamond straight six, the R-series’ usual'),
  },
};

function engine(fuel: Engine['fuel'], cylinders: number, idle: number, most: number, what: string): Engine {
  return { fuel, cylinders, idle, most, confidence: 'estimated', source: `the type’s usual engine, from memory: ${what}` };
}
