// The southeast light pole measured the wind at SA-508. The MILA station supplied the cloud and visibility observations.
// https://www.ibiblio.org/apollo/Documents/lvfea-AS508-Apollo13.pdf
import { derived, doc, estimated } from '../../../../../src/measure.ts';
import type { DayWeather } from '../../../../../src/types.ts';
import { ALOFT, HOURS } from './aloft.ts';

const REPORT = 'AS-508 Flight Evaluation Report (MPR-SAT-FE-70-2), appendix A.2–A.3 and table A-1';
const MILA = REPORT + ', MILA (SSB), Kennedy Space Center, at range zero';
const POLE = REPORT + ', Pad 39A southeast light pole, 18.3 m above natural grade, at range zero';

export const WEATHER: DayWeather = {
  observed: {
    where: 'MILA (SSB), Kennedy Space Center, and Pad 39A southeast light pole',
    at: '1970-04-11T19:13:00Z',
    source: REPORT,
  },
  middle: {
    kind: 'altocumulus',
    cover: doc(0.4, MILA + ', four tenths'),
    base: doc(5790, MILA + ', 5,790 m (19,000 ft)'),
  },
  high: {
    kind: 'cirrostratus',
    cover: doc(1, MILA + ', ten tenths'),
    base: estimated(7925, MILA + ', observer-estimated 7,925 m (26,000 ft)'),
    depth: estimated(0.4, REPORT + ', A.3 describes a thin veil; its optical depth was not measured separately from the altocumulus'),
  },
  wind: { from: doc(105, POLE + ', degrees true'), speed: doc(6.3, POLE + ', metres per second') },
  visibility: derived(16000, MILA + ', 16 km horizontal visibility converted to metres'),
  haze: estimated(1200, 'Vertical haze scale over the coastal plain. The station measured horizontal visibility.'),
  aloft: ALOFT,
  hours: HOURS,
};
