import { assumed, estimated } from '../../../../../src/measure.ts';
import type { DayWeather } from '../../../../../src/types.ts';
import { ALOFT, HOURS } from './aloft.ts';

const ISD = 'NOAA Integrated Surface Database';
const ZHOSALY = `${ISD}, station 35953099999 (Zhosaly, that is Dzhusaly: 45.50° N 64.08° E, 74 km south-east of Site 1)`;
const KAZALY = `${ISD}, station 35849099999 (Kazaly, that is Kazalinsk: 45.77° N 62.12° E, 97 km west of Site 1)`;
const KZYLORDA = `${ISD}, station 38062099999 (Kzyl-Orda: 44.77° N 65.53° E, 214 km south-east of Site 1)`;
const HOUR = '09:00 UTC on 2 December 1974';

/**
 * The weather Soyuz 16 stood under: the middle of the day on 2 December 1974 at Tyuratam, at liftoff (12:40 Moscow time,
 * 09:40 UTC). **No observation made at the range has been read.** The stations either side agree on a clear, hard winter day:
 * no cloud at any of them from 03:00 to 18:00 UTC, −10 to −18 °C, and a strong east-north-east wind, strongest at Dzhusaly.
 */
export const WEATHER: DayWeather = {
  observed: {
    where: 'Dzhusaly, 74 km south-east of Site 1: the nearest station, 40 minutes before liftoff',
    at: '1974-12-02T09:00:00Z',
    source: `${ZHOSALY}, 03:00 to 18:00 UTC; ${KAZALY} and ${KZYLORDA}, 09:00 UTC`,
  },
  // no cloud: Zhosaly, Kazaly, Kzyl-Orda and Aralsk report a clear sky (no oktas) at 09:00 UTC
  wind: {
    from: assumed(70, `${ZHOSALY}, ${HOUR}; 070° from 06:00 to 12:00. ${KAZALY} 070°, ${KZYLORDA} 050°. At the site not measured`),
    speed: assumed(13, `${ZHOSALY}, ${HOUR}: 13 m/s (10 at 03:00 and 12:00); ${KZYLORDA} 11 m/s, ${KAZALY} 8 m/s`),
  },
  visibility: estimated(
    50000,
    `50 km at Zhosaly and Kzyl-Orda at ${HOUR} (${ISD}), the furthest they report; Kazaly 20 km, its own furthest mark. 50 km taken`,
  ),
  haze: estimated(
    1500,
    'not recorded: the dry winter air of the steppe, to thin over 1.5 km. Drifting snow in the wind is not recorded and not drawn',
  ),
  // the air over the pad and the surface's hours round liftoff: ERA5's (aloft.ts, tools/era5-aloft.mjs)
  aloft: ALOFT,
  hours: HOURS,
};
