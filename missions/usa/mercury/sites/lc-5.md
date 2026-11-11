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
| Origin | 28.439426° N, 80.573292° W (WGS 84), about 27 m below the ellipsoid (2 m above the sea) | position documented: OpenStreetMap relation 16884747, traced from imagery, a few metres; no surveyed coordinate found. Height estimated: GNIS gives 6 ft, and the sea is about 29 m below the ellipsoid here |

The same figures as typed data, with their sources, are [lc-5.ts](lc-5.ts) (`SiteDef`): the viewer's
compass and the sky over the pad are computed from it (`src/world/`), so there is no second copy
of the bearing or of the Sun's place.

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
| `ServiceStructure` | service_structure.py | base, four rail trucks, office (windowed, with a door, a desk and lockers), stairs from the pad to the base's deck, A-frame mast, platform brackets, the lift and its shaft, a railed way from the lift to every level with a ladder well in it, hammerhead crane; child nodes below |
| `CherryPicker` | cherry_picker.py | International Harvester R-series truck, glazed cab with seat, wheel, dash; child nodes below |
| `GroundEquipment` | ground_equipment.py | LOX topping unit, a second enclosure, chevron box, tripod cameras; the emergency shower on its cart, a packing case, two DANGER boards, a striped barricade, the white trailer lettered NASA SP-No 1, two huts on skids |
| `CameraTowers` | ground_equipment.py | two lattice camera towers, a ladder up each |
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

The place's own model, not any flight's: `lc5/model/1961-05.py` builds
`public/models/usa/mercury/sites/lc5/1961-05.glb` (`pnpm model:lc-5`) from `lc_5.build_place(date)`,
and a flight names it as its `surroundings`. It is scenery in the pad's frame, which the viewer
draws round the pad and does not let you pick. A later state of the place is another script beside
that one, named for its date: see "What stood when".

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
| `Vehicles` | vehicles.py | eleven parked vehicles, `Car_01` to `Car_11`, each its own node built to be driven: wheels, steering knuckles, hinged doors, bonnet and boot, a steering wheel, places to sit (see [The vehicles](#the-vehicles)): eight cars, a station wagon, a carryall, a pickup with a utility body |

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
| Vehicles | see [The vehicles](#the-vehicles) | wheelbase, length and width documented for each type; which types, and everything else, estimated | F16_016: kinds and places |

### The vehicles

Built by [tools/blender/vehicles.py](../../../../tools/blender/vehicles.py), which any site can
use; [lc5/vehicles.py](lc5/vehicles.py) chooses them and parks them. **Which vehicle is which is
an estimate**: F16_016 (July 1961, from pad 6's gantry) shows each in a few dozen pixels, and no
photograph of this parking on 5 May has been found. Wheelbase, length and width are each maker's
figures as Wikipedia's article on the model quotes them (documented); heights marked * are
estimated, as are tracks, tyres and everything about the shape. In inches.

| Node | Meant to be | Wheelbase | Length | Width | Height | What F16_016 shows there |
| --- | --- | --- | --- | --- | --- | --- |
| `Car_01` | 1957 Ford Custom 300 Fordor, green with a white roof | 116 | 203.5 | 77* | 57* | at the ready rooms' wall, a light car with canted fins over round tail lamps |
| `Car_02` | Volkswagen Type 1, 1958 to 1961, cream | 94.5 | 160.6 | 60.6 | 59.1 | beside it, a light Volkswagen: unmistakable |
| `Car_03` | 1958 to 1960 Rambler American, black with a white roof | 100 | 178.25 | 73 | 57.32 | a small, tall, dark sedan with a light roof; a Studebaker Lark would fit as well |
| `Car_04` | 1959 Chevrolet Biscayne sedan, dark blue | 119 | 210.9 | 79.6 | 56* | a long dark sedan with flat fins, farther along the drive in the photograph than here |
| `Car_05` | 1960 Chevrolet Corvair 700 sedan, white | 108 | 180 | 66.9 | 51.3* | on the drive, a low light car with a crease round its belt and no grille |
| `Car_06` | 1956 Ford Fairlane Town Sedan, white with a blue roof | 115.5 | 198.5 | 75.9 | 61.0 | next to it, a white sedan whose side strip dips in a V: a 1955 or 1956 Fairlane |
| `Car_07` | 1957 Ford Country Sedan wagon, tan | 116 | 203.5 | 77* | 59* | a mid-toned station wagon of the mid-1950s; its make is not told |
| `Car_08` | 1957 to 1960 Ford F-100, separate rear wings, white, a closed utility body on the bed | 110 | 190* | 76* | 70* | by the breezeway: white, a rounded body with a window each side and two rear doors, a round dark emblem on the cab door |
| `Car_09` | 1960 Chevrolet Suburban Carryall, white | 115 | 199.5 | 79.5 | 72* | at the hut: a light carryall with windows all round and a bonnet (so not a forward-control van) |
| `Car_10` | 1956 Ford sedan, dark green, plain | 115.5 | 198.5 | 75.9 | 61.0 | beside it, a dark car; its make is not told |
| `Car_11` | 1959 Chevrolet Biscayne sedan, white | 119 | 210.9 | 79.6 | 56* | and a white one; its make is not told |

In the photograph and not built: a small rounded import and a dark canvas-topped truck on the
drive, a second long finned sedan there, and a fourth car at the ready rooms.

**Built to be driven and got into.** Every vehicle follows one contract, set out at the head of
`tools/blender/vehicles.py`: a node with its origin on the ground under the middle of its rear
axle, facing its own +X, and under it (each name prefixed with the vehicle's, `Car_05_Door_1`):

| Node | Origin | Moves by |
| --- | --- | --- |
| `_Wheel_1`, `_2` | the rear hubs, left and right | rolling about its axle (the viewer's local Z) |
| `_Knuckle_1`, `_2` | the front kingpins | turning about the vertical, to steer |
| `_SteerWheel_1`, `_2` (under the knuckles) | the front hubs | rolling |
| `_Door_1` to `_4` | the foot of each door's hinge line, at its front edge; 1 and 2 are the front doors, left and right | `door`, `swing` ∓70° about the vertical (`axis` "y") |
| `_Bonnet`, `_Boot` | the hinge line: the bonnet's at the scuttle, the boot lid's under the back light | `hatch`, `swing` +50° and −55° about the node's Z in the viewer |
| `_SteeringWheel` | its middle, on the column | turning about the column (the node's Y in the viewer) |
| `_Seat_Driver`, `_Seat_Passenger_n` | the hips of someone sitting; a figure's axes, facing forward | `seat` |
| `_Stand_Driver` | the ground outside the driver's door, facing it | `stand` |

The vehicle's node carries `vehicle`, `wheelbase`, `track`, `wheel_radius`, `mass` and
`turning_circle` as extras, in metres and kilograms. A door takes its skin, pane, lining, handle
and (the driver's) mirror with it; behind a lid there is nothing (no engine, no boot floor). The
wagon's and the carryall's tailgates, and the pickup's utility-body doors, are not separate. The
inside is a floor, benches, a dashboard with a hooded pair of dials, three pedals, a steering
wheel on its column, a mirror and a headliner: enough to look out from the driver's seat past the
right pillars, not a likeness of any one car's cabin.

They are parked so that a walker can pass: 0.8 m and more between cars, 0.85 m between their
noses and the ready rooms' wall, and nothing in front of its door.

| Type | Track* | Mass, empty* | Turning circle* |
| --- | --- | --- | --- |
| 1957 Ford Custom 300 (wagon) | 58 in | 3,350 lb (3,600) | 41 ft |
| Volkswagen Type 1 | 51 in | 1,610 lb | 36 ft |
| Rambler American | 55 in | 2,450 lb | 36 ft |
| 1959 Chevrolet Biscayne | 60 in | 3,600 lb | 42 ft |
| 1960 Chevrolet Corvair 700 | 54 in | 2,350 lb | 39.5 ft |
| 1956 Ford Fairlane | 58 in | 3,250 lb | 41 ft |
| 1960 Chevrolet Suburban | 61 in | 3,900 lb | 44 ft |
| 1957-60 Ford F-100 (with the utility body) | 60.5 in | 3,200 lb (3,700) | 41 ft |

\* **Estimated**: typical figures for the type set down from memory and checked against no
source. The simulator must not depend on them until they are.

| Level of detail | A vehicle | All eleven | Left out |
| --- | --- | --- | --- |
| 1.0 | 8,000 to 10,100 triangles | 105,100 | nothing |
| 0.6 | 4,000 to 5,100 | 51,700 | the interior (panes become dark), shut lines, handles, plates, wipers, over-riders |
| 0.3 | 1,420 to 1,610 | 16,300 | also the bright trim, whitewalls and lamp rims; wheels have eight sides |

Every node is there at every level, with the same name.

**The cherry picker's truck against this contract** (`lc5/cherry_picker.py`): it has the origin
under the rear axle and its wheels as nodes on their hubs, the front pair steering and rolling
as one node each, and a bench and a steering wheel in its cab. It lacks the kingpin nodes,
hinged cab doors and bonnet, the steering wheel as a node of its own, seat and standing points,
pedals and instruments, and any mass or turning figure.

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
- **The far-field rule.** `check_clearance` passes faces a millimetre apart, which is enough only
  close to. Seen from 150 m with the camera near something else, parallel faces under about 5 cm
  apart cannot be told apart in depth and flicker. So anything that will be looked at from another
  pad away keeps its parallel faces 5 cm apart or more.
- **Far things stand further apart.** Pad 6 and the track beyond pad 5 are seen from 100 m and
  more, where two faces a centimetre apart cannot be told apart in depth. So their rails stand
  1.8 in proud of the concrete (pad 5's: 9 mm), pad 6's burn marks and trench covers an inch
  further off its slabs, and its stain is a ring round the burn, not a disc under it.
- The blockhouse's roof is a parabola over the whole plan. The real profile, how far the slab is
  set in from the walls, and whether the walls are the same height all round are not known. The
  2005 photograph shows a lower wall across the back that is not understood and not modelled.
- Both window faces are built alike, from one photograph of each taken fifty years apart. Whether
  the shutters were open during a launch is not known; they are open.
- The blast doors are built shut, as for a launch; the walker opens them.
- **Everything inside the blockhouse is of the period's kind, not this room's.** No drawing or
  interior photograph of this firing room in 1961 has been read. Each firing room has three
  sit-down consoles facing its windows, five racks along the wall between the rooms, a clock and a
  count board over the windows, cable trays and fluorescent fittings; the equipment room has rows
  of relay racks. The consoles' faces (meters, switches, lamps, a television monitor) and every
  legend on them (PROPULSION, PNEUMATICS, LOX LOADING, FIRING, SEQUENCE, POWER, GUIDANCE, CAPSULE,
  MEASURING, TELEMETRY, RANGE SAFETY, TIMING, INTERCOM, and the count board's "T - 00 : 55 : 00")
  are invented from the systems TM X-53107 names, on hardware built by `tools/blender/interiors.py`
  for any site. The floor's tile joints are a 2 ft grid, estimated. The viewer lights each room
  from an empty the model carries: `Light_FiringRoom5`, `Light_FiringRoom6`, `Light_EquipmentRoom`
  (properties `intensity`, and `reach` in metres). The ready rooms' furniture is still plain.
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
- **The cars are types, not the cars.** Each is built to a make and year that F16_016 suggests,
  from its published wheelbase, length and width; its shape between those figures (the heights
  of bonnet and boot, where the glass stands, the curve of the roof, the trim) is drawn from the
  look of the type, not from a drawing, and one loft with a handful of settings makes all of them,
  so a 1957 Ford and a 1959 Chevrolet differ in proportion, fins, lamps and trim and not in every
  panel. The Volkswagen's back window is the right width and too tall. Windscreens are bowed in
  plan but do not wrap round the corners as those of 1955 to 1960 did. No badges, bonnet
  ornaments, door mirrors, aerials, number plates' characters, or engines; the insides are
  benches, a dashboard and a steering wheel. Colours are guesses: the photograph is black and
  white. The emblem on the pickup's door is a plain dark disc, since it cannot be read.
- There are no people, no fire trucks, no M-113 and no transfer van: where those stood on 5 May
  is not recorded in anything read. F19_008 shows a box-bodied truck on the road beside the
  track in July, which the collection's caption calls the transfer van arriving.
- No fence is modelled: none shows in the 1961 photographs. No power or telephone wires are strung
  between the poles.
- Roads are painted on the viewer's ground (`TRACKS` in `src/viewer/cape.ts`), not modelled: the
  road behind the blockhouse and the drive past its back door follow F16_016 loosely. No road is
  drawn beyond what that photograph shows, so none leads to the other complexes.
- The base girders of the service structure and of pad 6's gantry are built-up box girders with
  flanges, web stiffeners every 4 ft and one bolted splice each; their trucks have axle caps and
  rail clamps. All of that is the ordinary practice of such steelwork (`sitelib.box_girder`,
  `axle_cap`, `rail_clamp`), not read off these structures: the photographs show the girders'
  depth and little else. No lettering or data plates are built: none can be read in a photograph.
- Every door's hardware (frame, hinges, knob or bar handle, kickplate) and the two sign plates
  ("SP-1", "READY ROOM") are estimated.
- Getting about: see "Getting about on foot" for which ways up are documented.
  - Only the hatch side's lift is built. The plans had "elevators on each side" and the
    photographs show a mesh enclosure at the base on both sides; whether both worked in 1961 is
    not established. The car has no gate and no canopy.
  - **The base is not the real one.** The July 1961 photographs (61-MR4-45, F19_004) show the
    office under the deck at pad level between the legs, corrugated, with windows and a door, and
    the deck about 8 to 9 ft up over it; a short stair on the deck between the legs up to a small
    landing whose purpose is not established; cable reels and conduit up the legs. Here the
    office stands on the deck behind the mast and none of the rest is built.
  - The platforms part for the rollback, which carries the lift's doors on levels 2 to 4 sideways
    by 4.5 ft, away from where the car stops.
  - Pad 6's gantry stood on two rubber-tyred trailers (*A Noble Endeavor* p. 10: Noble's 1958
    "Portable Guided Missile Service Structure", its mast four feet taller than pad 5's); here it
    stands on rail trucks.
- Beyond the complex: see "Beyond the complex". Every neighbouring structure is a stand-in for
  its type.
