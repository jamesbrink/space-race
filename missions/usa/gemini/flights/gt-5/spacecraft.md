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
| Rendezvous evaluation pod | in the equipment section, under a silvered glass-fibre cover: a transponder, a dipole and two spiral antennas, two flashing lights, two 24 V silver-zinc batteries | none | documented | GV, 3.1.2.4.2 and Figure 3.1-4b | yes: `pod=True`, the node `RadarEvaluationPod`. Its size, form and place scaled from the figure |
| Docking light | 4,000 beam candlepower, a 6° cone, on the retrograde section | none | documented | GV, 3.1.2.4.2 | no: where on the section is not found |
| Drinking water in the adapter | two tanks "the same configuration as the ... OAMS propellant tank", 150 lb each; one also takes the fuel cells' water behind its diaphragm | four small tanks | documented | GV, 3.1.2.3 and Figure 3.1-3 | yes: `water_spheres=2`, at the early ships' propellant tank's 21.12 in (assumed); places estimated |
| Propulsion | "the same as the spacecraft 4 system" | all sixteen OAMS chambers real, long-life | documented | GV, 3.1.2.7 | yes: `lateral_thrusters=True` |
| Nose fairing | pushed off by a pyrotechnic piston, in the climb (207 s) | a spring, after second stage cutoff | documented | GV, 3.1.2.8 and Table 4.2-I | no difference built |
| G.m.t. clock on the command pilot's panel | as spacecraft 4: "The time reference system was the same" | added on that ship | documented | GV, 3.1.2.5 | yes: `gmt_clock=True` |
| Panels | a fuel cell monitor in place of the ammeter and voltmeter; a panel of warning lamps; a radiometric selector panel; a second manoeuvre controller on the right wall; a range and range-rate indicator; an Agena control panel with the pod's eject switch | | documented | GV, 3.1.2.9.1 | no: the panels are spacecraft 3's with the clock. The range and range-rate indicator is in that drawing already |
| Telemetry | a fourth transmitter and a UHF whip antenna in the adapter, for experiments; a second tape recorder | | documented | GV, 3.1.2.1 and 3.1.2.2 | no |
| Suits | G4C, without the overvisor and the cover layer for going outside | G4C with them for the pilot | documented | GV, 3.1.2.9.2 | no: the seats are empty |
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
| Where the module's four things lie | in a row across the bottom of the equipment section: the two sections at one end, then the hydrogen, then the oxygen | the order documented as drawn; the places estimated | GV, Figure 3.1-5 and its inset |
| Radar antennas | four cups 6.2 in across standing 3.4 in off the face, in a square 8.6 in on a side | estimated | scaled on the face in GV's Figure 3.1-4a |
| Which antenna is which | the reference antenna at one corner, the azimuth antenna beside it across the ship, the elevation antenna beside it toward the top, the transmitting antenna opposite | derived, not established | from what an interferometer needs; the figure's labels do not settle it |
| Pod | a body 20 by 12 by 9 in | estimated | a sixth of the adapter's width in the inset of GV's Figure 3.1-4b |
| Pod's place | on the ship's axis at the adapter's foot, its aft face at Z26.6 | estimated | the same inset puts it in the middle of the foot; it is drawn forward of the crown of the Titan's oxidiser dome, which stands inside the adapter to Z25.1 |
| Pod's cover | a dished disc 44 in across closing a hole in the gold cover | estimated | "a silvered fiber glass cover" is documented (GV, 3.1.2.4.2); its form is not |

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

- **No crew.** The G4C suit is not modelled; the seats are empty, with the harness lying on them.
- **The panels are spacecraft 3's**, with spacecraft 4's clock. The fuel cell monitor, the warning lamps, the second
  manoeuvre controller, the Agena control panel and the radiometric selector are not drawn; the pilot's ammeter
  stands where the monitor was.
- **The fuel cell module is not laid out from a drawing.** Its four things are in the order the report's sketch has
  them and about where its inset puts them; the beam they hang from, their straps and the sections' form are ours.
  No plumbing, no valves, no heaters: the heater that failed is inside the oxygen tank and is not built. The tanks'
  outsides are guesses round sizes worked from the loads.
- **The radar is four plain cups.** Their size and spacing are scaled from a sketch; which is which is reasoned, not
  read; the antennas' spirals, the two that turn, and the electronics behind the face are not built.
- **The pod is a block model**: a body in three boxes, two discs, a boom and two lamps, sized from an inset an inch
  across. Its support, its ejector and its cover's springs are not built. It is put at the level of the adapter's
  own cover, which is as far aft as the crown of the Titan's oxidiser dome lets it be.
- **The equipment section is laid out again for this ship.** The oxygen the crew breathe, the electronic modules and
  the water tanks are moved from where spacecraft 3's layout has them to make room; all of it is placed by guess.
- **The OAMS tanks are spacecraft 3's sizes.** Whether this ship's were larger is not settled.
- **Not built:** the docking light, the radiometry experiments' sensors, the fourth telemetry transmitter and its
  antenna, the nose fairing's piston.
- **The paint** is spacecraft 3's.
- **The flown ship** has not been compared.

## Sources

[docs/sources.md](../../../../../docs/sources.md), "Gemini-Titan 5".
