import { ALOFT, HOURS } from './aloft.ts';
import type { DayWeather } from '../../../../../src/types.ts';

const ISD = 'NOAA Integrated Surface Database, station 74794012868 (Cape Canaveral: the Skid Strip, 2.1 km south-west of the pad)';
const HOUR = '08:00 EST (13:00 UTC), 15 May 1963';

/**
 * The weather Faith 7 left under: the morning of 15 May 1963 at Cape Canaveral, at the Cape's observation four minutes
 * before liftoff (08:04:13 EST). No figure of the weather at the pad is in the flight's own record that has been read;
 * the station's is the record: the sky scattered with no ceiling and no layer coded, 12.8 km of visibility, the wind from
 * 230 degrees at 3.6 m/s, 23.3 C with a dew point of 18.3. An hour before, one okta of cirrus; two hours after, two oktas
 * of altocumulus at 3,000 m. "All systems are go, and the weather is good" (Walter Williams the night before: This New
 * Ocean, p. 494); "the sun literally smiled on MA-9" (p. 503). NASA S63-07602, the liftoff from the west, has a pale, hazy
 * sky. The README has it in words ("The sky at liftoff").
 */
export const WEATHER: DayWeather = {
  observed: {
    where: 'Cape Canaveral: the Skid Strip, four minutes before liftoff',
    at: '1963-05-15T13:00:00Z',
    source: `${ISD}, ${HOUR}`,
  },
  high: {
    kind: 'cirrus',
    cover: {
      value: 0.125,
      confidence: 'documented',
      source: `${ISD}, 07:00 EST: one okta of cirrus (genus code 00), documented for that hour and taken for liftoff; "scattered" in all at ${HOUR}, with no layer coded`,
    },
    base: {
      value: 9500,
      confidence: 'estimated',
      source: 'not recorded (the station codes its height as unlimited): where cirrus usually lies over Florida in May',
    },
    depth: {
      value: 0.2,
      confidence: 'estimated',
      source: 'not recorded: thin fibres; the sky pale and hazy behind the vehicle in NASA S63-07602',
    },
  },
  wind: {
    from: { value: 230, confidence: 'documented', source: `${ISD}, ${HOUR}: from 230 degrees; 230 at 07:00 EST, 270 at 09:00` },
    speed: {
      value: 3.6,
      confidence: 'documented',
      source: `${ISD}, ${HOUR}: 3.6 m/s (7 knots); 2.1 at 07:00 EST, 2.6 at 09:00. No gust is recorded`,
    },
  },
  visibility: {
    value: 12_800,
    confidence: 'documented',
    source: `${ISD}, ${HOUR}: 12.8 km, under the station's 16 km limit; 16 km at 07:00 and at 09:00 EST`,
  },
  haze: {
    value: 1000,
    confidence: 'estimated',
    source:
      'not recorded: a morning with the visibility under the station’s limit and a pale sky in the photographs of the liftoff; taken to thin over about a kilometre',
  },
  // the air over the pad and the surface's hours round liftoff: ERA5's (aloft.ts, tools/era5-aloft.mjs)
  aloft: ALOFT,
  hours: HOURS,
};
