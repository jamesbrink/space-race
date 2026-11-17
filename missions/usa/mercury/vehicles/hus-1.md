# Sikorsky HUS-1 Seahorse (S-58): the Marines' recovery helicopter

What [hus_1.py](hus_1.py) builds: the U.S. Marine Corps' utility helicopter of 1961, the type that recovered
Mercury's capsules and astronauts off the Cape. A flight's `model/helicopter.py` calls `build()` with the aircraft's
own markings (`Markings`: its side number, the squadron's code, its bureau number).

The HUS-1 is the Navy's HSS-1 with a utility cabin: "essentially the same aircraft as the Navy's HSS-1 except for the
cabin's interior arrangement" (*Marines and Helicopters 1946-1962*, p. 80). It is Sikorsky's S-58, the Army's H-34;
in 1962 the HUS-1 became the UH-34D. A Wright R-1820-84 radial sits in the nose at an angle behind clamshell doors,
driving the transmission behind the cockpit, which is up over the cabin; the cabin has a large sliding door on the
starboard side; the tail rotor is on the port side of a pylon that folds.

**The flights.** On 21 July 1961 (MR-4) Hunt Club 1, of HMR(L)-262 (pilot Lt. James L. Lewis, copilot Lt. John
Reinhard), cut the capsule's antenna, hooked its recovery loop with a shepherd's hook on a pole, went down until "all
three of its landing gear" were in the water, and could not lift it: "The flooded Liberty Bell 7 weighed over 5000
pounds, a thousand pounds beyond the helicopter's lifting capacity" (*This New Ocean*, pp. 373 and 375). A chip light
came on, and it let the capsule go. A second HUS-1, ET-30, with George Cox as copilot, picked Grissom up in the horse
collar. [mr-4-liberty-bell-7/model/helicopter.py](../flights/mr-4-liberty-bell-7/model/helicopter.py) builds Hunt
Club 1.

## The model's frame and nodes

The script works in feet, as the sources give the type (and a tyre's inches): a point is (u, y, z), u aft of the
tip of the nose, y to port, z above the ground with the aircraft on its wheels; `P()` turns that into metres once.
In the GLB the helicopter faces +X, up is +Y, its starboard side is toward +Z, and the origin is on the ground
straight under the main rotor's axis (10.9 ft aft of the nose).

| Node | Origin (m, viewer's axes) | What it is, and how it moves |
| --- | --- | --- |
| `Fuselage` | the model's origin | skin, cockpit glazing, cabin lining, markings, the louvres on the spine, the door's rails, the hoist's mount, the whip antenna. Fixed |
| `MainRotor` | (0, 4.237, 0): on the rotor axis, in the plane of the blades | head, shaft and four blades. Spin about its own +Y; Sikorsky's rotors turn counter-clockwise seen from above, so a positive turn. The blades are built pointing forward, aft and to either side |
| `TailRotor` | (-9.997, 3.404, -0.488): its hub, on the port side | hub, shaft and four blades. Spin about its own Z (across the aircraft). Its sense of rotation was not read |
| `TailPylon` | (-7.955, 0.799, 0): the pylon's foot | pylon, the tail rotor's gearbox fairing, the horizontal stabiliser. Fixed; built unfolded |
| `MainGear` | the model's origin | both main legs, wheels and tyres. Fixed |
| `TailWheel` | the model's origin | tail wheel, fork and oleo. Fixed |
| `CabinDoor` | (0.701, 0.975, 0.884): the door's forward lower corner, shut | slides aft: a `slide` by [-1.341, 0, 0] m (4.4 ft) clears the opening. It rides 2.4 to 4.6 cm outside the skin on two rails |
| `Hoist` | (0.610, 2.393, 0.991): the boom's pivot | boom, drum and hook, stowed along the side, pointing aft. A `swing` of +pi/2 about [0, 1, 0] puts it out square to the starboard side. `Hoist_Sheave`, an empty under it at (-0.899, -0.128, 0) in the node's frame (0.899 m to starboard once swung out), is where the cable leaves the drum: hang the hoist's line from there |
| `CargoHook` | (0, 0.296, 0): the hook's throat, under the rotor axis | the belly hook the capsule's line hung from. Hang that line from the origin |
| `RecoveryPole` | (-1.646, 0.936, -0.411): its grip end | the shepherd's hook, lying on the cabin floor with its crook forward. `RecoveryPole_Crook`, an empty, is the inside of the crook |

## Dimensions

Feet, as the sources give them. "The arrangement" is Sikorsky's *Descriptive Arrangement* of the S-58, a three-view
drawn with its dimensions (reproduced in *This Day in Aviation*, 8 March 1954); "Jane's" is *Jane's All the World's
Aircraft 1958-59*, the Sikorsky S-58, pp. 371 and 372, whose figures are the same in the 1957-58 edition, pp. 361 and
362 (but for the loaded weight and range).

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Main rotor diameter | 56 ft 0 in (17.069 m) | documented | Jane's p. 372; the arrangement, "56.0 DIA."; the Sikorsky Archives. Model: 17.07 m across the blades |
| Main rotor disc area | 2,460 sq ft | documented | Jane's; the arrangement (the Archives: 2,463) |
| Main blade: area, section | 35 sq ft; NACA 0012 | documented | the arrangement, "MAIN ROTOR DATA". That 35 sq ft is one blade's is our reading: four would be 140, a solidity of 0.057 |
| Main blade chord | 16.5 in (1.37 ft) | derived | 35 sq ft over the blade's span from its root fitting, 2.2 ft out (estimated), to 28 ft, less 0.3 ft |
| Main rotor gear ratio | 11.3 : 1 | documented | the arrangement |
| Tail rotor diameter | 9.5 ft | documented | the arrangement, "9.5 DIA" |
| Tail rotor's lowest tip above the ground | 77 in | documented | the arrangement |
| Tail rotor hub above the ground | 11.17 ft | derived | 77 in and half of 9.5 ft |
| Height to the top of the rotor head | 14.3 ft | documented | the arrangement; Jane's: 14 ft 4 in. Model: 14.30 ft |
| Height overall, to the tail rotor's upper tip | 15 ft 11 in | documented | the Sikorsky Archives; the arrangement's 77 in and 9.5 ft make 15.92 ft. Model: see "Size" |
| Fuselage length | 46.6 ft, nose to the pylon's trailing edge | documented | the arrangement; Jane's gives 47 ft 2 in, measured we do not know how. The model follows the arrangement |
| Length, rotors turning | 65.7 ft | documented | the arrangement. The model, blades fore and aft: see "Size" |
| Length, rotors positioned for stowage; folded | 56.3 ft; 37.0 ft with the blades and pylon stowed | documented | the arrangement. Neither is modelled |
| Track (main wheels, centre to centre) | 12 ft | documented | Jane's; the arrangement |
| Wheelbase | 28 ft 3 in | documented | Jane's |
| Tyres | main 11.00-12, tail 6.00-6 | documented | Jane's; the arrangement |
| Tyres' outside diameters | 31.8 in, 16.8 in | derived | the size codes, at an aspect of 0.9 (estimated) |
| Nose to rotor axis; to main axle | 10.9 ft; 7.84 ft | estimated | read off the arrangement's side view |
| Plane of the blades at the hub | 13.9 ft | estimated | the arrangement |
| Tail rotor hub: aft of the nose; to port of the pylon's middle | 43.7 ft; 1.6 ft | estimated | the arrangement's side and plan views. That it is on the port side: every photograph of 21 July |
| Body: outline in side view, width in plan | top, bottom, half-width at 30 stations (`TOP`, `BOT`, `HALF` in the script) | estimated | the arrangement, read to about 2 in; the cabin 5.7 ft wide (the front view: 5.6; the plan: 6.0) |
| Pylon: leading and trailing edges, thickness | `PY_LE`, `PY_TE`, `PY_HALF` | estimated | the arrangement's side and plan views |
| Horizontal stabiliser | 5.5 ft across, 1.9 ft chord, 7.7 ft above the ground, on the pylon ahead of the tail rotor's disc | estimated | the arrangement's plan view ("5.5") and side view. Its chord is cut to clear the disc |
| Cabin door's opening (starboard) | 4.2 ft long by 4.0 ft high, its sill 3.2 ft above the ground, from 8.6 ft aft of the nose | estimated | the arrangement draws it dashed (hidden), on the far side |
| The door's travel aft | 4.4 ft | estimated | enough to clear the opening |
| Cabin windows (port side) | two, 1.8 ft square, 13.1 and 15.8 ft aft of the nose | estimated | the arrangement; S61-02826 |
| Rescue hoist: boom pivot, boom | 7.85 ft up, above the door's forward edge, 3.25 ft out from the middle; 2.6 ft to the drum | estimated | KSC-71P-260 (MR-3, the starboard side) shows a boom above the door's forward edge; nothing dimensioned was read |
| Cargo hook | under the rotor axis, its throat 0.97 ft above the ground | estimated | that the capsule's line hung from under the belly: S61-02826, MSFC-6116424 |
| Shepherd's hook | about 9 ft long, a crook of 0.42 ft radius | estimated | that it was used: *This New Ocean*, p. 373. Not seen in any photograph read |

### Size

Each build prints the model's overall box. At level 1.0 (the coarser levels are within 2 mm of it):

| | Model | Source |
| --- | --- | --- |
| Length, nose blade tip to tail rotor's aft tip | 19.980 m (65.6 ft) | 65.7 ft rotors turning (the arrangement): the tenth is in where the tail rotor's hub was read |
| Across the rotor | 17.069 m (56.0 ft) | 56.0 ft |
| Height, to the tail rotor's top tip | 4.851 m (15.92 ft) | 15 ft 11 in (15.92 ft) |

## Performance that matters here

| | | Confidence | Basis |
| --- | --- | --- | --- |
| Engine | Wright R-1820-84, nine-cylinder radial: 1,525 hp for take-off, 1,275 hp METO for five minutes | documented | Jane's p. 372. *This Day in Aviation* adds 1,425 hp for 30 minutes at 2,700 rpm, and that it was installed at 35 degrees (secondary) |
| Main rotor speed | 258 rpm at most | documented, secondary | *This Day in Aviation* (2,914 engine rpm) |
| Weight empty | S-58 7,560 lb; H-34A 7,646 lb; UH-34D 7,900 lb | documented | Jane's (S-58, H-34A); the Sikorsky Archives (UH-34D). The HUS-1's own of 1961 was not read |
| Weight loaded | S-58 13,000 lb (12,700 in the 1957-58 edition); H-34A 11,867 lb, overload 13,300 lb; UH-34D 14,000 lb maximum | documented | as above |
| Fuel | 198 to 307 US gal, by model | documented | Jane's |
| Hovering ceiling out of ground effect | S-58 2,100 ft; H-34A 5,500 ft | documented | Jane's: at the weights it gives, which it does not say. In ground effect: 4,000 ft and 9,600 ft |
| Service ceiling | S-58 9,600 ft; H-34A 12,000 ft | documented | Jane's |
| What it could lift on 21 July | about 4,000 lb | derived | *This New Ocean*, p. 375: the flooded capsule "weighed over 5000 pounds, a thousand pounds beyond the helicopter's lifting capacity". Hammack and Heberlig say only "greater than the lifting capability of the helicopter" |
| A hoist driven by the transmission | "accessory drives for ... the cargo hoist" | documented | Jane's p. 372 |
| Rescue hoist's rated load | not read | | it would be in the HUS-1's flight manual (not read) |
| Cargo hook's rated load | not read | | likewise |

## Paint and markings

From the photographs of 21 July (S61-02826, MSFC-6116424, 61-MR4-100: Hunt Club 1, the port side; MSFC-6116429 and
S61-02819: ET-30, the port side) and of the same squadron's ET-44 at MR-3 on 5 May (KSC-71P-260: the starboard side).
All the photographs of these recoveries read are black and white.

- **Hunt Club 1 is ET-32, bureau number 148755**: the side number 32 and the code ET in all three photographs; the
  bureau number read in S61-02826 at full resolution, on the tail cone under MARINES. Documented (read off a
  photograph). A small stencil above the number (the type?) is not legible and is left off.
- **The colour** is a dark olive green overall, from one colour photograph of a Marine HUS-1 of 1960 (HMR(L)-163 off
  USS *Bennington*); the photographs of 21 July show the same dark tone under white lettering. Estimated: no
  specification or paint chip was read, and the scan's colour has faded.
- MARINES in white along the tail cone on both sides; the national insignia (blue disc, white star, white bars with a
  red stripe, edged in blue) on the cabin aft of the windows; the side number big on the nose's port side (on the
  starboard, on the door, as ET-44's 44), small aft of MARINES; ET on the pylon; a white DANGER plate low on the pylon.
  Sizes and places estimated from the photographs, to about half a foot.
- The tail rotor's tips are painted light (a ring in every photograph): white here. The main blades' tips: yellow.
  Both estimated; the photographs cannot tell white from yellow.

## What the model gets wrong or leaves out

- **The body is lofted through superellipses** fitted to the arrangement's three views, read off a 530-pixel
  reproduction: its outline is right to a few inches, its sections are a guess between the views.
- **No cockpit and no engine.** The glazing is the dark `window-void`; the nose's clamshell doors, their louvres and
  the engine's exhaust are not modelled (the louvres are dark patches); no pitot, no steps, no handholds, no
  antennas but the whip on the tail cone, whose height is estimated.
- **The cabin is an empty dark box** behind the door: no troop seats, no floor fittings, no crewman.
- **The rotors are built still and flat**: no droop of the blades at rest, no coning, no pitch, no flapping or lead-lag
  hinges as such (the head is a drum with four arms and dampers). The tail rotor's sense of rotation, its blades'
  chord (6.6 in) and its hub are estimated.
- **The mast is upright.** The arrangement draws the rotor tipped forward a degree or two; not modelled.
- **The pylon does not fold** and the blades do not fold; the hinge is not modelled.
- **The gear is a sketch** of the arrangement's: oleo and two radius rods each side, the tail wheel's fork. The wheels
  do not turn and the oleos are at their length unloaded.
- **The rescue hoist, the cargo hook and the shepherd's hook** are in their documented places as far as the photographs
  show and no further: their forms and sizes are estimated. The horse collar, the hoist's cable and the capsule's
  line are the scene's, not the model's. The squib-actuated antenna cutter on its pole is not modelled.
- **The door rides on two rails** outside the skin; how the real door hung and latched was not read.
- **Markings**: the insignia's proportions are the 1947 standard's as remembered, not measured; the smaller stencils
  (no step, the fuel, the rescue arrows) are left off.
- **No mass properties** are in the model.
