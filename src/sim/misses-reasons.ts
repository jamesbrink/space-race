/**
 * Why each recorded miss stands (misses.ts `MISSES`, its `why`): the reasoning in full, kept apart from the table that
 * holds each run to it. Several misses share one, and one is built on another; nothing here is read but through the table.
 */
export const A8_INJECTION =
  'The injection the run reaches is not the record’s, and the Moon is 380,000 km on. The run’s ascent puts the stack in its parking orbit 10.6 s late (the stack’s shortfall, recorded under its ascent); the second burn is lit by the clock and cut on the record’s speed 1.5 s before the record’s cutoff; at the S-IVB/spacecraft separation fix (12,056.3 s) the run was 0.9° of longitude behind the record’s place and 5.5 m/s slower, on an orbit of eccentricity 0.9737 against 0.9743, before the S-II’s trajectory match and AS-503’s air were flown (1,544 n. mi. over the Moon then). Left alone from the spacecraft’s parting (its push apart, 0.5 m/s, estimated) it passes 1,694 n. mi. over the Moon 2.4 h after the Mission Report’s solution for the injection, which is 130 n. mi. under the surface (Table 5-III; its solutions move 131 n. mi. for the 1.1 ft/s of the first separation manoeuvre). This run is the injection left alone, flown on the flight’s plan to the parting and no further: it does not close when the firings after it are flown, for it is the injection’s own error. The flight’s run flies them, and its first midcourse correction takes this error out on the way (the shown run’s mcc-1.velocity, 155.6 ft/s for the flight’s 20.4), so that it comes to the insertion where the flight did (76.5 n. mi. up at 8,399 ft/s, Table 5-II: 76.6 and 8,391). The coast itself is the same flown about the Earth throughout on rails, within 2 m through the sphere and past the Moon (tests/lunargravity.test.mjs). Not adjusted';
export const A8_MCC1 =
  'The injection the run reaches is not the record’s (the lunar run, below: left alone from the parting it passes far over the Moon and hours after the Mission Report’s solution for the injection, -130.2 n. mi. at 69:13:58), and the first correction is solved on the run’s own state for what the flight’s reached, 66.3 n. mi. at 69:10:40 (Table 5-III), and for the plane of the planned 12-degree orbit (the press kit): it takes 155.6 ft/s where the flight’s took 20.4 (24.8 calculated, §5.4) from a trajectory its two separation manoeuvres had moved to 458.1 n. mi. The run’s approach cannot be turned into the planned plane from the injection it reached: the nearest it comes is 166.2 degrees to the Moon’s equator, 13.8 from retrograde, and that is what it is left at. Not adjusted';
export const A8_MCC2 =
  'Solved as the least impulse that gives the pericynthion the second correction reached and its time (65.8 n. mi. at 69:10:39, Table 5-III): the run’s own first correction met its height and time to the metre and the second, so nothing is left to correct but the half mile the report’s two solutions differ by. The flight’s 1.4 ft/s corrected navigation and execution errors the run does not have, and was not the least (Table 6.9-II has its components in the platform’s axes: 1.19, 0.43 and 1.77 ft/s). Not adjusted';
export const A8_MCC3 =
  'Solved as the least impulse that takes the entry interface’s angle from what the transearth injection left it on (-6.117 degrees: the run’s injection reaches it to a thousandth, flying no execution error) to what the correction gave (-6.395, Table 5-IV): 0.62 ft/s. The flight’s 4.8 ft/s was flown against the motion, "to decrease the inertial velocity" (§5.7), which is not the least. Not adjusted';
export const A8_ENTRY =
  'The run comes through the interface at what the third midcourse correction was aimed at, Table 5-IV’s -6.395 degrees from the best-estimate vectors after it, where the flight came through at -6.50 (Table 5-V): a shallower entry, its first peak 6.04 g against the flight’s 6.84. The command module flies CM-107’s trim aerodynamics (TN D-6725, assumed for CM-103) and the computer navigates on the run’s own state, with no error of its platform. Not adjusted';
export const SATURN_FLOWN =
  'The run flies the F-1s’ and the S-II J-2s’ cutoff impulse (their flight evaluations’ §5.4 and §6.4: plan.ts EngineDef.decay), the S-II’s ullage motors where it carried them (JointDef.ahead), the J-2s’ flow after the mixture-ratio shift at the impulse the low ratio gave (Stage.drawn), its J-2s’ figures with AS-503’s trajectory match (sii.match: its Table 6-3, a simulation fitted to the tracked trajectory) and the Saturn V’s own air, AS-503’s forebody coefficient and S-IC base pressure (§20.2, saturnVDrag)';
export const SIC_A11 = `The S-IC flies flatter than the record on the record’s own attitude commands (its flight evaluation’s Fig. 10-4, traced along the middle of its stroke and flown open): at the centre engine’s cutoff it is lower and faster, at the separation 1.8° flatter. The figure’s time axis has no offset (its gridline at range zero labelled, its plateau and the guidance’s step where Table 2-2 has them); read along the stroke’s upper edge, as first read, it is 2.4° flatter still. Its thrust is Fig. 5-3’s within a per cent or two and its mass the mass tables’ to a ton at each cutoff; AS-503’s own air (§20.2), now flown, leaves it as flat; the flight path angles are the space-fixed ones (the vertical speeds the tables give agree with the heights climbed), it is as fast Earth-fixed (Table 4-1) as space-fixed, and the geocentric vertical would move it 0.06°. Flown on Apollo 12’s programme (AS-507’s Fig. 10-5, the same azimuth) it comes to the record’s centre cutoff within 1 m/s and 70 m and to its separation within 16 m/s, 0.9 km and 1.1°: what is left is in the tracing of Fig. 10-4’s first hundred seconds (2 to 5° further over than AS-505’s and AS-507’s from 40 to 80 s, its line leaving zero 7 s before the programme’s start), and the control system’s following of its command, not flown. ${SATURN_FLOWN}. See apollo-11/mission.md. Not adjusted`;
export const SII_A11 =
  'The S-II’s closed loop, flown as the law’s one linear tangent against the turning local level from 204 s (the iterative guidance’s own command fell near evenly in the inertial frame, Fig. 10-4), takes the stack to the record’s speeds within 30 m/s but lower, from the S-IC’s flatter start. See apollo-11/mission.md. Not adjusted';
export const TLI_A11 =
  'The translunar injection, cut on its speed (Table 4-2’s space-fixed 10,841.0 m/s), is cut 6.0 s after the record’s cutoff: the stack comes to it with more of the S-IVB’s propellant left from a first burn that ends on the record’s instant, and its C3, eccentricity and mass hold their checks. See apollo-11/mission.md. Not adjusted';
export const SIC_A14 = `The S-IC flies the record’s own attitude commands, its flight evaluation’s Fig. 9-4 read with its frame beginning at 9.0 s and 1.6° on the scale of the rest (its first intervals short on both axes, its yaw panel drawing none of the tower clearance yaw, its pitch line coming into the frame after the programme’s start): the greatest dynamic pressure is then the record’s, but the stack climbs steeper and comes to the S-IC’s separation 38 m/s slow and 1.5 km high, within the checks, and the S-IVB, from there, burns 9.3 s longer than the record’s to make the parking orbit (some 0.19 s for each m/s of energy short at the S-IC’s separation, as on every Saturn V). Read as first read, its first hundred seconds drawn short, the S-IC flew flatter (4.3 kPa over at the greatest dynamic pressure) and the S-II held its checks. ${SATURN_FLOWN}. See apollo-14/mission.md. Not adjusted`;
export const SIVB_SHORT = `The S-IVB’s guidance burns longer than the record’s to make the parking orbit, which it reaches within a few hundred metres of the record’s heights: the stack comes to it short of the record’s energy, some 0.19 s of the S-IVB for each m/s short at the S-IC’s separation (where the S-IC, on this flight’s own pitch programme, is within its checks) and a few seconds more that nothing read accounts for. The S-II’s mass at its cutoff is the mass tables’ within a ton; its thrust is flat through the high ratio (its evaluation’s Fig. 6-3); its closed loop, flown as the law’s linear tangent, gives the same cutoff within 0.4 s measured against a level held among the stars or with a second rate after the centre cutoff. Its start’s rising thrust (AS-503’s Fig. 6-4), flown, gives some 1 s of it back, but is not flown: a curve against the clock cannot follow an engine a hand lights at another time. ${SATURN_FLOWN}. Not adjusted`;

export const BOOSTER =
  'the powered flight ends 4 per cent too fast. It leaves the pad at only 1.19 g, so most of the thrust goes to holding it up and the speed gained is ' +
  'four times as sensitive as the thrust: one per cent in thrust, flow or liftoff weight is 3 to 4 per cent in speed (see the last test). The engine is two figures ' +
  'from a summary table (engine.thrust, engine.isp), held steady from liftoff to cutoff with no build-up, tail-off or jet-vane loss; the real vehicle was cut off by ' +
  'its velocity integrator, which hid exactly this. The whole vehicle’s drag (ascentDrag) is the other unknown, but it would have to be half as much again';
export const BURNOUT = 'the booster is modelled burning out about 4 per cent too fast';

export const MR8 =
  'the powered flight ends 4 per cent too fast, as Freedom 7’s does and for the same reason: off the pad at 1.20 g, one per cent in thrust, flow or liftoff weight ' +
  'is 3 to 4 per cent in speed, and the engine is two figures from a summary table (79,220 lbf and 217.4 s: TM X-53107, Table 8-1) held steady from liftoff to ' +
  'cutoff with no build-up, tail-off or jet-vane loss. The real vehicle was cut off by its velocity integrator, which hid exactly this; MR-8’s own thrust ' +
  'curve and cutoff to the tenth are in reports not found. Nothing was fitted to bring it in';
export const HIGHER = 'follows from the speed at separation: it climbs higher';
/** Liberty Bell 7's main came out at 12,300 ft by the history, and the record's times leave it too little time to come down from there. */
export const MAIN_HEIGHT =
  'two things. About 20 s is the higher apogee, as the parachutes’ times are. The rest is the main’s height: This New Ocean (p. 372) has it out at 12,300 ft, ' +
  'and the record has 5 min 23 s from the main to the sea (10:14 to 15:37), 11.6 m/s on the average; the canopy as derived on Freedom 7 (main.dragArea) brings ' +
  'the spacecraft down at 8.8 m/s, and the pilot read 30 to 32 ft/s (9 to 10 m/s) on it. From 10,000 ft, the design’s height, the times would agree. Either the ' +
  'history’s height is not the barostat’s, or the spacecraft came down faster than the canopy’s figure: the record read does not say which, and nothing is changed';

export const SAME_SHAPE =
  'the air on the spacecraft with its tower on is Freedom 7’s estimates: one drag curve end on (TM X-491, at no angle of attack), a side’s drag area and a heat shield’s slope that are ours. ' +
  'It tumbles, as the trial did, and how much of the climb the air takes then is those estimates';
export const UNKNOWN_BEACH =
  'what spacecraft No. 1 weighed that day and how far its launcher leaned are not in anything read: it is flown here as Freedom 7’s spacecraft (3,764 lb with its tower, the retropack dropped) off the 1959 trial’s 71 degrees. ' +
  'No. 1 was stripped of most of its systems (This New Ocean, p. 261), so it was lighter and went higher and stayed up longer';
export const SHORT =
  'The vehicle as the record reads it reaches an orbit, 14 m/s short of the published one. Block E is cut where its integrator was set (2,283.52 m/s of apparent velocity, the flight task) and that comes at 676.4 s, ' +
  'the recorded instant to a second, with 46 kg left, level at 180 km with 7,827 m/s where 181 by 327 km needs 7,841: so the third stage as recorded is right, and what is left is the first two stages’. ' +
  'What owns it (the last test): the throttling documented in kind and estimated in level, the strap-ons’ intermediate stage (none: +143 m/s; at 80 per cent: +71) and above all the core’s final stage, ' +
  'flown since November 2026 for the cyclogram’s 7.00 s (vostok-8k72k.ts `FINAL_STAGE`; as the “about 10 s” read off Siddiqi’s 300 s it left the vehicle 147 m/s short, its perigee under the ground: each second of it is 44 m/s), ' +
  'with 3.7 t left in the core at its cutoff, which a vehicle with tank-emptying regulators would not carry. On the day the core ran 22 m/s over its design (NIIP-5’s report), which is the apogee the record has and this run has not. Not adjusted';
export const PUBLISHED =
  'The coast is flown on from the state the ascent left the spacecraft in, with its share of the joint’s push and nothing else (until November 2026 its speed there was set to the published orbit’s: staged.ts `flyWhole`)';
/** What an ascent's check of the orbit at the last cutoff reads, where the guidance cut the stage on the published period. */
export const OSCULATING =
  'What this check reads is the osculating orbit at the cutoff, which is not the published one: the period flown is the record’s (the spacecraft is left on it to within a second: tests/onestate.test.mjs), ' +
  'and the published heights are a mean orbit’s over the ball the flight’s own heights and period imply (world/meanelements.ts), some kilometres off the osculating apsides and, where the published heights and period do not agree with one another, held by the period';
export const SHORT_TYPE =
  'Vostok 2’s ascent is the type’s, flown on Vostok 1’s instants (no document of E103-17’s ascent was found: its mission.md), Block E cut by the guidance where the orbit reached has the published period, ' +
  `its own integrator’s setting not being known (vostok-8k72k.ts \`BLOCK_E_CUT\`): at 676.0 s, level at the planned 180 km. ${OSCULATING}`;
/** Vostok 3's ascent is the type's but for the third stage's cutoff, which Kamanin heard counted. */
export const SHORT_V3 =
  'Vostok 3’s ascent is the type’s, flown on Vostok 1’s instants (no cyclogram or flight task of E103-23 was found: its mission.md), Block E cut by the guidance where the orbit reached has the period flown for this flight, ' +
  `its own integrator’s setting not being known (vostok-8k72k.ts \`BLOCK_E_CUT\`): at 677.2 s, level at the planned 180 km. ${OSCULATING}`;
/** Where Vostok 1's and Vostok 5's own heights and period put the apsis, against where the run has the perigee. */
export const APSIS_OPEN =
  'Each flight is flown on the ball its own published heights and period imply (orbital.ts `heightsBall`), so its figures hold. For Vostok 1 (6,369.1 km) and Vostok 5 (6,366.7) that is the ellipsoid under an apsis at 41 and 47 degrees, where the run puts the perigee at the injection, 63 degrees N: an open inconsistency, recorded and not resolved (tests/apsis.test.mjs, the flights’ mission.md)';
/** Vostok 5's ascent is Vostok 1's, as Vostok 2's is: it falls short of an orbit for the same reasons. */
export const SHORT_V5 =
  'Vostok 5’s ascent is Vostok 1’s, flown on its instants (no document of E103-24’s ascent was found: its mission.md), Block E cut by the guidance where the orbit reached has the published period, ' +
  `its own integrator’s setting not being known (vostok-8k72k.ts \`BLOCK_E_CUT\`): at 676.3 s, level at the 181 km asked for, where the published perigee is 174.7. That the stage fell short on the day (Siddiqi, no source) is not flown. ${OSCULATING}`;
/**
 * Five days flown round in the day's thermosphere on a ship's free-molecular drag: the orbit now falls as TASS's did to
 * within 4 km, and what is left of the landing's miss is its last tenth of a minute carried round.
 */
export const COAST_V5 =
  'Five days are flown round (81 revolutions) in the thermosphere of the days’ own Sun (Jacchia 1971 on 13 to 19 June 1963’s indices) on the ship’s free-molecular drag, to a burn derived from the pilot’s landing (13:38:06). ' +
  'The orbit falls as TASS’s did: at 15:00 on 18 June it is 163.3 by 197.4 km where TASS has 159 by 193 (both within 5 km, on the ball the flight’s own heights and period imply; TASS’s three of that instant imply one 0.9 km smaller), so the earlier reading, that the miss was the day’s air, is superseded: in the 1976 mean air on the ball’s continuum drag the run had 174.7 by 222.5 km there and came down 5,647 km short. ' +
  'What is left is the period: at that instant the run goes round in 87.91 min where TASS has 87.8, so over the last days the ship comes round a little late each time; as a diagnosis, the published period 0.05 min shorter (88.22 for 88.27) brings it down 86 km beyond the record’s landing, and the burn five minutes later 813 km short. ' +
  'The period is published to a hundredth of a minute (TASS, 22:12 on 14 June), so a twentieth is not its rounding, and read as anomalistic or Keplerian the nodal period flown would be longer still. ' +
  'Read every three hours against TASS’s three later orbits, the period flown is TASS’s within its rounding for the first day (1.2 s short at 22:12 on the 14th, 0.2 s at 15:00 on the 15th) and 6.4 s long by 15:00 on the 18th: the orbit decays too slowly over days two to four, by more than TASS’s rounding, and that lag carried round to the burn is some 253 s, 1,850 km of the 3,314. ' +
  'No drag figure is shown to own it: twice the joined ship’s area (a diagnosis) makes the first day’s periods 2.4 and 5.2 s short of TASS’s and brings the ship down before the fourth, and lands Vostok 4 6,342 km long. The rest is within the burn’s derived minute. Not adjusted';
/** Vostok 6's ascent is Vostok 1's, as Vostok 5's is. */
export const SHORT_V6 =
  'Vostok 6’s ascent is Vostok 1’s, flown on its instants (no document of E103-25’s ascent was found: its mission.md), Block E cut by the guidance where the orbit reached has the published period, ' +
  `its own integrator’s setting not being known (vostok-8k72k.ts \`BLOCK_E_CUT\`): at 676.0 s, level at the 183 km taken as asked for. ${OSCULATING}`;
/** Three days flown round to a burn derived from the ground's command: the landing's miss, and what it is worth in each thing not known. */
export const COAST_V6 =
  'Three days are flown round (48 revolutions) in the days’ own thermosphere (Jacchia 1971) on the ship’s free-molecular drag, to a burn at 10:50:40 derived from the cycle’s command at 09:39:40 and “approximately” its 71st minute (Kogutenko). ' +
  'The orbit falls as TASS’s did: at 15:00 on 18 June it is 176.0 by 219.8 km and 88.15 min where TASS has 174 by 218 km and 88.1 (all within tolerance). In the 1976 mean air on the ball’s continuum drag it came down 3,757 km short. ' +
  'Against TASS’s two orbits the period flown is within their rounding (1.5 s short at 22:00 on the 16th, 2.8 s long at 15:00 on the 18th): carried round to the burn that is some 61 s, 440 km of the 2,726, so the decay is not shown to own the miss. What each thing not known is worth, as diagnoses and not inputs: the published period is to a tenth of a minute, and 0.05 min less brings it 1,211 km nearer, 0.05 min more 923 km further; the burn a minute later 401 km nearer, five minutes later 2,381 km (it would then land 20 to 25 minutes after the burn, where Vostok 1’s pilot took 28). Not established which. Not adjusted';
/** Voskhod 1's day round: a burn whose start one account gives, whose length and impulse none does. */
export const COAST_VK1 =
  'Sixteen revolutions are flown in the day’s thermosphere to a burn at 10:18:58 (one secondary account’s seconds: Zak, from Baturin) aimed from the Sun as a Vostok’s, for the TDU-1’s 45 s and the Vostok’s 136 m/s (neither found for this flight). ' +
  'As diagnoses, not inputs: the burn a minute later lands it 475 km short, five minutes later 4,146 km long, and at Chertok’s programmed 10:08:56 4,367 km short; the published period 0.05 min shorter 712 km short, longer 1,393; aimed straight against the motion 1,419 km short; 100 m/s 1,084 km long, 155 m/s 1,725 km short. ' +
  'The record cannot hold a landing to a hundred kilometres: its burn’s length and impulse are not known. What owns the miss is not established. Not adjusted';
/** Voskhod 2's ascent: as Voskhod 1's, to the planned 180 km, where the record's orbit went higher than planned. */
export const SHORT_VK2 =
  'Voskhod 2’s ascent is flown on the 11A57’s figures as this record reads them (the Vostok-K’s blocks with the later engines’ thrusts, Block I at its maker’s thrust and impulse on Brügge’s load) and the crew’s instants, ' +
  'Block I cut by the guidance where the orbit reached has the published period, no setting of its own being known (voskhod-11a57-flown.ts `BLOCK_I_CUT`): at 537.1 s where the crew’s report has 523, with 117 kg left, level at the planned 180 km, ' +
  `where the orbit reached had its perigee at 173.5. The record’s orbit was higher than the planned 180 by 470 km, and no source read says why. ${OSCULATING}`;
/** Voskhod 2's day round, and the burn by hand. */
export const COAST_VK2 =
  'Eighteen revolutions are flown to the burn by hand at OKB-1’s commands (main valve 11:36:29.5, shutdown about 11:37:09), straight against the motion as Belyayev aimed it by eye, for 112 m/s worked from the engine’s measured 1,575 kgf over 39.5 s; the modules part at 11:50:56.5, as they did. ' +
  'The record’s own orbits on the ninth and eighteenth revolutions hold on the coast to 2 km. As diagnoses, not inputs: the burn a minute later lands it 138 km short, at the time read up to them (11:35:44) 904 km short; the published period 0.05 min shorter 278 km short, longer 875; 100 m/s 73 km short. ' +
  'The burn’s impulse is derived and its aim by eye is not known. What owns the miss is not established. Not adjusted';
/** Vostok 4's ascent is the type's throughout. */
export const SHORT_V4 =
  'Vostok 4’s ascent is the type’s, flown on Vostok 1’s instants (no document of E103-22’s ascent was found: its mission.md), Block E cut by the guidance where the orbit reached has the published period, ' +
  `its own integrator’s setting not being known (vostok-8k72k.ts \`BLOCK_E_CUT\`): at 676.3 s, level at the planned 180 km. ${OSCULATING}`;

/** Aurora 7's coast, from the published orbit and from where the ascent left it. */
export const MA7_RETRO =
  'The retrofire is flown as the tracking gave it (TN D-3814, p. 101): lit by hand at 04:33:10.3, held 36.5° below the level and 27° off in yaw, its push turned to the left of the ' +
  'motion, the three motors 3 per cent under their group’s 38,943 lb s, 124.5 m/s over the capsule in orbit (no weight at retrofire is printed). So flown it comes down 537 km beyond ' +
  'the planned point, where the report has some 250 nautical miles (463 km); flown at 34° with no yaw, 3 s sooner and at the group’s impulse, it comes down 33 km from it ' +
  '(tests/orbital.test.mjs prints each). The yaw is worth 374 km here and 175 statute miles (282 km) in This New Ocean (p. 454), the low impulse 156 km against 60 miles: the simulator ' +
  'gives the retrofire’s errors more than the record does. Which input owns the rest is not established; not adjusted';
export const MA7_SHOWN =
  'Flown on from the state the ascent left the capsule in: the guidance cuts the sustainer on the published orbit 12.3 s before the recorded instant (the Atlas as modelled reaches it early), so the capsule is so much further on round the orbit at any instant after';

/** Friendship 7's coast, from the published orbit and from where the ascent left it. */
export const MA6_RETRO =
  'Nothing in the retrofire is MA-6’s own measure: the three motors’ impulse is their specified total, 38,880 lb s (the MA-4 and MA-5 trajectory report), over the capsule at retrofire, ' +
  '2,970 lb, 128 m/s spread evenly from the first’s lighting to the third’s burning out, with nothing for the propellant they burned (not read: a few per cent more); the entry is the ' +
  'capsule’s own drag curve (TM X-491), the retropack kept on and burning away not modelled; and where on the orbit it began is reckoned by hand (`injection.arc`). The record itself ' +
  'landed some 40 nautical miles short of the planned point because the retrofire was worked without the consumables spent (This New Ocean, p. 433): a miss of the planners’, not of these figures. ' +
  'Which input owns this one is not established (tests/orbital.test.mjs prints what each is worth); not adjusted';

export const GT3_ENTRY =
  'Of the entry nothing is spacecraft 3’s own measure but where it came down: its lift over drag is the programme’s average as flown, 0.19 (SP-138, p. 159), on the Mercury capsule’s ' +
  'drag curve; the bank is held at 60 degrees from the retrograde section’s going, the footprint’s contour the target lay on (SP-138, p. 163), where the crew flew a backup bank and then the ' +
  'computer’s commands, angles not read; the retrofire pitch is the next flight’s 30 degrees, its sign taken as Mercury’s; and where on the orbit it began is reckoned (`injection.arc`: a degree ' +
  'is some 110 km along the track at retrofire). Flown lift up throughout it lands 390 km further on, flown level 246 km shorter (the last test): the record cannot hold the landing to a ' +
  'hundred kilometres. The record itself landed 60 nautical miles short of its target because the lift was 35 per cent below the prediction; that is flown, not this';

/** Gemini-Titan 5 (missions/usa/gemini/flights/gt-5/orbital.ts, mission.md). */
export const GT5_PITCH =
  'The first stage is flown open on the pitch programme as Table 5.2-IV of the mission report prints its actual rates, 0.75, 0.56 and 0.25 deg/s, and comes to its cutoff 6.9 km low and 4.5 degrees flat, ' +
  'where the record has the flight "slightly lofted because of low-pitch program rates" (4.1). The table’s own difference column (+0.041, +0.044 and +0.015 deg/s against the planned 0.709, 0.516 and 0.235) ' +
  'and that sentence have the rates lower than planned, and the rates printed are higher: flown at the planned rates the cutoff comes at 63.6 km and 18.7 degrees, 69 m/s slow. Which reading is right is not ' +
  'settled; the printed one is flown, nothing adjusted. The second stage’s law then cuts on the published orbit at 333.37 s, the record’s 333.28, at the separation’s speed to 1 m/s';
export const GT5_DECAY =
  'The run’s ship comes down more slowly over the last five days than the tracked one: from the third day’s burns to revolution 120 its apogee falls 15.5 km where the tracking has 25.9. It is flown end on ' +
  'in the free-molecule flow, on the adapter’s 7.30 m² disc (rarefied.area), where for most of the eight days it drifted, powered down and venting ("the spacecraft attitude control and the hydrogen and ' +
  'oxygen continued venting throughout most of the flight", 4.3.1.2, the ground’s own drag factor for it moving by 23 per cent after the third day). Flown on 10 m², between end on and tumbling, the ' +
  'apogee comes within 3 km and the burn 61 s early: the attitude it drifted in is not in the record, and nothing is changed';
export const GT5_LATE =
  'The retrofire is timed for the place the ship came down (sim/plan.ts LandingAim), so after eight days it is lit as far after the record’s 190:27:43.3 as the run is behind the record’s clock ' +
  '(589 s, flown on from the ascent), and the entry it then flies takes some 90 s longer from the burn to the drogue than the record’s: its lift read off a preliminary figure and the Mercury capsule’s drag';

export const GT3_SHOWN =
  'Flown on from the state the ascent left the spacecraft in: the guidance cuts the second stage on the published orbit 0.7 s after the recorded instant, level at the perigee’s height over the reference ball';

/** The Gemini targets' Atlas (missions/usa/gemini/vehicles/target-plan.ts). */
export const TARGET_LOW =
  'The stack is 5 to 11 km low from booster engine cutoff to the Agena’s start, at the right speed to 60 m/s and near the right climb. The Atlas is flown on a stated law (up to 15 s, a ' +
  'pitch-over of 15 s, estimated, the turn to 97.3 s, a linear tangent from there) solved for the insertion alone: the autopilot’s pitch programme for the booster phase, which set these, ' +
  'was not found, and the law’s pitch-over lays it over early (1 to 2 degrees flat at booster cutoff). Flown lower, it is farther downrange: an Agena reaches its insertion (the record’s height, speed and ' +
  'climb, and so the record’s orbit: its axis within 35 m of the report’s insertion vector’s) 16 to 35 km farther along that orbit than the vector has it at the same instant, 2.1 to 4.6 s of its motion, ' +
  'and stays so (tests/pursuit.test.mjs): the flight that goes up to it meets it that much early. Not adjusted';
export const TARGET_FLAT = `Flatter at booster engine cutoff than the record. ${TARGET_LOW}`;
export const ATDA_FLAT =
  'Nearly five degrees flatter at booster engine cutoff. The ATDA’s Atlas had its own pitch programme ("Revises the pitch program amplitude and time slots", LSFR Table IV.D-1), not found; ' +
  'the law here has the Agena flights’ pitch-over (estimated). Not adjusted';
export const TARGET_FAST =
  'Some 60 m/s fast at the sustainer’s and the verniers’ cutoffs. Atlas 5306 is flown on 5302’s thrusts (the Gemini VIII report’s), with the impulses derived from its own weights on them: 5306’s own thrust table was not read. Not adjusted';
export const TARGET_EARLY =
  'The Agena reaches the planned insertion speed 4.5 s before the record’s cutoff. Its impulse is the 8247’s from a secondary source (293 s) and its shroud’s weight the standard Agena’s; the vehicle was ' +
  'cut by its velocity meter, flown here as the planned space-fixed speed. Not adjusted';
export const ATDA_APOGEE =
  'Apogee 176 nautical miles against 167. The sustainer is cut at the planned 25,298 ft/s, which it reaches 1.9 s before the record’s cutoff, and the two verniers then burn alone to their recorded ' +
  'cutoff, 20.7 s, and add 88 ft/s (27 m/s) where the record’s states have 75 in 18.8 s (25,290 to 25,365 ft/s): their thrust as printed, taken as the pair’s, and their flow at the sustainer’s impulse, ' +
  'neither read for the verniers alone. The record has them cut by the guidance’s command, flown here at that command’s instant; cut at the table’s speed there instead, they never burn alone (the staged ' +
  'ascent has no cut on a speed for an engine lit at liftoff on a shared tank: sim/staged.ts `schedule`). The orbit’s axis comes out 9.5 km long and its period 11.6 s: the ATDA’s own run falls 90 km farther back along its orbit every revolution than the report’s insertion ' +
  'vector carried on, 2,700 km by Gemini IX-A’s first rendezvous 51 h on, so the flight that went up to it cannot meet this run and is to be given the ATDA’s orbit as tracked (`TargetDef.orbit`). Not adjusted';

export const TARGET_PERIOD =
  'The report’s period at insertion, 90.56 min, is not its own orbit’s. Its insertion vector (25,365 ft/s at 981,195 ft, climbing 0.04 degrees), which the run is flown to, has 90.48 min, and its ' +
  'heights (159.0 by 163.6 nautical miles) are of the size of the other Agenas’, whose reports print 90.46 and 90.47. The printed digit is taken as a misprint, or a misreading here, of 90.46; the vector is flown. Not adjusted';

export const GT4_DECAY =
  'The orbit comes down more slowly than Gemini IV’s did: by the 61st revolution its apogee is some 20 km higher than Table 4-III’s and its perigee 5 to 8 km. It is drifted on the air of the day’s Sun ' +
  '(sim/air.ts) at King-Hele’s 2.2 on a quarter of the ship’s outside, 10.3 m² (Cauchy: it drifted for two and a half days and was held for the rest, on 7.3 m² nose or tail first); the report fitted its own ' +
  'decay with an atmosphere 0.72 of the ARDC 1959 one (section 4.3.1.2) and gives no ballistic figure. Which of the area, the coefficient and the air is short is not established; nothing is adjusted';

export const GT4_LATE =
  'Its period is so much the longer that after 62 revolutions it is some ten minutes behind where the record’s clock has it. The ground timed the burn before retrofire and retrofire for the place it was ' +
  'to come down, so they are timed for it here (sim/plan.ts `LandingAim`, its `from` the burn before retrofire’s turn to its attitude): the two are lit as much later than the record’s instants, ' +
  'keeping their recorded interval, and everything after them comes as much later';

export const GT4_ACROSS =
  'The burns timed for the place bring it down level with it along its track, not across it: lit some ten minutes after the record’s instant, the Earth has turned 2.6 degrees more under the orbit ' +
  'by then, and the track passes the place to its left';

export const GT4_SHOWN =
  'Begun from where the ascent flown left the spacecraft, 7 km low at perigee and 6 km high at apogee at cutoff (the ascent’s figures hold)';

export const GT7_ORBIT =
  'The ascent leaves the apogee 5 km above the report’s (holding), and the station keeping on the second stage and the radial burn of 0:21:17 that ended it (8.8 ft/s, pitched −41.5° and yawed 49°) are not flown: the report has them taking 2.8 nautical miles (5.2 km) off the apogee. Each burn is flown at its tracked impulse along the motion. Nothing adjusted';

export const GT7_CIRCLE =
  'The two burns are flown at the report’s instants and tracked impulses, along and against the motion: timed by the clock for where the real ship’s apsides were, on an orbit 7 km higher at its apogee (the ascent’s and the station keeping’s), they do not come at this run’s apsides, and leave it less round. The ground worked them from the ship’s own tracked orbit. Nothing adjusted';

export const GT7_ENTRY =
  'The retrofire is timed by guidance for the landing place along the track (sim/plan.ts `LandingAim`), 36 s before the record’s instant. The lift is the programme’s 0.19 on the Mercury capsule’s drag curve, banked 48.8° (the report’s reconstruction) to the left from the retrograde section’s going, where the crew flew about 35° and reversed it four or five times (4.3.1.3): the reversals are not flown. The drogue’s height is read off the report’s figure';

export const GT6A_RETRO =
  'Before retrofire the perigee is 275.0 km where SP-4002 has 153.0 nautical miles (283.4 km); its apogee holds. The burns to the coelliptic orbit hold (the apogee after the first within 25 m, the coelliptic orbit within 1.5 km); after it the terminal phase is flown by the forward parts of the computer’s displays along the motion, and the braking, the station keeping and the separation from Gemini VII, whose impulse is not read, are not flown: what of the orbit at retrofire is theirs is not established. Nothing adjusted';

export const GT6A_ENTRY =
  'The retrofire is timed by guidance for the landing place along the track (sim/plan.ts `LandingAim`), 277 s before the record’s instant, the run being that far from the real ship along its orbit after a day (the terminal phase, braking, station keeping and separation are not flown as made). The ground track at that instant passes west of the place, and the bank is held 55° to the left throughout, as Schirra held it until the computer took over, whose commands, left and right against an overshoot, are not read. Nothing adjusted';

/** Skylab 2's rendezvous and return (skylab-2/mission.md): the profile flown on a workshop placed from the launch's commentary. */
export const SL2_SPLASH =
  'Down at 13:54:40, 291 s after the record’s 13:49:49, 44 km short and 142 km across the track from the place the secondary sources give. The two deorbit firings are flown at the record’s instants, which are to the minute (Astronautics and Aeronautics, 1973), on the second visit’s planned impulses (258.5 and 191.9 ft/s), this flight’s own not having been read; the run has coasted 27 days alone from the first soft docking, a hundred metres from the workshop, and the computer steers the entry to a place across its track, which it flies long to reach. The ground’s timing of the firings for the recovery area is not flown. Not adjusted';

/** Gemini VIII's rendezvous, made on GATV-5003 flown from its insertion vector, and its early entry (gt-8/mission.md). */
export const GT8_DH =
  'The four burns before the coelliptic are flown at the record’s instants and impulses: what they were aimed at (the apogee 15 nautical miles under the Agena’s, the phase, the node) is not a kind guidance solves yet. The run comes to them on an orbit whose apogee is some 5 km over the record’s, the ascent cut on the record’s period, which the report’s heights and period give some 3 km apart; so the coelliptic orbit the run solves on the Agena lies 5 to 7 km over the record’s, about 21 km under the Agena where the record has 25 (13.5 nautical miles), and closes on it slower. The Agena is 10 km farther than the record has it at the radar’s lock-on, before the coelliptic burn, and 37 km farther by the terminal phase’s instant. Not adjusted';
export const GT8_TPI =
  'The terminal phase is lit at the record’s instant, from 91 km where the record has 54 (lit on its trigger, the Agena 26.8 degrees above the horizon, it is lit 18 minutes late and the rendezvous with it: mission.md, section 3), and solved to reach the Agena when the record’s transfer did (its corrections’ central angles, 5:47:46): it asks 22.5 m/s where the crew’s was 8.3 (27.3 ft/s), and its transfer’s apogee is 29 km over the record’s. Not adjusted';
export const GT8_CORRECTIONS =
  'The run has no navigation, radar or platform error: the terminal phase it solves reaches the Agena, and the corrections the crew made at 82 and 34 degrees to go, which took out theirs, solve to nothing. Not adjusted';
export const GT8_BRAKING =
  'The braking is the thrust commanded on the Agena to come to rest 150 ft from it by 5:53 and to stay there to the docking at 6:33:16 (sim/pursuit.ts stationPush): what it gives is counted to the docking, the station keeping in it, where the record’s 41.22 ft/s is the braking’s resultant alone (“the total ΔV expended during semi-optical approach was about twice this number”), and it brakes a transfer that comes in faster than the record’s. Not adjusted';
export const GT8_ENTRY =
  'It comes down 31 km to the left (north) of where the ship landed, the drogue on the record’s place along the track. The retrofire is timed by guidance for the landing place along the track (sim/plan.ts LandingAim); the bank is the crew’s and the computer’s as read off the report’s Figure 5.1.5-17 and flown by the clock (10 degrees south to 400,000 ft, the back-up 52 south, then the computer’s banks to the north), not commanded on the run’s own range to the target as the computer’s were: the cross-range the run carries to 10:31 is not taken out. Its plane after the rendezvous is the Agena’s, flown on from the insertion vector. Not adjusted';

/** Gemini IX-A's three rendezvous, made on the ATDA flown from its insertion vector two days before, and its descent (gt-9a/mission.md). */
export const GT9A_ATDA =
  'The ATDA is flown from the report’s insertion vector 46 h 33 min before the Titan’s liftoff, on gravity and the air at an estimated drag area (Table 4.3-V): at the ship’s insertion it is 1,142 km ahead where the report has about 570 nautical miles (1,056 km), and 115 km off at the crew’s terminal phase where the report has 25.2 nautical miles (46.7 km). The ground made its plan from later vectors of the ATDA (Eglin revolution 29, 4.3.1.2), which the report does not print; the burns before the coelliptic are flown at the record’s impulses and do not take the difference out. Not adjusted';
export const GT9A_HIGH =
  'After the first rendezvous the run’s orbit is the ATDA’s, flown from its insertion vector: its perigee some 4 km over the record’s, which the burns after it, flown at the record’s impulses, keep. Not adjusted';
export const GT9A_TPI =
  'The terminal phase is lit on the ATDA’s elevation, 27.2° (4.3.1.2.1; sim/plan.ts `Pursuit` `elevation`), at 4:02:50, 27 minutes after the crew, the run’s ATDA being that much farther ahead (above), and solved to meet it 129.3° on: 10.7 m/s where the crew’s was 8.7 (28.4 ft/s), so the orbit read at 3:45 is still the coelliptic one. Lit by the clock at the crew’s 3:36:02 instead, 115 km from the ATDA, it asks 34.0 m/s. Not adjusted';
export const GT9A_CORRECTIONS =
  'The run has no navigation, radar or platform error: the terminal phase it solves reaches the ATDA, and the corrections the crew made, which took out theirs, solve to nothing. Not adjusted';
export const GT9A_BRAKING =
  'The braking is the thrust commanded on the ATDA to come to rest 60 ft from it and to stay there to the next manoeuvre (sim/pursuit.ts stationPush): what it gives is counted to then, the station keeping in it, where the record’s figure is the braking’s resultant alone, and it brakes a transfer solved as the run has it (above). Not adjusted';
export const GT9A_EQUI =
  'The equi-period terminal phase is solved at the crew’s instant to meet the ATDA at the braking the crew were sent, 6:33:58: the run’s radial separation, flown at the record’s 19.9 ft/s from the station kept 60 ft behind the ATDA along the track (the report gives no range for it), leaves the ship where the crew’s left them only to within a few hundred metres, and 3.5 m/s puts that right where the crew needed 0.64. Not adjusted';
export const GT9A_COELLIPTIC =
  'The coelliptic burns are solved on the ATDA as the run has it, flown from its insertion vector; the orbits after them hold (272.7 by 274.4 km after the first, against 268.9 by 274.1). Not adjusted';
export const GT9A_ABOVE =
  'At the terminal phase from above, on the crew’s clock (21:02:28), the run’s ATDA is 19 km off and already 0.1° ahead of the ship, where the crew had it 27.5° below and behind (4.3.1.2.3): it has drawn some 36 km farther ahead over the fourteen hours since the separation, the ship and the ATDA flown on from where the run’s station keeping left them. Solved to meet it at the ground’s transfer time, the burn goes back toward it: 23.2 m/s where the crew’s was 5.5 (18.0 ft/s). The trigger, the ATDA falling through 27.5° below the level, is not a kind guidance has. Not adjusted';
export const GT9A_DESCENT =
  'Down 136 s after the record, the drogue at the record’s instant (49 s, within its 60): the main at the 11,000 ft read off the report’s Figure 5.1.11-1, on the 84.2 ft ringsail’s 31.6 ft/s (CR-1106), where the figure has the ship from the main’s full opening to the water in 203 s, some 42 ft/s. As Gemini-Titan 7’s and 8’s. Not adjusted';

/** Gemini XI's two rendezvous, made on GATV-5006 flown from its insertion vector and begun again where the pair parted, its docked burns and its entry (gt-11/mission.md). */
export const GT11_TPI =
  'The terminal phase is lit at the crew’s instant, the run’s Agena 56 km off where the report has about 21 nautical miles (38.9 km), the range at insertion holding (436 km, the report’s 232 nautical miles): solved to meet it when the braking was planned, 1:20:53, it asks 48.8 m/s where the crew’s was 43.9 (143.9 ft/s), and its transfer is 270 by 324 km where the record’s was 279 by 307. Not adjusted';
export const GT11_CORRECTIONS =
  'The run has no navigation, radar or platform error: the terminal phase it solves reaches the Agena, and the corrections the crew and the ground made, which took out theirs, solve to nothing. Not adjusted';
export const GT11_BRAKING =
  'The braking is the thrust commanded on the Agena to come to rest 50 ft from it and to stay there to the next event (sim/pursuit.ts stationPush): what it gives is counted to then, the station keeping in it, where the record’s figure is the braking’s resultant alone, and it brakes a transfer solved as the run has it. Not adjusted';
export const GT11_STANDOFF =
  'The separation and the stand-off are flown at the record’s impulses along the lines the guidance system measured, on the orbit the run’s pair came to through the docked burns, whose perigee lies elsewhere along it than the record’s: the record’s took the perigee down 5.6 km, the run’s 0.3 (Table 4.3-II). The coincident orbit, the rendezvous made on the Agena begun where the ship was at the separation, and the last separation keep it. Not adjusted';
export const GT11_COINCIDENT =
  'At the coincident-orbit terminal phase the run’s ship trails the Agena by 27 km where the ground’s last solution had 24.9 nautical miles (46 km): the stand-off "was supposed to have placed the spacecraft in the same orbit as the GATV and with no relative rates" 15 nautical miles behind, and the record’s trailing grew from 16.6 to 20.8 nautical miles, which the report puts to the ground solutions’ error "or that some venting or other perturbation caused this anomaly" (4.3.1.2.2), not flown. Solved to arrive when the braking was planned, the 292° transfer asks 2.7 m/s where the crew’s was 4.5. Not adjusted';
export const GT11_ENTRY =
  'The drogue comes out on the record’s place along the track (0.2 km short) and 24 km to its right, 91 s after the record: the retrofire is timed by guidance for the landing place along the track (sim/plan.ts LandingAim), and after guidance initiate the entry is flown lift up, where the computer’s banks, held by the control system, steered it (Figure 5.1.5-12, not read). Not adjusted';

/** Gemini XII's rendezvous, made on GATV-5001 flown from its insertion vector, its docked burns and its entry (gt-12/mission.md). */
export const GT12_DOCKED =
  'The orbit after the first docked burn and every burn after it holds its perigee and misses its apogee, 13 to 15 km over the record’s: the second and third dockings and the station keeping round them, which took the record’s orbit down from 162.7 by 156.4 nautical miles after the rendezvous to 161.4 by 153.0 before the first eclipse phasing (Tables 4.3-III and 4.3-II), are not flown, so the run comes to the docked burns some 7 km higher in its axis, and each burn, at the pair’s measured impulse, takes as much off it as the record’s did. Not adjusted';
export const GT12_TPI =
  'The terminal phase is lit at the record’s instant, the Agena 11 km nearer than the record has it as the coelliptic burn was made (the run’s orbit after the three burns before it within 4 km of the record’s), and solved to reach the Agena when the ground’s theoretical braking was to be (3:38:12): 8.9 m/s where the crew’s, from the backup charts, was 6.6 (21.8 ft/s). Lit on its 27 degrees it asks 8.0, but the braking then misses (mission.md, section 3). Not adjusted';
export const GT12_CORRECTIONS =
  'The run has no navigation, radar or platform error: the terminal phase it solves reaches the Agena, and the corrections the crew made from their charts, which took out theirs, solve to nothing. Not adjusted';
export const GT12_ENTRY =
  'The retrofire is timed by guidance for the landing place along the track (sim/plan.ts LandingAim), 7 minutes after the record’s instant: after 94 hours on an orbit whose axis is some 7 km over the record’s (the docked burns, above) the run is that far behind the real ship along it. It comes down 36 km to the right of where the ship landed: the bank is the crew’s 10° and back-up 45° to the south and then lift up where the control system held the computer’s banks, which are not flown, and the track the run is on at retrofire is not the ship’s. Not adjusted';

/** Soyuz 1's period after its correction, and its landing across the track. */
export const PERIOD_S1 =
  'The heights of Mishin’s first orbit, 200.9 by 224.1 km, are flown as mean heights over the WGS 84 ellipsoid under the apsis (the convention where heights come without a period), and so go round in 88.36 min where Mishin has 88.62 for them: the Soviet heights were over a ball some kilometres lower (tests/orbital.test.mjs, "the heights over the mean Earth"). The correction, the middle of Mishin’s 3.1 to 3.8 m/s, takes 0.10 min off the period where his figures fall by 0.07: it stays short. Not adjusted';
export const ACROSS_S1 =
  'The braking burn is timed for the place the module came down at (sim/plan.ts `LandingAim`), lit 190 s early on the run from the pad, on an Earth that has turned less under the orbit: the module lands level with the place and to one side of it. The ballistic entry has no lift to steer the range with. Not adjusted';
/** Soyuz 4's corrections, and its landing across the track. */
export const SHAPE_S4 =
  'Each of Shatalov’s corrections is flown as one push along the motion at an estimated instant (the middle of its orbit), of the impulse that takes the orbit before it to the size the record has after it: the size comes out right (the period after the fifth orbit’s holds), the shape does not, a push near the perigee raising the apogee alone. Where in its orbit each was made, and whether it was one burn, is not recorded; Siddiqi’s 207 by 237 km and Mishin’s 207.3 by 273 km after the first do not agree. Not adjusted';
export const ACROSS_S4 =
  'The braking burn is timed for the place they came down at (sim/plan.ts `LandingAim`), lit eleven minutes early after three days, on an Earth that has turned less under the orbit; the descent control system’s rolls, which steered the range, are not flown (the lift is held up). Kamanin has the landing itself 40 km from the aim. Not adjusted';

/** Soyuz 3's approach to Soyuz 2, flown as one burn (its orbital.ts `burns`), and the correction after it. */
export const APPROACH_S3 =
  'The approach to Soyuz 2 is not flown: its burns, Igla’s and Beregovoy’s, are not on any record read one by one, and are flown as one burn along the motion at 11:55 on 26 October whose impulse grows the orbit from the size Siddiqi’s table gives for the insertion to the size TASS gave on the 27th. That is the orbit’s size and not its shape: a single burn so far round from the perigee raises both apsides, where the record’s orbit after the approaches has its perigee 4 km lower and its apogee 30 km higher than the insertion’s. Not adjusted';
export const CORRECTION_S3 =
  'The correction of 28 October is flown at an estimated instant in the middle of the 36th orbit with the impulse worked from Mishin’s table of what the main engine could still give, to the ten metres a second.';
export const ACROSS_S3 =
  'The braking burn is timed for the place it came down at (sim/plan.ts `LandingAim`), and so is lit some eleven minutes before the record’s 09:45:05 (679 s from the published orbit, 658 s from the pad): after four days the run is that far along its track ahead of the record’s clock, its period a few seconds short of the record’s on each of its 64 revolutions (the approach and the correction as flown here). Lit so much earlier, it comes down on a track the Earth has turned under less: the cross-track miss is that time on the Earth’s turning at 50 degrees north. Not adjusted';

/** Soyuz 10's braking burn, timed for the landing place, and the place it is held to. */
export const ACROSS_S10 =
  'The braking burn is timed for the place it came down at (sim/plan.ts `LandingAim`), and is lit about three minutes after the record’s 01:59 (TASS, to the minute), the run a little behind the record’s clock after two days, flown with only one of the record’s corrections (the 17 s of 01:34; the correction by hand of the 23rd and Igla’s firings have no impulse on any record read). The track the run’s orbit has over Kazakhstan that night passes to the south-east of the place, which is itself worked from TASS’s «120 km north-west of Karaganda» (MPK has north-east), not a published point. Not adjusted';
/** Soyuz 12's braking burn, timed for the landing place, the record having no instant of its own for it. */
export const ACROSS_S12 =
  'The braking burn is timed for the place it came down at (sim/plan.ts `LandingAim`): the record has no instant for it, and Soyuz 10’s 41 min from the burn to the ground is taken. The run’s orbit after the raise holds TASS’s within a few kilometres, and on it the burn is lit some 816 s before that taken instant; lit so much earlier it comes down on a track the Earth has turned under less, to the north-east of McDowell’s point (itself queried, to a tenth of a degree). Not adjusted';

export const ACROSS_S16 =
  'The braking burn is timed for the place it came down at (sim/plan.ts `LandingAim`): the record has no instant for it, and Soyuz 10’s 41 min from the burn to the ground is taken. Six days on from an orbit whose period is the record’s within a few seconds, a few seconds a revolution are some ninety revolutions’ worth of the Earth turning under the track: the run’s pass over the landing’s latitude is that far to the east of McDowell’s point, to a tenth of a degree. Not adjusted';
export const ACROSS_T2 =
  'The braking burn is timed for the place it came down at (sim/plan.ts `LandingAim`): the record has no instant for it, and Soyuz 10’s 41 min from the burn to the ground is taken. The ship is not flown to Salyut 6: it waits out the three docked days in the phasing orbit McDowell gives it before the docking, lower than the station’s (the orbital module, let go from the station’s orbit, was at 311 by 323 km a month later: McDowell), and four days of another period put the run’s track west of the place «200 km south-east of Dzhezkazgan» (words, worked into a point). Not adjusted';
export const ASCENT_T2 =
  'The 11A511U as given carries 6,855 kg to a mean height of 220 km, the type’s own table’s figure (soyuz-11a511u-flown.ts `UPRATING_11A511U`, sized on it and on no flight’s orbit); the Soyuz T of 6,850 kg is at that, and Block I runs dry with the stage level at 202 km and 7,797.5 m/s, its osculating apogee 225 km. The orbit given for this flight, 202 by 249 km (Spacefacts and Russian Wikipedia, no Soviet source read), is a mean height of 225.5 km; Encyclopedia Astronautica’s 195 by 232 km, and the 88.7 min both give, would hold. Not adjusted';
