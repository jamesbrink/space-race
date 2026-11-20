import { assumed, doc, estimated } from '../../../../../src/measure.ts';
import type { DayWeather } from '../../../../../src/types.ts';
import { ALOFT, HOURS } from './aloft.ts';

const ISD = 'NOAA Integrated Surface Database';
const KAZALY = `${ISD}, station 35849099999 (Kazaly, that is Kazalinsk: 45.77° N 62.12° E, 97 km west of Site 1)`;
const ARALSK = `${ISD}, station 35746099999 (Aralsk: 46.78° N 61.67° E, 160 km west-north-west of Site 1)`;
const HOUR = '00:00 UTC on 23 April 1967';

/**
 * The weather Soyuz 1 stood under: the small hours of 23 April 1967 at Tyuratam, at liftoff (03:35 Moscow time, 00:35 UTC),
 * before sunrise. **No observation made at the range has been read**: Kamanin's diary of the night gives the schedule and
 * the cabin's +15 °C, nothing of the sky. Zhosaly, the nearer station, has no report in the database for 1967. Kazalinsk at
 * the hour had the whole sky under middle cloud and almost no wind; Aralsk, further west, three oktas of patchy altocumulus.
 */
export const WEATHER: DayWeather = {
  observed: {
    where: 'Kazalinsk, 97 km west of Site 1: the nearest station with a report, at the hour before liftoff',
    at: '1967-04-23T00:00:00Z',
    source: `${KAZALY}, 00:00 and 03:00 UTC; ${ARALSK}, 00:00 UTC`,
  },
  // no low cloud: Kazaly codes it none (CL 0) at 00:00 and 03:00 UTC
  middle: {
    kind: 'altocumulus',
    cover: doc(
      1,
      `${KAZALY}, ${HOUR}: eight oktas, all of it middle cloud, coded CM 7 (altocumulus in layers, or with altostratus); the same at 03:00 (CM 6). ${ARALSK}, ${HOUR}: three oktas, CM 4 (patches)`,
    ),
    base: estimated(
      2400,
      `${KAZALY}, ${HOUR}: no base given; 2,400 m is the ceiling the database derives for middle cloud by statistics, not an instrument's`,
    ),
    note: 'Coded at Kazalinsk as altocumulus in layers or with altostratus: drawn as the viewer’s altocumulus deck over the whole sky.',
  },
  wind: {
    from: assumed(230, `${KAZALY}, ${HOUR}; ${ARALSK} had 050° at 5.1 m/s. At the site not measured`),
    speed: assumed(1, `${KAZALY}, ${HOUR}: 1.0 m/s, 2.1 m/s at 03:00`),
  },
  visibility: estimated(25000, `Kazaly reports 20 km, its furthest mark, at every hour (${ISD}); Aralsk 23 km at ${HOUR}. 25 km taken`),
  haze: estimated(1500, 'not recorded: the dry air of the steppe, taken as the Vostoks’ and Voskhods’, to thin over 1.5 km'),
  // the air over the pad and the surface's hours round liftoff: ERA5's (aloft.ts, tools/era5-aloft.mjs)
  aloft: ALOFT,
  hours: HOURS,
};
