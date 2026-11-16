import { ALOFT, HOURS } from './aloft.ts';
import type { DayWeather } from '../../../../../src/types.ts';

const ISD = 'NOAA Integrated Surface Database';
const KAZALY = `${ISD}, station 35849099999 (Kazaly, that is Kazalinsk: 45.77° N 62.12° E, 97 km west of Site 1)`;
const ARALSK = `${ISD}, station 35746099999 (Aralsk: 46.78° N 61.67° E, some 190 km west-north-west of Site 1)`;
const KAMANIN = 'Kamanin’s diary, 12 October 1964 («Скрытый космос», book 2; militera.lib.ru/db/kamanin_np/64.html)';

/**
 * The weather Voskhod 1 stood under: the late morning of 12 October 1964 at Tyuratam, at liftoff (10:30:01 Moscow time,
 * 07:30:01 UTC). **The range's own figures are Kamanin's**: «Тихое морозное утро, температура — минус 8 градусов ...
 * Метеоусловия для старта идеальные: ветер — 3–4 метра в секунду, видимость — более 20 километров, высокие перистые
 * облака» (a still, frosty morning, −8 °C at six by the range's clock; the wind 3 to 4 m/s, the visibility over 20 km, high
 * cirrus). The two stations along the railway with reports that morning agree: a little high cloud and nothing lower, a
 * light wind from the north-east. Zhosaly (Dzhusaly), nearer the range, has no report in the database for 1964. TASS's
 * correspondent at the pad had it "flooded with a sparing autumn sun".
 */
export const WEATHER: DayWeather = {
  observed: {
    where: 'Site 1 itself, as the range’s meteorologist gave it (Kamanin), with Kazaly and Aralsk on the railway either side of the hour',
    at: '1964-10-12T07:30:00Z',
    source: `${KAMANIN}; ${KAZALY}, 03:00 and 09:00 UTC; ${ARALSK}, 06:00 UTC`,
  },
  high: {
    kind: 'cirrus',
    cover: {
      value: 0.1875,
      confidence: 'derived',
      source: `«высокие перистые облака» (${KAMANIN}), at the range: how much is not said. ${KAZALY}, 09:00 UTC: two oktas in all, none of it low or middle cloud, the high coded CH 1 (cirrus in filaments); ${ARALSK}, 06:00 UTC: one okta, the high coded CH 2 (dense cirrus). One and a half oktas taken, between the two`,
    },
    base: {
      value: 9000,
      confidence: 'estimated',
      source: 'not measured: neither station gives a base for its high cloud; the Vostoks’ 9,000 m taken',
    },
    depth: { value: 0.2, confidence: 'estimated', source: 'not recorded: thin, seen through, as Kamanin’s “high cirrus”' },
  },
  wind: {
    from: {
      value: 40,
      confidence: 'derived',
      source: `not given at the range. ${KAZALY}: 050° at 03:00 UTC, 020° at 09:00; ${ARALSK}: 050° at 06:00. From the north-east, between them`,
    },
    speed: {
      value: 3.5,
      confidence: 'documented',
      source: `«ветер — 3–4 метра в секунду» (${KAMANIN}), the range’s meteorologist’s for the launch; ${KAZALY} 3.1 m/s at 03:00 and 09:00 UTC, ${ARALSK} 3.1 m/s at 06:00`,
    },
  },
  visibility: {
    value: 30_000,
    confidence: 'estimated',
    source: `«видимость — более 20 километров» (${KAMANIN}): more than 20 km. Kazaly and Aralsk each report 20 km, their own furthest mark. 30 km taken`,
  },
  haze: {
    value: 1500,
    confidence: 'estimated',
    source: `not recorded: the dry air of the steppe, taken as the Vostoks’, to thin over 1.5 km. At 03:00 UTC Kazaly had three oktas of altocumulus (CM 3) and nothing else; by 09:00 it had gone (${KAZALY}): not drawn`,
  },
  // the air over the pad and the surface's hours round liftoff: ERA5's (aloft.ts, tools/era5-aloft.mjs); a sounding of the
  // record's, when one is read, goes here in their place
  aloft: ALOFT,
  hours: HOURS,
};
