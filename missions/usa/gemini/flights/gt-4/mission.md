# Gemini-Titan 4 as it is flown

The plan the simulator flies (`flight.plan`) is written from the record in [orbital.ts](orbital.ts) by
[gemini-titan-plan.ts](../../vehicles/gemini-titan-plan.ts) `geminiTitanPlan`, as Gemini 3's is. Every figure there
carries its confidence and source; this file says what was read, what had to be taken from elsewhere, and what the run
gives. Times are seconds (or hours:minutes:seconds) from liftoff, 15:15:59.562 UTC. The checks' tolerances were set with
the record, before the plan was first flown; the misses are in [src/sim/misses.ts](../../../../../src/sim/misses.ts),
each with its cause or "cause not established".

## 1. What there is to fly it from

Unlike Gemini 3's, this flight's own report is read: *Gemini Program Mission Report, Gemini IV* (MSC-G-R-65-3, NTRS
19670095754). From it:

- **GLV-4's weights** (section 3.3, p. 3-10, "obtained from Aerospace Corporation"): 336,000 lb at liftoff, 85,000 at
  first stage burnout, 73,400 at the second stage's steady burn, 13,300 at 20 s after its cutoff; spacecraft 4 at launch
  7,879.05 lb, at retrofire 5,432.44, at 0.05 g 4,725.71, at the main 4,415.30 (p. 3-11). Gemini 3 takes these as
  `assumed`; here they are this vehicle's and the stages' masses are `derived` from them.
- **GLV-4's engines** (Tables 5.2-II and III): the first stage's two chambers 442,433 lb and 261.47 s at standard inlet
  conditions (the table prints the impulse "361.47", a misprint: 0.30 per cent over the predicted 260.69); the second
  stage 103,103 lb and 313.49 s as flight averages (102,777 and 313.07 at standard inlet conditions, which Gemini 3 takes).
- **Every event of the launch** to the hundredth (Table 4-I), the SECO and separation states (Table 4-II), and the orbit
  at insertion and in revolutions 2, 18, 33, 52 and 61 (Table 4-III), "measured over an oblate earth" (4.3.1.2).
- **Each of the 74 thrusts of the station keeping** (Table 4-IV): its instant, thruster, length and the platform's
  gimbal angles; their sums (Table 4-V); the 4.1 ft/s of the separation and the 6 to 7 ft/s between the two (4.3.1.3);
  one aft chamber dead from 01:04:29 (5.1.8.1.4).
- **The burn before retrofire** (4.1, 4.3.1.4, 6.1.2.3), **retrofire** (5.1.8.3, Table 5.1-X), the **entry flown** (5.1.5.2.3,
  5.1.5.3.2) and the **landing system** (5.1.11, Figure 5.1-19).

Of the type, as for Gemini 3: GLV-1's first stage vacuum impulse (GT-1 report, Table 5-II), the forward thrusters' thrust
and every thruster's impulse (SP-121, Table 4-I), the retrograde rockets' thrust and burn (SP-121, the GT-3 press kit),
the parachutes (CR-1106, SEDR 300), the drag curves (none found for the Titan or for Gemini).

## 2. The ascent

The first stage burns from release on GLV-4's sea-level figures, 442,433 lb and 261.47 s, which with GLV-1's 281.1 s in
vacuum averages near the 278.61 s GLV-4 flew. On the weights' 251,000 lb burned from liftoff it runs dry at 148.3 s, 4.1 s
before the recorded cutoff at 152.43: the weights are Aerospace's round figures and the impulse is at standard inlet
conditions, and the report's own flows (1,682 lb/s on the average between its sensors, Table 5.2-II) over 152.43 s would
burn 256,400. Not adjusted: the ascent's checks hold. The second stage is lit at 152.43 s with the stages joined, the
stages part at 153.14 (both documented), and the radio guidance's loop, enabled at 162.03 s, is flown as the law's linear
tangent from there, up the plumb line to 22.95 s and a pitch-over of 15 s (estimated) before it, on the 72° azimuth, aimed
at the cutoff's 531,202 ft over the ellipsoid and +0.09° (Table 4-II).

| | Record | Flown | |
| --- | --- | --- | --- |
| Speed at cutoff, space-fixed | 25,659 ft/s (7,820.9 m/s) | 7,847.9 m/s | holds: 27 m/s over |
| Perigee (the stage's orbit) | 87.6 nmi (162.2 km) | 154.7 km | holds |
| Apogee (the stage's orbit) | 150.1 nmi (278.0 km) | 284.2 km | holds |
| Inclination | 32.53° | 32.53° | holds |
| Greatest load, second stage | 7.6 g | 7.52 g | holds |

The second stage is cut by the guidance on the orbit's period at 333.9 s (recorded 333.75), and the spacecraft parts 31.8 s
after it, pushed apart from the stage at 6.5 ft/s, the middle of the report's 6 to 7.

## 3. The orbit and the station keeping

The published orbit at insertion, 369.7 s, after the separation's 5 s of the aft thrusters: 87.6 by 152.2 nautical miles,
32.53°, 88.90 min (Table 4-III, final actual), its heights the apsides flown over the oblate earth (documented: 4.3.1.2),
its period perigee to perigee (derived: tests/periods.test.mjs; no source says). In orbit the ship drags 2.2 (King-Hele's)
on a quarter of its outside, 10.3 m² (estimated): it drifted for two and a half days.

**The station keeping is the record's 46 burns of the aft-firing and forward-firing pairs after separation** (Table 4-IV),
each at its instant and for its length, at the pairs' thrust (the aft chambers' 95 lb is this ship's, 5.1.8.1.4; the
forward ones' the type's): no burn's impulse is in the record, only the total, about 102 ft/s for all 74 (4.1). From
01:04:29 one aft chamber did not fire, and each aft burn after is flown at one chamber's push (derived). The first two,
at 8:47 and 9:20, were blunt end forward (documented). For the rest the ship was "pointed at" the stage, "generally
nose-down and rolled" (5.1.8.1.4), and each is flown pitched down by Table 4-IV's pitch gimbal angle read as degrees
below the level, forward of the plumb line (estimated): the platform was caged blunt end forward at 00:20:00, and its
angles' sign is not read; forward, because the crew had the stage "well below and in front". The yaw and roll angles are
left out. The 23 thrusts of the up-firing thrusters and the 4 of the right-firing, 67 s between them, are not flown: the
record's spacecraft has no pair that pushes across its axis.

Table 4-IV's aft burns add to 142.301 s with the separation's 5; Table 4-V has 142.299. The 0.002 s is a digit the text
layer lost; it is not looked for.

| Revolution | Record (Table 4-III) | Flown from the published orbit | Shown (from the ascent) |
| --- | --- | --- | --- |
| 2, after the station keeping | 90.4 by 159.9 nmi (167.4 by 296.1 km) | 172.3 by 296.6 km: holds | 169.3 by 299.6 km: holds |
| 18 | 89.4 by 154.9 (165.6 by 286.9) | 171.1 by 290.7: holds | 168.1 by 293.0: holds |
| 33 | 88.0 by 149.1 (163.0 by 276.1) | 169.9 by 284.8: perigee a miss | 166.9 by 286.5: apogee a miss |
| 52 | 87.4 by 141.0 (161.9 by 261.1) | 168.2 by 276.9: both miss | 165.1 by 277.7: apogee a miss |
| 61 | 86.1 by 136.5 (159.5 by 252.8) | 167.3 by 272.7: both miss | 164.2 by 273.0: apogee a miss |

The station keeping leaves the orbit within the checks of the record's, the up-firing thrusts and the attitudes left out
notwithstanding. **The orbit then decays more slowly than the record's**: by revolution 61 its apogee is 20 km high. The
report fitted its own decay with an atmosphere 0.72 of the ARDC 1959 one and gives no ballistic figure; which of the area,
the coefficient and the air of the day's Sun is short here is not established, and nothing is adjusted. The two lifetime
adjustments planned were not made (4.1), and are not flown; nor is the thruster activity of the third day that "raised
perigee 1.2 nautical miles" (4.3.1.2).

## 4. The burn before retrofire, and retrofire

The computer had failed at 75:45:43, so the ground timed both burns. The aft pair burned blunt end forward from 97:28:02
for 2 min 41 s, as Hawaii timed it, at the reconstruction's 134 ft/s (128 planned; the reconstruction that brought the
trajectory to the landing point wanted 98 lb from each aft chamber, 4.3.1.4). The equipment section went at 97:39:14, and
the four rockets at 97:40:00.7, 5.5, 5.2 and 5.8 s apart (Table 5.1-X), 333.5 ft/s (5.1.8.3: documented, against 336.3
predicted), pitched 31° as the telemetry had it (4.3.1.4; its sign, the blunt end up, taken as Mercury's). The retrograde
section went at 97:40:47.

**The run is some ten minutes behind the record's clock by then**: its slower decay leaves it on a longer period,
carried round 62 times. The ground timed both burns for where the ship was to come down, from tracking in revolution 62,
and so does the run (sim/plan.ts `LandingAim`): guidance works the instant on the state the run is in, and the burn
before retrofire, its turn to blunt end forward from 96:52:54, the equipment section and retrofire all keep their recorded
intervals to it (`LandingAim.from`, this flight's the turn: "At T -12 the OAME retrofire was started", 7.1.2.5). On the
run from the pad they are lit some ten minutes after the record's instants (the drogue 618 s late, the landing 675 s
late, both recorded misses); from there the burn before retrofire leaves a vacuum perigee of 85.3 km where the record has 42.3
nautical miles (78.3 km; read as long after the burn as the record's reading, 7 km over and a miss), and it comes down
within 10 km along the track of where Gemini IV did, but 79 km to the right of it: the Earth has turned 2.6 degrees more
under the orbit by the time the burns are lit. Flown from the published orbit the perigee is 83.4 km and holds.

## 5. The entry: rolled, with no lift

The closed-loop lifting entry planned needed the computer. **It was flown as Mercury's were: "an open-loop zero-lift
reentry technique was used. After retrofire a full-lift attitude was held until 97:42:52.5 g.e.t. at an approximate altitude
of 400 000 feet, at which time a roll rate was established"** (5.1.5.2.3): 6.5 deg/s, then 11.5, 17.5 and 23 as thrusters
stuck and the yaw and roll coupled (5.1.5.3.2). Rolling turns the lift round the motion once every 15 to 55 s, and it comes
to nothing. **The lift flown is therefore none** (`entry.lift` 0, derived); the lift the ship had and did not fly is the
programme's average 0.19 (`predicted`, estimated: spacecraft 4's own is in the report's Figure 5.1-5, not read off it).
The full lift held above 400,000 ft, where there is next to no air, is left out. The bank is held at 0 (documented) and
moves nothing. Its trim is GT-3's 8 to 9 degrees: the report puts Gemini IV's between GT-2's and GT-3's.

The record's entry pulled 7.7 g where 6.8 were planned, and 493 lb/sq ft (Table 4-II). Flown, it pulls 8.0 g and 25.6 to
25.7 kPa: both hold. Flown with the 0.19 held lift up it would pull
under 4 g (tests/orbital.test.mjs, "what a change in an input moves").

## 6. The descent

The drogue at 40,000 ft, 10,000 ft lower than the type's, at 97:50:53 (5.1.11: documented), disreefed 16 s later at
about 31,500 ft (Figure 5.1-19); the pilot parachute at 97:52:11 and the main at 97:52:14 (the figure), its height the
type's 10,600 ft (assumed); the module at 4,415.30 lb. The rendezvous and recovery section is drawn going at the main.

| | Record | Flown | Shown |
| --- | --- | --- | --- |
| Drogue | 97:50:53 | 676 s late: miss | 618 s late: miss |
| Drogue, along the track from where it landed | 27°44′ N 74°14′ W | 9.6 km short: holds | 10.0 km short: holds |
| Drogue, across the track | | 115 km right: miss | 79 km right: miss |
| Landing | 97:56:12 | | 675 s late: miss |

The burns are timed for the place, so it comes down where Gemini IV did along the track, some ten minutes late, and to
the right of it, from the Earth's turning in the time the run is behind. The record itself came down 50 nautical miles
short of the point the ground predicted, from the burn before retrofire's 6 ft/s over, the 31° attitude and the early
second (4.3.1.4), all of which the run flies; the place it came down is taken for the place its burns were timed for.

## 7. What is not flown, and what is simplified

- **The space walk** is not flown: White's 22 minutes outside, the hatch opened and shut, are the scene's (the gallery's
  slider), not the run's. The cabin's depressurisation, the gun's 4 minutes of gas and the umbilical push nothing.
- **The second stage is not flown as a target.** The plan's machinery has one (`FlightPlan.target`, Apollo 7's S-IVB),
  but a flight with a target is flown by its own tests and leaves the orbital ones (tests/orbital.test.mjs); and the
  station keeping is flown as the record's burns, not as guidance holding the ship on the stage, which it was not. The
  range to the stage (0.3 nautical mile at the nearest, 5.1 at the furthest) is not checked. The stage flies as a shed
  body from separation.
- The station keeping's 27 up-firing and right-firing thrusts, and every burn's yaw and roll, are left out; each pitch is
  an estimate read off the platform (section 3).
- The burn before retrofire and retrofire are timed for the place it came down (section 4), not for the point the ground
  predicted 50 nautical miles on.
- The spacecraft's mass in orbit is its launch weight: the fairings, what it left on the second stage and some 310 lb of
  propellant burned are not taken off, so a burn at the thrusters' thrust is a little short.
- The orbit's drag area is a quarter of the outside for all four days; it was held nose or tail first for some of them.
- The fairings go at 380 s (estimated): "as soon as the crew was in an upright position, the turnaround began, and the
  fairings were jettisoned" (7.1.2.3).
- The entry's lift is none from the retrograde section's going; the full lift held above 400,000 ft is left out.
- The first stage burns out 4.1 s early on the weights' propellant (section 2).
