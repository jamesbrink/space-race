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
    value: Date.parse('1969-07-20T20:17:39.9Z') / 1000,
    confidence: 'derived',
    source:
      'the range zero and the elapsed time of the landing, both read on the page, added: Apollo 11 Mission Report, MSC-00171 (November 1969), table 3-I (sequence of events), p. 3-4: "Range zero - 13:32:00 G.m.t., July 16, 1969" and "Lunar landing 102:45:39.9". UTC, seconds from 1970',
  },
  rest: {
    heading: {
      value: 268.64,
      confidence: 'estimated',
      source:
        'the report gives no heading at rest: section 5.4 (p. 5-6) has a slight yaw right as it touched down, and table 9.6-IV (p. 9-12) a yaw of 13.3 degrees in a frame it does not name. Taken as its approach (the LM flew its last minutes facing along its ground track, its +Z ahead)',
    },
    pitch: {
      value: 4.5,
      confidence: 'documented',
      source:
        'Apollo 11 Mission Report, MSC-00171, section 11.1.3, p. 11-6: "The lunar module was tilted 4.5 degrees east (backward) on the lunar surface" (the guidance’s own alignments on the surface, table 9.6-IV p. 9-12, have 4.40 degrees of pitch)',
    },
    roll: {
      value: 0,
      confidence: 'estimated',
      source:
        'level across: the report gives no roll at rest in its own words; the guidance’s alignments on the surface (MSC-00171 table 9.6-IV, p. 9-12) have half a degree of roll, in a frame and to a side the table does not say',
    },
  },
});
