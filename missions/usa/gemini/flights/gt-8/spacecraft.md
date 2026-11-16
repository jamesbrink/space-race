# Gemini spacecraft No. 8

The ship Armstrong and Scott flew on 16 March 1966: the first Gemini to dock. The spacecraft as a
type, with every dimension and what each rests on, is
[gemini-spacecraft.md](../../vehicles/gemini-spacecraft.md); this is what was No. 8's own, and what
[model/vehicle.py](model/vehicle.py) therefore tells the shared module (`FIT`). What it docked with
is [agena-target-vehicle.md](../../vehicles/agena-target-vehicle.md) and
[target-docking-adapter.md](../../vehicles/target-docking-adapter.md).

Sources, short: **GVIII**, *Gemini Program Mission Report, Gemini VIII* (MSC-G-R-66-4, April 1966),
whose section 3.1 and Table 3.1-I list what spacecraft 8 changed from spacecraft 6, its fuel cells
against spacecraft 7's and its extravehicular equipment against spacecraft 4's; **SEDR2**, SEDR 300
vol. 2 (McDonnell, 1 July 1966), the manual for the rendezvous ships; **TS**, *Project Gemini: A
Technical Summary* (NASA CR-1106); **SP-149**, *Summary of Gemini Extravehicular Activity*;
**kit**, NASA release 66-52, the press kit; **GIX**, the Gemini IX-A mission report, for what the
next ship shared.

## This ship and the others

| | Spacecraft 8 | Spacecraft 6 | Spacecraft 7 | Confidence | Source | In the model |
| --- | --- | --- | --- | --- | --- | --- |
| Structure | the type's, with provisions for a man outside | the type's | the type's | documented | GVIII, 3.1.1 | the type's |
| Power in orbit | two fuel cell sections, "the same as the Spacecraft 7 Fuel Cell Power System except hydrogen regenerative cooling line and insulation on hydrogen supply tank were not incorporated" | three batteries | fuel cells | documented | GVIII, 3.1.2.6 and Table 3.1-I | yes: `fuel_cells=True`, `fuel_cell_row=True`, `hydrogen_insulated=False` |
| Fuel cell module's arrangement | a section, the oxygen tank, the other section, the hydrogen tank, in a row | none | the two sections at one end | documented | SEDR2, Figure 5-7, "RSS/Fuel Cell Module (S/C 8 & 9)" | yes; which end is which, and every place, estimated |
| Reactants | 5.80 lb of hydrogen and 46.0 lb of oxygen: the manual's loads for a short mission | none | 22 lb and 180 lb | documented as the manual's; this ship's own loading was not read | SEDR2, p. 5-33 | yes: tanks 18.8 in and 15.4 in across, derived from the loads |
| Water | two tanks of 42 lb: tank A in the equipment section, sent up with nitrogen at 19 psia; tank B in the retrograde section, with 36 lb of drinking water | one tank | two large and a third of 42 lb | documented | GVIII, 3.1.2.3.5 and Figure 3.1-2; SEDR2, Figure 6-10 sheet 6 | yes: `module_water_tank=True`, `retro_water_tank=True`. Tank A's place estimated |
| Rendezvous radar | on the forward face | the same | none | documented as unchanged | GVIII, Figure 3.1-1 | yes: `radar=True`, spacecraft 5's four cups |
| Docking fittings | an index bar ("docking bar") and three mooring latch receptacles on the forward section; an umbilical connector and two pads on its face | the same, for an Agena that was lost | none | documented | GVIII, Figures 3.1-1 and 3.1-9; SEDR2, pp. 13-3 to 13-21, "spacecraft 8 through 12" | yes: `mooring_latches=True`, `index_bar=True`; the bar runs out on the slider. The connector, pads and latch covers are not built |
| Index bar's travel | 13.82 in | | | documented | TS, p. 241 | yes |
| Docking light | "a 4000 candlepower rendezvous-docking light ... mounted externally on the retrograde section (centered above and just aft of the heads of the flight crew)" | carried | carried | documented | TS, p. 327; GVIII, Figure 3.1-1 | yes: `docking_light=True`. Its station and form estimated |
| OAMS tanks | two of fuel, two of oxidiser, two of helium, and a reserve fuel tank | two of each, no reserve | one of each and a reserve | documented | SEDR2, Section VIII, Figure 8-96; GVIII, 3.1.2.7.2 and Table 3.1-I | yes: `oams_tanks=2`, `oams_reserve_tank=True` |
| OAMS propellant | 420.04 lb of oxidiser and 346.6 lb of fuel loaded, 14.5 lb of the fuel in the reserve tank; 563 lb used | 669 lb announced | 428 lb | documented | GVIII, Table 5.1.8-I and pp. 5-85 to 5-90 | (the tanks) |
| Thrusters | all sixteen real; redundant heaters on the sixteen oxidiser valves | real | real, with heaters | documented | GVIII, 3.1.2.7.1 | yes: `lateral_thrusters=True`; the heaters not built |
| Handrails | two behind the right hatch, flush at launch: 21 in on the retrograde section, 46 in on the equipment section, 0.55 by 1.25 in, 9 in apart, 1.5 in off the skin when out | none | none | documented | GVIII, 3.1.2.12.1 and Figure 3.1-9; SP-149, p. 5-6 | yes: `handrails=True`; they stand out on the slider. Their place round the ship estimated |
| Velcro | patches of hook a foot apart: forward from the right hatch to the docking bar, round both ends of the adapter, and from the left hatch aft | none | none | documented | GVIII, 3.1.2.12.1 | no |
| Light for a man outside | "added to the forward end of the adapter assembly and ... pointed aft" | none | none | documented | GVIII, 3.1.2.12.1 | yes: `eva_light=True`; its form a guess |
| At the back of the adapter | handholds and foot supports held folded by a cable; floodlights; the gold cover "redesigned to accommodate the ESP, the handholds, and the foot supports" | a plain cover | a plain cover | documented | GVIII, 3.1.2.12.1 and Figure 3.1-10; SEDR2, p. 16-25 and Figure 16-2 | yes: `backpack="esp"`. Their places and the cover's opening estimated |
| Extravehicular Support Package | a backpack 26 by 21 by 17 in, 92 lb, with 7 lb of oxygen and 18 lb of Freon 14, "mounted in the center rear of the adapter section" | none | none | documented | GVIII, 3.1.2.12.4 and Figure 3.1-11; kit, pp. 40 to 43 | yes: the node `ExtravehicularSupportPackage`. That it hung on a torque box as spacecraft 9's pack did (GIX, Figure 8.1-18) is assumed; its outside is estimated |
| Chest pack (ELSS) | 18 by 10 by 6 in, 42 lb, stowed in the cabin | none | none | documented | GVIII, 3.1.2.12.3; kit, p. 40 | no |
| Hatches | a ratchet on each to hold it part open; the left given the right's closing gear | plain | plain | documented | GVIII, 3.1.2.12.1 | no |
| Tether ring | on the forward surface of the rendezvous and recovery section | none | none | documented | GVIII, 3.1.2.12.1 and Figure 3.1-9 | no |
| Auxiliary tape memory unit | in the adapter: 26 lb, 700 cu in | none | none | documented | GVIII, 3.1.2.4.1; kit, p. 36 | no: where in the adapter is not found |
| Cabin heat exchanger and fan; egress oxygen | removed | fitted | fitted | documented | GVIII, 3.1.2.3 | no difference built |
| Panels | an ATMU panel; the Agena control panel, also feeding the outside lights and pyrotechnics; two switches for the docking cone; the fuel cells' monitor in place of the main bus ammeter; a light and dimmer for the elapsed-time clock | | | documented | GVIII, 3.1.2.9.1 (pages 3-29 and 3-30, with Figure 3.1-7, are missing from the copy read) | no: the panels are spacecraft 3's with the two clocks (`gmt_clock`, `get_clock`) |
| Suits | G4C: the command pilot's with a light cover layer, the pilot's with a cover layer for outside, gloves with thermal protection and a double visor | G4C | G5C | documented | GVIII, 3.1.2.12.2 | no: the seats are empty |
| Experiments | S-9, nuclear emulsion, 8.5 by 6 by 3 in in a well behind the right hatch; S-3 on each hatch; D-14, D-15 and D-16 in and on the adapter; S-10 on the Agena | | | documented | GVIII, 8.0; kit, pp. 26 to 33 | S-9 only: `retro_experiments=("s-9",)`, its place estimated |

## Paint

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Re-entry module | black shingles; UNITED STATES and the flag on each side | assumed | drawn as spacecraft 3 wore them. The report's frontispiece shows the ship on the stand and docked; it has not been read closely enough to check the lettering |
| Adapter | white | documented for the type | SEDR2, p. 2-17 |
| Adapter's inside | aluminium foil | documented | SEDR2, p. 2-17: gold "on spacecraft 9 through 12" |
| Handrails | painted metal: drawn white | documented that they were painted; the colour assumed | SP-149, p. 5-6 |
| The white disc forward of the left hatch | left off | | it is spacecraft 3's, and not identified (`white_disc=False`) |

## Weights

| | | Confidence |
| --- | --- | --- |
| At launch | 8,351.31 lb | documented (GVIII, 3.3, p. 3-38) |
| At retrofire | 5,726.36 lb | documented |
| At 0.05 g | 4,879.89 lb | documented |
| At main parachute deployment | 4,454.89 lb | documented |
| At landing, without the parachute | 4,344.08 lb | documented |

## What the model gets wrong or leaves out

- **The index bar's casing and the lights are our forms.** The bar's travel is documented and its
  place is scaled from the report's plan of the ship; its thickness, the casing, the manifold and
  both lamps' housings are scaled from sketches or guessed.
- **The place where Scott was to put the pack on is folded and still.** The hand bars, the foot
  rail and the thermal cover are as at launch and do not spring out; the bars' lengths and places
  are scaled from the report's sketch of the sequence, and the gold cover's opening from a
  photograph of the next ship's adapter.
- **The support package is an outside drawn from one sketch.** Its size and what it held are
  documented. That the hand-held manoeuvring unit rode on its side is read off the same sketch.
- **The fuel cell module is placed by eye.** The order of its row is McDonnell's drawing; where the
  row lies, the water tank beside the oxygen and the reserve tank among four propellant tanks are
  what fits.
- **Not built:** the chest pack and the umbilical in the cabin, the hatches' ratchets, the Velcro,
  the tether ring, the camera mount, the tape memory unit, the latch receptacles' covers and the
  umbilical connector on the nose, experiments S-3, D-14, D-15 and D-16.
- **The panels are spacecraft 3's**, with the two clocks. Nothing this ship added to them is drawn,
  and the pages of the report that show them are missing from the copy read.
- **The paint is spacecraft 3's**, unchecked against a photograph of this ship.
- **The flown ship** (at the Armstrong Air and Space Museum in Wapakoneta, Ohio, by general
  knowledge) has not been compared.

## Sources

[docs/sources.md](../../../../../docs/sources.md), "Gemini-Titan 8 and Gemini-Titan 9A".
