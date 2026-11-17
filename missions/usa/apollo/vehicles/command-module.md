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

The circles' centres and tangencies are calculated from those values, not placed
by eye. With maximum radius R, shoulder radius c and aft radius A, the shoulder
centre is `(R-c, A-sqrt((A-c)^2-(R-c)^2))`. Its tangent to the conical wall has
normal `(cos(33°), sin(33°))`. The spherical and shoulder surfaces share their
normal at their tangent. The upper reconstruction stops at the working boundary
of 81 in; this is not a claim that the exported mesh boundary is an as-built joint.
The original provisional forward envelope is retained above it pending a separate
reconstruction of the forward heat shield and tunnel hatch.

Four window outlines come from Smithsonian's CM-107 survey, treated as assumed
shared Block II structural hardware. See [the survey record](reference/README.md).
The hatch's window remains provisional. Surface normals on the triangulated wall
are calculated from its analytical profile so narrow triangles round the openings
do not create false wrinkles in the metal.

## Simplifications and things still wrong

- The forward cover's profile and total height remain provisional; published
  overall heights with docking hardware must not be treated as skin stations.
- The aft shield is its nominal outer spherical surface, visible from either side;
  its varying ablator thickness and internal structure are not reconstructed.
- The part split is at mathematical sphere/shoulder tangency; the true heat-shield
  joint and its seals are not yet represented.
- The window reveals are derived interpolations; glazing, frames and seals remain
  unbuilt. The dark closures are temporary, not glass.
- The side hatch, forward hatch, recovery equipment and cabin remain unbuilt.
- No Apollo 11 photographs, surface damage, labels or equipment are copied.
