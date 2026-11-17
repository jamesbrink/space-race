import { derived } from '../../../../../src/measure.ts';
import type { DayWeather } from '../../../../../src/types.ts';
import { ALOFT, HOURS } from './aloft.ts';

const ISD = 'NOAA Integrated Surface Database, station 747940-12868 (Cape Kennedy AFS: the Skid Strip, 2.7 km south of the pad)';
const TITANS = 'On the Shoulders of Titans (NASA SP-4203), pp. 232 to 237';

const ERA5_WAVES =
  'ERA5 (ECMWF), its wave model at 19:00 UTC on 23 March 1965, between the four cells round 22.43 N, 70.85 W (the landing point, 22°26′ N 70°51′ W, NASA SP-4002, Appendix 1, Table A, as orbital.ts has it; landed at 19:16:31 UTC, the README’s), read from the public ARCO-ERA5 store by tools/era5.mjs `fieldAt`; 20:00 differs by under 0.01 m, 0.03 s and 1.5°';

/**
 * The sea where it came down, seventeen minutes after the hour: ERA5's waves there, a swell of 1.6 m from the north-east and
 * a sea of 1.2 m raised by the wind from the east. At 3 h 08 min the ground passed up the weather for area 4-1, "Wind is 20
 * knots, at 5 foot seas" (the transcript, p. 77, as the README quotes it); ERA5's two together come to about 2 m.
 */
const SEA: DayWeather['sea'] = {
  observed: { where: 'the landing area, 22.43 N, 70.85 W', at: '1965-03-23T19:00:00Z', source: ERA5_WAVES },
  trains: [
    {
      label: 'the swell',
      height: derived(1.597, `${ERA5_WAVES}: significant height of the total swell`),
      period: derived(7.728, `${ERA5_WAVES}: mean period of the total swell`),
      from: derived(53.4, `${ERA5_WAVES}: mean direction of the total swell, coming from`),
    },
    {
      label: 'the wind’s waves',
      height: derived(1.212, `${ERA5_WAVES}: significant height of the wind waves`),
      period: derived(4.739, `${ERA5_WAVES}: mean period of the wind waves`),
      from: derived(89.1, `${ERA5_WAVES}: mean direction of the wind waves, coming from`),
    },
  ],
};

/**
 * The weather Gemini 3 left under: the morning of 23 March 1965 at Cape Kennedy, at liftoff (09:24 EST, 14:24 UTC). The
 * Cape's own station has the hours either side; the history has the sky in words: overcast at dawn, "the clouds over the
 * Cape had begun to scatter" as the count resumed, and at liftoff "the sky was almost clear". The mission report
 * (MSC-G-R-65-2), which has the launch area's weather as a table, has not been found. The README has it in words.
 */
export const WEATHER: DayWeather = {
  observed: {
    where: 'Cape Kennedy: the Skid Strip at 09:00 EST, with its hours either side',
    at: '1965-03-23T14:00:00Z',
    source: `${ISD}, 14:00 UTC; ${TITANS}`,
  },
  low: {
    kind: 'cumulus',
    cover: {
      value: 0.1,
      confidence: 'estimated',
      source:
        `"scattered" in all at 09:00 EST with no layer given (${ISD}: GF1 02), 1/8 of cumulus at 07:00, and none reported at 10:00; ` +
        '"Isolated Cu over Cape" in the National Weather Service’s summary of Gemini launch weather. A tenth is taken',
    },
    base: {
      value: 480,
      confidence: 'documented',
      source: `${ISD}, 07:00 EST: 1/8 cumulus at 480 m, the last hour a base was given for it; taken for liftoff`,
    },
    depth: {
      value: 400,
      confidence: 'estimated',
      source: 'not recorded: small fair-weather heaps, as a few isolated cumulus of a spring morning are',
    },
    size: { value: 1000, confidence: 'estimated', source: 'not recorded: across a cloud, as small fair-weather cumulus are photographed' },
    wind: {
      from: { value: 140, confidence: 'documented', source: `${ISD}, 09:00 EST: the wind at the ground, taken for the cloud’s height too` },
      speed: {
        value: 7,
        confidence: 'estimated',
        source: 'the wind at the ground was 5.7 m/s (below): taken a little stronger at the bases',
      },
    },
  },
  middle: {
    kind: 'altocumulus',
    cover: {
      value: 0.25,
      confidence: 'documented',
      source: `${ISD}, 10:00 EST: two oktas of altocumulus, the hour after liftoff; at 07:00 it was one okta at 2,700 m. The National Weather Service’s summary has "SCT110", scattered at 11,000 ft, for the launch`,
    },
    base: { value: 3300, confidence: 'documented', source: 'the same observation: 3,300 m (11,000 ft)' },
  },
  high: {
    kind: 'cirrostratus',
    cover: {
      value: 0.2,
      confidence: 'estimated',
      source:
        `three oktas of cirrostratus at 07:00 EST (${ISD}: documented for that hour) and none reported at 10:00; the sky "almost clear" at ` +
        `liftoff (${TITANS}), and a thin milky veil low in the sky in NASA S65-21520, the liftoff from across the Cape. A fifth is taken`,
    },
    base: {
      value: 9000,
      confidence: 'estimated',
      source: 'not recorded (the station codes it as high, with no height): where cirrostratus usually lies over Florida in spring',
    },
    depth: { value: 500, confidence: 'estimated', source: 'not recorded: a thin sheet' },
  },
  wind: {
    from: {
      value: 140,
      confidence: 'documented',
      source: `${ISD}, 09:00 EST, 24 minutes before liftoff: from the south-east. An hour earlier it was 130° and an hour later 150°`,
    },
    speed: { value: 5.7, confidence: 'documented', source: `${ISD}, 09:00 EST: 11 knots (4.6 m/s an hour earlier, 7.2 an hour later)` },
  },
  visibility: {
    value: 40_000,
    confidence: 'estimated',
    source: `at the station’s 16 km limit at 09:00 EST (${ISD}: documented), so how far past it is not recorded; 40 km taken: in NASA S65-21520 the far side of the Cape is seen through haze`,
  },
  haze: {
    value: 1200,
    confidence: 'estimated',
    source:
      'a moist morning (22.8 °C with a dew point of 18.9 °C at the station) under a wind off the sea: the haze is taken to fall off over about a kilometre',
  },
  // the air over the pad and the surface's hours round liftoff: ERA5's (aloft.ts, tools/era5-aloft.mjs); the mission report's
  // sounding, when it is found, goes here in their place
  aloft: ALOFT,
  hours: HOURS,
  sea: SEA,
};
