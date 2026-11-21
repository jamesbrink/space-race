import { landingSite, ON_THE_LM } from './site.ts';

/** Apollo 12, 19 November 1969: Intrepid beside Surveyor 3 in the Ocean of Storms (Oceanus Procellarum). */
export const OCEAN_OF_STORMS = landingSite({
  id: 'ocean-of-storms',
  name: 'Ocean of Storms',
  lm: {
    object: 'A12_LM',
    vehicle: 'Intrepid',
    latitude: -3.0128,
    longitude: -23.4219,
    uncertainty: 2.2,
    method: 'averaged mapping-orbit NAC images',
  },
  height: {
    value: -1422.77,
    confidence: 'derived',
    source:
      'the plane fitted to LROC’s stereo terrain model NAC_DTM_APOLLO12 7 to 10 m round the LM, at the LM (tools/lunar-terrain.py; ' +
      'its slope there 5.0 degrees): metres above the sphere of 1737.4 km. SLDEM2015 agrees (tests/lunar-sites.test.mjs)',
  },
  stereo: ['APOLLO12'],
  centre: ON_THE_LM,
  approach: {
    value: 284.2,
    confidence: 'estimated',
    source:
      'powered descent initiation at 6.76 S (Apollo 12 Mission Report, MSC-01855, §5 table of trajectory parameters; the scan loses its longitude), taken 482 km uprange as Apollo 11’s ' +
      'was: the great circle through it and the LM, its heading at the LM. A descent of 450 to 495 km moves it 0.3 to 1 degree',
  },
  landed: {
    at: '1969-11-19T06:54:36Z',
    source:
      'Apollo 12 Mission Report, MSC-01855, table 3-I (sequence of events): landing at 110:32:36.2 GET from liftoff at 16:22:00 GMT, 14 November 1969 (the times as remembered, not read again: to the minute, what the Earth’s day over the site is baked for)',
  },
});
