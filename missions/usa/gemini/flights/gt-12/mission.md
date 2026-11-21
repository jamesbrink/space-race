# Gemini-Titan 12 as it is flown

The plan the simulator flies (`flight.plan`) is written from the record in [orbital.ts](orbital.ts) by
[gemini-titan-plan.ts](../../vehicles/gemini-titan-plan.ts) `geminiTitanPlan`, as Gemini-Titan 8's is
([../gt-8/mission.md](../gt-8/mission.md)). Every figure there carries its confidence and source; this file says what was
read, what had to be taken from elsewhere, and what the run gives. Times are seconds (or hours:minutes:seconds) from
liftoff, 20:46:33.419 UTC, 11 November 1966. The checks' tolerances were set with the record, before the plan was first
flown; the misses are in [src/sim/misses.ts](../../../../../src/sim/misses.ts), each with its cause.

Fly still opens on the docking chapter (src/app/address.ts `lacks`): the plan is held by the tests and the figures, and is
what the launch site's clock and the idle show play. Fly goes to the pad when the docking is a phase of the same run (D3).

## 1. What there is to fly it from

**The mission report** (MSC-G-R-67-1, the Virtual AGC archive's copy), read in its text layer and on the page: GLV-12's
and spacecraft 12's weights (3.3; the GLV's table is headed "the Gemini XI Space Vehicle", a slip), GATV-5001's (3.6),
the sequence of events (Tables 4.2-I and 4.2-II), the trajectory and the landing points (Table 4.3-I), the orbit before and
after each manoeuvre and by revolution (Tables 4.3-II and 4.3-III), the manoeuvres planned, commanded and flown (Table
4.3-IV) and as the guidance system measured them (Table 5.1.5-V), the rendezvous and the mission in words (4.1), the entry
(5.1.5.2.3, Figure 5.1.5-8), the retrofire (5.1.8.2, 5.1.8.3), the parachutes (Figure 5.1.11-1) and the launch vehicle's
engines and margin (5.2, Tables 5.2-I and 5.2-II). The retrorockets one by one are not in it: the type's.

## 2. The ascent and the published orbit

GLV-12 on its own weights: 342,092 lb at liftoff with spacecraft 12 (8,296.47 lb), 85,386 at the first stage's cutoff,
74,011 at the second stage's steady burn, 14,499 at its cutoff; the second stage burned 108 lb after its cutoff signal (its
shutdown impulse, 33,971 lb-s) and could have burned 885 lb more (the achieved performance, 9,181 lb, over the spacecraft),
taken for the usable propellant still in it. The first stage at its standard inlet figures, 433,973 lb and 260.29 s; the
second its flight average, 99,296 lb and 313.22 s. The law: the 100.6° azimuth, up the plumb line to 23.05 s, the pitch-over
of 15 s (estimated), the linear tangent from staging, aimed at the cutoff's geodetic height, 526,195 ft, and 0.0°, into
the plane of 28.87° (the report's, which its insertion state gives read as a tracking vector is: Gemini VIII's did not).

**The published orbit is the insertion's, after the insertion velocity adjustment**, 86.8 by 146.1 nautical miles, at
439.8 s: the separation (3.2 ft/s), then "an Insertion Velocity Adjust Routine (IVAR) maneuver of 34 seconds, and a lateral
maneuver of 22 seconds" (Table 4.2-I, note a), 30.6 ft/s, made up what the launch vehicle had left short. The run's guidance
cuts the stage on that orbit, so the adjustment is in its cut and is not flown.

**It is flown on its heights, with no period.** The report's 88.87 min at insertion is not its heights' orbit: perigee to
perigee over the oblate earth those heights go round in 88.58, the axis some 6 km shorter. Cut on the period, the run's
apogee came 10 km over the record's and its rendezvous closed on the wrong phase (the Agena 63 km farther at the coelliptic
burn, a terminal phase of 72 m/s); cut on the heights, every orbit to the rendezvous holds (below). The convention is
plan.ts `PlanRecord.orbit`'s: a period only where the heights agree with it. (Gemini VIII's period does agree, and flown
without it that rendezvous is worse: gt-8/mission.md.)

| | Record | Flown | |
| --- | --- | --- | --- |
| Speed at insertion, space-fixed | 25,742 ft/s (7,846.2 m/s) | 7,845.0 m/s | holds |
| Perigee at insertion | 86.8 nmi (160.8 km) | 153.8 km | holds |
| Apogee | 146.1 nmi (270.6 km) | 270.9 km | holds |
| Inclination | 28.87° | 28.87° | holds |

## 3. The rendezvous

The target is GATV-5001 as the report's final tracking had it at its insertion (Table 4.3-V, `INSERTION`, which the docking
chapter starts from too), flown on at 7,114 lb. Its PPS anomaly cancelled every Agena manoeuvre before the docking.

| Burn | Thrusters | When | Record (guidance system) | Flown | |
| --- | --- | --- | --- | --- | --- |
| Phase adjust | aft-firing | 0:49:39.9 | 66.7 ft/s | as recorded | |
| Plane change | aft-firing, yawed 91° right | 1:14:22.3 | 8.5 ft/s | as recorded | |
| Corrective combination | aft-firing | 1:47:52.3 | 8.4 ft/s | as recorded | |
| Coelliptic | aft-firing | 2:22:54.5 | 49.9 ft/s (15.21 m/s) | solved coelliptic: 15.55 m/s | holds |
| Terminal phase | aft-firing | 3:05:47.3 | 21.8 ft/s (6.64 m/s) | solved to reach the Agena at 3:38:12: 8.90 m/s | misses |
| Four midcourse corrections | | 3:11:14 to 3:29:05 | 1.7, 3.1, 1.4, 4.9 ft/s | solved: nothing | two miss |
| Braking | forward-firing | 3:32:35.9, about 13 min | 19.7 ft/s (6.00 m/s) | held 50 ft behind the Agena to the docking: 6.93 m/s | holds |

The arrival is "the theoretical TPF maneuver computed on the ground" for the burn made, 3:38:12 (Table 4.3-IV, note g);
the station keeping's 50 ft is the docking chapter's, the report giving none. The Agena at the coelliptic burn: 109 km
where the report has about 65 nautical miles (120 km), a miss.

| After | Record (actual, over the Fischer ellipsoid) | Flown from the pad | |
| --- | --- | --- | --- |
| Phase adjust, read at 1:00 | 123.4 by 145.9 nmi (228.5 by 270.2 km) | 229.2 by 270.3 km | holds |
| Corrective combination, at 2:00 | 124.2 by 151.7 (230.0 by 280.9) | 229.4 by 277.4 | holds |
| Coelliptic, at 2:30 | 146.8 by 151.7 (271.9 by 280.9) | 275.0 by 284.8 | holds |
| Terminal phase, at 3:10 | 151.7 by 162.4 (280.9 by 300.8) | 275.9 by 299.7 | holds |
| Rendezvous, at 4:00 | 156.4 by 162.7 (289.7 by 301.3) | 293.2 by 302.3 | holds |

**Why the terminal phase stays on the clock.** Lit on the Agena's elevation instead ("approximately 27.0 degrees",
4.3.1.2; plan.ts `Pursuit` `elevation`, aimed 128.9° of the Agena's travel on, its corrections and braking moved with
the arrival it solves), flown from the pad on hal9000 on 21 November 2026 with the trigger's crossing state put right
(the shared fix of the elevation trigger), the run's Agena rises through 27° at 3:00:47, five minutes before the crew's
lighting and 39.7 km off, where the report has 22.1 nautical miles (40.9 km): the geometry the crew lit on. It asks
7.96 m/s (the clock's 8.90, the record's 6.64) and meets the Agena at 3:33:10; the orbit at 3:10 still holds. But the
braking, begun as long before that arrival as the crew's was before 3:38:12, gives 8.47 m/s against the record's 6.00
± 2.44, where the clock's holds at 6.93. One check better, one that holds now out: the clock's run is kept.

## 4. The docked hours, the tether and the separation

**The docking at 4:13:52, the two practice dockings, the undockings and the tether are not flown.** The two eclipse phasing
burns the Agena's secondary propulsion made with the pair docked, 43.8 ft/s back along the motion at 7:05:06 (the guidance
system's components) and 16.7 ft/s forward at 15:16:18 ("determined from orbital radar tracking data", the platform off),
are flown on the spacecraft (`thrusters: 'docked'`, toward its tail, the Agena's two 200 lb chambers as how hard they can
push), at the pair's impulse: the spacecraft is flown alone and the Agena in this run is not moved by them, nor is anything
after them made on it. The separation (7.1 ft/s at 52:14:27, after the docking bar went with the tether at 51:50:57) and
the retrograde phasing (5.2 ft/s at 61:47:47.9) are flown as recorded.

| After | Record (actual) | Flown | |
| --- | --- | --- | --- |
| First eclipse phasing, at 8:00 | 136.8 by 151.5 nmi (253.4 by 280.6 km) | 256.2 by 293.3 km | apogee misses |
| Second eclipse phasing, at 16:00 | 136.6 by 160.3 (253.0 by 296.9) | 256.1 by 310.4 | apogee misses |
| Separation, at 53:00 | 140.3 by 160.0 (259.8 by 296.3) | 262.0 by 309.4 | apogee misses |
| Phasing, at 63:00 | 140.8 by 156.0 (260.8 by 288.9) | 261.6 by 303.7 | apogee misses |
| Revolution 59, before retrofire | 140.8 by 155.0 (260.8 by 287.1) | 260.9 by 302.5 | apogee misses |

**Why the apogee is high after the docked burns.** The practice dockings and the station keeping round them took the
record's orbit from 162.7 by 156.4 nautical miles after the rendezvous to 161.4 by 153.0 before the first eclipse phasing,
some 4 km of axis; not flown, the run comes to the docked burns higher, and each takes off it what the record's did.

## 5. Retrofire, the entry and the descent

The retrofire is timed by guidance for the landing place along the track: it fires 7 minutes after the record's 93:59:58,
the run being that far behind the real ship after 94 hours on an orbit some 7 km higher in its axis. The rockets are the
type's (four of 2,490 lb for 5.5 s, 5.5 s apart: the report has the burn last 19.5 s, 93:59:57.7 to 94:00:17.2), giving the
321.5 ft/s the guidance system measured, 20.7° below the line back along the motion (Table 5.1.5-V has its vertical part up,
against its own convention; taken down, as every Gemini's). The bank: 10° to the south to 400,000 ft (94:20:12), the back-up
45° to the south, then from 94:23:06 lift up, where the control system held the computer's commands within some 10° of it and
then rolled through 150° and back (Figure 5.1.5-8): the rolls are not flown.

| | Record | Flown | |
| --- | --- | --- | --- |
| Drogue | 94:29:10 (94:29:09.638 in the figure), about 46,000 ft | 94:35:46 | misses: the retrofire's lateness |
| Along the track | | 0.2 km short | holds |
| Across the track | 0.54 nmi southeast of the planned point at guidance termination | 36.2 km right | misses |
| Landing | 94:34:30, 24°35′ N 69°57′ W | 94:41:58 | misses: the retrofire's lateness |

## 6. What this leaves out

- The insertion velocity adjustment and the lateral manoeuvre: in the stage's cut.
- The docking, the practice dockings, the undockings, the tether and the three walks; the station keeping between.
- The docked burns' effect on the Agena: it is not moved by them in this run.
- The terminal phase's trigger and the corrections' errors: lit by the clock (section 3 says why), solved without navigation error.
- The computer's entry rolls; the retrorockets one by one.
- The OAMS's degraded attitude thrusters (Nos. 2, 4, 7 and 8): attitude is not flown.
