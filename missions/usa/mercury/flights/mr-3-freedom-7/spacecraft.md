# Mercury spacecraft No. 7, as flown on MR-3

What the capsule in [model/vehicle.py](model/vehicle.py) is built from, and how far to trust each
number. In the model, station 0 is the heat shield's maximum-diameter plane and positive is toward
the nose. (McDonnell's own stations put that plane at Z = 104.50.) The drawings are in inches, so
the model is too.

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
| Shingle layout | 24 around, three rows, 8/6/4 beads | estimated | photographs; the real layout is irregular |
| Shingle gauges | cone: René 41, 0.016 in. Cylinder: beryllium, 0.22 in | documented | Hammack and Heberlig; CR-649 |
| Corrugation height | 0.14 in | estimated | |
| Portholes | two, 10 in | documented | *This New Ocean*, p. 367 ("the two 10-inch side ports"); it does not say whether that is the glass or the frame, and the model's bezel is 10 in with 9.2 in of glass clear. Where they are is estimated: see Cabin |
| Hatch | 45° of arc, stations 20 to 44 | estimated | sized to three shingles |
| Pressure vessel | two skins of 0.010 in titanium | documented | Hammack and Heberlig |
| Heat shield | beryllium heat sink, about 1 in | documented | Hammack and Heberlig ("approximately 1-inch-thick") |

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
No. 7's fit. In the cabin the pilot's head is toward -Y in the script (the viewer's +Z), his feet toward +Y, his right
hand and the hatch toward +X, and he faces the nose.

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
| Periscope objective | leaves the cone under the pilot's feet at station 13 | estimated | the flown capsule, NASM2021-00160 and -00165. Until November 2026 the model had it on the pilot's left |
| Periscope field | 172 degrees at low power; 43.6 at high | documented; derived | NASA SP-45, p. 282 (the orbital capsule's); 80 n mi of ground from 100 n mi up (Hammack and Heberlig, p. 5) is 2 atan(40/100) |
| Periscope axis | toward the Earth with the small end 14.5 degrees below the horizon | documented, for the orbital capsule | SEDR 104 Figure 12-3; SP-45, p. 282 ("-14 degrees"). Not checked for No. 7, which held 34 degrees for retrofire |
| Which way up the periscope's picture is | the small end at the top | estimated | nothing read says |
| Portholes' places | lower: 30 degrees round from the hatch's middle toward the feet, station 13. Upper: 125 degrees round the other way, station 40 | estimated | Figure 3.1-1 ("upper window", "lower window", capsules 5 and 7; a perspective, not dimensioned), NASM2021-00147 and -00160; "the lower right-hand window" and "the left window" in the reports |
| Frames inside the wall | six, at stations 7, 24.5, 29.5, 34.5, 48.5, 53.5 (one is left out where it would cross a port) | estimated | the wall is "lined with channeled frames" (SEDR 104, 2-3); how many and where is not in anything read |
| Rivet lines | 24, one down each stringer | estimated | the cone's skin is "reinforced with longitudinal hat stringers" outside (SEDR 104, 2-3) and the Postlaunch Report (section 10) names them by number into the twenties; 24, and which way round the first lies, are the model's (it has 24 shingles round) |
| Couch | a pan under head, back and seat, rests behind the thighs and under the calves and heels | estimated | laid under the model's own seated figure. Fibreglass shell, crushable honeycomb, a liner, moulded to the pilot: SEDR 104, 1-6 |
| Hand controller and abort handle | under the right and left hands | documented (which hand, what each does), estimated (place, size) | Results, p. 22: three axes in the right hand; "twisting of the left controller will initiate the abort sequence" |
| Cameras | one beside the pilot's head on his left looking at the panel; one at the lower right window; a lens in the panel beside the periscope | documented (where), estimated (size) | Results, p. 24 |
| Cabin lights | two fittings above and either side of the pilot's head | estimated | No. 7 had one CABIN LITES switch and flew with them "on full white light" (Postlaunch Report, p. 76); the arrangement is the orbital capsule's (SEDR 104, 10-19) |
| Chest parachute, survival kit, map case | by the right shoulder; a tall zippered container on the left wall; hanging under the periscope's display | estimated | NASM2021-00153 (the olive pack) and -00147 (the container); that it is the survival kit is SEDR 104 Figure 1-6's word for the orbital capsule; 12-27 for the map case |
| Visor seal bottle | a green bottle low at the pilot's left | documented (aboard), estimated (place, size) | SEDR 109-7 lists it for No. 7; NASM2021-00147 |
| Wiring | three runs down from the fuse panel; a harness from the back of the panel down each side, with red-capped connectors | estimated | NASM2021-00147 and -00153: the runs are ours |
| Coiled cord, lacing, port clamps | a white coiled cord hanging down the left wall; ties every few inches on the panel harnesses; four clamps on each port's ring | estimated | NASM2021-00147. What the cord served is not in anything read; the clamps are not counted |
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
and roll is how far the pilot's head is from uppermost: nought in the attitude held for retrofire, and about 100 degrees going up, because the model's stance on the pad (hatch at 295 degrees, estimated) has him on his side to the 105 degree azimuth.

### An open question: which way round the capsule stood

Two estimates lean on each other. The hatch's bearing on the pad is 295 degrees true (`lc-5.ts`, estimated: square to
the rails, and which of the two sides is read off a figure and one photograph). The model puts the periscope under
the pilot's feet, a quarter turn from the hatch, so on the pad it bears 205 degrees, 100 degrees round from the plane
of the 105 degree azimuth. That is why the pilot is on his side to the trajectory going up, and why the simulator rolls
the capsule 80 degrees after the turnaround to put the periscope toward the Earth (`trajectory.body.capsule.earthward`,
estimated). If the stack in fact stood with the pilot's head against the azimuth, no roll is wanted and that figure is 0.
Either of these would settle it: a pad photograph that shows the hatch side against the gantry and the flight azimuth
together, or the Postlaunch Report's attitude traces through the turnaround (a roll of about 80 degrees there, or none).
Until then both stay estimated.

## Parts in the model

Top-level nodes in the GLB, bottom to top. These names are the `node` fields in `flight.ts`.

| Node | Contains |
| --- | --- |
| `Retropack` | housing, three retrograde motors, three posigrade motors, three straps and fittings |
| `HeatShield` | beryllium heat sink, edge fasteners |
| `CrewCabin` | titanium pressure vessel with hatch opening, aft bulkhead stiffeners; and at full detail everything inside it: the painted lining, frames and port frames, the couch and the pilot, the main panel with its instruments (each needle a node of its own, `Gauge_...`), the left console in three parts and the right console, lamps (`Tele_...`) and controls (`Ctl_...`), the periscope with its screen (`Periscope_Screen`), cameras, stowage, two cabin lights, two oxygen bottles, the folded landing bag, and `Seat_Pilot` at his eyes |
| `Afterbody` | René 41 shingles and fasteners, structure, attach ring, portholes, periscope, umbilical, roll thrusters, lettering, flags |
| `Hatch` | three shingles, latch housings, external release handle, inner and outer skins; its painted inner face and internal release handle |
| `RecoveryCompartment` | beryllium shingles, pitch and yaw thrusters, parachute canisters; the packed main and reserve parachutes |
| `AntennaCanister` | housing, dielectric window, horizon scanners, drogue mortar, destabilising flap; the bicone antenna inside |
| `EscapeTower` | clamp ring, pylon, escape motor and its propellant grain, three canted nozzles, jettison motor nozzle, spike |

The same GLB also holds the launch vehicle's five nodes: see
[redstone-mrlv.md](../../vehicles/redstone-mrlv.md).

## What the model gets wrong or leaves out

- **The antenna canister's diameter disagrees with the one document that states it.** See above.
- **Shingle layout is regular; the real one is not.** Real shingles vary in size and are cut round
  the ports, hatch and periscope.
- **The hatch is the wrong shape** (it follows shingle edges), and its latches are placeholders.
- **The landing bag** is a flat ring standing in for the folded bag; it does not deploy.
- **The pilot lies flat on his back and looks down his body at the panel.** The seated figure's torso and head do not
  bend: his eyes rest 55 degrees toward his feet from straight ahead, which a man does with his head, not his eyes.
  The panel is placed square to that line at 23 in, so what he sees is right and how he holds his head is not.
- **The cabin is what the pilot sees, not a survey of the installation.** Behind the panel there are instrument cases
  and no wiring; under the couch, boxes of the right kind for the environmental system. No harness, toe caps or knee
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
  estimated: 80 degrees, from the model's own periscope and hatch bearings). The record has the yaw through 180 degrees
  and the 34 degrees; that the periscope faced the Earth is why it was there; the roll's own figure is not in anything read.
- **Open: the paint is not worn in colour.** A paler ring round each screw head is all there is; edges are not
  worn to the metal and recesses are dark only through the build's baked shade, not in the paint.
- **Open: the porthole and screen lights have no direction.** Each lights the wall behind its pane as well as what
  is before it.
- **The periscope does not retract**, has no filters, map or Sun and Moon index that turns, and its reticle is a few
  lines of the real one's. What it shows is the scene's geometry and sky, without the clouds' volume.
- **The hatch's latch mechanism is not modelled**: the inner face is plain with one release handle. No drawing of it
  has been read, and the flown capsule's hatch was lost at recovery.
- **The portholes are single panes.** No. 7's were multi-pane and heat resistant (Results, p. 19); their make-up is
  not in anything read. From the couch the upper one is seen nearly edge on.
- **Cabin light is two lights hung in the middle of the cabin**, not at the fittings, falling off with distance and not
  its square, so that the wall beside a fitting does not burn; they cast no shadows. The shadow is worked once by the
  build (`mercury_cabin.shade`): at every vertex, how much of the two fittings is seen past everything else in the
  cabin and how open the point is to the room, kept as a colour the viewer multiplies the surface by. So the dark
  behind the panel and in the corners is there, but nothing that moves casts a shadow, a large flat plate is shaded
  only at its corners, and sunlight through a port is dimmed where the lamps' light is. What comes in at the windows
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
