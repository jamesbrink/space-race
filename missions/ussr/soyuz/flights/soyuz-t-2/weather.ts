import { assumed, estimated } from '../../../../../src/measure.ts';
import type { DayWeather } from '../../../../../src/types.ts';
import { ALOFT, HOURS } from './aloft.ts';

const ISD = 'NOAA Integrated Surface Database';
const ZHOSALY = `${ISD}, station 35953099999 (Zhosaly, that is Dzhusaly: 45.50° N 64.08° E, 74 km south-east of Site 1)`;
const KAZALY = `${ISD}, station 35849099999 (Kazaly, that is Kazalinsk: 45.77° N 62.12° E, 97 km west of Site 1)`;
const KZYLORDA = `${ISD}, station 38062099999 (Kzyl-Orda: 44.77° N 65.53° E, 214 km south-east of Site 1)`;
const HOUR = '15:00 UTC on 5 June 1980';

/**
 * The weather Soyuz T-2 stood under: the late afternoon of 5 June 1980 at Tyuratam, at liftoff (17:19:30 Moscow time, 14:19:30
 * UTC). **No observation made at the range has been read.** The stations either side agree on a hot, cloudless day: no cloud at
 * Dzhusaly, Kazalinsk or Kzyl-Orda from 06:00 to 21:00 UTC, 28 to 31 °C in the afternoon, and a light easterly wind.
 */
export const WEATHER: DayWeather = {
  observed: {
    where: 'Dzhusaly, 74 km south-east of Site 1: the nearest station, at the hour nearest liftoff (41 minutes after it)',
    at: '1980-06-05T15:00:00Z',
    source: `${ZHOSALY}, 12:00 and 15:00 UTC; ${KAZALY} and ${KZYLORDA}, 12:00 and 15:00 UTC`,
  },
  // no cloud: Zhosaly, Kazaly and Kzyl-Orda report a clear sky (no oktas) at 12:00 and 15:00 UTC
  wind: {
    from: assumed(90, `${ZHOSALY}, ${HOUR}; 110° at 12:00. ${KAZALY} 090°, ${KZYLORDA} 070°. At the site not measured`),
    speed: assumed(3, `${ZHOSALY}, ${HOUR}: 3 m/s (5 at 12:00); ${KAZALY} 3 m/s, ${KZYLORDA} 4 m/s`),
  },
  visibility: estimated(
    50000,
    `50 km at Zhosaly and Kzyl-Orda at ${HOUR} (${ISD}), the furthest they report; Kazaly 20 km, its own furthest mark. 50 km taken`,
  ),
  haze: estimated(1500, 'not recorded: the dry air of the steppe, taken as the Vostoks’ and Voskhods’, to thin over 1.5 km'),
  // the air over the pad and the surface's hours round liftoff: ERA5's (aloft.ts, tools/era5-aloft.mjs)
  aloft: ALOFT,
  hours: HOURS,
};
