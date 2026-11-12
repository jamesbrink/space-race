# Walking

Part of the agent notes: start at [AGENTS.md](../../AGENTS.md).

A model with a `walker` entry in `flight.ts` (types.ts: `ModelDef.walker`) is a figure the site
can be walked as; a flight may have several. The Walk button in that model's section, or a
double-click on the figure from anywhere, puts the camera at its eyes and lets you walk the site
(`viewer/walk.ts`; `sr.stage.enterWalk(id?)`, `sr.stage.walk`). Escape or the Exit walk bar ends
it and the camera flies back to that section. C (a View button on a touch screen) changes
between the figure's eyes and over its right shoulder, and the choice is remembered.
Nothing in `walk.ts`, `gait.ts` or their hooks in `stage.ts` knows any one flight: keep it that way.

- **The figure comes from the flight's data.** It starts where the model stands (`position`),
  facing `walker.forward` (the model's own frame) turned by `rotationY`; `walker.eyes` names the
  node whose middle is the eye level, and the top of the model's bounds is its height, so both are
  as good as the model's `.md` says the model is. `walker.radius` is half its width (default 0.26 m);
  `walker.hide` names nodes that stay behind (something it had put down) and are not drawn while
  it is walked as.
- **Over the shoulder the figure is drawn, and walks.** The camera sits behind, right of and
  above the head and comes in to just short of anything between it and the head (a ray against
  the same `Solids`); pressed right up to the head, the figure is not drawn. The figure stands
  where the walker's body is, turned to the way it is going, and `viewer/gait.ts` moves its limbs:
  `pose(phase, speed, air)` is a pure function to the fifteen joints every crew figure is built
  with (srlib.FIGURE: `Hips`, `Spine`, `Head`, `UpperArm.L` ... `Foot.R`, found by name with or
  without the dot), and the phase advances by distance gone over the length of a stride, so a
  planted foot stays put. A model with none of those joints still works: it glides rigid, and
  the diagnostics line says so. One helper beside the fifteen: `HipHalf.L`/`.R` (a child of `Hips`
  on each hip joint, carrying the cloth of the groin's crease) is turned half as far as its thigh
  by `halfHips`, which anything that poses a thigh calls (`Gait.apply`, `asBuilt`, the ragdoll);
  a model built without it is not driven and still works.
- **A planted foot is planted.** Each stance leg is solved from its foot's fixed spot on the ground
  and the hip's actual place (`gait.ts`: `plant`, `legTo`, `Gait.tread`), with a heel rocker on
  landing and a toe rocker on leaving; on a stop a foot out of place is lifted and stepped home,
  not slid, its leg bending no faster than the stride's does. Held for the whole stance, from the
  heel landing to the toes leaving, to half a centimetre of the ground and a centimetre of its
  spot at a walk and a jog and two millimetres at a run (`tests/planted.test.mjs`). The figure's
  pelvis does it, not the eyes: `Pose.sag` lowers the hips to the landing by up to 3 cm more than
  `rise`, which is all `view()` knows of and is pinned to the bit (`tests/gait.test.mjs`). A swinging
  foot is held off the ground in the swing itself (`CLEAR_BY`): the hips come down a long way into a
  runner's landing, and the leg bends for it gradually, as a runner's does. No foot is told to be
  more than 5 mm under the ground at any speed.
- **The pelvis moves, and the feet do not know.** Walking, the pelvis turns about the upright
  with the leg going forward (4 degrees each way at a walk, 6 at a run), tips up over the planted
  foot (3 degrees, about the hip that carries it, level as each foot lands), and each leg leans in
  from its hip so that the feet land 6.5 cm either side of one line however wide the figure stands
  (`gait.ts`: `carriage`; the figures are estimates beside the textbooks' 4 to 5 degrees). The
  shoulders turn against the hips. A pose still tells each thigh's swing as seen from the side:
  `Gait.apply` takes the pelvis's turn out of the thighs and the spine and keeps the soles level
  and the toes forward. The planted leg is solved from where the pelvis has its hip joint
  (`planted`), and each leg's lean from its hip's real height, so the foot stays on its spot in
  three dimensions: to a centimetre along, 1.5 mm across and half a centimetre of the ground (`tests/stride.test.mjs`, measured on a jointed
  figure). `Pose.settle` is what that costs in height; the eyes know nothing of it either.
- **How fast the joints turn.** Measured on the pose at a steady pace, for a man's legs (0.44 m
  thigh and shin), the fastest any joint turns: at a walk (1.4 m/s, 0.83 strides a second) thigh
  236, knee 486, ankle 547 degrees a second; at 3 m/s thigh 766, knee 732, ankle 413; at a run
  (4 m/s) thigh 894, knee 878, ankle 525. No published table was read to set these against. The
  one study found (Mentiplay and others, "Lower limb angular velocity during walking at various
  speeds", *Gait & Posture*, 2018) says only, in its abstract, that the knee is fastest extending
  at the end of its swing and that every joint is faster at a faster walk; figures of 350 to 450
  degrees a second for a walker's knee and 800 to 1,100 for a runner's are the usual ones, from
  memory and unchecked. `tests/gait.test.mjs` holds every joint to 1.2 degrees in half a degree of
  the cycle, and to 1.5 for a step of 0.02 m/s in pace (1.48 measured, the knee at a crawl; a
  foot coming to its landing holds its toes as they will be when the heel lands, `asked`'s `most`:
  rocked on a heel not yet down it turned 5 degrees in the last hundredth of a cycle, which was 1.65).
- **Loose things tick at a fixed rate.** The ragdoll, a dropped case and a hose step at a constant
  1/120 s with the remainder carried and are drawn between their last two ticks, so a fall is the
  same fall at any frame rate (`tests/ticks.test.mjs`). Anything new that integrates does the same.
- **What it carries is in its hand.** `walker.carries` names a rigid node of the model and a
  hand; `viewer/carry.ts` puts it in that hand by the contract every crew figure is built to
  (`Grip.L`/`Grip.R` under the hands, `Fingers.L`/`.R` hooked 50 degrees, the item's origin on
  its handle), keeps it hanging plumb as the arm swings, and puts it back where the model has it
  when the walk ends. The gait knows the weight (`Gait.load`): that arm hangs straighter and
  swings a third as much. A `hose` between two anchor nodes is hung by `viewer/hose.ts`: a chain
  of fixed length under gravity, above the ground and outside the body, leaving each anchor
  along its +Y, drawn as a tube in the hidden modelled hose's material.
- **Both views are one walk.** `Walker.gait` is the only stride there is. From outside it poses
  the figure; from inside, `view()` reads the eyes' rise, sway, tip and nod off the same moment,
  so a footfall seen is a footfall felt. The body has inertia (`quicken`: walking pace in a
  quarter of a second), the knees give on a landing in proportion to the fall (`give`,
  `landing`), the eyes come up a riser a moment after the feet, the lens opens 2.5 degrees at a
  run. The walk bar's Motion setting (full, reduced, off; remembered; off by default under
  prefers-reduced-motion) scales all of it and never touches where the mouse points. A standing
  figure breathes in steps of a twelfth of a second, the rate a still view is redrawn at anyway.
  Seen from outside, a figure that turns leaves its planted feet where they are: each stays on its
  spot, pointing the way it pointed, while the figure turns over it (`Gait.tread`: `veer`, and
  `stood`'s `z` and `yaw`; the leg is turned at the hip, up to 35 degrees, past which the foot
  pivots on its spot), and standing, the feet are then stepped round one at a time (`close`). It
  turns to the way it is sent at 4 radians a second from standing and 7 at a walk (`FACE`), which
  feet can follow. Setting off, the foot stood on stays where it stood while the stride's line
  comes in under the figure (`tests/stride.test.mjs`), and the foot that swings first is lifted before
  it goes forward (`Gait.first`, FIRST_LIFT: 4 cm, by how far through what is left of its swing it
  is; it used to go the whole of its first step, 41 cm on the stick figure, within 5 mm of the
  ground). It is 2 cm up before it has gone 3 cm (`tests/stairs.test.mjs`); the knee turns up to 11
  degrees in a 120th of a second for it at a walk and 17 at a run, because the body is at its pace
  in a quarter of a second (`quicken`) and the step with it.
  Through the eyes the helmet's visor rim can frame the view (Visor on the walk bar, remembered).
- **The walk is heard as events.** The gait says which foot landed (phase 0.25 left, 0.75 right,
  by distance gone), a landing's height and the breath's phase; the walker hands them to
  `Walker.sounds` (`src/audio.ts`: an interface, silent until something that plays is given).
- **Falls.** More than a hop off the ground the figure falls (`Moment.fall`: arms out, legs
  trailing). Landings go by height: under 1.5 m the knees give; from 1.5 m a deep crouch and a
  moment in which the legs take no orders; from 3 m (`LIMP_FALL`) the figure goes limp. Limp is
  `viewer/ragdoll.ts`: eighteen points held the bones' lengths apart by sticks (bones, braces
  and limits), falling under gravity, kept out of the solids (`Solids.out`) and losing their
  speed to them; the bones are laid along the points each frame. Joints bend one way only
  (`BENDS`: a knee forward of the hip-to-ankle line, an elbow behind the shoulder-to-wrist line,
  a thigh at most 25 degrees behind the trunk), corrected without adding speed and never by
  moving an end the ground holds. A point that went through a surface in a tick is put back the
  way it came (`Collide`'s `from`), so nothing ends under a floor. What it carried leaves the
  hand as it hits and tumbles on its own, a rigid box with its hose (`carry.ts`: `Tossed`), and
  is in the hand again when he is on his feet. It stands behind `Tumbler`
  so an engine can replace it. When it lies still the figure's place is moved under its hips
  without moving a bone, and `rising()` in gait.ts gets it up (hands and knees or sitting up,
  one knee, a crouch, standing: about three seconds). Nobody is hurt. Down, the walker's body
  is pinned under the hips, the keys do nothing but leave, and the view is from outside; with
  Motion off there is no tumble, only the crouch.
- **The walker has a shadow, always.** While walking the shadow map is fitted round the walker
  (`fitWalkShadows`: 52 m square, moved in whole texels) instead of round the section's model,
  and made finer (`walkShadow`: 8192 a side, 6 mm a texel, where the GPU allows; otherwise 4096
  over 36 m), because from eye height a wall the Sun grazes shows every texel as a tooth.
  Through its own eyes the figure is still posed and drawn into the shadow map only
  (`shadowOnly`), so you see your own shadow; its shadow is not redrawn for breathing.

- **The world is solid as posed.** `Solids` asks each mesh on show (every other model of the
  flight, its surroundings, the setting's scenery; not instanced plants) through its world matrix, with a `three-mesh-bvh`
  hierarchy built per geometry the first time something comes near. Nothing is baked, so a
  platform that has slid or a truck that has driven off is solid where it is this frame.
- **Feet and body are separate.** Rays straight down find the floor: anything up to `STEP`
  (0.3 m) above the feet is stepped onto, further down than that is a fall. A capsule from
  `STEP` above the feet to the top of the head is pushed sideways out of whatever it meets. So
  a model's stairs need risers of 0.3 m or less. Space (a
  button on a touch screen) is a standing jump: 0.4 m under gravity, from the ground only, and
  the head stops at whatever is over it (`jump`, `bump`).
- **Plants are walked round.** They are instances the `Solids` never see, so the body asks the setting
  (`WalkHost.plantsOut`, `Setting.plantsOut`, `Flora.out`): after each stride it is moved out of any
  leaf mass taller than 0.9 m (a column as wide as the plant's leaves reach, plus `LEAF_CLEAR`), and a
  stride that would leave it deeper in than it was is not taken. A lone shrub is gone round, a thicket
  is a wall, low clumps are waded through, and the eye is never in the leaves.
- **The terrain is a height, not a mesh.** It lies at `Setting.groundAt(x, z)` (dunes, the beach,
  the land falling to the river; the setting's floor where it has none), and cannot be fallen
  through: the walker, the ragdoll and a driven vehicle's `Road` all stand on it. Where that is below the models' surface (`GROUND_Y`)
  it is so only for the depth buffer's sake, so from down there a riser is measured from y = 0:
  the edge of a pad is not a kerb.
- **Ladders are climbed.** A ladder is its own mesh with `userData.climb` (a Blender custom
  property, like `shell`), one per run, near vertical, with a floor within 0.3 m of its top and
  standing room at both ends. It is not a wall or a floor: walking forward into its face takes
  hold (`Body.mount`), gravity is off, forward climbs at 0.6 m/s and back descends (`climb`), a
  sidestep or a jump lets go. Going up, the body steps onto any floor its feet come level with,
  beyond the ladder or to either side of it (stiles stand a metre above the deck they serve, and
  a run in a well has its floor beside it), and at the top onto the floor beyond if there is one. From the deck above, walk to its top looking down and keep walking: forward goes on
  meaning down until the legs stop. The wheel offers Climb on a ladder too. Seen from outside, the
  hands and feet are on the rungs: each on the rung its height up the ladder gives it (`gait.ts`:
  `rungs`, by height alone, never by time: the left foot and the right hand go up two rungs while
  the others hold), put there by `Stage.onTheLadder` (`reach` for a hand, `step` for a foot). The
  ladder is known only by its box, so the rungs are taken to be where `srlib.ladder` puts them: a
  foot apart from a foot above its foot.
- **Stairs are walked, not hopped.** The floor is sensed under the middle of the body and four
  points round it, so open treads with daylight between them carry it; the body follows a flight
  as fast as the legs go (`settle`'s `rate`) and a step down is as deep as a step up is tall.
  Unit-tested on open-tread flights of 0.2 and 0.25 m risers at a walk and a run, both ways, with
  no frame in the air.
- **Each foot has its own ground.** The walker tells the gait what is under the figure (`Terrain`:
  the height of its place, and of the ground a way ahead and to the side, asked of the solids as it
  faces: `Body.under`), and the gait keeps a height for each foot (`Gait.footing`, `trod`): a planted
  foot stands on the highest of what is under its heel, ankle and toes, asked for every frame, so a
  floor that moves carries it. A foot leaving the ground chooses where it will land (`settleOn`:
  whole on one tread, 5 cm clear of a riser that stands over it and at most 5 cm over an edge that
  falls away, on ground within a step of the foot that stands), and the cycle's phase is made up
  for what that moved it (`owed`), so the steps come to the length the flight asks: a tread to a
  step. In the air it is carried from the tread it left to the one it is going to, up first going up
  and along first going down, and over whatever is under it (`Moment.over`). The figure's own
  ground is the lower of the two feet's, eased (`base`, `Gait.lift`): going up the pelvis rises over
  the leading foot, whose knee has bent to reach its tread, while the other swings past; going down
  it is let down on the standing leg. The eyes follow neither that nor the body's risers but the
  mean of the two feet's (`Gait.carried`), which on an even flight is a slope. A flight is taken at
  its own pace (`gradePace`: 0.55 m/s at a walk and 0.6 at a run where the ground is steeper than
  2 in 5, which is 118 steps a minute on a going of 0.28 m; estimated). Measured on the stick
  figure (`tests/stairs.test.mjs`: risers of 0.18, 0.198 and 0.23 m, both ways): a planted foot
  within 12 mm of its tread and a centimetre of its spot, a tread to every step, no foot more than
  7 mm under a tread going up or 20 mm, for a moment, going down (a heel past a nosing); a kerb is
  stepped on to and off at a walk with no foot more than 2 cm in it (run off one, a heel is 6 cm in
  it for a moment). Not yet
  right: a knee turns up to 20 degrees in a 120th of a second as a foot leaves a tread close under
  a riser, four times what the flat asks; a standing figure's feet are not moved clear of an edge
  (they rest on the higher side of it); a foot comes down a flight heel first, where a man lands on
  the ball of it; faster than the flight's pace the stride does not keep to the treads, which is
  why nothing is run up; and the hands do not take the rail.
- **What is in front of you can be acted on.** Each frame a ray from the eyes finds what is
  within `REACH` (2.5 m); `Stage.targetOf` says what it is in the flight's terms (a `Target`:
  model and part, a window pane, a place in the surroundings) and the reticle names it. E (a
  finger held on the view, or the Act button) opens the wheel (`src/wheel.ts`: a radial menu that
  knows nothing of what its choices mean) with the verbs `choices()` in `src/actions.ts` finds
  for it: Info (a card of the part's text and facts), Look inside (a pane: the eyes lean in to
  it), Become (another model with a `walker`), Inspect (leave the walk and orbit it), and
  whatever the part's own `actions` are. **A mission adds a verb as data**: an `Action` on a
  `Part` in `flight.ts` (today one kind, `slider`: run the part's model along its slider, so its
  `moves` play). A new kind of action is a new member of `Action['do']` and one line in
  `perform` (main.ts); never a test for a particular part.
- **What has been worked stays worked.** A door left open, a lift left at a level, a function set
  by hand, a car driven off and a figure walked somewhere all stay as they were left for as long
  as the page is open: ending a walk resets none of them. The one thing that takes hardware back
  is the script (the clock moving a sequenced model), and then only that model's own functions.
- **Nothing slides out from under anyone.** `Walker.ride` remembers the mesh under the feet
  (or the ladder in the hands) and where on it the body stood; next frame the body is where that
  place on the mesh has gone, and has turned as it turned. So a lift, a structure rolling on its
  rails, a clock put to another hour, a part worked by hand, all carry whoever is on them.
- **What a part does can be worked by hand.** A function (`explode.ts`: `functionsOf`) is the
  `moves` of one node of a part, or of several the flight puts together in `Part.functions`,
  which also names it, paces it and gives it interlocks (`needs`, with the reason said when it
  refuses). The slider is the script; `Exploder.hold` plays one node at a reading of its own.
  On foot the wheel offers Operate: hold W or S to run it, eased, E to let go (on a touch screen
  two buttons named by the ends of its travel, and Done); in orbit the selected part has a
  slider for each function. A function's `at` puts it at its controls and its `lever` (a node
  the model marks `lever` with `swing` and `axis`) is held over while it runs. A function set by hand holds while the script is
  still and goes back to it when the script next moves the hardware (`Stage.scripted`).
- **Vehicles are driven.** Anything built to the vehicle contract (`tools/blender/vehicles.py`:
  a node marked `vehicle` with `wheelbase`, `wheel_radius` and `turning_circle`, its origin under
  the rear axle, and `_Wheel_n`, `_Knuckle_n`/`_SteerWheel_n`, `_Seat_Driver` and `_Stand_Driver`
  under it) offers "Get in and drive" on the wheel. `viewer/drive.ts` is kinematic for now:
  `roll` is a bicycle model (pure), `Vehicle` puts the node where it says, rolls and steers the
  wheels, stops short of what is in its way and stays on the ground under its axles. What it
  asks of the world goes through `Road`, so a physics engine can replace `roll` later. Seated
  (`Walker.sit`), W and S are the throttle and the brake (then reverse), A and D steer, C
  changes between the seat and a chase view, E gets out beside the door. Getting in and out
  go through the driver's door, which opens and shuts by the same working the wheel's Open uses.
  The figure sits (`Moment.sit`): its hips on the seat's hip point, its hands on the wheel and
  going round with it; the steering wheel turns sixteen times as far as the road wheels. The
  vehicle's pieces are found by their extras (`steer`, `seat`, `stand`, `steering`, `door`)
  before their names. The vehicle is left out of the solids while it is driven. A part the
  flight drives off (a `drive` move on its own node, to the same contract) is marked a vehicle
  from that move (`markDriven`); driven by hand it is let loose from the slider (`Exploder.loosen`)
  until the script next moves it, its other levels of detail follow it, and its driving
  function's interlocks hold it still. The figure sits as the seat is turned, its hands on the
  rim at ten to two (`reach`), and a tall one sinks and leans back to clear the roof (`seatFit`,
  measured straight up from the hip point); the eyes are taken off the posed head and kept under
  the roof. The chase view sits behind the whole vehicle and over its roof, looking at it.
- **Places can be taken.** `ModelDef.seats` (a couch) is boarded from the wheel at its `from`
  node while the clock is in its `open` window (the clock is not moved for it); `stage.seated`
  says where, E gets out where he got in. A model without the node can name a `standIn` mesh
  for a placeholder until it has one. A seat's `figure` names the flight's model of whoever sits
  there as he stands outside: there is one of him, so while the flight deck is taken that figure
  is not drawn on the pad (`Stage.crewAboard`), and comes back when the deck is left. A seat's
  `egress` says where it can be left for the outside: 'pad' (through the hatch while `open`: the
  default), 'orbit' (an EVA) or 'sea'. Freedom 7 declares the pad only, as it was (the hatch
  could not be opened from inside in flight). Nothing offers 'orbit' or 'sea' yet: a spacecraft
  that allowed them says so in its data, and the offer is to follow the data, never a name.
- **There is always a way up.** Stairs (risers of 0.3 m or less), a ladder, or one of the two
  actions that open the way, both played by `viewer/works.ts` at every level of detail and solid
  as posed: `toggle` (a door: `Move`s played forward and back; the wheel says Open or Close by
  how it stands) and `lift` (a platform node that slides between named stops and carries whoever
  stands on it: Ride from on it, Call from off it). `Action.on` limits a verb to one node of the
  part (the door, a call button). A model can also mark these on its own nodes, as
  `tools/blender/sitelib.py` does (extras `door` with `swing`, `lift` with `stops`): the stage
  turns the marks into the same actions (`Stage.markedOn`), which is how scenery, having no
  parts, gets working doors; a marked lift is called from anywhere on its structure. A lift's
  `stops` are heights above where the car was built, or `[across, up]` pairs for a car that
  shifts sideways as it rises, in metres in the car's parent's frame; `stop_names` names them.
  What a flight declares for a node is not offered a second time from the node's mark. A driven node has the same name at every level of detail and
  is not also in the part's slider `moves`.
- **The camera's rigs are off while walking** (`Stage.stepWalk`): no drift, bounds,
  picking or `fitDepth`, and the hands on the page are the walker's (`Scene.free`). When the walk ends
  the rig in charge takes the view up from where the walker's eyes were (`Cameras.adopt`). The walker sets its own near plane from the nearest surface (5 cm
  indoors, up to 30 cm in the open) and a wider lens, eased in and out over half a second
  (`Walker.lens`), which the backdrop's camera copies. Views are always framed for the orbiting
  lens (`Stage.lens`).
