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
| `RedstoneAdapter` | flared ring carrying the capsule on a Marman clamp; the retropack sits inside it. The fairings over the clamp's three explosive bolts are the flight's to choose (`build(clamp_covers=...)`): rectangular boxes as flown through MR-3, or the streamlined ones MR-4 carried (*Results of the Second U.S. Manned Suborbital Space Flight*, p. 4 and Figure 2-2: documented that they changed and to what shape; their size, about 8 by 4.8 by 1.7 in, is read off the figure: estimated) |
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
  of colour photographs. Where the lettering and the number plates are is from the pad photographs
  of 1961 (the next item).
- **UNITED STATES is on the two fins' meridians that stand square to the pitch plane**: 45° and 225° round from the
  capsule's hatch, the fins being at 45° + 90°k and the one at 135°, with the periscope, lying down range
  (sites/lc-5.md, "Which way round the vehicle stood"). So each faces a camera abeam of the flight's line. Estimated,
  from photographs of both boosters, each camera's place round the vehicle read off the capsule's paint and the fins:
  - **MR-8** (Liberty Bell 7's). FHSU item 468 (camera at 232°): the U is 13° left of centre, so at 219°; item 466
    (151°): at the right limb, 73° right, so at 224°; item 241 (191°): 32° right, so at 223°; item 333 (312.5°): none
    shows, as neither would at 45° or 225°; item 331, from the other side of the pad: one faces the camera, so there
    were two. 222° ± 4°. And against the pad, not the capsule: item 306 (3 July 1961, from pad 6's gantry down the
    rails) has it facing 289° to 294° round from the pad's +X, where the fin's meridian is 285° with the vehicle turned
    to its 100° azimuth.
  - **MR-7** (Freedom 7's). S61-02407, taken from the north-east (222° round from the pad's +X): the lettering is 61°
    to 69° right of the camera's line and an MR-7 plate 64° right, on one meridian, 286° round from +X, with a second
    plate 27° left, at 195°: fins at 195° and 286°, where the 105° azimuth is 190° and a fin square to it 280°. The
    same arrangement, to within the photograph.
  - **The 25° that was left open** (the lettering against Freedom 7's capsule paint: by the capsule's UNITED STATES,
    taken to face that camera at 186°, the fins came out at 250° and 159°). Two things account for it. The capsule's
    lettering is not square to the camera in S61-02407 but 7° to 9° right of centre, which makes the fins 241° and
    150°: 16° out. And the capsule's UNITED STATES is modelled 51° from the periscope on No. 7 where No. 11's is 43°;
    painted as No. 11's it would be 8° out, inside what one photograph can say. Nothing shows the capsules clocked
    differently on their boosters: both stood with a fin and the periscope down range. The capsule's paint is left as
    it is (the flight's spacecraft.md, "Which way round the capsule stood").
  - UNITED stands above the dark band and STATES below it, a letter's place left between them: the U 15 in under
    the top of the tanks, 30 in from letter to letter (items 306 and 468: 30 to 32 in; S61-02407: 28). In July the
    oxygen tank's frost hid most of STATES (466, 468); on 3 July, unfuelled, it is whole (306).
  - **Each fin's meridian carries the vehicle's number on a plate** at the foot of the tanks: a white card edged in
    black, MR over the number, about 14 in wide and 16 high (S61-02407: 42 by 50 px where the body's 70 in is 215).
    MR-7's shows on two meridians a quarter turn apart, MR-8's on three (466, 468, 333); the fourth is assumed.
    `build(number=)` in the script; the flight's `model/vehicle.py` gives "7" or "8".
  - Until November 2026 the lettering was on the 90° and 270° sides, 25 in from letter to letter with the band
    through the word, and there were no plates.
- **The external conduits' meridians are from no photograph.** None read shows a conduit on the tanks at all. They
  are on 0° and 180°, between the fins; they were on the fins' meridians at 45° and 225° until the lettering was
  put there.
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
- **As a body that falls** (the spent booster after separation, `trajectory.body.sheds` in the flight's
  `flight.ts`) its drag areas are estimates: 3.0 sq m adapter first, 2.7 tail first, 38.4 side on, the fins
  as on the stack, one figure each at every Mach number. Its mass, centre of mass and inertia are the
  parts' below, residual propellant rigid in its tanks. It does not break up, burn or bend.
- **No structural limits are documented here.** The simulator's bending limit (4,000 lb/sq ft degrees)
  is an estimate of the kind, not a Redstone figure; what the abort sensing system watched has not been read.
- **No mass properties** in the model. The simulator's are in the flight's `flight.ts` (`trajectory.body`): the
  documented section weights as uniform cylinders, the rest of the dry weight split by estimate.

## Sources

[docs/sources.md](../../../../docs/sources.md). This page rests on NASA TM X-53107, sections 4.1
to 4.4 and 4.8, Figure 4-1 and Tables 3-1 and 8-1.
