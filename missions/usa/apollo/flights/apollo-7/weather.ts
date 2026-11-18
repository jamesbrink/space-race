import { derived, doc, estimated } from '../../../../../src/measure.ts';
import type { DayWeather } from '../../../../../src/types.ts';
import { ALOFT, HOURS } from './aloft.ts';

const LAUNCH = 'NASA SP-4029, Apollo 7 mission summary, Launch Phase, conditions at LC-34 at range zero';
const SEA =
  'ECMWF ERA5, ARCO hourly wave fields at 11:00 UTC on 22 October 1968, interpolated at the Navy landing estimate (27.54 N, 64.07 W) with tools/era5.mjs fieldAt';
const RECOVERY =
  'NOAA/NWS Spaceflight Meteorology Group, Apollo weather history, Apollo 7 landing; NASA SP-4029, Apollo 7 summary, CM retrieval';
const KT = 1852 / 3600;
const FT = 0.3048;
export const WEATHER: DayWeather = {
  observed: { where: 'Cape Kennedy, LC-34 light pole', at: '1968-10-11T15:02:45Z', source: LAUNCH },
  low: {
    kind: 'cumulus',
    note: 'Reported as cumulonimbus. The viewer approximates the observed cloud field with broad cumulus volumes.',
    cover: doc(0.3, LAUNCH),
    base: derived(2100 * FT, LAUNCH + ', 2,100 ft above ground'),
    depth: estimated(
      1150,
      'Cloud tops were not reported. Estimated maximum depth for the broad heaps used to represent the launch cloud field.',
    ),
    size: estimated(3600, 'Estimated horizontal scale of the procedural field. NASA launch photo S68-48788 gives no scale at the clouds.'),
    wind: {
      from: estimated(90, 'Cloud motion taken from the east wind at the pad.'),
      speed: estimated(19.8 * KT, 'Pad wind used for cloud drift in the absence of an observed drift speed.'),
    },
  },
  wind: {
    from: doc(90, LAUNCH + ', wind from true east'),
    speed: derived(19.8 * KT, LAUNCH + ', 19.8 knots measured 59.4 ft above the apron; the display reports the observed pad wind'),
  },
  visibility: derived(10 * 1609.344, LAUNCH + ', 10 statute miles'),
  haze: estimated(1200, 'Estimated vertical haze scale for moist maritime air. The observation gives horizontal visibility only.'),
  aloft: ALOFT,
  hours: HOURS,
  recovery: {
    observed: { where: 'USS Essex, Apollo 7 recovery area', at: '1968-10-22T11:11:48Z', source: RECOVERY },
    transition: ['1968-10-22T10:45:00Z', '1968-10-22T10:51:00Z'],
    latitude: doc(27.63, 'NASA SP-4029, Apollo 7 summary, estimated splashdown point'),
    longitude: doc(-64.15, 'NASA SP-4029, Apollo 7 summary, estimated splashdown point'),
    radius: estimated(125_000, 'Extent of the low overcast was not reported. The map feathers the observation outside this radius.'),
    ceiling: derived(600 * FT, RECOVERY + ', overcast at 600 ft'),
    cover: doc(1, `${RECOVERY}, OVC006`),
    wind: {
      from: doc(210, `${RECOVERY}, surface wind from 210° true at splashdown`),
      speed: derived(11 * KT, `${RECOVERY}, surface wind 11 knots at splashdown`),
    },
    visibility: derived(2 * 1852, RECOVERY + ', 2 nautical miles during CM retrieval'),
  },
  sea: {
    observed: { where: 'Atlantic recovery area southeast of Bermuda', at: '1968-10-22T11:00:00Z', source: SEA },
    trains: [
      {
        label: 'the swell',
        height: derived(1.178, SEA + ', significant height of total swell'),
        period: derived(8.072, SEA + ', mean period of total swell'),
        from: derived(18.52, SEA + ', mean direction of total swell'),
      },
      {
        label: 'the wind waves',
        height: derived(0.305, SEA + ', significant height of wind waves'),
        period: derived(2.473, SEA + ', mean period of wind waves'),
        from: derived(251.68, SEA + ', mean direction of wind waves'),
      },
    ],
  },
};
