// Saturn V Launch Vehicle Flight Evaluation Report AS-505, appendix A §§A.2–A.3 and table A-1:
// the station's sky and visibility; the wind is the southeast light pole's at Pad 39B.
// https://www.ibiblio.org/apollo/Documents/lvfea-AS505-Apollo10.pdf
// The cloud-base drift uses the nearest sounding archived in NOAA IGRA:
// https://www.ncei.noaa.gov/pub/data/igra/data/data-por/USM00074794-data.txt.zip
import { derived, doc, estimated } from '../../../../../src/measure.ts';
import type { DayWeather } from '../../../../../src/types.ts';
import { ALOFT, HOURS } from './aloft.ts';

const REPORT = 'Saturn V Launch Vehicle Flight Evaluation Report AS-505, appendix A.2–A.3 and table A-1';
const KSC = `${REPORT}, Kennedy Space Center station, Merritt Island, at range zero`;
const POLE = `${REPORT}, Pad 39B southeast light pole, 20.1 m above natural grade, at range zero`;
const SONDE =
  'NOAA IGRA 2, Cape Kennedy USM00074794, 18 May 1969 18 UTC sounding (71 minutes after range zero); wind at 163 m: 126°/11.0 m/s, and 1,557 m: 149°/9.0 m/s';
const base = 671;
// Interpolate the observed east and north components to the cloud base, then turn the result back into a bearing.
const fraction = (base - 163) / (1557 - 163);
const rad = Math.PI / 180;
const east = -(1 - fraction) * 11 * Math.sin(126 * rad) - fraction * 9 * Math.sin(149 * rad);
const north = -(1 - fraction) * 11 * Math.cos(126 * rad) - fraction * 9 * Math.cos(149 * rad);
const drift = `${SONDE}; horizontal wind components interpolated linearly in height to the cloud base`;

export const WEATHER: DayWeather = {
  observed: {
    where: 'Kennedy Space Center station, Merritt Island, and Pad 39B southeast light pole',
    at: '1969-05-18T16:49:00Z',
    source: REPORT,
  },
  low: {
    kind: 'cumulus',
    cover: doc(0.4, `${KSC}, four tenths`),
    base: doc(base, `${KSC}, 671 m (2,200 ft)`),
    depth: estimated(800, 'No height of the cumulus tops was reported. Estimated depth for scattered cumulus in moist south-easterly air.'),
    size: estimated(1600, 'Horizontal size of the individual heaps estimated; the observer reported only cover and base.'),
    wind: { from: derived((Math.atan2(-east, -north) / rad + 360) % 360, drift), speed: derived(Math.hypot(east, north), drift) },
  },
  middle: {
    kind: 'altocumulus',
    cover: doc(0.2, `${KSC}, two tenths`),
    base: estimated(3350, `${KSC}, 3,350 m (11,000 ft), marked E: the observer's estimate`),
    note: 'Table A-1 and NASA SP-4029 call this layer altocumulus; the report’s own §A.3 calls it altostratus.',
  },
  high: {
    kind: 'cirrus',
    cover: doc(1, `${KSC}, ten tenths`),
    base: estimated(9000, `${KSC}, height "high", not measured: 9,000 m used for display`),
    depth: estimated(
      0.3,
      'Optical depth not measured. The observer called it cirrus, not cirrostratus: taken at the thin end of the classes.',
    ),
  },
  wind: {
    from: doc(125, `${POLE}, degrees; NASA SP-4029 gives 142° on the 60 ft pole`),
    speed: doc(8.2, `${POLE}, metres per second (16.0 knots); NASA SP-4029 gives 19.0 knots`),
  },
  visibility: derived(18000, `${KSC}, 18 km (11 statute miles) converted to metres`),
  haze: estimated(1200, 'Vertical haze scale for the moist air off the Atlantic. The station reported horizontal visibility only.'),
  aloft: ALOFT,
  hours: HOURS,
};
