/**
 * The recorded misses: where a flown run falls outside a documented check's tolerance, and why. One place, read by
 * the tests (tests/sim.test.mjs holds each run to what is written here: an unrecorded miss fails, and so does a
 * recorded one that has gone away or grown) and by the debrief (cockpit.ts), which says beside a figure that its
 * miss is known. `by` is how far out the run is, as a fraction of the documented value (or in the check's own unit
 * where `absolute`), give or take `slack`; `why` is the reasoning in full, `short` is a few words for the debrief.
 */
export interface Miss {
  by: number;
  slack: number;
  absolute?: boolean;
  why: string;
  short: string;
}

const BOOSTER =
  'the powered flight ends 4 per cent too fast. It leaves the pad at only 1.19 g, so most of the thrust goes to holding it up and the speed gained is ' +
  'four times as sensitive as the thrust: one per cent in thrust, flow or liftoff weight is 3 to 4 per cent in speed (see the last test). The engine is two figures ' +
  'from a summary table (engine.thrust, engine.isp), held steady from liftoff to cutoff with no build-up, tail-off or jet-vane loss; the real vehicle was cut off by ' +
  'its velocity integrator, which hid exactly this. The whole vehicle’s drag (ascentDrag) is the other unknown, but it would have to be half as much again';
const BURNOUT = 'the booster is modelled burning out about 4 per cent too fast';

const MR8 =
  'the powered flight ends 4 per cent too fast, as Freedom 7’s does and for the same reason: off the pad at 1.20 g, one per cent in thrust, flow or liftoff weight ' +
  'is 3 to 4 per cent in speed, and the engine is two figures from a summary table (79,220 lbf and 217.4 s: TM X-53107, Table 8-1) held steady from liftoff to ' +
  'cutoff with no build-up, tail-off or jet-vane loss. The real vehicle was cut off by its velocity integrator, which hid exactly this; MR-8’s own thrust ' +
  'curve and cutoff to the tenth are in reports not found. Nothing was fitted to bring it in';
const HIGHER = 'follows from the speed at separation: it climbs higher';
/** Liberty Bell 7's main came out at 12,300 ft by the history, and the record's times leave it too little time to come down from there. */
const MAIN_HEIGHT =
  'two things. About 20 s is the higher apogee, as the parachutes’ times are. The rest is the main’s height: This New Ocean (p. 372) has it out at 12,300 ft, ' +
  'and the record has 5 min 23 s from the main to the sea (10:14 to 15:37), 11.6 m/s on the average; the canopy as derived on Freedom 7 (main.dragArea) brings ' +
  'the spacecraft down at 8.8 m/s, and the pilot read 30 to 32 ft/s (9 to 10 m/s) on it. From 10,000 ft, the design’s height, the times would agree. Either the ' +
  'history’s height is not the barostat’s, or the spacecraft came down faster than the canopy’s figure: the record read does not say which, and nothing is changed';

/** By flight id, then by which run (the whole flight, or the capsule's half flown from the report's separation), then by check id. */
export const MISSES: Record<string, Record<string, Record<string, Miss>>> = {
  'usa/mercury/mr-3-freedom-7': {
    whole: {
      separationSpeed: { by: 0.04, slack: 0.01, why: BOOSTER, short: BURNOUT },
      separationGroundSpeed: { by: 0.045, slack: 0.01, why: BOOSTER, short: BURNOUT },
      separationAltitude: { by: 0.078, slack: 0.015, why: BOOSTER, short: BURNOUT },
      apogee: { by: 0.077, slack: 0.015, why: `follows from the speed at separation: ${BOOSTER}`, short: BURNOUT },
      range: { by: 0.1, slack: 0.02, why: 'follows from the speed at separation', short: `${BURNOUT}, so it flies farther` },
      exitQ: {
        by: -0.05,
        slack: 0.01,
        why:
          'just outside 5 per cent, low. In still air the run is 3.3 per cent under the record; the day’s winds aloft (Figure 10.3-1) are behind it ' +
          'through the greatest pressure, 20 to 25 knots from the west-north-west at 30,000 to 40,000 ft, and take 1.8 per cent more off the air it meets. ' +
          'The report’s 586 lb/sq ft is "derived from AZUSA and FPS-16 radar data" (section 4.2), and it does not say whether a wind went into it: ' +
          'worked from the speed over the ground alone it would be the still-air figure that compares, and that is inside',
        short: 'the day’s tail wind takes 2 per cent off; the record may leave the wind out',
      },
      entryG: { by: 0.062, slack: 0.02, why: 'follows from the apogee: it falls from higher', short: 'it falls from the higher apogee' },
      entryAt: {
        by: 17,
        slack: 4,
        absolute: true,
        why: 'follows from the apogee: it is up longer',
        short: 'it is up longer, from the higher apogee',
      },
      drogueAt: { by: 15, slack: 4, absolute: true, why: 'follows from the apogee', short: 'follows from the higher apogee' },
      mainAt: { by: 16, slack: 4, absolute: true, why: 'follows from the apogee', short: 'follows from the higher apogee' },
      duration: { by: 16, slack: 4, absolute: true, why: 'follows from the apogee', short: 'it is up longer, from the higher apogee' },
    },
    capsule: {
      entryQ: {
        by: -0.054,
        slack: 0.01,
        why: 'just outside 5 per cent: the capsule’s drag coefficient is read off a figure to 0.03, and the air is a standard year’s, not that day’s',
        short: 'the drag coefficient is read off a figure to 0.03',
      },
    },
  },
  'usa/mercury/mr-4-liberty-bell-7': {
    whole: {
      separationSpeed: { by: 0.043, slack: 0.01, why: MR8, short: BURNOUT },
      separationGroundSpeed: { by: 0.045, slack: 0.01, why: MR8, short: BURNOUT },
      apogee: {
        by: 0.117,
        slack: 0.02,
        why: `${HIGHER}. More than Freedom 7’s 7.7 per cent: from the record’s own speed, the run’s height and climb at separation (which the record does not give) still put it 5.8 per cent high. ${MR8}`,
        short: BURNOUT,
      },
      range: { by: 0.16, slack: 0.03, why: 'follows from the speed at separation', short: `${BURNOUT}, so it flies farther` },
      exitQ: {
        by: -0.067,
        slack: 0.015,
        why:
          'low by 6.7 per cent. The run’s greatest pressure going up is within 1.5 per cent of its own for Freedom 7, the two vehicles being nearly the same; ' +
          'the record has MR-4’s 3.3 per cent above MR-3’s (605.5 against 586 lb/sq ft), and why is not in anything read. The day’s winds are not it (in still air the run is ' +
          '0.04 per cent higher). The likeliest input is the tilt programme’s curve, Figure 4-9 stretched to begin at 15.0 s (estimated): a programme that tipped over faster ' +
          'early would carry the vehicle through the dense air flatter and faster; then the engine’s steady thrust, with no build-up after liftoff',
        short: 'the tilt programme’s curve is estimated; why MR-4’s was higher is not recorded',
      },
      entryG: { by: 0.115, slack: 0.025, why: 'follows from the apogee: it falls from higher', short: 'it falls from the higher apogee' },
      drogueAt: {
        by: 23,
        slack: 5,
        absolute: true,
        why: 'follows from the apogee: it is up longer',
        short: 'follows from the higher apogee',
      },
      mainAt: {
        by: 19,
        slack: 5,
        absolute: true,
        why: 'follows from the apogee: it is up longer',
        short: 'follows from the higher apogee',
      },
      duration: { by: 74, slack: 8, absolute: true, why: MAIN_HEIGHT, short: 'the higher apogee, and the main out at 12,300 ft' },
    },
    // flown from the record's Earth-fixed speed at separation, but from the run's own height, climb and heading there, which the record read does not give
    capsule: {
      apogee: {
        by: 0.058,
        slack: 0.015,
        why:
          'the record read gives the speed at separation and not the height or the climb: those are the run’s own, 82.2 km and 46.0 degrees, and they carry the booster’s error ' +
          '(Freedom 7’s run is 7.8 per cent high at separation, where its record gives the height). It comes to its top at 316.0 s, on the record’s second',
        short: 'from the run’s own height and climb at separation, which the record does not give',
      },
      range: {
        by: 0.079,
        slack: 0.02,
        why: 'follows from the run’s own height and climb at separation, as the apogee does',
        short: 'from the run’s own height and climb at separation',
      },
      entryG: { by: 0.051, slack: 0.02, why: 'follows from the apogee: it falls from higher', short: 'it falls from the higher apogee' },
      duration: { by: 59, slack: 8, absolute: true, why: MAIN_HEIGHT, short: 'the main out at 12,300 ft' },
    },
  },
};
