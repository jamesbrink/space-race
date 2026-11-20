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
- **The S-II.** Lit at mainstage, 166.30 s (the start's two seconds of rising thrust and its 574 kg are not flown), each
  J-2 at its reconstructed thrust and impulse at ESC+61 s (Table 6-1: the centre engine, 1,023,829 N, ran 1.8 per cent
  low all flight, §6.3); the centre cut at 460.61 s (ESC+297.56 s, "in order to prevent buildup of the low frequency
  oscillations that were observed on AS-503 and AS-504", §6.3), the four at 552.64 s; the four's mixture-ratio shift at
  488.48 s (§6.1) taken as one share of thrust and flow, 0.753, the stage's thrust after it (3,090,002 N at ESC+350 s)
  over before it (4,103,720 N after the centre's cutoff, §6.3).
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

## The run against the record

Flown on the record's sequence and solved law (`flyWhole`, tests/staged.test.mjs; the figures are tests/fixtures/figures.json's):

| | The run | The record |
| --- | --- | --- |
| S-IC centre engine cutoff, 135.16 s | 43.7 km, 1,952 m/s | 43.39 km, 1,973.03 m/s (Table 4-2) |
| S-IC/S-II separation, 162.31 s | 66.3 km, 2,712 m/s, 19.3° | 65.89 km, 2,759.29 m/s, 18.848° (Table 4-3) |
| Greatest dynamic pressure | 32.8 kPa at 87.4 s | 33.24 kPa at 82.6 s (Table 4-1) |
| S-II centre engine cutoff, 460.61 s | 175.5 km, 5,621 m/s | 179.00 km, 5,678.47 m/s (Table 4-2) |
| S-II/S-IVB separation, 553.50 s | 185.8 km, 6,837 m/s | 187.51 km, 6,900.65 m/s (Table 4-3) |
| S-IVB first cutoff | 716.5 s | 703.76 s (Table 4-2) |
| Parking orbit insertion, 713.76 s | 7,774 m/s | 7,793.09 m/s (Table 4-5) |
| S-IVB second cutoff | 9,549.8 s, 61,928 kg | 9,550.58 s (Table 4-2), 62,450 kg (Table 20-7) |
| Its C3 and eccentricity | −1,395,450 m²/s², 0.976901 | −1,396,436 m²/s², 0.97688 (Table 4-2) |

**The S-IC holds the record on AS-505's own pitch programme**: at the centre engine's cutoff the run is 0.3 km high and
21 m/s slow, at separation 0.4 km high, 48 m/s slow and 0.4° steeper, and its greatest dynamic pressure is 1 per cent
under the record's and 4.8 s later. **The S-II falls short**: at the centre engine's cutoff it is 58 m/s slow and 3.5 km low, at separation 64 m/s slow and 1.7 km
low, and the S-IVB's guidance, making up the speed, reaches the published orbit (184.5 by 186.0 km) 12.8 s after the
record's cutoff; at the record's insertion instant it is still burning, 19 m/s slow. The stack's
mass at the first cutoff is the mass tables' within a ton, so the shortfall is impulse or loss, not propellant: what is
not flown is the F-1s' rise in thrust through the burn (held at its mean), the J-2s' higher impulse at the lower mixture
ratio (held unchanged through the shift), and the drag is estimated. The same shortfall is in the other Saturn V runs
(Apollo 8, 10, 11 and 12), on Apollo 11 hidden by its S-IC's fast start. Recorded as misses (src/sim/misses.ts); not
adjusted. **The injection lands on the record**: its height, climb and inclination are the law's targets and its cut is the
record's speed, so its C3 and eccentricity agree by construction; the run stops 0.7 s early and 522 kg light.

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
- The drag curve is the Saturn IB's (estimated), on the 33 ft disc; the stack's area in orbit is a quarter of its outside.
- The steering's authority, the S-IVB's attitude jets' and the separations' pushes are estimates (NOT FOUND: §12 says
  only that both separations were "well within staging limits").
- The command module's mass at launch is the mission report's after the modules parted (estimated). The command and
  service modules' is the mission report's before the transposition, taken for first motion.
- The engines' starts (ullage, chilldown, the S-IVB's restart preparations) and their cutoff transients are not flown.
- The aborts are said and not flown: the escape tower, Mode II, Mode III and Mode IV (press kit, p. 29). Mode I's limit
  is the tower's actual jettison, 197.8 s; the kit planned it at 3:07.
