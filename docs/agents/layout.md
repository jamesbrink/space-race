# Layout — where everything lives

Part of the agent notes: start at [AGENTS.md](../../AGENTS.md).

```
missions/                             the record: one folder per nation, programme, flight
  index.ts                            the list of flights the viewer can show
  <nation>/<programme>/
    README.md                         the programme
    vehicles/  sites/  crew/          hardware shared by several flights: <name>.py builds it (a big
                                      one as a package of modules, e.g. sites/lc5/),
                                      <name>.md records its dimensions, confidence, simplifications
    flights/<flight>/
      README.md                       the flight: what happened, timeline, sources
      spacecraft.md                   the ship: every dimension, how sure we are, what is simplified
      flight.ts                       the same facts as typed data (src/types.ts: Flight)
      model/<name>.py                 one Blender script per model: vehicle, pad, crew
public/models/<nation>/<programme>/<flight>/<name>.glb      built models (committed)
public/globe/                         the globe's land and ice maps, six cube faces each (committed; tools/globe.mjs), and each
                                      site's region: <region>.near.png, .wide.png, .json (tools/globe-region.mjs)
docs/sources.md                       every source used or wanted, and what each is good for
src/
  types.ts                            Flight, ModelDef, Part, Spec, Motor, Confidence
  main.ts  ui.ts  style.css           the page
  actions.ts                          on foot: what can be done with the thing being looked at (from flight data)
  wheel.ts                            a radial menu: a few choices round a centre
  viewer/stage.ts                     renderer, camera, picking, post-processing, depth range
  viewer/backdrops.ts                 the three settings: orbit, ground (the Cape), studio
  viewer/cape.ts                      Cape Canaveral's land as parameters: its plant communities, clearings, roads, palette, sea
  viewer/land.ts                      any site's ground: cover maps baked from its GLSL, a mesh that follows the eye, thickets as a lifted roof
  viewer/flora.ts                     any site's plants: species built from forms, placed by the cover map, near and far forms, wind
  viewer/plantsort.ts                 which plants are drawn in which form: tiles packed once, each layer sorted again on its own margin
  viewer/globemesh.ts                 the globe's mesh, written without allocating, and when it is owed again
  viewer/field.ts                     noise that gives the same answer in JavaScript and GLSL (the ground's height is needed in both)
  viewer/air.ts                       the air: haze that thins with height (in three's fog chunks), the cumulus field, its shadows on the ground
  viewer/clouds.ts                    the cumulus as a volume: heaped on air.ts's field, their skin worn by finer lumps, lit as cloud is (the Sun's light
                                      marched through them and scattered, the sky above, the ground below), ray-marched at a quarter of the pixels, laid over the frame
  viewer/cape1961.ts                  the Cape's launch complexes as they stood in May 1961, at their real places
  viewer/lod.ts                       levels of detail: which one each model is drawn at
  viewer/look.ts                      the real and cel-shaded looks, and the ink line
  viewer/surface.ts                   what large plain surfaces look like from a metre away: grain by material name
  viewer/walk.ts                      walking the site on foot: footing, collision, input, the camera at the eyes or over the shoulder
  viewer/gait.ts                      how a jointed figure moves its limbs: walk, run, stand, jump, from distance and speed
  viewer/ragdoll.ts                   a figure gone limp after a long fall: points, sticks, and the bones laid along them
  viewer/works.ts                     things that work when worked: doors (toggles) and lifts, from a part's actions
  viewer/drive.ts                     driving: a kinematic bicycle model and the vehicle contract's nodes
  viewer/carry.ts                     what a walking figure has in its hand, by the model's grip contract
  viewer/hose.ts                      a hose or tether of fixed length hanging between two moving anchors
  prefs.ts                            what is remembered between visits
  viewer/space.ts                     Earth from apogee, stars; the wear texture
  viewer/explode.ts                   exploded-view motion
  world/bodies.ts                     the Sun, Earth, Moon and planets as data: GM, radii, rotation, mean orbits
  world/time.ts  frames.ts            Julian dates, sidereal time; geodetic, Earth-fixed, inertial and site frames
  world/ephemeris.ts  stars.ts        where the Sun, Moon and planets are from a site; the 518 brightest stars
  world/surface.ts                    the sea as a shape: the ellipsoid at a site's sea level, radii of curvature, the horizon
  world/region.ts                     a piece of the Earth laid flat: the gnomonic plane a region's map is baked on and read from
  viewer/globe.ts                     the Earth to scale under the site: land and ice from Natural Earth, the haze over it, the air's limb
  world/clock.ts                      the simulation clock: seconds from a flight's launch, stopped until run
  world/sequence.ts                   a slider joined to the clock: keyframes, sliderAt, timeAt
  viewer/heavens.ts  daysky.ts        the Moon, stars and planets drawn; light and sky colours by the Sun's height
  timebar.ts  time.css                the clock's control
  demo.ts  callout.ts                 the idle show: the day run round, a tour of the flight, a callout on each thing
  viewer/lamps.ts                     floodlights: every lamp lens a model carries lights the scene after dark
  viewer/origin.ts                    drawing from the eye: the GPU sees only eye-relative positions (a floating origin)
  viewer/ascent.ts                    the flown vehicle in the scene: where the simulator has it, and what it has shed
  viewer/plume.ts                     the engine's fire as data: its place, how hard it burns, the shape the air lets it take, its light on the pad
  viewer/trail.ts                     the smoke it leaves as data: the trail along the path flown (steam low down, a contrail in the cold), the blast over the pad
  viewer/exhaust.ts                   fire and smoke drawn as volumes (the one thing here meant to look real): marched at a quarter of the pixels, laid over the frame; the smoke's shadow
  viewer/chute.ts                     the parachutes, drawn from Flight.flies.chutes: out, filling, reefed, full, and down on the sea
  viewer/jets.ts                      the attitude jets, seen: a pale cone at each chamber that is open, from the thruster data
  sim/heating.ts                      the air's heat: stagnation-point heat flux (Sutton and Graves) and each named surface's temperature as a lump
  viewer/effects.ts                   what the air does, seen and felt, at the clock's instant: fed by Stage.lift, and the camera's shake for the draw
  viewer/entry.ts                     incandescence by black-body colour, the shock layer's glow as a marched volume, the collar of cloud at Mach 1
  viewer/shake.ts                     the camera shaken: engine sound, buffet, load and jolts as levels, band-limited noise in the clock's time
  sim/fly.ts  sim/atmosphere.ts       the simulator: a ballistic flight integrated from Flight.trajectory; the 1976 standard air
  sim/vehicle.ts  sim/rigid.ts        the live simulator: the same flight stepped a frame at a time and steered, as a rigid body; quaternions and mass properties
  sim/forces.ts  sim/shed.ts          the air on any rigid body (axial drag by the leading end, fins, cross-flow), one body made two with its momentum kept; what a vehicle sheds, flown
  sim/loads.ts                        what a structure is limited by (q alpha, load factors), and when it gives
  sim/autopilot.ts                    what flies it when a hand does not: the control law (`steer`), the sequencer, a whole flight flown live (`flyLive`)
  flown.ts                            the Flown panel: the simulator's run against the clock, and against the reports' figures; a flight flown by hand over it
  sim/verdict.ts                      how a flight flown by hand ended, said plainly, and whether it was survivable by the flight's stated limits
  cockpit.ts  cockpit.css             flying the flight by hand: the live simulator stepped by the clock, the keys, the instruments
  navball.ts  navball.css             the navball: attitude against the local horizon, prograde and retrograde, guidance's aim (`ballOf` is the mathematics, pure)
  sim/predict.ts                      looking ahead from a state: the path if nothing more is done, its apogee, its impact or its orbit (pure, in slices)
  viewer/path.ts                      the predicted path, drawn: a ribbon of constant width over the Earth, with its apogee and its end labelled
  title.ts  logo.ts  title.css        the front page and the mark
  callout.css                         the idle show's callouts
  audio.ts                            what the walk is heard as: an interface, silent until something that plays is given
  sound/model.ts                      what the flight sounds like, as numbers: levels, filter frequencies, delays and Doppler from the sample and where the ears are (pure, tested)
  sound/engine.ts                     the Web Audio graph those numbers are set on: noise, filters, envelopes; no recordings
  sound/index.ts                      the joinery: the clock, the scene's run and the camera in; the speaker by the clock, U, the volume
  viewer/camera/index.ts              the camera: every rig, which is in charge, the handover between them, where the pivot is shown
  viewer/camera/maths.ts              its arithmetic, pure and tested: zoom by proportion, what a zoom may move, easing and coasting by time, framing
  viewer/camera/rig.ts                what a rig is (`Rig`), the rigs there are (`RigId`, `RIGS`), and what one may ask of the world (`World`, `Craft`)
  viewer/camera/orbit.ts              turning about a pivot (`OrbitRig`), and about a vehicle that carries it (`ChaseRig`: level with the horizon, or locked to the vehicle)
  viewer/camera/free.ts  onboard.ts  track.ts   the free camera; first person from a seat; the pad camera that stands still and follows with a long lens
  viewer/camera/input.ts              the hands: mouse, trackpad, fingers and keys in one vocabulary (drag, slide, zoom, twist, pivot here)
  viewer/fly.ts                       the free camera's flying: heading, pitch, speed by height (`Flyer`)
tools/
  build-model.mjs                     runs a flight's model scripts through Blender
  flicker-test.mjs                    browser check for z-fighting
  camera-test.mjs                     browser check of the camera: the sequences that went wrong, then a seeded soak of mixed input
  shot.mjs                            one screenshot of the viewer, for looking at a change
  globe.mjs                           bakes public/globe/ from Natural Earth's coastlines: distances to the shore on a cube's faces
  globe-region.mjs                    bakes a site's region (SiteDef.region) from OpenStreetMap's coast and lakes, as it stood on its date
  png.mjs                             one-channel PNGs written and read without a library (the globe's maps)
  logo.mjs                            writes the mark (src/logo.ts) to docs/logo.svg (README) and public/og.png (link previews): run after changing it
  blender/srlib.py                    shared geometry helpers, clearance check, run()
  blender/sitelib.py                  what any site is built from: walls with openings, stairs, ladders, doors, poles
  blender/interiors.py                rooms' insides: what is seen through a site's windows
  blender/vehicles.py                 period road vehicles from parameters, built to be driven
```

A flight's id is its path: `usa/mercury/mr-3-freedom-7`. The same three segments locate its folder
under `missions/`, its GLBs under `public/models/`, and its `pnpm model:*` argument.

This is the game's **inventory**: each flight's vehicle, pad and crew, shown at the highest detail
with everything known about each part.

**One scene, one camera.** All of a flight's models are on the stage at once, each where its
`position` in `flight.ts` puts it (the rocket on its pedestal, the pilot on the hardstand). A
section (Vehicle, Launch pad, Crew) is not a different scene: choosing one flies the camera to that
model and gives it the panel, the slider and the cutaway. Clicking a model does the same. While a
section is open the others take the state its `with` asks of them (the pad cleared for launch while
the rocket is studied), moving there as hardware would. A view that names parts (`nodes`) frames
them wherever they are, so it follows them as the slider takes the model apart. How the view is
held and moved is "The camera", below.

**Anything can be gone to.** A click on a part flies to it; on another model, opens its section; on
a window, looks in; on something in the place round the pad (`Flight.surroundings`: a blockhouse, a
road), flies over and turns about it (`Stage.visit`). A figure that has been walked somewhere stays
where it was left.
