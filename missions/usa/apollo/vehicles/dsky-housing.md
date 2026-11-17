# DSKY front housing: found, not installed

What is known of the bare front housing of Apollo 7's DSKYs, and of a CAD transcription of its drawing. **It is not
in the model and its data are not kept in the repo**: which housing the flight's -041 front assembly held is
unresolved (below), and nothing is installed on a guess. This file keeps the identification, the drawing's figures,
and the CAD's source and hash, so the housing can be regenerated when that is settled. The DSKY that is in the model
is [dsky-front.md](dsky-front.md)'s front web with its estimated enclosure and [nominal panes](dsky-panels.md).

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
Reading the primary 2003994J parts table resolves the finding aid's ambiguous
cover titles: find 30, **2003897-021**, is the **I/L cover assembly**, and find 31,
**2003897-031**, is the **E/L cover assembly**. Both have quantity one in the
DSKY -031 column: they protect different displays, rather than being alternative
alarm covers. Notes 16 and 17 give their separate assembly instructions. Note 13
permits alarm indicator 1006387-002 or -003. The finding aid labels both covers
as indicator-alarm covers; that title is not used to override the drawing.

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

The CAD found is **ManoDaSilva's CC0 SolidWorks transcription**
of the drawing, distributed by [Virtual AGC](https://github.com/virtualagc/virtualagc/tree/mechanical/3D-models).
It is secondary CAD, **not a NASA manufacturing file or a spacecraft survey**.
The [component notes](https://github.com/virtualagc/virtualagc/blob/mechanical/3D-models/2004968E.md)
identify omitted incompatible fillets and a slightly asymmetric display pocket
retained from the drawing's 4.03-inch dimension. No additional dimensions are
invented to improve appearance.

Input: [2004968E.stp](https://github.com/virtualagc/virtualagc/blob/mechanical/3D-models/2004968E.stp).
Git blob: `b2052a787ff775928ff3ee5cd3c9ee01de9e838f`.
SHA-256: `848a59c7dd01ac29e1078f3a0df45277afb5a338ee87dd8badc72d7a029506d1`.
Read in November 2026, it was a valid closed B-rep whose full envelope and all
nineteen switch-bore radii, axes and locations agree exactly with the primary
drawing. Those are specific cross-checks, **not a complete independent audit of
every CAD feature**.

**To regenerate it**, outside the Nix devshell (`OCP`, OpenCascade's Python binding, is not in it): with the
STEP above, check its SHA-256, read it with `OCP.STEPControl_Reader`, require one valid solid with one closed shell,
check the envelope (8.124 by 8.000 in, rail-to-front .9005 + .120 in) and the nineteen bores (radius .5655/2 in, axes
normal to the front, at the BASIC offsets in the table) against the drawing, and tessellate with
`BRepMesh_IncrementalMesh`. The same reading and tessellation are in `reference/rebuild_dsky_front.py`
(`read_shape`, `tessellate`), run as its docstring says (`uv run --with cadquery-ocp==8.0.1.1.0 ...`). Keep the
drawing's inches, turn the part rigidly 180 degrees about X (top +Z, front -Y), and convert to metres once in the
Blender module, as `dsky_front.py` does for the front web. Nothing is scaled or fitted. Installed, it must be marked as
staying whole inside the opened spacecraft, as the rest of the DSKY is.

## What remains wrong or omitted

- CM-101 front-assembly -041 bare-housing applicability and installation pose
  are unresolved, so the housing is not in the model.
- All secondary CAD features still need a complete primary-drawing audit;
  incompatible internal fillets were omitted by the transcription's author.
- Threads are simplified to smooth bores; exact finishes, coatings and part
  identification are omitted.
- Other available CAD includes photographically guessed cover ribs or a widened
  display window without a drawing. Those parts are deliberately excluded.
- The 2004739A-000 cover transcription has not been validated as the flight's
  2004739-001 cover. Slicing its front sheet does not establish the complete
  stepped profile or the -001 machining. It is not substituted into the cabin.
