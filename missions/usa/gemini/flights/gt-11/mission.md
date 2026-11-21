# Gemini-Titan 11 as it is flown

The plan the simulator flies (`flight.plan`) is written from the record in [orbital.ts](orbital.ts) by
[gemini-titan-plan.ts](../../vehicles/gemini-titan-plan.ts) `geminiTitanPlan`, as Gemini-Titan 8's and 12's are
([../gt-8/mission.md](../gt-8/mission.md), [../gt-12/mission.md](../gt-12/mission.md)). Every figure there carries its
confidence and source; this file says what was read, what had to be taken from elsewhere, and what the run gives. Times are
seconds (or hours:minutes:seconds) from liftoff, 14:42:26.546 UTC, 12 September 1966. The checks' tolerances were set with
the record, before the plan was first flown; the misses are in [src/sim/misses.ts](../../../../../src/sim/misses.ts), each
with its cause.

Fly still opens on the docking chapter (src/app/address.ts `lacks`): the plan is held by the tests and the figures, and is
what the launch site's clock and the idle show play. Fly goes to the pad when the docking is a phase of the same run (D3).

## 1. What there is to fly it from

**The mission report** (MSC-G-R-66-8, the To the Moon archive's copy), read in its text layer and on the page where the
layer garbles digits (its engine tables, Tables 5.2-I and 5.2-II, are images only): GLV-11's and spacecraft 11's weights
(3.3), GATV-5006's (3.6), the sequence of events (Tables 4.2-I, 4.2-II and 4.2-IV), the trajectory and the landing points
(Table 4.3-I), the orbit before and after each manoeuvre and by revolution (Tables 4.3-II and 4.3-III), the rendezvous
manoeuvres with the guidance system's components (Table 4.3-IV, which states its convention: "V_X is positive in the
direction of motion, V_Y is positive towards the center of the earth, and V_Z is positive to the left of the orbit path"),
the Agena's docked burns (5.4 and Table 4.3-VII), the rendezvous in words (4.3.1.2.1, 4.3.1.2.2), the entry and the first
automatic reentry (5.1.5.2.3), the retrorockets (5.1.8.3, 6.1.4), the parachutes (Figure 5.1.11-1) and the launch
vehicle's engines and margin (5.2). The retrorockets one by one are not in it: the type's.

Where the report disagrees with itself: "Stage separation begin" is printed at 142.02 s (Table 4.2-I), a slip for 154.38
(its planned 154.20 and the difference beside it, +0.18); the first correction's along-track part is +2.0 ft/s in the text
and -2.0 in the table (the text's resolves the way its own body-axis reading does, and is taken); the terminal phase's is
141.0 in the text and 140.0 in the table (the text's taken); the docked burns are 110.69, 919.60 and 919.47 ft/s in 5.4
and 109.8, 918.0 and 917.6 in Table 4.3-VII (5.4's, with its thrust durations, taken).

## 2. The ascent and the published orbit

GLV-11 on its own weights: 343,469 lb at liftoff with spacecraft 11 (8,374 lb), 87,367 at the first stage's cutoff, 74,618
at the second stage's steady burn, 14,177 at its cutoff; the second stage burned 111 lb after its cutoff signal (its
shutdown impulse, 34,552 lb-s) and could have burned 515 lb more (the achieved performance, 8,889 lb, over the spacecraft).
The first stage at its standard inlet figures, 437,596 lb and 261.02 s; the second its flight average, 101,266 lb and
311.32 s. The law: the 99.9° azimuth, up the plumb line to 22.99 s, the pitch-over of 15 s (estimated), the linear tangent
from staging, aimed at the cutoff's geodetic height, 526,908 ft, and 0.00°, into the plane of 28.85°. The published orbit
is the insertion's, 86.6 by 149.2 nautical miles at 469.0 s, after "a separation maneuver of 2 seconds, an Insertion
Velocity Adjust Routine (IVAR) maneuver of 53 seconds, and a radial maneuver of 15 seconds" (Table 4.2-I, note a): the
guidance cuts the stage on it, and it is flown on its heights with no period (the report's 88.92 min is osculating), as
Gemini XII's is. Both stages run dry before their cutoffs, the second on its 515 lb of margin.

| | Record | Flown | |
| --- | --- | --- | --- |
| Speed at insertion, space-fixed | 25,747 ft/s (7,847.7 m/s) | 7,846.5 m/s | holds |
| Perigee at insertion | 86.6 nmi (160.4 km) | 153.7 km | holds |
| Apogee | 149.2 nmi (276.3 km) | 276.2 km | holds |
| Inclination | 28.85° | 28.85° | holds |

## 3. The target, the docked burns and the parting

The target is GATV-5006 as the report's final tracking had it at its insertion (Table 4.3-V, `INSERTION`, which the
docking chapter starts from too), 1:37:24.821 before the Titan lifted off, flown on at its 7,198 lb (3.6). The ship meets it
in its first revolution, 232 nautical miles away at insertion (the run's 436 km against 430).

**The docked burns are flown on the ship, and the Agena is where the pair was when they parted.** The three burns of the
Agena's primary propulsion with the pair docked (the out-of-plane calibration, 110.69 ft/s at 4:28:48; the climb, 919.60
ft/s at 40:30:15, to an apogee of 741.5 nautical miles; the return, 919.47 ft/s at 43:52:55) are flown on the spacecraft
at the pair's measured impulse (`thrusters: 'docked'`, toward its tail, the Agena's 16,000 lb as how hard it can push),
along the Agena's attitude for each (Table 4.3-VII: the calibration's yaw, -88.73°, is read as this plan reads a yaw, its
side not stated). The pair flew on joined, docked from 1:34:16 and then on the tether from 50:12:48 to 52:58:36, to the
separation burn at 53:24:57.5: there the Agena is begun again where the ship is (`FlightPlan.parted`, orbital.ts
`flyOrbit`) and flown on its own, so it has the docked burns in it, and the coincident-orbit rendezvous is made on that.
The docking, the walks and the tether exercise themselves are marks.

## 4. The two rendezvous

| Burn | Thrusters | When | Record | Flown | |
| --- | --- | --- | --- | --- | --- |
| Out of plane | aft-firing, yawed 84° | 0:29:40 | 2.97 ft/s | as recorded | |
| Terminal phase, first revolution | aft-firing | 0:49:58.2 | 143.9 ft/s (43.86 m/s) | solved to meet the Agena at 1:20:53: 48.75 m/s | misses |
| Two corrections | | 1:03:41, 1:15:43 | 6.19, 2.06 ft/s | solved: nothing | miss |
| Braking | forward-firing | 1:17:41, about 8 min | 41 ft/s (12.50 m/s) | held 50 ft behind the Agena to the docking: 23.06 m/s | misses |
| Docked calibration | the Agena's | 4:28:48 | 110.69 ft/s | as recorded | |
| Docked climb | the Agena's | 40:30:15 | 919.60 ft/s | as recorded | |
| Docked return | the Agena's | 43:52:55 | 919.47 ft/s | as recorded | |
| Separation | forward-firing, turned about | 53:24:57.5 | 9.33 ft/s | as recorded | |
| Stand-off | aft-firing, turned about | 54:37:28 | 9.7 ft/s | as recorded | |
| Terminal phase, coincident orbit | forward-firing | 65:27:22 | 14.7 ft/s (4.48 m/s) | solved, the 292° transfer, to meet the Agena at 66:38:57: 2.66 m/s | misses |
| The 34° correction | | 66:30:36 | 5.91 ft/s | solved: nothing | misses |
| Braking | forward-firing | 66:34:43, about 3 min | 12.2 ft/s (3.72 m/s) | held 50 ft behind to the last separation: 8.02 m/s | misses |
| Last separation | forward-firing | 66:52:31 | 3 ft/s | as the crew made it | |

Each terminal phase arrives when the braking the crew were last sent was to begin (Table 4.2-II, planned): 1:20:53, and
66:38:57 for the coincident orbit's 292° of travel ("the 292-degree ωt ... TPI solution", 4.3.1.2.2).

| After | Record (actual, over the Fischer ellipsoid) | Flown from the pad | |
| --- | --- | --- | --- |
| Out-of-plane burn, read at 0:40 | 86.6 by 149.2 nmi (160.4 by 276.3 km) | 160.6 by 275.8 km | holds |
| Terminal phase, at 1:00 | 150.6 by 165.7 (278.9 by 306.9) | 270.1 by 324.5 | misses |
| First rendezvous, at 2:00 | 153.7 by 163.1 (284.7 by 302.1) | 288.0 by 304.7 | holds |
| Docked calibration, at 5:00 | 154.6 by 164.2 (286.3 by 304.1) | 289.5 by 305.9 | holds |
| Docked climb, at 41:00 | 156.3 by 741.5 (289.5 by 1,373.3) | 290.6 by 1,367.6 | holds |
| Docked return, at 44:30 | 156.0 by 164.2 (288.9 by 304.1) | 290.5 by 303.0 | holds |
| Separation, at 54:00 | 155.7 by 165.6 (288.4 by 306.7) | 290.6 by 308.1 | holds |
| Stand-off, at 55:00 | 152.7 by 163.8 (282.8 by 303.4) | 290.3 by 302.7 | perigee misses |
| Coincident terminal phase, at 66:00 | 148.3 by 161.8 (274.7 by 299.7) | 288.9 by 298.5 | perigee misses |
| Coincident rendezvous, at 66:50 | 155.6 by 164.0 (288.2 by 303.7) | 290.0 by 302.5 | holds |
| Last separation, at 67:30 | 151.0 by 163.0 (279.7 by 301.9) | 288.9 by 300.4 | perigee misses |
| Revolution 44, before retrofire | 151.0 by 163.0 (279.7 by 301.9) | 288.9 by 300.3 | perigee misses |

| The Agena | Record | Flown | |
| --- | --- | --- | --- |
| At the ship's insertion | 232 nmi (430 km) | 436 km | holds |
| At the first terminal phase | about 21 nmi (38.9 km) | 56.3 km | misses |
| At the coincident-orbit terminal phase | 24.9 nmi predicted (46.1 km) | 26.9 km | misses |

**Why the coincident orbit closes short.** The stand-off "was supposed to have placed the spacecraft in the same orbit as
the GATV and with no relative rates" 15 nautical miles behind it; the record's trailing grew from 16.6 to 20.8 nautical
miles, which the report puts to the ground solutions or "some venting or other perturbation" (4.3.1.2.2). The run flies the
separation and the stand-off at the record's impulses from where the pair parted, and nothing grows its trailing.

## 5. Retrofire, the entry and the descent

The retrofire is timed by guidance for the landing place along the track. The rockets are the type's (four of 2,490 lb for
5.5 s, 5.5 s apart), giving the 325.00 ft/s the guidance system measured, 21.3° below the line back along the motion
(303.8 ft/s aft and 118.7 down by telemetry, 6.1.4). The bank: 10° to the south to 400,000 ft (71:01:51.713), the back-up 44°
to the south to guidance initiate (71:04:48.703), then lift up, where the computer's commands, held by the control system
in the programme's first automatic reentry, steered it (Figure 5.1.5-12): those rolls are not flown.

| | Record | Flown | |
| --- | --- | --- | --- |
| Drogue | 71:11:28.44, about 51,000 ft | 71:12:59 | misses |
| Along the track | | 0.2 km short | holds |
| Across the track | 3.1 nmi from the target by radar | 24.1 km right | holds |
| Landing | 71:17:08.1, 24°15.4′ N 70°00′ W | 71:19:47 | misses: the drogue's lateness and the main's descent |

## 6. What this leaves out

- The insertion velocity adjustment and the radial manoeuvre: in the stage's cut.
- The docking, the practice dockings, the two walks and the tether's turning: the pair is flown as one craft (the ship)
  from the docking to the separation, the tether's slow rotation not at all.
- The Agena's own burns after the ship came down (Table 4.3-VII, the SPS's three).
- The terminal phases' triggers and the corrections' errors: on the clock, solved without navigation error.
- The computer's entry rolls; the retrorockets one by one.
