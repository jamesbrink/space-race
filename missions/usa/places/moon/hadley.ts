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
    value: Date.parse('1971-07-30T22:16:29Z') / 1000,
    confidence: 'derived',
    source:
      'the range zero and the elapsed time of the landing, both read on the page, added: Apollo 15 Mission Report, MSC-05161 (December 1971), table 3-I (sequence of events), as the Apollo Lunar Surface Journal’s retyped edition has it (its p. 7): "Range zero - 13:34:00 G.m.t., July 26, 1971" and "Lunar landing 104:42:29". UTC, seconds from 1970',
  },
  rest: {
    heading: {
      value: 270,
      confidence: 'estimated',
      source:
        'the report gives no yaw at rest (MSC-05161 section 7.1 has the pitch and the roll from the gimbal angles alone). Taken as its approach (the LM flew its last minutes facing along its ground track, its +Z ahead)',
    },
    pitch: {
      value: 6.9,
      confidence: 'documented',
      source:
        'Apollo 15 Mission Report, MSC-05161, section 7.1 (structural and mechanical systems; the ALSJ edition’s p. 63): "The vehicle at-rest attitude, as determined from the gimbal angles, was 6.9 degrees pitch up and 8.6 degrees roll to the left, resulting in a vehicle tilt angle on the lunar surface of approximately 11 degrees from the horizontal"',
    },
    roll: {
      value: -8.6,
      confidence: 'documented',
      source: 'Apollo 15 Mission Report, MSC-05161, section 7.1: "8.6 degrees roll to the left" (left negative)',
    },
  },
});
