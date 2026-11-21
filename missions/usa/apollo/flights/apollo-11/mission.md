# Apollo 11: the flight plan, from the pad through the translunar injection

What the simulator flies Apollo 11 from: SA-506's launch from Pad 39A, the parking orbit, the S-IVB lit again over the
Pacific for the translunar injection, and the stack coasting on toward the Moon. It is written in
[orbital.ts](orbital.ts) as a Saturn V record (`SaturnVRecord`, [saturn-v-record.ts](../../vehicles/saturn-v-record.ts)),
and the plan is made from it by [saturn-v-plan.ts](../../vehicles/saturn-v-plan.ts). Nothing after the injection is
flown: the transposition and docking, Eagle drawn out of the adapter, the S-IVB's slingshot, the lunar orbit, the landing
and the return. The stack is flown whole from the second cutoff, the S-IVB, its instrument unit, the adapter, Eagle and
Columbia together, with the Moon pulling on it.

## What was read

- **MSFC, Saturn V Launch Vehicle Flight Evaluation Report AS-506, Apollo 11 Mission (MPR-SAT-FE-69-9, 20 September
  1969).** The launch vehicle's record: Table 2-2, every event's range time; Tables 4-1 to 4-6, the trajectory at each
  cutoff and separation, the parking orbit and the injection; Table 5-1, the F-1s' reconstructed performance; Fig. 5-3,
  the S-IC's thrust, flow and impulse through its burn; Table 6-1 and §6.3, the S-II's J-2s and their mixture-ratio
  shift; Tables 7-1, 7-2 and 7-3 and §§7.4, 7.8 and 7.9, the S-IVB's two burns, their cutoff impulses and its
  propellant; Fig. 10-4, the launch vehicle digital computer's attitude commands from liftoff; Table 10-4, when each
  phase of the iterative guidance ran; Tables 20-1 to 20-9, the vehicle's mass at each event. Read in a scan whose
  rotated tables and figures were read off page images (600 dpi where a figure was digitized), not off the scan's text.
- **MSC, Apollo 11 Mission Report (MSC-00171, November 1969)**, Table A-I, the spacecraft's mass properties.
- **NASA, Apollo 11 press kit (release 69-83K, 6 July 1969)**, p. 78, the abort modes.

## What the plan is written from

- **Mass.** Everything at first motion, 2,899,008 kg (Table 20-1, the holddown arms' release at 0.30 s). The S-IC with the
  small S-IC/S-II interstage and the S-II's ullage propellant that leave with it; the S-II's aft interstage, let go at the
  second plane (192.3 s); the S-II with the S-II/S-IVB interstage; the tower, 4,042 kg (the spacecraft before and after
  it, Table 20-3), pulled clear by its jettison motor (33,000 lbf for a little over a second, assumed: Apollo 7's); the S-IVB with the instrument unit and the adapter; Eagle, 15,095 kg; Columbia, 28,806 kg. The bodies
  sum to the record's first-motion mass within a kilogram.
- **The S-IC.** Five F-1s from range zero (not first motion, 0.3 s later: the simulator's clock starts with its engines),
  the centre cut at 135.20 s and the four at 161.63 s (Table 2-2). One F-1's flow is the stage's mainstage propellant
  (2,069,957 kg, Table 20-9) over the engine-seconds the run burns them, 2,648.0 kg/s, so that the run and the record
  burn the same; its sea-level impulse is Table 5-1's mean, 264.6 s; its thrust in vacuum adds one atmosphere on the
  nozzle's 11 ft 7 in exit (the type's figure). So it gives 34.4 MN at liftoff against Fig. 5-3's 34.0, and 39.3 MN as
  the air thins against the figure's 40.0 before the centre engine's cutoff: the flight's thrust rose with the oxygen's
  head at the pumps, which two constant figures do not follow.
- **The S-II.** Lit at mainstage, 166.2 s (the start's rising thrust and its 594 kg are not flown), each
  J-2 at its reconstructed thrust and impulse at ESC+61 s (Table 6-1); the centre cut at 460.62 s (§6.3, against the
  oscillations of AS-503 and AS-504), the four at 548.22 s; the four's mixture-ratio shift at 498.0 s taken as one share
  of thrust and flow, 0.753, the stage's thrust after it over before it (§6.3).
- **The S-IVB.** Its first burn from mainstage, 554.7 s, at Table 7-1's 901,223 N and 428.7 s, cut by its guidance where
  the orbit reached is the published one (Table 4-5, the osculating orbit at insertion over the stated 6,378.165 km
  ball): the record's 699.34 s is a figure the run is held to. Its second, the translunar injection, a stage of its own
  on the same tank (plan.ts `EngineDef.again`: the same J-2, which cannot be lit while it burns), from mainstage at
  9,858.7 s at Table 7-2's 894,364 N, its first 116 s at the 4.5 mixture ratio at 0.896 of that (derived: what the
  burn drew, Table 20-7, less what the null ratio's flow drew after the shift), cut by its guidance on its speed: the
  space-fixed 10,841.0 m/s of Table 4-2 at the second guidance cutoff signal.
- **The steering.** The S-IC flies Fig. 10-4's pitch command open, traced along the middle of the line's stroke at 600
  dpi: up the launch vertical to 13.2 s, over to 69.0 degrees from it at 165 s and held there, rolled from the pad's 90 degrees to the flight azimuth of
  72.058 between 13.2 and 31.1 s. From 204.07 s, when the iterative guidance began (Table 10-4), the law's linear
  tangent takes over, its step, rate and yaw solved for the first cutoff's height (191.1 km over the ellipsoid), climb
  (0.015 degrees) and the parking orbit's inclination (32.521). The injection has a law of its own
  (`Guidance.injection`): a linear tangent in the plane of the motion from its lighting, held out of it by a yaw, the
  three solved for the second cutoff's height (320.9 km), climb (6.913) and inclination (31.386, Table 4-2). The
  record's iterative guidance was not a linear tangent: Fig. 10-4 shows its command falling near evenly in the inertial
  frame, not against the turning local level.
- **In orbit.** The stack is held level by the S-IVB's own attitude jets (`ThrusterSet.coasting`, their authority
  estimated) and turned to the injection's attitude 200 s before it lights (estimated: Table 2-2 does not give when).
  The S-IVB's hydrogen boiled off through its vent in the parking orbit (972 kg, Table 20-9) and the vent's push are not
  flown: the stack lights for the injection some 1,000 kg heavier than the record's 134,046 kg.
- **After the injection.** The stack coasts on, flown by the coast (sim/orbital.ts `flyOrbit`) under the Earth's
  gravity with J2 and the Moon's as a third body (`FlightPlan.gravity`, sim/core/gravity.ts: DE440's Moon where it is
  loaded, else Meeus's). It is flown three days on, as a coast with no burn is, which brings it to the Moon's distance.
  The S-IVB/CSM separation's tracked state (Table 4-3, 11,723 s) is a tracking fix the coast is compared with
  (tools/residuals.mjs), not a check: the separation is not flown.


## Two readings of Fig. 10-4

Issue #181 asked whether Fig. 10-4's time axis is offset, as AS-510's Fig. 9-10's frame is (apollo-15/mission.md). It is
not. Measured on the page scanned at 600 dpi, the pitch panel's time gridlines stand 284 pixels apart (275 to 291 with
the scan's stretch), its frame lies a whole interval before the gridline labelled 0, at −100 s, and the drawn command
puts its plateau's start at 159.5 s and the iterative guidance's first step at some 202.6 s, where Table 2-2 has the tilt
arrested at 160.0 s and the guidance begun at 204.07 s. The yaw panel beside it, framed the same, draws the tower
clearance yaw at range zero.

What changes is the reading of the line itself. Its stroke is some 8 pixels wide, three seconds across where it falls
steeply. Traced along the stroke's middle, the pitch command crosses 10° at 33 s, 20° at 50.5 s, 30° at 66.7 s and 40° at
82.3 s (each checked by eye against the gridline it crosses); the first reading, along the stroke's upper edge, put the
same angles some 1.5 s earlier (31, 49.2, 63.8 and 80.6 s), a degree further over through the tilt, and the plateau at
69.5° where the middle is 69.0°. The middle is taken. Flown each way (with the engines' decay, the S-II's flow and its
ullage motors in both):

| | Upper edge (first read) | Middle (taken) | The record |
| --- | --- | --- | --- |
| Greatest dynamic pressure | 44.4 kPa | 42.7 kPa | 35.2 kPa |
| S-IC centre cutoff | 40.3 km, 2,044 m/s | 41.1 km, 2,032 m/s | 44.0 km, 1,979.0 m/s |
| S-IC/S-II separation | 60.7 km, 2,837 m/s, 16.7° | 61.9 km, 2,822 m/s, 17.2° | 66.7 km, 2,773.9 m/s, 19.02° |

The S-IC is still some 1.8° flat at its separation on the line's middle: the reading accounts for about a quarter of
the flatness #181 reported, and the figure has no offset to account for the rest. What is left is in the dynamics, not
the command: the control system's following of the command (not flown: the law puts the axis on it at once), the
day's winds aloft and the angle of attack they set, and the drag (estimated). Recorded as misses.


## #181 tested: frames, drag, and the reading of Fig. 10-4 (November 2026)

What the S-IC's flatness could be referenced to, each measured on the run:

- **Which flight path angle.** Tables 4-2 and 4-3 pair each flight path angle with the space-fixed velocity, and it is
  the space-fixed one: the vertical speeds they give at the centre cutoff and the separation (1,979.0 m/s at 22.957°,
  2,773.9 at 19.020°: 772 and 904 m/s) average 838 m/s, as the 22.7 km climbed in the 27.1 s between say (837); read as
  Earth-fixed they would not. The run's `climb` is the space-fixed one.
- **Earth-fixed against space-fixed.** Table 4-1's greatest Earth-fixed speed of the S-IC, 2,402.7 m/s at 162.3 s,
  against the run's 2,457.2: 54.5 m/s fast, as it is space-fixed (51.1): the run is no flatter in one frame than the other.
- **The vertical.** The run's launch vertical is the geodetic one; the geocentric lies 0.19° from it at the pad, 0.06° in
  the plane of a 72° azimuth: a thirtieth of the flatness.
- **The azimuth and roll.** The tilt is applied in the plane of the flight azimuth from the start (the platform was laid
  to it before liftoff); the roll from 90° only turns the stack about its axis.
- **The drag.** AS-503's own Saturn V axial force (forebody coefficient and base pressure, §20.2) in place of the Saturn
  IB's curve moves the S-IC's separation 2.7 m/s faster on every flight and leaves this one as flat (17.2°).
- **The reading of Fig. 10-4.** Flown on Apollo 12's programme (AS-507's Fig. 10-5: the same azimuth, the same launch
  window's profile), this stack comes to the centre cutoff at 44.07 km and 1,979.6 m/s against the record's 44.0 and
  1,979.0, to its separation at 67.6 km, 2,758 m/s and 20.1° (66.7, 2,773.9, 19.02), with a greatest dynamic pressure of
  37.3 kPa (35.2). Its own programme as traced is 2 to 5° further over than AS-505's and AS-507's from 40 to 80 s
  (13.3° at 40 s against 8.4 and 10.9; 38.9° at 80 s against 35.6 and 35.3), and its line leaves zero at some 6 s, 7 s
  before the programme's start (Table 2-2). What is left of #181 is in the tracing of Fig. 10-4's first hundred seconds,
  not in a frame, the vertical or the drag. Not adjusted: the figure is to be traced again at 600 dpi against its own
  gridlines, its time axis registered to Table 2-2's events; Apollo 12's programme is not this flight's.

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
- **Its S-II's four ullage motors (AS-503's nominal impulse, assumed), some 2.3 m/s**, given to the stack as the S-IC parts (plan.ts `JointDef.ahead`).

| Against the record | Before | Now |
| --- | --- | --- |
| Speed at S-IC/S-II separation | +45.4 m/s | +48.4 m/s |
| Speed at S-II/S-IVB separation | −1.4 m/s | +23.0 m/s |
| S-IVB first cutoff | +4.1 s | +0.0 s |

(Now includes Fig. 10-4 read along the middle of its stroke, above.)

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
| Speed at S-IC/S-II separation | +48.4 m/s | +51.1 m/s |
| Speed at S-II/S-IVB separation | +23.0 m/s | +26.3 m/s |
| Height at S-II/S-IVB separation | −5.73 km | −5.53 km |
| S-IVB first cutoff | +0.00 s | −0.53 s |
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
| S-IC centre engine cutoff, 135.2 s | 41.1 km, 2,032 m/s | 44.0 km, 1,979.0 m/s (Table 4-2) |
| S-IC/S-II separation, 162.3 s | 61.9 km, 2,822 m/s, climbing 17.2° | 66.7 km, 2,773.9 m/s, 19.02° (Table 4-3) |
| Greatest dynamic pressure | 42.7 kPa at 86.1 s | 35.2 kPa at 83.0 s (Table 4-1) |
| S-II centre engine cutoff, 460.62 s | 168.4 km, 5,736 m/s | 180.2 km, 5,707.5 m/s |
| S-II/S-IVB separation, 549.0 s | 181.7 km, 6,942 m/s | 187.4 km, 6,918.8 m/s |
| S-IVB first cutoff | 699.34 s | 699.34 s (Table 2-2) |
| Parking orbit insertion, 709.34 s | 7,793.0 m/s | 7,793.1 m/s (Table 4-5) |
| S-IVB second cutoff | 10,209.1 s, 63,768 kg | 10,203.07 s (Table 2-2), 63,189 kg (Table 20-7) |
| Its C3 and eccentricity | −1,487,510 m²/s², 0.975370 | −1,487,528, 0.975371 (Table 4-2) |

**The S-IC flies flatter than the record on the record's own commands**, read along the middle of the line ("Two
readings of Fig. 10-4", above). At the centre engine's cutoff it is 2.9 km lower and 53 m/s faster, at the separation
4.8 km low, 48 m/s fast and 1.8° flatter, and it meets the thick air faster: its greatest dynamic pressure is a fifth
over the record's. Tried as a diagnosis and not flown, half again or twice the drag (the curve is estimated: the Saturn
V's has not been read) slows it but leaves it as flat and lower still; the thrust is Fig. 5-3's within a per cent or two.
What is left is the control system's own following of its command, which is not flown (the law puts the axis on the
command at once), the day's winds aloft and the drag. The S-II's closed loop takes it to the record's speeds within 30
m/s, but 6 to 12 km lower until the S-IVB, and the S-IVB's guidance makes the orbit on the record's own instant. Recorded
as misses (src/sim/misses.ts).

**The injection lands on the record.** Its height, climb and inclination are the law's targets and its cut is the
record's speed, so its C3 and eccentricity agree by construction: what is the run's own is when it stops and what it
weighs then, 6.0 s late (a miss, recorded) and 579 kg heavy, the stack having come to it with its boiled-off hydrogen
and more of the S-IVB's propellant left. **The J-2's cutoff impulse is not flown**: 239,061 N s after the second cutoff
signal (§7.8), 3.8 m/s on the stack, which is the difference between Table 4-2's C3 at the signal and Table 4-6's at the
injection ten seconds later (−1,391,607 m²/s²); the guidance timed its cut with it in it. The run's coast lacks it.

## What is estimated, or not flown

- The S-IC's attitude programme is read off a figure; the iterative guidance is a linear tangent in each of its two
  burns; the tower clearance yaw (1.7 to 9.7 s) and the S-IC's outboard engines' cant (20.6 s) are not flown.
- The drag is AS-503's forebody coefficient and S-IC base pressure (§20.2, read off its figures: estimated), on the 33 ft disc; the stack's area in orbit is a quarter of its outside.
- The steering's authority, the S-IVB's attitude jets' and the separations' pushes are estimates (NOT FOUND).
- The command module's mass at launch is the mission report's after the modules parted (estimated).
- The engines' starts (ullage, chilldown, the S-IVB's restart preparations) and the S-IVB's cutoff transients are not flown (the F-1s' and the S-II's are, as their cutoff impulse).
- The aborts are said and not flown: the escape tower, Mode II, Mode III and Mode IV (press kit, p. 78).
