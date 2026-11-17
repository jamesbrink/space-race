# DSKY front web — installed nominal reference

This is the **front web only**, not a complete machined front cover, housing or
equipped DSKY. Its closed nominal sheet is installed on the main-console reference.
The standalone [bare housing](dsky-housing.md) remains uninstalled: its applicability
to front assembly 2003949-041 has not been resolved.

## Hardware identity

Apollo 7's DSKY assembly **2003994-031** calls for front cover **2004739-001**,
find 29 in drawing 2003994 revision J, sheet 1
([NARA Box 459, leaf 993](https://archive.org/stream/apertureCardBox459NARASW_images/apertureCardBox459NARASW#page/n993/mode/1up)).
The [Apollo 7 finding aid](https://www.ibiblio.org/apollo/2003994-031.html) and
[Apollo 11 finding aid](https://www.ibiblio.org/apollo/2003994-121.html) independently
identify that same cover part. This supports using the CM-107 **metal cover plane**
as an explicitly assumed shared installation reference. It does not establish
identical displays or detail machining in other front-assembly components.

Apollo 7's I/L and E/L covers are **2003897-021** and **2003897-031**. Apollo 11
uses later **2003897-041** and **2003988-011/-021** assemblies. Those later cover
surfaces and legends are excluded. The shared keyboard assembly 2003909-031
does not make the processed survey's coarse key surfaces a sufficient manufactured
key model; no key geometry or texture is copied.

## Nominal geometry

Primary references are **2004739 revision A**, *Cover, Front, AGC DSKY*,
[leaf 1416](https://archive.org/stream/apertureCardBox459NARASW_images/apertureCardBox459NARASW#page/n1416/mode/1up),
and its stock part **2004929 revision D**,
[leaf 1477](https://archive.org/stream/apertureCardBox459NARASW_images/apertureCardBox459NARASW#page/n1477/mode/1up).
2004739 note 1 calls for 2004929-021 stock; the stock is not treated as the
complete finished cover. Dimensions are read from annotations, never sheet pixels.

| Feature | Source inches | Use |
|---|---:|---|
| Front envelope | 6.900 × 8.000 REF | Documented nominal reference envelope |
| Stock front web, Section B–B | .04–.06 | .050 derived tolerance midpoint for the nominal web only |
| Nineteen square keyboard clearances | .907–.913 | .910 derived tolerance midpoint |
| Central keyboard pitch | .970 | Derived from consecutive dimensioned clearance offsets |
| Stock overall depth | 1.567–1.572 | 1.5695 midpoint locates the CAD front datum; **not** installed depth |
| Unspecified radii, note 5 | .09 maximum | CAD nominal front radii are simplifications within a limit, not measured actual radii |

Only the transcription's single planar front face is retained. Its outer loop,
nineteen keyboard clearances, two display openings and central circular clearance
are extruded inward by the nominal .050-inch web. This is a reconstruction of a
**nominal front-web subset**. It does not establish all stock-to-finished machining,
the complete stepped section, mounting-counterbore pockets or rear geometry.
In particular, extruding a planar face is not presented as a complete -001 cover.

The transcription is **ManoDaSilva's CC0 secondary CAD**, not a NASA CAD file:
[2004739A-000.stp](https://github.com/virtualagc/virtualagc/blob/mechanical/3D-models/2004739A-000.stp),
Git blob `dc831229cbcd76a7d2450605b3c112a91b24927c`,
SHA-256 `42f825e464be251824f3ad33bf42bcddbfb6ebad68a1f7944ab829f190cbc812`.
Its [author's notes](https://github.com/virtualagc/virtualagc/blob/mechanical/3D-models/2004739A-000.md)
identify photographically guessed rear-rib locations. **No rear ribs are retained.**
The -021 transcription's additionally widened E/L window without a drawing is
also excluded. Envelope, nineteen clearance bounds and closed-solid validity are
checked; this is not a complete independent audit of every front-contour feature.
The CAD filename's -000 is not asserted to be the flight cover's configuration.

## Rigid installation reference

The Smithsonian CM-107 interior-panel derivative is the same metric source as
[the main console](main-console.md). Its URL, hash, CC0 licence and nominal Apollo
datum are retained in `apollo-dsky-front-web.json.gz`. It is a **processed
visualization derivative, not raw metrology**.

Exactly coincident source vertices are welded. Vertex-connected triangle
component **785** is visually identified as the main-console DSKY, independently
of its neighbours. In the recorded console basis, flat-front triangle regions
are identified using absolute normal dot >.98 and a seed centroid band of .015 cm
around depth −.005 cm. The connected region with greatest planar span identifies
the shared metal front, rather than either glass/display plane. Area-weighted
least squares fits its depth plane. A .04-cm maximum vertex band around that plane
selects 234 connected metal triangles. These are **segmentation settings**, not
hardware dimensions or claims about source accuracy.

The nominal front envelope is centred on that metal region's planar bounds.
The fitted plane supplies an orthonormal rigid basis. The measured and nominal
spans, basis, origin, plane coefficients and source face indices are recorded.
There is **no scaling, photographic fit or invented mounting offset**. Bounds
centring and the processed survey remain limitations of this reference pose;
it is not an as-built CM-101 installation or an attachment-point survey.

The blank console reference would otherwise pass through this web. Its display
mask is the convex footprint of the **complete nominal web volume**, projected
onto the console's existing plane. That footprint and the two separately measured
fixed FDAI interface contours are subtracted together, and the remaining
concave surface constrained-triangulated. Original outer contours and the centre
notch are retained. This derived interface is **not a claim about the real
console's manufactured aperture or installation clearance**. No standoff is added
to hide an overlap. The console source hash ties the web and mask together.

The model converts drawing inches through the rigid pose into survey centimetres,
then applies `cm_reference.survey_cm` and converts once to metres. The existing
CM base and launch-stack offset are each applied once by their owners. The web
is closed, remains whole in cutaway, and moves with the console and CM in the
exploded exhibit. It is omitted from lower exterior levels of detail.

## Rebuilding

If the console's fixed interfaces need rebuilding, first run the extractor and
format the console JSON as described in [main-console.md](main-console.md).
Its exact formatted bytes are hashed by this generator.

The script checks both source hashes and imports the original survey with
Blender 5.x, headless with factory startup. With the downloaded inputs:

```sh
uv run --with cadquery-ocp==8.0.1.1.0 --with numpy --with scipy --with shapely \
  missions/usa/apollo/vehicles/reference/rebuild_dsky_front.py \
  /path/to/2004739A-000.stp /path/to/x3d-cm-interior-panel-uvs-150k-4096-high.glb
pnpm model apollo-7
```

The B-rep is first tessellated to .0001-inch deflection and 10-degree angular
deflection. Its planar front boundary is simplified within .0019 inch, for a
combined .002-inch boundary approximation, and constrained-triangulated. Front
and rear caps and side walls share that one boundary. This removes nearly
collinear cap slivers that became numerically unstable at the launch stack’s
height; the clearance threshold is unchanged. The resulting closed two-manifold
and all 22 openings are checked. These are rendering approximations, not
manufacturing tolerances. Gzip timestamps are
fixed for reproducibility. Blender model builds need only the committed dataset.

## What is still wrong or omitted

The two flight-specific safety-glass panes now have separate nominal component
models ([dsky-panels.md](dsky-panels.md)). Their installation remains unresolved;
neither pane is placed on this front-web reference yet.

- Nominal front-web subset, without a complete independent contour audit or
  the complete -001 machining. Front radii are nominal bounded simplifications.
- No complete rear cover structure, ribs, mounting pockets, fasteners, housing,
  keys, switch mechanisms, displays, display covers, glazing, labels or electronics.
- Neutral reference shading, not measured flight coating or colourimetry.
- Reference pose and display mask are derived from another spacecraft's processed
  survey. Neither establishes as-built Apollo 7 geometry, tolerances or clearance.
- The two display openings remain empty; they are not opaque imitation displays.
  No guidance-computer simulation or operational controls are assigned.
