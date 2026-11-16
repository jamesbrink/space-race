import { ALOFT, HOURS } from './aloft.ts';
import type { DayWeather } from '../../../../../src/types.ts';

const ISD = 'NOAA Integrated Surface Database';
const KAZALY = `${ISD}, station 35849099999 (Kazaly, that is Kazalinsk: 45.77° N 62.12° E, 97 km west of Site 1)`;
const ZHOSALY = `${ISD}, station 35953099999 (Zhosaly, that is Dzhusaly: 45.50° N 64.08° E, 74 km south-east of Site 1)`;
const SHIELI = `${ISD}, station 38069099999 (Shieli: 44.17° N 66.75° E, 330 km south-east of Site 1)`;
const HOUR = '09:00 UTC on 16 June 1963';

/**
 * The weather Vostok 6 stood under: the middle of the day on 16 June 1963 at Tyuratam, at liftoff (12:29:52 Moscow time,
 * 09:29:52 UTC). **No observation made at the range has been read.** What there is, is the three-hourly reports of the
 * stations along the railway, decoded as Vostok 1's and Vostok 2's were, and they agree: a hot, bright day, 34 °C by the
 * hour, an east wind of 6 to 10 m/s, a little fair-weather cumulus and a little high cloud. The press at the pad saw the
 * rocket "shining in the Sun" and going "into the blue of the sky" (TASS's pool, «Заря Востока», 18 June 1963, as the
 * README translates it); the colour photograph of her report at the pad has hard sunlight and short shadows.
 */
export const WEATHER: DayWeather = {
  observed: {
    where: 'Dzhusaly, 74 km south-east of Site 1: the nearer station with a whole report at the hour',
    at: '1963-06-16T09:00:00Z',
    source: `${ZHOSALY}, ${HOUR}`,
  },
  low: {
    kind: 'cumulus',
    cover: { value: 0.25, confidence: 'documented', source: `${ZHOSALY}, ${HOUR}: two oktas of low cloud, coded CL 2` },
    base: {
      value: 1750,
      confidence: 'documented',
      source: `${ZHOSALY}, ${HOUR}: 1,750 m, the database’s figure for the code’s class (1,500 to 2,000 m), not an instrument’s`,
    },
    depth: {
      value: 1000,
      confidence: 'estimated',
      source:
        'not recorded. CL 2 is cumulus of moderate or strong vertical extent: heaps a kilometre tall taken, at 34 °C under a dry, high base',
    },
    size: { value: 1500, confidence: 'estimated', source: 'not recorded: taken as about as wide as they were tall and a half again' },
    wind: {
      from: { value: 70, confidence: 'estimated', source: `${ZHOSALY}, ${HOUR}: the wind at the ground, taken for the cloud’s height too` },
      speed: {
        value: 10,
        confidence: 'estimated',
        source: 'the wind at the ground was 9.8 m/s there (below): taken the same at the bases',
      },
    },
    note: `At 12:00 UTC the station had two oktas of fair-weather cumulus (CL 1) at the same base, five oktas in all; Kazalinsk, 97 km west, had none at either hour (${KAZALY}). Only the nearer station at the hour is drawn.`,
  },
  high: {
    kind: 'cirrus',
    cover: {
      value: 0.125,
      confidence: 'derived',
      source: `${ZHOSALY}, ${HOUR}: three oktas in all, two of them low cloud, the high cloud coded CH 9 (cirrocumulus); ${KAZALY}, ${HOUR}: two oktas, all high, coded CH 1 (cirrus in filaments). One okta taken`,
    },
    base: {
      value: 9000,
      confidence: 'estimated',
      source: 'not measured: neither station gives a base for its high cloud; Vostok 1’s and 2’s 9,000 m taken',
    },
    depth: { value: 0.2, confidence: 'estimated', source: 'not recorded: thin, seen through; "shining in the Sun"' },
  },
  wind: {
    from: {
      value: 75,
      confidence: 'derived',
      source: `${ZHOSALY}, ${HOUR}: 070°; ${KAZALY}: 090°; ${SHIELI}: 070°. From the east-north-east; at the site not measured`,
    },
    speed: {
      value: 8,
      confidence: 'derived',
      source: `${ZHOSALY}, ${HOUR}: 9.8 m/s; ${KAZALY}: 6.2 m/s; ${SHIELI}: 8.2 m/s. Between the two either side of the range`,
    },
  },
  visibility: {
    value: 50_000,
    confidence: 'estimated',
    source: `50 km at Zhosaly at the hour (${ISD}), the furthest it reports; Kazalinsk 20 km, its usual mark: past 50 km not known`,
  },
  haze: {
    value: 1500,
    confidence: 'estimated',
    source: 'not recorded: the dry air of the steppe, taken as Vostok 1’s and 2’s, to thin over 1.5 km',
  },
  // the air over the pad and the surface's hours round liftoff: ERA5's (aloft.ts, tools/era5-aloft.mjs); a sounding of the
  // record's, when one is read, goes here in their place
  aloft: ALOFT,
  hours: HOURS,
};
