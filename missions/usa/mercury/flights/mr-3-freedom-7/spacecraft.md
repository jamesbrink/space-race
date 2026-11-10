# Mercury spacecraft No. 7, as flown on MR-3

What the model in [model/build.py](model/build.py) is built from, and how far to trust each number.
Station 0 is the heat shield's maximum-diameter plane; positive is toward the nose. The drawings
are in inches, so the model is too.

**Confidence**: *documented* is a published figure; *derived* is computed from documented ones;
*estimated* was read off photographs or chosen to look right. The same labels are in
[flight.ts](flight.ts), which is what the viewer shows and the simulator will read.

## Dimensions

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Heat shield diameter | 74.5 in (1.892 m) | documented | SP-45; every Mercury reference |
| Heat shield radius of curvature | 80 in | documented | SP-45 |
| Afterbody half-angle | 20° | documented | SP-45 |
| Recovery compartment | 32 in diameter, 20 in long | documented | NASA Langley flight-test report (NTRS 19650003098) |
| Afterbody length | 58.38 in | derived | frustum from 74.5 in to 32 in at 20° |
| Heat shield depth | 9.20 in | derived | spherical cap, R = 80 in, 74.5 in chord |
| Heat shield edge height | 2.5 in | estimated | photographs |
| Antenna canister length | 24 in | documented | same Langley report |
| Antenna canister diameters | 30 in tapering to 25 in | estimated | the Langley report gives 24 in to 20 in for a test article; photographs of No. 7 show a wider canister |
| Retropack depth below shield apex | 15.5 in | derived | makes capsule length 3.30 m against a published 3.33 m |
| Overall length with tower | 311.2 in (7.904 m) | documented | 25 ft 11 in (7.90 m) |
| Tower truss: bay heights, tube diameters | 10 ft truss, 1.6 in legs | estimated | photographs; only the overall length is fixed |
| Escape motor case | 15 in diameter, 63 in long | estimated | photographs |
| Shingle layout | 24 around, three rows, 8/6/4 beads | estimated | photographs; the real layout is irregular |
| Corrugation height | 0.14 in | estimated | |
| Porthole | 10 in diameter | documented | position on the cone is estimated |
| Hatch | 45° of arc, stations 20 to 44 | estimated | sized to three shingles; the real hatch is about 23 by 27 in |

## Propulsion

| Motor | Count | Thrust each | Burn | Confidence |
| --- | --- | --- | --- | --- |
| Escape (Grand Central 1-KS-52000) | 1 | 52,000 lbf (231 kN) | 1 s | documented |
| Tower jettison | 1 | 800 lbf (3.6 kN) | 1.5 s | documented |
| Posigrade | 3 | 400 lbf (1.8 kN) | 1 s | documented |
| Retrograde (Thiokol TE-316) | 3 | 1,000 lbf (4.4 kN) | 10 s, fired 5 s apart | documented |
| Attitude, pitch and yaw | 4 high + 4 low | 24 lbf and 1 lbf | pulsed | documented |
| Attitude, roll | 2 high + 2 low | 6 lbf and 1 lbf | pulsed | documented |

Attitude control is 90% hydrogen peroxide over a silver catalyst. The figures are the automatic
system's; the manual system's thrusters throttle from 4 to 24 lbf (pitch, yaw) and 1 to 6 lbf (roll).

These are from memory of SP-45 and the Familiarization Manual and are marked *documented* because
they are published figures, **but none has been re-read from the primary source for this repo.**
Do that before the simulator uses them.

## What makes No. 7 different

- Two 10-inch portholes; the trapezoidal window arrived with No. 11.
- A side hatch bolted on from outside with 70 bolts; no explosive hatch.
- A beryllium heat-sink shield, not the ablative shield of the orbital flights.
- No landing bag behind the heat shield.
- Beryllium shingles on the recovery compartment.

## Parts in the model

Top-level nodes in the GLB, bottom to top. These names are the `node` fields in `flight.ts`.

| Node | Contains |
| --- | --- |
| `Retropack` | housing, three retrograde motors, three posigrade motors, three straps and fittings |
| `HeatShield` | beryllium heat sink, edge fasteners |
| `CrewCabin` | titanium pressure vessel with hatch opening, aft bulkhead stiffeners, couch, instrument panel |
| `Afterbody` | René 41 shingles and fasteners, structure, attach ring, portholes, periscope, umbilical, roll thrusters, lettering, flags |
| `Hatch` | three shingles, 70 bolts, inner and outer skins |
| `RecoveryCompartment` | beryllium shingles, pitch and yaw thrusters, parachute canisters |
| `AntennaCanister` | housing, dielectric window, horizon scanners, drogue mortar, destabilising flap |
| `EscapeTower` | clamp ring, truss, escape motor, three canted nozzles, jettison motor nozzle, spike |

40 meshes, about 134,000 triangles.

## What the model gets wrong or leaves out

- **Shingle layout is regular; the real one is not.** Real shingles vary in size and are cut around
  the window, hatch and periscope.
- **The hatch is the wrong shape**: it follows shingle edges instead of the real trapezoid.
- **The interior is a sketch**: couch, panel and gauges are placeholders. No pilot, no hand
  controller, no environmental system, no periscope optics, no wiring.
- **The escape tower's truss pattern** (one diagonal per bay) is a simplification of the real bracing.
- **Lettering is Arial Bold**, not the stencil McDonnell used; "FREEDOM 7" was hand-painted.
- **Retropack**: motors are not canted toward the centre of mass as the real ones are; no
  umbilical detail or heat blanket.
- **No mass properties.** The model has no centre of mass or moments of inertia. The simulator needs them.
- **No booster.** The Mercury-Redstone launch vehicle and the spacecraft adapter are not modelled.
- Parachutes, the recovery aids (dye marker, SOFAR bomb, whip antenna) and the periscope's
  retracted state are not modelled.

## Sources

- *Mercury Project Summary*, NASA SP-45 (1963).
- McDonnell Aircraft, *Project Mercury Familiarization Manual*, SEDR 104.
- NASA Langley flight-test report, [NTRS 19650003098](https://ntrs.nasa.gov/api/citations/19650003098/downloads/19650003098.pdf):
  the 32 in by 20 in cylinder and 24 in canister.
- [Mercury-Redstone 3](https://en.wikipedia.org/wiki/Mercury-Redstone_3), Wikipedia: masses.
