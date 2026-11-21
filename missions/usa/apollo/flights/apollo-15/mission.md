# Apollo 15: the flight plan, from the pad through the translunar injection

What the simulator flies Apollo 15 from: SA-510's launch from Pad 39A on time, the first J mission's heavier stack on a
lower parking orbit than Apollo 14's, the S-IVB lit again for the translunar injection, and the
stack coasting on toward the Moon. It is written in [orbital.ts](orbital.ts) as a Saturn V record (`SaturnVRecord`,
[saturn-v-record.ts](../../vehicles/saturn-v-record.ts)), and the plan is made from it by
[saturn-v-plan.ts](../../vehicles/saturn-v-plan.ts). Nothing after the injection is flown: the docking, Falcon drawn out
of the adapter with the rover folded on it, the S-IVB sent to strike the Moon, the landing at Hadley–Apennine, the three
traverses and the return. The stack is flown whole from the second cutoff, the S-IVB, its instrument unit, the adapter,
Falcon (the rover in it) and Endeavour together, with the Moon pulling on it.

## What was read

- **MSFC, Saturn V Launch Vehicle Flight Evaluation Report AS-510, Apollo 15 Mission (MPR-SAT-FE-71-2).** §2.1 and
  Tables 2-1 and 2-2, range zero, the time bases and every event's range time; §4.1 and Tables 4-1 to 4-5, the
  trajectory at each event, cutoff and separation, the parking orbit and the injection; §§5.3 to 5.5 and Tables 5-1 and
  5-2, the F-1s and the S-IC's residuals; §§6.1 to 6.5, Table 6-1 and Fig. 6-5, the S-II; §§7.1, 7.7 to 7.9, Tables 7-1,
  7-3 and 7-4 and Fig. 7-9, the S-IVB; §8.3, the S-II's pogo-limiting backup cutoff; §9.3.2, Table 9-7 and Fig. 9-10, the
  guidance's events and the pitch command during boost (Fig. 9-11, the yaw command beside it); §10.6 and Figs. 10-15 and
  10-16, the separations; Tables 16-1 to 16-9, the vehicle's mass at each event. The scan's text layer is unreadable:
  every figure was read off page images, at 400 dpi where the print is worn (Tables 16-1 to 16-9), Figs. 9-10 and 10-15
  traced at 600 dpi.
- **MSC, Apollo 15 Mission Report (MSC-05161)**, Table A-III, the spacecraft's mass properties (a worn scan).
- **Apollo 15 Flight Journal, launch**, the air-to-ground: the CapCom's mark for Mode IV capability at 9:15.

## What the plan is written from

- **The launch.** Range zero was 13:34:00 UT, on time (§2.1; flight.ts has the same instant). Launched on 90 degrees and
  rolled to the flight azimuth of **80.088** between 12.2 and 23.0 s (§4.1, Table 2-2). The parking orbit was 166.0 by
  169.5 km over the evaluation's ball, 29.679° (Table 4-4), its insertion 4.39 s earlier than nominal.
- **Mass.** Everything at first motion, 2,902,833 kg (Table 16-1, at 0.30 s). The S-IC with the small interstage (no S-II
  ullage motors, and no propellant for them, from AS-510: Table 16-3); the aft interstage, 3,504 kg, let go at 191.2 s;
  the S-II with the S-II/S-IVB interstage; the tower, 4,131 kg (Table 16-9), at 195.9 s; the S-IVB with the instrument
  unit and the adapter; Falcon, 16,437 kg (Table 16-9), with the lunar roving vehicle folded in its quadrant I and in its
  mass, the table having no line for the rover; Endeavour, the spacecraft at first motion less the rest (30,358 kg:
  Table 16-9's own rows give 30,356 and sum 2 kg short of the spacecraft). The bodies sum to the first-motion mass within
  3 kg. Table 16-1's kilogram column is defaced at the S-IC's outboard cutoff (the oxygen and RP-1 in the tanks); its pound
  table, its stage total and §5.5 give 962 and 6,353 kg, which are taken.
- **The S-IC.** Five F-1s from range zero, the centre cut at 135.96 s by the instrument unit and the four at 159.56 s by
  the oxygen's low-level sensors (Table 2-2, §5.4); one F-1's flow the stage's mainstage propellant (2,068,461 kg,
  Table 16-9) over the engine-seconds, 2,671.7 kg/s, at Table 5-1's mean sea-level impulse, 264.72 s. SA-510's F-1s were
  the first reorificed after the stage's static firing and not fired again; they averaged 1,512 klbf at standard
  conditions against 1,522 predicted (§5.3), and the outboard cutoff came 0.53 s late for it.
- **The separation of the first two stages.** From AS-510 the S-IC carried four retrorockets, not eight, and the S-II no
  ullage motors; every event of time base 3 was put a second later to make up the distance (§10.6). The distance at the
  S-II's start was still less than any flight's before and less than predicted, which §10.6 lays to the F-1s' tailoff
  impulse, greater than the prediction used (Fig. 10-16). Fig. 10-15's reconstruction, traced: nothing at the physical
  separation, 1.6 s after the outboard cutoff; some 5 m/s apart as the retrorockets burned out, at 2.6 s; slowed by the
  tailoff to under 2 m/s by 4 s; some 22 ft apart at 10 per cent J-2 thrust, 4.35 s. The run flies the push as one
  impulse and none of the tailoff, so the push is the mean rate, **2.4 m/s** (derived), which puts the stages the record's
  distance apart when the J-2s start. §10.6 adds that with one of four retrorockets failed the stages could have touched,
  and that S-IC-11 on would fly eight again.
- **The S-II.** Lit at mainstage, 164.9 s, each J-2 at its reconstructed thrust and impulse at ESC+61 s (Table 6-1); the
  centre cut at 459.56 s, "as planned" (§6.1, §6.3: at ESC+297.6 s; the pogo-limiting backup cutoff, which would have cut
  it on vibration, gave no output, §8.3; the second stage to fly a LOX feedline accumulator on its centre engine); the
  four's mixture-ratio shift at 483.9 s, its share 0.857 (§6.3: 799,259 lbf at ESC+350 s over 932,634 after the centre's
  cutoff); the four cut, as Apollo 13's and 14's, when the run has spent the stage's usable propellant
  (`sii.outboard.spent`), the record's 549.06 s (the oxygen depletion cutoff, 1.16 s earlier than planned, "the result of
  increased propellant flows at low EMR", §6.5) a figure the run is held to, and the separation and the S-IVB's start at
  the record's intervals after it (1.04 and 6.64 s). The usable load, 446,490 kg, is Table 16-3's less the 2,489 kg of
  pressurizing gas, within 118 kg of what Table 16-9 has the engines burn.
- **The S-IVB.** Its first burn from mainstage, 555.7 s, at Table 7-1's 202,965 lbf and 427.6 s, cut by its guidance on
  the orbit reached (Table 4-4); the injection from 10,205.4 s at Table 7-3's 203,111 lbf (at STDV+130 s), cut on its
  speed, 10,852.9 m/s (Table 4-2). SA-510's restart was the first made with the mixture ratio valve open, at 4.5 (§7.1),
  and the valve was closed to 5.0 at ESC+64.5 s, 10,259.4 s (§7.9): the burn's first 54 s are flown at 0.894 of Table
  7-3's thrust and flow (derived from Table 16-7's mainstage propellant; Fig. 7-9 draws some 0.88). §7.9 has the oxygen
  running dry 9.41 s after the second cutoff, which the usable load counts.
- **The steering.** The S-IC flies Fig. 9-10's pitch command traced off the page, up the vertical to 12.2 s, over to 65.8
  degrees at its arrest, 156.9 s, and held to the iterative guidance's start, 202.6 s (Tables 2-2 and 9-7; the figure
  draws its plateau and its first guidance step at the same times). The figure's frame stands short of its first
  gridline by 8 per cent of a hundred seconds (273.5 pixels against the 296.6 between the others). Apollo 14's Fig. 9-4
  had the same and was read as a first hundred seconds drawn short. Here it is read as a frame that begins at 7.8 s on
  the scale of the rest: the time axis bears no 0, Fig. 9-11 beside it is framed the same (its frame 8.8 s by the same
  measure), and Fig. 9-11's yaw command draws nothing of the tower clearance yaw from 1.7 to 9.7 s, which a frame at
  range zero would have to hold. Neither reading is proved by the page; the other is in the run below. The line is drawn
  straight from the frame's corner to 5° at 29 s; the programme's start at 12.2 s is taken, and the tilt run straight from
  it. The law's targets: 172.6 km, 0.013° and 29.679° at the first cutoff; 307.5 km, 6.952° and 29.685° at the second.
- **In orbit, and after.** As Apollo 14's; the S-IVB's boil-off (Table 16-9: 1,084 kg from the hydrogen tank, 204 from the
  oxygen) not flown. The S-IVB/CSM separation's tracked state (Table 4-3, 12,147.2 s, 94.3 s later than planned) is a
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
- SA-510's S-II carried no ullage motors (deleted from AS-510): the stack gains nothing as the S-IC parts,
  and the retrorockets' push is the S-IC's alone, as before.

| Against the record | Before | Now |
| --- | --- | --- |
| Speed at S-IC/S-II separation | −23.2 m/s | −6.5 m/s |
| Speed at S-II/S-IVB separation | −77.3 m/s | −39.6 m/s |
| S-II outboard cutoff (propellant spent) | −2.49 s | −1.67 s |
| S-IVB first cutoff | +11.1 s | +6.0 s |

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
| Speed at S-IC/S-II separation | −6.5 m/s | −4.0 m/s |
| Speed at S-II/S-IVB separation | −39.6 m/s | −17.5 m/s |
| Height at S-II/S-IVB separation | −2.03 km | −1.99 km |
| S-IVB first cutoff | +6.01 s | +3.66 s |
| Speed at parking orbit insertion | +0.0 m/s | +0.1 m/s |

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
| Greatest dynamic pressure | 39.9 kPa at 81.4 s | 36.8 kPa at 82.0 s (Table 4-1) |
| S-IC centre engine cutoff, 135.96 s | 45.7 km, 2,051 m/s | 46.8 km, 2,044.7 m/s (Table 4-2) |
| S-IC/S-II separation, 161.2 s | 68.4 km, 2,756 m/s, climbing 20.5° | 70.1 km, 2,762.2 m/s, 21.021° (Table 4-3) |
| Greatest load on the S-IC | 3.87 g | 3.97 g at 159.56 s (Table 4-1) |
| S-II centre engine cutoff, 459.56 s | 174.1 km, 5,702 m/s | 178.2 km, 5,713.4 m/s |
| S-II outboard engines cutoff | 547.39 s (propellant spent) | 549.06 s (Table 2-2) |
| S-II/S-IVB separation | 174.3 km, 6,959 m/s | 550.1 s: 176.3 km, 6,999.0 m/s (Table 4-3) |
| S-IVB first cutoff | 700.69 s | 694.68 s (Table 2-2) |
| Speed at the record's insertion, 704.67 s | 7,803.8 m/s | 7,803.7 m/s (Table 4-4) |
| Parking orbit | 166.2 × 169.3 km, 29.679°, 87.84 min | 166.0 × 169.5 km, 29.679°, 87.84 min (Table 4-4) |
| S-IVB second cutoff | 10,555.8 s, 65,592 kg | 10,553.69 s, 65,576 kg (Tables 2-2, 16-7) |
| Its C3 and eccentricity | −1,523,310 m²/s², 0.974843 | −1,522,505, 0.9749 (Table 4-2) |

**The S-IC meets the dense air harder than the record.** Its greatest dynamic pressure is 39.9 kPa against 36.8 (8 per
cent over), though it comes to its centre cutoff within 6 m/s and 1.1 km, and to its separation 7 m/s slow, 1.7 km low
and 0.5° flat, within the checks: the programme read off the figure, the drag (the Saturn IB's curve, estimated) and the
control system's following of the command (not flown) are what is left. Read the other way, with Fig. 9-10's frame at
range zero, every point before 100 s comes up to 6 s earlier and the S-IC flatter: 43.7 kPa, out of the check (that
reading was flown before the engines' decay). Recorded as a miss.

**The S-II spends its propellant 1.7 s early**, within the check: after the shift its J-2s draw the low ratio's flow
(Table 6-2's books: an impulse 1.3 per cent higher than at the high ratio), but before it Table 6-1's ESC+61 s figures
draw some 0.3 per cent more than the books. It is let go 40 m/s slow, within the check; **the S-IVB's guidance burns
6.0 s longer** than the record's to the same orbit. Recorded as a miss. Not adjusted.

## What is estimated, or not flown

- The S-IC's attitude programme is traced off a figure whose time axis is read from its frame (above); the iterative
  guidance is a linear tangent in each of its two burns; the tower clearance yaw (1.7 to 9.7 s) and the outboard F-1s'
  cant (20.5 s) are not flown.
- The S-IC/S-II push is one impulse at the reconstructed distance's mean rate; the F-1s' tailoff is flown as their cutoff impulse (an even fall), all of it before the stages part.
- The S-II's mixture-ratio shift is flown at the record's instant, as a step in thrust and a larger one in flow (the low
  ratio's flow from Table 6-2's propellant mass history); the S-IVB's in the injection as one share of thrust and flow.
- The drag is AS-503's forebody coefficient and S-IC base pressure (§20.2, read off its figures: estimated); the steering's authority, the S-IVB's attitude jets', the S-II/S-IVB
  push and the turn to the injection's attitude are estimates (NOT FOUND), as Apollo 14's.
- The command module's mass at launch is the mission report's after the modules parted (estimated).
- The engines' starts and the S-IVB's cutoff transients (the F-1s' and the S-II's are flown, as their cutoff impulse), and the S-IVB's boil-off and venting in orbit, are not flown.
- The rover rides in Falcon's mass and is not driven in the flight; it is driven in its gallery.
- The aborts are said and not flown: the escape tower, Modes II, III and IV (Mode IV from 9:15, the CapCom's call).
