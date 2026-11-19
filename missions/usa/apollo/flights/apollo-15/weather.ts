// Saturn V Launch Vehicle Flight Evaluation Report AS-510, appendix A (MPR-SAT-FE-71-2).
// https://ntrs.nasa.gov/citations/19730025086
import { derived, doc, estimated } from '../../../../../src/measure.ts';
import type { DayWeather } from '../../../../../src/types.ts';
import { ALOFT, HOURS } from './aloft.ts';

const REPORT = 'AS-510 Flight Evaluation Report, appendix A.2–A.4 and table A-1';
const TOWER = `${REPORT}, NASA 150-m ground wind tower facility at Cape Kennedy, at T−0`;
const POLE = `${REPORT}, Pad 39A northwest light pole, 18.3 m above natural grade, one-minute average centered on T−0`;

export const WEATHER: DayWeather = {
  observed: {
    where: 'NASA 150-m ground wind tower facility at Cape Kennedy and Pad 39A northwest light pole',
    at: '1971-07-26T13:34:00Z',
    source: REPORT,
  },
  high: {
    kind: 'cirrus',
    cover: doc(0.7, `${TOWER}, seven tenths, the entire observed sky cover`),
    base: doc(7620, `${TOWER}, 7,620 m (25,000 ft)`),
    depth: estimated(0.2, `${REPORT}, §A.3 describes thin cirrus. The optical depth is estimated for rendering.`),
  },
  wind: { from: doc(156, `${POLE}, degrees`), speed: doc(5.1, `${POLE}, metres per second`) },
  visibility: derived(16000, `${TOWER}, 16 km converted to metres`),
  haze: estimated(1200, 'Estimated vertical haze scale over the coastal plain. The tower facility reported horizontal visibility.'),
  aloft: ALOFT,
  hours: HOURS,
};
