import { doc, estimated } from '../../../../../src/measure.ts';
import type { DayWeather } from '../../../../../src/types.ts';
import { ALOFT, HOURS } from './aloft.ts';

const ISD = 'NOAA Integrated Surface Database';
const ZHOSALY = `${ISD}, station 35953099999 (Zhosaly, that is Dzhusaly: 45.50° N 64.08° E, 68 km south-east of Site 31)`;
const KAZALY = `${ISD}, station 35849099999 (Kazaly, that is Kazalinsk: 45.77° N 62.12° E, 115 km west of Site 31)`;
const KZYLORDA = `${ISD}, station 38062099999 (Kzyl-Orda: 44.77° N 65.53° E, 206 km south-east of Site 31)`;
const KAMANIN = 'Kamanin’s diary, 4 and 14 January 1969 («Скрытый космос», book 4; militera.lib.ru/db/kamanin_np/69.html)';
const HOUR = '06:00 UTC on 14 January 1969';

/**
 * The weather Soyuz 4 stood under: the morning of 14 January 1969 at Site 31, at liftoff (10:30 Moscow time, 07:30 UTC),
 * the day after a scrub. **No observation made at the range at the hour has been read.** Kamanin's diary has a strong
 * anticyclone over Kazakhstan for days and 25 to 30 degrees of frost (4 January), and the evening after the launch "wonderful,
 * the temperature up to −7"; of the launch's own hour nothing. The stations either side agree: a clear, cold, still morning,
 * one okta of cirrus at 06:00 UTC and none at 09:00.
 */
export const WEATHER: DayWeather = {
  observed: {
    where:
      'Dzhusaly, 68 km south-east of Site 31: the nearest station, at the hour and a half before liftoff (09:00, as far after, was clear)',
    at: '1969-01-14T06:00:00Z',
    source: `${ZHOSALY}, 06:00 and 09:00 UTC; ${KAZALY}, 06:00 and 09:00 UTC; ${KZYLORDA}, 06:00 UTC; ${KAMANIN}`,
  },
  // no low or middle cloud: CL 0 and CM 0 at Zhosaly and Kazaly at 06:00 and 09:00 UTC
  high: {
    kind: 'cirrus',
    cover: doc(
      0.125,
      `${ZHOSALY}, ${HOUR}: one okta, all of it high cloud, coded CH 1 (cirrus in filaments); ${KAZALY} the same. Both clear at 09:00`,
    ),
    base: estimated(9000, 'not measured: neither station gives a base for its high cloud; the Vostoks’ 9,000 m taken'),
    depth: estimated(0.2, 'not recorded: a few filaments, thin'),
  },
  wind: {
    from: doc(90, `${ZHOSALY}, ${HOUR}; 050° at 09:00. ${KAZALY}: 020° at 06:00, 050° at 09:00. At the site not measured`),
    speed: doc(4.1, `${ZHOSALY}, ${HOUR}: 4.1 m/s, the same at 09:00 and at Kazaly`),
  },
  visibility: estimated(50000, `50 km at Zhosaly and Kazaly at ${HOUR} (${ISD}), the furthest either reports. Taken as 50 km`),
  haze: estimated(1500, 'not recorded: the dry air of the steppe, taken as the Vostoks’ and Voskhods’, to thin over 1.5 km'),
  // the air over the pad and the surface's hours round liftoff: ERA5's (aloft.ts, tools/era5-aloft.mjs)
  aloft: ALOFT,
  hours: HOURS,
};
