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

What it sheds is flown too (`src/sim/shed.ts`, from `trajectory.body.sheds`): each a rigid body
from the instant it leaves, under the same gravity and air. Flown from the run above (which is
itself 4 % fast, so all of this is high and long with it):

| Body | Leaves | Apogee | Greatest dynamic pressure | Down | Where | Speed at the sea |
| --- | --- | --- | --- | --- | --- | --- |
| Escape tower (537.6 kg) | 02:22.2, on its escape and jettison rockets together (Hammack and Heberlig, p. 15): 477 m/s ahead | 151.1 n. mi. | 75 kPa | 11:49 | 440.1 n. mi. downrange | 124 m/s |
| Redstone booster (4,535 kg) | 02:32.3, 2.0 m/s back (its share of the 30 ft/s) | 108.4 n. mi. | 190 kPa | 09:27 | 309.2 n. mi. downrange | 170 m/s |
| Retropack (125.3 kg) | 06:13.6, 0.9 m/s back | 100.7 n. mi. | 36 kPa | 11:06 | 289.7 n. mi. downrange | 74 m/s |

The booster, empty and heavy for its frontal area, weathercocks adapter first on its fins and
outruns the spacecraft (289.4 n. mi. in the same run) by 20 n. mi.; the retropack tumbles at up
to 110 degrees a second and comes down beside the spacecraft's track; the tower, whose centre
of mass and centre of area are in the same place by our figures, neither weathercocks nor
tumbles. It goes 150 n. mi. beyond the spacecraft because the escape rocket fires on it: 56,500 lb-s on 1,185 lb,
with the clamp ring already let go, so the stack feels nothing of it but the exhaust, which is not
modelled; the tower's weight is not lightened as its rocket burns, so it is flown a little slow.
Every drag area here is `estimated` and none of this is in any report read: where the
booster struck is not in the Postlaunch Report's sections used here, so there is nothing to hold
it against, and no check has been written. The real booster would also have broken up or burned
at 190 kPa; that is not modelled.

The structure has limits (`trajectory.body.limits`, `src/sim/loads.ts`), all `estimated`: a
bending load of 4,000 lb/sq ft degrees (dynamic pressure times angle of attack), and 7 kPa and
5 kPa for opening the drogue and the main. On the record's programme the bending load peaks at
10 % of its limit (75.5 s, 0.03 g across the axis) and the parachutes open in 4.2 and 2.8 kPa.

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

**Flown live.** `src/sim/vehicle.ts` flies the same inputs as a rigid body that is steered, by a
hand or by an autopilot holding the tilt programme, and for that it needs figures the reports
above do not give (`trajectory.body` in [flight.ts](flight.ts)):

| Input | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Structure, ballast, damping compound along the booster | 902.6, 1,659, 1,254 lb in the tail, centre and aft sections | documented | TM X-53107, 4.2.1 and Figure 4-1 |
| The rest of the dry booster (engine, pumps, instruments) | 4,277 lb, 55 % in the tail unit and 45 % in the aft section | estimated | the remainder of the 8,093 lb dry weight; the split is ours |
| Liquids at liftoff | 53,965 lb, 29,250 : 24,000 between the oxygen tank (lower) and the alcohol tank | derived, estimated | the total: liftoff weight less dry booster and capsule. The share between the tanks: their volumes at assumed densities, so estimated |
| Spacecraft and tower on the stack | 2,855 lb and 1,185 lb | documented, derived | Postlaunch Report 3.1: the "orbit" weight, and the launch weight less it |
| Tower jettison | 02:22.2 | documented | Postlaunch Report 4.1 |
| Burning time before a propellant runs out | 143.5 s | derived | TM X-53107's nominal burn, taken as depletion |
| Normal-force slope and station: nose, fins | 2.0 per radian at 751 in; 3.15 at 55 in | estimated | slender-body theory and Barrowman's method, subsonic, held at all speeds. No tunnel figure read |
| Thrust deflection, where it acts, roll arm | 4°, the base, 0.3 m | estimated | the vanes turn 27.5° (4.4.8); what that does to the thrust is not given |
| Spacecraft's centre of mass | 25 in above the heat shield's tip | estimated | the Postlaunch Report gives it; not read |
| Spacecraft's radii of gyration | 0.55 m in roll, 0.75 m across | estimated | likewise |
| Spacecraft's normal-force slope and where it acts | 0.5 per radian, 55 in behind the centre of mass | estimated | the shield's centre of curvature (80 in, CR-649) less the centre of mass above |
| Attitude jets: the chambers | automatic: 24 and 1 lbf each way in pitch and yaw, 6 and 1 lbf in roll, on or off. Manual: one each way an axis, throttled 4 to 24 lbf (pitch, yaw) and 1 to 6 lbf (roll) | estimated | The automatic ratings are Hammack and Heberlig's ([spacecraft.md](spacecraft.md)). The manual system's range is not in anything read: the commonly quoted figures. Every entry is `estimated` because where each chamber stands is ours |
| Attitude jets: where they stand | pitch and yaw 1.8 m up the axis from the centre of mass, on the 32 in skin; roll 0.8 m from the axis at the centre of mass's station | estimated | ours. So by these figures a pitch or yaw chamber also pushes the spacecraft sideways (thrust over mass), and roll does not pitch |
| Attitude jets: peroxide aboard | 32 lb automatic, 23 lb manual | documented | Hammack and Heberlig, pp. 7 and 8 |
| Peroxide's specific impulse | 150 s | estimated | the delivered figure, which the flow is worked from, is not in anything read. Hammack and Heberlig (p. 7) give "a theoretical specific impulse of about 160"; 150 is taken under it for a small chamber's losses, and is ours |
| Valve logic of the automatic chambers | a command under 0.05 opens nothing; under 0.3 the 1 lbf chamber; above, the big one | estimated | chosen (`RCS_DEAD`, `RCS_HIGH`): the ASCS's own switching levels were not found |
| Engine's nature | liquid, one start, no throttle | estimated | what is generally said of the A-7; no page read states it |
| Mixture ratio, oxygen to alcohol | 1.219 | estimated | not in anything read: the ratio of the two tanks' own loads, so both empty together at 147.0 s. That, not the 143.5 s above, now ends a burn nobody cuts |
| Escape rocket | 52,000 lbf for 0.78 s, 56,500 lb-s in all | documented | McDonnell SEDR 104, as [spacecraft.md](spacecraft.md) has it. The decay after 0.78 s is taken as even (0.61 s more), and the thrust as along the axis through the centre of mass: both ours |
| What a pilot lives through | a landing at 12 m/s; 20 g | estimated | ours, from the 30 ft/s design landing (Hammack p. 25) and the 11 g the flight itself gave. The couch was tested to 25 g on a re-entry profile "with no injury to the occupant" (Hammack p. 6): a level come through, not a limit, so 20 g stays. Said on the card that ends a flight flown by hand |
| Where the parachutes pull | 1.8 m from the centre of mass | estimated | |
| The autopilot's gains | 20 per radian and 14 s per radian (booster); 2.2 and 3.9 (spacecraft) | estimated | chosen from the control authority; the LEV-3's were not found |

By these the stack is stable all the way up, but only just: its centre of pressure is 0.45 m behind
its centre of mass at liftoff and 0.08 m at about a minute, before the emptying tanks carry the
centre of mass forward. Hands off it holds its nose to the air and falls into a gravity turn.
Under the autopilot it holds the programme to 0.03° at an angle of attack under a degree through
the greatest dynamic pressure. Against the run above (which has no lift) it separates 0.13 % slower
and 0.26° steeper and reaches an apogee 0.5 % higher: the nose is held a little above the path, and
the air lifts it. With that push switched off the two runs agree to 0.05 %
(`tests/vehicle.test.mjs`).

**An abort** (X twice on the flight deck, while the tower is aboard) shuts the engine down and fires
the escape rocket: the spacecraft leaves the booster with its tower on, the tower is let go when the
rocket is out and the climb is over, and the parachutes come out at their heights. By the figures
above, off the pad it is 12.9 g for 0.78 s, a top of 670 m at 11.5 s, the main parachute out there
and the sea (the simulator's floor: there is no land in it but the pad) at 79 s and 9.3 m/s, the
retropack still on. At the greatest dynamic pressure (76 s, 27 kPa) it is 9.2 g, a top of 15.6 km
and down at 501 s. Not flown: the rocket's line being set off the centre of mass to carry the
spacecraft aside, the pad-abort sequence's own timers, and the landing
bag. No report of a Mercury abort has been read against these numbers.

**The jets.** Under the autopilot the whole flight uses 0.68 kg of the automatic system's 14.5 kg
of peroxide (4.7 %): 0.32 kg turning round after separation, 0.15 kg holding attitude to retrofire,
0.03 kg through it, 0.13 kg turning into the air after the pack has gone and 0.05 kg damping the
entry. What MR-3 itself used has not been found in anything read, so this is held only to the tank;
it is very likely low, since the autopilot here idles between pulses where the real system limit-cycled
and the pilot exercised each axis by hand. A hand on the stick works the manual system from its own
tank; fly-by-wire (a hand on the automatic chambers) is not offered.

**By hand, nothing is done for you.** With the sequencer off (B) the spacecraft's own sequence is
off too: no cutoff, tower, separation, retrofire, retropack or parachute happens until it is
commanded, and the prompt line says in amber what is due. Left alone the capsule meets the sea at
82 m/s, its terminal speed heat shield first; under the drogue alone at over 40 m/s. With the tower
still on no parachute comes out. The retropack kept on, it lands 5 % faster under the main.
Retrofire without turning round lands 3 km long. Not modelled: a parachute failing if opened too
fast or too high (it opens whenever asked), the reserve main parachute (the capsule carried one:
it is in the part's text and not in the simulator), the booster striking the capsule if they part
with the engine burning, and heating. The card that ends the flight says what happened and whether
it was survivable by the two limits in the table, which are ours.

**The parachutes drawn** (`flies.chutes`, `src/viewer/chute.ts`) are the simulator's two, out when
it lets them out. Their diameters are Hammack and Heberlig's (6 ft conical ribbon, 63 ft ringsail);
the main's "alternate international orange and white gores" are theirs too (p. 9; the shades drawn are ours);
the number of gores (8 and 48), the lengths of line and riser, the drogue's colour, the reefed mouth and the times to line stretch (0.35 s and 0.8 s) are `estimated` and say so in
[flight.ts](flight.ts). The drogue has a round canopy's profile, not a cone's; no mortar, bag or
reserve is drawn. The main is drawn reefed for its first seven seconds, from the pilot's own
calls in the transcript; the simulator's drag grows evenly over the nine and does not fly the
reefed stage. The antenna canister leaves with the drogue when the main comes out.

**Heating.** `src/sim/heating.ts` works the air's heat from the same run: the heat flux at the
stagnation point of the 80 in heat shield by Sutton and Graves's equation (NASA TR R-376: the
equation and its constant are quoted from memory, the report not opened), and the
temperature of each surface `trajectory.heating` names as a lump that takes its share and radiates.
These are the model's figures, for the whole flight as flown above (which is 4 % fast; flux goes as
the cube of speed, so an eighth of the peak is that alone). The record's own, for the Mercury-Redstone
flights as a class, are Hammack and Heberlig's (p. 5), beside them here. They are not `checks`: the
comparison was seen before any tolerance was set, so none is claimed, and no input was changed for it.

| | Record (Hammack and Heberlig, p. 5) | Model | |
| --- | --- | --- | --- |
| Peak stagnation-point heating rate | "less than 5 Btu/ft²/sec" (57 kW/m²) | 6.9 Btu/ft² s (78.8 kW/m²) | high, by 38 % or more |
| Total heat input to the shield | 150 Btu/ft² (1.70 MJ/m²) | 1.63 MJ/m² at the stagnation point coming down; 0.9 of that over the face | about right |
| Heat shield's rise in temperature | "25° to 30°" (F: 14 to 17 K) | 13 K | a little low |
| Afterbody temperatures during exit | 300 to 400 °F (422 to 478 K) | 394 K (250 °F) at its hottest | cool, by 28 to 84 K |

| | Flown |
| --- | --- |
| Greatest heat flux at the stagnation point, coming down | 78.8 kW/m² (6.9 Btu/ft² s) at 08:30, at 32.6 km and Mach 5.9 |
| Greatest going up, on the booster | 17.0 kW/m² at 02:14.5; 3 to 5 kW/m² at the greatest dynamic pressure |
| Heat load at the stagnation point | 2.62 MJ/m², 0.99 of it going up |
| Heat shield at its hottest | 313 K at 08:47: a rise of 13 K, against 1,260 K to melting |
| Afterbody shingles at their hottest | 394 K (121 °C), at separation: going up, nose first, not coming down |
| Booster skin (aft section) at its hottest | 310 K: a rise of 10 K |

A suborbital flight asks almost nothing of a heat sink made for more: 140 kg of beryllium takes
7 MJ and warms by 13 K. Nothing on Freedom 7 came near glowing, and the scene shows none; the
shock layer is drawn as a faint orange wake for half a minute round 08:30, its brightness the heat
flux over 250 kW/m² (`src/viewer/entry.ts`), so an orbital Mercury, at some 600 kW/m², will blaze.

| Input | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Nose radius | 80 in | documented | CR-649 |
| Heat shield: mass behind each square metre | 46.9 kg | estimated | "approximately 1-inch-thick" beryllium (Hammack and Heberlig) at 1,848 kg/m³, a density quoted from memory |
| Beryllium's specific heat and melting point | 1,825 J/(kg K), 1,560 K | estimated | handbook figures quoted from memory, the handbook not opened: to verify. The specific heat held constant |
| Share of the stagnation flux over the shield | 0.9 | estimated | the laminar fall-off over a sphere to the rim at 27.7° |
| Shares of the afterbody shingles, nose first and behind the shield | 0.3, 0.05 | estimated | by judgement; CR-649's measurements not read |
| René 41 shingles: 3.35 kg/m², 452 J/(kg K), limit 1,255 K | | estimated | 0.016 in (Hammack and Heberlig; CR-649); the alloy's density, specific heat and limit as remembered, none looked up |
| Recovery compartment shingles and booster skin | 10.3 and 6.1 kg/m², shares 0.15 / 0.03 and 0.1 | estimated | 0.22 in beryllium; 0.090 in 5052 aluminium (TM X-53107); the densities and the aluminium's specific heat (880 J/(kg K)) and limit (475 K) from memory |
| Emissivities | 0.5 beryllium, 0.85 René 41 and paint | estimated | finishes not read |
| Temperature at liftoff | 300 K | estimated | a May morning at the Cape |

A tenth more of the shield's share is 1.3 K on its peak; a tenth more of the afterbody's going up
is 8.6 K on its (`tests/heating.test.mjs` prints these).

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
