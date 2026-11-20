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
- **The steering.** The S-IC flies Fig. 9-4's pitch command traced off the page: the figure's first hundred seconds and
  first ten degrees are drawn short of the rest, so it is read between the gridlines found, to some two seconds and half
  a degree; up the vertical to 12.8 s, over to 67.7 degrees at 165 s and held. The figure draws the iterative guidance's
  first step 4.5 s after Table 2-2's and §9.3.2's 205.9 s, which is taken. The law's targets: 190.9 km, −0.004° and
  31.120° at the first cutoff; 318.2 km, 7.047° and 30.821° at the second.
- **In orbit, and after.** As Apollo 11's; the S-IVB's boil-off (Table 16-9: 877 kg from the hydrogen tank, 37 from the
  oxygen) not flown. The S-IVB/CSM separation's tracked state (Table 4-3, 10,949.4 s, 181 s later than planned) is a
  tracking fix, not a check.

## The run against the record

Flown on the record's sequence and solved law (`flyWhole`, tests/staged.test.mjs):

| | The run | The record |
| --- | --- | --- |
| S-IC centre engine cutoff, 135.14 s | 41.8 km, 1,926 m/s | 43.0 km, 1,915.2 m/s (Table 4-2) |
| S-IC/S-II separation, 164.8 s | 66.3 km, 2,735 m/s, climbing 19.2° | 67.9 km, 2,744.6 m/s, 19.494° (Table 4-3) |
| Greatest dynamic pressure | 35.7 kPa at 79.6 s | 31.4 kPa at 81.0 s (Table 4-1) |
| S-II centre engine cutoff, 463.09 s | 176.9 km, 5,640 m/s | 181.7 km, 5,655.4 m/s |
| S-II outboard engines cutoff | 557.39 s (propellant spent) | 559.05 s (Table 2-2) |
| S-II/S-IVB separation | 558.3 s: 186.0 km, 6,932 m/s | 560.0 s: 188.2 km, 6,985.2 m/s (Table 4-3) |
| S-IVB first cutoff | 710.27 s | 700.56 s (Table 2-2) |
| Parking orbit | 183.2 × 185.3 km, 31.120° | 183.2 × 185.3 km, 31.120° (Table 4-4) |
| S-IVB second cutoff | 9,263.72 s, 63,677 kg | 9,263.24 s, 64,387 kg (Tables 2-2, 16-7) |
| Its C3 and eccentricity | −1,741,470 m²/s², 0.971201 | −1,742,882, 0.9712 (Table 4-2) |

**The S-IC meets the dense air harder than the record.** Its greatest dynamic pressure is 35.7 kPa against 31.4, though
it comes to its centre cutoff and its separation within the checks (1.2 and 1.6 km low, 0.3 degrees flat at the
separation): the figure's distorted first hundred seconds, the drag (the Saturn IB's curve, estimated) and the control
system's following of the command (not flown) are what is left. Recorded as a miss.

**The S-II spends its propellant 1.7 s early**, for the reason Apollo 13's does (its J-2s drawing at Table 6-1's figures
with the impulse held through the mixture-ratio shift: apollo-13/mission.md), and is let go 53 m/s slow, within the
check; **the S-IVB's guidance burns 9.7 s longer** than the record's to the same orbit. Recorded as a miss. Not adjusted.

## What is estimated, or not flown

- The S-IC's attitude programme is traced off a distorted figure; the iterative guidance is a linear tangent in each of
  its two burns; the tower clearance yaw (2.0 to 9.9 s) and the outboard F-1s' cant (20.5 s) are not flown.
- The S-II's mixture-ratio shift is flown at the record's instant and as one share of thrust and flow.
- The drag curve is the Saturn IB's (estimated); the steering's authority, the S-IVB's attitude jets', the separations'
  pushes and the turn to the injection's attitude are estimates (NOT FOUND), as Apollo 11's.
- The command module's mass at launch is the mission report's after the modules parted (estimated).
- The engines' starts and cutoff transients, and the S-IVB's boil-off and venting in orbit, are not flown.
- The aborts are said and not flown: the escape tower, Modes II, III and IV (Mode IV from 9:12, the CapCom's call).
