# CSM-101 — Apollo 7 gallery model

Source: NASA *Apollo 7 press kit*, 68-168K, pp. 25–27, Figures 25b and 25d.
The source uses feet and inches. `vehicles/apollo_csm.py` retains inches and multiplies by
`IN` once when producing geometry; `flight.ts` quotes the same published envelopes.

| Figure | Source units | Confidence / source |
|---|---:|---|
| Command module base diameter | 154 in | documented, p. 25, 12 ft 10 in |
| Aft / forward heat-shield joints, Xc | 23.23 / 81.13 in | assumed common Block II, NAA A-512S ST-428A, p. 31 |
| Outer aft apex, Xc | −1.30 in | assumed common nominal datum, NASA TN D-3888, Figure 2, p. 27; not a unit-specific ablator inspection |
| Forward heat-shield top, Xc | 112.25 in | assumed common Block II, same plate; excludes docking hardware |
| SM barrel diameter | 154 in | documented, press kit p. 25 |
| SM aft / forward bulkheads, XA | 838 / 993 in | assumed CSM-101 preflight reference, MIT R-547 Fig. 1.4, p. 1-16 |
| SM barrel length | 155 in | derived XA 993 − 838, same preflight reference |
| CM datum, XA | 1000 in | assumed CSM-101 preflight reference, same figure |
| RCS quad axial station, XA / Xc | 958.905 / −41.095 in | assumed CSM-101 preflight reference, R-547 vol. III Table 1.3 p. 1-18; Figure 1.4 rounds Xc to −41.10 |
| RCS quad reference radius | 83.56 in | assumed CSM-101 preflight reference, Table 1.3 |
| RCS quad clocking from Y/Z | 7°15′ clockwise looking aft | same table; independently corroborated by Block II AOH p. 2.5-1 |
| RCS nozzle outward cant | 10° | same table's unclocked thrust vectors; rotated with the quad, exhaust opposite thrust |
| CM/SM fairing height / diameter | 26 / 156 in | assumed common Block II, AOH volume 1, p. 1-49 |
| SPS extension attachment, Xs | 180 in | assumed common hardware, NAA 1967 ST-304C / 1969 ST-304A |
| SM aft bulkhead, Xs | 200 in | same plates; the flange is 20 in aft of the bulkhead |
| SPS extension length / exit diameter | 112 / 94.5 in | assumed common Block II, NAA News Reference, SPS p. 162 |

Station XA is the integrated Apollo coordinate, Xs the service-module coordinate,
and Xc the command-module coordinate. Dimensions remain in their published inches.
The nozzle exit is derived as XA 838 + (180 − 200) − 112 = XA 706.
The model's local origin is that exit: SM aft bulkhead Z132, forward bulkhead Z287,
CM datum Z294, forward-shield top Z406.25 in. The resulting nominal CSM length
is 406.25 in, **derived** from those stations, which combine shared and preflight references
rather than an as-built overall inspection. The seven-inch gap between XA993 and XA1000 is a
datum difference, not an open physical gap: the fairing bridges the modules.

The aft CM uses the nominal spherical surface, rounded shoulder and 33° conical
wall. See [the reconstruction](../../vehicles/command-module.md). Its aft and forward
shields split at the Block II stations above. The nominal cone continues to the
forward top station; its edge fillet remains omitted. The 30-inch forward opening
surrounds the combined forward hatch.

Four side/rendezvous openings use Smithsonian's measured CM-107 outlines,
**assumed shared Block II hardware**, with provenance and limitations in
[the survey record](../../vehicles/reference/README.md). Their reveals are derived
projections between the survey and nominal skin. The separately delineated curved
hatch cover now has an outer window reference sectioned from Smithsonian's measured
detached CM-107 hatch. Its pose and connection to the nominal cone are derived,
with residuals recorded. The separate door and glazing follow the construction described below.
The SM still has four external RCS quads of four chambers, with hollow nozzle bells.
The detailed RCS reference follows CSM-101's preflight Table 1.3 in R-547 volume
III. The hatch is on the −Z side in the press kit's p. 25d axis diagram. In the
Blender basis (-Zc, Yc, Xc), the quad references are at azimuths −7.25°, 82.75°,
172.75° and 262.75°, radius 83.56 in and XA958.905. The press kit's broad ±Y/±Z
description was incorrectly read as exact cardinal placement in an earlier
revision. The later Block II handbook independently specifies the 7°15′ offset.
Nozzle axes include the table's 10° outward cant; its unclocked vector basis is
rotated with each quad. See [reaction-control.md](../../vehicles/reaction-control.md)
for the sign convention and remaining limitations. The nominal reference does
not establish manufactured housing or individual mouth positions: those,
brackets, bell contours, panel colouring and seams remain provisional.
The six internal sectors are **not** six equal exterior panels:
p. 26a specifies 50°/70°/60° pairs, and NAA A-512S ST-3057 p. 67 separately
identifies four sector panels and four RCS panels. The radiator areas and remaining uncertainty are recorded in the service-module notes.

## Cabin and recovery compartment

NAR’s *Apollo News Reference*, pp. 45–49, shows the outward-opening side hatch, round pressure window, combined forward hatch and the positions of the equipment bays relative to the couches. The reconstructed pressure door follows the registered fixed aperture at its perimeter. The door face, fifteen latch housings, exposed linkage and pump handle follow the earlier unified-hatch arrangement in JPL TM 33-425, figure 2. Their mountings and sections are estimated. The representation omits the later lightweight inner-door pockets, door seals, counterbalance details and hatch operation.

The three stacked glass panes in each window use type-specific thicknesses. [Window sources and estimated installation geometry](../../vehicles/windows.md). The lower equipment bay contains simplified optical eyepieces. Left and right cabinet faces, catches, compartments and colours follow the arrangement in the News Reference equipment-bay illustrations, pp. 51–55. Cabinet sizes and door divisions are estimated. The panel, [unpowered DSKY](../../vehicles/dsky-front.md), [flight-director instruments](../../vehicles/fdai.md) and [unitized couches](../../vehicles/unitized-couch.md) have separate hardware records.

The forward tunnel joins the common measured entry to the nominal 30-inch forward hatch. Its 108-inch top station, wall section and six-latch detail are estimates. The Apollo 7 press kit describes the two 16.5-ft drogues, three pilots and three 83.3-ft main parachutes. The three stowed main packs occupy separate sectors around the tunnel, with deployment webbing and five canisters. Their outlines and positions follow North American’s Earth Landing illustration P-131, printed p. 93; individual CM-101 pack dimensions were unavailable. No docking probe is installed.

## Service and launch vehicles

The [service module](../../vehicles/service-tanks.md) carries its four SPS tanks, central helium bottles, cryogenic tanks, fuel cells, penetrated bulkheads, gimbal hardware and engine. [Saturn hardware](../../vehicles/saturn-ib.md) records the tank stations, baffles, thrust structures, engines and instrument bay. The [escape-system record](../../vehicles/launch-escape.md) describes the tower proportions and commander’s viewing port.

The 1.75-inch honeycomb adapter comes from the Apollo 7 press kit, p. 26. The North American News Reference, p. 66, describes four roughly seven-foot aft panels and four 21-foot upper panels. The mission report’s “Adapter panel deployment” discussion records the four attached panels reaching about 45° by revolution 19. The gallery uses this angle after spacecraft clearance. Hinge placement and slider timing are estimates.

## Simplifications

The model omits individual stowage items, suits, wiring harnesses, fine thermal tape, large portions of the aft equipment bay, detailed CM reaction-control ports, umbilicals and parachute deployment. Switches, instrument settings, bay fittings and some nozzle contours are schematic. Eye positions and lighting are exhibit estimates. No masses, motor dynamics or simulation inputs derive from the visual estimates.
