# Gemini-Titan 9A as it is flown

The plan the simulator flies (`flight.plan`) is written from the record in [orbital.ts](orbital.ts) by
[gemini-titan-plan.ts](../../vehicles/gemini-titan-plan.ts) `geminiTitanPlan`, as Gemini-Titan 8's and 12's are
([../gt-8/mission.md](../gt-8/mission.md), [../gt-12/mission.md](../gt-12/mission.md)). Every figure there carries its
confidence and source; this file says what was read, what had to be taken from elsewhere, and what the run gives. Times are
seconds (or hours:minutes:seconds) from liftoff, 13:39:33.335 UTC, 3 June 1966. The checks' tolerances were set with the
record, before the plan was first flown; the misses are in [src/sim/misses.ts](../../../../../src/sim/misses.ts), each
with its cause.

Fly still opens on the docking chapter (src/app/address.ts `lacks`): the plan is held by the tests and the figures, and is
what the launch site's clock and the idle show play. Fly goes to the pad when the docking is a phase of the same run (D3).

## 1. What there is to fly it from

**The mission report** (MSC-G-R-66-6, the To the Moon archive's copy), read in its text layer and on the page where the
layer garbles digits: GLV-9's and spacecraft 9's weights (3.3), the ATDA's (3.6), the sequence of events (Tables 4.2-I and
4.2-II), the trajectory and the landing points (Table 4.3-I), the orbit before and after each manoeuvre and by revolution
(Tables 4.3-II and 4.3-IV), the three rendezvous' manoeuvres planned, commanded and flown (Table 4.3-III) and as the
guidance system measured them or the crew reported them (Table 5.1.5-VI), the ATDA's insertion vector and its orbit by
revolution (Tables 4.3-V and 4.3-VII), the rendezvous in words (4.3.1.2.1 to 4.3.1.2.3), the entry (5.1.5.2.3), the
retrofire (5.1.8.3), the parachutes (Figure 5.1.11-1), the last separation and the orbit shaping (6.1.3), and the launch
vehicle's engines and margin (5.2, Tables 5.2.2-I and 5.2.2-II). The retrorockets one by one are not in it: the type's.

Table 5.1.5-VI states no sign convention for its components; Gemini XII's report's is taken ("V_X is positive in the
direction of motion, V_Y is positive towards the center of the earth"), which every entry here agrees with but the
retrofire's along-track part (printed positive: taken back, as every Gemini retrofire's).

## 2. The ascent and the published orbit

GLV-9 on its own weights: 340,732 lb at liftoff with spacecraft 9 (8,268 lb), 86,224 at the first stage's burnout, 74,509
at the second stage's steady burn, 14,222 at its cutoff; the second stage burned 113 lb after its cutoff signal (its
shutdown impulse, 35,422 lb-s) and could have burned 613 lb more (the achieved performance, 8,881 lb, over the spacecraft),
taken for the usable propellant still in it. The first stage at its standard inlet figures, 435,631 lb and 259.97 s; the
second its flight average, 101,136 lb and 312.39 s. The law: the 87.4° azimuth, up the plumb line to 22.97 s, the pitch-over
of 15 s (estimated), the linear tangent from staging, aimed at the cutoff's geodetic height, 528,075 ft, and -0.11°.

**It is steered into the ATDA's plane.** "The out-of-plane velocity error resulting after the GLV ascent-yaw-steering was
less than 10 ft/sec" (4.3.1.2.1). The ascent is aimed at the node of the ATDA's orbit at the cutoff
(`Guidance.target.plane: 'target'`): the yaw the tangent holds out of the azimuth's plane is solved for it, and the
inclination is a result (28.93°, the report's 28.91). Aimed at the inclination alone, as Gemini VIII's and XII's are, the
yaw put the plane 23° of node from the ATDA's: the cutoff is near the top of the orbit's latitude (the heading 87.86° at
separation), where the yaw turns the node and hardly the inclination, and nothing there pins the node.

**The published orbit is the insertion's**, 85.7 by 144.0 nautical miles at 436.40 s, after "4 maneuvers ... which totaled
41.4 seconds thrust time" (Table 4.2-I, note a), the separation and the insertion velocity adjustment, 29.6 ft/s (Table
5.1.5-VI). The run's guidance cuts the stage on that orbit, so the adjustment is in its cut and is not flown; the second
stage runs its 613 lb of margin dry 1.9 s after the record's cutoff, and the orbit still holds. It is flown on its heights,
with no period (the report's 88.78 min is osculating, Table 4.3-IV note a), as Gemini XII's is.

| | Record | Flown | |
| --- | --- | --- | --- |
| Speed at insertion, space-fixed | 25,707 ft/s at separation and the adjustment's 29.5 along the motion (7,844.5 m/s) | 7,842.9 m/s | holds |
| Perigee at insertion | 85.7 nmi (158.7 km) | 152.5 km | holds |
| Apogee | 144.0 nmi (266.7 km) | 265.1 km | holds |
| Inclination | 28.91° | 28.93° | holds |

## 3. The target

The ATDA as the report's final tracking had it at its insertion (Table 4.3-V, `INSERTION`, which the docking chapter
starts from too), 1 day 22 h 39 min 30.972 s before the Titan lifted off, flown on from there on gravity and the air at its
launch weight, 2,006 lb, which it kept with its shroud (3.6), and the drag area its own run takes, the open shroud's halves
not in it. The ATDA made no manoeuvre. Its orbit holds over the two days (293 by 304 km at the vector, the record's 158.5 by
161.5 nautical miles), but **it is 86 km farther ahead than the report has it at the ship's insertion** (1,142 km, "approximately
570 nautical miles", 1,056), and 68 km farther at the crew's terminal phase. The ground planned from later vectors (Eglin's
in the ATDA's 29th revolution, Ascension's in its 31st and 38th: 4.3.1.2), which the report does not print. Nothing here
moves the ATDA to where the report has it: the difference is the vector's and the air's over two days, carried.

## 4. The three rendezvous

The burns that set each one up are flown at the record's instants and impulses (Table 5.1.5-VI, the nose along the
measured push for the aft-firing pair and against it for the forward-firing); the rest are made on the ATDA
(`Manoeuvre.toward`, plan.ts `Pursuit`), the record's impulse a check:

| Burn | Thrusters | When | Record | Flown | |
| --- | --- | --- | --- | --- | --- |
| Phase adjust | aft-firing | 0:49:03.3 | 74.8 ft/s | as recorded | |
| Corrective combination | aft-firing | 1:55:17.4 | 14.8 ft/s | as recorded | |
| Coelliptic | aft-firing, pitched down 40° | 2:24:51.7 | 53.4 ft/s (16.28 m/s) | solved coelliptic: 14.77 m/s | misses |
| Terminal phase | aft-firing | 3:36:02.2 | 28.4 ft/s (8.66 m/s) | lit on the ATDA at 27.2°, 4:02:50: 10.68 m/s | misses |
| Corrections at 82° and 34° to go | | 3:48:35, 4:00:27 | 4.1, 4.0 ft/s | solved: nothing | miss |
| Braking | forward-firing | 4:06:08.2, about 9 min | 24 ft/s (7.32 m/s) | held 60 ft behind the ATDA to 5:01: 13.37 m/s | misses |
| Radial separation | forward-firing, nose down | 5:00:59.8 | 19.9 ft/s | as recorded | |
| Terminal phase, equi-period | | 6:15:11.9 | 2.1 ft/s (0.64 m/s) | solved to meet the ATDA at 6:33:58: 3.47 m/s | misses |
| Three corrections | | 6:20:20 to 6:28:34 | 1.0, 1.0, 3.0 ft/s | solved: nothing | one misses |
| Braking, equi-period | forward-firing | 6:29:26.4, about 7 min | 16.3 ft/s (4.97 m/s) | held 60 ft behind to 7:14:58: 3.31 m/s | holds |
| Separation | forward-firing | 7:14:58 | 3.7 ft/s | as recorded | |
| Phase adjust | aft-firing | 18:23:19 | 2.0 ft/s | as recorded | |
| Height adjust | aft-firing | 19:08:16 | 17.0 ft/s | as recorded | |
| Coelliptic from above | forward-firing, turned about | 19:54:24 | 14.4 ft/s (4.39 m/s) | solved coelliptic: 4.06 m/s | misses |
| Terminal phase from above | aft-firing, turned about | 21:02:27.5 | 18.0 ft/s (5.49 m/s) | solved to meet the ATDA at 21:34:57: 23.16 m/s | misses |
| Two corrections from above | | 21:14:36, 21:26:36 | about 8 and 19 ft/s | solved: nothing | miss |
| Braking from above | forward-firing | not known, to 21:42 | about 20 ft/s (6.10 m/s) | held 60 ft behind to 22:59: 20.15 m/s | misses |
| Last separation | forward-firing | 22:59:00 | 3 ft/s, as advised | as advised | |
| Orbit shaping | aft-firing, turned about | 53:41:35 | 25 ft/s | as recorded | |

**The first terminal phase is lit on the ATDA's elevation.** "The TPI maneuver was initiated at 3:36:02 g.e.t. when the
elevation angle to the ATDA was approximately 27.2 degrees and the range was about 25.2 nautical miles" (4.3.1.2.1): lit
when the run's ATDA rises through 27.2° (plan.ts `Pursuit` `elevation`, looked for an hour either side), aimed to meet
it 129.3° on (the corrections "at ωt = 81.8 degrees and 33.6 degrees ... 12 and 24 minutes later"), its corrections and
braking moved with the arrival it solves (`arrival`). The run's ATDA, 68 km farther, rises through it at 4:02:50 and
asks 10.68 m/s. Lit by the clock at 3:36:02 it asked 34.04 m/s from 115 km and the braking 54.8: every rendezvous check
holds as well or better on the elevation, and the orbit read at 3:45 (before the late burn) is the one that misses.

**The equi-period rendezvous** was "performed completely by the crew using only information displayed from the platform,
optical aids, and onboard charts" (4.3.1.2.2) after a ground-timed radial separation: the run flies the radial separation
as recorded from its station keeping and solves the terminal phase at the crew's instant to arrive when the crew were told
to brake, 6:33:58. **The rendezvous from above** is on the clock: its trigger, the ATDA falling through 27.5° below the level
(4.3.1.2.3), is not a kind guidance has; the ground's transfer time from its own lighting to its terminal phase finalize
(20:55:28 to 21:27:57) is taken from the crew's lighting for its arrival, 21:34:57.

| After | Record (final, over the Fischer ellipsoid) | Flown from the pad | |
| --- | --- | --- | --- |
| Phase adjust, read at 1:00 | 123.6 by 146.0 nmi (228.9 by 270.4 km) | 231.6 by 270.1 km | holds |
| Corrective combination, at 2:15 | 124.9 by 148.7 (231.3 by 275.4) | 230.3 by 275.3 | holds |
| Coelliptic, at 3:00 | 145.2 by 148.0 (268.9 by 274.1) | 272.7 by 274.4 | holds |
| Terminal phase, at 3:45 | 147.1 by 160.0 (272.4 by 296.3) | 272.7 by 274.4 (not yet lit) | apogee misses |
| First rendezvous, at 4:45 | 157.6 by 161.0 (291.9 by 298.2) | 295.7 by 298.3 | holds |
| Radial separation, at 5:30 | 156.6 by 163.3 (290.0 by 302.4) | 290.9 by 302.3 | holds |
| Equi-period rendezvous, at 7:00 | 157.6 by 161.0 (291.9 by 298.2) | 295.7 by 298.2 | holds |
| Separation, at 8:00 | 156.2 by 159.8 (289.3 by 296.0) | 291.7 by 298.2 | holds |
| Phase adjust, at 18:45 | 156.5 by 159.5 (289.8 by 295.4) | 291.6 by 299.9 | holds |
| Height adjust, at 19:30 | 158.2 by 166.7 (293.0 by 308.7) | 299.1 by 310.2 | perigee misses |
| Coelliptic from above, at 20:30 | 166.4 by 168.2 (308.2 by 311.5) | 309.7 by 312.2 | holds |
| Terminal phase from above, at 21:10 | 158.6 by 166.4 (293.7 by 308.2) | 290.7 by 333.2 | apogee misses |
| Third rendezvous, at 22:30 | 156.8 by 160.3 (290.4 by 296.9) | 295.0 by 297.6 | holds |
| Last separation, at 23:30 | 155.4 by 160.0 (287.8 by 296.3) | 294.3 by 295.1 | perigee misses |
| Orbit shaping, at 54:00 | 144.0 by 156.5 (266.7 by 289.8) | 268.1 by 293.6 | holds |
| Revolution 45, before retrofire | 143.8 by 155.5 (266.3 by 288.0) | 267.6 by 293.0 | holds |

| The ATDA | Record | Flown | |
| --- | --- | --- | --- |
| At the ship's insertion | about 570 nmi (1,056 km) | 1,142 km | misses |
| At the crew's terminal phase, 3:36:02 | about 25.2 nmi (46.7 km), 27.2° up | 115 km | misses |
| At the terminal phase from above, 21:02:28 | 14.5 nmi (26.9 km), 27.5° down | 19.3 km, just ahead | holds |

## 5. Retrofire, the entry and the descent

The retrofire is timed by guidance for the landing place along the track. The rockets are the type's (four of 2,490 lb
for 5.5 s, 5.5 s apart), giving the 321.3 ft/s the guidance system measured, 22.9° below the line back along the motion.
The bank: 10° to 400,000 ft ("as planned", its side not said: to the south, as Gemini XII's), then lift up, where "A manual
closed-loop reentry was flown by the crew based on the roll commands generated by the onboard computer" (5.1.5.2.3): those
commands are not read, the tape recorder having failed.

| | Record | Flown | |
| --- | --- | --- | --- |
| Drogue | 72:15:47.9, about 45,000 ft | 72:16:37 | holds |
| Along the track | | on the place | holds |
| Across the track | 0.38 nmi west of the planned point | 0.2 km left | holds |
| Landing | 72:20:50, 27°51′ N 74°56′ W | 72:23:06 | misses: the main's descent |

## 6. What this leaves out

- The insertion velocity adjustment: in the stage's cut.
- The ATDA's position after its insertion: flown from the one vector, not the ground's later ones.
- The docking that could not be made, the station keeping's own pulses, and the walk outside.
- The rendezvous from above's trigger and the corrections' errors: on the clock, solved without navigation error.
- The crew's entry rolls; the retrorockets one by one.
- The OAMS attitude thrusters' degraded firings (Nos. 1, 3 and 4): attitude is not flown.
