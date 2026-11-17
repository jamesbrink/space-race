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
  'The vehicle as the record now reads it does not reach orbit: at the last cutoff it has 7,693 m/s where the published orbit needs 7,845 at 180 km (over the ball its own heights and period imply), 152 m/s short, and its perigee is under the ground (until November 2026 the law’s axis was up to 0.14 per cent long, and the thrust along it with it: 5 m/s more and 157 short). ' +
  'Block E is cut where its integrator was set (2,283.52 m/s of apparent velocity, the flight task) and that comes at 676.4 s, the recorded instant to a third of a second, with 46 kg left: so the third stage as recorded is ' +
  'right, and the shortfall is the first two stages’. What owns it (the last test): the throttling documented in kind and estimated in level, the strap-ons’ intermediate stage (none: +143 m/s; at 80 per cent: +71) and above ' +
  'all the core’s final stage (none: +443 m/s; 5 s of it, not 10: +221), with 4.5 t left in the core at its cutoff, which a vehicle with tank-emptying regulators would not carry. So the core’s figures and its final ' +
  'stage as the sources give them do not agree: its load (100.4 t fuelled less 6.8 t dry, Astronautix) or the length or level of its final stage is wrong. Not adjusted. ' +
  'The first reading (rated thrust to the recorded instants, Soyuz-ST’s loads) was 142 m/s fast: the documented throttling is worth more than the whole miss either way';
const PUBLISHED =
  'The coast is flown from the published orbit, begun where the ascent left the spacecraft (staged.ts `published`), since the ascent as flown does not reach it';
const SHORT_TYPE =
  'Vostok 2’s ascent is the type’s, flown on Vostok 1’s instants and its third stage’s integrator setting (no document of E103-17’s ascent was found: its mission.md), so it falls short of an orbit as Vostok 1’s does and for the same reasons (SHORT, Vostok 1’s): ' +
  'at the last cutoff it is level at the planned 180 km with 7,689 m/s where 183 by 244 km needs some 7,826';
const PHASE =
  'The published orbit read as mean elements with a nodal period (world/meanelements.ts, issue #8) and flown round under J2 from where the ascent left the spacecraft crosses the equator northbound every 88.45 min, ' +
  'the published period: at 11:48:45 and 17:42:34, where TASS’s crossings are 11:48 and 17:42 (read as osculating, as until November 2026, it went round in 88.66 min and was four minutes behind the record’s orbit by the burn). ' +
  'What is left is the place on the orbit at cutoff, which is the type’s ascent and not this flight’s, and the burn’s aim along the line from the Sun (`retro.aim`)';
/** Vostok 3's ascent is the type's but for the third stage's cutoff, which Kamanin heard counted. */
const SHORT_V3 =
  'Vostok 3’s ascent is the type’s, flown on Vostok 1’s instants and its third stage’s integrator setting (no cyclogram or flight task of E103-23 was found: its mission.md), so it falls short of an orbit as Vostok 1’s does and for the same reasons (SHORT, Vostok 1’s): ' +
  'at the last cutoff it is level at the planned 180 km with 7,676 m/s where 180.7 by 234.6 km needs some 7,823';
/** Vostok 3's four days: where the ship is at the burn is the published period carried round 64 times. */
const PERIOD_64 =
  'Over 64 revolutions the period sets where the ship is when the burn comes: a second a revolution is some 470 km along the track by the landing, and no period is known to better than a hundredth of a minute (300 km). ' +
  'No published period with this flight’s heights has a traceable source, so it is flown on the period the heights give over the ellipsoid under the apsis, 88.34 min (derived: mission.md, "The orbit"; the reading heights published without a period take, world/meanelements.ts `CONVENTION.radius`, which the sister flights’ own heights and periods require: tests/apsis.test.mjs), with the joined ship’s free-molecule drag in the air of the day’s Sun (world/thermosphere.ts): the ship is down 1,540 km short. ' +
  'Over the mean Earth (88.54 min, until November 2026) it was 4,664 km short, and on the untraced 88.33 min 1,083 km. ' +
  'TASS’s orbit of the 12th, held as a check at 12:12 that day, is still 5 s shorter than the one flown there (within its tolerance, outside its rounding of 3 s): carried round as it stands, that would be some 2,500 km more along the track, which says more decay or a shorter start, and is an expectation, not a target. Not adjusted';
/** Vostok 3's orbit a day on, as TASS gave it, against the coast flown there. */
const TASS_12AUG =
  'TASS’s orbit at 12:12 on 12 August, a day on: flown from the initial heights on the period they give over the ellipsoid under the apsis, the coast has the apogee 6 km higher there and the period 5 s longer (within its tolerance; over the mean Earth, until November 2026, 8 km and 18 s). The orbit decays a little too little in a day, or began a little lower (PERIOD_64). An expectation to be tested, not a target: not adjusted';
/** Where Vostok 1's and Vostok 5's own heights and period put the apsis, against where the run has the perigee. */
const APSIS_OPEN =
  'Each flight is flown on the ball its own published heights and period imply (orbital.ts `heightsBall`), so its figures hold. For Vostok 1 (6,369.1 km) and Vostok 5 (6,366.7) that is the ellipsoid under an apsis at 41 and 47 degrees, where the run puts the perigee at the injection, 63 degrees N: an open inconsistency, recorded and not resolved (tests/apsis.test.mjs, the flights’ mission.md)';
/** Vostok 5's ascent is Vostok 1's, as Vostok 2's is: it falls short of an orbit for the same reasons. */
const SHORT_V5 =
  'Vostok 5’s ascent is Vostok 1’s, flown on its instants and its third stage’s integrator setting (no document of E103-24’s ascent was found: its mission.md), so it falls short of an orbit as Vostok 1’s does and for the same reasons (SHORT, Vostok 1’s): ' +
  'at the last cutoff it is level at the 181 km asked for with 7,674 m/s in the day’s air, where 174.7 by 222.1 km needs some 7,814. That the stage fell short on the day (Siddiqi, no source) is not what this is: the type’s run falls shorter still';
/**
 * Five days flown round in the day's thermosphere on a ship's free-molecular drag: the orbit now falls as TASS's did to
 * within 4 km, and what is left of the landing's miss is its last tenth of a minute carried round.
 */
const COAST_V5 =
  'Five days are flown round (81 revolutions) in the thermosphere of the days’ own Sun (Jacchia 1971 on 13 to 19 June 1963’s indices) on the ship’s free-molecular drag, to a burn derived from the pilot’s landing (13:38:06). ' +
  'The orbit falls as TASS’s did: at 15:00 on 18 June it is 163.3 by 197.4 km where TASS has 159 by 193 (both within 5 km, on the ball the flight’s own heights and period imply; TASS’s three of that instant imply one 0.9 km smaller), so the earlier reading, that the miss was the day’s air, is superseded: in the 1976 mean air on the ball’s continuum drag the run had 174.7 by 222.5 km there and came down 5,647 km short. ' +
  'What is left is the period: at that instant the run goes round in 87.91 min where TASS has 87.8, so over the last days the ship comes round a little late each time; as a diagnosis, the published period 0.05 min shorter (88.22 for 88.27) brings it down 86 km beyond the record’s landing, and the burn five minutes later 813 km short. ' +
  'The period is published to a hundredth of a minute (TASS, 22:12 on 14 June), so a twentieth is not its rounding, and read as anomalistic or Keplerian the nodal period flown would be longer still. ' +
  'Read every three hours against TASS’s three later orbits, the period flown is TASS’s within its rounding for the first day (1.2 s short at 22:12 on the 14th, 0.2 s at 15:00 on the 15th) and 6.4 s long by 15:00 on the 18th: the orbit decays too slowly over days two to four, by more than TASS’s rounding, and that lag carried round to the burn is some 253 s, 1,850 km of the 3,314. ' +
  'No drag figure is shown to own it: twice the joined ship’s area (a diagnosis) makes the first day’s periods 2.4 and 5.2 s short of TASS’s and brings the ship down before the fourth, and lands Vostok 4 6,342 km long. The rest is within the burn’s derived minute. Not adjusted';
/** Vostok 6's ascent is Vostok 1's, as Vostok 5's is. */
const SHORT_V6 =
  'Vostok 6’s ascent is Vostok 1’s, flown on its instants and its third stage’s integrator setting (no document of E103-25’s ascent was found: its mission.md), so it falls short of an orbit as Vostok 1’s does and for the same reasons (SHORT, Vostok 1’s): ' +
  'at the last cutoff it is level at the 183 km taken as asked for with 7,683 m/s in the day’s air, where 180.9 by 231.1 km needs some 7,822';
/** Three days flown round to a burn derived from the ground's command: the landing's miss, and what it is worth in each thing not known. */
const COAST_V6 =
  'Three days are flown round (48 revolutions) in the days’ own thermosphere (Jacchia 1971) on the ship’s free-molecular drag, to a burn at 10:50:40 derived from the cycle’s command at 09:39:40 and “approximately” its 71st minute (Kogutenko). ' +
  'The orbit falls as TASS’s did: at 15:00 on 18 June it is 176.0 by 219.8 km and 88.15 min where TASS has 174 by 218 km and 88.1 (all within tolerance). In the 1976 mean air on the ball’s continuum drag it came down 3,757 km short. ' +
  'Against TASS’s two orbits the period flown is within their rounding (1.5 s short at 22:00 on the 16th, 2.8 s long at 15:00 on the 18th): carried round to the burn that is some 61 s, 440 km of the 2,726, so the decay is not shown to own the miss. What each thing not known is worth, as diagnoses and not inputs: the published period is to a tenth of a minute, and 0.05 min less brings it 1,211 km nearer, 0.05 min more 923 km further; the burn a minute later 401 km nearer, five minutes later 2,381 km (it would then land 20 to 25 minutes after the burn, where Vostok 1’s pilot took 28). Not established which. Not adjusted';
/** Voskhod 1's ascent: the 11A57's blocks on Kosmos 47's instants, cut at the record's 523 s, fall short as the Vostoks' do. */
const SHORT_VK1 =
  'Voskhod 1’s ascent is flown on the 11A57’s figures as this record reads them (the Vostok-K’s blocks with the later engines’ thrusts, Block I at its maker’s thrust and impulse on Brügge’s load) and Kosmos 47’s instants, cut at the record’s 523 s: ' +
  'at the last cutoff it is level at the planned 177.5 km with 7,583 m/s, where 177.5 by 408 km needs some 8,000, so 177.5 km is the top of the orbit it has and its perigee is under the ground. ' +
  'Block I has 1.2 t left at its cutoff, so the shortfall is not its load. What owns it is not established: the first two stages’ throttling and final stage, which give the Vostoks the same shortfall (SHORT, Vostok 1’s), the 11A57’s own blocks and staging times, none of which is this flight’s, and Block I’s mass, which is no 1964 figure. Not adjusted';
/** Voskhod 1's day round: a burn whose start one account gives, whose length and impulse none does. */
const COAST_VK1 =
  'Sixteen revolutions are flown in the day’s thermosphere to a burn at 10:18:58 (one secondary account’s seconds: Zak, from Baturin) aimed from the Sun as a Vostok’s, for the TDU-1’s 45 s and the Vostok’s 136 m/s (neither found for this flight). ' +
  'As diagnoses, not inputs: the burn a minute later lands it 475 km short, five minutes later 4,146 km long, and at Chertok’s programmed 10:08:56 4,367 km short; the published period 0.05 min shorter 712 km short, longer 1,393; aimed straight against the motion 1,419 km short; 100 m/s 1,084 km long, 155 m/s 1,725 km short. ' +
  'The record cannot hold a landing to a hundred kilometres: its burn’s length and impulse are not known. What owns the miss is not established. Not adjusted';
/** Voskhod 2's ascent: as Voskhod 1's, to the planned 180 km, where the record's orbit went higher than planned. */
const SHORT_VK2 =
  'Voskhod 2’s ascent is flown as Voskhod 1’s (SHORT_VK1) on the crew’s instants: at the last cutoff it is level at the planned 180 km with 7,368 m/s in the day’s air, where the orbit reached, 173.5 by 497.7 km, needs some 8,060. ' +
  'The record’s orbit was higher than the planned 180 by 470 km, and no source read says why. What owns the shortfall is not established. Not adjusted';
/** Voskhod 2's day round, and the burn by hand. */
const COAST_VK2 =
  'Eighteen revolutions are flown to the burn by hand at OKB-1’s commands (main valve 11:36:29.5, shutdown about 11:37:09), straight against the motion as Belyayev aimed it by eye, for 112 m/s worked from the engine’s measured 1,575 kgf over 39.5 s; the modules part at 11:50:56.5, as they did. ' +
  'The record’s own orbits on the ninth and eighteenth revolutions hold on the coast to 2 km. As diagnoses, not inputs: the burn a minute later lands it 138 km short, at the time read up to them (11:35:44) 904 km short; the published period 0.05 min shorter 278 km short, longer 875; 100 m/s 73 km short. ' +
  'The burn’s impulse is derived and its aim by eye is not known. What owns the miss is not established. Not adjusted';
/** Vostok 4's ascent is the type's throughout. */
const SHORT_V4 =
  'Vostok 4’s ascent is the type’s, flown on Vostok 1’s instants and its third stage’s integrator setting (no document of E103-22’s ascent was found: its mission.md), so it falls short of an orbit as Vostok 1’s does and for the same reasons (SHORT, Vostok 1’s): ' +
  'at the last cutoff it is level at the planned 180 km with 7,686 m/s where 179.8 by 236.7 km needs some 7,825';
/** Vostok 4's three days, as Vostok 3's four. */
const PERIOD_48 =
  'Over 48 revolutions the period sets where the ship is when the burn comes, as on Vostok 3 (PERIOD_64): a second a revolution is some 350 km along the track by the landing, and TASS’s 88.3 min, the one traceable period of this ship, is given to a tenth of a minute (2,100 km). ' +
  'On it, with the joined ship’s free-molecule drag in the air of the day’s Sun, the ship comes down 2,344 km long (633 km long on the ball’s continuum drag, until November 2026), the only long flight that lands beyond (TASS’s one period of it, its first hour’s, the coast holds to 0.1 s, and no later orbit of it was read): no period published is good enough to hold the landing over three days. Not adjusted: the period was chosen before the flight was flown (mission.md, "The orbit")';

/** Faith 7's coast, from the published orbit and from where the ascent left it. */
const MA9_COAST =
  'Twenty-two revolutions, a day and a half, from the published orbit begun at Aurora 7’s arc (no place for MA-9’s cutoff read), its 88:45 read as its heights’ Kepler period ' +
  '(`orbit.kind`, estimated: read as nodal, the convention, it comes down 2,234 km short; on its heights alone 8 km short). Two seconds of period, the printed figure’s own precision, are ' +
  '330 km here. The retrofire by hand at 33:59:30 at 34°, no yaw recorded, on the motors’ specified impulse over Sigma 7’s weight at retrofire (127.4 m/s); the drag in orbit a capsule ' +
  'turning every way. Which input owns it is not established; not adjusted';
const MA9_SHOWN =
  'Begun from where the ascent flown left the capsule, which reached its cutoff speed 21.4 s early and is so much further on round the orbit at the separation, in the ascent’s ' +
  'own plane, 0.22 degrees under the inclination taken';

/** Sigma 7's coast, from the published orbit and from where the ascent left it. */
const MA8_COAST =
  'The retrofire is the record’s: at 08:52:00 by the automatic sequence, at −34° with no yaw (held within half a degree, the pilot), the impulse the report’s own integration used, 38,975 lb s, ' +
  'over its 2,994 lb at retrofire, 127.6 m/s; that integration came down within a mile of the retrieval point (TN D-4807, p. 108). Six revolutions from the published orbit begun at the ' +
  'cutoff’s place, its 88:55 read as its heights’ Kepler period (orbital.ts `orbit.kind`, estimated: read as nodal, the convention, it comes down 236 km short), in orbit attitude’s drag ' +
  'throughout where Schirra drifted for hours. Friendship 7’s and Aurora 7’s coasts come down some 105 km long on the same model. Which input owns it is not established; not adjusted';
const MA8_SHOWN =
  'Begun from where the ascent flown left the capsule, which reached its cutoff speed 17.5 s early and is so much further on round the orbit at the separation, in the ascent’s ' +
  'own plane, 0.22 degrees under the published inclination (flown on MA-5’s aiming azimuth with no steering out of the plane)';

/** Aurora 7's coast, from the published orbit and from where the ascent left it. */
const MA7_RETRO =
  'The retrofire is flown as the tracking gave it (TN D-3814, p. 101): lit by hand at 04:33:10.3, held 36.5° below the level and 27° off in yaw, its push turned to the left of the ' +
  'motion, the three motors 3 per cent under their group’s 38,943 lb s, 124.5 m/s over the capsule in orbit (no weight at retrofire is printed). So flown it comes down 537 km beyond ' +
  'the planned point, where the report has some 250 nautical miles (463 km); flown at 34° with no yaw, 3 s sooner and at the group’s impulse, it comes down 33 km from it ' +
  '(tests/orbital.test.mjs prints each). The yaw is worth 374 km here and 175 statute miles (282 km) in This New Ocean (p. 454), the low impulse 156 km against 60 miles: the simulator ' +
  'gives the retrofire’s errors more than the record does. Which input owns the rest is not established; not adjusted';
const MA7_SHOWN =
  'Begun from where the ascent flown left the capsule, which reached its cutoff speed 12.0 s early and is so much further on round the orbit at the separation, in the ascent’s ' +
  'own plane, 0.23 degrees under the published inclination (flown on MA-5’s aiming azimuth with no steering out of the plane)';

/** Friendship 7's coast, from the published orbit and from where the ascent left it. */
const MA6_RETRO =
  'Nothing in the retrofire is MA-6’s own measure: the three motors’ impulse is their specified total, 38,880 lb s (the MA-4 and MA-5 trajectory report), over the capsule at retrofire, ' +
  '2,970 lb, 128 m/s spread evenly from the first’s lighting to the third’s burning out, with nothing for the propellant they burned (not read: a few per cent more); the entry is the ' +
  'capsule’s own drag curve (TM X-491), the retropack kept on and burning away not modelled; and where on the orbit it began is reckoned by hand (`injection.arc`). The record itself ' +
  'landed some 40 nautical miles short of the planned point because the retrofire was worked without the consumables spent (This New Ocean, p. 433): a miss of the planners’, not of these figures. ' +
  'Which input owns this one is not established (tests/orbital.test.mjs prints what each is worth); not adjusted';
const MA6_SHOWN =
  'Begun from where the ascent flown left the capsule, which reached its cutoff speed 7.7 s early and is so much further on round the orbit at the separation, in the ascent’s ' +
  'own plane, 0.2 degrees under the published inclination: flown on MA-5’s aiming azimuth with no steering out of the plane, which in three revolutions carries it across the track';

const GT3_ENTRY =
  'Of the entry nothing is spacecraft 3’s own measure but where it came down: its lift over drag is the programme’s average as flown, 0.19 (SP-138, p. 159), on the Mercury capsule’s ' +
  'drag curve; the bank is held at 60 degrees from the retrograde section’s going, the footprint’s contour the target lay on (SP-138, p. 163), where the crew flew a backup bank and then the ' +
  'computer’s commands, angles not read; the retrofire pitch is the next flight’s 30 degrees, its sign taken as Mercury’s; and where on the orbit it began is reckoned (`injection.arc`: a degree ' +
  'is some 110 km along the track at retrofire). Flown lift up throughout it lands 274 km further on, flown level 354 km shorter (the last test): the record cannot hold the landing to a ' +
  'hundred kilometres. The record itself landed 60 nautical miles short of its target because the lift was 35 per cent below the prediction; that is flown, not this';

const GT3_SHOWN =
  'Begun from where the ascent flown left the spacecraft, which is short of the orbit and so of the published orbit’s place and height at the separation (the ascent’s misses)';

const GT3_ASCENT =
  'The Titan is flown on GLV-4’s weights (its mission report, section 3.3), GLV-1’s first stage chambers as measured at 5 s and 155 s and GLV-4’s second stage as flown: GLV-3’s own are in its ' +
  'mission report, not found, and the launch systems report says only that its thrust and impulse were higher than predicted. The steering law, the drag and the stage’s residuals are estimates. ' +
  'Which figure is off for GLV-3 is not established; nothing is adjusted';

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
  'usa/mercury/ma-6-friendship-7': inUnits({
    ascent: {
      cutoffAt: {
        by: -7.74,
        slack: 0.5,
        why:
          'The sustainer reaches the ground guidance’s 25,730 ft/s at T+293.7 s, 7.7 s before the record’s 301.4. The Atlas is flown on SP-45’s rated thrusts taken at sea level and the Atlas D’s ' +
          'weights and impulses from a secondary source (Astronautix), none of them 109-D’s; on the same figures its tank would run dry at T+302.8, so it is not short of propellant. Which figure is ' +
          'off for 109-D is not established; not adjusted',
        short: 'the Atlas D’s figures, not 109-D’s',
      },
    },
    coast: {
      alongTrack: {
        by: 103_912,
        slack: 3_000,
        why: `The drogue comes out 104 km beyond where the capsule was picked up, along the track. ${MA6_RETRO}`,
      },
      crossTrack: { by: 29_454, slack: 2_000, why: `And 29 km to the right of it. ${MA6_RETRO}` },
    },
    shown: {
      alongTrack: { by: 214_788, slack: 5_000, why: `215 km beyond the pick-up point along the track. ${MA6_SHOWN}. ${MA6_RETRO}` },
      crossTrack: { by: 47_076, slack: 2_000, why: `47 km to the right of it. ${MA6_SHOWN}` },
    },
    descent: {
      'mercury-capsule.at': {
        by: 51.0,
        slack: 3,
        why:
          'Down 51 s late. The drogue is out 19 s late, with the coast (within its tolerance); the rest is the main: the record has 5 min 12 s from the main at 10,800 ft to the sea (04:50:11 to ' +
          '04:55:23; Results, p. 135), 10.6 m/s on the average, where the canopy as derived on Freedom 7 (mercury-redstone.ts, main.dragArea) brings the 2,493 lb capsule down at 8.7 m/s. ' +
          'Either the height is not the barostat’s or it came down faster than the canopy’s figure: nothing read says which, and nothing is changed',
      },
    },
  }),
  'usa/mercury/ma-7-aurora-7': inUnits({
    ascent: {
      cutoffAt: {
        by: -11.98,
        slack: 0.5,
        why:
          'The sustainer reaches the ground guidance’s 25,717 ft/s at T+297.9 s, 12.0 s before the record’s 309.9. Atlas 107-D is flown on Friendship 7’s figures, the Atlas D’s (SP-45’s rated ' +
          'thrusts at sea level, a secondary source’s weights and impulses), none of them 107-D’s; the record’s own cutoff came 8.5 s later than MA-6’s for 13 ft/s less. Which figure is off is not ' +
          'established; not adjusted',
        short: 'the Atlas D’s figures, not 107-D’s',
      },
    },
    coast: {
      alongTrack: {
        by: 107_114,
        slack: 3_000,
        why: `The drogue comes out 107 km beyond where the capsule was picked up, along the track. ${MA7_RETRO}`,
      },
      crossTrack: { by: 22_340, slack: 2_000, why: `And 22 km to the right of it. ${MA7_RETRO}` },
    },
    shown: {
      alongTrack: { by: 377_263, slack: 8_000, why: `377 km beyond the pick-up point along the track. ${MA7_SHOWN}. ${MA7_RETRO}` },
      crossTrack: { by: 40_574, slack: 2_000, why: `41 km to the right of it. ${MA7_SHOWN}` },
      ejectionAt: { by: 36.86, slack: 2, why: `The drogue out 37 s late, so much further along. ${MA7_SHOWN}` },
    },
    descent: {
      'mercury-capsule.at': {
        by: 65.4,
        slack: 3,
        why:
          'Down 65 s late. The drogue is out 37 s late, with the coast begun from the ascent; the rest is the main: the record has 4 min 9 s from the main let out by hand at 8,950 ft ' +
          'to the sea (04:51:48.2 to 04:55:57; TN D-3814, p. 67 and Table XVI), 11.0 m/s on the average, where the canopy as derived on Freedom 7 (mercury-redstone.ts, main.dragArea) brings the ' +
          '2,557.7 lb capsule down at 8.8 m/s; Carpenter’s “right on 30 feet per second” is 9.1. Either the height or the instant is not the canopy’s, or it came down faster than its figure: ' +
          'nothing read says which, and nothing is changed',
      },
    },
  }),
  'usa/mercury/ma-8-sigma-7': inUnits({
    ascent: {
      cutoffAt: {
        by: -17.53,
        slack: 0.5,
        why:
          'The sustainer reaches the ground guidance’s 25,730 ft/s at T+298.2 s, 17.5 s before the record’s 315.7. Atlas 113-D is flown on Friendship 7’s figures, the Atlas D’s, none of ' +
          'them 113-D’s; its own flight was lofted before staging, its BECO 2 s early "and consequently SECO was about 10 seconds later than nominal" (TN D-4807, p. 106), which the law ' +
          'and the type’s figures cannot give. Which figure is off is not established; not adjusted',
        short: 'the Atlas D’s figures, not 113-D’s',
      },
    },
    coast: {
      alongTrack: {
        by: 47_805,
        slack: 3_000,
        why: `The drogue comes out 48 km beyond where the capsule was picked up, along the track. ${MA8_COAST}`,
      },
    },
    shown: {
      alongTrack: { by: 419_735, slack: 8_000, why: `420 km beyond the pick-up point along the track. ${MA8_SHOWN}. ${MA8_COAST}` },
      crossTrack: { by: 32_888, slack: 2_000, why: `33 km to the right of it. ${MA8_SHOWN}` },
    },
    descent: {
      'mercury-capsule.at': {
        by: 49.77,
        slack: 3,
        why:
          'Down 50 s late. The drogue is out 25 s late, with the coast begun from the ascent (within its tolerance); the rest is the main: the record has 4 min 59 s from the main at 10,600 ft ' +
          'to the water (09:08:12 to 09:13:11, TN D-4807 Table XXII), 10.8 m/s on the average, where the canopy as derived on Freedom 7 (mercury-redstone.ts, main.dragArea) brings the ' +
          '2,602.3 lb capsule down at 8.9 m/s. Nothing read says which is wrong, and nothing is changed',
      },
    },
  }),
  'usa/mercury/ma-9-faith-7': inUnits({
    ascent: {
      cutoffAt: {
        by: -21.37,
        slack: 0.5,
        why:
          'The sustainer reaches 25,736 ft/s (This New Ocean’s 17,547 mph over Bermuda) at T+281.7 s, 21.4 s before the record’s 303.03. Atlas 130-D is flown on Friendship 7’s figures, the ' +
          'Atlas D’s, none of them 130-D’s (whose “effective specific impulse ... was within, but on the high side, of the tolerance band”, SP-45, p. 103), and Sigma 7’s weights; the speed may ' +
          'include the posigrades’. Which figure is off is not established; not adjusted',
        short: 'the Atlas D’s figures, not 130-D’s',
      },
    },
    coast: {
      alongTrack: {
        by: 370_964,
        slack: 10_000,
        why: `The drogue comes out 371 km beyond where the capsule was picked up, along the track. ${MA9_COAST}`,
      },
    },
    shown: {
      alongTrack: { by: 590_231, slack: 15_000, why: `590 km beyond the pick-up point along the track. ${MA9_SHOWN}. ${MA9_COAST}` },
      crossTrack: { by: 36_244, slack: 2_000, why: `36 km to the right of it. ${MA9_SHOWN}` },
      ejectionAt: { by: 33.86, slack: 2, why: `The drogue out 34 s late. ${MA9_SHOWN}. ${MA9_COAST}` },
    },
    descent: {
      'mercury-capsule.at': {
        by: 103.92,
        slack: 4,
        why:
          'Down 104 s late. The drogue is out 34 s late, with the coast begun from the ascent; the rest is the main, at the barostat’s height assumed from Sigma 7 (10,600 ft), on the canopy as ' +
          'derived on Freedom 7, bringing the capsule (Sigma 7’s weight) down at 8.9 m/s where Cooper read “about 34 feet per second”, 10.4. The main’s height and the capsule’s weight are not ' +
          'MA-9’s own: nothing is changed',
      },
    },
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
      perigee: { by: -351_949, slack: 2_000, why: SHORT },
      apogee: { by: -147_000, slack: 300, why: `The cutoff is level at 180 km and too slow, so 180 km is the orbit’s top: ${SHORT}` },
      period: { by: -302.49, slack: 2, why: `It follows from the speed at cutoff: ${SHORT}` },
    },
    shown: {
      separationAltitude: {
        by: -22_630,
        slack: 1_500,
        why: `${PUBLISHED}. At 10:36 it is at 132 km, where Lissov reckons 150 to 160 and Siddiqi 150 to 170 (reckonings). The burn is aimed along the line from the Sun, 30 degrees below level, which brings it down early: \`retro.aim\`, as in the coast’s own misses`,
      },
      ejectionAt: {
        by: 202.8,
        slack: 10,
        why: `${PUBLISHED}. It reaches 7 km at 10:45:23, 3.4 minutes after the record’s 10:42: a minute of it is the landing being 425 km long, the rest a descent slower than the flight’s, which points at \`retro.aim\` again (with the ascent cut over the mean Earth, until November 2026: 10:45:33, 498 km)`,
      },
      alongTrack: {
        by: 425_429,
        slack: 10_000,
        why:
          `${PUBLISHED}. It comes down 425 km beyond the record’s landing along the track (499 km with the ascent cut at 180 km over the mean Earth, until November 2026; now over the ball its own heights and period imply, 1.9 km smaller) (which holds: the plane flown from the flight task’s aiming azimuth is the record’s). ` +
          'The place on the orbit is the ascent’s (27.82 degrees round from the pad, where the estimate was 27.5), so what owns the rest is the burn’s aim along the line from the Sun (straight against the motion it lands 439 km shorter in the coast from the published orbit). ' +
          'Read as osculating, as until November 2026, it was 452 km: the published orbit read as mean (world/meanelements.ts, issue #8) puts the apogee where the record has it and the landing 51 km further out. Nothing is fitted',
      },
    },
    descent: {
      'module.at': {
        by: 124.9,
        slack: 10,
        why: 'Late by its late arrival at 7 km (see the coast’s ejectionAt): from 7 km the module takes 6 min 10 s, the record’s clocks at most 6',
      },
      'pilot.at': {
        by: 346.9,
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
        by: -29_188,
        slack: 1_500,
        why:
          'At 10:07, the instant the record has the cable bundle burn through, it is at 61 km where the record’s research has 80 to 100 (a reckoning), 16 minutes after the burn’s command. ' +
          'Not the drag: up to the parting the joined ship flies its free-molecule figure (SHIP_RAREFIED) bridged on its 2.43 m to the ball’s continuum curve, at the whole ship’s mass; without the free-molecule figure it would be 3.6 km higher, on the coast’s drag until November 2026 2.8 km higher, in the mean air 1.4 km lower (what parts flies only after it: the ball on its own figure, the instrument module not at all). ' +
          'At a fixed instant the height is the burn’s: 9 km for each minute it came later, 11 km lower straight against the motion (the line from the Sun is 0.72 against it, 0.26 down, 0.65 across), 14 km higher on 120 m/s for the type’s 136 (estimated). ' +
          'No instant of the burn meets this and the landing together: 0 along the track wants it 69 s later (71 km here), 90 km wants 194 s (800 km long). ' +
          'And 10:07 is by the clock that read the command at 09:57, which the orbit rules out: by it the parting came 10 minutes after the command, where the run is at 126 km. ' +
          'Read as osculating, as until November 2026, it was at 81 km (PHASE). No physical correction found (issue #23). Not adjusted',
      },
      crossTrack: {
        by: -68_089,
        slack: 3_000,
        why: 'It comes down 68 km across the track from the record’s landing. The Sun stood 38 degrees out of the plane at the burn, so a push along the line from it has much of itself across the track (`retro.aim`, as Vostok 1’s). Read as osculating it was 154 km: the coast then fell four minutes behind the record’s orbit (PHASE) and the Earth had turned less under the track',
      },
      alongTrack: {
        by: -378_360,
        slack: 10_000,
        why: 'It comes down 378 km short along the track (453 km on the ball’s continuum drag in the mean air, until November 2026; 345 km on the joined ship’s free-molecule drag in the mean air; the day’s thinner air gives back 33 km). Read as mean elements (PHASE) the coast keeps the record’s period, where read as osculating it fell four minutes behind and came down 1,427 km short; what is left is `injection.arc` (no source: 97 km a degree here) and `retro.aim` (straight against the motion: 421 km shorter)',
      },
    },
    ascent: {
      perigee: { by: -380_430, slack: 2_000, why: SHORT_TYPE },
      apogee: { by: -64_000, slack: 300, why: `The cutoff is level at 180 km and too slow, so 180 km is the orbit’s top: ${SHORT_TYPE}` },
      period: { by: -269.47, slack: 2, why: `It follows from the speed at cutoff: ${SHORT_TYPE}` },
    },
    shown: {
      separationAltitude: {
        by: -33_977,
        slack: 1_500,
        why: `${PUBLISHED}. At 10:07, the instant the record has the cable bundle burn through, it is at 56 km where the record’s research has 80 to 100, as the coast from the injection (61 km): the burn’s instant, line and impulse and the record’s clock own it, not the drag (the coast’s miss). Read as osculating it was at 79 km and within`,
      },
      alongTrack: {
        by: -471_950,
        slack: 10_000,
        why: `${PUBLISHED}. It comes down 472 km short along the track and 12 km across it (which holds): ${PHASE}. With the ascent cut at 180 km over the record’s old ball, until November 2026, 422 km. Read as osculating, as until November 2026, it came down over Anatolia, 1,493 km short`,
      },
    },
    descent: {
      'pilot.at': {
        by: 242.4,
        slack: 10,
        why: 'Late by the type’s descent, as Vostok 1’s is: from the burn he is 32.6 min to the ground where the record’s 09:51 to 10:18 is 27, and four kilometres under a canopy at 5 m/s is 13 minutes by itself (Vostok 1’s miss)',
      },
    },
  }),
  'ussr/vostok/vostok-3': inUnits({
    coast: {
      crossTrack: {
        by: -186_268,
        slack: 10_000,
        why: `It comes down 186 km to the left of the record’s landing (785 km on the heights over the mean Earth): the burn is in the wrong place on the orbit (over 63 degrees south) and the Earth has turned under it by the minutes the ship is out. ${PERIOD_64}`,
      },
      alongTrack: { by: -1_540_500, slack: 30_000, why: PERIOD_64 },
    },
    ascent: {
      cutoffAt: {
        by: -10.65,
        slack: 0.1,
        why: 'Block E is cut where Vostok 1’s integrator was set (2,283.52 m/s of apparent velocity: estimated here), and that comes at 676.4 s, as on Vostok 1; the bunker waited for 687 s, the end of this flight’s burn as planned. So this flight’s setting, or its third stage’s start, or both, differed from Vostok 1’s by some ten seconds of burn: neither was found. Not adjusted',
      },
      firstG: {
        by: -1.786,
        slack: 0.05,
        why: 'The most the type’s ascent gives is 4.71 g, on the first stage before the strap-ons throttle back (3.98 on the core alone, 0.91 on the last). Nikolayev’s 6 to 7 g is by feel and said of the whole ascent; Titov felt no more than five on the same vehicle (Vostok 2’s check, which holds). Either the feeling or the type’s thrust and masses: not adjusted',
      },
      perigee: { by: -420_467, slack: 2_000, why: SHORT_V3 },
      apogee: { by: -54_600, slack: 300, why: `The cutoff is level at 180 km and too slow, so 180 km is the orbit’s top: ${SHORT_V3}` },
    },
    shown: {
      'tass-12aug.apogee': {
        by: 6_204,
        slack: 500,
        why: `${PUBLISHED}, so its apogee is higher than the coast’s from the injection (239.2 km flown round). ${TASS_12AUG}`,
      },
      alongTrack: { by: -1_058_570, slack: 30_000, why: `${PUBLISHED}. ${PERIOD_64}` },
    },
    descent: {
      'module.at': {
        by: 237.3,
        slack: 10,
        why: 'The module comes down at 09:43:56, 5.7 minutes before the pilot; the record has twelve minutes between them (09:39:59 and 09:52), as on Vostok 4. From 7 km the module takes six minutes on the type’s three parachutes; what put both flights’ modules down so long before their pilots is not in anything read. The rest is the pilot’s own miss: not adjusted',
      },
      'pilot.at': {
        by: -142.2,
        slack: 10,
        why: 'Nikolayev comes down at 09:49:38, 2.4 minutes early (4.8 minutes late on the heights over the mean Earth). The burn is timed from his landing (derived), and from it he takes less than Vostok 1’s 27.9 minutes from command to landing: where on the orbit the burn comes follows from the period (PERIOD_64). Not adjusted',
      },
    },
  }),
  'ussr/vostok/vostok-5': inUnits({
    coast: {
      crossTrack: { by: -252_667, slack: 5_000, why: `It comes down 253 km across the track. ${COAST_V5}` },
      alongTrack: { by: -3_313_660, slack: 20_000, why: `It comes down 3,314 km short along the track, over Arabia. ${COAST_V5}` },
      'tass18.period': {
        by: 6.387,
        slack: 1,
        why: `At 15:00 on 18 June it goes round in 87.91 min where TASS has 87.8: 6.4 s against a tolerance of a tenth of a minute. ${COAST_V5}`,
      },
    },
    ascent: {
      perigee: { by: -406_767, slack: 2_000, why: SHORT_V5 },
      apogee: {
        by: -41_100,
        slack: 300,
        why: `The cutoff is level at the 181 km asked for and too slow, so 181 km is the orbit’s top: ${SHORT_V5}`,
      },
      period: { by: -269.03, slack: 2, why: `It follows from the speed at cutoff: ${SHORT_V5}` },
    },
    shown: {
      'tass18.perigee': {
        by: 9_450,
        slack: 500,
        why: `${PUBLISHED}. Begun where the type’s ascent left it, its apogee lower, it drags less at perigee over four days and is 168.5 km up at 15:00 on 18 June where TASS has 159; from the estimated injection it is 163.3 and holds. ${APSIS_OPEN}`,
      },
      'tass18.period': {
        by: 8.552,
        slack: 1,
        why: `${PUBLISHED}. At 15:00 on 18 June it goes round in 87.94 min where TASS has 87.8. ${COAST_V5}`,
      },
      crossTrack: { by: -241_728, slack: 5_000, why: `${PUBLISHED}. ${COAST_V5}` },
      alongTrack: { by: -3_716_810, slack: 20_000, why: `${PUBLISHED}. ${COAST_V5}` },
    },
  }),
  'ussr/vostok/vostok-6': inUnits({
    coast: {
      crossTrack: { by: -175_679, slack: 5_000, why: `It comes down 176 km across the track. ${COAST_V6}` },
      alongTrack: { by: -2_726_340, slack: 20_000, why: `It comes down 2,726 km short along the track, over Iran. ${COAST_V6}` },
    },
    ascent: {
      perigee: { by: -392_896, slack: 2_000, why: SHORT_V6 },
      apogee: {
        by: -48_100,
        slack: 300,
        why: `The cutoff is level at the 183 km taken as asked for and too slow, so 183 km is the orbit’s top: ${SHORT_V6}`,
      },
      period: { by: -266.8, slack: 2, why: `It follows from the speed at cutoff: ${SHORT_V6}` },
    },
    shown: {
      crossTrack: { by: -113_745, slack: 5_000, why: `${PUBLISHED}. ${COAST_V6}` },
      alongTrack: { by: -2_685_530, slack: 20_000, why: `${PUBLISHED}. ${COAST_V6}` },
    },
    descent: {
      'pilot.at': {
        by: -200.7,
        slack: 10,
        why: 'Down at 11:16:39, 3 min 21 s before TASS’s 11:20: from the burn, derived from the cycle’s command and its “approximately” 71 minutes (Kogutenko), she takes 26.0 min to the ground. The minute of the burn is the owner: Vostok 1’s 27.9 min from command to pilot would have it at 10:52:06. Not adjusted',
      },
    },
  }),
  'ussr/vostok/vostok-4': inUnits({
    coast: {
      alongTrack: { by: 2_343_960, slack: 30_000, why: PERIOD_48 },
    },
    ascent: {
      perigee: { by: -394_345, slack: 2_000, why: SHORT_V4 },
      apogee: { by: -56_700, slack: 300, why: `The cutoff is level at 180 km and too slow, so 180 km is the orbit’s top: ${SHORT_V4}` },
      period: { by: -273.5, slack: 2, why: `It follows from the speed at cutoff: ${SHORT_V4}` },
    },
    shown: {
      alongTrack: { by: 2_407_350, slack: 30_000, why: `${PUBLISHED}. ${PERIOD_48}` },
    },
    descent: {
      'module.at': {
        by: 340.3,
        slack: 10,
        why: 'The module comes down at 09:53:16, 5.8 minutes before the pilot (who holds, 4 s late); the record has twelve minutes between them (09:46:33 and 09:59), as on Vostok 3. From 7 km the module takes six minutes on the type’s three parachutes; what put both flights’ modules down so long before their pilots is not in anything read: not adjusted',
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
  'usa/gemini/gt-3': inUnits({
    ascent: {
      cutoffSpeed: {
        by: -105.94,
        slack: 3,
        why: `106 m/s short at the second stage’s cutoff: 7,722 against 25,682 ft/s (7,828), aimed at 87.0 nautical miles over the ball the published heights and period imply, 6,388 km. ${GT3_ASCENT}`,
        short: 'GLV-4’s and GLV-1’s figures, not GLV-3’s',
      },
      perigee: {
        by: -260_184,
        slack: 4_000,
        why: `Its perigee under the ground where the record has 161 km: the speed short at cutoff. ${GT3_ASCENT}`,
      },
      apogee: {
        by: -62_963,
        slack: 3_000,
        why: `Its apogee 161 km where the record has 224: the cutoff, inserted on the law’s target height, becomes the apogee. ${GT3_ASCENT}`,
      },
    },
    coast: {
      'after-15900.perigee': {
        by: -11_863,
        slack: 1_000,
        why:
          'The third burn leaves a perigee of 71.5 km where SP-138 has a vacuum perigee of 45 nautical miles, 83.3 km. The burn is flown at the 97 ft/s the indicator read, straight against the motion as it ' +
          'lit; the first leaves the orbit within 2 km of the ground’s call. What the indicator’s 97 ft/s measured (the axis, with the thrusters canted) and what ball SP-138’s perigee is over are not ' +
          'read: cause not established, nothing adjusted',
      },
      alongTrack: {
        by: -219_637,
        slack: 8_000,
        why: `The drogue comes out 220 km short of where the ship landed, along the track. ${GT3_ENTRY}`,
      },
      crossTrack: {
        by: 81_519,
        slack: 4_000,
        why: `And 82 km to the right of it: the bank held to the right, the way the target lay. ${GT3_ENTRY}`,
      },
    },
    shown: {
      'after-15900.perigee': {
        by: -18_302,
        slack: 1_500,
        why: `65.0 km where SP-138 has 83.3. ${GT3_SHOWN}; and as the coast’s, cause not established`,
      },
      alongTrack: { by: -229_609, slack: 10_000, why: `230 km short of where it landed, along the track. ${GT3_SHOWN}. ${GT3_ENTRY}` },
      crossTrack: { by: 60_443, slack: 4_000, why: `60 km to the right of it. ${GT3_SHOWN}. ${GT3_ENTRY}` },
    },
    descent: {
      'reentry-module.at': {
        by: 65.83,
        slack: 4,
        why: `Down at 4:53:37, 66 s late, from the ascent’s handover: the drogue out within 2 s of the record, so the rest is the parachutes, the drogue an estimate and the main the type’s height and its canopy the Technical Summary’s mean rate, with the module at spacecraft 4’s weight. ${GT3_SHOWN}`,
      },
    },
  }),
  'ussr/voskhod/voskhod-1': inUnits({
    coast: {
      crossTrack: { by: -106_456, slack: 5_000, why: `It comes down 106 km across the track. ${COAST_VK1}` },
      alongTrack: {
        by: -1_066_320,
        slack: 20_000,
        why: `It comes down 1,066 km short along the track, in the steppe north-west of the Aral Sea. ${COAST_VK1}`,
      },
    },
    ascent: {
      perigee: { by: -698_086, slack: 2_000, why: SHORT_VK1 },
      apogee: {
        by: -230_500,
        slack: 300,
        why: `The cutoff is level at the 177.5 km planned and too slow, so 177.5 km is the orbit’s top: ${SHORT_VK1}`,
      },
      period: { by: -557.6, slack: 2, why: `It follows from the speed at cutoff: ${SHORT_VK1}` },
    },
    shown: {
      alongTrack: { by: -1_198_430, slack: 20_000, why: `${PUBLISHED}. ${COAST_VK1}` },
    },
    descent: {
      'module.at': {
        by: -226.7,
        slack: 10,
        why: 'Down at 10:43:17, 3 min 47 s before the record’s 10:47:04: where the ship comes down is the burn’s, whose length and impulse are not known (COAST_VK1), and from 5 km it takes the ball 8 min on the parachutes as taken (the Vostok’s, the main two of them). Not adjusted',
      },
      'module.speed': {
        by: 1.917,
        slack: 0.05,
        why: 'It touches down at 2.1 m/s, not the design’s 0.2: the rocket is worked from Kamanin’s 7 to 8 m/s under the main parachutes (7.5 taken), and on the two main canopies as taken (two of the Vostok’s 574 m²) the ball comes down at 7.4, so the rocket stops it short of the ground, it rises and falls again. Its thrust and burn are not found and the parachutes’ areas are not: the miss is between the two estimates. Not adjusted',
      },
    },
  }),
  'ussr/voskhod/voskhod-2': inUnits({
    coast: {
      crossTrack: { by: -85_499, slack: 5_000, why: `It comes down 85 km across the track. ${COAST_VK2}` },
      alongTrack: { by: -583_280, slack: 20_000, why: `It comes down 583 km short along the track, in Mari El. ${COAST_VK2}` },
    },
    ascent: {
      perigee: { by: -1_281_000, slack: 2_000, why: SHORT_VK2 },
      apogee: {
        by: -317_700,
        slack: 300,
        why: `The cutoff is level at the planned 180 km and too slow, so 180 km is the orbit’s top: ${SHORT_VK2}`,
      },
      period: { by: -949.1, slack: 2, why: `It follows from the speed at cutoff: ${SHORT_VK2}` },
    },
    shown: {
      'rev9.perigee': {
        by: 5_295,
        slack: 300,
        why: `${PUBLISHED}, its perigee at the ascent’s 180 km where the record has 173.5: so on the ninth orbit too`,
      },
      'rev9.apogee': { by: -4_848, slack: 300, why: `${PUBLISHED}: the same, its apogee lower` },
      'rev18.perigee': { by: 5_398, slack: 300, why: `${PUBLISHED}: the same, on the eighteenth orbit` },
      'rev18.apogee': { by: -4_653, slack: 300, why: `${PUBLISHED}: the same, its apogee lower` },
      crossTrack: { by: -48_013, slack: 5_000, why: `${PUBLISHED}. ${COAST_VK2}` },
      alongTrack: { by: -450_508, slack: 20_000, why: `${PUBLISHED}. ${COAST_VK2}` },
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
};
