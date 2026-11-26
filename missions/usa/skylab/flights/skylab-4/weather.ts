// Saturn IB SA-208 flight evaluation, MPR-SAT-FE-74-1: https://ntrs.nasa.gov/citations/19750002068
import { derived, doc, estimated } from '../../../../../src/measure.ts';
import type { DayWeather } from '../../../../../src/types.ts';
import { ALOFT, HOURS } from './aloft.ts';

const report = 'SA-208 flight evaluation MPR-SAT-FE-74-1, appendix A';
const pole = `${report}, table A-1, northwest Pad 39B light pole, instantaneous at range zero, 18.3 m above natural grade`;

export const WEATHER: DayWeather = {
  observed: {
    where: 'NASA ground wind tower and Pad 39B northwest light pole',
    at: '1973-11-16T14:01:23Z',
    source: `${report}, §A.3 and table A-1`,
  },
  middle: {
    kind: 'altocumulus',
    cover: estimated(0.05, `${report}, §A.3 reports less than one tenth. Half a tenth represents the trace.`),
    base: derived(13000 * 0.3048, `${report}, §A.3, 13,000 feet converted to metres`),
    note: 'The tower classified the sky as clear. The launch vehicle passed through no clouds during ascent.',
  },
  wind: { from: doc(202, pole), speed: doc(3.6, pole) },
  visibility: derived(16000, `${report}, table A-1, NASA ground wind tower, 16 km converted to metres`),
  haze: estimated(1100, 'Estimated vertical extent of the coastal haze for the observed horizontal visibility.'),
  aloft: ALOFT,
  hours: HOURS,
};
