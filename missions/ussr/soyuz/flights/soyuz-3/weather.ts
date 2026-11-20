import { doc, estimated } from '../../../../../src/measure.ts';
import type { DayWeather } from '../../../../../src/types.ts';
import { ALOFT, HOURS } from './aloft.ts';

const ISD = 'NOAA Integrated Surface Database';
const KAZALY = `${ISD}, station 35849099999 (Kazaly, that is Kazalinsk: 45.77° N 62.12° E, 115 km west of Site 31)`;
const ARALSK = `${ISD}, station 35746099999 (Aralsk: 46.78° N 61.67° E, 170 km west-north-west of Site 31)`;
const KAMANIN = 'Kamanin’s diary, 25 October 1968 («Скрытый космос», book 3; militera.lib.ru/db/kamanin_np/68.html)';
const HOUR = '09:00 UTC on 26 October 1968';

/**
 * The weather Soyuz 3 stood under: the late morning of 26 October 1968 at Site 31, at liftoff (11:34:18 Moscow time,
 * 08:34:18 UTC). **No observation made at the range on the day has been read.** Kamanin's entry for the 26th is written on
 * the aircraft to Yevpatoriya and says nothing of the sky; of the day before, when Soyuz 2 flew from Site 1:
 * «Утро было солнечное, но прохладное (температура — около нуля, ветер — до 5 метров в секунду)», and half an hour before
 * that launch «небо над стартом стало затягиваться облаками». Zhosaly, the nearer station, has no report in the database for
 * 1968. Kazalinsk at the hour after liftoff had five oktas of stratocumulus with altocumulus over it and a fresh north-west wind.
 */
export const WEATHER: DayWeather = {
  observed: {
    where: 'Kazalinsk, 115 km west of Site 31: the nearest station with a report, 26 minutes after liftoff',
    at: '1968-10-26T09:00:00Z',
    source: `${KAZALY}, 03:00, 09:00 and 12:00 UTC; ${ARALSK}, 06:00 UTC; ${KAMANIN}`,
  },
  middle: {
    kind: 'stratocumulus',
    cover: doc(
      0.625,
      `${KAZALY}, ${HOUR}: five oktas of low cloud, coded CL 5 (stratocumulus), six in all with altocumulus in bands (CM 5) over it. ${ARALSK}, 06:00 UTC: four oktas of stratus under eight in all`,
    ),
    base: doc(800, `${KAZALY}, ${HOUR}: 800 m, the database's figure for the code's class (600 to 1,000 m), not an instrument's`),
    note: 'The altocumulus over the stratocumulus (a sixth okta) is not drawn: the viewer has one layered deck. By 12:00 UTC Kazalinsk had four oktas of small cumulus at the 1,250 m class and no deck.',
  },
  wind: {
    from: doc(320, `${KAZALY}, ${HOUR}; 320° at 03:00 too. ${ARALSK}, 06:00 UTC: 340°. At the site not measured`),
    speed: doc(7.2, `${KAZALY}, ${HOUR}: 7.2 m/s (3.1 at 03:00, 5.1 at 12:00); ${ARALSK} 5.1 m/s at 06:00`),
  },
  visibility: estimated(20000, `Kazaly reports 20 km, its furthest mark, at 09:00 UTC (${ISD}); Aralsk 20 km at 06:00. Taken as 20 km`),
  haze: estimated(1500, 'not recorded: the dry air of the steppe, taken as the Vostoks’ and Voskhods’, to thin over 1.5 km'),
  // the air over the pad and the surface's hours round liftoff: ERA5's (aloft.ts, tools/era5-aloft.mjs)
  aloft: ALOFT,
  hours: HOURS,
};
