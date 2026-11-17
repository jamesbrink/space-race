import { derived } from '../../../../../src/measure.ts';
import type { DayWeather } from '../../../../../src/types.ts';
import { ALOFT, HOURS } from './aloft.ts';

const ISD = 'NOAA Integrated Surface Database, station 74794012868 (Cape Canaveral: the Skid Strip, 2.1 km south-west of the pad)';
const HOUR = '08:00 EST (13:00 UTC), 24 May 1962';
const REPORT = 'NASA TN D-3814, p. 17';

const ERA5_WAVES =
  'ERA5 (ECMWF), its wave model at 18:00 UTC on 24 May 1962, between the four cells round 19.45 N, 63.98 W (the landing point by the tracking, 19°27′ N 63°59′ W, NASA TN D-3814, Table XVII, as the README and flight.ts give it; landed at 17:41:13 UTC, the README’s), read from the public ARCO-ERA5 store by tools/era5.mjs `fieldAt`; 17:00 differs by under 0.08 m, 0.2 s and 4°';

/**
 * The sea where it came down, nineteen minutes before the hour: ERA5's waves there, a swell of about a metre from the east
 * and a sea of 0.7 m raised by the wind from the east-south-east. The README has waves of 3 ft in the planned landing area
 * at noon (USS John R. Pierce), some 250 nautical miles short of where Aurora 7 came down: not this sea.
 */
const SEA: DayWeather['sea'] = {
  observed: { where: 'the landing area, 19.45 N, 63.98 W', at: '1962-05-24T18:00:00Z', source: ERA5_WAVES },
  trains: [
    {
      label: 'the swell',
      height: derived(0.955, `${ERA5_WAVES}: significant height of the total swell`),
      period: derived(6.311, `${ERA5_WAVES}: mean period of the total swell`),
      from: derived(94.9, `${ERA5_WAVES}: mean direction of the total swell, coming from`),
    },
    {
      label: 'the wind’s waves',
      height: derived(0.714, `${ERA5_WAVES}: significant height of the wind waves`),
      period: derived(3.617, `${ERA5_WAVES}: mean period of the wind waves`),
      from: derived(110.9, `${ERA5_WAVES}: mean direction of the wind waves, coming from`),
    },
  ],
};

/**
 * The weather Aurora 7 stood under: the morning of 24 May 1962 at Cape Canaveral, at the Cape's observation fifteen
 * minutes after liftoff (07:45:16 EST), which is the flight report's own "at launch time" to the figure: a ceiling of
 * 210 m (the report's "broken at 700 ft"), a mile's visibility in patches of shallow fog, the wind from 250 degrees at
 * 4.1 m/s (the report has 240 at 8 knots), 25.0 C with a dew point of 22.8 (77 and 73 F). Ground fog and smoke had lain on
 * the Cape since before dawn (1.2 km at 07:00 EST), and held the count at T-11 for 45 minutes until the cameras that would
 * watch an abort could see; "By 7:30 a.m. e.s.t., conditions had improved considerably" (the report), and "The rising sun
 * rapidly dispelled the ground fog" (This New Ocean, p. 447). By 09:00 the station saw 4.8 km and no ceiling. Patrick Air
 * Force Base, 29 km south (station 74795012867), had fog at dawn too (2 km at 06:00 EST) but no ceiling, and 8 km by
 * 08:00. Above it all, the station at the Skid Strip coded six oktas
 * of cirrus at 07:00 and five at 10:00. The README has it in words ("The sky at liftoff").
 */
export const WEATHER: DayWeather = {
  observed: {
    where: 'Cape Canaveral: the Skid Strip, fifteen minutes after liftoff',
    at: '1962-05-24T13:00:00Z',
    source: `${ISD}, ${HOUR}; ${REPORT}`,
  },
  low: {
    kind: 'cumulus',
    cover: {
      value: 0.75,
      confidence: 'derived',
      source:
        `"broken at 700 ft" at launch (${REPORT}): broken is five to seven oktas, the middle taken. ${ISD}, ${HOUR}: a ceiling at ` +
        '210 m, the sky seven oktas covered in all, no layer coded',
    },
    base: {
      value: 210,
      confidence: 'documented',
      source: `${ISD}, ${HOUR}: the ceiling at 210 m; "broken at 700 ft" (213 m) at launch (${REPORT}). No ceiling at 07:00 or at 09:00 EST`,
    },
    depth: {
      value: 120,
      confidence: 'estimated',
      source:
        'not recorded: the ground fog lifting into a shallow deck as the Sun warmed it, for an hour; Carpenter was above it in ' +
        'a "Clear blue sky" at 9,000 ft, 32 seconds after liftoff (NASA SP-6, the air-ground transcript, p. 77)',
    },
    size: { value: 500, confidence: 'estimated', source: 'not recorded: the ragged pieces of a lifting fog' },
    wind: {
      from: { value: 250, confidence: 'documented', source: `${ISD}, ${HOUR}: the wind at the ground, taken for the deck’s height too` },
      speed: {
        value: 5,
        confidence: 'estimated',
        source: 'the wind at the ground was 4.1 m/s (below): taken a little stronger at the deck',
      },
    },
    note:
      'No genus is coded at 13:00 UTC. A deck at 210 m over a morning’s ground fog, gone within the hour, is stratus or its torn ' +
      'pieces, for which the viewer has no form: it is drawn as its low heaps, shallow and ragged. Only the cover, the base and ' +
      'the wind are the record’s',
  },
  high: {
    kind: 'cirrus',
    cover: {
      value: 0.4,
      confidence: 'estimated',
      source:
        `${ISD}: six oktas of cirrus at 07:00 EST and five at 10:00 (documented for those hours); at 08:00 the observer under the ` +
        'broken deck coded no layer above it. From above the deck at 9,000 ft Carpenter called the sky "Clear blue" (NASA SP-6, ' +
        'p. 77): a thin sheet of fibres, under half the sky, is taken',
    },
    base: {
      value: 9000,
      confidence: 'estimated',
      source: 'not recorded (the station codes its height as unlimited): where cirrus usually lies over Florida in May',
    },
    depth: { value: 0.1, confidence: 'estimated', source: 'not recorded: thin enough for the pilot to see a clear blue sky through it' },
  },
  wind: {
    from: {
      value: 250,
      confidence: 'documented',
      source: `${ISD}, ${HOUR}: from 250 degrees; "8 (from 240°, WSW)" at launch (${REPORT}). 230 at 07:00 EST, 250 at 09:00`,
    },
    speed: {
      value: 4.1,
      confidence: 'documented',
      source: `${ISD}, ${HOUR}: 4.1 m/s (8 knots, as the report has it); 2.6 m/s at 07:00 EST, 4.1 at 09:00. No gust is recorded`,
    },
  },
  visibility: {
    value: 1600,
    confidence: 'documented',
    source:
      `${ISD}, ${HOUR}: 1.6 km, in patches of shallow fog (present weather 11); "1" mile at launch, "limited ... by ground fog and ` +
      `smoke" (${REPORT}). 1.2 km at 07:00 EST, 4.8 km at 09:00, 8 km at 10:00`,
  },
  haze: {
    value: 250,
    confidence: 'estimated',
    source:
      'not recorded: the fog and smoke lay under the deck at 210 m, and from 9,000 ft the sky was clear; the haze is taken to thin ' +
      'over a little more than the depth of the fog',
  },
  // the air over the pad and the surface's hours round liftoff: ERA5's (aloft.ts, tools/era5-aloft.mjs). The report's own
  // launch-area winds to 60,000 ft (TN D-3814, Figure 8) are a plot that has not been read off
  aloft: ALOFT,
  hours: HOURS,
  sea: SEA,
};
