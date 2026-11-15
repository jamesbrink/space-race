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
  'The vehicle as the record now reads it does not reach orbit: at the last cutoff it has 7,686 m/s where the published orbit needs 7,844 at 180 km, 157 m/s short, and its perigee is under the ground. ' +
  'Block E is cut where its integrator was set (2,283.52 m/s of apparent velocity, the flight task) and that comes at 676.4 s, the recorded instant to a third of a second, with 46 kg left: so the third stage as recorded is ' +
  'right, and the shortfall is the first two stages’. What owns it (the last test): the throttling documented in kind and estimated in level, the strap-ons’ intermediate stage (none: +143 m/s; at 80 per cent: +71) and above ' +
  'all the core’s final stage (none: +443 m/s; 5 s of it, not 10: +221), with 4.5 t left in the core at its cutoff, which a vehicle with tank-emptying regulators would not carry. So the core’s figures and its final ' +
  'stage as the sources give them do not agree: its load (100.4 t fuelled less 6.8 t dry, Astronautix) or the length or level of its final stage is wrong. Not adjusted. ' +
  'The first reading (rated thrust to the recorded instants, Soyuz-ST’s loads) was 142 m/s fast: the documented throttling is worth more than the whole miss either way';
const PUBLISHED =
  'The coast is flown from the published orbit, begun where the ascent left the spacecraft (staged.ts `published`), since the ascent as flown does not reach it';
const SHORT_TYPE =
  'Vostok 2’s ascent is the type’s, flown on Vostok 1’s instants and its third stage’s integrator setting (no document of E103-17’s ascent was found: its mission.md), so it falls short of an orbit as Vostok 1’s does and for the same reasons (SHORT, Vostok 1’s): ' +
  'at the last cutoff it is level at the planned 180 km with 7,698 m/s where 183 by 244 km needs some 7,840';
const PHASE =
  'The published orbit flown round from where the ascent left the spacecraft, as osculating elements under J2, crosses the equator northbound every 88.66 min: at 11:49:09 and 17:43:46, where TASS’s crossings are 11:48 and 17:42, 88.5 min apart. ' +
  'Over seventeen orbits it falls four minutes behind the record’s orbit (its node opening the eighteenth at 09:58:55 against 09:54.9 reckoned from TASS and Titov’s Globus fixes: mission.md), and the burn, at the instant derived from the record, is four minutes early on it. ' +
  'What owns it is how the published elements are read (Vostok 1’s apogee miss is the same thing) and the place on the orbit at cutoff, which is the type’s ascent and not this flight’s';
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
  'ussr/vostok/vostok-1': inUnits({
    coast: {
      apogee: {
        by: 18_000,
        slack: 500,
        why:
          'Flown round, the orbit tops out at 345 km over the report’s 6,371 km ball, not 327. The blame is how `orbit` is read: the published heights are taken as the osculating orbit at cutoff, ' +
          'at 62 degrees north, where the oblateness has the osculating semi-major axis some kilometres under its mean. The report’s figures are evidently mean ones, or heights measured round the ' +
          'orbit; the last test prints what both heights 9 km lower would move (the flown apogee is then 336 km, so it is not the semi-major axis alone). The cure is a stated conversion from mean ' +
          'to osculating elements, not a number changed: not done yet',
      },
      separationAltitude: {
        by: -17_900,
        slack: 1_500,
        why:
          'At 10:36 it is at 137 km, where Lissov reckons 150 to 160 and Siddiqi 150 to 170. Theirs are reckonings too. Ours rests on the push lying along the line from the Sun, 30 degrees ' +
          'below level, which brings it down early: `retro.aim`',
      },
      ejectionAt: {
        by: 225,
        slack: 10,
        why:
          'It reaches 7 km at 10:45:43 Moscow time, where the record has the hatch going at 10:42 (to the minute) and the module on the ground at 10:48. A minute of it is the landing being 448 km long; ' +
          'the rest is a descent that takes longer than the flight’s did, which points at `retro.aim` and `retro.deltaV` (a push only 59 per cent of which is against the motion) and at the orbit being read too high',
      },
      crossTrack: {
        by: -68_800,
        slack: 3_000,
        why:
          'It comes down 69 km to the left of the record’s landing. All of it is the braking burn’s sideways part: the Sun stood 41 degrees out of the orbit’s plane that morning (derived from the site, ' +
          'the hour and the inclination, and not in doubt), so a push straight along the line from the Sun has 65 per cent of itself across the track. With the same burn straight against the motion the ' +
          'miss is 9 km. So `retro.aim` as the record words it (“the TDU was directed to the Sun”) cannot be the whole of how the engine’s axis lay: the sensor’s axis to the engine’s is the thing to find. Not adjusted',
      },
      alongTrack: {
        by: 448_300,
        slack: 10_000,
        why:
          'It comes down 448 km beyond the record’s landing along its own track. Three inputs are each worth as much: `injection.arc` (no source; reckoned by hand to 3 degrees, 129 km a degree), ' +
          '`retro.aim` (straight against the motion it lands 450 km shorter, 2 km short of the record: which is no proof, given the first) and the reading of `orbit` (see apogee). Not adjusted: ' +
          'the ascent flown is what replaces the first, a source on the solar sensor the second',
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
      perigee: { by: -370_080, slack: 2_000, why: SHORT },
      apogee: { by: -147_000, slack: 300, why: `The cutoff is level at 180 km and too slow, so 180 km is the orbit’s top: ${SHORT}` },
      period: { by: -310.97, slack: 2, why: `It follows from the speed at cutoff: ${SHORT}` },
    },
    shown: {
      apogee: {
        by: 19_184,
        slack: 300,
        why: `${PUBLISHED}. Flown round under J2 the published orbit taken as osculating where the ascent cut off tops out at 346 km, not 327: the same miss as the coast from the published orbit in tests/orbital.test.mjs (345 km), which is how the published elements are read`,
      },
      separationAltitude: {
        by: -16_923,
        slack: 1_500,
        why: `${PUBLISHED}. At 10:36 it is at 138 km, where Lissov reckons 150 to 160 and Siddiqi 150 to 170 (reckonings). The burn is aimed along the line from the Sun, 30 degrees below level, which brings it down early: \`retro.aim\`, as in the coast’s own misses`,
      },
      ejectionAt: {
        by: 219.2,
        slack: 10,
        why: `${PUBLISHED}. It reaches 7 km at 10:45:39, 3.7 minutes after the record’s 10:42: a minute and more of it is the landing being 454 km long, the rest a descent slower than the flight’s, which points at \`retro.aim\` again`,
      },
      alongTrack: {
        by: 453_800,
        slack: 10_000,
        why:
          `${PUBLISHED}. It comes down 454 km beyond the record’s landing along the track and 14 km across it (which holds: the plane flown from the flight task’s aiming azimuth is the record’s). ` +
          'The place on the orbit is now the ascent’s (27.84 degrees round from the pad, where the estimate was 27.5), so what owns the rest is the burn’s aim along the line from the Sun (straight against the motion it lands 450 km shorter in the coast from the published orbit) and how the published elements are read (both heights 9 km lower: 301 km shorter)',
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
    live: {
      speed: {
        by: -5.6,
        slack: 1,
        why:
          'the attitude is steered, not placed: through the ten seconds of the pitch-over the guidance loop (stagedlive.ts OMEGA, chosen) lags the law by ' +
          'some hundredths of a degree, and the gravity turn that follows the motion carries that on to the cutoff. With the attitude prescribed the ' +
          'same vehicle gives the batch run back to a hundredth of a metre a second (the test before), so the forces are one; and the steered result ' +
          'moves by several metres a second with the loop’s stiffness, which is chosen, so it is not tuned to come in',
      },
    },
  }),
  'ussr/vostok/vostok-2': inUnits({
    coast: {
      apogee: {
        by: 17_816,
        slack: 500,
        why: 'Flown round, the orbit tops out at 262 km, not 244: Vostok 1’s miss, the published heights taken as the osculating orbit at the cutoff. The cure is a stated conversion from mean to osculating elements, not a number changed',
      },
      crossTrack: {
        by: -153_276,
        slack: 3_000,
        why: 'From the estimated injection (Vostok 1’s place at cutoff) the coast falls behind the record’s orbit over seventeen revolutions, as the coast from the ascent flown does (tests/staged.test.mjs, PHASE: the published elements read as osculating), and the Earth has turned less under the track; the Sun stood 38 degrees out of the plane at the burn, so a push along the line from it has much of itself across the track (`retro.aim`, as Vostok 1’s)',
      },
      alongTrack: {
        by: -1_426_770,
        slack: 10_000,
        why: 'It comes down 1,427 km short along the track: the coast reaches the landing latitude some four minutes after the record’s orbit does (tests/staged.test.mjs, PHASE), so the burn, at the instant derived from the record, is four minutes early on it. `injection.arc` (no source) is worth 129 km a degree; the reading of `orbit` is the rest',
      },
    },
    ascent: {
      perigee: { by: -351_028, slack: 2_000, why: SHORT_TYPE },
      apogee: { by: -64_000, slack: 300, why: `The cutoff is level at 180 km and too slow, so 180 km is the orbit’s top: ${SHORT_TYPE}` },
      inclination: {
        by: 0.06,
        slack: 0.01,
        why: 'The aiming azimuth flown is Vostok 1’s (estimated: E103-17’s flight task is not published), and gives 64.99°, as it does on Vostok 1, against this flight’s determined 64°56′. The azimuth is owner',
      },
      period: { by: -249.16, slack: 2, why: `It follows from the speed at cutoff: ${SHORT_TYPE}` },
    },
    shown: {
      apogee: {
        by: 20_943,
        slack: 300,
        why: `${PUBLISHED}. Flown round under J2 the published orbit taken as osculating where the ascent cut off tops out at 265 km, not 244: Vostok 1’s miss, the same reading of the published elements`,
      },
      crossTrack: {
        by: -94_571,
        slack: 3_000,
        why: `${PUBLISHED}. ${PHASE}: four minutes early the Earth has turned a degree less under the track, and the plane flown is Vostok 1’s, 0.06° steeper`,
      },
      alongTrack: {
        by: -1_493_390,
        slack: 10_000,
        why: `${PUBLISHED}. It comes down over Anatolia, 1,493 km short along the track: ${PHASE}. Flown at Titov’s own 09:57, which the record’s orbit rules out, it would come down 395 km beyond (mission.md, "The braking burn")`,
      },
    },
    descent: {
      'pilot.at': {
        by: 339.85,
        slack: 10,
        why: 'Late by the type’s descent, as Vostok 1’s is: from the burn he is 32.6 min to the ground where the record’s 09:51 to 10:18 is 27, and four kilometres under a canopy at 5 m/s is 13 minutes by itself (Vostok 1’s miss)',
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
