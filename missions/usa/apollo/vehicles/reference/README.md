# Shared Block II structural references

`apollo-cm-apertures.json` records four **CM-107**, not CM-101, aperture outlines.
They are used as **assumed shared hardware**, with the user's explicit approval for
verified shared Block II structure. Apollo 7's press kit Figure 25d and the 1967
*Apollo Spacecraft and Systems Familiarization* exterior drawing identify the same
two side observation and two triangular rendezvous windows. This does not verify
Apollo 11's equipment, paint, heat damage, recovery configuration or individual
couch settings for Apollo 7; none of those is imported.

Source: Smithsonian Institution, National Air and Space Museum, CM-107 exterior
survey, shell derivative `x3d-cm-exterior-shell-90k-uvs-150k-4096-high.glb`.
The exact public asset URL and SHA-256 are in the JSON. The Smithsonian's
[scene rights metadata](https://ids.si.edu/ids/media_view?id=3d_package%3Ad8c6457e-4ebc-11ea-b77f-2e728ce88125&format=text)
releases the content under CC0. No photographic textures are used.

The survey's physical centimetres are retained. Blender's glTF import changes the
coordinate basis to Z-up. The module turns that basis 90 degrees about Z so the
side hatch faces +X, subtracts the registered aft apex, applies its published
nominal **Xc −1.30-inch** station through `cm_reference.py`, and converts centimetres
to metres once. The fitted outer surface is not the structural Xc-zero datum. Registration uses the median centre of the aft spherical surface,
with the published 184.8-inch nominal radius; it is **not** an independently
surveyed Apollo station datum. The measured outlines are projected onto their
best-fit planes, then their convex hulls are retained. Maximum plane residuals
are recorded: about 1.4 mm for a side opening and 0.12 mm for a rendezvous opening.
These residuals do not establish the absolute accuracy of the source survey.

The large side hatch boundary was rejected from the **planar** window extraction:
it is curved, with a plane residual of nearly 40 mm. It must not be used as a
flattened door or as a fifth measured window. It is now retained as the curved
thermal-shell interface, ordered in azimuth/station and projected radially onto
the nominal CM wall. The separate hatch-window reference is described below.
The circular inner pressure window (NAA A-512S ST-503A, p. 41), glazing layers,
seals and mechanism remain pending.

`command_module.py` projects each outline along its measured plane normal onto
the nominal conical wall, builds a constrained opening and joins the two boundaries
with a reveal. The reveal is a reconstruction between two references, not a survey
of the ablator's recessed wall. Apertures retain dark temporary closures until the
cabin and glazing are built. There is no claim here that an accurate cabin exists.

## Inner frame interfaces

`apollo-cm-inner-apertures.json` retains four fixed window openings, the curved
outer hatch-frame interface and the tunnel-entry interface from the **CM-107 interior hull** derivative. It uses
Smithsonian package `d8c63e8a-4ebc-11ea-b77f-2e728ce88125`, which differs from the
exterior package. The exact public asset URL and SHA-256 are in the JSON; the
[interior scene rights](https://ids.si.edu/ids/media_view?id=3d_package%3Ad8c63e8a-4ebc-11ea-b77f-2e728ce88125&format=text)
release the content under CC0. No source mesh or texture is shipped.

The same fixed Block II window and hatch-frame arrangement is identified in
Apollo 7 press-kit Figure 25d and NAA's 1967 familiarization drawing. Only those
structural interfaces are applied as **assumed shared hardware**. Equipment bays,
couches, removable panels and mission-specific fittings in the interior survey
are excluded from this use.

The derivative was imported in physical centimetres, vertices welded within
0.1 cm to join its duplicated seams, and connected boundary components recorded.
The window loops are components 7, 54, 17 and 31 in that extraction. Their
best-fit-plane convex hulls have maximum residuals 0.092 and 0.139 mm (side),
0.658 mm (rendezvous). Those residuals describe plane fitting, not absolute survey
accuracy or measured glazing positions. The data does **not** establish which
pane surface or stepped frame face each boundary represents.

The hatch interface is component 79. Its convex hull is ordered in azimuth and
axial station, while every selected point keeps its original three-dimensional
coordinates. It is not flattened or identified as the clear crew opening. Its
wall cut is a radial mapping onto the published nominal pressure-vessel profile;
no full hatch frame or door is inferred from that projection.

Registration uses the exterior survey's nominal-sphere apex, placed at the
nominal **Xc −1.30-inch** station in NASA TN D-3888, Figure 2, p. 27. It remains
an assumption about the common coordinate frame, not an independent Apollo station
survey. No scaling is applied to make the two sources fit. See
[the pressure-vessel reconstruction](../pressure-vessel.md) for how the outlines
are used and what remains unbuilt.

The tunnel entry is boundary component 19: 37 points retained in their original
three-dimensional survey coordinates. Its irregular boundary spans about 5 mm
axially. It is used only as a shared structural interface, not a measured pane,
clear opening, or full tunnel profile. The model orders its XY convex hull, then
projects that outline to the nominal Xc 80.75-inch forward bulkhead. The reveal
between the two references is derived and does not establish the intervening
honeycomb shape or thickness. The separately extracted exact planar circle
(component 89) is excluded, rather than treating its regular tessellation as a
second independent measurement. No full tunnel, hatch equipment or later docking
hardware is imported.

## Side-hatch outer window

`apollo-side-hatch.json` retains a sectioned window outline from Smithsonian's
**measured crew-hatch scan**, package `e7514eea-3f12-490d-a2d0-999f2a1a70f7`.
The original three-dimensional scan coordinates are retained in physical metres;
the exact derivative URL, SHA-256 and transforms are in the JSON. Its
[rights metadata](https://ids.si.edu/ids/media_view?id=3d_package%3Ae7514eea-3f12-490d-a2d0-999f2a1a70f7&format=text)
releases it under CC0. This is not the modern Project Egress replica package
`936d1822-b237-4431-bb3f-a1f9d39a2e90`.

The unified hatch is shared Block II hardware (NASA TN D-7780, printed p. 12).
That report explicitly dates lightweight inner-slab machining to SC106 onward.
Only the **external** cover aperture is applied as assumed shared hardware here;
the later inner pockets, recovery condition and equipment are not copied.

The detached survey is registered rigidly, **without scaling**, to the complete
Project Egress reconstruction, using 85-percent-trimmed nearest-point ICP. That
reconstruction's pressure-door perimeter was separately registered rigidly to the
CM exterior survey's curved hatch opening. The replica provides a pose bridge
and outline cross-check, not the window's dimensions. Median nearest-point scan
residual is 6.86 mm; median perimeter residual is 4.95 mm, maximum 8.08 mm.
These compare different interfaces and a simplified replica: they do not establish
manufacturing tolerance, absolute survey accuracy or an exact installed pose.
The two individual transformations and their composition are retained for audit.
They end in the original fitted-apex-centred frame; `side_hatch.py` applies
`cm_reference.AFT_APEX_XC` once to reach the same nominal Apollo frame as the
thermal opening. The JSON explicitly records this stored-frame convention.

Extraction in the replica frame selects front-facing mesh triangles around the
window (|X| < 0.21 m, |Z| < 0.20 m, Y > 0.04 m, normal Y > 0.97). Area-weighted
plane RANSAC uses a 0.5 mm inlier band and fixed random seed 0, then least-squares
fits the inliers. Its maximum residual is 0.623271 mm. A parallel section is taken
that residual inward, so scan noise on the mounting face does not open the loop
to the outside. Triangle/plane intersections are joined with 1-micrometre seam
quantisation; the loop enclosing the window centre is reduced to its convex hull.
The resulting outline differs from the replica's by a 7.47 mm Hausdorff distance.
The JSON converts its 68 retained boundary points back to the original survey
frame. This is an aperture-reference reconstruction, **not a glass surface survey**.

`side_hatch.py` maps that outline along the fitted mounting-face normal onto the
nominal cone. The resulting reveal joins the measured reference and nominal skin;
it is not a survey of the ablator's recessed wall. The cover is a separate shell
surface, clipped with other skins in cutaway and kept with the CM during explosion.
Its dark window closure is temporary. Full pressure door, glazing, hinges,
gearbox, latches, valves, handles, seals and flight-specific labels are not built.

Walkover, Hart and Zosky, *The Apollo Command Module Side Access Hatch System*,
JPL TM 33-425, printed p. 164, Figure 6 and section V.D, documents a pair of
collapsible linkage hinges. The door first translates outboard, then rotates
with a changing hinge point. A simple rotation about one fixed edge would not
reconstruct that mechanism and could pull the door through its frame. Printed
p. 167 explicitly connects the qualified unified hatch to Apollo 7 and 8.
The section drawing establishes the mechanism's arrangement, not dimensioned
link lengths or pivot coordinates; no hatch-opening animation is inferred yet.

## Main-console structural silhouette

`apollo-main-console.json` records only the common main-console contour from the
CM-107 **panel** derivative in the same interior package. Exact URL, SHA-256,
physical centimetres and extraction settings are retained in the JSON. The
interior package's CC0 rights apply. It is a processed visualization derivative,
not raw metrology; no absolute source accuracy is claimed.

NAA V36-976018 revision D, 12 March 1968, *Design Layout — Main Display Console,
Command Module 101*, identifies the same broad contour and central notch. NASA
TN D-7919, p. 21, identifies the Block II three-machined-panel design. This supports
using the common silhouette as **assumed shared structure**, not transferring
CM-107's detail machining or equipment. No spacecraft dimensions are measured from
the scanned drawing sheet.

The complete projected footprints of four identified connected structural
components retain the central concave notch. No plane-distance filter clips their
outer contours. Internal instrument apertures are filled as blank structural
reference surfaces, and the outer contours are united. The resulting polygons do
not establish individual panel joints or change the documented three-panel design.
No manufactured thickness, controls, labels, side wings, photographic textures or
couches are copied. The same nominal aft-sphere registration, including the published −1.30-inch
outer-apex station, is applied without scaling. Full method and limits are in [main-console.md](../main-console.md).
