import { doc, estimated } from '../../../../../src/measure.ts';
import type { DayWeather } from '../../../../../src/types.ts';
import { ALOFT, HOURS } from './aloft.ts';

const ISD = 'NOAA Integrated Surface Database';
const ZHOSALY = `${ISD}, station 35953099999 (Zhosaly, that is Dzhusaly: 45.50° N 64.08° E, 74 km south-east of Site 1)`;
const KAZALY = `${ISD}, station 35849099999 (Kazaly, that is Kazalinsk: 45.77° N 62.12° E, 97 km west of Site 1)`;
const KZYLORDA = `${ISD}, station 38062099999 (Kzyl-Orda: 44.77° N 65.53° E, 214 km south-east of Site 1)`;
const HOUR = '12:00 UTC on 27 September 1973';

/**
 * The weather Soyuz 12 stood under: the afternoon of 27 September 1973 at Tyuratam, at liftoff (15:18:16 Moscow time,
 * 12:18:16 UTC). **No observation made at the range has been read.** The stations either side agree on a grey day: the whole
 * sky under stratocumulus from morning to evening, about 7 °C, a moderate south-westerly wind at Dzhusaly; by 18:00 to 21:00
 * UTC, rain at Kazalinsk and Aralsk under altostratus.
 */
export const WEATHER: DayWeather = {
  observed: {
    where: 'Dzhusaly, 74 km south-east of Site 1: the nearest station, 18 minutes before liftoff',
    at: '1973-09-27T12:00:00Z',
    source: `${ZHOSALY}, 06:00 to 21:00 UTC; ${KAZALY} and ${KZYLORDA}, 12:00 UTC`,
  },
  middle: {
    kind: 'stratocumulus',
    cover: doc(
      1,
      `${ZHOSALY}, ${HOUR}: eight oktas of low cloud, coded CL 5 (stratocumulus), the same from 06:00 to 18:00; ${KAZALY} and ${KZYLORDA} eight oktas of stratocumulus too`,
    ),
    base: doc(
      450,
      `${ZHOSALY}, ${HOUR}: 450 m, the database's figure for the code's class (300 to 600 m), not an instrument's (its cloud layer group gives 420 m); ${KZYLORDA} 800 m and ${KAZALY} 1,250 m`,
    ),
    note: 'Coded CL 5, stratocumulus, eight oktas: a grey overcast. The thickness of the deck is not recorded.',
  },
  wind: {
    from: doc(200, `${ZHOSALY}, ${HOUR}; 200° from 09:00 to 15:00. ${KZYLORDA} 230°, ${KAZALY} 270°. At the site not measured`),
    speed: doc(6, `${ZHOSALY}, ${HOUR}: 6 m/s; ${KZYLORDA} 4 m/s, ${KAZALY} 1 m/s`),
  },
  visibility: estimated(
    50000,
    `50 km at Zhosaly at ${HOUR} (${ISD}), the furthest it reports; Kazaly 20 km, its own furthest mark. 50 km taken`,
  ),
  haze: estimated(1000, 'not recorded: the air under a low overcast, to thin over 1 km'),
  // the air over the pad and the surface's hours round liftoff: ERA5's (aloft.ts, tools/era5-aloft.mjs)
  aloft: ALOFT,
  hours: HOURS,
};
