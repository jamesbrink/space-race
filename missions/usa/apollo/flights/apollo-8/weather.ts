// Saturn V Launch Vehicle Flight Evaluation Report AS-503, appendix A §§A.2–A.3 and table A-1.
// https://www.ibiblio.org/apollo/Documents/lvfea-AS503-Apollo8.pdf
import { derived, doc, estimated } from '../../../../../src/measure.ts';
import type { DayWeather } from '../../../../../src/types.ts';
import { ALOFT, HOURS } from './aloft.ts';

const REPORT = 'Saturn V Launch Vehicle Flight Evaluation Report AS-503, appendix A.2–A.3 and table A-1';
const KSC = `${REPORT}, Kennedy Space Center Station B at range zero`;
const POLE = `${REPORT}, Pad 39A northwest light pole, 20.4 m above natural grade, at range zero`;
// NASA SP-4029 (Apollo by the Numbers), in its Apollo 8 narrative and launch weather table, gives 18.7 ft/s (5.7 m/s) from 348° on the
// 60 ft pole; AS-505's table A-6 lists 1.0 m/s from 360°, the station's. The report's own pad reading is taken.
const OTHERS = 'NASA SP-4029 gives 5.7 m/s from 348° on the 60 ft pole; AS-505 table A-6 lists the station’s 1.0 m/s';

export const WEATHER: DayWeather = {
  observed: {
    where: 'Kennedy Space Center Station B and Pad 39A northwest light pole',
    at: '1968-12-21T12:51:00Z',
    source: REPORT,
  },
  high: {
    kind: 'cirrus',
    cover: doc(0.4, `${KSC}, four tenths, "the only cloudiness" (§A.3)`),
    base: estimated(9000, `${KSC}, height "unknown": 9,000 m used for display, as for the other days with an unreported cirrus base`),
    depth: estimated(
      0.2,
      'Optical depth not measured. Thin cirrus is assumed because the observer reported no other cloud and 16 km visibility.',
    ),
    note: 'A cold front passed the afternoon before and lay stationary through the Miami area at launch (§A.2).',
  },
  wind: {
    from: doc(360, `${POLE}, degrees; ${OTHERS}`),
    speed: doc(5.1, `${POLE}, metres per second; the station read 1.0 m/s and the service structure top, 112.5 m up, 9.3 m/s from 345°`),
  },
  visibility: derived(16000, `${KSC}, 16 km (10 statute miles) converted to metres`),
  haze: estimated(1200, 'Vertical haze scale over the coastal plain behind a cold front. The station reported horizontal visibility only.'),
  aloft: ALOFT,
  hours: HOURS,
};
