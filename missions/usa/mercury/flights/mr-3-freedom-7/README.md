# Mercury-Redstone 3, *Freedom 7*

The first American in space, and the first person to control a spacecraft's attitude by hand.

| | |
| --- | --- |
| Liftoff | 5 May 1961, 14:34:13 UTC (09:34 EST) |
| Site | Cape Canaveral, Launch Complex 5: [lc-5.md](../../sites/lc-5.md) |
| Pilot | Alan B. Shepard Jr. (backup: John Glenn): [mark-iv-suit.md](../../crew/mark-iv-suit.md) |
| Spacecraft | Mercury No. 7, McDonnell Aircraft: [spacecraft.md](spacecraft.md) |
| Launch vehicle | Mercury-Redstone MRLV, MR-7: [redstone-mrlv.md](../../vehicles/redstone-mrlv.md) |
| Trajectory | suborbital; apogee 187.4 km (101.2 nmi), range 487.3 km (263.1 nmi) |
| Velocity at cutoff (tabulated at capsule separation) | 7,388 ft/s inertial (8,107 km/h); 6,414 ft/s relative to the ground |
| Loads | 6.3 g at booster cutoff, 11.0 g on entry |
| Weightless | 5 min 4 s |
| Duration | 15 min 22 s |
| Landing | 27°13.7′N 75°53′W, North Atlantic |
| Recovery | helicopter hooked on within 2 minutes; aboard USS *Lake Champlain* 11 minutes after landing |
| Mass | vehicle 66,098 lb (29,982 kg) at liftoff; spacecraft 4,040 lb at launch, 2,855 lb after separation, 2,579 lb at entry, 2,316 lb afloat |

## What happened

Vostok 1 had put Yuri Gagarin in orbit three weeks earlier. Shepard's flight was shorter and never
reached orbit, but it did something Gagarin's had not: the pilot flew the ship. After separating
from the Redstone, Freedom 7 turned heat-shield-forward on its automatic system, and Shepard then
took over one axis at a time (pitch, then yaw, then roll) until he held all three by hand. He
looked at the ground through the periscope, fired the three retrorockets as a test of the system
the orbital flights would depend on, and rode the capsule through an 11 g entry to a landing
within sight of the recovery force.

He went up the gantry at 05:15 and was in the capsule five minutes later. Holds stretched the wait
to 4 hours 14 minutes.

## Timeline

| T+ | Event |
| --- | --- |
| 00:00 | Liftoff |
| 01:24 | Maximum dynamic pressure, 586 lb/ft² |
| 02:21.8 | Booster engine cutoff |
| 02:22.2 | Escape tower released and fired clear |
| 02:32.3 | Spacecraft separation, at 243,640 ft |
| 02:37 | Turnaround |
| 03:10 | Manual control begins |
| 05:11 | Apogee |
| 05:14.1 | Retrofire: three motors, at 05:14.1, 05:18.8 and 05:23.6 |
| 06:13.6 | Retropack jettison |
| 07:48.2 | 0.05 g |
| 08:21 | Peak entry load, 11.0 g |
| 09:38.1 | Drogue parachute, about 21,000 ft |
| 10:14.8 | Main parachute, about 10,600 ft |
| 15:22.0 | Landing |

The same events, in seconds, are `timeline` in [flight.ts](flight.ts).

## The sky at liftoff

Computed, not placed: `src/world/ephemeris.ts` from the pad's position (`sites/lc-5.ts`) and the
launch instant, 14:34:13 UTC (09:34:13 EST). All `derived`; the Sun and Moon agree with JPL Horizons
to 0.002° (`tests/world.test.mjs`). Elevations are geometric; air lifts the Moon another 0.17°.

| Body | Azimuth (true) | Elevation | Note |
| --- | --- | --- | --- |
| Sun | 098.8° | 50.2° | Behind the hatch side (the pad frame's +X faces 295°): the hatch was in shade |
| Moon | 245.2° | 4.6° | Low in the west-south-west, setting; waning gibbous, 74% lit, 0.54° across. Last quarter was two days later |
| Venus | 154.5° | 66.4° | A 16% crescent near greatest brilliancy, magnitude about −4.1: in the sky but not to be seen without knowing where to look |
| Jupiter, Saturn | 233.0°, 236.5° | 20.8°, 15.0° | Above the Moon, lost in daylight |
| Mercury | 094.0° | 47.2° | Four degrees from the Sun |

Mars, Uranus and Neptune were below the horizon.

## The flight as flown

`src/sim/fly.ts` integrates the flight from `trajectory` in [flight.ts](flight.ts) (thrust, specific
impulse, masses, the tilt programme, drag, retrofire, parachutes; nothing fitted) and
`tests/sim.test.mjs` holds the result against `checks`, the figures the Postlaunch Report gives.
The page's Flown panel (`src/flown.ts`) shows the same run against the clock, and from liftoff to
landing the vehicle in the scene flies it (`src/viewer/ascent.ts`; C to the chase camera), shedding
the tower at 02:22.2, the booster at separation and the retropack at 06:13.6.

| | Report | Flown whole | Capsule flown from the report's separation |
| --- | --- | --- | --- |
| Speed at separation, space-fixed | 2,251.9 m/s (7,388 ft/s) | 2,341.7 m/s, +4.0 % | (the report's, as the start) |
| Speed at separation, Earth-fixed | 1,955.0 m/s (6,414 ft/s) | 2,043.5 m/s, +4.5 % | (the report's) |
| Apogee | 187.4 km | 201.9 km, +7.7 % | 187.0 km |
| Range | 487.3 km | 536.0 km, +10.0 % | 491.5 km |
| Load going up, entry load | 6.3 g, 11.0 g | 6.29 g, 11.7 g | 10.7 g |
| Landing | 15:22.0 | 15:38.0 | 15:22.2 |

The powered flight ends 4 % fast, and everything after follows from that: leaving the pad at
1.19 g, one per cent in thrust or weight is three to four in speed, and the engine is two figures
from a summary table, held steady with no build-up or tail-off. Flown from the separation the
report gives, the capsule's half agrees to a per cent, except the entry's greatest dynamic pressure
(5.4 % low). Every miss is recorded with its likely cause in the test, which fails if one appears,
grows or goes away.

**Space-fixed and Earth-fixed.** The report gives the speed at separation twice, and the larger,
7,388 ft/s, is the one quoted as Freedom 7's velocity. It is space-fixed: measured in a frame that
does not turn with the Earth, so it includes the eastward 409 m/s (1,472 km/h) the pad itself was
moving at. The Earth-fixed 6,414 ft/s is the speed over the turning ground. They differ by less
than 409 m/s, and the climb angles differ (39.0° against 46.5°), because the two motions add at an
angle: the ground's is level and due east, the capsule's was climbing on a heading of 105°. The
Flown panel's speed trace is space-fixed, so it starts at 1,472 km/h standing on the pad.

## Where sources disagree

| Figure | Used here | Also published | Why |
| --- | --- | --- | --- |
| Duration | 15:22 | 15:28 | The postlaunch event table, SP-45 and TM X-53107 agree on 15:22. 15:28 is one table in *This New Ocean*, repeated by the Smithsonian and Wikipedia's infobox |
| Peak entry load | 11.0 g | 11.6 g | Telemetry gives 11.0. 11.6 is *This New Ocean*'s prose |
| Peak velocity | 5,036 mph inertial | 5,180 and 5,134 mph | The postlaunch report gives 7,388 ft/s |

## Where the spacecraft is now

The Smithsonian's National Air and Space Museum lists Freedom 7 on display in its *Destination
Moon* gallery in Washington, DC.

## Sources

[docs/sources.md](../../../../../docs/sources.md). This page rests on the *Postlaunch Report for
Mercury-Redstone No. 3* (event table, sections 2 to 6) and TM X-53107 Table 8-1.
