import { ALOFT, HOURS } from './aloft.ts';
import type { DayWeather } from '../../../../../src/types.ts';

const ISD = 'NOAA Integrated Surface Database, station 747940-12868 (Cape Kennedy AFS: the Skid Strip, 2.7 km south of the pad)';
const HOUR = '10:00 EST (15:00 UTC), 3 June 1965';
const GIV = 'the Gemini IV mission report (MSC-G-R-65-3), 12.2';

/**
 * The weather Gemini 4 left under: the morning of 3 June 1965 at Cape Kennedy, at the Cape's observation sixteen minutes
 * before liftoff (10:15:59.562 EST). Nothing in the sky: the station reports no cloud at any hour from 08:00 EST to 14:00,
 * and the mission report has "Clear skies" and "Visibility was unlimited in all directions from the Cape" (12.2). The
 * wind was light, off the sea from the east-north-east. The README has it in words ("The weather").
 */
export const WEATHER: DayWeather = {
  observed: {
    where: 'Cape Kennedy: the Skid Strip, sixteen minutes before liftoff',
    at: '1965-06-03T15:00:00Z',
    source: `${ISD}, ${HOUR}; ${GIV}`,
  },
  wind: {
    from: {
      value: 70,
      confidence: 'documented',
      source: `${ISD}, ${HOUR}: from 70 degrees; 30 degrees an hour before, 90 an hour after. The mission report has 060 (${GIV})`,
    },
    speed: {
      value: 2.6,
      confidence: 'documented',
      source: `${ISD}, ${HOUR}: 2.6 m/s (5 knots), and the same at 11:00. The mission report has 7 knots (${GIV})`,
    },
  },
  visibility: {
    value: 50_000,
    confidence: 'estimated',
    source:
      `at the station’s 16 km limit at every hour of the morning (${ISD}: documented); "Visibility was unlimited in all ` +
      `directions from the Cape" (${GIV}). 50 km taken: a dry air for June (a dew point of 13.9 °C under 26.1 °C at the station)`,
  },
  haze: {
    value: 1000,
    confidence: 'estimated',
    source: 'not recorded: a clear, dry morning with a light wind off the sea; the haze is taken to fall off over about a kilometre',
  },
  // the air over the pad and the surface's hours round liftoff: ERA5's (aloft.ts, tools/era5-aloft.mjs)
  aloft: ALOFT,
  hours: HOURS,
};
