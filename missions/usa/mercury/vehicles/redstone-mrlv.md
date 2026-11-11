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
| Height with spacecraft and tower | 83.38 ft (25.414 m) | documented | section 4.1; model: 25.414 m |
| Booster length | 59.00 ft (708 in) | documented | Figure 4-1 |
| Body diameter | 70 in | documented | Figure 4-11 |
| Tail unit | 9.27 ft (111.24 in) | documented | Figure 4-1 |
| Centre section | 37.50 ft: alcohol tank 18.8 ft over oxygen tank 16.83 ft | documented | Figure 4-1. The two tanks sum to 35.63 ft; the figure does not say where the other 1.87 ft is |
| Aft section | 139.64 in: aft unit 42.16 in, instrument compartment 53.66 in, ballast section above | documented | Figure 4-1, 4.2.3 |
| Aft section in the model | 146.76 in | derived | the three lengths above sum to 700.88 in, 7.1 in short of 59.00 ft; the aft unit was stretched 7.08 in for Mercury (4.8.2.2), so the stretch is taken to be what is missing |
| Booster top to the capsule's plane of maximum diameter | 8.0 in | derived | 83.38 ft less the 59.00 ft booster and the 284.55 in from that plane to the spike tip (SEDR 104, Figure 1-3). It sets the adapter's height. Hammack and Heberlig's Figure 17 draws 710.27 in to that plane (2.3 in of adapter), but its total, 996.07 in, is 4.5 in short of the 83.38 ft its own Figure 18 gives |
| Skin | aft 0.090, alcohol tank 0.063, oxygen tank 0.080, tail 0.125 in; 5052 aluminium | documented | 4.2.1, 4.2.2 |
| Fin span | 152 in | documented | across the air rudders' tips: Hammack and Heberlig, Figure 17 |
| Fin chords | root 100 in, tip 38 in | estimated | Figure 4-1 |
| Nozzle exit diameter | 33 in | estimated | |

Figure 4-1 also marks "X-axis station zero" 15 inches below the top of the 59.00 ft dimension.
That is the vehicle's own datum, probably the spacecraft's aft end; the model does not use it.

## Mass and propellant

| | | Confidence |
| --- | --- | --- |
| Liftoff mass, MR-3 | 66,098 lb (29,982 kg) | documented (Table 8-1) |
| Dry mass with airborne equipment | 8,195 lb as tabulated; about 8,093 lb for MR-3 | documented (4.2.1); the MR-3 figure is derived: the table counts 442 lb of damping compound, 102 lb of which was added for MR-4 |
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

- **The adapter's height is a remainder**, not a measurement, and one primary figure disagrees with it (see above).
- **Paint is from one black-and-white photograph** (MR-3 Postlaunch Report, Figure 3.2-1): upright
  stripes round the aft unit with a row of checks at top and bottom, a dark band round the tanks,
  dark stacked "UNITED STATES". The stripe count (16), the band's height and the tail's quartered
  pattern are read off or assumed. No source read gives colours; the red lettering is from memory
  of colour photographs.
- **Fin shape** is an estimate; the fins are flat wedges with no aerofoil. Their edges are rounded
  over the last 1.2 in, the same all round (the real leading edge's form is not known). The rows
  of flush fasteners on the fins (a root fitting, a spar 9 in behind the leading edge, a rib over
  the rudder's bay, that bay's edge, the trailing edge) and on the rudders are the usual layout of
  such a fin, not read off a drawing or a photograph; so is each rudder's pivot, a shaft across
  the gap from the fin 24 in up, with a bearing boss on either face. That the rudders turned
  (±11°) is documented; about what axis is not.
- **The frost on the oxygen tank is representative**: its extent is the tank's cylindrical wall, its
  edge is a clean line, and no photograph of MR-3 was used to place it.
- **The engine is representative.** Chamber, jacket and the main lines are there; their routing
  and the turbopump's form are not from a drawing.
- **Inside the aft unit** the equipment is representative boxes; the nitrogen spheres' number and
  size, and the ballast's shape, are guesses at documented items.
- No baffles or level sensors in the tanks; no launch-pad fittings under fin II.
- **No mass properties** in the model. The simulator's are in the flight's `flight.ts` (`trajectory.body`): the
  documented section weights as uniform cylinders, the rest of the dry weight split by estimate.

## Sources

[docs/sources.md](../../../../docs/sources.md). This page rests on NASA TM X-53107, sections 4.1
to 4.4 and 4.8, Figure 4-1 and Tables 3-1 and 8-1.
