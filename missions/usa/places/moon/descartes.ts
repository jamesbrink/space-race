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
    value: Date.parse('1972-04-21T02:23:35Z') / 1000,
    confidence: 'derived',
    source:
      'the range zero and the elapsed time of the landing, both read on the page, added: Apollo 16 Mission Report, MSC-07230 (August 1972), table 3-I (sequence of events), p. 3-2: "Lift-off (Range zero = 17:54:00 G.m.t., April 16, 1972)" and "Lunar landing 104:29:35", times from range zero without the two updates of the mission clock the table lists (section 2.0, p. 2-1). UTC, seconds from 1970',
  },
  rest: {
    heading: {
      value: 270.31,
      confidence: 'estimated',
      source:
        'Apollo 16 Mission Report, MSC-07230, section 9, p. 9-19: "with a slight yaw to the south", given no figure; taken as its approach (the LM flew its last minutes facing along its ground track, its +Z ahead), the slight yaw left out',
    },
    pitch: {
      value: 2.5,
      confidence: 'documented',
      source:
        'Apollo 16 Mission Report, MSC-07230, section 9 (pilots’ report), p. 9-19: "The attitude of the vehicle after touchdown was essentially zero roll, 2 1/2 degrees pitch up, with a slight yaw to the south"',
    },
    roll: {
      value: 0,
      confidence: 'documented',
      source: 'Apollo 16 Mission Report, MSC-07230, section 9, p. 9-19: "essentially zero roll"',
    },
  },
});
