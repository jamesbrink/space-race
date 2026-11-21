# Apollo 13: the flight plan, from the pad through the translunar injection

What the simulator flies Apollo 13 from: SA-508's launch from Pad 39A, with the S-II's centre engine shutting itself down
132 seconds early, the parking orbit, the S-IVB lit again for the translunar injection, and the stack coasting on toward
the Moon. It is written in [orbital.ts](orbital.ts) as a Saturn V record (`SaturnVRecord`,
[saturn-v-record.ts](../../vehicles/saturn-v-record.ts)), and the plan is made from it by
[saturn-v-plan.ts](../../vehicles/saturn-v-plan.ts). Nothing after the injection is flown: the transposition and
docking, Aquarius drawn out of the adapter, the S-IVB sent to strike the Moon, and everything that followed the failure
of Odyssey's second oxygen tank at 55:54:53, two days out. The stack is flown whole from the second cutoff, the S-IVB,
its instrument unit, the adapter, Aquarius and Odyssey together, with the Moon pulling on it.

## What was read

- **MSFC, Saturn V Launch Vehicle Flight Evaluation Report AS-508, Apollo 13 Mission (MPR-SAT-FE-70-2).** Table 2-2,
  every event's range time; Tables 4-1 to 4-6, the trajectory at each event, cutoff and separation, the parking orbit
  and the injection; Table 5-1 and §§5.4 and 5.5, the F-1s and the S-IC's residuals; §§6.3 to 6.5 and Tables 6-1 and
  6-3, the S-II's J-2s, the centre engine's shutdown, the mixture-ratio shift and the oxygen depletion cutoff; Tables 7-1
  to 7-3 and §§7.4, 7.8 and 7.9, the S-IVB's two burns and its propellant; Fig. 9-4, the launch vehicle digital
  computer's attitude commands during boost; Tables 16-1 to 16-9, the vehicle's mass at each event. A clean typeset scan:
  every figure was read off page images (the mass tables at 170 dpi, Fig. 9-4 traced at 600 dpi).
- **MSC, Apollo 13 Mission Report (MSC-02680)**, Table A-I, the spacecraft's mass properties.
- **Apollo 13 Flight Journal, launch and ascent**, the air-to-ground: the CapCom's mark for Mode IV capability at 9:48.

## What the plan is written from

- **Mass.** Everything at first motion, 2,909,780 kg (Table 16-1, the holddown arms' release at 0.30 s). The S-IC with
  the small S-IC/S-II interstage and the S-II's ullage propellant that leave with it; the S-II's aft interstage, 3,972
  kg, let go at the second plane (194.3 s); the S-II with the S-II/S-IVB interstage; the tower, 4,078 kg (Table 16-9),
  pulled clear by its jettison motor (assumed: Apollo 7's); the S-IVB with the instrument unit and the adapter;
  Aquarius, 15,192 kg; Odyssey, 28,936 kg. The bodies sum to the record's first-motion mass within 4 kg, its rows'
  rounding.
- **The S-IC.** Five F-1s from range zero, the centre cut at 135.18 s and the four at 163.60 s (Table 2-2). One F-1's
  flow is the stage's mainstage propellant (2,074,484 kg, Table 16-9) over the engine-seconds the run burns them,
  2,627.3 kg/s; its sea-level impulse is Table 5-1's mean, 264.96 s; its thrust in vacuum adds one atmosphere on the
  nozzle's 11 ft 7 in exit (the type's figure).
- **The S-II, and its centre engine.** Lit at mainstage, 168.0 s, each J-2 at its reconstructed thrust and impulse at
  ESC+62 s (Table 6-1). **The centre engine's early cut is the record's**: at 330.65 s (Table 2-2, its solenoid
  deactivation signal, 132.36 s before its planned cutoff) it shut itself down, its thrust-OK pressure switches dropping
  out under a 14 to 16 Hz oscillation in the stage (§6.3, §8.2.3), and the plan cuts it there. **The four outboard
  engines' longer burn is the run's own.** They were cut by the stage's oxygen depletion cutoff (§§6.4, 6.5), 34.5 s
  later than predicted; the plan cuts them when the run has spent the stage's usable propellant
  (`sii.outboard.spent`, saturn-v-plan.ts `siiSpent`, the instant sim/staged.ts's `schedule` finds the tank dry, a
  test holding the two together), and lets the S-II go and lights the S-IVB at the record's intervals after that
  cutoff (0.86 and 6.76 s), as the instrument unit's time base 4, begun at the cutoff, timed them. The usable load is
  what was in and below the tanks at ignition less what was left at the cutoff (Table 16-3), and less the 3,113 kg the
  tanks' ullage gas grew by, drawn off the propellant to pressurize them and not through the engines (Table 6-1's flows
  exclude it): 445,312 kg, within 101 kg of what Table 16-9 has the engines burn from the start's rise to the cutoff's
  decay. The mixture-ratio shift is at the record's instant, 537.5 s, 33.7 s late: the instrument unit commanded it on
  reaching a preprogrammed velocity increase (§6.5), which the run does not compute; its share of thrust and flow,
  0.746, is the stage's thrust after it over the four's before it (§6.3).
- **The S-IVB.** Its first burn from mainstage at Table 7-1's 199,577 lbf and 427.2 s, cut by its guidance where the
  orbit reached is the published one (Table 4-5, over the stated 6,378.165 km ball): **it burns as long as the run's
  lower stages leave it to**, and the record's 749.83 s (44.06 s later than predicted, a burn 9.3 s longer) is a figure
  the run is held to. The injection, from mainstage at 9,348.9 s at Table 7-2's 198,536 lbf, its first 100 s at the
  4.5 mixture ratio at 0.856 of that (derived, as Apollo 11's), cut by its guidance on its speed, 10,839.5 m/s (Table
  4-2).
- **The steering.** The S-IC flies Fig. 9-4's pitch command open, traced off the page: up the launch vertical to 12.6
  s, over to 69.0 degrees from it at 165 s and held there, rolled from the pad's 90 degrees to the flight azimuth of
  72.043 between 12.6 and 32.1 s. The figure's line leaves zero ahead of 12.6 s, as Apollo 11's does: the tilt is run
  straight from 12.6 s to the figure's 6.6 degrees at 30 s, which the line meets from 20 s. From 204.5 s, the iterative
  guidance's start, the law's linear tangent, solved for the first cutoff's height (191.6 km), climb (0.004°) and the
  parking orbit's inclination (32.525°); the injection on a law of its own, solved for 324.0 km, 7.182° and 31.818°.
- **In orbit, and after.** As Apollo 11's: held level by the S-IVB's attitude jets, turned to the injection's attitude
  200 s before it lights (estimated), the S-IVB's boil-off in orbit (Table 16-9: 847 kg from the hydrogen tank) not
  flown; after the injection the coast with J2 and the Moon. The S-IVB/CSM separation's tracked state (Table 4-3,
  11,198.9 s) is a tracking fix, not a check.


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
- **Its S-II's four ullage motors (assumed as Apollo 11's), some 2.2 m/s**, given to the stack as the S-IC parts (plan.ts `JointDef.ahead`).

| Against the record | Before | Now |
| --- | --- | --- |
| Speed at S-IC/S-II separation | −20.7 m/s | −1.8 m/s |
| Speed at S-II/S-IVB separation | −73.4 m/s | −29.7 m/s |
| S-II outboard cutoff (propellant spent) | −2.85 s | −2.15 s |
| S-IVB first cutoff | +11.5 s | +5.5 s |

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
| Speed at S-IC/S-II separation | −1.8 m/s | +1.2 m/s |
| Speed at S-II/S-IVB separation | −29.7 m/s | −5.4 m/s |
| Height at S-II/S-IVB separation | −1.05 km | −0.78 km |
| S-IVB first cutoff | +5.49 s | +3.08 s |
| Speed at parking orbit insertion | +0.1 m/s | +0.1 m/s |

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
| S-IC centre engine cutoff, 135.18 s | 42.9 km, 1,929 m/s | 43.5 km, 1,928.9 m/s (Table 4-2) |
| S-IC/S-II separation, 164.3 s | 67.0 km, 2,753 m/s, climbing 19.0° | 68.0 km, 2,754.3 m/s, 19.383° (Table 4-3) |
| Greatest dynamic pressure | 32.2 kPa at 83.1 s | 31.2 kPa at 81.3 s (Table 4-1) |
| S-II centre engine cutoff, 330.65 s | 158.5 km, 3,899 m/s | 159.6 km, 3,919.6 m/s |
| **S-II outboard engines cutoff** | 590.50 s (propellant spent) | **592.64 s** (Table 2-2; predicted 558.11) |
| S-II/S-IVB separation | 188.2 km, 6,866 m/s | 593.5 s: 189.2 km, 6,895.9 m/s (Table 4-3) |
| **S-IVB first cutoff** | 755.32 s | **749.83 s** (Table 2-2; predicted 705.76) |
| Parking orbit | 184.1 × 185.5 km, 32.525° | 183.9 × 185.7 km, 32.525° (Table 4-5) |
| S-IVB second cutoff | 9,699.5 s, 62,571 kg | 9,697.17 s, 62,911 kg (Tables 2-2, 16-7) |
| Its C3 and eccentricity | −1,461,790 m²/s², 0.975812 | −1,463,628, 0.9758 (Table 4-2) |

**The S-IC is the record's.** On SA-508's own commands, with the F-1s' cutoff decay flown, it comes to the S-II within a
kilometre and 2 m/s of the record, climbing 0.4 degrees flatter, its greatest dynamic pressure within the check. (Apollo
11's S-IC flies 1.8 degrees flat on its own figure: see apollo-11/mission.md.)

**The early centre cutoff costs what it cost the record, and the run makes it up as the vehicle did.** With four
engines from 330.65 s the S-II burns from mainstage until its propellant is spent, at 590.50 s against the record's
592.64 (34.5 s more than predicted), and the S-IVB's guidance burns on until the orbit is the record's, 5.5 s longer
than the record's. The S-II's tank is still dry 2.1 s early: after the shift its J-2s draw the low ratio's flow, but
before it Table 6-1's ESC+62 s figures draw some 0.3 per cent more than the books over the high ratio's six minutes.
It is let go 30 m/s slow, within the check. Recorded as misses (src/sim/misses.ts): the S-II's cutoff and the S-IVB's
first cutoff. Not adjusted.

**The injection lands on the record** by construction (its targets and its cut are the record's): what is the run's
own is when it stops, 2.3 s late, and what it weighs then, 340 kg light.

## What is estimated, or not flown

- The S-IC's attitude programme is traced off a figure; the iterative guidance is a linear tangent in each of its two
  burns; the tower clearance yaw (2.3 to 10.0 s) and the outboard F-1s' cant (20.6 s) are not flown.
- The S-II's mixture-ratio shift is flown at the record's instant, not on the instrument unit's velocity increment, and
  as a step in thrust and a larger one in flow (AS-503's reconstructed impulse at the low ratio, assumed); the centre engine's oscillation itself (the pogo, ±236 psi in its chamber) is not
  flown, only its cutoff.
- The drag is AS-503's forebody coefficient and S-IC base pressure (§20.2, read off its figures: estimated); the steering's authority, the S-IVB's attitude jets', the separations'
  pushes and the turn to the injection's attitude are estimates (NOT FOUND), as Apollo 11's.
- The command module's mass at launch is the mission report's after the modules parted (estimated).
- The engines' starts and the S-IVB's cutoff transients (the F-1s' and the S-II's are flown, as their cutoff impulse), and the S-IVB's boil-off and venting in orbit, are not flown.
- The aborts are said and not flown: the escape tower, Modes II, III and IV (Mode IV from 9:48, the CapCom's call).
