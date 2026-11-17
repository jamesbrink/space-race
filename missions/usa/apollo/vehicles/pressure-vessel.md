# Block II pressure-vessel structure

`pressure_vessel.py` reconstructs the wall inside the thermal structure. It is
not a miniature copy of the outer heat shield and is not a cylinder. The current
model is a bare structural wall and nominal aft bulkhead: the forward bulkhead,
tunnel, hatch, stringers and cabin furnishings remain separate unfinished work.

The source is North American Aviation, *Apollo Training: Structures and Mechanical
Subsystems*, A-512S, 13 January 1969. ST-278A, printed p. 26 (PDF p. 26), explicitly
identifies the Block II structure and its aft and forward wall limits. ST-310A,
printed p. 27 (PDF p. 28), gives penetration coordinates in Apollo inches. These
common structural references are **assumed for CM-101**, not an as-built inspection.

| Point | Xc, in | Yc, in | Zc, in | Use |
|---|---:|---:|---:|---|
| A | 30.9000 | 28.7200 | 51.0939 | defines lower generator |
| H | 19.2500 | −45.0084 | −36.0000 | defines lower generator |
| B | 18.6856 | −48.8943 | 30.4243 | independent lower check |
| C | 26.0000 | −51.5856 | −26.9500 | independent lower check |
| G | 30.9000 | −16.4500 | 56.2568 | independent lower check |
| T | 51.9600 | 9.6122 | −52.8055 | defines upper generator |
| P | 60.5000 | −10.1506 | −47.1474 | defines upper generator |
| R | 57.0005 | −9.2244 | −49.6092 | independent upper check |
| O | 58.7200 | 11.3140 | −48.0486 | independent upper check |

Radius is `hypot(Yc, Zc)`. Two points determine each straight generator:

- Lower: `r = 56.0189646311 + 0.0839331450755 × Xc`.
- Upper: `r = 86.8054310028 − 0.637648281848 × Xc`.

The unused lower points agree within 0.000063 in and the upper points within
0.000352 in, consistent with the table's rounded coordinates. Those are internal
arithmetic checks, **not** claims about manufacturing or model accuracy. Every build
checks the five unused points to 0.001 in. No dimensions are fitted to photographs.

| Structural boundary | Xc, in | Radius, in | Basis |
|---|---:|---:|---|
| Aft sidewall limit | 14.07 | 57.199904 | station ST-278A; radius calculated |
| Mid-ring | 42.665270 | 59.599995 | intersection of generators |
| Forward sidewall limit | 80.75 | 35.315332 | station ST-278A; radius calculated |

The independently published window-visibility mockup in PR29-12, Figure 4,
printed p. 7 (NASA compilation PDF p. 156), gives the kick frame at Xc 42.665 and
Zc −59.6 in. It corroborates the intersection without supplying either generator.
ST-278A rounds its mid-ring label to 42.65. Model coordinates are
`(Blender x, y, z) = (−Zc, Yc, Xc)` and convert inches to metres once.

The four fixed window frame openings and outer hatch-frame interface come from
Smithsonian's measured CM-107 interior hull; see [the survey record](reference/README.md).
Their relationship to the nominal wall is reconstructed. The curved hatch contour
is mapped radially onto the wall, retaining its measured azimuths and axial stations.
It is the **outer frame interface**, not the clear opening for the crew. No door
size is inferred from it. The frame and hatch still need their own reconstruction.

Both the outer heat shield and this wall are marked as shells so the Gallery's
normal quadrant cutaway can expose the space between them. The wall and its
window interfaces appear only at full detail. They move with the command module
in the exhibit; these are not historical separation trajectories.

## Nominal aft bulkhead

McCullough and Lands, *Apollo Command Module Land-Impact Tests*, NASA TN D-6979
(October 1972), Figure 8, printed p. 9 (PDF p. 18), gives the aft pressure bulkhead
a spherical radius of **173.0 in**. Its inner-wall coordinates D (14.072, 57.200),
E (42.665, 59.600) and F (80.750, 35.316), in axial/radial inches, independently
agree with the generators above within 0.001 in. Every build checks those three
unused coordinates. The report's impact specimens were **Block I**: this is an
explicitly **assumed common primary-structure reference for CM-101**, supported
by the matching points, not a direct Block II floor inspection. Its cylindrical
Block I forward tunnel is not adopted; the report identifies the changed Block II
tunnel separately on the same page and in Figure 10.

The bulkhead is concave upward, as described in NASA TN D-7780, printed p. 8.
For radius `S = 173 in`, the sphere centre is
`X0 = 14.07 + sqrt(S² − radius(14.07)²)`, and the surface is
`Xc(r) = X0 − sqrt(S² − r²)`. It meets the existing nominal aft ring exactly,
using the Block II plate's rounded 14.07-inch station rather than introducing a
seam from the 14.072-inch point D. Its centre is derived, not placed to fit the
cabin volume. It is a two-sided reference skin, with no invented honeycomb
thickness, penetrations, attachment fittings, insulation or equipment.

## Simplifications and things still wrong

- The wall is a two-sided reference surface. Varying honeycomb thickness, face
  sheets, longerons, stringers, seals and penetrations are not reconstructed.
- The nominal aft bulkhead is assumed from the earlier primary-structure
  reference above; its detailed construction and transitions remain unbuilt.
  The forward bulkhead and pressure tunnel remain unbuilt. The incomplete shell
  must not be used as a collision enclosure.
- Window connections are derived between two references, not surveyed frame
  solids. A tilted rendezvous frame intersects the nominal cone: its connector
  is split at that intersection to avoid a folded, overlapping face.
- The complete hatch frame, door, glazing, couches, controls and equipment are
  not yet built. The cutaway is structural, not a finished inhabitable cabin.
- No Apollo 11 equipment, couch pose, photographic texture or post-entry damage
  is copied into Apollo 7.
