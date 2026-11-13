import type { DayWeather } from '../../../../../src/types';

const ISD = 'NOAA Integrated Surface Database, station 74794012868 (Cape Canaveral: the Skid Strip, 5 km north of the pad)';
const HOUR = '07:00 EST (12:00 UTC), 21 July 1961';
const RESULTS = 'Results of the Second U.S. Manned Suborbital Space Flight';

/**
 * The weather Liberty Bell 7 stood under: the morning of 21 July 1961 at Cape Canaveral, twenty minutes before liftoff
 * (07:20:36 EST). The Cape's station reported the sky covered and no ceiling: a little low cloud, a thin deck of
 * altocumulus, and over all of it a veil of cirrostratus: the "existing overcast" the count was held 41 minutes for
 * (Results, p. 50). What the pilot saw of the cloud from 190 km is in `beyond`. The README has it in words ("The
 * weather, as recorded, and as shown").
 */
export const WEATHER: DayWeather = {
  observed: {
    where: 'Cape Canaveral: the Skid Strip',
    at: '1961-07-21T12:00:00Z',
    source: `${ISD}, ${HOUR}`,
  },
  low: {
    kind: 'cumulus',
    cover: { value: 0.125, confidence: 'documented', source: `${ISD}, ${HOUR}: one okta` },
    base: { value: 510, confidence: 'documented', source: `${ISD}, ${HOUR}: 510 m` },
    depth: { value: 650, confidence: 'estimated', source: 'not recorded: taken as on 5 May, heaps of 250 m and a few towers of 500' },
    size: { value: 1500, confidence: 'estimated', source: 'not recorded: taken as on 5 May' },
    wind: {
      from: { value: 200, confidence: 'documented', source: `${ISD}, ${HOUR}: the wind at the ground, taken for the cloud’s height too` },
      speed: {
        value: 3,
        confidence: 'estimated',
        source: 'the wind at the ground was 2.1 m/s (below): taken a little stronger at the bases, as on 5 May',
      },
    },
    note:
      'The station coded it cumulonimbus (type 09), as it coded the one okta of fair-weather cumulus at 750 m on 5 May: no shower, ' +
      'thunder or anvil is reported at any hour of the morning, and This New Ocean (p. 369) has "lower patches of cumulus". Drawn as cumulus.',
  },
  middle: {
    kind: 'altocumulus',
    cover: { value: 0.25, confidence: 'documented', source: `${ISD}, ${HOUR}: two oktas` },
    base: { value: 5400, confidence: 'documented', source: `${ISD}, ${HOUR}: 5,400 m` },
    note:
      'Patrick Air Force Base, 23 km south, had five oktas of altocumulus at 4,500 m at the same hour (station 74795012867), and the ' +
      'Skid Strip a ceiling at 3,000 m an hour before: the deck was thicker and lower to the south and earlier. Only the pad’s own ' +
      'station at the hour is drawn.',
  },
  high: {
    kind: 'cirrostratus',
    cover: { value: 1, confidence: 'documented', source: `${ISD}, ${HOUR}: eight oktas of cirrostratus (type 02), the whole sky` },
    base: {
      value: 10_500,
      confidence: 'estimated',
      source:
        'not recorded (the report’s 22,000 m is its code for no ceiling): cirrostratus over Florida in summer lies between 9 and 13 km; ' +
        '10.5 km taken',
    },
    depth: {
      value: 0.4,
      confidence: 'estimated',
      source:
        'the station reported eight oktas and no ceiling, which in the airways code of the day is a thin layer, one at least half ' +
        'transparent (derived: an optical depth under 0.7). 0.4 taken: thin enough that the pilot picked out the Cape and the ' +
        'Banana River through it from 190 km (Results, p. 37)',
    },
  },
  wind: {
    from: { value: 200, confidence: 'documented', source: `${ISD}, ${HOUR}` },
    speed: { value: 2.1, confidence: 'documented', source: `${ISD}, ${HOUR}: 4 knots` },
  },
  visibility: {
    value: 40_000,
    confidence: 'estimated',
    source:
      `at the station’s 16 km limit (${ISD}, ${HOUR}) and at Patrick’s 24 km limit (station 74795012867): documented as at least ` +
      '24 km, and not recorded past it. The air was humid (25.5 °C with a dew point of 23.3 °C): 40 km taken, half of 5 May’s clear air',
  },
  haze: {
    value: 1000,
    confidence: 'estimated',
    source: 'taken as about twice the height of the cumulus bases (510 m), as on 5 May',
  },
  // What was seen from above, widest first: each later one stands over the earlier where they overlap, and the station's
  // own report over all of them at the Cape (viewer/weather.ts: weatherAt).
  beyond: [
    {
      what: '"High cirrus blotted out everything except an area ..." (the pilot, from up to 190 km)',
      south: 14,
      north: 43,
      west: -97,
      east: -64,
      high: {
        value: 0.9,
        confidence: 'estimated',
        source: '"blotted out everything": a cover is not given; nine tenths taken, a sky the ground is not seen through',
      },
      confidence: 'documented',
      source:
        `${RESULTS}, p. 37 (the pilot’s debriefing); "The cloud coverage was quite extensive" (p. 52). The bounds are everything ` +
        'within the horizon of 190 km up (1,540 km), which is our reading of "everything"',
    },
    {
      what: '"all the northern portion of Florida ... high cirrus and lower patches of cumulus clouds"',
      south: 29.2,
      north: 31,
      west: -87.6,
      east: -80,
      low: { value: 0.3, confidence: 'estimated', source: '"patches": a cover is not given; three tenths taken' },
      confidence: 'documented',
      source:
        'This New Ocean (NASA SP-4201), p. 369: the outlook the launch was decided on. Its "completely obscured" is not taken over ' +
        'the pilot’s own sight of the Gulf coast there (below); its low cloud is. The bounds are the state north of Daytona Beach: ours',
    },
    {
      what: '"Southern Florida and Cuba would be splotched by scattered cumulus"',
      south: 19.8,
      north: 27.5,
      west: -85,
      east: -74.1,
      low: { value: 0.2, confidence: 'estimated', source: '"scattered": a cover is not given; two tenths taken' },
      confidence: 'documented',
      source: 'This New Ocean, p. 369, as above. The bounds are Florida south of Lake Okeechobee’s north shore and the whole of Cuba: ours',
    },
    {
      what: '"... Beyond this the Gulf of Mexico was visible"; the Gulf coast "between Apalachicola, Fla., and Mobile, Ala."',
      south: 25,
      north: 30.5,
      west: -88.2,
      east: -82.6,
      high: {
        value: 0.2,
        confidence: 'estimated',
        source: 'seen, and "both a hazy blue ... very difficult to distinguish": not clear, not blotted out; two tenths taken',
      },
      confidence: 'documented',
      source: `${RESULTS}, p. 37 and p. 52 (the pilot’s flight report). The bounds are the eastern Gulf from the peninsula’s west coast to Mobile Bay: ours`,
    },
    {
      what: '"... except an area from about Daytona Beach back inland to Orlando and Lakeland to Lake Okeechobee and down to the tip of Florida"',
      south: 25.1,
      north: 29.2,
      west: -82,
      east: -80.9,
      high: { value: 0, confidence: 'documented', source: 'the one area the high cirrus did not blot out: none' },
      confidence: 'documented',
      source:
        `${RESULTS}, p. 37. The bounds are a box through the places named, kept west of the east coast (the Cape’s own station had ` +
        'the whole sky covered at 07:00): ours',
    },
  ],
};
