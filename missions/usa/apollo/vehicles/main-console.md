# Apollo 7 main display console — structural reference

The console is unfinished. This step establishes its broad structural silhouette
inside the cabin; it does not represent an equipped or operable flight console.

North American Aviation **V36-976018 revision D, 12 March 1968**, *Design Layout —
Main Display Console, Command Module 101*, sheet 1 of 2, identifies Apollo 7's
main-panel arrangement, central notch, two FDAI locations and equipment layout. The digitized foldout
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
moves a vertex or joins adjacent hardware. Vertex-connected triangle components
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

The two fixed FDAI interfaces described below and the
[DSKY front-web reference](dsky-front.md) mask this blank surface. The remaining concave polygons are constrained-
triangulated, preserving their outer boundaries and the notch. This is a derived
visualization interface, not a measured machined console aperture. The web and
mask are tied to this source JSON by a hash and rebuilt together.

## Fixed FDAI panel interfaces

The largest internal loop of each complete projected structural footprint,
components **240 and 712**, identifies the two round FDAI interfaces. The extraction
retains all **33 and 36** union-boundary vertices, respectively, without a circle
fit, scaling or an invented mounting offset. Their projected areas are
**181.700050557 and 198.431002995 cm²**. These describe the processed source
contours, not dimensioned machined apertures or CM-101 metrology.

V36-976018 identifies the two positions on CM-101 panels 1 and 2. NAA's
*Guidance and Control Systems—Block II, S/C 101*, 15 September 1967, SCS-2100D,
printed p. 76, independently identifies their round front arrangement. Only the
common fixed structural interfaces are retained as **assumed shared geometry**.
Neither reference establishes identical detail machining between spacecraft.
No CM-107 FDAI equipment mesh is imported; the openings remain empty. See
[the instrument source record](fdai.md) for the unresolved instrument geometry.

Both source contours and the separate DSKY visualization footprint are subtracted
before constrained triangulation. An independent earcut/intersection regression
checks that no output triangle covers either interface, that the outer contours
and notch survive, and that the removed area equals the three disjoint masks.
The Blender build also casts through both openings against the actual constructed
console triangles after registration. No panel thickness is invented.

To reproduce the fixed interfaces from the original, hash-checked survey:

```sh
uv run --with numpy --with scipy --with shapely \
  missions/usa/apollo/vehicles/reference/rebuild_console_apertures.py \
  /path/to/x3d-cm-interior-panel-uvs-150k-4096-high.glb
pnpm format
```

This script uses the existing recorded plane and outer contours; it does not
reconstruct or refit them. Next regenerate the DSKY dataset using the command in
[dsky-front.md](dsky-front.md), then run `pnpm model apollo-7`. Formatting the
console JSON first is necessary because the DSKY dataset records its exact byte hash.

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

- Planar reference surfaces, not complete manufactured panels: instrument
  cutouts are filled except for the two source FDAI interfaces and derived DSKY mask, and individual
  joints and fine perimeter details are unresolved.
- Manufactured thickness, rear enclosure, supports, fasteners, side consoles,
  instruments, switches, labels, lighting and wiring are not built. The separate
  DSKY front-web reference is a first interface subset, not an equipped instrument.
- The derivative's processing and registration limit measurement claims. No
  as-built CM-101 panel inspection or machining drawing has been read.
- Colour is a display material; no flight paint specification is claimed.
