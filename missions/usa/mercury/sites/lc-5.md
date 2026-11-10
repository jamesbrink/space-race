# Launch Complex 5, Cape Canaveral

The pad every Mercury-Redstone flew from. Model: [lc_5.py](lc_5.py), built for a flight by its
`model/pad.py`. NASA's report calls the complex "VLF 56" (Vertical Launch Facility 5/6): pads 5
and 6 shared one blockhouse and one rail-mounted service structure.

The model shows the pad at about **T−55 minutes**: service structure withdrawn to the edge of the
pad, the mobile aerial tower's cab at the capsule hatch. The viewer's slider takes it to liftoff:
the structure driven out to its launch position, the tower withdrawn.

**This is a reconstruction.** The source gives what was there and how it was used, and four
photographs and a site plan. It gives almost no dimensions. Heights were scaled off the
photographs against the 83.38 ft vehicle (*estimated*); distances were scaled off the site plan
against the 535 ft between pads 5 and 6, which comes from their coordinates (*derived*).

## What is documented

| Fact | Source |
| --- | --- |
| The mobile aerial tower ("cherry picker") could reach 125 ft; its cab stood at the capsule hatch after the structure rolled back, and could be lowered by remote control from the blockhouse | TM X-53107, 7.3.3.1 |
| In the MR-4 count the service structure is at the edge of the pad from about T−55 min and is driven by remote control to its launch position at T−8:45. (Section 7.3.3.3 says "launch position" from T−55; the countdown is followed here) | TM X-53107, 7.2.3.2 |
| The tower cab is at the hatch from T−55 min, and leaves at T−4 min (7.3.3.1) or T−2:30 (the MR-4 count) | TM X-53107, 7.2.3.2, 7.3.3.1 |
| Two cable masts: No. 1 for the booster, No. 2 for the capsule. The capsule umbilical dropped at about T−35 s; the boom dropped just before ignition | TM X-53107, 7.1.3, 7.2.3.2 |
| The service structure predates Mercury (Redstone, Jupiter, Jupiter-C) and runs on rails, serving both pads | TM X-53107, 7.5.1.1 |
| For Mercury it gained: remote control from the blockhouse; an enclosed, air-conditioned white room on level 3; an escape-rocket flame deflector; an auxiliary platform at the base of the escape tower | TM X-53107, 4.8.9, 7.5.1.2 to 7.5.1.6 |
| The white room was built between February and May 1961, after films from MR-1A and MR-2 showed debris floating in the cabin | TM X-53107, 7.5.1.2 |
| The vehicle had no hold-down arms; it was grounded through two connectors under fin II | TM X-53107, 4.2 |
| Platform three was rated for 10 people and 500 lb of equipment, and was reinforced after MR-1's mating overloaded it | TM X-53107, 7.5.1.7 |

## Dimensions in the model

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Pedestal ring height | 6 ft | estimated | Figure 7-7 |
| Pedestal ring | 7.4 ft across, 3.9 ft opening | estimated | sized to the 70 in tail and 33 in nozzle |
| Hardstand | 204 ft square | derived | Figure 7-6 scaled on the 535 ft pad spacing; pad 6's is given elsewhere as 203 ft |
| Service structure launch position | 195 ft from the pad centre | derived | same scaling |
| Blockhouse | about 345 ft from each pad | derived | same scaling; not modelled |
| Rail gauge | 28 ft | estimated | Figure 7-7 |
| Service structure height | 118 ft to the crane | estimated | Figure 7-7: about 1.4 times the vehicle on its pedestal |
| Work platforms | 22, 42, 62.5, 79 and 94 ft | estimated | level 3 placed at the capsule; the others spaced evenly |
| Structure at the pad's edge | 78 ft, pad centre to structure centre | estimated | Figure 7-7 |
| Mobile aerial tower mast | 96 ft; cab at 68.4 ft | derived | cab height follows from the vehicle and pedestal; mast is within the documented 125 ft reach |
| Cable mast No. 2 | 66 ft | estimated | reaches the capsule's umbilical |

## Parts in the model

| Node | Contains |
| --- | --- |
| `Hardstand` | concrete slabs and joints, blast plate, rails, track bed |
| `LaunchPedestal` | ring, four legs, vehicle support pads, four-sided flame deflector |
| `UmbilicalMast` | cable mast No. 2: lattice mast, arm, capsule umbilical |
| `ServiceStructure` | frame, bogies, five platforms, level 3 white room, elevator, hammerhead crane |
| `CherryPicker` | carrier, outriggers, mast, jib, cab |
| `Floodlights` | four poles |

## What the model gets wrong or leaves out

- **No size here is a measurement.** The layout is right; the numbers are scaled off figures, one
  of which (7-6) is a schematic, not a survey.
- The service structure's truss pattern, platform shapes and crane are generic. The real
  platforms folded round the vehicle; these are plain decks.
- The escape-rocket flame deflector and the auxiliary platform are documented but not modelled.
- The pedestal is a guess at a ring launcher. The real launcher's rotating table, levelling
  jacks and tail-plug mast are not modelled.
- Cable mast No. 2's form is a guess, and No. 1 (the booster's) is not modelled.
- The colours (red structure, yellow carrier) are from memory of colour photographs.
- Not modelled: the blockhouse, pad 6, the propellant and peroxide servicing vehicles, the M-113
  rescue carrier, fences, cable trenches, and the camera positions.

## Sources

See [docs/sources.md](../../../../docs/sources.md). The pad rests on one document: NASA TM X-53107,
*The Mercury-Redstone Project*, sections 4.8.9, 7.3 and 7.5 and Figures 7-5 to 7-11.
