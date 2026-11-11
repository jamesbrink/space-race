# Launch Complex 5, Cape Canaveral

The pad every Mercury-Redstone flew from. Model: [lc_5.py](lc_5.py), which puts together one module
per piece in [lc5/](lc5/); built for a flight by its `model/pad.py`. NASA's report calls the complex
"VLF 56" (Vertical Launch Facility 5/6): pads 5 and 6 shared one blockhouse, and one track that
also runs on to Complex 26.

**The model is built in the service position**: the service structure stands round the vehicle with
its platforms closed and the white room round the capsule. Every moving part is its own node with
its origin on its pivot (table below), so the viewer can take the pad from there through the
rollback to liftoff. The cherry picker is built with its cab at the hatch, where it was from T-55.
In the built pose it stands inside the closed white room; the viewer keeps it clear (standby pose)
until the structure has gone.

## The site's frame

Origin: the launcher's centre on the pad. Feet, as the sources give them.

| Axis | Points | Basis |
| --- | --- | --- |
| +X | the side the capsule hatch faces: WNW, about 295° true, uprange, toward the blockhouse | estimated: Figure 7-6 puts the mobile tower on the blockhouse side, and liftoff photograph 6100884 shows its cab there; 285° is the reciprocal of the 105° azimuth |
| +Y | along the rails toward the structure's parking places: SSW, 205° true | derived: OpenStreetMap's rails and pad outline, 25°/205° to within 1° |
| True north | (0.423, −0.906, 0) in Blender, (0.423, 0, 0.906) in the viewer | derived from the two lines above |

Pad 6 is 520 ft along −Y (025° true); the blockhouse's point is at (157.3, −261.0) ft, 305 ft from
pad 5's centre and 304 ft from pad 6's, and its long axis lies along X. Both are derived from
OpenStreetMap (pad 6's centroid 519 ft away on 025.2°; the blockhouse's outline, way 195709358).
They and the ground between are a second model in this frame: see "The rest of the complex" below.

## Where things stood, and when (MR-3, 5 May 1961)

| Time | Event | Source |
| --- | --- | --- |
| 04:35 EST | Shepard arrives at the pad | *Results*, p. 77; Postlaunch Report timeline |
| 05:15 | "Ascend gantry" (by the gantry's elevator) | the same; *This New Ocean*: Shepard "ascended the gantry" |
| 05:20 | Insertion begun: into the capsule from the white room on level 3 | the same |
| T−90 | Capsule hatch installed (MR-4 standard count) | TM X-53107 p. 7-27 |
| T−85 to T−60 | Platforms 2, 4, 3 opened (platform 1 at T−200) | TM X-53107 pp. 7-25, 7-27 to 7-28 |
| 06:37 (T−55) | "Gantry removed": structure to the edge of the pad; cherry picker's cab to the hatch | *Results* p. 77; PLR §7.1 ("gantry removal at −55 minutes"); TM X-53107 p. 7-29 |
| T−15 (MR-3) | 86 min hold, weather then an inverter change: "HOLDING: GANTRY IN" … "HOLDING: GANTRY AWAY"; recycled to T−35 | *Results* Fig. 1(a), events 16 and 18; PLR §10.2 |
| T−8:45 | Structure driven by remote control to its launch position (Hammack: T−9) | TM X-53107 p. 7-32; Hammack p. 22 |
| T−4 or T−2:30 | Cherry picker's cab lowered "away and down" (two sources disagree) | TM X-53107 7.3.3.1 (T−4); p. 7-33 and Hammack (T−2:30) |
| T−35 s | Capsule umbilical dropped | TM X-53107 p. 7-33 |
| ≈T−14 s | "Boom drop" | TM X-53107 p. 7-33; Hammack p. 22 |
| 09:34 EST | Liftoff. The tail plugs pull out of the launcher as the vehicle rises | TM X-53107 4.2.4, Fig. 4-25 |

How the pilot got in: the white room on level 3 enclosed the capsule. TM X-53107 7.5.1.2 calls it
"enclosing and air conditioning the capsule on level three"; Hammack calls it a "white room
enclosure" that "separated down the middle when the service structure was opened". Shepard went up
by the elevator, walked into the white room, and entered by the hatch. The structure's mast is
behind the vehicle (+Y) and its platforms reach forward past it. The hatch faces +X, sideways to
the rails, so it opens into the white room's +X half (`ServiceStructure_Platform3_Right`). The
cherry picker came in from the same side once the structure had gone.

## The pieces

| Top-level node | Module | Contains |
| --- | --- | --- |
| `Hardstand` | hardstand.py | 200 ft of 20 ft slabs, joints, burn and stain, painted 121 ft circle, four flush rails, scale plate, trench covers, WNW apron and the ramp off its end, track on ballast and sleepers |
| `LaunchPedestal` | launcher.py | the launch ring, support pads and fin clamps, four legs with struts and jack feet, four-sided deflector, tail-plug housing, two ground cables |
| `UmbilicalMast` | masts.py | cable mast No. 2 (the capsule's), its umbilical to the receptacle, eject line |
| `BoosterMast` | masts.py | cable mast No. 1 (the booster's), cooling package, boom and boom plug, eject line |
| `ServiceStructure` | service_structure.py | base, four rail trucks, office (windowed, with a door, a desk and lockers), stairs from the pad to the base's deck, A-frame mast, platform brackets, elevator, ladder, hammerhead crane; child nodes below |
| `CherryPicker` | cherry_picker.py | International Harvester R-series truck, glazed cab with seat, wheel, dash; child nodes below |
| `GroundEquipment` | ground_equipment.py | LOX topping unit, a second enclosure, chevron box, tripod cameras; the emergency shower on its cart, a packing case, two DANGER boards, a striped barricade, the white trailer lettered NASA SP-No 1, two huts on skids |
| `CameraTowers` | ground_equipment.py | two lattice camera towers |
| `Floodlights` | ground_equipment.py | six timber poles in the grass at the pad's edge, a crossarm and three lamps each |

## Moving parts

Blender axes and feet first; the viewer (metres, +Y up) maps Blender (x, y, z) to (x, z, −y). An axis
in the viewer is the Blender axis mapped the same way. Angles are right-handed about the axis given.

| Node | Parent | Origin (Blender ft) | Moves | Travel | When | Source / confidence |
| --- | --- | --- | --- | --- | --- | --- |
| `ServiceStructure_Platform{1..4}_Left` | `ServiceStructure` | (0, 0, floor) | slides along −X | 4.5 ft (1.372 m) | before the structure moves: L1 T−200, L2 T−85, L4 T−65, L3 T−60 | parting documented (Hammack; TM X-53107 count); distance estimated |
| `ServiceStructure_Platform{1..4}_Right` | `ServiceStructure` | (0, 0, floor) | slides along +X | 4.5 ft | the same | the same |
| `ServiceStructure` | — | (0, 0, 0) | rolls along +Y (viewer −Z) | +110 ft (33.53 m) to the edge of the pad; +173 ft (52.73 m) in all to the launch position | T−55; T−8:45 | moves documented; 110 ft estimated (100 to 120); 173 ft derived (Fig. 7-6's 181 ft less 8 ft) |
| `ServiceStructure_Wheel_1..8` | `ServiceStructure` | each axle's middle, 1.53 ft up | turns about +X | −d/1.5 ft rad for a roll of d ft along +Y | with the roll | wheel size estimated |
| `CherryPicker_Mast` | `CherryPicker` | the turntable pin (67, 0, 7) | turns about Blender +Y (viewer −Z) | stow: +65.59° (viewer: −65.59° about +Z): lies forward on the bumper frame | after liftoff (drive-off, not documented) | estimated |
| `CherryPicker_Jib` | `CherryPicker_Mast` | the mast-head pin (81.79, 0, 75.42) | turns about Blender +Y | lower to the pad: −71.27° (viewer +71.27° about +Z); standby, clear of the closed structure: −29.94° (viewer +29.94°); stow fold after lowering: +1.16° more (viewer −1.16°) | lower at T−4 or T−2:30 | lowering documented ("away and down"); angles derived from estimated lengths |
| `CherryPicker_Cab` | `CherryPicker_Jib` | the hanger pin (9.9, 0, 71.4) | turns about Blender +Y | the negative of jib plus mast, to stay level: lowered +71.27°, standby +29.94°, stowed +4.52° (Blender) | with the jib | estimated |
| `CherryPicker_Outrigger_1..4` | `CherryPicker` | each hinge pin | turns about +X | up beside the body: 1 and 3 (−Y side): −105°; 2 and 4 (+Y side): +105° | before the drive-off | estimated |
| `CherryPicker_Wheel_1,2`, `CherryPicker_SteerWheel_1,2` | `CherryPicker` | hub centres | roll about their axle (Blender Y, viewer Z); steer about the vertical | — | drive-off | — |
| `CherryPicker` | — | the rear axle's middle on the ground (71.5, 0, 0) | drives | faces +X (viewer (1, 0)); wheelbase 16.5 ft (5.029 m); tyre radius 1.73 ft (0.527 m) | after liftoff; the liftoff photographs show it still there | estimated |
| `UmbilicalMast` | — | hinge pin (0, −8, 1) | turns about +X | +88° (top toward −Y, viewer +Z): lies on the pad | at the umbilical drop, ≈T−35 s (that it fell then is estimated) | mechanism documented (release valve, bungee); form and angle estimated (S61-02407) |
| `BoosterMast` | — | hinge pin (−3, −13.5, 1) | turns about +X | +88° | "boom drop", ≈T−14 s | event documented; form estimated |

Notes:
- Order of the cherry picker's stow, after the lowering: jib fold (+1.16°), then mast (+65.59°
  about Blender +Y), then the outriggers up, then drive. Its cab hangs off the truck's tail at
  about 5 ft.
- The platform halves clear the vehicle when parted: their inner edges are at ±4.56 ft against a
  booster radius of 2.92 ft and a capsule radius of 3.10 ft.
- Built pose: the clearance check passes at detail 1.0, 0.6 and 0.3.
- The vehicle's geometry was tested against the pad in Blender (BVH overlap) in four poses:
  service; T−55; liftoff; and standby with the structure closed. Only the umbilical touches the
  capsule, at its receptacle.

## Dimensions

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Hardstand | 200 ft square, sides along the rails | derived | OSM outline 195 to 202 ft; Figure 7-6, 157 px at 1.274 ft/px (pad centres 408 px = 520 ft) |
| Painted circle | 121 ft across | derived | Figure 7-6, 95 px; the arc shows in 6100884 |
| Apron (WNW) | 28 ft wide, 60 ft long | estimated | Figure 7-6 |
| Rails | two pairs, about standard gauge (4 ft 8.5 in taken), pair centres 21 ft apart | estimated | 6100884 (fin span 142 px = 12.67 ft; pairs 223 px apart, about 20 ft); OSM lines 22.3 ft apart |
| Track | to 245 ft along +Y; modelled 165 ft along −Y | derived | Figure 7-6 |
| Launcher support pads | 5.5 ft above the pad | estimated | S63-02651: 4.9 to 6.0 ft (booster 137 px = 70 in) |
| Launch ring | about 10 ft across, 3.05 ft opening | estimated | S63-02651, 6100884 |
| Scale plate | 13 ft square | estimated | its existence: the museum's caption at pad 6 and the count's weighings |
| Service structure height | 135 ft to the crane's top rail | derived | LC-26 twin "111 feet 9 inches to the top rail" (museum) + "about 23 feet" taller mast (Noble); COE: "towered 140 feet above the launch pad" (NHL p. 3) |
| Mast | A-frame, legs 3 ft square, 21 ft apart at the base, 6 ft at the head | estimated | S61-03158, Hammack Figs 22 and 23, Figure 7-7 |
| Base | girders over each rail pair, 48 ft long; four rail trucks of two axles | estimated (four trucks: museum) | Noble; LC-26 blueprint photograph |
| Level floors | L1 45.1, L2 53.8, L3 64.6 (the white room), L4 75.8 ft | estimated | L3 at the capsule's heat-shield plane (vehicle stations); spacing scaled off Hammack Fig. 22 (L4 +11.7, L2 −10.4, L1 −19.2 ft) and Figure 7-7 |
| Platform widths | L1 37 ft, L2 35 ft, white room and L4 27 ft; 22 ft deep | estimated | Hammack Fig. 22: white room 4.6 to 5.5 vehicle diameters; L1 and L2 1.43 and 1.37 times the white room |
| White room | 10.4 ft high, glazed blue-green panels in a white frame | estimated (built Feb to May 1961: documented) | TM X-53107 7.5.1.2; colour from 6100884 |
| Platform cut-outs | L1, L2: 3.6 ft radius (booster 2.92); L3: 3.7 (capsule 3.10); L4: 2.4 (tower) | estimated | clears the vehicle by 0.6 to 0.7 ft |
| Mobile aerial tower | reach 125 ft | documented | TM X-53107 7.3.3.1 |
| Truck position | tail 64 ft from the launcher on +X | documented 65 ft (secondary) | *This New Ocean* p. 329 (MR-BD stand-in); Figure 7-6 ≈64 ft |
| Mast, jib | 70 ft, 72 ft | estimated | sized so the jib alone puts the cab on the pad beside the truck, as at liftoff |
| Capsule cable mast | 61 ft tube, 8 in tapering to 5 in, 8 ft from the axis | estimated | S63-02651, Hammack Fig. 23 |
| Floodlights | 40 ft timber poles, six, three lamps each | estimated | FHSU F16_015 and F16_017 (July 1961): timber poles with two or three round floods on a crossarm, standing just off the slab |
| Apron ramp | 14 ft long, down 1.5 ft to the road | estimated | the model's pad stands 0.45 m above the viewer's ground |
| Emergency shower | 3.2 ft square, 8.6 ft tall, on a cart | estimated (that it stood at the pad's edge: documented) | GPN-2000-001006 (MR-3, cherry picker at the capsule); KSC-61-4457 (2 May 1961) |
| Trailer "NASA SP-No 1" | 29 by 8 ft, 12.4 ft to its roof | estimated (its lettering and that it stood by the structure's base: documented) | S61-03158 |
| Pad huts | 10.5 by 11 ft and 9 by 9 ft, 9 ft tall | estimated | FHSU F16_017 (July 1961): two huts at the hatch side's edge |
| Office on the structure's base | 14.8 by 13.5 ft, 8.6 ft tall; windows 3.2 ft square and 6 by 3.2 ft | estimated | S61-03158 shows a lit room between the legs; its windows are placed by eye |
| Stairs to the base's deck | 3 ft wide, 14 risers of 7.5 in | estimated | GPN-2000-001006 shows a flight at the base; its place on the base is not established |

## The rest of the complex

A second model, `surroundings.glb`, built by a flight's `model/surroundings.py` from
`lc_5.build_surroundings()`: scenery in the pad's frame, which the viewer draws round the pad and
does not let you pick. Nothing in it moves.

What it rests on. Published: the NHL nomination's description of the blockhouse and ready rooms;
the museum's figures for Complex 26's blockhouse, which the nomination calls identical; the
museum's dated photographs and launch list for pad 6. Derived: every plan position and plan size,
from OpenStreetMap's outlines of what stands there today. Estimated: everything else, read off four
photographs of July 1961 in the FHSU Project Mercury collection (F16_015, F16_016, F16_017,
F19_008), taken eleven weeks after MR-3, and off the buildings as they stand. **No photograph of
the blockhouse or pad 6 on 5 May 1961 has been found**, so what is movable here (the cars, the
gantry's place, the trailers) is July's, not May's.

| Top-level node | Module | Contains |
| --- | --- | --- |
| `Blockhouse` | blockhouse.py | the arrow-shaped bunker: 2 ft walls round six panes of foot-thick glass with steel shutters, the blast door (one leaf open) and its ramp, two firing rooms with consoles and an equipment room, the domed roof and what stood on it (railed antenna stand, whip, wind vane, the telemetry helix and its mesh reflector on a sandbagged tripod), wall floodlights, the roof ladder; round it the shell paving, the concrete walk, a tracking dish, the drive's banded posts |
| `ReadyRoom` | blockhouse.py | the concrete-block ready-room building: pilasters, windows, two doors, a louvred vent, tar roof, the breezeway roof across to the blockhouse, the air handler between them; a table, benches, lockers and a kitchen counter inside |
| `Pad6` | pad6.py | pad 6's 200 ft of slabs, scale plate, burn marks, trench covers, four floodlight poles |
| `Pad6Launcher` | launcher.py | a second launch ring, the same as pad 5's |
| `Pad6Gantry` | pad6.py | the square-topped portal gantry: two lattice legs on rail trucks, the truss across the top with its hoist, the three-storey work enclosure and the railed deck under it |
| `Track` | grounds.py | the four rails on from pad 5's track through pad 6 and 180 ft beyond, ballast and sleepers, the concrete laid in the track by pad 6, and the turnout curving east |
| `Road` | grounds.py | the concrete road between the pads, NO SMOKING painted across it |
| `CableTrenches` | grounds.py | the covered trench and its walk from each pad to its firing room |
| `Yard` | grounds.py | two cable racks and the scaffold stair tower north of pad 5 |
| `Poles` | grounds.py | the pole line along the road behind the blockhouse; a floodlight pole by the hut |
| `Outbuildings` | outbuildings.py | the hut behind the blockhouse and its fenced transformers, the hut by the road, the generator building and its fuel tank, the shed by the track |
| `Vehicles` | vehicles.py | seven sedans and two station wagons, a pickup with a box body, a forward-control van |

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Blockhouse plan | 90 ft from the point to the back wall, 44 ft wide; the point a right angle, its two faces 31.1 ft | derived | OSM way 195709358: back part 67.8 by 44.0 ft, faces 30.8 and 31.3 ft, on 160° and 070° true |
| Blockhouse position | point at (157.3, −261.0) ft; 305 ft from pad 5, 304 ft from pad 6 | derived | the same; the museum gives "400 feet" for Complex 26's |
| Walls | 2 ft thick | documented, of Complex 26's twin | the museum's *Launch Complex 26 Blockhouse* page; NHL nomination: the two are "identical" |
| Roof | domed, 3 ft higher at the crown than at the edge | derived | the same page: "approximately five-feet thick along the edges to nearly eight-feet directly overhead". Modelled as a parabola over the whole plan; the 2005 photograph shows the arch from behind |
| Wall height | 15 ft | estimated | F16_016, against the pickup beside it: 14 to 17 ft |
| Windows | three panes to each firing room, one of 5 ft and a pair of 8.75 ft together, 4.5 ft high, sill 4.4 ft up; glass 1 ft thick | glass documented (Complex 26: "three segments of glass, each ... 15 layers of one-quarter inch glass"); sizes and places estimated | F16_016 (the pad 6 face in 1961); the 2010 photograph (the pad 5 face); the pad 5 face is taken as its mirror |
| Shutters | steel, top-hung, propped open | estimated | the 2010 photograph; F16_016 shows banded shutters in 1961 |
| Blast door | 7 ft wide, 7.5 ft high, two leaves, in the back wall 11 ft off the axis toward pad 5 | double plate doors documented (Complex 26); size and place estimated | the 2005 photograph |
| Firing rooms | two, one to each pad, with an equipment room behind | two rooms documented (NHL nomination); the partition's line, the consoles and racks estimated | not from any drawing |
| Roof equipment | railed stand 18 by 12 ft, tripod mast, whip, wind vane, helix 7.4 ft long on a 6.6 ft reflector | estimated | F16_016; F16_015 (the helix and its sandbags, close to) |
| Ready-room building | 33.2 by 30.4 ft, 11 ft to the eaves, 7 ft from the blockhouse | plan derived (OSM); block walls, tar-and-gravel roof and breezeway documented (NHL nomination); height, gap, openings estimated | F16_016 |
| Shell paving | to 126 ft behind the point and 80 ft to the pad 6 side | estimated | F16_016: shell on the pad 6 side and behind; the pad 5 side is not in the photograph |
| Cable trenches | covers 3 ft wide, a walk beside; from each pad's edge to its firing room's corner | route derived for pad 5 (Figure 7-6's end on the pad; the covers surviving at the blockhouse), mirrored for pad 6; widths estimated | F16_016; the 2010 photographs |
| Pad 6 | 200 ft square, its centre 520 ft from pad 5's | derived | OSM way 195709356: 199.7 by 199.2 ft, centroid 519 ft on 025.2° |
| Pad 6 launch ring and scale plate | as pad 5's | existence documented (the museum: "A Redstone launch ring is at Pad 6. The square metal plate beneath the launch ring is the pad scale"); form estimated | a copy of pad 5's launcher |
| Pad 6 gantry | 98 ft tall, 35 ft across its legs, legs 7.2 ft square; enclosure 18 by 16 ft, 37 ft tall, its floor 47 ft up | estimated | the museum's "Redstone in square top gantry, 8 March 1961, Pad 6" (1.42 times the 69 ft missile); F19_008 |
| Gantry's place | at pad 6's south edge | estimated | where F16_017 and F19_008 have it in July 1961; on 5 May it is not recorded |
| Road between the pads | 20 ft wide, 30 to 50 ft east of the rails' centre line | derived (line: OSM way 577612542, which meets pad 5's edge there); width estimated | F16_017 |
| Turnout | both pairs curving east from 85 ft north of pad 5, radius 250 ft | estimated | F16_017, F19_008; where it led is not established and only 62° of it is modelled |
| Cable racks | 25 ft long, 15 ft high | estimated | F19_008 |
| Scaffold stair | 5 by 12 ft, six lifts of 6.5 ft | estimated | F19_008 |
| Outbuildings | hut 18.9 by 16.8 ft; hut 22.7 by 10.2 ft; generator building 22.4 by 18.1 ft; shed 26.3 by 15.8 ft | plans and places derived (OSM ways 1219671665, 1219671664, 1219671661, 1219678280); heights, roofs, openings and uses estimated | F16_016, F16_015, F16_017 |
| Vehicles | sedans 16.4 to 17.4 ft long, 6.3 ft wide | estimated | F16_016: kinds and places; makes not identified |
| Cape Canaveral Light (viewer scenery) | really 12,250 ft from pad 5 on 051.6° true; 151 ft tall, six bands, black at the foot | derived (OSM way 1219644136; Wikipedia) | the viewer draws it 1,600 ft away as a landmark: its straight shore has sea where the light stands |

## Sources

TM X-53107 sections 4.2.4, 4.8.9, 7.1 to 7.5, Figures 4-25 and 7-5 to 7-11; Hammack & Heberlig (ARS
1961) pp. 19 to 22 and Figures 22 and 23; *Results* p. 77 and Fig. 1(a); the MR-3 Postlaunch Report;
SP-45 Fig. 4-9; *This New Ocean* pp. 314 and 329; the NHL nomination 84003872 (quoting the
Corps of Engineers history); the Space Force Museum's *Noble Endeavor* and LC-26 gantry pages;
OpenStreetMap; NASA photographs S61-03158, 6100884, S61-01927, S61-02407 and S61-02408,
S63-02651, S63-22731, GPN-2000-001006, KSC-61-4457. For the rest of the complex: the NHL
nomination's item 7; the museum's *Launch Complex 26 Blockhouse*, *Launch Complex 5/6* and *Launch
Pads* pages and its dated photographs; the FHSU Project Mercury collection's July 1961 prints
F16_015, F16_016, F16_017 and F19_008; Wikimedia Commons photographs of the blockhouse (2005, 2010)
and of Complex 26's; OpenStreetMap. Details in [docs/sources.md](../../../../docs/sources.md).

## What the model gets wrong or leaves out

- **Only the structure's height and the cherry picker's reach are published.** Everything else is
  scaled off photographs or the site plan:
  - platform levels, widths and depths;
  - rail spacing;
  - truss pattern;
  - launcher size;
  - mast lengths and positions;
  - the "edge of pad" distance.
- The hatch's bearing (WNW) is inferred from the cherry picker's side in Figure 7-6 and in one
  liftoff photograph.
- The platforms are drawn as sliding apart sideways. The photographs show them parted, not how they
  moved: hinge or slide is not known.
- The LC-26 blueprint photograph shows the closed platform plan as a tapering six-sided enclosure.
  These are rectangles.
- Level 4 is a flat-roofed shelter, as the MR-3 photographs show it. TM X-53107 Figure 7-9 is a
  design drawing of a gable-roofed deflector house that does not appear in those photographs. The
  deflector plate inside is the drawing's, not measured.
- The auxiliary platform at the escape tower's base is folded into level 4. The low-level
  platform, stairs, cable boom, cable storage platform and TV cameras are left out.
- Which fin is fin II is not recorded against the vehicle model. The tail-plug housing is put
  beside the +X +Y fin. The tail-plug cover flaps (MR-2) are not modelled.
- The flame deflector's size and shape are guessed: a pyramid, from "four-sided" (SP-4204,
  secondary).
- Cable mast No. 1's form, height and place are estimated, and so is its boom at the booster.
  Which photographed pole is which mast is not established. The bungee cords are not modelled.
- The cherry picker's make is assumed from photographs. Its mast and jib lengths are chosen to
  reproduce the liftoff pose (cab on the pad on the vehicle's side), not measured. The stowed pose
  and the drive-off are not documented: the liftoff photographs show the truck still on the pad
  with its cab lowered. The mast's rams separate from their barrels when the mast is lowered.
- Ground equipment, camera towers and floodlights are placed where photographs suggest. None of
  their positions is recorded. The LOX topping trailer's position is unknown. The huts, the
  barricade and the floodlights' form are from July 1961; that they were the same in May is assumed.
- The office's windows, door and furniture are placed by eye, and so are the stairs to the base.
  The crane has no operator's cab: none shows in the photographs, and the hoist machinery is drawn
  as a closed house.
- The cabins' frames (white uprights and rails on the red panels) are a reading of the night
  photograph S61-03158, which shows framed panels; their colour is not known.
- OpenStreetMap shows water-deluge monitors and fuel-truck revetments at both pads. Their date is
  unknown and they are not modelled. KSC-61-4457 shows a fire hose played across the pad on 2 May
  1961; no hydrant, hose cart or fire truck is modelled.

The rest of the complex:

- **Paving stands a foot and a half proud.** The viewer's ground is 0.45 m under the pad's
  surface, and nothing may lie close above it. So the road, the walks and the trench covers are at
  the pad's level on concrete that goes down into the ground, and the shell paving is a low bank
  with sloped edges. In life all of it was flush with the grass.
- **Far things stand further apart.** Pad 6 and the track beyond pad 5 are seen from 100 m and
  more, where two faces a centimetre apart cannot be told apart in depth. So their rails stand
  1.8 in proud of the concrete (pad 5's: 9 mm), pad 6's burn marks and trench covers an inch
  further off its slabs, and its stain is a ring round the burn, not a disc under it.
- The blockhouse's roof is a parabola over the whole plan. The real profile, how far the slab is
  set in from the walls, and whether the walls are the same height all round are not known. The
  2005 photograph shows a lower wall across the back that is not understood and not modelled.
- Both window faces are built alike, from one photograph of each taken fifty years apart. Whether
  the shutters were open during a launch is not known; they are open.
- One leaf of the blast door stands open so that the room can be seen and entered. For a launch
  both were shut.
- Everything inside the blockhouse and the ready rooms is invented furniture in plausible places:
  no drawing or interior photograph of 1961 has been read. The second door on the pad 6 side wall
  is a plate on the wall, not an opening.
- The shell paving goes all round the blockhouse. The 1961 photograph shows lawn in front of the
  pad 6 face, with only the walk and the trench crossing it.
- Pad 6's gantry is a sketch of its type: the truss pattern, the trucks and the enclosure's
  panels are not measured, and it has no platforms inside. Its launcher is pad 5's copied, with
  the Mercury tail-plug housing a tactical Redstone's launcher did not have. Pad 6 has no cable
  masts, no painted circle and no ground equipment: none is established.
- The turnout has no frogs, blades or check rails: its rails stop short where they would cross the
  main rails at a fine angle. It ends in a timber stop after 270 ft; where it really led is not known.
  F16_017 shows a second curved track south of pad 5, which is not modelled.
- The outbuildings' uses are guesses from their roofs and from OpenStreetMap's tags. Their doors
  and windows are placed by eye.
- The cars are of no particular make. There are no people, no fire trucks, no M-113 and no
  transfer van: where those stood on 5 May is not recorded in anything read.
- No fence is modelled: none shows in the 1961 photographs. No power or telephone wires are strung
  between the poles.
- Roads are painted on the viewer's ground (`TRACKS` in `src/viewer/cape.ts`), not modelled: the
  road behind the blockhouse and the drive past its back door follow F16_016 loosely.
- The lighthouse and Missile Row stay in the viewer's scenery as impressions, not at their real
  places (see the table).
