# Apollo 10: the flight plan, from the pad through the translunar injection

What the simulator flies Apollo 10 from: SA-505's launch from Pad 39B, the first Saturn V from that pad, the parking
orbit, the S-IVB lit again over the Pacific for the translunar injection, and the stack coasting on toward the Moon. It
is written in [orbital.ts](orbital.ts) as a Saturn V record (`SaturnVRecord`,
[saturn-v-record.ts](../../vehicles/saturn-v-record.ts)), and the plan is made from it by
[saturn-v-plan.ts](../../vehicles/saturn-v-plan.ts). Nothing after the injection is flown: the transposition and
docking, Snoopy drawn out of the adapter, the S-IVB's slingshot, the lunar orbit, Snoopy's descent to some 47,000 ft and
the return. The stack is flown whole from the second cutoff, the S-IVB, its instrument unit, the adapter, Snoopy and
Charlie Brown together, with the Moon pulling on it.

## What was read

- **MSFC, Saturn V Launch Vehicle Flight Evaluation Report AS-505, Apollo 10 Mission (MPR-SAT-FE-69-7).** The launch
  vehicle's record: Tables 2-1 and 2-2, the time bases and every event's range time; §4.1 and Tables 4-1 to 4-6, the
  azimuths, the trajectory at each cutoff and separation, the parking orbit and the injection; §§5.1 to 5.5, Table 5-1
  and Table 5-2, the F-1s' reconstructed performance, their cutoffs and the S-IC's propellant; Fig. 5-3, the S-IC's
  thrust through its burn; §§6.1 to 6.5 and Tables 6-1 and 6-2, the S-II's J-2s, the centre engine's early cutoff and
  why, the mixture-ratio shift and the residuals; §§7.1 to 7.9 and Tables 7-1, 7-2 and 7-3, the S-IVB's two burns, their
  cutoff impulses and its propellant; §10.3, Table 10-4 and Fig. 10-2, the iterative guidance's phases and the attitude
  commands from liftoff; §12, the separations; §§20.1 and 20.2 and Tables 20-1, 20-3, 20-5, 20-7 and 20-9, the vehicle's
  mass at each event. Read in a scan whose tables and figures were read off page images (Fig. 10-2 traced at 600 dpi),
  not off the scan's text.
- **MSC, Apollo 10 Mission Report (MSC-00126, August 1969)**, Table A.4-I, the spacecraft's mass properties: the
  evaluation's mass tables carry the spacecraft whole, so Snoopy's and Charlie Brown's masses are from here.
- **NASA, Apollo 10 press kit (release 69-68, 7 May 1969)**, p. 29, the abort modes.
- **NASA SP-4029, Apollo by the Numbers**, Apollo 10, pp. 73 and 74 and the timeline: read to cross-check, not flown from.

## What the plan is written from

- **Mass.** Everything at first motion, 2,900,383 kg (Table 20-1, the holddown arms' release at 0.25 s). The S-IC with the
  small S-IC/S-II interstage and the S-II's ullage propellant that leave with it; the S-II's aft interstage, 4,033 kg,
  let go at the second plane (192.3 s); the S-II with the S-II/S-IVB interstage; the tower, 4,053 kg (the spacecraft
  before and after it, Table 20-3), pulled clear by its jettison motor (33,000 lbf for a little over a second, assumed:
  Apollo 7's); the S-IVB with the instrument unit and the adapter; Snoopy, 30,735 lb (13,941 kg) at lift-off, and
  Charlie Brown, 63,560 lb (28,830 kg) before the transposition (MSC-00126, Table A.4-I). The adapter is what is left of
  the spacecraft after the tower (Table 20-3, 44,572 kg) when the two are taken off it, 1,801 kg, against Apollo 11's
  1,792 kg read off its own Table 20-9. The bodies sum to the record's first-motion mass within a kilogram.
- **The S-IC.** Five F-1s from range zero (not first motion, 0.25 s later: the simulator's clock starts with its engines),
  the centre cut by the instrument unit at 135.16 s and the four by the oxygen's low-level sensors at 161.63 s (§5.1,
  Table 4-2). One F-1's flow is the stage's mainstage propellant (2,066,096 kg, Table 20-9) over the engine-seconds the
  run burns them, 2,643.1 kg/s, so that the run and the record burn the same; its sea-level impulse is Table 5-1's mean,
  264.3 s; its thrust in vacuum adds one atmosphere on the nozzle's 11 ft 7 in exit (the type's figure). So it gives
  34.2 MN at liftoff against Fig. 5-3's 34.1, and 39.2 MN in vacuum against the figure's 40.0 before the centre engine's
  cutoff: the flight's thrust rose with the oxygen's head at the pumps, which two constant figures do not follow. Engine
  1 ran 1.46 per cent below its prediction at 35 to 38 s and climbed back by the cutoff (§5.3); the mean takes it in.
- **The S-II.** Lit at mainstage, 166.30 s (the start's rising thrust and its 574 kg are not flown), each
  J-2 at its reconstructed thrust and impulse at ESC+61 s (Table 6-1: the centre engine, 1,023,829 N, ran 1.8 per cent
  low all flight, §6.3); the centre cut at 460.61 s (ESC+297.56 s, "in order to prevent buildup of the low frequency
  oscillations that were observed on AS-503 and AS-504", §6.3), the four at 552.64 s; the four's mixture-ratio shift at
  488.48 s (§6.1) taken as a share of thrust, 0.753, the stage's thrust after it (3,090,002 N at ESC+350 s) over before
  it (4,103,720 N after the centre's cutoff, §6.3), and a smaller one of flow, 0.743: the four's impulse one second
  before cutoff, at the low ratio, 430.5 s against 424.7 at ESC+61 s (§6.4).
- **The S-IVB.** Its first burn from mainstage, 559.31 s, at Table 7-1's 204,965 lbf (911,730 N) and 429.5 s, cut by its
  guidance where the orbit reached is the published one (Table 4-5, the osculating orbit at insertion over the stated
  6,378.165 km ball): the record's 703.76 s is a figure the run is held to. Its second, the translunar injection, a stage
  of its own on the same tank (plan.ts `EngineDef.again`: the same J-2, which cannot be lit while it burns), from
  mainstage at 9,210.02 s at Table 7-2's 204,712 lbf (910,604 N), its first 124 s at the 4.5 mixture ratio at 0.864 of
  that (derived: what the burn drew, Table 20-7, less what the null ratio's flow drew after the shift at 9,334.3 s), cut
  by its guidance on its speed: the space-fixed 10,846.56 m/s of Table 4-2 at the second guidance cutoff signal.
  Table 7-1's and 7-2's newton columns are printed with a decimal point lost (9,117,294 and 9,106,040); their pound
  columns are taken.
- **The steering.** The S-IC flies Fig. 10-2's pitch command open, traced off the page: up the launch vertical to 13.05 s,
  over to 68.0 degrees from it by the arrest at 158.7 s and held there, rolled from the pad's 90 degrees to the flight
  azimuth of 72.028 between 13.05 and 32.3 s (§4.1, Table 2-2). From 202.9 s, when the iterative guidance began (Table
  10-4), the law's linear tangent takes over, its step, rate and yaw solved for the first cutoff's height (191.47 km over
  the ellipsoid), climb (-0.0064 degrees) and the parking orbit's inclination (32.546). The injection has a law of its
  own (`Guidance.injection`): a linear tangent in the plane of the motion from its lighting, held out of it by a yaw,
  the three solved for the second cutoff's height (319.81 km), climb (6.927) and inclination (31.701, Table 4-2). The
  record's iterative guidance was not a linear tangent: Fig. 10-2 shows its command falling near evenly in the inertial
  frame, with a step of some seven degrees where it took over from the held programme (§10.3: "approximately 2 degrees
  more positive than predicted", for a low radius and a high cross-range velocity).
- **In orbit.** The stack is held level by the S-IVB's own attitude jets (`ThrusterSet.coasting`, their authority
  estimated) and turned to the injection's attitude 200 s before it lights (estimated: Table 2-2 does not give when).
  What the S-IVB lost in the parking orbit (1,014 kg of hydrogen vented, 83 kg of oxygen, 53 kg of attitude propellant,
  Table 20-9) and the vent's push are not flown: the stack lights for the injection some 1,190 kg heavier than the
  record's 132,600 kg at the second ignition (§7.9, Table 20-9).
- **After the injection.** The stack coasts on, flown by the coast (sim/orbital.ts `flyOrbit`) under the Earth's
  gravity with J2 and the Moon's as a third body (`FlightPlan.gravity`, sim/core/gravity.ts: DE440's Moon where it is
  loaded, else Meeus's). It is flown three days on, as a coast with no burn is, which brings it to the Moon's distance.
  The S-IVB/CSM separation's tracked state (Table 4-3, 10,962.4 s) is a tracking fix the coast is compared with
  (tools/residuals.mjs), not a check: the separation is not flown.


## The engines' decay, the S-II's flow and its ullage motors

Re-flown on 20 November 2026 with what every Saturn V record had been missing, each from this
flight's evaluation where it gives it (orbital.ts says which, and whose figure is taken where it does not):

- **The F-1s' cutoff impulse** (§5.4): each engine's thrust falls evenly from the cut to nothing over the impulse the
  evaluation gives (the straight fall is an estimate; all of it falls before the stages part). Some 10 to 13 MN s from the
  four at their cutoff, 13 to 14 m/s on the stack, and 3 MN s from the centre.
- **The S-II J-2s' cutoff impulse** (§6.4: the stage's, through 5 per cent thrust, a quarter to an engine; the centre's
  taken as one of the four's), 2 to 4 m/s. The precutoff decay of the four before the oxygen depletion signal is not
  flown. The S-IVB's is not flown either: its guidance timed both cuts with their decay in them.
- **The S-II's flow after its mixture-ratio shift**: a J-2 gives more impulse at the low ratio, so its flow falls by more
  than its thrust. Held at one share, as before, the four drew some 1 to 1.4 per cent too much after the shift.
- **Its S-II's four ullage motors (AS-503's nominal impulse, assumed), some 2.3 m/s on the stack**, given to the stack as the S-IC parts (plan.ts `JointDef.ahead`).

| Against the record | Before | Now |
| --- | --- | --- |
| Speed at S-IC/S-II separation | −47.8 m/s | −30.6 m/s |
| Speed at S-II/S-IVB separation | −63.7 m/s | −37.1 m/s |
| S-IVB first cutoff | +12.8 s | +8.8 s |

What the S-II still fell short of the record then is the subject of the section below ("The S-II's trajectory match and the
stack's air"). Where the tables below and the paragraphs after them give the run's
figures, they are the run as it now stands (tests/fixtures/figures.json).

## The S-II's trajectory match and the stack's air (issues F1 and F2, November 2026)

Re-flown with what the flight evaluations give and the run had not flown (saturn-v-record.ts, saturn-v-plan.ts):

- **The trajectory match** (`sii.match`): AS-503's evaluation found, with a six-degree-of-freedom simulation fitted to
  the tracked trajectory (Table 6-3, within 1.1 m/s), the S-II's average thrust 0.15 per cent over its engines' figures
  at the ESC+61 s time slice and its mass loss 0.24 per cent under them: AS-503’s taken for this S-II, whose evaluation gives the propulsion reconstruction alone. The reconstructed
  thrust itself is flat through the high ratio (each evaluation's Fig. 6-3), so the time slice is its history there.
- **The stack's air** (`saturnVDrag`): AS-503's evaluation §20.2, the forebody's axial force coefficient against the Mach
  number (Fig. 20-2) and the force on the S-IC's base from its base pressure against the height (Fig. 20-1, plan.ts
  `DragDef.base`), in place of the Saturn IB's curve.

| Against the record | Before | Now |
| --- | --- | --- |
| Speed at S-IC/S-II separation | −30.6 m/s | −27.7 m/s |
| Speed at S-II/S-IVB separation | −37.1 m/s | −33.5 m/s |
| Height at S-II/S-IVB separation | −1.27 km | −1.07 km |
| S-IVB first cutoff | +8.77 s | +8.20 s |
| Speed at parking orbit insertion | −0.1 m/s | −0.1 m/s |

The S-II's start (AS-503's Fig. 6-4, the J-2s' buildup transients: nothing until 1.5 s after the engine start command,
some 0.87 of their mainstage thrust before the high EMR select) was flown and measured: it gives some 1 s of the S-IVB's
late cutoff back. It is not flown: as a curve of thrust against the clock it cannot follow an engine a hand lights at
another time, which would light into nothing until the record's instant; it wants the start counted from the engine's
own lighting. Measured on the run as the tests fly it, what is left of the S-IVB's late cutoff is chiefly the S-IC's:
some 0.19 s for each m/s of energy short at the S-IC's separation, then a few seconds more that nothing read accounts
for. Flown with the closed loop's tangent measured against a level held among the stars (as the iterative guidance
steered) instead of the turning local level, or with a second tangent rate after the S-II's centre cutoff, the S-IVB
cutoff moves by under 0.4 s: the law's shape is not what was short. See src/sim/misses.ts.

## The run against the record

(As flown before the S-II's trajectory match and AS-503's air were added; the section above gives what they
moved, and src/sim/misses.ts the run as it now stands.)

Flown on the record's sequence and solved law (`flyWhole`, tests/staged.test.mjs; the figures are tests/fixtures/figures.json's):

| | The run | The record |
| --- | --- | --- |
| S-IC centre engine cutoff, 135.16 s | 43.7 km, 1,952 m/s | 43.39 km, 1,973.03 m/s (Table 4-2) |
| S-IC/S-II separation, 162.31 s | 66.3 km, 2,729 m/s, 19.3° | 65.89 km, 2,759.29 m/s, 18.848° (Table 4-3) |
| Greatest dynamic pressure | 32.8 kPa at 87.3 s | 33.24 kPa at 82.6 s (Table 4-1) |
| S-II centre engine cutoff, 460.61 s | 176.5 km, 5,643 m/s | 179.00 km, 5,678.47 m/s (Table 4-2) |
| S-II/S-IVB separation, 553.50 s | 186.2 km, 6,864 m/s | 187.51 km, 6,900.65 m/s (Table 4-3) |
| S-IVB first cutoff | 712.52 s | 703.76 s (Table 4-2) |
| Parking orbit insertion, 713.76 s | 7,793.0 m/s | 7,793.09 m/s (Table 4-5) |
| S-IVB second cutoff | 9,552.0 s, 62,336 kg | 9,550.58 s (Table 4-2), 62,450 kg (Table 20-7) |
| Its C3 and eccentricity | −1,395,020 m²/s², 0.976908 | −1,396,436 m²/s², 0.97688 (Table 4-2) |

**The S-IC holds the record on AS-505's own pitch programme**: at the centre engine's cutoff the run is 0.3 km high and
21 m/s slow, at separation 0.4 km high, 31 m/s slow and 0.4° steeper, and its greatest dynamic pressure is 1 per cent
under the record's. **The S-II is a little short**: at the centre engine's cutoff it is 35 m/s slow and 2.5 km low, at
separation 37 m/s slow and 1.3 km low (within the checks), and the S-IVB's guidance reaches the published orbit 8.8 s
after the record's cutoff. The stack's mass at the first cutoff is the mass tables' within a ton, so what is short is impulse or loss ("The engines' decay, the S-II's flow and its ullage motors", above). Recorded as misses (src/sim/misses.ts). Not adjusted.

**The J-2's cutoff impulse is not flown**: 210,650 N s to zero thrust after the second cutoff signal (§7.8), some 3.4
m/s on the 62 t stack. The injection's C3 ten seconds after the signal (Table 4-6, 9,560.58 s) is −1,308,471 m²/s².

## What disagrees

- **SP-4029 against the evaluation.** SP-4029 (p. 74) gives the second burn as 343.08 s; the evaluation's §7.1 has
  343.06 s from its start tank discharge valve's opening, which its own times give (9,207.52 to 9,550.58 s). SP-4029's
  "velocity of 35,585.83 ft/sec" at the injection is Table 4-2's at the second cutoff signal (10,846.56 m/s); Table 4-6's
  at the injection ten seconds later is 35,562.96 ft/s (10,839.59 m/s). The parking orbit agrees: 100.32 by 99.71 n mi,
  32.546°, 88.20 min, 25,567.88 ft/s, and the Kepler period of Table 4-5's 184.66 by 185.79 km over the stated
  6,378.165 km ball is 88.197 min. The evaluation's figures are kept.
- **The roll's start.** Table 2-2 has the pitch and roll manoeuvre beginning at 13.1 s; §4.1 and SP-4029 have 13.05 s,
  which is taken.
- **The S-IVB's first ignition.** Table 2-2 has the start tank discharge valve open at 556.9 s; Table 20-5's ignition
  column, and SP-4029's timeline, 556.81 s. Mainstage (559.3 and 559.31 s) is flown, which does not hang on it.
- **The S-IC's maximum acceleration.** Table 4-1's 38.47 m/s² is 3.92 g, as SP-4029 has it; §4.3.1 rounds it to 3.9.

## What is estimated, or not flown

- The S-IC's attitude programme is traced off a figure, and its first nine seconds of tilt, hidden under the plot's
  border, are a straight line; the iterative guidance is a linear tangent in each of its two burns; the tower clearance
  yaw (1.6 to 10.0 s) and the S-IC's outboard engines' cant (20.6 s) are not flown.
- The drag is AS-503's forebody coefficient and S-IC base pressure (§20.2, read off its figures: estimated), on the 33 ft disc; the stack's area in orbit is a quarter of its outside.
- The steering's authority, the S-IVB's attitude jets' and the separations' pushes are estimates (NOT FOUND: §12 says
  only that both separations were "well within staging limits").
- The command module's mass at launch is the mission report's after the modules parted (estimated). The command and
  service modules' is the mission report's before the transposition, taken for first motion.
- The engines' starts (ullage, chilldown, the S-IVB's restart preparations) and the S-IVB's cutoff transients are not flown (the F-1s' and the S-II's are, as their cutoff impulse).
- The aborts are said and not flown: the escape tower, Mode II, Mode III and Mode IV (press kit, p. 29). Mode I's limit
  is the tower's actual jettison, 197.8 s; the kit planned it at 3:07.
