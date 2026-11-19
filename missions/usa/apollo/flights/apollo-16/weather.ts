// Saturn V Launch Vehicle Flight Evaluation Report AS-511, appendix A (MPR-SAT-FE-72-1).
// https://ntrs.nasa.gov/citations/19730025090
import { derived, doc, estimated } from '../../../../../src/measure.ts';
import type { DayWeather } from '../../../../../src/types.ts';
import { ALOFT, HOURS } from './aloft.ts';

const REPORT = 'AS-511 Flight Evaluation Report, appendix A.2–A.4';
const SKY = `${REPORT}, table A-1, NASA 150-m ground wind tower at Cape Kennedy, at range zero`;
const POLE = `${REPORT}, table A-1, Pad 39A northwest light pole, instantaneous reading 18.3 m above natural grade at range zero`;
const DRIFT = `${REPORT}, figures A-3 and A-4, wind read from the FPS-16 Jimsphere profiles near the 914 m cloud base`;

export const WEATHER: DayWeather = {
  observed: {
    where: 'NASA 150-m ground wind tower at Cape Kennedy and Pad 39A northwest light pole',
    at: '1972-04-16T17:54:00Z',
    source: REPORT,
  },
  low: {
    kind: 'cumulus',
    cover: doc(0.2, `${SKY}, two tenths of the sky`),
    base: doc(914, `${SKY}, 914 m (3,000 ft)`),
    depth: estimated(600, 'Representative depth of scattered fair-weather cumulus. The tower reported only the base.'),
    size: estimated(1600, 'Estimated horizontal extent of individual clouds over the Cape.'),
    wind: { from: estimated(250, DRIFT), speed: estimated(10, DRIFT) },
    note: 'The launch area lay under a ridge of high pressure. SA-511 passed through no clouds during ascent.',
  },
  wind: { from: doc(269, `${POLE}, degrees`), speed: doc(6.3, `${POLE}, metres per second`) },
  visibility: derived(16000, `${SKY}, 16 km converted to metres`),
  haze: estimated(1200, 'Estimated vertical haze scale over the coastal plain. The tower reported horizontal visibility.'),
  aloft: ALOFT,
  hours: HOURS,
};
