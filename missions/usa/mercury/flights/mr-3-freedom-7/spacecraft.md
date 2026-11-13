# Mercury spacecraft No. 7, as flown on MR-3

What the capsule in [model/vehicle.py](model/vehicle.py) is built from, and how far to trust each
number. In the model, station 0 is the heat shield's maximum-diameter plane and positive is toward
the nose. (McDonnell's own stations put that plane at Z = 104.50.) The drawings are in inches, so
the model is too. Angles round the cone are in the pilot's frame, from his right as he lies: his feet
(the periscope) at 90 degrees, his left at 180, his head at 270, the hatch's middle at 315. The script
builds the capsule so and then turns it 45 degrees about its long axis (`mercury_capsule.stand`), so
that in the GLB the hatch is on +X, the side every launch site's frame gives it; `flight.ts` quotes
the cabin in that turned frame.

**Confidence**: *documented* is a published figure; *derived* is computed from documented ones;
*estimated* was read off photographs or chosen to look right. The same labels are in
[flight.ts](flight.ts), which is what the viewer shows and the simulator will read.

## Dimensions

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Heat shield diameter | 74.5 in (1.892 m) | documented | NASA CR-649 |
| Heat shield radius of curvature | 80 in | documented | CR-649 |
| Afterbody half-angle | 20° | documented | CR-649 |
| Recovery compartment | 32 in diameter, 22.76 in long | documented | CR-649 Figure 1, stations 58.38 to 81.14 (its text says 20 in); Hammack and Heberlig Figure 17 also carries 81.14. SEDR 104 Figure 1-3 gives 22.86 in |
| Afterbody length | 58.38 in | derived | frustum from 74.5 in to 32 in at 20° |
| Heat shield depth | 9.20 in | derived | spherical cap, R = 80 in, 74.5 in chord |
| Stations | heights above the plane of maximum diameter, McDonnell's Z104.50 | documented | Postlaunch Report ("maximum diameter ... at Z = 104.50"); SEDR 104 Figure 1-3 |
| Heat shield edge height | 2.5 in | estimated | photographs |
| Antenna canister length | 23.43 in | derived | from 81.14 in to its top at Z209.07 (SEDR 104, Figure 1-3). CR-649 says 24 in |
| Antenna canister diameters | 24 in tapering to 20 in | documented | CR-649; SEDR 104 Figure 1-3 scales to the same. The model was 30 to 25 in until November 2026 |
| Dielectric window | 8 in | documented | SEDR 104, 2-9 |
| Length, retro nozzles to canister top | 131.57 in (3.342 m) | documented | SEDR 104 Figure 1-3, Z77.50 to Z209.07; Hammack and Heberlig Figure 2 |
| Length with tower | 311.55 in (7.913 m) | documented | SEDR 104 Figure 1-3, Z77.50 to Z389.05; Hammack and Heberlig Figure 2 |
| Tower pylon | 10 ft | documented | SEDR 104, 2-12: about 10 ft of 4130 steel tube |
| Tower stations | truss nodes at 106.08, 137.03, 167.98, 198.93 in; motor case top 249.55; cap 253.55; spike tip 284.55 | documented | SEDR 104 Figure 1-3, less Z104.50. Tube sizes are estimated from photographs |
| Escape motor | 15 in diameter; case to 249.55 in, spike 31 in | documented | SEDR 104 Figure 1-3; Hammack and Heberlig Figure 17 gives the 31.00 in spike. The case's lower end (202 in) is read off the figure |
| Shingle layout | columns of 15 to 30 degrees, most carrying two stacks of beads that run round the cone; seams at stations 22 and 42 and a plain riveted band from the shield's ring to 3.4 | estimated | the flown capsule (NASM2021-00160, -00161, -00165, A19620021000_DSH01); see "Round the cone". The beads ran along the meridian in the model until November 2026 |
| Shingle gauges | cone: René 41, 0.016 in. Cylinder: beryllium, 0.22 in | documented | Hammack and Heberlig; CR-649 |
| Corrugation height | 0.14 in | estimated | |
| Portholes | two, 10 in | documented | *This New Ocean*, p. 367 ("the two 10-inch side ports"); it does not say whether that is the glass or the frame. The model reads it as the flat plate each is set in (10 in across), with a 7.4 in hole and 6.6 in of glass clear (estimated, NASM2021-00168). Where they are: "Round the cone" |
| Hatch | 55° of arc (60° with its border, four stringer bays), stations 18.5 to 44, its middle at 315° | estimated | the flown capsule's opening; see "Round the cone" |
| Pressure vessel | two skins of 0.010 in titanium | documented | Hammack and Heberlig |
| Heat shield | beryllium heat sink, about 1 in | documented | Hammack and Heberlig ("approximately 1-inch-thick") |

## Round the cone

Where the hardware on the skin is, read in November 2026 off the photographs of capsule 7 as it is kept (Smithsonian
A19620021000: NASM2021-00160, -00161, -00165, -00168 and A19620021000_DSH01, at 3000 px) for its structure, and off
the photographs of 1961 for its paint (where the two disagree, 1961 is followed). Every figure is **estimated**:
no drawing read places any of it. Until then the model had most of it elsewhere; the old places are given so that
anything built on them can be found.

| What | Now | Evidence | Was |
| --- | --- | --- | --- |
| Hatch | middle at 315° (45° round from the head toward his right), 55° wide, stations 18.5 to 44 | two photographs measured on their own: 320 ± 10° and 316 to 326°; four stringer bays wide. It agrees with No. 11's photographs and with the MR-4 Results' "in the same location and of the same size" | 0°, at his right hand, 45° wide |
| Shingles' beads | round the cone, one stack or two side by side in each shingle | plain in every photograph of the flown capsule (`mercury_capsule.Skin`, as Liberty Bell 7 is built) | along the meridian |
| Periscope objective and door | 90°, objective at station 37, level with the upper line of UNITED STATES; door 20° wide, stations 27.5 to 41.5, hinged on the hatch's side; shut at liftoff, opened and shut on the clock ("The periscope's door", below) | NASM2021-00160, -00165 | station 13; standing open |
| Umbilical receptacle | inside the periscope's door, under the lens, station 31.2, 0.95 in under the skin so the door shuts over it | No. 11's S61-03705 shows the ground's line plugged in there; the 21 April pad photograph has the umbilical's arm on this side of No. 7; SEDR 104 puts the receptacle under the periscope's door | 270° (the head's side), station 8 |
| Lower port | 15°, station 28.5: 30° beyond the hatch's foot-side edge | NASM2021-00160, -00168 | 30°, station 13 |
| Upper port | 232.5°, station 34.5: high at his left, toward his head | NASM2021-00147, -00161 | 235°, station 40 |
| Roll jets | two round plates in the top row at 45° and 135°, station 50, each with a large and a small nozzle (6 and 1 lbf) | NASM2021-00160, -00161, DSH01; the 1961 pad photographs show the same fitting above UNITED STATES. That they are the roll jets is read from their two nozzles | at the base, at 90° and 270° |
| The coiled cord's clip | ends in the lining | it went 0.7 in on through the hull at 225° | |

So the stance on the pad changes with it (`sites/lc-5.ts` is unchanged: the hatch faces the white room on +X, 295°
true): the pilot's head bears 340° true and the periscope 160°, where they bore 25° and 205°.

### The periscope's door

The door "encloses the periscope lower lens flange and the capsule ground checkout umbilical receptacle" and,
"mechanically linked to the periscope housing, automatically opens and closes with periscope extension and retraction"
(SEDR 104, 2-3). The model is built as the capsule stood at liftoff, the door shut and the objective drawn in; the
gallery shows it so. At the launch site and in flight the door (`Periscope_Door`, on its hinge) and the objective
(`Periscope_Objective`) move on the clock (`flight.ts` `PERISCOPE`, `vehicles/periscope.ts`):

| When | What | Confidence | Source |
| --- | --- | --- | --- |
| On the pad, through the count | out, the door open, the umbilical plugged in under the lens | documented (that it was); estimated (since when: the model has it out from the day before) | SEDR 104, 12-2: "begins with the periscope extended while the capsule and booster are still on the pad" |
| T-35 s | in, the door shut, as the umbilical is ejected | documented; the second derived from the count | Postlaunch Report, 10.7.2 (the film: "Capsule umbilical ejection, periscope retraction, and door closure were clearly shown"); 7.1, Shepard: "I saw the head of the boom start to drop away as the periscope retracted electrically"; TM X-53107, p. 7-33 for T-35 s |
| 02:32.3, separation | out | documented | Results, p. 111 ("In another 5 seconds the periscope had extended"); Figure 7.3-2, 02:35.5: "Periscope is coming out" |
| 06:44 | in, for the entry | documented | Results, p. 10; Figure 7.3-2, 06:44.5: "Periscope is retracting" |
| 09:38.1, the drogue | out, and out at landing | documented | Results, p. 113 ("the drogue parachute came out on schedule as did the periscope"); Figure 7.3-2, 09:39; Postlaunch Report, 9.3: "The periscope was extended" on recovery |
| Each motion | four seconds: the door first, then the objective; going in, the reverse | estimated | Shepard's five seconds after separation |
| How far | the door swings 105°; the objective comes 5.65 in out along its tube | estimated | the photographs of it open; the depth is chosen to clear the door drawn in |

## Paint

| What | As modelled | Basis |
| --- | --- | --- |
| UNITED STATES | once, two lines 31 and 30 in long, letters 7 in tall, centred on 141° (from 104° to 180°) at stations 36.3 and 28.3, beside the periscope's door on the side away from the hatch | the pad, 21 April and 5 May 1961 (the colour "egress test" photograph; GPN-2000-001009); the capsule as kept, where it is the original paint |
| FREEDOM over 7 | small: FREEDOM 23 in long and 3.4 in tall at station 17.3, the 7 beneath it at 12.9, on 240.5°, low between the upper port and the hatch | the carrier's deck, 5 May 1961 (MSFC-6101191 and the Commons photographs of Shepard inspecting the capsule). **The capsule as kept has FREEDOM 7 elsewhere**, painted along the meridian at about 260°: a repainting, and 1961 is followed |
| Flags | none | none is on the sides that the 1961 photographs show (the US side's top row on the pad; the hatch's side and the top row above it on the deck), and the capsule as kept has none. The model had two flags and a second UNITED STATES, on the hatch's side, until November 2026: the deck photographs show that side bare |
| Not established | whether anything was painted between 180° and 230° | no photograph read shows it clearly |

## Propulsion

| Motor | Count | SP-45 nominal | Manufacturer (SEDR 104) |
| --- | --- | --- | --- |
| Escape (Grand Central) | 1 | | 52,000 lbf for 0.78 s, then decaying; 56,500 lb-s; three nozzles canted 19° |
| Tower jettison | 1 | 800 lbf, 1.5 s | 785 lbf; three nozzles canted 30° |
| Posigrade | 3 | 400 lbf, 1 s | 370 lbf |
| Retrograde (Thiokol) | 3 | 1,000 lbf, 10 s | 992 lbf, 13.2 s action time, 13,000 lb-s |

Automatic attitude control (Hammack and Heberlig): pitch and yaw each two 24 lbf and two 1 lbf
chambers; roll two 6 lbf and two 1 lbf. Twelve chambers on 90% hydrogen peroxide. The manual
system has six chambers of variable thrust; its range is not in anything read so far.

Other escape-motor thrusts in print: 58,500 lbf (Hammack and Heberlig) and 56,000 lbf (SEDR 104,
section 5). 52,000 is the nominal axial figure.

## What makes No. 7 different

- Two 10-inch portholes; the trapezoidal window arrived with No. 11.
- A hatch held by a 69 lb mechanical latch mechanism (*This New Ocean*'s wording: the mechanism, not
  necessarily the whole hatch), with release handles inside and out. The first design
  bolted the hatch on with 70 bolts; the explosive hatch (23 lb, 70 bolts and a detonating fuse)
  arrived with No. 11.
- A beryllium heat-sink shield, not the ablative shield of the orbital flights. As the simulator flies it the shield
  warms by 13 K (`trajectory.heating` in `flight.ts`; the flight's README, "Heating"): it is one lump at
  one temperature there, 46.9 kg behind each square metre, and nothing measured is held against it.

It did carry a landing bag, which worked.

## Cabin

Built by [vehicles/mercury_cabin.py](../../vehicles/mercury_cabin.py), which the flight's `model/vehicle.py` calls with
No. 7's fit. In the cabin script the pilot's head is toward -Y, his feet toward +Y, his right hand toward +X, and he
faces the nose; the hatch's middle is 45 degrees from his head toward his right. The capsule is then turned 45 degrees
about its long axis, so that in the GLB the hatch is on +X and his head toward (+X, +Z) in the viewer's axes
(`overhead` in `flight.ts`).

Three sources are of capsule 7 itself and are what the panel is built from: the Postlaunch Report's Figure 3.1-2 (the
panel), 3.1-1 (what differed from later capsules) and 10.1-1 (every switch as found after the flight); Figure 7 of
*Results of the First U.S. Manned Suborbital Space Flight*; and the flown capsule as it is kept (National Air and
Space Museum, photographs NASM2021-00147 and -00153). The familiarization manual (SEDR 104, 1962) is the orbital
capsule's and is used only where it says so below. **No drawing read is dimensioned inside the cabin**, so one length
is documented (the periscope's 8 in screen) and the rest follow from it or are estimated.

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Periscope screen | 8 in across | documented | Hammack and Heberlig, p. 5: "an 8-inch circular display of the earth" |
| Main panel width | 27 in | derived | the screen's glass is 0.28 to 0.31 of the panel's width in Figure 3.1-2, which makes the panel 26 to 28.6 in |
| Where each instrument, lamp and switch is on the panel | as Figure 3.1-2 | derived | measured off the figure in its own pixels and scaled by that width (`FIG` in the script). The figure is a flattened layout, not a dimensioned drawing |
| Instrument sizes | accelerometer, descent, and the small round gauges 2.3 in; altimeter 3.5 in; attitude indicator 7.8 by 4.5 in; clock 5.8 by 6.2 in | derived | the same figure and scale |
| What the panel carried | no Earth-path indicator; one O2 emergency flow light, not the three lights the figure draws; a cabin humidity gauge | documented | Figure 3.1-2 draws no Earth-path indicator and Figure 10.1-1 lists none; 10.1-1 lists the one light and the humidity gauge, and the flown capsule has the one light. Its place (second row, left) is from Results, Figure 7 |
| Faces: scales, numerals, legends | as the flown capsule reads today | estimated | NASM2021-00147. Altimeter 0 to 100 thousand ft with MAIN at 10 and SNORKEL at 20; descent 0 to 140 ft/s; accelerometer -9 to +12 g; attitude dials as three pointers. The humidity gauge is gone from the artifact: its face is ours |
| Lettering | panel legends 0.18 in tall, switch positions 0.14, small notes 0.125; dial numerals a sixth of the dial's radius | estimated | scaled off NASM2021-00147 against the instruments beside them (SQUIB is about 1.1 in long beside a 2.4 in dial) |
| Rate needles' full travel | 6 degrees a second | estimated | nothing read gives the indicator's range |
| Sequence lamps, top to bottom, and what overrides each | TOWER JETT (ring), CAPSULE SEP (ring), START RETRO SEQ (button), IN RETRO ATT (switch), RETRO FIRE, JETT RETRO, .05 G SWITCH, DROGUE (buttons), MAIN DEPLOY, RESERVE DEPLOY (rings) | documented | Figure 3.1-2. Green when done, red for a failure (Results, p. 23): the model lights green only |
| Where the panel stands | the periscope's display 23 in from the model pilot's eyes and square to them: over his lap, at station 26.6, leaning 55 degrees with its top toward the nose | estimated | "two feet in front of him" (*This New Ocean*, p. 355) is all that is in print. With the model's pilot on his back that puts the panel where the cone cuts its top corners and its foot comes down between his chest and his knees; the strip and the console hang 3.5 and 8 in lower on it than Figure 3.1-2's flat layout draws them, to clear the cone |
| Left console's cant | telelight strip 30 degrees toward the pilot, console 58; the fuse panel on the wall at his left elbow | estimated | NASM2021-00147 |
| Fuse panel | 23 switch-fuses in five rows | documented (which), estimated (where) | the list and order are Figure 10.1-1's; the rows' places are from NASM2021-00147 |
| Right console | emergency oxygen lever, suit and cabin temperature selectors | documented (what), estimated (where and how big) | Figure 3.1-2; "below the capsule entrance hatch" is SEDR 104, p. 1-17 |
| Periscope objective | leaves the cone under the pilot's feet at station 37, level with the upper line of UNITED STATES | estimated | the flown capsule, NASM2021-00160 and -00165. It was at station 13 until November 2026, a misreading of the same photographs; before that on the pilot's left |
| Periscope field | 172 degrees at low power; 43.6 at high | documented; derived | NASA SP-45, p. 282 (the orbital capsule's); 80 n mi of ground from 100 n mi up (Hammack and Heberlig, p. 5) is 2 atan(40/100) |
| Periscope axis | toward the Earth with the small end 14.5 degrees below the horizon | documented, for the orbital capsule | SEDR 104 Figure 12-3; SP-45, p. 282 ("-14 degrees"). Not checked for No. 7, which held 34 degrees for retrofire |
| Which way up the periscope's picture is | the small end at the top | estimated | nothing read says |
| Portholes' places | lower: 15 degrees round from his right toward his feet, station 28.5. Upper: 232.5 degrees, station 34.5 | estimated | "Round the cone"; Figure 3.1-1 ("upper window", "lower window", capsules 5 and 7; a perspective, not dimensioned); "the lower right-hand window" and "the left window" in the reports |
| Ports, from inside | each one assembly on one line, the normal to the skin through the middle of its hole: a flat frame 11.4 in across bolted to the wall (24 bolts), standing an eighth of an inch off the wall's curve at its sides and more above and below; a retainer 8.6 in across screwed down on it (16 screws) with four dogs across its edge; a 6.8 in opening; under it the inner pane; a dark sleeve 7 in across through the wall to the outer pane, 0.85 in (lower port) and 0.91 in (upper) away | estimated | That a ring was bolted round each port with clamps on it: NASM2021-00147. That the inner panes were sealed in a titanium frame attached to the cabin wall and the outer pane in a titanium frame attached to the outer skin: SEDR 104 of December 1959, 2-24 (capsules 2 to 4: four panes inside, and an outer pane curved to the cone). No. 7's were "of multipane construction" in "heat-resistant glass" (Results, p. 16); how many panes, how they were held and what lay between the walls are not in anything read for No. 7, and the model has one inner pane, flat, and its outer pane flat under a ring, as the flown capsule's is (NASM2021-00168). Every size, the bolts' number and the sleeve are ours |
| Frames inside the wall | six, at stations 6.1, 24.5, 29.5, 34.5, 48.5, 53.5, each stopping either side of a port's ring | estimated | the wall is "lined with channeled frames" (SEDR 104, 2-3); how many and where is not in anything read |
| Rivet lines | 24, one down each stringer | estimated | the cone's skin is "reinforced with longitudinal hat stringers" outside (SEDR 104, 2-3) and the Postlaunch Report (section 10) names them by number into the twenties; 24, and which way round the first lies, are the model's (it has 24 shingles round) |
| Couch | a pan under head, back and seat, rests behind the thighs and under the calves and heels | estimated | laid under the model's own seated figure. Fibreglass shell, crushable honeycomb, a liner, moulded to the pilot: SEDR 104, 1-6 |
| Hand controller and abort handle | under the right and left hands | documented (which hand, what each does), estimated (place, size) | Results, p. 22: three axes in the right hand; "twisting of the left controller will initiate the abort sequence" |
| Cameras | one beside the pilot's head on his left looking at the panel; one at the lower right window; a lens in the panel beside the periscope | documented (where), estimated (size) | Results, p. 24 |
| Cabin lights | two four-watt fluorescent floodlights, white, each a fitting of its own: a 6 in tube five eighths of an inch through in a white trough on a dark body 7.2 by 1.9 in, on two feet. One CABIN LITES switch, OFF above and ON below, at the outboard top of the left console; ON throughout the flight. No dimmer, no red light; the instruments had no light of their own | documented (two, fluorescent, four watts, white, one on each hand, on the 115 V a-c fans bus; the switch, its positions and its place; that it was ON); estimated (where the two hang: above and either side of the pilot's head, at 100 and 82 degrees round from his right toward his head, clear of the hatch and the upper port; every size of the fitting but the tube's, which is what four watts is) | SEDR 104 of December 1959, 10-44 and 10-47 ("Two four watt fluorescent floodlights provide interior lighting for the capsule"; "self-contained"), Figure 10-7 ("R.H. SIDE WHITE", "L.H. SIDE WHITE"), for capsules 2 to 8. Postlaunch Report, Figure 3.1-2 (CABIN LITES, OFF, ON) and Figure 10.1-1 ("CABIN LIGHTS SWITCH  ON"); section 7.3, p. 65: "his eyes were not dark-adapted since the cabin lights were on full white light". Where they hung is the orbital capsule's arrangement (SEDR 104 of 1962, 10-19: "to the right and left and above the Astronaut"); that instruments were "lighted externally by cabin floodlights" is the same manual's, 12-23 |
| Chest parachute, survival kit, map case | by the right shoulder; a tall zippered container on the left wall; hanging under the periscope's display | estimated | NASM2021-00153 (the olive pack) and -00147 (the container); that it is the survival kit is SEDR 104 Figure 1-6's word for the orbital capsule; 12-27 for the map case |
| Visor seal bottle | a green bottle low at the pilot's left | documented (aboard), estimated (place, size) | SEDR 109-7 lists it for No. 7; NASM2021-00147 |
| Wiring | three runs down from the fuse panel; a harness from the back of the panel down each side, with red-capped connectors; behind the panel a red-capped connector on the back of every round instrument's case, a lead from each to a laced trunk across the panel's back, held on two stand-offs, and the trunk on to the two harnesses | estimated | NASM2021-00147 and -00153 show the harnesses and the red-capped connectors where they leave the instruments: every run, size and which lead goes where is ours |
| The hatch's inner face | a channelled frame round it, two stiffeners up it and one across, a latch housing over each of eight latches, a rod from latch to latch, and the release handle along its top | estimated: a placeholder | that it was held by latches worked from a handle inside or out is documented (*This New Ocean*: 69 lb); their number, places, the frame, the stiffeners and the rods are ours. The flown hatch was lost at recovery |
| Outside release handle socket | a steel ring 0.9 in across standing 0.14 in, with a dark square bore, at 328.75°, station 21: in the plain strip between the second hatch shingle's stacks of beads, low on the hatch. Nothing else of the latches shows outside | documented (that there was a socket outside, and only that); estimated (where, how big) | Postlaunch Report, Figure 3.1-1: "External release handle socket (capsules 5 & 7)", on the hatch's edge toward the heat shield, two thirds of the way round from the head's side. Until November 2026 the model had eight latch housings and a 6.5 in handle bar standing up to 0.75 in off the hatch's shingles, which nothing read shows |
| Outside release handle, stowed | a bar with a black grip in two clips on the hatch's inner face | documented (that it was carried stowed inside, on capsules 5 and 7); estimated (where, how big) | Postlaunch Report, Figure 3.1-1, "external release handle (stowed position)" |
| Cabin air inlet valve | a valve body with its knob and outlet on the wall at 22 degrees, station 51 | documented (capsules 5 and 7 had it, and the figure draws it low on the cone's hatch side toward the nose, where the orbital capsule's is elsewhere); estimated (place, size) | Postlaunch Report, Figure 3.1-1 |
| The wall's harnesses and cases | a laced bundle of two along the pilot's side of the frames at stations 24.5, 34.5 and 48.5 wherever the wall is clear, held to each frame by clips; two runs up the wall between them; five cases on the wall, each on feet with a blank data plate, its connector in a red cap and a lead to the nearest harness | estimated | SEDR 104 Figure 1-2 (the orbital capsule's interior arrangement) draws wiring following the frames round the whole wall and cases on it, and the flown capsule's photographs (NASM2021-00147, -00153) show the wall crowded with harnesses and cases; which case is which, every place and size, and every run are ours (`WALL_CASES`, `HARNESS_FRAMES` in mercury_cabin.py) |
| Instrument rims | a bright ring round each round instrument's glass on its bezel | estimated | NASM2021-00147 |
| Left console's handles | the four fuel handles as T-handles: a rounded grip lying along the console on a stem in a collar | estimated | NASM2021-00147 |
| Coiled cord, lacing | a white coiled cord hanging down the left wall; ties every few inches on the panel harnesses | estimated | NASM2021-00147. What the cord served is not in anything read |
| Restraints | two shoulder straps, a chest strap, a lap strap, a knee strap and a cap over each toe | documented (aboard), estimated (every run) | Postlaunch Report, p. 38: shoulder, chest, lap and knee straps and toe caps. Laid on the seated figure's own surface |
| Suit circuit hoses, junction box | two corrugated hoses up the right wall from under the couch; a box above the panel with three leads into the tunnel | estimated | NASM2021-00147, lower right and top: placed by eye |
| Hatch sill studs, a mirror under the upper port | studs every 1.6 in round the opening; a 2.2 by 1.5 in mirror on a bracket | estimated | NASM2021-00153; -00147. The studs are not counted, and what the mirror was for is not in anything read |
| Colours | wall, panels and consoles light grey; instrument faces black; couch grey with a cream liner; chest parachute olive | estimated | NASM2021-00147 and -00153, and NASA S61-03257. No document read states a colour |
| Head's turn from the seat | 100 degrees to either side, 54 up, 34 down from a gaze that rests on the panel | estimated | a head in a helmet fixed to the suit, and the eyes' own turn |

On board (`flight.ts`: `vehicle.cabin`) the needles read the flight at the clock's instant, flown by hand or from the
record: height, rate of descent, load, the three attitude angles and their rates, the clock and the seconds counter,
the control fuel left. **Not simulated, and saying so when pointed at:** cabin pressure, air temperature, humidity,
coolant, oxygen, volts and amps stand where their faces were drawn; "in retro attitude", "reserve deploy" and the
warning lamps stay dark. The attitude angles are read off the model as the scene has it, by a convention that is the
viewer's (`src/viewer/gauges.ts`): pitch is the small end's height above the horizon, yaw its heading from trailing,
and roll is how far the pilot's head is from uppermost: nought in the attitude held for retrofire, and about 55 degrees going up, because the model's stance on the pad (the hatch at 295 degrees, estimated, and his head 45 degrees round from it) has him partly on his side to the 105 degree azimuth.

### An open question: which way round the capsule stood

Two estimates lean on each other. The hatch's bearing on the pad is 295 degrees true (`lc-5.ts`, estimated: square to
the rails, and which of the two sides is read off a figure and one photograph). The hatch's middle is 45 degrees from
the pilot's head toward his right and the periscope under his feet ("Round the cone"), so on the pad the periscope
bears 160 degrees, 55 degrees round from the 105 degree azimuth, and the pilot's head 340. The simulator rolls the
capsule after the turnaround to put the periscope toward the Earth: `trajectory.body.capsule.earthward`, measured from
the body's +Z (bearing 285 on the pad), is 285 - 160 = 125 degrees (it was 80 while the hatch was at his right hand).
Flown live with 125 against 80 nothing recorded moves: the turnaround test holds the periscope's side within three
degrees of the Earth either way; apogee is 23 m higher, the range 73 m longer, the automatic supply 0.14 kg lower at
apogee. From the couch at T+4:10, flown live, the periscope shows Florida and the Bahamas and the attitude needles read
roll 0.8, pitch -19.4, yaw 0.0 (with the old model and 80: -1.0, -19.2, 2.6). Going up the roll needle now reads about
55 degrees, not 100.

**Photographs of July 1961 bear on it** (`sites/lc-5.md`, "An open question: which way round the vehicle stood"): read for
where the cable masts stood, they have MR-4 turned on the pad about 60 degrees from the model's stance, the hatch toward
235 degrees true and the periscope down range to within about 10 degrees, which is what the 55 degrees above would be.
Nothing was changed for it.

What would settle it, looked for once in November 2026 and not found: a document on how the capsule was clocked to
the booster or to the trajectory (the Postlaunch Report's roll trace through the turnaround, SEDR 104's axis figure),
or a pad photograph that shows the hatch against the fins or the gantry with the azimuth known.

**The umbilical on the pad followed the receptacle** (November 2026). The site's cable plugged in at 270 degrees in
the pilot's frame and station 8, where the old model had the receptacle; it now reaches the receptacle under the
periscope's lens (`sites/lc5/site.py` `UMBILICAL`). Its mast (`masts.py`) stands on the launcher's table 3.55 ft from the
vehicle's axis, 20 degrees round from the receptacle on the side away from the hatch, where photographs of July 1961
put it (derived: `sites/lc-5.md`, "The two cable masts"); the umbilical goes from the mast's head, beside the heat
shield's rim, up round the cone and under the periscope's open door to the receptacle, and the mast falls straight out
from the vehicle. Until November 2026 it stood on the hardstand 8 ft behind the vehicle.

## Parts in the model

Top-level nodes in the GLB, bottom to top. These names are the `node` fields in `flight.ts`.

| Node | Contains |
| --- | --- |
| `Retropack` | housing, three retrograde motors, three posigrade motors, three straps and fittings |
| `HeatShield` | beryllium heat sink, edge fasteners |
| `CrewCabin` | titanium pressure vessel with hatch opening, aft bulkhead stiffeners; and at full detail everything inside it: the painted lining, frames and port frames, the couch and the pilot, the main panel with its instruments (each needle a node of its own, `Gauge_...`), the left console in three parts and the right console, lamps (`Tele_...`) and controls (`Ctl_...`), the periscope with its screen (`Periscope_Screen`), cameras, stowage, the two cabin floodlights (their tubes `Lamp_Left`, `Lamp_Right`) and their switch (`Ctl_CabinLights`), two oxygen bottles, the folded landing bag, and `Seat_Pilot` at his eyes |
| `Afterbody` | René 41 shingles and fasteners, the plain plates (the band at the foot, round each port, the hatch's border, round the periscope's door), structure, attach ring, portholes (plate, ring, glass), the periscope with its door and well, the umbilical receptacle, the roll jets' plates, lettering |
| `Hatch` | two shingles and their fasteners, the outside release handle's socket, inner and outer skins; at full detail its painted inner face, frame, latch mechanism (a placeholder) and internal release handle |
| `RecoveryCompartment` | beryllium shingles, pitch and yaw thrusters, parachute canisters; the packed main and reserve parachutes |
| `AntennaCanister` | housing, dielectric window, horizon scanners, drogue mortar, destabilising flap; the bicone antenna inside |
| `EscapeTower` | clamp ring, pylon, escape motor and its propellant grain, three canted nozzles, jettison motor nozzle, spike |

The same GLB also holds the launch vehicle's five nodes: see
[redstone-mrlv.md](../../vehicles/redstone-mrlv.md).

## What the model gets wrong or leaves out

- **The antenna canister's diameter disagrees with the one document that states it.** See above.
- **Shingle layout is a regular one fitted to photographs of the capsule as kept.** Real shingles vary in size and
  are cut round fittings; the small plates in the top row other than the roll jets' are left out.
- **The hatch's latches are placeholders**, inside: eight, evenly spaced, joined by one rod. Outside, only the handle's
  socket shows (Figure 3.1-1), and where it is on the hatch is estimated.
- **The landing bag** is a flat ring standing in for the folded bag; it does not deploy.
- **The pilot lies flat on his back and looks down his body at the panel.** The seated figure's torso and head do not
  bend: his eyes rest 55 degrees toward his feet from straight ahead, which a man does with his head, not his eyes.
  The panel is placed square to that line at 23 in, so what he sees is right and how he holds his head is not.
- **The cabin is what the pilot sees, not a survey of the installation.** Behind the panel the instrument cases have
  a connector and a lead each and a laced trunk, not the real harness; on the wall, harnesses along the frames and five
  cases of no particular kind, their data plates blank (none is legible in any photograph read); under the couch,
  boxes of the right kind for the environmental system. The insulation behind the lining is not modelled: no
  photograph read shows it uncovered inside the cabin. No switch guard has been added beyond the two the panel's
  figure draws, and no placard: none is legible in what has been read. No harness, toe caps or knee
  straps, no window shutters or filters and no "window pole", no flashlight, knife, food or waste containers, no
  tape recorder, batteries or inverters.
- **Switches are set one way and do not move.** Only the sequence overrides, the abort handle and the hand controller
  are worked; the fuel handles, the snorkel pull, the decompression and repressurisation handles are there to be seen.
- **What a visitor points at says what it is** (`label` and `about` on the mesh, read by the viewer): each porthole,
  the periscope, the umbilical receptacle, the thrusters, the horizon scanners, the antenna's window, the hatch's
  latches, the retrograde and posigrade rockets and their straps, the tower's nozzles. Their texts say where a place
  is by judgement.
- **The periscope's objective is a lens over three inches of barrel**, with a stop and a mirror at the bottom, not the
  instrument's optics: the barrel does not run on to the screen in the cabin.
- **After the turnaround the simulator rolls the capsule periscope side down** (`trajectory.body.capsule.earthward`,
  estimated: 125 degrees, from the model's own periscope and hatch bearings). The record has the yaw through 180 degrees
  and the 34 degrees; that the periscope faced the Earth is why it was there; the roll's own figure is not in anything read.
- **Open: the paint is not worn in colour.** A paler ring round each screw head is all there is; edges are not
  worn to the metal and recesses are dark only through the build's baked shade, not in the paint.
- **Open: the porthole and screen lights have no direction.** Each lights the wall behind its pane as well as what
  is before it.
- **The periscope has no filters**, map or Sun and Moon index that turns, and its reticle is a few
  lines of the real one's. Its screen goes on showing the view while the objective is drawn in (06:44 to the drogue). What it shows is the scene's geometry and sky, without the clouds' volume.
- **The hatch's latch mechanism is not modelled**: the inner face is plain with one release handle. No drawing of it
  has been read, and the flown capsule's hatch was lost at recovery.
- **The portholes have two panes**, an outer set down in the skin under its ring and an inner under the retainer of
  the frame inside, with a plain dark sleeve between them. No. 7's were multipane and heat resistant (Results, p. 16);
  the earlier capsules' had four panes inside and an outer pane curved to the cone (SEDR 104 of December 1959, 2-24),
  and how many No. 7's had and their make-up are not in anything read. No shutters, filters or "window pole"
  (Postlaunch Report, 5.3.1). From the couch the upper one is seen aslant, the lower past the panel's right edge with
  the earth-sky camera in front of it. A pane mirrors each of the cabin's lights as a point: a tube would be a bar.
- **The periscope's door** opens to an angle of ours (105°), and from station 37 the edge of its leaf is in the corner
  of the periscope's picture. Its leaf is a plain curved plate with a pale inside, its joint 0.15 in all round; each
  motion takes four seconds, and a flight flown live keeps the record's times. The objective comes out along the last
  run of the periscope's tube in the cabin (`SCOPE_TUBE`, the cabin's own estimate), which on No. 7 leans 16.5° from
  square to the skin, and drawn in it sits inside that tube; the receptacle under it is sunk 0.95 in, so the pad's
  umbilical plug, placed at the skin, stops short of it by that much.
- **Cabin light is two lights hung in the middle of the cabin**, not at the fittings, falling off with distance and not
  its square, so that the wall beside a fitting does not burn; they cast no shadows. The shadow is worked once by the
  build (`mercury_cabin.shade`): at every vertex, how much of the two fittings is seen past everything else in the
  cabin and how open the point is to the room, kept as a colour the viewer multiplies the surface by; and a second
  figure beside it for the lamps out (how open the point is, and how much of the two ports and the periscope's
  screen it sees), which the viewer goes over to as the CABIN LITES switch is thrown (a click on it from the couch, N,
  or its button; it opens ON, as flown, and is not remembered between visits). So the dark behind the panel and in the
  corners is there, but nothing that moves casts a shadow, a large flat plate is shaded only at its corners, the wall
  is not darkened under what is fastened to it (a vertex there was a blot), and sunlight through a port is dimmed
  where the lamps' light is. Lamps out, the cabin is lit by the ports, the periscope's screen and the telelights; the
  eye does not adapt to it, and the periscope's reticle, which had a lamp and a knob of its own, is drawn as bright
  either way. What comes in at the windows
  is the scene's own Sun and shadow; the sky's light is cut to a tenth indoors by rule, not by tracing it through the glass.
  Each porthole and the periscope's screen is also a light: what is outside it is looked at a couple of times a second
  (a picture eight pixels across) and comes in as that colour, scaled by the pane's area and by a factor chosen by eye,
  as the lamps' strength is. It has no shadow and no direction: it lights the wall behind the port as well as before it.
- **The retropack's straps** run from its sides. They should meet under its centre at one
  explosive bolt. The motors are not canted toward the centre of mass as the real ones are.
- **The jettison motor has one nozzle** in the model; it had three.
- **The tower's bracing** (one diagonal per bay) is a simplification.
- **Lettering is Arial Bold**, not the stencil McDonnell used; "FREEDOM 7" was hand-painted.
- **The tower leaves on both its rockets, simply.** Hammack and Heberlig (p. 15): at booster cutoff "the
  tower clamp ring was released and both the escape and pylon jettison rockets fired to remove the tower".
  The simulator fires both on the tower as it leaves, along the axis through its centre of mass (so it is not
  carried aside, as the canted line was meant to carry it), without lightening it as they burn, and with
  nothing of their exhaust on the spacecraft. After an abort the escape rocket is spent and the jettison
  rocket takes it off alone. On an abort the rocket's line passes 1 in to one side of the centre of mass
  (`body.escape.offset`: NASA TM X-629; toward which side is estimated), which tips the spacecraft over and puts a
  pad abort down about 230 m from the pad rather than back on it; the tilt of the motor that set the line there, a
  third of a degree, is left out, and the tower's centre of mass is not moved as its rocket burns. Which side
  the line was set toward would be settled by the Mercury-Redstone abort analysis or the capsule's alignment
  record (McDonnell's weight and balance or thrust-alignment sheet for capsule 7; the Redstone range-safety
  study of where an aborted capsule falls): none has been found. The tower's and the retropack's drag areas, the retropack's centre of
  mass and inertia, and the metre a second its spring is given are estimates (`trajectory.body.sheds`).
  The retropack is flown at the whole 276 lb the record's weights step by, burned propellant included.
- **The spacecraft's drag off its axis is a model, not a measurement**: the zero-angle curves (TM X-491)
  along the axis by whichever end leads, falling as the cosine, and a cross-flow on its side of 3.6 sq m
  (`trajectory.body.capsule.side`, estimated). Small end first it is given the curve of the capsule with
  its tower, the only nose-first curve read.
- **No mass properties in the model.** The postlaunch report has the capsule's centre of gravity
  and moments of inertia; they have not been read. The simulator flies on estimates of them
  (`trajectory.body.capsule` in `flight.ts`, labelled `estimated`): replace them from the report.
- The parachutes are not in the model: the viewer draws them in flight from `flies.chutes` in `flight.ts`
  (gores, lines and colours estimated). The recovery aids are not modelled.
- The attitude jets' nozzles are not placed from a drawing: the simulator's chambers stand where
  `flight.ts` (`RCS_THRUSTERS`) puts them by judgement, and the viewer draws their jets there.

## Sources

[docs/sources.md](../../../../../docs/sources.md).
