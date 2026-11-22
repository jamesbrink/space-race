/**
 * The recorded misses: where a flown run falls outside a check's tolerance, and why. One place for every simulator, read
 * by the tests (each holds its runs to what is written here through tests/misses.mjs `holdChecks`: an unrecorded miss
 * fails, and so does a recorded one that has gone away or moved past its slack) and by the debrief (cockpit.ts), which
 * says beside a figure that its miss is known. `by` is how far out the run is, as a fraction of the check's value (or in
 * the check's own unit, run less record, where `absolute`), give or take `slack`; `why` is the reasoning in full, `short`
 * a few words for the debrief.
 *
 * By flight id (or a fixture's path under tests/), then by run, then by check id. The runs:
 *   whole, capsule        a ballistic flight flown from the pad, and its capsule's half from the record's separation (tests/sim.test.mjs)
 *   abort:<test>          an abort off the pad against `body.escape.record`'s test of that name (tests/abort.test.mjs)
 *   coast                 an orbital flight's coast from its published orbit at the estimated injection (tests/orbital.test.mjs)
 *   ascent, shown, descent   its ascent flown from the pad; the coast flown on from the state that ascent left the
 *                         spacecraft in, with its share of the joint's push and nothing else (staged.ts `flyWhole`); the
 *                         bodies down from the ejection (tests/staged.test.mjs)
 *   live                  the live staged vehicle steered by its pilot against the batch ascent's last cutoff, at
 *                         tolerances set before it was flown (tests/stagedlive.test.mjs)
 *   lunar                 a flight to the Moon's coast from its injection as the run reaches it, under the Moon's field and
 *                         the Sun with the centre changed at the sphere (sim/core/gravity.ts), to its nearest to the
 *                         Moon, against the mission report's solution (tests/lunargravity.test.mjs)
 *   aloft                 the live staged vehicle flown by its pilot (guidance and sequence on) from the pad through the
 *                         day's air: `breakup`, where it breaks up and the record's vehicle did not, `by` its instant in
 *                         seconds from liftoff (tests/onestate.test.mjs)
 */
import * as reason from './misses-reasons.ts';

export interface Miss {
  by: number;
  slack: number;
  absolute?: boolean;
  why: string;
  short?: string;
}

/** An orbital record's misses are in its checks' own units: each run's, marked so. */
const inUnits = (runs: Record<string, Record<string, Omit<Miss, 'absolute'>>>): Record<string, Record<string, Miss>> =>
  Object.fromEntries(
    Object.entries(runs).map(([run, misses]) => [
      run,
      Object.fromEntries(Object.entries(misses).map(([id, m]) => [id, { ...m, absolute: true }])),
    ]),
  );

export const MISSES: Record<string, Record<string, Record<string, Miss>>> = {
  'usa/mercury/mr-3-freedom-7': {
    whole: {
      separationSpeed: { by: 0.04, slack: 0.01, why: reason.BOOSTER, short: reason.BURNOUT },
      separationGroundSpeed: { by: 0.045, slack: 0.01, why: reason.BOOSTER, short: reason.BURNOUT },
      separationAltitude: { by: 0.078, slack: 0.015, why: reason.BOOSTER, short: reason.BURNOUT },
      apogee: { by: 0.077, slack: 0.015, why: `follows from the speed at separation: ${reason.BOOSTER}`, short: reason.BURNOUT },
      range: { by: 0.1, slack: 0.02, why: 'follows from the speed at separation', short: `${reason.BURNOUT}, so it flies farther` },
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
    'abort:off the pad, upright': {
      apogee: {
        by: -0.26,
        slack: 0.03,
        why: `the maker’s round figure is reached to 3 per cent with the thrust through the centre of mass (2,565 ft); set off it, the spacecraft tumbles and the air takes a quarter of the climb. ${reason.SAME_SHAPE}`,
      },
    },
    'abort:Beach Abort, 9 May 1960': {
      apogee: { by: -0.386, slack: 0.03, why: reason.UNKNOWN_BEACH },
      duration: { by: -0.376, slack: 0.03, why: `follows from the height. ${reason.UNKNOWN_BEACH}` },
    },
  },
  'usa/mercury/mr-4-liberty-bell-7': {
    // the capsule in the sea after the landing (sim/afloat.ts: tests/afloat.test.mjs)
    afloat: {
      flooded: {
        by: 0.125,
        slack: 0.03,
        why:
          'the history’s figure is a bound, "over 5000 pounds" (This New Ocean, p. 375), and was read before the run as 5,000 to 6,000 lb. The run’s 6,190 lb is over ' +
          '5,000 as it says, and past the reading: the cabin’s free volume (three quarters of the pressure vessel, estimated: no document read gives it) holds 1.5 m^3 ' +
          'of the sea at the most, 3,380 lb, and the recovery compartment and the gap under the shingles 730 lb more, on No. 7’s flotation weight less the hatch’s ' +
          'saving and the pilot. Nothing is changed to bring it in',
        short: 'the history gives a bound, "over 5000 pounds"',
      },
      heeled: {
        by: -0.37,
        slack: 0.05,
        why:
          'the photograph (S61-02921) has it 30 to 40 degrees over with its top out, as read off it; the run has it 22 degrees over as its cabin filled, toward its hatch with the pilot going ' +
          'out over the sill, and nearly upright again as its top went under, the cabin full and its water with no surface left to run. What it leans to rests on estimates: its centre of mass ' +
          'with the 309 lb shield let down (no weight for the shield is read), the cabin’s free volume, the water standing level at once (no slosh), the heel in the hatch’s plane only. Nothing is changed to bring it in',
        short: 'read off a photograph; the run leans less',
      },
    },
    // (the records are the type's, the Beach Abort's and the maker's, flown on this flight's own spacecraft and pad)
    'abort:off the pad, upright': {
      apogee: {
        by: -0.255,
        slack: 0.03,
        why: `as Freedom 7’s, and for the same reasons: the maker’s round figure is reached with the thrust through the centre of mass; set off it, the spacecraft tumbles and the air takes a quarter of the climb. ${reason.SAME_SHAPE}`,
      },
    },
    'abort:Beach Abort, 9 May 1960': {
      apogee: {
        by: -0.382,
        slack: 0.03,
        why: `as Freedom 7’s, flown here as Liberty Bell 7’s spacecraft (its weights estimated, Freedom 7’s: tests/sim.test.mjs). ${reason.UNKNOWN_BEACH}`,
      },
      duration: { by: -0.365, slack: 0.03, why: `follows from the height, as Freedom 7’s. ${reason.UNKNOWN_BEACH}` },
    },
    whole: {
      separationSpeed: { by: 0.043, slack: 0.01, why: reason.MR8, short: reason.BURNOUT },
      separationGroundSpeed: { by: 0.045, slack: 0.01, why: reason.MR8, short: reason.BURNOUT },
      apogee: {
        by: 0.117,
        slack: 0.02,
        why: `${reason.HIGHER}. More than Freedom 7’s 7.7 per cent: from the record’s own speed, the run’s height and climb at separation (which the record does not give) still put it 5.8 per cent high. ${reason.MR8}`,
        short: reason.BURNOUT,
      },
      range: { by: 0.16, slack: 0.03, why: 'follows from the speed at separation', short: `${reason.BURNOUT}, so it flies farther` },
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
      duration: { by: 74, slack: 8, absolute: true, why: reason.MAIN_HEIGHT, short: 'the higher apogee, and the main out at 12,300 ft' },
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
      drogueAt: {
        by: 11.1,
        slack: 4,
        absolute: true,
        why:
          'follows from the apogee, from the run’s own height and climb at separation, as the whole flight’s does; just past the 10 s since the day’s air was flown (sim/air.ts `skyOf`), ' +
          'whose column, denser than the standard’s from 10 to 48 km, holds the falling capsule back a second more',
        short: 'follows from the higher apogee',
      },
      duration: { by: 59, slack: 8, absolute: true, why: reason.MAIN_HEIGHT, short: 'the main out at 12,300 ft' },
    },
  },
  'usa/mercury/ma-6-friendship-7': inUnits({
    ascent: {
      cutoffSpeed: {
        by: -3.861,
        slack: 0.5,
        why:
          'The guidance cuts the sustainer where the orbit the capsule will be left on, the posigrades’ push counted, has the published period: 3.9 m/s (12.7 ft/s) under the recorded speed. ' +
          'The recorded speed, the recorded height at cutoff (taken over the oblate earth) and the published orbit do not agree with one another to better than this, and whether the recorded speed is before or after the posigrades’ 4.5 m/s is not said. Not adjusted',
        short: 'the recorded speed and the published orbit disagree',
      },
      cutoffAt: {
        by: -8.068,
        slack: 0.5,
        why:
          'The guidance cuts the sustainer on the published orbit at T+293.3 s, 8.1 s before the record’s 301.4 (and 3.9 m/s under the recorded 25,730 ft/s: `cutoffSpeed`). The Atlas is flown on SP-45’s rated thrusts taken at sea level and the Atlas D’s ' +
          'weights and impulses from a secondary source (Astronautix), none of them 109-D’s; on the same figures its tank would run dry at T+302.8, so it is not short of propellant. Which figure is ' +
          'off for 109-D is not established; not adjusted',
        short: 'the Atlas D’s figures, not 109-D’s',
      },
    },
    coast: {
      crossTrack: { by: 29_454, slack: 2_000, why: `And 29 km to the right of it. ${reason.MA6_RETRO}` },
    },
    shown: {},
    descent: {},
  }),
  'usa/mercury/ma-7-aurora-7': inUnits({
    ascent: {
      cutoffAt: {
        by: -12.26,
        slack: 0.5,
        why:
          'The guidance cuts the sustainer on the published orbit at T+297.6 s (1.7 m/s over the recorded 25,717 ft/s), 12.3 s before the record’s 309.9. Atlas 107-D is flown on Friendship 7’s figures, the Atlas D’s (SP-45’s rated ' +
          'thrusts at sea level, a secondary source’s weights and impulses), none of them 107-D’s; the record’s own cutoff came 8.5 s later than MA-6’s for 13 ft/s less. Which figure is off is not ' +
          'established; not adjusted',
        short: 'the Atlas D’s figures, not 107-D’s',
      },
    },
    coast: {
      alongTrack: {
        by: 107_114,
        slack: 3_000,
        why: `The drogue comes out 107 km beyond where the capsule was picked up, along the track. ${reason.MA7_RETRO}`,
      },
      crossTrack: { by: 22_340, slack: 2_000, why: `And 22 km to the right of it. ${reason.MA7_RETRO}` },
    },
    shown: {
      alongTrack: {
        by: 222_300,
        slack: 8_000,
        why: `222 km beyond the pick-up point along the track (377 km until November 2026, begun from the ascent’s place at the published orbit’s speed). ${reason.MA7_SHOWN}. ${reason.MA7_RETRO}`,
      },
      crossTrack: {
        by: -20_200,
        slack: 2_000,
        why: `20 km to the left of it (41 km to the right until November 2026, in the unsteered ascent’s plane: the law now steers to the inclination). ${reason.MA7_SHOWN}. ${reason.MA7_RETRO}`,
      },
    },
    descent: {
      'mercury-capsule.at': {
        by: 45.12,
        slack: 3,
        why:
          'Down 45 s late. The drogue is out 17 s late, with the coast flown on from the ascent (within its tolerance); the rest is the main: the record has 4 min 9 s from the main let out by hand at 8,950 ft ' +
          'to the sea (04:51:48.2 to 04:55:57; TN D-3814, p. 67 and Table XVI), 11.0 m/s on the average, where the canopy as derived on Freedom 7 (mercury-redstone.ts, main.dragArea) brings the ' +
          '2,557.7 lb capsule down at 8.8 m/s; Carpenter’s “right on 30 feet per second” is 9.1. Either the height or the instant is not the canopy’s, or it came down faster than its figure: ' +
          'nothing read says which, and nothing is changed',
      },
    },
  }),
  'usa/mercury/ma-8-sigma-7': inUnits({
    ascent: {
      maxQ: {
        by: 7_302,
        slack: 400,
        why:
          'The greatest dynamic pressure going up is 53.5 kPa where the record has 964 lb/ft² (46.2 kPa). Atlas 113-D is flown on Friendship 7’s figures and law, to a cutoff 5.5 km lower than before ' +
          '(the recorded height read over the oblate earth, since November 2026), which lays the turn a little lower through the dense air: 6.8 kPa over before, within the tolerance, and 7.3 now. ' +
          'Its own flight was lofted before staging (TN D-4807, p. 106), which the law cannot give. The drag curve and the pitch-over are estimates. Not adjusted',
        short: 'a law and drag that are estimates',
      },
      cutoffAt: {
        by: -17.81,
        slack: 0.5,
        why:
          'The guidance cuts the sustainer on the published orbit at T+297.9 s (1.6 m/s over the recorded 25,730 ft/s), 17.8 s before the record’s 315.7. Atlas 113-D is flown on Friendship 7’s figures, the Atlas D’s, none of ' +
          'them 113-D’s; its own flight was lofted before staging, its BECO 2 s early "and consequently SECO was about 10 seconds later than nominal" (TN D-4807, p. 106), which the law ' +
          'and the type’s figures cannot give. Which figure is off is not established; not adjusted',
        short: 'the Atlas D’s figures, not 113-D’s',
      },
    },
    coast: {},
    shown: {
      entryAt: {
        by: -40.7,
        slack: 10.0,
        why: '0.05 g: 32459 where the record has 32500. Since November 2026 the braking burn is timed for the place it came down at (sim/plan.ts `LandingAim`), lit 21.3 s before the record’s instant on the run from the pad, so what follows the burn comes as much sooner or later than the record has it, and by what the descent itself takes besides. Not adjusted',
        short: 'the burn timed for the landing place',
      },
    },
    descent: {},
  }),
  'usa/mercury/ma-9-faith-7': inUnits({
    ascent: {
      cutoffSpeed: {
        by: -4.793,
        slack: 0.5,
        why:
          'The guidance cuts the sustainer where the orbit the capsule will be left on, the posigrades’ push counted, has the published period: 4.8 m/s (15.7 ft/s) under the recorded speed. ' +
          'The recorded speed, the recorded height at cutoff (taken over the oblate earth) and the published orbit do not agree with one another to better than this, and whether the recorded speed is before or after the posigrades’ 4.5 m/s is not said. Not adjusted',
        short: 'the recorded speed and the published orbit disagree',
      },
      cutoffAt: {
        by: -21.75,
        slack: 0.5,
        why:
          'The guidance cuts the sustainer on the published orbit at T+281.3 s (4.8 m/s under This New Ocean’s 25,736 ft/s, 17,547 mph over Bermuda: `cutoffSpeed`), 21.7 s before the record’s 303.03. Atlas 130-D is flown on Friendship 7’s figures, the ' +
          'Atlas D’s, none of them 130-D’s (whose “effective specific impulse ... was within, but on the high side, of the tolerance band”, SP-45, p. 103), and Sigma 7’s weights; the speed may ' +
          'include the posigrades’. Which figure is off is not established; not adjusted',
        short: 'the Atlas D’s figures, not 130-D’s',
      },
    },
    coast: {
      ejectionAt: {
        by: -55.2,
        slack: 8.3,
        why: 'Drogue out, by hand at 42,000 ft: 123193 where the record has 123248. Since November 2026 the braking burn is timed for the place it came down at (sim/plan.ts `LandingAim`), lit 44.9 s before the record’s instant on the run from the pad, so what follows the burn comes as much sooner or later than the record has it, and by what the descent itself takes besides. Not adjusted',
        short: 'the burn timed for the landing place',
      },
      entryAt: {
        by: -85.0,
        slack: 12.7,
        why: '0.05 g, as the ground predicted it: 122874 where the record has 122959. Since November 2026 the braking burn is timed for the place it came down at (sim/plan.ts `LandingAim`), lit 44.9 s before the record’s instant on the run from the pad, so what follows the burn comes as much sooner or later than the record has it, and by what the descent itself takes besides. Not adjusted',
        short: 'the burn timed for the landing place',
      },
    },
    shown: {
      ejectionAt: {
        by: -46.4,
        slack: 7.5,
        why: 'Drogue out, by hand at 42,000 ft: 123202 where the record has 123248. Since November 2026 the braking burn is timed for the place it came down at (sim/plan.ts `LandingAim`), lit 44.9 s before the record’s instant on the run from the pad, so what follows the burn comes as much sooner or later than the record has it, and by what the descent itself takes besides. Not adjusted',
        short: 'the burn timed for the landing place',
      },
      entryAt: {
        by: -75.3,
        slack: 11.3,
        why: '0.05 g, as the ground predicted it: 122884 where the record has 122959. Since November 2026 the braking burn is timed for the place it came down at (sim/plan.ts `LandingAim`), lit 44.9 s before the record’s instant on the run from the pad, so what follows the burn comes as much sooner or later than the record has it, and by what the descent itself takes besides. Not adjusted',
        short: 'the burn timed for the landing place',
      },
    },
    descent: {},
  }),
  'ussr/vostok/vostok-1': inUnits({
    coast: {
      separationAltitude: {
        by: -22_082,
        slack: 1_500,
        why:
          'At 10:36 it is at 133 km, where Lissov reckons 150 to 160 and Siddiqi 150 to 170. Theirs are reckonings too. Ours rests on the push lying along the line from the Sun, 30 degrees ' +
          'below level, which brings it down early: `retro.aim`. (Read as osculating, the published orbit flew 18 km high and this was 137 km: read as mean it is 4 km worse)',
      },
      ejectionAt: {
        by: 214.9,
        slack: 10,
        why:
          'It reaches 7 km at 10:45:35 Moscow time, where the record has the hatch going at 10:42 (to the minute) and the module on the ground at 10:48. A minute of it is the landing being 472 km long; ' +
          'the rest is a descent that takes longer than the flight’s did, which points at `retro.aim` and `retro.deltaV` (a push only 59 per cent of which is against the motion)',
      },
      crossTrack: {
        by: -64_128,
        slack: 3_000,
        why:
          'It comes down 64 km to the left of the record’s landing. All of it is the braking burn’s sideways part: the Sun stood 41 degrees out of the orbit’s plane that morning (derived from the site, ' +
          'the hour and the inclination, and not in doubt), so a push straight along the line from the Sun has 65 per cent of itself across the track. With the same burn straight against the motion the ' +
          'miss is 4 km. So `retro.aim` as the record words it (“the TDU was directed to the Sun”) cannot be the whole of how the engine’s axis lay: the sensor’s axis to the engine’s is the thing to find. Not adjusted',
      },
      alongTrack: {
        by: 471_658,
        slack: 10_000,
        why:
          'It comes down 472 km beyond the record’s landing along its own track. Two inputs are each worth as much: `injection.arc` (no source; reckoned by hand to 3 degrees, 128 km a degree) and ' +
          '`retro.aim` (straight against the motion it lands 439 km shorter, 39 km beyond the record: which is no proof, given the first). Not adjusted: the ascent flown is what replaces the first, ' +
          'a source on the solar sensor the second. Read as osculating, as until November 2026, the published orbit flew 18 km high and this was 448 km: read as mean (world/meanelements.ts, issue #8) it is 30 km worse',
      },
    },
    ascent: {
      minuteG: {
        by: -1.3,
        slack: 0.1,
        why:
          'A minute up the run reads 2.20 g; Zak has Gagarin feeling 3 to 4. Thrust and mass alone give 2.4 g there (4.6 MN on 191 t), less 0.2 for the drag, and Soyuz’s manual shows 2.6 g ' +
          'at 60 s on the same first stages: the record’s figure is a man’s feeling, not an accelerometer’s',
      },
      apogee: {
        by: -62_100,
        slack: 300,
        why: `The cutoff is level at 180 km and 14 m/s slow for the published orbit, so its apogee is 265 km for 327: ${reason.SHORT}`,
      },
      period: { by: -40.57, slack: 2, why: `It follows from the speed at cutoff: ${reason.SHORT}` },
    },
    shown: {
      apogee: {
        by: -43_390,
        slack: 500,
        why: `${reason.PUBLISHED}: flown round, the orbit tops out at 284 km where the record has 327. ${reason.SHORT}`,
      },
      period: {
        by: -28.13,
        slack: 1,
        why: `${reason.PUBLISHED}: it goes round in 88.97 min where the record has 89.44. ${reason.SHORT}`,
      },
      separationAltitude: {
        by: -33_960,
        slack: 1_500,
        why: `${reason.PUBLISHED}. At 10:36 it is at 121 km, where Lissov reckons 150 to 160 and Siddiqi 150 to 170 (reckonings): on the ascent’s own orbit, 43 km lower at its top than the published one (132 km begun at the published orbit’s speed, until November 2026). The burn is aimed along the line from the Sun, 30 degrees below level, which brings it down early: \`retro.aim\`, as in the coast’s own misses`,
      },
      ejectionAt: {
        by: 183.7,
        slack: 10,
        why: `${reason.PUBLISHED}. It reaches 7 km at 10:45:04, 3.1 minutes after the record’s 10:42: a minute of it is the landing being 542 km long, the rest a descent slower than the flight’s, which points at \`retro.aim\` again (with the ascent cut over the mean Earth, until November 2026: 10:45:33, 498 km)`,
      },
      alongTrack: {
        by: 542_000,
        slack: 10_000,
        why:
          `${reason.PUBLISHED}. It comes down 542 km beyond the record’s landing along the track, on the ascent’s own orbit, which goes round 28 s sooner than the published one, so the burn at the record’s instant comes further on (425 km begun at the published orbit’s speed, until November 2026); across the track it holds. ` +
          'The place on the orbit is the ascent’s (27.82 degrees round from the pad, where the estimate was 27.5), so what owns the rest is the burn’s aim along the line from the Sun (straight against the motion it lands 439 km shorter in the coast from the published orbit). ' +
          'Read as osculating, as until November 2026, it was 452 km: the published orbit read as mean (world/meanelements.ts, issue #8) puts the apogee where the record has it and the landing 51 km further out. Nothing is fitted',
      },
    },
    descent: {
      'pilot.at': {
        by: 327.8,
        slack: 10,
        why:
          'Late by the late arrival at 7 km, and from 7 km he takes 13 min 23 s where R and Z’s clocks have 11 (10:42 to 10:53) and Baturin’s 4 (10:49). ' +
          'Four kilometres under a canopy at the record’s own 5 m/s (which the run holds) is 13 minutes by itself: the record’s clocks and its descent figures do not agree with one another',
      },
    },
  }),
  'ussr/vostok/vostok-2': inUnits({
    coast: {
      separationAltitude: {
        by: -31924.6,
        slack: 1_500,
        why:
          'Now -31925 (the braking burn is timed for the place it came down at (sim/plan.ts `LandingAim`), lit 76.8 s after the record’s instant on the run from the pad; what follows was written with it lit by the clock, when it was -29188). ' +
          'At 10:07, the instant the record has the cable bundle burn through, it is at 61 km where the record’s research has 80 to 100 (a reckoning), 16 minutes after the burn’s command. ' +
          'Not the drag: up to the parting the joined ship flies its free-molecule figure (SHIP_RAREFIED) bridged on its 2.43 m to the ball’s continuum curve, at the whole ship’s mass; without the free-molecule figure it would be 3.6 km higher, on the coast’s drag until November 2026 2.8 km higher, in the mean air 1.4 km lower (what parts flies only after it: the ball on its own figure, the instrument module not at all). ' +
          'At a fixed instant the height is the burn’s: 9 km for each minute it came later, 11 km lower straight against the motion (the line from the Sun is 0.72 against it, 0.26 down, 0.65 across), 14 km higher on 120 m/s for the type’s 136 (estimated). ' +
          'No instant of the burn meets this and the landing together: 0 along the track wants it 69 s later (71 km here), 90 km wants 194 s (800 km long). ' +
          'And 10:07 is by the clock that read the command at 09:57, which the orbit rules out: by it the parting came 10 minutes after the command, where the run is at 126 km. ' +
          'Read as osculating, as until November 2026, it was at 81 km (PHASE). No physical correction found (issue #23). Not adjusted',
      },
      crossTrack: {
        by: -59039.4,
        slack: 3_000,
        why:
          'Now -59039 (the braking burn is timed for the place it came down at (sim/plan.ts `LandingAim`), lit 76.8 s after the record’s instant on the run from the pad; what follows was written with it lit by the clock, when it was -68089). ' +
          'It comes down 68 km across the track from the record’s landing. The Sun stood 38 degrees out of the plane at the burn, so a push along the line from it has much of itself across the track (`retro.aim`, as Vostok 1’s). Read as osculating it was 154 km: the coast then fell four minutes behind the record’s orbit (PHASE) and the Earth had turned less under the track',
      },
    },
    ascent: {
      apogee: { by: -13_630, slack: 300, why: `The osculating apogee at the cutoff, 230 km for the published 244: ${reason.SHORT_TYPE}` },
    },
    shown: {
      separationAltitude: {
        by: -39266.4,
        slack: 1_500,
        why:
          'Now -39266 (the braking burn is timed for the place it came down at (sim/plan.ts `LandingAim`), lit 76.8 s after the record’s instant on the run from the pad; what follows was written with it lit by the clock, when it was -35780). ' +
          `${reason.PUBLISHED}. At 10:07, the instant the record has the cable bundle burn through, it is at 54 km where the record’s research has 80 to 100, as the coast from the injection (61 km): the burn’s instant, line and impulse and the record’s clock own it, not the drag (the coast’s miss). Read as osculating it was at 79 km and within`,
      },
    },
    descent: {
      'pilot.at': {
        by: 298.6,
        slack: 10,
        why:
          'Now 299 (the braking burn is timed for the place it came down at (sim/plan.ts `LandingAim`), lit 76.8 s after the record’s instant on the run from the pad; what follows was written with it lit by the clock, when it was 242). ' +
          'Late by the type’s descent, as Vostok 1’s is: from the burn he is 32.6 min to the ground where the record’s 09:51 to 10:18 is 27, and four kilometres under a canopy at 5 m/s is 13 minutes by itself (Vostok 1’s miss)',
      },
    },
  }),
  'ussr/vostok/vostok-3': inUnits({
    coast: {},
    ascent: {
      cutoffAt: {
        by: -9.815,
        slack: 0.1,
        why: 'Block E is cut where Vostok 1’s integrator was set (2,283.52 m/s of apparent velocity: estimated here), and that comes at 676.4 s, as on Vostok 1; the bunker waited for 687 s, the end of this flight’s burn as planned. So this flight’s setting, or its third stage’s start, or both, differed from Vostok 1’s by some ten seconds of burn: neither was found. Not adjusted',
      },
      firstG: {
        by: -1.786,
        slack: 0.05,
        why: 'The most the type’s ascent gives is 4.71 g, on the first stage before the strap-ons throttle back (3.98 on the core alone, 0.91 on the last). Nikolayev’s 6 to 7 g is by feel and said of the whole ascent; Titov felt no more than five on the same vehicle (Vostok 2’s check, which holds). Either the feeling or the type’s thrust and masses: not adjusted',
      },
      apogee: { by: -15_890, slack: 300, why: `The osculating apogee at the cutoff, 219 km for the published 235: ${reason.SHORT_V3}` },
    },
    shown: {},
    descent: {
      'module.at': {
        by: 392.2,
        slack: 10,
        why:
          'Now 392 (the braking burn is timed for the place it came down at (sim/plan.ts `LandingAim`), lit 171 s after the record’s instant on the run from the pad; what follows was written with it lit by the clock, when it was 209). ' +
          'The module comes down at 09:43:56, 5.7 minutes before the pilot; the record has twelve minutes between them (09:39:59 and 09:52), as on Vostok 4. From 7 km the module takes six minutes on the type’s three parachutes; what put both flights’ modules down so long before their pilots is not in anything read. The rest is the pilot’s own miss: not adjusted',
      },
    },
  }),
  'ussr/vostok/vostok-5': inUnits({
    descent: {
      'pilot.at': {
        by: 384.8,
        slack: 60,
        why: 'Bykovskiy is on the ground 385 s after the record’s instant. Since November 2026 the braking burn is timed for the place it came down at (sim/plan.ts `LandingAim`): on the run from the pad it is lit 430 s after the record’s instant, the run being 3,700 km behind where the record’s clock would have it after five days (its period carried round 81 times), and everything after the burn comes as much later, with what the type’s descent takes besides. Not adjusted',
        short: 'the burn timed for the landing place',
      },
      'module.at': {
        by: 503.5,
        slack: 75,
        why: 'The descent module is on the ground 503 s after the record’s instant. Since November 2026 the braking burn is timed for the place it came down at (sim/plan.ts `LandingAim`): on the run from the pad it is lit 430 s after the record’s instant, the run being 3,700 km behind where the record’s clock would have it after five days (its period carried round 81 times), and everything after the burn comes as much later, with what the type’s descent takes besides. Not adjusted',
        short: 'the burn timed for the landing place',
      },
    },
    coast: {
      crossTrack: {
        by: -104055.3,
        slack: 5_000,
        why:
          'Now -104055 (the braking burn is timed for the place it came down at (sim/plan.ts `LandingAim`), lit 430 s after the record’s instant on the run from the pad; what follows was written with it lit by the clock, when it was -252667). ' +
          `It comes down 253 km across the track. ${reason.COAST_V5}`,
      },
      'tass18.period': {
        by: 6.387,
        slack: 1,
        why: `At 15:00 on 18 June it goes round in 87.91 min where TASS has 87.8: 6.4 s against a tolerance of a tenth of a minute. ${reason.COAST_V5}`,
      },
    },
    ascent: {
      perigee: {
        by: 6_300,
        slack: 500,
        why: `The law is flown level to the 181 km asked for, where the published perigee is 174.7 km. ${reason.SHORT_V5}`,
      },
      apogee: {
        by: -22_800,
        slack: 300,
        why: `The osculating apogee at the cutoff, 199 km for the published 222: ${reason.SHORT_V5}`,
      },
    },
    shown: {
      'tass18.perigee': {
        by: 9_450,
        slack: 500,
        why: `${reason.PUBLISHED}. Begun where the type’s ascent left it, its apogee lower, it drags less at perigee over four days and is 168.5 km up at 15:00 on 18 June where TASS has 159; from the estimated injection it is 163.3 and holds. ${reason.APSIS_OPEN}`,
      },
      'tass18.period': {
        by: 8.552,
        slack: 1,
        why: `${reason.PUBLISHED}. At 15:00 on 18 June it goes round in 87.94 min where TASS has 87.8. ${reason.COAST_V5}`,
      },
      crossTrack: {
        by: -71552.8,
        slack: 5_000,
        why:
          'Now -71553 (the braking burn is timed for the place it came down at (sim/plan.ts `LandingAim`), lit 430 s after the record’s instant on the run from the pad; what follows was written with it lit by the clock, when it was -241728). ' +
          `${reason.PUBLISHED}. ${reason.COAST_V5}`,
      },
    },
  }),
  'ussr/vostok/vostok-6': inUnits({
    coast: {
      crossTrack: {
        by: -72958.3,
        slack: 5_000,
        why:
          'Now -72958 (the braking burn is timed for the place it came down at (sim/plan.ts `LandingAim`), lit 326 s after the record’s instant on the run from the pad; what follows was written with it lit by the clock, when it was -175679). ' +
          `It comes down 176 km across the track. ${reason.COAST_V6}`,
      },
    },
    ascent: {
      apogee: {
        by: -18_650,
        slack: 300,
        why: `The osculating apogee at the cutoff, 212 km for the published 231: ${reason.SHORT_V6}`,
      },
    },
    shown: {},
    descent: {
      'pilot.at': {
        by: 160.6,
        slack: 10,
        why:
          'Now 161 (the braking burn is timed for the place it came down at (sim/plan.ts `LandingAim`), lit 326 s after the record’s instant on the run from the pad; what follows was written with it lit by the clock, when it was -201). ' +
          'Down at 11:16:39, 3 min 21 s before TASS’s 11:20: from the burn, derived from the cycle’s command and its “approximately” 71 minutes (Kogutenko), she takes 26.0 min to the ground. The minute of the burn is the owner: Vostok 1’s 27.9 min from command to pilot would have it at 10:52:06. Not adjusted',
      },
    },
  }),
  'ussr/vostok/vostok-4': inUnits({
    coast: {},
    ascent: {
      apogee: { by: -16_800, slack: 300, why: `The osculating apogee at the cutoff, 220 km for the published 237: ${reason.SHORT_V4}` },
    },
    shown: {},
    descent: {
      'pilot.at': {
        by: -393.8,
        slack: 59.1,
        why: 'Popovich on the ground: 254993 where the record has 255387. Since November 2026 the braking burn is timed for the place it came down at (sim/plan.ts `LandingAim`), lit 253 s before the record’s instant on the run from the pad, so what follows the burn comes as much sooner or later than the record has it, and by what the descent itself takes besides. Not adjusted',
        short: 'the burn timed for the landing place',
      },
    },
    group: {
      closest: {
        by: 196_477,
        slack: 5_000,
        why: 'Flown from the two records, Vostok 4 comes no nearer Vostok 3 than 203 km in its first two revolutions, where TASS has 6.5 km and the pilots about 5. The records cannot hold a check of kilometres: Vostok 3’s place a day on is its period carried round sixteen times (a hundredth of a minute is 75 km), now the one its heights give over the ellipsoid under the apsis, 88.34 min, with no traceable published period (over the mean Earth, 88.54 min, it was 1,768 km; on the untraced 88.33 min, 234 km), and Vostok 4’s place at its cutoff is the type’s reckoning (`injection.arc`, 144 km a degree). That the second launch was timed to put it beside the first is the record; where each ship was, to that precision, is in nothing read. Not adjusted',
      },
    },
  }),
  'usa/apollo/apollo-8': inUnits({
    ascent: {
      cutoffAt: { by: 10.6, slack: 1.1, why: reason.SIVB_SHORT, short: 'the S-IVB makes up the stack’s shortfall' },
    },
    shown: {
      'mcc-1.velocity': { by: 41.19, slack: 4, why: reason.A8_MCC1, short: 'the injection is not the record’s' },
      'mcc-2.velocity': { by: -0.3819, slack: 0.05, why: reason.A8_MCC2, short: 'nothing left to correct' },
      'mcc-3.velocity': { by: -1.274, slack: 0.15, why: reason.A8_MCC3, short: 'the least impulse, no execution error' },
      entryG: { by: -0.8039, slack: 0.1, why: reason.A8_ENTRY, short: 'a shallower entry' },
    },
    lunar: {
      pericynthion: { by: 3_378_000, slack: 150_000, why: reason.A8_INJECTION, short: 'the injection is not the record’s' },
      pericynthionAt: { by: 8_458, slack: 600, why: reason.A8_INJECTION, short: 'the injection is not the record’s' },
    },
  }),
  'usa/apollo/apollo-10': inUnits({
    ascent: {
      cutoffAt: { by: 8.199, slack: 0.8, why: reason.SIVB_SHORT, short: 'the S-IVB makes up the stack’s shortfall' },
    },
  }),
  'usa/apollo/apollo-11': inUnits({
    ascent: {
      maxQ: {
        by: 7_365,
        slack: 750,
        why: `The greatest dynamic pressure is 42.6 kPa at 86.1 s where the record has 35.2 at 83.0: ${reason.SIC_A11}`,
        short: 'the S-IC flies flatter and faster',
      },
      'sic-centre-cutoff.speed': { by: 55.58, slack: 6, why: reason.SIC_A11, short: 'the S-IC flies flatter and faster' },
      'sic-centre-cutoff.altitude': { by: -2_863, slack: 300, why: reason.SIC_A11, short: 'the S-IC flies flatter' },
      'sic-separation.speed': { by: 51.12, slack: 5.5, why: reason.SIC_A11, short: 'the S-IC flies flatter and faster' },
      'sic-separation.altitude': { by: -4_661, slack: 500, why: reason.SIC_A11, short: 'the S-IC flies flatter' },
      'sic-separation.climb': { by: -1.803, slack: 0.2, why: reason.SIC_A11, short: 'the S-IC flies flatter' },
      'sii-centre-cutoff.altitude': { by: -11_400, slack: 1_100, why: reason.SII_A11, short: 'lower through the S-II' },
      'sii-separation.altitude': { by: -5_526, slack: 550, why: reason.SII_A11, short: 'lower through the S-II' },
      'injection.at': { by: 6.314, slack: 0.65, why: reason.TLI_A11, short: 'the injection cut later' },
    },
  }),
  'usa/apollo/apollo-14': inUnits({
    ascent: {
      cutoffAt: { by: 9.281, slack: 0.9, why: reason.SIC_A14, short: 'the S-IVB makes up a steeper S-IC’s shortfall' },
    },
  }),
  'usa/apollo/apollo-12': inUnits({
    ascent: {
      cutoffAt: { by: 7.064, slack: 0.7, why: reason.SIVB_SHORT, short: 'the S-IVB makes up the stack’s shortfall' },
    },
  }),
  'usa/apollo/apollo-17': inUnits({
    ascent: {
      cutoffAt: { by: 6.516, slack: 0.65, why: reason.SIVB_SHORT, short: 'the S-IVB makes up the stack’s shortfall' },
    },
  }),
  'usa/apollo/apollo-7': inUnits({
    shown: {
      'sps-1.velocity': {
        by: 6.823,
        slack: 0.7,
        why:
          'The corrective combination is solved by guidance on where the run and its S-IVB are as it lights (sim/pursuit.ts): 226.5 ft/s to leave the stage 80 nautical miles ahead and 7.8 above at the coelliptic manoeuvre, where the record’s burn was 204.1. ' +
          'What it has to correct is the run’s own phasing by then (lead.range): the two phasing burns are flown at the record’s impulses, open, and the run leads its stage by 230 nautical miles where the record has 84. ' +
          'The burns that follow come out close to the record’s (the coelliptic manoeuvre 182.1 ft/s for 173.8, the terminal phase 17.8 for 17.4, the braking 18.0 for 18.2). Not adjusted',
        short: 'solved on the run’s own phasing',
      },
      'lead.range': {
        by: 271_187,
        slack: 25_000,
        why:
          'As the corrective combination lights the run leads its S-IVB by 230 nautical miles, where the report has about 84 (and 75 intended). The two phasing burns, flown as recorded, would by themselves put it some 365 ahead; what brought the real lead down was the stage’s orbit decaying under it ' +
          '("more rapidly than expected", §3.2.1), which took off about 280 nautical miles and takes off 135 here. ' +
          'The stage is flown on a quarter of its outside as its drag area (the mean of every attitude: it was tumbling), and the spacecraft on a quarter of its own. The spacecraft’s own drift against the tracking over eleven days asks for no more air than that; the stage’s drift from the spacecraft asks for about 1.7 times its drag. The air is the day’s (world/thermosphere.ts: Jacchia 1971 on the day’s flux and Kp) for both, so it is the stage’s area that is short: its adapter’s four panels stood open, and are not counted. Not adjusted',
        short: 'the stage’s orbit decays too slowly',
      },
      'braking.range': {
        by: 386,
        slack: 120,
        why:
          'The braking begins at the record’s 29:43:55 with the stage 1.4 nautical miles off, where the report has 1.2. The terminal phase is solved to arrive at the report’s theoretical intercept, 29:51:46; the midcourse correction of 2 ft/s at 29:30:42 is not flown ' +
          '(its aim is not in anything read), and the braking takes up what it would have. Not adjusted',
        short: 'no midcourse correction flown',
      },
      'sextant-1.range': {
        by: -81_572,
        slack: 12_000,
        why:
          'Fifteen hours after the separation manoeuvre the stage is 116 nautical miles off where the sextant’s tracking ended at 160, and at 53:20 it is 231 for 320. The separation is flown as the report gives it (2 ft/s, taken along the motion at 30:20: neither is stated), ' +
          'and from there the two part by the air. The stage is flown on a quarter of its outside as its drag area (the mean of every attitude: it was tumbling), and the spacecraft on a quarter of its own. The spacecraft’s own drift against the tracking over eleven days asks for no more air than that; the stage’s drift from the spacecraft asks for about 1.7 times its drag. The air is the day’s (world/thermosphere.ts: Jacchia 1971 on the day’s flux and Kp) for both, so it is the stage’s area that is short: its adapter’s four panels stood open, and are not counted. Not adjusted',
        short: 'the stage’s orbit decays too slowly',
      },
      'sextant-2.range': {
        by: -164_436,
        slack: 20_000,
        why: 'As at 45:30: 231 nautical miles for 320. The stage is flown on a quarter of its outside as its drag area (the mean of every attitude: it was tumbling), and the spacecraft on a quarter of its own. The spacecraft’s own drift against the tracking over eleven days asks for no more air than that; the stage’s drift from the spacecraft asks for about 1.7 times its drag. The air is the day’s (world/thermosphere.ts: Jacchia 1971 on the day’s flux and Kp) for both, so it is the stage’s area that is short: its adapter’s four panels stood open, and are not counted. Not adjusted',
        short: 'the stage’s orbit decays too slowly',
      },
    },
    descent: {},
  }),
  'usa/gemini/gt-3': inUnits({
    ascent: {},
    coast: {
      'after-15900.perigee': {
        by: -11_374,
        slack: 1_000,
        why:
          'The third burn leaves a perigee of 72.0 km where SP-138 has a vacuum perigee of 45 nautical miles, 83.3 km. The burn is flown at the 97 ft/s the indicator read, straight against the motion as it ' +
          'lit; the first leaves the orbit within 2 km of the ground’s call. What the indicator’s 97 ft/s measured (the axis, with the thrusters canted) and what ball SP-138’s perigee is over are not ' +
          'read: cause not established, nothing adjusted',
      },
      alongTrack: {
        by: -289_150,
        slack: 8_000,
        why: `The drogue comes out 289 km short of where the ship landed, along the track. ${reason.GT3_ENTRY}`,
      },
      crossTrack: {
        by: 77_024,
        slack: 4_000,
        why: `And 77 km to the right of it: the bank held to the right, the way the target lay. ${reason.GT3_ENTRY}`,
      },
    },
    shown: {
      'after-6000.perigee': {
        by: 7_015,
        slack: 1_500,
        why: `165.5 km after the first burn where the ground called 85.6 nautical miles (158.5 km); from the published orbit it is 161.8 and holds. ${reason.GT3_SHOWN}`,
      },
      'after-15900.perigee': {
        by: -15_907,
        slack: 1_500,
        why: `67.4 km where SP-138 has 83.3. ${reason.GT3_SHOWN}; and as the coast’s, cause not established`,
      },
      alongTrack: {
        by: -200_000,
        slack: 10_000,
        why: `200 km short of where it landed, along the track. ${reason.GT3_SHOWN}. ${reason.GT3_ENTRY}`,
      },
      crossTrack: { by: 36_420, slack: 4_000, why: `36 km to the right of it. ${reason.GT3_SHOWN}. ${reason.GT3_ENTRY}` },
    },
  }),
  'usa/gemini/gt-5': inUnits({
    ascent: {
      'beco.altitude': { by: -6_945, slack: 500, why: reason.GT5_PITCH, short: 'the pitch rates as printed' },
      'beco.climb': { by: -4.548, slack: 0.2, why: reason.GT5_PITCH, short: 'the pitch rates as printed' },
    },
    coast: {
      'after-680000.apogee': {
        by: 16_661,
        slack: 1_500,
        why: `303.4 km on the last day where the tracking has 154.8 nautical miles (286.7 km). ${reason.GT5_DECAY}`,
        short: 'flown end on, where it drifted',
      },
      ejectionAt: {
        by: 826.1,
        slack: 40,
        why: `The drogue comes out 826 s after the record’s 190:49:19. ${reason.GT5_LATE}. ${reason.GT5_DECAY}`,
        short: 'the burn timed for the landing place',
      },
      crossTrack: {
        by: 42_943,
        slack: 4_000,
        why: 'It comes down 43 km to the right of where the ship landed: from the published orbit begun where the injection is reckoned (injection.arc, the ground range at separation taken for the arc, good to half a degree), eight days on. Flown on from the ascent’s own state it is within a kilometre. Not adjusted',
      },
    },
    shown: {
      'after-680000.apogee': {
        by: 16_265,
        slack: 1_500,
        why: `303.0 km on the last day where the tracking has 154.8 nautical miles (286.7 km). ${reason.GT5_DECAY}`,
        short: 'flown end on, where it drifted',
      },
      ejectionAt: {
        by: 678.7,
        slack: 40,
        why: `The drogue comes out 679 s after the record’s 190:49:19. ${reason.GT5_LATE}. ${reason.GT5_DECAY}`,
        short: 'the burn timed for the landing place',
      },
    },
    descent: {
      'reentry-module.at': {
        by: 750.4,
        slack: 40,
        why: `The ship is down 750 s after the record’s 190:55:14: the burn lit late and the entry longer (the drogue’s miss), and 71 s more under the main, flown at the 31.6 ft/s NASA CR-1106 gives the type, where the record has it from 10,600 ft at 190:51:16 to the sea at 190:55:14, 44.5 ft/s on the average. ${reason.GT5_LATE}`,
        short: 'the burn timed for the landing place',
      },
    },
  }),
  'usa/gemini/gt-4': inUnits({
    shown: {
      'after-184080.apogee': {
        by: 10_325,
        slack: 1_500,
        why: `Apogee 286.5 km in revolution 33 where Table 4-III has 276.1. ${reason.GT4_DECAY}. ${reason.GT4_SHOWN}`,
      },
      'after-291696.apogee': {
        by: 16_527,
        slack: 1_500,
        why: `Apogee 277.7 km in revolution 52 where Table 4-III has 261.1. ${reason.GT4_DECAY}. ${reason.GT4_SHOWN}`,
      },
      'after-342672.apogee': {
        by: 20_166,
        slack: 1_500,
        why: `Apogee 273.0 km in revolution 61 where Table 4-III has 252.8. ${reason.GT4_DECAY}. ${reason.GT4_SHOWN}`,
      },
      'after-351300.perigee': {
        by: 6_977,
        slack: 1_500,
        why: `The burn before retrofire, timed with retrofire for the landing place and read as long after it as the record’s reading, leaves a vacuum perigee of 85.3 km where the record has 42.3 nautical miles, 78.3 km: its 134 ft/s, blunt end forward, from an orbit 20 km higher at apogee than the record’s. ${reason.GT4_DECAY}. ${reason.GT4_SHOWN}`,
      },
      ejectionAt: {
        by: 618.2,
        slack: 30,
        why: `The drogue comes out 618 s after the record’s 97:50:53, at 40,000 ft as recorded. ${reason.GT4_LATE}. ${reason.GT4_DECAY}`,
      },
      crossTrack: {
        by: 78_514,
        slack: 8_000,
        why: `It comes down 79 km to the right of where Gemini IV landed (within 10 km along the track). ${reason.GT4_ACROSS}. ${reason.GT4_SHOWN}`,
      },
    },
    coast: {
      'after-184080.perigee': {
        by: 6_945,
        slack: 1_000,
        why: `Perigee 169.9 km in revolution 33 where Table 4-III has 163.0. ${reason.GT4_DECAY}`,
      },
      'after-291696.perigee': {
        by: 6_372,
        slack: 1_000,
        why: `Perigee 168.2 km in revolution 52 where Table 4-III has 161.9. ${reason.GT4_DECAY}`,
      },
      'after-291696.apogee': {
        by: 15_735,
        slack: 1_500,
        why: `Apogee 276.9 km in revolution 52 where Table 4-III has 261.1. ${reason.GT4_DECAY}`,
      },
      'after-342672.perigee': {
        by: 7_884,
        slack: 1_000,
        why: `Perigee 167.3 km in revolution 61 where Table 4-III has 159.5. ${reason.GT4_DECAY}`,
      },
      'after-342672.apogee': {
        by: 19_891,
        slack: 1_500,
        why: `Apogee 272.7 km in revolution 61 where Table 4-III has 252.8. ${reason.GT4_DECAY}`,
      },
      ejectionAt: {
        by: 675.6,
        slack: 30,
        why: `The drogue comes out 676 s after the record’s 97:50:53, at 40,000 ft as recorded. ${reason.GT4_LATE}. ${reason.GT4_DECAY}`,
      },
      crossTrack: {
        by: 114_681,
        slack: 8_000,
        why: `It comes down 115 km to the right of where Gemini IV landed (within 10 km along the track). ${reason.GT4_ACROSS}`,
      },
    },
    descent: {
      'reentry-module.at': {
        by: 675.2,
        slack: 30,
        why: `Down 675 s after the record’s 97:56:12: the drogue out 618 s late (the coast’s miss), and the rest the main at the type’s 10,600 ft on the Technical Summary’s mean rate. ${reason.GT4_LATE}`,
      },
    },
  }),
  'usa/gemini/gt-7': inUnits({
    ascent: {},
    coast: {
      'after-433800.perigee': {
        by: -11_790,
        slack: 1_500,
        why: `From the published orbit the two circularising burns leave a perigee of 285.5 km where the report has 160.5 nautical miles (297.2 km). ${reason.GT7_CIRCLE}`,
      },
      'after-433800.apogee': {
        by: 15_110,
        slack: 1_500,
        why: `And an apogee of 316.6 km where the report has 162.8 nautical miles (301.5 km). ${reason.GT7_CIRCLE}`,
      },
      'after-1184400.perigee': {
        by: -8_381,
        slack: 1_500,
        why: `In the last revolution 281.5 km where the report has 156.5 nautical miles (289.8 km). ${reason.GT7_CIRCLE}`,
      },
      'after-1184400.apogee': {
        by: 8_043,
        slack: 1_500,
        why: `And 311.0 km where the report has 163.6 nautical miles (303.0 km). ${reason.GT7_CIRCLE}`,
      },
      ejectionAt: { by: 153.7, slack: 15, why: `The drogue comes out 154 s after the record's 330:29:30. ${reason.GT7_ENTRY}` },
      crossTrack: { by: -45_150, slack: 6_000, why: `It comes down 45 km to the left of where the ship landed. ${reason.GT7_ENTRY}` },
    },
    shown: {
      'after-16200.apogee': {
        by: 7_465,
        slack: 1_000,
        why: `The apogee after the perigee adjust is 330.3 km where the report has 174.3 nautical miles (322.8 km). ${reason.GT7_ORBIT}`,
      },
      'after-253800.apogee': {
        by: 7_724,
        slack: 1_000,
        why: `The apogee after the phase adjust is 324.2 km where the report has 170.9 nautical miles (316.5 km). ${reason.GT7_ORBIT}`,
      },
      'after-433800.perigee': {
        by: -10_154,
        slack: 1_500,
        why: `The two circularising burns leave a perigee of 287.1 km where the report has 160.5 nautical miles (297.2 km). ${reason.GT7_CIRCLE}`,
      },
      'after-433800.apogee': {
        by: 12_873,
        slack: 1_500,
        why: `And an apogee of 314.4 km where the report has 162.8 nautical miles (301.5 km). ${reason.GT7_CIRCLE}`,
      },
      'after-1184400.perigee': {
        by: -6_832,
        slack: 1_500,
        why: `In the last revolution the perigee is 283.0 km where the report has 156.5 nautical miles (289.8 km). ${reason.GT7_CIRCLE}`,
      },
      ejectionAt: {
        by: 63.57,
        slack: 10,
        why: `The drogue comes out at 330:30:34, 64 s after the record's 330:29:30. ${reason.GT7_ENTRY}`,
      },
      crossTrack: {
        by: -80_944,
        slack: 8_000,
        why: `It comes down 81 km to the left of where the ship landed: the bank is held to the left all the way, where the crew reversed it four or five times to null the cross-range. ${reason.GT7_ENTRY}`,
      },
    },
    descent: {
      'reentry-module.at': {
        by: 124.4,
        slack: 15,
        why: `Down at 330:37:05, 124 s after the record: the drogue out 64 s late, and the rest the parachutes, the main at the type's height. ${reason.GT7_ENTRY}`,
      },
    },
  }),
  'usa/gemini/gt-6a': inUnits({
    ascent: {},
    coast: {
      'after-90600.perigee': { by: -8_339, slack: 1_500, why: reason.GT6A_RETRO },
      crossTrack: {
        by: -186_559,
        slack: 15_000,
        why: `From the published orbit it comes down 187 km to the left of where the ship landed. ${reason.GT6A_ENTRY}`,
      },
    },
    shown: {
      'after-90600.perigee': { by: -8_339, slack: 1_500, why: reason.GT6A_RETRO },
      crossTrack: { by: -170_672, slack: 15_000, why: `It comes down 171 km to the left of where the ship landed. ${reason.GT6A_ENTRY}` },
    },
    descent: {},
  }),
  // Gemini VIII from the pad, its rendezvous made on GATV-5003 (its coast from the published orbit is not run: a flight with a
  // target is flown with it, tests/orbital.test.mjs)
  'usa/gemini/gt-8': inUnits({
    ascent: {},
    shown: {
      'after-14100.perigee': { by: 7_507, slack: 1_500, why: reason.GT8_DH },
      'after-19200.apogee': { by: 29_120, slack: 4_000, why: reason.GT8_TPI },
      'coelliptic.velocity': { by: 2.308, slack: 0.5, why: reason.GT8_DH },
      'terminal-phase.velocity': { by: 14.22, slack: 2, why: reason.GT8_TPI },
      'correction-1.velocity': { by: -4.617, slack: 0.5, why: reason.GT8_CORRECTIONS },
      'correction-2.velocity': { by: -2.886, slack: 0.5, why: reason.GT8_CORRECTIONS },
      'terminal-braking.velocity': { by: 17.31, slack: 3, why: reason.GT8_BRAKING },
      'at-18092.range': { by: 36_550, slack: 5_000, why: reason.GT8_DH },
      'at-18896.range': { by: 37_660, slack: 5_000, why: reason.GT8_DH },
      crossTrack: { by: -31_476, slack: 5_000, why: reason.GT8_ENTRY },
    },
    descent: {
      'reentry-module.at': {
        by: 93.5,
        slack: 15,
        why: 'Down at 10:43:00, 94 s after the record: the drogue out 33 s after the report’s table has it (its figure has it 13 s earlier still), and the rest the parachutes: the main at the 8,700 ft read off the report’s figure, on the 84.2 ft ringsail’s 31.6 ft/s, where the figure has the ship from the main’s deployment to the water in 195 s. As Gemini-Titan 7’s. Not adjusted',
      },
    },
  }),
  // Gemini IX-A from the pad, its three rendezvous made on the ATDA (its coast from the published orbit is not run: a flight
  // with a target is flown with it, tests/orbital.test.mjs)
  'usa/gemini/gt-9a': inUnits({
    ascent: {},
    shown: {
      'after-13500.apogee': { by: -21_960, slack: 3_000, why: reason.GT9A_TPI },
      'after-70200.perigee': { by: 6_124, slack: 2_000, why: reason.GT9A_HIGH },
      'after-76200.apogee': { by: 25_070, slack: 4_000, why: reason.GT9A_ABOVE },
      'after-84600.perigee': { by: 6_462, slack: 2_000, why: reason.GT9A_HIGH },
      'coelliptic.velocity': { by: -1.51, slack: 0.5, why: reason.GT9A_COELLIPTIC },
      'terminal-phase.velocity': { by: 2.026, slack: 0.5, why: reason.GT9A_TPI },
      'midcourse-1.velocity': { by: -1.225, slack: 0.2, why: reason.GT9A_CORRECTIONS },
      'midcourse-2.velocity': { by: -1.219, slack: 0.2, why: reason.GT9A_CORRECTIONS },
      'terminal-braking.velocity': { by: 6.058, slack: 2, why: reason.GT9A_BRAKING },
      'terminal-phase-2.velocity': { by: 2.833, slack: 0.5, why: reason.GT9A_EQUI },
      'midcourse-2-3.velocity': { by: -0.9132, slack: 0.2, why: reason.GT9A_CORRECTIONS },
      'coelliptic-3.velocity': { by: -0.3273, slack: 0.15, why: reason.GT9A_COELLIPTIC },
      'terminal-phase-3.velocity': { by: 17.68, slack: 3, why: reason.GT9A_ABOVE },
      'midcourse-3-1.velocity': { by: -2.438, slack: 0.2, why: reason.GT9A_CORRECTIONS },
      'midcourse-3-2.velocity': { by: -5.791, slack: 0.2, why: reason.GT9A_CORRECTIONS },
      'terminal-braking-3.velocity': { by: 14.06, slack: 3, why: reason.GT9A_BRAKING },
      'at-436.range': { by: 86_320, slack: 10_000, why: reason.GT9A_ATDA },
      'at-12962.range': { by: 68_230, slack: 10_000, why: reason.GT9A_ATDA },
    },
    descent: {
      'reentry-module.at': { by: 136, slack: 30, why: reason.GT9A_DESCENT },
    },
  }),
  // Gemini XI from the pad, its two rendezvous made on GATV-5006 (its coast from the published orbit is not run: a flight with
  // a target is flown with it, tests/orbital.test.mjs)
  'usa/gemini/gt-11': inUnits({
    ascent: {},
    shown: {
      'after-3600.perigee': { by: -8_833, slack: 2_000, why: reason.GT11_TPI },
      'after-3600.apogee': { by: 17_620, slack: 3_000, why: reason.GT11_TPI },
      'after-198000.perigee': { by: 7_463, slack: 2_000, why: reason.GT11_STANDOFF },
      'after-237600.perigee': { by: 14_270, slack: 3_000, why: reason.GT11_COINCIDENT },
      'after-243000.perigee': { by: 9_256, slack: 2_000, why: reason.GT11_STANDOFF },
      'after-252000.perigee': { by: 9_205, slack: 2_000, why: reason.GT11_STANDOFF },
      'terminal-phase.velocity': { by: 4.893, slack: 1, why: reason.GT11_TPI },
      'midcourse-1.velocity': { by: -1.887, slack: 0.2, why: reason.GT11_CORRECTIONS },
      'midcourse-2.velocity': { by: -0.6279, slack: 0.2, why: reason.GT11_CORRECTIONS },
      'terminal-braking.velocity': { by: 10.56, slack: 2, why: reason.GT11_BRAKING },
      'terminal-phase-2.velocity': { by: -1.818, slack: 0.5, why: reason.GT11_COINCIDENT },
      'midcourse-3.velocity': { by: -1.801, slack: 0.2, why: reason.GT11_CORRECTIONS },
      'terminal-braking-2.velocity': { by: 4.306, slack: 2, why: reason.GT11_BRAKING },
      'at-2998.range': { by: 17_390, slack: 5_000, why: reason.GT11_TPI },
      'at-235642.range': { by: -19_260, slack: 5_000, why: reason.GT11_COINCIDENT },
      ejectionAt: { by: 91.27, slack: 30, why: reason.GT11_ENTRY },
    },
    descent: {
      'reentry-module.at': {
        by: 158.8,
        slack: 30,
        why: `Down 159 s after the record: the drogue out 91 s late (below), and the main at the 11,000 ft read off the report’s Figure 5.1.11-1 on the 84.2 ft ringsail’s 31.6 ft/s (CR-1106), 67 s longer from the drogue to the water than the record’s 340 s. ${reason.GT11_ENTRY}`,
      },
    },
  }),
  // Gemini XII from the pad, its rendezvous made on GATV-5001 (its coast from the published orbit is not run: a flight with a
  // target is flown with it, tests/orbital.test.mjs)
  'usa/gemini/gt-12': inUnits({
    ascent: {},
    shown: {
      'after-28800.apogee': { by: 12_720, slack: 2_000, why: reason.GT12_DOCKED },
      'after-57600.apogee': { by: 13_490, slack: 2_000, why: reason.GT12_DOCKED },
      'after-190800.apogee': { by: 13_120, slack: 2_000, why: reason.GT12_DOCKED },
      'after-226800.apogee': { by: 14_800, slack: 2_000, why: reason.GT12_DOCKED },
      'after-336000.apogee': { by: 15_430, slack: 2_000, why: reason.GT12_DOCKED },
      'terminal-phase.velocity': { by: 2.26, slack: 0.5, why: reason.GT12_TPI },
      'midcourse-2.velocity': { by: -0.9449, slack: 0.2, why: reason.GT12_CORRECTIONS },
      'midcourse-4.velocity': { by: -1.492, slack: 0.2, why: reason.GT12_CORRECTIONS },
      'at-8575.range': { by: -11_180, slack: 3_000, why: reason.GT12_TPI },
      ejectionAt: { by: 395.6, slack: 60, why: reason.GT12_ENTRY },
      crossTrack: { by: 36_162, slack: 5_000, why: reason.GT12_ENTRY },
    },
    descent: {
      'reentry-module.at': {
        by: 447.7,
        slack: 60,
        why: `Down at 94:41:58, 448 s after the record: the retrofire 7 minutes late. ${reason.GT12_ENTRY}`,
      },
    },
  }),
  // Skylab 2 from the pad, its rendezvous made on the workshop (skylab-2/mission.md)
  'usa/skylab/skylab-2': inUnits({
    ascent: {},
    shown: {},
    descent: {
      'cm.at': { by: 291.3, slack: 30, why: reason.SL2_SPLASH, short: 'deorbit at the record’s minute' },
    },
  }),
  // Soyuz 1: the record from the pad and from its published orbit (missions/ussr/soyuz/flights/soyuz-1/mission.md, "Against the record")
  'ussr/soyuz/soyuz-1': inUnits({
    coast: {
      'corrected.period': {
        by: -17.73,
        slack: 2,
        why: `It goes round in 88.26 min after the correction of the fifth orbit where Mishin has 88.56: 18 s against a tolerance of 15. ${reason.PERIOD_S1}`,
        short: 'the heights read over the ellipsoid',
      },
    },
    ascent: {},
    shown: {
      'corrected.period': {
        by: -17.68,
        slack: 2,
        why: `From the pad: 88.26 min after the correction where Mishin has 88.56. ${reason.PERIOD_S1}`,
        short: 'the heights read over the ellipsoid',
      },
      crossTrack: {
        by: -32_303,
        slack: 3_000,
        why: `From the pad it comes down 32 km across the track, against a tolerance of 30 (from the published orbit, 22 km). ${reason.ACROSS_S1}`,
        short: 'the burn timed for the landing place',
      },
    },
    descent: {
      'module.at': {
        by: -189.8,
        slack: 30,
        why: 'The descent module strikes the ground at 06:19:42, 190 s before the record’s 06:22:52. The braking burn is timed for the place it came down at (sim/plan.ts `LandingAim`): on the run from the pad it is lit 190 s before the record’s 05:57:15, the run being that far along its track ahead of the record’s clock after nineteen revolutions, and everything after it comes as much earlier; from the burn to the ground it takes the record’s 25 min 37 s to within a few seconds, on the planned parting and the ballistic entry. Not adjusted',
        short: 'the burn timed for the landing place',
      },
    },
  }),
  // Soyuz 4: the record from the pad and from its published orbit (missions/ussr/soyuz/flights/soyuz-4/mission.md, "Against the record")
  'ussr/soyuz/soyuz-4': inUnits({
    coast: {
      'fifth.perigee': {
        by: -35_131,
        slack: 1_500,
        why: `After the correction of the fifth orbit its perigee is 171.9 km where Siddiqi has 207. ${reason.SHAPE_S4}`,
        short: 'a correction flown as one push',
      },
      'fifth.apogee': {
        by: 31_220,
        slack: 1_500,
        why: `After the correction of the fifth orbit its apogee is 268.2 km where Siddiqi has 237 (Mishin, as Zak prints him, 273). ${reason.SHAPE_S4}`,
        short: 'a correction flown as one push',
      },
      'approached.perigee': {
        by: -23_653,
        slack: 1_500,
        why: `After the correction of the 32nd orbit its perigee is 177.3 km where TASS has 201; its apogee, 254.1, is TASS’s 253. ${reason.SHAPE_S4}`,
        short: 'a correction flown as one push',
      },
      crossTrack: {
        by: 83_879,
        slack: 5_000,
        why: `From the published orbit it comes down 84 km across the track, against a tolerance of 40. ${reason.ACROSS_S4}`,
        short: 'the burn timed for the landing place',
      },
    },
    ascent: {},
    shown: {
      'fifth.perigee': {
        by: -33_416,
        slack: 1_500,
        why: `From the pad: its perigee 173.6 km after the correction of the fifth orbit where Siddiqi has 207. ${reason.SHAPE_S4}`,
        short: 'a correction flown as one push',
      },
      'fifth.apogee': {
        by: 29_646,
        slack: 1_500,
        why: `From the pad: its apogee 266.6 km after the correction of the fifth orbit where Siddiqi has 237. ${reason.SHAPE_S4}`,
        short: 'a correction flown as one push',
      },
      'approached.perigee': {
        by: -21_884,
        slack: 1_500,
        why: `From the pad: its perigee 179.1 km after the correction of the 32nd orbit where TASS has 201. ${reason.SHAPE_S4}`,
        short: 'a correction flown as one push',
      },
      crossTrack: {
        by: 108_682,
        slack: 5_000,
        why: `From the pad it comes down 109 km across the track. ${reason.ACROSS_S4}`,
        short: 'the burn timed for the landing place',
      },
    },
    descent: {
      'module.at': {
        by: -721.8,
        slack: 60,
        why: 'The crew are on the ground 722 s before the record’s 09:50:47. The braking burn is timed for the place they came down at (sim/plan.ts `LandingAim`): on the run from the pad it is lit 668 s before the record’s 09:10:48, the run being that far along its track ahead of the record’s clock after three days, and everything after it comes as much earlier; from the burn to the ground it takes 54 s less than the record’s 40 min, on Soyuz 3’s impulse (assumed) and the lift held up throughout (its start only documented). Not adjusted',
        short: 'the burn timed for the landing place',
      },
    },
  }),
  // Soyuz 3: the record from the pad and from its published orbit (missions/ussr/soyuz/flights/soyuz-3/mission.md, "Against the record")
  'ussr/soyuz/soyuz-3': inUnits({
    coast: {
      'approached.apogee': {
        by: -15_218,
        slack: 1_000,
        why: `At 18:50 on 27 October its apogee is 236.8 km where TASS has 252, its perigee 182.8 where TASS has 179. ${reason.APPROACH_S3}`,
        short: 'the approach flown as one burn',
      },
      'correction.apogee': {
        by: -10_774,
        slack: 1_000,
        why: `After the correction of 28 October its apogee is 233.4 km where Mishin has 244.2 (TASS 244), its perigee 204.0 where he has 199.4. ${reason.APPROACH_S3} ${reason.CORRECTION_S3}`,
        short: 'the approach flown as one burn',
      },
      'correction.period': {
        by: -16.38,
        slack: 2,
        why: `It goes round in 88.54 min after the correction where Mishin has 88.81: 16 s against a tolerance of 15. ${reason.APPROACH_S3} ${reason.CORRECTION_S3}`,
        short: 'the approach flown as one burn',
      },
      crossTrack: {
        by: 145_567,
        slack: 5_000,
        why: `It comes down 146 km across the track. ${reason.ACROSS_S3}`,
        short: 'the burn timed for the landing place',
      },
    },
    ascent: {},
    shown: {
      'approached.apogee': {
        by: -16_679,
        slack: 1_000,
        why: `From the pad: its apogee 235.3 km at 18:50 on 27 October where TASS has 252. ${reason.APPROACH_S3}`,
        short: 'the approach flown as one burn',
      },
      'correction.apogee': {
        by: -11_621,
        slack: 1_000,
        why: `From the pad: its apogee 232.6 km after the correction where Mishin has 244.2. ${reason.APPROACH_S3} ${reason.CORRECTION_S3}`,
        short: 'the approach flown as one burn',
      },
      'correction.period': {
        by: -15.96,
        slack: 2,
        why: `From the pad: 88.54 min after the correction where Mishin has 88.81. ${reason.APPROACH_S3} ${reason.CORRECTION_S3}`,
        short: 'the approach flown as one burn',
      },
      crossTrack: {
        by: 169_669,
        slack: 5_000,
        why: `From the pad it comes down 170 km across the track. ${reason.ACROSS_S3}`,
        short: 'the burn timed for the landing place',
      },
    },
    descent: {
      'module.at': {
        by: -740.2,
        slack: 60,
        why: 'Beregovoy is on the ground 740 s before the record’s 10:25:03. The braking burn is timed for the place he came down at (sim/plan.ts `LandingAim`): on the run from the pad it is lit 658 s before the record’s 09:45:05, the run being that far along its track ahead of the record’s clock after four days, and everything after it comes as much earlier; from the burn to the ground it takes 82 s less than the record’s 40 min, on the parting at Soyuz 1’s planned interval and the lift held up throughout (both assumed). Not adjusted',
        short: 'the burn timed for the landing place',
      },
    },
  }),
  // Soyuz 10 and 12: from the pad and from their published orbits (each flight's mission.md, "Against the record")
  'ussr/soyuz/soyuz-10': inUnits({
    coast: {
      crossTrack: {
        by: 89_177,
        slack: 5_000,
        why: `From the published orbit it comes down 89 km across the track. ${reason.ACROSS_S10}`,
        short: 'the burn timed for the landing place',
      },
    },
    ascent: {},
    shown: {
      crossTrack: {
        by: 111_565,
        slack: 5_000,
        why: `From the pad it comes down 112 km across the track. ${reason.ACROSS_S10}`,
        short: 'the burn timed for the landing place',
      },
    },
    descent: {},
  }),
  'ussr/soyuz/soyuz-12': inUnits({
    coast: {
      crossTrack: {
        by: 169_570,
        slack: 5_000,
        why: `From the published orbit it comes down 170 km across the track. ${reason.ACROSS_S12}`,
        short: 'the burn timed for the landing place',
      },
    },
    ascent: {},
    shown: {
      crossTrack: {
        by: 208_657,
        slack: 5_000,
        why: `From the pad it comes down 209 km across the track. ${reason.ACROSS_S12}`,
        short: 'the burn timed for the landing place',
      },
    },
    descent: {
      'module.at': {
        by: -570.6,
        slack: 60,
        why: 'Lazarev and Makarov are on the ground 571 s before the record’s 14:33:48. The braking burn is timed for the place they came down at (sim/plan.ts `LandingAim`), and lit 816 s before the instant taken for it (Soyuz 10’s 41 min before the touchdown: the record has none of its own); from the burn to the ground the run takes 45 min, from an orbit 100 km higher than Soyuz 10’s, on Soyuz 11’s planned burn and parting and the lift held up (all assumed). Not adjusted',
        short: 'the burn timed for the landing place',
      },
    },
  }),
  // Soyuz 16 and T-2, on the 11A511U: from the pad and from their published orbits (each flight's mission.md, "Against the record")
  'ussr/soyuz/soyuz-16': inUnits({
    aloft: {
      breakup: {
        by: 57.1,
        slack: 3,
        why: 'Flown live with guidance and the sequencer on, the stack meets the day’s winter jet (ERA5 at 10:00 UTC over Site 1: some 30 m/s from the north at 11 to 13 km, across its east-north-easterly track) five degrees off the air at 40 kPa, and its bending load passes the R-7’s limit, 3,340 Pa rad, by a per cent at T+57; in still air it reaches 9 per cent of it. That limit is estimated (vostok-8k72k.ts `limits.qAlpha`: Soyuz-2’s three-degree tolerance with a half again for strength), and Soyuz 4 in January (98 per cent), Soyuz 12 (84) and Soyuz T-2 (74) come near it the same way. Soyuz 16 flew: this is not believed to be what happened. Either the vehicle was stronger than the estimate, or its control system met the wind at a smaller angle than the pilot flies the law at; the R-7’s normal and lateral stabilisation are documented as holding the centre of mass to the planned trajectory (Startsev, «Ракетно-космическое приборостроение и информационные системы», 2016, vol. 3 no. 1, pp. 92–97), which is not load relief, and no load relief of the 11A511U was found. The limit is not changed to let this flight through. The batch run, which the scene and every other check fly, has no breakup',
        short: 'the estimated bending limit in the winter jet',
      },
    },
    coast: {
      crossTrack: {
        by: 135_656,
        slack: 5_000,
        why: `From the published orbit it comes down 136 km across the track. ${reason.ACROSS_S16}`,
        short: 'the burn timed for the landing place',
      },
    },
    ascent: {},
    shown: {
      crossTrack: {
        by: 160_611,
        slack: 5_000,
        why: `From the pad it comes down 161 km across the track. ${reason.ACROSS_S16}`,
        short: 'the burn timed for the landing place',
      },
    },
    descent: {
      'module.at': {
        by: -962.1,
        slack: 60,
        why: 'Filipchenko and Rukavishnikov are on the ground 962 s before the record’s 11:03:35. The braking burn is timed for the place they came down at (sim/plan.ts `LandingAim`), and lit that much before the instant taken for it (Soyuz 10’s 41 min before the touchdown: the record has none of its own), the run being so far along its track ahead of the record’s clock after six days; from the burn to the ground it takes about the 41 min, on Spacefacts’ 188 s, Soyuz 11’s planned parting and the lift held up (assumed). Not adjusted',
        short: 'the burn timed for the landing place',
      },
    },
  }),
  'ussr/soyuz/soyuz-t-2': inUnits({
    coast: {
      crossTrack: {
        by: -187_446,
        slack: 5_000,
        why: `From the published orbit it comes down 187 km across the track. ${reason.ACROSS_T2}`,
        short: 'the station not flown',
      },
    },
    ascent: {
      apogee: { by: -24_053, slack: 500, why: `The osculating apogee at the cutoff, 224.9 km for the published 249. ${reason.ASCENT_T2}` },
    },
    shown: {
      'raised.apogee': {
        by: -14_129,
        slack: 1_000,
        why: `From the pad: 302.9 km after the fourth revolution’s raise where McDowell has 317 (from the published orbit it holds: 316.2). The raise’s impulses are worked between the published orbits, and the run begins it from the lower apogee the ascent leaves (${reason.ASCENT_T2.split('.')[0]})`,
        short: 'the insertion apogee short',
      },
      crossTrack: {
        by: -98_194,
        slack: 5_000,
        why: `From the pad it comes down 98 km across the track. ${reason.ACROSS_T2}`,
        short: 'the station not flown',
      },
    },
    descent: {
      'module.at': {
        by: 826.7,
        slack: 60,
        why: 'Malyshev and Aksyonov are on the ground 827 s after the record’s 15:39:00. The braking burn is timed for the place they came down at (sim/plan.ts `LandingAim`), and lit that much after the instant taken for it (Soyuz 10’s 41 min before the touchdown: the record has none of its own): the ship, not flown to the station, waits in the phasing orbit and is that far behind the record’s clock along its track after four days; from the burn to the ground it takes about the 41 min, on Spacefacts’ three to four minutes, Soyuz 11’s planned parting and the lift held up (assumed). Not adjusted',
        short: 'the station not flown',
      },
    },
  }),
  'ussr/voskhod/voskhod-1': inUnits({
    coast: {
      crossTrack: {
        by: -76093.3,
        slack: 5_000,
        why:
          'Now -76093 (the braking burn is timed for the place it came down at (sim/plan.ts `LandingAim`), lit 116 s after the record’s instant on the run from the pad; what follows was written with it lit by the clock, when it was -106456). ' +
          `It comes down 106 km across the track. ${reason.COAST_VK1}`,
      },
    },
    ascent: {},
    shown: {},
    descent: {
      'module.speed': {
        by: 1.917,
        slack: 0.05,
        why: 'It touches down at 2.1 m/s, not the design’s 0.2: the rocket is worked from Kamanin’s 7 to 8 m/s under the main parachutes (7.5 taken), and on the two main canopies as taken (two of the Vostok’s 574 m²) the ball comes down at 7.4, so the rocket stops it short of the ground, it rises and falls again. Its thrust and burn are not found and the parachutes’ areas are not: the miss is between the two estimates. Not adjusted',
      },
    },
  }),
  'ussr/voskhod/voskhod-2': inUnits({
    coast: {
      crossTrack: { by: -85_499, slack: 5_000, why: `It comes down 85 km across the track. ${reason.COAST_VK2}` },
      alongTrack: { by: -583_280, slack: 20_000, why: `It comes down 583 km short along the track, in Mari El. ${reason.COAST_VK2}` },
    },
    ascent: {
      perigee: {
        by: 6_500,
        slack: 500,
        why: `The law is flown level to the planned 180 km, where the perigee reached was 173.5 km. ${reason.SHORT_VK2}`,
      },
      apogee: {
        by: -20_420,
        slack: 300,
        why: `The osculating apogee at the cutoff, 477 km for the published 498: ${reason.SHORT_VK2}`,
      },
    },
    shown: {
      'rev9.perigee': {
        by: 5_295,
        slack: 300,
        why: `${reason.PUBLISHED}, its perigee at the ascent’s 180 km where the record has 173.5: so on the ninth orbit too`,
      },
      'rev9.apogee': { by: -4_848, slack: 300, why: `${reason.PUBLISHED}: the same, its apogee lower` },
      'rev18.perigee': { by: 5_398, slack: 300, why: `${reason.PUBLISHED}: the same, on the eighteenth orbit` },
      'rev18.apogee': { by: -4_653, slack: 300, why: `${reason.PUBLISHED}: the same, its apogee lower` },
      crossTrack: { by: -48_013, slack: 5_000, why: `${reason.PUBLISHED}. ${reason.COAST_VK2}` },
      alongTrack: { by: -450_508, slack: 20_000, why: `${reason.PUBLISHED}. ${reason.COAST_VK2}` },
    },
    descent: {
      'module.speed': {
        by: 1.883,
        slack: 0.05,
        why: 'It touches down at 2.1 m/s, not the design’s 0.2, as Voskhod 1’s: the rocket is worked from Kamanin’s 7 to 8 m/s, and on the two main canopies as taken the ball comes down at 7.4. Not adjusted',
      },
    },
  }),
  // the Langley trial of 1959 (tests/fixtures/pad-abort): not a flight, flown from its own weights off its own launcher
  'fixtures/pad-abort': {
    'abort:TM X-422': {
      speed: {
        by: -0.095,
        slack: 0.02,
        why:
          'it leaves 17 m/s slow. The motor is burned by one "typical" static firing’s curve (its impulse is the figure’s to 2 per cent), and the air’s drag while it burns is the end-on curve at no angle of attack: ' +
          'either the trial’s motor gave more than the typical one or the drag end on is less than taken. Not known which',
      },
      landingSpeed: {
        by: -0.051,
        slack: 0.01,
        why: 'just outside 5 per cent: the fixture comes down under Freedom 7’s 63 ft parachute, whose drag area is derived from 29 ft/s at 2,579 lb, and the model’s was a 64 ft one of another make',
      },
    },
  },
  'usa/gemini/gatv-5002': inUnits({
    ascent: {
      'beco.altitude': { by: -6130, slack: 1000, why: reason.TARGET_LOW, short: 'the Atlas’s pitch programme not found' },
      'beco.climb': { by: -1.628, slack: 0.2, why: reason.TARGET_FLAT, short: 'the Atlas’s pitch programme not found' },
      'seco.altitude': { by: -9115, slack: 1000, why: reason.TARGET_LOW, short: 'the Atlas’s pitch programme not found' },
      'veco.altitude': { by: -8806, slack: 1000, why: reason.TARGET_LOW, short: 'the Atlas’s pitch programme not found' },
      'agena-start.altitude': { by: -8006, slack: 1000, why: reason.TARGET_LOW, short: 'the Atlas’s pitch programme not found' },
    },
  }),
  'usa/gemini/gatv-5003': inUnits({
    ascent: {
      'beco.altitude': { by: -5315, slack: 1000, why: reason.TARGET_LOW, short: 'the Atlas’s pitch programme not found' },
      'seco.altitude': { by: -7706, slack: 1000, why: reason.TARGET_LOW, short: 'the Atlas’s pitch programme not found' },
      'veco.altitude': { by: -6450, slack: 1000, why: reason.TARGET_LOW, short: 'the Atlas’s pitch programme not found' },
      'agena-start.altitude': { by: -8326, slack: 1000, why: reason.TARGET_LOW, short: 'the Atlas’s pitch programme not found' },
    },
  }),
  'usa/gemini/atda': inUnits({
    ascent: {
      'beco.altitude': { by: -5752, slack: 1000, why: reason.TARGET_LOW, short: 'the Atlas’s pitch programme not found' },
      'beco.climb': { by: -4.653, slack: 0.2, why: reason.ATDA_FLAT, short: 'the ATDA Atlas’s own programme not found' },
      apogee: { by: 17020, slack: 1000, why: reason.ATDA_APOGEE, short: 'the verniers’ figures' },
      period: { by: 10.48, slack: 1, why: reason.ATDA_APOGEE, short: 'the verniers’ figures' },
    },
  }),
  'usa/gemini/gatv-5005': inUnits({
    ascent: {
      'beco.altitude': { by: -6868, slack: 1000, why: reason.TARGET_LOW, short: 'the Atlas’s pitch programme not found' },
      'beco.climb': { by: -1.68, slack: 0.2, why: reason.TARGET_FLAT, short: 'the Atlas’s pitch programme not found' },
      'seco.altitude': { by: -11110, slack: 1000, why: reason.TARGET_LOW, short: 'the Atlas’s pitch programme not found' },
      'veco.altitude': { by: -11050, slack: 1000, why: reason.TARGET_LOW, short: 'the Atlas’s pitch programme not found' },
      'agena-start.altitude': { by: -10630, slack: 1000, why: reason.TARGET_LOW, short: 'the Atlas’s pitch programme not found' },
      cutoffAt: { by: -4.465, slack: 0.5, why: reason.TARGET_EARLY, short: 'the 8247’s impulse, secondary' },
    },
  }),
  'usa/gemini/gatv-5006': inUnits({
    ascent: {
      'beco.altitude': { by: -5757, slack: 1000, why: reason.TARGET_LOW, short: 'the Atlas’s pitch programme not found' },
      'beco.climb': { by: -1.451, slack: 0.2, why: reason.TARGET_FLAT, short: 'the Atlas’s pitch programme not found' },
      'seco.altitude': { by: -9331, slack: 1000, why: reason.TARGET_LOW, short: 'the Atlas’s pitch programme not found' },
      'seco.speed': { by: 63.38, slack: 5, why: reason.TARGET_FAST, short: '5302’s thrusts, not 5306’s' },
      'veco.altitude': { by: -9497, slack: 1000, why: reason.TARGET_LOW, short: 'the Atlas’s pitch programme not found' },
      'veco.speed': { by: 61.12, slack: 5, why: reason.TARGET_FAST, short: '5302’s thrusts, not 5306’s' },
      'agena-start.altitude': { by: -8865, slack: 1000, why: reason.TARGET_LOW, short: 'the Atlas’s pitch programme not found' },
    },
  }),
  'usa/gemini/gatv-5001': inUnits({
    ascent: {
      'beco.altitude': { by: -5710, slack: 1000, why: reason.TARGET_LOW, short: 'the Atlas’s pitch programme not found' },
      'beco.climb': { by: -1.474, slack: 0.2, why: reason.TARGET_FLAT, short: 'the Atlas’s pitch programme not found' },
      'seco.altitude': { by: -10050, slack: 1000, why: reason.TARGET_LOW, short: 'the Atlas’s pitch programme not found' },
      'veco.altitude': { by: -10170, slack: 1000, why: reason.TARGET_LOW, short: 'the Atlas’s pitch programme not found' },
      'agena-start.altitude': { by: -10030, slack: 1000, why: reason.TARGET_LOW, short: 'the Atlas’s pitch programme not found' },
      period: { by: -5.012, slack: 0.5, why: reason.TARGET_PERIOD, short: 'the report’s period is not its vector’s' },
    },
  }),
};
