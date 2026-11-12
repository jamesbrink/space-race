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

The pad's slider is this morning on the clock: `MORNING` in the flight's `flight.ts` holds each
instant, in seconds from liftoff, with its confidence and source, and the table is that sequence in
wall-clock time. **The count did not run straight.** After the gantry's removal at T−55 it was held
a minute at T−30 (Pad Safety clearing people from the pad), 86 minutes at T−15 (cloud, then a
booster inverter) and recycled to T−35, 17 minutes at T−15 again (an IP-709 program check) and a
minute at T−2 (a propulsion regulator's pressure). So a count time is a time before liftoff only
once the holds after it are added: what happened after T−2 is fixed by the liftoff, what happened
between T−15 and T−2 is a minute earlier than the count reads, and before the long hold only the
reports' wall-clock times (05:20, 06:37) fix anything. Every hold is from the Postlaunch Report,
section 10.2 (PLR below). Times are EST; "slider" is where the pad's slider reads at that instant.

| Time (EST) | Count | Event | Slider | Confidence | Source |
| --- | --- | --- | --- | --- | --- |
| 23:30, 4 May | T−390 | The count resumes after the planned 15-hour hold | before it | documented | PLR §10.2 |
| about 01:35 | T−265 | 10 minute hold "to complete work preparatory to making RF checks with the gantry removed": in MR-4's standard count the structure goes to the edge of the pad (T−316) and the "photo and searchlight crews" are told to clear the area (T−305). It came back afterwards; when is not recorded | before it: not shown | event documented; time derived (125 minutes of count from 23:30) | PLR §10.2; TM X-53107 p. 7-21 |
| 04:35 | | Shepard arrives at the pad | before it | documented | *Results*, p. 77 |
| 05:15 | | "Ascend gantry", by the structure's lift | before it | documented | the same; *This New Ocean*: Shepard "ascended the gantry" |
| 05:20 | | Insertion begun: into the capsule from the white room on level 3 | 0 | documented | *Results* p. 77; PLR timeline |
| about 05:55 | T−90 | Capsule hatch installed | 0 | estimated: MR-4's standard count, 35 minutes of count and the 7 minute hold before T−55 | TM X-53107 p. 7-27; PLR §10.2 |
| 06:00 | T−85 | The platforms begin to open: platforms 2, 4 and 3 (1 had opened at T−200) | 0 | estimated, the same way | TM X-53107 pp. 7-25, 7-27 to 7-28 |
| 06:02 to 06:31 | | The shower cart and the packing case wheeled off; the trailer SP-No 1 towed away; the huts dragged off on their skids (the second still going as the structure starts) | 0.01 to 0.14 | estimated: that any of them left, when and how is not recorded | see "Moving parts" |
| 06:32 | T−60 | The platforms are open | 0.125 | estimated | TM X-53107 |
| 06:37 | T−55 | "Gantry removed": the structure starts for the edge of the pad | 0.13 | documented | *Results* p. 77; PLR §7.1 ("gantry removal at −55 minutes") |
| 06:42 | | The structure stands at the edge of the pad | 0.32 | estimated: the motion's length is ours, at a walking pace | |
| 06:42:30 to 06:44:30 | | The cherry picker's cab goes to the hatch | 0.33 to 0.42 | estimated: "once the structure had gone"; the minutes are ours | TM X-53107 p. 7-29 |
| about 07:02 | T−30 | One minute's hold: Pad Safety clears "excessive personnel from the pad area" | between 0.42 and 0.48, where nothing moves | derived (25 minutes of count from 06:37) | PLR §10.2 |
| 07:13 | T−15 | 86 minute hold, weather and then an inverter change; "HOLDING: GANTRY IN" … "HOLDING: GANTRY AWAY": the structure was brought back and taken away again during it; recycled to T−35 | the same: the structure's return is **not shown** | documented | *Results* p. 77 ("0713 hold for weather") and Fig. 1(b), events 16 and 18; PLR §10.2 |
| about 09:01 to 09:18 | T−15 | 17 minute hold, an IP-709 program check | the same | derived back from the liftoff | PLR §10.2 |
| 09:24:28 | T−8:45 | The structure driven by remote control to its launch position (Hammack: T−9) | 0.48 | derived: the count time, a minute earlier for the hold at T−2 | TM X-53107 p. 7-32; Hammack p. 22 |
| 09:26:28 | | The structure stands at its launch position | 0.56 | estimated | |
| 09:30:43 | T−2:30 | The cab lowered "away and down" (TM X-53107 7.3.3.1 has T−4) | 0.58 | derived, the same way | TM X-53107 p. 7-33; Hammack |
| 09:31:43 | | The cab is down | 0.70 | estimated | |
| 09:31:13 to 09:32:13 | T−2 | One minute's hold: propulsion regulator pressure, relieved by cycling the vent valve | 0.64 to 0.705: the cab is still coming down | derived | PLR §10.2 |
| 09:33:38 | T−35 s | Capsule umbilical dropped; its mast down two seconds later | 0.72 to 0.755 | derived: nothing was held after T−2 | TM X-53107 p. 7-33 |
| 09:33:59 | ≈T−14 s | "Boom drop"; the booster's mast down two seconds later | 0.76 to 0.795 | derived | TM X-53107 p. 7-33; Hammack p. 21 |
| 09:34:13 | T−0 | Liftoff. The tail plugs pull out of the launcher as the vehicle rises | 0.8 | documented | PLR; TM X-53107 4.2.4, Fig. 4-25 |
| 09:44:13 | | The cherry picker folded down | 0.82 | estimated: when the pad was cleared afterwards is not recorded | |
| 09:47:13 to 09:47:43 | | It drives off; the pad is clear | 0.91 to 1 | estimated | |

The searchlights (see "Lights at night") are not on the slider: they are switched off by day and
stand where they are. MR-4's count shows the crews told to clear the area at T−305 and the lights
"secured" during a hold at T−30 (TM X-53107 8.3.2), which *This New Ocean* (note 63 to its account of MR-4) calls
"turning off pad-area searchlights": switching them off, not taking them away. Nothing records a
searchlight being towed off a Redstone pad, so none is.

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
| `Hardstand` | hardstand.py | 200 ft of 20 ft slabs, joints, burn and stain, painted 121 ft circle, four flat-bottomed rails let into channels with a flangeway on the gauge side, scale plate, trench covers, WNW apron and the ramp off its end, track on ballast: sleepers, tie plates, spikes, fishplated joints |
| `LaunchPedestal` | launcher.py | the launch ring, support pads and fin clamps, four legs with struts and jack feet, four-sided deflector, tail-plug housing, two ground cables: each from a plug under the ring, hanging to the slab, lying in easy curves over the rails, up into a receptacle on its junction box |
| `UmbilicalMast` | masts.py | cable mast No. 2 (the capsule's), its umbilical to the receptacle, eject line |
| `BoosterMast` | masts.py | cable mast No. 1 (the booster's), cooling package, boom and boom plug, eject line |
| `ServiceStructure` | service_structure.py | base, four rail trucks, office (windowed, with a door, a desk and lockers), stairs from the pad to the base's deck, A-frame mast, platform brackets, the lift and its shaft, a railed way from the lift to every level with a ladder well in it, hammerhead crane with red obstruction lamps at its ends; work lamps under level 1 and a room lamp in each enclosed level (see "Lights at night"); child nodes below |
| `CherryPicker` | cherry_picker.py | International Harvester R-series truck: glazed cab with a bench, pedals, handbrake, gear lever, dash and dials, the driver's door and steering wheel as nodes of their own; on the bed the hydraulic tank, gas bottles and the valve bank; at the tail the control station with its four levers (`CherryPicker_Controls`); child nodes below |
| `GroundEquipment` | ground_equipment.py | behind the launcher, two open-topped blast screens of white panels (`GroundEquipment_TankScreen`, `…_LoxScreen`: posts, capping rail, foot plates, raking struts behind; the taller with a grey switch box and three floodlights on a post), the orange tank on its two-wheeled cart behind the lower (`…_TankCart`: saddles, straps, filler, relief valve, outlet valve and gauge, hose, drawbar), the LOX topping trailer behind the taller (`…_LoxTrailer`: a white tank with dished heads on a flatbed semi-trailer, tandem, landing legs, vent stack, manway, placards, the fill and topping lines with their valves and coupling at the rear, a gauge board, the hose coiled on the deck), and the chevron drum (`…_ChevronDrum`); four 35 mm cameras on wooden tripods (`GroundEquipment_Camera1..4`); the emergency shower on its cart, a packing case, two DANGER boards, a striped barricade, the white trailer lettered NASA SP-No 1, furnished as a test trailer (racks, a bench of test sets, a desk, stools, its lights `Light_Trailer`), and the M275 tractor coupled to it, two huts on skids and the pickup chained to each, three searchlights on their trailers |
| `CameraTowers` | ground_equipment.py | two lattice camera towers, a ladder up each |
| `Floodlights` | ground_equipment.py | six timber poles in the grass at the pad's edge, a crossarm bolted through and three lamps each; close to, the ground wire stapled down to its rod, a number tag at eye height, the conduit and switch box |

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
| `CherryPicker_Controls_Mast`, `_Jib`, `_Cab`, `_Outriggers` | `CherryPicker_Controls` | each lever's pivot, (63.15, 1.6 to 2.8, 4.45), at the tail on the driver's side | swings about the node's Z (extras `lever`, `function`, `swing` 25, `axis` "z") | 25° either way, springing back to the middle | while the function it names is worked by hand (types.ts: `Function.lever`) | a station at the rear of the truck: documented (TM X-53107 7.3.3.1: "the controls ... at the rear of the transporter"); four levers, their order and which worked what: estimated |
| `CherryPicker_Door_1` | `CherryPicker` | the driver's door's front edge at its foot, truck (15.45, 3.2, 3.6) | `door`, `swing` −70° about the vertical | 70° | opened on foot | estimated |
| `GroundEquipment_Shower`, `GroundEquipment_Case` | `GroundEquipment` | their middles on the pad | slide | up the road toward pad 6, about 150 ft | 0.02 to 0.11 and 0.03 to 0.12 (06:03 to 06:31) | estimated throughout: nothing records that they left, or when |
| `GroundEquipment_TractorBay` | `GroundEquipment` | (34, 71.33, 0), turned −90° about Z, so that its +X is the trailer's way ahead (−Y) | none: the frame the tractor drives in | — | — | — |
| `GroundEquipment_Tractor`, with `…_Wheel_1..4` (the tandem), `…_Knuckle_1,2`, `…_SteerWheel_1,2`, doors and seats to the vehicle contract | `GroundEquipment_TractorBay` | the ground under the middle of its tandem, 4 in behind the kingpin: (34, 71.33, 0) | drives: starts straight ahead (−Y), eases 12 ft to its left (+X) over the first 40 m, clear of the structure's stair, then straight on | 82.6 m (271 ft) | 0.01 to 0.12 (06:02 to 06:31) | estimated throughout: no photograph shows what moved the trailer, or that it left |
| `GroundEquipment_Trailer` (wheels `…_Trailer_Wheel_1..4` on their hubs, axle along X) | `GroundEquipment` | the middle of its bogie on the ground (34, 92.45, 0); kingpin 21.45 ft (6.538 m) ahead | drives behind the tractor: its bogie's route is the tractor's worked through as a trailer follows one (always heading for the kingpin: a tractrix), so the two stay coupled | the same | the same | the same. Coupling checked in the browser at 10 points along the slider: kingpin to fifth wheel 1.9 cm at worst, both ending square |
| `GroundEquipment_Hut1`, `_Hut2` | `GroundEquipment` | their middles | slide out along +X (viewer +X) on their skids | 72 m | 0.03 to 0.11 and 0.06 to 0.14 (06:07 to 06:37: the second is still going as the structure starts) | estimated: nothing records how the huts were moved, or that they were |
| `GroundEquipment_Tow1`, `_Tow2` (to the vehicle contract) | `GroundEquipment` | under the rear axle, (104.5, 29.5, 0) and (104.5, 44.5, 0), facing +X | drives straight ahead with its hut on a chain behind it | 72 m | with its hut | estimated: a half-ton pickup is the least that could drag a hut; its make is from no photograph |
| `GroundEquipment_Barricade`, `GroundEquipment_Searchlight1..3` | `GroundEquipment` | their middles; a searchlight's at its yoke's foot | none | — | — | their own nodes so that they can be taken away. The searchlights stay: see "Where things stood" and "Lights at night" |

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
| Rail section | flat-bottomed, a 100 lb ASCE section's proportions: 5 3/4 in high, foot 5 3/4 in, head 2 3/4 in, web 9/16 in (`sitelib.rail`) | estimated: a common section of the period, set down from memory; what rail was laid here is not recorded | — |
| Rails across the pad | heads 9 mm proud of the slabs, in a channel: a quarter inch on the outer side, a 1 7/8 in flangeway on the gauge side, 1.4 in deep | estimated: the usual way a rail is let into concrete | 6100884 shows the rails flush, not how |
| Track off the pad | sleepers 8.5 ft by 9 in by 6 in, 2 ft apart; plates 13 by 7 3/4 by 5/8 in, two spikes each, diagonally; fishplates 24 in, four bolts, every 39 ft | estimated: ordinary practice | — |
| Turnout | switch points 15 ft, the open one 4 3/4 in off its stock rail (set for the main line), two rods, a ground throw with a red target; the frog where the curve's outer rail crosses the main line at 11.1° (about a No. 5), its casting 10 ft long, flangeways 1 7/8 in; guard rails 11 ft opposite it; crossing frogs at 21° to 26° | estimated: the ordinary parts of a turnout and a crossing; the angles derived from the estimated radius and gauge | F16_017, F19_008 show that the turnout was there |
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
| Apron ramp | 14 ft long, down to the road | estimated | the model's pad stands 0.12 m above the viewer's ground |
| Emergency shower | 3.2 ft square, 8.6 ft tall, on a cart | estimated (that it stood at the pad's edge: documented) | GPN-2000-001006 (MR-3, cherry picker at the capsule); KSC-61-4457 (2 May 1961) |
| Trailer "NASA SP-No 1" | 29 by 8 ft, 12.4 ft to its roof | estimated (its lettering and that it stood by the structure's base: documented) | S61-03158 |
| Pad huts | 10.5 by 11 ft and 9 by 9 ft, 9 ft tall | estimated | FHSU F16_017 (July 1961): two huts at the hatch side's edge |
| Tractor | an Army 2-1/2-ton 6x6 truck tractor (M275, `vehicles.m275_tractor("olive")`): fifth wheel's plate 52 in up, kingpin 4 in ahead of the middle of the tandem; the trailer's front floor steps up over it to 4.55 ft | see "What towed the trailers: the record" for which figures are documented | FHSU 544: a dark one of the family coupled to SP No 1; that it towed SP-1 off that morning, and its colour, are estimated |
| Pickups that drag the huts | 1957 to 1960 Ford F-100, white, no utility body: wheelbase 110 in (2.794 m), tyre radius 0.361 m; a chain to each hut's skids | wheelbase documented (see "The vehicles"); the rest estimated | no photograph shows how the huts were moved |
| Searchlights | three 60-inch drums on yokes on four-wheeled trailers, 8 by 4.8 ft beds, drawn olive; lens 5 ft across; 800 million candela in a beam 1.25° wide (lens extras `candela`, `spread`) | that searchlights and their crews worked the pad at night: documented (TM X-53107 p. 7-21 and 8.3.2; *This New Ocean*); the kind, the number, the places and the beam: estimated. The candela and beam are a figure for the type set down from memory and checked against no source | S61-03158 (MR-3 lit hard from the blockhouse side); FHSU F19_001 (MR-4: two sources at the pad's far edge); F19_008 (a large drum on a four-wheeled trailer) |
| Cherry picker's control station | a grey box at the tail, 2.2 ft wide, on the driver's side; four levers 0.5 ft long, 0.4 ft apart, with a legend plate under each | estimated (that the controls were at the rear: documented, TM X-53107 7.3.3.1) | not in any photograph read |
| Office on the structure's base | 14.8 by 13.5 ft, 8.6 ft tall; windows 3.2 ft square and 6 by 3.2 ft; a desk with chair and telephone, three lockers, a filing cabinet, an intercom panel by the door, a clock | estimated | S61-03158 shows a lit room between the legs; its windows are placed by eye; its furniture is of the period's kind (tools/blender/interiors.py) |
| Ground cables | 3.6 in across, two, from plugs under the ring to junction boxes 37 and 59 ft out | estimated | S61-02408 shows heavy cables lying slack on the slab; their routes and connectors are not recorded |
| Engineering cameras on tripods | four, a 35 mm body with twin drum magazine, turret lens, motor and finder on a geared head, 4.4 ft up on a wooden tripod with a spreader | estimated: of the kind (Mitchell, Photo-Sonics), not any one camera | TM X-53107 7.5.5.3: twenty fixed cameras near the pad; S61-01927 shows tripod cameras |
| Lower blast screen | a face 11 ft long toward the launcher and a return of 7 ft at each end, 4.6 ft high, white, open above and behind | that it stood, its colour, its outline and its panel joints: documented (photographs). Sizes estimated: scaled against the booster's 70 in body, allowing for its standing further from the camera; posts, feet and struts estimated | S61-02407 (ignition), S61-01927, S61-02408; S63-02651 (July) |
| Orange tank behind it | 3 ft across, 6.4 ft long, lying on a two-wheeled cart, its top just over the screen | that an orange tank with dished ends lay there: documented (photographs). Size estimated; what it held is not recorded; the cart and every fitting estimated | the same |
| Taller blast screen | a face 16 ft long, returns of 6 ft, 7.5 ft high; a grey switch box 1.6 by 2 ft on its face with a conduit to the pad; three floodlights on a post over its top | the screen, the box and the three lamps: documented (photographs); sizes estimated as above | the same |
| LOX topping trailer | a white tank 5 ft across and 21 ft long with dished heads, on a deck 4.6 ft up and 26 ft long, its top 10.2 ft up | that a long white tank on a trailer stood behind the taller screen, a placard on its side: documented (photographs). That it is the LOX topping trailer of the count is our reading (estimated); sizes estimated; the tandem, legs, vent, valves, gauge board and hose are the ordinary fittings of such a trailer, from no photograph | the same; TM X-53107's count (T−60 s "LOX topping Off"; the trailers secured after launch) |
| Chevron drum | 9.2 ft across, 3.9 ft high, black with twelve orange chevrons | that it stood near the launcher and its colours: documented (photographs); that it is round is our reading of its curved edges in S63-02651; size estimated; what it was for is not known | S61-01927; S63-02651 |
| Stairs to the base's deck | 3 ft wide, 14 risers of 7.5 in | estimated | GPN-2000-001006 shows a flight at the base; its place on the base is not established |

## Lights at night

MR-3's count ran through the night: Shepard went up at 05:15 and the Sun rose at about 06:30. The
viewer lights the scene after dark from what the models carry (`src/viewer/lamps.ts`): every lens of
material `lamp` (or `lamp-flood…`) becomes a light, the lenses of one fitting one spotlight; a lens
whose node carries `candela` and `spread` (degrees, the whole beam) is a searchlight, a narrow
strong cone; and an empty named `Light_<room>`, carrying `intensity` and `reach` (metres), lights a
room, the three nearest the eye at a time. Fittings of `lamp-room` (a room's own fitting, under its
`Light_`) and `lamp-red` (obstruction lamps) glow and light nothing themselves.

| What | Where, and what the model carries | Confidence | Source |
| --- | --- | --- | --- |
| Floodlight poles | six round the pad (`Floodlights`), three `lamp` heads on each crossarm aimed at the vehicle; four at pad 6 and a two-headed pole by the hut (the pole line along the road carries wires, not lamps) | form estimated, from July | FHSU F16_015, F16_017 |
| Searchlights | `GroundEquipment_Searchlight1` at (72, −82) ft, on the blockhouse side; `_Searchlight2` and `_3` at (−86, −30) and (−84, 45) ft, across the pad; each aimed at the vehicle's middle 45 ft up; lens `lamp-flood-search` with `candela` 8×10⁸ and `spread` 1.25 | that crewed searchlights lit the pad at night: documented. Kind, number, places, aim and beam: estimated | TM X-53107 p. 7-21 ("photo and searchlight crews to clear area") and 8.3.2 (MR-4: the searchlights secured at T−30 "because of interference with telemetry"); S61-03158, FHSU F19_001 and F19_008 |
| Work lamps under level 1 | seven deep dome reflectors hung 1.7 ft under level 1, three under each half (they part with it) and one between the legs behind the vehicle, shining down on the booster | that lamps hung there: documented in the night photographs; number and places estimated | S61-03158, KSC-61-4457; FHSU F20_010 to F20_014 (MR-4) |
| The structure's rooms | `Light_Office` (0.6, 4 m); `Light_Level2Left`, `…Right` (the cabins), `Light_Level3Left`, `…Right` (the white room), `Light_Level4Left`, `…Right` (0.7, 5 m); each under a `lamp-room` fitting | lit windows: documented (S61-03158); fitting and place estimated | TM X-53107 7.5.1.8: "Additional lights were provided in the shelter house and on the structure level" |
| Blockhouse | `Light_FiringRoom5`, `Light_FiringRoom6` (1.2, 10 m), `Light_EquipmentRoom` (1.0, 9 m) among fluorescent fittings; five floodlights on its walls, three on the ready rooms' | estimated: no night view of either building is known | |
| Ready rooms, outbuildings | `Light_ReadyRoom`, `Light_Kitchen` (0.9, 7 m); `Light_Generators` (0.6, 5 m); the two huts and the shed are not gone into and have no light | estimated | |
| Obstruction lamps | four red at the corners of the crane's walkway, 135 ft up; two at the ends of pad 6's gantry top | estimated: the usual practice for a structure that tall; no photograph shows them or their colour | |

The lights are on whenever the Sun is down, whatever the hour: nothing switches the searchlights
off at a time in the count (for MR-3 it is not recorded; MR-4's were switched off at T−30).

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
| `Blockhouse` | blockhouse.py | the arrow-shaped bunker: 2 ft walls round six panes of foot-thick glass with steel shutters, the blast door (one leaf open) and its ramp, two firing rooms with consoles and an equipment room, the domed roof and what stood on it (railed antenna stand, whip, wind vane, the telemetry helix and its mesh reflector on a sandbagged tripod), wall floodlights, the roof ladder; round it the shell paving, the concrete walk, a tracking dish (a smooth paraboloid of mesh with its rolled rim, ribs, the feed on three struts, on a turntable and yoke), the drive's banded posts |
| `ReadyRoom` | blockhouse.py | the concrete-block ready-room building: pilasters, windows, two doors, a louvred vent, tar roof, the breezeway roof across to the blockhouse, the air handler between them; a table, benches, lockers and a kitchen counter inside |
| `Pad6` | pad6.py | pad 6's 200 ft of slabs, scale plate, burn marks, trench covers, four floodlight poles |
| `Pad6Launcher` | launcher.py | a second launch ring, the same as pad 5's |
| `Pad6Gantry` | pad6.py | the square-topped portal gantry: two lattice legs on rail trucks, the truss across the top with its hoist, the three-storey work enclosure and the railed deck under it |
| `Track` | grounds.py | the four rails on from pad 5's track through pad 6 and 180 ft beyond, ballast, sleepers, plates and spikes, the concrete laid in the track by pad 6; the turnout curving east: for each pair switch points with their rods and a ground throw, a cast frog with its wings and two guard rails, long sleepers and slide plates; and four crossing frogs where the +X pair's curve crosses the −X pair |
| `Road` | grounds.py | the concrete road between the pads, NO SMOKING painted across it |
| `CableTrenches` | grounds.py | the covered trench and its walk from each pad to its firing room |
| `Yard` | grounds.py | two cable racks and the scaffold stair tower north of pad 5 |
| `Poles` | grounds.py | the pole line along the road behind the blockhouse; a floodlight pole by the hut |
| `Outbuildings` | outbuildings.py | the hut behind the blockhouse and its fenced transformers, the hut by the road (both with their doors built shut and their windows dark, as the shed's are: what they held is not recorded, so no inside is offered), the generator building with two diesel sets and a transfer panel inside, its fuel tank (dished heads, saddles on piers, straps, fill, vent, gauge, the line to the building), the shed by the track |
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
| `Car_08` | 1957 to 1960 Ford F-100, separate rear wings, white, a closed utility body on the bed | 110 | 190* | 76* | 73* | by the breezeway: white, a rounded body with a window each side and two rear doors, a round dark emblem on the cab door |
| `Car_09` | 1960 Chevrolet Suburban Carryall, white | 115 | 199.5 | 79.5 | 72* | at the hut: a light carryall with windows all round and a bonnet (so not a forward-control van) |
| `Car_10` | 1956 Ford sedan, dark green, plain | 115.5 | 198.5 | 75.9 | 61.0 | beside it, a dark car; its make is not told |
| `Car_11` | 1959 Chevrolet Biscayne sedan, white | 119 | 210.9 | 79.6 | 56* | and a white one; its make is not told |

In the photograph and not built: a small rounded import and a dark canvas-topped truck on the
drive, a second long finned sedan there, and a fourth car at the ready rooms.

**The shapes were checked against photographs** of each type side on and from the front and rear
three-quarters (Wikimedia Commons; the files are listed in [docs/sources.md](../../../../docs/sources.md)),
as the Volkswagen's had been. What changed (every figure here estimated, read by eye off the
photographs against the documented wheelbase): the sedans' glass and roofs were moved forward and
lengthened, the windscreen's posts standing 23 to 40 in behind the front axle and the roofs running
back over the rear axle (the 1957 Ford's and the 1959 Chevrolet's back lights wrap round behind a
C post, so a third post and a pane behind it stand for that); the 1957 Ford's side strip drops at
the rear door and its wagon has the sedan's canted fins; the Rambler's nose was shortened to 27.5
in (its rear overhang is 1.85 times its front in the photograph), its belt lowered 3 in under
deeper glass, and its tail lamps stand upright in the tops of the rear wings; the Fairlane's rear
doors are cut round the wheel openings back to the C post and its strip's V moved back to the front
door's trailing edge; the Corvair's glass stands 14 in further forward, with nothing ahead of it but
the luggage; the Suburban's sides are near upright and its windscreen stands up; the F-100's cab was
lengthened (its back 42 in ahead of the rear axle, the windscreen's foot 26 in behind the front one),
raised to 73 in, its hood and wings made one flat top, and a step put between the cab and the rear
wing. Not matched: the fronts' and tails' detail (grilles, the 1959 Chevrolet's spread fins and the
Suburban's pods over its head lamps are suggested, not shaped), wrapped glass (flat panes between
posts), and every badge.

**Built to be driven and got into.** Every vehicle follows one contract, set out at the head of
`tools/blender/vehicles.py`: a node with its origin on the ground under the middle of its rear
axle, facing its own +X, and under it (each name prefixed with the vehicle's, `Car_05_Door_1`):

| Node | Origin | Moves by |
| --- | --- | --- |
| `_Wheel_1`, `_2` | the rear hubs, left and right; on a tandem, the forward rear axle's, with `_3`, `_4` the one behind | rolling about its axle (the viewer's local Z) |
| `_Knuckle_1`, `_2` | the front kingpins | turning about the vertical, to steer |
| `_SteerWheel_1`, `_2` (under the knuckles) | the front hubs | rolling |
| `_Door_1` to `_4` | the foot of each door's hinge line, at its front edge; 1 and 2 are the front doors, left and right | `door`, `swing` ∓70° about the vertical (`axis` "y") |
| `_Bonnet`, `_Boot` | the hinge line: the bonnet's at the scuttle, the boot lid's under the back light | `hatch`, `swing` +50° and −55° about the node's Z in the viewer |
| `_Tailgate` (the wagon and the carryall) | its foot, across the car just over the rear bumper | `hatch`, `swing` +90°: it falls open to lie level |
| `_SteeringWheel` | its middle, on the column | turning about the column (the node's Y in the viewer) |
| `_Seat_Driver`, `_Seat_Passenger_n` | the hips of someone sitting; a figure's axes, facing forward | `seat` |
| `_Stand_Driver` | the ground outside the driver's door, facing it | `stand` |

The vehicle's node carries `vehicle`, `wheelbase`, `track`, `wheel_radius`, `mass` and
`turning_circle` as extras, in metres and kilograms. A door takes its skin, pane, lining, handle
and (the driver's) mirror with it, and is closed along its edges and its foot; where no other door
meets it the body has a jamb (and under every door a sill), so an open door shows a frame and not
the inside of the body. Every lid has an underside and closed edges. Under each lid, at detail 0.75
and above, a compartment closed so nothing of the body's inside shows: walls that slope from the
lid's edge out to the wheels' wells, a floor, a gutter from each wall's head to under the skin. In
an engine's (the bonnet's, or the boot lid's on the Corvair and the Volkswagen) a block with two
heads, an air cleaner, a radiator with a fan and a battery (a low flat block with a fan's housing
behind); in a boot (the front one on the Corvair) a floor and the spare wheel lying flat. The
Volkswagen's front compartment is too narrow in this model for its spare, which is left out. The
wagon's and the carryall's tailgates are the middle of the back panel from over the bumper to the
belt (the lamps stay on the body); behind them the load floor runs to the tail, stepping up over
the rear overhang. The pickup's utility-body doors are not separate. The inside is a floor,
shaped benches, door linings with an arm rest and a window winder, a dashboard with a hooded pair
of dials, a glovebox lid and a radio, three pedals, a steering wheel with a horn ring on its
column, a mirror and a headliner: enough to look out from the driver's seat past the right
pillars, not a likeness of any one car's cabin. Where a driver sits is estimated, to fit a tall
figure (1.89 m in a helmet: 0.91 m from the hip to the helmet's top): the hip point stands 10.5 in
over the floor in a car and 12.5 to 13 in a truck, lowered where needed to leave 35 in of head
room under the headliner (to 6 in over the floor at least; the Corvair, 51 in high, keeps 33.8),
and the steering wheel stands 15.5 to 19 in ahead of the hip and 15 in over it, its rim's lowest
point 3 to 5 in over the thighs. Head room as built: the cars 33.8 to 37.6 in, the Suburban 41,
the F-100 40, the M275 40.5. Real cabins of the period gave about as much; no maker's interior
drawing was read. None of what is under the lids is from any record:
it is there so that an open lid shows something of the right size where the engine or the spare
was.

`lc5/vehicles.py`'s `check_standing()`, run once the site is built, drops a ray from every wheel
and reports any tyre more than 5 mm off the paving or the terrain under it (the place's build runs it); on this site it
reports none (the shell apron at −0.6 ft for eight vehicles, the terrain at −0.12 m for the three
at the hut).

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

| Level of detail | A vehicle | All eleven | Meshes (draw calls), all eleven | Left out |
| --- | --- | --- | --- | --- |
| 1.0 | 14,500 to 18,900 triangles | 184,000 | 510 | nothing |
| 0.6 | 5,100 to 6,200 | 63,000 | 314 | the interior and what is under the lids (panes become dark), shut lines, handles, plates, wipers, over-riders |
| 0.3 | 1,620 to 1,760 | 18,700 | 253 | also the bright trim, whitewalls and lamp rims; wheels have eight sides |

Every node is there at every level, with the same name. A node's pieces of one material are one
mesh (one draw call), and materials too alike to tell apart are built as one (`SAME` in
vehicles.py: the shut lines are the wells' black, the radiator the chassis'); below 0.75 a lid's
underside is its paint. Before this the eleven were 590, 363 and 255 meshes, with nothing under
the lids.

**What towed the trailers: the record.** FHSU Project Mercury items 263, 265 and 407 (prints of
July 1961, their backs captioned "CCMTA, NASA/MERCURY, Pad 5 / Transfer van arrives at Pad 5",
lab numbers LOD 61-6234 and 61-6218) show the van semi-trailer lettered NASA TV No 1 towed by a
white **2-1/2-ton 6x6 truck tractor of the Army's G742 family**: soft-top two-seat cab, split
windscreen, upright grille bars with guards over the head lamps, tandem behind; its doors lettered
NATIONAL AERONAUTICS AND SPACE ADMINISTRATION, U.S.A.F. and a registration on the hood, plate
U.S. GOVERNMENT NA-8561. Item 544 (MR-4's preparation, July 1961) shows the trailer NASA SP No 1
coupled to a dark tractor with the same cab. That these are G742 trucks is read off the photographs
(firm); that they are the M275 and not the longer M48 is estimated from the short gap between the
cab and the tandem. Nothing found names what towed the Redstone's trailer (the boosters came by
air), and no photograph of 5 May 1961 shows a tractor at all: that the same trucks served MR-3 is
an inference. The pad's script tows with it; the invented Ford F-600 it replaced is gone.

`vehicles.m275_tractor()` builds it to the contract above, its origin under the middle of the
tandem (what a tandem turns about), its rear wheels `_Wheel_1` to `_4`, duals:

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Wheelbase | 142 in, front axle to the tandem's middle | documented | TM 55-2320-209-15-1, Figure 2-27 (drawn for the M275A2) |
| Tandem | axles 48 in apart | documented | the same |
| Bumper to front axle | 38 in (without a winch) | documented | the same |
| Length, width | 228 in, 93 in | documented | the same, Table 2-1 (the M275's own row) |
| Height | 99.5 in over the cab's top | documented | Figure 2-27; the exhaust stack stands 7 in above it, estimated |
| Track | 70 in, the rear | documented | Figure 2-28; the front taken as the same, estimated |
| Fifth wheel | 52 in high, the kingpin 4 in ahead of the tandem's middle | documented | Figure 2-27 |
| Mass | 11,179 lb | documented | Table 2-1 ("weight", taken as empty) |
| Tyres | 9.00-20, duals on the tandem; 40.4 in across | size documented for the family (Wikipedia, M35), duals Figure 2-28; diameter estimated |
| Turning circle | 72 ft | estimated | not found |
| Shape | cab, hood, wings, grille, steps, tank, spare, stack, cab interior | estimated | the drawings and photographs, by eye |

Not modelled on it: the lettering, plate and registration, the brush guard's mesh (bars only),
the air horn and the box on the cab's roof in the photographs, the fold-down windscreen's hinges,
the cab's back window, the tread of the tyres.

**The cherry picker's truck against this contract** (`lc5/cherry_picker.py`): it has the origin
under the rear axle and its wheels as nodes on their hubs, the front pair steering and rolling
as one node each; the driver's door (`CherryPicker_Door_1`, marked `door`, `swing` −70°), the
steering wheel (`CherryPicker_SteeringWheel`, on its column) and the points `CherryPicker_Seat_Driver`
(turned so a figure faces forward) and `CherryPicker_Stand_Driver` as nodes named to the contract;
a bench, three pedals, a handbrake, a gear lever and a dash with three dials in its cab. It lacks
the kingpin nodes, a passenger door and bonnet that open, the `vehicle`, `seat`, `stand` and
`steering` marks, and any mass or turning figure, so it is not offered for driving: its drive-off
is the script's (`moves`). Its door is opened on foot (the part's `driver-door` action). The tower's
own controls are the four levers at the tail (see "Moving parts"), each marked `lever` with the
`function` it works, for a flight's `Part.functions` to name.

## How far things are from pad 5

Checked against the sources, from the launcher's centre. The buildings are where OpenStreetMap
maps the ones that survive, to within its own error (a few feet): the complex really is this
tight, with the blockhouse's point 305 ft from each pad. What the record leaves free is listed last.

| Thing | In the model | In the source | Off by | Confidence |
| --- | --- | --- | --- | --- |
| Blockhouse, its point | 305 ft on 354° | 305 ft on 354° (OSM way 195709358) | 0 ft | derived |
| Ready rooms, centre | 383 ft on 348° | 383 ft on 348° (the same outline's north part) | 1 ft | derived |
| Generator building | 172 ft on 333° | 172 ft on 333° (OSM way 1219671661) | 0 ft | derived |
| Shed by the track | 267 ft on 014° | 267 ft on 014° (OSM way 1219678280) | 0 ft | derived |
| Hut behind the blockhouse | 312 ft on 335° | 312 ft on 335° (OSM way 1219671665) | 0 ft | derived |
| Hut by the road | 345 ft on 323° | 346 ft on 323° (OSM way 1219671664) | 0 ft | derived |
| Pad 6, centre | 520 ft on 025.0° | 519 ft on 025.3° (OSM way 195709356); 520 ft (TM X-53107 Fig. 7-6, 408 px) | 2 ft | derived |
| Road between the pads | its near edge 30 ft east of the rails' centre line | OSM way 577612542 meets pad 5's north edge 32 ft east of it | 2 ft | derived |
| Cherry picker's tail | 64 ft on 295° | 65 ft (*This New Ocean* p. 329); about 64 ft (Fig. 7-6) | 1 ft | documented |

Placed by eye from an oblique photograph, with no scale but the things round them: each of these
could be 20 to 40 ft from where it really stood, and nothing in the record would say so.

| Thing | In the model | Read from |
| --- | --- | --- |
| Pad 6's gantry | 442 ft on 025°, at pad 6's south edge | F16_017, F19_008 (July 1961) |
| Cable racks | 174 ft on 057° | F16_017, F19_008 |
| Scaffold stair | 203 ft on 072° | F19_008 |
| Shower cart | 108 ft on 058°, at the pad's north edge | GPN-2000-001006 |
| Two huts on the pad | 99 ft on 274°, at the hatch side's edge | F16_017 |
| Trailer NASA SP-No 1 | 89 ft on 228° | S61-03158 |
| Cars at the ready rooms | 403 ft on 350° | F16_016 |
| Pole line | 420 ft on 326° at its nearest, along the road behind the blockhouse | F16_016 |
| The two blast screens with their tanks | 52 to 72 ft out on the side away from the hatch (model −X), 2 to 50 ft toward the structure's parking place (+Y) | estimated from S61-02407 and S61-01927 (oblique, from the hatch side: both stand behind the launcher and to its right, the pad's edge just beyond them) and from 6100884 and S61-01928 (along the rails: neither is within about 45 ft of the track) |
| Chevron drum, tripods, camera towers, floodlight poles | on the hardstand, 20 to 110 ft out | the liftoff photographs; none of their positions is recorded |

## What stood when

A builder asks `sitelib.stood(thing, since=, until=, confidence=, source=)` before building anything
that was not always there; a state script (`lc5/model/<date>.py`) or a flight's pad script names
its date, and what did not stand then is left out. Each build prints what it asked and what it
built. Mercury-Redstone 4 (21 July 1961) needs a `1961-07.py` naming its date, and whatever is then
known to have changed.

| Thing | From | Until | Confidence | Source |
| --- | --- | --- | --- | --- |
| Blockhouse and ready rooms | 1955 | standing today | documented | NHL nomination: built 1955 |
| Pad 6 | 1955 | the slab is there today | documented | the museum: first launch 20 April 1955, last 27 June 1961 |
| Pad 6's square-topped gantry | 1959 | not known | estimated | on pad 6 in 1959 (*A Noble Endeavor* p. 10), on 8 March 1961 (the museum) and in July 1961 (F19_008); where on the track it stood on a given day is not recorded |
| Cable racks and scaffold stair north of pad 5 | not known | not known | estimated | seen July 1961 (F16_017, F19_008): assumed for May |
| Cars at the blockhouse | not known | not known | estimated | July's cars in July's places (F16_016): assumed for May, which is certainly wrong car for car |
| Mobile aerial tower (cherry picker) | 24 October 1960 | not known | documented | SP-4001 |
| White room on level 3 | February 1961 | not known | documented | TM X-53107 7.5.1.2: built February to May 1961. Before it, level 3 was an open platform, which is not built |
| Emergency shower on its cart | 2 May 1961 | not known | documented | KSC-61-4457; not looked for in MR-4's photographs |
| Blast screens, the orange tank, the long white tank on its trailer, the chevron drum | May 1961 (seen 5 May) | not known; still there in July 1961 | documented | S61-02407, S61-01927, S61-02408; S63-02651 |
| Trailer NASA SP-No 1 | May 1961 | not known | documented | S61-03158; a white NASA trailer stands beside the structure in July too (F16_017) |
| Two huts at the pad's hatch-side edge | not known | not known | estimated | seen July 1961 (F16_017): assumed for May |
| Searchlights round pad 5 | May 1961 | not known | estimated | that searchlights worked the pad at night: TM X-53107 p. 7-21 (MR-4's count), 8.3.2; MR-3's night photograph S61-03158 shows the pad lit hard from the blockhouse side |
| The M275 tractor at the trailer, the pickups at the huts | not known | not known | estimated | the tractor's kind is photographed coupled to SP No 1 (FHSU 544, July 1961; see "What towed the trailers"); that it stood there in May, and the pickups, are not |

Not dated because nothing is known to have changed between May and July 1961: the hardstand, the
launcher, the masts, the service structure, the track, the road, the cable trenches, the
outbuildings, the pole line. Also seen only in July and assumed for May, without their own entry:
the roof's telemetry helix (F16_015), the striped barricade, the floodlights' timber poles.

Known to differ for MR-4 and not yet built: pad 6 had flown its last Redstone (27 June), so its
gantry need not be at the pad; the transfer van and a second white trailer stood on pad 5
(F19_008, F16_017).

## Getting about on foot

The viewer's walker is 0.26 m in radius and 1.89 m tall, steps up 0.3 m, climbs any mesh marked
`climb`, opens any node marked `door` and rides any node marked `lift` (the three marks are set by
`tools/blender/sitelib.py`, which documents them; they travel as glTF extras). So everything a
person could go up has a continuous way from the ground to its top. Where the record shows how
people went up, that is what is built; where it does not, the usual arrangement for that kind of
structure is built and labelled estimated.

| Structure | Way up, from the ground | Basis |
| --- | --- | --- |
| Service structure: the lift | **an open cage of mesh panels**, boarded from the pad by two steps on the hatch side, outboard of the base. It rides the outboard face of that side's leg (`ServiceStructure_Lift`, origin at its floor's middle, built at the pad). Stops: the pad, levels 1 to 4, and the landing under the crane, at 0, 13.19, 15.84, 18.98, 22.55 and 33.44 m above the pad stop, each 0.2 to 0.7 m further in than the last as the leg leans | **documented**: that there were lifts ("elevators on each side", Noble's plans; "Elevators traveled up and down the mast, with stops at various work-levels, to a 15-ton hammerhead crane", Corps of Engineers history, both in *A Noble Endeavor*); that Shepard used one (NASA caption 71P-0270: "makes his way from the elevator to the cleanroom"; *Results* p. 77: "0515 ascend gantry"); the car, its mesh, its canopy and that it was boarded from the pad (FHSU F19_051, MR-4's egress exercise; NASA 61-MR4-45). **Estimated**: that it rode the leg's face (no photograph shows its guides), its size (4 by 2.9 by 7.2 ft), where it stopped, which side Shepard rode |
| …from the lift into each level | level 1: straight on to the open deck. Levels 2, 3 (the white room) and 4: a door in the level's back wall where the car stops (`…Platform2_Right_LiftDoor`, `…Platform3_Right_LiftDoor`, `…Platform4_Right_LiftDoor`), opening inward | GPN-2000-001012 shows Shepard stepping through a narrow doorway into the white room: documented that there was one; its place estimated |
| …between the two halves of a level | a deck between the legs behind the vehicle, at every level | at level 1: documented (a catwalk with chain rails joins the halves; the 21 April egress-test photograph, 61-MR4-65). At the other levels: estimated |
| …to the base's deck | stairs from the pad at the outboard end of the base on the hatch side, descending away from the vehicle: 17 risers of 7.1 in, going 11 in, 3 ft between the rails | documented (61-MR4-45; FHSU F19_004) |
| …up without the lift | **ladders up the hatch side's leg in stages**, each run from one small railed landing behind the leg to the next: base deck to level 1 (36 ft), then to levels 2, 3, 4 and the landing under the crane at 112 ft | ladders in stages on the legs' outboard and rear faces with small landings: documented (F19_004, 61-MR4-45: an uncaged ladder from the deck to the lowest platform). Which face, the landings' sizes and that they stand at the levels: estimated. The real top run had safety hoops; none is built |
| …to the crane's walkway | from the landing under the crane, a ladder beside the crane's girder, 20 ft | a hooped ladder up the head of the mast: documented (the egress-test photograph; F16_015). Its place: estimated |
| …into level 2's cabins | a door in each cabin's inner wall (`…Platform2_Left_Door`, `…_Right_Door`) | estimated |
| …into the office | its door (`ServiceStructure_OfficeDoor`), from the deck between the legs | estimated: see "What the model gets wrong" for where the office really was |
| Camera towers | a ladder up the face toward the launcher, ground to the top deck | estimated |
| Cherry picker | none: its cab was reached from the ground with the jib lowered, or from the capsule's hatch | its use: documented (TM X-53107 7.3.3) |
| Trailer NASA SP-No 1, the pad's two huts | four steps and a door; a step and a door | estimated |
| Blockhouse | the ramp to the blast doors in the back wall (`Blockhouse_BlastDoor1`, `_BlastDoor2`); the plate door on the pad 6 side (`Blockhouse_SideDoor`) with a step | doors: documented in kind (double blast doors); their places: the 2005 photograph and F16_016 |
| …its roof | the ladder on the pad 5 side's wall, 16 ft, on to the roof's edge | estimated: F16_016 shows no ladder on the two faces it sees (the pad 6 side and the back), so it was on a face it does not; Complex 26's twin has an outside ladder today |
| Ready rooms | a door to the drive and one under the breezeway (`ReadyRoom_Door1`, `_Door2`), a 10 in step up from the shell | estimated |
| Pad 6's gantry | stairs from the pad on to the east truck (12 risers); a ladder up the east leg's south face to a landing level with the deck under the enclosure (39 ft up); a second ladder from that landing to the walkway across the top (98.6 ft) | hooped ladders on the outboard face of each leg with small landings, and a light stair to the deck: documented (*A Noble Endeavor* p. 10, 1959). Which face and where the landing is: estimated. It also had "elevators" (the same page): not built. The work enclosure is a closed box with nothing inside: it cannot be entered |
| Scaffold stair tower | six flights of 10 risers, a boarded landing at each turn | F19_008 |
| Outbuildings | each has its doors as nodes (`Outbuildings_<Hut1/Hut2/Gen/Shed>Door<n>`) and a floor inside, 6 in above the ground. Only the generator building's doors open (`door`); the huts' and the shed's are marked `shut` and their windows are `window-void`, as the two skid huts' on the pad are: what they held is not recorded | estimated |

Ladders (each its own object `<node>_Ladder<Name>`, marked `climb`, at all three levels of detail):

| Object | From | To |
| --- | --- | --- |
| `ServiceStructure_LadderLeg1` | the base's deck (9.3 ft) | level 1's landing (45.1 ft) |
| `ServiceStructure_LadderLeg2`, `Leg3`, `Leg4` | each level's landing | levels 2 (53.8), 3 (64.6), 4 (75.8 ft) |
| `ServiceStructure_LadderLeg5` | level 4's landing | the landing under the crane (112 ft) |
| `ServiceStructure_LadderCrane` | the landing under the crane | the crane's walkway (132.1 ft) |
| `CameraTowers_LadderTower1`, `_LadderTower2` | the pad | the towers' top decks (62 and 50 ft) |
| `Blockhouse_LadderRoof` | the shell paving | the roof's edge (15.6 ft) |
| `Pad6Gantry_LadderLower` | the east truck's top (7 ft) | the landing (39 ft) |
| `Pad6Gantry_LadderUpper` | the landing | the walkway across the top (98.6 ft) |

Every ladder's stringers stand a metre proud of the floor it reaches. Doors are built shut, each
leaf its own node with its origin on its hinge line and `swing` (degrees about the vertical,
anticlockwise from above) saying how it opens. The lift's `stops` are (across, up) in metres from
where it is built. The pad's doors and its lift are declared as `actions` on its parts in
`flight.ts`; the scenery's doors are marked in the model and not yet declared anywhere.

Stairs, measured (riser; going; from what to what):

| Flight | Risers | Going | Foot | Head |
| --- | --- | --- | --- | --- |
| Pad to the structure's base deck | 17 of 0.180 m | 0.28 m, treads lapping 6 cm | 0.23 m under the pad's surface: on the slab the first tread showing is 0.13 m up; rolled back at T−55 and at launch (+110 ft, +173 ft) the foot is over the track, and the first riser from the ballast is 0.18 m, from a sleeper 0.09 m | the deck's edge |
| Steps to the lift | 0.23, 0.23 and 0.23 m to the car's floor at 0.70 m | 0.30 m | the slab; off the slab two more steps go down to the ballast (0.21 m) and the ground beyond it (0.22 m) | the car |
| Trailer SP-No 1 | 0.21, 0.22, 0.22, 0.22 m, then 0.23 m to the floor | 0.27 m | the slab | the door |
| Pad 6's gantry, pad to truck | 12 of 0.178 m | 0.32 m | pad 6's slab | the truck's top |
| Scaffold stair, each of six flights | 10 of 0.198 m | 0.24 m | the ground, then each landing | the next landing |

The structure's stairs, steps and ladders roll with it. Between its three positions the stair's foot
and the lift's steps hang over whatever is under them; at each of the three they meet the slab or
the track bed as the table says.



## Beyond the complex

The other launch complexes, the lighthouse and the shore are drawn by the viewer
(`src/viewer/cape1961.ts`), not modelled in Blender. **Each is at its published place**: the
coordinates of its pad (OpenStreetMap's outline of the pad or its ruin, agreeing with Wikipedia's
to a few metres), turned into metres east and north of pad 5 (28.439426° N, 80.573292° W). That
much is documented. **Its shape is a stand-in for its type**, drawn so that the kinds can be told
apart on the horizon and no more: estimated, except the few sizes given below.

| Complex | From pad 5 | On 5 May 1961 | Drawn as | Sizes that are documented |
| --- | --- | --- | --- | --- |
| 26 A and B | 640 m and 481 m on 025° | Jupiter and Juno II; one gantry for both pads, twin of pad 5's | the A-frame gantry on pad B (Juno II flew from it on 27 April and 24 May; where the gantry stood on 5 May is not recorded); pad A bare | 111 ft 9 in to its top rail |
| 30 A and B | 608 m on 273°, 686 m on 261° | Pershing: "two launch pads with service towers" | a small lattice tower on each | none: 13 m estimated |
| 25 A and B, 29 A | 835 m, 942 m and 1,128 m on 198° to 200° | Polaris: an "access stand" at each | an open stand of three decks | none: 14 m estimated |
| 17 A and B | 1,169 m on 042°, 1,019 m on 045° | Thor-Delta and Thor-Ablestar | a tall rolling gantry beside a launch stand and its mast | none: 35 m estimated |
| 18 A and B | 1,663 m on 041°, 1,551 m on 047° | Blue Scout | the pad's concrete only: what stood on them is not established | |
| 9 | 1,969 m on 044° | Navaho; inactive since 1958 | its concrete launch pedestal; the erector is not drawn (whether it still stood is not established) | pedestal 66 ft 8 in by 30 ft |
| 31 A and 32 A | 2,166 m on 050°, 2,349 m on 047° | Minuteman flat pads | a roll-back service tower and an umbilical tower | 65 ft and 35 ft |
| 21 | 3,995 m on 054° | Mace: a hardened launch building, finished February 1960 | a low concrete building with two cells | none |
| 11, 13, 14 | 5,176 m on 040°, 5,883 m on 029°, 6,300 m on 024° | Atlas | ramp, launch stand, umbilical mast, and the service tower drawn back from the stand | Complex 14's, used for all three: ramp 92 ft rising 22 ft, stand 60 by 78 ft, mast 84 ft 6 in, tower 154 ft 8 in |
| 12 | 5,521 m on 034° | Atlas; being rebuilt for Atlas-Agena | the same without a tower: its tower burned in September 1959 and what stood in May 1961 is not established | as above |
| 15, 16, 19, 20 | 6,741 m on 020°, 7,234 m on 017°, 7,711 m on 014°, 8,250 m on 011° | Titan I (15 and 16 being converted for Titan II) | launch stand, umbilical tower, and the erector lying down | none: 33 m and 30 m estimated |
| 34 | 9,240 m on 007° | Saturn; under construction, dedicated 5 June 1961 | the service structure at its parking place 185 m west of the pad, the launch pedestal, the umbilical tower's first 27 ft | all of those: 310 ft on a 70 by 130 ft base; 42 ft square and 27 ft high; 27 ft |
| Cape Canaveral Light | 3,732 m on 051° | lit since 1894 on this site; automated 1960 | a tapering tower in six bands, black at the foot, black lantern; the brick oil house | 151 ft; three black and three white bands |

Left out, because nothing above the ground can be shown for that day: Complexes 1 to 4 (flat pads
by then, inactive), 10 (demolished in 1959), 22 (a revetted soft pad), the Minuteman silos 31 B
and 32 B, 36 (finished in 1961; whether its tower stood by May is not established), and 37, 43 and
25 C and D (not begun). Which way each pad is turned is not published: Complex 26 lies on pad 5's
rail line and the rest are set square to their stretch of shore.

The shore is today's, from OpenStreetMap, thinned to 31 points for the Atlantic and 22 for the
Banana River's east shore, 42 for its west, 12 for the Indian River's east and 11 for each of
Newfound Harbor's two: not 1961's exactly (the Cape's point has moved and the port has grown).
Toward the edge of the ground drawn round the pad, where it hands over to the globe (south of the
port, the Banana River north of 28.5, Newfound Harbor), the lines are read off the globe's own
coast (below) so the two agree to tens of metres. Port Canaveral's basins are not drawn, though the
port had been open since 1953.

### The region round it, and when its shore was made

From height the globe draws the country round the site from OpenStreetMap's coastline and lakes
(`LC5.region` in lc-5.ts; tools/globe-region.mjs): 25.6 to 29.6° N, 81.5 to 75.2° W, Flagler
Beach to Miami and out past Great Abaco to Freedom 7's landing. Its shore is today's
except for these, which were built after 5 May 1961 and are undone along their lines:

| Work | Built | In 1961 | Confidence |
| --- | --- | --- | --- |
| Bennett Causeway (SR 528), Indian River and Banana River crossings | spans of 1963; the Bee Line opened 1967 | water | year documented (bridge inventory); the width put back, 260 m, estimated |
| NASA Causeway (SR 405), Indian River, and NASA Causeway East, Banana River | 1964 | water | the Indian River bridge's year documented (FDOT); the East crossing's taken as the same |
| Canaveral Barge Canal across Merritt Island, and the lock's cut from the Banana River to the port | 1965 | land | documented (Corps of Engineers, via Wikipedia) |
| Complex 39's turning basin and barge canal by the Vehicle Assembly Building | after NASA bought Merritt Island, from 1962 | land | that it is later than 1961 is documented; the year is not |

Kept, because they stood in 1961: the SR 520 causeways (1941), Port Canaveral's harbour (1953),
the Haulover Canal. Not undone, though some may be later: the spoil islands along the dredged
channels in the Banana and Indian Rivers, the Max Brewer and Eau Gallie causeways, Cocoa Beach's
and Merritt Island's finger canals, the fill at the Bennett Causeway's landings. Known to be later and not yet undone: the
Pineda Causeway (1972), 27 km south, whose line was not traced. The keepers' houses at the lighthouse probably still stood
(they were demolished later in the 1960s) and are not drawn.

These landmarks take the same haze as the land (`src/viewer/air.ts`: 80 km visibility at sea level,
thinning with height), which leaves the Atlas pads and Complex 34 clear from pad 5, as
on a clear morning.

## The land

The ground the complex stands on, what grows on it, and the sea are drawn by the viewer from
parameters (`src/viewer/cape.ts`, on the machinery of `land.ts` and `flora.ts`, which know no
site), not modelled. **The communities and their order are documented; where each one lies, how
dense and how tall, and every colour, are estimated** from photographs of 1958 to 1965.

| What | As drawn | Confidence | From |
| --- | --- | --- | --- |
| The communities, from the sea | bare beach; the dune's sea oats and grasses with patches of sea grape; the coastal strand (saw palmetto, sea grape, wax myrtle) pruned low by the salt and rising inland; coastal and oak scrub (scrub oaks, saw palmetto, wax myrtle), close to continuous; hammock toward the Banana River; cabbage palms singly | documented in kind | Oddy and others 1999, pp. 13 to 17; FNAI 2010 |
| Where each community starts | beach to 40 m inland of the surf line, dune to 70 to 95 m, strand thickening from 55 to 110 m, scrub beyond about 180 m; hammock within about 700 m of the river | estimated | the 1961 and 1963 aerials (KSC-61C-0873, 63PC-0033): a dune strip of 30 to 60 m |
| How open the scrub was | woody cover about 0.9, with sandy openings tens of metres across and grassier swales between old beach ridges about 110 m apart | estimated; that 1961's scrub was more open than today's is documented ("an open, shrubby and herbaceous landscape" in 1943) | Oddy 1999; the 1950 USGS aerial for the ridges |
| How tall | a closed stand 2.1 m in the scrub, 0.9 m at the strand's seaward edge; shrubs 1.1 to 3 m, saw palmetto 1.0 to 1.8 m, cabbage palms 5 to 11 m | estimated, within the published range (1.0 to 3.5 m after twenty years unburned) | Schmalzer and Hinkle 1991; Breininger 1992; 6100884 shows the scrub's tops about level with a 2 m fence |
| Complex 5/6's clearing | mown grass and sand inside the complex's frangible fence: 432 m along the rails, from 136 m south-south-west of pad 5 to 297 m north-north-east of it (139 m beyond pad 6), and 276 m across, 137 m each side of the rails (pad frame: x −137 to +139, y −136 to +297), corners rounded 10 m; the fence jogs out to 157 m west-north-west round the car park at the gate (y −24 to +57). Scrub comes up to the fence on every side; the perimeter road runs 13 to 20 m inside it | the outline derived: the fence and perimeter road on TM X-53107 Figure 7-6 (the Mercury-Redstone site plan, 1960 to 1961), scaled by the pads' 520 ft (1.274 ft a pixel); the road there lies within 6 m of today's (OSM: Museum Loop, way 1220192254, and the cross road, way 1219671682). That scrub stood right up to it is estimated from the April 1965 aerial (650400) and F16_016 (July 1961). What grew between the fence and Complex 26's clearing in 1961 is not known: by 1965 it was grassed | TM X-53107 Fig. 7-6; OSM; ccspacemuseum 650400; FHSU F16_016 |
| Worn ground at the pads and the blockhouse | sand for about 10 m beyond each pad's concrete (to 40 m from its centre) and round the blockhouse's paving (34 m from its middle), mown grass beyond | estimated: the egress test at pad 5 (21 April 1961) and F16_015 to F16_017 (July 1961) show grass up to the concrete with sand worn through near it, not graded aprons | the photographs |
| The neighbouring pads | each in an oval of grass and sand 75 m beyond its pad | estimated | 63PC-0033 |
| Firebreaks | straight sand lines on a grid square to the rails, about 270 by 240 m, some lengths left uncut | the kind is documented (every aerial of the period shows them); where each one ran is not, and these are invented | KSC-61C-0873, 650400 |
| The breeze the plants move in | from 090° at about 10 knots | documented: the Skid Strip's 09:00 EST observation | NOAA ISD 74794012868 |
| Colours of sand, grass, leaf and litter | as in `cape.ts` | estimated from period colour film, which has shifted | the photographs above |
| The lie of the land | the complex's ground (y = -0.12 m in the viewer) taken as 9.5 ft above NAVD 88; the sea's surface 2.9 m below it; inland, old beach ridges and swales about 110 m apart and half a metre deep; the foredune's crest about 1.9 m above the sea, 45 to 62 m inland of the waterline; the beach face rising 1.35 m in its first 30 m to a berm | heights derived from today's survey (USGS 3DEP along 28.4394° N: ground near Complex 5 about 9.5 ft, dune crest 6 to 8 ft about 60 m from the water); the ridges' spacing read off the 1950 aerial; that 1961's ground was the same as today's is assumed | USGS 3DEP; USGS aerial 1950 |
| Level ground | exactly level at the complex's height over Complex 5/6's clearing and roads and within 85 m of every other complex's pad, easing to the natural lie over 40 m | a rule of the viewer (the models stand on a flat datum), not a survey | |
| Beach and sea | beach 40 to 50 m from the waterline to the dune, with a wrack line 17 m up; the bed falling 2.2 m in 100 m with a bar 75 m out; a swell of 55 m crests every 7.7 s, about 1 m crest to trough offshore, breaking on the bar and at the shore, so two lines of breakers | the swell's period and height documented as May medians (NOAA buoy 41009, 2010 to 2019); two lines of breakers read off KSC-61C-0873 and 63PC-0033; the bed's slope, the bar's place and the beach's width estimated | |
| The Banana River's water | flat, grey-green, with a marsh edge | its shore documented (OpenStreetMap, today's); its colour and the marsh's width estimated | |
| The Banana River's width, Merritt Island, the Indian River | the river between its two shores (5.7 km wide abreast of pad 5, 1.7 km 12 km north), Merritt Island's land west of it, the Indian River in the ground's south-west corner | documented, today's (OpenStreetMap relation 1204544, the Indian River Lagoon, traced every 300 m to 1.8 km) | Today's port, causeways and the barge canal (cut 1962 to 1965) are stepped over, not drawn; Sykes Creek inside Merritt Island is left out; the river's bed falls 1.5 m in every 100 from either shore, as the sea's does (estimated: the real river is a metre or two deep) |
| The air | haze thinning with height over 1.4 km above the sea (src/viewer/air.ts), so a distant tree line goes blue from the ground; from above, the air itself (src/viewer/atmosphere.ts: Rayleigh, this haze, ozone, light scattered many times) | that the morning was clear is documented (visibility at the Skid Strip's 16 km cap at 09:00 EST, NOAA ISD); the haze's profile and its density are estimated (80 km visibility at sea level: clear air, chosen so the coast and the far complexes read) | NOAA ISD 74794012868 |
| The cumulus | flat-based at 720 m, tops to 650 m higher (heaps of 250 m, a few towers of 500, scraps), a tenth of the sky, standing in groups with clear air between, some growing and hard-edged and some fraying, drifting west with the 090 wind, their shadows on the ground; thin high cloud above | 1/10 cumulus at liftoff (preferred to the station's "scattered" at 09:00), no ceiling, and the 720 m base (May mornings' median, 1959 to 1963; 750 m at 07:00 that day) documented; depth, size and the wind aloft estimated; where each cloud was, how they were grouped and which were growing or going are not known (estimated: src/viewer/air.ts, clouds.ts); how a cloud is lit is a model fitted by eye to photographs of trade-wind cumulus, in the scene's own Sun and sky | MR-3 Postlaunch Report 10.3, p. 87; NOAA ISD; Kraft, p. 8 |

A thicket far from the eye is drawn as the ground itself lifted into a roof of crowns, not as
plants (`land.ts`); within about 60 m of the eye the plants stand on the ground one by one.



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
  their positions is recorded. The blast screens and their tanks are placed from oblique photographs, to perhaps 15 ft. The huts, the
  barricade and the floodlights' form are from July 1961; that they were the same in May is assumed.
- What takes the furniture away is partly invented: the M275 tractor for the trailer SP-No 1 is of
  the kind photographed coupled to it (see "What towed the trailers"); a half-ton pickup on a chain
  for each hut is from no photograph. That the shower,
  case, trailer and huts left before the rollback at all is an assumption, and so are their routes
  and times. The trailer's route is computed to follow the tractor's (a tractrix), but sampled at
  points, so the kingpin wanders up to 2 cm off the fifth wheel mid-turn (checked in the browser at ten points: 1.9 cm).
- The searchlights are designed after the 60-inch Army carbon-arc kind, not measured: a deep drum
  on trunnions in a yoke, the door ring and its glass in front (facing out, `lens_out`), a
  parabolic mirror inside (`chrome-reflector`), the arc lamp's housing and vent behind, on a
  two-axle trailer with mudguards, a tow bar and four jacks. Every lamp's lens now faces out and
  says so (`lens_out`), floodlights' too.
- The trailer SP-No 1's door steps are their own node, hinged at the top
  (`GroundEquipment_TrailerSteps`), and fold up 95° before the tow (slider 0 to 0.008): that
  they folded, and how, is estimated.
- Every node of both models carries a `label` and an `about` (lc5/labels.py: one table, the
  confidences of this record restated); where several things shared a node each now has its own
  (`Floodlights_Pole1..6`, `CameraTowers_Tower1..2`, `GroundEquipment_Danger1..2`,
  `…_ChevronDrum`, `…_Camera1..4`).
- The searchlights are three of one kind (a 60-inch Army drum on a four-wheeled trailer) in places
  chosen to match two photographs' lighting; their beam is a figure for the type from no source.
  They stay through liftoff and burn whenever the Sun is down; MR-3's were not switched off at any
  recorded time.
- The cherry picker's control station is a box with four levers at the tail: their number, order,
  legends and which motion each worked are invented. The truck itself cannot be driven by a walker.
- The office's windows, door and furniture are placed by eye, and so are the stairs to the base.
  The furniture (desk, lockers, cabinet, intercom panel and its legends) is the period's kind,
  not this room's; so is everything in the trailer SP-No 1 (racks, test sets, desk), whose
  legends (TELEMETRY, CAPSULE POWER, COMMUNICATIONS, RECORDERS, TIMING) are invented.
- What stood behind the launcher was built, until this was corrected from the liftoff photographs,
  as two closed white trailers (a "nitrogen trailer" with a tank standing on a plain box, and a LOX
  unit with its tank on top of an enclosure) and a rectangular chevron box, 20 to 30 ft from the
  launcher. The photographs show open-topped screens with a tank behind each, further out, and a
  round drum. Of what is built now, the screens' posts and struts, the orange tank's cart and
  fittings, and the LOX trailer's running gear, valves, gauge board, placards' wording and hose are
  the ordinary kind, not read off a photograph; nobody can go up on the trailer's deck. The
  photographs also show a small pile of sandbags at the pad's edge beyond the launcher, which is not
  built, and (6100884, S61-01928) grass within about 40 ft of the launcher on the structure's side
  of it, between the tracks' concrete and the pad's: the hardstand here is a full 200 ft square from
  TM X-53107's Figure 7-6 and OpenStreetMap, and that difference is not resolved.
- The tripod cameras are a type, not the cameras; the launcher's cables' routes, thickness and
  connectors are estimated.
- The crane has no operator's cab: none shows in the photographs, and the hoist machinery is drawn
  as a closed house.
- The cabins' frames (white uprights and rails on the red panels) are a reading of the night
  photograph S61-03158, which shows framed panels; their colour is not known.
- OpenStreetMap shows water-deluge monitors and fuel-truck revetments at both pads. Their date is
  unknown and they are not modelled. KSC-61-4457 shows a fire hose played across the pad on 2 May
  1961; no hydrant, hose cart or fire truck is modelled.

The rest of the complex:

- The generator sets, the fuel tank's fittings, the tracking dish's mount and feed, the poles'
  ground wires, tags, switch boxes and through-bolts, and the cherry picker's cab (dial faces,
  glovebox, heater, a power take-off lever, headliner, visors, mirror, pleated bench, window
  winder) are each the ordinary kind, from no photograph of these. The shell paving's batter is a
  smooth curve, rounded at the top and easing out at the foot; its real edge is not known.
- Things the viewer names when pointed at (`label`): the shower, the packing case, the barricade,
  the trailer SP-No 1, the huts, the blast screens, the tank cart, the LOX trailer, the cameras, the camera towers,
  the searchlights; in the place, the cable racks, the scaffold stair, the huts, the generator
  building and its tank, the shed. The tractor and pickups are named by `vehicle`.
- **The weather beyond the Cape is invented.** The cumulus are the record's at liftoff within 12 km of the pad
  (1/10, bases at 720 m). Past 40 km the cover is a map made up for a fair May morning (`src/viewer/weather.ts`:
  more cumulus inland and over high ground, the sea clear beside a shore, clusters and lanes over the open sea,
  streets along the wind, a front a thousand kilometres to the north-west with its cirrus): estimated, all of
  it. No chart, sounding or reanalysis for 5 May 1961 has been read; the day's real weather would replace the
  map. The middle deck is an eighth of altocumulus at 3,600 m round the site (Patrick, 10:00, NOAA ISD:
  documented for that hour) and the map's elsewhere; the cirrus's height (10.5 km) and the high wind are
  estimated. The decks cast no shadow on the site's own ground, only on the globe beyond it.
- **Paving stands a hand's breadth proud.** The viewer's ground is 0.12 m under the pad's
  surface (it was 0.45 m until November 2026, and the pads stood like table tops), and nothing may
  lie closer above it than that: parallel faces 5 to 6 cm apart flicker from across the site. So the
  road, the walks and the trench covers are at the pad's level on concrete that goes down into the
  ground, and the shell paving is a low bank with sloped edges. In life all of it was flush with
  the grass. Along the track's ballast off the pads the ground is let down to 0.45 m again
  (cape.ts: `trackAt`), easing back over a few metres, so the bed stands proud of its own ground
  as track does; whether the real ground dipped there is not known.
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
  (properties `intensity`, and `reach` in metres). The ready rooms' furniture (a table and two benches, five lockers, a desk and chair, a notice board, clocks; in the kitchen a counter with its sink and tap, a coffee urn, a range, a refrigerator, a table and four chairs) is likewise the period's kind, from no photograph.
- The shell paving goes all round the blockhouse. The 1961 photograph shows lawn in front of the
  pad 6 face, with only the walk and the trench crossing it.
- Pad 6's gantry is a sketch of its type: the truss pattern, the trucks and the enclosure's
  panels are not measured, and it has no platforms inside. Its launcher is pad 5's copied, with
  the Mercury tail-plug housing a tactical Redstone's launcher did not have. Pad 6 has no cable
  masts, no painted circle and no ground equipment: none is established.
- The turnout is the ordinary kind, not this one: points, a cast frog with wings, guard rails and,
  where one pair's curve crosses the other pair, four cast crossing frogs, all of sizes chosen for
  the period, none read off a photograph. The points are set for the main line and do not move.
  The frogs' castings are plain blocks with the running surface and flangeways on top; a real
  crossing has knuckles and guard rails at its obtuse corners, which are not built. Curved rails
  are chords 6.5 ft long. The turnout ends in a timber stop after 270 ft; where it really led is
  not known. F16_017 shows a second curved track south of pad 5, which is not modelled.
- Pad 6's rails stand an inch and a half proud of its slabs, for the far-field rule, so they need
  no flangeway and have none; pad 5's are let into channels. Between the two the rails rise over
  35 ft of ballast (y −305 to −340 ft), past the turnout and short of the concrete.
- The outbuildings' uses are guesses from their roofs and from OpenStreetMap's tags. Their doors
  and windows are placed by eye.
- **The cars are types, not the cars.** Each is built to a make and year that F16_016 suggests,
  from its published wheelbase, length and width; its shape between those figures (the heights
  of bonnet and boot, where the glass stands, the curve of the roof, the trim) is drawn from the
  look of the type, not from a drawing, and one loft with a handful of settings makes all of them,
  so a 1957 Ford and a 1959 Chevrolet differ in proportion, fins, lamps and trim and not in every
  panel. The Volkswagen was checked against four photographs of 1960 and 1961 cars: its roof
  still has a brim over the windscreen that the real one has not, and its wings are flatter in
  side view. The other eight types were checked against two to four photographs each (see "The
  vehicles"), which moved their glass and roofs and some proportions; their noses and tails are
  still suggested rather than shaped. Windscreens and back lights that wrapped round the corners
  do so in flat panes between posts, not a curve. No badges, bonnet ornaments, aerials or number
  plates' characters; the engines and boot floors under the lids are boxes of about the right
  size, and the insides are benches, a dashboard and a steering wheel. Colours are guesses: the
  photograph is black and white. The emblem on the pickup's door is a plain dark disc, since it
  cannot be read. Opened (the viewer can open doors), a door's lower corner at its hinge comes
  within a millimetre of the shut line's ridge on two or three cars; the check runs on the cars shut.
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
- **The land is a reading of photographs, not a survey.** The clearing round the complex is the
  fence line of the period's site plan, which is a diagram, not a survey; the band of ground between
  it and Complex 26 is drawn as scrub, which is not established for 1961. The firebreaks are
  invented in kind, and the communities' edges, densities,
  heights and colours are estimates. Each plant is one of a few built forms of its species, not a
  plant that stood there. There are no forbs but grasses, no invasive Australian pine or Brazilian
  pepper, no fence lines, no litter of the works. No drainage ditches beside the roads and no
  borrow pits: where they were round this complex is not recorded in anything read. The relief is
  today's survey's kind of ground, not 1961's. The swell's crests run straight along the shore and
  no wave is ever stood in: the walker meets the still sea. Plants are not solid: the walker goes
  through them.
