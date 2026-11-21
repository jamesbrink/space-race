# Apollo 16: the flight plan, from the pad through the translunar injection

What the simulator flies Apollo 16 from: SA-511's launch from Pad 39A on time, the parking orbit, the S-IVB lit again for
the translunar injection, and the stack coasting on toward the Moon. It is written in [orbital.ts](orbital.ts) as a
Saturn V record (`SaturnVRecord`, [saturn-v-record.ts](../../vehicles/saturn-v-record.ts)), and the plan is made from it
by [saturn-v-plan.ts](../../vehicles/saturn-v-plan.ts). Nothing after the injection is flown: Casper's turnaround and
docking, Orion drawn out of the adapter, the S-IVB sent to strike the Moon, the landing at Descartes and the return. The
stack is flown whole from the second cutoff, the S-IVB, its instrument unit, the adapter, Orion (with the second lunar
rover folded in its descent stage) and Casper together, with the Moon pulling on it.

## What was read

- **MSFC, Saturn V Launch Vehicle Flight Evaluation Report AS-511, Apollo 16 Mission (MPR-SAT-FE-72-1).** Tables 2-1 and
  2-2, the time bases and every event's range time; §4.1 and Tables 4-1 to 4-4, the trajectory at each event, cutoff and
  separation, and the parking orbit; Table 5-2 and §§5.1, 5.2, 5.4 and 5.5, the F-1s and the S-IC's residuals; §§6.1,
  6.3, 6.4 and 6.9 and Table 6-1, the S-II; Tables 7-1 and 7-2 and §§7.1, 7.3, 7.6 to 7.9, the S-IVB; §9.3 and Fig.
  9-12, the guidance and the pitch attitude during boost; §8.1 and §8.3, the S-II's pogo; §10.6 and Fig. 10-14, the
  separations; Tables 16-1 to 16-9, the vehicle's mass at each event. The scan's text layer is unreadable in the tables:
  every figure was read off page images, at 300 or 400 dpi where the print is worn (Fig. 9-12 traced at 600 dpi).
- **MSC, Apollo 16 Mission Report (MSC-07230)**, Table A-IV, the spacecraft's mass properties.
- **Apollo 16 Flight Journal, launch**, the air-to-ground: the CapCom's mark for Mode IV capability at 9:20.

## What the plan is written from

- **The time.** Range zero is 17:54:00 UT (§2.1), flight.ts's `launch`; first motion at 0.30 s. The flight azimuth is
  **72.034**, rolled to from the pad's 90 between 12.7 and 31.8 s (§4.1, Table 2-2); the parking orbit's inclination,
  32.540°, is the record's.
- **Mass.** Everything at first motion, 2,916,443 kg (Table 16-1, at 0.30 s). The S-IC with the small interstage (616
  kg); the aft interstage, 3,960 kg, let go at 193.5 s; the S-II with the S-II/S-IVB interstage; the tower, 4,158 kg
  (Table 16-9), at 199.8 s; the S-IVB with the instrument unit and the adapter; Orion, 16,436 kg, the rover within it
  (the evaluation gives the rover no row of its own); Casper, the spacecraft at first motion less the rest (30,370 kg:
  Table 16-9's own rows give 30,367 and sum 3 kg short of the spacecraft). The bodies sum to the first-motion mass within 2
  kg. SA-511's S-II carried no ullage motors: Tables 16-3 and 16-9 give none and no propellant for them. Table 16-1's
  kilogram column prints 21,980 kg of oxygen below the S-IC's tank at first motion; its pound table (48,237 lbm), its
  stage total and §5.2's reconstruction give 21,880, which is taken.
- **The S-IC.** Five F-1s from range zero, the centre cut by the instrument unit at 137.85 s and the four by the oxygen
  low-level sensors at 161.78 s (Table 2-2, §5.4); one F-1's flow the stage's mainstage propellant (2,072,221 kg, Table
  16-9) over the engine-seconds, 2,639.9 kg/s, at Table 5-2's mean sea-level impulse, 265.48 s.
- **The separation of the first plane.** S-IC-11 was the first S-IC to part on eight retromotors fired 1.7 s after the
  outboard cutoff (§10.6.1; S-IC-10 had four, S-IC-1 to -9 eight at 0.7 s), and the S-II had no ullage motors. The
  evaluation could not find how long the retromotors burned or their impulse; Fig. 10-14 draws the separation distance
  reconstructed from the S-IC's longitudinal acceleration, which grows at some 34 ft/s between 2.6 and 3.0 s after the
  cutoff and some 26 ft/s by 4 s. The push is taken at 10 m/s, read off that figure (estimated).
- **The S-II.** Lit at mainstage, 167.2 s, each J-2 at its reconstructed thrust and impulse at ESC+61 s (Table 6-1); the
  centre cut at 461.77 s, ESC+297.57 s, "as planned" (§6.1: the evaluation gives no reason; SA-511's centre engine
  carried a LOX feedline accumulator, the third stage to, and no 16 Hz pogo came, §§6.9 and 8.1); the four's
  mixture-ratio shift at 494.5 s, 2.3 s early, its share 0.853 (§6.3: 787,380 over 923,267 lbf); the four cut, as
  Apollo 13's and 14's, when the run has spent the stage's usable propellant (`sii.outboard.spent`), the record's 559.54
  s (the oxygen depletion cutoff, 0.33 s later than predicted) a figure the run is held to, and the separation and the
  S-IVB's start at the record's intervals after it (0.96 and 6.56 s). The usable load, 451,429 kg, is Table 16-3's less
  the 2,474 kg of pressurizing gas, within 75 kg of what Table 16-9 has the engines burn.
- **The S-IVB.** Its first burn from mainstage, 566.1 s, at Table 7-1's 206,439 lbf and 429.5 s, cut by its guidance on
  the orbit reached (Table 4-4); the injection from 9,219.0 s at Table 7-2's 206,807 lbf (both at STDV+140 s), its first
  46 s at the 4.5 mixture ratio at 0.926 of that (derived; §7.9: lit with the valve full open, commanded to 5.0 at second
  ESC+56 s), cut on its speed, 10,847.8 m/s (Table 4-2).
- **The steering.** The S-IC flies Fig. 9-12's telemetered pitch attitude traced off the page: 100 s and 10 degrees a
  square, read to a quarter of a second and a twentieth of a degree, fitted over five seconds; up the vertical to 12.7 s,
  over to 67.6 degrees at 162.5 s and held. The line dips past the plateau to 68.5 degrees at 168 s and comes back by 178
  s, through the S-IC's cutoff and separation: that is the vehicle's own motion at staging and is not taken. Table 2-2
  has the tilt arrested at 158.9 s, where the line reads 66.7 degrees. The law's targets: 172.9 km, 0.003° and 32.540° at
  the first cutoff; 303.4 km, 7.012° and 32.512° at the second.
- **In orbit, and after.** As Apollo 14's; the S-IVB's boil-off (Table 16-9: 818 kg from the hydrogen tank, 39 from the
  oxygen) not flown. The S-IVB/CSM separation's tracked state (Table 4-3, 11,099.0 s, 38.6 s later than planned) is a
  tracking fix, not a check.


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
- SA-511's S-II carried no ullage motors (deleted from AS-510): the stack gains nothing as the S-IC parts,
  and the retrorockets' push is the S-IC's alone, as before.

| Against the record | Before | Now |
| --- | --- | --- |
| Speed at S-IC/S-II separation | −38.1 m/s | −20.8 m/s |
| Speed at S-II/S-IVB separation | −88.3 m/s | −43.2 m/s |
| S-II outboard cutoff (propellant spent) | −2.87 s | −1.72 s |
| S-IVB first cutoff | +13.1 s | +7.3 s |

What is left of the S-II's early dry tank is its flow before the shift: Table 6-1's figures at ESC+61 s, held over the
high ratio's five minutes, draw some 0.3 per cent more than the stage's books (Table 16-9); the snapshot's thrust is
kept, and its flow with it. What the S-II still fell short of the record then is the subject of the section below ("The S-II's trajectory match and the
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
| Speed at S-IC/S-II separation | −20.8 m/s | −18.1 m/s |
| Speed at S-II/S-IVB separation | −43.2 m/s | −20.4 m/s |
| Height at S-II/S-IVB separation | +0.14 km | +0.24 km |
| S-IVB first cutoff | +7.31 s | +4.96 s |
| Speed at parking orbit insertion | +0.0 m/s | +0.0 m/s |

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

Flown on the record's sequence and solved law (`flyWhole`, tests/staged.test.mjs):

| | The run | The record |
| --- | --- | --- |
| S-IC centre engine cutoff, 137.85 s | 46.0 km, 2,015 m/s | 45.4 km, 2,028.4 m/s (Table 4-2) |
| S-IC/S-II separation, 163.5 s | 68.5 km, 2,716 m/s, climbing 20.2° | 67.7 km, 2,737.1 m/s, 19.642° (Table 4-3) |
| Greatest dynamic pressure | 35.2 kPa at 85.4 s | 34.8 kPa at 86.0 s (Table 4-1) |
| S-II centre engine cutoff, 461.77 s | 171.4 km, 5,575 m/s | 171.1 km, 5,596.5 m/s |
| **S-II outboard engines cutoff** | 557.82 s (propellant spent) | **559.54 s** (Table 2-2) |
| S-II/S-IVB separation | 173.1 km, 6,927 m/s | 560.5 s: 173.0 km, 6,970.3 m/s (Table 4-3) |
| **S-IVB first cutoff** | 713.52 s | **706.21 s** (Table 2-2) |
| Parking orbit | 166.6 × 168.0 km, 32.540° | 166.6 × 168.0 km, 32.540° (Table 4-4) |
| S-IVB second cutoff | 9,558.0 s, 65,405 kg | 9,558.41 s, 65,594 kg (Tables 2-2, 16-7) |
| Its C3 and eccentricity | −1,655,940 m²/s², 0.972666 | −1,657,301, 0.9726 (Table 4-2) |

**The S-IC is the record's, a little slow.** On SA-511's own attitude it comes to its centre cutoff 0.6 km high and 13
m/s slow, and to the separation 0.8 km high, 21 m/s slow and 0.5 degrees steep, within the checks; its greatest dynamic
pressure is within 1.3 per cent of the record's. The F-1s' thrust decay is flown (§5.4: 775,690 lbf s after the centre's
cutoff signal and 2,700,932 after the four's), which made up 17 m/s of the separation's 38 before it was.

**The S-II spends its propellant 1.7 s early**, within the check: after the shift its J-2s draw the low ratio's flow
(Table 6-2's books), but before it Table 6-1's ESC+61 s figures draw some 0.3 per cent more than the books. The stage is
let go 43 m/s slow, within the check, and **the S-IVB's guidance burns 7.3 s longer** than the record's to reach the
same orbit. Recorded as a miss (src/sim/misses.ts). Not adjusted.

**The injection lands on the record** by construction (its targets and its cut are the record's): what is the run's own
is when it stops, 0.4 s early, and what it weighs then, 189 kg light.

## What is estimated, or not flown

- The S-IC's attitude programme is traced off a figure of the telemetered attitude; the iterative guidance is a linear
  tangent in each of its two burns; the tower clearance yaw (1.7 to 10.9 s, ended 1.2 s late, §10.2.1) and the outboard
  F-1s' cant (20.5 s) are not flown.
- The S-II's mixture-ratio shift is flown at the record's instant, as a step in thrust and a larger one in flow (the low ratio's higher impulse).
- The first plane's push is read off Fig. 10-14 (estimated) and shared between the two sides by their masses, though the
  retromotors pushed on the S-IC alone; the second plane's push, the drag (AS-503's forebody coefficient and S-IC base pressure, read off its figures), the steering's
  authority, the S-IVB's attitude jets' and the turn to the injection's attitude are estimates (NOT FOUND), as Apollo
  14's.
- The command module's mass at launch is the mission report's after the modules parted (estimated).
- The engines' starts and the S-IVB's cutoff transients (the F-1s' and the S-II's are flown, as their cutoff impulse), and the S-IVB's boil-off and venting in orbit, are not flown.
- The rover is carried in Orion's mass and is not driven in flight.
- The aborts are said and not flown: the escape tower, Modes II, III and IV (Mode IV from 9:20, the CapCom's call).
