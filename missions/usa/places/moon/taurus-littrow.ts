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
  landed: {
    value: Date.parse('1972-12-11T19:54:57Z') / 1000,
    confidence: 'derived',
    source:
      'the range zero and the elapsed time of the landing, both read on the page, added: Apollo 17 Mission Report, JSC-07904 (March 1973), table 3-I (sequence of events), p. 3-2: "Lift-off (Range zero = 342:05:33:00 G.m.t.)" (the 342nd day of 1972, 7 December) and "Lunar landing 110:21:57", times from range zero without the update of the mission clock the table lists (section 2, the report’s note on times). UTC, seconds from 1970',
  },
  rest: {
    heading: {
      value: 270.51,
      confidence: 'estimated',
      source:
        'the report gives no yaw at rest (JSC-07904 section 8.1 has the pitch and the roll alone). Taken as its approach (the LM flew its last minutes facing along its ground track, its +Z ahead)',
    },
    pitch: {
      value: 5.3,
      confidence: 'documented',
      source:
        'Apollo 17 Mission Report, JSC-07904, section 8.1, p. 8-1: "The vehicle attitude on the lunar surface was approximately 5.3 degrees pitch up with a left roll of about 2.6 degrees"',
    },
    roll: {
      value: -2.6,
      confidence: 'documented',
      source:
        'Apollo 17 Mission Report, JSC-07904, section 8.1, p. 8-1: "a left roll of about 2.6 degrees" (left negative)',
    },
  },
});
