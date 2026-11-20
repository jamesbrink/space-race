import { landingSite, ON_THE_LM } from './site.ts';

/** Apollo 14, 5 February 1971: Antares in the Fra Mauro highlands, west of Cone crater. */
export const FRA_MAURO = landingSite({
  id: 'fra-mauro',
  name: 'Fra Mauro',
  lm: {
    object: 'A14_LM',
    vehicle: 'Antares',
    latitude: -3.64589,
    longitude: -17.47194,
    uncertainty: 0.4,
    method: 'averaged mapping-orbit NAC images and laser ranging',
  },
  height: {
    value: -1062.89,
    confidence: 'derived',
    source:
      'the plane fitted to LROC’s stereo terrain model NAC_DTM_APOLLO14 7 to 10 m round the LM, at the LM (tools/lunar-terrain.py; ' +
      'its slope there 4.9 degrees): metres above the sphere of 1737.4 km. SLDEM2015 agrees (tests/lunar-sites.test.mjs)',
  },
  stereo: ['APOLLO14'],
  centre: ON_THE_LM,
  approach: {
    value: 283.96,
    confidence: 'derived',
    source:
      'the great circle from powered descent initiation, 7.38 S 1.57 W (Apollo 14 Mission Report, MSC-04112, table 6-III (trajectory parameters); the scan drops the latitude’s first digit, and ' +
      'the planned approach azimuth of -76.31 degrees puts the track at 7.2 S there), to the LM, its heading at the LM; 493 km',
  },
});
