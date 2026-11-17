import { derived } from '../../../../../src/measure.ts';
import type { DayWeather } from '../../../../../src/types.ts';
import { ALOFT, HOURS } from './aloft.ts';

const ISD = 'NOAA Integrated Surface Database, station 74794012868 (Cape Canaveral: the Skid Strip, 2.1 km south-west of the pad)';
const HOUR = '10:00 EST (15:00 UTC), 20 February 1962';
const RESULTS = 'Results of the First United States Manned Orbital Space Flight (NASA MSC, 1962)';

const ERA5_WAVES =
  'ERA5 (ECMWF), its wave model at 20:00 UTC on 20 February 1962, between the four cells round 21.43 N, 68.61 W (where the capsule was picked up, 21°25.6′ N 68°36.5′ W, NASA SP-45, Table 8-III, as orbital.ts has it: the landing itself was not fixed more closely; landed at 19:43:02 UTC, the README’s), read from the public ARCO-ERA5 store by tools/era5.mjs `fieldAt`; 19:00 differs by under 0.06 m, 0.2 s and 3°';

/**
 * The sea where it came down, seventeen minutes before the hour: ERA5's waves there, a swell of a metre and a half from the
 * east-north-east and a smaller sea raised by the wind from the east-south-east. The README has three-foot waves in the
 * landing area (the transcript, 04:42:27); ERA5's sea, the two together, is higher, about 1.6 m.
 */
const SEA: DayWeather['sea'] = {
  observed: { where: 'the landing area, 21.43 N, 68.61 W', at: '1962-02-20T20:00:00Z', source: ERA5_WAVES },
  trains: [
    {
      label: 'the swell',
      height: derived(1.499, `${ERA5_WAVES}: significant height of the total swell`),
      period: derived(7.497, `${ERA5_WAVES}: mean period of the total swell`),
      from: derived(66.5, `${ERA5_WAVES}: mean direction of the total swell, coming from`),
    },
    {
      label: 'the wind’s waves',
      height: derived(0.579, `${ERA5_WAVES}: significant height of the wind waves`),
      period: derived(3.297, `${ERA5_WAVES}: mean period of the wind waves`),
      from: derived(123.4, `${ERA5_WAVES}: mean direction of the wind waves, coming from`),
    },
  ],
};

/**
 * The weather Friendship 7 stood under: the morning of 20 February 1962 at Cape Canaveral, at the Cape's observation
 * twelve minutes after liftoff (09:47:39 EST). A front had gone through in the night: the station had the sky overcast
 * at 720 m at 07:00 EST with patches of shallow fog, broken at 810 m at 08:00, then scattered with no ceiling at 09:00
 * and 10:00, the wind gone round from west to north and freshening, the dew point down nine degrees in three hours.
 * At 10:00 the one layer it reports is two oktas of altocumulus at 4,800 m; no low cloud is in the record at 09:00 or
 * 10:00, so none is drawn over the pad. "The sky began to clear" at 05:58 by This New Ocean (p. 423), and through the
 * periscope during the hold of 07:10 Glenn said "Looks like the weather is breaking up" (the same page). No hold of
 * that morning was for weather (Results, p. 70). The README has it in words ("The sky at liftoff").
 */
export const WEATHER: DayWeather = {
  observed: {
    where: 'Cape Canaveral: the Skid Strip, twelve minutes after liftoff',
    at: '1962-02-20T15:00:00Z',
    source: `${ISD}, ${HOUR}`,
  },
  middle: {
    kind: 'altocumulus',
    cover: {
      value: 0.25,
      confidence: 'documented',
      source: `${ISD}, ${HOUR}: two oktas of altocumulus (genus code 03), the only layer reported; the sky "scattered" at 09:00 and at 10:00 EST`,
    },
    base: { value: 4800, confidence: 'documented', source: 'the same observation: 4,800 m' },
    note:
      'The low cloud of the count had gone by 09:00 EST: overcast at 720 m at 07:00 (eight oktas coded 05 over two of cumulonimbus at ' +
      '300 m), broken at 810 m at 08:00, no ceiling from 09:00 on',
  },
  wind: {
    from: {
      value: 360,
      confidence: 'documented',
      source: `${ISD}, ${HOUR}: from 360 degrees; the same at every hour from 07:00 EST to 13:00, and at Patrick Air Force Base (station 74795012867)`,
    },
    speed: {
      value: 9.3,
      confidence: 'documented',
      source: `${ISD}, ${HOUR}: 9.3 m/s (18 knots), the strongest hour of the morning; 6.7 m/s (13 knots) at 09:00, 7.2 at 11:00. No gust is recorded`,
    },
  },
  visibility: {
    value: 40_000,
    confidence: 'estimated',
    source:
      `at the station’s customary limit of 16 km at 10:00 EST (${ISD}: documented), 12.8 km at 09:00 and 9.6 km in patches of ` +
      'shallow fog from 06:00 to 08:00; how far past the limit it was is not recorded. 40 km taken: the dry air behind a front ' +
      '(the dew point fell from 18.9 to 10.0 C between 07:00 and 10:00), an hour after the fog',
  },
  haze: {
    value: 1100,
    confidence: 'estimated',
    source:
      'not recorded: the low cloud of the count had its base at 720 to 810 m (the station, 07:00 and 08:00 EST), which is how deep ' +
      'the air was mixed; the haze is taken to fall off over a little more than that',
  },
  beyond: [
    {
      what: '"the band of clouds (across Southern Florida) which had moved away from Cape Canaveral earlier that morning"',
      south: 25.1,
      north: 27.3,
      west: -82.8,
      east: -79.2,
      low: {
        value: 0.8,
        confidence: 'estimated',
        source: 'a "band of clouds" in a Tiros picture: a cover is not given; eight tenths taken',
      },
      confidence: 'documented',
      source:
        `${RESULTS}, Figure 12-11 (p. 131): Tiros IV at 16:10 G.c.t., eighty minutes after liftoff. The bounds are the peninsula from ` +
        'the Keys to a line through Lake Okeechobee’s north shore: ours, the picture is not gridded',
    },
    {
      what: '"the cloud covered Georgia border"',
      south: 30.4,
      north: 32.5,
      west: -84.5,
      east: -79.5,
      low: { value: 0.8, confidence: 'estimated', source: '"cloud covered": a cover is not given; eight tenths taken' },
      confidence: 'documented',
      source:
        `${RESULTS}, Figure 12-10 (p. 130), the pilot’s photograph at the start of the third orbit, and Figure 12-11: "The clouds just ` +
        'north of Florida". The bounds are from the state line north over southern Georgia and its coast: ours',
    },
  ],
  // the air over the pad and the surface's hours round liftoff: ERA5's (aloft.ts, tools/era5-aloft.mjs). The Cape's own
  // rawinsonde of 12:00 and 18:00 UTC that day is in the radiosonde archive (IGRA, USM00074794) at the standard levels
  // only, and has not been put in its place: the README gives it beside ERA5's
  aloft: ALOFT,
  hours: HOURS,
  sea: SEA,
};
