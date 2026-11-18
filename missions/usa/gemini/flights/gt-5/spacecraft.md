# Gemini spacecraft No. 5

The ship Cooper and Conrad flew on 21 August 1965. The spacecraft as a type, with every dimension
and what each rests on, is [gemini-spacecraft.md](../../vehicles/gemini-spacecraft.md); this is
what was No. 5's own, and what [model/vehicle.py](model/vehicle.py) therefore tells the shared
module (`FIT`).

Sources, short: **GV**, the Gemini V mission report (MSC-G-R-65-4), whose section 3.1 and Table
3.1-I list what spacecraft 5 changed from spacecraft 4; **GIV**, the Gemini IV mission report;
**SEDR 300** vol. 1 (spacecraft 3, 4 and 7) and vol. 2 (the rendezvous ships, spacecraft 5 among
them); ***Titans***, *On the Shoulders of Titans*.

## This ship and the others

| | Spacecraft 5 | Spacecraft 4 | Confidence | Source | In the model |
| --- | --- | --- | --- | --- | --- |
| Structure | "the same basic configuration" | | documented | GV, 3.1.1 | the type's |
| Power in orbit | a reactant supply system and fuel cell module: two sections, each of three stacks of 32 cells, and a tank each of supercritical hydrogen and oxygen | six batteries | documented | GV, 3.1.2.6 and Figure 3.1-5; SEDR 300 vol. 2, pp. 5-25 and 5-33 | yes: `fuel_cells=True`, `adapter_batteries=0`. Sizes and places below |
| Rendezvous radar | on the forward face of the rendezvous and recovery section: four dual-spiral antennas, one transmitting and three receiving (reference, azimuth, elevation) | none | documented | GV, 3.1.2.4.2 and Figure 3.1-4a | yes: `radar=True`. Four cups on the face; their size and places scaled from the figure |
| Rendezvous evaluation pod | "in the center of the equipment adapter section", its mount "on the blast shield access door", under a silvered glass-fibre cover: a transponder 10 by 10 by 20 in, a dipole on a two-foot boom and two spiral antennas standing 2 in off the case, two flashing lights, two 24 V silver-zinc batteries and a boost regulator | none | documented | GV, 3.1.2.4.2 and Figure 3.1-4b; SEDR 300 vol. 2, Section VIII, pp. 8-291 to 8-299 and Figures 8-79 and 8-80; GVII, 3.1.1.2 | yes: `pod=True`, the node `RadarEvaluationPod`, and its mount on the equipment section. What is documented and what is scaled from the figures is below |
| Docking light | 4,000 beam candlepower, a 6° cone, on the retrograde section | none | documented | GV, 3.1.2.4.2 | no: where on the section is not found |
| Drinking water in the adapter | two tanks "the same configuration as the ... OAMS propellant tank", 150 lb each; one also takes the fuel cells' water behind its diaphragm | four small tanks | documented | GV, 3.1.2.3 and Figure 3.1-3 | yes: `water_spheres=2`, at the early ships' propellant tank's 21.12 in (assumed); places estimated |
| Propulsion | "the same as the spacecraft 4 system" | all sixteen OAMS chambers real, long-life | documented | GV, 3.1.2.7 | yes: `lateral_thrusters=True` |
| Nose fairing | pushed off by a pyrotechnic piston, in the climb (207 s) | a spring, after second stage cutoff | documented | GV, 3.1.2.8 and Table 4.2-I | no difference built |
| G.m.t. clock on the command pilot's panel | as spacecraft 4: "The time reference system was the same" | added on that ship | documented | GV, 3.1.2.5 | yes: `gmt_clock=True` |
| Panels | a fuel cell monitor in place of the ammeter and voltmeter; a panel of warning lamps; a radiometric selector panel; a second manoeuvre controller on the right wall; a range and range-rate indicator; an Agena control panel with the pod's eject switch | | documented | GV, 3.1.2.9.1 | no: the panels are spacecraft 3's with the clock. The range and range-rate indicator is in that drawing already |
| Telemetry | a fourth transmitter and a UHF whip antenna in the adapter, for experiments; a second tape recorder | | documented | GV, 3.1.2.1 and 3.1.2.2 | no |
| Suits | G4C, without the overvisor and the cover layer for going outside | G4C with them for the pilot | documented | GV, 3.1.2.9.2 | standing at the pad and seated in the cabin ([g4c-suit.md](../../crew/g4c-suit.md)) |
| Magnetometer boom's guillotine | not fitted | fitted | documented | GV, 3.1.2.8 | (the boom is spacecraft 4's alone) |

## The fuel cell module, the radar and the pod

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Fuel cell oxygen | 178.2 lb at launch, 99 per cent of the design load, at 815 psia; "180 lbs on spacecraft 5" | documented | GV, 5.1.7.2.1; SEDR 300 vol. 2, p. 5-33 |
| Fuel cell hydrogen | 23.1 lb at launch, 103.8 per cent; 22.25 lb the design load for a long mission | documented | GV, 5.1.7.2.2; SEDR 300 vol. 2, p. 5-33 |
| Oxygen tank, inside | 20.3 in across | derived | 180 lb at liquid oxygen's density, 71.2 lb/cu ft: 2.53 cu ft, a ball of that width. The density is a handbook figure |
| Hydrogen tank, inside | 25.5 in across | derived | 22.25 lb at liquid hydrogen's density, 4.42 lb/cu ft: 5.03 cu ft |
| The two tanks, outside | 23 in and 28 in across | estimated | 1.3 in of inner shell, insulation and outer shell round each: a guess. No drawing read |
| A fuel cell section | 12.5 in across and 25 in long | estimated | scaled on the hydrogen tank in GV's Figure 3.1-5, which is a sketch in perspective. A figure of about this size is general knowledge and was not found in a source |
| Where the module's four things lie | in a row beyond one of the equipment section's two beams, on the side away from the OAMS module: the two sections at one end, then the hydrogen, then the oxygen | the order and the side documented as drawn; the places estimated | GV, Figure 3.1-5 and its inset; SEDR 300 vol. 2, Figure 5-6; the Technical Summary, Figure 4 |
| Radar antennas | four cups 6.2 in across standing 3.4 in off the face, in a square 8.6 in on a side | estimated | scaled on the face in GV's Figure 3.1-4a |
| Which antenna is which | the reference antenna at one corner, the azimuth antenna beside it across the ship, the elevation antenna beside it toward the top, the transmitting antenna opposite | derived, not established | from what an interferometer needs; the figure's labels do not settle it |
| Pod's body | the transponder, 10 by 10 by 20 in, "the basic component to which all other components are attached" | documented | SEDR 300 vol. 2, Section VIII, p. 8-294 |
| Pod's antennas | two spiral antennas that "extend outward approximately two inches from the case"; the dipole "on the end of a two-foot long fixed boom" | documented; the spirals' diameter (6.6 in) and the dipole's size (4.8 in by 8.4 in) scaled from Figure 8-79 | the same, pp. 8-294 and 8-295 |
| Pod's lights | two "toroid-shaped, xenon-filled" lamps "on opposite sides", each on the case its circuit is in; 80 flashes a minute | documented; the cases' size estimated | the same, p. 8-295 |
| Pod's batteries | two squib batteries, one on either side of the transponder, and a boost regulator beside one | documented; sizes scaled from Figure 8-79 | the same, pp. 8-296 and 8-298 |
| How the pod lies | the transponder's length across the ship, along the band between the section's two beams; one spiral on its aft face and one on an end; the dipole off the other end; a light on its aft face and one on its forward face | estimated | Figure 8-79, a perspective drawing: which of the pod's faces looked aft is not said |
| Pod's place | on the ship's axis, hung under the blast shield's access door: the transponder's middle at Z50 | that it was in the middle and on the door documented; the station estimated | SEDR 300 vol. 2, p. 8-291; GVII, 3.1.1.2 ("the rendezvous evaluation pod mount installed on the blast shield access door of spacecraft 5"). The station is what the mount and the charge's barrel leave under the door |
| Pod's mount | a support assembly with the charge that threw the pod out, and four tubular posts that "extend past the REP" to carry the cover: two end in guide pins, two in the sockets of the cover's springs | documented; every size estimated | SEDR 300 vol. 2, pp. 8-298 and 8-299 and Figure 8-80 |
| Pod's cover | "an oval, plane structure": glass-fibre cloth stretched on a tubular frame, its outer face silvered; thrown off at 100 ft a second by two springs when a guillotine cut their cables | documented | SEDR 300 vol. 2, p. 8-298. Its outline, 29 in across over the pod and running out to 44 in from the axis over the dipole, is scaled from Figure 8-80, which draws it longer one way than the other; its station, Z33.1, is the gold cover's disc's: estimated |

## The experiments

None of the flight's experiments (GV, section 8) is modelled: most were cameras and instruments used
through the windows. The radiometry experiments (D-4 and D-7) had equipment let go by three
cable-cutter guillotines (GV, 3.1.2.8); where it was on the ship is not found.

## Paint

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Re-entry module | black shingles; the nose fairing pale | documented by photograph | NASA S65-43447, the vehicle on the stand (Wikimedia Commons, *Gemini-Titan 5 at Cape Canaveral LC-19 - S65-43447.jpg*) |
| Adapter | white | documented by photograph | the same |
| UNITED STATES and the flag, each side | as on spacecraft 3 | assumed | not legible in the photograph read, which is of the other side: the type's paint as recorded for spacecraft 3 ([gt-3/spacecraft.md](../gt-3/spacecraft.md)) |
| An emblem | none on the ship | by general knowledge | the covered wagon was on the crew's suits ([README.md](README.md), "The name") |
| The white disc forward of the left hatch | left off | | it is spacecraft 3's, and not identified (`white_disc=False`) |

## Weights

| | | Confidence |
| --- | --- | --- |
| At launch | 7,947.17 lb | documented (GV, section 3.3) |
| At retrofire | 5,549.20 lb | documented (the same table) |
| At the start of the entry | 4,733.79 lb | documented |
| At main parachute deployment | 4,355.02 lb | documented |
| At touchdown, without the parachute | 4,244.75 lb | documented |
| OAMS propellant used | 289 lb | documented (GV, 5.1.8) |
| Fuel cell oxygen left at the end | 73 lb, 40.5 per cent | documented (GV, 5.1.7.2.1) |

## What the model gets wrong or leaves out

The type's list is [gemini-spacecraft.md](../../vehicles/gemini-spacecraft.md), "What the model gets wrong or leaves
out". Of what was No. 5's own:

- **Crew posture.** Cooper and Conrad wear their own suits and sit in the ejection seats. Their posture and the drape of the restraints are estimated.
- **The panels are spacecraft 3's**, with spacecraft 4's clock. The fuel cell monitor, the warning lamps, the second
  manoeuvre controller, the Agena control panel and the radiometric selector are not drawn; the pilot's ammeter
  stands where the monitor was.
- **The fuel cell module's sizes are not from a drawing.** Its four things are in the order McDonnell's figures have
  them, on the side of the section his drawing gives the module ([gemini-spacecraft.md](../../vehicles/gemini-spacecraft.md), "Equipment section"); which end the two sections are at is
  read off the figures' insets; the straps, the bands and the struts are scaled from an undimensioned figure. No
  plumbing, no heaters: the heater that failed is inside the oxygen tank and is not built. The tanks' outsides are
  guesses round sizes worked from the loads.
- **The radar is four plain cups.** Their size and spacing are scaled from a sketch; which is which is reasoned, not
  read; the antennas' spirals, the two that turn, and the electronics behind the face are not built.
- **The pod has three documented sizes and one documented place**, and the rest is scaled from one perspective
  drawing without dimensions (SEDR 300 vol. 2, Figure 8-79): which way it lay, which faces carried what, the size of
  every part but the transponder. Its wiring, its connectors and the thermal straps on its lights are not built.
  The mount's charge, the guillotine and the springs are a barrel, four posts and their sockets.
- **How the gold cover was cut for the pod is not known.** The pod's own cover is longer than the gold cover's flat
  disc is wide, so here the gold is cut back to the pod cover's outline, across the hoop and into the cone on the
  side the dipole points. Nothing read shows spacecraft 5's adapter from behind.
- **The OAMS tanks** are one each of fuel, oxidiser and helium, of the early ships' sizes: SEDR 300 vol. 2's Section
  VIII (Figure 8-96 sheet 1, p. 8-346) has "one tank on S/C 5". Where the helium stands is estimated.
- **Docking light and charge experiment.** The Gemini V report, section 3.1.2.9.1(g), puts the light on the adapter. Its position above the crew is assumed from McDonnell’s *Technical Summary*, p. 327. The MSC-1 sensor carries the conducting screen added for this flight (NASA TM X-56861, experiment 10). Its exact clock angle and the screen weave are estimates.
- **Not built:** the radiometry experiments' sensors, the fourth telemetry transmitter and its
  antenna, the nose fairing's piston.
- **The paint** is spacecraft 3's.
- **The flown ship** has not been compared.

## Sources

[docs/sources.md](../../../../../docs/sources.md), "Gemini-Titan 5".
