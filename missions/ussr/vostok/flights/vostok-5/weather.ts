import { ALOFT, HOURS } from './aloft.ts';
import type { DayWeather } from '../../../../../src/types.ts';

const ISD = 'NOAA Integrated Surface Database';
const KAZALY = `${ISD}, station 35849099999 (Kazaly, that is Kazalinsk: 45.77° N 62.12° E, 97 km west of Site 1)`;
const ZHOSALY = `${ISD}, station 35953099999 (Zhosaly, that is Dzhusaly: 45.50° N 64.08° E, 74 km south-east of Site 1)`;
const ARALSK = `${ISD}, station 35746099999 (Aralsk: 46.78° N 61.67° E, 157 km north-west of Site 1)`;
const POOL = 'TASS’s pool at the pad, in «Заря Востока» (Tbilisi), 16 June 1963';

/**
 * The weather Vostok 5 stood under: the afternoon of 14 June 1963 at Tyuratam, at liftoff (14:58:58 Moscow time, 11:58:58
 * UTC). **No observation made at the range has been read**: Kamanin, at the pad that morning, has only «просмотрели карты и
 * послушали метеорологов. Погода на полигоне и в возможных районах приземления благоприятствовала старту». What there is, is the three-hourly reports of the
 * stations along the railway, decoded as Vostok 1's and Vostok 2's were, and the press at the pad, and they agree: a still,
 * hot, almost clear afternoon after several days of dry, sandy wind: «в синеве неба редкие облачка. Палит солнце», a
 * few small clouds in the blue of the sky, the Sun scorching (TASS's pool at the pad, «Заря Востока», 16 June 1963).
 */
export const WEATHER: DayWeather = {
  observed: {
    where: 'Dzhusaly, 74 km south-east of Site 1: the nearer station with a report at the hour (Kazalinsk has none at 12:00 UTC)',
    at: '1963-06-14T12:00:00Z',
    source: `${ZHOSALY}, 12:00 UTC; ${POOL}`,
  },
  // no low cloud: Zhosaly codes CL 0 at 09:00 and 12:00 UTC, Kazaly and Aralsk at every hour of the day
  middle: {
    kind: 'altocumulus',
    cover: {
      value: 0.25,
      confidence: 'documented',
      source: `${ZHOSALY}, 12:00 UTC: two oktas, all of them middle cloud (CL 0, CM 8, CH 0); two oktas there at 09:00 too. The pool’s «редкие облачка»`,
    },
    base: {
      value: 4000,
      confidence: 'estimated',
      source:
        'not reported (the station gives no base for middle cloud): 4,000 m taken, about the middle of where altocumulus floccus lies over the steppe in summer',
    },
    note:
      'Coded CM 8, altocumulus castellanus or floccus: tufts, which is the pool’s «редкие облачка», a few small clouds. Kazalinsk, 97 km west, had one okta of dense cirrus ' +
      `at 09:00 UTC and a clear sky at 15:00 (${KAZALY}); Aralsk one okta of cirrus at 12:00 (${ARALSK}). Only the nearer station at the hour is drawn.`,
  },
  wind: {
    from: {
      value: 80,
      confidence: 'derived',
      source: `${ZHOSALY}, 12:00 UTC: 090°; ${KAZALY}, 09:00 UTC: 070° (15:00 UTC: 230° at 1 m/s, calm by evening). From the east, between the two; at the site not measured`,
    },
    speed: {
      value: 2.1,
      confidence: 'derived',
      source: `${ZHOSALY}, 12:00 UTC, and ${KAZALY}, 09:00 UTC: 2.1 m/s at both; calm at Kazalinsk at 06:00 UTC. The pool has the day still after days of wind`,
    },
  },
  visibility: {
    value: 50_000,
    confidence: 'estimated',
    source: `50 km at Zhosaly and Kazaly at 09:00 and 12:00 UTC (${ISD}), the furthest either reports: past it not known`,
  },
  haze: {
    value: 1500,
    confidence: 'estimated',
    source:
      'not recorded: the dry air of the steppe, taken as Vostok 1’s and 2’s, to thin over 1.5 km. Dust had blown for days before; the pool calls the day still',
  },
  // the air over the pad and the surface's hours round liftoff: ERA5's (aloft.ts, tools/era5-aloft.mjs); a sounding of the
  // record's, when one is read, goes here in their place
  aloft: ALOFT,
  hours: HOURS,
};
