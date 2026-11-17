# CSM-101 — Apollo 7 exterior study

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
| SPS extension length / exit diameter | 112 / 94.5 in | assumed common Block II, NAA News Reference, SPS p. 161 |

Station XA is the integrated Apollo coordinate, Xs the service-module coordinate,
and Xc the command-module coordinate. Dimensions remain in their published inches.
The nozzle exit is derived as XA 838 + (180 − 200) − 112 = XA 706.
The model's local origin is that exit: SM aft bulkhead Z132, forward bulkhead Z287,
CM datum Z294, forward-shield top Z406.25 in. The resulting nominal CSM length
is 406.25 in, **assumed**, combining shared and preflight references rather than an
as-built overall inspection. The seven-inch gap between XA993 and XA1000 is a
datum difference, not an open physical gap: the fairing bridges the modules.

The aft CM uses the nominal spherical surface, rounded shoulder and 33° conical
wall. See [the reconstruction](../../vehicles/command-module.md). Its aft and forward
shields split at the Block II stations above. The nominal cone continues to the
forward top station; its edge fillet remains omitted. The 30-inch forward opening
is shown without an invented pressure hatch or tunnel.

Four side/rendezvous openings use Smithsonian's measured CM-107 outlines,
**assumed shared Block II hardware**, with provenance and limitations in
[the survey record](../../vehicles/reference/README.md). Their reveals are derived
projections between the survey and nominal skin. The separately delineated curved
hatch cover now has an outer window reference sectioned from Smithsonian's measured
detached CM-107 hatch. Its pose and connection to the nominal cone are derived,
with residuals recorded; the pressure door and glazing are not yet built.
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
identifies four sector panels and four RCS panels. The provisional shell's seam
and radiator pattern is not promoted to that documented layout.

## Simplifications and things still wrong

- The cabin pressure-vessel sidewall and both nominal bulkheads are built, with an estimated
  reconstruction of Apollo 7's unitized couches. The full tunnel, glazing, instruments,
  astronaut figures and remaining internal equipment are unbuilt.
- All five outer openings have temporary dark closures, not glass. ST-503A
  (NAA A-512S, p. 41) shows a rounded-square outer hatch pane and a circular inner
  pressure window. The outer reference is built; the inner window and both glazing
  assemblies remain unbuilt.
- The side hatch has a separate outer cover, without its complete pressure door,
  sill, hinge, handles or opening motion. Later SC106+ inner-door machining is excluded.
- No CM attitude-control ports, umbilical fittings, antennas, recovery system or detailed thermal tape.
- Two nominal SPS sump-tank reference surfaces are built. Storage tanks, helium
  tanks, fuel cells, plumbing, gimbal and engine injector remain unbuilt. The
  references are not complete manufactured tank/wall/insulation models.
- Radiator panel layout and intermediate SPS contour remain estimated. Barrel ends,
  engine attachment station and extension bounds now use the structural references above.
- No lunar docking probe, lunar module or deployed lunar high-gain antenna is added.
- No mass, thrust or aerodynamic data has been assigned for simulation.

## Launch assembly

The full stack is recorded in `../../vehicles/saturn-ib.md`. The CSM origin in the assembled
model is raised by 1903.2 in so that its barrel meets the adapter at Z2035.2 in.
The boost protective cover remains a provisional fit envelope. Its lower contour now
follows the corrected nominal body, retaining the original estimated 1.4-inch radial
stand-off to prevent interference. This is not a sourced construction thickness or mould line.
The escape tower has four legs, three braced bays, four simplified motor nozzles and a
motor ending at the 224-foot full-stack envelope. Its structure and motor stations remain estimates
from Figures 25a–25c. The nozzle axes now use the published 35° cant from the motor
axis (NAA News Reference, p. 140, P-189), explicitly assumed common hardware for Apollo 7;
their contours and coordinates remain provisional. See [launch-escape.md](../../vehicles/launch-escape.md).
The legacy tower envelope is retained independently of the
corrected CM top until its dimensioned structural reconstruction is complete. The tower and cover lift as one assembly in the exploded exhibit,
as the cover did with the tower during jettison. The RCS quads stay attached to the SM:
sliding them axially along its skin made their mounts pass through the wall.

The exhibit offsets are chosen presentation distances in metres, not spacecraft dimensions
or a simulation of historical separation trajectories. The tower's provisional lower bay
intersects the provisional CM skin at assembly; this remains a geometry defect to resolve
against dimensioned drawings, not an accurate attachment reconstruction.

Additional omissions: cover windows and access hatch, penetrations, thermal seals,
canards, pitch-control and jettison nozzles, detailed tower attachment fittings and abort motion.

## Shell correction

The SM now has an inward-facing wall and annular edges at the published one-inch shell
thickness (Apollo 7 press kit, p. 26; also Apollo Operations Handbook, Block II, volume 1,
p. 1-49). This replaces the single surface which disappeared from behind in the first
exploded preview. Two nominal sump-tank surfaces now establish part of the
tankage; the remaining tanks and internal structure are still pending.

The service-module shell also participates in the normal gallery cutaway. Both
wall faces, annular rims, seam tubes and CM/SM fairing carry the same shell flag.
The RCS quads, engine and sump-tank references are separate nodes and are not
clipped. Switching cutaway off restores every shell surface, with the existing
inner wall retained for views from behind. The provisional solid aft disc is
removed because it intersected the tank domes; the real penetrated aft structure
and supports remain pending.

## SPS sump-tank reference surfaces

The two references use the CSM-101 preflight sump dimensions in MIT R-547,
volume III, Table 1.4, printed p. 1-19: radius 25.5 in, XA832–985.8, fuel
YA−48.3/ZA−6.6 and oxidizer YA+48.3/ZA+6.6. The nominal 153.8-in height and
51-in diameter agree with later Block II references, and NASA TN D-7375 p. 6
explicitly retains hemispherical heads. These nominal surfaces and preflight
installation coordinates are assumed for Apollo 7, not an as-built inspection.
See [service-tanks.md](../../vehicles/service-tanks.md) for the source comparison,
coordinate mapping, unresolved manufactured wall datum and the storage-tank
height conflict. The tanks move with the SM during explosion; their mountings
and internal equipment are not invented.

Window construction and the unresolved mounting references are recorded in
[windows.md](../../vehicles/windows.md). Published pane thicknesses do not, by
themselves, establish where to put those panes in the ship.

## Pressure vessel and structural cutaway

The separate inner wall uses the published Block II penetration coordinates and
wall limits, with fixed frame interfaces from Smithsonian's measured CM-107 hull.
See [pressure-vessel.md](../../vehicles/pressure-vessel.md) for each source figure,
the two generator calculations, independent coordinate checks, nominal 173-inch
aft-bulkhead radius and flat forward-bulkhead reconstruction. The earlier floor
reference is explicitly assumed common structure, supported by matching wall points.
The forward roof joins a measured tunnel-entry interface with a derived reveal.
These are bare reference surfaces with no invented thickness. The `CabinStructure` node
moves with `CommandModule`; it is visible only at full detail. Selecting it opens
the normal cutaway. A structural cutaway is not yet a furnished, seated cabin.

## DSKY front-web subset

A nominal front-web reference for the shared 2004739-001 cover is now installed
on the main-console reference. Its 6.900 × 8.000-inch envelope and nominal
.050-inch sheet are source-based references; .050 is the midpoint of the stock
drawing's .04–.06-inch web section, not the complete machined cover's depth.
The nineteen keyboard clearances, two display openings and central clearance
remain open. The common CM-107 metal front supplies a rigid reference pose
without scaling; its projected volume masks the blank console to avoid overlap.
This is not the real panel's machined aperture or an as-built CM-101 installation.
The web remains whole in cutaway and moves with the CM in the exploded exhibit.
[The hardware record](../../vehicles/dsky-front.md) distinguishes the primary
drawings, secondary CAD, nominal fillet simplifications and all omissions.
Keys, display covers, glazing, labels, electronics and the complete cover/housing
are not built.

## Unitized crew couches

`CrewCouches` adds Apollo 7's common three-person box-beam platform, separate
headrests and rigid seat/leg assemblies, six-point restraints and passive heel
hardware. Configuration and the 96° SC101 flight position are documented;
**all CM-101 sizes and installation coordinates are estimated**. The 32 × 22-inch
back-pan and 56-inch beam values are earlier SC012 dimensions used only as
estimated scale priors. See [unitized-couch.md](../../vehicles/unitized-couch.md)
for the photographic basis, source-inch table and omissions. Geometry is checked
against the nominal pressure wall, spherical floor and console. The assembly
remains whole in cutaway and shares the CM's exploded displacement. No later
foldable couch, crew-eye position or load-attenuation physics is inferred.

## Main-panel equipment

[The equipment study](../../vehicles/console-equipment.md) registers CM-101's own
design layout to the existing shared structural plane. It supplies separate FDAI
fronts, meter fronts, control rows, warning lenses, an EMS facade and timer window.
**All new equipment dimensions, installation and colours are estimated.** The
unchanged fixed FDAI interfaces are the structural reference, not proof of later
instrument interchangeability. The later 4.5-inch ball diameter is only an
estimated CM-101 prior. Controls and scales are static exhibit references, not
calibrated instruments or simulated readings. Complete DSKY, side consoles and
remaining cabin equipment still need reconstruction.
