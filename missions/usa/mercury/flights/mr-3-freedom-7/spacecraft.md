# Mercury spacecraft No. 7, as flown on MR-3

What the capsule in [model/vehicle.py](model/vehicle.py) is built from, and how far to trust each
number. In the model, station 0 is the heat shield's maximum-diameter plane and positive is toward
the nose. (McDonnell's own stations put that plane at Z = 104.50.) The drawings are in inches, so
the model is too.

**Confidence**: *documented* is a published figure; *derived* is computed from documented ones;
*estimated* was read off photographs or chosen to look right. The same labels are in
[flight.ts](flight.ts), which is what the viewer shows and the simulator will read.

## Dimensions

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Heat shield diameter | 74.5 in (1.892 m) | documented | NASA CR-649 |
| Heat shield radius of curvature | 80 in | documented | CR-649 |
| Afterbody half-angle | 20° | documented | CR-649 |
| Recovery compartment | 32 in diameter, 22.76 in long | documented | CR-649 Figure 1, stations 58.38 to 81.14 (its text says 20 in); Hammack and Heberlig Figure 17 also carries 81.14. SEDR 104 Figure 1-3 gives 22.86 in |
| Afterbody length | 58.38 in | derived | frustum from 74.5 in to 32 in at 20° |
| Heat shield depth | 9.20 in | derived | spherical cap, R = 80 in, 74.5 in chord |
| Stations | heights above the plane of maximum diameter, McDonnell's Z104.50 | documented | Postlaunch Report ("maximum diameter ... at Z = 104.50"); SEDR 104 Figure 1-3 |
| Heat shield edge height | 2.5 in | estimated | photographs |
| Antenna canister length | 23.43 in | derived | from 81.14 in to its top at Z209.07 (SEDR 104, Figure 1-3). CR-649 says 24 in |
| Antenna canister diameters | 24 in tapering to 20 in | documented | CR-649; SEDR 104 Figure 1-3 scales to the same. The model was 30 to 25 in until November 2026 |
| Dielectric window | 8 in | documented | SEDR 104, 2-9 |
| Length, retro nozzles to canister top | 131.57 in (3.342 m) | documented | SEDR 104 Figure 1-3, Z77.50 to Z209.07; Hammack and Heberlig Figure 2 |
| Length with tower | 311.55 in (7.913 m) | documented | SEDR 104 Figure 1-3, Z77.50 to Z389.05; Hammack and Heberlig Figure 2 |
| Tower pylon | 10 ft | documented | SEDR 104, 2-12: about 10 ft of 4130 steel tube |
| Tower stations | truss nodes at 106.08, 137.03, 167.98, 198.93 in; motor case top 249.55; cap 253.55; spike tip 284.55 | documented | SEDR 104 Figure 1-3, less Z104.50. Tube sizes are estimated from photographs |
| Escape motor | 15 in diameter; case to 249.55 in, spike 31 in | documented | SEDR 104 Figure 1-3; Hammack and Heberlig Figure 17 gives the 31.00 in spike. The case's lower end (202 in) is read off the figure |
| Shingle layout | 24 around, three rows, 8/6/4 beads | estimated | photographs; the real layout is irregular |
| Shingle gauges | cone: René 41, 0.016 in. Cylinder: beryllium, 0.22 in | documented | Hammack and Heberlig; CR-649 |
| Corrugation height | 0.14 in | estimated | |
| Portholes | two, 10 in | documented | *This New Ocean*, p. 366; positions estimated |
| Hatch | 45° of arc, stations 20 to 44 | estimated | sized to three shingles |
| Pressure vessel | two skins of 0.010 in titanium | documented | Hammack and Heberlig |
| Heat shield | beryllium heat sink, about 1 in | documented | Hammack and Heberlig ("approximately 1-inch-thick") |

## Propulsion

| Motor | Count | SP-45 nominal | Manufacturer (SEDR 104) |
| --- | --- | --- | --- |
| Escape (Grand Central) | 1 | | 52,000 lbf for 0.78 s, then decaying; 56,500 lb-s; three nozzles canted 19° |
| Tower jettison | 1 | 800 lbf, 1.5 s | 785 lbf; three nozzles canted 30° |
| Posigrade | 3 | 400 lbf, 1 s | 370 lbf |
| Retrograde (Thiokol) | 3 | 1,000 lbf, 10 s | 992 lbf, 13.2 s action time, 13,000 lb-s |

Automatic attitude control (Hammack and Heberlig): pitch and yaw each two 24 lbf and two 1 lbf
chambers; roll two 6 lbf and two 1 lbf. Twelve chambers on 90% hydrogen peroxide. The manual
system has six chambers of variable thrust; its range is not in anything read so far.

Other escape-motor thrusts in print: 58,500 lbf (Hammack and Heberlig) and 56,000 lbf (SEDR 104,
section 5). 52,000 is the nominal axial figure.

## What makes No. 7 different

- Two 10-inch portholes; the trapezoidal window arrived with No. 11.
- A hatch held by a 69 lb mechanical latch mechanism (*This New Ocean*'s wording: the mechanism, not
  necessarily the whole hatch), with release handles inside and out. The first design
  bolted the hatch on with 70 bolts; the explosive hatch (23 lb, 70 bolts and a detonating fuse)
  arrived with No. 11.
- A beryllium heat-sink shield, not the ablative shield of the orbital flights.

It did carry a landing bag, which worked.

## Parts in the model

Top-level nodes in the GLB, bottom to top. These names are the `node` fields in `flight.ts`.

| Node | Contains |
| --- | --- |
| `Retropack` | housing, three retrograde motors, three posigrade motors, three straps and fittings |
| `HeatShield` | beryllium heat sink, edge fasteners |
| `CrewCabin` | titanium pressure vessel with hatch opening, aft bulkhead stiffeners, couch, instrument panel; and for the cutaway the pilot, hand controller and abort handle, equipment boxes, two oxygen bottles, the folded landing bag |
| `Afterbody` | René 41 shingles and fasteners, structure, attach ring, portholes, periscope, umbilical, roll thrusters, lettering, flags |
| `Hatch` | three shingles, latch housings, external release handle, inner and outer skins |
| `RecoveryCompartment` | beryllium shingles, pitch and yaw thrusters, parachute canisters; the packed main and reserve parachutes |
| `AntennaCanister` | housing, dielectric window, horizon scanners, drogue mortar, destabilising flap; the bicone antenna inside |
| `EscapeTower` | clamp ring, pylon, escape motor and its propellant grain, three canted nozzles, jettison motor nozzle, spike |

The same GLB also holds the launch vehicle's five nodes: see
[redstone-mrlv.md](../../vehicles/redstone-mrlv.md).

## What the model gets wrong or leaves out

- **The antenna canister's diameter disagrees with the one document that states it.** See above.
- **Shingle layout is regular; the real one is not.** Real shingles vary in size and are cut round
  the ports, hatch and periscope.
- **The hatch is the wrong shape** (it follows shingle edges), and its latches are placeholders.
- **The landing bag** is a flat ring standing in for the folded bag; it does not deploy.
- **The cabin's contents are representative**: a seated figure of Shepard's size, and equipment of
  the right kinds in roughly the right places. It is not a survey of No. 7's installation.
- **The retropack's straps** run from its sides. They should meet under its centre at one
  explosive bolt. The motors are not canted toward the centre of mass as the real ones are.
- **The jettison motor has one nozzle** in the model; it had three.
- **The couch, panel and gauges are placeholders.** No periscope optics, no wiring, no window
  shades, no survival kit.
- **The tower's bracing** (one diagonal per bay) is a simplification.
- **Lettering is Arial Bold**, not the stencil McDonnell used; "FREEDOM 7" was hand-painted.
- **No mass properties in the model.** The postlaunch report has the capsule's centre of gravity
  and moments of inertia; they have not been read. The simulator flies on estimates of them
  (`trajectory.body.capsule` in `flight.ts`, labelled `estimated`): replace them from the report.
- Parachutes, the recovery aids and the periscope's retracted state are not modelled.

## Sources

[docs/sources.md](../../../../../docs/sources.md).
