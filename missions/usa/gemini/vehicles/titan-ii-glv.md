# Gemini Launch Vehicle (Titan II GLV)

The booster for every Gemini: Martin's Titan II missile, changed as little as would make it fit to
carry men. Model: [titan_ii_glv.py](titan_ii_glv.py), imported by each flight's `model/vehicle.py`.
Built for GLV-3, which flew Gemini-Titan 3; another vehicle is what its record shows to differ
("One vehicle from the next", below).

**Two stages, nothing cryogenic.** Both burn Aerozine 50 (hydrazine and UDMH, half and half) with
nitrogen tetroxide, which ignite on meeting and keep at ordinary temperatures. The tanks' walls are
the vehicle's skin, 10 ft across from the spacecraft's adapter to the engines.

**Fire in the hole.** The second stage's engine is lit before the stages part, inside the top of
the first stage, and its exhaust goes out through a ring of ports.

Martin's stations run in inches from the nose toward the tail; the model keeps them, and
`build(base_z)` places the first stage engines' exit plane in the flight's coordinates.

Sources, short: **LSFR** is *Gemini Program Launch Systems Final Report* (Aerospace Corporation,
January 1967; NASA CR on NTRS 19670076796); **GIV** is *Gemini Program Mission Report, Gemini IV*
(MSC-G-R-65-3), which lists what GLV-4 changed from GLV-3; the **press kit** is NASA release 65-81.

## Dimensions

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Length, interface to engine exits | 1,071.278 in, "89 ft 3.278 in" (27.21 m) | documented | LSFR, Figure II.C-1 (p. II.C-3): station 276.825 to 1348.103 |
| Height with the spacecraft | 1,297.118 in (32.947 m) | derived | 1,071.278 in and the spacecraft's 225.84 in; GIV Figure 3-1 puts the spacecraft's tip at launch vehicle station 50.985, which is the same. The press kit says 109 ft, LSFR Figure II.C-2 108 ft, SP-121 "approximately 110 feet" |
| Diameter | 120 in | documented | LSFR, Figure II.C-1 |
| Spacecraft / launch vehicle interface | station 276.825 | documented | the same figure; GIV Figure 3-1 |
| Second stage oxidiser tank, where its domes meet the wall | stations 299.151 and 319.522 | documented as stations; what they are is derived | the figure's compartments begin and end at them (compartment 1 is 276.825 to 299.151, compartment 2 319.522 to 424.522) |
| Second stage fuel tank, likewise | stations 424.522 and 430.000 | as above | |
| Second stage manufacturing splice | station 384.522 | documented | the same figure |
| Second stage engine gimbal | station 499.130 | documented | the same figure; GIV Figure 3-1 |
| Stage separation plane | station 500.000 | documented | both figures |
| Second stage engine exit | station 583.200 | documented | GIV, Figure 3-1. LSFR's figure has 596.07 at the head of the exhaust ports |
| Transportation splice (the interstage's foot) | station 621.727 | documented | both figures |
| First stage oxidiser tank | stations 649.727 and 887.826 | documented as stations | as the second stage's |
| First stage manufacturing splice | station 923.326 | documented | LSFR, Figure II.C-1 |
| First stage fuel tank | stations 982.326 and 1188.111 | documented as stations | |
| Foot of the fuel tank's aft skirt | station 1224.311 | documented | both figures |
| First stage engine | 123.042 in long, from station 1225.061; gimbals at 1274.121 | documented | LSFR, Figure II.C-1. GIV Figure 3-1 has the gimbal at 1274.21 |
| First stage engine exit | station 1348.103 | documented | LSFR. GIV Figure 3-1 prints 1342.31 for the same plane: not resolved |
| Second stage forward skirt | 22.326 in by the stations; "22.55 inches" in the text | documented | LSFR, Figure II.C-1 and p. II.C-8 |
| Second stage roll nozzle | 44 in from the axis, 30°39′ from the pitch axis | documented | LSFR, Figure II.C-1 (inset) |
| Tank domes' depth | 34 in | estimated | drawn as ellipses in a figure too small to scale; a 2:1 ellipse would be 30 in |
| First stage chamber exit | 44.8 in across | estimated | an expansion ratio of 8 and a throat sized from general figures for the engine (215,000 lbf, about 780 psia). No drawing of the engine has been read |
| Second stage engine exit | 64.8 in across | estimated | an expansion ratio of 49.2, likewise |
| Second stage engine: tube bell to ablative skirt | at 0.514 of the exit's diameter: 33.3 in across | the ratios documented, the fraction derived | LSFR, p. II.C-23: 49.2:1 "achieved by use of an ablative extension from 13:1"; the square root of 13/49.2. Where along the bell that falls is estimated |
| Second stage roll control | the turbine's exhaust through a swivelled nozzle | documented | the same page |
| First stage chambers' axes | 24 in either side of the vehicle's | estimated | two 44.8 in bells side by side |
| External conduits | 8.8 in wide, 2.8 in proud | estimated | the liftoff photograph |
| Round holes in the first stage's forward skirt | 18, 6.8 in across, at station 635 | estimated | counted and scaled off NASA S65-21881 and the liftoff photograph |
| Exhaust ports | four groups of four, each port 10.5° wide, from station 598.7 to 619.1 | estimated | the same photographs |

## Which way round

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| The two first stage chambers | on the yaw axis, which points at the target | documented | LSFR, Figure II.C-1 (the plan view: "subassembly no. 1" toward the target) |
| Longerons and external conduits | on the diagonals, 45° from the axes | documented | the same plan view |
| The spacecraft's top (its hatches) | toward the target | derived, not established for this flight | the Gemini IV crew rolled "to a heads-up position" after insertion (GIV, p. 7-17), so they rode heads down: [lc-19.ts](../sites/lc-19.ts) |
| The conduit beside the lettering | 45° from the spacecraft's top toward the crew's left | estimated | the liftoff photograph: the conduit is toward the camera and the spacecraft's left-hand UNITED STATES 40° to its left |
| UNITED STATES | 33° round from that conduit, toward the top | estimated | the liftoff photograph and S65-21881 agree to a degree |
| Which way the plan view is drawn | from above | estimated | the figure does not say. From below, left and right change places |

## Paint

All read off two photographs: NASA S65-21881 (the vehicle on the stand, erector lowered, black and
white, in March 1965) and the colour photograph of the liftoff (Wikimedia Commons, *Gemini 3 -
Liftoff.jpg*, a NASA photograph). Stations are good to about 15 in.

| Item | Value | Confidence |
| --- | --- | --- |
| Tank walls | bare aluminium | documented by photograph |
| Second stage forward skirt | tan: the insulation (below) | documented (LSFR, p. II.C-8) and by photograph |
| Interstage | a black ring 13 in deep under the separation plane, then eight panels to station 596, black on the diagonals and white on the axes | estimated |
| First stage | white from the splice at station 923 to about 1035; black to about 1095; then the eight panels again to the foot of the skirt | estimated |
| UNITED STATES | black, down the first stage from about station 655 to 1004, each letter upright under the last, the last four on the white band; a short mark like an arrow under it | estimated |
| The vehicle's number | not painted in the model | Not legible on GLV-3 in anything read. NASA S65-10461, captioned Gemini-Titan 3, shows "12557" at the foot of the first stage and on the second: it is dated November 1964 in NASA's library and is taken as GLV-2 (Air Force serial 62-12557: LSFR, p. II.E-38). GLV-3 would be 62-12558, by the sequence only |

## Mass and propulsion

| | | Confidence |
| --- | --- | --- |
| First stage engine | Aerojet YLR87-AJ-7: two chambers, each with its own turbopump and gas generator, on one frame; started by a solid cartridge | documented (LSFR, p. II.C-17) |
| Second stage engine | Aerojet YLR91-AJ-7; its turbine's exhaust is the roll control | documented (the same section) |
| Thrust | "about 430,000 pounds" at liftoff; "about 100,000 pounds" at altitude | documented (press kit, p. 40; LSFR, Figure II.C-2) |
| Propellants | nitrogen tetroxide and Aerozine 50, chilled before loading: 20 °F oxidiser, 26 °F fuel | documented (LSFR, Figure II.C-2 and p. II.D-31) |
| Weight at liftoff, with the spacecraft | "about 340,000 pounds" | documented (press kit, p. 39) |
| Planned events for GT-3 | staging at 2 min 36 s, second stage cutoff at 5 min 38 s | documented as the plan (press kit, p. 11). What GLV-3 did is in its mission report, not read |

## One vehicle from the next

| | GLV-3 (Gemini-Titan 3) | GLV-4 on | Confidence | Source | In the model |
| --- | --- | --- | --- | --- | --- |
| Insulation on the second stage's forward skirt | half the thickness GLV-1 wore (MMS K-438) | none | documented | LSFR, p. II.C-8; GIV, 3.2.1.2 | yes: `skirt_insulation`. Its colour is the liftoff photograph's |
| Oxidiser feed line conduit, first stage | lapped circumferential joints | butt-welded | documented | GIV, 3.2.1.1 | no: inside the fuel tank; said on the part |
| Oxidiser standpipes | charged by hand | charged remotely; the fuel tank's aft skirt changed for it | documented | GIV, 3.2.1.1 and 3.2.2.1 | no |
| Flashing beacon lights on the second stage | none | added | documented | GIV, 3.2.2.5 | none modelled |
| Structural instrumentation | 16 measurements, with GLV-2 the last to carry strain gauges | removed | documented | GIV, 3.2.2.7; LSFR, p. II.C-14 | no |
| Fuel dampener | no heat shield; Teflon bearing | heat shield; ceramic-filled Teflon | documented | GIV, 3.2.2.1 | no |
| Switchback | first flight on which the spacecraft could switch guidance back to the primary system | | documented | LSFR, p. II.C-91 | no |

What GLV-3 changed from GLV-2 is in the GT-3 mission report (MSC-G-R-65-2), which has not been read.

## What made it a Gemini Launch Vehicle

From LSFR, pp. II.C-1 and II.C-8, and the press kit. Few of these show on the outside.

- A malfunction detection system, which told the crew what the vehicle was doing and left the abort
  to them; a second flight control system and hydraulic redundancy; a redundant electrical system.
- Radio guidance in place of the missile's inertial set.
- The retrorockets and vernier engines taken off.
- New equipment trusses between the second stage's tanks.
- A new forward skirt on the second stage: a stiffened cylinder with twenty external lugs, where the
  missile had a cone; two scuppers in it for the spacecraft's aft-firing thrusters; a seal against
  the adapter.
- One of the second stage's two external conduits deleted.
- Against pogo, the vehicle's lengthwise oscillation: a standpipe on each first stage oxidiser feed
  line and a piston accumulator on each fuel line.

## Sections

| Node | What it is |
| --- | --- |
| `TitanStage2` | the forward skirt with its lugs and the two scupper ports, the wall and its splices, the conduit in two lengths, three doors; inside, the four domes, the equipment trusses and the thrust cone |
| `TitanStage2Engine` | the chamber, the tube bell and the ablative skirt, the pump, the roll nozzle |
| `TitanInterstage` | the black ring and the eight panels, the ring of exhaust ports |
| `TitanStage1` | the forward skirt with its holes, the wall, the paint and the lettering, the two conduits, the four longerons; inside, the domes, the fuel tank's conical floor and the oxidiser feed line through it |
| `TitanStage1Engine` | the two chambers and bells, their pumps and exhaust stacks, the frame, the feed lines with their standpipes and accumulators, the two air scoops |

In the gallery the vehicle comes apart as it staged.

## What the model gets wrong or leaves out

- **It is dry.** At liftoff the tank walls were pale with frost or dew from the chilled propellants
  (the liftoff photograph); the model is the vehicle as photographed the day before.
- **The engines are representative.** Bells, chambers, pumps, exhaust stacks and the frame are
  there; none is from a drawing, the bells are sized from published ratios, and the tubes are a
  count of ours. The start cartridges, gas generators, heat exchangers and the hydraulic actuators
  are left out.
- **The standpipes and accumulators are where they belong, and no more.** Their form and exact
  places are not from a drawing.
- **The tanks are shells.** One thickness, no baffles, no level sensors; the domes' depth and the
  fuel tank's floor are estimates. The second stage's oxidiser line through its fuel tank is left
  out.
- **The equipment between the second stage's tanks is plain cases** on two trusses of our own form.
- **Doors, vents and umbilical plates are three doors.** The photographs show more: umbilical
  connectors on the side toward the tower, small vents, stencils.
- **The scupper ports' places** round the skirt are assumed (on the spacecraft's left and right).
- **The paint's edges** are read off photographs to about 15 in, and the lettering's typeface is
  Arial Bold, which it was not.
- **UNITED STATES is on one side**, where the photographs show it. Whether it was repeated on the
  other is not established.
- **The stiffened skins** (the forward skirt's integral stiffening, the tanks' chemically milled
  panels) are smooth. In S65-21881 the milled panels show as a patchwork of tone on the bare
  tank walls; how many there are and where their lands run is not in anything read, and they
  are not drawn from the photograph.
- **The first stage's expansion ratio of 8 is not from a primary source**; LSFR mentions a change
  "to 12/1" that was considered. Both bells' exits, 44.8 and 64.8 in, stay estimated.
- **No mass properties, no thrust curve.** The flight cannot be flown yet.
- **Its levels of detail change at the viewer's own distances**: they have not been measured. Below
  half detail the ports and holes are dark discs, not openings.

## Sources

[docs/sources.md](../../../../docs/sources.md), "Gemini-Titan 3".
