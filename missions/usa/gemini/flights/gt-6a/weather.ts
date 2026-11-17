import { derived } from '../../../../../src/measure.ts';
import type { DayWeather } from '../../../../../src/types.ts';
import { ALOFT, HOURS } from './aloft.ts';

const ISD = 'NOAA Integrated Surface Database, station 747940-12868 (Cape Kennedy AFS: the Skid Strip, 2.7 km south of the pad)';
const HOUR = '09:00 EST (14:00 UTC), 15 December 1965';

const ERA5_WAVES =
  'ERA5 (ECMWF), its wave model at 15:00 UTC on 16 December 1965, between the four cells round 23.58 N, 67.83 W (the landing point, 23°35′ N 67°50′ W, NASA SP-4002, as the README and flight.ts give it; landed 25 h 51 min 24 s after liftoff (flight.ts), 15:28:50 UTC), read from the public ARCO-ERA5 store by tools/era5.mjs `fieldAt`; 16:00 differs by under 0.02 m, 0.06 s and 5°';

/**
 * The sea where it came down, twenty-nine minutes after the hour: ERA5's waves there, a swell of 1.1 m from the
 * east-north-east and a small sea raised by the wind from the north-north-east. Nothing the flight's files quote speaks of
 * the sea.
 */
const SEA: DayWeather['sea'] = {
  observed: { where: 'the landing area, 23.58 N, 67.83 W', at: '1965-12-16T15:00:00Z', source: ERA5_WAVES },
  trains: [
    {
      label: 'the swell',
      height: derived(1.118, `${ERA5_WAVES}: significant height of the total swell`),
      period: derived(7.337, `${ERA5_WAVES}: mean period of the total swell`),
      from: derived(57.7, `${ERA5_WAVES}: mean direction of the total swell, coming from`),
    },
    {
      label: 'the wind’s waves',
      height: derived(0.211, `${ERA5_WAVES}: significant height of the wind waves`),
      period: derived(2.26, `${ERA5_WAVES}: mean period of the wind waves`),
      from: derived(28.9, `${ERA5_WAVES}: mean direction of the wind waves, coming from`),
    },
  ],
};

/**
 * The weather Gemini 6A left under: the morning of 15 December 1965 at Cape Kennedy, at the Cape's observation 23 minutes
 * after liftoff (08:37:26.471 EST). The mission report, which would have the launch area's own, has not been found. The
 * station had patches of shallow fog at dawn, a damp air (a dew point a degree under the air), the sky at its highest
 * class with no ceiling, a thin high sheet over a little altocumulus, breaking by 09:00 and cirrus by 10:00, and a light
 * wind from the south-south-west. The README has it in words ("The weather").
 */
export const WEATHER: DayWeather = {
  observed: {
    where: 'Cape Kennedy: the Skid Strip, 23 minutes after liftoff',
    at: '1965-12-15T14:00:00Z',
    source: `${ISD}, ${HOUR}, with its hours either side`,
  },
  middle: {
    kind: 'altocumulus',
    cover: {
      value: 0.25,
      confidence: 'estimated',
      source: `two oktas of altocumulus at 07:00 EST (${ISD}: documented for that hour), the last hour before liftoff a layer was named; taken for liftoff`,
    },
    base: { value: 2100, confidence: 'documented', source: `${ISD}, 07:00 EST: 2,100 m` },
  },
  high: {
    kind: 'cirrostratus',
    cover: {
      value: 0.7,
      confidence: 'estimated',
      source:
        `eight oktas of cirrostratus at 07:00 EST and five of cirrus at 10:00 (${ISD}: documented for those hours); the total at its ` +
        'highest class with no ceiling at 08:00 and one class lower at 09:00. Seven tenths taken, the sheet breaking',
    },
    base: {
      value: 9000,
      confidence: 'estimated',
      source: 'not recorded (the station codes it as high, with no height): where cirrostratus usually lies over Florida in winter',
    },
    depth: { value: 0.8, confidence: 'estimated', source: 'not recorded: a thinning sheet' },
  },
  wind: {
    from: {
      value: 200,
      confidence: 'documented',
      source: `${ISD}, ${HOUR}: from 200 degrees; 210 degrees at 1.0 m/s at 08:00 and at 4.1 m/s at 10:00`,
    },
    speed: { value: 3.1, confidence: 'documented', source: `${ISD}, ${HOUR}: 3.1 m/s (6 knots)` },
  },
  visibility: {
    value: 11_200,
    confidence: 'documented',
    source: `${ISD}, ${HOUR}: 11.2 km, and at 08:00; 4.8 km at 07:00 in patches of shallow fog, 16 km by 10:00`,
  },
  haze: {
    value: 700,
    confidence: 'estimated',
    source:
      'not recorded: a damp morning after shallow fog, the air 20.5 °C with a dew point of 19.4 °C at 09:00; the haze is taken to lie low',
  },
  // the air over the pad and the surface's hours round liftoff: ERA5's (aloft.ts, tools/era5-aloft.mjs)
  aloft: ALOFT,
  hours: HOURS,
  sea: SEA,
};
