# Gemini spacecraft No. 4

The ship McDivitt and White flew on 3 June 1965. The spacecraft as a type, with every dimension
and what each rests on, is [gemini-spacecraft.md](../../vehicles/gemini-spacecraft.md); this is
what was No. 4's own, and what [model/vehicle.py](model/vehicle.py) therefore tells the shared
module (`FIT`).

Sources, short: **GIV**, the Gemini IV mission report (MSC-G-R-65-3), whose section 3.1 and Table
3-I list what spacecraft 4 changed from spacecraft 3; **GV**, the Gemini V mission report
(MSC-G-R-65-4), which says what spacecraft 5 changed from this one; **SEDR 300** vol. 1, which
covers spacecraft 3, 4 and 7; the **Smithsonian**'s record of the manoeuvring unit (A19670211000).

## This ship and the others

| | Spacecraft 4 | Before and after | Confidence | Source | In the model |
| --- | --- | --- | --- | --- | --- |
| Structure | "the same production configuration" as the three before | | documented | GIV, 3.1.1 | the type's |
| Power in orbit | six silver-zinc batteries in the adapter's module | three on spacecraft 3; fuel cells on spacecraft 5 | documented | GIV, 3.1.2.6 and Figure 3-11 | yes: `adapter_batteries=6`, in a row as Figure 3-11 draws them. Their size and place are estimated |
| Drinking water in the adapter | four tanks | one on spacecraft 3; two larger on spacecraft 5 | documented | GIV, 3.1.2.3 and Figure 3-6 | yes: `water_tanks=4`, in a cluster as Figure 3-6 has them; form and place estimated |
| OAMS chambers 13 to 16 | operational | dummies on spacecraft 3 | documented | GIV, 3.1.2.7 and Table 3-I | yes: `lateral_thrusters=True` |
| OAMS chambers | boundary-layer-cooled, "long-life" | short-life on spacecraft 3 | documented | GIV, 3.1.2.7 | no |
| OAMS propellant | 164.5 lb of fuel, 245.9 lb of oxidiser | | documented | GIV, 5.1.8.1.1 | the tanks are the type's sizes |
| Rendezvous radar | none | none on spacecraft 3; fitted to spacecraft 5 | documented, by spacecraft 5's report listing it as added | GV, 3.1 and Table 3.1-I | yes: `radar=False`. The forward face is drawn with spacecraft 3's ribbed cover: assumed |
| Extravehicular equipment | a 25 ft umbilical with a tether, a ventilation control module on the chest, a hand-held manoeuvring unit | none before; none on spacecraft 5 | documented | GIV, 3.1.2.3.1 to 3.1.2.3.3 and Figures 3-7 to 3-10 | the umbilical and the manoeuvring unit: `eva=True`, the node `ExtravehicularEquipment`. The chest pack is not built |
| Pilot's hatch | opened in orbit | | documented | GIV, 4.1 | yes: `right_hatch_opens=True`, the node `HatchRight` on its hinge; the flight swings it 100° (estimated) |
| G.m.t. clock on the command pilot's panel | added | a blank on spacecraft 3 | documented; its place as drawn | GIV, 3.1.2.5, Table 3-I and Figure 3-14 | yes: `gmt_clock=True`. A 24-hour dial, as Figure 3-14 draws it; its size is taken to be the pilot's clock's |
| Other panel changes | ACME logic switches to the overhead panel; RCS shutoff switches to the pedestal; fuel-cell purge and crossover switches on the pilot's panel, not connected | | documented | GIV, 3.1.2.9.1 | no: the panels are spacecraft 3's but for the clock, and for RE ENT ANT EXP, which was that ship's experiment and is left off |
| Ejection seats | a new riser retractor, a safety pin on the ejection handle, a lower egress kit | | documented | GIV, 3.1.2.9.4 | the seat is the type's |
| Suits | G4C: redundant closures, a thicker visor; the pilot's with a cover layer, an overvisor and thermal gloves | G3C on spacecraft 3 | documented | GIV, 3.1.2.9.2 | no: the seats are empty |
| Drogue mortar | aluminium breech | steel on spacecraft 3 | documented | GIV, 3.1.2.8 | said on the part |
| Nose fairing | released by a spring after a cable was cut, after second stage cutoff | a pyrotechnic piston on spacecraft 5 | documented | GV, 3.1.2.8; SEDR 300, p. 4-53 | no difference built |
| Transponder, antennas | C-band in the adapter; a second HF whip antenna in the adapter | S-band, one whip, on spacecraft 3 | documented | GIV, 3.1.2.1 | no |
| Urine disposal | a direct overboard dump added | | documented | GIV, 3.1.2.3 | no |

## The extravehicular equipment

| Item | Value | Confidence | Source | In the model |
| --- | --- | --- | --- | --- |
| Umbilical | 25 ft; oxygen at 9.0 lb/hr, a restraint tether, and the electrical leads for voice and bioinstrumentation | documented | GIV, 3.1.2.3.1 | 25 ft of hose coiled in four layers of four turns. Its thickness (0.8 in) and the coil are estimated; gold, as the photographs of the walk show it |
| Where it was stowed | a pouch in the right aft food box (container 6) | documented | GIV, Table 3-III items 60 and 61; Figure 3-15 | drawn beside the manoeuvring unit, between the seats' heads: the food box is not built |
| Manoeuvring unit | two tractor jets of 1 lb and one pusher of 2 lb; two egress-kit oxygen bottles; in two sections, put together by the pilot before he went out | documented | GIV, 3.1.2.3.3 and Figure 3-10 | drawn put together, its arms folded |
| Its size | folded 17 by 10 by 3 in; overall 2 ft 8 in by 1 ft 2 in by 9 in; 6.8 lb | documented | the Smithsonian's record, A19670211000 | the folded envelope; the handle, bottles, regulator and arms inside it are scaled from Figure 3-10, which has no scale: estimated |
| Where it was stowed | in a glass-fibre container in the centre stowage box (container 7), between the seats' heads | documented; the box's place is Figure 3-15's, which has no dimensions | GIV, Table 3-III items 33 and 64 | just forward of the stowage box the cabin has there: estimated |
| How long its gas lasted | about 4 minutes | documented | GIV, 5.1.10.4.4 | said on the part |
| Ventilation control module | on the chest: a demand regulator and an egress-kit bottle of emergency oxygen | documented | GIV, 3.1.2.3.2 and Figure 3-9 | not built |
| Cameras | a 16 mm camera mounted outside by the pilot; a 35 mm camera on the manoeuvring unit | documented | GIV, 7.1.1 and 5.1.10.4.4 | not built |

## The experiments

| Experiment | Where | Confidence | Source | In the model |
| --- | --- | --- | --- | --- |
| MSC-2, proton-electron spectrometer | "in the equipment adapter section on a support assembly fixed to the center of the equipment adapter section blast shield door"; the sensor's face "will look to the rear"; 12.5 lb | documented; its form estimated | GIV, 8.4.2; the press kit (release 65-158), p. 52 | yes: a case under the middle of the blast shield with a sensor looking aft |
| MSC-3, tri-axis magnetometer | an electronics unit and sensors in the equipment section, the sensors on a boom "which can be extended beyond the end of the adapter"; 3.5 lb; its lock released by a guillotine | documented; where round the adapter and its form estimated | GIV, 8.5.2 and 3.1.2.8; the press kit, p. 53 | yes: a boom stowed along the adapter's wall with the sensor at its aft end |
| MSC-1, electrostatic charge | a sensor "flush with the outer surface of the spacecraft" in the adapter, behind a door opened by a pyrotechnic device | documented | the press kit, p. 51; GIV, 3.1.2.8 | no: where in the skin is not found |
| D-8, D-9, MSC-10, S-5, S-6, M-3, M-4, M-6 | in the cabin, or done by the crew with hand-held equipment | documented | GIV, section 8 | no |

## Paint

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Re-entry module | black shingles; the nose fairing pale | documented by photograph | the liftoff in colour (Wikimedia Commons, *GT-4 Launch - GPN-2000-001014.jpg*, a NASA photograph) |
| Adapter | white | documented by photograph | the same |
| UNITED STATES and the flag, each side | as on spacecraft 3 | assumed | not legible in the photographs read: the type's paint as recorded for spacecraft 3 ([gt-3/spacecraft.md](../gt-3/spacecraft.md)) |
| The white disc forward of the left hatch | left off | | it is in two photographs of spacecraft 3 and not identified; nothing says this ship had it (`white_disc=False`) |

## Weights

| | | Confidence |
| --- | --- | --- |
| At launch | 7,879.05 lb | documented (GIV, section 3.3) |
| At retrofire | 5,432.44 lb | documented (the same table) |
| At the start of the entry | 4,725.71 lb | documented |
| At main parachute deployment | 4,415.30 lb | documented |
| At touchdown, without the parachute | 4,305.05 lb | documented |
| Centre of gravity at launch | Z105.32; 1.29 in and 1.43 in off the axis | documented |
| Oxygen | primary 52 lb, secondary 13 lb | documented as the plan (the press kit, release 65-158) |

## What the model gets wrong or leaves out

The type's list is [gemini-spacecraft.md](../../vehicles/gemini-spacecraft.md), "What the model gets wrong or leaves
out". Of what was No. 4's own:

- **No crew.** The G4C suit is not modelled; the seats are empty, with the harness lying on them.
- **The panels are spacecraft 3's**, with the clock added and that ship's experiment switch left off. The switches
  this ship moved are where spacecraft 3 had them.
- **The extravehicular equipment is not where it was stowed, and not as it was stowed.** The manoeuvring unit went
  up in two pieces in a container in the centre stowage box, and the umbilical in a pouch in the food box beside it;
  here the unit is put together and both lie between the seats' heads, forward of the one stowage box the cabin
  model has there. The unit's parts are scaled from a photograph, and its camera is left off. The chest pack, the
  umbilical's guide on the hatch's sill, the hatch-closing lanyard and the cameras are not built.
- **The hatch opens 100°** by eye, about a hinge line that is a meridian of the cone; its travel and the lanyard
  that limited it are not from a drawing. The command pilot's hatch does not open.
- **The forward face's cover** is spacecraft 3's, as photographed in January 1965: assumed for this ship.
- **The adapter's batteries, water tanks, spectrometer and magnetometer boom** are documented to exist and to be
  about where they are; their forms and exact places are estimated. The boom is shown stowed.
- **Not built:** the electrostatic charge sensor and its door, the second HF whip antenna, the C-band transponder,
  the long-life chambers' differences, the urine dump line.
- **The paint** is spacecraft 3's.
- **The flown ship** has not been compared.

## Sources

[docs/sources.md](../../../../../docs/sources.md), "Gemini-Titan 4".
