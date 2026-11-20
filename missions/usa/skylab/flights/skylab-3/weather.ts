import { derived, doc, estimated } from '../../../../../src/measure.ts';
import type { DayWeather } from '../../../../../src/types.ts';
import { ALOFT, HOURS } from './aloft.ts';

const report = 'SA-207 flight evaluation MPR-SAT-FE-73-5, appendix A, table A-1';
const tower = `${report}, NASA 150-m ground wind tower at range zero`;
const pole = `${report}, northwest Pad 39B light pole at 18.3 m above natural grade`;

export const WEATHER: DayWeather = {
  observed: {
    where: 'NASA ground wind tower and Pad 39B northwest light pole',
    at: '1973-07-28T11:10:50Z',
    source: report,
  },
  middle: {
    kind: 'altocumulus',
    cover: doc(0.9, tower),
    base: doc(4570, tower),
    note: 'The observer reported ten tenths total cover across the altocumulus and cirrus layers.',
  },
  high: {
    kind: 'cirrus',
    cover: doc(0.5, tower),
    base: doc(6400, tower),
    depth: estimated(0.22, 'Estimated optical depth of the cirrus above the broken altocumulus.'),
  },
  wind: { from: doc(264, pole), speed: doc(2.6, pole) },
  visibility: derived(4800, `${tower}, 4.8 km in ground fog converted to metres`),
  haze: estimated(
    90,
    'SA-207 flight evaluation §A.3 reports ground fog about 600 ft thick in patches. Estimated e-folding height of its modeled extinction.',
  ),
  aloft: ALOFT,
  hours: HOURS,
};
