# Apollo 12: the flight plan, from the pad through the translunar injection

What the simulator flies Apollo 12 from: SA-507's launch from Pad 39A into rain and overcast, the parking orbit, the S-IVB
lit again over the Pacific for the translunar injection, and the stack coasting on toward the Moon. It is written in
[orbital.ts](orbital.ts) as a Saturn V record (`SaturnVRecord`, [saturn-v-record.ts](../../vehicles/saturn-v-record.ts)),
and the plan is made from it by [saturn-v-plan.ts](../../vehicles/saturn-v-plan.ts). Nothing after the injection is
flown: the transposition and docking, Intrepid drawn out of the adapter, the S-IVB's slingshot (which fell short), the
lunar orbit, the landing by Surveyor III and the return. The stack is flown whole from the second cutoff, the S-IVB, its
instrument unit, the adapter, Intrepid and Yankee Clipper together, with the Moon pulling on it.

## What was read

- **MSFC, Saturn V Launch Vehicle Flight Evaluation Report AS-507, Apollo 12 Mission (MPR-SAT-FE-70-1, 30 January
  1970).** The launch vehicle's record: Table 2-2, every event's range time; Tables 4-1 to 4-6, the trajectory at each
  cutoff and separation, the parking orbit and the injection; Table 5-1 and Table 5-2, the F-1s' reconstructed
  performance and the S-IC's propellant; Fig. 5-3, the S-IC's thrust through its burn; Table 6-1 and §§6.3, 6.4 and
  9.2.3, the S-II's J-2s, their mixture-ratio shift and the centre engine's cutoff; Tables 7-1, 7-2 and 7-3 and §§7.4,
  7.8 and 7.9, the S-IVB's two burns, their cutoffs and its propellant; Fig. 10-5, the launch vehicle digital computer's
  attitude commands from liftoff; Table 10-9, when each phase of the iterative guidance ran; §11.5, the separations;
  Section 12A, the triggered lightning; Tables 17-1 to 17-9, the vehicle's mass at each event. The engines are given in
  pounds and seconds, turned to newtons here. Read in a scan whose tables are garbled in its text layer, so every digit
  used was read off a page image (300 dpi for the tables, 400 dpi where a figure was digitized). In the mass tables'
  printer font an 8 and a 9 are hard to tell apart: each row used was checked against its column's total and against the
  pounds of Table 17-9 or Tables 5-2 and 7-3.
- **MSC, Apollo 12 Mission Report (MSC-01855, March 1970)**: Table A-I, the spacecraft's mass properties; §14.1.3,
  the electrical potential discharges; §13.0, the launch vehicle summary.
- **NASA, Apollo 12 press kit (release 69-148, 5 November 1969)**: p. 10, the launch as planned; p. 27, the launch abort
  landing areas; p. 53, the launch escape system. It has no table of the abort modes.
- **NASA, Apollo 11 press kit (release 69-83K, 6 July 1969)**, p. 78, the abort modes, taken for Apollo 12's.
- **Orloff and Harland, Apollo by the Numbers (NASA SP-2000-4029)**, Apollo 12's ascent, Earth orbit and translunar
  tables and its timeline, for the cross-checks below.

## What the plan is written from

- **Mass.** Everything at first motion, 2,904,443 kg (Table 17-1, the holddown arms' release at 0.25 s). The S-IC with the
  small S-IC/S-II interstage (614 kg) and the S-II's ullage propellant (611 kg) that leave with it; the S-II's aft
  interstage, 3,996 kg, let go at the second plane (192.4 s); the S-II with the S-II/S-IVB interstage; the tower, 4,066 kg
  (Table 17-9), pulled clear by its jettison motor (31,500 lbf, the Apollo 12 press kit's, for a little over a second,
  assumed); the S-IVB with the instrument unit and the adapter (its panels, 1,170 kg, and the 626 kg of spacecraft not
  separated); Intrepid, 15,223 kg; Yankee Clipper, 28,830 kg. The bodies sum to the record's first-motion mass to the
  kilogram.
- **The S-IC.** Five F-1s from range zero (not first motion, 0.25 s later: the simulator's clock starts with its engines),
  the centre cut at 135.24 s by the instrument unit and the four at 161.74 s by the oxygen's low-level sensors (Table 2-2,
  §5.1). One F-1's flow
  is the stage's mainstage propellant (2,069,456 kg, Table 17-9) over the engine-seconds the run burns them, 2,645.7 kg/s,
  so that the run and the record burn the same; its sea-level impulse is Table 5-1's mean, 264.9 s; its thrust in vacuum
  adds one atmosphere on the nozzle's 11 ft 7 in exit (the type's figure). So it gives 34.4 MN at liftoff against
  Fig. 5-3's 34.6 or so, and 39.3 MN as the air thins against the figure's 40.2 before the centre engine's cutoff (the
  press kit's prediction, 9,042,041 lbf, is the same 40.2 MN): the flight's thrust rose with the oxygen's head at the
  pumps, which two constant figures do not follow.
- **The S-II.** Lit at mainstage, 166.4 s (the start's three seconds of rising thrust and its 601 kg are not flown), each
  J-2 at its reconstructed thrust and impulse at ESC+61 s (Table 6-1); the centre cut at 460.75 s, early as planned
  (§6.3: the 14 to 20 hertz oscillations of four periods before it, the strongest yet seen before a centre cutoff, were
  "drastically attenuated following CECO", §9.2.3), the four at 552.34 s; the four's mixture-ratio shift at 490.0 s taken
  as a share of thrust, 0.749, the stage's thrust after it (692,787 lbf at ESC+340 s) over before it (925,145 lbf after
  the centre's cutoff, §6.3), and a smaller one of flow, 0.739, at AS-503's reconstructed impulse at the low ratio
  (MPR-SAT-FE-69-1 Table 6-3: 429.8 s against 424.1; assumed, the same valve).
- **The S-IVB.** Its first burn from mainstage, 559.1 s, at Table 7-1's 206,956 lbf (920.6 kN) and 428.90 s, cut by its
  guidance where the orbit reached is the published one (Table 4-5, the osculating orbit at insertion over the stated
  6,378.165 km ball): the record's 693.91 s is a figure the run is held to. Its second, the translunar injection, a stage
  of its own on the same tank (plan.ts `EngineDef.again`), from mainstage at 10,045.2 s at Table 7-2's 207,688 lbf
  (923.8 kN), its first 100 s at the 4.5 mixture ratio at 0.871 of that (derived: what the burn drew, 71,525 kg by
  Table 17-9, less what the null ratio's flow drew after the shift at 10,144.9 s), cut by its guidance on its speed: the
  space-fixed 10,795.8 m/s of Table 4-2 at the second guidance cutoff signal.
- **The steering.** The S-IC flies Fig. 10-5's pitch command open, read off the page: up the launch vertical to 12.8 s,
  over to 66.2 degrees from it at the tilt's arrest, 158.1 s, and held there, rolled from the pad's 90 degrees to the
  flight azimuth of 72.029 between 12.8 and 32.3 s (Table 2-2). From 202.5 s, when the iterative guidance began
  (Table 10-9), the law's linear tangent takes over, its step, rate and yaw solved for the first cutoff's height
  (190.9 km over the ellipsoid), climb (-0.015 degrees) and the parking orbit's inclination (32.540). The injection has a
  law of its own (`Guidance.injection`), solved for the second cutoff's height (352.8 km), climb (8.137) and inclination
  (30.360, Table 4-2).
- **In orbit.** The stack is held level by the S-IVB's own attitude jets (their authority estimated) and turned to the
  injection's attitude 200 s before it lights (estimated: Table 2-2 does not give when; the restart sequence began at
  9,464.5 s). The S-IVB's hydrogen vented in the parking orbit (996 kg, Table 17-9) and the vent's push (§10.2.1, Fig. 10-4)
  are not flown: the stack lights for the injection some 1,000 kg heavier than the record's 134,986 kg (Table 17-7).
- **After the injection.** The stack coasts on under the Earth's gravity with J2 and the Moon's as a third body
  (`FlightPlan.gravity`). The S-IVB/CSM separation's tracked state (Table 4-3, 11,884.9 s) is a tracking fix the coast is
  compared with, not a check: the separation is not flown.

## The lightning is not flown

Apollo 12 was the first Saturn launched in rain. The evaluation's Section 12A finds the vehicle struck at 36.5 s by a
discharge it triggered itself, through its plume, at 1.95 km and in cloud (the ceiling 0.6 km), two discharges seen by
the pad cameras, one forking to the ground (§12A.3), and a lesser disturbance at 52 s. On the spacecraft (MSC-01855, §14.1.3) the first
discharge threw the fuel cells off the buses, dropped the main buses to 18 or 19 V for milliseconds and lit the warning
lights, and destroyed nine service module measurements; the crew put the fuel cells back on the buses at 2 min 22 s. The
second cost the command module's inertial platform its reference, which was realigned in the parking orbit. On the
launch vehicle (§§12A.4, 12A.5, 10.4.1) 45 instrument unit measurements and the S-IVB's telemetry showed transients, the
pitch gimbal crossover counters jumped past their 0.4 degree limit at about 36.6 s, and at 37.01 s the downrange
accelerometer's two counters differed by nine counts, so the flight program kept the reasonable one; "subsequent
operation was normal", and "the launch vehicle hardware and software suffered no significant effects; therefore, the
mission proceeded as scheduled" (§12A.1). Virtually nothing was seen on the launch vehicle at 52 s (§12A.8). Its
guidance, on the instrument unit's own platform, flew on, and the trajectory came within 18 m/s of the nominal at every
cutoff and within 0.6 m/s at the first guidance cutoff (§4.1). So the strikes are marked here and not flown: nothing in the path to model, and the
spacecraft's lost power and platform are not in this plan, which flies the launch vehicle's guidance. SP-4029 places the
vehicle at 1.053 n mi (1.95 km) at the first strike and 2.374 n mi (4.40 km) at the second.


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
- **Its S-II's four ullage motors (assumed as Apollo 11's), some 2.3 m/s**, given to the stack as the S-IC parts (plan.ts `JointDef.ahead`).

| Against the record | Before | Now |
| --- | --- | --- |
| Speed at S-IC/S-II separation | −25.2 m/s | −8.0 m/s |
| Speed at S-II/S-IVB separation | −59.8 m/s | −34.1 m/s |
| S-IVB first cutoff | +11.4 s | +7.5 s |

The S-II still falls some 25 to 40 m/s behind the record at its cutoff with the stack's mass right: its
start's rising thrust (some 3 m/s) is not flown, nor its thrust through the high ratio beyond the ESC+61 s snapshot, and
its closed loop is the law's one linear tangent. Where the tables below and the paragraphs after them give the run's
figures, they are the run as it now stands (tests/fixtures/figures.json).

## The run against the record

Flown on the record's sequence and solved law (`flyWhole`, tests/staged.test.mjs; the figures are tests/fixtures/figures.json's):

| | The run | The record |
| --- | --- | --- |
| S-IC centre engine cutoff, 135.24 s | 44.0 km, 1,976 m/s | 44.7 km, 1,979.5 m/s (Table 4-2) |
| S-IC/S-II separation, 162.4 s | 67.4 km, 2,752 m/s, 20.0° | 68.7 km, 2,759.7 m/s, 20.430° (Table 4-3) |
| Greatest dynamic pressure | 33.9 kPa at 81.5 s | 32.7 kPa at 81.1 s (Table 4-1) |
| S-II centre engine cutoff, 460.75 s | 181.6 km, 5,701 m/s | 186.1 km, 5,722.7 m/s |
| S-II/S-IVB separation, 553.2 s | 188.4 km, 6,928 m/s | 190.4 km, 6,961.9 m/s |
| S-IVB first cutoff | 701.43 s | 693.91 s (Table 2-2) |
| Parking orbit insertion, 703.91 s | 7,792.5 m/s | 7,792.5 m/s (Table 4-5) |
| S-IVB second cutoff | 10,384.6 s, 63,427 kg | 10,383.89 s (Table 2-2), 63,340 kg (Table 17-7) |
| Its C3 and eccentricity | −1,917,450 m²/s², 0.968288 | −1,917,435 m²/s², 0.96829 (Table 4-2) |

**The S-IC holds the record on AS-507's own pitch programme**: at the centre engine's cutoff the run is 0.7 km low and
4 m/s slow, at separation 1.3 km low, 8 m/s slow and 0.4° flatter, and its greatest dynamic pressure is 3.5 per cent
over the record's. **The S-II is a little short**: at the centre engine's cutoff it is 22 m/s slow and 4.5 km low, at
separation 34 m/s slow and 2.0 km low (within the checks), and the S-IVB's guidance reaches the published orbit 7.5 s
after the record's cutoff. The stack's mass at the first cutoff is the mass tables' within a ton, so what is short is impulse or loss ("The engines' decay, the S-II's flow and its ullage motors", above). Recorded as misses (src/sim/misses.ts). Not adjusted.

**The J-2's cutoff
impulse is not flown**: 45,729 lbf s after the second cutoff signal (§7.8), about 3.2 m/s on the stack. Table 4-6's C3 at
the injection ten seconds later (−1,834,425 m²/s²) is 83,010 m²/s² above Table 4-2's at the signal, 3.8 m/s; the rest is
not accounted for here (the hydrogen vent opened at 10,384.6 s, Table 2-2, may be part of it). The run's coast lacks both.

## What disagrees, and how it was checked

- **The parking orbit.** Table 4-5's 181.2 by 185.4 km over the 6,378.165 km ball has a Kepler period of 88.158 min and an
  eccentricity of 0.00032, as the table gives (88.16, 0.00032). SP-4029 agrees: 97.8 by 100.1 n mi, 88.16 min, 32.540°.
- **The times.** Table 2-2 has the second guidance cutoff command at 10,383.89 s, as do §7.8 and Table 17-7; Table 4-2 has
  the signal at 10,383.94. Table 2-2 gives parking orbit insertion as 703.9 s, Table 4-5 as 703.91; the translunar
  injection 10,393.9 and 10,393.94 (Table 4-6, and SP-4029's 2:53:13.94). SP-4029 has the second ignition at 2:47:22.80
  (10,042.8 s) against the evaluation's start tank valve open at 10,042.7, and the burn as 341.14 s against §7.8's
  341.2 s. The evaluation's figures are kept.
- **The S-IC's oxygen at outboard cutoff.** Table 5-2's reconstruction has 42,093 lbm (19,093 kg); Table 17-1's rows at
  outboard cutoff sum to 18,893 kg. The RP-1 agrees (36,309 lbm, 16,470 kg). Table 5-2's is used, as Apollo 11's record
  does.
- **The tower.** Table 17-9 has 4,066 kg; the spacecraft before and after it in Table 17-3, 49,915 and 45,850 kg, differ
  by 4,065. The jettison motor is 31,500 lbf in Apollo 12's press kit and 33,000 lbf in Apollo 7's, which Apollo 11's
  record took.
- **The spacecraft.** MSC-01855's Table A-I has the lunar module at launch at 33,566.9 lb (15,225.6 kg) and the command
  and service modules at the transposition at 63,535.6 lb (28,819 kg), against the evaluation's 15,223 and 28,830 kg; the
  evaluation's are used, so that the bodies sum to its first-motion mass. Table A-I's command module after the modules
  parted reads 12,263.5 in the scan's text layer; it is 12,283.5 lb on the page, which the 25,444.2 lb before less the
  13,160.7 lb service module confirms.
- **The pitch programme.** Fig. 10-5's plateau is 66.2 to 66.4 degrees from the launch vertical, where Apollo 11's record
  reads 69.5 off its Fig. 10-4. The tilt programme was chosen for the month's winds, and AS-507's own figures bear it out:
  at outboard cutoff (Table 4-2: 2,750.7 m/s space-fixed at 20.513°, 93.7 km downrange) the climb against the turning Earth
  is about 23.8°, an axis some 67° from the launch vertical.

## What is estimated, or not flown

- The S-IC's attitude programme is read off a figure; the iterative guidance is a linear tangent in each of its two
  burns; the tower clearance yaw (2.4 to 10.2 s) and the S-IC's outboard engines' cant (20.6 s) are not flown.
- The drag curve is the Saturn IB's (estimated), on the 33 ft disc; the stack's area in orbit is a quarter of its outside.
- The steering's authority, the S-IVB's attitude jets' and the separations' pushes are estimates (NOT FOUND).
- The command module's mass at launch is the mission report's after the modules parted (estimated).
- The tower jettison motor's burn is the type's (assumed).
- The engines' starts (ullage, chilldown, the S-IVB's restart preparations), the S-IVB's cutoff transients and its
  vent in orbit are not flown.
- The lightning strikes at 36.5 and 52 s are not flown (above).
- The aborts are said and not flown: the escape tower until its jettison (197.9 s, this flight's), Mode II, Mode III and
  Mode IV with Apollo 11's boundary at 9 min 22 s (assumed: Apollo 12's press kit gives no abort modes).
