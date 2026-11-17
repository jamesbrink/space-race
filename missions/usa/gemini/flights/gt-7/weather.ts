import { derived } from '../../../../../src/measure.ts';
import type { DayWeather } from '../../../../../src/types.ts';
import { ALOFT, HOURS } from './aloft.ts';

const ISD = 'NOAA Integrated Surface Database, station 747940-12868 (Cape Kennedy AFS: the Skid Strip, 2.7 km south of the pad)';
const GVII = 'the Gemini VII mission report (MSC-G-R-66-1), 12.2, p. 12-9';

const ERA5_WAVES =
  'ERA5 (ECMWF), its wave model at 14:00 UTC on 18 December 1965, between the four cells round 25.42 N, 70.11 W (the landing point by Grand Turk’s radar, 25°25.1′ N 70°06.7′ W, the Gemini VII mission report, Table 4.3-I, as the README and flight.ts give it; landed 330 h 35 min 1 s after liftoff (flight.ts), 14:05:05 UTC), read from the public ARCO-ERA5 store by tools/era5.mjs `fieldAt`; 15:00 differs by under 0.05 m and 0.07 s, the swell by 2° and the wind’s waves by 8°';

/**
 * The sea where it came down, five minutes after the hour: ERA5's waves there, a long swell of 1.4 m from the
 * north-north-east and a sea of 0.5 m raised by the wind from the west-north-west. Nothing the flight's files quote speaks
 * of the sea.
 */
const SEA: DayWeather['sea'] = {
  observed: { where: 'the landing area, 25.42 N, 70.11 W', at: '1965-12-18T14:00:00Z', source: ERA5_WAVES },
  trains: [
    {
      label: 'the swell',
      height: derived(1.433, `${ERA5_WAVES}: significant height of the total swell`),
      period: derived(9.338, `${ERA5_WAVES}: mean period of the total swell`),
      from: derived(19.9, `${ERA5_WAVES}: mean direction of the total swell, coming from`),
    },
    {
      label: 'the wind’s waves',
      height: derived(0.538, `${ERA5_WAVES}: significant height of the wind waves`),
      period: derived(3.163, `${ERA5_WAVES}: mean period of the wind waves`),
      from: derived(295.4, `${ERA5_WAVES}: mean direction of the wind waves, coming from`),
    },
  ],
};

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
  sea: SEA,
};
