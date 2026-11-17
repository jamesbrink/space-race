# Gemini spacecraft No. 9

The ship Stafford and Cernan flew from 3 to 6 June 1966. "Except for the window covers and the
extravehicular equipment, Spacecraft 9 closely resembled Spacecraft 8" (mission report, 3.1), so
this file is short: the spacecraft as a type is
[gemini-spacecraft.md](../../vehicles/gemini-spacecraft.md), spacecraft 8 is
[its own file](../gt-8/spacecraft.md), and what follows is what was No. 9's own, which is what
[model/vehicle.py](model/vehicle.py) tells the shared module (`FIT`). What it met in orbit is
[atda.md](../../vehicles/atda.md).

Sources, short: **GIX**, *Gemini Program Mission Report, Gemini IX-A* (MSC-G-R-66-6), whose section
3.1 lists what spacecraft 9 changed from spacecraft 8 (pages 3-25, 3-26 and 3-47 to 3-50 are
missing from the copy read); **SEDR2**, SEDR 300 vol. 2 (McDonnell, 1 July 1966); **SP-149**,
*Summary of Gemini Extravehicular Activity*; **kit**, NASA release 66-97, the press kit;
**S-67-802**, the photograph of this ship's adapter that is SP-149's Figure 5.2-2.

## This ship and spacecraft 8

| | Spacecraft 9 | Spacecraft 8 | Confidence | Source | In the model |
| --- | --- | --- | --- | --- | --- |
| Hatch windows | each under a transparent cover, "outer spacecraft windows removed from spacecraft flown on previous Gemini missions", on two hook hinges, thrown off by two torsion springs from a knob inside once in orbit | bare | documented | GIX, 3.1.1 | yes: `window_covers=True`; the frame's form estimated. The model is the ship at launch, so they are on |
| At the back of the adapter | the Astronaut Maneuvering Unit "in place of the Extravehicular Support Package" | the support package | documented | GIX, 3.1.1 | yes: `backpack="amu"`, the node `ManeuveringUnit` |
| The unit | 32 by 22 by 19 in, 166 lb with its propellant: 24 lb of hydrogen peroxide, twelve thrusters of about 2.3 lb, 7.3 lb of oxygen, its own batteries, gyros and radio | | documented | kit; GIX, 8.1 and 3.1.2.12.4 | yes, as an outside: the shell, two folded arms, nozzles at its corners. Its form is from GIX's Figures 8.1-18 and 8.1-19 and is estimated |
| How it hung | on a torque box between Z66.74 and Z56.27, turned 22.5° from the ship's axes | not found: taken to be the same | documented | GIX, Figure 8.1-18 | yes |
| Thermal cover | a curtain over the unit's cavity, "jettisoned prior to the start of AMU donning activities" | the same, for the package | documented | GIX, 3.1.2.12.4 | yes, in place; its form estimated |
| Foot bar | "two aluminum stirrups were installed on the footbar" | a plain bar | documented | GIX, 3.1.2.12.1 | yes; their size estimated |
| Hand bars | as spacecraft 8's, with a spring clip on the right one for the 25 ft umbilical | plain | documented | GIX, 3.1.1 | the bars yes (1.38 in across: SP-149, p. 5-6); the clip not built |
| Adapter's inside | gold: "The inner adapter surfaces of spacecraft 9 through 12 are gold plated" | aluminium foil | documented | SEDR2, p. 2-17 | yes: `gold_inside=True` |
| The gold cover's opening | gathered round an oblong about 40 by 27 in | "the same as those required on Spacecraft 9" | documented that the two were the same; the size scaled from S-67-802 | GIX, 3.1.2.12.1 and Figure 3.1-6 | yes |
| Handrails, Velcro, lights | as spacecraft 8's | | documented | GIX, 3.1.2.12.1 | the rails and lights yes; the Velcro no |
| Right hatch | its holding gear set for at most 40 lb to close, and "a loop was added to the end of the fabric strap on the pilot's hatch-closing device" so the command pilot could help pull | a ratchet | documented | GIX, 3.1.2.9.2 | no. The hatch opens on the slider (`right_hatch_opens=True`), to 100°, an angle assumed as on Gemini-Titan 4 |
| Fuel cells, tanks, water, radar, docking fittings | "the same as the Spacecraft 8 system" | | documented | GIX, 3.1.2.3, 3.1.2.6 and 3.1.2.7 | yes: the same arguments as spacecraft 8 |
| OAMS propellant | 336 lb of oxidiser and 343 lb of fuel usable; about 700 lb consumed by the report's reckoning, 14 lb left | 767 lb loaded | documented | GIX, 5.1.8 | (the tanks) |
| OAMS control power | one four-pole switch takes power from all sixteen thrusters; the electronics' exposed connections varnished against a short | several switches | documented | GIX, 3.1.2.4 | no |
| Horizon sensor | the secondary one with a narrower band, 13 to 22 microns | 8 microns | documented | GIX, 3.1.2.4 | no |
| Panels | six ammeters for the fuel cell stacks; an MMU DEPLOY switch and a hydrogen peroxide warning lamp; a hood over the elapsed-time clock | | documented | GIX, 3.1.2.9.1 | no: the panels are spacecraft 3's with the two clocks |
| Suits | G4C; the pilot's with legs covered against the unit's exhaust, a polycarbonate visor with a low-emittance coat and a single sun visor | G4C | documented | GIX, 3.1.2.12.2 | standing, at the pad ([g4c-suit.md](../../crew/g4c-suit.md)); the seats are empty |
| Experiments | S-12, a micrometeorite collector 11 by 5.5 by 1.25 in behind the right hatch; D-12, the unit; D-14, a boom antenna on the adapter; S-1, S-11, M-5 in the cabin; S-10 on the target | S-9 | documented | GIX, 8.0; kit | S-12 only: `retro_experiments=("s-12",)`, its place estimated |

## Paint

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Re-entry module | black shingles; UNITED STATES and the flag on each side | assumed | drawn as spacecraft 3 wore them; not checked against a photograph of this ship |
| Adapter | white outside, gold inside | documented | SEDR2, p. 2-17 |
| The unit | white | estimated | GIX, Figure 8.1-19, a dark photograph of it in the adapter |

## Weights

| | | Confidence |
| --- | --- | --- |
| At launch | 8,268 lb | documented (GIX, 3.3, p. 3-32) |
| At retrofire | 5,635 lb | documented |
| At 0.05 g | 4,874 lb | documented |
| At main parachute deployment | 4,475 lb | documented |
| At landing, without the parachute | 4,364 lb | documented |

## What the model gets wrong or leaves out

- **Everything [spacecraft 8's file](../gt-8/spacecraft.md) lists**, since this ship is built with
  the same arguments but for the four above: the index bar's casing and the lights are our forms,
  the fuel cell module is placed by eye, the panels and the paint are spacecraft 3's.
- **The maneuvering unit is an outside.** Its size is documented and how it hung is from a
  dimensioned figure; its shell, arms and nozzles are drawn from two small figures and are
  estimates. It is folded, as at launch: the arms do not swing down and the nozzle extensions do
  not unfold. None of its tanks, valves or harness is built.
- **The place where Cernan put it on is folded and still.** The hand bars, the foot rail with its
  stirrups and the thermal cover are as at launch.
- **The window covers' frames and hinges are estimated**, and they do not come off.
- **The right hatch's angle is assumed**, and Cernan's umbilical, the strap he closed the hatch
  with and the mirrors on the hand bars are not built.
- **Not built:** the chest pack, the 25 ft umbilical, the unit's 125 ft tether, the boom antenna of
  D-14, the Velcro, the docking fittings' covers.
- **The flown ship** (at the Kennedy Space Center Visitor Complex, by general knowledge) has not
  been compared.

## Sources

[docs/sources.md](../../../../../docs/sources.md), "Gemini-Titan 8 and Gemini-Titan 9A".
