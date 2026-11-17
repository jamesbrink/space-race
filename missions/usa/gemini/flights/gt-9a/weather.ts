import { ALOFT, HOURS } from './aloft.ts';
import type { DayWeather } from '../../../../../src/types.ts';

const ISD = 'NOAA Integrated Surface Database, station 747940-12868 (Cape Kennedy AFS: the Skid Strip, 2.7 km south of the pad)';
const GIX = 'the Gemini IX-A mission report (MSC-G-R-66-6), 12.2, p. 12-13';

/**
 * The weather Gemini 9A left under: the morning of 3 June 1966 at Cape Kennedy, at liftoff (08:39:33 EST). The mission
 * report has the launch area's observation at 8:40: "Scattered clouds, 3500 feet; stratocumulus, 2/10 covered; haze
 * aloft", the wind 80° at 16 knots, 10 miles (12.2). A fresh east wind off the sea, a few low heaps, and haze; the
 * Cape's station has the same through the hours either side. The README has it in words ("The weather").
 */
export const WEATHER: DayWeather = {
  observed: {
    where: 'Cape Kennedy: the launch area at liftoff',
    at: '1966-06-03T13:40:00Z',
    source: `${GIX}: "Surface weather conditions in the launch area at 8:40 a.m. e.s.t."; ${ISD}, the hours either side`,
  },
  low: {
    kind: 'cumulus',
    cover: { value: 0.2, confidence: 'documented', source: `${GIX}: "Scattered clouds, 3500 feet; stratocumulus, 2/10 covered"` },
    base: {
      value: 1070,
      confidence: 'documented',
      source: `${GIX}: 3,500 ft. The station had one okta of cumulus at 1,050 m at 07:00 EST (${ISD})`,
    },
    depth: {
      value: 400,
      confidence: 'estimated',
      source: 'not recorded: the report calls them stratocumulus, which the viewer has no form for; drawn as shallow heaps, flattened',
    },
    size: {
      value: 1200,
      confidence: 'estimated',
      source: 'not recorded: across a cloud, as stratocumulus cells in a sea breeze are photographed',
    },
    wind: {
      from: { value: 80, confidence: 'documented', source: `${GIX}: the wind at the ground, 80°, taken for the cloud’s height too` },
      speed: {
        value: 9.5,
        confidence: 'estimated',
        source: 'the wind at the ground was 8.2 m/s (below): taken a little stronger at the bases',
      },
    },
  },
  wind: {
    from: { value: 80, confidence: 'documented', source: `${GIX}: 80°. The station had 90° at 08:00 EST and 80° at 09:00 (${ISD})` },
    speed: {
      value: 8.2,
      confidence: 'documented',
      source: `${GIX}: 16 knots; the station 7.2 m/s at 08:00 EST and 8.2 at 09:00 (${ISD})`,
    },
  },
  visibility: {
    value: 25_000,
    confidence: 'estimated',
    source: `"10" miles (${GIX}), the station’s 16 km limit every hour (${ISD}): how far past it is not recorded. 25 km taken: the report has "haze aloft"`,
  },
  haze: {
    value: 1800,
    confidence: 'estimated',
    source: `"haze aloft" (${GIX}): the haze is taken to reach up past the clouds’ bases, falling off over nearly two kilometres`,
  },
  // the air over the pad and the surface's hours round liftoff: ERA5's (aloft.ts, tools/era5-aloft.mjs)
  aloft: ALOFT,
  hours: HOURS,
};
