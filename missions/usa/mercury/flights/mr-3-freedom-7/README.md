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
| Escape tower (537.6 kg) | 02:22.2, on its escape and jettison rockets together (Hammack and Heberlig, p. 15): 477 m/s ahead | 151.0 n. mi. | 75 kPa | 11:54 | 442.9 n. mi. downrange | 122 m/s |
| Redstone booster (4,535 kg) | 02:32.3, 2.0 m/s back (its share of the 30 ft/s) | 108.8 n. mi. | 187 kPa | 09:28 | 309.7 n. mi. downrange | 170 m/s |
| Retropack (125.3 kg) | 06:13.6, 0.9 m/s back | 101.4 n. mi. | 34 kPa | 11:10 | 290.7 n. mi. downrange | 74 m/s |

The booster, empty and heavy for its frontal area, weathercocks adapter first on its fins and
outruns the spacecraft (290.5 n. mi. in the same run) by 19 n. mi.; the retropack tumbles at up
to 110 degrees a second and comes down beside the spacecraft's track; the tower, whose centre
of mass and centre of area are in the same place by our figures, neither weathercocks nor
tumbles. It goes 150 n. mi. beyond the spacecraft because the escape rocket fires on it: 56,500 lb-s on 1,185 lb,
with the clamp ring already let go, so the stack feels nothing of it but the exhaust, which is not
modelled; the tower's weight is not lightened as its rocket burns, so it is flown a little slow.
Every drag area here is `estimated` and none of this is in any report read: where the
booster struck is not in the Postlaunch Report's sections used here, so there is nothing to hold
it against, and no check has been written. The real booster would also have broken up or burned
at 187 kPa; that is not modelled.

The structure has limits (`trajectory.body.limits`, `src/sim/loads.ts`), all `estimated`: a
bending load of 4,000 lb/sq ft degrees (dynamic pressure times angle of attack), and 7 kPa and
5 kPa for opening the drogue and the main. On the record's programme, in the day's winds aloft, the
bending load peaks at 26 % of its limit (83.8 s, climbing into the jet stream, 0.09 g across the
axis; in still air 10 % at 75.5 s) and the parachutes open in 4.2 and 2.8 kPa.

| | Report | Flown whole | Capsule flown from the report's separation |
| --- | --- | --- | --- |
| Speed at separation, space-fixed | 2,251.9 m/s (7,388 ft/s) | 2,344.6 m/s, +4.1 % | (the report's, as the start) |
| Speed at separation, Earth-fixed | 1,955.0 m/s (6,414 ft/s) | 2,046.3 m/s, +4.7 % | (the report's) |
| Apogee | 187.4 km | 202.1 km, +7.8 % | 187.0 km |
| Range | 487.3 km | 538.0 km, +10.4 % | 492.1 km |
| Greatest dynamic pressure going up | 28.1 kPa (586 lb/sq ft) | 26.6 kPa, -5.0 % | |
| Load going up, entry load | 6.3 g, 11.0 g | 6.29 g, 11.7 g | 10.8 g |
| Landing | 15:22.0, 27°13.7′N 75°53′W | 15:38.1, 58.4 km from it | 15:22.1 |

The powered flight ends 4 % fast, and everything after follows from that: leaving the pad at
1.19 g, one per cent in thrust or weight is three to four in speed, and the engine is two figures
from a summary table, held steady with no build-up or tail-off. Flown from the separation the
report gives, the capsule's half agrees to a per cent, except the entry's greatest dynamic pressure
(5.3 % low). Every miss is recorded with its likely cause in the test, which fails if one appears,
grows or goes away.

**The day's wind.** Everything is flown through the winds over the Cape that morning
(`trajectory.winds`): the Postlaunch Report's Figure 10.3-1, "Cape wind profile approximately 5
minutes after launch", read off by hand at 64 heights from the surface to 60,000 ft, each to the
knot and the few degrees its trace allows, and above it the Cape's 12Z sounding of 5 May 1961 (NOAA
IGRA, station USM00074794, 2 h 34 min before liftoff) at 50 and 30 hPa. The figure meets the surface
at 12 knots from 070, as the report's text gives the surface wind (section 10.3); the light easterly
and north-easterly to 16,000 ft turns westerly above, and the jet stream is 60 knots from 293 at 50,000 ft. The figure
does not say which way its bearings run: they are taken as where the wind blows from, which the
sounding bears out (280 at 58 knots at 45,900 ft against the figure's 282 at 57.5). Above 24 km
nothing is recorded and the wind is taken to die away by 30 km (`calmAbove`, estimated: moving it
changes nothing to a hundredth of a per cent). The westerly is mostly behind the flight:

| Flown whole | Still air | The day's wind |
| --- | --- | --- |
| Apogee | +7.72 % | +7.85 % |
| Range | +10.01 % | +10.42 % |
| Greatest dynamic pressure going up | -3.27 % | -5.05 % (a miss, recorded) |
| Speed at separation | +3.99 % | +4.12 % |
| Entry load | +6.17 % | +6.49 % |
| Landing | 15:37.9, 56.3 km from the record's point | 15:38.1, 58.4 km from it |

So the wind takes each figure a little further from the record, and is kept: it is the day's, and
nothing is fitted. It earns its place where the record shows it: the report's angle of attack going
up (Figure 4.2-8, the gyros' pitch less the Earth-fixed flight-path angle) peaks at about 1.5° at
about 01:32, and so does the live run's in the day's wind (1.60° at 91 s), where in still air it is
0.96° at 54 s. Under the main parachute the capsule drifts 655 m west-south-west in five minutes and
meets the sea moving at the surface wind. The greatest dynamic pressure is now 5.05 % low: the record's
is "derived from AZUSA and FPS-16 radar data" and does not say whether a wind went into it
(`src/sim/misses.ts`). Simplified: one sounding at one place stands for the whole flight (the landing
area's own 12 knots has no direction in the report), with no gusts or turbulence, straight lines
between the heights read, and the air's density a standard year's, not the day's.

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
| Escape rocket | 52,000 lbf for 0.78 s, 56,500 lb-s nominal; burned by its curve: 68,500 lbf at most, out at 1.9 s | documented | McDonnell SEDR 104 (the rating); NASA TM X-422, Figure 9 (a static firing's thrust against time, read to 1,000 lbf: 56,900 lb-s between its 10 % points against the figure's own 56,795) |
| Its propellant | 290.5 lb | documented | TM X-422, Figure 9 |
| Its nozzles' cant | 19° | documented | SEDR 104, section 6. Takes nothing more off the thrust, which is the resultant |
| Its line of thrust | 1 in to one side of the centre of mass | documented | NASA TM X-629, p. 7, of production components ("about 1 inch"); TM X-422 has 0.78 in on the first motor; capsule 7's own alignment not read |
| Which side | downrange | estimated | not in anything read |
| After an abort | retropack dropped; tower at the top; drogue 2 s after it; main 2 s after that; under 42,000 ft | documented | SEDR 109-7 (capsule 7's operations manual), p. 2-2 |
| What a pilot lives through | a landing at 12 m/s; 20 g | estimated | ours, from the 30 ft/s design landing (Hammack p. 25) and the 11 g the flight itself gave. The couch was tested to 25 g on a re-entry profile "with no injury to the occupant" (Hammack p. 6): a level come through, not a limit, so 20 g stays. Said on the card that ends a flight flown by hand |
| Where the parachutes pull | 1.8 m from the centre of mass | estimated | |
| The autopilot's gains | 20 per radian and 14 s per radian (booster); 2.2 and 3.9 (spacecraft) | estimated | chosen from the control authority; the LEV-3's were not found |

By these the stack is stable all the way up, but only just: its centre of pressure is 0.45 m behind
its centre of mass at liftoff and 0.08 m at about a minute, before the emptying tanks carry the
centre of mass forward. Hands off it holds its nose to the air and falls into a gravity turn.
Under the autopilot it holds the programme to 0.03°, at an angle of attack of at most 2.1° (84 s,
where the wind's shear under the jet stream is; under a degree in still air). Against the run above
(which has no lift) it separates 0.05 % slower and 0.13° steeper and reaches an apogee 0.34 %
higher: the nose is held a little above the path, and the air lifts it. With that push switched off
the two runs agree to 0.12 % (`tests/vehicle.test.mjs`). Hands off from 60 s it breaks up at 80 s in
still air and gets through in the day's wind, which is behind it by then; hands off from the pad the
low wind across it turns the nose off the air and it breaks up at 36 s.

**An abort** (X twice on the flight deck, while the tower is aboard) shuts the engine down and fires
the escape rocket: the spacecraft leaves the booster with its tower on and its retropack dropped, the
tower is let go at the top of the climb, the drogue comes out two seconds after it and the main two
seconds after that (capsule 7's own sequence for an abort begun under 42,000 ft: SEDR 109-7, p. 2-2;
above that, the parachutes at their heights). The rocket burns by a static firing's curve (NASA TM
X-422, Figure 9: 68,500 lbf at its greatest, out at 1.9 s, 290.5 lb of propellant), and its line of
thrust passes 1 in to one side of the centre of mass (TM X-629), which tips the spacecraft over as it
is pulled and so carries it aside; which side is not recorded, and is taken as downrange. Off the
pad that is 18.5 g, about two turns end over end, a top of 564 m (1,850 ft) at 9.8 s, and the surface
at 59 s and 8.8 m/s, 231 m from the pad along the azimuth; with the line through the centre of mass it
reaches 2,565 ft and comes back down on its own booster. At the greatest dynamic pressure (76 s,
26.5 kPa) it is 14.3 g, a top of 14.1 km and down at 517 s. Those are in still air, as the records
below are; in the day's wind (12 knots from 070 at the surface) an abort off the pad comes down 95 m
from it, to the south, the wind being against the throw.

Against the aborts that were flown (`tests/abort.test.mjs`; tolerances set first, nothing fitted):

| Record | Its figure | The simulator | |
|---|---|---|---|
| Langley's trial of the Grand Central motor, 1959 (TM X-422), flown from its own weights, inertias, 0.78 in and 71° launcher: greatest height | 1,950 ft | 1,763 ft (-9.6 %) | within 10 % |
| distance covered | about 1,600 ft | 1,918 ft (+20 %) | within 25 % |
| time of flight | 63.1 s | 61.9 s (-1.9 %) | within 10 % |
| greatest speed | about 595 ft/s | 539 ft/s (-9.5 %) | **miss** (5 %): the typical curve's impulse, or the drag end on while it burns |
| speed onto the water | about 28 ft/s | 26.6 ft/s (-5.1 %) | **miss** (5 %): Freedom 7's parachute, not the model's |
| greatest load | about 22 g | 22.5 g | not a check: seen before any tolerance was set |
| turns in pitch before the tower went | about 1 1/4 | 2.0 | not a check; it tumbles more than the trial did |
| SEDR 104: "For off the pad escapes ... a maximum capsule altitude of approximately 2500 feet", against Freedom 7's abort, upright | 2,500 ft | 1,850 ft (-26 %) | **miss** (15 %): met to 3 % with no offset; tumbling, the air takes a quarter of the climb, and that air is our estimates |
| Beach Abort, 9 May 1960 (This New Ocean, p. 262), against Freedom 7's spacecraft off a 71° launcher: greatest height | 2,465 ft | 1,514 ft (-39 %) | **miss** (15 %): No. 1's weight and its launcher's lean are not known to us; it was stripped, so lighter |
| distance covered | "half a mile" | 1,934 ft (-27 %) | within 30 % |
| time of flight | 76 s | 47.5 s (-38 %) | **miss** (15 %): follows from the height |

How the table was come by: the first run left the tower's own side out of the air on the
spacecraft-with-tower. It was added (the tower's existing estimate, unchanged) after that run had been
seen, as an omission put right: the trial's figures went from +10.8 %, +62 % and +25 % (height,
distance, time) to the -9.6 %, +20 % and -1.9 % above, and Freedom 7's own abort from 2,223 ft and
288 m from the pad to 1,850 ft and 231 m (`tests/abort.test.mjs` says the same beside its misses).

Not flown: the sideways part of the tilted motor's thrust (a few parts in a thousand), the antenna
fairing and the landing bag, the abort's rate damping beyond the jets' own, and anything of one shed
body on another beyond this: the retropack an abort drops on the pad stays on the booster's top. The air on
the spacecraft with its tower on is the weakest part: one drag curve at no angle of attack and side
areas that are ours. TM X-491 has that configuration's stability in the tunnel and has not been read
for it.

**The jets.** Under the autopilot the whole flight uses 1.45 kg of the automatic system's 14.5 kg
of peroxide (10.0 %): 0.44 kg turning round after separation, 0.73 kg holding attitude to retrofire,
0.06 kg through it to the pack's going, 0.17 kg turning into the air after that and 0.06 kg through
the entry and the day's winds to the drogue. What MR-3 itself used has not been found in anything read, so this is held only to the tank;
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
| Peak stagnation-point heating rate | "less than 5 Btu/ft²/sec" (57 kW/m²) | 7.0 Btu/ft² s (79.0 kW/m²) | high, by 39 % or more |
| Total heat input to the shield | 150 Btu/ft² (1.70 MJ/m²) | 1.63 MJ/m² at the stagnation point coming down; 0.9 of that over the face | about right |
| Heat shield's rise in temperature | "25° to 30°" (F: 14 to 17 K) | 13 K | a little low |
| Afterbody temperatures during exit | 300 to 400 °F (422 to 478 K) | 395 K (251 °F) at its hottest | cool, by 27 to 83 K |

| | Flown |
| --- | --- |
| Greatest heat flux at the stagnation point, coming down | 79.0 kW/m² (7.0 Btu/ft² s) at 08:30, at 32.6 km and Mach 5.9 |
| Greatest going up, on the booster | 17.1 kW/m² at 02:06; 3 to 5 kW/m² at the greatest dynamic pressure |
| Heat load at the stagnation point | 2.62 MJ/m², 0.99 of it going up |
| Heat shield at its hottest | 313 K at 08:47: a rise of 13 K, against 1,260 K to melting |
| Afterbody shingles at their hottest | 395 K (122 °C), at separation: going up, nose first, not coming down |
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
