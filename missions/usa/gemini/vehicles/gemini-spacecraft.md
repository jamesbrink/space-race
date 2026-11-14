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
| Large pressure bulkhead; the hatch openings' aft sills | Z108.00 | estimated | a station of Figure 2-4 |
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
| Retaining straps | three, titanium, with a fairing over each | documented; their places estimated | p. 2-21 and Figures 2-5 and 2-11; SP-121, p. 16 |
| Retrograde rockets | four, spherical, "approximately 13 inches in diameter", titanium cases, one in each quadrant of a cross of aluminium I-beams, each hung by lugs, with its nozzle aft and an igniter beside it | documented; their station (Z84), their distance from the axis (19.5 in) and the beams' depth (11 in) and flanges (3.2 in) estimated | pp. 2-23 and 11-71; Figure 11-32 (p. 11-70) |
| Thrust chambers, adapter: which and where | 1 to 8 (attitude) in four clusters at the equipment section's foot; 9 and 10 (forward) at the foot, top and bottom, firing aft; 11 and 12 (aft) on the retrograde section, one each side, firing forward; 13 to 16 (right, left, up, down) on the retrograde section at the left, the right, the bottom and the top; ten on the equipment section, six on the retrograde section | documented in number and in which way each pushes (SEDR VIII, Figure 8-72 and its table, p. 8-256; p. 2-23); the places are read off Figure 8-72, which is a sketch in perspective: estimated | 36° and 54° from the top or bottom at Z27 for the attitude clusters; 78° at Z95.5 for 11 and 12; Z86 for 13 to 16 |
| Thrust chambers, adapter: which way they fire | 5, 6 toward the top and 1, 2 toward the bottom (pitch); 3, 4 toward the crew's right and 7, 8 toward the left (yaw); 3 with 7 and 4 with 8 (roll); none along a radius | the table documented; that an aft chamber which pitches the nose up must fire toward the top is derived from it | SEDR VIII, Figure 8-72 |
| Chambers 13 to 16 on spacecraft 3 | inoperative | documented | SEDR VIII, Figure 8-72's note and p. 8-258 |
| OAMS tanks | fuel 21.13 in, oxidiser 21.12 in, helium 16.20 in across, one of each on spacecraft 3 | documented; where each is in the section estimated from Figure 8-72 | SEDR VIII, pp. 8-263, 8-271, 8-273 |
| Thrust chambers, re-entry control: which way they fire | 1, 2 toward the top (pitch down); 5, 6 toward the bottom; 3, 4 toward the crew's left (yaw right); 7, 8 toward the right; roll by 3 with 7 or 4 with 8 | documented | SEDR VIII, Figure 8-84 and its inset (p. 8-281) |
| Thrust chambers, re-entry control: where | four clusters on the diagonals, each a pitch and a yaw chamber side by side, 34° and 55° from the top or the bottom, each there twice (A ring and B ring) at Z183.4 and Z188.1 | the clusters documented (Figure 8-84; GIV, Figure 3-12); angles and stations estimated | S65-21090 through the fitted camera: 33° to 37° and 52° to 62°, Z183.2 to Z184.3 and Z187.7 to Z189.8. TS Figure 1's side view scales to 30° and 52° |
| Thrust chambers, re-entry control: splay | each turned 10° from the axis it fires along | estimated | the inset draws the arrows a little apart |
| Re-entry control tanks, each ring | a nitrogen ball 7.25 in across; a fuel tank 5.10 in across and 30.7 in long; an oxidiser tank 5.10 by 25.2 in | documented; how they lie in the section estimated | SEDR VIII, pp. 8-286, 8-288 |

## Crew station

Built by [gemini_cabin.py](gemini_cabin.py), only where an inside is built (full detail). The panels are spacecraft
3's, from SEDR 300's Figure 3-5 sheets 1 and 2, both captioned "(S/C 3)". A point is (inches toward the top, inches
to the crew's right, station).

**The pressure vessel is laid out, not drawn.** Nothing read gives its dimensions, a seat's place in it or a panel's.
It is laid out so that what is documented fits, and these are the fits it was made to keep: a seat 22 in wide and 54
in tall, canted 12° outboard and 8° forward on rails on the large bulkhead, with the top of a helmet a third of an
inch inside the hatch's inner skin and its stirrups half an inch off the floor; the panels at the sizes Figure 3-5
scales to, their lower edge clear of the knees; a seated man's eyes 8° off the ship's axis from the middle of his
window, so that he looks along the trough. Every figure in this table that is not marked documented follows from
that, and is `estimated`.

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Seats' cant | 12° outboard, 8° forward | documented | SEDR 300, p. 3-3 |
| Seat | 22 in wide, 54 in tall | documented | Smithsonian A19710058000 ("22 x 55 in", a spare that was fitted in spacecraft 3) and A19690023001 (a training seat, 24 by 54 by 27 in) |
| Seat's form | a back with a box channel up it and turned-up sides; a five-sided shroud over the head with a fitting at its peak, white; rails behind with lightening holes; a bucket with arm sides rounded down to the front; a guard before the shins; two stirrups of tube; arm loops of 1/2 in tube; the D-ring on the bucket's front | by photograph and figure | the Smithsonian's photographs of both seats; SEDR 300, Figure 3-2 and pp. 3-5 to 3-13; the white shrouds are S65-13244's |
| Seat: pan to the shroud's top | 40.5 in | estimated | the Smithsonian's front view of A19690023001, scaled on its 54 in. The research for this pass read 36 in; 40.5 puts the shroud just over a seated man's helmet, which is where S65-13244 has it |
| Seat: pan to the stirrups' foot | 10 in | estimated | the same photograph scales to 14; 10 is what the floor allows, with the seat where the helmet allows |
| Seat's reference point (the pan's top at the back's front) | 12 in below the ship's axis, 13.2 in off the middle, Z117.0 | estimated | the fits above |
| Seated eyes | 33.5 in up the back from the pan and 6.5 in forward of it: (19.6, ±19.9, Z128.1) | estimated | a seated eye height of 31 in on a 2.5 in egress kit. The crew's own measures are not in a primary source |
| Vessel: flat sides | 28.4 in from the middle at Z108, 26.8 at Z131, 23.5 at Z150.8, 17 at Z160.2 | estimated | the fits above |
| Vessel: floor | 29 in below the axis aft, rising with the cone forward; its lower corners let in below 17 in for the landing gear's wells | estimated | the cone, less 2.6 in |
| Large and small pressure bulkheads | Z108.00 and Z160.20 | estimated | stations of Figure 2-4; the hatches end at Z151.62 and the vessel runs on under the fixed roof for the feet |
| Each man's panel | 14.5 in along its lower edge and 12.7 in to the top of its tab; its inboard edge upright and its lower edge falling 12.6° outboard, as drawn; turned 14° toward him | size derived from the figure; the turn estimated | Figure 3-5 sheet 1 at 47 pixels to the inch, the scale its 5.05 in velocity indicator and 3.38 in keyboard give (SEDR VIII, pp. 8-164, 8-172, 8-252) |
| Centre panel | 11.2 in wide, 18.5 in tall | derived | the same scale. The research for this pass had about 15 in wide; by the keyboard it is 11.2 |
| Pedestal | 12.5 in long, tapering from 11.2 to 5.8 in | derived | the same |
| Panels' place | lower edge 3 in above the axis at Z141.5, leaning back 30° | estimated | under the forward sill, as S65-13244 shows them; square to the eye |
| What is on each panel | as listed in the module, instrument by instrument | documented | Figure 3-5 sheets 1 and 2; GIV 3.1.2.5 and 3.1.2.9.1 (no clock on the command pilot's panel; the re-entry control switches on the pilot's; ACME logic on the pedestal) |
| Instruments' sizes | velocity indicator 3.25 by 5.05 in; readout 3.26 by 5.01; keyboard 3.38 square; clock 2 1/4 square | documented | SEDR VIII, pp. 8-164, 8-172, 8-218, 8-252 |
| Instruments' graduations | accelerometer -6 to 16 g; altimeter one turn in ten; rate of descent 0 to 70 ft/s | estimated | read off the figure, which is too small to read a scale from |
| Overhead, left and right switch and circuit breaker panels | 9.8 by 11.4 in; 12.5 by 8 in | derived from the figure; their places estimated | Figure 3-5 sheet 2; S65-13244 for the side panels |
| Abort handle, water management panel, drinking water, stowage, floodlights, hatch curtains | where Figure 3-1 and the text say, to the nearest hand's breadth | documented that they are there; places estimated | SEDR 300, Figure 3-1 and pp. 2-19, 3-20, 3-26 to 3-31 |
| The three-knob panel between the men | one panel, on the bulkhead between them at shoulder height, with the three valves of Figure 3-5 sheet 2 (condensate, water tank, waste) | **derived**: that SEDR 300's two panels are one | The manual names a three-knob panel twice. Figure 3-1 draws a "drinking control panel" between the seats' heads, and p. 3-26 has drinking controlled "by means of a 3-knob panel located between the pilots at approximately shoulder level". Figure 3-5 sheet 2 ("S/C 3") draws a "water management panel" with three valves, and p. 6-30 has "a three knob panel ... for managing, replenishing, and dumping waste water overboard", without saying where it is. No figure shows two. The model takes them for the same panel: Figure 3-5's three valves, standing where Figure 3-1 puts the drinking panel. If they were two, the drinking panel's own knobs are not built |

**What the viewer is promised** is what the Mercury cabin promises
([mercury-cabin.md](../../mercury/vehicles/mercury-cabin.md)): `Seat_CommandPilot` and `Seat_Pilot`, empties at the
seated eyes; `Gauge_Accelerometer`, `Gauge_Altimeter`, `Gauge_RateOfDescent`, `Gauge_RangeRate`, needles on their
pivots with their scales in their extras; `Gauge_ClockHours` and `Gauge_ClockMinutes`; the tape gauges' pointers
(`Gauge_Stage1Fuel` and the rest), each sliding along its own X; `Ball_CommandPilot` and `Ball_Pilot`, the two
attitude balls, each a node at its own middle; `Tele_...` lamps, each with its own material; `Ctl_Abort`,
`Ctl_AttitudeController`, `Ctl_ManeuverController`, `Ctl_EjectCommandPilot`, `Ctl_EjectPilot`; `Lamp_Left`,
`Lamp_Right` and `Lamp_Centre`, the three floodlights' lenses. Gemini-Titan 3 declares them (`flight.ts`: `lights`,
`cabin`): the inside is lit as indoors by the three floodlights and the instruments, lamps and controls are named.
No flight deck reads them yet: nothing of the flight is simulated, so every needle stands as built and says so.

**The men** are a suit module's seated figures ([g3c-suit.md](../crew/g3c-suit.md)), built into a seat by the
flight's script through `Fit.crew` (`gemini_cabin.seat`): with a man aboard the seat's restraint is laid over him
(the reel's two straps over his shoulders to his harness's quick disconnects, the lap belt across his lap) and the
seat's node is at his own eyes. Aboard or not, each build measures the room the cabin has for him and prints it.
**As laid out above it has not enough**: Grissom's helmet is 1.7 in and Young's 2.3 in through the hatch's inner
skin, each man's outboard arm is 0.7 to 0.9 in through the vessel's side, and both men's feet are through the floor
forward of the stirrups, where it rises with the cone (8 to 9 in at the toes as posed, about 2 in at the best posture
found); no posture brings them in, and lowering the seats for the helmets makes the feet worse. The attitude hand controller is beside
a seated man's elbow and the abort handle at his shoulder. The vessel, the seats' place, the centre console and those
two controls want laying out again round the two men; until then Gemini-Titan 3 leaves them out.

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
| `EquipmentSection` | skin, foil, rings and stringers; the mating ring and its bolts; ten chambers (eight in oval ports, two at the foot); the gold cover across the foot; inside, the blast shield, the three OAMS tanks, the oxygen, the batteries, the modules |

Below three-quarters detail nothing inside is built and the windows are dark panes; below full
detail the beads are half as many; below half there are none, and the thrust chambers' ports are
collars and dark ovals on the skin. The troughs and the windows' frames are there at every level.

## What the model gets wrong or leaves out

- **The pressure vessel is laid out, not drawn** ("Crew station", above). Its flat sides, its
  floor and where the seats and panels stand in it are what the documented things allow, not what
  McDonnell built; its double skins are single, its stiffeners are on the large bulkhead only, and
  the equipment bays between it and the cone are empty but for the experiment's water tank.
- **The seats are empty.** Grissom and Young are modelled in their G3C suits
  ([g3c-suit.md](../crew/g3c-suit.md)) and are not in them: the crew station as laid out is too
  small for either ("What the viewer is promised", above). The seat is the Smithsonian's two in form and size, with none of
  what was packed on it (the parachute, the ballute, the raft, the survival kit, the drogue mortar,
  the seat-man separator): the backboard is a cushion and the egress kit a pad. The harness lies
  on the empty seat as two shoulder straps and a lap belt. Its stirrups hang 10 in below the pan,
  not the 14 in the photograph scales to.
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
  Mercury cabin's are (`mercury_cabin.shade`), and the floodlights have no switch.
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
- **Inside the adapter the tanks are the right size and in roughly the right place**; everything
  else is placed by guess: the oxygen bottle, the battery module, the electronics, the modules'
  frame. The plumbing, the wiring, the coolant pumps and the radar transponder are left out.
  The first model of this ship built every ball in the adapter (tanks and rockets) a fortieth of
  its size, by giving metres to a profile that took inches; that is put right.
- **The gold cover** is a smooth shallow cone; the real one is a quilted blanket.
- **The scanner fairing** is a box of the size, place and colour the photograph gives, with none of
  its detail (it is stepped, and has a foot on the cabin). **The strap fairings** are blisters of
  our own shape; one is put where S65-13395 shows one, beside a hatch's aft outboard corner.
- **The rendezvous and recovery section's inside** is a parachute pack and two mortars of our own
  form. The docking bar, the three latch receptacles and the radar are not modelled: this module
  has only been built for a ship without them.
- **No landing attitude gear**: the two-point bridle and its cover along the top are left out.
- **Lettering** is Arial Bold; the flag is the fifty-star flag as Mercury's ships wore it.
- **No mass properties.**

## Sources

[docs/sources.md](../../../../docs/sources.md), "Gemini-Titan 3".
