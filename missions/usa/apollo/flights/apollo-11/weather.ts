// AS-506 Flight Evaluation Report MPR-SAT-FE-69-9, appendix A §§2–3 and table A-1:
// KSC's observer supplied the sky and visibility. The wind is the southeast light pole's at Pad 39A.
// https://www.ibiblio.org/apollo/Documents/lvfea-AS506-Apollo11.pdf
// The cloud-base drift uses the nearby sounding archived in NOAA IGRA:
// https://www.ncei.noaa.gov/pub/data/igra/data/data-por/USM00074794-data.txt.zip
import { derived, doc, estimated } from '../../../../../src/measure.ts';
import type { DayWeather } from '../../../../../src/types.ts';
import { ALOFT, HOURS } from './aloft.ts';

const SKY =
  'Saturn V Launch Vehicle Flight Evaluation Report AS-506, appendix A.3 and table A-1, Kennedy Space Center station at range zero';
const POLE = 'AS-506 Flight Evaluation Report, table A-1, Pad 39A southeast light pole at 18.3 m above natural grade, 13:32 UTC';
const SONDE = 'NOAA IGRA 2, Cape Kennedy USM00074794, 16 July 1969 14 UTC sounding; wind at 177 m: 205°/6 m/s, and 1,600 m: 197°/5 m/s';
const FT = 0.3048;
const base = 2400 * FT;
// Approximate the 2,400-foot base over the low coastal site by its height above sea level.
// Interpolate the observed east and north components, then convert the result back to a meteorological bearing.
const fraction = (base - 177) / (1600 - 177);
const rad = Math.PI / 180;
const east = -(1 - fraction) * 6 * Math.sin(205 * rad) - fraction * 5 * Math.sin(197 * rad);
const north = -(1 - fraction) * 6 * Math.cos(205 * rad) - fraction * 5 * Math.cos(197 * rad);
const drift = `${SONDE}; horizontal wind components interpolated linearly in height to the cloud base over the coastal plain`;

export const WEATHER: DayWeather = {
  observed: {
    where: 'Kennedy Space Center station and Pad 39A southeast light pole',
    at: '1969-07-16T13:32:00Z',
    source: `${SKY}; ${POLE}`,
  },
  low: {
    kind: 'cumulus',
    cover: doc(0.1, `${SKY}, one tenth`),
    base: derived(base, `${SKY}, base 2,400 feet`),
    depth: estimated(800, 'No height of the cumulus tops was reported. Estimated depth for the scattered summer morning cumulus.'),
    size: estimated(2000, 'Horizontal size of the individual heaps estimated; the observer reported only cover and base.'),
    wind: { from: derived((Math.atan2(-east, -north) / rad + 360) % 360, drift), speed: derived(Math.hypot(east, north), drift) },
  },
  middle: { kind: 'altocumulus', cover: doc(0.2, `${SKY}, two tenths`), base: derived(15000 * FT, `${SKY}, base 15,000 feet`) },
  high: {
    kind: 'cirrostratus',
    cover: doc(0.9, `${SKY}, nine tenths`),
    base: estimated(9000, `${SKY}, high layer with unreported base; 9,000 m used for display`),
    depth: estimated(0.55, 'Optical depth of the cirrostratus was not measured; represents a translucent veil.'),
  },
  wind: { from: doc(175, `${POLE}, degrees true`), speed: doc(3.3, `${POLE}, metres per second`) },
  visibility: derived(10 * 1609.344, `${SKY}, 10 statute miles`),
  haze: estimated(1200, 'Estimated haze scale height over the moist coastal plain. The KSC station measured horizontal visibility only.'),
  aloft: ALOFT,
  hours: HOURS,
};
