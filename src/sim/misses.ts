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
 *   ascent, shown, descent   its ascent flown from the pad; the coast flown on from it on the published orbit (staged.ts
 *                         `published`); the bodies down from the ejection (tests/staged.test.mjs)
 *   live                  the live staged vehicle steered by its pilot against the batch ascent's last cutoff, at
 *                         tolerances set before it was flown (tests/stagedlive.test.mjs)
 */
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

const SAME_SHAPE =
  'the air on the spacecraft with its tower on is Freedom 7’s estimates: one drag curve end on (TM X-491, at no angle of attack), a side’s drag area and a heat shield’s slope that are ours. ' +
  'It tumbles, as the trial did, and how much of the climb the air takes then is those estimates';
const UNKNOWN_BEACH =
  'what spacecraft No. 1 weighed that day and how far its launcher leaned are not in anything read: it is flown here as Freedom 7’s spacecraft (3,764 lb with its tower, the retropack dropped) off the 1959 trial’s 71 degrees. ' +
  'No. 1 was stripped of most of its systems (This New Ocean, p. 261), so it was lighter and went higher and stayed up longer';
const SHORT =
  'The vehicle as the record now reads it does not reach orbit: at the last cutoff it has 7,681 m/s where the published orbit needs 7,844 at 180 km, 162 m/s short, and its perigee is under the ground (until November 2026 the law’s axis was up to 0.14 per cent long, and the thrust along it with it: 5 m/s more and 157 short). ' +
  'Block E is cut where its integrator was set (2,283.52 m/s of apparent velocity, the flight task) and that comes at 676.4 s, the recorded instant to a third of a second, with 46 kg left: so the third stage as recorded is ' +
  'right, and the shortfall is the first two stages’. What owns it (the last test): the throttling documented in kind and estimated in level, the strap-ons’ intermediate stage (none: +143 m/s; at 80 per cent: +71) and above ' +
  'all the core’s final stage (none: +443 m/s; 5 s of it, not 10: +221), with 4.5 t left in the core at its cutoff, which a vehicle with tank-emptying regulators would not carry. So the core’s figures and its final ' +
  'stage as the sources give them do not agree: its load (100.4 t fuelled less 6.8 t dry, Astronautix) or the length or level of its final stage is wrong. Not adjusted. ' +
  'The first reading (rated thrust to the recorded instants, Soyuz-ST’s loads) was 142 m/s fast: the documented throttling is worth more than the whole miss either way';
const PUBLISHED =
  'The coast is flown from the published orbit, begun where the ascent left the spacecraft (staged.ts `published`), since the ascent as flown does not reach it';
const SHORT_TYPE =
  'Vostok 2’s ascent is the type’s, flown on Vostok 1’s instants and its third stage’s integrator setting (no document of E103-17’s ascent was found: its mission.md), so it falls short of an orbit as Vostok 1’s does and for the same reasons (SHORT, Vostok 1’s): ' +
  'at the last cutoff it is level at the planned 180 km with 7,693 m/s where 183 by 244 km needs some 7,840';
const PHASE =
  'The published orbit read as mean elements with a nodal period (world/meanelements.ts, issue #8) and flown round under J2 from where the ascent left the spacecraft crosses the equator northbound every 88.45 min, ' +
  'the published period: at 11:48:45 and 17:42:34, where TASS’s crossings are 11:48 and 17:42 (read as osculating, as until November 2026, it went round in 88.66 min and was four minutes behind the record’s orbit by the burn). ' +
  'What is left is the place on the orbit at cutoff, which is the type’s ascent and not this flight’s, and the burn’s aim along the line from the Sun (`retro.aim`)';
/** Vostok 3's ascent is the type's but for the third stage's cutoff, which Kamanin heard counted. */
const SHORT_V3 =
  'Vostok 3’s ascent is the type’s, flown on Vostok 1’s instants and its third stage’s integrator setting (no cyclogram or flight task of E103-23 was found: its mission.md), so it falls short of an orbit as Vostok 1’s does and for the same reasons (SHORT, Vostok 1’s): ' +
  'at the last cutoff it is level at the planned 180 km with 7,662 m/s where 180.7 by 234.6 km needs some 7,817';
/** Vostok 3's four days: where the ship is at the burn is the published period carried round 64 times. */
const PERIOD_64 =
  'Over 64 revolutions the published period sets where the ship is when the burn comes: a second a revolution is some 470 km along the track by the landing, and the period is given to a hundredth of a minute (300 km). ' +
  'Flown on the record’s 88.33 min (Russian Wikipedia, beside Siddiqi’s heights; its source not given) the burn comes over 30 degrees south and the ship is down 2,853 km short; on TASS’s 88.2 min of the next day it would be 874 km long, ' +
  'on 88.3 min 2,212 km short, on the announced 88.5 min 4,636 km short (the coast’s own weighing, November 2026). No published period is good enough to hold the landing over four days, and how fast the real orbit decayed in the air of August 1962 is not known. ' +
  'Not adjusted: the period was chosen before the flight was flown (mission.md, "The orbit")';
export const MISSES: Record<string, Record<string, Record<string, Miss>>> = {
  'usa/mercury/mr-3-freedom-7': {
    whole: {
      separationSpeed: { by: 0.04, slack: 0.01, why: BOOSTER, short: BURNOUT },
      separationGroundSpeed: { by: 0.045, slack: 0.01, why: BOOSTER, short: BURNOUT },
      separationAltitude: { by: 0.078, slack: 0.015, why: BOOSTER, short: BURNOUT },
      apogee: { by: 0.077, slack: 0.015, why: `follows from the speed at separation: ${BOOSTER}`, short: BURNOUT },
      range: { by: 0.1, slack: 0.02, why: 'follows from the speed at separation', short: `${BURNOUT}, so it flies farther` },
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
        why: `the maker’s round figure is reached to 3 per cent with the thrust through the centre of mass (2,565 ft); set off it, the spacecraft tumbles and the air takes a quarter of the climb. ${SAME_SHAPE}`,
      },
    },
    'abort:Beach Abort, 9 May 1960': {
      apogee: { by: -0.386, slack: 0.03, why: UNKNOWN_BEACH },
      duration: { by: -0.376, slack: 0.03, why: `follows from the height. ${UNKNOWN_BEACH}` },
    },
  },
  'usa/mercury/mr-4-liberty-bell-7': {
    // (the records are the type's, the Beach Abort's and the maker's, flown on this flight's own spacecraft and pad)
    'abort:off the pad, upright': {
      apogee: {
        by: -0.255,
        slack: 0.03,
        why: `as Freedom 7’s, and for the same reasons: the maker’s round figure is reached with the thrust through the centre of mass; set off it, the spacecraft tumbles and the air takes a quarter of the climb. ${SAME_SHAPE}`,
      },
    },
    'abort:Beach Abort, 9 May 1960': {
      apogee: {
        by: -0.382,
        slack: 0.03,
        why: `as Freedom 7’s, flown here as Liberty Bell 7’s spacecraft (its weights estimated, Freedom 7’s: tests/sim.test.mjs). ${UNKNOWN_BEACH}`,
      },
      duration: { by: -0.365, slack: 0.03, why: `follows from the height, as Freedom 7’s. ${UNKNOWN_BEACH}` },
    },
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
      drogueAt: {
        by: 11.1,
        slack: 4,
        absolute: true,
        why:
          'follows from the apogee, from the run’s own height and climb at separation, as the whole flight’s does; just past the 10 s since the day’s air was flown (sim/air.ts `skyOf`), ' +
          'whose column, denser than the standard’s from 10 to 48 km, holds the falling capsule back a second more',
        short: 'follows from the higher apogee',
      },
      duration: { by: 59, slack: 8, absolute: true, why: MAIN_HEIGHT, short: 'the main out at 12,300 ft' },
    },
  },
  'ussr/vostok/vostok-1': inUnits({
    coast: {
      separationAltitude: {
        by: -22_037,
        slack: 1_500,
        why:
          'At 10:36 it is at 133 km, where Lissov reckons 150 to 160 and Siddiqi 150 to 170. Theirs are reckonings too. Ours rests on the push lying along the line from the Sun, 30 degrees ' +
          'below level, which brings it down early: `retro.aim`. (Read as osculating, the published orbit flew 18 km high and this was 137 km: read as mean it is 4 km worse)',
      },
      ejectionAt: {
        by: 225,
        slack: 10,
        why:
          'It reaches 7 km at 10:45:35 Moscow time, where the record has the hatch going at 10:42 (to the minute) and the module on the ground at 10:48. A minute of it is the landing being 478 km long; ' +
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
        by: 478_287,
        slack: 10_000,
        why:
          'It comes down 478 km beyond the record’s landing along its own track. Two inputs are each worth as much: `injection.arc` (no source; reckoned by hand to 3 degrees, 128 km a degree) and ' +
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
      perigee: { by: -357_281, slack: 2_000, why: SHORT },
      apogee: { by: -147_000, slack: 300, why: `The cutoff is level at 180 km and too slow, so 180 km is the orbit’s top: ${SHORT}` },
      period: { by: -303.35, slack: 2, why: `It follows from the speed at cutoff: ${SHORT}` },
    },
    shown: {
      separationAltitude: {
        by: -21_117,
        slack: 1_500,
        why: `${PUBLISHED}. At 10:36 it is at 134 km, where Lissov reckons 150 to 160 and Siddiqi 150 to 170 (reckonings). The burn is aimed along the line from the Sun, 30 degrees below level, which brings it down early: \`retro.aim\`, as in the coast’s own misses`,
      },
      ejectionAt: {
        by: 219.2,
        slack: 10,
        why: `${PUBLISHED}. It reaches 7 km at 10:45:33, 3.6 minutes after the record’s 10:42: a minute and more of it is the landing being 503 km long, the rest a descent slower than the flight’s, which points at \`retro.aim\` again`,
      },
      alongTrack: {
        by: 503_298,
        slack: 10_000,
        why:
          `${PUBLISHED}. It comes down 503 km beyond the record’s landing along the track and 10 km across it (which holds: the plane flown from the flight task’s aiming azimuth is the record’s). ` +
          'The place on the orbit is the ascent’s (27.82 degrees round from the pad, where the estimate was 27.5), so what owns the rest is the burn’s aim along the line from the Sun (straight against the motion it lands 439 km shorter in the coast from the published orbit). ' +
          'Read as osculating, as until November 2026, it was 452 km: the published orbit read as mean (world/meanelements.ts, issue #8) puts the apogee where the record has it and the landing 51 km further out. Nothing is fitted',
      },
    },
    descent: {
      'module.at': {
        by: 141.3,
        slack: 10,
        why: 'Late by its late arrival at 7 km (see the coast’s ejectionAt): from 7 km the module takes 6 min 10 s, the record’s clocks at most 6',
      },
      'pilot.at': {
        by: 363.3,
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
        by: -26_698,
        slack: 1_500,
        why: 'At 10:07, the instant the record has the cable bundle burn through, it is at 63 km where the record’s research has 80 to 100 (a reckoning). Read as osculating, as until November 2026, it was at 81 km and within, the burn then coming at another place on that orbit (PHASE); read as mean it is 18 km lower. What owns it is not found: the burn’s aim along the line from the Sun (`retro.aim`, Vostok 1’s separationAltitude miss) is the first suspect. Not adjusted',
      },
      crossTrack: {
        by: -74_815,
        slack: 3_000,
        why: 'It comes down 75 km across the track from the record’s landing. The Sun stood 38 degrees out of the plane at the burn, so a push along the line from it has much of itself across the track (`retro.aim`, as Vostok 1’s). Read as osculating it was 154 km: the coast then fell four minutes behind the record’s orbit (PHASE) and the Earth had turned less under the track',
      },
      alongTrack: {
        by: -452_581,
        slack: 10_000,
        why: 'It comes down 453 km short along the track. Read as mean elements (PHASE) the coast keeps the record’s period, where read as osculating it fell four minutes behind and came down 1,427 km short; what is left is `injection.arc` (no source: 97 km a degree here) and `retro.aim` (straight against the motion: 421 km shorter)',
      },
    },
    ascent: {
      perigee: { by: -385_138, slack: 2_000, why: SHORT_TYPE },
      apogee: { by: -64_000, slack: 300, why: `The cutoff is level at 180 km and too slow, so 180 km is the orbit’s top: ${SHORT_TYPE}` },
      period: { by: -269.47, slack: 2, why: `It follows from the speed at cutoff: ${SHORT_TYPE}` },
    },
    shown: {
      separationAltitude: {
        by: -29_506,
        slack: 1_500,
        why: `${PUBLISHED}. At 10:07, the instant the record has the cable bundle burn through, it is at 60 km where the record’s research has 80 to 100, as the coast from the injection (63 km): see the coast's miss. Read as osculating it was at 79 km and within`,
      },
      alongTrack: {
        by: -500_944,
        slack: 10_000,
        why: `${PUBLISHED}. It comes down 501 km short along the track and 19 km across it (which holds): ${PHASE}. Read as osculating, as until November 2026, it came down over Anatolia, 1,493 km short`,
      },
    },
    descent: {
      'pilot.at': {
        by: 261.2,
        slack: 10,
        why: 'Late by the type’s descent, as Vostok 1’s is: from the burn he is 32.6 min to the ground where the record’s 09:51 to 10:18 is 27, and four kilometres under a canopy at 5 m/s is 13 minutes by itself (Vostok 1’s miss)',
      },
    },
  }),
  'ussr/vostok/vostok-3': inUnits({
    coast: {
      apogee: {
        by: -9_544,
        slack: 300,
        why: 'It goes round with its apogee 225 km up, 9.5 km under the published 234.6. Read as mean elements with 88.33 min node to node, the heights’ difference fixes the eccentricity and the period the axis, and that axis is lower than the heights give over any mean ball: the announced 88.5 min would give 233.5 km and hold it. So 88.33 and Siddiqi’s heights are not one determination. Not adjusted',
      },
      crossTrack: {
        by: -324_027,
        slack: 5_000,
        why: `It comes down 324 km to the left of the record’s landing: the burn is in the wrong place on the orbit and the Earth has turned under it by the minutes the ship is behind. On TASS’s 88.2 min it would be 49 km. ${PERIOD_64}`,
      },
      alongTrack: { by: -2_852_797, slack: 20_000, why: PERIOD_64 },
    },
    ascent: {
      cutoffAt: {
        by: -10.65,
        slack: 0.1,
        why: 'Block E is cut where Vostok 1’s integrator was set (2,283.52 m/s of apparent velocity: estimated here), and that comes at 676.4 s, as on Vostok 1; the bunker waited for 687 s, the end of this flight’s burn as planned. So this flight’s setting, or its third stage’s start, or both, differed from Vostok 1’s by some ten seconds of burn: neither was found. Not adjusted',
      },
      firstG: {
        by: -1.78,
        slack: 0.05,
        why: 'The most the type’s ascent gives is 4.71 g, on the first stage before the strap-ons throttle back (3.98 on the core alone, 0.91 on the last). Nikolayev’s 6 to 7 g is by feel and said of the whole ascent; Titov felt no more than five on the same vehicle (Vostok 2’s check, which holds). Either the feeling or the type’s thrust and masses: not adjusted',
      },
      perigee: { by: -445_353, slack: 2_000, why: SHORT_V3 },
      apogee: { by: -54_600, slack: 300, why: `The cutoff is level at 180 km and too slow, so 180 km is the orbit’s top: ${SHORT_V3}` },
      period: { by: -289.31, slack: 2, why: `It follows from the speed at cutoff: ${SHORT_V3}` },
    },
    shown: {
      apogee: {
        by: -14_834,
        slack: 500,
        why: `${PUBLISHED}. Flown round from there its apogee is 219.8 km: the coast’s own miss (9.5 km under, on 88.33 min) and the place on the orbit the type’s ascent leaves it at`,
      },
      crossTrack: { by: -223_838, slack: 5_000, why: `${PUBLISHED}. ${PERIOD_64}` },
      alongTrack: { by: -2_434_488, slack: 20_000, why: `${PUBLISHED}. ${PERIOD_64}` },
    },
    descent: {
      'module.at': {
        by: 341.0,
        slack: 10,
        why: 'The module comes down at 09:45:40, 5.7 minutes before the pilot (who holds, 39 s early); the record has twelve minutes between them (09:39:59 and 09:52). From 7 km the module takes six minutes on the type’s three parachutes, as on Vostok 1 (its module five minutes before Gagarin). What put this flight’s down so long before him is not in anything read: not adjusted',
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
};
