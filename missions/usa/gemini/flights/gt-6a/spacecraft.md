# Gemini spacecraft No. 6

The ship Schirra and Stafford flew on 15 December 1965, and sat in for two counts before that. The
spacecraft as a type, with every dimension and what each rests on, is
[gemini-spacecraft.md](../../vehicles/gemini-spacecraft.md); this is what was No. 6's own, and what
[model/vehicle.py](model/vehicle.py) therefore tells the shared module (`FIT`).

The flight's own mission report (MSC-G-R-66-2), whose section 3.1 would list what spacecraft 6
changed from spacecraft 5, **has not been found** ([README.md](README.md)). What is here is put
together from the documents that name this ship in passing.

Sources, short: **SEDR2**, SEDR 300 vol. 2 (McDonnell, 1 July 1966), the manual for the rendezvous
ships, which marks what was "S/C 6 only"; **GVII**, the Gemini VII mission report (MSC-G-R-66-1),
whose section 3.1 says what spacecraft 7 lacked that 5 and 6 had and what was "effective with
spacecraft 6"; **GV**, the Gemini V mission report; **kit**, NASA release 65-362, the press kit for
the two flights; **SP-121**, the *Gemini Midprogram Conference*; ***Titans***, *On the Shoulders of
Titans*; **S65-64040**, NASA's photograph of this ship taken from Gemini 7 at about 38 ft.

## This ship and the others

| | Spacecraft 6 | Spacecraft 5 | Spacecraft 7 | Confidence | Source | In the model |
| --- | --- | --- | --- | --- | --- | --- |
| Structure | the type's | the same | the same | assumed | no statement read for this ship | the type's |
| Power in orbit | three silver-zinc batteries, 400 Ah, 16 cells, magnesium cases, about 118 lb each, in an adapter battery module | fuel cells | fuel cells | documented | SEDR2, pp. 5-3 and 5-22 and Figure 5-9; kit, p. 61; SP-121, p. 8 | yes: `adapter_batteries=3`, `battery_module=True`, `fuel_cells=False`. Sizes and places below |
| Reactant supply | none: "not applicable to spacecraft 6" | hydrogen and oxygen tanks | the same, the hydrogen tank better insulated | documented | SEDR2, p. 5-3 | none built |
| Rendezvous radar | on the forward face of the rendezvous and recovery section; under 2 cu ft, 50 lb and 80 W | the same radar, first flown | none: a transponder in its place | documented | GVII, 3.1.1.1 and 3.1.2.4; kit, pp. 59 and 60 | yes: `radar=True`, spacecraft 5's four cups |
| Docking fittings | an index bar and three mooring latch receptacles on the rendezvous and recovery section, the receptacles under the nose fairing at launch; an encoder to command the Agena | none (the encoder, yes) | none | documented that it was built so; **assumed** that they flew in December | SEDR2, p. 4-23 (the latch release wired on "spacecraft 6 and 8 through 12") and Figure 13-2, though its Section XIII, written in 1966, heads the docking system "spacecraft 8 through 12"; GVII, 3.1.2.4 (the encoder "on spacecraft 5 and 6"); SP-121, p. 218 (the ship in bonded storage between the counts) | yes: `mooring_latches=True`, the three receptacles round the rim of the forward face. The index bar, stowed at launch, and the encoder are not built. Sizes below |
| Rendezvous evaluation pod | none | carried | none | documented | SEDR2, p. 2-19: "on spacecraft 5 only" | none |
| Docking light | carried, and used to light Gemini 7 for a photograph at night | 4,000 beam candlepower on the retrograde section | carried | documented that it had one | SP-121, p. 326 (Gemini 7 "photographed at night", lit by "the Gemini VI-A docking light": Figure 33-2); GV, 3.1.2.4.2, for spacecraft 5's | no: where on the section is not found |
| Drinking water in the adapter | one storage tank, pressurised with oxygen from a small tank beside it, at the end of the battery module | two tanks of the OAMS tank's pattern | those two and a third in the retrograde section | documented | SEDR2, p. 6-18 and Figure 6-10 sheets 1 and 3 ("Detail B, S/C 6 only") | yes: it is part of `battery_module=True`. Size below |
| OAMS tanks | two of fuel, two of oxidiser and two of helium: "one tank on S/C 5, two tanks on S/C 6, 8 & 9" of fuel, "two tanks on S/C 6, 8 & up" of oxidiser and of helium, "connected in parallel" | one of each | one of each, and a reserve fuel tank | documented | SEDR 300 vol. 2, Section VIII (the supplement), Figure 8-96 sheet 1, p. 8-346, and Figure 8-94, p. 8-342 | yes: `oams_tanks=2`. Sizes and places below |
| OAMS propellant | 669 lb announced; tankage for a rendezvous sized at 700 lb | 289 lb used in eight days | 423 lb announced | documented as announced | kit, p. 59; SP-121, p. 158 | (the tanks: the row above) |
| Thrusters | all sixteen OAMS chambers real | the same | the same, with heaters added | assumed | from spacecraft 4 on (GIV, 3.1.2.7); nothing read for this ship | yes: `lateral_thrusters=True` |
| Hatch latches | a redesigned mechanism, "effective with spacecraft 6" | the earlier one | the new one | documented | GVII, 3.1.1.1 | no difference built |
| Elapsed-time clock | "a mission-elapsed-time clock to spacecraft 6 and subsequent spacecraft" | none | a digital one in the centre panel, in place of the flight plan roller | documented that it had one; **assumed** that it stood where spacecraft 7's did | SP-121, p. 63; GVII, 3.1.2.5 | yes: `get_clock=True`, as spacecraft 7's is drawn; its form estimated |
| G.m.t. clock on the command pilot's panel | taken to be as spacecraft 4 and 5 | as spacecraft 4 | as spacecraft 5 | assumed | GV, 3.1.2.5, for spacecraft 5 | yes: `gmt_clock=True` |
| Electrical instruments | a voltmeter and an ammeter with selector switches on the right-hand panel, and the two-needle ammeter spacecraft 5 had; no fuel cell monitor | a fuel cell monitor | the same as 5 | documented | SEDR2, p. 5-6 | no: the panels are spacecraft 3's with the two clocks |
| HF antenna switch | three positions, sprung to centre, "effective with spacecraft 6" | two | three | documented | GVII, 3.1.2.9.1 | no |
| Water dispenser | one that metered what each man drank | plain | metering | documented | SP-121, p. 67 | no |
| Suits | G4C | G4C | G5C | documented | SP-121, p. 64 | no: the seats are empty |
| Experiments | three announced: synoptic weather and terrain photography, and radiation in the spacecraft, with seven sensors about the cabin | | | documented as announced | kit, p. 35 | none |

## The battery module, the water tank and the docking fittings

Sizes and places are the shared module's, and are filled in from the figures named: none of them is
dimensioned.

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Adapter batteries | three, 400 Ah, about 118 lb each | documented | SEDR2, p. 5-22 |
| A battery's size | 12 in by 7.4 in by 10 in along the ship | estimated | the type's, as spacecraft 3's three are drawn. SEDR2, Figure 5-9, shows three ribbed cases side by side under the module's beam and gives no dimension |
| The module's place | a band across the equipment section 26 in below its middle: a beam 84 in long at Z53.5, the three batteries hung under it to the right of the middle and the water tank to the left | estimated | the inset of SEDR2, Figure 5-9, and Figure 6-10 sheet 3, which is the same drawing. The beam's section is ours |
| Water tank | one ball 13.5 in across, its halves flanged round the middle, at the end of the row of batteries | estimated | SEDR2, Figure 6-10 sheets 1 and 3, where it is 1.8 times a battery's width. Its capacity is not given for this ship. 13.5 in is also the size worked out for spacecraft 7's 42 lb tank C ([gt-7/spacecraft.md](../gt-7/spacecraft.md)), which may be the same tank: not established |
| Oxygen pressurant tank | a ball 5 in across beside the water tank | estimated | SEDR2, Figure 6-10 sheet 3, which draws a small bottle and a shutoff valve; its size is a guess, and the valve is not built |
| OAMS tanks, sizes | fuel 21.13 in across, oxidiser 21.12 in, each of 5,355 cu in; helium 16.20 in | documented | SEDR 300 vol. 2, Section VIII, pp. 8-359 and 8-362, for the rendezvous ships; the helium tank's is vol. 1's (p. 8-263), taken for these. (A ball 21.13 in across is 4,940 cu in: the manual's two figures do not agree.) Two tanks of each propellant at 5,355 cu in are room for about 338 lb of fuel and 560 lb of oxidiser, at 54.6 and 90.3 lb/cu ft, which are handbook densities: the 669 lb announced fits |
| OAMS tanks, places | the four propellant tanks in an arc across the top of the section, 36 in from the axis at 20° and 60° either side of the top, the fuel tanks the middle two, at Z44; the two of helium side by side below them at Z46 | estimated | SEDR 300 vol. 2, Section VIII, Figure 8-94, draws the four in a row round the arc of the module's frame against the wall, in perspective; which is fuel and which oxidiser is read from its leaders as near as they can be followed |
| Mooring latch receptacles | three, "equally spaced around the forward perimeter" of the rendezvous and recovery section, shielded by the nose fairing during boost; the lower one is the fairing's pivot. Here at the bottom and 60° either side of the top, each a block 3.2 in round the rim, 1.5 in deep and standing 1.1 in forward of it, with a catch along its inboard edge | documented as to number and place; size and form estimated | SEDR2, pp. 13-5 and 13-18 and Figure 13-2; S65-64040 shows a notch at the bottom of this ship's rim |
| Index bar | a bar in a housing on the section, run out by a cartridge in orbit and thrown off before retrofire: stowed at launch | documented | SEDR2, pp. 13-5 and 13-20 and Figure 13-2. Not built: stowed, nothing of it shows, and S65-64040 shows none run out |
| Radar antennas | four, as spacecraft 5's are built | estimated | the shared module's, from GV's Figure 3.1-4a; S65-64040 shows two dark round antennas in red rings on this ship's face and the rest of the face in glare |

## The experiments

None is modelled. The two photography experiments were hand-held cameras; the radiation experiment
had seven sensors "located throughout the spacecraft", one under a shield the crew removed over the
South Atlantic (kit, p. 35). Where they were is not found.

## Paint

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Re-entry module | black shingles | documented by photograph | S65-64040 (Wikimedia Commons, *Gemini 6 Beat Army sign.jpg*) |
| Adapter | white, with fine parallel lines on it, taken to be the radiator's coolant tubes | documented by photograph | the same |
| UNITED STATES and the flag, right side | white letters in two lines, the flag aft of them | documented by photograph | the same: the side seen is the crew's right, the picture being taken from ahead with the ship's top uppermost |
| The same, left side | as the right | assumed | not in the photograph |
| The white strip along the top | from the cabin up over the re-entry control section | documented by photograph | the same |
| Red about the hatches | red at the hatches' sills and at the aft corners of the cabin | seen in the photograph, not identified | not modelled |
| An emblem or name | none on the ship | by the photograph, for the side seen | |
| The white disc forward of the left hatch | left off | | it is spacecraft 3's, and not identified (`white_disc=False`) |

## Weights

| | | Confidence |
| --- | --- | --- |
| At launch | 7,817 lb | documented (SP-4002, Appendix 1, Table A, read on the page); *Titans*, p. 272, has 3,553 kg |
| OAMS propellant, announced | 669 lb | documented as announced (kit, p. 59) |
| Fuel used in the rendezvous | 113 lb, 62 per cent of the propellant left | documented (*Titans*, p. 288) |
| At retrofire and at landing | not found | |

## What the model gets wrong or leaves out

The type's list is [gemini-spacecraft.md](../../vehicles/gemini-spacecraft.md), "What the model gets wrong or leaves
out". Of what was No. 6's own:

- **No list of this ship's changes has been read.** What is built is what the manual and the neighbouring reports
  happen to say of it; something its own report lists may be missing here without our knowing.
- **No crew.** The G4C suit is not modelled; the seats are empty, with the harness lying on them.
- **The mooring latch receptacles are assumed to have flown.** The ship was built with them and stored between the
  counts; no source read says they were on it, or off it, on 15 December. They are three blocks sized from one
  perspective figure and one photograph. The index bar, which was stowed, the umbilical receptacle and pads and
  the UHF antenna that McDonnell's figure puts on the same face are not built.
- **The OAMS tanks are placed by guess.** That there were two of each is McDonnell's schematic; the drawing that
  shows where they stood is a perspective sketch, and the module's curved frame that carried them is not built.
- **The battery module is scaled from an undimensioned figure**: three boxes, a beam, a ball and a smaller ball
  about where McDonnell's sketch has them. The batteries' ribs are not drawn. No wiring, no coldplates, no plumbing.
- **The panels are spacecraft 3's**, with spacecraft 4's clock and the elapsed-time clock, whose place on this
  ship is assumed from spacecraft 7's and whose form is estimated. The voltmeter and ammeter, the Agena's control
  panel and the encoder are not drawn.
- **The radar is spacecraft 5's four plain cups**, sized from a sketch of that ship's.
- **The equipment section's other contents** (the oxygen the crew breathe, the electronic modules) are placed by
  guess, as on the other ships, and the gold cover across the foot is the type's shallow dish: on spacecraft 7,
  photographed from this ship, it is a deep funnel ([gt-7/spacecraft.md](../gt-7/spacecraft.md)).
- **Not built:** the docking light, the radiation experiment's sensors, the new hatch latches, the red seen about
  the hatches in the photograph.
- **The paint on the left side** is taken from the right.
- **The flown ship** has not been compared.

## Sources

[docs/sources.md](../../../../../docs/sources.md), "Gemini-Titan 7 and Gemini-Titan 6A".
