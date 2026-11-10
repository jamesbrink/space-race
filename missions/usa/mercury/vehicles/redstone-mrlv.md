# Mercury-Redstone Launch Vehicle (MRLV)

The booster for the two suborbital Mercury flights, MR-3 and MR-4. Model:
[redstone_mrlv.py](redstone_mrlv.py), imported by each flight's `model/vehicle.py`.

**It has one stage.** There is nothing to stage: the engine burns for about 142 seconds, shuts
down, and ten seconds later the spacecraft leaves. The parts below are the sections it was built
in, which the viewer's exploded view pulls apart; in flight they never separated.

It is a US Army Redstone missile with the Jupiter-C's longer tanks, about 800 changes to make it
safe to sit on, and an abort system that could fire the escape tower on its own.

## Dimensions

From NASA TM X-53107 unless noted. Stations in the model are inches above the fin trailing edges.

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Height with spacecraft and tower | 83.38 ft (25.414 m) | documented | section 4.1; model: 25.413 m |
| Booster length | 59.00 ft (708 in) | documented | Figure 4-1 |
| Body diameter | 70 in | documented | Figure 4-11 |
| Tail unit | 9.27 ft (111.24 in) | documented | Figure 4-1 |
| Centre section | 37.50 ft: alcohol tank 18.8 ft over oxygen tank 16.83 ft | documented | Figure 4-1 |
| Aft section | 139.64 in: aft unit 42.16 in, instrument compartment 53.66 in, ballast section above | documented | Figure 4-1, 4.2.3 |
| Aft section in the model | 146.76 in | derived | the three lengths above sum to 700.88 in, 7.1 in short of 59.00 ft; the aft unit was stretched 7.08 in for Mercury (4.8.2.2), so the stretch is taken to be what is missing |
| Booster top to the capsule's heat-shield plane | 8.5 in | derived | what is left of 83.38 ft after the booster and the capsule model. It sets the adapter's height in the model |
| Skin | aft 0.090, alcohol tank 0.063, oxygen tank 0.080, tail 0.125 in; 5052 aluminium | documented | 4.2.1, 4.2.2 |
| Fin span | 12 ft | estimated | secondary sources on the Redstone missile; no primary figure found |
| Fin chords | root 100 in, tip 38 in | estimated | Figure 4-1 |
| Nozzle exit diameter | 33 in | estimated | |

Figure 4-1 also marks "X-axis station zero" 15 inches below the top of the 59.00 ft dimension.
That is the vehicle's own datum, probably the spacecraft's aft end; the model does not use it.

## Mass and propellant

| | | Confidence |
| --- | --- | --- |
| Liftoff mass, MR-3 | 66,098 lb (29,982 kg) | documented (Table 8-1) |
| Dry mass with airborne equipment | 8,195 lb | documented (4.2.1) |
| Structure | aft 437.4, centre 1,659, tail 902.6 lb | documented |
| Steel ballast | 487 lb | documented |
| Damping compound | 330 or 340 lb on MR-3 (the report gives both) | documented |
| Alcohol / oxygen volume | 3,348 / 3,072 US gal | documented (4.2.2) |
| Alcohol / oxygen mass | about 24,000 / 29,250 lb | derived, low confidence: volumes at assumed densities. The real loads are in the Firing Site Weight Report, not yet read |

## Propulsion and control

| | | Confidence |
| --- | --- | --- |
| Engine | one Rocketdyne A-7 | documented |
| Thrust, sea level | 78,000 lbf nominal; 78,860 measured on MR-3 | documented (4.3.2, Table 8-1) |
| Specific impulse, sea level | 214.8 s measured on MR-3 | documented (Table 8-1) |
| Burn | 143.5 s nominal; cutoff at 141.8 s on MR-3 | documented |
| Propellants | ethyl alcohol and liquid oxygen | documented. The 75% alcohol, 25% water mix is from Wikipedia |
| Turbopump | steam from 75% hydrogen peroxide, 1.28 lb/s; turbine 4,800 rpm | documented (4.3.3) |
| Jet vanes | four, carbon, ±27.5° | documented (4.4.8) |
| Air rudders | four, ±11° | documented (4.4.8) |
| Tilt programme, MR-3 | starts at 15 s, ends at 131.7 s | documented (Table 3-1) |
| Guidance | LEV-3 autopilot | documented |
| On the pad | no hold-down arms; two connectors under fin II | documented (4.2.4) |

## Sections

| Node | What it is |
| --- | --- |
| `RedstoneAdapter` | flared ring carrying the capsule on a Marman clamp; the retropack sits inside it |
| `RedstoneAftUnit` | from the top: ballast section (steel ballast ring), pressurised instrument compartment (a drum holding the autopilot, abort sensing and telemetry), aft unit (nitrogen spheres, antennas, receivers). On the missile it separated with the warhead; here it is fixed |
| `RedstoneCenterUnit` | alcohol tank over liquid-oxygen tank, sharing a bulkhead; the alcohol's feed line runs down through the oxygen tank (4.2.2); the walls are the airframe |
| `RedstoneTailUnit` | engine bay, four fins, four air rudders |
| `RedstoneEngine` | A-7 chamber wall, liner and ribbed cooling jacket, injector, feed lines, manifolds, turbopump, steam duct, thrust frame, four jet vanes |

## What the model gets wrong or leaves out

- **The adapter's height is a remainder**, not a measurement.
- **Paint is unverified.** White, quartered black roll patterns on the tail and aft unit, "UNITED
  STATES" stacked in red. TM X-53107 gives no colours; its Figure 7-7 shows dark stacked lettering
  on a light body. The red is from memory of colour photographs.
- **Fin span and shape** are estimates; the fins are flat wedges with no aerofoil.
- **The engine is representative.** Chamber, jacket and the main lines are there; their routing
  and the turbopump's form are not from a drawing.
- **Inside the aft unit** the equipment is representative boxes; the nitrogen spheres' number and
  size, and the ballast's shape, are guesses at documented items.
- No baffles or level sensors in the tanks; no launch-pad fittings under fin II.
- **No mass properties** in the model.

## Sources

[docs/sources.md](../../../../docs/sources.md). This page rests on NASA TM X-53107, sections 4.1
to 4.4 and 4.8, Figure 4-1 and Tables 3-1 and 8-1.
