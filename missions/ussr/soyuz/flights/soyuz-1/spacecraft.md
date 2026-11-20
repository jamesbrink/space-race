# Soyuz 1 · 7K-OK(A) No. 4

The exhibit starts in launch configuration. Choose the spacecraft alone to remove the launcher, move the slider halfway to see the right solar wing open with the three modules still joined, or select the descent cabin to see Komarov and the two empty couches. The slider spreads the three modules along their axis so their mating faces can be inspected. Its positions do not represent elapsed flight time.

## Reconstruction plan and evidence

1. Fix the overall envelope before placing equipment. The Gagarin Cosmonaut Training Center (GCTC) gives the body length and the two pressure vessels’ dimensions. Energia gives an approximate overall length. No station drawing for the complete flight article was found. The model takes the difference up at the probe. That assignment is estimated. [GCTC type description and cutaway](https://www.gctc.ru/main.php?id=299) · [Energia corporate history, pp. 157–195](https://testpilot.ru/espace/bibl/energia-50/05.php)
2. Identify the ship by its docking hardware. No. 4 carried the active probe on a closed forward compartment. The living compartment had a side hatch and external handholds. Through this hatch the two expected visitors would have entered after crossing from the other ship. The model follows callouts 1–4 and 17–18 of the training center’s cutaway. [Annotated drawing](https://www.gctc.ru/media/images/education/spacecraft/tk_7k-ok.jpg)
3. Build the equipment in the configuration the flight actually reached. Komarov reported the right wing opening and the left still folded. The same source distinguishes the antenna reports. The gallery deploys the right wing with its forward shortwave element and keeps the left assembly packed. The orbital hull carries the separate folding Igla rendezvous boom. Its opening angle and the shortwave element’s travel are illustrative. [Komarov's recorded exchanges, pp. 32 and 35](https://imwerden.de/pdf/istorichesky_archiv_2002_2__ocr.pdf)
4. Build the human spaces at full detail. The descent compartment contains the pilot, flight controls and two spare places. The orbital compartment has storage furniture inspired by Galina Balashova's early designs. The museum identifies the cushioned bench as suit storage and the sideboard as equipment storage. Placement and trim in this exhibit are estimates. [Cabin reconstruction](../../vehicles/cabin.md) · [Moscow Museum of Cosmonautics, Balashova collection](https://kosmo-museum.ru/news/sovetskiy-kosmicheskiy-arhitektor-galina-balashova-peredala-v-fondy-muzeya-kollektsiyu-svoih-rabot)
5. Build the launcher around the folded ship and verify all three levels of detail, the cabin cutaway, the seat, and the vehicle and spacecraft plinths in the gallery.

## Dimensions and stations

All model stations run forward from the propulsion outlets in millimetres. Published type measurements are **assumed** for No. 4. Neither source provides individual acceptance measurements for this ship.

| Item | Model | Basis |
| --- | ---: | --- |
| Outlets to probe tip | 7,600 mm | Energia's approximate type length |
| End of body | 6,980 mm | GCTC body length. Its assignment to the docking face is estimated |
| Descent module | 2,160 mm long × 2,200 mm diameter | GCTC, descent module paragraph |
| Orbital module | 2,200 mm diameter, 300 mm belt | GCTC, orbital module paragraph. Two hemispheres and belt give 2,500 mm between ideal poles. The collars interrupt the poles |
| Widest aft skirt | 2,720 mm diameter | GCTC and Energia, maximum body diameter |
| Orbital side hatch | 640 mm clear opening | GCTC, orbital module paragraph |
| Descent module aft and forward stations | 2,320 and 4,480 mm | Estimated assembly stations constrained by the module lengths and type cutaway |
| Probe beyond docking face | 620 mm | Estimated reconciliation of the two published envelopes |
| Solar wing reach from centreline | about 4,185 mm open, one side | Estimated 1,185 mm root offset and four 750 mm leaves. The GCTC gives an 8–11 m span across the type range with both wings open |

The exterior follows the green glass cloth identified by GCTC. Seams converge around the spherical orbital compartment and follow the bell-shaped descent module. Underneath are the heat shield, two shoulder parachute covers and the Vzor optical hood. The main parachute container's cover is a node of its own in every Soyuz model (`ParachuteCover`, built by `soyuz_7kok.descent`): its origin is the lid's middle on its seat on the hull and its +Z (the file's +Y) points out along the lid's axis, the way it is shot off in flight. The reserve container's cover is part of the descent module. The orbital module's side hatch is a node under its module too (`BO_SideHatch`; `SoyuzT_BO_Hatch` on the 7K-ST), holding its ring, face, bolts and dogs. The instrument and propulsion module has a radiator, exposed adapter struts, a flared aft skirt, a toroidal equipment compartment and main and backup outlets. Fittings, finish and stations use the type section as a guide. [GCTC annotated type section](https://www.gctc.ru/main.php?id=299)

## What is simplified

- The probe, radiator flutes, blanket gores, panel cell grid, parachute covers and antenna fittings reproduce their visible functions. Their shapes, counts, colour values and clocking are estimates. The solar-wing telemetry loops and shortwave elements follow the early shape in Sven Grahn’s [Soyuz radio hardware study](https://planet4589.org/space/archive/sven/histind/Soyuz1Land/SoyRadio.htm). The rest of the antenna system is incomplete. The IR vertical sensor described by GCTC for ships starting with No. 7 is omitted.
- Four rigid leaves per solar wing approximate the folded envelope and open reach. This implies an 8.37 m span with both wings out. Portree gives 10 m for the original Soyuz (NASA RP-1357, §1.3.1). No measurement of No. 4’s deployed wing was found. Their hinge sequence, backing, cell layout and deploy time on the slider are illustrative. The cell faces are not an area-calibrated electrical model.
- The orbital module furniture represents the early design. It omits the furniture mounting brackets, toilet, loose stowage and much of the equipment. Individual hardware inside the service module, docking latches, and the chute mechanisms are not reconstructed. The heat shield remains attached.
- The two parachute containers are not modelled, only their covers. When the main container's cover is shot off in flight the hull under it is drawn closed, with no container mouth, and the parachutes are made fast at the module's top instead of in the container. Which of the two covers is the main container's is estimated. The reserve container's cover stays on in every flight, Soyuz 1's included, though its reserve parachute came out.
- Crew clothing and cabin fittings have their own limits in the [cabin notes](../../vehicles/cabin.md). The descent is flown from the record ([README](README.md), "The flight as flown"): the drogue and the fouled reserve are drawn as the run has them, the main not at all. The impact, the fire and the wreck are not shown.
