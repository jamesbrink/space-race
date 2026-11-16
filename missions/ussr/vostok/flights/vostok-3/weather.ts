import { ALOFT, HOURS } from './aloft.ts';
import type { DayWeather } from '../../../../../src/types.ts';

const ISD = 'NOAA Integrated Surface Database';
const KAZALY = `${ISD}, station 35849099999 (Kazaly, that is Kazalinsk: 45.77° N 62.12° E, 97 km west of Site 1)`;
const ZHOSALY = `${ISD}, station 35953099999 (Zhosaly, that is Dzhusaly: 45.50° N 64.08° E, 74 km south-east of Site 1)`;
const KZYLORDA = `${ISD}, station 38062099999 (Kzyl-Orda, some 210 km south-east of Site 1)`;
const KAMANIN =
  'Kamanin’s diary («Скрытый космос», book 1), 12 August 1962: the forecaster’s report to the State Commission at 07:30 by the range’s clock on the 11th, «антициклон, ясно, скорость ветра 6–7 метров в секунду»';

/**
 * The weather Vostok 3 stood under: 11 August 1962 at Tyuratam, at liftoff (11:30 Moscow time, 08:30 UTC). **No observation
 * made at the range has been read**: what there is, is the range forecaster's word to the State Commission that morning
 * (an anticyclone, clear, wind 6 to 7 m/s) and the three-hourly reports of the stations round it, which agree. Not a cloud
 * at Kazaly, Zhosaly or Kzyl-Orda from midnight to noon UTC (each codes no cloud at all); one okta of fair-weather cumulus at
 * Aralsk (35746099999) at 09:00, 160 km west-north-west by the sea, is not drawn. The wind from the north-east at every station on the railway; 25 to
 * 28 °C at the hour, 31 to 33 °C by noon UTC ("в 35-градусной жаре", Kamanin, of the two days). No layer of cloud is given,
 * so none is drawn at the site.
 */
export const WEATHER: DayWeather = {
  observed: {
    where:
      'Kzyl-Orda, some 210 km south-east of Site 1: the nearest station with a report at the hour (09:00 UTC); Kazaly and Zhosaly, either side of the range on the railway, at 06:00 and 12:00',
    at: '1962-08-11T09:00:00Z',
    source: `${KZYLORDA}, 09:00 UTC; ${KAZALY} and ${ZHOSALY}, 06:00 and 12:00 UTC (Zhosaly 00:00 and 12:00 only); ${KAMANIN}`,
  },
  wind: {
    from: {
      value: 35,
      confidence: 'derived',
      source: `between the stations either side of the range: Kazaly 020° at 06:00 and 12:00 UTC (${KAZALY}); Zhosaly 020° at 00:00 and 050° at 12:00 (${ZHOSALY}); Kzyl-Orda 050° at 06:00 and 09:00 (${KZYLORDA}). At the site it is not measured`,
    },
    speed: {
      value: 6.5,
      confidence: 'derived',
      source: `the range’s own forecast for the day, 6 to 7 m/s (${KAMANIN}: documented, a forecast); the stations at the hour bracket it: Kazaly 1.0 m/s at 06:00 and 5.1 at 12:00 UTC, Zhosaly 5.1 at 00:00 and 9.8 at 12:00, Kzyl-Orda 7.2 at 09:00`,
    },
  },
  visibility: {
    value: 50_000,
    confidence: 'estimated',
    source: `50 km at Kzyl-Orda at 06:00 and 09:00 UTC and at Zhosaly at 12:00 (${ISD}), the furthest any reports that day; Kazaly reports its own furthest mark, 20 km. Past 50 km not known`,
  },
  haze: {
    value: 1500,
    confidence: 'estimated',
    source: 'not recorded: the dry air of the steppe under an anticyclone, taken as Vostok 1’s and 2’s, to thin over 1.5 km',
  },
  // the air over the pad and the surface's hours round liftoff: ERA5's (aloft.ts, tools/era5-aloft.mjs); a sounding of the
  // record's, when one is read, goes here in their place
  aloft: ALOFT,
  hours: HOURS,
};
