import { assumed, estimated } from '../../../../../src/measure.ts';
import type { DayWeather } from '../../../../../src/types.ts';
import { ALOFT, HOURS } from './aloft.ts';

const ISD = 'NOAA Integrated Surface Database';
const KAZALY = `${ISD}, station 35849099999 (Kazaly, that is Kazalinsk: 45.77° N 62.12° E, 97 km west of Site 1)`;
const ZHOSALY = `${ISD}, station 35953099999 (Zhosaly, that is Dzhusaly: 45.50° N 64.08° E, 74 km south-east of Site 1)`;
const KZYLORDA = `${ISD}, station 38062099999 (Kzyl-Orda: 44.77° N 65.53° E, 214 km south-east of Site 1)`;
const KAMANIN = 'Kamanin’s diary, 22 April 1971 («Скрытый космос», book 4; militera.lib.ru/db/kamanin_np/71.html)';
const HOUR = '00:00 UTC on 23 April 1971';

/**
 * The weather Soyuz 10 stood under: the night of 22 to 23 April 1971 at Tyuratam, at liftoff (02:54:06 Moscow time on the
 * 23rd, 23:54:06 UTC on the 22nd), in the dark. **No observation made at the range at the hour has been read.** Kamanin's
 * diary has the scrubbed attempt of the night before under rain and a strong wind at about 0 °C («снаружи лил дождь, дул
 * сильный ветер при нулевой температуре»), the cable mast held by frozen raindrops, and later that day «Дождь прекратился,
 * стало потеплее, но небо все еще хмурое». By the evening the stations either side were clear, and they were clear at the hour.
 */
export const WEATHER: DayWeather = {
  observed: {
    where: 'Kazalinsk, 97 km west of Site 1: the nearest station with a report at the hour, six minutes after liftoff',
    at: '1971-04-23T00:00:00Z',
    source: `${KAZALY}, 18:00 on the 22nd to 06:00 UTC; ${ZHOSALY}, 18:00 on the 22nd and 03:00 UTC; ${KZYLORDA}, 00:00 UTC; ${KAMANIN}`,
  },
  // no cloud: Kazaly, Zhosaly, Aralsk and Kzyl-Orda all report a clear sky (no oktas) from 18:00 on the 22nd to 03:00 UTC.
  // Kazaly codes fog at a distance (present weather 40) at 00:00, which is not drawn
  wind: {
    from: assumed(
      230,
      `${KAZALY}, ${HOUR}; Zhosaly 270° at 18:00 on the 22nd and calm at 03:00, Kzyl-Orda calm at 00:00. At the site not measured`,
    ),
    speed: assumed(3.1, `${KAZALY}, ${HOUR}: 3.1 m/s`),
  },
  visibility: estimated(
    50000,
    `50 km at Zhosaly at 18:00 on the 22nd and 03:00 UTC (${ISD}); Kazaly reports 20 km, its furthest mark. 50 km taken`,
  ),
  haze: estimated(1500, 'not recorded: the dry air of the steppe, taken as the Vostoks’ and Voskhods’, to thin over 1.5 km'),
  // the air over the pad and the surface's hours round liftoff: ERA5's (aloft.ts, tools/era5-aloft.mjs)
  aloft: ALOFT,
  hours: HOURS,
};
