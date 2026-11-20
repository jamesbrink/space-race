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
- **The S-II.** Lit at mainstage, 166.2 s (the start's two seconds of rising thrust and its 594 kg are not flown), each
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
- **The steering.** The S-IC flies Fig. 10-4's pitch command open, read off the page: up the launch vertical to 13.2 s,
  over to 69.5 degrees from it at 161 s and held there, rolled from the pad's 90 degrees to the flight azimuth of
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

## The run against the record

Flown on the record's sequence and solved law (`flyWhole`, tests/staged.test.mjs; the figures are tests/fixtures/figures.json's):

| | The run | The record |
| --- | --- | --- |
| S-IC centre engine cutoff, 135.2 s | 40.3 km, 2,044 m/s | 44.0 km, 1,979.0 m/s (Table 4-2) |
| S-IC/S-II separation, 162.3 s | 60.7 km, 2,819 m/s, climbing 16.6° | 66.7 km, 2,773.9 m/s, 19.02° (Table 4-3) |
| Greatest dynamic pressure | 44.4 kPa at 86.5 s | 35.2 kPa at 83.0 s (Table 4-1) |
| S-II centre engine cutoff, 460.62 s | 164.7 km, 5,717 m/s | 180.2 km, 5,707.5 m/s |
| S-II/S-IVB separation, 549.0 s | 179.7 km, 6,917 m/s | 187.4 km, 6,918.8 m/s |
| S-IVB first cutoff | 703.4 s | 699.34 s (Table 2-2) |
| Parking orbit insertion, 709.34 s | 7,793.0 m/s | 7,793.1 m/s (Table 4-5) |
| S-IVB second cutoff | 10,206.9 s, 63,355 kg | 10,203.07 s (Table 2-2), 63,189 kg (Table 20-7) |
| Its C3 and eccentricity | −1,487,246 m²/s², 0.975374 | −1,487,528, 0.975371 (Table 4-2) |

**The S-IC flies flatter than the record on the record's own commands.** At the centre engine's cutoff it is 4 km
lower and 65 m/s faster, climbing three degrees flatter, and it meets the thick air faster: its greatest dynamic
pressure is a quarter over the record's. Tried as a diagnosis and not flown, half again or twice the drag (the curve is
estimated: the Saturn V's has not been read) slows it but leaves it as flat and lower still; the attitude is the
command and the thrust Fig. 5-3's within a per cent or two. What is left is the reading of the figure's first thirty
seconds, where the drawn line leaves zero before the programme's start, and the control system's own following of its
command, which is not flown: the law puts the axis on the command at once. The S-II's closed loop takes it to the
record's speeds within 20 m/s, but 8 to 15 km lower until the S-IVB, and the S-IVB's guidance makes the orbit four
seconds after the record's cutoff. Recorded as misses (src/sim/misses.ts).

**The injection lands on the record.** Its height, climb and inclination are the law's targets and its cut is the
record's speed, so its C3 and eccentricity agree by construction: what is the run's own is when it stops and what it
weighs then, 3.8 s late and 166 kg heavy, the stack having made its orbit on 4 s more of its first burn and carried its
boiled-off hydrogen. **The J-2's cutoff impulse is not flown**: 239,061 N s after the second cutoff signal (§7.8), 3.8
m/s on the stack, which is the difference between Table 4-2's C3 at the signal and Table 4-6's at the injection ten
seconds later (−1,391,607 m²/s²). The run's coast lacks it.

## What is estimated, or not flown

- The S-IC's attitude programme is read off a figure; the iterative guidance is a linear tangent in each of its two
  burns; the tower clearance yaw (1.7 to 9.7 s) and the S-IC's outboard engines' cant (20.6 s) are not flown.
- The drag curve is the Saturn IB's (estimated), on the 33 ft disc; the stack's area in orbit is a quarter of its outside.
- The steering's authority, the S-IVB's attitude jets' and the separations' pushes are estimates (NOT FOUND).
- The command module's mass at launch is the mission report's after the modules parted (estimated).
- The engines' starts (ullage, chilldown, the S-IVB's restart preparations) and their cutoff transients are not flown.
- The aborts are said and not flown: the escape tower, Mode II, Mode III and Mode IV (press kit, p. 78).
