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
The mobile aerial tower, the platforms' cut-outs and the white room's panels follow the NASA
photographs listed under [Photographs](#photographs); what they show is recorded there.

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
| The tower could be worked from a position on the ground at the rear of the truck-transporter, from within its cab, or lowered by a programmed descent "away and down" from push-buttons in the cab and the blockhouse | TM X-53107, 7.3.3.1 |
| The mobile-pad egress tower was finished in July 1960 and reached the Cape on 24 October 1960 | NASA SP-4001, Part II (B), July 1960 (from STG Status Report No. 8) |
| The service structure was the Redstone gantry built by the Noble Company of Oakland in 1953 for Launch Complex 4, moved to 5/6 in 1955: "a reclining type single-mast structure with cantilevered access platforms capable of encircling the missile", an "A" frame mast that "towered 140 feet above the launch pad", "modeled on the open-faced masts used in oil fields", on a steel base on railway tracks, with elevators up the mast and a 15-ton hammerhead crane | US Army Corps of Engineers, *History of the Canaveral District 1950-1971*, quoted in *Cape Canaveral: A Noble Endeavor* (rev 1.5.2), pp. 4-5, 9-10 |

## Dimensions in the model

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Pedestal ring height | 6 ft | estimated | Figure 7-7 |
| Pedestal ring | 7.4 ft across, 3.9 ft opening | estimated | sized to the 70 in tail and 33 in nozzle |
| Hardstand | 204 ft square | derived | Figure 7-6 scaled on the 535 ft pad spacing; pad 6's is given elsewhere as 203 ft |
| Service structure launch position | 195 ft from the pad centre | derived | same scaling |
| Blockhouse | about 345 ft from each pad | derived | same scaling; drawn as scenery, not part of the model |
| Rail gauge | 28 ft | estimated | Figure 7-7 |
| Service structure height | 118 ft to the crane | estimated | Figure 7-7: about 1.4 times the vehicle on its pedestal |
| Work platforms | 22, 42, 62.5, 79 and 94 ft | estimated | level 3 placed at the capsule; the others spaced evenly |
| Structure at the pad's edge | 78 ft, pad centre to structure centre | estimated | Figure 7-7 |
| Mobile aerial tower: cab | at the hatch, 68.4 ft | derived | follows from the vehicle and pedestal |
| Mobile aerial tower: mast and jib | 70 ft and 52 ft | estimated | scaled off GPN-2000-001006 against the vehicle; together with the 7 ft foot pin they give the documented 125 ft reach to within a few feet |
| Mobile aerial tower: where it stands | rear axle 56 ft from the pad centre, on the hatch side, facing away | estimated | GPN-2000-001006: the mast's foot is about 50 ft from the vehicle; the model's is 51.5 ft |
| Truck | wheelbase 16.5 ft, track 6.5 ft, tyres 41.5 in (10.00-20), 8 ft wide, 28.6 ft over the bumper frame | estimated | GPN-2000-001008, against a truck of this class; no drawing found |
| Platform cut-out | 80 in wide, 8.5 ft deep | estimated | the documented platforms encircled a 70 in missile; the width is the reviewer's figure, not a source's |
| Cable mast No. 2 | 66 ft | estimated | reaches the capsule's umbilical |

## Parts in the model

| Node | Contains |
| --- | --- |
| `Hardstand` | concrete slabs and joints, blast plate, scorch and stain round it, cable trench covers, rails, track bed |
| `LaunchPedestal` | channel ring with ribs, four H-section legs with gussets, vehicle support pads, conical flame deflector |
| `UmbilicalMast` | cable mast No. 2: lattice mast, arm, capsule umbilical |
| `ServiceStructure` | frame with gusset plates, four two-wheel bogies, five platforms each cut in a U, stairs between them, level 3 white room with doors, air-conditioning unit and duct, elevator, hammerhead crane |
| `CherryPicker` | truck (cab, bonnet, wings, chassis, bed), four outriggers, turntable, mast with two rams, jib, sheaves, cab; and four wheel nodes (below) |

The truck is built to be driven. Inside `CherryPicker`, each road wheel is its own node with its
origin at the hub and its axle along Blender's local Y: `CherryPicker_SteerWheel_1` and `_2`
(front left and right, single) and `CherryPicker_Wheel_1` and `_2` (rear left and right, each a
dual pair). The truck faces +X; the rear axle's centre is at (56.0, 0, 1.73) ft. Outriggers,
mast, jib and cab are part of the body.

## Photographs

What each shows, and so what the model takes from it. All are NASA, on Wikimedia Commons.

| Photograph | Shows |
| --- | --- |
| GPN-2000-001008, "Astronaut Escape Testing" (MR-7 on the pad) | The tower close up, from the truck's front quarter. An International Harvester truck (IH badge, R-series bonnet and wings), two axles visible, single front wheels; a tall frame on the front bumper for the folded jib; a flat bed carrying gas bottles and valves; outriggers that swing down and out from the body's sides, each with a ram above it; a lattice mast raised by two rams at its foot; plate cheeks and two large sheaves at the mast's head; a lattice jib hinged there, with the cab at its tip |
| GPN-2000-001006, "Mercury-Redstone 3 Prelaunch Activities" | The whole pad in the model's pose: structure rolled back, the tower's truck about 50 ft from the vehicle with its tail toward it, mast leaning slightly away, jib near level, cab at the hatch. The cab has windows in its sides and hangs from a pivot at the jib's tip. Also the structure: two lattice legs meeting at the top, platforms in two halves either side of the vehicle, glazed enclosures at the capsule levels, huts and stairs on the base |
| MSFC-6414825, "Mercury-Redstone 3 Liftoff" (colour) | The tower at liftoff: truck, mast, jib and cab all yellow; a NASA insignia on the cab's side; four outriggers splayed round the turntable. **The truck is still on the hardstand**, mast raised, jib folded down, cab lowered to the ground beside it |
| "Mercury-Redstone 3 egress test at Pad 5", 21 April 1961 (colour) | The service structure red; the white room's walls green panels in a light frame; the tower's cab yellow with framed side windows |
| 61-MR4-65, MR-4 launch attempt of 19 July 1961 | The cab at the hatch, open toward the capsule, with a sill plate at its floor |
| TM X-53107 Figure 7-5 | The tower beside a Mercury-Redstone; too coarse to add to the above |
| `Floodlights` | four poles |

## What the model gets wrong or leaves out

- **No size here is a measurement.** The layout is right; the numbers are scaled off figures, one
  of which (7-6) is a schematic, not a survey.
- **The service structure is the wrong form.** The photographs and the Corps of Engineers history
  show an open-faced A-frame: two lattice legs on a steel base, platforms in two halves. The
  model is a four-legged lattice tower with one-piece decks. Its height is also in question: the
  history says the mast "towered 140 feet above the launch pad"; the model's 118 ft was scaled off
  Figure 7-7. Neither has been changed, because the height is quoted in `flight.ts`.
- The platforms' U cut-outs stand for the real ones, which were two halves that closed round the
  vehicle. Their width and depth are estimated.
- The stairs between platforms, the gusset plates, the bogies (two flanged wheels, axle boxes, a
  traction motor), the machinery deck at the base, and the air-conditioning unit and its duct are
  representative: such things were there (the room was air-conditioned; the base carried huts and
  stairs) but their form and place are not from a source.
- The white room's green panels and light frame are from the colour photograph; the panel
  layout, the windows and the two doors are estimated. The real enclosure was in two halves, with
  a second, mesh-sided enclosure on the level below; the model has one room.
- The escape-rocket flame deflector and the auxiliary platform are documented but not modelled.
- The pedestal is a guess at a ring launcher: its H-section legs, ribbed ring and twelve-plate
  conical deflector are representative. The real launcher's rotating table, levelling jacks and
  tail-plug mast are not modelled.
- The scorch and stain round the blast plate, and the cable trench and its covers, are
  representative; their extent and the trench's route are not from a source.
- Cable mast No. 2's form is a guess, and No. 1 (the booster's) is not modelled.
- **Mobile aerial tower.** Its form is from the photographs; every size is estimated. Guessed
  outright: the rear axle (drawn as one axle with dual wheels; a second rear axle cannot be ruled
  out from the photographs), the wheelbase, what is under the bed (frame, springs, driveline,
  tank, silencer), the bed's lockers, the hose reel, the winch, where the hoist lines run, and
  how the jib is luffed and the cab kept level. The truck's make is from its badge; the model
  (R-190 or thereabouts) and the tower's builder are not known.
- The tower's truck stands square to the pad on the hatch side. Its real bearing from the pad is
  not known.
- At liftoff the real tower stayed on the hardstand with its cab lowered to the ground (see
  MSFC-6414825); the report says only that it was removed "to launch position". Whether the truck
  itself moved between T-55 min and liftoff is not established.
- The red structure and yellow tower are from the colour photographs. The truck's cab is assumed
  the same yellow; the black-and-white close-up shows only that it is light.
- Not modelled: the blockhouse, pad 6, the propellant and peroxide servicing vehicles, the M-113
  rescue carrier, fences, and the camera positions.

## Sources

See [docs/sources.md](../../../../docs/sources.md). The pad rests on NASA TM X-53107,
*The Mercury-Redstone Project*, sections 4.8.9, 7.3 and 7.5 and Figures 7-5 to 7-11, and on:

- The photographs above: [GPN-2000-001008](https://commons.wikimedia.org/wiki/File:Astronaut_Escape_Testing_-_GPN-2000-001008.jpg),
  [GPN-2000-001006](https://commons.wikimedia.org/wiki/File:Mercury_Redstone_3_Prelaunch_Activities_-_GPN-2000-001006.jpg),
  [MSFC-6414825](https://commons.wikimedia.org/wiki/File:Mercury-Redstone_3_Liftoff_MSFC-6414825.jpg),
  [the egress test of 21 April 1961](https://commons.wikimedia.org/wiki/File:Mercury-Redstone_3_egress_test_at_Pad_5.jpg),
  [61-MR4-65](https://commons.wikimedia.org/wiki/File:Mercury-Redstone_4_July_19_launch_attempt_61-MR4-65.jpg).
- [*Cape Canaveral: A Noble Endeavor*](https://ccspacemuseum.org/wp-content/uploads/displays/LC26gantry/Cape_Canaveral_Noble_Endeavor_v1.5.2.pdf)
  (rev 1.5.2), Cape Canaveral Space Force Museum: the service structure's history, quoting the
  Corps of Engineers.
- [NASA SP-4001, *Project Mercury: A Chronology*, Part II (B)](https://www.nasa.gov/history/SP-4001/p2b.htm):
  the egress tower's delivery.
