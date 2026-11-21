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
  landed: {
    value: Date.parse('1971-02-05T09:18:11Z') / 1000,
    confidence: 'derived',
    source:
      'the range zero and the elapsed time of the landing, both read on the page, added: Apollo 14 Mission Report, MSC-04112 (April 1971), table 6-I (sequence of events), p. 6-2: "Range zero - 21:03:02 G.m.t., January 31, 1971" and "Lunar landing 108:15:09". UTC, seconds from 1970',
  },
  rest: {
    heading: {
      value: 283.96,
      confidence: 'estimated',
      source:
        'Apollo 14 Mission Report, MSC-04112, section 9, p. 9-8: "within 1 degree of zero in pitch and yaw attitudes", in a frame the page does not name; taken as its approach (the LM flew its last minutes facing along its ground track, its +Z ahead)',
    },
    pitch: {
      value: 0,
      confidence: 'documented',
      source:
        'Apollo 14 Mission Report, MSC-04112, section 9 (pilots’ report), p. 9-8: "the vehicle came to rest within 1 degree of zero in pitch and yaw attitudes, and with a 7-degree right roll attitude (northeast tilt)"',
    },
    roll: {
      value: 7,
      confidence: 'documented',
      source:
        'Apollo 14 Mission Report, MSC-04112, section 9, p. 9-8: "with a 7-degree right roll attitude (northeast tilt)" (right positive)',
    },
  },
});
