import { ALOFT, HOURS } from './aloft.ts';
import type { DayWeather } from '../../../../../src/types.ts';

const REPORT = 'NASA TN D-4807, pp. 26 and 27';
const ISD = 'NOAA Integrated Surface Database, station 74794012868 (Cape Canaveral: the Skid Strip, 2.1 km south-west of the pad)';
const HOUR = '07:00 EST (12:00 UTC), 3 October 1962';

/**
 * The weather Sigma 7 left under: the morning of 3 October 1962 at Cape Canaveral, as the flight's report has it from the
 * launch site at 7:17 a.m. EST, two minutes after liftoff (07:15:11 EST): five tenths of the sky covered, by "high cirrus
 * clouds at 30 000 feet, some low cumulus clouds with a base at 2200 feet, and some stratocumulus clouds with a base at
 * 4500 feet on the eastern horizon"; the wind from 150 degrees at 2 knots; ten miles' visibility; 80 F with a dew point of
 * 75. The Cape's station a quarter of an hour before liftoff agrees: one okta of cumulus at 660 m, four of cirrostratus
 * above, the wind from 140 at 2.1 m/s, its 16 km limit. "Weather conditions in the launch area were satisfactory for
 * operations several days prior to and on the day of the launch" (the report); NASA S62-07872, the liftoff from the ramp,
 * has a blue sky streaked with cirrus and heaps of cumulus low on the horizon. The README has it in words ("The sky at
 * liftoff").
 */
export const WEATHER: DayWeather = {
  observed: {
    where: 'Cape Canaveral: the launch site at 7:17 a.m. EST, two minutes after liftoff, and the Skid Strip at 07:00',
    at: '1962-10-03T12:17:00Z',
    source: `${REPORT}; ${ISD}, ${HOUR}`,
  },
  low: {
    kind: 'cumulus',
    cover: {
      value: 0.125,
      confidence: 'documented',
      source: `${ISD}, ${HOUR}: one okta of cumulus (genus code 08); "some low cumulus clouds" in the report's five tenths at launch (${REPORT})`,
    },
    base: {
      value: 670,
      confidence: 'documented',
      source: `"a base at 2200 feet" (${REPORT}); the station had 660 m at 07:00 EST and 780 m at 10:00`,
    },
    depth: {
      value: 500,
      confidence: 'estimated',
      source: 'not recorded: fair-weather heaps of an autumn morning over the coast',
    },
    size: { value: 1000, confidence: 'estimated', source: 'not recorded: across a cloud, as fair-weather cumulus are photographed' },
    wind: {
      from: {
        value: 150,
        confidence: 'documented',
        source: `the wind at the ground at launch (${REPORT}), taken for the cloud’s height too`,
      },
      speed: {
        value: 3,
        confidence: 'estimated',
        source: 'the wind at the ground was 1 m/s (below), 2.1 m/s at the station at 07:00: taken a little stronger at the bases',
      },
    },
  },
  high: {
    kind: 'cirrus',
    cover: {
      value: 0.35,
      confidence: 'derived',
      source:
        `five tenths of the sky in all at launch, of which "some low cumulus" and stratocumulus only on the eastern horizon (${REPORT}): ` +
        `the rest is taken for the cirrus. ${ISD}, ${HOUR}: four oktas of cirrostratus (genus code 02), two of cirrus at 10:00`,
    },
    base: {
      value: 9100,
      confidence: 'documented',
      source: `"high cirrus clouds at 30 000 feet" (${REPORT}); the station codes the height as unlimited`,
    },
    depth: {
      value: 0.2,
      confidence: 'estimated',
      source: 'not recorded: thin fibres, the blue showing through them in NASA S62-07872, the liftoff from the ramp',
    },
  },
  wind: {
    from: {
      value: 150,
      confidence: 'documented',
      source: `"From 150° (SSE)" at launch (${REPORT}); 140 at the station at 07:00 EST, 160 at 08:00`,
    },
    speed: {
      value: 1,
      confidence: 'documented',
      source: `"2" knots at launch (${REPORT}); 2.1 m/s at the station at 07:00 and at 08:00 EST`,
    },
  },
  visibility: {
    value: 30_000,
    confidence: 'estimated',
    source:
      `"10" miles at launch (${REPORT}) and the station’s limit of 16 km at every hour of the morning (${ISD}): how far past that ` +
      'is not recorded. 30 km taken: a moist morning (80 F, dew point 75 F), clear at the ground',
  },
  haze: {
    value: 1200,
    confidence: 'estimated',
    source:
      'not recorded: the moist air of a Florida October morning, the cumulus bases at 670 m; taken to thin over a little more than that',
  },
  beyond: [
    {
      what: '"some stratocumulus clouds with a base at 4500 feet on the eastern horizon"',
      south: 27.6,
      north: 29.4,
      west: -80.1,
      east: -79.0,
      low: {
        value: 0.5,
        confidence: 'estimated',
        source: 'the report gives no cover for it: half the sky there is taken, a layer that is seen on the horizon and not overhead',
      },
      confidence: 'documented',
      source: `${REPORT}: observed from the launch site at 7:17 a.m. EST. The bounds, the sea from some 40 km to 150 km east of the pad, are ours`,
    },
  ],
  // the air over the pad and the surface's hours round liftoff: ERA5's (aloft.ts, tools/era5-aloft.mjs). The report's own
  // launch-site winds to 60,000 ft (TN D-4807, Figure 9) are a plot that has not been read off
  aloft: ALOFT,
  hours: HOURS,
};
