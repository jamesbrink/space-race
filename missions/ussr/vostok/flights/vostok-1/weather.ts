import type { DayWeather } from '../../../../../src/types';

const ISD = 'NOAA Integrated Surface Database';
const KAZALY = `${ISD}, station 35849099999 (Kazaly, that is Kazalinsk: 45.77° N 62.12° E, 97 km west of Site 1)`;
const ZHOSALY = `${ISD}, station 35953099999 (Zhosaly, that is Dzhusaly: 45.50° N 64.08° E, 74 km south-east of Site 1)`;
const KZYLORDA = `${ISD}, station 38062099999 (Kzyl-Orda, 214 km south-east)`;

/**
 * The weather Vostok 1 stood under: the morning of 12 April 1961 at Tyuratam, at liftoff (09:07 Moscow time, 06:07
 * UTC). **No observation made at the range itself has been read.** What there is, is the three-hourly reports of the
 * weather stations along the same railway either side of it, and they agree: no low or middle cloud, and seven or
 * eight oktas of high cloud. The film of the morning was read, when the site was first drawn, as a sharp horizon under
 * a clear sky, and the site was drawn clear. The two do not sit easily together. Three stations' trained observers
 * over 300 km of the same valley are taken over a reading of the film: the sky is drawn as theirs, with the cirrus
 * thin enough to see the Sun through, which is as far as the film is honoured. Nothing here is certain until an
 * observation at the range is read. See the site's notes (sites/site-1.md, "The land": the sky).
 */
export const WEATHER: DayWeather = {
  observed: {
    where: 'Kazalinsk, 97 km west of Site 1: the nearest station with a report at the hour',
    at: '1961-04-12T06:00:00Z',
    source: `${KAZALY}, 06:00 UTC`,
  },
  // no low cloud and no middle cloud: Kazaly at 06:00 UTC codes both as none (CL 0, CM 0), and so does Zhosaly at 03:00
  high: {
    kind: 'cirrus',
    cover: {
      value: 0.875,
      confidence: 'derived',
      source:
        `seven oktas of sky covered and no low or middle cloud at Kazaly at 06:00 UTC (${KAZALY}), with the high cloud coded 2: ` +
        `"dense cirrus, in patches or entangled sheaves"; the same at Zhosaly at 03:00 UTC (${ZHOSALY}), its only report of the ` +
        `morning; eight oktas of cirrostratus at Kzyl-Orda at 06:00 (${KZYLORDA}). The site lies between the first two: taken as theirs`,
    },
    base: {
      value: 9000,
      confidence: 'estimated',
      source:
        'not measured: 9,000 m is the ceiling the database derives for the high cloud at Kazaly at 03:00 UTC, by statistics and not by any instrument',
    },
    depth: {
      value: 0.35,
      confidence: 'estimated',
      source:
        'not recorded. The code calls the cirrus dense; the film of the morning was read as a clear sky. Taken as cirrus seen ' +
        'through, as the viewer draws its fibres (never more than half opaque)',
    },
  },
  wind: {
    from: {
      value: 140,
      confidence: 'estimated',
      source: `${KAZALY}, 06:00 UTC: documented there, 97 km away; at the site it is not known`,
    },
    speed: {
      value: 2.1,
      confidence: 'estimated',
      source: `${KAZALY}, 06:00 UTC: 2.1 m/s there (Kzyl-Orda had 4.1 m/s from 020°); light, at the site not known`,
    },
  },
  visibility: {
    value: 50_000,
    confidence: 'estimated',
    source: `50 km at Zhosaly at 03:00 UTC and at Kzyl-Orda at 06:00 (${ISD}); Kazaly reports 20 km at every hour of the day, which reads as the furthest mark it had. 50 km taken`,
  },
  haze: { value: 1500, confidence: 'estimated', source: 'not recorded: the dry air of the steppe in April, taken to thin over 1.5 km' },
};
