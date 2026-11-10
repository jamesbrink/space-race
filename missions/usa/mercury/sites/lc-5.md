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

Pad 6 is 520 ft along −Y (025° true); the blockhouse's middle is at about (211, −280) ft. Both are
derived from OpenStreetMap: pad centres (6, −48) and (228, 422) ft in its own frame, blockhouse
centroid (−66, 296) ft. Neither is modelled here.

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
| `Hardstand` | hardstand.py | 200 ft of 20 ft slabs, joints, burn and stain, painted 121 ft circle, four flush rails, scale plate, trench covers, WNW apron, track on ballast and sleepers |
| `LaunchPedestal` | launcher.py | the launch ring, support pads and fin clamps, four legs with struts and jack feet, four-sided deflector, tail-plug housing, two ground cables |
| `UmbilicalMast` | masts.py | cable mast No. 2 (the capsule's), its umbilical to the receptacle, eject line |
| `BoosterMast` | masts.py | cable mast No. 1 (the booster's), cooling package, boom and boom plug, eject line |
| `ServiceStructure` | service_structure.py | base, four rail trucks, office, A-frame mast, platform brackets, elevator, ladder, hammerhead crane; child nodes below |
| `CherryPicker` | cherry_picker.py | International Harvester R-series truck, glazed cab with seat, wheel, dash; child nodes below |
| `GroundEquipment` | ground_equipment.py | LOX topping unit, a second enclosure, chevron box, tripod cameras |
| `CameraTowers` | ground_equipment.py | two lattice camera towers |
| `Floodlights` | ground_equipment.py | six poles, crossarm and two lamps each |

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
| Floodlights | 40 ft, six poles | estimated | photographs |

## Sources

TM X-53107 sections 4.2.4, 4.8.9, 7.1 to 7.5, Figures 4-25 and 7-5 to 7-11; Hammack & Heberlig (ARS
1961) pp. 19 to 22 and Figures 22 and 23; *Results* p. 77 and Fig. 1(a); the MR-3 Postlaunch Report;
SP-45 Fig. 4-9; *This New Ocean* pp. 314 and 329; the NHL nomination 84003872 (quoting the
Corps of Engineers history); the Space Force Museum's *Noble Endeavor* and LC-26 gantry pages;
OpenStreetMap; NASA photographs S61-03158, 6100884, S61-01927, S61-02407 and S61-02408,
S63-02651, S63-22731. Details in [docs/sources.md](../../../../docs/sources.md).

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
  their positions is recorded. The LOX topping trailer's position is unknown.
- The office on the base has no windows. The crane has no operator's cab: none shows in the
  photographs, and the hoist machinery is drawn as a closed house.
- OpenStreetMap shows water-deluge monitors, a fuel-truck revetment and a generator building. Their
  date is unknown and they are not modelled. Neither are the blockhouse, pad 6, fences or roads
  (the viewer's scenery draws some of these).
