import { ALOFT, HOURS } from './aloft.ts';
import type { DayWeather } from '../../../../../src/types.ts';

const ISD = 'NOAA Integrated Surface Database, station 747940-12868 (Cape Kennedy AFS: the Skid Strip, 2.7 km south of the pad)';
const HOUR = '09:00 EST (14:00 UTC), 21 August 1965';
const GV = 'the Gemini V mission report (MSC-G-R-65-4), 12.2, p. 12-8';

/**
 * The weather Gemini 5 left under: the morning of 21 August 1965 at Cape Kennedy, at liftoff (08:59:59.518 EST), which
 * is the hour of the Cape's own observation. The mission report gives the same observation as the launch area's: "2/10
 * covered, scattered at 8000 feet", calm, 87 °F with a dew point of 74 °F (12.2). A hot, still, humid summer morning; two
 * days before, thunderstorms over the pad had cancelled the first try. The README has it in words ("The weather").
 */
export const WEATHER: DayWeather = {
  observed: {
    where: 'Cape Kennedy: the Skid Strip at liftoff',
    at: '1965-08-21T14:00:00Z',
    source: `${ISD}, ${HOUR}; ${GV}`,
  },
  middle: {
    kind: 'altocumulus',
    cover: {
      value: 0.2,
      confidence: 'documented',
      source: `${GV}: "2/10 covered, scattered at 8000 feet", at 09:00 e.s.t.; the station’s total is "scattered" (${ISD}, ${HOUR}: GF1 02)`,
    },
    base: {
      value: 2440,
      confidence: 'documented',
      source: `${GV}: 8,000 ft. The station had one okta of altocumulus at 2,400 m at 07:00 EST`,
    },
    note: 'Which genus the report’s layer was is not said: altocumulus is the station’s at 07:00, the hour it last named one at that height',
  },
  high: {
    kind: 'cirrus',
    cover: {
      value: 0.15,
      confidence: 'estimated',
      source:
        `one okta of cirrus at 07:00 EST and two at 10:00 (${ISD}: documented for those hours); none named at 09:00, whose total is ` +
        '"scattered". NASA S65-49568, the erector going down that morning, has thin streaks of cirrus in a blue sky. A sixth and a little less is taken',
    },
    base: {
      value: 10_000,
      confidence: 'estimated',
      source: 'not recorded (the station codes it as high, with no height): where cirrus lies over Florida in summer',
    },
    depth: { value: 0.2, confidence: 'estimated', source: 'not recorded: thin streaks, through which the Sun shines' },
  },
  wind: {
    from: {
      value: 90,
      confidence: 'estimated',
      source: `calm at 09:00 EST (${ISD}, ${HOUR}: coded C, no direction; ${GV}: "calm"). What air there was, from the east, as the station had it at 07:00 (1.0 m/s) and Patrick Air Force Base at 09:00 (70°, 3.6 m/s)`,
    },
    speed: {
      value: 0.3,
      confidence: 'estimated',
      source: `calm (${ISD}, ${HOUR}, and at 08:00 and 10:00 too; ${GV}: "calm"), which an observer reports for under a knot, 0.5 m/s: 0.3 m/s taken, so that the day's hours have a wind to turn and scale (viewer/day.ts)`,
    },
  },
  visibility: {
    value: 25_000,
    confidence: 'estimated',
    source:
      `at the station’s 16 km limit (${ISD}: documented); "10" miles in the mission report (${GV}). How far past it is not ` +
      'recorded: 25 km taken, a still and humid air (a dew point of 23.3 °C under 30.5 °C at the station)',
  },
  haze: {
    value: 1500,
    confidence: 'estimated',
    source: 'not recorded: a humid summer morning with no wind to clear it; the haze is taken to fall off over a kilometre and a half',
  },
  // the air over the pad and the surface's hours round liftoff: ERA5's (aloft.ts, tools/era5-aloft.mjs). The mission
  // report's Table 12.2-I and Figure 12.2-1 have the launch area's air at 14:00 G.m.t. and are given in the README
  aloft: ALOFT,
  hours: HOURS,
};
