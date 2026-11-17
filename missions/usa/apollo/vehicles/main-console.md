# Apollo 7 main display console — structural reference

The console is unfinished. This step establishes its broad structural silhouette
inside the cabin; it does not represent an equipped or operable flight console.

North American Aviation **V36-976018 revision D, 12 March 1968**, *Design Layout —
Main Display Console, Command Module 101*, sheet 1 of 2, identifies Apollo 7's
main-panel arrangement, central notch and equipment layout. The digitized foldout
is [available through Virtual AGC](https://www.ibiblio.org/apollo/Documents/V36-976018_Design_Layout_MDC_CM-101.pdf).
Its sheet dimensions and printed scale are **not** used to measure spacecraft
hardware. NASA TN D-7919, printed p. 21, identifies the three large machined main
panels as a Block II design change from Block I's twenty smaller sheet-metal panels.

The common outer contour is independently identifiable in the Smithsonian's
CM-107 panel derivative. Its **physical centimetres** are applied as **assumed
shared Block II structural geometry**, not measurements of CM-101. This use does
not establish unchanged detail machining, panel thickness, support geometry or
equipment between the two spacecraft. Apollo 11's controls, legends, side wings
and couches are not transferred. In particular, CM-101's unitized couches differ
from CM-107's later folding couches.

The reference JSON retains the source URL, SHA-256, CC0 licence, coordinate basis,
plane and extraction settings. The original is a **processed visualization
derivative**, not raw metrology. The model does not claim an absolute survey
accuracy or a manufacturing tolerance for it.

## Reconstruction

The glTF is imported into Blender's Z-up basis without changing its physical
centimetres. Area-weighted triangle-plane RANSAC (seed 0, 500 candidates, centroid
band 0.1 cm, absolute normal dot greater than 0.98) identifies the main structural
plane; a least-squares plane is fitted to that inlier set's triangle vertices.
The plane is recorded in the reference JSON.

Only exactly coincident source vertices are welded; no proximity tolerance
moves a vertex or joins adjacent hardware. Edge-connected triangle components
are numbered by their lexicographically first unique vertex. Structural components
**240, 712, 1440 and 1441** identify the broad left, centre and right panel contours;
1441 provides the right-hand tip. Detached instruments and side-wing components
are excluded. The complete triangle footprints of these structural components
are projected to the recorded plane and united. **No plane-distance filter clips
the retained contours.**

Each component's interior loops are filled to leave a blank reference surface;
its outer contour is then united with the other structural contours. The concave
central notch is retained, rather than filled with a convex hull. Redundant
collinear coordinates are removed at 0.0000001 cm. Individual panel joints are
not resolved by this union, and the number of resulting connected polygons is
not a count of the real console's three manufactured panels. No manufactured
thickness is inferred.

Registration uses the same nominal aft-sphere apex and 90° rotation as the other
CM-107 references, without scaling to fit the cabin. It remains an assumed common
coordinate frame, not an independently measured Apollo station datum. The source
coordinates are converted once to metres by `main_console.py`.

The surfaces are double-sided and are not cutaway shells. They stay in place as
the surrounding pressure wall opens, and move with the CM in the exploded exhibit.
They are omitted from distant levels of detail like other cabin internals.

## Nominal-wall interface check

A radial comparison of every projected outline vertex against the current
published-coordinate pressure-wall reconstruction finds seven vertices outside
that nominal surface, with a maximum radial difference of **19.55 mm**. This is
a **derived mismatch between two references**, not a measured interference in
CM-101. The console plane, the common survey datum registration and the nominal
wall profile each require further verification at this interface. The source
coordinates are retained without shifting or scaling the console to conceal the
difference. This small overlap remains unresolved in the structural study and
must be resolved before claiming a finished cabin or passing the final accuracy review.

## What is wrong or missing

- Blank planar reference surfaces, not complete manufactured panels: instrument
  cutouts are filled, and individual joints and fine perimeter details are unresolved.
- Manufactured thickness, rear enclosure, supports, fasteners, side consoles,
  instruments, switches, labels, lighting and wiring are not built.
- The derivative's processing and registration limit measurement claims. No
  as-built CM-101 panel inspection or machining drawing has been read.
- Colour is a display material; no flight paint specification is claimed.
