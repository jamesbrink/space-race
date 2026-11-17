import { derived } from '../../../../../src/measure.ts';
import type { DayWeather } from '../../../../../src/types.ts';
import { ALOFT, HOURS } from './aloft.ts';

const ISD = 'NOAA Integrated Surface Database, station 74794012868 (Cape Canaveral: the Skid Strip, 2.1 km south-west of the pad)';
const HOUR = '08:00 EST (13:00 UTC), 15 May 1963';

const ERA5_WAVES =
  'ERA5 (ECMWF), its wave model at 23:00 UTC on 16 May 1963, between the four cells round 27.38 N, 176.59 W (where the recovery ship had it, 27°22.6′ N 176°35.3′ W, NASA SP-45, Table 8-III, as the README and flight.ts give it; landed 34 h 19 min 49 s after liftoff (flight.ts), 23:24:02 UTC), read from the public ARCO-ERA5 store by tools/era5.mjs `fieldAt`; 17 May 00:00 differs by under 0.02 m, 0.05 s and 0.2°';

/**
 * The sea where it came down, twenty-four minutes after the hour: ERA5's waves there, a swell of 1.5 m from the east and a
 * sea of 1.3 m raised by the wind from the east-north-east. The ground told the pilot of waves of 5 to 6 ft in the landing
 * area (the README, at 34:13:58; NASA SP-45, p. 441); ERA5's two together come to about 2 m.
 */
const SEA: DayWeather['sea'] = {
  observed: { where: 'the landing area, 27.38 N, 176.59 W', at: '1963-05-16T23:00:00Z', source: ERA5_WAVES },
  trains: [
    {
      label: 'the swell',
      height: derived(1.475, `${ERA5_WAVES}: significant height of the total swell`),
      period: derived(7.867, `${ERA5_WAVES}: mean period of the total swell`),
      from: derived(95.8, `${ERA5_WAVES}: mean direction of the total swell, coming from`),
    },
    {
      label: 'the wind’s waves',
      height: derived(1.283, `${ERA5_WAVES}: significant height of the wind waves`),
      period: derived(4.812, `${ERA5_WAVES}: mean period of the wind waves`),
      from: derived(75.1, `${ERA5_WAVES}: mean direction of the wind waves, coming from`),
    },
  ],
};

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
  sea: SEA,
};
