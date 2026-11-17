import { derived } from '../../../../../src/measure.ts';
import type { DayWeather } from '../../../../../src/types.ts';
import { ALOFT, HOURS } from './aloft.ts';

const ISD = 'NOAA Integrated Surface Database, station 74794012868 (Cape Canaveral: the Skid Strip, 5 km north of the pad)';

const ERA5_WAVES =
  'ERA5 (ECMWF), its wave model at 15:00 UTC on 5 May 1961, between the four cells round 27.23 N, 75.88 W (the landing point as the README and flight.ts give it, 27°13.7′N 75°53′W, its source not named there; landed 15 min 22.0 s after liftoff (Postlaunch Report, 4.1), 14:49:35 UTC), read from the public ARCO-ERA5 store by tools/era5.mjs `fieldAt`; 14:00 differs by under 0.07 m and 0.2 s';

/**
 * The sea where it came down, ten minutes before the hour: ERA5's waves there, a swell of about a metre from the east and a
 * smaller sea raised by the wind from the east too. The Postlaunch Report has the landing area's waves at 2 ft and the wind
 * at 12 knots (10.3, as docs/sources.md gives it); ERA5's two together come to about 1.1 m.
 */
const SEA: DayWeather['sea'] = {
  observed: { where: 'the landing area, 27.23 N, 75.88 W', at: '1961-05-05T15:00:00Z', source: ERA5_WAVES },
  trains: [
    {
      label: 'the swell',
      height: derived(0.962, `${ERA5_WAVES}: significant height of the total swell`),
      period: derived(6.553, `${ERA5_WAVES}: mean period of the total swell`),
      from: derived(85.2, `${ERA5_WAVES}: mean direction of the total swell, coming from`),
    },
    {
      label: 'the wind’s waves',
      height: derived(0.553, `${ERA5_WAVES}: significant height of the wind waves`),
      period: derived(3.191, `${ERA5_WAVES}: mean period of the wind waves`),
      from: derived(85.7, `${ERA5_WAVES}: mean direction of the wind waves, coming from`),
    },
  ],
};

/**
 * The weather Freedom 7 stood under: the morning of 5 May 1961 at Cape Canaveral, at liftoff (09:34 EST). The
 * flight's own report has the cloud; the Cape's station and Patrick Air Force Base, 23 km south, have the rest, at
 * their hours either side. The README has it in words ("The sky at liftoff").
 */
export const WEATHER: DayWeather = {
  observed: {
    where: 'Cape Canaveral: the flight’s own report at liftoff, and the Skid Strip at 09:00 EST',
    at: '1961-05-05T14:00:00Z',
    source: `MR-3 Postlaunch Report, 10.3, p. 87; ${ISD}, 14:00 UTC`,
  },
  low: {
    kind: 'cumulus',
    cover: {
      value: 0.1,
      confidence: 'documented',
      source:
        '"1/10 cumulus" at liftoff (MR-3 Postlaunch Report, 10.3, p. 87): the flight’s own observation, and so preferred to the ' +
        'station’s "scattered" at 09:00 EST',
    },
    base: {
      value: 720,
      confidence: 'documented',
      source: `${ISD}: the median base of the low cloud on May mornings, 1959 to 1963; that day the station had it at 750 m at 07:00 and at 10:00 EST`,
    },
    depth: {
      value: 650,
      confidence: 'estimated',
      source: 'not recorded: heaps of 250 m and a few towers of 500, as fair-weather cumulus of a morning are',
    },
    size: { value: 1500, confidence: 'estimated', source: 'not recorded: across a cloud, as fair-weather cumulus are photographed' },
    wind: {
      from: { value: 90, confidence: 'documented', source: `${ISD}, 09:00 EST: the wind at the ground, taken for the cloud’s height too` },
      speed: {
        value: 7,
        confidence: 'estimated',
        source: 'the wind at the ground was 5.1 m/s (below): taken a little stronger at the bases',
      },
    },
  },
  middle: {
    kind: 'altocumulus',
    cover: {
      value: 0.125,
      confidence: 'documented',
      source:
        'one okta of altocumulus at Patrick Air Force Base, 23 km south, at 10:00 EST (NOAA Integrated Surface Database, station ' +
        '74795012867): documented for that station and hour, taken for the pad at liftoff',
    },
    base: { value: 3600, confidence: 'documented', source: 'the same observation: 3,600 m' },
  },
  wind: {
    from: {
      value: 90,
      confidence: 'documented',
      source:
        `${ISD}, 09:00 EST. The flight’s own report has the surface wind at liftoff as 12 knots, and from 070 by its wind profile ` +
        '(Postlaunch Report, 10.3 and Figure 10.3-1), which is what the simulator flies (flight.ts: WINDS); the plants and the ' +
        'clouds were drawn for the station’s figure of half an hour before, and are kept so',
    },
    speed: {
      value: 5.1,
      confidence: 'documented',
      source: `${ISD}, 09:00 EST: 10 knots (12 knots at liftoff by the flight’s report: as the bearing)`,
    },
  },
  visibility: {
    value: 80_000,
    confidence: 'estimated',
    source: `at the station’s 16 km limit at 09:00 EST (${ISD}: documented), so how far past it is not recorded; 80 km taken, clear air`,
  },
  haze: {
    value: 1400,
    confidence: 'estimated',
    source: 'the Cape’s May mornings are mixed up to the cumulus bases, 720 m: the haze is taken to fall off over about twice that',
  },
  // the air over the pad and the surface's hours round liftoff: ERA5's (aloft.ts, tools/era5-aloft.mjs); a sounding of the
  // record's, when one is read, goes here in their place
  aloft: ALOFT,
  hours: HOURS,
  sea: SEA,
};
