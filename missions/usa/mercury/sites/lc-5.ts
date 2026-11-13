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
  // The sky a flight from here stands under when it has no record of its own day: a fair morning at the Cape. Every
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
  seaLevel: {
    value: -29,
    confidence: 'estimated',
    source: 'the EGM96 geoid at the Cape, read to the nearest metre: the same figure the height above stands on',
  },
  bearingX: {
    value: 295,
    confidence: 'estimated',
    source:
      'the hatch side is square to the rails, which run 025/205 degrees true (OpenStreetMap, within 1 degree); which of the ' +
      'two sides it was is read from TM X-53107 Figure 7-6 and liftoff photograph 6100884 (lc-5.md)',
  },
  region: {
    name: 'cape-canaveral',
    south: 25.6,
    north: 29.6,
    west: -81.5,
    east: -75.2,
    why:
      'what a suborbital flight from the Cape sees under it: MR-3 flew 487 km to 27.23 N 75.88 W (the flight README), over the ' +
      'Little Bahama Bank with Grand Bahama and Great Abaco south of the track; the box takes in the Florida coast from Flagler ' +
      'Beach to Miami, Lake Okeechobee, and the sea past the landing',
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
};
