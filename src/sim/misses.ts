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
  'The vehicle as the record reads it reaches an orbit, 14 m/s short of the published one. Block E is cut where its integrator was set (2,283.52 m/s of apparent velocity, the flight task) and that comes at 676.4 s, ' +
  'the recorded instant to a second, with 46 kg left, level at 180 km with 7,827 m/s where 181 by 327 km needs 7,841: so the third stage as recorded is right, and what is left is the first two stages’. ' +
  'What owns it (the last test): the throttling documented in kind and estimated in level, the strap-ons’ intermediate stage (none: +143 m/s; at 80 per cent: +71) and above all the core’s final stage, ' +
  'flown since November 2026 for the cyclogram’s 7.00 s (vostok-8k72k.ts `FINAL_STAGE`; as the “about 10 s” read off Siddiqi’s 300 s it left the vehicle 147 m/s short, its perigee under the ground: each second of it is 44 m/s), ' +
  'with 3.7 t left in the core at its cutoff, which a vehicle with tank-emptying regulators would not carry. On the day the core ran 22 m/s over its design (NIIP-5’s report), which is the apogee the record has and this run has not. Not adjusted';
const PUBLISHED =
  'The coast is flown on from the state the ascent left the spacecraft in, with its share of the joint’s push and nothing else (until November 2026 its speed there was set to the published orbit’s: staged.ts `flyWhole`)';
/** What an ascent's check of the orbit at the last cutoff reads, where the guidance cut the stage on the published period. */
const OSCULATING =
  'What this check reads is the osculating orbit at the cutoff, which is not the published one: the period flown is the record’s (the spacecraft is left on it to within a second: tests/onestate.test.mjs), ' +
  'and the published heights are a mean orbit’s over the ball the flight’s own heights and period imply (world/meanelements.ts), some kilometres off the osculating apsides and, where the published heights and period do not agree with one another, held by the period';
const SHORT_TYPE =
  'Vostok 2’s ascent is the type’s, flown on Vostok 1’s instants (no document of E103-17’s ascent was found: its mission.md), Block E cut by the guidance where the orbit reached has the published period, ' +
  `its own integrator’s setting not being known (vostok-8k72k.ts \`BLOCK_E_CUT\`): at 676.0 s, level at the planned 180 km. ${OSCULATING}`;
/** Vostok 3's ascent is the type's but for the third stage's cutoff, which Kamanin heard counted. */
const SHORT_V3 =
  'Vostok 3’s ascent is the type’s, flown on Vostok 1’s instants (no cyclogram or flight task of E103-23 was found: its mission.md), Block E cut by the guidance where the orbit reached has the period flown for this flight, ' +
  `its own integrator’s setting not being known (vostok-8k72k.ts \`BLOCK_E_CUT\`): at 677.2 s, level at the planned 180 km. ${OSCULATING}`;
/** Where Vostok 1's and Vostok 5's own heights and period put the apsis, against where the run has the perigee. */
const APSIS_OPEN =
  'Each flight is flown on the ball its own published heights and period imply (orbital.ts `heightsBall`), so its figures hold. For Vostok 1 (6,369.1 km) and Vostok 5 (6,366.7) that is the ellipsoid under an apsis at 41 and 47 degrees, where the run puts the perigee at the injection, 63 degrees N: an open inconsistency, recorded and not resolved (tests/apsis.test.mjs, the flights’ mission.md)';
/** Vostok 5's ascent is Vostok 1's, as Vostok 2's is: it falls short of an orbit for the same reasons. */
const SHORT_V5 =
  'Vostok 5’s ascent is Vostok 1’s, flown on its instants (no document of E103-24’s ascent was found: its mission.md), Block E cut by the guidance where the orbit reached has the published period, ' +
  `its own integrator’s setting not being known (vostok-8k72k.ts \`BLOCK_E_CUT\`): at 676.3 s, level at the 181 km asked for, where the published perigee is 174.7. That the stage fell short on the day (Siddiqi, no source) is not flown. ${OSCULATING}`;
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
  'Vostok 6’s ascent is Vostok 1’s, flown on its instants (no document of E103-25’s ascent was found: its mission.md), Block E cut by the guidance where the orbit reached has the published period, ' +
  `its own integrator’s setting not being known (vostok-8k72k.ts \`BLOCK_E_CUT\`): at 676.0 s, level at the 183 km taken as asked for. ${OSCULATING}`;
/** Three days flown round to a burn derived from the ground's command: the landing's miss, and what it is worth in each thing not known. */
const COAST_V6 =
  'Three days are flown round (48 revolutions) in the days’ own thermosphere (Jacchia 1971) on the ship’s free-molecular drag, to a burn at 10:50:40 derived from the cycle’s command at 09:39:40 and “approximately” its 71st minute (Kogutenko). ' +
  'The orbit falls as TASS’s did: at 15:00 on 18 June it is 176.0 by 219.8 km and 88.15 min where TASS has 174 by 218 km and 88.1 (all within tolerance). In the 1976 mean air on the ball’s continuum drag it came down 3,757 km short. ' +
  'Against TASS’s two orbits the period flown is within their rounding (1.5 s short at 22:00 on the 16th, 2.8 s long at 15:00 on the 18th): carried round to the burn that is some 61 s, 440 km of the 2,726, so the decay is not shown to own the miss. What each thing not known is worth, as diagnoses and not inputs: the published period is to a tenth of a minute, and 0.05 min less brings it 1,211 km nearer, 0.05 min more 923 km further; the burn a minute later 401 km nearer, five minutes later 2,381 km (it would then land 20 to 25 minutes after the burn, where Vostok 1’s pilot took 28). Not established which. Not adjusted';
/** Voskhod 1's day round: a burn whose start one account gives, whose length and impulse none does. */
const COAST_VK1 =
  'Sixteen revolutions are flown in the day’s thermosphere to a burn at 10:18:58 (one secondary account’s seconds: Zak, from Baturin) aimed from the Sun as a Vostok’s, for the TDU-1’s 45 s and the Vostok’s 136 m/s (neither found for this flight). ' +
  'As diagnoses, not inputs: the burn a minute later lands it 475 km short, five minutes later 4,146 km long, and at Chertok’s programmed 10:08:56 4,367 km short; the published period 0.05 min shorter 712 km short, longer 1,393; aimed straight against the motion 1,419 km short; 100 m/s 1,084 km long, 155 m/s 1,725 km short. ' +
  'The record cannot hold a landing to a hundred kilometres: its burn’s length and impulse are not known. What owns the miss is not established. Not adjusted';
/** Voskhod 2's ascent: as Voskhod 1's, to the planned 180 km, where the record's orbit went higher than planned. */
const SHORT_VK2 =
  'Voskhod 2’s ascent is flown on the 11A57’s figures as this record reads them (the Vostok-K’s blocks with the later engines’ thrusts, Block I at its maker’s thrust and impulse on Brügge’s load) and the crew’s instants, ' +
  'Block I cut by the guidance where the orbit reached has the published period, no setting of its own being known (voskhod-11a57-flown.ts `BLOCK_I_CUT`): at 537.1 s where the crew’s report has 523, with 117 kg left, level at the planned 180 km, ' +
  `where the orbit reached had its perigee at 173.5. The record’s orbit was higher than the planned 180 by 470 km, and no source read says why. ${OSCULATING}`;
/** Voskhod 2's day round, and the burn by hand. */
const COAST_VK2 =
  'Eighteen revolutions are flown to the burn by hand at OKB-1’s commands (main valve 11:36:29.5, shutdown about 11:37:09), straight against the motion as Belyayev aimed it by eye, for 112 m/s worked from the engine’s measured 1,575 kgf over 39.5 s; the modules part at 11:50:56.5, as they did. ' +
  'The record’s own orbits on the ninth and eighteenth revolutions hold on the coast to 2 km. As diagnoses, not inputs: the burn a minute later lands it 138 km short, at the time read up to them (11:35:44) 904 km short; the published period 0.05 min shorter 278 km short, longer 875; 100 m/s 73 km short. ' +
  'The burn’s impulse is derived and its aim by eye is not known. What owns the miss is not established. Not adjusted';
/** Vostok 4's ascent is the type's throughout. */
const SHORT_V4 =
  'Vostok 4’s ascent is the type’s, flown on Vostok 1’s instants (no document of E103-22’s ascent was found: its mission.md), Block E cut by the guidance where the orbit reached has the published period, ' +
  `its own integrator’s setting not being known (vostok-8k72k.ts \`BLOCK_E_CUT\`): at 676.3 s, level at the planned 180 km. ${OSCULATING}`;

/** Aurora 7's coast, from the published orbit and from where the ascent left it. */
const MA7_RETRO =
  'The retrofire is flown as the tracking gave it (TN D-3814, p. 101): lit by hand at 04:33:10.3, held 36.5° below the level and 27° off in yaw, its push turned to the left of the ' +
  'motion, the three motors 3 per cent under their group’s 38,943 lb s, 124.5 m/s over the capsule in orbit (no weight at retrofire is printed). So flown it comes down 537 km beyond ' +
  'the planned point, where the report has some 250 nautical miles (463 km); flown at 34° with no yaw, 3 s sooner and at the group’s impulse, it comes down 33 km from it ' +
  '(tests/orbital.test.mjs prints each). The yaw is worth 374 km here and 175 statute miles (282 km) in This New Ocean (p. 454), the low impulse 156 km against 60 miles: the simulator ' +
  'gives the retrofire’s errors more than the record does. Which input owns the rest is not established; not adjusted';
const MA7_SHOWN =
  'Flown on from the state the ascent left the capsule in: the guidance cuts the sustainer on the published orbit 12.3 s before the recorded instant (the Atlas as modelled reaches it early), so the capsule is so much further on round the orbit at any instant after';

/** Friendship 7's coast, from the published orbit and from where the ascent left it. */
const MA6_RETRO =
  'Nothing in the retrofire is MA-6’s own measure: the three motors’ impulse is their specified total, 38,880 lb s (the MA-4 and MA-5 trajectory report), over the capsule at retrofire, ' +
  '2,970 lb, 128 m/s spread evenly from the first’s lighting to the third’s burning out, with nothing for the propellant they burned (not read: a few per cent more); the entry is the ' +
  'capsule’s own drag curve (TM X-491), the retropack kept on and burning away not modelled; and where on the orbit it began is reckoned by hand (`injection.arc`). The record itself ' +
  'landed some 40 nautical miles short of the planned point because the retrofire was worked without the consumables spent (This New Ocean, p. 433): a miss of the planners’, not of these figures. ' +
  'Which input owns this one is not established (tests/orbital.test.mjs prints what each is worth); not adjusted';

const GT3_ENTRY =
  'Of the entry nothing is spacecraft 3’s own measure but where it came down: its lift over drag is the programme’s average as flown, 0.19 (SP-138, p. 159), on the Mercury capsule’s ' +
  'drag curve; the bank is held at 60 degrees from the retrograde section’s going, the footprint’s contour the target lay on (SP-138, p. 163), where the crew flew a backup bank and then the ' +
  'computer’s commands, angles not read; the retrofire pitch is the next flight’s 30 degrees, its sign taken as Mercury’s; and where on the orbit it began is reckoned (`injection.arc`: a degree ' +
  'is some 110 km along the track at retrofire). Flown lift up throughout it lands 390 km further on, flown level 246 km shorter (the last test): the record cannot hold the landing to a ' +
  'hundred kilometres. The record itself landed 60 nautical miles short of its target because the lift was 35 per cent below the prediction; that is flown, not this';

/** Gemini-Titan 5 (missions/usa/gemini/flights/gt-5/orbital.ts, mission.md). */
const GT5_PITCH =
  'The first stage is flown open on the pitch programme as Table 5.2-IV of the mission report prints its actual rates, 0.75, 0.56 and 0.25 deg/s, and comes to its cutoff 6.9 km low and 4.5 degrees flat, ' +
  'where the record has the flight "slightly lofted because of low-pitch program rates" (4.1). The table’s own difference column (+0.041, +0.044 and +0.015 deg/s against the planned 0.709, 0.516 and 0.235) ' +
  'and that sentence have the rates lower than planned, and the rates printed are higher: flown at the planned rates the cutoff comes at 63.6 km and 18.7 degrees, 69 m/s slow. Which reading is right is not ' +
  'settled; the printed one is flown, nothing adjusted. The second stage’s law then cuts on the published orbit at 333.37 s, the record’s 333.28, at the separation’s speed to 1 m/s';
const GT5_DECAY =
  'The run’s ship comes down more slowly over the last five days than the tracked one: from the third day’s burns to revolution 120 its apogee falls 15.5 km where the tracking has 25.9. It is flown end on ' +
  'in the free-molecule flow, on the adapter’s 7.30 m² disc (rarefied.area), where for most of the eight days it drifted, powered down and venting ("the spacecraft attitude control and the hydrogen and ' +
  'oxygen continued venting throughout most of the flight", 4.3.1.2, the ground’s own drag factor for it moving by 23 per cent after the third day). Flown on 10 m², between end on and tumbling, the ' +
  'apogee comes within 3 km and the burn 61 s early: the attitude it drifted in is not in the record, and nothing is changed';
const GT5_LATE =
  'The retrofire is timed for the place the ship came down (sim/plan.ts LandingAim), so after eight days it is lit as far after the record’s 190:27:43.3 as the run is behind the record’s clock ' +
  '(589 s, flown on from the ascent), and the entry it then flies takes some 90 s longer from the burn to the drogue than the record’s: its lift read off a preliminary figure and the Mercury capsule’s drag';

const GT3_SHOWN =
  'Flown on from the state the ascent left the spacecraft in: the guidance cuts the second stage on the published orbit 0.7 s after the recorded instant, level at the perigee’s height over the reference ball';

/** The Gemini targets' Atlas (missions/usa/gemini/vehicles/target-plan.ts). */
const TARGET_LOW =
  'The stack is 5 to 11 km low from booster engine cutoff to the Agena’s start, at the right speed to 60 m/s and near the right climb. The Atlas is flown on a stated law (up to 15 s, a ' +
  'pitch-over of 15 s, estimated, the turn to 97.3 s, a linear tangent from there) solved for the insertion alone: the autopilot’s pitch programme for the booster phase, which set these, ' +
  'was not found, and the law’s pitch-over lays it over early (1 to 2 degrees flat at booster cutoff). Not adjusted';
const TARGET_FLAT = `Flatter at booster engine cutoff than the record. ${TARGET_LOW}`;
const ATDA_FLAT =
  'Nearly five degrees flatter at booster engine cutoff. The ATDA’s Atlas had its own pitch programme ("Revises the pitch program amplitude and time slots", LSFR Table IV.D-1), not found; ' +
  'the law here has the Agena flights’ pitch-over (estimated). Not adjusted';
const TARGET_FAST =
  'Some 60 m/s fast at the sustainer’s and the verniers’ cutoffs. Atlas 5306 is flown on 5302’s thrusts (the Gemini VIII report’s), with the impulses derived from its own weights on them: 5306’s own thrust table was not read. Not adjusted';
const TARGET_EARLY =
  'The Agena reaches the planned insertion speed 4.5 s before the record’s cutoff. Its impulse is the 8247’s from a secondary source (293 s) and its shroud’s weight the standard Agena’s; the vehicle was ' +
  'cut by its velocity meter, flown here as the planned space-fixed speed. Not adjusted';
const TARGET_APOGEE =
  'The engine is cut at the planned insertion speed, at the law’s height and climb, and the orbit comes out 160 by 168 to 171 nautical miles where the record has 156 to 159 by 164 to 166: the record’s ' +
  'insertion was a few ft/s short of the plan, at a slightly greater height. Nothing in the Agena’s own guidance is flown but its cutoff. Not adjusted';
const ATDA_APOGEE =
  'Apogee 176 nautical miles against 167. The sustainer is cut at the planned 25,298 ft/s, and the two verniers then burn their recorded 18.8 s alone and add 73 m/s where the record’s states have 23 ' +
  '(25,290 to 25,365 ft/s): their thrust as printed, taken as the pair’s, and their flow at the sustainer’s impulse, neither read for the verniers alone. Not adjusted';

const GT4_DECAY =
  'The orbit comes down more slowly than Gemini IV’s did: by the 61st revolution its apogee is some 20 km higher than Table 4-III’s and its perigee 5 to 8 km. It is drifted on the air of the day’s Sun ' +
  '(sim/air.ts) at King-Hele’s 2.2 on a quarter of the ship’s outside, 10.3 m² (Cauchy: it drifted for two and a half days and was held for the rest, on 7.3 m² nose or tail first); the report fitted its own ' +
  'decay with an atmosphere 0.72 of the ARDC 1959 one (section 4.3.1.2) and gives no ballistic figure. Which of the area, the coefficient and the air is short is not established; nothing is adjusted';

const GT4_LATE =
  'Its period is so much the longer that after 62 revolutions it is some ten minutes behind where the record’s clock has it. The ground timed the burn before retrofire and retrofire for the place it was ' +
  'to come down, so they are timed for it here (sim/plan.ts `LandingAim`, its `from` the burn before retrofire’s turn to its attitude): the two are lit as much later than the record’s instants, ' +
  'keeping their recorded interval, and everything after them comes as much later';

const GT4_ACROSS =
  'The burns timed for the place bring it down level with it along its track, not across it: lit some ten minutes after the record’s instant, the Earth has turned 2.6 degrees more under the orbit ' +
  'by then, and the track passes the place to its left';

const GT4_SHOWN =
  'Begun from where the ascent flown left the spacecraft, 7 km low at perigee and 6 km high at apogee at cutoff (the ascent’s figures hold)';

const GT7_ORBIT =
  'The ascent leaves the apogee 5 km above the report’s (holding), and the station keeping on the second stage and the radial burn of 0:21:17 that ended it (8.8 ft/s, pitched −41.5° and yawed 49°) are not flown: the report has them taking 2.8 nautical miles (5.2 km) off the apogee. Each burn is flown at its tracked impulse along the motion. Nothing adjusted';

const GT7_CIRCLE =
  'The two burns are flown at the report’s instants and tracked impulses, along and against the motion: timed by the clock for where the real ship’s apsides were, on an orbit 7 km higher at its apogee (the ascent’s and the station keeping’s), they do not come at this run’s apsides, and leave it less round. The ground worked them from the ship’s own tracked orbit. Nothing adjusted';

const GT7_ENTRY =
  'The retrofire is timed by guidance for the landing place along the track (sim/plan.ts `LandingAim`), 36 s before the record’s instant. The lift is the programme’s 0.19 on the Mercury capsule’s drag curve, banked 48.8° (the report’s reconstruction) to the left from the retrograde section’s going, where the crew flew about 35° and reversed it four or five times (4.3.1.3): the reversals are not flown. The drogue’s height is read off the report’s figure';

const GT6A_RETRO =
  'Before retrofire the perigee is 275.0 km where SP-4002 has 153.0 nautical miles (283.4 km); its apogee holds. The burns to the coelliptic orbit hold (the apogee after the first within 25 m, the coelliptic orbit within 1.5 km); after it the terminal phase is flown by the forward parts of the computer’s displays along the motion, and the braking, the station keeping and the separation from Gemini VII, whose impulse is not read, are not flown: what of the orbit at retrofire is theirs is not established. Nothing adjusted';

const GT6A_ENTRY =
  'The retrofire is timed by guidance for the landing place along the track (sim/plan.ts `LandingAim`), 277 s before the record’s instant, the run being that far from the real ship along its orbit after a day (the terminal phase, braking, station keeping and separation are not flown as made). The ground track at that instant passes west of the place, and the bank is held 55° to the left throughout, as Schirra held it until the computer took over, whose commands, left and right against an overshoot, are not read. Nothing adjusted';

/** Soyuz 3's approach to Soyuz 2, flown as one burn (its orbital.ts `burns`), and the correction after it. */
const APPROACH_S3 =
  'The approach to Soyuz 2 is not flown: its burns, Igla’s and Beregovoy’s, are not on any record read one by one, and are flown as one burn along the motion at 11:55 on 26 October whose impulse grows the orbit from the size Siddiqi’s table gives for the insertion to the size TASS gave on the 27th. That is the orbit’s size and not its shape: a single burn so far round from the perigee raises both apsides, where the record’s orbit after the approaches has its perigee 4 km lower and its apogee 30 km higher than the insertion’s. Not adjusted';
const CORRECTION_S3 =
  'The correction of 28 October is flown at an estimated instant in the middle of the 36th orbit with the impulse worked from Mishin’s table of what the main engine could still give, to the ten metres a second.';
const ACROSS_S3 =
  'The braking burn is timed for the place it came down at (sim/plan.ts `LandingAim`), and so is lit some eleven minutes before the record’s 09:45:05 (679 s from the published orbit, 658 s from the pad): after four days the run is that far along its track ahead of the record’s clock, its period a few seconds short of the record’s on each of its 64 revolutions (the approach and the correction as flown here). Lit so much earlier, it comes down on a track the Earth has turned under less: the cross-track miss is that time on the Earth’s turning at 50 degrees north. Not adjusted';

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
      crossTrack: { by: 29_454, slack: 2_000, why: `And 29 km to the right of it. ${MA6_RETRO}` },
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
        why: `The drogue comes out 107 km beyond where the capsule was picked up, along the track. ${MA7_RETRO}`,
      },
      crossTrack: { by: 22_340, slack: 2_000, why: `And 22 km to the right of it. ${MA7_RETRO}` },
    },
    shown: {
      alongTrack: {
        by: 222_300,
        slack: 8_000,
        why: `222 km beyond the pick-up point along the track (377 km until November 2026, begun from the ascent’s place at the published orbit’s speed). ${MA7_SHOWN}. ${MA7_RETRO}`,
      },
      crossTrack: {
        by: -20_200,
        slack: 2_000,
        why: `20 km to the left of it (41 km to the right until November 2026, in the unsteered ascent’s plane: the law now steers to the inclination). ${MA7_SHOWN}. ${MA7_RETRO}`,
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
        why: `The cutoff is level at 180 km and 14 m/s slow for the published orbit, so its apogee is 265 km for 327: ${SHORT}`,
      },
      period: { by: -40.57, slack: 2, why: `It follows from the speed at cutoff: ${SHORT}` },
    },
    shown: {
      apogee: {
        by: -43_390,
        slack: 500,
        why: `${PUBLISHED}: flown round, the orbit tops out at 284 km where the record has 327. ${SHORT}`,
      },
      period: {
        by: -28.13,
        slack: 1,
        why: `${PUBLISHED}: it goes round in 88.97 min where the record has 89.44. ${SHORT}`,
      },
      separationAltitude: {
        by: -33_960,
        slack: 1_500,
        why: `${PUBLISHED}. At 10:36 it is at 121 km, where Lissov reckons 150 to 160 and Siddiqi 150 to 170 (reckonings): on the ascent’s own orbit, 43 km lower at its top than the published one (132 km begun at the published orbit’s speed, until November 2026). The burn is aimed along the line from the Sun, 30 degrees below level, which brings it down early: \`retro.aim\`, as in the coast’s own misses`,
      },
      ejectionAt: {
        by: 183.7,
        slack: 10,
        why: `${PUBLISHED}. It reaches 7 km at 10:45:04, 3.1 minutes after the record’s 10:42: a minute of it is the landing being 542 km long, the rest a descent slower than the flight’s, which points at \`retro.aim\` again (with the ascent cut over the mean Earth, until November 2026: 10:45:33, 498 km)`,
      },
      alongTrack: {
        by: 542_000,
        slack: 10_000,
        why:
          `${PUBLISHED}. It comes down 542 km beyond the record’s landing along the track, on the ascent’s own orbit, which goes round 28 s sooner than the published one, so the burn at the record’s instant comes further on (425 km begun at the published orbit’s speed, until November 2026); across the track it holds. ` +
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
      apogee: { by: -13_630, slack: 300, why: `The osculating apogee at the cutoff, 230 km for the published 244: ${SHORT_TYPE}` },
    },
    shown: {
      separationAltitude: {
        by: -39266.4,
        slack: 1_500,
        why:
          'Now -39266 (the braking burn is timed for the place it came down at (sim/plan.ts `LandingAim`), lit 76.8 s after the record’s instant on the run from the pad; what follows was written with it lit by the clock, when it was -35780). ' +
          `${PUBLISHED}. At 10:07, the instant the record has the cable bundle burn through, it is at 54 km where the record’s research has 80 to 100, as the coast from the injection (61 km): the burn’s instant, line and impulse and the record’s clock own it, not the drag (the coast’s miss). Read as osculating it was at 79 km and within`,
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
      apogee: { by: -15_890, slack: 300, why: `The osculating apogee at the cutoff, 219 km for the published 235: ${SHORT_V3}` },
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
          `It comes down 253 km across the track. ${COAST_V5}`,
      },
      'tass18.period': {
        by: 6.387,
        slack: 1,
        why: `At 15:00 on 18 June it goes round in 87.91 min where TASS has 87.8: 6.4 s against a tolerance of a tenth of a minute. ${COAST_V5}`,
      },
    },
    ascent: {
      perigee: {
        by: 6_300,
        slack: 500,
        why: `The law is flown level to the 181 km asked for, where the published perigee is 174.7 km. ${SHORT_V5}`,
      },
      apogee: {
        by: -22_800,
        slack: 300,
        why: `The osculating apogee at the cutoff, 199 km for the published 222: ${SHORT_V5}`,
      },
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
      crossTrack: {
        by: -71552.8,
        slack: 5_000,
        why:
          'Now -71553 (the braking burn is timed for the place it came down at (sim/plan.ts `LandingAim`), lit 430 s after the record’s instant on the run from the pad; what follows was written with it lit by the clock, when it was -241728). ' +
          `${PUBLISHED}. ${COAST_V5}`,
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
          `It comes down 176 km across the track. ${COAST_V6}`,
      },
    },
    ascent: {
      apogee: {
        by: -18_650,
        slack: 300,
        why: `The osculating apogee at the cutoff, 212 km for the published 231: ${SHORT_V6}`,
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
      apogee: { by: -16_800, slack: 300, why: `The osculating apogee at the cutoff, 220 km for the published 237: ${SHORT_V4}` },
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
  'usa/apollo/apollo-7': inUnits({
    shown: {
      entryG: {
        by: 2.329,
        slack: 0.3,
        why:
          'The entry’s greatest load is 5.66 g where the reconstructed trajectory has 3.33 and the structural analysis 3.41. The run comes through the interface 961 s after its deorbit burn where the flight took 851: its orbit there is not the flight’s (the apsides lie elsewhere after eleven days), though the burn is timed to bring it down at the place. ' +
          'The bank angles are still flown at the record’s instants after the burn, so the roll to 55 degrees comes 110 s early in the entry and the lift is turned aside before the load’s peak. They want commanding on the entry’s own events, as the crew and the computer flew them; that is not done. Not adjusted',
        short: 'the banks flown by the clock, early in a later entry',
      },
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
        why: `The drogue comes out 289 km short of where the ship landed, along the track. ${GT3_ENTRY}`,
      },
      crossTrack: {
        by: 77_024,
        slack: 4_000,
        why: `And 77 km to the right of it: the bank held to the right, the way the target lay. ${GT3_ENTRY}`,
      },
    },
    shown: {
      'after-6000.perigee': {
        by: 7_015,
        slack: 1_500,
        why: `165.5 km after the first burn where the ground called 85.6 nautical miles (158.5 km); from the published orbit it is 161.8 and holds. ${GT3_SHOWN}`,
      },
      'after-15900.perigee': {
        by: -15_907,
        slack: 1_500,
        why: `67.4 km where SP-138 has 83.3. ${GT3_SHOWN}; and as the coast’s, cause not established`,
      },
      alongTrack: { by: -200_000, slack: 10_000, why: `200 km short of where it landed, along the track. ${GT3_SHOWN}. ${GT3_ENTRY}` },
      crossTrack: { by: 36_420, slack: 4_000, why: `36 km to the right of it. ${GT3_SHOWN}. ${GT3_ENTRY}` },
    },
  }),
  'usa/gemini/gt-5': inUnits({
    ascent: {
      'beco.altitude': { by: -6_945, slack: 500, why: GT5_PITCH, short: 'the pitch rates as printed' },
      'beco.climb': { by: -4.548, slack: 0.2, why: GT5_PITCH, short: 'the pitch rates as printed' },
    },
    coast: {
      'after-680000.apogee': {
        by: 16_661,
        slack: 1_500,
        why: `303.4 km on the last day where the tracking has 154.8 nautical miles (286.7 km). ${GT5_DECAY}`,
        short: 'flown end on, where it drifted',
      },
      ejectionAt: {
        by: 826.1,
        slack: 40,
        why: `The drogue comes out 826 s after the record’s 190:49:19. ${GT5_LATE}. ${GT5_DECAY}`,
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
        why: `303.0 km on the last day where the tracking has 154.8 nautical miles (286.7 km). ${GT5_DECAY}`,
        short: 'flown end on, where it drifted',
      },
      ejectionAt: {
        by: 678.7,
        slack: 40,
        why: `The drogue comes out 679 s after the record’s 190:49:19. ${GT5_LATE}. ${GT5_DECAY}`,
        short: 'the burn timed for the landing place',
      },
    },
    descent: {
      'reentry-module.at': {
        by: 750.4,
        slack: 40,
        why: `The ship is down 750 s after the record’s 190:55:14: the burn lit late and the entry longer (the drogue’s miss), and 71 s more under the main, flown at the 31.6 ft/s NASA CR-1106 gives the type, where the record has it from 10,600 ft at 190:51:16 to the sea at 190:55:14, 44.5 ft/s on the average. ${GT5_LATE}`,
        short: 'the burn timed for the landing place',
      },
    },
  }),
  'usa/gemini/gt-4': inUnits({
    shown: {
      'after-184080.apogee': {
        by: 10_325,
        slack: 1_500,
        why: `Apogee 286.5 km in revolution 33 where Table 4-III has 276.1. ${GT4_DECAY}. ${GT4_SHOWN}`,
      },
      'after-291696.apogee': {
        by: 16_527,
        slack: 1_500,
        why: `Apogee 277.7 km in revolution 52 where Table 4-III has 261.1. ${GT4_DECAY}. ${GT4_SHOWN}`,
      },
      'after-342672.apogee': {
        by: 20_166,
        slack: 1_500,
        why: `Apogee 273.0 km in revolution 61 where Table 4-III has 252.8. ${GT4_DECAY}. ${GT4_SHOWN}`,
      },
      'after-351300.perigee': {
        by: 6_977,
        slack: 1_500,
        why: `The burn before retrofire, timed with retrofire for the landing place and read as long after it as the record’s reading, leaves a vacuum perigee of 85.3 km where the record has 42.3 nautical miles, 78.3 km: its 134 ft/s, blunt end forward, from an orbit 20 km higher at apogee than the record’s. ${GT4_DECAY}. ${GT4_SHOWN}`,
      },
      ejectionAt: {
        by: 618.2,
        slack: 30,
        why: `The drogue comes out 618 s after the record’s 97:50:53, at 40,000 ft as recorded. ${GT4_LATE}. ${GT4_DECAY}`,
      },
      crossTrack: {
        by: 78_514,
        slack: 8_000,
        why: `It comes down 79 km to the right of where Gemini IV landed (within 10 km along the track). ${GT4_ACROSS}. ${GT4_SHOWN}`,
      },
    },
    coast: {
      'after-184080.perigee': {
        by: 6_945,
        slack: 1_000,
        why: `Perigee 169.9 km in revolution 33 where Table 4-III has 163.0. ${GT4_DECAY}`,
      },
      'after-291696.perigee': {
        by: 6_372,
        slack: 1_000,
        why: `Perigee 168.2 km in revolution 52 where Table 4-III has 161.9. ${GT4_DECAY}`,
      },
      'after-291696.apogee': {
        by: 15_735,
        slack: 1_500,
        why: `Apogee 276.9 km in revolution 52 where Table 4-III has 261.1. ${GT4_DECAY}`,
      },
      'after-342672.perigee': {
        by: 7_884,
        slack: 1_000,
        why: `Perigee 167.3 km in revolution 61 where Table 4-III has 159.5. ${GT4_DECAY}`,
      },
      'after-342672.apogee': {
        by: 19_891,
        slack: 1_500,
        why: `Apogee 272.7 km in revolution 61 where Table 4-III has 252.8. ${GT4_DECAY}`,
      },
      ejectionAt: {
        by: 675.6,
        slack: 30,
        why: `The drogue comes out 676 s after the record’s 97:50:53, at 40,000 ft as recorded. ${GT4_LATE}. ${GT4_DECAY}`,
      },
      crossTrack: {
        by: 114_681,
        slack: 8_000,
        why: `It comes down 115 km to the right of where Gemini IV landed (within 10 km along the track). ${GT4_ACROSS}`,
      },
    },
    descent: {
      'reentry-module.at': {
        by: 675.2,
        slack: 30,
        why: `Down 675 s after the record’s 97:56:12: the drogue out 618 s late (the coast’s miss), and the rest the main at the type’s 10,600 ft on the Technical Summary’s mean rate. ${GT4_LATE}`,
      },
    },
  }),
  'usa/gemini/gt-7': inUnits({
    ascent: {},
    coast: {
      'after-433800.perigee': {
        by: -11_790,
        slack: 1_500,
        why: `From the published orbit the two circularising burns leave a perigee of 285.5 km where the report has 160.5 nautical miles (297.2 km). ${GT7_CIRCLE}`,
      },
      'after-433800.apogee': {
        by: 15_110,
        slack: 1_500,
        why: `And an apogee of 316.6 km where the report has 162.8 nautical miles (301.5 km). ${GT7_CIRCLE}`,
      },
      'after-1184400.perigee': {
        by: -8_381,
        slack: 1_500,
        why: `In the last revolution 281.5 km where the report has 156.5 nautical miles (289.8 km). ${GT7_CIRCLE}`,
      },
      'after-1184400.apogee': {
        by: 8_043,
        slack: 1_500,
        why: `And 311.0 km where the report has 163.6 nautical miles (303.0 km). ${GT7_CIRCLE}`,
      },
      ejectionAt: { by: 153.7, slack: 15, why: `The drogue comes out 154 s after the record's 330:29:30. ${GT7_ENTRY}` },
      crossTrack: { by: -45_150, slack: 6_000, why: `It comes down 45 km to the left of where the ship landed. ${GT7_ENTRY}` },
    },
    shown: {
      'after-16200.apogee': {
        by: 7_465,
        slack: 1_000,
        why: `The apogee after the perigee adjust is 330.3 km where the report has 174.3 nautical miles (322.8 km). ${GT7_ORBIT}`,
      },
      'after-253800.apogee': {
        by: 7_724,
        slack: 1_000,
        why: `The apogee after the phase adjust is 324.2 km where the report has 170.9 nautical miles (316.5 km). ${GT7_ORBIT}`,
      },
      'after-433800.perigee': {
        by: -10_154,
        slack: 1_500,
        why: `The two circularising burns leave a perigee of 287.1 km where the report has 160.5 nautical miles (297.2 km). ${GT7_CIRCLE}`,
      },
      'after-433800.apogee': {
        by: 12_873,
        slack: 1_500,
        why: `And an apogee of 314.4 km where the report has 162.8 nautical miles (301.5 km). ${GT7_CIRCLE}`,
      },
      'after-1184400.perigee': {
        by: -6_832,
        slack: 1_500,
        why: `In the last revolution the perigee is 283.0 km where the report has 156.5 nautical miles (289.8 km). ${GT7_CIRCLE}`,
      },
      ejectionAt: { by: 63.57, slack: 10, why: `The drogue comes out at 330:30:34, 64 s after the record's 330:29:30. ${GT7_ENTRY}` },
      crossTrack: {
        by: -80_944,
        slack: 8_000,
        why: `It comes down 81 km to the left of where the ship landed: the bank is held to the left all the way, where the crew reversed it four or five times to null the cross-range. ${GT7_ENTRY}`,
      },
    },
    descent: {
      'reentry-module.at': {
        by: 124.4,
        slack: 15,
        why: `Down at 330:37:05, 124 s after the record: the drogue out 64 s late, and the rest the parachutes, the main at the type's height. ${GT7_ENTRY}`,
      },
    },
  }),
  'usa/gemini/gt-6a': inUnits({
    ascent: {},
    coast: {
      'after-90600.perigee': { by: -8_339, slack: 1_500, why: GT6A_RETRO },
      crossTrack: {
        by: -186_559,
        slack: 15_000,
        why: `From the published orbit it comes down 187 km to the left of where the ship landed. ${GT6A_ENTRY}`,
      },
    },
    shown: {
      'after-90600.perigee': { by: -8_339, slack: 1_500, why: GT6A_RETRO },
      crossTrack: { by: -170_672, slack: 15_000, why: `It comes down 171 km to the left of where the ship landed. ${GT6A_ENTRY}` },
    },
    descent: {},
  }),
  // Soyuz 3: the record from the pad and from its published orbit (missions/ussr/soyuz/flights/soyuz-3/mission.md, "Against the record")
  'ussr/soyuz/soyuz-3': inUnits({
    coast: {
      'approached.apogee': {
        by: -15_218,
        slack: 1_000,
        why: `At 18:50 on 27 October its apogee is 236.8 km where TASS has 252, its perigee 182.8 where TASS has 179. ${APPROACH_S3}`,
        short: 'the approach flown as one burn',
      },
      'correction.apogee': {
        by: -10_774,
        slack: 1_000,
        why: `After the correction of 28 October its apogee is 233.4 km where Mishin has 244.2 (TASS 244), its perigee 204.0 where he has 199.4. ${APPROACH_S3} ${CORRECTION_S3}`,
        short: 'the approach flown as one burn',
      },
      'correction.period': {
        by: -16.38,
        slack: 2,
        why: `It goes round in 88.54 min after the correction where Mishin has 88.81: 16 s against a tolerance of 15. ${APPROACH_S3} ${CORRECTION_S3}`,
        short: 'the approach flown as one burn',
      },
      crossTrack: {
        by: 145_567,
        slack: 5_000,
        why: `It comes down 146 km across the track. ${ACROSS_S3}`,
        short: 'the burn timed for the landing place',
      },
    },
    ascent: {},
    shown: {
      'approached.apogee': {
        by: -16_679,
        slack: 1_000,
        why: `From the pad: its apogee 235.3 km at 18:50 on 27 October where TASS has 252. ${APPROACH_S3}`,
        short: 'the approach flown as one burn',
      },
      'correction.apogee': {
        by: -11_621,
        slack: 1_000,
        why: `From the pad: its apogee 232.6 km after the correction where Mishin has 244.2. ${APPROACH_S3} ${CORRECTION_S3}`,
        short: 'the approach flown as one burn',
      },
      'correction.period': {
        by: -15.96,
        slack: 2,
        why: `From the pad: 88.54 min after the correction where Mishin has 88.81. ${APPROACH_S3} ${CORRECTION_S3}`,
        short: 'the approach flown as one burn',
      },
      crossTrack: {
        by: 169_669,
        slack: 5_000,
        why: `From the pad it comes down 170 km across the track. ${ACROSS_S3}`,
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
  'ussr/voskhod/voskhod-1': inUnits({
    coast: {
      crossTrack: {
        by: -76093.3,
        slack: 5_000,
        why:
          'Now -76093 (the braking burn is timed for the place it came down at (sim/plan.ts `LandingAim`), lit 116 s after the record’s instant on the run from the pad; what follows was written with it lit by the clock, when it was -106456). ' +
          `It comes down 106 km across the track. ${COAST_VK1}`,
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
      crossTrack: { by: -85_499, slack: 5_000, why: `It comes down 85 km across the track. ${COAST_VK2}` },
      alongTrack: { by: -583_280, slack: 20_000, why: `It comes down 583 km short along the track, in Mari El. ${COAST_VK2}` },
    },
    ascent: {
      perigee: {
        by: 6_500,
        slack: 500,
        why: `The law is flown level to the planned 180 km, where the perigee reached was 173.5 km. ${SHORT_VK2}`,
      },
      apogee: {
        by: -20_420,
        slack: 300,
        why: `The osculating apogee at the cutoff, 477 km for the published 498: ${SHORT_VK2}`,
      },
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
  'usa/gemini/gatv-5002': inUnits({
    ascent: {
      'beco.altitude': { by: -6130, slack: 1000, why: TARGET_LOW, short: 'the Atlas’s pitch programme not found' },
      'beco.climb': { by: -1.628, slack: 0.2, why: TARGET_FLAT, short: 'the Atlas’s pitch programme not found' },
      'seco.altitude': { by: -10500, slack: 1000, why: TARGET_LOW, short: 'the Atlas’s pitch programme not found' },
      'veco.altitude': { by: -10390, slack: 1000, why: TARGET_LOW, short: 'the Atlas’s pitch programme not found' },
      'agena-start.altitude': { by: -10160, slack: 1000, why: TARGET_LOW, short: 'the Atlas’s pitch programme not found' },
    },
  }),
  'usa/gemini/gatv-5003': inUnits({
    ascent: {
      'beco.altitude': { by: -5315, slack: 1000, why: TARGET_LOW, short: 'the Atlas’s pitch programme not found' },
      'beco.climb': { by: -1.013, slack: 0.2, why: TARGET_FLAT, short: 'the Atlas’s pitch programme not found' },
      'seco.altitude': { by: -9081, slack: 1000, why: TARGET_LOW, short: 'the Atlas’s pitch programme not found' },
      'veco.altitude': { by: -8006, slack: 1000, why: TARGET_LOW, short: 'the Atlas’s pitch programme not found' },
      'agena-start.altitude': { by: -10520, slack: 1000, why: TARGET_LOW, short: 'the Atlas’s pitch programme not found' },
    },
  }),
  'usa/gemini/atda': inUnits({
    ascent: {
      'beco.altitude': { by: -5752, slack: 1000, why: TARGET_LOW, short: 'the Atlas’s pitch programme not found' },
      'beco.climb': { by: -4.653, slack: 0.2, why: ATDA_FLAT, short: 'the ATDA Atlas’s own programme not found' },
      apogee: { by: 17020, slack: 1000, why: ATDA_APOGEE, short: 'the verniers’ figures' },
    },
  }),
  'usa/gemini/gatv-5005': inUnits({
    ascent: {
      'beco.altitude': { by: -6868, slack: 1000, why: TARGET_LOW, short: 'the Atlas’s pitch programme not found' },
      'beco.climb': { by: -1.68, slack: 0.2, why: TARGET_FLAT, short: 'the Atlas’s pitch programme not found' },
      'seco.altitude': { by: -11110, slack: 1000, why: TARGET_LOW, short: 'the Atlas’s pitch programme not found' },
      'veco.altitude': { by: -11050, slack: 1000, why: TARGET_LOW, short: 'the Atlas’s pitch programme not found' },
      'agena-start.altitude': { by: -10630, slack: 1000, why: TARGET_LOW, short: 'the Atlas’s pitch programme not found' },
      cutoffAt: { by: -4.465, slack: 0.5, why: TARGET_EARLY, short: 'the 8247’s impulse, secondary' },
    },
  }),
  'usa/gemini/gatv-5006': inUnits({
    ascent: {
      'beco.altitude': { by: -5757, slack: 1000, why: TARGET_LOW, short: 'the Atlas’s pitch programme not found' },
      'beco.climb': { by: -1.451, slack: 0.2, why: TARGET_FLAT, short: 'the Atlas’s pitch programme not found' },
      'seco.altitude': { by: -9331, slack: 1000, why: TARGET_LOW, short: 'the Atlas’s pitch programme not found' },
      'seco.speed': { by: 63.38, slack: 5, why: TARGET_FAST, short: '5302’s thrusts, not 5306’s' },
      'veco.altitude': { by: -9497, slack: 1000, why: TARGET_LOW, short: 'the Atlas’s pitch programme not found' },
      'veco.speed': { by: 61.12, slack: 5, why: TARGET_FAST, short: '5302’s thrusts, not 5306’s' },
      'agena-start.altitude': { by: -8865, slack: 1000, why: TARGET_LOW, short: 'the Atlas’s pitch programme not found' },
      apogee: { by: 10290, slack: 1000, why: TARGET_APOGEE, short: 'cut on the planned speed' },
    },
  }),
  'usa/gemini/gatv-5001': inUnits({
    ascent: {
      'beco.altitude': { by: -5710, slack: 1000, why: TARGET_LOW, short: 'the Atlas’s pitch programme not found' },
      'beco.climb': { by: -1.474, slack: 0.2, why: TARGET_FLAT, short: 'the Atlas’s pitch programme not found' },
      'seco.altitude': { by: -10050, slack: 1000, why: TARGET_LOW, short: 'the Atlas’s pitch programme not found' },
      'veco.altitude': { by: -10170, slack: 1000, why: TARGET_LOW, short: 'the Atlas’s pitch programme not found' },
      'agena-start.altitude': { by: -10030, slack: 1000, why: TARGET_LOW, short: 'the Atlas’s pitch programme not found' },
      apogee: { by: 8799, slack: 1000, why: TARGET_APOGEE, short: 'cut on the planned speed' },
    },
  }),
};
