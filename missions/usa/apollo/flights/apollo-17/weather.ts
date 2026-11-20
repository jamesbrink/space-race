// Saturn V Launch Vehicle Flight Evaluation Report AS-512, appendix A (MPR-SAT-FE-73-1).
// https://ntrs.nasa.gov/citations/19730025089
import { derived, doc, estimated } from '../../../../../src/measure.ts';
import type { DayWeather } from '../../../../../src/types.ts';
import { ALOFT, HOURS } from './aloft.ts';

const REPORT = 'AS-512 Flight Evaluation Report, appendix A.2–A.3 and table A-1';
const TOWER = `${REPORT}, NASA 150-m ground wind tower at Cape Kennedy, at range zero`;
const POLE = `${REPORT}, Pad 39A northwest light pole at 18.3 m above natural grade, instantaneous reading at range zero`;

export const WEATHER: DayWeather = {
  observed: {
    where: 'NASA 150-m ground wind tower at Cape Kennedy and Pad 39A northwest light pole',
    at: '1972-12-07T05:33:00Z',
    source: REPORT,
  },
  middle: {
    kind: 'stratocumulus',
    cover: doc(0.2, `${TOWER}, two tenths of the sky`),
    base: doc(792, `${TOWER}, 792 m (2,600 ft)`),
    note: 'The tower reported five tenths total sky cover. The overlap between the stratocumulus and cirrus patches is reconstructed.',
  },
  high: {
    kind: 'cirrus',
    cover: doc(0.5, `${TOWER}, five tenths of the sky`),
    base: doc(7925, `${TOWER}, 7,925 m (26,000 ft)`),
    depth: estimated(0.2, `${REPORT}, §A.3 reports that SA-512 passed through thin cirrus. The optical depth is estimated.`),
  },
  wind: { from: doc(5, `${POLE}, degrees`), speed: doc(4.1, `${POLE}, metres per second`) },
  visibility: derived(11000, `${TOWER}, 11 km converted to metres`),
  haze: estimated(1100, 'Vertical haze scale for the moist coastal air. The tower measured horizontal visibility.'),
  aloft: ALOFT,
  hours: HOURS,
};
