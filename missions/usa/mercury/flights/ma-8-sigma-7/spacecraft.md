# Mercury spacecraft No. 16, as flown on MA-8

What the capsule in [model/vehicle.py](model/vehicle.py) is built from, and how far to trust each
number. Station 0 is the heat shield's maximum-diameter plane and positive is toward the nose
(McDonnell's Z104.50). Angles are round the cone from the pilot's right as he lies: the periscope
is at 90°, under his feet, and the window at 270°, over his head. The drawings are in inches, so
the model is too. The script builds the capsule in that frame and then turns it 45° about its long
axis (`mercury_capsule.stand`), so that in the GLB the hatch is on +X; `flight.ts` quotes its
azimuths in the pilot's frame and adds the turn (`STAND`).

**Confidence**: *documented* is a published figure; *derived* is computed from documented ones;
*estimated* was read off photographs or chosen to look right. The same labels are in
[flight.ts](flight.ts).

**The model is the capsule as launched**: retropack on, tower on, periscope in and its door shut,
the dipole antenna rolled up on its reels.

No. 16 is built from the same places as No. 13 and No. 18, and from nothing copied:

- what every Mercury capsule so far shares: [mercury_capsule.py](../../vehicles/mercury_capsule.py),
  recorded in [Freedom 7's spacecraft.md](../mr-3-freedom-7/spacecraft.md);
- what No. 11 was the first to have (the window, the explosive hatch, the shingles round them, the
  panel): Liberty Bell 7's own script and [mercury_cabin_11.py](../../vehicles/mercury_cabin_11.py),
  called from this flight's script with what No. 16 had otherwise
  ([Liberty Bell 7's spacecraft.md](../mr-4-liberty-bell-7/spacecraft.md));
- what the orbital capsules had (the ablation shield; a striped retropack and the dipole antenna on
  it): [mercury_orbital.py](../../vehicles/mercury_orbital.py);
- what was No. 16's own: this flight's script and [mercury_cabin_16.py](../../vehicles/mercury_cabin_16.py).

## What made No. 16 different from No. 18

The report of the flight says spacecraft 16 "was basically the same as spacecraft 18" and lists
eighty-one changes by system (NASA TN D-4807, pp. 7 to 12), dating many of them (Table IV,
pp. 38 to 40). Those that are a thing one could see are each on a line here; the rest are gathered
by system. The last column says which reach the model.

| What | No. 18 (MA-7) | No. 16 (MA-8) | Confidence | Source | In the model |
| --- | --- | --- | --- | --- | --- |
| Ablation experiment | none | panels of eight ablation materials, 15 in by 5 in, bonded to nine of the twelve beryllium shingles of the cylinder, 23 August 1962 | documented; their thickness, tones and order estimated | TN D-4807, pp. 12 and 75 to 77, Figure 33; NASA SP-12, p. 10 and Figure 1-9 | yes: see "Ablation panels" |
| HF dipole antenna | none | two elements on the retropackage, each a tape 14 ft long and 5/8 in across when out, 28 August; let out by squibs 60 s after separation; a switch to choose it, the bicone or the whip | documented; the units and their places estimated | TN D-4807, pp. 8, 11 and 61, Figures 21 and 22; SP-12, Figure 1-5 | yes, rolled up: see "Retropack" |
| Retropack stripes | (not established) | striped dark on light | documented by photograph; their number and width estimated | NASA GPN-2000-001441; SP-12, Figure 1-5 | yes, on its wall |
| Retrorocket heater blankets | fitted | removed (their wiring disabled 13 June) | documented | TN D-4807, pp. 11 and 38 | neither capsule's model has them |
| White paint patch | on one shingle | "a rectangular white-painted patch", again | documented; its place and size estimated | TN D-4807, pp. 12 and 68 | yes: see "Paint" |
| Three-colour paint patch | none | "a triangular, three-color paint patch ... for postflight thermal evaluation of the paint samples" | documented; where, and which colours, not established | TN D-4807, p. 12 | no |
| Emblem | Aurora 7's | a sigma and a 7 | documented by photograph and by the shingle as kept | see "Paint" | yes |
| Heat shield centre plug | let in; lost | bolted to the structural laminate, 25 June; stayed | documented | TN D-4807, pp. 12, 38 and 67 | the plug is not modelled in either |
| Hand-held camera | a 35 mm Robot Recorder | a Hasselblad 500C, 80 mm f/2.8, 70 mm film in magazines of 45 frames | documented; its measures and the kit's place estimated | TN D-4807, pp. 73 and 88, Figures 28 and 29; NASA SP-45, p. 223 | yes: see "Cabin" |
| Chest mirror | worn | not on him as he went aboard | documented by photograph | NASA S62-06002 | yes: none |
| Leg restraints | fitted | deleted; knee, heel and toe supports added | documented | TN D-4807, p. 12; SP-12, p. 6 | no: the couch is No. 18's, without knee or chest straps |
| Window filter | (a Polaroid filter) | removed | documented | TN D-4807, p. 12 | neither model has one |
| Cabin floodlights | four | two removed | documented | TN D-4807, p. 8 | the model has two, No. 7's |
| Photographic lights | fitted | removed, 25 June | documented | TN D-4807, p. 38 | not modelled in either |
| Cabin barostat for the parachutes | added before MA-7 | removed; the 21,000 ft and 10,000 ft barostats wired in series | documented | TN D-4807, pp. 8 and 69 | no |
| SOFAR bomb | deleted | one, set for 2,500 ft, on the main parachute's riser | documented | TN D-4807, pp. 11 and 35 | no |
| Dye markers | | added to the antenna canister, so that it could be found | documented | TN D-4807, p. 11 | no |
| Pitch horizon scanner's cover | | modified "to provide better thermal protection during the launch phase" | documented | TN D-4807, p. 9 | no: how is not said |
| Thruster heat sinks | fitted | all removed | documented | TN D-4807, p. 10 | no |
| Fly-by-wire | high and low thrusters | a switch to keep the 24 lbf thrusters out of it, 29 June; they came back by themselves at retrofire | documented; where on the panel not established | TN D-4807, pp. 10, 38 and 53 | no |
| Autopilot | | orbit mode's band widened from 3° to 5.5°; an attitude-select switch for 0°, 0°, 0°; rate gyros off in orbit mode unless switched on | documented | TN D-4807, p. 9 | no |
| Panel | | an oxygen partial-pressure indicator; a temperature indicator with a 12-position switch; a solenoid current monitor; arm switches for the retrofire and recovery squibs; the antenna switch; time since retrofire | documented; no figure of the panel read | TN D-4807, pp. 7 to 11 | no |
| Yaw reference | | "a boresight yaw-navigation device", with a cover kept in the panel's compartment | documented; what it looked like not established | TN D-4807, pp. 10 and 89 | no |
| Radiation | four Schaefer packs | two of the four replaced by Goddard emulsion packs; three self-indicating dosimeters in the kit, lithium fluoride ones in the helmet and underwear | documented; where the packs were not established | TN D-4807, pp. 10, 74 and 83 | no |
| Electrical, sequential, environmental, communications | | twenty-five, twelve and nine changes: fuses for switch-fuses, the Zener diode panel out, 15 lb more cooling water, the suit inlet hose shortened from 38 in to 18, one command receiver and the HF rescue set removed, a new helmet microphone, a hand-held transceiver in the survival kit | documented | TN D-4807, pp. 7 to 11 | no |
| Weight | 4,244.09 lb at launch | 4,324.55 lb at launch; 3,028.89 in orbit; 2,732.50 at entry; 2,602.32 at main parachute; 2,441.43 afloat | documented | TN D-4807, Table I, p. 14 | not used |
| Hatch | 70 bolts; never blown | 70 bolts; blown on the carrier's deck | documented | *This New Ocean*, p. 472; TN D-4807, pp. 2 and 69 | yes: 70 bolts |
| Shingle under the window | two stacks of beads | two stacks of beads, eleven in each | documented by the shingle as kept | Commons: *Flown Superalloy Shingle with Sigma 7 logo* | yes: two stacks (the model's has ten beads) |
| Paint | the Aurora 7 emblem; UNITED STATES twice; the white patch | the sigma and the 7; UNITED STATES twice; the white patch | documented by photographs; every place estimated | see "Paint" | yes |

## What is assumed the same

Nothing read says these differed from the capsule named; nothing read says they did not.

| Item | Taken from | Why |
| --- | --- | --- |
| Where the window stands, its plate and rim | No. 11 | NASA GPN-2000-001441 and S62-06175 show the same plate between the same seams |
| Where the hatch is and its two shingles | No. 11 | GPN-2000-001441 has the hatch beside the window on the pilot's right, the second UNITED STATES beginning at its far edge |
| The shingle layout elsewhere (twelve columns, seams at stations 24.8 and 46.8) | No. 11 | S62-06175 and S62-06144 show the two seams running round; see the last section for where it does not fit |
| Where the periscope's door and the umbilical are | No. 11 | no photograph of that side of No. 16 has been read |
| The roll jets, low on the cone | No. 11 | as built for No. 11 "by judgement"; the shingle as kept has two round fittings at its foot marked J37 and J20, not modelled |
| The panel without the Earth-path indicator and the humidity and coolant gauges | No. 18 | the report lists changes from No. 18 and restores none of them: derived |
| Heat shield, recovery compartment, antenna canister, escape tower, pressure vessel | No. 13 and No. 7 | "basically the same as spacecraft 18" (TN D-4807, p. 7) |
| The cabin's lining, couch, controllers, stowage, lights and panel | No. 11 | below |

## Paint

All of it is placed from photographs; none of the places is dimensioned.

| Item | As modelled | Basis |
| --- | --- | --- |
| The emblem | on the shingle under the window, its sigma's upper left corner 2.9 in right of the shingle's corner (255°, station 24.8) and 1.3 in down from it; the outlines are `SIGMA` and `SEVEN` | the shingle as it is kept, photographed square on in colour (Commons: *Flown Superalloy Shingle with Sigma 7 logo, from the MA-8 Mercury Spacecraft*), scaled by taking it as the model's 16.3 in wide at its middle; NASA S62-06002 (Schirra going aboard) for where it sits: the sigma's bar just under the fasteners at the window's foot |
| its sigma | red, edged in cream 0.13 in wide: 7.85 in across and 8.2 in tall, a bar across the top hooked down at its right end, a broad stroke down to the middle, a narrow one back, a bar along the foot with a serif | the same two. Its upper half is plain in both; its lower half has flaked off the shingle and is cut off in the photograph, and is drawn as a printed sigma's would be: estimated |
| its 7 | yellow, edged in white 0.11 in wide: 5.8 in across and 6.6 in tall, lying in the sigma's mouth, its bar a wedge thick at the left, its stem curving down to a foot under the sigma's | the same two |
| their colours | red (0.50, 0.02, 0.014), yellow (0.80, 0.50, 0.03), cream and white | read off the shingle as it is now, scorched by an entry: the red there is a dark brick and the yellow a mustard. What they were when fresh is not in anything read |
| UNITED STATES, second | two lines 23 in long, letters 6 in tall, centred on 20° at stations 38.4 and 31.3: round to the right of the hatch | GPN-2000-001441 (in the hangar: its first letters at the hatch's edge); KSC-62PC-0078 (the liftoff, in colour, above "113 D"). The sizes are No. 18's |
| its flag | 12 by 6.3 in at 28°, station 20.2: under the last letters | both photographs show a flag under the lines there |
| UNITED STATES, first | the same size, centred on 212°: to the left of the window | NASA S62-06144 (on the carrier's deck, after the flight), in which the window is at its right |
| its flag | at 208°, station 20.2 | **not seen**: no photograph read shows under the first lettering. Put where No. 18's was |
| White paint patch | 4 in square, its middle at 191°, station 50.3: above the first UNITED, between its U and its N, above the seam | documented that there was one (TN D-4807, pp. 12 and 68). Its place and size are read off S62-06144, taken from a distance after the flight, in which a pale rectangle with the beads showing through it stands there. The reading is not sure |

Not modelled: the triangular three-colour paint patch (above); the stencils on the shingle under
the window (J37, J20). Not established: what was painted between 60° and 180°. No photograph read
shows that side.

## Ablation panels

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Panels | nine, each 15 in long and 5 in wide, centred on its shingle, its foot at the junction of cone and cylinder | documented | TN D-4807, p. 75; SP-12, p. 10 |
| Materials | eight, from six organisations; elastomers and hard ablators, charring and not | documented; none is named in anything read | TN D-4807, pp. 75 to 77 |
| Cutouts and repairs | "intentional cutouts ... to represent repairs and joints", some filled | documented; not modelled | SP-12, p. 10 |
| Thickness | 0.3 in, with the edges broken | estimated | nothing read gives it |
| Tones | four pale, one grey, four dark | estimated | SP-12, Figure 1-9 and TN D-4807, Figure 33: the ten shingles laid out, in black and white. KSC-62PC-0078 shows one pale panel as a light tan |
| Which shingle carried which | 30°: pale; 90°: dark; 120°: pale; 180°: dark; 210°: grey; 270°: pale; 300°: dark; 330°: pale; 0°: dark. Bare: 60°, 150°, 240° | estimated, but for the pale panel at 30°, above the second UNITED STATES in KSC-62PC-0078 | "two oppositely mounted bare shingles" were instrumented (TN D-4807, p. 75): 60° and 240° here |
| Instrumentation | thermocouples on two shingles; temperature-sensitive paints inside the nine and one bare one | documented; not modelled | TN D-4807, p. 75 |

## Retropack

Built by [mercury_orbital.py](../../vehicles/mercury_orbital.py) (`retropack_stripes`, `hf_dipole`) on the pack
`mercury_capsule.py` builds.

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Stripes | 44 dark stripes 0.7 in wide down the pack's wall, the metal between them left as it is | estimated | counted and scaled off GPN-2000-001441, which shows half the pack square on. That it was striped is documented by that photograph and SP-12, Figure 1-5; the light stripes may have been white paint |
| Dipole tape | 14 ft each side, 5/8 in across, of "specially treated beryllium copper tape" | documented | TN D-4807, p. 61 |
| Dipole units | two, each a plate 4.6 by 5.0 in on the pack's wall carrying a housing, a guide and a reel 3.4 in long | estimated | TN D-4807, Figure 22, a photograph of one element with nothing to scale it by |
| Their places | at 90° and 270°, opposite each other, between the straps; their plates' middles at station −15.2 | estimated | "mounted on the retropackage" (p. 61) is all the report says; its Figure 21 shows the tapes out to either side |
| Deployment | 60 s after spacecraft separation, by squibs; the coaxial cables cut when the pack is dropped | documented | TN D-4807, p. 8 |

## Cabin

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Panel layout | No. 11's, with three instruments blanked, as No. 18's | documented as a drawing of No. 11's; estimated as this capsule's | no figure of No. 16's panel has been read. SP-12 gives none |
| Hand-held camera | Hasselblad 500C; body 3.9 by 3.7 by 3.3 in, lens 2.7 in across and 2.2 in long, magazine 3.6 by 3.6 by 1.9 in; without its folding finder | documented (what it was); estimated (every measure: the type's general proportions, from no source read) | TN D-4807, p. 73 and Figures 28 and 29 |
| Its kit | a pouch 5.0 by 4.8 by 4.6 in, 4.6 in below the hatch's sill at 333°, 4.4 in in from the wall | documented (at the pilot's right); derived (below the hatch); estimated (the pouch and exactly where) | "the special equipment-storage kit at the right-hand side of the pilot" (TN D-4807, p. 88); No. 18's was "to the pilot's right, below the hatch" (NASA TN D-3814, p. 89). It is put between the chest parachute's pack and the suit's hoses as the shared cabin has them |
| What else rode in the kit | two film magazines, the shoulder strap, three dosimeters, the extinction photometer, two food tubes, a motion-sickness container | documented; not modelled | TN D-4807, pp. 88 and 89 |
| Chest mirror | none | documented by photograph | NASA S62-06002 |
| Straps | shoulder and lap straps and toe caps; no knee strap, no chest strap | estimated | as No. 18's. No. 16's leg restraints were deleted and "knee, heel, and toe supports" added (TN D-4807, p. 12): not modelled |
| Hatch | 70 bolts | documented | *This New Ocean*, p. 472 |
| Cabin lights, couch, controllers, stowage | as No. 11's, which are No. 7's | estimated | nothing read |

## The pilot

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| The figure | the Mark IV suit as modelled for Shepard (5 ft 11 in), on the couch, with the tag reading W. M. SCHIRRA | estimated | `crew/mark_iv_suit.py`, unchanged but for the name. Schirra's height has not been found in anything read |
| What his suit had that the model has not | a smaller, single microphone in the helmet; lights on the fingertips of the gloves (he speaks of using them); a cuff for the blood-pressure system with a right-angle adapter | documented; not modelled | TN D-4807, pp. 11 and 61; SP-12, pp. 5, 66 and 104 |

## Parts in the model

Top-level nodes in the GLB. These names are the `node` fields in `flight.ts`.

| Node | Contains |
| --- | --- |
| `HeatShield` | the ablation shield (`HeatShield_Ablator`) and its ring of fasteners |
| `Retropack` | as Freedom 7's, with the stripes (`Retropack_Stripes`) and the dipole antenna's two units and reels (`Retropack_Dipole_*`) |
| `RecoveryCompartment` | as Freedom 7's, with the nine ablation panels (`Recovery_AblationPale`, `Grey`, `Dark`) |
| `AntennaCanister`, `EscapeTower` | as Freedom 7's |
| `Afterbody` | No. 11's shingles, plates, structure, attach ring, periscope, door, umbilical and roll jets, with two stacks of beads under the window; this capsule's lettering, flags, white patch and emblem (`Afterbody_Sigma*`, `Afterbody_Seven*`) |
| `Window` | as No. 11's |
| `Hatch` | as No. 11's, with seventy bolts |
| `CrewCabin` | as No. 11's less three instruments, two straps and the mirror; the camera in its kit (`Camera_*`); Schirra's name on the suit |

The same GLB holds the launch vehicle's seven nodes: [atlas-lv3b.md](../../vehicles/atlas-lv3b.md).

## What the model gets wrong or leaves out

- **The outside is No. 11's with No. 16's paint**, but for the shingle under the window. Its
  window's and hatch's places, its periscope door and its roll jets are Liberty Bell 7's.
- **The shingle under the window is the wrong shape.** As it is kept it is about as tall as it is
  wide (some 18 in each way if it is the model's width), plain foot and all, with eleven beads to a
  stack; the model's, between the same seams as No. 11's and with the plain plate at its foot, is
  16 in wide and 24 in tall with ten beads. So the seam at
  the window's foot is probably lower on the real capsule than station 24.8, and the window and
  hatch with it. The emblem is hung from the model's seam at its true size, and so sits higher
  above the heat shield than it did, and fills less of its shingle.
- **The emblem's lower half is partly guessed.** The foot of the sigma has flaked off the shingle
  and no photograph read shows it whole. Its colours are the scorched shingle's. Its paint stands
  0.1 and 0.17 in off the skin, in two layers; its outlines are straight where a brush's wavered.
- **The white patch is placed from one distant photograph** and may not be it; the three-colour
  triangle is left out, its place unknown.
- **The first UNITED STATES's flag is not in any photograph read.**
- **The ablation panels are plain slabs in three tones.** Their materials are not named in
  anything read, their colours are known only as light and dark, which shingle carried which is a
  guess but for one, and their cutouts, repairs and the two screws through each are not modelled.
- **The retropack's stripes stop at the foot of its wall**; the photographs show them running on
  over its lower end between the nozzles. The light stripes are the bare pack, which may be wrong.
- **The dipole antenna's units are a sketch**: a plate, a housing, a guide and a reel, from one
  photograph without a scale, at places round the pack that nothing read gives. The tapes are not
  shown out.
- **The camera is the type's shape** and its kit a plain pouch, hung where the model has room.
  The kit's other contents, the compartment on the panel and the chart case with what the report
  lists in each are not modelled. The camera stands on the pilot's right, which the gallery's
  cutaway does not open: it is seen from the couch, through the window, or through the hatch's
  opening with the vehicle taken apart.
- **The panel is No. 11's drawing with three blanks.** None of this capsule's new switches and
  gauges is on it, nor the yaw reticle at the window.
- **The pilot is Shepard's figure with Schirra's name.** His height has not been found. There is
  no model of him standing.
- **The heat shield is the heat sink's shape in another material.** Its centre plug and the bolts
  that held it for this flight are not modelled.
- **The periscope's works are No. 11's.** When it moved on this flight is in `flight.ts`
  (`PERISCOPE_EVENTS`): that it drew in at the umbilical's release and again half a minute after
  the retropack went is documented; that it went out at separation is the programme's; the second
  of its going in on the pad, and of its coming out on the way down, are estimated.
- **An unidentified marking is left off the adapter.** KSC-62PC-0078 and the report's Figure 5
  show a white panel with a round badge under it on the adapter, below the second UNITED STATES.
  What they were is not in anything read.
- **No mass properties are used**, though this report gives them (Table I, p. 14).
- Everything listed in [Aurora 7's spacecraft.md](../ma-7-aurora-7/spacecraft.md),
  [Friendship 7's](../ma-6-friendship-7/spacecraft.md),
  [Liberty Bell 7's](../mr-4-liberty-bell-7/spacecraft.md) and
  [Freedom 7's](../mr-3-freedom-7/spacecraft.md) for the parts shared with them.

## Sources

[docs/sources.md](../../../../../docs/sources.md), "Mercury-Atlas 8".
