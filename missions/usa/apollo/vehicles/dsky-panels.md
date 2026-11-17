# Apollo 7 DSKY safety-glass panes

These two components now have complete **nominal outer geometry**, including the
rounded corners, solid thickness and front bevel. They are not installed in the
spacecraft yet. No pose is selected to make them fit the front-web reference.

## Flight identity

DSKY drawing **2003994 revision J, sheet 1**, -031 parts column, calls for cover
assemblies **2003897-021** (I/L, find 30) and **2003897-031** (E/L, find 31).
**2003897 revision C**, sheet 1, calls for glass **2004743-001** in the former
(find 6), and **2004743-002** in the latter (find 8).
[Primary cover-assembly drawing](https://archive.org/stream/apertureCardBox459NARASW_images/apertureCardBox459NARASW#page/n185/mode/1up).
These are the flight-specific parts, without substituting the later -003 pane.

## Geometry

Primary authority: **2004743 revision A, 14 August 1968**, *Panel, Indicator, IL-EL, AGC DSKY*,
sheet 1 of 1, [NARA Box 459 leaf 1420](https://archive.org/stream/apertureCardBox459NARASW_images/apertureCardBox459NARASW#page/n1420/mode/1up).
The front view, height table, side view and end view are read as annotations,
never scaled from the sheet.

| Feature | Drawing inches | Use |
|---|---:|---|
| Width, end view | 2.540 | Documented nominal |
| -001 height, table dimension A | 3.135 | Documented nominal, I/L pane |
| -002 height, table dimension A | 4.358 | Documented nominal, E/L pane |
| Thickness, end view | .135 ± .010 | Documented nominal .135, not a measured flight thickness |
| Bevel axial run, side view | .085 | Documented nominal, from the front face to the bevel toe |
| Outer corner radius, front view | .185, four places | Documented nominal |
| Bevel, side view | 45° | Documented nominal |
| Nominal bevel inward run | .085 | Derived equal run at 45° |
| Remaining flat edge | .050 | Derived nominal thickness .135 − .085 |

The boundary stays at full size through the derived .050-inch flat edge, then contracts
inward by .085 inch to the bevelled front. The front's radius is derived as
.185 − .085 = .100 inch, with the same four arc centres. The side-view .085-inch
dimension terminates at the bevel toe, not the rear face; treating it as the
remaining flat would produce the wrong chamfer. The solid is closed and
outward-oriented. Its origin is a part reference: rear face Z0, bevelled front
Z.135, long direction +Y, width +X. It is not an Apollo installation datum.

The drawing's note 1 specifies **laminated glass, MIL-G-8602A, Class II, Grade 2N**.
The note-applicability table assigns only notes 1–3 to -001 and -002. Notes 4–5,
requiring anti-reflection coating on the main faces and its exclusion at the
border, apply to **-003**. Those later coating requirements are not copied.
Opaque neutral shading in the component preview exposes the bevel for inspection;
it does not represent flight transmission, glass colour or optical constants.

## Rebuilding and verification

```sh
python3 missions/usa/apollo/vehicles/reference/rebuild_dsky_panels.py
blender -b --factory-startup -P missions/usa/apollo/vehicles/dsky_panels.py -- \
  --out /tmp/dsky-panels.glb --preview /tmp/dsky-panels
```

The generator has no external dependencies. It retains drawing inches and the
primary part identities in deterministic gzip data. Three levels use 24, 12 and
8 segments per quarter-circle; recorded arc sagitta describes tessellation error,
not manufacturing tolerance or source accuracy. Every level is built from the
nominal profiles. The Blender module converts inches to metres once and uses the
normal clearance check. The preview's gap between the two parts is display spacing.

The regression checks all three levels independently for the nominal envelopes,
corner-circle loci, front inset and equal 45° bevel runs. It checks closed oriented
edge incidence, nondegenerate triangles and solid volume against the analytic
integral of the rounded rectangle's inward-offset area, within tessellation error.

## Frame and installation gate

Drawing **2004699 revision A** provides the short-window **-000** frame, including
its section and six mounting holes. The available secondary -001 CAD explicitly
says its larger window was based on a reported physical-frame measurement rather
than an available drawing. Neither that report's measuring datum nor the specimen's
configuration is established here. Both transcriptions also identify an invented
internal chamfer distance. These CAD files are not adopted as verified frame geometry.

The [2019 measurement report](https://github.com/virtualagc/virtualagc/pull/1092#issuecomment-524392186)
does give the taller frame's reported edge widths: .182-inch sides, .161-inch top
and .188-inch bottom. This is useful provenance for the CAD, but the report does
not identify the specimen's flight configuration, measuring datum or uncertainty.
It also rules out silently replacing the measured asymmetry with a symmetric
extension of the short frame. These figures are recorded as an unverified lead,
not adopted dimensions.

The actual mating faces, cover section and installed axial coordinates still need
to be established before either pane is installed. A nominal pane is not placed
by centring it in an opening or choosing a standoff. The existing ship's front-web
and console geometry are unchanged by these standalone components.

## What is missing

- Verified installed transforms, supporting frames, attachment details and seals.
- Laminate ply/interlayer thicknesses, which are not dimensioned on this drawing.
- Optical transmission, refractive index, tint, surface finish and physical coatings.
- As-built dimensional/tolerance reconstruction; these are nominal parts.
- Display hardware, legends, electrical light output and computer signals behind the panes.
