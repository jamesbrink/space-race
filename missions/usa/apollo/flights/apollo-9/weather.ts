// Saturn V Launch Vehicle Flight Evaluation Report AS-504, appendix A §§A.2–A.3 and table A-1.
// https://www.ibiblio.org/apollo/Documents/lvfea-AS504-Apollo9.pdf
import { derived, doc, estimated } from '../../../../../src/measure.ts';
import type { DayWeather } from '../../../../../src/types.ts';
import { ALOFT, HOURS } from './aloft.ts';

const REPORT = 'Saturn V Launch Vehicle Flight Evaluation Report AS-504, appendix A.2–A.3 and table A-1';
const MILA = `${REPORT}, Kennedy Space Center station (MILA) at range zero`;
const POLE = `${REPORT}, Pad 39A southeast light pole, 20.4 m above natural grade, at range zero`;

export const WEATHER: DayWeather = {
  observed: {
    where: 'Kennedy Space Center station (MILA) and Pad 39A southeast light pole',
    at: '1969-03-03T16:00:00Z',
    source: REPORT,
  },
  middle: {
    kind: 'stratocumulus',
    cover: derived(
      1,
      `${MILA}: seven tenths stratocumulus at 1,070 m under ten tenths altostratus at 2,740 m (9,000 ft); the sky wholly hidden, so one overcast deck`,
    ),
    base: doc(1070, `${MILA}, stratocumulus base 1,070 m (3,500 ft)`),
    note: 'A low south-west of the Cape in the Gulf of Mexico kept the sky overcast (§A.2); dense cloud kept the tracking cameras from the vehicle. The viewer has one layered deck: the stratocumulus at its base stands for both layers, and the altostratus above it is not drawn on its own.',
  },
  wind: { from: doc(160, `${POLE}, degrees true`), speed: doc(6.9, `${POLE}, metres per second (13.4 knots; NASA SP-4029 agrees)`) },
  visibility: derived(16000, `${MILA}, 16 km (10 statute miles) converted to metres`),
  haze: estimated(1000, 'Vertical haze scale for the moist air under the overcast. The station reported horizontal visibility only.'),
  aloft: ALOFT,
  hours: HOURS,
};
