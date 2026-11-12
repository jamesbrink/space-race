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
      orbital.ts  mission.md          an orbital flight's record as data (`Flight.orbital`), and the mission's record and plan in words
      model/<name>.py                 one Blender script per model: vehicle, pad, crew
public/models/<nation>/<programme>/<flight>/<name>.glb      built models (committed)
public/globe/                         the globe's land and ice maps, six cube faces each (committed; tools/globe.mjs); its relief and its
                                      land's colours, six faces each (tools/globe-surface.mjs); and each site's region: <region>.near.png,
                                      .wide.png, .json (tools/globe-region.mjs), .relief.png, .colour.jpg, .surface.json (globe-surface.mjs),
                                      .weather.png (tools/globe-weather.mjs)
docs/sources.md                       every source used or wanted, and what each is good for
src/
  types.ts                            Flight, ModelDef, Part, Spec, Motor, Confidence
  enter.ts                            the way in: main.ts for a flight with a site, only.ts for one that is only its vehicle
  main.ts  ui.ts  style.css           the page
  address.ts                          the address bar, the two places a flight is seen in, and what the gallery is given to show
  gallery.ts  gallery.css  only.ts    the gallery: the vehicle alone on a stage of its own; the switch between the places; its page for a flight with no site
  fold.ts  fold.css  sheet.ts          a place on a phone (the gallery and the launch site alike): the control block docked in the sheet's View pane, the handle's button, the hint said once; the sheet a finger moves
  actions.ts                          on foot: what can be done with the thing being looked at (from flight data)
  wheel.ts                            a radial menu: a few choices round a centre
  viewer/stage.ts                     renderer, camera, picking, post-processing, depth range
  viewer/backdrops.ts                 the three settings: orbit, ground (the Cape), studio
  viewer/studio.ts                    the studio: a sweep under three designed lights, dark, light or paper; a person and a pole for scale
  viewer/labels.ts                    names on the parts of a thing taken apart: which have come clear, where the labels go
  viewer/cape.ts                      Cape Canaveral's land as parameters: its plant communities, clearings, roads, palette, sea
  viewer/land.ts                      any site's ground: cover maps baked from its GLSL, a mesh that follows the eye, thickets as a lifted roof
  viewer/flora.ts                     any site's plants: species built from forms, placed by the cover map, near and far forms, wind
  viewer/plantsort.ts                 which plants are drawn in which form: tiles packed once, each layer sorted again on its own margin
  viewer/globemesh.ts                 the globe's mesh, written without allocating, and when it is owed again
  viewer/field.ts                     noise that gives the same answer in JavaScript and GLSL (the ground's height is needed in both)
  viewer/air.ts                       the air: haze that thins with height (in three's fog chunks), the cumulus field, its shadows on the ground
  viewer/clouds.ts                    the cumulus as a volume: heaped on air.ts's field, their skin worn by finer lumps, lit as cloud is (the Sun's light
  viewer/cloudnoise.ts                the clouds' two tiles of noise as bytes (pinned by digest in tests/); cloudnoise.worker.ts makes them off the page's thread
                                      marched through them and scattered, the sky above, the ground below), ray-marched at a quarter of the pixels, laid over the frame
  viewer/cape1961.ts                  the Cape's launch complexes as they stood in May 1961, at their real places: the near ones a model of their own
                                      (missions/usa/mercury/sites/cape/, `pnpm model:cape`), fetched and placed here; the far ones shapes made here
  viewer/lod.ts                       levels of detail: which one each model and each piece of the place is drawn at, and the fade from one to the next
  viewer/shadows.ts                   the Sun's second shadow map: the whole place, coarsely, under the fine one
  viewer/shadowcache.ts               on foot, the fine shadow map kept between steps: only the walker drawn into it again while nothing else has changed
  viewer/quality.ts                   the net under the frame rate: for a weak machine, if chosen: resolution lowered a step only while frames stay under 30 a second, and put back
  viewer/tier.ts                      what the device can hold: the full tier, and the lighter one a phone is given (sizes, what is made only when seen)
  viewer/pictures.ts                  a model's pictures and index lists at the size the tier allows, before anything is sent to the GPU
  viewer/lost.ts                      a WebGL context taken away, or an allocation refused: the loop stopped, a word, the way back in the lighter tier
  mem.ts                              `?mem`: every GPU allocation the page makes, counted by bytes and by who asked (`srMem.report()`)
  viewer/look.ts                      the real and cel-shaded looks, and the ink line
  viewer/laid.ts                      what lies on the ground kept apart in depth at any distance (polygon offset by material name)
  viewer/bloom.ts                     the glow round what is over-bright: sized in CSS pixels, added in the output's pass
  viewer/surface.ts                   what large plain surfaces look like from a metre away: grain by material name
  viewer/bulk.ts                      where a part's bulk is: the middle of its surface, the same however it is cut into meshes (a callout's point)
  viewer/panes.ts                     panes of glass as two meshes each, so three does not look their shader up again twice a draw
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
  world/orbit.ts                      orbits: elements to and from state, J2 gravity and its steady rates, a coast, the place below, site to inertial, the Earth's shadow
  world/surface.ts                    the sea as a shape: the ellipsoid at a site's sea level, radii of curvature, the horizon
  world/region.ts                     a piece of the Earth laid flat: the gnomonic plane a region's map is baked on and read from
  viewer/globe.ts                     the Earth to scale under the site: coasts from Natural Earth, the land's colours (Blue Marble) and relief and the
                                      sea by its depth (ETOPO), the weather's shadows, the Sun's glint; the air seen from above, drawn on a ball
  viewer/atmosphere.ts                the air as it scatters light, ground to orbit: Rayleigh, haze, ozone, light scattered many times; two tables
                                      made once on the GPU, and the GLSL that walks a ray through it
  viewer/weather.ts  weathermap.ts    the weather round a site as a map (estimated): cumulus cover, middle deck, cirrus; the sheets' textures; the
                                      map as shared uniforms
  world/relief.ts                     how a height is kept in a byte, for the relief maps and the shaders that read them
  viewer/pack.ts  units.ts            one-channel maps packed into one cube and one array texture on the GPU; the texture-unit budget and its check
  viewer/later.ts                     what the first view does not need, fetched once the scene is up
  world/clock.ts                      the simulation clock: seconds from a flight's launch, stopped until run
  world/sequence.ts                   a slider joined to the clock: keyframes, sliderAt, timeAt
  viewer/heavens.ts  daysky.ts        the Moon, stars and planets drawn; light and sky colours by the Sun's height
  timebar.ts  time.css                the clock's control
  demo.ts  callout.ts                 the idle show: the day run round, a tour of the flight, a callout on each thing
  viewer/lamps.ts                     floodlights: every lamp lens a model carries lights the scene after dark
  viewer/origin.ts                    drawing from the eye: the GPU sees only eye-relative positions (a floating origin)
  viewer/ascent.ts                    the flown vehicle in the scene: where the simulator has it, and what it has shed
  viewer/plume.ts                     the engine's fire as data: its place, how hard it burns, the shape the air lets it take, its light on the pad
  viewer/trail.ts                     the smoke it leaves as data: the trail along the path flown (steam low down, a contrail in the cold), the cloud over the pad at liftoff
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
  sim/orbital.ts                      a flight into orbit: its record as data (`Flight.orbital`: stages, events, the orbit, the braking burn, the entry) and the coast flown from it (`flyOrbit`)
  sim/loads.ts                        what a structure is limited by (q alpha, load factors), and when it gives
  sim/autopilot.ts                    what flies it when a hand does not: the control law (`steer`), the sequencer, a whole flight flown live (`flyLive`)
  flown.ts                            the Flown panel: the simulator's run against the clock, and against the reports' figures; a flight flown by hand over it
  sim/verdict.ts                      how a flight flown by hand ended, said plainly, and whether it was survivable by the flight's stated limits
  cockpit.ts  cockpit.css             flying the flight by hand: the live simulator stepped by the clock, the keys, the instruments
  viewer/cabin.ts                     a model's inside as somewhere to fly from: its needles and lamps read the flight, its controls work, its periscope shows outside
  viewer/gauges.ts                    what an instrument reads and where that puts its needle: scales, counter wheels, attitude from axes (pure, tested)
  navball.ts  navball.css             the navball: attitude against the local horizon, prograde and retrograde, guidance's aim (`ballOf` is the mathematics, pure)
  sim/predict.ts                      looking ahead from a state: the path if nothing more is done (the sequencer's events with it), its apogee, events, impact or orbit (pure, in slices)
  viewer/path.ts                      the predicted path, drawn: a ribbon of constant width ahead of the vehicle and the line flown behind, its markers and the ring where it comes down; its switch and figures
  viewer/pathline.ts                  the path's line as numbers: its ribbon's vertices, a prediction eased from the last by instant, the rules that keep it off the vehicle (pure)
  viewer/pathmarks.ts                 where the path's markers go on the page: by rank, off the panels, the vehicle and each other, and staying put; and the chips at the view's edge for those not in view (pure)
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
  lod-thresholds.mjs                  each model's and piece's own level-of-detail thresholds: measured in a browser (lod-measure.mjs), kept in model/<name>.lod.json, put into the GLB's extras
  flicker-test.mjs                    browser check for z-fighting
  frozen-test.mjs                     browser check that a frozen stage draws the same frame twice, both looks
  camera-test.mjs                     browser check of the camera: the sequences that went wrong, then a seeded soak of mixed input
  places-test.mjs                     browser check of going between a flight's places: slow loads, a change of mind, the shows, what both remember
  mem-test.mjs                        browser check of what the page holds on the GPU as a phone (ready, late, on foot, in flight), against a budget
  shot.mjs                            one screenshot of the viewer, for looking at a change
  bench.mjs                           the performance benchmark (`pnpm bench`): frames, load and a soak, with A/B and pixel comparison (rendering.md)
  globe.mjs                           bakes public/globe/ from Natural Earth's coastlines: distances to the shore on a cube's faces
  globe-region.mjs                    bakes a site's region (SiteDef.region) from OpenStreetMap's coast and lakes, as it stood on its date
  globe-surface.mjs                   bakes the globe's relief (ETOPO 2022) and its land's colours (Blue Marble, May), and a region's, finer; needs GDAL
  globe-weather.mjs                   bakes a site's weather map from weather.ts, the land map and the relief
  stars.mjs                           bakes the stars (the Bright Star Catalogue: stars.ts and public/sky/stars.bin) and the Milky Way (NASA's map)
  png.mjs                             one-channel PNGs written and read without a library (the globe's maps)
  logo.mjs                            writes the mark (src/logo.ts) to docs/logo.svg (README) and public/og.png (link previews): run after changing it
  blender/srlib.py                    shared geometry helpers, clearance check, run()
  blender/sitelib.py                  what any site is built from: walls with openings, stairs, ladders, doors, poles
  blender/figurelib.py                what any crew figure is built from: a body's measures and joints, the trunk and trousers as skins, hands, a head,
                                      the pose; a suit is a garment module on top (crew/mark_iv_suit.py, crew/sk_1.py)
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
