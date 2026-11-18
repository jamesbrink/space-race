import { doc, estimated } from '../../../../../src/measure.ts';
import type { DayWeather } from '../../../../../src/types.ts';
import { ALOFT, HOURS } from './aloft.ts';

const REPORT = 'the Gemini XII mission report (MSC-G-R-67-1), section 12.2';

export const WEATHER: DayWeather = {
  observed: {
    where: 'Cape Kennedy: the launch area',
    at: '1966-11-11T20:46:00Z',
    source: `${REPORT}: launch-area observation at 3:46 p.m. EST`,
  },
  high: {
    kind: 'cirrus',
    cover: doc(0.4, `${REPORT}: high scattered, 4/10 covered`),
    base: estimated(10000, 'The altitude was unreported; taken at a typical cirrus height'),
    depth: estimated(0.2, 'Optical depth was unreported; estimated for the rendered high cloud'),
  },
  wind: {
    from: doc(80, `${REPORT}: 80° from north`),
    speed: doc(2.57, `${REPORT}: 5 knots`),
  },
  visibility: estimated(25_000, `${REPORT}: 10 statute miles, the station reporting limit; 25 km taken beyond that`),
  haze: estimated(1_200, 'Haze height was unreported; a 1.2 km scale height is taken for coastal air'),
  aloft: ALOFT,
  hours: HOURS,
};
