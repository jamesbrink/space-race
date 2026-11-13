# Gemini spacecraft

McDonnell's two-man ship: a re-entry module that comes home and an adapter that does not. Model:
[gemini_spacecraft.py](gemini_spacecraft.py), imported by each flight's `model/vehicle.py`, which
says what its own ship had (`Fit`). Built for spacecraft No. 3; what that ship had and lacked is in
[the flight's spacecraft.md](../flights/gt-3/spacecraft.md).

McDonnell's Z stations run in inches from the adapter's base (Z13.44) toward the nose (Z239.28);
the model keeps them and puts its origin at Z103.44, where the re-entry module meets the adapter.
The drawings name the ship's sides TY (top: the hatches), BY, LX and RX (the crew's left and
right); the model's +X is TY and its +Y is RX.

Sources, short: **SEDR 300** is *Project Gemini Familiarization Manual*, SEDR 300, volume 1, "Long
Range and Modified Configurations" (McDonnell, 30 September 1965), which covers spacecraft 3, 4 and
7 and marks what is one ship's; **GIV** is *Gemini Program Mission Report, Gemini IV*
(MSC-G-R-65-3); **SP-121** is *Gemini Midprogram Conference*; the **press kit** is NASA release
65-81. The photographs are NASA's of spacecraft 3: S65-13395 (at the boresight range, 6 January
1965) and S65-17337 (being lowered onto the launch vehicle, February 1965).

## Dimensions

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Length, launch configuration | 225.84 in (5.736 m): Z13.44 to Z239.28 | documented | SEDR 300, Figures 2-3 (p. 2-5) and 2-4 (p. 2-6); SP-121, Figure 3-2 |
| Length, orbit configuration | 219.03 in | documented; not modelled | Figure 2-3: less the nose fairing's 5.31 in and the 1.5 in of adapter left on the launch vehicle (p. 2-25) |
| Adapter | 90.00 in, Z13.44 to Z103.44; 120.00 in across the base, 88.30 in across the head; 10° | documented | Figure 2-3 |
| Cabin section | 70.53 in, Z103.44 to Z173.97; 90.00 in to 38.66 in across; 20° | documented | Figure 2-3 |
| Re-entry control system section | 18.00 in, Z173.97 to Z191.97; 38.66 in across | documented | Figure 2-3 |
| Rendezvous and recovery section | 42.00 in, Z191.97 to Z233.97; straight to Z201.47, then tapering at 7° | documented | Figures 2-3 and 2-4. A 7° taper ends 30.68 in across, which the side view scales to; the end view dimensions a 32.30 in circle there. The model has 30.68 |
| Nose fairing | 5.31 in, Z233.97 to Z239.28 | documented | Figure 2-3 |
| Heat shield | 90 in across, 144 in spherical radius | documented | Figure 2-3; p. 2-18 |
| Heat shield's crown | Z94.40 | estimated | a station of Figure 2-4 that the figure does not name. A cap of that sphere 90 in across is 7.21 in deep, which puts its rim at Z101.61 |
| Equipment section / retrograde section | divided between Z66.74 and Z70.00 | estimated which | both are stations of Figure 2-4; the model puts the ring between them on the retrograde section |
| Large and small pressure bulkheads; hatch sills | Z108.00 and Z160.20 | estimated | stations of Figure 2-4; "Z160.20 equipment access" doors (Figure 2-7) |
| Windows' middle | Z149.15 | estimated | a station of Figure 2-4, unnamed; it falls on the windows in S65-13395 |
| Window opening | 13 in by 10 in, narrowing to 6.5 in forward | estimated | S65-13395; the shape is Figure 2-5's |
| Hatches | from 5° to 62° either side of the top | estimated | S65-13395 and Figure 2-3's end view |
| Shingles | beaded René 41 on the cabin, unbeaded beryllium forward; black outside; the beryllium gold inside | documented | p. 2-21 |
| Cabin shingles' layout | four rings beside the hatches and one forward, two ranks of beads to a shingle, beads 1.4 in apart and 0.18 in proud | estimated | S65-13395 |
| Adapter | aluminium rings, magnesium stringers and skin; white ceramic paint outside, aluminium foil inside | documented | p. 2-21 |
| Stringers | bulb-tee, the bulb a path for the coolant | documented; their number (40) a guess | p. 2-21 |
| Mating ring | machined aluminium, 120 in, twenty bolts | documented | p. 2-23 |
| Retaining straps | three, titanium, with a fairing over each | documented; their places estimated | p. 2-21 and Figures 2-5 and 2-11; SP-121, p. 16 |
| Retrograde rockets | four, spherical, "approximately 13 inches in diameter", titanium cases, one in each quadrant of a cross of aluminium I-beams | documented; their place in the section estimated | pp. 2-23 and 11-71 |
| Seats | ejection seats, canted 12° outboard and 8° forward | documented; every size estimated | p. 3-3; Figure 3-2 has no dimensions |
| Thrust chambers, adapter | ten on the equipment section, six on the retrograde section | documented | p. 2-23 |
| Thrust chambers, re-entry control | sixteen, an A ring and a B ring, at eight places | documented | GIV, Figure 3-12 |

## Propulsion

| | | Confidence |
| --- | --- | --- |
| OAMS attitude | eight chambers of 25 lbf | documented (SP-121, p. 16, where the figure is misprinted "95"; *Chronology*, p. 191) |
| OAMS translation | two of 85 lbf firing forward, two of 100 lbf firing aft, four of 100 lbf sideways, up and down | documented (SP-121, p. 16; which numbers do what: GIV, Figure 3-13) |
| Re-entry control | sixteen chambers; 25 lbf each | count documented; thrust from general knowledge of the type (the supplement to SEDR 300 that describes the system has not been read) |
| Retrograde rockets | about 2,500 lbf for 5.5 s each, fired one after another | documented (press kit, p. 8) |
| Propellants | monomethylhydrazine and nitrogen tetroxide | general knowledge; not in anything read |

## Sections

| Node | What it is |
| --- | --- |
| `NoseFairing` | the glass-fibre cap, thrown off on the way up |
| `RendezvousRecovery` | sixteen beryllium shingles over a titanium frame; its forward face; inside, the main parachute's pack, the drogue's mortar and the pilot parachute's |
| `ReentryControl` | eight beryllium shingles, the sixteen chambers in their ports, six tanks inside |
| `Hatches` | both hatches: skin, frame, hinges, the socket for the outside handle; each window's frame, well and two panes; the experiments a flight carried on their inner faces |
| `ScannerFairing` | the cover over the horizon scanners |
| `Cabin` | the beaded shingles and the plain strips, the frame under them, UNITED STATES and the flag on each side, the three strap fairings |
| `CrewStation` | the pressure vessel (floor, sides, the two bulkheads, the beam between the hatches), the two seats, the panels, the pedestal, the attitude hand controller |
| `HeatShield` | the ablator and the structure behind it |
| `RetroSection` | skin, foil, rings and stringers; the band it is cut at; six chambers; inside, the four rockets on their beams |
| `EquipmentSection` | skin, foil, rings and stringers; the mating ring and its bolts; ten chambers; the gold cover across the foot; inside, the blast shield, the tanks, the batteries, the modules |

Below three-quarters detail nothing inside is built and the windows are dark panes; below half the
thrust chambers' ports are rings and discs on the skin.

## What the model gets wrong or leaves out

- **The inside of the pressure vessel is laid out, not drawn.** SEDR 300's figures of the cabin and
  the seat have no dimensions. The vessel's flat sides and floor, the seats' sizes and where they
  stand are fitted by eye so that the seats clear the hatches; the vessel's double skins, its
  stiffeners and the equipment bays between it and the cone are left out, and the equipment bay
  doors do not show in the shingles.
- **The seats are empty**, and are boxes and beams: no rails, no catapult breech, no ballute, no
  survival kit's shape, no inertia reel. The harness is two shoulder straps and a lap belt.
- **The instruments are stand-ins.** Three panels and a pedestal where Figure 3-1 has them, with
  round and square faces on them that are no instrument in particular. The overhead and side
  circuit-breaker panels, the abort handle, the manoeuvre controllers, the water gun and the stowage
  are left out.
- **The hatches are one skin with a frame.** No latches, no sill, no seal, no hatch curtain; the
  hinge line is a meridian of the cone, which the real one is not. The windows' wells are straight
  and their panes parallel to the cone; the real pane is set at its own angle.
- **The shingles' layout is read off one photograph** of one side. Seams, bead counts and fastener
  rows elsewhere repeat it. Access doors (Figure 2-7 numbers more than eighty on this ship) are not marked, nor the
  recovery light and hoist loop doors between the hatches.
- **The re-entry thrusters' ports** are pairs side by side, as the photograph has them; which of a
  pair is which ring's, and which way each chamber is canted, is not modelled. All sixteen point
  straight out.
- **The adapter's thrusters point straight out too**, except the two that fire forward. The real
  pitch and yaw chambers fire along the ship's axes, not along radii.
- **Inside the adapter everything is placed by guess**: the tanks' sizes, the battery module, the
  modules' frame. The plumbing, the wiring, the coolant pumps and the radar transponder are left
  out. The rockets' I-beams are plain webs.
- **The gold cover** is a smooth shallow cone; the real one is a quilted blanket.
- **The scanner fairing and the strap fairings** are blisters of our own shape.
- **The rendezvous and recovery section's inside** is a parachute pack and two mortars of our own
  form. The docking bar, the three latch receptacles and the radar are not modelled: this module
  has only been built for a ship without them.
- **No landing attitude gear**: the two-point bridle and its cover along the top are left out.
- **Lettering** is Arial Bold; the flag is the fifty-star flag as Mercury's ships wore it.
- **No mass properties.**

## Sources

[docs/sources.md](../../../../docs/sources.md), "Gemini-Titan 3".
