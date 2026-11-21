# Skylab Saturn Workshop

The orbital workshop, the airlock module with its fixed shroud, the multiple docking adapter and the Apollo Telescope
Mount, as each visiting crew found them at docking. `workshop.py` builds it; each Skylab flight's `model/workshop.py`
chooses its visit, and `workshop-gallery.ts` (`workshopModel`) shows it in that flight's Gallery as an exhibit of its
own (`galleryCraft`). It is not a flight: Skylab 1's launch on SA-513 is not modelled.

Skylab's own axes (MSC 04727, §1.1, fig. 1.1-3): +X along the cluster toward the docking adapter's axial port, +Z toward
the Sun in the solar-inertial attitude, Y completing a right-handed set. In Blender +X is up (the viewer's +Y), Skylab Y
is Blender X and Skylab Z is Blender Y. The script works in inches, stations along X from the aft end of the habitation
cylinder; the model stands on the workshop's aft end.

## As each crew found it

| Visit | Docked | The station |
|---|---|---|
| Skylab 2 | 25–26 May 1973 | No meteoroid shield, bare goldized Kapton on the habitation wall; workshop wing 2 gone; wing 1's beam fairing held a few degrees open by an aluminium strap from the torn shield, its wing sections folded inside |
| Skylab 3 | 28 July 1973 | The JSC parasol over the Sun side; wing 1 deployed |
| Skylab 4 | 16 November 1973 | The MSFC twin-pole sail over the parasol; wing 1 deployed |

What changed during a visit, for a flight that plays the station on its clock (not yet played: each exhibit is the station
at docking):

| Change | When | Source |
|---|---|---|
| Parasol pushed out through the +Z scientific airlock and opened | 26 May 1973, 21:00–23:30 UTC | Skylab: A Chronology (SP-4011), 26 May; TM X-64814, §10.4 ("Day 13"). TM X-64813, §2.2.3 dates it DOY 147 (27 May), a day later: not resolved |
| Wing 1's strap cut; beam out about 20 degrees, then fully once the damper clevis broke; wing sections partly out | 7 June 1973, EVA 15:23–18:53 UTC | TM X-64814, §3.3 ("Day 25"); SP-4011, 7 June |
| Wing sections fully deployed | about six hours later | TM X-64814, §3.3 |
| Twin-pole sail erected over the parasol | 6 August 1973, EVA from 17:30 UTC | TM X-64814, §10.4 ("Day 85"); TM X-64813, §2.2.3 (DOY 218) |

## Dimensions

| Item | Figure | Confidence | Source |
|---|---|---|---|
| Module lengths: docking adapter, airlock (with shroud), instrument unit, workshop | 17.3, 17.6, 3.0, 48.1 ft | documented | TM X-64814, fig. 2-1 |
| Cluster length, workshop's aft end to the axial docking plane | 86 ft (86.0 summed) | documented | TM X-64814, §2 and fig. 2-1 |
| Habitation cylinder | 260 in across, 268.6 in long | documented | TM X-64813, §2.2.1 |
| Forward and aft domes | 260-in hemispheres | documented | MSC 04727, §2.0.10.4.3 |
| Forward skirt; aft skirt | 21.7 ft across; 10.2 ft and 7.2 ft high | documented | MSC 04727, §§2.0.10.4.1–2 |
| Thrust structure | cone 65 in high, 167 in to 27 in across | documented | MSC 04727, §2.0.10.4.4 |
| Refrigeration radiator | 84 sq ft, 5 degrees off square to the axis, drawn as a regular octagon | documented area; shape estimated | MSC 04727, §2.0.10.4.4 |
| TACS sphere shield | an annulus over the spheres: section estimated | estimated | MSC 04727, §2.0.10.4.4, fig. 2.0.10-20 |
| Wardroom window | 18 5/16 in, 25 deg 55 min from −Z toward −Y; station estimated | documented clock | MSC 04727, §2.0.10.3 |
| Scientific airlocks | 8.25 in square, on +Z and −Z; station estimated from S73-34619 | documented size | MSC 04727, §2.0.10.3.1 |
| Instrument unit | 21.6 ft across, 3 ft high | documented | MSC 04727, §2.0.2 |
| Fixed airlock shroud | 260 in across, about 80 in long | documented | MSC 04727, §2.0.9.3 |
| Oxygen tanks | six, 45 in across, 90 in long, elliptical ends; in pairs between +Z and +Y, +Y and −Z, −Z and −Y; radius and spacing estimated | documented size | MSC 04727, §2.4.4, fig. 2.0.9-1 |
| Discone antenna booms | 36 ft 8 in deployed, 45 degrees each side of −Z on the forward ring; drawn straight out | documented | MSC 04727, §2.0.4 |
| Airlock tunnel | 55 in across, 153 in long (aft compartment 42, lock 80, forward 31) | documented | MSC 04727, §2.0.8.3.2 |
| Bellows | 42.5 in inside, 13 in long | documented | MSC 04727, §2.0.8.3.3 |
| Structural transition section | 120 in across, 46 in long; bulkhead depth 25.6 in | documented; depth derived (what the module lengths leave) | MSC 04727, §2.0.8.3.1 |
| STS windows | four, 8 × 12 in, equally spaced; clocking estimated | documented size | MSC 04727, §2.0.8.3.1 |
| EVA hatch | in the +Z/−Y quadrant of the lock compartment; size estimated | documented quadrant | MSC 04727, fig. 2.4.4-4 |
| AM trusses | four, at +Y (1), −Z (2), −Y (3), +Z (4); members estimated | documented positions | MSC 04727, §2.0.8.3.4, fig. 2.0.8-3 |
| Nitrogen spheres | six, 40 in across, two each on trusses 2, 3 and 4; places estimated | documented size | MSC 04727, §§2.0.8.3.4, 2.4.4 |
| Radiator and meteoroid shield over the STS and docking adapter | 3 in off the pressure vessel | documented | MSC 04727, §§2.0.7.3, 2.0.8.3.1 |
| Docking adapter | 10 ft across, 17 ft long, 1,140 cu ft | documented | MSC 04727, §2.0.7.3 |
| Forward cone | 30 degrees; read as 30 degrees from the transverse plane, since a 30-degree apex angle would be a pointed cone the handbook's figures do not show | documented angle, reading derived | MSC 04727, §2.0.7.3, figs. 2.0.7-1, 2.0.7-5 |
| Axial port tunnel | 20 in proud of the cone; 19.5 in outer radius | estimated | — |
| Radial port | on −Z, 103 in forward of the adapter's aft end; docking plane 80 in from the axis (estimated) | documented place | MSC 04727, §2.0.7.3 |
| Docking ring and drogue | the LM-type ring and drogue (`apollo_docking.ring`, `drogue`) at both ports | assumed (the handbook: "standard Apollo drogues and docking rings") | MSC 04727, §2.0.7.3; NASA TN D-6854 |
| Axial docking target | base 17.68 in across, cross 11 in above it, 46 in from the port's centre at 75 degrees from −Y toward −Z | documented | MSC 04727, §2.0.7.3 |
| Radial docking target | 46 in aft of its port | estimated | — |
| S190 window, S193 dish, S194 antenna | on the −Z side; sizes and places estimated | estimated | MSC 04727, fig. 2.0.7-1 |
| ATM rack | octagon about 11 ft across, 12 ft high | documented | MSC 04727, §2.0.5.2 |
| ATM sun shield | 14 ft across, at the Sun end | documented | MSC 04727, §2.0.5.2; TM X-64814, fig. 2-2 |
| ATM canister | about 7 ft across, 10 ft long | documented | MSC 04727, §2.0.5.3 |
| ATM length | 13.3 ft overall, 11.0 ft across | documented | TM X-64814, fig. 2-1 |
| ATM's place over the docking adapter | canister axis at station 760, its docking-adapter end 88 in from the cluster's axis | estimated | TM X-64814, figs. 2-1, 2-2; MSC 04727, fig. 2.0.6-1 |
| ATM wings | four, 521 × 101.5 in, four panels of 104.3 in and a half panel, at 45 degrees to the axis | documented | TM X-64814, §7.3.1, fig. 7-20 |
| ATM wing span and roots | about 100 ft, which puts the roots 79 in from the canister's axis | documented span; roots derived | MSC 04727, §2.0.5.4 |
| Workshop beam fairings | 4 ft wide, about 37 ft long, at 28 deg 20 min from the Y axis toward +Z; wing 2 on +Y, wing 1 on −Y | documented | MSC 04727, §2.0.10.4.6, figs. 2.0.10-23, 2.1.4-2 |
| Beam fairing depth | 24 in | estimated | — |
| Beam hinge | where the forward fairing's 20-degree nose meets the full depth: 66 in below the skirt's forward end | derived from estimates | MSC 04727, §2.0.10.4.6 |
| Wing sections | three, each a truss panel, a dummy panel and ten active panels of 120 × 27 in; stabilizer beams 1.75 × 6 in | documented | MSC 04727, §2.0.10.4.6 |
| Wing 1's jammed angle | 4 degrees | estimated from SL2-04-248 | — |
| Meteoroid shield | 0.025-in aluminium, 5 in off the wall when deployed; the remnant's extent estimated | documented | MSC 04727, §2.0.10.4.7; TM X-64814, §4.3.1 |
| Parasol | canopy 24 × 22 ft on four telescoping rods from a centre post through the +Z airlock; sag estimated | documented size | NASA photograph S73-26380 (caption); TM X-64814, §10.4 |
| Twin-pole sail | poles 55 ft, eleven sections each, at 5 deg 30 min to the workshop; sail 22 ft 3 in across its far edge, 24 ft 5 in long | documented | TM X-64814, §§3.2, 10.4; TM X-64813, fig. 2.2.3-43 |
| ATM deployment assembly | rotated 90 degrees in about 3 minutes; members estimated | documented motion | MSC 04727, §2.0.6.3, fig. 2.0.6-1 |

Each build prints the cluster's length from the radiator to the axial docking plane (26.21 m, the documented 86 ft) and
the span of the ATM wings (30.5 m, the documented 100 ft).

## Colours

The bare habitation wall is goldized Kapton tape (TM X-64813, §2.2.3; SL2-04-248). The skirts are black with white bands
at their outer ends, the shroud mottled silver-white and the docking adapter's cone black, read from SL2-04-248 and
SL2-07-651; band widths are estimated. The parasol's nylon side (to the Sun) is orange and its aluminized side faces the
workshop; the sail's Sun side is painted white with S-13G (TM X-64813, §2.2.3).

## Docking ports

`dockingPorts` lists both as `role: 'drogue'` on the `DockingAdapter` part, with frames `MDA_AxialDockingFrame` and
`MDA_RadialDockingFrame` at their mating planes, +Y (glTF) outboard. The model is not yet flown to: it becomes a passive
target from its published orbit later (the plan's E3).

## What the model simplifies or leaves out

- Nothing inside: no cabin, no cutaway. The habitation area's floors, the airlock's compartments and the docking
  adapter's panels are not built.
- The ATM's place over the docking adapter, the ATM deployment assembly's members, the AM trusses' members and the
  places of the nitrogen spheres and oxygen tanks are estimated to show their form.
- The ATM's experiment doors, its control moment gyroscopes and power equipment are boxes; the rack's truss is a
  simplified octagonal frame. The ATM wings' module lines are drawn as quarters.
- The workshop wing's hinge axis is taken as Skylab's Z, so the deployed wing faces the Sun as TM X-64813, fig. 2.2.3-43
  draws it; the hinge itself is not drawn. Its deployment mechanism, damper and the actuator clevis the crew broke are left
  out, and so are the wing's fairing vent modules.
- Wing 2's torn hinge and wires are a few rods (TM X-64814, fig. 4-9 shows them; not traced).
- The shield remnant is a crumpled strip; the strap's crossing point is estimated.
- The parasol is drawn as a sagging canopy at its full 24 × 22 ft; in orbit it never opened to its full rectangle
  (TM X-64813, §2.2.3). The rotation of 25 degrees and back 10 on 19 June 1973 (DOY 170) is not shown.
- The sail's reefing lines to the ATM outriggers and the clothes lines are left out.
- The refrigeration radiator is a regular octagon of the documented area, not the irregular one.
- Running and tracking lights, handrails, foot restraints, the film transfer booms and the TV and EREP cables are not
  modelled. Painted markings (axis numbers) are left out.
