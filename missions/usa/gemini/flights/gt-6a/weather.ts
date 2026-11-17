import { ALOFT, HOURS } from './aloft.ts';
import type { DayWeather } from '../../../../../src/types.ts';

const ISD = 'NOAA Integrated Surface Database, station 747940-12868 (Cape Kennedy AFS: the Skid Strip, 2.7 km south of the pad)';
const HOUR = '09:00 EST (14:00 UTC), 15 December 1965';

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
};
