# Mercury spacecraft No. 11, as flown on MR-4

What the capsule in [model/vehicle.py](model/vehicle.py) is built from, and how far to trust each
number. Station 0 is the heat shield's maximum-diameter plane and positive is toward the nose
(McDonnell's Z104.50). Angles are round the cone from the pilot's right as he lies: the periscope
is at 90°, under his feet, and the window at 270°, over his head. The drawings are in inches, so
the model is too.

**Confidence**: *documented* is a published figure; *derived* is computed from documented ones;
*estimated* was read off photographs or chosen to look right. The same labels are in
[flight.ts](flight.ts).

What No. 11 shared with No. 7 is built by [vehicles/mercury_capsule.py](../../vehicles/mercury_capsule.py)
and is recorded once, in [Freedom 7's spacecraft.md](../mr-3-freedom-7/spacecraft.md): the heat
shield, the retropack, the recovery compartment, the antenna canister, the escape tower, the
pressure vessel, every station and motor. This file is what was No. 11's own.

## What made No. 11 different from No. 7

| What | No. 7 (MR-3) | No. 11 (MR-4) | Confidence | Source |
| --- | --- | --- | --- | --- |
| View out | two 10 in ports to the side | a window on the centreline, in front of the pilot and above the panel; 30° across, 33° up and down | documented | *Results of the Second U.S. Manned Suborbital Space Flight* (MR-4 Results), p. 3 and Figure 2-1; *This New Ocean*, p. 367 |
| Window's make | | outer pane 0.35 in Vycor; inner panel of three: 0.17 in Vycor and two of 0.34 in tempered glass; magnesium fluoride coatings; no filters fitted for this flight | documented | MR-4 Results, p. 4 |
| Side hatch | mechanical latches, 69 lb as installed | explosive: 70 bolts of 1/4 in titanium each drilled 0.06 in, a mild detonating fuse between two seals round the hatch; 23 lb as installed; "in the same location and of the same size" | documented | MR-4 Results, p. 4; Hammack and Heberlig, p. 27 |
| How the hatch is fired | handles inside and out | inside, a plunger: 5 to 6 lb with its safety pin out, 40 lb with it in; outside, a lanyard behind a small plate | documented | MR-4 Results, p. 4; *This New Ocean*, p. 367; SEDR 104, 2-4 and Figure 2-2 |
| Bolts flown | | 69: one was misaligned, and after a 30 minute hold it was left out | documented | *This New Ocean*, p. 370. The MR-4 Results (p. 6) call the hold one "to install a misalined hatch bolt" |
| Instrument panel | Postlaunch Report Figure 3.1-2 | rearranged, with an Earth-path indicator added, which was not working on this flight | documented | MR-4 Results, p. 4 and Figure 2-3; Hammack and Heberlig, Figure 6 (the same drawing, a better scan) |
| Control | automatic, fly-by-wire, manual proportional | the same, and a rate command system (RSCS) on the manual jets: it holds the rate asked for to within 3°/s | documented | MR-4 Results, p. 4; the panel's RATE COMD switch and handle |
| Clamp-ring bolt covers | rectangular | streamlined, their upper parts hinged to flip off at separation | documented (that, and the shape); estimated (size) | MR-4 Results, p. 4 and Figure 2-2 |
| Couch | | more foam at the head, against vibration | documented; not modelled | *This New Ocean*, p. 368 |
| Heat shield | beryllium heat sink | the same | documented | Hammack and Heberlig, p. 6: "the approximately 1-inch-thick beryllium heat shield ... for these ballistic flights" |
| Landing bag | carried | carried: fitted at the Cape; the pilot heard and felt it drop | documented | MR-4 Results, pp. 5 and 39 |
| Periscope | carried | carried: extended after separation; Grissom used the window | documented | MR-4 Results, pp. 6 and 52 |
| Antenna canister, escape tower, retropack | | no difference found in anything read | | Hammack and Heberlig's Figures 2 and 17 (October 1961) are the dimensions both models use |
| Paint | FREEDOM 7; UNITED STATES; flags | LIBERTY BELL 7 under the window; a crack; UNITED STATES; a flag | documented by photographs; every place estimated | see "Paint" |
| Booster | MR-7 | MR-8: 102 lb more damping compound in the instrument compartment; flown on 100° instead of 102° | documented | TM X-53107, 4.2.1 and 8.3.2 |
| Pilot's suit | | wrist bearing rings, a convex chest mirror, a new parachute harness, new microphones, a urine reservoir | documented | *This New Ocean*, p. 368 |

## The window

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Outer pane | 21.00 in along the cone; 11.254 in wide at the heat shield's end, 7.511 in at the nose's | documented | NASA SP-45, Figure 19-1, "Mercury spacecraft window". It is the orbital spacecraft's drawing; its panes' thicknesses (0.350, 0.170, 0.340, 0.340 in) are the ones the MR-4 Results give for No. 11 |
| Inner panes | 12.950 in long; 9.490 in and 7.300 in wide; corners 1 3/4 in radius | documented | the same figure |
| Outer pane's corners | 1.75 in | estimated | taken as the inner panes'; NASA S61-03698 |
| Outer pane's lie | on the cone's own curve, at 20° to the axis | documented | SEDR 104, 2-5: "conforms to the curvature of the capsule conical section" |
| Inner panes' lie | flat, at 26° to the axis: 6° steeper than the skin, nearest it at the heat shield's end | documented (the angle); estimated (that 26° is theirs, read off the figure's section) | SP-45, Figure 19-1 |
| How far in the inner panes stand | 2.0 in under the skin at their heat-shield end, 0.9 in up the cone from the outer pane's end | estimated | the figure's section is not dimensioned there; set so that the flat frame clears the round wall |
| Where the window stands | the middle of the outer pane at station 35.8, on the centreline | estimated | NASA 61-MR4-53 and MSFC-6116423, scaled by the pane's own 21 in: about 12 in of cone above it and 25 in below |
| The plate it is set in | 30° wide, stations 24.8 to 46.8, plain, screwed round its edge | estimated | the same photographs |
| Retaining rim | 0.78 in wide, 0.09 in proud, pale metal | estimated | NASA S61-03698 |
| The well between the panes | lined with crinkled foil | estimated | NASA 61-MR4-53, MSFC-6116423 |

## The hatch

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Where it is | its edge beside the window's plate; its middle 45° round from the window toward the pilot's right; 55° wide | estimated | NASA 61-MR4-53, S61-02881, MSFC-6116423: with the hatch off, its sill stands 2 to 3 in from the window's plate. Width from SEDR 104 Figure 2-2's proportions |
| Stations | 18.5 to 45.4 | estimated, within documented bounds | SEDR 104 Figure 13-11 (capsule 9): thermocouples on the "emergency egress hatch, outer edge" at Z123.0 and Z146.0 and on the hatch at Z124.25 and Z147.25, so it reaches at least from 18.5 to 42.75; its top is level with the window plate's in the photographs |
| Shingles | two, fastened only to the hatch | documented | SEDR 104, 2-4 |
| Joint round its shingles | 0.14 in, three times the joint between the capsule's own | estimated | chosen so that the hatch can be told from the skin round it; no photograph read shows the hatch on |
| Lanyard cover | a plate 2.6 by 5.7 in in the corner toward the window and the nose | documented (that there was one); estimated (which corner, how big) | *This New Ocean*, p. 367; SEDR 104 Figure 2-2; MR-4 Results Figure 2-1 |
| Initiator | on the hatch's inner face in the same corner: a flange, a body, a plunger with a knob, the pin through it | documented (what); estimated (size, and which corner the manual's "upper aft corner" is on the model) | SEDR 104, 2-4 and Figure 2-2 |
| Bolts | 69 round the sill, one place empty | documented (the number); estimated (which was left out) | above |
| Knife | on the hatch's inner face | documented (that it rode on the door); estimated (where) | MR-4 Results, p. 55: "I removed the knife from the door" |

**This is not where Freedom 7's model has its hatch.** The MR-4 Results say the two hatches were in
the same place; the photographs of No. 11 put that place close beside the window, 45° round from
it. Freedom 7's model has its hatch 90° from the pilot's head, at his right hand. One of the two is
wrong, and the photographs say it is Freedom 7's: see "Open questions".

## Shingles

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Beads | pressed across each shingle, running round the cone, one above the next at 1.3 in | estimated (the pitch, and 0.14 in high) | NASA 61-MR4-53, S61-03705, S61-03740; the capsule as raised (KSC, July 1999) and as shown at the Cosmosphere |
| Columns | twelve, of 30° | estimated | the same: the window's plate is one column; most shingles carry two stacks of beads side by side, which would be 24 stringers under them |
| Rows | seams at stations 24.8 and 46.8, and a plain riveted band from the shield's ring to 6.2 | estimated | the same |
| The shingle with the name | one bead across its whole width; its foot at station 9.6 | estimated | MSFC-6116423 |
| Fasteners | a screw in a dimpled washer every 2.6 in across each end of a shingle and every 3.4 in up one side | estimated | S61-03705 |
| Gauge | René 41, 0.016 in | documented | Hammack and Heberlig |

## Paint

All of it is placed from photographs; none of the places is dimensioned.

| Item | As modelled | Basis |
| --- | --- | --- |
| LIBERTY BELL 7 | three lines under the window: 12.7, 8.1 and 1.9 in long, letters 2.9 to 3.6 in tall, at stations 22.4, 18.4 and 14.3 | NASA 61-MR4-53, MSFC-6116423, S61-03698 |
| The crack | a white line 1 in wide from the base at 264°, under the name's left edge, up and away from the hatch at 33° to the meridian, to station 39 | NASA 61-MR4-53, MSFC-6116423, S61-03740. "About two-thirds toward the nose" is a secondary description |
| UNITED STATES | two lines, 23 in long, letters 6.5 in tall, centred on 133° at stations 42.6 and 33.9: beside the periscope's door, on the side away from the hatch | NASA S61-03705; S61-02824; the capsule as raised |
| Flag | 12 by 6.3 in at 61°, station 40: the other side of the periscope's door | NASA S61-02824 (from the helicopter, small): size and place are rough |

Not established: whether anything was painted between 165° and 225°. Freedom 7 carried UNITED
STATES twice. No photograph read shows that side of No. 11, and the model has nothing there.

## Periscope and umbilical

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Objective | at station 41.5, level with the upper line of UNITED STATES | estimated | NASA S61-03705; the capsule as raised |
| Door | 20° wide, stations 28.6 to 46.0, hinged on the side toward the hatch, pale inside | estimated | the same; how far it stood open is ours (105°) |
| Umbilical receptacle | inside the same door, under the lens, at station 32.5 | estimated | S61-03705 shows the ground's hose plugged in there; SEDR 104 puts the receptacle under the periscope's door |

Freedom 7's model has its objective at station 13. The instrument was the same; one of the two
stations is wrong (see "Open questions").

## Cabin

Built by [vehicles/mercury_cabin_11.py](../../vehicles/mercury_cabin_11.py), which calls
[mercury_cabin.py](../../vehicles/mercury_cabin.py) for what the two capsules had alike.

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Panel layout | as Hammack and Heberlig's Figure 6 | derived | measured off the figure in its own pixels and scaled by the periscope's display. The figure is a flattened layout, not a dimensioned drawing |
| Scale of the figure | 8.0 in to 510 px | derived | the display's glass is 510 px across in the scan at 400 px/in, and 8 in (Hammack and Heberlig, p. 5). It makes the panel 29.3 in wide, its round instruments 1.9 to 2.0 in and the altimeter 2.8 in |
| What the panel carried | on the main panel: accelerometer, control fuel, rate of descent, altimeter, attitude and rate indicator, Earth-path indicator, clock, periscope, eight warning lights each with a tone switch, six switch-fuses. On the left console: thirteen sequence lights in a column with their overrides, ABORT, the ASCS mode switches (one of them AUTO / RATE COMD), the fuel handles | documented | Figure 6, every legend that can be read |
| Three instruments whose legends cannot be read | modelled as capsule 7's humidity, coolant and oxygen gauges, in that order along their row; a fourth, with two needles, is a plain face | estimated | the row is where capsule 7's panel had those three; the coolant gauge's legend is legible |
| Instruments' faces | capsule 7's | estimated | no photograph of No. 11's faces is legible enough; capsule 7's are read off the flown capsule (its spacecraft.md) |
| Earth-path indicator | its case, window, two small dials and three knobs as the figure draws them; the globe a bare graticule | derived (layout); estimated (the rest) | Figure 6. Not working on MR-4 (MR-4 Results, p. 4) |
| Where the panel stands, how the consoles are canted | as in capsule 7's model | estimated | nothing read places either |
| Window's inner frame | a flat frame 0.6 in wider than the panes, bolted round, with a shroud to the wall | documented (frame: SEDR 104 Figure 2-3); estimated (the shroud) | |
| Cabin lights | two: one at the pilot's left, one at his right below the hatch | documented (two, and that the left could be lit alone: the panel's CABIN LIGHTS switch reads BOTH, OFF, L.H. ONLY); estimated (where) | Figure 6 |
| Pilot | the Mark IV suit as modelled for Shepard, with the tag reading V. I. GRISSOM and a convex mirror 5.2 in across its rim on his chest | documented (the mirror: *This New Ocean*, p. 368); estimated (its size: NASA S61-03698, where it looks nearer 6 in, made a little smaller to lie between the model's shoulder straps; the tag's initials, which the photograph hides) | |
| Survival kit | on the left wall | documented | *This New Ocean*, p. 369: "on a shelf ... near the astronaut's left arm" |

## Parts in the model

Top-level nodes in the GLB. These names are the `node` fields in `flight.ts`.

| Node | Contains |
| --- | --- |
| `Retropack`, `HeatShield`, `RecoveryCompartment`, `AntennaCanister`, `EscapeTower` | as Freedom 7's |
| `Afterbody` | shingles and fasteners, the plain plates (round the window, the hatch and the periscope's door, and the band at the foot), structure, attach ring, the periscope with its door and well, the umbilical receptacle, roll thrusters, lettering, the crack, the flag |
| `Window` | the outer pane and its rim; at full detail the foil well, the inner panes and their frame |
| `Hatch` | its shingles and fasteners, the lanyard cover, its two skins; at full detail its painted inner face, 69 bolts, the initiator with plunger and pin, the knife |
| `CrewCabin` | the pressure vessel with the hatch's and the window's openings; at full detail the lining, couch, pilot, panel, consoles, the window's shroud, stowage, lights, oxygen bottles, landing bag |

The same GLB holds the launch vehicle's five nodes: [redstone-mrlv.md](../../vehicles/redstone-mrlv.md).

## Open questions

- **Where the hatch was, on both capsules.** No. 11's photographs put the hatch's edge beside the
  window. If the two hatches were in the same place, as the report says, Freedom 7's model has its
  hatch 45° too far from the pilot's head, and with it the hatch's bearing on the pad
  (`lc-5.ts`) and the roll the simulator gives the capsule after turnaround. Freedom 7's model is
  not changed here.
- **Which way the shingles' beads run on Freedom 7.** Its model has them along the meridian, 24
  shingles round. Every photograph of No. 11 has them round the cone, and the two capsules' skins
  were of one design. `mercury_capsule.Skin` builds them this way; Freedom 7's model is not
  changed here.
- **The periscope's station.** 41.5 here from three photographs of No. 11; 13 in Freedom 7's model
  from the flown capsule.
- **The far side's paint**, above.

## What the model gets wrong or leaves out

- **The shingle layout is a regular one fitted to photographs of three sides.** Real shingles
  differ in size and are cut round fittings. The small plates with round fittings in the top row
  (one above the window, one above UNITED STATES) are left out: what they are has not been read.
- **Lettering is Arial Bold**, stretched to the photographs' proportions. The name and the crack
  were painted by hand; UNITED STATES was a stencil with breaks in its letters.
- **Paint stands 0.1 in off the skin it follows**, so that it clears the screw heads under it.
- **The hatch's sill is not modelled**: the two seals, the fuse in its channel, the magnesium
  gasket, the retention springs, the two pressure valves in the hatch, the cable from the
  initiator to the outside lanyard. The initiator is a shape, not the mechanism of SEDR 104's
  Figure 2-2, and is shown with its cover off and its pin in.
- **The window has one inner pane for three**, no filter or door (none was fitted for this flight)
  and no mirror. Its well is a plain funnel; how the two frames were sealed to each other is not modelled.
- **The fuse panel is left out.** Capsule 7 had one on the wall at the pilot's left; the figure of
  No. 11's panel does not show one, and nothing else read does.
- **The cabin's fittings round the pilot are capsule 7's**: the chest parachute, the hoses, the
  map case, the junction box. Nothing read says they differed, or that they did not. What is known
  only from capsule 7 as it is kept today is left out: the coiled cord on the left wall, the wiring
  down from the fuse panel, and the camera beside the pilot's head (the chest mirror was there so
  that one camera would do).
- **The pilot's suit is Shepard's with the name changed and the mirror added.** The wrist bearing
  rings, the new parachute harness and the new microphones are not modelled. There is no model of
  Grissom standing: the gallery's figure for scale is an outline.
- **The panel's faces are capsule 7's**, and the instrument with two needles is blank.
- **The rate command system is not modelled** beyond its switch and handle on the console.
- **The periscope's door stands open at an angle of ours**, and does not shut.
- **The clamp ring's bolt covers** are half an egg each; the hinge is not modelled.
- **No mass properties, no trajectory.** The flight cannot be flown yet: see the flight's README.
- **Its levels of detail change at the viewer's own distances.** They have not been measured for
  this model (`tools/lod-thresholds.mjs --measure`): the gallery draws it in full, and it stands
  nowhere else yet.
- Everything listed in Freedom 7's spacecraft.md for the parts the two share: the retropack's
  straps, the tower's bracing and single jettison nozzle, the landing bag as a flat ring.

## Sources

[docs/sources.md](../../../../../docs/sources.md).
