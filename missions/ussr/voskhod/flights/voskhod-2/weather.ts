import { ALOFT, HOURS } from './aloft.ts';
import type { DayWeather } from '../../../../../src/types.ts';

const ISD = 'NOAA Integrated Surface Database';
const KAZALY = `${ISD}, station 35849099999 (Kazaly, that is Kazalinsk: 45.77° N 62.12° E, 97 km west of Site 1)`;
const ARALSK = `${ISD}, station 35746099999 (Aralsk: 46.78° N 61.67° E, some 190 km west-north-west of Site 1)`;
const BORISENKO = 'Borisenko, «В космосе — Леонов» (3rd ed., 1984), p. 77';
const CHERTOK = 'Chertok, Rockets and People, vol. 3 (NASA SP-2009-4110), pp. 263 and 266';

/**
 * The weather Voskhod 2 stood under: the morning of 18 March 1965 at Tyuratam, at liftoff (10:00:00 Moscow time, 07:00:00
 * UTC). **No figure made at the range has been read**: Kamanin's diary says nothing of the morning's weather. What there is:
 * «Всю ночь перед стартом шел снег. Степь вокруг стартовой площадки стала белой. Снег лежит на вершине корабля, на фермах
 * обслуживания» (Borisenko, p. 77); "the weather was lousy. There was a low cloud cover and intermittent drizzling rain", and at
 * liftoff "a perceptible hole in the blanket of clouds" (Chertok). The two stations on the railway with reports that day agree:
 * the whole sky under stratocumulus with its base about a kilometre up, little wind, a degree or two above freezing.
 */
export const WEATHER: DayWeather = {
  observed: {
    where: 'Kazalinsk, 97 km west of Site 1: the nearer station with a report, at 09:00 UTC, two hours after liftoff (none at 06:00)',
    at: '1965-03-18T09:00:00Z',
    source: `${KAZALY}, 00:00 and 09:00 UTC; ${ARALSK}, 00:00 and 12:00 UTC`,
  },
  low: {
    // (the viewer draws no stratocumulus: a whole sky of the low cloud it has, at the deck's base, stands in for it)
    kind: 'cumulus',
    note: `Coded CL 5, stratocumulus, eight oktas at both stations: drawn as the viewer’s low heaps at full cover, it having no stratocumulus deck. The snow of the night before on the steppe and on the ship («Всю ночь перед стартом шел снег»: ${BORISENKO}) is not drawn.`,
    cover: {
      value: 1,
      confidence: 'documented',
      source: `${KAZALY}, 00:00 and 09:00 UTC: eight oktas, all low cloud, coded CL 5 (stratocumulus); ${ARALSK} the same at 00:00 and 12:00. "A low cloud cover" (${CHERTOK}); "a perceptible hole" in it at liftoff is not drawn`,
    },
    base: {
      value: 1250,
      confidence: 'documented',
      source: `${KAZALY}, 09:00 UTC: 1,250 m, the database's figure for the code's class (1,000 to 1,500 m), not an instrument's; ${ARALSK} the same at 00:00 and 800 m at 12:00`,
    },
    depth: {
      value: 500,
      confidence: 'estimated',
      source: 'not recorded: a deck of stratocumulus some half a kilometre thick, by judgement',
    },
    size: { value: 1500, confidence: 'estimated', source: 'not recorded: the cells of a stratocumulus deck, by judgement' },
    wind: {
      from: {
        value: 270,
        confidence: 'estimated',
        source: `${KAZALY}, 09:00 UTC: the wind at the ground, taken for the cloud's height too`,
      },
      speed: { value: 2, confidence: 'estimated', source: 'the wind at the ground was 2.1 m/s there: taken the same at the base' },
    },
  },
  wind: {
    from: {
      value: 270,
      confidence: 'derived',
      source: `${KAZALY}: 250° at 00:00 UTC, 270° at 09:00; ${ARALSK}: 320° at 00:00, 020° at 12:00. Kazalinsk’s, the nearer, at the hour after; at the site not measured`,
    },
    speed: {
      value: 2,
      confidence: 'derived',
      source: `${KAZALY}: 1.0 m/s at 00:00 UTC, 2.1 at 09:00; ${ARALSK}: 5.1 at 00:00, 3.1 at 12:00. Kazalinsk’s at the hour after`,
    },
  },
  visibility: {
    value: 20_000,
    confidence: 'estimated',
    source: `20 km at Kazalinsk at 00:00 and 09:00 UTC (${ISD}), its own furthest mark; Aralsk 10 km at 00:00 and 20 at 12:00. Drizzle (Chertok) is not drawn`,
  },
  haze: {
    value: 1500,
    confidence: 'estimated',
    source: 'not recorded: taken as the Vostoks’, to thin over 1.5 km',
  },
  // the air over the pad and the surface's hours round liftoff: ERA5's (aloft.ts, tools/era5-aloft.mjs)
  aloft: ALOFT,
  hours: HOURS,
};
