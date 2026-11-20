# Apollo 8: the flight plan, from the pad through the translunar injection

What the simulator flies Apollo 8 from: SA-503's launch from Pad 39A, the first crewed Saturn V, the parking orbit, the
S-IVB lit again over the Pacific for the translunar injection, and the stack coasting on toward the Moon. It is written
in [orbital.ts](orbital.ts) as a Saturn V record (`SaturnVRecord`, [saturn-v-record.ts](../../vehicles/saturn-v-record.ts)),
and the plan is made from it by [saturn-v-plan.ts](../../vehicles/saturn-v-plan.ts). Nothing after the injection is
flown: the command and service modules' separation from the S-IVB, the S-IVB's slingshot into orbit about the Sun with
LTA-B still in its adapter, the lunar orbit and the return. The stack is flown whole from the second cutoff, the S-IVB,
its instrument unit, the adapter with LTA-B and the command and service modules together, with the Moon pulling on it.

## What was read

- **MSFC, Saturn V Launch Vehicle Flight Evaluation Report AS-503, Apollo 8 Mission (MPR-SAT-FE-69-1, 20 February
  1969).** The launch vehicle's record: Table 2-2, every event's range time; §4.1, the flight azimuth; Tables 4-2 to 4-7,
  the trajectory at each cutoff and separation, the greatest dynamic pressure and acceleration, the parking orbit and the
  injection; Tables 5-2, 5-5 and 5-6 and §§5.4 and 5.5, the F-1s' reconstructed performance, the S-IC's propellant and
  its cutoff; Table 6-2 and §§6.3 to 6.5, the S-II's J-2s, their mixture-ratio shift, the centre engine's oscillation
  and the stage's cutoff; Tables 7-2, 7-7 and 7-11 and §§7.4, 7.8 and 7.9, the S-IVB's two burns and its propellant;
  Table 10-3 and §10.4.1, when each phase of the iterative guidance ran; Figs. 11-4 and 11-10, the pitch attitude and
  its command through the S-IC's and the S-II's burns; Fig. 12-3, the stages' speed apart at the first plane; Tables
  21-1 to 21-9, the vehicle's mass at each event. Read in a scan whose text is poor: every figure used was read off a
  page image (150 dpi, the mass tables 200 dpi, Fig. 11-4 traced at 300 dpi), not off the scan's text.
- **MSC, Apollo 8 Mission Report (MSC-PA-R-69-1, February 1969)**, §A.5, the lunar module test article (19,900 lb), and
  Table A.6-I, the spacecraft's mass properties.
- **NASA, Apollo 8 press kit (release 68-208, 15 December 1968)**, p. 12, the nominal sequence of events (the abort
  changeovers), and p. 27, the abort modes.
- **Orloff, Apollo by the Numbers (NASA SP-2000-4029, 2000)**, the Apollo 8 summary: cross-checked against the evaluation (see
  "What disagrees").

## What the plan is written from

- **Mass.** Everything at holddown arm release, 2,781,694 kg (Table 21-1, 0.27 s; first motion 0.33 s). The S-IC with the
  small S-IC/S-II interstage and the S-II ullage motors' propellant (611 kg) that leave with it; the S-II's aft
  interstage, 4,376 kg, let go at the second plane (184.47 s); the S-II with the S-II/S-IVB interstage; the tower, 4,032
  kg (the spacecraft before and after it, Table 21-3; Table 21-9 has 4,031), pulled clear by its jettison motor (33,000
  lbf for a little over a second, assumed: Apollo 7's); the S-IVB with the instrument unit and the adapter (its panels
  1,151 kg and the 639 kg not jettisoned); LTA-B, 9,025 kg; the command and service modules, 28,816 kg (Table 21-9, at
  separation). The bodies sum to the first-motion mass within 6 kg: the spacecraft in Tables 21-3 to 21-7 carry the
  command and service modules 5 or 6 kg heavier than Table 21-9's separation figure.
- **The S-IC.** Five F-1s from range zero (not first motion, 0.33 s later: the simulator's clock starts with its engines),
  the centre cut at 125.93 s and the four at 153.82 s (Table 2-2). One F-1's flow is the stage's mainstage propellant
  (1,957,147 kg, Table 21-9) over the engine-seconds the run burns them, 2,640.5 kg/s, so that the run and the record
  burn the same; its sea-level impulse is Table 5-2's reconstructed mean, 263.9 s (2,588.4 N s/kg); its thrust in vacuum
  adds one atmosphere on the nozzle's 11 ft 7 in exit (the type's figure). So it gives 6,835 kN an engine at sea level
  against the reconstruction's 6,727 kN at 35 to 38 s reduced to standard pump inlet conditions (Table 5-2). The four
  outboard engines stopped on the fuel's low-level sensors, not the oxygen's, 2.45 s later than predicted (§5.4), with
  3,018 kg of usable oxygen left (Table 5-6).
- **The S-II.** Lit at 90 per cent thrust, 158.47 s (the start's two seconds of rising thrust and its 433 kg are not
  flown), each J-2 at its reconstructed thrust and impulse at ESC+61 s (Table 6-2: the five sum to the stage's 5,086,888
  N, §6.3). **Its centre engine was not cut early on AS-503.** All five ran until the oxygen's low-level sensors called
  the cutoff at 524.02 s, sensed by the LVDC at 524.04 s (§6.4, Table 2-2), so the centre's cut is the outboards' instant
  and its `why` is empty. The centre engine is where the trouble that later flights cut it early for was first seen:
  from 450 s its chamber pressure oscillated at 18 Hz, from 478 s at some 48 N/cm² peak to peak, damping out four seconds
  before cutoff and costing it 27,050 N (§6.3). AS-503's S-II was the first on an open-loop propellant utilization
  system (§6.5): it started at a 5.0 mixture ratio, stepped to 5.5 at 160.67 s (2.2 s into the run, not flown; Table
  6-2's figures are at 5.5) and to 4.5 at 445.60 s (§6.3; commanded at 443.45 s, Table 2-2), all five engines together.
  That shift is flown for every engine as a share of thrust, 0.762, the stage's thrust after it (3,877,101 N) over that
  and the change it made (1,209,777 N), §6.3, and a smaller one of flow, 0.752: Table 6-3's reconstructed stage impulse
  at the low ratio, 429.8 s against 424.1 at the high.
- **The S-IVB.** Its first burn from 90 per cent thrust, 530.53 s, at Table 7-2's 901,557 N and 428.7 s, its propellant
  utilization valve at null throughout (§7.9), cut by its guidance where the orbit reached is the published one (Table
  4-6, the osculating orbit at insertion over the stated 6,378.165 km ball): the record's 684.98 s is a figure the run
  is held to. Its second, the translunar injection, a stage of its own on the same tank (plan.ts `EngineDef.again`: the
  same J-2, which cannot be lit while it burns), from 90 per cent thrust at 10,240.02 s at Table 7-7's 897,548 N and
  428.2 s, cut by its guidance on its speed: the space-fixed 10,830.28 m/s of Table 4-3 at the second cutoff. It was lit
  at the 4.5 mixture ratio and stepped to null at 10,242.49 s (§7.9), 2.47 s into the run: too short a stretch to derive
  its flow from the mass drawn, so the 4.5 ratio's share of the null ratio's flow is Apollo 11's derived 0.896 (AS-506's,
  assumed).
- **The steering.** The S-IC flies Fig. 11-4's pitch command open, traced off the page: up the launch vertical to 12.11
  s, over to 65.6 degrees from it at the tilt's arrest, 145.50 s, and held there, rolled from the pad's 90 degrees to the
  flight azimuth of 72.124 between 12.11 and 31.52 s (Table 2-2, §4.1). From 196.22 s, when the iterative guidance began
  (Table 10-3), the law's linear tangent takes over, its step, rate and yaw solved for the first cutoff's height (191.36
  km over the ellipsoid), climb (−0.001 degrees) and the parking orbit's inclination (32.509). The injection has a law
  of its own (`Guidance.injection`): a linear tangent in the plane of the motion from its lighting, held out of it by a
  yaw, the three solved for the second cutoff's height (332.19 km), climb (7.445) and inclination (30.639, Table 4-3).
- **In orbit.** The stack is held level by the S-IVB's own attitude jets (`ThrusterSet.coasting`, their authority
  estimated) and turned to the injection's attitude 200 s before it lights (estimated: Table 2-2 does not give when).
  The S-IVB's hydrogen vented in the parking orbit (976 kg, Table 21-9) and the vent's push are not flown: the stack
  lights for the injection some 1,000 kg heavier than the record's 126,780 kg at 90 per cent thrust (Table 21-7).
- **After the injection.** The stack coasts on, flown by the coast (sim/orbital.ts `flyOrbit`) under the Earth's gravity
  with J2 and the Moon's as a third body (`FlightPlan.gravity`). The S-IVB/spacecraft separation's tracked state (Table
  4-4, 12,056.3 s) is a tracking fix the coast is compared with (tools/residuals.mjs), not a check: the separation is not
  flown.


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
- **Its S-II's four ullage motors (Table 12-3's measured impulse, 1.47 MN s), some 2.3 m/s on the stack**, given to the stack as the S-IC parts (plan.ts `JointDef.ahead`).

| Against the record | Before | Now |
| --- | --- | --- |
| Speed at S-IC/S-II separation | −44.0 m/s | −26.9 m/s |
| Speed at S-II/S-IVB separation | −89.0 m/s | −64.2 m/s |
| S-IVB first cutoff | +14.9 s | +11.3 s |

The S-II still falls some 25 to 40 m/s behind the record at its cutoff with the stack's mass right: its
start's rising thrust (some 3 m/s) is not flown, nor its thrust through the high ratio beyond the ESC+61 s snapshot, and
its closed loop is the law's one linear tangent. Where the tables below and the paragraphs after them give the run's
figures, they are the run as it now stands (tests/fixtures/figures.json).

## The run against the record

Flown on the record's sequence and solved law (`flyWhole`, tests/staged.test.mjs; the figures are tests/fixtures/figures.json's):

| | The run | The record |
| --- | --- | --- |
| S-IC centre engine cutoff, 125.93 s | 41.6 km, 1,882 m/s | 41.48 km, 1,893.96 m/s (Table 4-3) |
| S-IC/S-II separation, 154.47 s | 66.0 km, 2,695 m/s, 20.4° | 66.37 km, 2,721.91 m/s, 20.605° (Table 4-4) |
| Greatest dynamic pressure | 36.5 kPa at 79.7 s | 37.2 kPa at 78.90 s (Table 4-2) |
| Greatest acceleration on the S-IC | 3.87 g | 3.96 g at 153.92 s (Table 4-2) |
| S-II cutoff, all five, 524.04 s | 186.5 km, 6,757 m/s | 191.54 km, 6,821.15 m/s (Table 4-3) |
| S-II/S-IVB separation, 524.90 s | 186.6 km, 6,761 m/s | 191.61 km, 6,824.96 m/s (Table 4-4) |
| S-IVB first cutoff | 696.31 s | 684.98 s (Table 2-2) |
| Parking orbit insertion, 694.98 s | 7,783.4 m/s | 7,792.84 m/s (Table 4-6) |
| S-IVB second cutoff | 10,554.0 s, 58,884 kg | 10,555.51 s (Table 2-2), 59,285 kg (Table 21-7) |
| Its C3 and eccentricity | −1,556,600 m²/s², 0.974252 | −1,556,426 m²/s², 0.97425 (Table 4-3) |

**The S-IC holds the record on AS-503's own pitch programme**: at the centre engine's cutoff the run is 0.1 km high and
12 m/s slow, at separation 0.4 km low, 27 m/s slow and 0.2° flatter, and its greatest dynamic pressure is 2 per cent
under the record's. **The S-II still falls short**: with the five J-2s cut together at the record's 524.04 s it is 64 m/s
slow and 5.0 km low, and the S-IVB's guidance, making up the speed, reaches the published orbit 11.3 s after the
record's cutoff; at the record's insertion instant it is still burning, 9.5 m/s slow. The stack's mass at the first
cutoff is the mass tables' within half a ton, so what is short is impulse or loss ("The engines' decay, the S-II's flow and its ullage motors", above). Recorded as misses (src/sim/misses.ts). Not adjusted.

**The J-2's cutoff impulse is not flown**: 184,463 N s after the second cutoff command (§7.8,
Table 7-10; the guidance data have 227,286 N s, 3.84 m/s), which is the difference between Table 4-3's C3 at the cutoff
and Table 4-7's at the injection ten seconds later (−1,478,917 m²/s²). The run's coast lacks it.

## What disagrees

- **SP-4029's parking orbit period.** It prints the insertion orbit as 99.99 by 99.57 n mi, 32.509°, "period 89.19
  minutes". Its heights are the evaluation's (185.18 by 184.41 km, Table 4-6), and their Kepler period over the stated
  6,378.165 km ball is 88.19 minutes (semi-major axis 6,562.96 km), Table 4-6's figure: SP-4029's 89.19 is a misprint
  of a digit, and the evaluation's is kept.
- **SP-4029's injection speed**, 35,504.41 ft/s, against Table 4-7's 35,505.41 ft/s (10,822.05 m/s). The evaluation's is
  kept; SP-4029's other instants agree with it (S-II cutoff 524.04 s, S-IVB first cutoff 684.98 s, insertion 694.98 s,
  the injection burn of 317.72 s from 10,237.79 to 10,555.51 s, and the injection 9,870.53 s after insertion, at
  10,565.51 s).
- **Table 4-3, S-IC centre engine cutoff:** its flight path angle is printed 24.527° actual and 25.417° nominal with
  0.110 between them; one of the three is misprinted. Not used.
- **Table 7-7** prints the second burn's predicted impulse as "41,187.4" N s/kg (4,187.4, as Table 7-2). Not used.
- **The S-II's thrust before its shift:** §6.3's change, 1,209,777 N, on its 3,877,101 N after puts it at 5,086,878 N,
  10 N under the ESC+61 s figure (5,086,888 N); the share is the sentence's own.
- **The tower:** 4,032 kg as the spacecraft before and after it (Table 21-3), 4,031 kg as Table 21-9's row.
- **The abort changeovers:** the press kit's abort section (p. 27) has Mode II run to 10:00 and Mode IV from "about 10
  minutes"; its sequence of events (p. 12) has Mode IV from 10:06 and the Mode II/Mode III changeover at 10:18, which
  are taken.
- **The flight azimuth:** the abstract rounds it to 72.12°; §4.1 has 72.124°, which is taken.

## What is estimated, or not flown

- The S-IC's attitude programme is traced off a figure; the iterative guidance is a linear tangent in each of its two
  burns; the tower clearance yaw (1.76 to 9.72 s) and the S-IC's outboard engines' cant (20.64 s) are not flown.
- The first plane's push apart is read off Fig. 12-3 (about 11 m/s, estimated); the second's is NOT FOUND (3 m/s, Apollo
  11's estimate).
- The drag curve is the Saturn IB's (estimated), on the 33 ft disc; the stack's area in orbit is a quarter of its outside.
- The steering's authority and the S-IVB's attitude jets' are estimates (NOT FOUND), as Apollo 11's.
- The second burn's 4.5-ratio share is AS-506's (assumed); its two and a half seconds at that ratio barely matter.
- The command module's mass at launch is the mission report's after the modules parted (estimated).
- The S-II's first two seconds at the 5.0 mixture ratio, the engines' starts (ullage, chilldown, the S-IVB's restart
  preparations), the S-II centre engine's oscillation and its 27,050 N loss, and the S-IVB's cutoff transients are not flown (the F-1s' and the S-II's are, as their cutoff impulse).
- The aborts are said and not flown: the escape tower, Mode II, Mode III and Mode IV (press kit, pp. 12 and 27).
