import { ALOFT, HOURS } from './aloft.ts';
import type { DayWeather } from '../../../../../src/types.ts';

const ISD = 'NOAA Integrated Surface Database';
const KAZALY = `${ISD}, station 35849099999 (Kazaly, that is Kazalinsk: 45.77° N 62.12° E, 97 km west of Site 1)`;
const ZHOSALY = `${ISD}, station 35953099999 (Zhosaly, that is Dzhusaly: 45.50° N 64.08° E, 74 km south-east of Site 1)`;
const SHIELI = `${ISD}, station 38069099999 (Shieli, some 330 km south-east of Site 1)`;

/**
 * The weather Vostok 4 stood under: 12 August 1962 at Tyuratam, at liftoff (11:02:33 Moscow time, 08:02:33 UTC). **No
 * observation made at the range has been read**, nor a forecast for the day (Kamanin gives one only for the 11th). The
 * stations round it agree: no cloud at Kazaly, Zhosaly, Shieli or Aralsk from 03:00 to 09:00 UTC (each codes none at all),
 * the wind from 070° to 090° along the railway, 30 to 34 °C at the hour ("в 35-градусной жаре", Kamanin, of the two days).
 * No layer of cloud is given, so none is drawn at the site.
 */
export const WEATHER: DayWeather = {
  observed: {
    where: 'Kazaly and Zhosaly, either side of the range on the railway: their reports at 06:00 and 09:00 UTC, the hour between them',
    at: '1962-08-12T09:00:00Z',
    source: `${KAZALY} and ${ZHOSALY}, 06:00 and 09:00 UTC; ${SHIELI}`,
  },
  wind: {
    from: {
      value: 75,
      confidence: 'derived',
      source: `between the stations either side of the range: Kazaly 070° at 06:00 and 09:00 UTC (${KAZALY}); Zhosaly 090° at 06:00 and 070° at 09:00 (${ZHOSALY}); Shieli 070° at both (${SHIELI}). At the site it is not measured`,
    },
    speed: {
      value: 6,
      confidence: 'derived',
      source: `between the stations either side of the range at 08:00 UTC, straight between their reports: Kazaly 3.1 m/s at 06:00 and 5.1 at 09:00 (about 4.4), Zhosaly 7.2 and 8.7 (about 8.2); Shieli 8.2 at both`,
    },
  },
  visibility: {
    value: 50_000,
    confidence: 'estimated',
    source: `50 km at Zhosaly at 06:00 and 09:00 UTC and at Shieli at 09:00 (${ISD}), the furthest any reports that day; Kazaly reports its own furthest mark, 20 km. Past 50 km not known`,
  },
  haze: {
    value: 1500,
    confidence: 'estimated',
    source: 'not recorded: the dry air of the steppe, taken as Vostok 1’s, 2’s and 3’s, to thin over 1.5 km',
  },
  // the air over the pad and the surface's hours round liftoff: ERA5's (aloft.ts, tools/era5-aloft.mjs); a sounding of the
  // record's, when one is read, goes here in their place
  aloft: ALOFT,
  hours: HOURS,
};
