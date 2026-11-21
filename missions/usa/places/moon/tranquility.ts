import { landingSite, ON_THE_LM } from './site.ts';

/** Apollo 11, 20 July 1969: Eagle on the Sea of Tranquility (Mare Tranquillitatis). */
export const TRANQUILITY = landingSite({
  id: 'tranquility',
  name: 'Tranquility Base',
  lm: {
    object: 'A11_LM',
    vehicle: 'Eagle',
    latitude: 0.67416,
    longitude: 23.47314,
    uncertainty: 0.3,
    method: 'averaged mapping-orbit NAC images and laser ranging',
  },
  height: {
    value: -1927.81,
    confidence: 'derived',
    source:
      'the plane fitted to LROC’s stereo terrain model NAC_DTM_APOLLO11 7 to 10 m round the LM, at the LM (tools/lunar-terrain.py; ' +
      'its slope there 2.7 degrees): metres above the sphere of 1737.4 km. SLDEM2015 agrees (tests/lunar-sites.test.mjs)',
  },
  stereo: ['APOLLO11'],
  centre: ON_THE_LM,
  approach: {
    value: 268.64,
    confidence: 'derived',
    source:
      'the great circle from powered descent initiation, 1.02 N 39.39 E (Apollo 11 Mission Report, MSC-00171, table 7-II (trajectory parameters); 483 km uprange), to the LM, its heading at the LM. ' +
      'The report’s positions are in the selenographic frame of 1969, some 1.2 km from the mean Earth frame at the site: 0.15 degrees here',
  },
  landed: {
    at: '1969-07-20T20:17:40Z',
    source:
      'Apollo 11 Mission Report, MSC-00171, table 3-I (sequence of events): landing at 102:45:39.9 GET from liftoff at 13:32:00 GMT, 16 July 1969 (the times as remembered, not read again: to the minute, what the Earth’s day over the site is baked for)',
  },
});
