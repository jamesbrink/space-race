# Gemini spacecraft No. 7

The ship Borman and Lovell flew on 4 December 1965. The spacecraft as a type, with every dimension
and what each rests on, is [gemini-spacecraft.md](../../vehicles/gemini-spacecraft.md); this is
what was No. 7's own, and what [model/vehicle.py](model/vehicle.py) therefore tells the shared
module (`FIT`).

Sources, short: **GVII**, the Gemini VII mission report (MSC-G-R-66-1), whose section 3.1 and
Table 3.1-I list what spacecraft 7 changed from spacecraft 5; **GV**, the Gemini V mission report;
**SEDR 300** vol. 1 (spacecraft 3, 4 and 7: this ship's own manual) and vol. 2 (the rendezvous
ships); ***Titans***, *On the Shoulders of Titans*; the **press kit**, NASA release 65-362.

## This ship and the others

| | Spacecraft 7 | Spacecraft 5 | Confidence | Source | In the model |
| --- | --- | --- | --- | --- | --- |
| Structure | "essentially the same as that of spacecraft 5" | | documented | GVII, 3.1.1 | the type's |
| Rendezvous radar | none | on the forward face | documented | GVII, 3.1.1.1 and 3.1.2.4 | `radar=False` |
| Radar transponder | an L-band transponder, a boost regulator and a single spiral antenna in the rendezvous and recovery section, "similar to equipment included in the rendezvous evaluation pod of spacecraft 5 and the Agena target vehicle"; fitted over a weekend early in November 1965 | in the pod | documented | GVII, 3.1.1.1, 3.1.2.4 and Figure 3.1-2; *Titans*, p. 280; press kit, p. 59 | yes: `transponder=True`. One spiral antenna on the forward face, to one side of the axis as a photograph taken from spacecraft 6 shows it; its size estimated |
| Acquisition lights | two, "like those used on the rendezvous evaluation pod and the Agena target vehicle ... on opposite sides of the equipment adapter section", at its base; about 65 flashes a minute; switched by the ACQ LT breaker | on the pod | documented | GVII, 3.1.1.2, 3.1.2.4 and Table 3.1-I; press kit, p. 59 ("180 degrees apart ... about 80 times per minute") | yes: `acquisition_lights=True`, left and right at the foot, looking aft through the edge of the cover. Which two sides, how they were mounted and their form are estimated |
| Rendezvous evaluation pod | none: no mount on the blast shield's access door, no ejector | carried | documented | GVII, 3.1.1.2 and 3.1.2.8 | `pod=False` |
| Encoder for commanding an Agena | not installed | installed | documented | GVII, 3.1.2.4 | no |
| Hatch latches | "redesigned hatch-latching mechanisms (effective with spacecraft 6)", after the trouble closing the right hatch on Gemini IV | the earlier mechanism | documented | GVII, 3.1.1.1 | no: the latches are the type's |
| Power in orbit | fuel cells, "essentially the same as the spacecraft 5 system"; a standpipe on the product water line; fibreglass trunnion supports under the module to keep heat out of the tanks | fuel cells | documented | GVII, 3.1.1.2, 3.1.2.6 and Figure 3.1-7 | yes: `fuel_cells=True`, `adapter_batteries=0` |
| Fuel cell hydrogen tank | fifty layers of aluminised Mylar on its outside; insulated mounts; the outlet line led round the tank to cool it; a pyrotechnic cutter on the tube its jacket was evacuated through | bare | documented | GVII, 3.1.2.6.2 and Figure 3.1-8 | yes: `hydrogen_insulated=True`. The tank's size is spacecraft 5's, estimated; the wrap's thickness is not given |
| Oxygen crossfeed | a line between the crew's primary oxygen tank and the fuel cells' oxygen tank, so that either could pressurise the other | none | documented | GVII, 3.1.2.3 and Figure 3.1-3 | no: plumbing is not built |
| Drinking water in the adapter | tanks A and B, 150 lb each, in the equipment section, "as in the spacecraft 5 configuration": A launched with nitrogen at 19.0 psia to take the fuel cells' water, B with 149 lb of drinking water; and tank C, 42 lb, in the retrograde section, launched with 25 lb under oxygen at 18.0 psia | two tanks of 150 lb | documented | GVII, 3.1.2.3 and Figure 3.1-4 | yes: `water_spheres=2`, `retro_water_tank=True`. Sizes and places below |
| Propulsion | the OAMS with "a reserve fuel tank ... to supply a known quantity of fuel to the system upon depletion of the primary fuel tank", behind a squib valve (the "F" package); auxiliary heaters on thrust chambers 1 to 10 | no reserve tank | documented | GVII, 3.1.2.6, 3.1.2.7 and Figures 3.1-10 and 3.1-11 | yes: `oams_reserve_tank=True`, `lateral_thrusters=True`. Its size is SEDR 300's; its place estimated |
| Experiments in the adapter | MSC-2, a proton-electron spectrometer "mounted in the equipment adapter section"; MSC-3, a tri-axis magnetometer with its sensor "on an extendible antenna boom" | neither (spacecraft 4 carried both) | documented | GVII, 8.12.2 and 8.13.2; 3.1.2.9.1 for their switches | yes: `experiments`, in spacecraft 4's places, which is an assumption |
| Docking light | one, listed with the retrograde section; switched with the auxiliary OAMS heaters | one, on the retrograde section | documented | GVII, Figure 3.1-2 and 3.1.2.9.1; 7.1.2.3.1 for its use | no: where on the section is not found |
| G.m.t. clock on the command pilot's panel | as spacecraft 5 | from spacecraft 4 | documented | GVII, 3.1.2.5 | yes: `gmt_clock=True` |
| Elapsed-time clock | a digital clock on the centre panel in place of the flight plan roller, reading to 999:59:59, with provision to start, stop and reset it; "to spacecraft 6 and subsequent spacecraft" | the roller | documented | GVII, 3.1.2.5 and 3.1.2.9.1; Gemini Midprogram Conference (NASA SP-121), p. 63 | yes: `get_clock=True`. Its place is the roller's; its form and its two switches estimated |
| Range and range-rate indicator | "was deleted" | fitted | documented | GVII, 3.1.2.9.1 | yes: `range_indicator=False` |
| Other panel changes | the HF antenna switch three-position (from spacecraft 6); the RADAR switch works the transponder; no manual computer sequencing switch; a pull-ring for the cabin vent valve's stopper; on the Agena control panel, O2 CROSS FEED for ENCDR, SPT-MAG for the docking release, BOOM EXT-RET for the pod's eject, OAMS RESV SQUIB for ENGINE ARM | | documented | GVII, 3.1.2.9.1 and Figure 3.1-12 | no: the panels are spacecraft 3's with the two clocks and without the range indicator |
| Suits | G5C: G4C materials without the restraint layer and inner liner; a soft helmet with its own visor and no neck ring, unzipped and folded back when not wanted; a crash helmet under it; 16 lb. Two-piece nylon orbital flight suits besides | G4C | documented | GVII, 3.1.2.9.2; press kit, p. 49; *Titans*, p. 278 | no: the seats are empty |
| Stowage | aft and centre containers "slightly different in size and shape"; a food pouch on the left side of the right footwell; a dry-waste place behind the pilot's seat | | documented | GVII, 3.1.2.9.4, Figure 3.1-14 and Table 3.1-II | no: the cabin's boxes are spacecraft 3's |
| Water dispenser, urine system | a pistol-shaped dispenser that counted half-ounce shots; a sampling system, filter and flowmeter | | documented | GVII, 3.1.2.9.3 | no |
| Environmental control | a larger, insulated lithium hydroxide cartridge; bypass hoses on the egress kits; a stopper on the cabin vent valve; lower-power supplies for the B coolant pumps | | documented | GVII, 3.1.2.3 | no |
| Instrumentation | electroencephalograph sensors for experiment M-8 | | documented | GVII, 3.1.2.2 | no |
| Nose fairing | the ejector's crank changed; thrown off after staging | a pyrotechnic piston, in the climb | documented | GVII, 3.1.2.8; SEDR 300 vol. 1, p. 4-53 | no difference built |
| Ejection seats, landing system, recovery aids | "identical", "the same" | | documented | GVII, 3.1.2.9.5 to 3.1.2.11 | the type's |

## What it carried, and what was added to make it a target

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Fuel cell oxygen | 181.8 lb at launch, 101 per cent, at 230 psia; 60.95 lb at 329 h | documented | GVII, 5.1.7.3.2 |
| Fuel cell hydrogen | 23.58 lb at launch, 106 per cent; 8.55 lb at 329 h; never vented | documented | GVII, 5.1.7.3.1 |
| Primary oxygen | 109.2 lb at launch, 103 per cent, at 960 psia; 34.28 lb at 329 h | documented | GVII, 5.1.4.2 |
| Oxygen tank, inside | 20.3 in across | derived | 180 lb at liquid oxygen's density, as for spacecraft 5 ([gt-5/spacecraft.md](../gt-5/spacecraft.md)) |
| Hydrogen tank, inside | 25.5 in across | derived | 22.25 lb at liquid hydrogen's density, as for spacecraft 5 |
| The two tanks, outside | 23 in and 28 in across | estimated | spacecraft 5's guess at the shells; this ship's hydrogen tank had fifty layers of film more, of a thickness not given |
| Where the fuel cell module's things lie | in a row beyond one of the equipment section's two beams, on the side away from the OAMS module: the two sections at one end, then the hydrogen, then the oxygen | the order and the side documented as drawn; the places estimated | GVII, Figure 3.1-7 (a sketch); Figure 3.1-8's inset for the hydrogen tank; SEDR 300 vol. 1, Figure 5-5; the Technical Summary, Figure 4 |
| Water tanks A and B | 21.12 in across | assumed | "as in the spacecraft 5 configuration" (GVII, 3.1.2.3), which were of the OAMS propellant tank's pattern; that tank's size on the early ships (SEDR 300 vol. 1, p. 8-273) |
| Where A and B stand | at the two ends of the OAMS module's row of four places, the two propellant tanks between them: 24.5 in from the axis, at Z50 | that they are at the ends documented; the row's place estimated | SEDR 300 vol. 1, Figure 6-10 sheet 5 and Section VIII, Figure 8-72 |
| Water tank C, capacity | 42 lb | documented | GVII, 3.1.2.3 |
| Water tank C, inside | 13.05 in across | derived | 42 lb of water at 62.4 lb/cu ft is 0.673 cu ft, a ball of that width; that it is a ball, in two halves bolted round the middle, is as SEDR 300 vol. 1, Figure 6-10 sheet 5, draws it |
| Water tank C, outside | 13.5 in across | estimated | the shell round the 13.05 in is a guess |
| Water tank C's place | in the retrograde section toward the top, 34 in from the axis and 24° round toward the crew's right, its middle at Z88.5, on a tray between two of the rockets | estimated | SEDR 300 vol. 1, Figure 6-10 sheet 5 (its inset, and the tray, "adapter retro section tank support") and GVII, Figure 3.1-4: both sketches without dimensions; which side of the top is not read from them |
| OAMS propellant | 247.5 lb of oxidiser and 180.9 lb of fuel loaded; 340 lb usable | documented | GVII, Table 5.1.8-I (read on the page) and 5.1.8.1.2 |
| OAMS tanks | fuel 21.13 in across, oxidiser 21.12 in, each of 5,355 cu in; helium 16.20 in, 1,696 cu in | documented | SEDR 300 vol. 1, Section VIII, pp. 8-263, 8-271 and 8-273, which is this ship's manual. (A ball 21.13 in across is 4,940 cu in: the manual's two figures do not agree, and are quoted as printed.) 5,355 cu in of monomethylhydrazine at 54.6 lb/cu ft is 169 lb, and the reserve tank's 546 cu in 17 lb: room for the 180.9 lb loaded |
| OAMS reserve fuel tank | a cylinder 5.10 in outside diameter and 30.7 in long, 546.0 cu in | documented | SEDR 300 vol. 1, Section VIII, p. 8-271, "Reserve Fuel Tank (Spacecraft 7 only)": of the pattern of the re-entry control system's tanks (its Figure 8-86) |
| Reserve tank, what it held | 12.9 lb of usable fuel | documented | GVII, 5.1.8.1.1; "12.3 to 14.3 pounds" in it when it was opened, at about 290:24 (5.1.8.1.2) |
| Reserve tank's place | across the ship forward of the propellant tanks, its middle 10 in to the right of the axis and 12 in above it, at Z60.2; its ends rounded to 1.3 in | estimated | SEDR 300 vol. 1, Section VIII, Figure 8-72, and GVII, Figure 3.1-10, which draw it on the OAMS module beside the "F" package: sketches |
| Transponder antenna | one spiral antenna, 6.6 in across and 2.4 in deep, 7 in off the ship's axis on the forward face | the thing documented; its size and place estimated | GVII, 3.1.2.4. Its size is the pod's antenna's in this model, scaled from GV's Figure 3.1-4b. NASA S65-63113, taken from spacecraft 6, shows one pale disc about half way out from the middle of the face, and a short rod at the rim beside it; which way round the face is not made out, and it is put toward the bottom |
| Acquisition lights | two, at the base of the equipment section, on opposite sides: here left and right, 52.5 in from the axis, looking aft through the gold cover | the things documented; their size, form, mounting and which sides estimated | GVII, 3.1.1.2 and 3.1.2.4; the press kit has them 180° apart. Their form is the Agena light's as this model draws it on GLV-4 and GLV-7. NASA S65-63221 shows a small fitting at the rim to left and right of the two aft-firing thrusters, which may be the lights; they were not made out |
| Hydrogen tank's wrap | 0.3 in thick, silvered | estimated | "Fifty layers of aluminized mylar" (GVII, 3.1.2.6.2); Figure 3.1-8 draws it as a band, without a scale |
| Spectrometer, magnetometer boom | under the middle of the blast shield's access door, the spectrometer looking aft through an opening in the gold cover and the boom beside it | the things documented; the place by photograph | GVII, 8.12.2 and 8.13.2; GIV, 8.4.2, has spacecraft 4's spectrometer "fixed to the center of the equipment adapter section blast shield door". NASA S65-63221 shows an instrument looking aft through an opening in the middle of the cover, and the boom run out from the same opening |

## The experiments

Twenty were carried (GVII, section 8); eighteen were done in whole or part. Two had hardware outside
the cabin that is modelled: MSC-2 and MSC-3, above. The radiometry experiments D-4 and D-7 had their
own telemetry transmitter (GVII, 3.1.2.1); where their sensors were on the ship is not in what was
read, and they are not built. The rest were instruments used in the cabin or through the windows,
and the medical ones were on the men.

## Paint

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Re-entry module | black shingles | documented by photograph | NASA photographs taken from spacecraft 6 on 15 December 1965: the ship from its right side (Wikimedia Commons, *Gemini 7 in orbit - GPN-2006-000035.jpg*), from behind (S65-63221) and from ahead (S65-63113) |
| Adapter | white, with fine dark lines along it | documented by photograph | the same. The lines are not drawn: they are the type's skin as built |
| UNITED STATES and the flag on the right side | UNITED over STATES below the hatch's hinge, the flag aft of them | documented by photograph | GPN-2006-000035, read at 3,840 px. S65-63113 shows the lettering too, from ahead and far off; which side it is of is not made out |
| The nose fairing | pale | assumed | the type's: it had gone before any photograph in orbit |
| The white disc forward of the left hatch | left off | | it is spacecraft 3's, and not identified (`white_disc=False`) |

Three of the photographs Gemini VI-A's crew took of this ship were read for this, at the sizes
Wikimedia Commons holds, and one of them, S65-63221, at its full 4,115 pixels: the gold cover
across the foot is measured on it ([gemini-spacecraft.md](../../vehicles/gemini-spacecraft.md),
"Equipment section"). They also show what the model does not have (below): a raised oblong under
the cover's cloth; a boxed fitting standing off the retrograde section near the top, with a rod
forward of it, not identified; cords trailing from the foot. The lights were not
made out in them.

## Weights

| | | Confidence |
| --- | --- | --- |
| At launch | 8,076.10 lb | documented (GVII, section 3.3, read on the page) |
| At retrofire | 5,648.73 lb | documented (the same table) |
| At the start of the entry | 4,824.33 lb | documented |
| At main parachute deployment | 4,427.95 lb | documented |
| At touchdown, without the parachute | 4,317.14 lb | documented |
| OAMS propellant, usable | 340 lb, nearly all used | documented (GVII, 5.1.8.1.2) |

## What the model gets wrong or leaves out

The type's list is [gemini-spacecraft.md](../../vehicles/gemini-spacecraft.md), "What the model gets wrong or leaves
out". Of what was No. 7's own:

- **No crew.** The G5C suit is not modelled; the seats are empty, with the harness lying on them. Nor are the suits
  shown as they were for most of the flight, folded behind the seats.
- **The panels are spacecraft 3's**, with spacecraft 4's clock, this ship's clock of elapsed time on the centre
  panel and a blank where the range indicator was. The elapsed-time clock's form and its two switches are
  estimated, and their legends are not drawn. The fuel cell monitor and the switches this ship renamed are not drawn.
- **The cabin's stowage is spacecraft 3's.** This ship's boxes differed a little in size and shape, and it had a food
  pouch in the right footwell and a place for dry waste behind the pilot's seat; none of that is built.
- **The transponder is its antenna.** One spiral antenna on the forward face, its size the pod's and its place read
  off one distant photograph; the short rod that photograph shows at the rim, the transponder and its regulator
  behind the face are not built.
- **The acquisition lights are placed by guess.** That there were two, on opposite sides at the base of the equipment
  section, is documented; which sides, how they were mounted, and what they looked like are not in what was read.
- **Water tank C is sized from what it held** and placed from sketches without dimensions; its tray is a plate, a
  ring and two lips, where McDonnell's drawing has a pan with lightening holes.
- **The reserve fuel tank's size is McDonnell's; its place is not.** Its "F" package and its lines are not built.
- **The equipment section is McDonnell's arrangement and our sizes** ([gemini-spacecraft.md](../../vehicles/gemini-spacecraft.md), "Equipment section"): the OAMS module with the two
  propellant tanks between water tanks A and B, the fuel cell module opposite it, the middle clear. How far the
  modules' beams are turned from the ship's own sides is measured on two perspective sketches.
- **The gold cover is measured on one photograph of this ship**, good to 3 in in depth and 4 in across. Its gathers
  are drawn as even pleats. The raised oblong the photograph shows under the cloth beside the lower aft-firing
  thruster is not identified and not built.
- **The fuel cell module's sizes are not from a drawing**, as on spacecraft 5. The hydrogen tank's insulation is a
  silvered skin 0.3 in thick, a guess. No plumbing: the oxygen crossfeed that this flight used in its first half
  hour is not built, nor the standpipe on the water line, nor the fibreglass supports.
- **The spectrometer and the magnetometer's boom** are where the photograph of this ship has them, under the middle
  of the blast shield; their forms are estimated. The boom is drawn stowed, and was run out once the ship was in
  orbit and left out.
- **Not built:** the docking light, the boxed fitting the photographs show on the retrograde section, the radiometry
  experiments' sensors, the auxiliary heaters on the thrust chambers, the new hatch latches, the HF whip antenna.
- **The paint** is spacecraft 3's, which the photographs of this ship's right side bear out; the left side's is assumed.
- **The flown ship** has not been compared.

## Sources

[docs/sources.md](../../../../../docs/sources.md), "Gemini-Titan 7 and Gemini-Titan 6A".
