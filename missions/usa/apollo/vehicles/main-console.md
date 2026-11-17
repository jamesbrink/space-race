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

Registration uses the common aft-sphere fit and 90° rotation, without scaling to
fit the cabin. The fitted **outer apex** is placed at **Xc −1.30 in**, as explicitly
dimensioned in NASA TN D-3888, Figure 2, printed p. 27. It is not Xc zero: NAA's
1966 structures training, p. 1-13, defines zero at the heat-shield outer facesheet,
excluding ablator. `cm_reference.py` holds the nominal station and applies it to
all common survey geometry. This is an **assumed common geometric datum**, not
an independently measured CM-101 station or the remaining thickness of CM-107's
post-entry ablator. The source coordinates are converted once to metres.

The surfaces are double-sided and are not cutaway shells. They stay in place as
the surrounding pressure wall opens, and move with the CM in the exploded exhibit.
They are omitted from distant levels of detail like other cabin internals.

## Nominal-wall interface check

The former conversion incorrectly put the fitted outer apex at Xc zero. That
produced seven reference vertices outside the nominal pressure wall, by up to
19.55 mm radially. Applying the published −1.30-inch apex station to **all** survey
references corrects that datum error without independently shifting, scaling or
trimming the console.

Every projected outline vertex now lies inside the nominal upper-wall cone;
the minimum radial margin in the uncompressed geometry is **1.505 mm**, derived
from the two references. Because that cone is convex, the planar triangles whose
vertices it contains also remain inside it. Each full-detail build checks the
vertices and rejects an intersection. This is a compatibility check on the
reconstruction, **not an as-built CM-101 clearance or survey-accuracy claim**.
Absolute registration, the processed derivative and exact installed geometry
remain limitations; source uncertainty must not be confused with this small margin.

## What is wrong or missing

- Blank planar reference surfaces, not complete manufactured panels: instrument
  cutouts are filled, and individual joints and fine perimeter details are unresolved.
- Manufactured thickness, rear enclosure, supports, fasteners, side consoles,
  instruments, switches, labels, lighting and wiring are not built.
- The derivative's processing and registration limit measurement claims. No
  as-built CM-101 panel inspection or machining drawing has been read.
- Colour is a display material; no flight paint specification is claimed.
