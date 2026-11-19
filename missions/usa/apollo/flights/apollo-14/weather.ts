// AS-509 Flight Evaluation Report, appendix A.2–A.4. The shower band had cleared the pad at liftoff.
// https://www.apollojournals.org/afj/ap14fj/pdf/a14_saturn-v-fer.pdf
import { derived, doc, estimated } from '../../../../../src/measure.ts';
import type { DayWeather } from '../../../../../src/types.ts';
import { ALOFT, HOURS } from './aloft.ts';

const REPORT = 'Saturn V Launch Vehicle Flight Evaluation Report AS-509, appendix A.2–A.4';
const MILA = `${REPORT}, table A-1, MILA (SSB), Kennedy Space Center, at range zero`;
const POLE = `${REPORT}, table A-1, Pad 39A northwest light pole, 18.3 m above natural grade, one-minute average about T−0`;
const DRIFT = `${REPORT}, figs. A-3 and A-4, FPS-16 Jimsphere wind read from profiles at the approximate cumulus base (1.2 km)`;

export const WEATHER: DayWeather = {
  observed: {
    where: 'MILA (SSB), Kennedy Space Center, and Pad 39A northwest light pole',
    at: '1971-01-31T21:03:02Z',
    source: REPORT,
  },
  low: {
    kind: 'cumulus',
    cover: doc(0.7, `${MILA}, seven tenths cumulus`),
    base: estimated(1219, `${MILA}, observer-estimated 1,219 m (4,000 ft)`),
    depth: estimated(900, `${REPORT}, §A.3, representative depth within the aircraft-reported 0.6–1.2 km range near the pad`),
    size: estimated(2000, 'Representative horizontal size of a cumulus cloud in the band. Individual cloud widths were not reported.'),
    wind: { from: estimated(260, DRIFT), speed: estimated(13, DRIFT) },
    note: 'The shower band prompted a countdown hold. No rain was falling at the pad when SA-509 lifted off.',
  },
  middle: {
    kind: 'altocumulus',
    cover: doc(0.2, `${MILA}, two tenths altocumulus; total sky cover across both layers was eight tenths`),
    base: doc(2438, `${MILA}, 2,438 m (8,000 ft)`),
  },
  wind: { from: doc(255, `${POLE}, degrees`), speed: doc(5, `${POLE}, metres per second`) },
  visibility: derived(16000, `${MILA}, 16 km horizontal visibility converted to metres`),
  haze: estimated(1200, 'Estimated vertical haze scale over the coastal plain after the showers. MILA reported horizontal visibility.'),
  aloft: ALOFT,
  hours: HOURS,
};
