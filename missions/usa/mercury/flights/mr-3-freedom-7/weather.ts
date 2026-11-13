import type { DayWeather } from '../../../../../src/types';

const ISD = 'NOAA Integrated Surface Database, station 74794012868 (Cape Canaveral: the Skid Strip, 5 km north of the pad)';

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
};
