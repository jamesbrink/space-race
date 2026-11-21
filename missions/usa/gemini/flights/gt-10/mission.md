# Gemini-Titan 10 as it is flown

The plan the simulator flies (`flight.plan`) is written from the record in [orbital.ts](orbital.ts) by
[gemini-titan-plan.ts](../../vehicles/gemini-titan-plan.ts) `geminiTitanPlan`, as Gemini-Titan 8's and 12's are
([../gt-8/mission.md](../gt-8/mission.md), [../gt-12/mission.md](../gt-12/mission.md)). Every figure there carries its
confidence and source; this file says what was read, what had to be taken from elsewhere, and what the run gives. Times are
seconds (or hours:minutes:seconds) from liftoff, 22:20:26.648 UTC, 18 July 1966. The checks' tolerances were set with the
record, before the plan was first flown; the misses are in [src/sim/misses.ts](../../../../../src/sim/misses.ts), each
with its cause.

Fly still opens on the docking chapter (src/app/address.ts `lacks`): the plan is held by the tests and the figures, and is
what the launch site's clock and the idle show play. Fly goes to the pad when the docking is a phase of the same run (D3).

## 1. What there is to fly it from

**The mission report** (MSC-G-R-66-7, NTRS 19750067644), read in its text layer and on the page where the layer garbles
digits (its engine and translation tables are images): GLV-10's and spacecraft 10's weights (3.3), GATV-5005's (3.6), the
sequence of events (Tables 4-I and 4-II), the trajectory and the landing points (Table 4-V), the orbit before and after each
manoeuvre and by revolution (Tables 4-VI and 4-VII), the manoeuvres planned, commanded and flown (Table 4-VIII, whose
components put V_Z "positive to the right of the orbit path (South)") and every manoeuvre's components as the guidance
system measured them (Table 5.1.5-XII), the rendezvous in words (4.3.1.2.1, 4.3.1.2.2), the entry (5.1.5.2.5), the
parachutes (Figure 5.1.11-1) and the launch vehicle's engines and margin (5.2, Tables 5.2-I and 5.2-II).

## 2. The ascent and the published orbit

GLV-10 on its own weights: 341,164 lb at liftoff with spacecraft 10 (8,295 lb), 86,921 at the first stage's cutoff, 73,995
at the second stage's steady burn, 14,243 at its cutoff; the second stage burned 113 lb after its cutoff signal (its
shutdown impulse, 35,081 lb-s) and could have carried 568 lb more (the achieved payload capability, 8,862 lb, over the
spacecraft). The first stage at its standard inlet figures, 437,769 lb and 261.03 s; the second its flight average, 99,168
lb and 310.53 s. The law: the 98.8° azimuth, up the plumb line to 23.00 s, the pitch-over of 15 s (estimated), the linear
tangent from staging, aimed at the cutoff's geodetic height, 527,252 ft, and 0°, into the plane of 28.87°. The published
orbit is the insertion's, 86.3 by 145.1 nautical miles, after the separation and the insertion velocity adjustment (25.3
ft/s along the motion, Table 5.1.5-XII), flown on its heights with no period, as Gemini XII's is.

| | Record | Flown | |
| --- | --- | --- | --- |
| Speed at insertion, space-fixed | 25,712 ft/s at separation and the adjustment's 25.3 (7,844.7 m/s) | 7,844.4 m/s | holds |
| Perigee at insertion | 86.3 nmi (159.8 km) | 153.9 km | holds |
| Apogee | 145.1 nmi (268.7 km) | 269.6 km | holds |
| Inclination | 28.87° | 28.87° | holds |

## 3. The first rendezvous, the docked burns and the second

The target is GATV-5005 as the report's final tracking had it at its insertion (Table 4-IX, `INSERTION`, which the
docking chapter starts from too), 1:40:40.517 before the Titan lifted off, flown on at 7,184 lb (3.6).

| Burn | Thrusters | When | Record (guidance system) | Flown | |
| --- | --- | --- | --- | --- | --- |
| Phase adjust | aft-firing | 2:18:10.8 | 55.8 ft/s | as recorded | |
| Plane change | aft-firing, yawed 90° left | 2:30:49.2 | 10.5 ft/s | as recorded | |
| Coelliptic | aft-firing | 3:47:36.0 | 47.5 ft/s (14.48 m/s) | solved coelliptic: 14.46 m/s | holds |
| Terminal phase | aft-firing | 4:33:43.8 | 42.3 ft/s (12.89 m/s) | solved to meet the Agena at 5:06:15: 16.65 m/s | misses |
| The 82° and 34° corrections | | 4:46:23, 4:58:24 | 20.4, 23.4 ft/s | solved: nothing | miss |
| Braking | forward-firing | 5:01:51.5, about 15 min | 66 ft/s (20.12 m/s) | held 200 ft behind the Agena to the docking: 13.13 m/s | misses |
| Docked phase adjust, primary propulsion at 75 % | the Agena's | 7:38:34.4 | 423.6 ft/s | as recorded | |
| Docked height adjust, primary | the Agena's | 20:20:12.0 | 346.3 ft/s | as recorded | |
| Docked coelliptic, primary | the Agena's | 22:37:06.4 | 82.2 ft/s | as recorded | |
| Docked phase adjust, secondary | the Agena's | 27:45:36.4 | 9.7 ft/s | as recorded | |
| Docked plane change, secondary | the Agena's | 41:04:26.4 | 16.0 ft/s | as recorded | |
| Docked phase adjust, secondary | the Agena's | 41:35:50.4 | 4.4 ft/s | as recorded | |
| Separation | aft-firing | 44:40:15.6 | 2.0 ft/s | as recorded | |
| Corrective combination, coelliptic, terminal phase, two corrections | | 45:54:01 to 47:38:58 | 4.2, 10.6, 22.3, 4.5, 3.9 ft/s | as recorded | |
| Braking toward Gemini VIII's Agena | forward-firing | 47:39:10 to 47:59:22 | 28.2 ft/s resultant | as recorded, along its one measured line | |
| Out-of-plane separation | aft-firing | 51:15:59.9 | 1.5 ft/s | as recorded | |
| True anomaly adjust | aft-firing, turned about | 51:38:51.8 | 99.8 ft/s | as recorded | |

The docked burns are flown on the spacecraft at the pair's measured impulse (`thrusters: 'docked'`, toward its tail, the
Agena's 16,000 lb as how hard it can push), over the intervals Table 4-VIII gives them, the indicator's zeroing in each.

**Gemini VIII's Agena is not in the run.** The ground planned the second rendezvous from "an RTCC vector for the Gemini VIII
GATV, measured on the day before the launch of Gemini X" (4.3.1.2.2), which the report does not print; the Gemini VIII
report leaves it at 217.6 by 220.4 nautical miles in March (its 4.1), with no node or phase. With no orbit of it for July
1966 found, it is not a craft here, and its rendezvous is flown at the record's impulses along the lines the guidance
system measured: the corrective combination, coelliptic burn, terminal phase and corrections close on where the record's
did as the orbits after them show (below), but the braking, 28.2 ft/s held along the one line it was measured on over the
twenty minutes the crew braked on a turning line of sight, leaves the apogee 15 km high. An element set for GATV-5003 from
NORAD's catalogue would make this a second `TargetDef.orbit`; none was read.

| After | Record (actual, over the oblate earth) | Flown from the pad | |
| --- | --- | --- | --- |
| Phase adjust, read at 2:25 | 117.2 by 144.5 nmi (217.1 by 267.6 km) | 217.9 by 266.3 km | holds |
| Plane change, at 3:00 | 117.2 by 144.5 | 217.8 by 266.1 | holds |
| Coelliptic, at 4:00 | 143.3 by 145.8 (265.4 by 270.0) | 262.8 by 269.5 | holds |
| Terminal phase, at 4:40 | 143.3 by 160.6 (265.4 by 297.4) | 264.6 by 295.6 | holds |
| First rendezvous, at 6:00 | 156.5 by 161.9 (289.8 by 299.8) | 293.0 by 300.7 | holds |
| Docked phase adjust, at 8:00 | 158.5 by 412.2 (293.5 by 763.4) | 295.4 by 762.7 | holds |
| Docked height adjust, at 21:00 | 158.4 by 205.8 (293.4 by 381.1) | 295.6 by 379.9 | holds |
| Docked coelliptic, at 23:30 | 203.9 by 208.7 (377.6 by 386.5) | 378.1 by 384.7 | holds |
| Docked phase adjusts and plane change, to 42:00 | 205.0 to 205.5 by 208.5 to 209.9 | 384.0 to 384.9 by 385.0 to 388.7 | holds |
| Separation, at 45:30 | 205.4 by 208.2 (380.4 by 385.6) | 384.9 by 386.1 | holds |
| Corrective combination, at 46:00 | 205.9 by 209.2 | 385.1 by 387.2 | holds |
| Second coelliptic, at 47:00 | 206.1 by 208.9 | 384.9 by 388.6 | holds |
| Second terminal phase, at 47:33 | 207.4 by 216.8 (384.1 by 401.5) | 387.7 by 405.7 | holds |
| Rendezvous with Gemini VIII's Agena, at 50:00 | 213.5 by 216.0 (395.4 by 400.0) | 398.3 by 415.0 | apogee misses |
| True anomaly adjust, at 52:00 | 157.9 by 215.5 (292.4 by 399.1) | 293.1 by 415.0 | apogee misses |
| Revolution 43, before retrofire | 157.9 by 215.5 | 293.0 by 414.7 | apogee misses |

| GATV-5005 | Record | Flown | |
| --- | --- | --- | --- |
| At the ship's insertion | about 1,000 nmi (1,852 km) | 1,829 km | holds |
| At the terminal phase | about 37 nmi (68.5 km), 26.0° up | 56.1 km | misses |

## 4. Retrofire, the entry and the descent

The retrofire is timed by guidance for the landing place along the track. The rockets are the type's, giving the 325.5 ft/s
the guidance system measured, 21.4° below the line back along the motion (303.0 back, 118.9 down: Table 5.1.5-XII). The
bank: 10° to the south to 400,000 ft (70:32:46.7), the back-up 45° to the south to guidance initiation (70:34:55.6), then lift
up, where the command pilot flew the computer's commands from 70:35:36 to guidance termination at 70:40:39 (Figure 5.1.5-24):
those rolls are not flown.

| | Record | Flown | |
| --- | --- | --- | --- |
| Drogue | 70:41:33.867, about 41,000 ft | 70:44:38 | misses |
| Along the track | | 0.2 km short | holds |
| Across the track | 3.4 nmi from the target, by the recovery forces | 20.4 km right | holds |
| Landing | 70:46:39, 26°45′ N 71°57′ W | 70:51:05 | misses: the drogue's lateness and the main's descent |

## 5. What this leaves out

- The insertion velocity adjustment: in the stage's cut.
- Gemini VIII's Agena as a craft (no orbit of it for July 1966 read), and so its braking solved on it.
- The docking, the two walks and Collins's visit to the passive Agena.
- The corrections' navigation errors; the computer's entry rolls; the retrorockets one by one.
