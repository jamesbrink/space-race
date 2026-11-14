# Launch Complex 5, Cape Canaveral

The pad every Mercury-Redstone flew from. Model: [lc_5.py](lc_5.py), which puts together one module
per piece in [lc5/](lc5/); built for a flight by its `model/pad.py`, which names the day: 5 May 1961 for
Mercury-Redstone 3, 21 July 1961 for Mercury-Redstone 4. What differed between the two is dated in the
modules and listed under "What stood when"; the flights' data for the pad's parts is one module,
[lc-5.parts.ts](lc-5.parts.ts), which each flight gives its own morning. NASA's report calls the complex
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
| +X | square to the rails on the blockhouse's side, where the cherry picker's truck stands: WNW, about 295° true, uprange | estimated: the rails' line is derived (below); which of the two sides is which is from Figure 7-6, which puts the mobile tower on the blockhouse side, and liftoff photograph 6100884, which shows its cab there. Until November 2026 this was also taken to be the way the capsule's hatch faced. It is not: the vehicle stood turned to its azimuth ("Which way round the vehicle stood") |
| +Y | along the rails toward the structure's parking places: SSW, 205° true | derived: OpenStreetMap's rails and pad outline, 25°/205° to within 1° |
| True north | (0.423, −0.906, 0) in Blender, (0.423, 0, 0.906) in the viewer | derived from the two lines above |
| The vehicle | turned on the launcher from +X toward +Y, anticlockwise from above, by (295° − azimuth) − 135°: **55° for MR-3** (105°), **60° for MR-4** (100°). The hatch's middle then bears 240° and 235° true, and the periscope, 135° round from it, lies on the azimuth | **derived**: the azimuths are documented, the rule is TM X-53107's and the capsule's own axes, and +X's bearing is estimated. Photographs put MR-4's turn between 50° and 75° and MR-3's between 35° and 65°. "Which way round the vehicle stood" |
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
behind the vehicle (+Y) and its platforms reach forward past it. The hatch faces 55° (MR-3) or 60°
(MR-4) round from +X toward the mast, so it opens into the white room's +X half
(`ServiceStructure_Platform3_Right`) and looks at its back wall 6 to 7 ft out from the split, 2.3 ft or more short of the
door from the lift: he came through that door and the hatch was in front of him, a step to his left. The
floor's edge is 3.7 ft from the vehicle's axis and the hatch's sill 2.9 ft: whoever helped him in stood
on that half between the door and the hatch. The cherry picker came in on the same half once the structure
had gone, from the truck's side, and stood beside the capsule ("Cherry picker's cab at the hatch", under
Dimensions).

## Where things stood, and when (MR-4, 21 July 1961)

The same slider, laid out on the same stops, for the second morning: `MORNING` in Liberty Bell 7's
`flight.ts`. **Only two times of day are recorded**: the pilot in the spacecraft at 03:58 and the
liftoff at 07:20:36 (*Results of the Second U.S. Manned Suborbital Space Flight*, MR-4 Results below,
pp. 6, 31 and 50). The rest is the count (TM X-53107, 7.2.3.2, which is MR-4's own countdown) put on
the clock by the day's three holds, which are documented: 30 minutes at T−45, 9 at T−30, 41 at T−15,
and none after. So an event before T−45 was 80 minutes earlier than the count reads, one before T−30
50 minutes, one before T−15 41 minutes: every such time below is `derived`. The count had been
resumed from T−180 at 03:00, after the planned hour's hold for the weather, and liquid oxygen went
aboard from then (T−180 to T−145), not from T−305 as on 5 May.

| Time (EST) | Count | Event | Slider | Confidence | Source |
| --- | --- | --- | --- | --- | --- |
| 06:00, 20 July | T−640 | The first half of the split count begins | before it | documented | MR-4 Results p. 6 |
| about 23:45 | T−316 | The structure to the edge of the pad for the RF checks; back round the vehicle at T−265 (about 00:35) | before it: not shown | derived; a night photograph dated 21 July shows the vehicle standing clear of the parted structure | TM X-53107 pp. 7-21 to 7-23; FHSU item 499 (61-7112) |
| about 01:40 | T−200 | Platform 1 opened; the LOX trailers brought in | before it: level 1 is parted from the start | derived | TM X-53107 p. 7-25 |
| 02:00 to 03:00 | T−180 | The planned hour's hold for a last look at the weather | before it | documented (the hold, and 03:00) | MR-4 Results p. 6; TM X-53107 8.3.2 |
| 03:00 to 03:35 | T−180 to T−145 | Liquid oxygen loaded; the cherry picker stands folded on its truck beside the pad | before it | derived; the tower's pose documented | TM X-53107 p. 7-25; FHSU items 443, 445 (LOD 61-6450, 61-6449, 21 July) |
| 03:45 | T−135 | The LOX trailers removed | before it | derived | TM X-53107 p. 7-26 |
| 03:55 | | Grissom arrives by the transfer van and goes up by the lift | before it | documented | MR-4 Results pp. 31 and 50; NASA 61-MR4-83 |
| 03:58 | T−122 | In the spacecraft, from the white room | 0 | documented | MR-4 Results pp. 6 and 50 |
| 04:30 | T−90 | Capsule hatch installed: seventy bolts | 0 | derived | TM X-53107 p. 7-27 |
| 04:35 | T−85 | Platform 2 opens; the emergency shower is disconnected and stowed for launch | 0 to 0.03 (the shower goes on to 0.06) | derived (when); estimated (where the shower went) | TM X-53107 p. 7-27 |
| 04:40 | T−80 | "Move spare parts trailer"; "Move transfer van to launch position"; platform 1 verified open | 0.03 to 0.125 | derived (when); estimated (how, and where to) | TM X-53107 p. 7-28 |
| 04:55 | T−65 | Platform 4 opens | 0.07 to 0.10 | derived | the same |
| 05:00 | T−60 | Platform 3, the white room, opens | 0.10 to 0.128 | derived | the same |
| 05:05 | T−55 | The structure starts for the edge of the pad | 0.13 | derived. No report gives the time. A photograph taken about sunrise (05:38), the searchlights still burning, shows it gone and the cab at the capsule | TM X-53107 p. 7-29; FHSU item 333 (LOD 61-6452) |
| 05:10 | | The structure stands at the edge of the pad | 0.32 | estimated | |
| 05:11 to 05:14:30 | | The cherry picker is raised from its truck and its cab brought to the hatch | 0.33 to 0.42 | estimated (the minutes); the count has it positioned once the structure had gone | TM X-53107 p. 7-29 |
| 05:15:36 to 05:45:36 | T−45 | Held 30 minutes: a hatch bolt is misaligned, and is left out | 0.43, where nothing moves | documented (the hold); derived (the time of day) | MR-4 Results p. 6; *This New Ocean* p. 370 |
| 06:00:36 to 06:09:36 | T−30 | Held 9 minutes while the searchlights are put out | 0.45 | documented; derived | MR-4 Results pp. 6 and 50; TM X-53107 8.3.2 |
| 06:24:36 to 07:05:36 | T−15 | Held 41 minutes for cloud | 0.47 | documented; derived | the same |
| 07:11:51 | T−8:45 | The structure driven by remote control to its launch position | 0.48 | derived | TM X-53107 p. 7-32 |
| 07:18:06 | T−2:30 | The cab lowered "away and down" | 0.58 | derived | TM X-53107 p. 7-33 |
| 07:20:01 | T−35 s | The capsule umbilical pulled, the periscope drawn in; the mast down two seconds later | 0.72 to 0.755 | documented | MR-4 Results p. 6 |
| 07:20:22 | ≈T−14 s | "Boom drop" | 0.76 to 0.795 | derived | TM X-53107 p. 7-33 |
| 07:20:36 | T−0 | Liftoff | 0.8 | documented | MR-4 Results Table 5-II (p. 31) |
| 07:30:36 to 07:34:06 | | The cherry picker folded down and driven off | 0.82 to 1 | estimated: not recorded | |

*This New Ocean* has "a gantry technician" finding the bolt at T−45, which by the count is ten minutes
after the structure left. Either the phrase is loose or the structure left late; nothing read settles
it, and the model follows the count. The photograph at sunrise (FHSU item 333) agrees with the count
and does not prove it: it shows the structure gone by then, which a rollback as late as 05:35 would
also give.

How the pilot got in is as on 5 May: the transfer van to the foot of the structure, the lift, the
white room on level 3. NASA's photograph 61-MR4-83 has him walking from the van past the emergency
shower toward the structure with his ventilator in his hand; `PILOT` in the flight's `flight.ts` is
that place, for the figure that is not yet built.

## The pieces

| Top-level node | Module | Contains |
| --- | --- | --- |
| `Hardstand` | hardstand.py | 200 ft of 20 ft slabs, joints, burn and stain, painted 121 ft circle, four flat-bottomed rails let into channels with a flangeway on the gauge side, scale plate, trench covers, WNW apron and the ramp off its end, track on ballast: sleepers, tie plates, spikes, fishplated joints |
| `LaunchPedestal` | launcher.py | the launch ring, support pads and fin clamps, four legs with struts and jack feet, four-sided deflector, tail-plug housing, two ground cables: each from a plug under the ring, hanging to the slab, lying in easy curves over the rails, up into a receptacle on its junction box. On the ring's table, from masts.py, the two shoes the cable masts are pinned to |
| `UmbilicalMast` | masts.py | cable mast No. 2 (the capsule's): its fork, pin and collar on the shoe that is bolted to the launcher's table, the pole to the heat shield, the umbilical strapped up it, the release head, the eject line; `UmbilicalMast_Cable`, the umbilical from the head round the cone to the receptacle |
| `BoosterMast` | masts.py | cable mast No. 1 (the booster's): fork, pin and collar on its shoe on the launcher's table, the pole, its steady against the booster, the cooling package (a white vessel under its blower's box) with the hose coiled behind it, the hoses over the pole's top to the plate at the booster, the LN2 line, the eject line |
| `ServiceStructure` | service_structure.py | base, four rail trucks, office (windowed, with a door, a desk and lockers), stairs from the pad to the base's deck, A-frame mast, platform brackets, the lift and its shaft, a railed way from the lift to every level with a ladder well in it, hammerhead crane with red obstruction lamps at its ends; work lamps under level 1 and a room lamp in each enclosed level (see "Lights at night"); child nodes below |
| `CherryPicker` | cherry_picker.py | International Harvester R-series truck: glazed cab with a bench, pedals, handbrake, gear lever, dash and dials, the driver's door and steering wheel as nodes of their own; on the bed the hydraulic tank, gas bottles and the valve bank; at the tail the control station with its four levers (`CherryPicker_Controls`); child nodes below |
| `GroundEquipment` | ground_equipment.py | behind the launcher, two open-topped blast screens of white panels (`GroundEquipment_TankScreen`, `…_LoxScreen`: posts, capping rail, foot plates, raking struts behind; the taller with a grey switch box and three floodlights on a post), the orange tank on its two-wheeled cart behind the lower (`…_TankCart`: saddles, straps, filler, relief valve, outlet valve and gauge, hose, drawbar), the LOX topping trailer behind the taller (`…_LoxTrailer`: a white tank with dished heads on a flatbed semi-trailer, tandem, landing legs, vent stack, manway, placards, the fill and topping lines with their valves and coupling at the rear, a gauge board, the hose coiled on the deck), and the chevron drum (`…_ChevronDrum`); four 35 mm cameras on wooden tripods (`GroundEquipment_Camera1..4`); the emergency shower on its cart, a packing case, two DANGER boards, a striped barricade, the white trailer lettered NASA SP-No 1, furnished as a test trailer (racks, a bench of test sets, a desk, stools, its lights `Light_Trailer`), and the M275 tractor coupled to it, two huts on skids and the pickup chained to each, three searchlights on their trailers. From July: the transfer van (`GroundEquipment_TransferVan`: the white van trailer lettered NASA TV No 1, its door steps, its bogie) and its white M275 tractor (`GroundEquipment_VanTractor`, in `GroundEquipment_VanBay`); the shower beside the structure's base; no packing case |
| `CameraTowers` | ground_equipment.py | two lattice camera towers, a ladder up each |
| `Floodlights` | ground_equipment.py | six timber poles in the grass at the pad's edge, a crossarm bolted through and three lamps each; close to, the ground wire stapled down to its rod, a number tag at eye height, the conduit and switch box |

## Moving parts

Blender axes and feet first; the viewer (metres, +Y up) maps Blender (x, y, z) to (x, z, −y). An axis
in the viewer is the Blender axis mapped the same way. Angles are right-handed about the axis given.

| Node | Parent | Origin (Blender ft) | Moves | Travel | When | Source / confidence |
| --- | --- | --- | --- | --- | --- | --- |
| `ServiceStructure_Platform{1..4}_Left` | `ServiceStructure` | (0, 0, floor) | slides along −X | 4.5 ft (1.372 m) | before the structure moves: L1 T−200, L2 T−85, L4 T−65, L3 T−60 | parting documented (Hammack; TM X-53107 count); distance estimated |
| `ServiceStructure_Platform{1..4}_Right` | `ServiceStructure` | (0, 0, floor) | slides along +X | 4.5 ft | the same | the same |
| `ServiceStructure` | — | (0, 0, 0) | rolls along +Y (viewer −Z), on its rails (`runs`: the hardstand's and the track's `steel-rail`, each axle on them) | +110 ft (33.53 m) to the edge of the pad; +173 ft (52.73 m) in all to the launch position | T−55; T−8:45 | moves documented; 110 ft estimated (100 to 120); 173 ft derived (Fig. 7-6's 181 ft less 8 ft) |
| `ServiceStructure_Wheel_1..8` | `ServiceStructure` | each axle's middle, 1.53 ft up | turns about +X: rolled by the roll itself (`runs.wheels`) | −d/1.5 ft rad for a roll of d ft along +Y | with the roll | wheel size estimated |
| `CherryPicker_Mast` | `CherryPicker` | the turntable pin (67, 4.6, 7) | turns about Blender +Y (viewer −Z) | stow: +66.81° (viewer: −66.81° about +Z): lies forward on the bumper frame | after liftoff (drive-off, not documented) | estimated |
| `CherryPicker_Jib` | `CherryPicker_Mast` | the mast-head pin (80.33, 4.6, 75.72) | turns about Blender +Y | lower to the pad: −71.94° (viewer +71.94° about +Z); standby, clear of the closed structure: −31.77° (viewer +31.77°); stow fold after lowering: +0.86° more (viewer −0.86°) | lower at T−4 or T−2:30 | lowering documented ("away and down"); angles derived from estimated lengths (`cherry_picker.pose`; `TOWER` in lc-5.parts.ts) |
| `CherryPicker_Cab` | `CherryPicker_Jib` | the hanger pin (8.46, 4.6, 71.4) | turns about Blender +Y | the negative of jib plus mast, to stay level: lowered +71.94°, standby +31.77°, stowed +4.27° (Blender) | with the jib | estimated |
| `CherryPicker_Outrigger_1..4` | `CherryPicker` | each hinge pin | turns about +X | up beside the body: 1 and 3 (−Y side): −105°; 2 and 4 (+Y side): +105° | before the drive-off | estimated |
| `CherryPicker_Wheel_1,2`, `CherryPicker_SteerWheel_1,2` | `CherryPicker` | hub centres | roll about their axle (Blender Y, viewer Z); steer about the vertical | — | drive-off | — |
| `CherryPicker` | — | the rear axle's middle on the ground (71.5, 4.6, 0) | drives | faces +X (viewer (1, 0)); wheelbase 16.5 ft (5.029 m); tyre radius 1.73 ft (0.527 m) | after liftoff; the liftoff photographs show it still there | estimated |
| `UmbilicalMast` | — | its hinge pin on the launcher's table: 3.55 ft from the axis at 115° round from the hatch, which the launcher's turn puts 170° (MR-3) or 175° (MR-4) round from +X: (−3.50, 0.62, 5.8) or (−3.54, 0.31, 5.8) | turns about the pin, which lies across the way out from the vehicle: Blender (−sin a, cos a, 0), viewer (−sin a, 0, −cos a), a being that 170° or 175° (lc-5.parts.ts `fallAxis`) | +94.9°: straight out from the vehicle until its head is 1.5 in off the pad, 66 ft from the launcher's centre, at (−64.9, 10.6) or (−65.7, 5.0) ft | at the umbilical drop, T−35 s (that the mast went then: MR-3's photograph at ignition has it down) | mechanism documented (release valve, bungee); that it is hinged on the table and falls straight out: documented (S61-02407; FHSU items 118, 134); where round the vehicle: derived; the angle derived from estimated lengths (`masts.resting`) |
| `UmbilicalMast_Cable` | `UmbilicalMast` | where the umbilical leaves the release head, 0.2 ft nearer the vehicle than the pole's middle and 66.4 ft up | turns about the same axis | +49° more as the mast goes over, so that it lies from the fallen head on the pad, 3 in off it | with the mast | estimated: how the ejected umbilical fell is not recorded |
| `BoosterMast` | — | its hinge pin on the launcher's table: 3.7 ft from the axis at 241° round from the hatch, beside the fin at 225°: 296° (MR-3) or 301° (MR-4) round from +X, (1.62, −3.33, 5.8) or (1.91, −3.17, 5.8) | turns about its pin, across its way out as the capsule's is | +93.7°: straight out until the coiled hose is 1.7 in off the pad, 56 ft from the launcher's centre, at (24.9, −50.6) or (28.8, −48.4) ft | "boom drop", ≈T−14 s (S61-02407 has it a third of the way over as the engine lights) | event documented; hinged on the table and falling straight out: documented (S61-02407; FHSU items 118, 126, 134); where round the vehicle: derived; the angle derived from estimated lengths |
| `CherryPicker_Controls_Mast`, `_Jib`, `_Cab`, `_Outriggers` | `CherryPicker_Controls` | each lever's pivot, (63.15, 6.2 to 7.4, 4.45), at the tail on the driver's side | swings about the node's Z (extras `lever`, `function`, `swing` 25, `axis` "z") | 25° either way, springing back to the middle | while the function it names is worked by hand (types.ts: `Function.lever`) | a station at the rear of the truck: documented (TM X-53107 7.3.3.1: "the controls ... at the rear of the transporter"); four levers, their order and which worked what: estimated |
| `CherryPicker_Door_1` | `CherryPicker` | the driver's door's front edge at its foot, truck (15.45, 3.2, 3.6) | `door`, `swing` −70° about the vertical | 70° | opened on foot | estimated |
| `GroundEquipment_Shower`, `GroundEquipment_Case` | `GroundEquipment` | their middles on the pad | slide, on what is under them (`runs`: the hardstand, the road, the land) | up the road toward pad 6, about 150 ft | 0.02 to 0.11 and 0.03 to 0.12 (06:03 to 06:31) | estimated throughout: nothing records that they left, or when |
| `GroundEquipment_TractorBay` | `GroundEquipment` | (34, 71.33, 0), turned −90° about Z, so that its +X is the trailer's way ahead (−Y) | none: the frame the tractor drives in | — | — | — |
| `GroundEquipment_Tractor`, with `…_Wheel_1..4` (the tandem), `…_Knuckle_1,2`, `…_SteerWheel_1,2`, doors and seats to the vehicle contract | `GroundEquipment_TractorBay` | the ground under the middle of its tandem, 4 in behind the kingpin: (34, 71.33, 0) | drives: starts straight ahead (−Y), eases 12 ft to its left (+X) over the first 40 m, clear of the structure's stair, then straight on | 82.6 m (271 ft) | 0.01 to 0.12 (06:02 to 06:31) | estimated throughout: no photograph shows what moved the trailer, or that it left |
| `GroundEquipment_Trailer` (wheels `…_Trailer_Wheel_1..4` on their hubs, axle along X) | `GroundEquipment` | the middle of its bogie on the ground (34, 92.45, 0); kingpin 21.45 ft (6.538 m) ahead | drives behind the tractor: its bogie's route is the tractor's worked through as a trailer follows one (always heading for the kingpin: a tractrix), so the two stay coupled | the same | the same | the same. Coupling checked in the browser at 10 points along the slider: kingpin to fifth wheel 1.9 cm at worst, both ending square |
| `GroundEquipment_Hut1`, `_Hut2` | `GroundEquipment` | their middles | slide out along +X (viewer +X) on their skids, standing on what is under them (`runs`) | 72 m | 0.03 to 0.11 and 0.06 to 0.14 (06:07 to 06:37: the second is still going as the structure starts) | estimated: nothing records how the huts were moved, or that they were |
| `GroundEquipment_Tow1`, `_Tow2` (to the vehicle contract) | `GroundEquipment` | under the rear axle, (104.5, 29.5, 0) and (104.5, 44.5, 0), facing +X | drives straight ahead with its hut on a chain behind it | 72 m | with its hut | estimated: a half-ton pickup is the least that could drag a hut; its make is from no photograph |
| `GroundEquipment_Shower` (21 July) | `GroundEquipment` | its middle, beside the structure's base at (18, −3.5) | slides along −Y to the pad's north edge, then along it (−X) to where May's photographs have it stowed, (−58, −91) | 26.67 m, then 23.17 m | 0 to 0.03 and 0.03 to 0.06 (T−85, 04:35) | that it was disconnected and stowed for launch at T−85: documented (TM X-53107 p. 7-27); where to: estimated |
| `GroundEquipment_TransferVan` (wheels `…_TransferVan_Wheel_1..4`, axle along X), from July | `GroundEquipment` | the middle of its bogie on the ground, (24, 18.55, 0); kingpin 18.45 ft (5.624 m) ahead | drives straight ahead (+Y, the way it faces) along the track's blockhouse side | 82.6 m | 0.04 to 0.125 (T−80, 04:40) | that it was moved to its launch position at T−80: documented (TM X-53107 p. 7-28); where that was, and the route: estimated |
| `GroundEquipment_VanTractor` (to the vehicle contract), in `GroundEquipment_VanBay` at (24, 36.67, 0) turned +90° about Z | `GroundEquipment_VanBay` | the ground under the middle of its tandem, 4 in behind the kingpin | drives straight ahead in step with the van | 82.6 m | the same | the same |
| `GroundEquipment_TransferVanSteps` | `GroundEquipment_TransferVan` | the top of the steps at the rear door's sill, (24, 13.9, 4.35) | turns about Blender +X | −95°: folds up before the van moves | 0.03 to 0.038 | estimated |
| `CherryPicker_Mast`, `_Jib`, `_Cab` (21 July) | as above | as above | held from before the slider in the stow's pose (mast +66.81°, jib −71.08°, cab +4.27°, Blender), then raised to the hatch | the stow's angles, back | 0.33 to 0.42 | that it waited folded on its truck with the cab at the tail: documented (FHSU items 443 and 445, 21 July; 544, undated); the angles are the model's stow |
| `ServiceStructure_Platform1_Left`, `_Right` (21 July) | as above | as above | parted from before the slider | 4.5 ft | T−200 | documented (TM X-53107 pp. 7-25, 7-28) |
| `GroundEquipment_Barricade`, `GroundEquipment_Searchlight1..3` | `GroundEquipment` | their middles; a searchlight's at its yoke's foot | none | — | — | their own nodes so that they can be taken away. The searchlights stay: see "Where things stood" and "Lights at night" |

Notes:
- Order of the cherry picker's stow, after the lowering: jib fold (+0.86°), then mast (+66.81°
  about Blender +Y), then the outriggers up, then drive. Its cab hangs off the truck's tail at
  about 5 ft.
- The platform halves clear the vehicle when parted: their inner edges are at ±4.56 ft against a
  booster radius of 2.92 ft and a capsule radius of 3.10 ft.
- Built pose: the clearance check passes at detail 1.0, 0.6 and 0.3.
- Each flight's vehicle was tested against its pad in Blender (BVH overlap, every mesh of the one against every
  mesh of the other) in November 2026, standing turned as its launcher is (55° and 60°): as built, with the
  periscope's door shut and open; the platforms parting in ten steps; the structure rolling away in half-foot steps
  to 40 ft and at 110 and 173 ft, the cherry picker standing by; the cab coming in to the hatch in ten steps and
  going down to the pad in twenty; and each mast falling in twenty steps with the structure at its launch position
  and the cab down, against the vehicle and against everything else on the pad. Nothing crosses anything but each
  mast's pin, which is through its lug on the launcher. Nothing of the pad touches the vehicle: the umbilical stops
  17 mm from the capsule at the receptacle, the booster's steady and its plug plate 18 mm from the skin (11 mm from
  the booster's lettering, which is painted 0.3 in proud under the steady's edge), the
  capsule's mast 27 to 29 mm from the vehicle at its nearest, the closed platforms 94 to 107 mm, the cab at the hatch
  135 mm (MR-3) and 163 mm (MR-4). Fallen, the capsule's mast is 1.5 in off the pad at its lowest and the booster's
  1.7 in; nothing stands within 3 ft of either as it lies.

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
| Launcher support pads | 5.5 ft above the pad | estimated | S63-02651: 4.9 to 6.0 ft (booster 137 px = 70 in). That photograph is of MR-1 on 21 November 1960, not of MR-4 as NASA's archive has it (docs/sources.md): the launcher is taken to be the same one, unchanged |
| Launch ring | about 10 ft across, 3.05 ft opening | estimated | S63-02651 (MR-1, November 1960), 6100884 |
| What turns on the launcher | the table's fin pads and clamps, the tail plugs' housing under fin II and the two cable masts' shoes are built turned with the vehicle (55° or 60°); the four legs, their struts and feet, the deflector and the ground cables stand square to the rails | that the vehicle was turned to its azimuth on the launcher: documented (TM X-53107 7.1.3, L-25: "positioned to flight azimuth"; T−130: "Perform launch azimuth check"). That the table turned on a base that did not, and that the deflector stayed with the base: estimated | the tactical Redstone's launcher aligned "a selected reference fin toward the target" by turning the ring the missile stood on (an Army article on the XM74 launcher by Capt. L. A. Vavra, known from a search result and not read: docs/sources.md). FHSU item 134 shows the deflector and a leg after MR-4 had gone, and nothing of how the table sat on them |
| Scale plate | 13 ft square | estimated | its existence: the museum's caption at pad 6 and the count's weighings |
| Service structure height | 135 ft to the crane's top rail | derived | LC-26 twin "111 feet 9 inches to the top rail" (museum) + "about 23 feet" taller mast (Noble); COE: "towered 140 feet above the launch pad" (NHL p. 3) |
| Mast | A-frame, legs 3 ft square, 21 ft apart at the base, 6 ft at the head | estimated | S61-03158, Hammack Figs 22 and 23, Figure 7-7 |
| Base | girders over each rail pair, 48 ft long; four rail trucks of two axles | estimated (four trucks: museum) | Noble; LC-26 blueprint photograph |
| Level floors | L1 45.6, L2 54.3, L3 64.6 (the white room), L4 76.3 ft | estimated | L3 0.6 ft under the capsule's heat-shield plane (vehicle stations); spacing scaled off Hammack Fig. 22 (L4 +11.7, L2 −10.3, L1 −19.0 ft) and Figure 7-7. FHSU item 468 (19 July 1961, the structure rolled back and parted) gives the same spacing to half a foot: L4 to L3 270 px, L3 to L2 235, L2 to L1 185, which with 11.7 ft for the first are 10.2 and 8.0 ft |
| Platform widths | L1 37 ft, L2 35 ft, white room and L4 27 ft; 22 ft deep | estimated | Hammack Fig. 22: white room 4.6 to 5.5 vehicle diameters; L1 and L2 1.43 and 1.37 times the white room |
| White room | 10.4 ft high, glazed blue-green panels in a white frame | estimated (built Feb to May 1961: documented) | TM X-53107 7.5.1.2; colour from 6100884 |
| Platform cut-outs | L1, L2: 3.6 ft radius (booster 2.92); L3: 3.7 (capsule 3.10); L4: 2.4 (tower). Levels 1 to 3 are cut back further round each cable mast that stands through them, from the mast to the split, each with 0.3 ft to spare: in the half away from the blockhouse (−X) a round bite 0.7 ft in radius for the capsule's pole and its umbilical (levels 1, 2, 3), which stands 3.5 ft from the split just behind the vehicle's middle; in the blockhouse's half (+X), in front of the vehicle, one of 0.57 ft for the booster's pole (level 1), and on level 2 the strip 3.5 by 2.0 ft that the booster's pole, its cooling package and its coiled hose cover, reaching 3.8 ft (MR-3) or 4.3 ft (MR-4) from the split and 6.4 ft in front of the axis. That strip's front and outboard sides are railed, and so is the other half's edge opposite it. Which half is cut for which mast, and where, follows the launcher's turn (`service_structure.inner_edge`, `site.mast_cuts`): until November 2026 both were cut in the −X half, for a vehicle standing square | estimated | clears the vehicle by 0.6 to 0.7 ft. That the floors were cut round the masts follows from where the photographs put the masts; no view shows a closed platform's plan |
| Mobile aerial tower | reach 125 ft | documented | TM X-53107 7.3.3.1 |
| Truck position | tail 63.5 ft from the launcher along +X, the truck's centre line 4.6 ft to the structure's side (+Y) of the launcher's | 65 ft documented (secondary); the 4.6 ft estimated | *This New Ocean* p. 329 (MR-BD stand-in); Figure 7-6 ≈64 ft, and it draws the tower from T−55 some 10 ft to that side of the launcher's line (a mark 2 mm long on a site plan). FHSU item 466 has the jib passing the capsule 3 ft or more from its axis on that side |
| Cherry picker's cab at the hatch | the cab's middle 5.16 ft from the vehicle's axis along +X and 4.6 ft along +Y, its open end toward −X: its sill plate and its near corner post 3.6 ft from the axis (135 and 163 mm from the capsule at the nearest), the hatch's middle 2.1 ft (MR-3) and 2.4 ft (MR-4) from the sill's edge along the hatch's own way out, inside the sill's width. The tower does not face the hatch: it comes in 55° or 60° round from it | that the jib came in from the truck's side, 40° to 60° round from the hatch's way out, with the cab beside the capsule and its end against the cone: documented by photographs. Every distance estimated | FHSU items 466 and 468 (19 July 1961) and 333 (21 July): the jib runs 16° to 22° round from +X where the hatch is at about 60°, and in 333 the cab's faces stand about 45° from square to the hatch. The cab's own form (an open end opposite the jib) is estimated |
| Mast, jib | 70 ft, 72 ft | estimated | sized so the jib alone puts the cab on the pad beside the truck, as at liftoff |
| Capsule cable mast (No. 2) | on the launcher's table 3.55 ft from the vehicle's axis, 115° round from the hatch (anticlockwise from above): 20° from the periscope, on the flag's side of it; on the pad 170° (MR-3) or 175° (MR-4) round from +X, so nearly straight across the rails from the blockhouse's side. A 3.8 in tube from its hinge (5.8 ft up) to 65.6 ft, 0.45 ft over the heat shield's plane, and a release head 0.8 ft tall on its top: 66.5 ft | place round the vehicle **derived** (3.4 to 3.8 ft, 110° to 119°: see "The two cable masts"); on the pad derived with the launcher's turn; the tube's size, the height and the head estimated | FHSU items 466 and 468 (19 July 1961): the pole 8 px across where the booster's 70 in is 136; its top 0.9 and 1.3 ft over the shield. S61-02407 has MR-3's lying about 169° round from +X. It stood on the hardstand 8 ft behind the vehicle until November 2026 |
| Capsule umbilical | strapped up the mast's side to the release head; from the head it rises beside the heat shield's rim and goes up round the cone, under the periscope's open door, to the receptacle at station 31.2 (No. 7) or 32.5 (No. 11), 1.4 ft above the head: about 3 ft of it, 3.1 in across. The receptacle, 135° round from the hatch, is on the down-range side: 190° or 195° round from +X | estimated | item 466 shows a dark arm from the pole's top to the periscope's door, between the flag and UNITED STATES; the colour pad photograph of 21 April 1961 has the umbilical's arm on the same side of No. 7; Shepard, through the periscope: "I saw the head of the boom start to drop away" (Postlaunch Report, 7.1) |
| Booster cable mast (No. 1) | on the launcher's table 3.7 ft from the axis at 241° round from the hatch, 16° past the fin at 225°; on the pad 296° (MR-3) or 301° (MR-4) round from +X, toward the blockhouse. A 6.5 in tube from its hinge to 57.8 ft, 5.5 ft above the foot of the booster's chequered section (station 561.24, 52.27 ft); steadied against the skin by two struts and a shoe just under that foot; outboard of the pole, from 0.4 ft under the foot to 2.2 ft over it, the cooling package, 1.2 ft square: a white round-bottomed vessel under a dark box; a hose coiled behind it to 2.6 ft from the pole; from the package up the pole, over its top in a saddle and in to a plate at the booster 3.8 to 4.6 ft up the chequers, two 3 in air ducts and the boom plug's cable | place **derived** (3.6 to 3.8 ft, 235° to 245°; built at 241°, not the 239.7° of the fit, to clear the launcher's fin clamp as modelled); every size and height estimated | items 466, 468, 333: the pole 13 px across (468); its top 4.7 ft (466) and 6.1 ft (333) over the foot of the chequers; the package −0.5 to +2.2 ft (466), −0.2 to +2.2 (333); the hoses' arch to 5.0 and 6.5 ft and into the booster 2.7 to 4.8 ft up. What it carried: TM X-53107 4.2.3 ("a cooling package mounted on a cable mast": "the coolant container, blower, check valve, vent valve, control box"), T−380 ("Load LN2 boom tank"), T−530 ("booster boom plug"). S61-02407 shows the same head on MR-3. It stood on the hardstand at (−3, −13.5) with a boom at 49.3 ft until November 2026 |
| Floodlights | 40 ft timber poles, six, three lamps each | estimated | FHSU F16_015 and F16_017 (July 1961): timber poles with two or three round floods on a crossarm, standing just off the slab |
| Apron ramp | 14 ft long, down to the road | estimated | the model's pad stands 0.12 m above the viewer's ground |
| Emergency shower | 3.2 ft square, 8.6 ft tall, on a cart | estimated (that it stood at the pad's edge: documented) | GPN-2000-001006 (MR-3, cherry picker at the capsule); KSC-61-4457 (2 May 1961) |
| Trailer "NASA SP-No 1" | 29 by 8 ft, 12.4 ft to its roof | estimated (its lettering and that it stood by the structure's base: documented) | S61-03158 |
| Pad huts | 10.5 by 11 ft and 9 by 9 ft, 9 ft tall | estimated | FHSU F16_017 (July 1961): two huts at the blockhouse side's edge |
| Tractor | an Army 2-1/2-ton 6x6 truck tractor (M275, `vehicles.m275_tractor("olive")`): fifth wheel's plate 52 in up, kingpin 4 in ahead of the middle of the tandem; the trailer's front floor steps up over it to 4.55 ft | see "What towed the trailers: the record" for which figures are documented | FHSU 544: a dark one of the family coupled to SP No 1; that it towed SP-1 off that morning, and its colour, are estimated |
| Pickups that drag the huts | 1957 to 1960 Ford F-100, white, no utility body: wheelbase 110 in (2.794 m), tyre radius 0.361 m; a chain to each hut's skids | wheelbase documented (see "The vehicles"); the rest estimated | no photograph shows how the huts were moved |
| Transfer van, NASA TV No 1 (from July) | a van semi-trailer 26 by 8 ft, its floor 4.75 ft up and its roof 12.85 ft; on its right side a window 2 by 2.8 ft near the rear, NASA and TV No 1 forward of it, a louvred panel 3.2 by 3.6 ft forward of that; a door at the rear with six steps; coupled to a white M275 | that it was a white van trailer so lettered behind a white G742 tractor, the window, the lettering and the louvres, and that it parked beside the structure's base on the blockhouse side with its rear toward the launcher: documented (photographs). Every size estimated, scaled against the tractor (whose dimensions are documented: "What towed the trailers"); that it parked there on the 21st is estimated from the 6th and the 19th | FHSU items 263 (LOD 61-6234, 6 July 1961), 407 (LOD 61-6218, 7 July), 540 (LOD 61-6395, 19 July) |
| Emergency shower's place through a count | beside the structure's base on the blockhouse side, by the booster's tail: (18, −3.5) ft | that it stood there, connected: documented; the place read off oblique photographs, to a few feet: estimated | FHSU items 263, 540, 449 (NASA 61-MR4-83, 21 July); TM X-53107 pp. 7-23 and 7-27: "Reconnect safety shower on west side" |
| Searchlights | three 60-inch drums on yokes on four-wheeled trailers, 8 by 4.8 ft beds, drawn olive; lens 5 ft across; 800 million candela in a beam 1.25° wide (lens extras `candela`, `spread`) | that searchlights and their crews worked the pad at night: documented (TM X-53107 p. 7-21 and 8.3.2; *This New Ocean*); the kind, the number, the places and the beam: estimated. The candela and beam are a figure for the type set down from memory and checked against no source | S61-03158 (MR-3 lit hard from the blockhouse side); FHSU F19_001 (MR-4: two sources at the pad's far edge); F19_008 (a large drum on a four-wheeled trailer) |
| Cherry picker's control station | a grey box at the tail, 2.2 ft wide, on the driver's side; four levers 0.5 ft long, 0.4 ft apart, with a legend plate under each | estimated (that the controls were at the rear: documented, TM X-53107 7.3.3.1) | not in any photograph read |
| Office on the structure's base | 14.8 by 13.5 ft, 8.6 ft tall; windows 3.2 ft square and 6 by 3.2 ft; a desk with chair and telephone, three lockers, a filing cabinet, an intercom panel by the door, a clock | estimated | S61-03158 shows a lit room between the legs; its windows are placed by eye; its furniture is of the period's kind (tools/blender/interiors.py) |
| Ground cables | 3.6 in across, two, from plugs under the ring to junction boxes 37 and 59 ft out | estimated | S61-02408 shows heavy cables lying slack on the slab; their routes and connectors are not recorded |
| Engineering cameras on tripods | four, a 35 mm body with twin drum magazine, turret lens, motor and finder on a geared head, 4.4 ft up on a wooden tripod with a spreader | estimated: of the kind (Mitchell, Photo-Sonics), not any one camera | TM X-53107 7.5.5.3: twenty fixed cameras near the pad; S61-01927 shows tripod cameras |
| Lower blast screen | a face 11 ft long toward the launcher and a return of 7 ft at each end, 4.6 ft high, white, open above and behind | that it stood, its colour, its outline and its panel joints: documented (photographs). Sizes estimated: scaled against the booster's 70 in body, allowing for its standing further from the camera; posts, feet and struts estimated | S61-02407 (ignition), S61-01927, S61-02408; S63-02651 (MR-1, November 1960) |
| Orange tank behind it | 3 ft across, 6.4 ft long, lying on a two-wheeled cart, its top just over the screen | that an orange tank with dished ends lay there: documented (photographs). Size estimated; what it held is not recorded; the cart and every fitting estimated | the same |
| Taller blast screen | a face 16 ft long, returns of 6 ft, 7.5 ft high; a grey switch box 1.6 by 2 ft on its face with a conduit to the pad; three floodlights on a post over its top | the screen, the box and the three lamps: documented (photographs); sizes estimated as above | the same |
| LOX topping trailer | a white tank 5 ft across and 21 ft long with dished heads, on a deck 4.6 ft up and 26 ft long, its top 10.2 ft up | that a long white tank on a trailer stood behind the taller screen, a placard on its side: documented (photographs). That it is the LOX topping trailer of the count is our reading (estimated); sizes estimated; the tandem, legs, vent, valves, gauge board and hose are the ordinary fittings of such a trailer, from no photograph | the same; TM X-53107's count (T−60 s "LOX topping Off"; the trailers secured after launch) |
| Sandbags | a wall 7 ft long, 2.5 ft thick at the foot and 3 ft high, six courses of bags 2.5 by 1.4 ft | that it stood: documented (photograph); size estimated | S61-02407 |
| Chevron drum | 9.2 ft across, 3.9 ft high, black with twelve orange chevrons, 25 ft from the launcher at (−20.5, 14.5) | that a drum so painted stood on the pad near the launcher: documented (photographs); that it is round is plain in S63-02651; size and place estimated; what it was for is not known. It stood at (−20.5, 8) until November 2026, under the line the capsule's mast falls along | S61-01927; S63-02651, which is MR-1 in November 1960 and has it about 30 ft from the launcher on the blockhouse's side: where it stood in 1961 is not established ("What the model gets wrong") |
| Stairs to the base's deck | 3 ft wide, 14 risers of 7.5 in | estimated | GPN-2000-001006 shows a flight at the base; its place on the base is not established |

## Lights at night

MR-3's count ran through the night: Shepard went up at 05:15 and the Sun rose at about 06:30. The
viewer lights the scene after dark from what the models carry (`src/viewer/lamps.ts`): every lens of
material `lamp` (or `lamp-flood…`) becomes a light, the lenses of one fitting one spotlight; a lens
whose node carries `candela` and `spread` (degrees, the whole beam) is a searchlight, a narrow
strong cone; and an empty named `Light_<room>`, carrying `intensity` and `reach` (metres), lights a
room, the three nearest the eye at a time, **at every hour**: a room's lamps are on whenever the
place is manned, and the viewer has no switch for them. A room's `intensity` is in fittings: 1.0 is
one two-tube 40 W fluorescent of the period, about 5,000 lm (estimated: a round figure for the type,
from no catalogue), and the one light stands for all the fittings that light the room and for what
its walls throw back (so it falls off with distance, not its square), hung 2 ft 6 in under the
ceiling so that the ceiling is lit too. The mark carries the count times a constant chosen by eye
(`interiors.FITTING`, 1.65), set so that a firing room under its three fittings reads as lit. What that is on the screen is the viewer's: indoors
its exposure is one value at every hour (rendering.md, "Indoors the eye adapts"). Fittings of `lamp-room` (a room's own fitting, under its
`Light_`, and every fluorescent tube) and `lamp-red` (obstruction lamps) glow and light nothing themselves.

| What | Where, and what the model carries | Confidence | Source |
| --- | --- | --- | --- |
| Floodlight poles | six round the pad (`Floodlights`), three `lamp` heads on each crossarm aimed at the vehicle; four at pad 6 and a two-headed pole by the hut (the pole line along the road carries wires, not lamps) | form estimated, from July | FHSU F16_015, F16_017 |
| Searchlights | `GroundEquipment_Searchlight1` at (72, −82) ft, on the blockhouse side; `_Searchlight2` and `_3` at (−86, −30) and (−84, 45) ft, across the pad; each aimed at the vehicle's middle 45 ft up; lens `lamp-flood-search` with `candela` 8×10⁸ and `spread` 1.25 | that crewed searchlights lit the pad at night: documented. Kind, number, places, aim and beam: estimated | TM X-53107 p. 7-21 ("photo and searchlight crews to clear area") and 8.3.2 (MR-4: the searchlights secured at T−30 "because of interference with telemetry"); S61-03158, FHSU F19_001 and F19_008 |
| Work lamps under level 1 | seven deep dome reflectors hung 1.7 ft under level 1, three under each half (they part with it) and one between the legs behind the vehicle, shining down on the booster | that lamps hung there: documented in the night photographs; number and places estimated | S61-03158, KSC-61-4457; FHSU F20_010 to F20_014 (MR-4) |
| The structure's rooms | `Light_Office` (0.8 of a fitting: a 200 W lamp; 5 m); `Light_Level2Left`, `…Right` (the cabins), `Light_Level3Left`, `…Right` (the white room), `Light_Level4Left`, `…Right` (0.8, 6 m); each under a `lamp-room` fitting | lit windows at night: documented (S61-03158); that the rooms had lamps: documented (TM X-53107); fitting, strength and place estimated. That they burned on the morning itself, with the structure rolled back and nobody in it, is assumed | TM X-53107 7.5.1.8: "Additional lights were provided in the shelter house and on the structure level" |
| Blockhouse | `Light_FiringRoom5`, `Light_FiringRoom6` (3 fittings each, 13 m), `Light_EquipmentRoom` (2, 12 m) among fluorescent fittings; five floodlights on its walls, three on the ready rooms' | that a firing room was lit while it was manned: the museum's photograph of 3 March 1959 shows one at work in daylight with a ceiling fitting alight in the frame; that the count was run from here is the blockhouse's purpose. The fittings' kind (fluorescent strips; the one in the photograph looks like a round fitting), number and places: estimated | the museum, PIONEER_IV_590303_0010 |
| Ready rooms, outbuildings | `Light_ReadyRoom`, `Light_Kitchen` (2 fittings each, 9 m); `Light_Generators` (1, 7 m); `Light_Trailer` (0.6, 7 m: two short fittings in a room 8 ft wide); the two huts and the shed are not gone into and have no light | estimated throughout: that each had a light is the ordinary case, and that it burned on the morning is assumed (the generators ran: someone tended them) | |
| Obstruction lamps | four red at the corners of the crane's walkway, 135 ft up; two at the ends of pad 6's gantry top | estimated: the usual practice for a structure that tall; no photograph shows them or their colour | |

The lights are on whenever the Sun is down, whatever the hour: nothing switches the searchlights
off at a time in the count. For MR-3 it is not recorded. MR-4's were put out in the hold at T−30,
which began at 06:00:36 (derived), 22 minutes after sunrise with the Sun 3.8° up (`src/world`), when
the viewer's lamps have gone out with the daylight anyway: "By this time, it was daylight; and the
lights ... were no longer needed" (MR-4 Results p. 50). So the record and the viewer agree without a
switch. July's photographs show the searchlights as pairs of lamps close together (FHSU items 333,
451, 479, 499: two points of light across the pad from the blockhouse side, and two toward the blockhouse),
which would be two units side by side at each place where the model has one; their number is not
established and the model's three are kept.

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
| `Blockhouse` | blockhouse.py | the arrow-shaped bunker: 2 ft walls round four viewing ports (in each firing room's face one a single bay and one two bays wide; each bay a lower upright light of foot-thick glass and an upper light tilted back from a steel band), the blast door (one leaf open) and its ramp, two firing rooms with consoles and an equipment room, the domed roof and what stood on it (railed antenna stand, whip, wind vane, the telemetry helix and its mesh reflector on a sandbagged tripod), wall floodlights, the roof ladder; round it the shell paving, the concrete walk, a tracking dish (a smooth paraboloid of mesh with its rolled rim, ribs, the feed on three struts, on a turntable and yoke), the drive's banded posts |
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
| Viewing ports | two to each firing room, in its face of the point: one a single bay 5 ft long, one two bays and 8.75 ft long; 4.5 ft high, sill 4.4 ft up. Each bay is two lights: the lower upright, 2.4 ft high; a steel band; the upper tilted back from the band to the head, so that a man at a console looks up through it | the arrangement: documented by the building itself (the 2010 photograph of the pad 5 face) and by HAER's account of Complex 17's ports, of the same pattern (one 8 ft 6 in and one 4 ft 6 in to a firing room, each two lights 1 ft 8 in high, the upper 30° from the horizontal). Sizes and places here: estimated off the photographs; the upper light's slope (about 40°) follows from the 2 ft wall | F16_016 (the pad 6 face in 1961); the 2010 photograph; HAER FL-8-5 p. 46; the museum's photograph of 3 March 1959 (men looking up and out through the upper lights) |
| Their glass | a foot thick in the lower lights | documented for Complex 26's ("three segments of glass, each ... 15 layers of one-quarter inch glass"), which the NHL nomination calls identical; not found for 5/6. The upper lights are drawn 6 in thick (Complex 17's were 4 in of armour glass) | the museum, *Launch Complex 26 Blockhouse* |
| Shutters, periscopes | none | no photograph of 1959, 1961, 2005 or 2010 shows either, and no source mentions them for 5/6 (Complex 17 got periscopes in 1964; the older Complex 3/4 blockhouse had mirrored ports). The model had top-hung steel shutters propped open until this was corrected: that was a misreading of the tilted upper lights | the photographs above; HAER FL-8-5; the museum, *Launch Complexes 3/4* |
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
| Cherry picker's tail | 64 ft on 291° | 65 ft (*This New Ocean* p. 329); about 64 ft, a little to the structure's side of square (Fig. 7-6) | 1 ft | documented |

Placed by eye from an oblique photograph, with no scale but the things round them: each of these
could be 20 to 40 ft from where it really stood, and nothing in the record would say so.

| Thing | In the model | Read from |
| --- | --- | --- |
| Pad 6's gantry | 442 ft on 025°, at pad 6's south edge | F16_017, F19_008 (July 1961) |
| Cable racks | 174 ft on 057° | F16_017, F19_008 |
| Scaffold stair | 203 ft on 072° | F19_008 |
| Shower cart | 108 ft on 058°, at the pad's north edge | GPN-2000-001006 |
| Two huts on the pad | 99 ft on 274°, at the blockhouse side's edge | F16_017 |
| Trailer NASA SP-No 1 | 89 ft on 228° | S61-03158 |
| Cars at the ready rooms | 403 ft on 350° | F16_016 |
| Pole line | 420 ft on 326° at its nearest, along the road behind the blockhouse | F16_016 |
| The two blast screens with their tanks | at the slab's edge on the side away from the blockhouse (model −X): their faces 84 and 86 ft out, the trailer behind the taller reaching the edge; 4 to 50 ft toward the structure's parking place (+Y) | estimated, and **probably on the wrong side of the pad**: "What the model gets wrong". They were placed from S61-02407 taken as a view from the blockhouse's side; it is from the north-east (the scaffold stair), which puts them some 80 to 90 ft out between +X and +Y. 6100884 and S61-01928 (along the rails) agree with either: nothing stands within about 45 ft of the track |
| Sandbags | on the grass 22 ft beyond that edge, 18 ft to the pad 6 side of the launcher's line | estimated from S61-02407 |
| Chevron drum, tripods, camera towers, floodlight poles | on the hardstand, 20 to 110 ft out | the liftoff photographs; none of their positions is recorded |

## What stood when

A builder asks `sitelib.stood(thing, since=, until=, confidence=, source=)` before building anything
that was not always there; a state script (`lc5/model/<date>.py`) or a flight's pad script names
its date, and what did not stand then is left out. Each build prints what it asked and what it
built. There are two states: 5 May 1961 (`1961-05.py`, and MR-3's `pad.py`) and 21 July 1961
(`1961-07.py`, and MR-4's `pad.py`).

| Thing | From | Until | Confidence | Source |
| --- | --- | --- | --- | --- |
| Blockhouse and ready rooms | 1955 | standing today | documented | NHL nomination: built 1955 |
| Pad 6 | 1955 | the slab is there today | documented | the museum: first launch 20 April 1955, last 27 June 1961 |
| Pad 6's square-topped gantry | 1959 | not known; there on 21 July 1961 | estimated for May; documented for 21 July (that it stood at pad 6), estimated (where on the pad) | on pad 6 in 1959 (*A Noble Endeavor* p. 10), on 8 March 1961 (the museum), on 7 July (F19_008) and behind MR-4 as it lifts off (FHSU item 331, LOD 61-6634, 21 July); where on the track it stood on a given day is not recorded |
| Cable racks and scaffold stair north of pad 5 | not known | not known | estimated | seen July 1961 (F16_017, F19_008): assumed for May |
| Cars at the blockhouse | not known | not known | estimated | July's cars in July's places (F16_016): assumed for May, which is certainly wrong car for car |
| Mobile aerial tower (cherry picker) | 24 October 1960 | not known | documented | SP-4001 |
| White room on level 3 | February 1961 | not known | documented | TM X-53107 7.5.1.2: built February to May 1961. Before it, level 3 was an open platform, which is not built |
| Emergency shower on its cart | 2 May 1961 | not known; there on 21 July 1961 | documented | KSC-61-4457; FHSU items 263, 369, 540, 449 (6, 7, 19 and 21 July) |
| …beside the structure's base through a count, until T−85 | July 1961 (seen 6, 19 and 21 July) | not known | documented | the same; TM X-53107 pp. 7-23, 7-27. For May only its stowed place at the pad's edge is photographed, so May's pad has it there from the start |
| Packing case beside the shower | May 1961 | May 1961 | documented (that it stood there in May); estimated (that it had gone) | GPN-2000-001006; nothing stands beside the shower in FHSU items 369, 540 or 449 |
| Transfer van NASA TV No 1 beside the structure's base | July 1961 (seen 6 and 19 July) | not known | documented | FHSU items 263, 540. A van brought Shepard too (04:35 on 5 May): where it parked then is not recorded, and May's pad has none |
| Capsule No. 7 on the booster (umbilical receptacle at station 31.2) | not known | 5 May 1961 | documented | MR-3 Postlaunch Report |
| Capsule No. 11 on the booster (umbilical receptacle at station 32.5) | 30 June 1961 | 21 July 1961 | documented | FHSU item 314 (LOD 61-6091, 30 June: "Capsule checkout on third level, Pad 5 (Caps #11)"); MR-4 Results p. 5: 21 days on the pad |
| Blast screens, the orange tank, the long white tank on its trailer, the chevron drum | November 1960 (seen at MR-1, 21 November) | not known; still there in July 1961 | documented | S63-02651 (MR-1); S61-02407, S61-01927, S61-02408 (5 May 1961); FHSU items 331 and 339 (MR-4's liftoff) |
| Sandbags beyond the slab's edge | May 1961 (seen 5 May) | not known | documented | S61-02407 |
| Trailer NASA SP-No 1 | May 1961 | not known | documented | S61-03158; a white NASA trailer stands beside the structure in July too (F16_017; behind the transfer van's tractor in FHSU item 263, 6 July) |
| Two huts at the pad's blockhouse-side edge | not known | not known | estimated | seen July 1961 (F16_017): assumed for May |
| Searchlights round pad 5 | May 1961 | not known | estimated | that searchlights worked the pad at night: TM X-53107 p. 7-21 (MR-4's count), 8.3.2; MR-3's night photograph S61-03158 shows the pad lit hard from the blockhouse side |
| The M275 tractor at the trailer, the pickups at the huts | not known | not known | estimated | the tractor's kind is photographed coupled to SP No 1 (FHSU 544, July 1961; see "What towed the trailers"); that it stood there in May, and the pickups, are not |

Not dated because nothing is known to have changed between May and July 1961: the hardstand, the
launcher, the masts, the service structure, the track, the road, the cable trenches, the
outbuildings, the pole line. Also seen only in July and assumed for May, without their own entry:
the roof's telemetry helix (F16_015), the striped barricade, the floodlights' timber poles.

### 5 May and 21 July 1961

What the July state builds differently, and what it only says differently. Everything else in both
models is built the same for both dates; where that rests on July's photographs it was assumed for
May, and where it rests on May's it is **assumed unchanged for July** (estimated): the hardstand, the
launcher, the service structure, the blast screens and their tanks (seen again
at MR-4's liftoff: FHSU items 331 and 339; S63-02651, which this record had as MR-4 at ignition, is MR-1 in November 1960), the camera towers, the tripods, the trailer
SP-No 1, the three searchlights' places, the track, road, trenches, blockhouse and outbuildings.
The two cable masts go the other way: their places are July's measurement, built for May too, which
MR-3's photograph at ignition agrees with as far as one view can ("The two cable masts", below).

| Thing | 5 May | 21 July | Confidence | Source |
| --- | --- | --- | --- | --- |
| Capsule's umbilical | ends at No. 7's receptacle, station 31.2 | ends at No. 11's, station 32.5: 33 mm further up the cone. Tested in Blender against each flight's vehicle with the periscope's door shut and open: no mesh of the pad crosses one of the vehicle, and the umbilical stops 17 mm from the capsule | derived, from two estimated stations | the two capsules' spacecraft.md |
| The launcher's turn, and what met the vehicle | the table turned 55° for the 105° azimuth: the masts at 170° and 296° round from +X, the hatch at 55° | turned 60° for the 100° azimuth: the masts at 175° and 301°, the hatch at 60°. The platforms' cuts round the masts move with them (level 2's opening reaches half a foot further from the split); the white room, the lift's door and the cherry picker's cab are in the same places on both days | derived | "Which way round the vehicle stood" |
| Emergency shower | at the pad's north edge from the start | beside the structure's base until T−85, then to the north edge | documented (its place in July, and T−85); estimated (where it was stowed) | above |
| Packing case | beside the shower | not built | estimated | above |
| Transfer van and its tractor | not built: its place is not recorded | beside the structure's base; moved at T−80 | documented (6 and 19 July); estimated (the 21st) | above |
| Cherry picker while the structure stands round the vehicle | mast up, the cab swung clear (estimated) | folded on its truck, the cab at its tail | documented | FHSU items 443, 445 (21 July), 544 (July, its date not on the print) |
| Level 1's platform as the pilot goes aboard | closed; first to part on the slider | already parted (T−200) | documented for MR-4's count; the same count would have had it open on 5 May, which May's slider does not show | TM X-53107 pp. 7-25, 7-28 |
| When the trailer SP-No 1 leaves | while the platforms open (estimated) | at T−80 with the transfer van: "Move spare parts trailer", which SP is taken to stand for | documented (that a spare parts trailer moved at T−80); estimated (that SP-No 1 is it) | TM X-53107 p. 7-28 |
| Searchlights | on through the night; when put out not recorded | put out in the hold at T−30, 06:00, in daylight | documented | MR-4 Results pp. 6, 50 |
| Pad 6's gantry, the cable racks, the scaffold stair, the cars | built from July's photographs, assumed for May | the same things, told as seen in July; the gantry documented at pad 6 on the day | as "What stood when" | F16_015 to F16_017, F19_008; FHSU item 331 |
| The sky | a tenth of cumulus at 720 m on a breeze from 090°, an eighth of altocumulus at 3,600 m, the air clear | an eighth of cumulus at 510 m on a light wind from 200°, two eighths of altocumulus at 5,400 m, a veil of cirrostratus over the whole sky; the light dimmed and softened under it | documented (each layer's cover, the lower two heights, the wind); estimated (the veil's height and thickness, visibility past the stations' limits) | each flight's `weather.ts`; "The land", below |

The sky is not in either model: it is the viewer's, drawn from the flight's own weather.

`1961-07.glb` therefore holds the same geometry as `1961-05.glb` (its levels of detail change at the
thresholds measured for May's, copied to `1961-07.lod.json`); it differs in what its things say of
themselves when pointed at. It is a state of its own so that the next thing learned of July has
somewhere to go.

Seen in July's photographs and not built, for either date: the tail heater and its duct at the
booster's tail through the night (FHSU items 447, 451, 497; brought in at T−200, removed at T−45);
the LOX trailers proper, a long white tank on a semi-trailer behind a dark tractor (item 475; removed
at T−135, before the slider begins); the canvas weather cover round the booster's tail and the
enclosure put round the escape tower on 20 July (items 499, 460); the M-113 rescue carrier (item 369,
7 July: lettered FB-USAIS X1273); a 1961 Ford sedan and a NASA pickup on the pad (items 462, 468);
a small caravan at the pad's west edge (item 333); netting hung on the cherry picker's cab (items
333, 443, 445); a scaffold tower with floodlights at the pad's edge (items 466, 475, 544), which may
be the scaffold stair of the place's `Yard` seen from the pad; four white tubes about 8 ft long and
18 in across, each standing in the pad about 7 ft from the launcher's centre and leaning away from it
(items 118, 126, 134, 333, 466, 468; one shows in S61-02407, so they were there in May: what they
were is not recorded); the trestle the fallen capsule's mast lay on, and the cord that pulled it over
(items 118, 333).

### The two cable masts

Until November 2026 the capsule's mast stood on the hardstand 8 ft behind the vehicle and the booster's 14 ft in
front of it with a boom at 49.3 ft, both placed before July's photographs were read. They now stand where the
photographs put them: **hinged on the launcher's table, close against the vehicle**. They are placed round the
vehicle (`lc5/site.py`, `MASTS`: degrees from the hatch's middle, anticlockwise from above, as the capsules' own
azimuths are) and put on the pad by the launcher's turn (`site.aim`: the next section), so they stand turned with
the vehicle and the umbilical meets its receptacle.

**Where.** Three photographs show the vehicle with the structure rolled back and both masts standing: FHSU items 466
and 468 (19 July 1961) and 333 (21 July). In each the camera's place round the vehicle is read off the vehicle's own
markings (the capsule's paint as the flight's spacecraft.md has it; the booster's fins at 45° + 90°k, each with an
MR-8 plate on its meridian), and each pole's distance to the left or right of the vehicle's axis is measured against
the booster's 70 in body:

| Photograph | Camera, degrees round from the hatch | Read from | Booster's mast | Capsule's mast |
| --- | --- | --- | --- | --- |
| 466 | 151 ± 4 | the flag (106°) 45° left of centre; UNITED STATES (178°) beginning at the centre; the periscope's door (135°) 16° left; an MR-8 plate 15° left | 3.7 ft right, at the limb | 2.1 ft left, in front of the vehicle |
| 468 | 232 ± 5 | UNITED STATES' right end 26° left of centre and its left end at the limb; a fin edge-on 3° left; the plate 11.5° left | 0.49 ft right, in front | 3.15 ft left, outside the limb |
| 333 | 312.5 ± 3 | LIBERTY BELL 7 (315°) 3° right of centre; a fin edge-on 2° right; the plate 3° right | 3.5 ft left, outside the limb | not seen: behind the vehicle |

A point p is seen p · (−sin a, cos a) to the right of the axis from a camera at a. That is linear in p, so the three
readings of the booster's mast and the two of the capsule's are solved by least squares: the booster's at 239.7° and
3.67 ft, the capsule's at 114.7° and 3.55 ft. Moving the cameras through their doubt moves the booster's between 235°
and 245° and 3.6 to 3.8 ft, and the capsule's between 110° and 119° and 3.4 to 3.8 ft. Both are **derived**. The
booster's is built at 241°, inside that, so that its foot clears the launcher's fin clamp as modelled.

Not used in the fit, and agreeing with it: in 468 the booster's pole stands 0.85 ft to the right of the fin that is
edge-on to the camera, which at 3.7 ft is 11° to 15° past that fin; in FHSU item 241 (the structure round the vehicle
on 19 July, its platforms parted, seen from in front; camera 191° round from the hatch by the capsule's UNITED
STATES) the booster's head is 3.0 ft right of the axis, where 241° and 3.7 ft put it 2.8, and a thin pole stands at
the left limb, where the capsule's would be 3.4 ft left; in 333 a thin line slants from behind the vehicle, at about
the foot of the chequers, to the pad some 16 ft to the right, which is where a cord from the hidden capsule's mast
to an anchor 50 ft out along its fall would be seen (the count's "capsule mast bunge cord", connected at T−45); and
through the periscope, 20° round from where the capsule's mast is put, Shepard "saw the head of the boom start to
drop away" (Postlaunch Report, 7.1).

**Hinged on the launcher, falling straight out**: documented, by photographs. S61-02407 (MR-3 as the engine lights)
has the capsule's mast lying on the pad from the table and the booster's a third of the way over, each in a plane
through the vehicle's axis. FHSU items 118, 126 and 134 ("Post-Launch Damage to Launch Table and Boom", dated July
1961 and 21 July by the catalogue: the launcher after MR-4 had gone) show both lying out from the table: the
booster's foot forked over a lug on the table beside a fin's support, its head and cooling package on the pad; the
capsule's the thinner of the two, its outer end on a trestle. The count has "Cable masts erected" with the booster's
erection on the launcher (TM X-53107, L-25).

**May and July.** Nothing distinguishes the two dates round the vehicle. S61-02407 has both masts on MR-3's launcher
in the same order round the fins (the capsule's between two fins, the booster's just past the next fin round) and the
same head on the booster's; one view cannot place them to better than about 15°, and within that they are where
July's are. One arrangement round the vehicle is built for both dates, and it is July's measurement; on the pad the
two differ by the 5° between the flights' azimuths. S61-02407 is taken from the north-east, about 222° round from +X
(the next section): the capsule's mast lies from the launcher toward the camera and to its left, along about 169°
round from +X, where 115° + 55° is 170°; the booster's leans to the right, as one falling along 296° would.

**What follows for the structure.** Both masts stand through level 1, the booster's cooling package through level 2's
floor and the capsule's pole through the white room's, so the halves are cut back round them ("Platform cut-outs",
above: the capsule's in the half away from the blockhouse, the booster's in the blockhouse's), and level 2's
opening is railed. Level heights were checked against item 468 and left as they
were. That the real floors were cut so is not shown by any photograph read.

Estimated, not measured: the tubes' sizes beyond the poles' widths in the photographs; the hinge's parts; that the
booster's steady is two struts and a shoe; the hoses' number and sizes; the release head's form; that each stops a
finger's breadth off the pad.

### Which way round the vehicle stood

Until November 2026 the model stood the vehicle square to the rails, the capsule's hatch on +X toward the cherry
picker's truck. It did not stand so. **It stood turned to its azimuth**: the hatch's middle 55° (MR-3) and 60° (MR-4)
round from +X toward +Y, anticlockwise from above, bearing 240° and 235° true, with the periscope down range.

**The rule** (documented, and what the model is built from):

- A Redstone had no roll programme. Its LEV-3 autopilot tilted it in a plane fixed in the vehicle: TM X-53107 4.4
  and Figure 4-8 ("Plane in which tilting occurs", "Direction of flight"); the flight sequence (Table 3-1 as the flight's
  `flight.ts` quotes it) has a tilt programme and nothing else, and a roll of 10° was an abort limit.
- So that plane was laid on the azimuth on the ground: "L-25 Booster arrival and erection on launcher. Cable masts
  erected, vertical alignment, and positioned to flight azimuth" (7.1.3); "Check azimuth alignment of LEV-3" at T−625,
  "Perform launch azimuth check" at T−130 (7.2.3.2). The tactical Redstone's launcher did it by turning the ring the
  missile stood on until "a selected reference fin" lay toward the target (an Army article on the XM74 launcher, known
  from a search result only: docs/sources.md); which fin that was is not in anything read.
- The azimuths: 105° for MR-3 (TM X-53107 7.4.3; the Postlaunch Report's heading at separation, 105.23°) and 100° for
  MR-4 (7.4.3, 8.3.2). TM X-53107 does not agree with itself about MR-3: section 3 and 8.3.2 have the azimuth changed
  "to 102 degrees after the MR-1A launch", which would make MR-3's turn 58°. The Postlaunch Report settles it for 105.
- Which side of the capsule lay down range: after the turnaround, a yaw through 180°, the pilot watched the Earth in
  the periscope with his head up (*Results*, the flight plan). A yaw keeps the same side toward the Earth, so that side
  was underneath going up, and so down range on the pad: the periscope's, 135° round from the hatch's middle, with the
  pilot's feet. The fins are at 45° + 90°k from the hatch, so a fin lies down range with it.

That gives (295° − azimuth) − 135°, the 295° being +X's bearing: **derived**. It would be documented only if a
drawing gave the capsule's clocking on the launcher, and none has been read.

**The photographs**, each read for where the camera stood round the vehicle (by the capsule's own paint and the
booster's fins) and where it stood on the pad (by the rails, the structure, the truck):

| From | Turn |
| --- | --- |
| **MR-4.** FHSU item 306 (F16_017, LOD 61-6084, 3 July 1961, "Pad 5 looking south": from pad 6's gantry straight down the rails, so 270° round from +X, the structure round the vehicle). The booster's UNITED STATES stands 19° to 24° right of the camera's line (its letters' middle 23 to 27 parts in 67 of the body's half width), so it faces 289° to 294° round from +X; it is on a fin's meridian, 222° ± 4° round from the hatch (redstone-mrlv.md) | 67° ± 6° |
| FHSU item 241 (19 July: the structure round the vehicle, platforms parted, seen from in front). UNITED STATES on the capsule is 13° left of centre: the camera is 191° round from the hatch. The gap between the parted halves, whose front edges are 12 ft nearer than the vehicle, stands 2.8 ft right of the vehicle's axis: the camera is about 12° left of the track's line, 258° in the site's frame | 67° ± 7° |
| FHSU item 468 (19 July; camera 232° round from the hatch): the structure's way back (+Y) is 150° to 160° round from the camera, so 22° to 32° round from the hatch | 58° to 68° |
| Items 466 and 468: the truck is 297° to 322° round from the hatch. If it stood on +X that is 38° to 63°; Figure 7-6 draws it about 9° round toward +Y, which would make it 47° to 72° | 38° to 72° |
| Item 333 (21 July; camera 312.5°): the truck is about 30° left of the line of sight, so about 282° round from the hatch (two days later: parked afresh) | about 78° |
| FHSU item 331 (MR-4 lifting off, seen from 103° to 113° in the site's frame: pad 6's gantry behind and to the right, the cherry picker to the left): a UNITED STATES on the booster faces the camera | 58° to 68° |
| FHSU item 134 (after the launch, looking along the rails at the structure): the booster's mast lies out from the launcher toward the camera and to the right, between −Y and +X; it fell along 241° round from the hatch | 30° to 120° |
| **MR-3.** S61-02407 (as the engine lights). Its camera is on the scaffold stair north-east of the pad, about 222° round from +X and 31 ft up (the truck is to the right and beyond the vehicle, the shadows fall to the right and away at 09:34, the pad's joints run down to the right; the horizon and the vehicle's height put the eye 29 to 31 ft above the pad; the stair is at 203 ft on 072° true, which is 223°). The capsule's mast lies from the launcher toward the camera and to the left, along about 169° round from +X; it stood 115° round from the hatch | 54° ± 10° |
| The same: MR-7 plates on two fins' meridians, 27° left and 64° right of the camera's line: fins at 195° and 286° round from +X, where the 105° azimuth is 190° | 60° ± 8°, a fin lying down range with the periscope |
| The same: Freedom 7's UNITED STATES is 7° to 9° right of centre, which by the capsule's paint as modelled (its middle 186° round from the hatch) puts the camera at 178° | 44° ± 12° |
| **The rule**, the periscope exactly down range | 55° (MR-3), 60° (MR-4) |

**Where they disagree.** MR-4's photographs centre on about 64°, four degrees more than the rule, and none is good to
better than six; the truck's lines are the loosest, because where the truck stood on those days is itself not
measured. For MR-3 there is one photograph: its masts and fins agree with the rule, and its capsule's lettering says
11° less. That last leans on where UNITED STATES is painted on the model of capsule 7, 51° from the periscope, where
capsule 11's is 43°: if No. 7's were painted as No. 11's the line would read 52°. So nothing contradicts the rule,
and the model is built to the rule, not to the photographs' mean.

**What was built from it** (November 2026):

- The vehicle stands turned in the scene by the flight's own angle (`rotationY` in its `flight.ts`, worked from its
  azimuth by `launcherTurn` in lc-5.parts.ts), the capsule's own model unchanged (its hatch on its own +X).
- The pad is built for the flight's azimuth (`lc_5.build(date, azimuth)`; `site.aim`). Turned with the launcher's
  table: the fin pads and clamps, the tail plugs' housing, the two cable masts, their shoes and their fall, the
  capsule's umbilical and its way round the cone. Not turned: the launcher's legs and deflector (estimated: "What
  turns on the launcher", under Dimensions), the rails, the structure, the truck.
- Fitted to where things then are: the platforms' cuts round the masts and level 2's railed opening ("Platform
  cut-outs"); the cherry picker's truck and its cab at the hatch ("Cherry picker's cab at the hatch"); the chevron
  drum, a tripod camera and the two DANGER boards, moved out of the masts' and the truck's way; the pilot's place on
  the pad in the flights' data. The white room needed nothing: the hatch now looks at the wall its door from the
  lift is in.
- In flight: the body's axes are put on the model by its stance on the pad (`viewer/ascent.ts` `bodyFrame`), so the
  attitude jets, the cabin's attitude needles and the periscope's view follow the turn with no change of their own:
  pitched over on its azimuth the periscope is underneath and the roll needle reads nought going up, where it read
  55°. The side the automatic control keeps toward the Earth (`earthward`) is the down-range one, 180° from the
  body's +Z, and the turnaround is the record's yaw, flown live and in the record's own flight as the scene plays it
  (docs/agents/simulator.md). tests/launcher.test.mjs holds the
  vehicle's turn, the launcher's, the masts' places and the periscope's bearing to one another for each flight.

**The same photograph moves other things, which are not moved.** S61-02407 was taken, in this record, to be a view
from the blockhouse's side across the rails, and the two blast screens with their tanks were placed from it on the
far side, −X. Seen from the north-east they are beyond the vehicle and to its right with the truck further right
and nearer: some 80 to 90 ft out between +X and +Y, on the blockhouse's side of the rails toward the structure's
parking place. FHSU item 333, taken from the truck's side, shows nothing of them beyond the vehicle, which agrees.
S63-02651 (MR-1, the same camera place) has them there too, and the chevron drum about 30 ft from the launcher on
that side. They are still built on −X: "What the model gets wrong".

## Getting about on foot

The viewer's walker is 0.26 m in radius and 1.89 m tall, steps up 0.3 m, climbs any mesh marked
`climb`, opens any node marked `door` and rides any node marked `lift` (the three marks are set by
`tools/blender/sitelib.py`, which documents them; they travel as glTF extras). So everything a
person could go up has a continuous way from the ground to its top. Where the record shows how
people went up, that is what is built; where it does not, the usual arrangement for that kind of
structure is built and labelled estimated.

| Structure | Way up, from the ground | Basis |
| --- | --- | --- |
| Service structure: the lift | **an open cage of mesh panels**, boarded from the pad by two steps on the blockhouse side, outboard of the base. It rides the outboard face of that side's leg (`ServiceStructure_Lift`, origin at its floor's middle, built at the pad). Stops: the pad, levels 1 to 4, and the landing under the crane, at 0, 13.19, 15.84, 18.98, 22.55 and 33.44 m above the pad stop, each 0.2 to 0.7 m further in than the last as the leg leans | **documented**: that there were lifts ("elevators on each side", Noble's plans; "Elevators traveled up and down the mast, with stops at various work-levels, to a 15-ton hammerhead crane", Corps of Engineers history, both in *A Noble Endeavor*); that Shepard used one (NASA caption 71P-0270: "makes his way from the elevator to the cleanroom"; *Results* p. 77: "0515 ascend gantry"); the car, its mesh, its canopy and that it was boarded from the pad (FHSU F19_051, MR-4's egress exercise; NASA 61-MR4-45). **Estimated**: that it rode the leg's face (no photograph shows its guides), its size (4 by 2.9 by 7.2 ft), where it stopped, which side Shepard rode |
| …from the lift into each level | level 1: straight on to the open deck. Levels 2, 3 (the white room) and 4: a door in the level's back wall where the car stops (`…Platform2_Right_LiftDoor`, `…Platform3_Right_LiftDoor`, `…Platform4_Right_LiftDoor`), opening inward | GPN-2000-001012 shows Shepard stepping through a narrow doorway into the white room: documented that there was one; its place estimated |
| …round the opening in level 2's floor | where the booster's cable mast stands through it with its cooling package: a rail along the opening's front and far sides on the half that is cut, and along the other half's edge opposite | estimated: the opening follows from the photographs' heights (lc-5.md, "The two cable masts"); no view shows its edge or a rail |
| …between the two halves of a level | a deck between the legs behind the vehicle, at every level | at level 1: documented (a catwalk with chain rails joins the halves; the 21 April egress-test photograph, 61-MR4-65). At the other levels: estimated |
| …to the base's deck | stairs from the pad at the outboard end of the base on the blockhouse side, descending away from the vehicle: 17 risers of 7.1 in, going 11 in, 3 ft between the rails | documented (61-MR4-45; FHSU F19_004) |
| …up without the lift | **ladders up the blockhouse side's leg in stages**, each run from one small railed landing behind the leg to the next: base deck to level 1 (36 ft), then to levels 2, 3, 4 and the landing under the crane at 112 ft | ladders in stages on the legs' outboard and rear faces with small landings: documented (F19_004, 61-MR4-45: an uncaged ladder from the deck to the lowest platform). Which face, the landings' sizes and that they stand at the levels: estimated. The real top run had safety hoops; none is built |
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
coast (below) so the two agree to tens of metres. Port Canaveral's harbour, 3.3 km south of the pad
and open since 1953, is drawn as two straight-banked reaches of still water (`HARBOUR` in
cape1961.ts): the entrance channel from the sea to the dike that closed it from the Banana River,
and the one turning basin north of it. Their lines are read off the globe's coast; that this was
the harbour's extent in May 1961 is estimated. No jetties, wharves or sheds are drawn, and the
beach's sand and surf stop at the channel's banks without the works that held them.

**One coast from every height.** The globe's map (below) is the coast seen from above, and the
ground drawn round the pad is its own from the ground. Between 3 and 20 km up, and across the last
1.5 km of the ground's square, the one is handed over to the other, and the shore is a single line
moved from the ground's to the map's (`beyondShore`, land.ts and globe.ts), never the two seen
through each other. What the ground does not draw at all (the spoil islands in the rivers, finger
canals, ponds) comes in late in that hand-over, each growing from nothing.

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
| Port Canaveral's Trident basin | late 1970s (the Navy's, for Trident submarines) | land | that it is later is documented (Space Coast Daily, *Brevard History: A Growing Port Canaveral*); the year and the outline filled are approximate |
| Port Canaveral's west turning basin | dredging allowed by the state in 1979 | land | the 1979 permit is documented (the same history); that none of it was open water in 1961 is estimated |

Kept, because they stood in 1961: the SR 520 causeways (1941), Port Canaveral's entrance channel and middle basin (1953; today's outlines),
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
| The breeze the plants move in | the day's wind at the ground, from the flight's own weather: on 5 May from 090° at about 10 knots; on 21 July from 200° at 4 knots, so they barely stir | documented: the Skid Strip's observations at 09:00 EST on 5 May and 07:00 EST on 21 July | NOAA ISD 74794012868; each flight's `weather.ts` |
| Colours of sand, grass, leaf and litter | as in `cape.ts` | estimated from period colour film, which has shifted | the photographs above |
| The lie of the land | the complex's ground (y = -0.12 m in the viewer) taken as 9.5 ft above NAVD 88; the sea's surface 2.9 m below it; inland, old beach ridges and swales about 110 m apart and half a metre deep; the foredune's crest about 1.9 m above the sea, 45 to 62 m inland of the waterline; the beach face rising 1.35 m in its first 30 m to a berm | heights derived from today's survey (USGS 3DEP along 28.4394° N: ground near Complex 5 about 9.5 ft, dune crest 6 to 8 ft about 60 m from the water); the ridges' spacing read off the 1950 aerial; that 1961's ground was the same as today's is assumed | USGS 3DEP; USGS aerial 1950 |
| Level ground | exactly level at the complex's height over Complex 5/6's clearing and roads and within 85 m of every other complex's pad, easing to the natural lie over 40 m | a rule of the viewer (the models stand on a flat datum), not a survey | |
| Beach and sea | beach 40 to 50 m from the waterline to the dune, with a wrack line 17 m up; the bed falling 2.2 m in 100 m with a bar 75 m out; a swell of 55 m crests every 7.7 s, about 1 m crest to trough offshore, breaking on the bar and at the shore, so two lines of breakers | the swell's period and height documented as May medians (NOAA buoy 41009, 2010 to 2019); two lines of breakers read off KSC-61C-0873 and 63PC-0033; the bed's slope, the bar's place and the beach's width estimated | |
| The Banana River's water | flat, grey-green, with a marsh edge | its shore documented (OpenStreetMap, today's); its colour and the marsh's width estimated | |
| The Banana River's width, Merritt Island, the Indian River | the river between its two shores (5.7 km wide abreast of pad 5, 1.7 km 12 km north), Merritt Island's land west of it, the Indian River in the ground's south-west corner | documented, today's (OpenStreetMap relation 1204544, the Indian River Lagoon, traced every 300 m to 1.8 km) | Today's port, causeways and the barge canal (cut 1962 to 1965) are stepped over, not drawn; Sykes Creek inside Merritt Island is left out; the river's bed falls 1.5 m in every 100 from either shore, as the sea's does (estimated: the real river is a metre or two deep) |
| The air | the day's, from the flight's own weather: haze thinning with height (src/viewer/air.ts), so a distant tree line fades from the ground; from above, the air itself (src/viewer/atmosphere.ts: Rayleigh, this haze, ozone, light scattered many times). On 5 May 80 km at sea level, thinning over 1.4 km; on 21 July 40 km, thinning over 1.0 km, and whitened under the veil | that each morning was clear at the ground is documented (visibility at the Skid Strip's 16 km limit on both, and at Patrick's 24 km limit on 21 July); how far past the limit, and the haze's profile, are estimated (5 May: clear air, chosen so the coast and the far complexes read; 21 July: half of that, the air being humid, dew point 23.3 °C under 25.5 °C) | NOAA ISD 74794012868, 74795012867; each flight's `weather.ts` |
| The cumulus, 5 May | flat-based at 720 m, tops to 650 m higher (heaps of 250 m, a few towers of 500, scraps), a tenth of the sky, standing in groups with clear air between, some growing and hard-edged and some fraying, drifting west with the 090 wind, their shadows on the ground | 1/10 cumulus at liftoff (preferred to the station's "scattered" at 09:00), no ceiling, and the 720 m base (May mornings' median, 1959 to 1963; 750 m at 07:00 that day) documented; depth, size and the wind aloft estimated; where each cloud was, how they were grouped and which were growing or going are not known (estimated: src/viewer/air.ts, clouds.ts); how a cloud is lit is a model fitted by eye to photographs of trade-wind cumulus, in the scene's own Sun and sky | MR-3 Postlaunch Report 10.3, p. 87; NOAA ISD; Kraft, p. 8; the flight's `weather.ts` |
| The sky, 21 July | an eighth of cumulus with bases at 510 m, drifting north-north-east on the wind from 200°; two eighths of altocumulus at 5,400 m; over all of it a veil of cirrostratus, the whole sky, at 10.5 km: milky, the Sun's disc and a glow through it, whiter toward the horizon. Under it the Sun's light is a little over half what it would be at that height (0.57 at liftoff, the Sun 20.6° up), the shadows are softer, the sky's own light is more, and the haze is whiter. The veil is lit pink before the Sun is up on the ground | the three layers, their covers, the two lower heights and the wind documented (the Skid Strip, 07:00 EST: one, two and eight oktas; "sky covered, no ceiling"); the veil's height (not recorded) and its optical depth (0.4: a thin layer by the report, so under 0.7) estimated; what it does to the light is a stated rule, estimated (src/viewer/day.ts: `veilShade`); the cumulus's depth and size as 5 May's | NOAA ISD 74794012868, 12:00 UTC; *Results of the Second U.S. Manned Suborbital Space Flight*, p. 50; the flight's `weather.ts` |

A thicket far from the eye is drawn as the ground itself lifted into a roof of crowns, not as
plants (`land.ts`); within about 60 m of the eye the plants stand on the ground one by one.



## Sources

TM X-53107 sections 4.2.4, 4.8.9, 7.1 to 7.5, Figures 4-25 and 7-5 to 7-11; Hammack & Heberlig (ARS
1961) pp. 19 to 22 and Figures 22 and 23; *Results* p. 77 and Fig. 1(a); the MR-3 Postlaunch Report;
SP-45 Fig. 4-9; *This New Ocean* pp. 314 and 329; the NHL nomination 84003872 (quoting the
Corps of Engineers history); the Space Force Museum's *Noble Endeavor* and LC-26 gantry pages;
OpenStreetMap; NASA photographs S61-03158, 6100884, S61-01927, S61-02407 and S61-02408,
S63-02651 (MR-1, 21 November 1960: NASA's archive has it as MR-4), S63-22731, GPN-2000-001006, KSC-61-4457. For 21 July: *Results of the Second U.S. Manned Suborbital Space
Flight* pp. 6, 31 and 50; TM X-53107 7.2.3.2 (the countdown) and 8.3.2; the FHSU Project Mercury collection's prints of MR-4's
preparation and launch, by item number as its catalogue has them. For the rest of the complex: the NHL
nomination's item 7; the museum's *Launch Complex 26 Blockhouse*, *Launch Complex 5/6* and *Launch
Pads* pages and its dated photographs; the FHSU Project Mercury collection's July 1961 prints
F16_015, F16_016, F16_017 and F19_008; Wikimedia Commons photographs of the blockhouse (2005, 2010)
and of Complex 26's; OpenStreetMap. Details in [docs/sources.md](../../../../docs/sources.md).

## What the model gets wrong or leaves out

- **Port Canaveral's harbour is two straight reaches of still water** (the entrance channel and one basin,
  `HARBOUR` in cape1961.ts), round-ended, with no jetties, wharves, sheds or ships, and the beach's sand and
  surf stop at its banks. Near 15 km up its banks show faint second lines, where the ground's marsh tint
  follows its own bank a few tens of metres from the shore the globe's map has. Its extent in 1961 is estimated.
- **What the ground round the pad does not draw comes in from nothing on the way up**: the spoil islands in
  the Banana and Indian Rivers, the finger canals, the ponds on Merritt Island. Each grows in late in the
  hand-over to the globe's map (3 to 20 km up) instead of being there from the ground.
- **From 20 to 70 km the land's colour is soft blotches**: the region's colour map is 450 m a texel (Blue
  Marble, May 2004), and nothing finer is baked.
- **The transfer van is a white box with the photographs' lettering, window and louvres.** Its roof's rounded nose, the unit on its roof, its side
  doors, marker lamps and the legend along its sill are not built; its tractor has no lettering or plate; its size is scaled off the tractor. It is not
  gone into. That it left by driving straight ahead along the track, and stands 80 m down it at liftoff, is ours: its "launch position" is not recorded.
- **The emergency shower is wheeled across the pad in two straight legs** at T−85, with no hose or water line to disconnect; where it was stowed is May's place.
- **Each day's sky is its own, and each is one station's at one hour.** The sky is drawn from the flight's own weather (`weather.ts` beside
  its `flight.ts`): 5 May's for Freedom 7, 21 July's for Liberty Bell 7. It is the sky of the observation nearest liftoff (09:00 EST and the flight's
  own report on 5 May; 07:00 EST on 21 July) for the whole morning: on 21 July the Skid Strip had a ceiling at 3,000 m at 06:00 and none at 07:00, and
  the cloud the count was held 41 minutes for is not shown thicker during the hold than at liftoff. Patrick's five oktas of altocumulus at 4,500 m,
  23 km south, are not drawn: the deck round the pad is the pad's own station's two. The station coded the low cloud cumulonimbus on both days; it is
  drawn as cumulus on both. No halo is drawn in the veil: none is recorded.
- **Only the structure's height and the cherry picker's reach are published.** Everything else is
  scaled off photographs or the site plan:
  - platform levels, widths and depths;
  - rail spacing;
  - truss pattern;
  - launcher size;
  - mast lengths and positions;
  - the "edge of pad" distance.
- **The blast screens, their two tanks and the sandbags are probably on the wrong side of the pad.** They are
  built at the slab's −X edge, placed from S61-02407 when that was taken for a view from the blockhouse's side. It is
  from the north-east ("Which way round the vehicle stood"), which puts the screens 80 to 90 ft out between +X and
  +Y and the sandbags beyond the slab's edge behind the camera's left. The chevron drum is likewise somewhere on
  the blockhouse's side in the one photograph that shows it whole (S63-02651, November 1960), and is built on the
  other, 25 ft out. Nothing was moved across: where each stood wants its own reading of the photographs, with the
  structure's base, the trailer SP-No 1 and the transfer van (which are on that side) in front of them.
- **The cherry picker does not face the hatch.** The truck stands square to the rails and the hatch is 55° or 60°
  round from it, so the cab comes in beside the capsule and the pilot's way out of the hatch meets the cab's sill
  2.1 to 2.4 ft from the skin, at an angle. That is what the photographs of July 1961 show (the jib 40° to 60° round
  from the hatch's way out), but the cab's own form, an open end opposite the jib, is estimated, and no photograph
  read shows how a man got from the hatch into it. **The cab is not where item 466 has it**: seen from 211° round
  from +X the real cab stands whole to the left of the capsule, its near edge at the capsule's limb, which puts its
  middle some 80° to 90° round from +X, past the hatch; the model's is at 42°, hidden behind the capsule from there.
  A truck's line 7 or 8 ft from the launcher's would put it so, but then the hatch looks at the cab's side wall, and
  what door the real cab had there is not known. The truck's place is Figure 7-6's to a few feet; on 19 and 21
  July it stood 16° to 22° and about −18° round from +X, a different place each day.
- **The launcher's legs and deflector stand square to the rails whatever the table is turned to.** That the
  Redstone's launcher turned a ring on a fixed base is how such launchers were made; nothing read shows it for this
  one, or which way the deflector's four faces lay.
- The site's bearing (+X on 295° true) is the rails' line and no more: the turn of the vehicle is worked from it
  and from each flight's azimuth, and is derived ("Which way round the vehicle stood").
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
  beside the fin 45° round from the hatch (100° or 105° round from +X as the launcher is turned). TM X-53107's
  Figure 4-25 draws fin II to the right of fin I as seen from outside, so the fins number anticlockwise from above
  if the figure is a true view; which of them lay down range is not in anything read. The tail-plug cover flaps
  (MR-2) are not modelled.
- The flame deflector's size and shape are guessed: a pyramid, from "four-sided" (SP-4204,
  secondary).
- The cable masts are placed from photographs to about 0.3 ft and 5°, and everything else about them is estimated
  ("The two cable masts"). Each is one rigid piece: the booster's hoses stay as they were plugged in, where S61-02407
  has them hanging in a loop from the pole's top as it falls; the capsule's umbilical is one stiff piece that swings
  over the head. The bungee cord, its anchor and the trestle the capsule's mast came down on are not built, and both
  masts stop just clear of the pad instead. After MR-4 the booster's pole lay bent a third of the way along (FHSU item
  118, "Post-Launch Damage"): it is built straight, as S61-02407 has it. The four white tubes that stood round the
  launcher, between which the masts fell, are not built. On level 2 the floor's opening for the booster's cooling
  package is the strip it covers in plan, railed: ours, to keep the level walkable.
- The cherry picker's make is assumed from photographs. Its mast and jib lengths are chosen to
  reproduce the liftoff pose (cab on the pad on the vehicle's side), not measured. The stowed pose
  and the drive-off are not documented: the liftoff photographs show the truck still on the pad
  with its cab lowered. The mast's rams separate from their barrels when the mast is lowered.
- Ground equipment, camera towers and floodlights are placed where photographs suggest. None of
  their positions is recorded. The blast screens and their tanks are placed from oblique photographs against the slab's edge. The huts, the
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
  wall of sandbags on the grass beyond the slab (S61-02407: five or six courses, about 7 ft long) is
  built; something under a white cover stands at each end of it, and is not: what they were is not
  recorded. To make room, the third searchlight (its place was a guess) is moved 17 ft along the edge.
- **The hardstand is a full 200 ft square, and the photographs agree.** Seen along the rails from
  pad 6's side (6100884, S61-01928), grass begins beyond a straight edge on the structure's side of
  the launcher, which at first sight is close behind it. It is not: the camera looks down at about
  ten degrees, so a foot along the ground is about a sixth of a foot across the frame, and the edge
  works out 80 to 95 ft beyond the launcher (the fins' 12.67 ft span sets the scale: derived, to
  some 15 ft). That is the slab's own edge, 99 ft out. The museum's aerial of April 1965
  (Complex_5-6_650400_0004) shows pad 5's slab as a square with the launcher at its middle and the
  track running on over grass, as does today's outline (OpenStreetMap way 195709355: 198 by 199 ft
  about the launcher). So nothing is changed in hardstand.py; no aerial of 1961 itself was found.
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
- **The weather beyond the Cape is invented, but for what a record says of it.** The cumulus are the day's record
  within 12 km of the pad. Past 40 km the cover is a map made up for a fair morning (`src/viewer/weather.ts`:
  more cumulus inland and over high ground, the sea clear beside a shore, clusters and lanes over the open sea,
  streets along the day's wind, a front a thousand kilometres to the north-west with its cirrus): estimated, all of
  it, and each day's from another part of the same noise. No chart, sounding or reanalysis for either day has been
  read; the day's real weather would replace the map. One map is baked for each day
  (`public/globe/cape-canaveral.<date>.weather.png`). **21 July's has the record in it**: the station's veil over
  the Cape as far as its report holds (60 km, gone by 90: an observer judges the sky down to some ten degrees);
  the pilot's own account from 190 km ("High cirrus blotted out everything except an area from about Daytona
  Beach back inland to Orlando and Lakeland to Lake Okeechobee and down to the tip of Florida. Beyond this the
  Gulf of Mexico was visible": *Results*, p. 37), as high cloud over everything in view but those two stretches;
  and the outlook the launch was decided on (*This New Ocean*, p. 369) for the low cloud: patches of cumulus
  over northern Florida, scattered cumulus over southern Florida and Cuba. The words are the record's; the bounds
  of each stretch and the cover each word is taken to mean (nine tenths for "blotted out", three for "patches",
  two for "scattered") are ours, estimated, in the flight's `weather.ts`. The outlook's "completely obscured"
  for northern Florida is not taken over the pilot's sight of the Gulf coast between Apalachicola and Mobile.
  From the pad the veil's edge toward that clear stretch lies under ten degrees up in the west. The middle deck
  is the day's record round the site (5 May: an eighth of altocumulus at 3,600 m, Patrick, 10:00, NOAA ISD,
  documented for that hour; 21 July: two eighths at 5,400 m) and the map's elsewhere. How it looks is estimated: cloudlets 70 to 220 m across, 120 m
  apart (the WMO Atlas's 1 to 5 degrees from under it), in patches some kilometres wide over 0.3 of the sky, so that
  the cloud itself is the eighth; matched to photographs of altocumulus from airliners on other days
  (docs/sources.md). It is a sheet with a lit, lumpy top and the shadow of each cloudlet on the next, not a volume.
  Its shadow on the ground is its patches' dapple, not its cloudlets' (whose shadows the Sun's disc would blur by
  33 m), and is drawn only once the eye is over 1 km up (all of it from 3 km): from the ground the deck casts no
  shadow on the site. On 5 May the cirrus (the map's own: the record has none at the Cape) casts none on the site's
  own ground, only on the globe beyond it; on 21 July the veil dims the Sun evenly for everything under it, on the
  site and the globe alike, and its streaks cast no shadows of their own. The high cloud's height (10.5 km) and the
  high wind (the way its fibres and streaks lie) are estimated on both days.
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
- Both faces of the point are built alike, from one photograph of each taken fifty years apart. The
  recess in the wall between each port's head and the hood (the 2010 photograph) is not built.
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
- There are no people, no fire trucks and no M-113, and for 5 May no transfer van: where those stood on 5 May
  is not recorded in anything read. July's pad has the transfer van where the photographs of 6 and 19 July have it. F19_008 shows a box-bodied truck on the road beside the
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
  - Only the blockhouse side's lift is built. The plans had "elevators on each side" and the
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

## Open: the capsule's clocking on the booster

`bearingX` (295 degrees true) is the direction square to the rails on the blockhouse's side, and is as good as the
rails' line (derived, within a degree). It is no longer the hatch's bearing: that is worked from it and the flight's
azimuth ("Which way round the vehicle stood"), and is 240 degrees true for MR-3 and 235 for MR-4. What is still
open is the capsule's clocking on the booster, which the rule takes to be the periscope on the pitch plane exactly:
a drawing of the adapter's index, or the Postlaunch Report's roll trace through the turnaround, would settle it to
the degree; the photographs allow about six either way.
