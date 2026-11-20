import { derived, doc, estimated } from '../../../../../src/measure.ts';
import type { DayWeather } from '../../../../../src/types.ts';
import { ALOFT, HOURS } from './aloft.ts';

const report = 'SA-206 flight evaluation MPR-SAT-FE-73-3, appendix A, table A-1';
const tower = `${report}, NASA 150-m ground wind tower at range zero`;
const pole = `${report}, northwest Pad 39B light pole at 18.3 m above grade`;
const lut = `${report}, Pad 39B LUT at 161.5 m, used to estimate drift at the 244-m base`;
export const WEATHER: DayWeather = {
  observed: {
    where: 'NASA ground wind tower, Pad 39B northwest light pole and launch umbilical tower',
    at: '1973-05-25T13:00:00Z',
    source: report,
  },
  low: {
    kind: 'cumulus',
    cover: doc(0.5, tower),
    base: doc(244, tower),
    depth: estimated(260, 'Reconstructed depth of the reported low fractocumulus. Individual tops were not tabulated.'),
    size: estimated(460, 'Reconstructed horizontal size of the ragged cloud fragments.'),
    wind: { from: estimated(224, lut), speed: estimated(6.1, lut) },
    note: 'Fractocumulus below a separate altocumulus deck; the observer reported nine tenths total cover including cirrus.',
  },
  middle: { kind: 'altocumulus', cover: doc(0.5, tower), base: doc(2438, tower) },
  high: {
    kind: 'cirrus',
    cover: doc(0.1, tower),
    base: doc(9144, tower),
    depth: estimated(0.2, 'Estimated optical depth of the scattered cirrus reported over the pad.'),
  },
  wind: { from: doc(212, pole), speed: doc(5.5, pole) },
  visibility: derived(10000, `${tower}, 10 km converted to metres`),
  haze: estimated(950, 'Estimated haze scale for the humid coastal boundary layer.'),
  aloft: ALOFT,
  hours: HOURS,
};
