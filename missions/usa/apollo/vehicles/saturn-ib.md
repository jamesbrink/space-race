# Saturn IB SA-205 — exterior study

This build is **SA-205 on Apollo 7**, not an early Saturn I or a later Skylab launcher.
Source: NASA *Apollo 7 press kit*, 68-168K, pp. 31–33 and Figure 25a (printed p. 25a),
and NASA photograph S68-48788, the Apollo 7 launch, viewed at NASA’s Apollo 50th photo gallery.

The script `saturn_ib.py` keeps inches; published feet are multiplied by 12 before geometry
is converted once with `IN`. `flight.ts` quotes the same dimensions with confidence.

| Figure | Source units | Confidence / source |
|---|---:|---|
| Full Apollo 7 stack, engine exit to Q-ball | 224 ft | documented, Figure 25a, rounded |
| S-IB stage length | 80.2 ft | documented, p. 32, rounded |
| Outer tanks | 8 × 70 in diameter | documented, p. 32 |
| Centre oxygen tank | 105 in diameter | documented, p. 32 |
| Tank cluster pitch radius | 93 in | estimated, not a documented tank station |
| S-IVB stage envelope | 58.4 ft | documented, p. 32, rounded |
| S-IVB separation plane, vehicle station | 1187 in | documented, AS-205 flight evaluation Figure A-1, p. 206; rounded |
| Interstage span in this reconstruction | 224.6 in | derived: rounded STA1187 minus rounded S-IB top962.4; not an as-built measurement |
| H-1 nozzle exit inside diameter | 46 in | documented nominal, 1968 Saturn IB News Reference, H-1 fact sheet (PDF p. 45) |
| J-2 nozzle exit inside diameter | 77 in | documented nominal, same reference, J-2 fact sheet (PDF p. 69) |
| H-1 gimbal plane | vehicle STA100 in | documented nominal, MSFC *Saturn IB Mission Plan and Technical Information Checklist*, revision 18 (1 August 1968), Figure 1, p. 6-3 |
| Inboard H-1 mounting radius / outward cant | 32 in / 3° | documented nominal, same checklist, p. 4-8 |
| Outboard H-1 mounting radius / outward cant | 95 in / 6° | documented nominal, same checklist, p. 4-8 |
| IU height / diameter | 36 / 260 in | documented, p. 33 |
| Spacecraft adapter length | 28 ft | documented, p. 26 |
| Adapter aft / forward diameter | 260 / 154 in | documented, p. 26 |

The source describes the S-IB stage as 21.5 ft across while the instrument unit is 260 in;
the first stage’s tank cluster here is 256 in across (2 × (93 + 35)), with its forward ring
at the 260-inch interface. This approximate clustering is **estimated**, not a reconciliation
of the rounded source dimensions. The fins reach beyond the body.

S-IB top is Z962.4 in, S-IVB top Z1663.2, IU top Z1699.2 and adapter top Z2035.2.
These are arithmetic sums of rounded envelopes, not independently documented interface stations.
The S-IVB upper separation plane is now Z1187 in from the mission-specific reference below;
the lower end of the interstage remains at Z962.4 in. Its resulting 224.6-inch span
combines rounded references and must not be read as a tenth-inch inspection measurement.
The SM barrel stands at the adapter’s top; its engine projects inside it. The command-module
base is Z2197.2 in and its nominal forward heat-shield top Z2309.45. The escape motor ends at Z2688 (224 ft).
Its remaining height is allocated within that envelope by estimate. **Closing the overall
length does not validate the individual hardware stations.**

The studio’s exploded view is an illustration. Nothing here claims the timing or trajectories
of the hardware’s departure. No simulator or launch site is provided.

## Whole-vehicle cutaway

The gallery uses the same quadrant cut as the Redstone and Titan models, through
the entire assembled stack. S-IB tank skins, skirts and fins, both interstage
paint regions, S-IVB skins and stiffeners, the IU skin and adapter shell and
seams all carry the standard `shell` flag. Lettering is cut with the skin that
carries it. Engines and separate APS equipment remain whole, as do the command
module's couches, console and other internal equipment. The escape motor casing
opens with the existing boost cover and spacecraft shells; its truss and nozzles
remain whole. A close-up view frames hardware without removing the rest of the
vehicle.

The viewer draws both faces of the open launcher skins, with **no modelled
wall thickness or invented internal equipment**. The cut exposes their current
empty interior where detailed tanks, bulkheads or structure are still missing;
it does not imply those spaces were empty on SA-205. The single global cut
passes through the clustered first-stage tank skins, including the centre tank.

## Simplifications and things still wrong

- Fin profiles, nozzle contours, tank domes, tank pitch radii and structural stations other than
  the cited separation and H-1 gimbal planes are estimated. The H-1 mounting radii and cants
  are documented nominal references; that does not validate the engine contours or axial extents.
- No tank interior, common bulkhead, detailed feed pipes, turbopumps, H-1 exhaust ducts,
  ullage rockets, vents, detailed APS engines, hold-downs or separation mechanisms.
- Stiffener count and size are estimated. Paint boundaries and lettering locations are estimated
  from S68-48788; the fin paint and small markings still need closer photographic reconstruction.
- IU has no internal electronics, antennas or access fittings.
- Adapter is one shell, opened by the gallery cutaway; no hinged forward panels, internal structure or rendezvous target yet.
- No LC-34 pedestal, umbilical tower, service structure or site scenery.
- No mass, thrust, aerodynamic or flight sequence data; the stack cannot be flown yet.

## Corrections after the first preview

The initial four S-IVB conduits were unsourced and lay directly over the USA lettering.
They have been removed, not moved to another guessed azimuth. The actual main and auxiliary
tunnels await their documented layout. The exploded exhibit now separates along the vehicle
axis, with higher parts moving first and farther, so the cover and adjacent modules clear
one another rather than crossing skins on diagonal paths. These offsets are an exhibit
layout, not historical dimensions or separation trajectories.


## Mission-specific fuel-tank paint

SA-205 retains black fuel tanks alternating with white oxygen tanks. The
*Skylab Saturn IB Flight Manual*, MSFC-MAN-206 (30 September 1972), printed
p. 4-4 (PDF p. 60), explicitly says the fuel tanks changed from black to white
on **SA-206 and subsequent** vehicles for thermal reasons. The same page identifies
the alternating outer fuel/oxygen tank arrangement. NASA S68-48788 independently
shows Apollo 7's alternating dark and light tank barrels. The model previously
used the later all-white tank treatment; that is corrected at all detail levels.

This verifies the tank colour assignment, not colourimetry, an exact paint-edge
survey, tank end stations, or absolute clocking relative to the spacecraft.
Those geometric and marking limitations above remain. No Skylab engine thrust
rating or late-vehicle configuration is silently applied to SA-205.

## Period H-1 mounting correction

The MSFC *Saturn IB Mission Plan and Technical Information Checklist*, revision 18,
**1 August 1968**, p. 4-8 (PDF p. 33), specifies four inboard engines on a **32-inch
radius**, canted **3° outward**, and four outboard engines on a **95-inch radius**,
canted **6° outward**. Figure 1, printed p. 6-3 (PDF p. 167), labels the engine gimbal
plane **vehicle STA100**. These radii belong at the **gimbals**, not at the nozzle exits.
The upward engine axes point inward; exhaust points outward. Figure 25, p. 6-28
(PDF p. 192), places the inboards on vehicle positions I–IV / odd fin lines, and
the outboards on even fin lines, with 45° between adjacent fin lines. The model
now follows that relative arrangement. Its absolute clocking relative to the CSM
and pad remains unverified. No later Skylab engine rating is used.

Each engine has its own gimbal frame, and both the existing bell and chamber
inherit that frame. This replaces the initial vertical engines placed at guessed
43/91-inch radii. The previous contour is retained **as a provisional study**:
its local axial coordinates are rebased by subtracting 100 inches from the old
Z0..108 coordinates. The resulting exit-to-gimbal distance is **not** a new
documented measurement. Do not use these engine shapes for physics or infer a
nozzle length from the published overall engine length. No unknown mounting
hardware is filled in. The production GLBs at all three levels are checked for
the gimbal positions, inherited bell axes, cant directions and relative clocking.

The inherited bell contour's tilted lower rim now extends below the vehicle
station-zero plane. The published rounded 224-foot stack height is a reference,
not proof that this unfinished contour reproduces the actual engine envelope.

## Fin reconstruction source gate

NASA TP-3615, *Review of Our National Heritage of Launch Vehicles Using Aerodynamic
Surfaces and Current Use of These by Other Nations* (C. Barret, April 1996), Figure 39,
printed p. 45, reproduces MSFC *Saturn IB Air Load Manual* sheet 1.9201, revision 0,
**3 February 1964**. It dimensions a 110-inch fin span, 100/40-inch root/tip chords,
root leading/trailing stations 211.369/111.369, tip leading/trailing stations
approximately 101.37/61.369, and maximum root/tip thicknesses 17.496/6.446 inches. The
tip leading-station label appears to read 101.367, whereas the annotated 40-inch chord
and STA61.369 give 101.369; neither interpretation is adopted here. Its main
trapezoid area is independently 53.472222 square feet, agreeing with the annotated
53.472; the shaded root foot is excluded. The sketch shows a blunt trailing edge
without dimensioning its residual thickness. Its Section C / Table 1, p. 44,
uses rounded redesign characteristics that do not supersede those dimensions.

**Not yet adopted as SA-205 fin geometry.** The actual radial mounting datum and
complete airfoil/heat-shield section still need verification. The period checklist's
Figure 5, p. 6-7 (PDF p. 171), explicitly covers SA-203 and subsequent, but its
STA100 leader identifies the **engine gimbal**, not an independent measurement of
the fin tip. The STA58 hold-down facility datum and STA54 reference likewise must
not be relabelled as fin vertices by their appearance in that schematic. No numerical
fin-source conflict is established by those leaders. Do not scale either drawing,
silently combine unrelated station labels, or invent the trailing-edge thickness.
The current fin **profile remains provisional**, although its relative clocking was
corrected above.

## Mission separation plane and engine exits

The MSFC *Results of the Fifth Saturn IB Launch Vehicle Test Flight AS-205
(Apollo 7 Mission)*, MPR-SAT-FE-68-4, 25 January 1969, Figure A-1, printed
p. 206 (PDF p. 226), explicitly locates the S-IVB separation plane at **vehicle
station 1187 inches**. The drawing prints whole-inch stations. This replaces
the initial unsourced 220-inch interstage partition; it is a station from the
vehicle datum, not 1187 inches above the first stage. The *Saturn IB News
Reference*, changed September 1968, p. 5-1, confirms that the aft interstage
remained attached to the first stage after separation. The gallery's slider
shows individual parts as an exhibit, not a flight sequence.

The same period News Reference has separate engine fact sheets, both marked
changed December 1967. The H-1 sheet (PDF p. 45) gives a **3 ft 10 in ID**
nozzle exit; the J-2 sheet (PDF p. 69) gives **6 ft 5 in ID**. These are inside
diameters, now built as 46 and 77 inches at all detail levels. The original
H-1 opening was only 35.4 inches across and was substantially undersized.

`apollo_csm.BELL_RIM` retains the initial estimated 0.3-inch display rim. The
outer reference radius is derived by adding this inherited rim to the documented
inside radius; no manufactured wall thickness is claimed. Bell contours, nozzle
lengths, throat sizes, chamber shapes, mounting coordinates and engine cant
remain provisional. The published **overall engine** lengths, 102 inches for
H-1 and 133 inches for J-2, are not substituted for nozzle lengths. Source
thrust ratings are not assigned to a simulator.

The H-1 fact sheet explicitly dates the engine uprating to SA-206 and later,
so its pre-uprating hardware reference is appropriate to SA-205. These are
nominal period design figures, not measurements of the individual engines flown.


## Photographic marking reconstruction

The first lettering used font em sizes as physical capital heights. Its actual
painted capitals were only about two-thirds of those values, and the vertical
layout lacked the gap between UNITED and STATES. It also put the first-stage
words on the white oxygen tanks. NASA **S68-29781** (22 April 1968), showing
**SA-205 itself**, clearly shows the words on **white fields on the black fuel
tanks**. **S68-50712** (September 1968) shows the full layout and narrow upper
USA marking. The paint field is now a material region of each tank's one skin,
without a second white surface. The letters follow that tank's own 35-inch
radius about its offset centre, rather than a circle about the whole cluster.

No dimensioned SA-205 stencil drawing was located. A secondary forum attachment
named *Saturn IB S-IVB USA Marking.pdf* could not be retrieved (HTTP 403), so its
contents and dimensions are not adopted. These changes use the user's authorized
**last-resort photographic estimates**, not newly documented measurements.

| Parameter | Reconstruction inches | Confidence |
|---|---:|---|
| S-IB capital height / U width | 36 / 30 | estimated |
| S-IB letter pitch / extra word gap | 48 / 24 | estimated |
| S-IB top of U, vehicle station | 865 | estimated |
| Fuel-tank white field, axial limits | 240–900 | estimated |
| White field circumferential arc width | 40 | estimated |
| S-IVB capital height / U width | 40 / 28 | estimated |
| S-IVB letter pitch | 80 | estimated |
| Top of S-IVB U | 80 below the model's S-IVB top | estimated offset, not a surveyed station |
| S-IVB white barrel field | upper 320 of modelled stage | estimated paint boundary |

The original NASA image is 5797 × 7198 pixels. Approximate upper-glyph heights
are 60–75 pixels against a 460–500-pixel apparent barrel diameter. The documented
260-inch diameter gives a raw 31–42-inch range before perspective correction;
40 inches is a rounded visual estimate with roughly ±20% uncertainty. The
marked first-stage tank gives about 60–85 pixels per capital against an apparent
150–180-pixel tank width. Its documented 70-inch diameter gives a raw 23–40-inch
range, with additional axial foreshortening; 36 inches is a reconstruction choice
with roughly ±25% uncertainty. These ranges describe the estimate, not inspection
tolerances. Field ends, pitch, word gap and placement are matched to the visible
proportions; perspective, glare and the still-provisional tank stations limit them.
The erection photograph independently checks the word gap, paint field and glyph
proportions. No restored museum paint or later white-fuel-tank vehicle is a donor.

Each letter is normalized by its **actual glyph bounds**, independently of the
font em. Other letter widths retain their proportions relative to U; an I stays
narrow. The pinned **Liberation Sans Regular 2.1.5** is a lighter sans substitute,
not the original contractor's stencil. Its rounded details, spacing and stroke
shape are approximate. Other flights and cabin legends retain the existing bold
font. The regular font is distributed under the existing SIL OFL 1.1 licence.
Its SHA-256 is `76d04c18ea243f426b7de1f3ad208e927008f961dc5945e5aad352d0dfde8ee8`.
The .3-inch normal lift is the renderer's shared decal separation, **not a
physical paint thickness**. It prevents flicker; letter sizing refers to the
unwrapped painted outline. These estimates are display geometry only and never
feed flight physics. Fine stencil bridges, serials, flags and fin markings remain
unfinished.

Sources: [NASA S68-50712](https://images.nasa.gov/details/S68-50712),
[NASA S68-29781](https://images.nasa.gov/details/s68-29781), and
[the font's official release](https://github.com/liberationfonts/liberation-fonts/releases/tag/2.1.5).
Original-photo SHA-256 values: S68-50712
`610d24aa0cb604987930a0774aa0b0753b8724e9da2aeda2bfdf0eece2e23527`;
S68-29781 `5cdf66573dc36ecd18e8a23cad2a49ed69ce949a78b48af99e259a1aeaa468db`.
