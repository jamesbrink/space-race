import { ALOFT, HOURS } from './aloft.ts';
import type { DayWeather } from '../../../../../src/types.ts';

const ISD = 'NOAA Integrated Surface Database, station 747940-12868 (Cape Kennedy AFS: the Skid Strip, 2.7 km south of the pad)';
const GVII = 'the Gemini VII mission report (MSC-G-R-66-1), 12.2, p. 12-9';

/**
 * The weather Gemini 7 left under: the afternoon of 4 December 1965 at Cape Kennedy, at liftoff (14:30:03.702 EST). The
 * mission report has the launch area's observation at 2:30 p.m.: "5/10 altocumulus at 16 000 ft", the wind 340° at 10
 * knots, 8 miles (12.2). Over it the Cape's station had the sky's total at its highest class all afternoon with no
 * ceiling, which is a sheet of cirrostratus: eight oktas of it at 13:00 EST. A cool north wind under a milky sky, as
 * NASA S65-61632 has the erector going down. The README has it in words ("The weather").
 */
export const WEATHER: DayWeather = {
  observed: {
    where: 'Cape Kennedy: the launch area at liftoff',
    at: '1965-12-04T19:30:00Z',
    source: `${GVII}: "Surface weather observations in the launch area taken at 2:30 p.m. e.s.t."; ${ISD}, the hours either side`,
  },
  middle: {
    kind: 'altocumulus',
    cover: { value: 0.5, confidence: 'documented', source: `${GVII}: "5/10 altocumulus at 16 000 ft"` },
    base: {
      value: 4880,
      confidence: 'documented',
      source: `${GVII}: 16,000 ft. The station had two oktas of altocumulus at 4,200 m at 13:00 EST (${ISD})`,
    },
  },
  high: {
    kind: 'cirrostratus',
    cover: {
      value: 0.9,
      confidence: 'estimated',
      source:
        `eight oktas of cirrostratus at 13:00 EST (${ISD}: documented for that hour), the sky's total at its highest class with no ` +
        'ceiling from 12:00 to 15:00, and a milky sky in NASA S65-61632. Nine tenths taken, the sheet not quite whole',
    },
    base: {
      value: 9000,
      confidence: 'estimated',
      source: 'not recorded (the station codes it as high, with no height): where cirrostratus usually lies over Florida in winter',
    },
    depth: {
      value: 1,
      confidence: 'estimated',
      source: 'not recorded: a sheet the Sun shone through, dimmed, and cast shadows, as the photographs of the afternoon have them',
    },
  },
  wind: {
    from: {
      value: 340,
      confidence: 'documented',
      source: `${GVII}: 340°. The station had 340° at 14:00 EST and 350° at 15:00 (${ISD})`,
    },
    speed: {
      value: 5.1,
      confidence: 'documented',
      source: `${GVII}: 10 knots; the station 5.1 m/s at 14:00 EST and 5.7 at 15:00 (${ISD})`,
    },
  },
  visibility: {
    value: 12_900,
    confidence: 'documented',
    source: `${GVII}: 8 miles; the station 12.8 km at every hour from 12:00 to 15:00 EST (${ISD}), under its limit, so a measure`,
  },
  haze: {
    value: 1200,
    confidence: 'estimated',
    source:
      'not recorded: eight miles under a high sheet in a cool north wind; the haze is taken to fall off over a kilometre and a little more',
  },
  // the air over the pad and the surface's hours round liftoff: ERA5's (aloft.ts, tools/era5-aloft.mjs). The mission
  // report's Table 12.2-I and Figure 12.2-1 have the launch area's air an hour before liftoff and are named in the README
  aloft: ALOFT,
  hours: HOURS,
};
