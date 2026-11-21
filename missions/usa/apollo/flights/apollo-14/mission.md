# Apollo 14: the flight plan, from the pad through the translunar injection

What the simulator flies Apollo 14 from: SA-509's launch from Pad 39A forty minutes late, on the azimuth that hold moved
it to, the parking orbit, the S-IVB lit again for the translunar injection, and the stack coasting on toward the Moon.
It is written in [orbital.ts](orbital.ts) as a Saturn V record (`SaturnVRecord`,
[saturn-v-record.ts](../../vehicles/saturn-v-record.ts)), and the plan is made from it by
[saturn-v-plan.ts](../../vehicles/saturn-v-plan.ts). Nothing after the injection is flown: the six docking attempts,
Antares drawn out of the adapter, the S-IVB sent to strike the Moon, the landing at Fra Mauro and the return. The stack
is flown whole from the second cutoff, the S-IVB, its instrument unit, the adapter, Antares and Kitty Hawk together,
with the Moon pulling on it.

## What was read

- **MSFC, Saturn V Launch Vehicle Flight Evaluation Report AS-509, Apollo 14 Mission (MPR-SAT-FE-71-1).** Tables 2-1 and
  2-2, the time bases and every event's range time; §4.1 and Tables 4-1 to 4-5, the trajectory at each event, cutoff and
  separation, the parking orbit and the injection; Tables 5-1 and 5-2 and §§5.4 and 5.5, the F-1s and the S-IC's
  residuals; §§6.1 and 6.3 to 6.5 and Tables 6-1 and 6-3, the S-II; Tables 7-1 to 7-3 and §§7.1, 7.4, 7.8 and 7.9, the
  S-IVB; §9.3 and Fig. 9-4, the guidance's phases and the attitude commands during boost; Tables 16-1 to 16-9, the
  vehicle's mass at each event. The scan's text layer is unreadable: every figure was read off page images, at up to
  300 dpi where the print is worn (Fig. 9-4 traced at 600 dpi).
- **MSC, Apollo 14 Mission Report (MSC-04112)**, Table A-II, the spacecraft's mass properties.
- **Apollo 14 Flight Journal, launch**, the air-to-ground: the weather hold at T−8:02, the CapCom's mark for Mode IV
  capability at 9:12.

## What the plan is written from

- **The hold.** Liftoff was 21:03:02 UT, 40 minutes and 2 seconds after the planned 20:23 (flight.ts `weatherHold`,
  §3.3), a cloud over the pad. The flight azimuth is the one flown: launched on 90 degrees and rolled to **75.558**
  between 12.8 and 28.0 s (§4.1), not the planned 72; the parking orbit (31.120°), the pitch commands and the
  injection are SA-509's as flown on it. §7.1 puts part of the S-IVB's 4.1 s shorter first burn on the change of
  azimuth.
- **Mass.** Everything at first motion, 2,911,097 kg (Table 16-1, at 0.20 s). The S-IC with the small interstage and
  the S-II's ullage propellant; the aft interstage, 3,945 kg, let go at 194.8 s; the S-II with the S-II/S-IVB
  interstage; the tower, 4,094 kg (Table 16-9), at 200.7 s; the S-IVB with the instrument unit and the adapter;
  Antares, 15,279 kg; Kitty Hawk, the spacecraft at first motion less the rest (29,235 kg: Table 16-9's own rows give
  29,233 and sum 2 kg short of the spacecraft). The bodies sum to the first-motion mass within 4 kg. Table 16-1's
  kilogram column is defaced at the S-IC's outboard cutoff (79 and 3,694 kg in the tanks); its pound table, its stage
  total and Table 5-2 give 980 and 8,694 kg, which are taken.
- **The S-IC.** Five F-1s from range zero, the centre cut at 135.14 s and the four at 164.10 s (Table 2-2); one F-1's
  flow the stage's mainstage propellant (2,072,527 kg, Table 16-9) over the engine-seconds, 2,618.3 kg/s, at Table 5-1's
  mean sea-level impulse, 264.52 s.
- **The S-II.** Lit at mainstage, 168.5 s, each J-2 at its reconstructed thrust and impulse at ESC+61 s (Table 6-1); the
  centre cut at 463.09 s, "as planned" (§6.3: the evaluation gives no reason; SA-509's centre engine carried a LOX
  feedline accumulator, the first, against pogo); the four's mixture-ratio shift at 473.1 s, its share 0.839 (§6.3); the
  four cut, as Apollo 13's, when the run has spent the stage's usable propellant (`sii.outboard.spent`), the record's
  559.05 s (the oxygen depletion cutoff, 2.2 s later than predicted) a figure the run is held to, and the separation and
  the S-IVB's start at the record's intervals after it (0.95 and 6.85 s). The usable load, 446,665 kg, is Table 16-3's
  less the 2,635 kg of pressurizing gas, within 116 kg of what Table 16-9 has the engines burn.
- **The S-IVB.** Its first burn from mainstage, 565.9 s, at Table 7-1's 201,572 lbf and 427.1 s, cut by its guidance on
  the orbit reached (Table 4-4); the injection from 8,914.9 s at Table 7-2's 201,738 lbf (at STDV+200 s), its first
  135 s at the 4.5 mixture ratio at 0.894 of that (derived), cut on its speed, 10,832.9 m/s (Table 4-2).
- **The steering.** The S-IC flies Fig. 9-4's pitch command traced off the page along the middle of the line's stroke
  at 600 dpi: up the vertical to 12.8 s, straight to the figure's 4.9 degrees at 30 s, over to 67.7 degrees at 165 s and
  held. The figure is read with its frame beginning at 9.0 s and 1.6 degrees, on the scale of the rest (below, "Two
  readings of Fig. 9-4"). The figure draws the iterative guidance's first step 4.5 s after Table 2-2's and §9.3.2's
  205.9 s, which is taken. The law's targets: 190.9 km, −0.004° and 31.120° at the first cutoff; 318.2 km, 7.047° and
  30.821° at the second.
- **In orbit, and after.** As Apollo 11's; the S-IVB's boil-off (Table 16-9: 877 kg from the hydrogen tank, 37 from the
  oxygen) not flown. The S-IVB/CSM separation's tracked state (Table 4-3, 10,949.4 s, 181 s later than planned) is a
  tracking fix, not a check.


## Two readings of Fig. 9-4

Fig. 9-4's frame stands short of its first gridline on both axes. Measured on the page scanned at 600 dpi, its time
gridlines (labelled 100 to 700 s) stand 202.8 pixels apart within a pixel, but the frame lies 184.5 pixels before the
100 s line, 9.0 s short; its degree gridlines stand some 140 pixels apart, but the top of the frame lies 118 pixels above
the −10° line, 1.6° short. The figure labels the frame's corner 0. Two readings follow:

- **The first hundred seconds and ten degrees drawn short** (as first read, #184): the frame is range zero and 0°, and
  the first interval on each axis is squeezed. The pitch line then leaves zero at some 10 s, before the programme's start
  at 12.8 s, and tilts 8.6° by 30 s, 17.7° by 50 s and 33.4° by 80 s.
- **The frame begins at 9.0 s and 1.6° on the scale of the rest** (taken). Three things on the page support it, as they
  do for AS-510's Fig. 9-10 (apollo-15/mission.md): the yaw panel under it, framed the same, draws nothing of the tower
  clearance yaw (1.7 to 9.7 s, Table 2-2), which AS-506's Fig. 10-4, framed from −100 s, draws plainly; the pitch line
  comes into the frame through its top edge at 18.4 s, after the programme's start, where it has already turned 1.6°;
  and the first intervals are short by the same proportion on both axes. The line then tilts 4.9° by 30 s, 14.2° by 50 s
  and 30.4° by 80 s, closer to AS-510's (5.5° at 30 s) and AS-503 to AS-507's (4 to 7.6°); from 100 s on the two
  readings agree within half a degree.

Flown each way (the same run otherwise, with the engines' decay, the S-II's flow and its ullage motors):

| | Drawn short | Frame at 9.0 s (taken) | The record |
| --- | --- | --- | --- |
| Greatest dynamic pressure | 35.7 kPa at 79.5 s | 31.6 kPa at 78.6 s | 31.4 kPa at 81.0 s |
| S-IC centre cutoff | 41.8 km, 1,926 m/s | 43.7 km, 1,880 m/s | 43.0 km, 1,915.2 m/s |
| S-IC/S-II separation | 66.4 km, 2,754 m/s, 19.2° | 69.2 km, 2,704 m/s, 20.3° | 67.9 km, 2,744.6 m/s, 19.494° |
| S-II/S-IVB separation | 186.5 km, 6,967 m/s | 188.2 km, 6,921 m/s | 188.2 km, 6,985.2 m/s |
| S-IVB first cutoff | 705.1 s | 712.2 s | 700.56 s |

Read with the frame at 9.0 s, the greatest dynamic pressure and the heights are the record's; the stack climbs steeper
than the record and comes to the S-IC's separation 41 m/s slow (within the check), and the S-II lets the S-IVB go 64 m/s
slow (out of it, recorded). Read drawn short, the S-IC is flatter (4.3 kPa over at the greatest dynamic pressure, out of
its check) and the S-II holds. The truth may lie between; the page's evidence is for the frame at 9.0 s.


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
| Speed at S-IC/S-II separation | −9.4 m/s | −40.9 m/s |
| Speed at S-II/S-IVB separation | −53.4 m/s | −64.3 m/s |
| S-II outboard cutoff (propellant spent) | −1.66 s | −1.27 s |
| S-IVB first cutoff | +9.7 s | +11.7 s |

(Now includes Fig. 9-4 read with its frame at 9.0 s, above: on the first reading the S-IC/S-II separation is +9.4 m/s and the S-II/S-IVB −18.0.)

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
| Speed at S-IC/S-II separation | −40.9 m/s | −38.2 m/s |
| Speed at S-II/S-IVB separation | −64.3 m/s | −41.6 m/s |
| Height at S-II/S-IVB separation | −0.05 km | +0.18 km |
| S-IVB first cutoff | +11.65 s | +9.28 s |
| Speed at parking orbit insertion | −10.9 m/s | +0.0 m/s |

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
| S-IC centre engine cutoff, 135.14 s | 43.6 km, 1,880 m/s | 43.0 km, 1,915.2 m/s (Table 4-2) |
| S-IC/S-II separation, 164.8 s | 69.2 km, 2,704 m/s, climbing 20.3° | 67.9 km, 2,744.6 m/s, 19.494° (Table 4-3) |
| Greatest dynamic pressure | 31.6 kPa at 78.6 s | 31.4 kPa at 81.0 s (Table 4-1) |
| S-II centre engine cutoff, 463.09 s | 181.7 km, 5,619 m/s | 181.7 km, 5,655.4 m/s |
| S-II outboard engines cutoff | 557.78 s (propellant spent) | 559.05 s (Table 2-2) |
| S-II/S-IVB separation | 188.1 km, 6,921 m/s | 560.0 s: 188.2 km, 6,985.2 m/s (Table 4-3) |
| S-IVB first cutoff | 712.21 s | 700.56 s (Table 2-2) |
| Parking orbit | 183.2 × 185.3 km, 31.120° | 183.2 × 185.3 km, 31.120° (Table 4-4) |
| S-IVB second cutoff | 9,262.9 s, 63,521 kg | 9,263.24 s, 64,387 kg (Tables 2-2, 16-7) |
| Its C3 and eccentricity | −1,741,960 m²/s², 0.971193 | −1,742,882, 0.9712 (Table 4-2) |

**The S-IC climbs steeper than the record**, on Fig. 9-4 read with its frame at 9.0 s ("Two readings of Fig. 9-4",
above): its greatest dynamic pressure is the record's, 31.6 kPa against 31.4, but it comes to its centre cutoff 0.6 km
high and 35 m/s slow and to its separation 1.3 km high, 41 m/s slow and 0.8° steep, within the checks.

**The S-II spends its propellant 1.3 s early**, its J-2s drawing Table 6-1's flow over the high ratio (some 0.3 per cent
more than the books), and from the S-IC's slower start is let go 64 m/s slow, out of the check; **the S-IVB's guidance
burns 11.6 s longer** than the record's to the same orbit, and is still burning at the record's insertion instant, 11
m/s slow. Recorded as misses. Not adjusted.

## What is estimated, or not flown

- The S-IC's attitude programme is traced off a distorted figure; the iterative guidance is a linear tangent in each of
  its two burns; the tower clearance yaw (2.0 to 9.9 s) and the outboard F-1s' cant (20.5 s) are not flown.
- The S-II's mixture-ratio shift is flown at the record's instant, as a step in thrust and a larger one in flow (the low ratio's higher impulse).
- The drag is AS-503's forebody coefficient and S-IC base pressure (§20.2, read off its figures: estimated); the steering's authority, the S-IVB's attitude jets', the separations'
  pushes and the turn to the injection's attitude are estimates (NOT FOUND), as Apollo 11's.
- The command module's mass at launch is the mission report's after the modules parted (estimated).
- The engines' starts and the S-IVB's cutoff transients (the F-1s' and the S-II's are flown, as their cutoff impulse), and the S-IVB's boil-off and venting in orbit, are not flown.
- The aborts are said and not flown: the escape tower, Modes II, III and IV (Mode IV from 9:12, the CapCom's call).
