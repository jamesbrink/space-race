# Mercury pressure suit (Navy Mark IV)

The suit the Mercury pilots wore: B.F. Goodrich's U.S. Navy Mark IV full-pressure suit, reworked
for the capsule. Model: [mark_iv_suit.py](mark_iv_suit.py), imported by each flight's
`model/crew.py`. It is built as Alan Shepard wore it on the walk to the pad for MR-3, 5 May 1961,
with the portable ventilator standing beside him. The same script also builds him on the couch
(`build_seated`), for a cabin's cutaway; see [On the couch](#on-the-couch).

**It is a backup, not a spacesuit in the later sense.** The cabin held pressure; the suit would
only have inflated, to 4.6 psi, if the cabin had failed. On MR-3 it never did.

**Every length here is an estimate.** The pilot's height is the commonly given one. The
body under the suit follows textbook segment proportions for that height. The suit's bulk, the
helmet, every fitting and the ventilator are sized by eye from photographs. No drawing of the
suit was found.

## Dimensions and facts

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Pilot's stature | 5 ft 11 in (1.803 m) | estimated | widely given for Shepard, and the selection limit; no primary record read |
| Suit mass | about 20 lb (9 kg) | estimated | NASA's MA-8 fact sheet says "20-pound"; Wikipedia says 22 lb |
| Operating pressure | 4.6 psi (31.7 kPa) | documented | SEDR 104 (suit regulator, 4.6 ± 0.2 psia); *Results of the First U.S. Manned Suborbital Space Flight*. The MR-3 Postlaunch Report (5.3.1) says 5.5 psi; 3.7 psi is the generic Navy Mark IV figure |
| Outer shell | aluminium-coated nylon | documented | Wikipedia; NASA fact sheet ("aluminum-coated nylon-rubber") |
| Oxygen in at the waist, out at the helmet | | documented | NASA fact sheet; Wikipedia gives the helmet's right side |
| Visor seal connector by the left jaw | | documented | Wikipedia |
| Entry zipper diagonally across the chest | | documented | NASA fact sheet |
| Which way the zipper runs (left collar to right waist) | | estimated | read off the Smithsonian's photographs of the flown suit (NASM2022-00512, SI-2008-8609), which show it this way round |
| Gloves zipped to the sleeves, no wrist ring (MR-3) | | documented | Wikipedia; rings came with MR-4 |
| Straight middle finger, other fingers curved | | documented | Wikipedia. NASA's sheet says the *left* middle finger only; the model straightens both |
| Biomedical connector flap, right thigh | | documented | Wikipedia. NASA's sheet puts the receptacle "near astronaut's knee" |
| Helmet tie-down strap at the front of the suit | | documented | NASA fact sheet, donning procedure |
| Standing height, helmet and boots | 1.891 m | derived | stature + 2.8 cm heel + 6.0 cm from crown to shell top, both estimated |
| Boot heel | 2.8 cm | estimated | |
| Helmet over the crown | 6.0 cm | estimated | liner, shell and clearance |
| Knee, crotch, hip, shoulder heights | 0.285, 0.47, 0.530, 0.818 of stature, plus the heel | derived | Drillis and Contini's segment proportions, quoted from memory; crotch ratio is a guess |
| Crotch of the trousers | 3 cm under the body's own (84.5 cm) | estimated | a soft suit hangs; chosen by eye against the walk-out photographs |
| Hip joints | 19.2 cm apart | estimated | about 0.72 of the breadth between the points of the hips, as hip-joint-centre regressions have it (Bell and others, 1990), for a man 1.80 m tall; quoted from memory |
| Arm and leg lengths, joint positions | | derived | same proportions |
| Suit girths (chest 39 x 28 cm, thigh 19 cm, upper arm 13 cm across) | | estimated | a 1.80 m man plus about 2 cm of suit |
| Head | 15.2 cm wide, 19.2 cm deep, 22 cm tall before the features | estimated | a textbook adult head |
| Shoulder breadth | 0.51 m | estimated | |
| Stance | ankles 27 cm apart | estimated | pose |
| Helmet shell | 26 cm wide, 30 cm deep, 32 cm from neck ring to top | estimated | photographs |
| Neck ring | 25 cm across | estimated | photographs. The Smithsonian's record gives the flown suit's ring as 9 1/2 in (24.1 cm); the model has not been changed to it |
| Visor opening | 17.6 cm high, about 26 cm round the shell | estimated | photographs |
| Boots | 27 cm tall, sole 31.2 cm | estimated | |
| Boot colour (aluminised) | | estimated | Wikipedia: Mercury boots were white coated leather first, aluminised later; which MR-3 used was not confirmed |
| Glove | hand 20 cm from wrist to middle fingertip | estimated | |
| Pressure gauge on the left forearm | 4.8 cm across | estimated | position and size from photographs |
| NASA insignia on the right chest | worn on 5 May 1961 | documented | NASA photograph S61-02727 (Shepard on the deck of USS *Lake Champlain* after recovery, colour) shows it; the Smithsonian's record of the flown suit (A19770563000) shows the same patch in the same place |
| Name tag under it, "A. B. SHEPARD" | worn on 5 May 1961 | documented | S61-02727 again, and S61-02775 (suited before the flight, the end of the tag in view); the Smithsonian's close-up NASM2022-00514 shows silver letters on dark blue leather |
| No mission patch | | documented | none in any of those photographs. Mercury flights had none: the first crew patch flew on Gemini 5 in 1965, and the "Freedom 7" patches sold since are later souvenirs |
| Insignia size | 3 in (7.6 cm) across the disc | estimated | about 7 cm in SI-2008-8609, scaled from the 9 1/2 in neck ring and foreshortened by the curve of the chest; set to 3 in as a likely made size, not a measured one |
| Insignia position | centre 8 cm to the right of the centre line, 12 cm below the neck ring | estimated | SI-2008-8609 gives 8 cm and 10 cm on a limp suit on a stand; lowered 2 cm to lie on the model's chest rather than on the slope of its shoulder |
| Name tag | 11.5 x 2.5 cm, its centre 5.6 cm below the insignia's | estimated | NASM2022-00514, scaled from the insignia; drawn level, though on the stand it hangs tilted |
| Portable ventilator case | 42 x 16 x 30 cm | estimated | "briefcase-like"; every detail of it is invented to look plausible |
| Ventilator hose | 3 cm across, about 1 m | estimated | |

## Nodes

| Node | What it is |
| --- | --- |
| `Helmet` | white fibreglass shell with earphone bulges, visor and frame, visor pivots, aluminium neck ring, suit outlet low on the right, seal connector by the left jaw; inside it the head, communications cap and lip microphone |
| `Torso` | shell from the waist up with both shoulders (one skin, down to a hem on each upper arm), entry zipper, helmet tie-down strap, waist strap and its buckle, the waist inlet fitting, the NASA insignia and the name tag on the right chest |
| `Arms` | sleeves from the hem down, lacing strips on upper arm and forearm, the pressure gauge and its strap on the left forearm |
| `Gloves` | cuff, palm, four knuckled fingers, thumb and its web each hand; wrist zipper; restraint strap |
| `Legs` | the trousers from the waist strap down: seat, crotch and both legs as one skin; lacing strips on thigh and calf, biomedical flap on the right thigh |
| `Boots` | uppers, tongues, soles and heels, laces on hooks |
| `Ventilator` | case, handle, latches, louvres, hose to the waist inlet |

The suit fabric is `suit-aluminized-nylon`; the viewer adds its weave to any material named `suit*`.
The insignia (`patch-nasa-insignia`) and the name tag (`name-tag-leather`) are each a thin panel
laid on the torso's curve, 1.8 and 1.6 mm proud of the cloth with their edges sunk through it,
carrying a picture drawn by the script (512 pixels across), as the capsule's flags are.

## On the couch

`build_seated(parent, place, prefix)` builds the same figure in the Mercury couch position for a
cabin: every mesh under the caller's node, no ventilator, a stub of hose at the waist inlet. The
figure is modelled standing and carried to the pose by its joints (`SEATED`, degrees): each limb
bends through an arc at hip, knee, ankle and elbow, and what is laid on it bends with it. The
torso, shoulders and upper arms do not move.

| Joint | Angle | Confidence | Basis |
| --- | --- | --- | --- |
| Thigh from the plane of the back | 100° | estimated | chosen to fit the cabin, not taken from a couch drawing |
| Knee | 128° of flexion: shins slope 28° down toward the ankles | estimated | same |
| Ankle | toes drawn 30° up toward the shin | estimated | same; more than a relaxed ankle gives |
| Legs brought together | 4° each | estimated | same |
| Elbow | 21.5° of flexion, hinge turned 20.5° in | estimated | puts the middle of each palm on a hand controller's knob: 27.2 cm off the centre line, 9.3 cm toward the feet from the hips, 14.7 cm above them |
| Forearm | turned 62° palm down, wound into the elbow's folds | estimated | so the palm lies on the knob. On MR-3 the glove could not turn at the wrist; the turn is in the sleeve |
| Grip | fingers flexed about 46°, 56° and 32° at their three joints, thumb brought round | estimated | a hand closed on a knob of about 2.3 cm radius |
| Head | bowed 30° forward inside the helmet, about the top of the neck | estimated | he is looking down his body at the panel, as the on-board view does; the helmet (shell, liner, visor, neck ring) is fixed to the suit and does not move, only the head, the cap and the microphone. `seated_key_points()["eyes"]` is midway between his eyes as bowed, and the cabin puts `Seat_Pilot` on it |
| Seat of the suit | rolled 40° under | estimated | so the seat of the trousers does not stand out behind the raised thighs. From 2 cm under the waist strap down to the crotch the cloth goes over from the pelvis's roll to the thigh's bend, by height |

`seated_fits(y_hip_in, z_hip_in)` gives the smallest gap to a pressure wall of radius
35.97 − 0.364 z inches. **The pose is the cabin's, not the record's**: with the helmet an inch from
the wall (hips 5.0 in off the axis) a 1.80 m man's boots clear it by 0.76 in only in this tight a
tuck. With thighs at 65° to 75° and level shins the toes go through the wall by several inches.
The real couch was moulded to each pilot; its angles were not found.

## Joints

The standing figure can be moved: every mesh of his is skinned to one skeleton (node `Skeleton`
in the GLB, at all three levels of detail). The joints and their names are the same for every
crew figure, so the viewer needs to know nothing about this suit: `srlib.FIGURE` is the list,
`srlib.skeleton` builds it and `srlib.bind` hangs a mesh on it.

**The suit is a garment on a shared body.** What any crew figure has (the body's measures and
joints, the weights, the trunk-and-shoulders skin, the trousers, the hands, the head, the pose
and the seated builder) is `tools/blender/figurelib.py`; this script is Shepard's measures
(`B`, a `figurelib.Body`) and the Mark IV itself: materials, what the cloth does, helmet,
fittings, insignia, boots, ventilator. Vostok's SK-1 is another garment on the same body code.

```
Hips ─ Spine ─ Head
     │       ├ UpperArm.L ─ LowerArm.L ─ Hand.L      (and .R)
     └ UpperLeg.L ─ LowerLeg.L ─ Foot.L              (and .R)
```

- **Names.** The GLB has them as written, with the dot. three.js drops the dot when it loads a
  file: there they are `UpperArmL`, `LowerLegR` and so on (`Hips`, `Spine`, `Head` unchanged).
- **Axes.** A joint has its origin on the joint and no rotation of its own at rest. In the file
  its axes are the model's: +X his left, +Y up, +Z the way he faces. Turning one about its local X
  swings what hangs from it forward and back: **positive is backward** for a limb that hangs
  (a thigh, an upper arm), so a knee bends with a positive turn of `LowerLeg` and an elbow with a
  negative turn of `LowerArm`. Y twists a limb about its length; Z swings it sideways.
- **A stride**, in degrees about X: `UpperLeg.L` −25, `UpperLeg.R` +25, `LowerLeg.L` +20,
  `LowerLeg.R` +5, `UpperArm.L` +15, `UpperArm.R` −15. Moving `Hips` moves all of him.
- **Parts are still parts**: each mesh stays under `Helmet`, `Torso`, `Arms`, `Gloves`, `Legs` or
  `Boots`, and is picked and outlined as before. But a skinned mesh is placed by its joints, not
  by its node, so these parts cannot be drawn apart on a slider. This model has none.
- **The ventilator can be carried.** On 5 May he carried it in his **right hand**, its hose
  hanging in a loop below the case and coming up to the inlet at his left waist (NASA
  GPN-2000-001012, stepping from the gantry's lift into the clean room: the case in his right
  hand, the gauge on his left forearm toward the camera). In the inventory it stands on the
  ground at his left with its hose to the inlet, as before; what the viewer needs to put it in
  his hand is in the file (see [Carrying](#carrying)).
- **The seated figure has no skeleton.** It is carried to its pose once, by `build_seated`.

| Joint | Where (rest pose, cm: his left, his back, up) | Confidence | Basis |
| --- | --- | --- | --- |
| `Hips` | 0, 0, 98.4 | derived | midway between the hip joints |
| `Spine` | 0, 0, 106 | estimated | the waist, just above the waist strap |
| `Head` | 0, 0, 157 | estimated | the base of the neck, inside the neck ring |
| `UpperArm` | ±19.3, 0, 145.6 | derived | the arm's own path at the shoulder |
| `LowerArm` | ±27.4, 0.8, 117.5 | derived | the elbow the sleeve is built round |
| `Hand` | ±30.8, −5.2, 91.2 | derived | the wrist, 5.5 cm beyond the sleeve's end |
| `UpperLeg` | ±9.6, 0, 98.4 | derived | hip height from the segment proportions; 9.6 cm off the centre line is a guess |
| `LowerLeg` | ±12.3, −1.0, 54.2 | derived | knee height from the segment proportions |
| `Foot` | ±13.5, 0.5, 10.0 | estimated | the ankle, in the boot |

Across a joint the cloth is shared between its two sides over a few centimetres (12 at the knee,
10 at the elbow, 5 at the wrist, 9 at the ankle, 14 at the waist). The shoulder is one
skin with the torso: its share of the arm runs from half at the armhole's edge to all of it a
third of the way down to the hem, and the torso gives way for 7 cm round the hole.

**The hip.** From the waist down the garment is one skin (`Trousers`): the trunk, rounded off
underneath, and the two legs run into each other over 2 cm, with a seam of points under the crotch
from front to back, as trousers are cut. It is shared between the pelvis and each thigh across the
line a thigh folds on (`crease`), 5 cm either side of it: in front that line runs up and out from
the crotch toward the point of the hip, as the groin does; behind it lies level under the
buttock, which stays with the pelvis. Under the crotch the two legs have half each, so the seam
stays midway between them as they part. One function of place gives the weights for the shell,
the trousers and whatever is laid on them (`lower_weights`). All of these are chosen to look
right in a stride, at a run, sitting and on a ladder.

**The half-turn.** The cloth of that band does not go straight from the pelvis to the thigh:
shared between two joints a right angle apart, a point lands on the chord between where each
would put it, nearer the hip than either, and with a thigh raised level the groin sank. So each
hip has one more joint, `HipHalf.L`/`HipHalf.R`: a child of `Hips` on the hip joint, beside
`UpperLeg` (nothing hangs from it), with no rotation at rest. The band's weights go pelvis, half,
thigh (all the half's in the middle of the band), and **whoever poses a thigh turns its half-turn
half as far from rest, by the short way** (`gait.ts`: `halfHips`, which the gait and the ragdoll
call). It is part of every figure `figurelib.rig_standing` rigs; a figure without it is simply
not driven. The seated figure needs none: it is carried to its pose by arcs (`Bend`), not by
weights, and its lap is pressed against the belly (`seated_rig`'s `press`).

### Carrying

A contract for anything carried by any figure; `srlib.grip` and `srlib.anchor` make the pieces.
Names are as in the GLB; three.js drops the dots (`GripR`, `FingersR`). Axes are given as three.js
has them (+Y up; Blender's +Z is three's +Y, Blender's +Y three's −Z).

| Node | Under | What it is |
| --- | --- | --- |
| `Grip.L`, `Grip.R` | `Hand.L`, `Hand.R` | where a handle lies in the hooked fingers: 8.4 cm down the hand from the wrist, 2.7 cm out of the palm. Upright at rest; the handle's line is its local Z, the thing carried hangs along its −Y |
| `Fingers.L`, `Fingers.R` | `Hand.L`, `Hand.R` | a joint: the four fingers hinge together on the knuckles' line (the thumb stays). Unlike the other joints it has a rotation at rest: turn it about its own X from there (`rotateX`); **+50° hooks the fingers round a handle at the grip**, 0 is the relaxed hand of the inventory |
| `Ventilator` | the scene | the case, rigid, not skinned. Its origin is the middle of its carrying handle, the handle along its local Z, the case hanging along −Y: made a child of `Grip.R` with no transform of its own, it is in his hand |
| `Ventilator_HosePort` | `Ventilator` | where the hose leaves the top of the case; the hose leaves along its +Y. Carries `hose_radius` 0.015 m, `hose_length` 0.972 m and `hose_pitch` 0.016 m (the corrugations' spacing) as extras |
| `Inlet` | `Spine` | the mouth of the suit's inlet fitting at the left waist; the hose leaves along its +Y (outward and down) |
| `Ventilator_Hose` | `Ventilator` | the hose as modelled for the inventory, a mesh of its own (material `hose-rubber`, near black): hide it when he walks and draw one between `Inlet` and `Ventilator_HosePort` |

The hose's radius, length and corrugation are the model's and estimated. GPN-2000-001012 shows a
smooth black hose nearer 4 cm across than 3, hanging about 40 cm below the case before it rises
to the suit, and a squarer, smaller case than the one modelled: neither has been remade to it.
One hand pose serves both: the fingers have no joints of their own, so the hooked hand is the
relaxed one turned at the knuckles, not a fist. It closes round this handle and looks right from
walking distance; the thumb does not wrap. Carried rigidly on the grip the case swings with the
hand; keeping it hanging plumb is the viewer's to do.

## What the model gets wrong or leaves out

- **The face is nobody's.** Behind the visor there is a head with a brow, eye sockets, a nose,
  lips, chin and jaw, eyes and eyebrows, in a textbook adult's proportions. It is there so the
  helmet is not empty; it is **not a likeness of Shepard** and was not made from photographs of
  him. Skin, eye and hair colours are arbitrary. No ears (the cap covers where they would be),
  no hair but the brows. The eyelids are plain caps of skin over white balls set back in the sockets.
- **The visor is modelled clear, as the real one was**; the viewer tints it.
- **The body is a mannequin**: elliptical tubes with a little muscle shape, not Shepard's build.
- **Shoulders.** The torso and both shoulders are one skin: a sleeve is lofted from an armhole cut
  in each side of the torso, stitched to its edge and smoothed. The shape that results (deltoid,
  armpit) is what the smoothing gives, not anatomy and not the suit's pattern.
- **Where `Torso` ends and `Arms` begins** (28.5 cm down each arm) is the model's division, not a
  seam of the suit. The two skins share one ring of points there, so nothing shows; a band 2.5 mm
  underneath backs the join.
- **Folds are invented.** Creases a few millimetres deep are modelled at the elbows, knees,
  waist, groin, wrists, over the boot tops, on the upper arms where they hang against the sides,
  and fanning from each armpit across chest and back. They are generated from seeded numbers so
  that left and right differ; none is copied from a photograph. They show an unpressurised suit,
  which is how it was worn on the walk-out. They stop short of the zipper, straps, lacing and
  inlet, which real folds would not. Slack is also modelled under the chest.
- **Hands.** Fingers are of four lengths, swell at the knuckles and curl a little; the thumb has
  a web to the first finger; the back of the hand is domed. There are no seams. The palms are
  suit fabric; the real gloves' palm material was not checked. The seated figure's grip is a
  guess at a hand on a knob, not copied from a photograph of the controller in use.
- **Both middle fingers are straight.** NASA's sheet says the left only (see the table).
- **Strap layout is a guess.** NASA's procedure names underarm, shoulder-to-shoulder and
  shoulder-to-side straps, neck zippers, a waist zipper and ankle zippers; none of those is
  modelled. The waist strap is there because photographs show webbing in that area, not because
  its routing was traced. Two straps from it down through the crotch, which the model had until
  the trousers were made one skin, are gone: GPN-2000-001012 shows plain cloth there, and with
  the waist strap they drew a nappy.
- **Where `Torso` ends and `Legs` begins** (the waist strap) is the model's division too. The
  shell's lowest ring of points is the trousers' highest, the strap lies over it and a band of the
  trousers 2.5 mm underneath backs the join. The suit itself was one garment; it did have a
  zipper round the waist, which is not modelled.
- **The seat and crotch are what trunk and thighs make between them**, not the suit's pattern:
  no gusset, no fly, no seams. The trunk is an egg's lower end; where it and the two thighs come
  within 2 cm they are run together.
- **Lacing strips** sit on the outside of each limb. Their real number and placement were not checked.
- **The wrist zipper reads as a ring** at a distance. There is no ring on this suit.
- **The helmet is a smooth egg.** No visor latch, no communications lead, and the liner is a
  plain dark shell. The lip microphone and its boom are a guess at their shape. The visor frame
  is drawn as aluminium; its real finish was not checked.
- No hose on the helmet outlet, and no seal bottle or its hose on the left-jaw connector.
- No chest mirror on the standing figure (that came after MR-3), no wrist mirrors. Liberty Bell 7's cabin lays one on its
  seated pilot (`mercury_cabin_11.chest_mirror`) and changes the name on the tag (`mark_iv_suit.NAME`): the rest of
  Grissom's suit (wrist bearing rings, the new parachute harness, the new microphones) is not modelled, and there is
  no standing figure of him.
- **The insignia is drawn from the 1959 design, not traced from the patch**: a blue disc with a
  rim of thread, twelve stars placed by eye, the orbit as a plain tilted ellipse, the red vector
  as two straight wings whose points overhang the disc, and "NASA" in a bold serif from the build
  machine's fonts rather than the insignia's own letters. No embroidery, no stitching. The name
  tag's lettering is a bold sans, not the stamped face of the real one.
- **What the 5 May photographs and the flown suit show that the model lacks**: the personal
  parachute harness worn over the suit (webbing crossed on the back, a chest strap, a grey strap
  round the ribs with a quick-release fitting at the middle); the cream pleated stretch panels down
  each upper arm and the tapes fanned over each shoulder; a second zipper round the waist and one
  from waist to crotch; the square reinforcing patch round the waist inlet and the oval one round
  the biomedical fitting; tapes over each knee; straps over the boots' lacing; the orange neck dam.
- **Boots**: plain laced boots. The Smithsonian's "with clips" was not seen first hand and is
  only hinted at by the lacing hooks.
- **The ventilator is a silver suitcase with a hose**, bigger and flatter than the grey box the photograph shows. He carried it in his right hand; in the inventory it stands on the floor at his left.
- **Seated, the joints are hose bends, with two corrections.** Where a thigh would pass through
  the belly its skin stops against a sloping wall instead (`LAP_CREASE`), leaving a groin crease
  2 cm below the hip joints' line: the waist strap and its buckle stay in view above it. The
  crotch straps run from the waist strap down into that crease and are hidden beyond it, under
  the thighs, which at 100° of flexion is where they would be. Behind the knee the flesh is
  hollowed so that thigh and calf fold together rather than through one another, and the knee's
  small creases are eased off. Neither is a cloth simulation, and there is no bunched roll of
  fabric in the lap, only the crease.
- **Coarser levels of detail leave things out**: eyebrows and lips below detail 0.75, eyes below 0.5.
- **Moved, he is a jointed doll in one skin.** Cloth stretches and shears at a joint instead of
  folding: the creases modelled at knee and elbow are the standing ones and do not deepen. The
  helmet turns with `Head`, neck ring and all, though the real ring was fixed to the suit and the
  head turned inside it. No joints in the fingers, toes, collarbones or along the spine. A fitting
  that lies across a joint (the waist strap, the glove's cuff and zipper, the boot's lacing at
  the ankle) bends with it. Checked in a stride, at a run, sitting at a wheel, on a ladder and
  getting up from the ground. With a thigh raised level the cloth in the groin sinks rather than
  bunches.
- No mass properties.

## Sources

- [Navy Mark IV](https://en.wikipedia.org/wiki/Navy_Mark_IV), Wikipedia: mass, pressure,
  materials, the Mercury changes, the MR-3 and MR-4 differences.
- [Pressure Suits for Project Mercury Astronauts](https://www.nasa.gov/wp-content/uploads/static/history/40thmerc7/pressuresuits.pdf),
  NASA MSC fact sheet for MA-8 (1962): construction and the donning procedure. It describes the
  suit a year and a half after MR-3; details may differ.
- [Smithsonian inspects first US astronaut's capsule, suit 60 years on](https://www.collectspace.com/news/news-050521a-shepard-freedom-7-spacesuit-60th-smithsonian.html),
  collectSPACE: the suit's condition and the rubber neck dam under the ring.
- That Shepard carried a "portable air-conditioning unit" to the gantry is from *Time*'s 1961
  account and AmericaSpace's "briefcase-like" description, **seen only as search-result
  excerpts, not read in full**.
- NASA GPN-2000-001012, "Shepard Enters Cleanroom" (5 May 1961, Wikimedia Commons): the ventilator in his
  right hand and how its hose ran.
- The Smithsonian's record of the flown suit, "Pressure Suit, Mercury, Shepard, MR-3, Flown"
  ([A19770563000](https://airandspace.si.edu/collection-objects/pressure-suit-mercury-shepard-mr-3-flown/nasm_A19770563000)):
  neck ring 9 1/2 in, materials, and seven photographs (NASM2022-00512, -00514, -00516;
  SI-2008-8609, -8610, -8625, -8626), read for the insignia, the name tag and the zipper. It shows
  the suit as conserved, without the harness. **The rest of the model has not been checked
  against it**, and its 3D scan, and the records for the helmet and gloves, were not opened.
- NASA photographs of 5 May 1961, on Wikimedia Commons: S61-02727 (on the carrier's deck, colour:
  the insignia and name tag as worn), S61-02775 (suited, helmet open), S61-02792 (at the capsule,
  from behind: the harness), and GPN-2000-001023 (suit checks).
- Drillis and Contini's body segment proportions (1966), as reproduced in Winter's
  *Biomechanics and Motor Control of Human Movement*: quoted from memory, not checked.
