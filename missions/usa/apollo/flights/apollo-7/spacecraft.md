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
| RCS quad axial station, Xc | −41.10 in | assumed CSM-101 preflight reference, same figure |
| RCS quad mounting planes | ±Y, ±Z | documented, Apollo 7 press kit p. 26a; model basis (-Zc, Yc, Xc) |
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
The RCS axial station now follows the CSM-101 preflight reference. Its four mounting
planes now follow Apollo 7 press-kit p. 26a: ±Y and ±Z. The hatch is on the −Z side
in the p. 25d axis diagram; the Blender basis (-Zc, Yc, Xc) puts these quads on
cardinal azimuths 0°, 90°, 180° and 270°. This removes the former 45° rotation.
Panel colouring, seams, nozzle contours, radial mounting distance and brackets
remain estimated. The six internal sectors are **not** six equal exterior panels:
p. 26a specifies 50°/70°/60° pairs, and NAA A-512S ST-3057 p. 67 separately
identifies four sector panels and four RCS panels. The provisional shell's seam
and radiator pattern is not promoted to that documented layout.

## Simplifications and things still wrong

- The cabin pressure-vessel sidewall and both nominal bulkheads are built. The full tunnel, glazing, couches,
  instruments, astronaut figures and internal equipment remain unbuilt.
- All five outer openings have temporary dark closures, not glass. ST-503A
  (NAA A-512S, p. 41) shows a rounded-square outer hatch pane and a circular inner
  pressure window. The outer reference is built; the inner window and both glazing
  assemblies remain unbuilt.
- The side hatch has a separate outer cover, without its complete pressure door,
  sill, hinge, handles or opening motion. Later SC106+ inner-door machining is excluded.
- No CM attitude-control ports, umbilical fittings, antennas, recovery system or detailed thermal tape.
- No SM tanks, fuel cells, plumbing, gimbal or engine injector.
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
exploded preview. Tankage and internal structure are still pending.

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
