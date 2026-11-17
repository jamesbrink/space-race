import { derived } from '../../../../../src/measure.ts';
import type { DayWeather } from '../../../../../src/types.ts';
import { ALOFT, HOURS } from './aloft.ts';

const ISD = 'NOAA Integrated Surface Database, station 747940-12868 (Cape Kennedy AFS: the Skid Strip, 2.7 km south of the pad)';
const HOUR = '10:00 EST (15:00 UTC), 3 June 1965';
const GIV = 'the Gemini IV mission report (MSC-G-R-65-3), 12.2';

const ERA5_WAVES =
  'ERA5 (ECMWF), its wave model at 17:00 UTC on 7 June 1965, between the four cells round 27.73 N, 74.23 W (the landing point as the recovery ship reported it, 27°44′ N 74°14′ W, the Gemini IV mission report, 4.1, as the README and flight.ts give it; landed 97 h 56 min 12 s after liftoff (flight.ts), 17:12:12 UTC), read from the public ARCO-ERA5 store by tools/era5.mjs `fieldAt`; 18:00 differs by under 0.07 m, 0.15 s and 4°';

/**
 * The sea where it came down, twelve minutes after the hour: ERA5's waves there, a swell of 1.2 m from the east-south-east
 * and a smaller sea raised by the wind from the south-east. Nothing the flight's files quote speaks of the sea.
 */
const SEA: DayWeather['sea'] = {
  observed: { where: 'the landing area, 27.73 N, 74.23 W', at: '1965-06-07T17:00:00Z', source: ERA5_WAVES },
  trains: [
    {
      label: 'the swell',
      height: derived(1.167, `${ERA5_WAVES}: significant height of the total swell`),
      period: derived(6.671, `${ERA5_WAVES}: mean period of the total swell`),
      from: derived(115.8, `${ERA5_WAVES}: mean direction of the total swell, coming from`),
    },
    {
      label: 'the wind’s waves',
      height: derived(0.469, `${ERA5_WAVES}: significant height of the wind waves`),
      period: derived(3.112, `${ERA5_WAVES}: mean period of the wind waves`),
      from: derived(136.1, `${ERA5_WAVES}: mean direction of the wind waves, coming from`),
    },
  ],
};

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
  sea: SEA,
};
