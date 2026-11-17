# DSKY front housing — drawing-reference component

This is a **standalone component under development**, not installed or equipped
Apollo 7 hardware. The spacecraft's GLBs are unchanged by this component.
No mounting pose is inferred from a photograph or chosen to make it fit.

## Flight identification

Virtual AGC's engineering-drawing finding aids identify CSM-101 / Apollo 7's
guidance-and-navigation assembly as **2014999-041**, containing two
**2003994-031 DSKYs**. The corresponding DSKY assembly drawing is 2003994
revision J, sheet 1 ([NARA Box 459, leaf 993](https://archive.org/stream/apertureCardBox459NARASW_images/apertureCardBox459NARASW#page/n993/mode/1up)).
The [finding aid](https://www.ibiblio.org/apollo/2003994-031.html) calls for
front housing assembly **2003949-041**, but explicitly substitutes the older
**-031** assembly for its expanded parts list. That substitution is **not** proof
of an unchanged bare housing in -041. The available 2003949 revision G drawing
includes -011, -021 and -031, with bare housing **2004968-021** in the -031 column.
The applicability gap remains open; the component is therefore kept out of the
flight model pending primary evidence for -041.

The [Apollo 11 -121 finding aid](https://www.ibiblio.org/apollo/2003994-121.html)
also identifies front assembly **2003949-041** and front cover **2004739-001**.
Those matching part numbers support investigating the CM-107 survey for the
shared front-cover interface and pose. They do not resolve which bare housing
is inside -041, or establish an identical alarm cover, labels or electronics.

The CM G&N *Hardware Difference Summary*, sheet 3 of 7 (PDF page 5 in
[the archived extract](https://www.ibiblio.org/apollo/Documents/hardware_difference_ecps_1.pdf)),
distinguishes aluminum-cap/fire-protection, pushbutton-spring, safety-glass and
indicator-legend changes by DSKY dash number. It does not establish all bare-housing
dimensions or authorize copying Apollo 11's -121 equipment into Apollo 7's -031.
Indicator covers in the tabulated assembly have conditional notes; the model
does not treat both listed covers as simultaneously installed parts.

## Geometry and confidence

Primary authority: **2004968 revision E, sheet 1 of 1, Housing, Front, AGC DSKY**,
[NARA Box 459, leaf 1522](https://archive.org/stream/apertureCardBox459NARASW_images/apertureCardBox459NARASW#page/n1522/mode/1up).
The original dimension annotations, sections and notes are read directly; no
dimensions are measured from sheet pixels or printed scale.

| Feature | Drawing inches | Confidence / location |
|---|---:|---|
| Full flange width | 8.124 | Documented, front view |
| Overall height | 8.000 | Documented, front view |
| Nineteen switch-bores | diameter .565–.566 | Documented, front view; .5655 is the derived tolerance midpoint |
| Five central key columns | BASIC offsets 1.370, 2.340, 3.310, 4.280, 5.250 from right B-hole axis | Documented, front view; .970 pitch derived from consecutive offsets |
| Two outer key columns | BASIC offsets .400 and 6.220 | Documented, front view |
| Three central key rows | BASIC offsets .415, 1.385, 2.355 below keyboard reference line | Documented, front view |
| Two outer key rows | BASIC offsets .900 and 1.870 | Documented, front view |
| Mounting B-hole span | 7.700 | Documented, front view, note 9 |
| Rail/front plane separation | .898–.903 | Documented, top view; midpoint .9005 used |
| Raised lip beyond front plane | .120 | Documented, top view |
| Section A–A solid portion | .288–.292 | Documented; midpoint .290; **not** a uniform plate thickness |
| Default internal radii | .09 | Documented, note 3; not enlarged to look smoother |

The blank housing includes its real depth, display apertures, nineteen bores,
mounting flanges, recessed areas and stiffening ribs. It is a machined part, not
a thin two-sided panel. Neutral grey is an illustrative reference material, not
a claim about the exact flight coating or its measured reflectance.

## CAD provenance and reproducibility

The geometry is a tessellation of **ManoDaSilva's CC0 SolidWorks transcription**
of the drawing, distributed by [Virtual AGC](https://github.com/virtualagc/virtualagc/tree/mechanical/3D-models).
It is secondary CAD, **not a NASA manufacturing file or a spacecraft survey**.
The [component notes](https://github.com/virtualagc/virtualagc/blob/mechanical/3D-models/2004968E.md)
identify omitted incompatible fillets and a slightly asymmetric display pocket
retained from the drawing's 4.03-inch dimension. No additional dimensions are
invented to improve appearance.

Input: [2004968E.stp](https://github.com/virtualagc/virtualagc/blob/mechanical/3D-models/2004968E.stp).
Git blob: `b2052a787ff775928ff3ee5cd3c9ee01de9e838f`.
SHA-256: `848a59c7dd01ac29e1078f3a0df45277afb5a338ee87dd8badc72d7a029506d1`.
The file's hash is checked before any extraction. The reconstruction script
also checks a valid closed B-rep, the full envelope, and all nineteen exact
switch-bore radii, axes and locations against the primary drawing. These are
specific cross-checks, **not a complete independent audit of every CAD feature**.

With the downloaded STEP file:

```sh
uv run --with cadquery-ocp==8.0.1.1.0 \
  missions/usa/apollo/vehicles/reference/rebuild_dsky_housing.py /path/to/2004968E.stp
```

`apollo-dsky-housing.json.gz` retains source identifiers and three deterministic
mesh levels. CAD millimetres are returned to drawing inches, rotated rigidly
180 degrees about X (top +Z, front -Y), and rounded to 1e-9 inch for serialization.
The Blender module converts inches to metres once. No scaling or fitted pose is
applied. Tessellation settings (.002/.004/.008-inch deflection and 10/15/25-degree
angular deflection) describe rendering approximation, not source accuracy or
manufacturing tolerances. Each level is rebuilt from a fresh B-rep.

Standalone Blender command is in `dsky_housing.py`. Its export uses the same
clearance and merge-fingerprint checks as other models. The mesh is not marked
as a cutaway shell; when eventually equipped, it must remain whole inside the
opened spacecraft. Its present coordinate origin is a drawing reference, not
an attachment or explosion axis.

## What remains wrong or omitted

- CM-101 front-assembly -041 bare-housing applicability and installation pose
  are unresolved. This component is **not** in the flight inventory yet.
- All secondary CAD features still need a complete primary-drawing audit;
  incompatible internal fillets were omitted by the transcription's author.
- Threads are simplified to smooth bores; exact finishes, coatings and part
  identification are omitted.
- No keys, switch mechanisms, alarm indicators, electroluminescent panel,
  labels, glass, seals, electronics, main case or rear connector are built.
- Other available CAD includes photographically guessed cover ribs or a widened
  display window without a drawing. Those parts are deliberately excluded.
