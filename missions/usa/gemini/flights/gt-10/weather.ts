import { assumed, doc, estimated } from '../../../../../src/measure.ts';
import type { DayWeather } from '../../../../../src/types.ts';
import { ALOFT, HOURS } from './aloft.ts';

const REPORT = 'the Gemini X mission report (MSC-G-R-66-7), section 12.2';

export const WEATHER: DayWeather = {
  observed: {
    where: 'Cape Kennedy: the launch area',
    at: '1966-07-18T22:00:00Z',
    source: `${REPORT}: launch-area observation at 5:00 p.m. EST`,
  },
  low: {
    kind: 'cumulus',
    cover: estimated(0.35, 'Scattered in the report; 35 percent is taken within that class'),
    base: doc(671, `${REPORT}: scattered at 2,200 ft`),
    depth: estimated(500, 'Cloud tops were unreported; drawn as shallow summer cumulus'),
    size: estimated(1000, 'Unreported; estimated width of a cloud'),
    wind: {
      from: assumed(10, `${REPORT}: the launch-area wind at the surface, taken for the cloud bases`),
      speed: assumed(6.17, `${REPORT}: 12 knots at the surface, taken for the cloud bases`),
    },
  },
  high: {
    kind: 'cirrostratus',
    cover: doc(1, `${REPORT}: high overcast`),
    base: estimated(9500, 'The altitude was unreported; taken at a typical cirrus height'),
    depth: estimated(0.85, 'Optical depth was unreported; estimated for the rendered high cloud'),
  },
  wind: {
    from: doc(10, `${REPORT}: 10° from north`),
    speed: doc(6.17, `${REPORT}: 12 knots`),
  },
  visibility: estimated(25_000, `${REPORT}: 10 statute miles, the station reporting limit; 25 km taken beyond that`),
  haze: estimated(1_200, 'Haze height was unreported; a 1.2 km scale height is taken for coastal air'),
  aloft: ALOFT,
  hours: HOURS,
};
