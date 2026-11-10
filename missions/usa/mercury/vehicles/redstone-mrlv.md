# Mercury-Redstone Launch Vehicle (MRLV)

The booster for the two suborbital Mercury flights, MR-3 and MR-4. Model:
[redstone_mrlv.py](redstone_mrlv.py), imported by each flight's `build.py`.

**It has one stage.** There is nothing to stage: the engine burns for about 143 seconds, shuts
down, and the spacecraft leaves. The parts below are the sections it was built in, which the
viewer's exploded view pulls apart; in flight they never separated.

It is a US Army Redstone missile with the Jupiter-C's longer tanks, about 800 changes to make it
safe to sit on, and an abort system that could fire the escape tower on its own.

## Dimensions

Stations are inches above the booster's base (the fin trailing edges).

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Height on the pad, with spacecraft and tower | 83.38 ft (25.414 m) | documented | NASA; model: 25.413 m |
| Body diameter | 70 in (1.778 m) | documented | |
| Booster length without spacecraft | 59 ft | documented | model: 716.5 in (59.7 ft) to the capsule's heat-shield plane, which is what makes the overall height come out |
| Tail unit | stations 0 to 135 | estimated | drawings |
| Centre unit (tanks) | stations 135 to 508 | estimated | drawings; 6 ft longer than the missile's |
| Aft unit | stations 508 to 668 | estimated | drawings |
| Adapter | stations 668 to 716.5, 70 in flaring to 73.2 in | estimated | photographs |
| Fin span | 152 in (12 ft 8 in) | estimated | the Redstone missile's figure, from memory |
| Fin chords | root 112 in, tip 38 in | estimated | photographs |
| Nozzle exit diameter | 33 in | estimated | |
| Liftoff mass (MR-3, whole vehicle) | 66,098 lb (29,982 kg) | documented | |

## Propulsion and control

| | | Confidence |
| --- | --- | --- |
| Engine | one Rocketdyne A-7 | documented |
| Thrust | 78,000 lbf (350 kN), sea level | documented |
| Specific impulse | 215 s, sea level | documented |
| Burn | 143.5 s nominal | documented |
| Propellants | 75% ethyl alcohol, 25% water; liquid oxygen | documented |
| Turbopump | steam from hydrogen peroxide | documented |
| Steering | four graphite vanes in the exhaust; four air rudders on the fin tips | documented |
| Guidance | LEV-3 autopilot (the missile's ST-80 inertial platform was removed) | documented |

One NASA page gives the A-7's duration as 117 s; that is the missile's burn. The lengthened tanks
make it 143.5 s.

## Sections

| Node | What it is |
| --- | --- |
| `RedstoneAdapter` | flared ring carrying the capsule on a Marman clamp; the retropack sits inside it. MR-3 carried 340 lb of ballast here |
| `RedstoneAftUnit` | pressurised instrument compartment (autopilot, abort sensing) and ballast. On the missile it separated with the warhead; here it is fixed |
| `RedstoneCenterUnit` | alcohol tank over liquid-oxygen tank; the walls are the airframe |
| `RedstoneTailUnit` | engine bay, four fins, four air rudders |
| `RedstoneEngine` | A-7 chamber and nozzle, turbopump, thrust frame, four jet vanes |

## What the model gets wrong or leaves out

- **Section breaks are estimates.** Only the overall length is pinned.
- **Paint is from memory of photographs**: white, quartered black roll patterns on the tail and
  aft unit, "UNITED STATES" stacked in red. The real pattern on MR-7 should be checked against
  launch-day photographs; the lettering colour in particular.
- **The engine is a silhouette**: chamber, nozzle, one pump, one tank, four struts. No plumbing.
- **Fins are flat wedges**, with no aerofoil section.
- No propellant lines, no tank internals, no umbilical mast fittings, no launch pedestal.
- **No mass properties** and no propellant mass split. The simulator needs both.

## Sources

- [Mercury-Redstone Launch Vehicle](https://en.wikipedia.org/wiki/Mercury-Redstone_Launch_Vehicle), Wikipedia.
- [Mercury-Redstone Launch Vehicle](https://www.nasa.gov/history/mercury-redstone-launch-vehicle/), NASA History.
- [Mercury Redstone fact sheet](https://spaceline.org/?p=6976), Spaceline.
- *The Mercury-Redstone Project*, NASA TM X-53107 (MSFC, 1964): the primary source for stations
  and drawings. **Not yet checked against this model.**
