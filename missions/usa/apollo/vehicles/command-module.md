# Block II command-module reconstruction

`command_module.py` replaces the first straight-sided afterbody with nominal
common geometry from Moseley and Wells, *Wind-Tunnel Investigation of the
Aerodynamic Pressures on the Apollo Launch Escape Vehicle Configuration*,
NASA TN D-5686 (April 1970), Figure 2(g), printed p. 13 and Table I.
The report identifies C2 as the final CM design. This is a nominal aerodynamic
reference, not an as-built survey of CSM-101.

| Dimension | Drawing units | Applied to Apollo 7 |
|---|---:|---|
| Maximum diameter | 154 in | documented independently by Apollo 7 press kit p. 25 |
| Aft spherical radius | 184.8 in | assumed common nominal CM afterbody |
| Shoulder radius | 7.7 in | assumed common nominal CM afterbody |
| Cone half-angle to axis | 33° | assumed common nominal CM wall |
| Aft-shield joint, Xc | 23.23 in | assumed common Block II, NAA A-512S ST-428A, p. 31 |
| Forward-shield joint, Xc | 81.13 in | assumed common Block II, same plate |
| Forward-shield top, Xc | 112.25 in | assumed common Block II, same plate |
| Forward opening diameter | 30 in | nominal shared hatch envelope, NAA News Reference p. 47 |

The circles' centres and tangencies are calculated from those values, not placed
by eye. With maximum radius R, shoulder radius c and aft radius A, the shoulder
centre is `(R-c, A-sqrt((A-c)^2-(R-c)^2))`. Its tangent to the conical wall has
normal `(cos(33°), sin(33°))`. The spherical and shoulder surfaces share their
normal at their tangent. The aft shield continues over the rounded shoulder to
Xc 23.23 in. The crew-compartment skin runs to Xc 81.13 in, and the separate
forward shield continues to Xc 112.25 in. These are the explicitly Block II
heat-shield stations on North American A-512S, 13 January 1969, ST-428A,
printed p. 31 (PDF p. 32). They replace the initial guessed 144-inch skin height;
the press kit's rounded overall height includes a different hardware envelope.
The cover's top annulus ends at the nominal 30-inch opening. The hatch and its
pressure tunnel are not yet built. No undocumented edge fillet is invented.

Four window outlines come from Smithsonian's CM-107 survey, treated as assumed
shared Block II structural hardware. See [the survey record](reference/README.md).
The separate hatch cover uses a fifth measured outline from the detached CM-107
hatch, with explicitly derived registration and projection. Surface normals on the triangulated wall
are calculated from its analytical profile so narrow triangles round the openings
do not create false wrinkles in the metal.

## Simplifications and things still wrong

- Heat-shield joint and top stations use a common Block II reference, not an
  as-built CM-101 inspection. The upper edge fillet and joint seals are omitted.
- The aft shield is its nominal outer spherical surface, visible from either side;
  its varying ablator thickness and internal structure are not reconstructed.
- The window reveals are derived interpolations; glazing, frames and seals remain
  unbuilt. The dark closures are temporary, not glass.
- The side hatch, forward hatch, recovery equipment and furnished cabin remain
  incomplete: only the side hatch's nominal outer cover and window reference
  are built. The separate [pressure-vessel sidewall](pressure-vessel.md) now appears
  in structural cutaway with both nominal bulkheads; the full tunnel is pending.
  A [blank main-console reference](main-console.md) now establishes the common
  structural silhouette, without equipment or inferred panel thickness.
- No Apollo 11 photographs, surface damage, labels or equipment are copied.

## Top-station source conflict

NASA TN D-7780 (1974), Figure 17, labels the forward heat-shield top Xc 104.5 in.
The model retains Xc 112.25 in from the explicitly Block II ST-428A plate (1969),
also shown in NASA's *A History of the Apollo Thermal Protection System*,
NTRS 20070025192 (2007), Figure 1, p. 3, credited to Erb et al. (1970).
The latter corroborates the selected thermal reference, but does not explain the
104.5-inch label. That discrepancy remains unresolved; no claim is made that
these are proven equivalent structural and thermal datums.

## Apollo datum and outer apex

NASA TN D-3888, Figure 2, printed p. 27, dimensions the outer aft apex **1.30 in
below Xc zero**. NAA's 1966 structures training, p. 1-13, defines zero at the
heat-shield outer facesheet, excluding ablator. The former apex-at-zero model
mixed those two references. `cm_reference.AFT_APEX_XC = −1.30` now locates both
the nominal spherical/shoulder/conical profile and every common survey outline
in the Apollo frame. Published heat-shield joint and forward stations stay in
that frame. The CM/SM fairing's connection is recalculated from the corrected
profile; it is still a derived closure.

The nominal station is **assumed common for CM-101**, not a measurement of either
flight's manufactured ablator or of CM-107's remaining post-entry material.
TN D-3888's earlier upper-apex arrangement, parachutes, equipment and loading are
not adopted. The correction does not resolve the separate forward-top-station
conflict or establish absolute survey accuracy.
