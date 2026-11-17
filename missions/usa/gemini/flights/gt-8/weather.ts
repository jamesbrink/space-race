import { ALOFT, HOURS } from './aloft.ts';
import type { DayWeather } from '../../../../../src/types.ts';

const ISD = 'NOAA Integrated Surface Database, station 747940-12868 (Cape Kennedy AFS: the Skid Strip, 2.7 km south of the pad)';
const GVIII = 'the Gemini VIII mission report (MSC-G-R-66-4), 12.2, p. 12-15';

/**
 * The weather Gemini 8 left under: the late morning of 16 March 1966 at Cape Kennedy, at liftoff (11:41:02 EST). The
 * mission report has the launch area's observation at 11:41: "Low clouds, 3/10 covered; 3300 feet, scattered clouds;
 * high, thin, broken clouds, 6/10 covered", the wind 350° at 18 knots, 10 miles (12.2). A fresh north wind, a few small
 * cumulus and a thin high deck; the Cape's station has the same through the hours either side. The README has it in
 * words ("The weather").
 */
export const WEATHER: DayWeather = {
  observed: {
    where: 'Cape Kennedy: the launch area at liftoff',
    at: '1966-03-16T16:41:00Z',
    source: `${GVIII}: "Surface weather observations in the launch area at 11:41 a.m. e.s.t."; ${ISD}, the hours either side`,
  },
  low: {
    kind: 'cumulus',
    cover: { value: 0.3, confidence: 'documented', source: `${GVIII}: "Low clouds, 3/10 covered; 3300 feet, scattered clouds"` },
    base: {
      value: 1000,
      confidence: 'documented',
      source: `${GVIII}: 3,300 ft. The station had one okta of cumulus at 600 m at 10:00 EST (${ISD})`,
    },
    depth: {
      value: 500,
      confidence: 'estimated',
      source: 'not recorded: small fair-weather cumulus, flattened by a fresh wind under a high deck',
    },
    size: { value: 900, confidence: 'estimated', source: 'not recorded: across a cloud, as small fair-weather cumulus are photographed' },
    wind: {
      from: { value: 350, confidence: 'documented', source: `${GVIII}: the wind at the ground, 350°, taken for the cloud’s height too` },
      speed: {
        value: 11,
        confidence: 'estimated',
        source: 'the wind at the ground was 9.3 m/s (below): taken a little stronger at the bases',
      },
    },
  },
  high: {
    kind: 'cirrostratus',
    cover: {
      value: 0.6,
      confidence: 'documented',
      source: `${GVIII}: "high, thin, broken clouds, 6/10 covered"; five oktas of cirrus at 10:00 EST (${ISD})`,
    },
    base: {
      value: 9000,
      confidence: 'estimated',
      source: 'not recorded (the station codes it as high, with no height): where a high deck usually lies over Florida in March',
    },
    depth: { value: 0.5, confidence: 'estimated', source: `not recorded: "thin" (${GVIII}), the Sun through it` },
    note: 'The report calls it high and thin; the station names the deck of an hour before cirrus. Drawn as a thin sheet',
  },
  wind: {
    from: {
      value: 350,
      confidence: 'documented',
      source: `${GVIII}: 350°. The station had 360° at 11:00 and 12:00 EST (${ISD})`,
    },
    speed: {
      value: 9.3,
      confidence: 'documented',
      source: `${GVIII}: 18 knots; the station 9.3 m/s at 11:00 EST and 10.3 at 12:00 (${ISD})`,
    },
  },
  visibility: {
    value: 40_000,
    confidence: 'estimated',
    source: `"10" miles (${GVIII}), the station’s 16 km limit at every hour of the morning (${ISD}): how far past it is not recorded. 40 km taken: a dry north wind (a dew point of 59 °F under 70 °F)`,
  },
  haze: {
    value: 1100,
    confidence: 'estimated',
    source:
      'not recorded: a fresh wind mixing the air up to the cumulus’ bases at a kilometre; the haze is taken to fall off over about that',
  },
  // the air over the pad and the surface's hours round liftoff: ERA5's (aloft.ts, tools/era5-aloft.mjs)
  aloft: ALOFT,
  hours: HOURS,
};
