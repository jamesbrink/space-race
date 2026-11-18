import { assumed, doc, estimated } from '../../../../../src/measure.ts';
import type { DayWeather } from '../../../../../src/types.ts';
import { ALOFT, HOURS } from './aloft.ts';

const REPORT = 'the Gemini XI mission report (MSC-G-R-66-8), section 12.2';
const NWS = 'NOAA/NWS Spaceflight Meteorology Group, SMG Weather History: Gemini XI launch';

export const WEATHER: DayWeather = {
  observed: {
    where: 'Cape Kennedy: the launch area',
    at: '1966-09-12T14:46:00Z',
    source: `${REPORT}: launch-area observation at 9:46 a.m. EST`,
  },
  low: {
    kind: 'cumulus',
    cover: estimated(0.35, 'Two scattered layers at 900 and 1,600 ft; represented together as one field of 35 percent'),
    base: doc(274, `${REPORT}: scattered at 900 ft`),
    depth: estimated(420, 'Cloud tops were unreported; drawn as shallow summer cumulus'),
    size: estimated(800, 'Unreported; estimated width of a cloud'),
    wind: {
      from: assumed(200, `${REPORT}: the launch-area wind at the surface, taken for the cloud bases`),
      speed: assumed(1.54, `${REPORT}: 3 knots at the surface, taken for the cloud bases`),
    },
  },
  middle: {
    kind: 'altocumulus',
    cover: estimated(0.7, 'Broken in the NWS summary; 70 percent is taken within that class'),
    base: doc(3962, `${NWS}: BKN130, a broken layer at 13,000 ft; the mission report prints 1,300 ft`),
    note: 'The NWS report code supplies the altitude; altocumulus is the rendered form of the broken mid-level layer.',
  },
  high: {
    kind: 'cirrus',
    cover: estimated(0.7, `${REPORT}: high broken, without a fraction; 70 percent is taken`),
    base: estimated(10000, 'The altitude was unreported; taken at a typical cirrus height'),
    depth: estimated(0.28, 'Optical depth was unreported; estimated for the rendered high cloud'),
  },
  wind: {
    from: doc(200, `${REPORT}: 200° from north`),
    speed: doc(1.54, `${REPORT}: 3 knots`),
  },
  visibility: estimated(25_000, `${REPORT}: 10 statute miles, the station reporting limit; 25 km taken beyond that`),
  haze: estimated(1_200, 'Haze height was unreported; a 1.2 km scale height is taken for coastal air'),
  aloft: ALOFT,
  hours: HOURS,
};
