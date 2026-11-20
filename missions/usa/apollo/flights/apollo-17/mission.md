# Apollo 17: the flight plan, from the pad through the translunar injection

What the simulator flies Apollo 17 from: SA-512's launch from Pad 39A in the dark, 2 hours 40 minutes late, on the
azimuth that hold moved it to, the parking orbit, the S-IVB lit again for the translunar injection, and the stack coasting
on toward the Moon. It is written in [orbital.ts](orbital.ts) as a Saturn V record (`SaturnVRecord`,
[saturn-v-record.ts](../../vehicles/saturn-v-record.ts)), and the plan is made from it by
[saturn-v-plan.ts](../../vehicles/saturn-v-plan.ts). Nothing after the injection is flown: the transposition and docking,
Challenger drawn out of the adapter, the S-IVB sent to strike the Moon, the landing at Taurus–Littrow and the return. The
stack is flown whole from the second cutoff, the S-IVB, its instrument unit, the adapter, Challenger (with LRV-3 folded on
its descent stage) and America together, with the Moon pulling on it.

## What was read

- **MSFC, Saturn V Launch Vehicle Flight Evaluation Report AS-512, Apollo 17 Mission (MPR-SAT-FE-73-1).** Tables 2-1 and
  2-2, the time bases and every event's range time; §4.1 and Tables 4-1 to 4-4, the trajectory at each event, cutoff and
  separation, and the parking orbit; §§5.1 to 5.4 and Table 5-2, the F-1s and the S-IC's residuals; §§6.1, 6.3, 6.4 and
  6.9 and Table 6-1, the S-II; Tables 7-1 to 7-3 and §§7.1, 7.4, 7.8 and 7.9, the S-IVB; Fig. 9-5, the steering commands
  during the first boost; §10.3 (the commands held from the S-IC's cutoff to the iterative guidance) and §10.6 with
  Fig. 10-12, the separations; Tables 16-1 to 16-9, the vehicle's mass at each event; Appendix B, the changes from AS-511.
  The scan's text layer is a poor OCR: every figure was read off page images, at 300 to 600 dpi where the print is worn
  (Fig. 9-5 traced at 600 dpi). Table 6-1 is worn to blots even at 600 dpi: its figures were read with each engine's flow
  beside them (thrust over flow gives the impulse to the tenth) and the five thrusts with §6.3's stage total, which they
  meet within 6 lbf.
- **MSFC, Saturn V Launch Vehicle Flight Evaluation Report AS-510 (MPR-SAT-FE-71-2)**, §10 and the summary: four of the
  S-IC's eight retrorockets and all the S-II's ullage motors removed for AS-510, the eight restored from S-IC-11 on.
- **JSC, Apollo 17 Mission Report (JSC-07904)**, Table A-II, the spacecraft's mass properties, and Table 3-I.
- **Apollo 17 Flight Journal, launch**, the air-to-ground: the tower's jettison called at 3:20 and 3:21, the CapCom's mark
  for Mode IV capability at 9:21.

## What the plan is written from

- **The hold.** Range zero was 05:33:00 UT on 7 December (00:33 EST, §2.1), 2 hours 40 minutes after the planned 21:53
  EST: the terminal countdown sequencer cut the count off at T−30 s, the S-IVB oxygen tank's pressurization command not
  issued (§3). The flight azimuth is the one flown: launched on 90 degrees and rolled to **91.504** between 12.9 and 14.3 s
  (§4.1, Table 2-2), not the planned 72; the parking orbit (28.526°), the pitch commands and the injection are SA-512's as
  flown on it. The injection shortened the coast to the Moon by the 2 h 40 min (§4.1).
- **Mass.** Everything at first motion, 2,917,844 kg (Table 16-1, at 0.24 s). The S-IC with the small interstage (616 kg;
  no S-II ullage motors flew); the aft interstage, 3,908 kg, let go at 192.9 s; the S-II with the S-II/S-IVB interstage;
  the tower, 4,129 kg (Table 16-9); the S-IVB with the instrument unit and the adapter; Challenger, 16,448 kg, the folded
  rover in it (Table 16-9 has no line of its own for LRV-3); America, the spacecraft at first motion less the rest
  (30,366 kg: Table 16-9's own row gives 30,364 and its rows sum 2 kg short of the spacecraft). The bodies sum to the
  first-motion mass within 2 kg.
- **The S-IC.** Five F-1s from range zero, the centre cut at 139.30 s by the instrument unit and the four at 161.20 s by
  the **fuel** depletion sensors (Table 2-2, §5.4), 0.47 s early for a fuel made denser by its chilling through the hold;
  one F-1's flow the stage's mainstage propellant (2,076,017 kg, Table 16-9) over the engine-seconds, 2,647.6 kg/s, at
  Table 5-2's mean sea-level impulse, 265.24 s. The S-IC's eight retrorockets (AS-510 had flown four; S-IC-11 on had
  eight again) push the stages apart at about 8 m/s, read off Fig. 10-12's AS-512 points.
- **The S-II.** Lit at mainstage, 166.4 s, each J-2 at its reconstructed thrust and impulse at ESC+61 s (Table 6-1); the
  centre cut at 461.21 s by the instrument unit, as planned (the evaluation gives no reason; the centre engine carried
  the LOX feedline accumulator, and there was no pogo, §6.9); the four's mixture-ratio shift at 489.2 s, its share 0.855
  (§6.3); the four cut, as Apollo 13's and 14's, when the run has spent the stage's usable propellant
  (`sii.outboard.spent`), the record's 559.66 s (the oxygen depletion cutoff, 0.47 s early) a figure the run is held to,
  and the separation and the S-IVB's start at the record's intervals after it (0.94 and 6.54 s). The usable load,
  450,444 kg, is Table 16-3's less the 2,435 kg of pressurizing gas, within 43 kg of what Table 16-9 has the engines burn.
- **The S-IVB.** Its first burn from mainstage, 566.2 s, at Table 7-1's 205,797 lbf and 427.7 s, cut by its guidance on
  the orbit reached (Table 4-4); the injection from 11,559.1 s at Table 7-2's 205,608 lbf (at STDV+172 s), its first
  90.7 s at the 4.5 mixture ratio at 0.890 of that (derived), cut on its speed, 10,844.6 m/s (Table 4-2). Its usable load
  counts the 9.22 s of oxygen left at the second cutoff (§7.9).
- **The steering.** The S-IC flies Fig. 9-5's pitch command traced off the page against its own gridlines (found where
  the line is read; they bow by up to a degree across the figure), to some half a degree and a second, smoothed over five
  seconds: up the vertical to 12.9 s, straight to the figure's 2.9° at 20 s (before it the line lies in the zero
  gridline's stroke), over to 65.6° at the tilt's arrest, 160.1 s, and held, as §10.3 says the commands were held from
  the S-IC's cutoff to the iterative guidance at 204.1 s. The line drawn goes on down another 2.3° in that time, against
  §10.3, and is not taken. The law's targets: 170.5 km, 0.001° and 28.526° at the first cutoff; 300.0 km, 6.930° and
  28.473° at the second.
- **The orbit.** Table 4-4 does not say what ball its heights are over: no radius is given, and the plan takes the one
  its heights and period imply (6,378.3 km). The insertion is southbound: the pad lies a tenth of a degree from the
  orbit's northernmost latitude and the stack is past it, heading 105.0°.
- **The tower.** Table 2-2 has its jettison "data not available": it is estimated at 198 s from the air-to-ground (Evans's
  "there it goes" at 3:20, the skirt's call two seconds behind Table 2-2's 192.9 s).
- **In orbit, and after.** As Apollo 14's; the S-IVB's boil-off (Table 16-9: 1,041 kg from the hydrogen tank, none from
  the oxygen) not flown. The S-IVB/CSM separation's tracked state (Table 4-3, 13,347.6 s, 57.9 s earlier than planned,
  the commander's) is a tracking fix, not a check.

## What disagrees

- Table 6-1's engine figures are blots; read as above, the five thrusts sum to 1,156,700 lbf against §6.3's 1,156,694.
- §5.4 has the fuel left at the S-IC's cutoff at 26,305 lbm (11,932 kg); Table 16-1, 11,921 kg, is taken.
- Table 7-3's best estimate has 4,249 lbm of oxygen at the second cutoff; Table 16-7, 3,882 lbm in the tank (1,760 kg) and
  180 kg below it, is taken, as the rest of the mass is Table 16's.
- Fig. 9-5 keeps tilting after the arrest, which §10.3 says did not happen (above).
- AS-510 flew four S-IC retrorockets, not eight; AS-510's evaluation has the eight restored from S-IC-11 on, Appendix B
  of AS-512's lists no change to them from AS-511, and its p. 15-3 likens the separation's signal loss to prior flights'
  with eight: eight are taken.


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
- SA-512's S-II carried no ullage motors (deleted from AS-510): the stack gains nothing as the S-IC parts,
  and the retrorockets' push is the S-IC's alone, as before.

| Against the record | Before | Now |
| --- | --- | --- |
| Speed at S-IC/S-II separation | −33.5 m/s | −17.1 m/s |
| Speed at S-II/S-IVB separation | −85.8 m/s | −48.0 m/s |
| S-II outboard cutoff (propellant spent) | −2.07 s | −1.24 s |
| S-IVB first cutoff | +13.9 s | +8.9 s |

What is left of the S-II's early dry tank is its flow before the shift: Table 6-1's figures at ESC+61 s, held over the
high ratio's five minutes, draw some 0.3 per cent more than the stage's books (Table 16-9); the snapshot's thrust is
kept, and its flow with it. The S-II still falls some 25 to 40 m/s behind the record at its cutoff with the stack's mass right: its
start's rising thrust (some 3 m/s) is not flown, nor its thrust through the high ratio beyond the ESC+61 s snapshot, and
its closed loop is the law's one linear tangent. Where the tables below and the paragraphs after them give the run's
figures, they are the run as it now stands (tests/fixtures/figures.json).

## The run against the record

Flown on the record's sequence and solved law (`flyWhole`, tests/staged.test.mjs):

| | The run | The record |
| --- | --- | --- |
| S-IC centre engine cutoff, 139.30 s | 47.5 km, 2,087 m/s | 47.0 km, 2,091.8 m/s (Table 4-2) |
| S-IC/S-II separation, 162.9 s | 69.1 km, 2,737 m/s, climbing 20.9° | 68.1 km, 2,754.2 m/s, 20.151° (Table 4-3) |
| Greatest dynamic pressure | 34.9 kPa at 80.8 s | 33.6 kPa at 82.5 s (Table 4-1) |
| Greatest load on the S-IC | 3.82 g | 3.87 g at 161.20 s (Table 4-1) |
| S-II centre engine cutoff, 461.21 s | 175.1 km, 5,592 m/s | 173.0 km, 5,620.4 m/s |
| S-II outboard engines cutoff | 558.42 s (propellant spent) | 559.66 s (Table 2-2) |
| S-II/S-IVB separation | 173.8 km, 6,945 m/s | 560.6 s: 172.6 km, 6,992.8 m/s (Table 4-3) |
| S-IVB first cutoff | 711.51 s | 702.65 s (Table 2-2) |
| At the record's insertion, 712.66 s | 7,801.8 m/s | 7,804.1 m/s (Table 4-4) |
| Parking orbit | 163.2 × 170.6 km, 28.526°, 87.75 min | 166.6 × 167.2 km, 28.526°, 87.83 min (Table 4-4) |
| S-IVB second cutoff | 11,907.6 s, 65,522 kg | 11,907.64 s, 65,711 kg (Tables 2-2, 16-7) |
| Its C3 and eccentricity | −1,771,660 m²/s², 0.970757 | −1,773,210, 0.9707 (Table 4-2) |

**The S-IC is let go 17 m/s slow**, within the check: the four F-1s' cutoff decay (2,593,423 lbf s, §5.4) is flown, and
gives the stack the 7 m/s the record's gains from the outboard cutoff to the separation. It flies a little steeper than
the record (0.7° at the separation) and through 4 per cent more dynamic pressure, both within the checks.

**The S-II spends its propellant 1.2 s early**, within the check (its J-2s drawing Table 6-1's flow over the high ratio,
some 0.3 per cent more than the books), and is let go 48 m/s slow, within the check: the S-IC's 17 and the rest where the
record itself says the S-II gave the stack some 23 m/s more than its engines' reconstructed performance accounts for, 14
m/s of it unexplained (§6.3), the run flying that reconstruction. **The S-IVB's guidance burns 8.9 s longer** than the
record's to the orbit. Recorded as a miss. Not adjusted.

## What is estimated, or not flown

- The S-IC's attitude programme is traced off a figure; the iterative guidance is a linear tangent in each of its two
  burns; the tower clearance yaw (1.7 to 9.7 s) and the outboard F-1s' cant (20.6 s) are not flown.
- The S-II's mixture-ratio shift is flown at the record's instant, as a step in thrust and a larger one in flow (the low ratio's higher impulse).
- The separation of the S-IC is pushed at 8 m/s read off a figure; the drag curve is the Saturn IB's (estimated); the
  steering's authority, the S-IVB's attitude jets', the S-II/S-IVB push and the turn to the injection's attitude are
  estimates (NOT FOUND), as Apollo 11's.
- The tower's jettison instant is estimated from the air-to-ground (Table 2-2: data not available).
- The command module's mass at launch is the mission report's after the modules parted (estimated).
- The engines' starts and the S-IVB's cutoff transients (the F-1s' and the S-II's are flown, as their cutoff impulse), and the S-IVB's boil-off and venting in orbit, are not flown.
- The aborts are said and not flown: the escape tower, Modes II, III and IV (Mode IV from 9:21, the CapCom's call).
- LRV-3 rides folded in Challenger's quadrant I, its mass in the lunar module's; it is not driven in flight.
