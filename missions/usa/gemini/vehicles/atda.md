# Augmented Target Docking Adapter

McDonnell's stand-in for an Agena: the docking adapter
([target-docking-adapter.md](target-docking-adapter.md)) on a plain cylinder of electronics, a Gemini
re-entry control section and a can of batteries, with no engine. Proposed on 26 November 1965 after
the first Agena was lost, approved on 9 December, finished on 21 January 1966 (SP-4002), stored, and
launched on 1 June 1966 for Gemini IX-A after the second Agena was lost. One was built and one flew.
Model: [atda.py](atda.py), built by [the flight's](../flights/gt-9a/README.md) `model/vehicle.py`
through [gemini_stack.py](gemini_stack.py) (`target="atda"`: there was one); its flight data is in
[gemini-targets.ts](gemini-targets.ts).

**It is built as Gemini IX-A found it**: in orbit, its ascent shroud still on and open about thirty
degrees. And it is built **standing on its tail beside the launch vehicle**, on the tip of its stub
antenna, which is an exhibit's arrangement: it went up from Complex 14 on an Atlas.

Stations are the ATDA's own, in inches: 0 where the docking adapter meets the equipment section,
positive toward the cone. Round it, angles are from its top, where the cone's notch is. It is turned
in the model so that the shroud's two halves open along the row of vehicles.

Sources, short: **TS**, *Project Gemini: A Technical Summary* (NASA CR-1106), pp. 336 to 343 and
**Figure 66**, a dimensioned drawing; **GIX**, the Gemini IX-A mission report (MSC-G-R-66-6),
sections 3.7 and 5.8.1 (its own Figures 3.7-1 to 3.7-3 are on pages missing from the copy read);
**SEDR2**, SEDR 300 volume 2, Section XV; **LSFR**, the Launch Systems Final Report, for the shroud;
**S66-37923** and **S66-37972**, NASA photographs taken from Gemini IX-A.

## Dimensions

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Length in orbit | 146.75 in (3.727 m) | documented | GIX, 3.7.1; TS Figure 66: 134.15 in from the cone's lip to the battery module's foot and 12.60 in of stub antenna |
| Length with the shroud | 241.52 in | documented; not the model's, whose shroud is open | TS Figure 66; SEDR2 Figure 15-1. GIX's text prints 241.25 |
| Equipment section | 54.00 in long, 60 in across | documented | TS Figure 66; GIX, 3.7.1.3 |
| Reaction control section | 18.00 in long, 40.4 in across | documented | TS Figure 66, section B-B |
| Battery module | 17.75 in long, 36.2 in across | documented | TS Figure 66, section A-A |
| Stub antenna | 12.60 in beyond the battery module, 1.25 in across | documented | TS Figure 66; SEDR2, p. 15-53 (which has 13.5 in for its length) |
| Docking cone's lip | 44.40 in forward of station 0 | documented | TS Figure 66 |
| Running lights | six under quartz domes, two each of green, red and amber, at stations −5.06 and −49.00: green on the right of the top, red on the left, amber underneath | documented; how far round the top the green and red are (45°) estimated | GIX, 3.7.1.3; SEDR2, p. 15-11 and Figure 15-1 |
| Access doors | four | documented; their places and size (18 by 24 in) a guess | GIX, 3.7.1.3 |
| Equipment beams | two, across the section, crossing at right angles near the middle | documented; their depth (30 in) and how they are turned estimated | GIX, 3.7.1.3; TS Figure 66, section C-C |
| Reaction control section | a Gemini re-entry control section: 16 chambers of 23.5 lb in two rings, with nine external webs; its tanks stand forward into the equipment section | documented; the chambers' places are the spacecraft's, assumed | GIX, 3.7.1.4 and 3.7.2.5; SEDR2, p. 15-6 |
| Batteries | three of 400 Ah and two of 15 Ah | documented; sizes and places guesses | GIX, 3.7.2.4. TS Figure 66 labels the large ones "350 AH" |
| Separation rails | four, supported by the battery can | documented; their form scaled from TS Figure 66 | GIX, 3.7.1.5 |
| Shroud | two half-shells of phenolic glass fibre, 117.00 in long, 65.12 in across the base: a cylinder 23.5 in long under a cone of 15° | documented | TS Figure 66; SEDR2, p. 15-6; LSFR, p. III.C-3 (of the Agena's shroud, which this was, with its vents closed: GIX, 3.7.1.1) |
| Shroud's nose | 9.8 in radius | derived | from the 117 in, the 23.5 in and the 15°. LSFR's "12-inch-diameter hemisphere" does not close with them; the photographs show a cap about 22 in across |
| Shroud, how far open | about 30° between the halves; 15° each in the model | documented | GIX, 5.8.1.2 |
| How it opens | on pivots at the adapter's two sides, the split in the plane of the top and bottom | documented | GIX, 5.8.1.2 ("pivot fittings attached to the TDA on the left and right sides"); TS Figure 66, view D-D |
| Which half keeps the nose | "one long segment (including the nose cone) and one short segment" | documented that it is so; which side, not made out: the left is taken | SEDR2, p. 15-90; S66-37923 |
| Band clamp | "at a station 22 inches forward of the TDA/shroud interface", its halves' ends held by the wiring | documented; its form estimated | GIX, 5.8.1.2 |
| Finish | equipment section aluminium coloured, with one black band along it carrying a white stripe, and a flag; shroud white with red placards; docking cone's outside painted aluminium | by photograph, against the manual | S66-37923. SEDR2, p. 15-5, has the equipment section "painted black with white longitudinal stripes"; GIX, 5.8.1.2, has most of the vehicle "painted with an aluminized acrylic enamel". The photographs are followed |
| Weight | 2,006 lb at launch | documented | GIX, 3.6 |

## Parts

Each a top-level node, a part of the flight's parts list under "Docking target", with its own words;
six of them are the docking adapter's ([target-docking-adapter.md](target-docking-adapter.md): adapter 5,
with experiment S-10's package and its cone's outside painted aluminium).

| Node | What it is |
| --- | --- |
| `AtdaShroud` | the two half-shells, open 15° each, their inner faces, the placards |
| `AtdaShroudBand` | the band clamp's two halves and the wiring to its bolts, which held the halves by their ends: the lanyards that should have pulled the wires' plugs had been taped down |
| `DockingCone`, `MooringLatches`, `StatusDisplay`, `AcquisitionLights`, `TargetDockingAdapter`, `TargetTransponder` | the docking adapter |
| `AtdaEquipmentSection` | the skin with its band, stripe, flag and doors, the antennas; inside, the two beams and the electronics |
| `AtdaRunningLights` | the six lamps under their domes |
| `AtdaReactionControl` | the step, the section's skin and webs, the sixteen chambers, the tanks standing forward |
| `AtdaBatteryModule` | the can, the batteries in it, the four separation rails, the stub antenna |

## What the model gets wrong or leaves out

- **It stands on its stub antenna.** Nothing could; a stand would be a thing that was not there.
- **The Atlas and its adapter are not built**, nor the separation charge and the eight bungee cords
  that pulled the vehicle out.
- **Everything inside the equipment section is a guess** beyond the two beams: which box is where,
  and each one's size. TS Figure 67, which lays them out, was not used box by box.
- **The reaction control thrusters point straight out.** The spacecraft's fire along its axes
  through oval ports; here they are plain chambers on the skin.
- **Which side the black band is on, which half of the shroud kept the nose, and where the wires
  ran** are not established. The band is on the vehicle's right, the long half on its left.
- **The shroud's inside is a plain dark shell.** Its ribs, its springs, its nose latches and the two
  pivots at its base are not built, and the 1.6 in its base moved out is not shown.
- **The docking cone is where McDonnell's drawing has it.** In orbit the ground drew it in and ran
  it out again to try to shake the shroud loose.
- **Nothing moves.** The vehicle tumbled at about three degrees a second; here it stands still.
- **The C-band helices, the whip antenna's fairing and the access doors are placed by guess.**

## Sources

[docs/sources.md](../../../../docs/sources.md), "Gemini-Titan 8 and Gemini-Titan 9A".
