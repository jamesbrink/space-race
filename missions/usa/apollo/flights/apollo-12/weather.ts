// Range zero, 14 November 1969. KSC reported the ceiling and visibility; the southeast pad pole measured the wind.
// https://www.ibiblio.org/apollo/Documents/lvfea-AS507-Apollo12.pdf
import { derived, doc, estimated } from '../../../../../src/measure.ts';
import type { DayWeather } from '../../../../../src/types.ts';
import { ALOFT, HOURS } from './aloft.ts';

const REPORT = 'Saturn V Launch Vehicle Flight Evaluation Report AS-507 (MPR-SAT-FE-70-1), appendix A.2–A.3 and table A-1';
const KSC = REPORT + ', Kennedy Space Center station at range zero';
const POLE = REPORT + ', Pad 39A southeast light pole, 18.3 m above natural grade';

export const WEATHER: DayWeather = {
  observed: {
    where: 'Kennedy Space Center station and Pad 39A southeast light pole',
    at: '1969-11-14T16:22:00Z',
    source: REPORT,
  },
  middle: {
    kind: 'stratocumulus',
    cover: doc(1, KSC + ', ten tenths'),
    base: estimated(640, KSC + ', observer-estimated ceiling in metres (2,100 ft)'),
    note: 'The cold front brought rain showers. The layered-cloud renderer shows the continuous ceiling. Aircraft reported tops at 19,000–20,000 ft before launch; the thin rendered deck simplifies that vertical structure.',
  },
  wind: { from: doc(280, POLE + ', degrees true'), speed: doc(6.8, POLE + ', metres per second') },
  visibility: derived(6000, KSC + ', 6 km horizontal visibility, converted to metres'),
  haze: estimated(1000, 'Vertical scale for the moist coastal air under the frontal cloud. The station reported horizontal visibility.'),
  aloft: ALOFT,
  hours: HOURS,
};
