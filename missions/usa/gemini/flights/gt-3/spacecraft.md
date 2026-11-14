# Gemini spacecraft No. 3

The ship Grissom and Young flew on 23 March 1965. The spacecraft as a type, with every dimension
and what each rests on, is [gemini-spacecraft.md](../../vehicles/gemini-spacecraft.md); this is
what was No. 3's own, and what [model/vehicle.py](model/vehicle.py) therefore tells the shared
module (`FIT`).

It left McDonnell on 3 January 1965 after systems tests that began the previous September (final
mating 13 to 27 September, altitude chamber from 12 November, acceptance on 22 December:
*Chronology*, p. 156), was photographed at the Cape's boresight range on 6 January (NASA
S65-13395, "final configuration"), and was mated to GLV-3 on Complex 19 in February (S65-17337).

Sources, short, as in the type's record: **SEDR 300** vol. 1 (which marks what is spacecraft 3's);
**GIV**, the Gemini IV mission report, whose section 3.1 and Table 3-I list what spacecraft 4
changed from spacecraft 3; the **press kit**, NASA release 65-81.

## This ship and the others

| | Spacecraft 3 | Later ships | Confidence | Source | In the model |
| --- | --- | --- | --- | --- | --- |
| Power in orbit | three silver-zinc batteries of 400 Ah in the adapter (magnesium cases, 118 lb each); no fuel cell | six on spacecraft 4; fuel cells on spacecraft 5 and most ships after it | documented | SEDR 300, pp. 5-3 and 5-16; GIV, 3.1.2.6; press kit, p. 38 | yes: `adapter_batteries=3`. Their size and place are estimated |
| Batteries in the re-entry module | four main, 45 Ah; three squib, 15 Ah | the same | documented | SEDR 300, p. 5-16 | no |
| Rendezvous radar | none: "Radar equipment is not carried for this flight" | carried from spacecraft 5 | documented | press kit, p. 37 | yes: `radar=False`. The face is closed by a flat ribbed cover, as S65-13395 shows it in January; what was behind it is not found |
| OAMS chambers 13 to 16 (translate right, left, up, down) | dummies | real on spacecraft 4 | documented | GIV, 3.1.2.7 and Table 3-I; which chambers: Figure 3-13 | yes: `lateral_thrusters=False`. They are in their ports, in another material, and say so |
| OAMS chambers | short-life | boundary-layer-cooled, "long-life", from spacecraft 4 | documented | GIV, 3.1.2.7; *Chronology*, p. 191 | no |
| Burst diaphragms in the B packages (re-entry control and OAMS) | not installed | installed | documented | GIV, 3.1.2.7 | no |
| Radar transponder in the adapter | S-band | C-band | documented | GIV, 3.1.2.1 | no |
| HF whip antenna | one, in the re-entry module | a second in the adapter | documented | GIV, 3.1.2.1 | no |
| Drinking water tanks in the adapter | one | four on spacecraft 4 | documented | GIV, 3.1.2.3 | yes: `water_tanks=1`; estimated in form and place |
| Urine disposal | through the launch-cooling heat exchanger only | a direct overboard dump added | documented | GIV, 3.1.2.3 | no |
| Extravehicular provisions | none | spacecraft 4 carried an umbilical, a ventilation control module and a hand-held manoeuvring unit | documented for spacecraft 4 as additions; not stated of spacecraft 3 in so many words | GIV, 3.1.2.3.1 to 3.1.2.3.3 | none modelled; no hand-holds |
| Drogue mortar | steel breech | aluminium | documented | GIV, 3.1.2.8 | said on the part |
| Z100 separation sensor switches | fitted | removed | documented | GIV, 3.1.2.6 | no |
| Panels | ACME logic switches on the pedestal; re-entry control shutoff switches on the pilot's panel; no G.m.t. clock on the command pilot's | moved, and a clock added | documented | GIV, 3.1.2.9.1 and 3.1.2.5; SEDR 300, Figure 3-5 sheets 1 and 2 "(S/C 3)" | yes: the panels are this ship's, with the blank where the clock came later, the re-entry control switches on the pilot's panel, ACME logic on the pedestal, and RE ENT ANT EXP on the right-hand wall |
| Ejection seats | as built | a new riser retractor, a safety pin on the ejection handle, a lower egress kit | documented | GIV, 3.1.2.9.4 | the seat is the type's: the Smithsonian's A19710058000, a spare that had been fitted in this spacecraft, is one of the two it is drawn from |
| Suits | G3C | G4C | documented | GIV, 3.1.2.9.2 | modelled ([g3c-suit.md](../../crew/g3c-suit.md)); the men are not aboard |
| Structure | "the same production configuration" as spacecraft 1, 2 and 4 | | documented | GIV, 3.1.1 | the type's |
| Recovery light | came on with the main parachute's jettison | a switch added | documented | SEDR 300, p. 4-26; GIV, 3.1.2.11 | no |

## The experiments

| Experiment | Where | Confidence | Source | In the model |
| --- | --- | --- | --- | --- |
| Sea urchin egg growth (Ames; R. S. Young) | a metal cylinder 3 1/4 in across and 6 3/4 in long, 25.4 oz, "mounted inside the cabin on the left hatch" | documented; where on the hatch estimated | press kit, pp. 28 and 29 | yes, on the left hatch's inner face |
| Zero gravity and radiation on white blood cells (Oak Ridge; M. Bender) | an aluminium box 3.7 by 1.3 by 3.8 in, about 1 lb, "on the right hatch inside the cabin" | documented; where on the hatch estimated | press kit, pp. 29 and 30 | yes, on the right hatch's inner face |
| Re-entry communications (Langley) | "the inside surface of the spacecraft's right main landing gear door"; about 85 lb; a nitrogen-pressurised water tank, a timer and injection nozzles; a switch in the cabin, thrown by the pilot | documented; the door's place on the cone estimated; the nozzles' place on the door from NASA's drawing | press kit, pp. 26 to 28; NASA S64-04925 (the door, the plate of three "fluid injection nozzles" near its forward end, an arming receptacle half way along it; no dimensions) | the plate with its three nozzles on the right landing gear door at Z157, the arming receptacle at Z138, and a tank behind |

The first failed when its handle broke; the other two worked (*Chronology*, pp. 189 to 191; *On the
Shoulders of Titans*, pp. 235 and 236).

## Paint

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| UNITED STATES, two lines, white, and the flag under it | on the cabin's left side, below the hatch's hinge: UNITED about Z137.5, STATES about Z131.5, the flag about Z118 | estimated | the colour photograph of the liftoff (Wikimedia Commons, *Gemini 3 - Liftoff.jpg*) |
| The same on the right side | assumed | estimated | S65-10461, which is taken as GLV-2 and spacecraft 2, shows white marks in the same place on the other side. No photograph of this ship's right side has been read |
| A name | none | documented by photograph | no name shows in S65-13395, S65-21881 or the liftoff; the name was never official ([README.md](README.md)) |
| A mission emblem | none | by photograph; the rest general knowledge | none shows in the photographs; the first crew emblem is generally given as Gemini V's |
| Adapter | white all over; no stripes and no gold tape visible | documented by photograph | S65-17337 (the equipment section close to), S65-21881 and the liftoff. The liftoff shows fine lines down the equipment section, which are not modelled |
| Re-entry module | black shingles; the nose fairing pale | documented by photograph | S65-13395 (before the nose fairing was fitted); the liftoff |

## Weights

| | | Confidence |
| --- | --- | --- |
| At launch | 7,111 lb | documented (*Chronology*, Appendix 1, Table A). The press kit: "approximately 7,000 pounds" |
| Re-entry module at landing | "about 4,700 pounds" | documented as the plan (press kit, p. 39) |
| OAMS propellant | "approximately 300 pounds" | documented as the plan (press kit, p. 8) |
| OAMS propellant as flown, by the cabin's gauge | 84 per cent before the first burn and 65 after it; 66 and 61 round the second ("I'm not real sure of that before"); 50 before the third and 22 after it | documented, as called (the voice transcript, at 1:27:55, 1:35:05, 2:21:09, 4:21:17 and 4:24:18). A gauge's reading, not a weight |
| Oxygen | primary 15.3 lb, secondary 13 lb | documented as the plan (press kit, p. 8) |
| Centre of gravity offset in the entry | 1.43 in | documented (GIV, p. 5-4) |

The weights as flown (at liftoff by item, at retrofire, at landing) are in the mission report,
which has not been found. No other source read gives one: the 7,111 lb is the programme's table,
and the rest are the press kit's round figures from a week before.

## What is assumed, and what is not known

- **Everything the type's record lists** as estimated or left out is so of this ship:
  [gemini-spacecraft.md](../../vehicles/gemini-spacecraft.md).
- **The right side's paint** is the left's, mirrored.
- **The panels as flown** are SEDR 300's Figure 3-5 sheets 1 and 2, which are captioned for this
  spacecraft; the GT-3 mission report, which would say what was changed before the flight, has
  not been found.
- **The cover on the forward face** is as photographed on 6 January; whether it flew so is not
  established.
- **The crew are not in their seats.** Grissom and Young are modelled in the G3C suits they wore,
  from the Smithsonian's photographs of the two flown suits and NASA's of the day
  ([g3c-suit.md](../../crew/g3c-suit.md)), and seated they do not fit the crew station as it is
  laid out: Grissom's helmet is 1.7 in and Young's 2.3 in through the hatch's inner skin, and
  both men's feet are through the vessel's floor forward of the stirrups. The model script keeps
  them out (`CREW_ABOARD` in [model/vehicle.py](model/vehicle.py)) and every build prints the
  misfit as it then stands; the cabin has to be laid out again round them first. The seats' eye
  points are therefore still the empty seat's (a seated man of average build), not either man's
  own. Neither man's stature is in a primary source that was read: 5 ft 7 in and 5 ft 9 in are
  estimates.
- **The flown ship** is at the Grissom Memorial at Mitchell, Indiana, and has not been compared.

## Sources

[docs/sources.md](../../../../../docs/sources.md), "Gemini-Titan 3".
