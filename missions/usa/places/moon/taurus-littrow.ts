import { landingSite, ROVER_PARKED } from './site.ts';

/** Apollo 17, 11 December 1972: Challenger in the valley of Taurus–Littrow, between the North and South Massifs. */
export const TAURUS_LITTROW = landingSite({
  id: 'taurus-littrow',
  name: 'Taurus–Littrow',
  lm: {
    object: 'A17_LM',
    vehicle: 'Challenger',
    latitude: 20.1911,
    longitude: 30.7723,
    uncertainty: 3.5,
    method: 'averaged mapping-orbit NAC images',
  },
  height: {
    value: -2626.69,
    confidence: 'derived',
    source:
      'the plane fitted to LROC’s stereo terrain model NAC_DTM_APOLLO17_1 7 to 10 m round the LM, at the LM (tools/lunar-terrain.py; ' +
      'its slope there 2.6 degrees): metres above the sphere of 1737.4 km. SLDEM2015 agrees (tests/lunar-sites.test.mjs)',
  },
  stereo: ['APOLLO17', 'APOLLO17_1'],
  centre: ROVER_PARKED,
  approach: {
    value: 270.51,
    confidence: 'derived',
    source:
      'the great circle from powered descent initiation, 19.13 N 48.75 E (Apollo 17 Mission Report, JSC-07904, table 3-III (trajectory parameters); 514 km uprange), to the LM, its heading at the LM',
  },
});
