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
| Recovery compartment | 32 in diameter, 20 in long | documented | CR-649 |
| Afterbody length | 58.38 in | derived | frustum from 74.5 in to 32 in at 20° |
| Heat shield depth | 9.20 in | derived | spherical cap, R = 80 in, 74.5 in chord |
| Heat shield edge height | 2.5 in | estimated | photographs |
| Antenna canister length | 24 in | documented | CR-649 |
| Antenna canister diameters | 30 in tapering to 25 in | estimated | **conflicts with CR-649**, which states 24 in to 20 in; photographs show a wider canister. Unresolved |
| Dielectric window | 8 in | documented | SEDR 104, 2-9 |
| Length, retro nozzles to canister top | 3.30 m in the model | documented | 10.8 ft (Wikipedia, citing Catchpole) |
| Length with tower | 311.2 in (7.904 m) in the model | documented | 25.9 ft secondary; NASA says only "just under 26 feet" |
| Tower pylon | 10 ft | documented | SEDR 104, 2-12: about 10 ft of 4130 steel tube |
| Tower bay heights, tube sizes | | estimated | photographs |
| Escape motor | 15 in diameter; case 63 in in the model | estimated | SEDR 104 gives about 70 in overall and 15 in |
| Shingle layout | 24 around, three rows, 8/6/4 beads | estimated | photographs; the real layout is irregular |
| Shingle gauges | cone: René 41, 0.016 in. Cylinder: beryllium, 0.22 in | documented | Hammack and Heberlig; CR-649 |
| Corrugation height | 0.14 in | estimated | |
| Portholes | two, 10 in | documented | *This New Ocean*, p. 366; positions estimated |
| Hatch | 45° of arc, stations 20 to 44 | estimated | sized to three shingles |
| Pressure vessel | two skins of 0.010 in titanium | documented | Hammack and Heberlig |
| Heat shield | beryllium heat sink, about 1 in | documented | *Results of the First U.S. Manned Suborbital Space Flight* |

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
- A 69 lb hatch held by mechanical latches, with release handles inside and out. The first design
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
| `CrewCabin` | titanium pressure vessel with hatch opening, aft bulkhead stiffeners, couch, instrument panel |
| `Afterbody` | René 41 shingles and fasteners, structure, attach ring, portholes, periscope, umbilical, roll thrusters, lettering, flags |
| `Hatch` | three shingles, latch housings, external release handle, inner and outer skins |
| `RecoveryCompartment` | beryllium shingles, pitch and yaw thrusters, parachute canisters |
| `AntennaCanister` | housing, dielectric window, horizon scanners, drogue mortar, destabilising flap |
| `EscapeTower` | clamp ring, pylon, escape motor, three canted nozzles, jettison motor nozzle, spike |

The same GLB also holds the launch vehicle's five nodes: see
[redstone-mrlv.md](../../vehicles/redstone-mrlv.md).

## What the model gets wrong or leaves out

- **The antenna canister's diameter disagrees with the one document that states it.** See above.
- **Shingle layout is regular; the real one is not.** Real shingles vary in size and are cut round
  the ports, hatch and periscope.
- **The hatch is the wrong shape** (it follows shingle edges), and its latches are placeholders.
- **The landing bag is not modelled.** It is folded behind the heat shield and out of sight.
- **The retropack's straps** run from its sides. They should meet under its centre at one
  explosive bolt. The motors are not canted toward the centre of mass as the real ones are.
- **The jettison motor has one nozzle** in the model; it had three.
- **The interior is a sketch**: couch, panel and gauges are placeholders. No hand controller, no
  environmental system, no periscope optics, no wiring.
- **The tower's bracing** (one diagonal per bay) is a simplification.
- **Lettering is Arial Bold**, not the stencil McDonnell used; "FREEDOM 7" was hand-painted.
- **No mass properties in the model.** The postlaunch report has the capsule's centre of gravity
  and moments of inertia; they are not yet in `flight.ts`. The simulator needs them.
- Parachutes, the recovery aids and the periscope's retracted state are not modelled.

## Sources

[docs/sources.md](../../../../../docs/sources.md).
