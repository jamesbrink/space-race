# Gemini-Titan 6A as it is flown

The plan the simulator flies (`flight.plan`) is written from the record in [orbital.ts](orbital.ts) by
[gemini-titan-plan.ts](../../vehicles/gemini-titan-plan.ts) `geminiTitanPlan`, as Gemini-Titan 3's and 7's are. Every figure
there carries its confidence and source; this file says what was read, what had to be taken from elsewhere, and what the run
gives. Times are from liftoff, 13:37:26.471 UTC, 15 December 1965: the flight flown. The count of 12 December, which ended
with the engines shut down on the pad 1.2 s after they lit, is the README's history and is not flown. The misses are in
[src/sim/misses.ts](../../../../../src/sim/misses.ts), each with its cause.

## 1. What there is to fly it from

**The mission report (MSC-G-R-66-2) was looked for a third time and not found.** In November 2026 the To the Moon
archive's `gemini_6A_mission_report.pdf` was read: it is MSC-G-R-65-5, the report on the October count, as the sources
already say; its other Gemini file names did not answer. Scribd's copy (document 43455242) is behind its wall. What the
record rests on instead:

- **GLV-6's own evaluation** (Martin, ER 13227-6): the weights from loading to 20 s after cutoff (Table II-10, with its
  notes: the outages, and 767 lb of usable propellant still in the second stage), the events from its telemetry (Table
  II-4), the trajectory at BECO and 20 s after cutoff (Table II-6), the engines as flown (Tables III-2, III-3, III-8), the
  staging (II.C).
- **The rendezvous**: the planners' paper (Lineberry, SP-121 paper 28: the burns' impulses), the crew's account as SP-4203
  tells it (pp. 286 to 291: the burns' instants and the entry), the computer's record (IBM's post-flight report: the
  coelliptic burn's mode at 13,621 s, the terminal phase at 19,139 s and its three displays).
- **SP-4002's Table A** (the orbit at insertion and at retrofire, the retrofire, the landing) and **TRW's guidance
  reconstruction** (the liftoff, the retrofire state, the landing by the ship's navigation).
- **Gemini VII's report** for what spacecraft 6's own is lacking: its weights after launch and its retrofire, `assumed`.

## 2. The ascent

GLV-6 on its own weights: 342,472 lb at liftoff with spacecraft 6 (7,821), 84,928 at the first stage's cutoff, 72,962 at
the second stage's start, 14,052 twenty seconds after its cutoff, worked into the two stages as Gemini 3's are. The first
stage's two chambers at their standard inlet figures as flown, 427,396 lb and 260.02 s at 55 s (Table III-3), taken for
sea level, the vacuum impulse raised by GLV-1's rise (assumed): flown, its average thrust from liftoff to burnout is
452,713 lb against the flight's 453,793 (Table III-2). It is 2,995 m/s as it runs dry at 156.7 s, where the evaluation has
9,980 ft/s (3,042 m/s) at 157.16: 47 m/s short. The same figures for GLV-7, flown the same way, give its cutoff speed to a
metre a second; GLV-7's engine on this vehicle gives 3,049. Why GLV-6's own figures fall short of its own tracked speed is
not established, and nothing is adjusted. The second stage GLV-6's flight average, 101,334 lb and 311.09 s, lit when its
chamber pressure rose, at 157.829 s (Table II-4), and holding the 767 lb of usable propellant the evaluation says was still
in it after cutoff: the radio guidance cut it on the orbit, as the run's guidance does. With that the stage makes up the
first stage's shortfall and is cut on the orbit at 339.86 s (338.737 recorded).

The law: the 81.4° azimuth, up the plumb line to 22.99 s, a pitch-over of 15 s (estimated), the linear tangent from
staging, aimed at the geodetic height 20 s after cutoff, 529,960 ft (the evaluation's radius less its height is the
ellipsoid's to a hundred metres), +0.025°, and **28.97°**: the radio guidance steered the stage sideways into Gemini VII's
plane (the "dog-leg"), and the law solves its plane for that inclination.

| | Record | Flown | |
| --- | --- | --- | --- |
| Speed at cutoff, space-fixed | 25,718 ft/s (7,839 m/s) 20 s after cutoff | 7,838.5 m/s | holds |
| Perigee | 86.9 nmi (160.9 km) | 154.5 km | holds |
| Apogee | 140.0 nmi (259.3 km) | 250.7 km | holds |
| Inclination | 28.97° | 28.97° | holds |

## 3. The orbit and the rendezvous burns

**The published orbit has no period.** SP-4002's Table A prints 86.9 by 140.0 nautical miles and 87.92 min; an orbit of
those heights goes round in some 88.7 min over any ball they could be measured from (Gemini VIII's, 86.3 by 146.7, is 88.83
in the same table). The heights and the inclination are flown, over the oblate earth as Gemini 3's and 7's (assumed), and
the mean orbit is the heights' (plan.ts `PlanRecord.orbit`). The ship drags 2.2 on a quarter of its whole outside, 10.8 m²,
as Gemini VII's.

**Gemini VII is not in this run.** The shared machinery flies a burn on a target only where the target is a stage the
spacecraft let go (`FlightPlan.target`, its joint and its own run): another flight launched eleven days before is not such
a craft, and making it one is not a small change. So each burn is flown at the record's instant and impulse along the
attitude the crew held, and is not solved on Gemini VII:

| Burn | Attitude | When | Impulse |
| --- | --- | --- | --- |
| Height adjust, first perigee | along the motion | 1:34:00 (SP-4203: "after 94 minutes in space") | 14 ft/s |
| Phase adjust, second apogee | along the motion | 2:18:00 | 61 ft/s |
| Plane change | yawed 90° right, south | about 2:45 ("less than half an hour later", estimated) | 34 ft/s |
| Second height adjust, second perigee | along the motion (estimated) | about 3:04 (estimated) | 0.8 ft/s |
| Coelliptic, third apogee | along the motion | 3:47:00, 54 s | 43 ft/s |
| Terminal phase initiation | toward Gemini VII, taken as along the motion | 5:18:59 (IBM) | 31 ft/s, the forward part of the display |
| First midcourse | the same | 5:32 | 7 ft/s, the same |
| Second midcourse | the same | 5:44 | 4 ft/s, the same |

The lengths are the impulses at the type's thrusters on 7,821 lb (derived), except the coelliptic burn's 54 s. **Not flown:**
the braking from 5:50:37 (about 41 ft/s of closing speed taken off along the line to Gemini VII, over 3,000 to 1,500 ft),
the station keeping for some five hours, 1 to 300 ft off, and the separation from Gemini VII to some 30 miles, whose
impulse is not read. The terminal phase's burns were along the line of sight, ahead and above; their sideways and vertical
parts (1 and −7, −5 and −7, 6 and −2 ft/s) are not flown.

| After | Record | Flown from the pad |
| --- | --- | --- |
| Height adjust, apogee, read at 1:50 | 272 km (SP-4203, a conversion) | 272.0 km: holds |
| Coelliptic burn, at 3:55 | 270 by 274 km (the same) | 268.7 by 272.6 km: holds |
| Before retrofire, at 25:10 | 153.0 by 168.1 nmi (283.4 by 311.3 km: SP-4002) | 275.0 by 309.1 km: perigee 8 km low, misses |

## 4. Retrofire, the entry and the descent

**The retrofire is timed by guidance for the landing place** (`landing.aimed`, assumed), as Gemini VII's: the run's ship is
some way from the real one along its orbit after a day without the terminal phase as flown, and its burn is lit 277 s
before the record's 25:15:58. The equipment section goes 30 s before (the type's sequence: "jettisoned the equipment section;
retrofire followed automatically", SP-4203, p. 291), the rockets give Gemini VII's 318.5 ft/s 20.6° below the line back
(assumed: spacecraft 6's own are in its report), and the module comes down on spacecraft 7's weights, on the programme's
lift of 0.19, banked 55° to the left: "Schirra set the bank angle at 55 degrees left and held it until computer guidance took
over at 85 000 meters", then banked "first left, then right" against an overshoot (SP-4203, p. 291). The computer's
commands are not read, and the 55° is held throughout. The drogue at 14,000 m and the main at 3,200 m, SP-4203's
conversions of the crew's heights.

| | Record | Flown from the pad |
| --- | --- | --- |
| Along the track from the landing | 0 | 4.0 km short: holds |
| Across | 0 | 171 km left: misses |
| Landing | 25:51:24 | 25:50:38: holds |

The ground track at the retrofire the run's guidance chooses passes west of the place, and the lift is held to the left:
the miss across is the run's place on its orbit and the bank reversals not flown.

## 5. What disagrees

| | One source | Another | Followed |
| --- | --- | --- | --- |
| The period at insertion | 87.92 min (SP-4002, Table A) | some 88.7 min from its own heights | neither: no period flown |
| The spacecraft's weight | 7,821 lb (GLV-6's evaluation, "from NASA-Houston") | 7,817 lb (SP-4002) | the evaluation's, with the vehicle's weights |
| The first stage's speed at cutoff | 9,980 ft/s (Table II-6) | 2,995 m/s from GLV-6's own engine figures, flown | the figures: the speed is a check the second stage's margin makes up |
| The landing | 23°35′ N 67°50′ W (SP-4002) | the ship's navigation 23.70° N 67.74° W, the recovery ship 23.375° N 67.875° W (TRW, Table 9) | SP-4002's |

## 6. Simplified or left out

- Gemini VII as a craft: the rendezvous is flown as burns, not solved on a target; the braking, the station keeping and
  the separation are not flown.
- The terminal phase's burns along the motion by their forward parts, the plane change's and second height adjustment's
  instants, and the second height adjustment's direction: estimated.
- Spacecraft 6's weights after launch, its retrofire's impulse and attitude, its parachutes' fill: Gemini VII's.
- The entry's bank: 55° left held throughout, where the computer took over at 85 km.
- The fairings' instant (15 s after the separation, estimated) and the equipment section's (the type's 30 s).
- The first stage's figures at standard inlet conditions are taken for sea level; its vacuum impulse is GLV-1's rise.
