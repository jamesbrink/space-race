import { landingSite, ROVER_PARKED } from './site.ts';

/** Apollo 15, 30 July 1971: Falcon on the plain beside Hadley Rille, under the Apennine front. */
export const HADLEY = landingSite({
  id: 'hadley',
  name: 'Hadley–Apennine',
  lm: {
    object: 'A15_LM',
    vehicle: 'Falcon',
    latitude: 26.13239,
    longitude: 3.6333,
    uncertainty: 1,
    method: 'averaged mapping-orbit NAC images and laser ranging',
  },
  height: {
    value: -1924.23,
    confidence: 'derived',
    source:
      'the plane fitted to LROC’s stereo terrain model NAC_DTM_APOLLO15 7 to 10 m round the LM, at the LM (tools/lunar-terrain.py; ' +
      'its slope there 0.5 degrees): metres above the sphere of 1737.4 km. SLDEM2015 agrees (tests/lunar-sites.test.mjs)',
  },
  stereo: ['APOLLO15'],
  centre: ROVER_PARKED,
  approach: {
    value: 270,
    confidence: 'estimated',
    source:
      'due west: Apollo 16’s and 17’s descents reached their sites within 0.6 degrees of due west (their mission reports’ ' +
      'trajectory tables, descartes.ts and taurus-littrow.ts); Apollo 15’s ' +
      'table (MSC-05161, table 3-III) is an image not yet read',
  },
  landed: {
    at: '1971-07-30T22:16:30Z',
    source:
      'Apollo 15 Mission Report, MSC-05161, table 3-I (sequence of events): landing at 104:42:29.3 GET from liftoff at 13:34:00.6 GMT, 26 July 1971 (the times as remembered, not read again: to the minute, what the Earth’s day over the site is baked for)',
  },
});
