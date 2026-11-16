# Gemini spacecraft

McDonnell's two-man ship: a re-entry module that comes home and an adapter that does not. Model:
[gemini_spacecraft.py](gemini_spacecraft.py), imported by each flight's `model/vehicle.py`, which
says what its own ship had (`Fit`). Built for spacecraft No. 3; what that ship had and lacked is in
[the flight's spacecraft.md](../flights/gt-3/spacecraft.md).

McDonnell's Z stations run in inches from the adapter's base (Z13.44) toward the nose (Z239.28);
the model keeps them and puts its origin at Z103.44, where the re-entry module meets the adapter.
The drawings name the ship's sides TY (top: the hatches), BY, LX and RX (the crew's left and
right); the model's +X is TY and its +Y is RX.

Sources, short: **SEDR 300** is *Project Gemini Familiarization Manual*, SEDR 300, volume 1, "Long
Range and Modified Configurations" (McDonnell, 30 September 1965), which covers spacecraft 3, 4 and
7 and marks what is one ship's; **SEDR VIII** is its Section VIII, which is a separate file;
**TS** is *Project Gemini: A Technical Summary* (McDonnell, NASA CR-1106, June 1968); **GIV** is
*Gemini Program Mission Report, Gemini IV* (MSC-G-R-65-3); **SP-121** is *Gemini Midprogram
Conference*; the **press kit** is NASA release 65-81. The photographs are NASA's of spacecraft 3:
**S65-13395** (at the boresight range, 6 January 1965), **S65-13244** (the same day, from above,
both hatches open), **S65-21090** (on the launch vehicle on the morning of the flight, from above,
in colour) and S65-17337 (being lowered onto the launch vehicle, February 1965); and NASA's drawing
**S64-04925** of the right landing gear door.

**Read through a fitted camera.** Much of the cabin's outside is read off S65-21090. A pinhole
camera was fitted to the photograph from the ship's own documented circles (the neck at Z173.97 and
Z191.97, the taper at Z201.47, the heat shield's rim) and its edges, and each thing picked in the
picture was carried back along its ray to the cone. The fit leaves about 50 pixels in 4,000 (two
inches at the cabin), and what is sunk under the skin (a window's forward edge) is seen displaced,
which has been allowed for. Figures got this way are `estimated`, good to about two inches along
the ship and three degrees round it near the top of the ship, and worse toward its edges in the picture. The stills that set the model beside the photographs are not
kept in the repository.

## Dimensions

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Length, launch configuration | 225.84 in (5.736 m): Z13.44 to Z239.28 | documented | SEDR 300, Figures 2-3 (p. 2-5) and 2-4 (p. 2-6); SP-121, Figure 3-2 |
| Length, orbit configuration | 219.03 in | documented; not modelled | Figure 2-3: less the nose fairing's 5.31 in and the 1.5 in of adapter left on the launch vehicle (p. 2-25) |
| Adapter | 90.00 in, Z13.44 to Z103.44; 120.00 in across the base, 88.30 in across the head; 10° | documented | Figure 2-3 |
| Cabin section | 70.53 in, Z103.44 to Z173.97; 90.00 in to 38.66 in across; 20° | documented | Figure 2-3 |
| Re-entry control system section | 18.00 in, Z173.97 to Z191.97; 38.66 in across | documented | Figure 2-3 |
| Rendezvous and recovery section | 42.00 in, Z191.97 to Z233.97; straight to Z201.47, then tapering at 7° | documented | Figures 2-3 and 2-4. A 7° taper ends 30.68 in across, which the side view scales to; the end view dimensions a 32.30 in circle there. The model has 30.68 |
| Nose fairing | 5.31 in, Z233.97 to Z239.28 | documented | Figure 2-3 |
| Heat shield | 90 in across, 144 in spherical radius | documented | Figure 2-3; p. 2-18 |
| Heat shield's crown | Z94.40 | estimated | a station of Figure 2-4 that the figure does not name. A cap of that sphere 90 in across is 7.21 in deep, which puts its rim at Z101.61 |
| Equipment section / retrograde section | divided at Z68.44 | documented | TS, Figure 1 (p. 5). Figure 2-4's Z66.74 and Z70.00 are the rings either side of it |
| Mating section | Z13.44 to Z15.38 | documented | TS, Figure 1 |
| The hatch openings' aft sills | Z108.00 | estimated | a station of Figure 2-4, marked at the top of the cabin's aft end. The large pressure bulkhead is put 3 in aft of it ("Crew station") |
| Hatches' forward edges | Z151.62 | documented station; that it is the hatches' forward edge estimated | TS, Figure 1 (p. 5), which draws the line there. In S65-13244 the trough crosses the forward sill still several inches deep, which a sill at this station gives |
| Hatches' aft edges | Z106.0 | estimated | TS, Figure 1 draws the hatch from the heat shield's ring |
| Hatch, inboard edge | 5.7 in from the top centreline: the beam between the hatches is 11.4 in wide | estimated | S65-13244, scaled on the trough's width |
| Hatch, hinge | 62° round from the top | estimated | S65-13395 and Figure 2-3's end view. TS Figure 1's side view scales to 61° aft and 69° forward; a hinge line on a cone is a meridian, so one angle is kept |
| Window: where | its aft edge at the skin at Z141.3, its middle 41° round from the top; the opening from 27° to 55° | estimated | S65-21090 through the fitted camera: inboard edge 26° to 28° on both windows, outboard point 53° to 55°, aft edge Z141.3 to Z142.5 |
| Window: the pane's setting | 35° to the hatch's skin, its forward edge sunk | the form documented; the angle as drawn (38° measured on the page) | SEDR 300, Figure 2-10 |
| Window: size | 8.5 in from aft edge to forward edge at its middle, 14.8 in across | estimated | S65-21090: the opening is 370 by 224 pixels of 25 to the inch, seen nearly square on |
| Window: outline | a straight inboard edge, a short straight forward edge, and an arch from that round the outboard side to a point; its aft edge is where the pane's plane comes out through the cone, so it bows aft | estimated | S65-21090; the bow is TS Figure 1's "(" |
| Window: panes | an outer pane in its own frame; two inner panes in a frame bolted on inside with 35 bolts; Vycor | documented | SEDR 300, p. 2-18 and Figure 2-10 |
| Window: outer frame | gold-coloured, bolted | estimated | S65-21090 |
| Trough before each window | from the pane's forward edge (Z146.2, 5.2 in under the cone) to a tip at Z169; steep inboard, easy outboard; beaded forward of the hatch | form documented, every size estimated | SEDR 300, Figure 2-8; TS Figures 1 and 5 (the tip); S65-13244 (its section at the sill, and the beads in it); S65-21090 |
| Shingles | beaded René 41 on the cabin, unbeaded beryllium forward; black outside; the beryllium gold inside | documented | p. 2-21 |
| Beads | lie round the cone, one after another along it, 1.15 in apart and 0.22 in proud, in cells about 6.5 in round between rows of fasteners | direction by photograph; sizes estimated | S65-13395, S65-21090, S65-13244; S64-04925 draws the gear door's the same way |
| Shingle seams round the cabin | Z106.0, Z119.25, Z132.5, Z146.35, Z160.2, Z173.57 | Z132.5 and Z160.2 are stations of Figures 2-4 and 2-7; the rest estimated | five rings of about 14 in, as S65-13395 has |
| Doors below the hatches | a strip of plain plates under each hinge (62° to 66°), the equipment bay doors (66° to 112°, divided at Z132.5), the main landing gear door (112° to 143°), the doors underneath | which doors there are is documented; every edge estimated | SEDR 300, Figure 2-7 sheets 1 and 2 "(S/C 3)" and p. 2-10; TS Figure 1; S64-04925 (the gear door is a sector of about 31°) |
| Plates under the hinges | plain, the colour of bronze | estimated | S65-21090 (colour); S65-13395 |
| Cable cover | a white strip 2.0 in wide along the top centreline from Z116 to Z190.4, widening to 3.4 in over its last 6 in aft | estimated; that it is the "cover assembly, parachute control cables" (Figure 2-7, nos. 83 and 84) an identification | S65-21090: its edges at Z154 are 1.8 in apart |
| White disc | 3.6 in across at Z165.3, 17.5° left of the top | estimated; not identified | S65-21090, S65-13244 |
| Lettering | UNITED at Z137.5, STATES at Z131.5, the flag at Z118, on each side | estimated | the colour photograph of the liftoff (Wikimedia Commons, *Gemini 3 - Liftoff.jpg*), side on: the cabin is 185 pixels long in it. S65-21090 shows the last letters of both lines at the ship's left edge, where the fitted camera cannot be trusted for a station |
| Scanner fairing | a flat-faced box the colour of bronze on the crew's left, 84° from the top, Z166.5 to Z190.5 | estimated; that this is the scanners' fairing an identification | S65-21090; SEDR 300, Figures 11-12 and 11-13 |
| Fluid injection nozzles | a plate with three oval nozzles near the forward end of the right landing gear door, an arming receptacle half way along it | documented in form; its size and station estimated | NASA S64-04925, which has no dimensions |
| Adapter | aluminium rings, magnesium stringers and skin; white ceramic paint outside, aluminium foil inside | documented | p. 2-21 |
| Stringers | bulb-tee, the bulb a path for the coolant | documented; their number (40) a guess | p. 2-21 |
| Mating ring | machined aluminium, 120 in, twenty bolts | documented | p. 2-23 |
| Retaining straps | three, titanium, with a fairing over each: one 13° 08' above the ship's left side, one the same above its right, one 45° round from the bottom toward the right | documented | p. 2-21 and Figures 2-5 and 2-11; SP-121, p. 16; their places TS, Figure 3 (p. 10), "strap locations at Z103.44, looking forward" |
| Retrograde rockets | four, spherical, "approximately 13 inches in diameter", titanium cases, one in each quadrant of a cross of aluminium I-beams, each hung by lugs, with its nozzle aft and an igniter beside it | documented; their station (Z84), their distance from the axis (19.5 in) and the beams' depth (11 in) and flanges (3.2 in) estimated | pp. 2-23 and 11-71; Figure 11-32 (p. 11-70) |
| Thrust chambers, adapter: which and where | 1 to 8 (attitude) in four clusters at the equipment section's foot; 9 and 10 (forward) at the foot, top and bottom, firing aft; 11 and 12 (aft) on the retrograde section, one each side, firing forward; 13 to 16 (right, left, up, down) on the retrograde section at the left, the right, the bottom and the top; ten on the equipment section, six on the retrograde section | documented in number and in which way each pushes (SEDR VIII, Figure 8-72 and its table, p. 8-256; p. 2-23); the places are read off Figure 8-72, which is a sketch in perspective: estimated | 36° and 54° from the top or bottom at Z27 for the attitude clusters; 78° at Z95.5 for 11 and 12; Z86 for 13 to 16. 9 and 10 stand through the gold cover 52.5 in from the axis, their exits at Z16.84: NASA S65-63221 has them at 0.86 to 0.92 of the rim's radius |
| Thrust chambers, adapter: which way they fire | 5, 6 toward the top and 1, 2 toward the bottom (pitch); 3, 4 toward the crew's right and 7, 8 toward the left (yaw); 3 with 7 and 4 with 8 (roll); none along a radius | the table documented; that an aft chamber which pitches the nose up must fire toward the top is derived from it | SEDR VIII, Figure 8-72 |
| Chambers 13 to 16 on spacecraft 3 | inoperative | documented | SEDR VIII, Figure 8-72's note and p. 8-258 |
| OAMS tanks | fuel 21.13 in, oxidiser 21.12 in, helium 16.20 in across, one of each on spacecraft 3 | documented; which module they are on documented, where on it estimated ("Equipment section", below) | SEDR VIII, pp. 8-263, 8-271, 8-273 |
| Thrust chambers, re-entry control: which way they fire | 1, 2 toward the top (pitch down); 5, 6 toward the bottom; 3, 4 toward the crew's left (yaw right); 7, 8 toward the right; roll by 3 with 7 or 4 with 8 | documented | SEDR VIII, Figure 8-84 and its inset (p. 8-281) |
| Thrust chambers, re-entry control: where | four clusters on the diagonals, each a pitch and a yaw chamber side by side, 34° and 55° from the top or the bottom, each there twice (A ring and B ring) at Z183.4 and Z188.1 | the clusters documented (Figure 8-84; GIV, Figure 3-12); angles and stations estimated | S65-21090 through the fitted camera: 33° to 37° and 52° to 62°, Z183.2 to Z184.3 and Z187.7 to Z189.8. TS Figure 1's side view scales to 30° and 52° |
| Thrust chambers, re-entry control: splay | each turned 10° from the axis it fires along | estimated | the inset draws the arrows a little apart |
| Re-entry control tanks, each ring | a nitrogen ball 7.25 in across; a fuel tank 5.10 in across and 30.7 in long; an oxidiser tank 5.10 by 25.2 in | documented; how they lie in the section estimated | SEDR VIII, pp. 8-286, 8-288 |

## Equipment section

Laid out from McDonnell's drawing of it: the Technical Summary's Figure 4 (p. 12), "Adapter equipment module
structure", which names the ship's four sides (TY, BY, LX, RX) on the blast shield and gives three stations. SEDR
300's figures of each module show its form and agree with it; none of them is dimensioned. A place is given in the
module's own frame: out from the ship's axis toward the wall the module stands against, and along the beams.

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Blast shield | at Z66.74; not one sheet but the modules' own support panels and an access door, of aluminium honeycomb faced with glass fibre | documented | TS, Figures 3 and 4 and p. 13: "their support panels and an access door combine to form a blast shield" |
| Which module is where | two beams across the section; the OAMS module the segment beyond one, the fuel cell (or battery) module the segment beyond the other; between the beams the electronic module, the access door and the environmental control system's module with the primary oxygen | documented | TS, Figure 4. SEDR 300 vol. 1, Figures 5-1, 5-2 and 5-5; vol. 2, Figures 5-6 and 5-9; Gemini V report, Figure 3.1-2, which lists the modules |
| How the beams lie | the OAMS module's middle 23° round from the top toward the crew's right, so the fuel cell or battery module's is 23° from the bottom toward the left, the electronic module toward the right and the primary oxygen toward the left | estimated | measured on TS Figure 4 (the beams against its TY-BY line: 23°) and on SEDR VIII's Figure 8-72 (the row of tanks: 25°), two drawings from opposite ends |
| Beams | 15 in either side of the axis; 3.6 in deep | estimated | TS Figure 4 scales to 14 in and 20 in; four 21 in tanks have to go beyond one of them |
| Access door | 30 in by 34 in, in the middle | estimated | a third of the band between the beams, as TS Figure 4 draws it |
| Coolant pump module | a frame from Z28.61 to Z41.17 against the wall | stations documented; where round the wall (61° from the top toward the left), its width and depth estimated | TS, Figure 4 |
| OAMS module | a frame straight on its inboard side and curved to the wall, four places in a row for a 21 in tank: 24.5 in from the axis, 21.5 in apart, the tanks' middles at Z50 | the form documented; every size estimated | SEDR 300 vol. 1, Figure 6-10 sheet 5; Gemini V report, Figure 3.1-3; SEDR VIII, Figures 8-72 and (vol. 2) 8-94 |
| What is in the four places | one tank each of fuel and oxidiser in the middle two, on spacecraft 3, 4, 5 and 7; a drinking water tank of the same pattern at each end on 5 and 7; fuel in the middle two and oxidiser at the ends on spacecraft 6 | that there are so many of each documented; the water tanks at the ends documented (Figures 6-10 sheet 5 and 3.1-3); which place is fuel estimated | as above; SEDR VIII vol. 2, Figure 8-96 sheet 1 |
| Helium | between two propellant tanks and the wall, 38.8 in from the axis at Z43 | estimated | Figure 8-72 draws the pressurant tank inboard of the row; there it would stand under the access door, in the pod's way on spacecraft 5 |
| Valve packages | the regulator and the packages lettered A to E on one manifold along the module's inboard side | documented that they are there; forms and place estimated | SEDR VIII, Figure 8-72 |
| Fuel cell module | the two sections at one end of the row (the left, toward the primary oxygen), then the hydrogen, then the oxygen | the order documented; which end estimated from the figures' insets; sizes as "One ship from the next" | Gemini V report, Figure 3.1-5; SEDR 300 vol. 2, Figure 5-6; vol. 1, Figure 5-5 |
| Battery module | spacecraft 3: three batteries in a row and one water tank, a drum in two bolted halves; spacecraft 4: six in two tiers of three, four such drums in pairs at the ends of the lower tier, and a bottle of oxygen; spacecraft 6: three in a row from one end, a water tank that is a ball at the other, and its oxygen bottle | which and how many documented; sizes and places estimated | SEDR 300 vol. 1, Figures 5-2 and 6-10 sheets 2 and 4; vol. 2, Figures 5-9 and 6-10 sheet 3 |
| Primary oxygen | a ball 18 in across under its own panel, 31 in from the axis | that it is a ball under the ECS module's panel documented; size estimated | TS, Figure 4; SEDR 300, p. 6-7 ("a cryogenic spherical container") |
| Electronic module | five boxes hung under their panel | that there is an electronic module there documented; every box a guess | TS, Figure 4 |
| Temperature control cover | gold-coated glass fibre cloth, gathered in from its rim (57 in from the axis at Z15.6) to a hoop 44 in across at Z33.5, with a flat disc inside the hoop | that it is there and its material documented; its form estimated | SEDR 300, p. 2-23. Measured on NASA S65-63221 (spacecraft 7 from behind, 15 December 1965): an ellipse fitted to the rim has axes of 748.7 and 564.9 pixels, so the camera stood 41° off the ship's axis; the hoop's middle is 147 pixels from the rim's along the axis and the hoop 270 pixels in half-width, which is 18 in forward of the rim (good to 3 in) and 44 in across (good to 4 in). Taken to be the same on every ship |
| Opening in the cover's disc | 10.6 in by 8.8 in, on a ship with the spectrometer | estimated | S65-63221 |
| Pod (spacecraft 5) | hung under the access door, in the middle; the transponder that is its body 10 by 10 by 20 in; its spiral antennas standing 2 in off the case; its dipole on a fixed boom 2 ft long; its cover "an oval, plane structure" on four tubular posts that reach aft past the pod | documented | SEDR 300 vol. 2, Section VIII, pp. 8-291 to 8-299 and Figures 8-79 and 8-80; Gemini VII report, 3.1.1.2 ("on the blast shield access door") |
| Pod: everything else | which way the transponder lies, which faces the batteries, regulator, antennas and lights are on, the cover's outline (29 in across over the pod, running out 44 in over the dipole) and its station (Z33.1, in the gold cover's disc) | estimated | Figures 8-79 and 8-80, which have no dimensions |

## Crew station

Built by [gemini_cabin.py](gemini_cabin.py), only where an inside is built (full detail). The panels are spacecraft
3's, from SEDR 300's Figure 3-5 sheets 1 and 2, both captioned "(S/C 3)". A point is (inches toward the top, inches
to the crew's right, station).

**The station is fitted round the two men, not drawn.** Nothing read gives the pressure vessel's dimensions, a
seat's place in it or a panel's. What is documented is the outside (the cone, 90.00 in across to 38.66 in over 70.53
in), the seat (its size and its cant), who sat in it, and what an ejection asks of him: "during seat ejection, the
pilot's feet must be in place" in the stirrups (SEDR 300, p. 3-13), so that is how each man rode the launch. A man of
known stature in his suit ([g3c-suit.md](../crew/g3c-suit.md)), sitting so on that seat under that cone, leaves very
little to choose, and the station is laid out by what he leaves. The fit, with both men aboard:

| | Grissom (170.2 cm) | Young (175.3 cm) |
| --- | --- | --- |
| Helmet, under the hatch's inner skin | 0.94 in | 0.61 in |
| The least room anywhere between him and the vessel's sides and bilge (it is at the toe of his outboard boot, Z143) | 1.36 in | 1.61 in |
| Boots, over the floor's flat | 4.6 in | 5.0 in |
| His inboard arm, from the ship's middle | 1.8 in | 1.8 in |
| Knees: the top of his thigh, against the panels' lower edge 3 in above the axis at Z141.5 | 1.2 in above the axis at Z135; the front of the knee at Z141.6, 0.9 in below the axis | 1.6 in at Z135; Z142, 0.1 in below |
| Heels, over the stirrups' platforms | 0.2 in | 0.2 in |
| Eyes (toward the top, off the middle, station) | 20.7, 18.1, Z128.6 | 21.3, 18.2, Z128.6 |

(`gemini_cabin.seat` prints the first three at every build, aboard or not.) Each figure below that is not marked
documented is set by that fit or read from the picture named, and is `estimated`. Four things in the sources bear on
where the seats are, and the fit was held to them:

- **SEDR 300's Figure 3-1**, lower view, looks aft at both seats inside the 90 in circle (8.94 pixels to the inch
  at 200 dpi). It has the seats' tops 29.6 in above the axis and 20 in off the middle, the buckets' inboard edges
  2 in off the middle and their outboard edges 21, and the vessel's sides flat, leaning 24° from upright, 38 in off
  the middle at the hinge and 14 at a floor 32 in below the axis. As built: tops 31.3 in above and 20.4 off;
  buckets 1.4 and 21.3; sides leaning 20° (the figure's upper view has 18°), 36.7 in off the middle at the hinge
  and 15.3 at a floor 30 in below. **One misfit is recorded:** the figure draws the stirrups' feet 20 in below the
  axis and they are built 26.3 in below it. The seat is 54 in tall and its top cannot go higher under the hatch, so
  the figure's seat is some 6 in shorter than the Smithsonian's two; the figure is "typical" and carries no scale.
- **S65-13244** looks down into this spacecraft on 6 January 1965 with a man in each seat. Its scale along the beam
  between the hatches runs from 25 pixels to the inch at the openings' aft sills to 9 at their forward ends (on a
  copy 1100 pixels wide) and is linear up the picture, which fixes stations along it: the face of the headrest's
  pad stands 8 to 11 in forward of the aft sill (Z114 to Z119 by two ways of reading it), the seats' white shrouds
  reach back to the sill, and the men's heads are in the aft third of the openings. As built the pad's face is at
  Z119.6. The pass before this one had it at Z124.3, and the helmets through the hatch because the cone is 1.7 in
  smaller there.
- **The Smithsonian's side view of a seat** (A19690023000) has the bucket standing at about 100° to the back, not
  square to it, measured on the picture (good to 5°). With the back canted 8°20' forward that leaves the pan very
  nearly along the ship's axis, and the stirrups 3 in higher in the ship than a square bucket would have them.
- **The same collection's front views** show that the lightening holes are in the sides of the back, which is a
  tray 5 to 6 in deep with the backboard and the parachute in it, and that the box channel up the back is where
  the rocket catapult stands behind. So a seat is 4.8 in deep behind the plane of its tray's front, not the 7.4 in
  the pass before gave it (rails with holes behind the back), and stands that much further aft.

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Seats' cant | 12° outboard, 8°20' forward | documented | SEDR 300, p. 3-3 ("12° outboard and 8° forward"); Technical Summary, p. 209 ("8 degrees 20 min forward"). Forward is toward the nose: the cant is "to provide required elevation" for an ejection off the pad, where the nose is up |
| Seat | 22 in wide, 54 in tall, 27 in deep | documented | Smithsonian A19710058000 ("22 x 55 in", a spare that was fitted in spacecraft 3) and A19690023001 (a training seat, 24 by 54 by 27 in). As built 22 wide and 54.7 from the stirrups' feet to the head of the catapult's fitting. **Its depth is a misfit:** 28.9 in from the back of its tray to the front of the stirrups' platforms, 1.9 in more than the 27. The bucket's 19 in is the pass before's and was not derived again; a shallower bucket would bring the heels aft, where the cone leaves more room, so the fit errs on the tight side |
| Seat's form | a tray for a back, beaded, with a box channel up it and lightening holes down its sides; a five-sided shroud over its head with the catapult's fitting at the peak, white; the rocket catapult behind the channel; tee rails on the bulkhead; a bucket with arm sides rounded down to the front; a guard before the shins; two stirrups, each a frame of tube with a short platform and an edge up its outboard side; arm loops of 1/2 in tube; the D-ring on the bucket's front | by photograph and figure | the Smithsonian's photographs of both seats; SEDR 300, Figure 3-2 and pp. 3-5 to 3-13; the white shrouds are S65-13244's |
| Seat: pan to the shroud's top | 40.5 in | estimated | the Smithsonian's front view of A19690023001, scaled on its 54 in with the nearer parts allowed for |
| Seat: pan to the stirrups' foot, down the bucket's front | 14.5 in | estimated | the same photograph scales to 14 to 15.5. With the bucket raked it makes the seat's 54 in |
| Seat: the bucket's rake | 10° (the bucket at 100° to the back), about a line 8 in forward under the man's seat | estimated | the Smithsonian's side view, above |
| Seat: stirrups | 4.9 in either side of the seat's middle; platforms 3 in deep | estimated | where the feet of a man sitting straight in it come; the Smithsonian's front view has them at about 4.5 |
| Large pressure bulkhead | Z105.0, square to the ship's axis | estimated | at the head of the ring the heat shield is bolted to (Z104.94). SEDR 300's Figure 2-5 shows it directly behind the heat shield's rim. The pass before had it at Z108.00, which is only a station marked at the top of the cabin's aft end in Figure 2-4 and is kept for the hatch openings' aft sills. Derived from the fit: it is what puts the headrests where S65-13244 has them |
| Seat's reference point (the pan's top, in the plane of the tray's front) | 9.9 in below the ship's axis, 11.6 in off the middle, Z111.45 | estimated | **Station**: as far aft as the bulkhead lets the canted seat stand, the catapult's foot 0.4 in off it. **Off the middle**: Figure 3-1, above (the buckets all but meet). **Height**: so that a man of 175.3 cm on it has 0.6 in between his helmet and the hatch's inner skin, which is as high as the seat can go; S65-22665 and S65-20605 show Grissom's helmet close under the sill's plane and level with the seat's top fitting, and no nearer measure could be taken from them |
| Where a man sits | his back 3.2 in forward of the reference point, his seat 1.75 in above the pan | estimated | the backboard's cushion, and an egress kit some 2.5 in thick under him. The figure's seat does not flatten as a sitting man's does: it puts the top of his head 36.0 in above what he sits on where a man of 170.2 cm has about 35.2 (sitting height 0.525 of stature), so he is set 0.85 in into the kit and the kit's cushion is drawn that much thinner |
| Empty seat's eye point | 33.5 in up the back from the pan and 12.4 in forward of it: (20.8, ±18.1, Z128.6) | derived | Grissom's own eyes, as seated |
| Vessel: flat sides | leaning 20° from upright; at the height of a seat's pan 24.0 in from the middle at the large bulkhead and 22.2 at the small one | estimated | the lean from Figure 3-1 (24° in one view, 18° in the other); the distance so that the seats' backs (22.4 in off the middle at that height) clear by an inch or more. Forward the cone closes in and less and less of the side is left |
| Vessel: floor and bilge | flat 30 in below the axis aft, 15.3 in either side; forward it rises with the cone and narrows to 8 in either side by Z140; between it and the sides the vessel follows the cone 2.0 in inside its mould line | estimated | Figure 3-1 for the aft end. The 2.0 in is what the men's boots leave: 0.4 in more than the frame under the shingles as built. Technical Summary Figure 2 names equipment doors under the cabin forward of the heat shield; what room they have under the forward floor is not established |
| Small pressure bulkhead | Z160.20 | estimated | a station of Figure 2-4; the hatches end at Z151.62 and the vessel runs on under the fixed roof |
| Each man's panel | 14.5 in along its lower edge and 12.7 in to the top of its tab; its inboard edge upright and its lower edge falling 12.6° outboard, as drawn; turned 14° toward him | size derived from the figure; the turn estimated | Figure 3-5 sheet 1 at 47 pixels to the inch, the scale its 5.05 in velocity indicator and 3.38 in keyboard give (SEDR VIII, pp. 8-164, 8-172, 8-252) |
| Centre panel | 11.2 in wide, 18.5 in tall | derived | the same scale. The research for this pass had about 15 in wide; by the keyboard it is 11.2 |
| Pedestal | 12.5 in long, tapering from 11.2 to 5.8 in | derived | the same |
| Panels' place | lower edge 3 in above the axis at Z141.5, leaning back 30° | estimated | under the forward sill, as S65-13244 shows them; square to the eye. A seated man's knees come just under and aft of that edge |
| What is on each panel | as listed in the module, instrument by instrument | documented | Figure 3-5 sheets 1 and 2; GIV 3.1.2.5 and 3.1.2.9.1 (no clock on the command pilot's panel; the re-entry control switches on the pilot's; ACME logic on the pedestal) |
| Instruments' sizes | velocity indicator 3.25 by 5.05 in; readout 3.26 by 5.01; keyboard 3.38 square; clock 2 1/4 square | documented | SEDR VIII, pp. 8-164, 8-172, 8-218, 8-252 |
| Instruments' graduations | accelerometer -6 to 16 g; altimeter one turn in ten; rate of descent 0 to 70 ft/s | estimated | read off the figure, which is too small to read a scale from |
| Overhead, left and right switch and circuit breaker panels | 9.8 by 11.4 in; 12.5 by 8 in | derived from the figure; their places estimated | Figure 3-5 sheet 2; S65-13244 for the side panels, which stand on the sides forward of the knees (Z139.5 to Z152, 20.3 in off the middle), where a knee in the stirrup posture leaves room. The five pull handles along the overhead panel's forward edge read CABIN RECIRC, SNORKEL, CABIN VENT, WATER SEAL and O2 HI RATE RECOCK, in the figure's order: documented (Figure 3-5 sheet 2, S/C 3) |
| Abort handle | on the left side at Z134, its knob 1 in below the axis and 22.1 in off the middle | documented that it is there; place estimated | SEDR 300, Figure 3-1 (below the left switch panel); S65-23489 has the command pilot's hand on it below his elbow. It is put where his left hand comes to it with his elbow at his side |
| Attitude hand controller | on a console 3.6 in wide between the seats' buckets, Z127.3, its grip from 4 in below the axis to 1.8 above | documented that it is between the seats; place estimated | SEDR 300, Figure 3-1 (at the pedestal's foot). The console is as wide as the two buckets leave |
| Manoeuvre hand controller | under the command pilot's panel, 7.1 in from the panel's outboard corner | documented that it is under that panel; **place contradicts the figure** | Figure 3-1 draws it under the panel about 4 in from its outboard end. That is where the command pilot's left knee is with his feet in the stirrups, so it is built 3 in further inboard, between his knees. The figure is a perspective sketch and "typical"; if it is right to the inch, the knee and the controller's housing touch |
| Secondary oxygen shutoffs | a quadrant and lever on each side beside the seat's bucket, 6 in below the axis at Z126 | documented that there is one each side; place estimated | SEDR 300, Figure 3-1 ("ECS control, secondary O2", outboard of each seat); Figure 3-5 sheet 2 draws each beside its switch panel |
| Drinking water | a container 5.8 in across and 16.8 in tall, upright on the large bulkhead between the seats' backs (2.2 to 19 in above the axis) | documented: 16 lb, "forward of the aft pressure bulkhead, between the seats" (p. 3-26); form and place estimated | the container's form was not found. Between the backs, above where the two seats all but meet, is where 16 lb of water has room |
| Stowage, floodlights, hatch curtains | a box on the centreline over the water; one on each side outboard of the seats' backs, where Figure 3-1 draws the waste stowage; lights and curtains as before | documented that they are there; places estimated | SEDR 300, Figure 3-1 and pp. 2-19, 3-20, 3-26 to 3-31 |
| Experiments on the hatches | each 20° round from the top, its aft end at Z134.5 | documented which hatch; place estimated | forward of a seated man's helmet, which is within an inch of the hatch from Z120 to Z134, and inboard of the window |
| The three-knob panel between the men | one panel, on the front of the water container between them at shoulder height (13.4 to 17 in above the axis; Figure 3-1 has it at about 17), with the three valves of Figure 3-5 sheet 2 (condensate, water tank, waste) | **derived**: that SEDR 300's two panels are one | The manual names a three-knob panel twice. Figure 3-1 draws a "drinking control panel" between the seats' heads, and p. 3-26 has drinking controlled "by means of a 3-knob panel located between the pilots at approximately shoulder level". Figure 3-5 sheet 2 ("S/C 3") draws a "water management panel" with three valves, and p. 6-30 has "a three knob panel ... for managing, replenishing, and dumping waste water overboard", without saying where it is. No figure shows two. The model takes them for the same panel: Figure 3-5's three valves, standing where Figure 3-1 puts the drinking panel. If they were two, the drinking panel's own knobs are not built |

**What the viewer is promised** is what the Mercury cabin promises
([mercury-cabin.md](../../mercury/vehicles/mercury-cabin.md)): `Seat_CommandPilot` and `Seat_Pilot`, empties at the
seated eyes; `Gauge_Accelerometer`, `Gauge_Altimeter`, `Gauge_RateOfDescent`, `Gauge_RangeRate`, needles on their
pivots with their scales in their extras; `Gauge_ClockHours` and `Gauge_ClockMinutes`; the tape gauges' pointers
(`Gauge_Stage1Fuel` and the rest), each sliding along its own X; `Ball_CommandPilot` and `Ball_Pilot`, the two
attitude balls, each a node at its own middle; `Tele_...` lamps, each with its own material; `Ctl_Abort`,
`Ctl_AttitudeController`, `Ctl_ManeuverController`, `Ctl_EjectCommandPilot`, `Ctl_EjectPilot`; `Lamp_Left`,
`Lamp_Right` and `Lamp_Centre`, the three floodlights' lenses; `Ctl_CabinLights`, the CENTER LIGHT switch's lever
at the head of the overhead panel's forward row, its origin on its pivot and its `throw` extras its three positions
(WHT as built, OFF, RED: SEDR 300 p. 3-20, "The center floodlight WHITE-OFF-RED control switch is in the forward row
of the overhead panel", and Figure 3-5 sheet 2, which draws it there with RED over OFF over WHT: documented; how far
the lever leans is the Mercury toggle's: estimated). The lights are the type's (`gemini-titan.ts`: `LIGHTS`) and each
flight declares its cabin (`gemini-titan.ts`: `cabin`; Gemini-Titan 3, without the g.m.t. clock, its own): the inside is lit as indoors by the three floodlights and the instruments, lamps and controls are named.
No flight deck reads them yet: nothing of the flight is simulated, so every needle stands as built and says so.

**The men** are a suit module's seated figures ([g3c-suit.md](../crew/g3c-suit.md)), built into a seat by the
flight's script through `Fit.crew` (`gemini_cabin.seat`): with a man aboard the seat's restraint is laid over him
(the reel's two straps over his shoulders to his harness's quick disconnects; the lap belt from the bucket's sides
round his hips into the fold his raised thighs make, where the rest of it and its buckle are out of sight and not
built) and the seat's node is at his own eyes. Aboard or not, each build measures the room the cabin has for him and
prints it.

**What each man sees and reaches**, seated: the middle of his window is 15 in before his eyes and within 2° of
straight ahead (Grissom 0.9° above, Young 1.4° below); the window's forward, sunk edge is 7° to 9° below straight
ahead, so the lowest line he sees through it runs out along the trough's floor, which falls 8° toward the nose. The
command pilot's left hand is on the abort handle with his elbow at his side; the attitude controller is 16 in from his
right shoulder, inboard of his right knee; the D-ring is between his thighs at the bucket's front; the panels'
lower edge is over his knees and the centre panel an arm's length away. The pilot has the same, mirrored, without
the abort handle.

**Not fitted:** the legs stretched forward off the stirrups, as in orbit. Tried once (thighs 100° from the back,
knees bent 48°) the heels come 2 to 3.6 in through the bilge at Z151, so the forward floor as laid out is the
stirrup posture's and nothing more.

## Propulsion

| | | Confidence |
| --- | --- | --- |
| OAMS attitude | eight chambers of 25 lbf | documented (SP-121, p. 16, where the figure is misprinted "95"; *Chronology*, p. 191) |
| OAMS translation | two of 85 lbf firing forward, two of 100 lbf firing aft, four of 100 lbf sideways, up and down | documented (SEDR VIII, p. 8-260: "six one-hundred pound and two eighty-five pound"; SP-121, p. 16; which numbers do what: Figure 8-72) |
| Re-entry control | sixteen chambers; 25 lbf each | documented (SEDR VIII, p. 8-284) |
| Retrograde rockets | about 2,500 lbf for 5.5 s each, fired one after another | documented (press kit, p. 8) |
| Propellants | monomethylhydrazine and nitrogen tetroxide | documented (SEDR VIII, p. 8-260) |

## Sections

| Node | What it is |
| --- | --- |
| `NoseFairing` | the glass-fibre cap, thrown off on the way up |
| `RendezvousRecovery` | sixteen beryllium shingles over a titanium frame; its forward face; inside, the main parachute's pack, the drogue's mortar and the pilot parachute's |
| `ReentryControl` | eight beryllium shingles, the sixteen chambers in their oval ports, the forward end of the cable cover, six tanks inside |
| `Hatches` | both hatches: beaded skin, the plate the window is let into, hinges, the socket for the outside handle; each window's bolted frame, outer pane, well, two inner panes and inner frame; the twelve latches; the experiments a flight carried on their inner faces |
| `ScannerFairing` | the cover over the horizon scanners, and its rivets |
| `Cabin` | the beaded shingles in their cells, the troughs before the windows, the plain plates, the frame under them, the cable cover, the white disc, UNITED STATES and the flag on each side, the three strap fairings, the fluid injection nozzles' plate |
| `CrewStation` | the pressure vessel; the two ejection seats on their rails; each man's panel, the centre panel, the pedestal, the centre console with the attitude hand controller, the overhead and the two side switch and circuit breaker panels, the water management panel; the abort handle and the manoeuvre controller; the drinking water, three stowage boxes, three floodlights, the hatch curtains |
| `HeatShield` | the ablator and the structure behind it |
| `RetroSection` | skin, foil, rings and stringers; the band it is cut at; six chambers in their ports (13 to 16 dummies on this ship); inside, the four rockets with their nozzles, igniters and lugs on a cross of I-beams |
| `EquipmentSection` | skin, foil, rings and stringers; the mating ring and its bolts; ten chambers (eight in oval ports, two standing through the cover); the gold cover across the foot, gathered to its hoop; inside, the blast shield's panels and door on their two beams, and under them the OAMS module with its tanks and valve packages, the battery or fuel cell module, the primary oxygen, the coolant pump module and the electronic module |

Below three-quarters detail nothing inside is built and the windows are dark panes; below full
detail the beads are half as many; below half there are none, and the thrust chambers' ports are
collars and dark ovals on the skin. The troughs and the windows' frames are there at every level.

## One ship from the next

The module was written for spacecraft 3. A flight's `model/vehicle.py` says what its own ship had
in a `Fit`, and each thing in it is off unless asked for, so spacecraft 3's model is what it was
(rebuilt beside the old one when these were added: the same nodes and the same size at every
level). What each rests on is in the flight's own `spacecraft.md`.

| `Fit` | What it builds | First on | Sizes and places |
| --- | --- | --- | --- |
| `radar` | four spiral antennas on the forward face, in place of the ribbed cover | spacecraft 5 | scaled from the Gemini V mission report's Figure 3.1-4a: estimated |
| `lateral_thrusters` | OAMS chambers 13 to 16 as real chambers, or as dummies in steel | real from spacecraft 4 | the type's |
| `adapter_batteries` | that many 400 Ah batteries hung from the battery module, three to a tier (0 on a fuel cell ship) | 3, then 6 on spacecraft 4 | the tiers are SEDR 300 vol. 1's Figure 6-10 sheet 4; sizes estimated |
| `water_tanks` | that many small water tanks on the battery module, each a drum in two bolted halves: one beside the batteries, or two pairs at the ends of the lower tier with a bottle of oxygen | 1, then 4 on spacecraft 4 | their form and arrangement are Figure 6-10 sheets 2 and 4; sizes estimated |
| `water_spheres` | drinking water tanks of the OAMS propellant tank's pattern, at the two ends of the OAMS module's row | 2 on spacecraft 5 | 21.12 in, that tank's size on the early ships: assumed; their places documented |
| `fuel_cells` | two fuel cell sections, a hydrogen tank and an oxygen tank in a row beyond the beam, where a battery ship has its batteries | spacecraft 5 | the tanks' insides derived from their loads; the rest estimated |
| `pod` | the rendezvous evaluation pod and its silvered cover, as the node `RadarEvaluationPod`, hung under the blast shield's access door; its mount and four posts, which stay; the gold cover cut back round its cover | spacecraft 5 only | "Equipment section", above: three sizes and its place documented, the rest scaled from SEDR 300 vol. 2's Figures 8-79 and 8-80 |
| `eva` | the hand-held manoeuvring unit and the umbilical between the seats' heads, as the node `ExtravehicularEquipment` | spacecraft 4 | the unit's folded size is the Smithsonian's; the rest estimated |
| `right_hatch_opens` | the pilot's hatch as a node of its own, `HatchRight`, its origin on its hinge, for a flight to swing | spacecraft 4 | the hinge is the type's, estimated |
| `gmt_clock` | a 24-hour clock on the command pilot's panel where spacecraft 3 had a blank | spacecraft 4 | its place and face are the Gemini IV mission report's Figure 3-14; its size assumed from the pilot's clock |
| `white_disc` | the unidentified white disc forward of the left hatch | spacecraft 3; left off the others | read off photographs of spacecraft 3 |
| `experiments` | by name: spacecraft 3's three; spacecraft 4's spectrometer and magnetometer boom in the adapter | | each flight's record |
| `crew` | the man in each seat; without it the seats are empty | spacecraft 3 (the G3C suit) | [g3c-suit.md](../crew/g3c-suit.md) |
| `battery_module` | the battery module as spacecraft 6 had it: the batteries in one row from one end, and at the other one drinking water tank that is a ball, with its bottle of oxygen | spacecraft 6 | SEDR 300 vol. 2, Figures 5-9 and 6-10 sheet 3, which have no dimensions: estimated |
| `oams_tanks` | that many each of the OAMS's fuel, oxidiser and helium tanks; with two, propellant fills all four places of the module's row | 2 on spacecraft 6 | the number and the tanks' sizes are SEDR 300 vol. 2, Section VIII, Figures 8-94 and 8-96: documented; which place is which estimated |
| `mooring_latches` | three latch receptacles round the rim of the forward face, under the nose fairing | spacecraft 6 | SEDR 300 vol. 2, Figure 13-2, which has no dimensions: estimated |
| `transponder` | one spiral antenna on the forward face, where the radar's four would be | spacecraft 7 only | the pod's antenna's size, itself scaled from a sketch; to one side of the face, as one photograph has it |
| `acquisition_lights` | two flashing lights at the foot of the adapter, left and right | spacecraft 7 only | that there were two, on opposite sides, is documented; which sides and their form estimated |
| `retro_water_tank` | a third drinking water tank, a ball on a tray in the retrograde section | spacecraft 7 only | 13.05 in inside, derived from its 42 lb; its place read off two sketches |
| `oams_reserve_tank` | the OAMS's reserve fuel tank, a cylinder lying along the OAMS module's inboard side | spacecraft 7 only | 5.10 in by 30.7 in: SEDR 300 vol. 1, Section VIII, p. 8-271, documented; its place estimated |
| `hydrogen_insulated` | the fuel cells' hydrogen tank in its wrap of aluminised mylar | spacecraft 7 | the wrap's thickness a guess |
| `range_indicator` | the radar's range and range-rate indicator on the command pilot's panel; off, a blank | off on spacecraft 7 only | the blank is its report's Figure 3.1-12 |
| `get_clock` | a digital clock of elapsed time on the centre panel, where the flight plan roller was | spacecraft 7 | its place is the roller's; its form estimated |
| `index_bar` | the docking system's index bar in its casing across the forward section, at the top of the ship, as the node `RR_IndexBar` for a flight to run out; and the main parachute's container as the manual for these ships gives it | spacecraft 8 | its 13.82 in of travel is the Technical Summary's (p. 241) and the container's 22.25 by 21.32 in SEDR 300 vol. 2's (p. 12-17): documented; the bar's station (Z223.4) is scaled from the Gemini VIII report's Figure 3.1-9 and its thickness from SEDR 300 vol. 2's Figure 13-8: estimated |
| `docking_light` | the rendezvous and docking light, a lamp at the top of the adapter's forward end, looking forward | spacecraft 8 (the earlier ships had one that is not modelled) | "centered above and just aft of the heads of the flight crew", 4,000 candlepower (Technical Summary, p. 327): documented; its station and form guesses |
| `eva_light` | a smaller lamp behind it, looking aft along the handrails | spacecraft 8 | that it was at the adapter's forward end and pointed aft is documented (Gemini VIII report, 3.1.2.12.1 and Figure 3.1-9); its form a guess |
| `handrails` | two rails along the adapter behind the right hatch, flush with the skin, as the nodes `Retro_Handrail` and `Equipment_Handrail` for a flight to stand out | spacecraft 8 | 0.55 by 1.25 in, 21 in and 46 in long with 9 in between, 1.5 in off the skin when out (NASA SP-149, p. 5-6): documented; where round the ship (12° right of the top) scaled from the Gemini VIII report's Figure 3.1-9: estimated |
| `fuel_cell_row` | the fuel cell module with a section, the oxygen tank, the other section and the hydrogen tank in a row, and the two tanks those of a short mission | spacecraft 8 and 9 | the order is SEDR 300 vol. 2's Figure 5-7 and the loads (5.80 lb, 46.0 lb) its p. 5-33: documented; the tanks' sizes derived from the loads (18.8 in and 15.4 in across, with a guess at the insulation); places estimated |
| `module_water_tank` | water tank A, a 42 lb ball on the fuel cell module (with `retro_water_tank` for tank B) | spacecraft 8 | two tanks of 42 lb, one in each section (Gemini VIII report, 3.1.2.3.5 and Figure 3.1-2): documented; its place on the module read off SEDR 300 vol. 2's Figure 6-10 sheet 6: estimated |
| `backpack` | `"esp"` or `"amu"`: the gold cover gathered to an oblong opening instead of a hoop; a thermal cover over the opening and the backpack behind it, as the node `ExtravehicularSupportPackage` or `ManeuveringUnit`; the torque box it hangs from; two hand bars, a foot rail (with stirrups, for `"amu"`), two floodlights and an umbilical guide, folded as at launch | spacecraft 8 (the ESP), spacecraft 9 (the AMU) | the packs' sizes (26 by 21 by 17 in; 32 by 22 by 19 in) are the press kits'; the torque box's stations (Z66.74 to Z56.27) and the pack's turn of 22.5° are the Gemini IX-A report's Figure 8.1-18; the hand bars' 1.38 in is SP-149's: documented. The opening (40 by 27 in) is scaled from NASA S-67-802 and the bars' and rail's places from the reports' sketches: estimated. The ESP is assumed to hang as the AMU did |
| `gold_inside` | the adapter's inner surface gold where the earlier ships' is aluminium foil | spacecraft 9 | "The inner adapter surfaces of spacecraft 9 through 12 are gold plated" (SEDR 300 vol. 2, p. 2-17): documented |
| `window_covers` | a framed pane over each hatch window | spacecraft 9 | that each was an earlier ship's outer window, hinged on and sprung off, is documented (Gemini IX-A report, 3.1.1); its form estimated |
| `retro_experiments` | by name, a package on the outside of the retrograde section behind the right hatch: `"s-9"` (8.5 by 6 by 3 in, in a well) or `"s-12"` (11 by 5.5 by 1.25 in) | spacecraft 8; spacecraft 9 | sizes are the press kits': documented; the place (36° right of the top, Z93.5) estimated |

Every ship's equipment section is laid out the same way ("Equipment section", above), and a
`Fit` only says what hangs on each module. Spacecraft 3, 4 and 5 ask for none of the ten before
these, and spacecraft 3 to 7 for none of these ten, which were added for spacecraft 8 and 9 (when
they were, the five earlier ships were rebuilt at every level of detail and came out the same byte
for byte).
(When those ten were added the three ships' GLBs came out the same byte for byte. The equipment
section was laid out again from McDonnell's drawing after that, in November 2026, and all five
ships were rebuilt.)

Where a part's own words tell what happened on Gemini-Titan 3, a later flight gives its own
(`SAYS` in its script, applied by `gemini_stack.build`).

## What the model gets wrong or leaves out

- **The pressure vessel is fitted, not drawn** ("Crew station", above). Its flat sides, its
  floor and where the seats and panels stand in it are what two seated men, the documented seat
  and the cone allow, not what McDonnell built; its double skins are single, its stiffeners are
  on the large bulkhead only, that bulkhead is flat and square to the axis where the real one's
  form is not known, and the equipment bays between it and the cone are empty but for the
  experiment's water tank.
  Its roofs and the beam between the hatches follow the cone and are shaded as curves
  (`gemini_cabin.round_off`); its sheets are shaded flat. The roof forward of the hatches is
  cut in cells of about an inch and a half, so the wall of a trough let down into it (2 in wide)
  is a cell or two: a crease where the real section is not known.
- **The seat** is the Smithsonian's two in form and size, with little of what was packed on it:
  the parachute and the raft are one pad behind the backboard, the egress kit a thin pad (thinner
  than the fit implies: "Crew station"), and there is no ballute, survival kit, drogue mortar,
  seat-man separator, leg strap or elbow restraint. Its tee rails stand off the square bulkhead
  on plain struts. The lap belt is built only as far as the fold of each hip, where a seated
  man's raised thighs cover the rest and its buckle; the gas hoses to the suits are not built.
- **The panels are the drawing's in layout and scale, and estimated in every graduation.** The
  figure is too small to read a scale or most legends from, so a face has the range its instrument
  is known to have and the legends that can be read. The event timer, the velocity indicator and
  the computer's readout are counters standing at nought, not wheels. The attitude balls are
  nodes that can be turned, with no needles of the flight director on them. The switches all
  stand one way. The circuit breakers carry their rows' titles, not each its own legend. The
  plotting board, the optical sight, the bio-medical recorder, the utility lights and the mirror
  are left out, and so are the stowage boxes on the side walls.
- **The inside's shadows are not baked.** Its three floodlights are described to the viewer and
  light it as indoors, but nothing here casts the cabin's own shadows into its vertices as the
  Mercury cabin's are (`mercury_cabin.shade`).
- **One switch for three floodlights, and the red light estimated.** The CENTER LIGHT switch on the overhead panel was the
  centre lamp's alone; each side lamp had its own WHITE-OFF-RED selector and a rheostat on its fixture (SEDR 300,
  p. 3-20). The fittings are plain blocks with a lens, so the one switch that is built throws all three and none can
  be dimmed. At RED each lamp lights from its own fitting in red at a third of its white strength (colour and
  strength chosen by eye), and the cabin's shade is not baked at all (above), so nothing of the red's own shadow is
  drawn.
- **The windows are placed from one photograph.** Where each is, its outline and the trough's are
  S65-21090's, through a camera fitted to it: two inches and three degrees. SEDR 300's section
  (Figure 2-10) marks station Z136.50 at the pane's sunk end. The photographs and both of the
  Technical Summary's side views put the sunk end forward, at about Z146, and the pane's aft edge
  at Z141 to Z143; a window with its sunk end at Z136.50 would lie ten inches aft of where four
  pictures have it. The station is not used, and what it marks is not understood. The glare shield
  is left out, and so are the brackets the outer frame is held by; the outer frame's bolts are a
  guess at their number.
- **The trough is a designed shape.** Its floor is the pane's own plane beside the window and a
  surface that shallows evenly from there to the tip; the real one is a pressing whose section is
  known only where the hatch's sill cuts it (S65-13244). On the hatch, forward of the window, the
  real one is a fairing with fine ribs; here it is smooth.
- **The hatches' edges are straight.** The forward edge is a station and the inboard one a line
  parallel to the ship's middle; the real sill is rounded at its corners. The hinge line is a
  meridian. The twelve latches are counted in SEDR 300 and drawn once; here seven are along the
  inboard edge, three aft and two forward, and each is a block and a pin. No seal, no pyrotechnic
  actuators.
- **The shingles' layout is our own.** The beads' direction, pitch and the size of a cell are
  read off three photographs; where each seam and each row of fasteners runs is not: the cells are
  laid out evenly inside the doors' edges, which are themselves estimated from small drawings.
  Figure 2-7 numbers more than eighty access doors on this ship; only the large ones are marked.
  The recovery light and hoist loop doors are not.
- **The re-entry thrusters** fire along the ship's axes, as Figure 8-84 has them, from places read
  off the photograph. In the photograph the ports are longer ovals than the model's, which says the
  chambers lean further from the skin's normal than the 10° of splay given them, or are canted
  along the ship as well; that is not in anything read. Which ring is the forward one is not known.
- **The adapter's chambers are placed from a sketch.** Which way each fires is the table's; where
  each stands is read off Figure 8-72, drawn in perspective with no stations. Chambers 9 and 10
  lean outward in it and fire straight aft here. What stood in the ports of 13 to 16 on this ship,
  where the chambers were inoperative, is not recorded: here they are the chambers' own shapes in
  steel.
- **The equipment section is McDonnell's arrangement and our sizes** ("Equipment section", above).
  Which module is on which side, the blast shield's station and its make-up, and the coolant
  module's stations are his drawing. How far the beams are turned from the ship's own sides (23°)
  is measured on two perspective sketches that agree to 2°, and nothing dimensioned confirms it.
  Every other size and place in the section is scaled from an undimensioned figure or is what the
  tanks and the wall leave: the beams' distance from the axis, each tank's place on its module,
  the frames' members, the batteries, the electronics.
- **The helium is not where the sketch has it.** SEDR 300's Figure 8-72 draws the OAMS's pressurant
  tank inboard of the propellant tanks. There it would stand under the access door, where
  spacecraft 5's pod hung, so it is put between two tanks and the wall. Which of the row's two
  middle places holds fuel is not read from anything either.
- **The gold cover is one photograph's**, of one ship: NASA S65-63221, spacecraft 7. The hoop's
  depth is good to 3 in and its width to 4 in, and both are taken for every ship. The cloth's
  gathers are drawn as even pleats, 48 to the turn; the real ones are irregular. On spacecraft 7
  the photograph shows a raised oblong under the cloth beside the lower aft-firing thruster, not
  identified and not built, and small fittings at the rim to left and right that may be the
  acquisition lights. How spacecraft 5's cover was cut round the pod's own cover is not in
  anything read: here the gold is cut back to the pod cover's outline, which runs out across the
  hoop into the cone on the side the dipole points.
- **The battery and electronic modules are tokens.** A battery is a ribbed case of estimated size;
  spacecraft 4's eight water and oxygen vessels are plain drums and a bottle; the electronic
  module is five boxes with connectors, none of them identified; the coolant module has two pump
  packages, a reservoir and a heat exchanger of our own form. The plumbing, the wiring, the
  radar beacon's antennas and the umbilical connection in the adapter's skin are left out.
  The primary oxygen is the same 18 in ball on every ship, though spacecraft 4 carried 52 lb
  and spacecraft 7 109 lb where spacecraft 3 carried 15.
  (The first model of this ship built every ball in the adapter, tanks and rockets, a fortieth of
  its size, by giving metres to a profile that took inches; that was put right long since.)
- **The scanner fairing** is a box of the size, place and colour the photograph gives, with none of
  its detail (it is stepped, and has a foot on the cabin). **The strap fairings** are blisters of
  our own shape, where the Technical Summary's Figure 3 has the straps (one of them is beside a
  hatch's aft outboard corner in S65-13395).
- **The rendezvous and recovery section's inside** is a parachute pack and two mortars of our own
  form. The docking bar is not modelled; the three latch receptacles, on the ship built with
  them, are plain blocks on the rim. The radar, on a ship that had it, is its four antennas as
  plain cups on the face.
- **The later ships are spacecraft 3 with additions** ("One ship from the next"). What they
  changed that is not in that table is not built: the long-life thrust chambers, the transponders
  and antennas, the panels' rearrangement beyond the command pilot's clock, the ejection seats'
  changes, the nose fairing's release. Their paint is spacecraft 3's until a photograph of each is
  read.
- **No landing attitude gear**: the two-point bridle and its cover along the top are left out.
- **The docking ships' fittings are placed from sketches** (spacecraft 8 on). The index bar's
  travel is documented and it runs out, but its station, its thickness and its casing are scaled
  from two undimensioned drawings; the latch receptacles' covers, the umbilical connector and its
  two pads on the forward face, the tether ring and the Velcro patches are not built; the docking
  light's and the outside light's forms are guesses.
- **The main parachute's container has two sizes.** A ship with the index bar has the container
  SEDR 300 vol. 2 gives (22.25 in across, 21.32 in long); spacecraft 3 to 7 still have the first
  model's guess at the pack, which is bigger. Rebuilding those is owed.
- **The place a man was to put a backpack on** (spacecraft 8 and 9) is drawn folded, as at launch:
  the hand bars, the foot rail and the umbilical guide do not spring out and the thermal cover is
  not thrown off. The bars' lengths and places are scaled from sketches; the mirrors on them and
  the spring clip for the umbilical are not built; the floodlights are tokens. The gold cover's
  opening is one photograph's, of spacecraft 9, and is taken for spacecraft 8.
- **The backpacks are outsides only.** The Extravehicular Support Package is drawn from one small
  sketch and the Astronaut Maneuvering Unit from sketches and dark photographs; neither has its
  tanks, valves or harness, and the unit's thrusters are tokens at its corners.
- **The handrails slide straight out.** The real ones swung out on two links and moved along the
  ship a little as they did; their retaining hooks and release pin are tokens.
- **What else spacecraft 8 and 9 carried in the adapter is not built**: the auxiliary tape memory
  unit, the boom antenna, transmitter and camera of experiments D-14 and D-15, the power tool of
  D-16, the mount for a 16 mm camera behind the right hatch.
- **Lettering** is Arial Bold on spacecraft 3's model as committed and Liberation Sans Bold, the
  repo's own font, cut to the same widths, on the later ships' and on any model built since; the
  flag is the fifty-star flag as Mercury's ships wore it.
- **No mass properties.**

## Sources

[docs/sources.md](../../../../docs/sources.md), "Gemini-Titan 3"; for what spacecraft 8 and 9 added,
"Gemini-Titan 8 and Gemini-Titan 9A".
