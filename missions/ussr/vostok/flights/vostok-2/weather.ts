import type { DayWeather } from '../../../../../src/types';

const ISD = 'NOAA Integrated Surface Database';
const KAZALY = `${ISD}, station 35849099999 (Kazaly, that is Kazalinsk: 45.77° N 62.12° E, 97 km west of Site 1)`;
const ZHOSALY = `${ISD}, station 35953099999 (Zhosaly, that is Dzhusaly: 45.50° N 64.08° E, 74 km south-east of Site 1)`;

/**
 * The weather Vostok 2 stood under: the morning of 6 August 1961 at Tyuratam, at liftoff (09:00 Moscow time, 06:00 UTC).
 * **No observation made at the range has been read.** What there is, is the three-hourly reports of the two stations
 * either side of it on the railway, decoded as Vostok 1's were, and they agree: no low cloud until three hours after
 * liftoff (fair-weather cumulus at both by 09:00 UTC), a little high cloud, the same wind at both, 32 °C. The memoirs
 * have a hot, still, sunlit morning ("Солнце, огненное и жаркое, поднялось над степью": TASS's correspondent; "on that hot
 * morning", Chertok, vol. 3, p. 191), and a photograph of the farewell has hard shadows on the concrete.
 */
export const WEATHER: DayWeather = {
  observed: {
    where: 'Dzhusaly, 74 km south-east of Site 1: the nearer station with a whole report at the hour',
    at: '1961-08-06T06:00:00Z',
    source: `${ZHOSALY}, 06:00 UTC; the cloud's types from ${KAZALY}, 06:00 UTC`,
  },
  // no low cloud: both stations code CL 0 at 06:00 UTC; Kazaly's two oktas of thin altostratus (CM 1) to the west are not drawn
  high: {
    kind: 'cirrus',
    cover: {
      value: 0.4,
      confidence: 'derived',
      source:
        `between the two stations: five oktas at Kazaly at 06:00 UTC, two of them thin altostratus, with the high cloud coded 1 ("cirrus in filaments") (${KAZALY}); ` +
        `two oktas of high cloud at Zhosaly (${ZHOSALY}: coded 7, a veil over the whole sky, which its own two oktas contradict: read as two oktas). ` +
        'A cirrus shield was coming in from the west (Aralsk overcast with cirrostratus by 12:00, Kazaly seven oktas from 09:00): about three eighths taken',
    },
    base: {
      value: 9000,
      confidence: 'estimated',
      source:
        'not measured: neither station gives a base for its high cloud; Vostok 1’s 9,000 m, the database’s class figure for cirrus at Kazaly, is taken',
    },
    depth: {
      value: 0.2,
      confidence: 'estimated',
      source: 'not recorded. Cirrus in filaments, and a photograph of the farewell with hard shadows: thin, seen through',
    },
  },
  wind: {
    from: {
      value: 220,
      confidence: 'derived',
      source: `${ZHOSALY} and ${KAZALY}, 06:00 UTC: both give 220° exactly, either side of the range; at the site it is not measured`,
    },
    speed: {
      value: 3.1,
      confidence: 'derived',
      source: `${ZHOSALY} and ${KAZALY}, 06:00 UTC: 3.1 m/s at both. TASS has «едва приметный ветерок», a breeze hardly felt, the day before`,
    },
  },
  visibility: {
    value: 50_000,
    confidence: 'estimated',
    source: `50 km at both stations at 06:00 UTC (${ISD}), which is the furthest either reports that day: past it not known`,
  },
  haze: {
    value: 1500,
    confidence: 'estimated',
    source: 'not recorded: the dry air of the steppe, taken as Vostok 1’s, to thin over 1.5 km',
  },
};
