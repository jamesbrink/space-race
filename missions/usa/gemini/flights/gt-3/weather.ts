import { ALOFT, HOURS } from './aloft.ts';
import type { DayWeather } from '../../../../../src/types.ts';

const ISD = 'NOAA Integrated Surface Database, station 747940-12868 (Cape Kennedy AFS: the Skid Strip, 2.7 km south of the pad)';
const TITANS = 'On the Shoulders of Titans (NASA SP-4203), pp. 232 to 237';

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
};
