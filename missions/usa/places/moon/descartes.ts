import { landingSite, ROVER_PARKED } from './site.ts';

/** Apollo 16, 21 April 1972: Orion on the Cayley plain in the Descartes highlands. */
export const DESCARTES = landingSite({
  id: 'descartes',
  name: 'Descartes Highlands',
  lm: {
    object: 'A16_LM',
    vehicle: 'Orion',
    latitude: -8.9734,
    longitude: 15.5011,
    uncertainty: 3,
    method: 'averaged mapping-orbit NAC images',
  },
  height: {
    value: 8.38,
    confidence: 'derived',
    source:
      'the plane fitted to LROC’s stereo terrain model NAC_DTM_APOLLO16 7 to 10 m round the LM, at the LM (tools/lunar-terrain.py; ' +
      'its slope there 3.2 degrees): metres above the sphere of 1737.4 km. SLDEM2015 agrees (tests/lunar-sites.test.mjs)',
  },
  stereo: ['APOLLO16'],
  centre: ROVER_PARKED,
  approach: {
    value: 270.31,
    confidence: 'derived',
    source:
      'the great circle from powered descent initiation, 8 deg 40 min S 32 deg 44 min E (Apollo 16 Mission Report, MSC-07230, table 3-III (trajectory parameters); 516 km uprange), to the LM, ' +
      'its heading at the LM',
  },
  landed: {
    at: '1972-04-21T02:23:35Z',
    source:
      'Apollo 16 Mission Report, MSC-07230, table 3-I (sequence of events): landing at 104:29:35 GET from liftoff at 17:54:00 GMT, 16 April 1972 (the times as remembered, not read again: to the minute, what the Earth’s day over the site is baked for)',
  },
});
