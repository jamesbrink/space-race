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
    value: Date.parse('1969-11-19T06:54:36Z') / 1000,
    confidence: 'derived',
    source:
      'the range zero and the elapsed time of the landing, both read on the page, added: Apollo 12 Mission Report, MSC-01855 (March 1970), table 5-I (sequence of events), pp. 5-1 and 5-2: "Range zero - 16:22:00 G.m.t., Nov. 14, 1969" and "Lunar landing 110:32:36". UTC, seconds from 1970',
  },
  rest: {
    heading: {
      value: 284.2,
      confidence: 'estimated',
      source:
        'the report gives no yaw at rest (MSC-01855 section 4.2.3, p. 4-23, has the pitch and the roll alone). Taken as its approach (the LM flew its last minutes facing along its ground track, its +Z ahead)',
    },
    pitch: {
      value: 3,
      confidence: 'documented',
      source:
        'Apollo 12 Mission Report, MSC-01855, section 4.2.3 (landing dynamics), p. 4-23: "The final resting attitude, as viewed by the crew, was 3 degrees up in pitch and a 3.8-degree roll left"',
    },
    roll: {
      value: -3.8,
      confidence: 'documented',
      source:
        'Apollo 12 Mission Report, MSC-01855, section 4.2.3, p. 4-23: "a 3.8-degree roll left, which indicates a surface slope of about 4 or 5 degrees downward to the left and rear of the crew" (left negative)',
    },
  },
});
