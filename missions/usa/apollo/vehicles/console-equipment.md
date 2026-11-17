# Apollo 7 main-panel equipment reconstruction

`console_equipment.py` adds equipment to the existing shared structural console.
The arrangement comes from **CM-101's own** NAA V36-976018 revision D, 12 March
1968, sheet 1 of 2. It imports no CM-107 equipment, controls, artwork or texture.
**Every new size, position, enclosure section and colour is estimated for CM-101.**
The existing structural coordinates and fixed FDAI interfaces remain unchanged.

## Layout registration

Primary foldout: [V36-976018](https://www.ibiblio.org/apollo/Documents/V36-976018_Design_Layout_MDC_CM-101.pdf),
SHA-256 `449e2920813c8831f0740dbfaf776c6a61cced6211b9c035afd6e99da2014401`.
`reference/apollo-console-layout.json` records the PDF-point crop
`[2225, 10, 4095, 796]`, rendered at one pixel per PDF point (1870 × 786).
Neither the sheet size nor its printed scale is treated as a manufacturing ruler.

The two pictured FDAI centres, `(372,451)` and `(648,274)` pixels, map to the
existing structural-interface probes in `apollo-main-console.json`. Local U is
original survey +X projected onto its plane; local V points upward on the drawing,
and the face normal points toward the crew. A two-point similarity (uniform scale
and in-plane rotation, no independent stretch) maps the image to that physical
plane: **0.11490663 cm/pixel**, rotated **−0.5331°** in the image's right/up basis.
These are an estimated drawing registration, not CM-101 metrology.

The independently installed DSKY front centre, at image `(644,451)`, is a holdout:
its residual is **1.0049 cm**. That does not bound errors elsewhere or establish a
machining tolerance. Individual outlines/projections can differ by 10–15 percent.
All 233 round-meter, tape and control centres in the transcribed layout lie inside
the unchanged shared console outline; nothing is moved just to fit a hole.

## Equipment represented

- Twelve round meter fronts and eighteen linear-meter fronts.
- 196 generic toggle representations and seven rotary controls, grouped from the
  CM-101 drawing. Individual types are not all identified; these are visual
  representations, not a claim that every switch was the same mechanism.
- Forty-eight unlit warning-lens positions, including the drawing's blanks.
  Their captions are transcribed from the two four-column, six-row blocks.
- Master-alarm and abort button faces; a partial entry-monitor facade with graph
  window, counter window and controls; the main mission-timer window.
- Two separate FDAI reconstructions, described in [fdai.md](fdai.md).

The basic display-construction estimates, in source inches, are: round case back
.35; dial face .15 in front of the panel; bezel front .50; crystal .42–.44;
switch base .74 × .78, back −.10/front .14; hex nut radius .21; toggle-stem radius
.055, top .72; paddle .25 × .12, top .80; rotary-knob radius .25, top .65.
The EMS facade's roughly 8.87 × 7.01-inch envelope comes from its 196 × 155-pixel
outline; the short one-inch rear enclosure is schematic. The timer window's
95 × 23-pixel outline gives approximately 4.30 × 1.04 inches. These are not
published mechanical dimensions or certified installation depths.

Construction is in inches after the image-to-survey registration, with one
conversion to metres on mesh emission. Printed legends use the repo's font.
Their .06-inch separation is a rendering offset, not paint thickness. Flat
lettering is not subdivided for curvature; sub-.05-mm print slivers are cleaned
locally before translation to the 57-m-high stack to avoid floating-point
non-planarity. The normal clearance and static-merge fingerprint gates still apply.

## State, integration and verification

All warning lenses and the timer are unlit. Meter needles, switches and FDAI
indices are static **exhibit reference poses**, not launch switch settings,
recorded readings, historical attitudes or telemetry. No calibration range is
invented for the unnumbered schematic meter scales. These figures never supply
simulation inputs. The complete control logic and instrument signals are absent.

The gallery retains the entire vehicle in cutaway. The console is not isolated
from its surrounding hardware; the couches remain real obstructions.

`ConsoleEquipment` and `FlightDirectorIndicators` are interior parts, whole in
cutaway and translated with the command module at every exploded-view position.
Both coarse LODs retain the part nodes without internal equipment. Actual transformed
vertices, including the ball nodes, are checked against the nominal pressure wall
and spherical floor. Actual FDAI edges are checked against the main-console mesh;
only the existing fixed interfaces admit their rear barrels. Other front cases
intersect the blank structural reference deliberately: detail panel apertures are
not yet reconstructed, and are concealed by the estimated front enclosures.

## Simplifications and omissions

- This remains an equipment **study**, not an as-built or operable console.
- Individual switch legends, some control identities, guards, complete fasteners,
  fine knobs, secondary controls and full panel borders are unfinished.
- Main-panel joint outlines still come from the shared structural derivative;
  individual machined panel construction and supports are unresolved.
- Meter scales are schematic and unnumbered; needles are not simulated. Fine
  calibrated faces and full hardware internals still need reconstruction.
- EMS scroll markings, trace, electronics, full control details and counter drums
  are incomplete; the grid alone is not a functioning entry-monitor display.
- The eight-digit mission-timer window is unlit; segment/drum and circuit details
  are omitted. No numeric flight state is shown.
- Complete DSKY equipment, side consoles, lower-equipment bay and other cabin
  furnishings remain separate unfinished work.
