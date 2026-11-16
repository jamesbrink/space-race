# Layout — where everything lives

Part of the agent notes: start at [AGENTS.md](../../AGENTS.md).

```
missions/                             the record: one folder per nation, programme, flight
  index.ts                            the list of flights the viewer can show
  upcoming.ts                         the flights to come, as the front page lists them; one drops off the day its id is in index.ts
  history.ts                          the history the Lineup tells: the race's milestones in date order, each flight's story and
                                      why its ship has its name, the people who flew, the programmes; each entry sourced and
                                      labelled, no figure the simulator reads (tests/history.test.mjs holds it to the flights)
  <nation>/<programme>/
    README.md                         the programme
    vehicles/  crew/                  hardware shared by several flights: <name>.py builds it,
                                      <name>.md records its dimensions, confidence, simplifications
    vehicles/<stack>.ts               a launch vehicle's flight data said once, each flight giving its own day (tests/inherit.test.mjs)
                                      (mercury-redstone.ts: `plan`, `trajectory`, `Day`, `CHUTES`; vostok-8k72k.ts; vostok-3ka.ts, the spacecraft; vostok-plan.ts, a Vostok's plan from its record;
                                      mercury-capsule.ts, the capsule on either launch vehicle: `along`, the azimuths, `THRUST` and `lb`,
                                      `stackParts`; mercury-atlas.ts, the capsule on its Atlas: `mercuryAtlasStack`, `mercuryAtlasParts`,
                                      `VIEW`, `SPEC`, `ATLAS`, `mercuryAtlasMotors`;
                                      mercury-redstone-stack.ts, the capsule on its Redstone on the pad: `mercuryRedstoneStack`,
                                      `mercuryRedstoneParts`, `SPEC`, `mercuryRedstoneMotors` (the A-7's thrust each flight's own, as measured);
                                      gemini-titan.ts, a Gemini on its Titan: `geminiTitanStack` (each part's place, the views), the cabin, the type's
                                      sizes (`SIZE`), engines and thrusters (`THRUST`), each flight giving its words and differences;
                                      vostok-stack.ts, a Vostok on its 8K72K: `vostokStack`, `vostokParts` (each part's place), the views,
                                      the type's specs (`SPEC`) and engines (`vostokMotors`), `along` and the azimuths;
                                      voskhod-11a57.ts, a Voskhod on its 11A57: `voskhodStack`, `voskhodParts`, `VIEW`, `SPEC`,
                                      `voskhodMotors`, `couch`, on the Vostok's (`ENGINE_WORDS` in each writes the engines' words from their Measures);
                                      vostok-flies.ts, what a Vostok flight's parts do in flight)
    vehicles/cabin.ts                 a programme's seat and cabin (`CabinDef`): its instruments, lamps and controls, for every flight of the type
    vehicles/periscope.ts             Mercury's periscope: its door and objective on the flight's clock (`MechanismDef`, clocked moves)
    crew/<suit>.parts.ts              a suit's parts as flight data (sk-1.parts.ts)
  <nation>/places/<place>/            a place on the Earth and every pad in it, shared by every flight from them (cape-canaveral, tyuratam)
    place.ts                          the place (`PlaceDef`): its region (the globe's finer maps), its usual sky, its quiet
    <site>.ts                         a pad on the Earth (`SiteDef`: lc-5.ts, lc-14.ts, lc-19.ts, site-1.ts), each figure with its confidence and source
    <site>.parts.ts                   a pad's parts as flight data, said once for every flight from it, each giving its own
                                      morning (lc-5.parts.ts: `lc5Parts`, `PadDay`; site-1.parts.ts)
    <site>.md  <site>.py  <package>/  a pad's record and its Blender build, a package of modules (lc5/, site1/); what stands round it
                                      the same (complexes/: the Cape's neighbouring complexes; site2/: Site 2's assembly building)
    <package>/model/<date>.py         a dated state of what stood there, built to public/models/<nation>/places/<place>/<package>/<date>.glb
    tyuratam-*.ts  aral-1960.ts       the land round Site 1 as data: its ground (takyr, salt), its lie (SRTM), the builders' works; the Aral Sea's 1960 shore
    ground.ts                         the place's ground as data (viewer/scenery/ground.ts `GroundSpec`): its land and plants, what stands round its pads
                                      (the Cape's: plant communities, clearings, roads, palette, sea; Tyuratam's: where the steppe lies low, the builders'
                                      ground, the tracks and roads painted, the flame pit cut out, Site 2's building)
    scenery.ts                        the Cape's shore and its other launch complexes, each dated (`stood`: from, until, how sure) from May 1961 to
                                      1965, in latitude and longitude: the near ones a model of their own (complexes/, `pnpm model:cape`), the far
                                      ones stand-ins, Complex 5's own place seen from the other pads, the lighthouse
    steppe.ts  relief.ts  works.ts    Tyuratam's: the steppe as a kind of country in its seasons (ground, cel ground, palette, plants, snow); how high the ground
                                      is round Site 1 in JavaScript and GLSL (as site1/relief.py; tests/tyuratam.test.mjs); SRTM's lie and the Corona
                                      frames' railways, roads and tracks past Site 1's own ground
    tracks.ts                         Tyuratam's: the tracks onto Site 1's platform as lines, their bends curved where the rails are modelled, and a
                                      wagon's way west along them (as site1/tracks.py; tests/tyuratam.test.mjs): what the land paints and the fillers follow
    flights/<flight>/
      README.md                       the flight: what happened, timeline, sources
      spacecraft.md                   the ship: every dimension, how sure we are, what is simplified
      flight.ts                       the same facts as typed data (src/types.ts: Flight)
      orbital.ts  mission.md          an orbital flight's record as data (`Flight.orbital`), and the mission's record and plan in words
      weather.ts                      the weather it stood under, as recorded (`Flight.weather`: types.ts DayWeather): its site's sky is drawn from it
      aloft.ts                        the air over its pad and the surface's hours round liftoff, from ERA5 (tools/era5-aloft.mjs; weather.ts hands it on)
      pad.ts                          the pad's morning for a flight that has its own (vostok-2: Site 1 on 6 August 1961)
      model/<name>.py                 one Blender script per model: vehicle, pad, crew
      model/<name>.lod.json           its own level-of-detail thresholds, measured (tools/lod-thresholds.mjs); a site's dated models have theirs too
public/models/<nation>/<programme>/<flight>/<name>.glb      built models (committed)
public/globe/                         the globe's land and ice maps, six cube faces each (committed; tools/globe.mjs); its relief and its
                                      land's colours, six faces each (tools/globe-surface.mjs); and each site's region: <region>.near.png,
                                      .wide.png, .json (tools/globe-region.mjs), .relief.png, .colour.jpg, .surface.json (globe-surface.mjs),
                                      and <region>.<date>.weather.png, one for each day flown from it (tools/globe-weather.mjs)
public/front/                         the front page's picture (committed): the Earth as the Moon sees it, six cube faces side by side
                                      (earth.surface.png, earth.colour.jpg from public/globe/; earth.day.jpg, the hour's cloud, sea ice and
                                      snow from ERA5; earth.json: tools/front-earth.mjs), and the Moon (moon.colour.jpg, moon.whole.jpg,
                                      moon.wide.jpg, moon.near.jpg, .height.png, .colour.jpg, moon.json: tools/front-moon.mjs)
public/ephemeris/de440.bin            JPL's DE440 for 1957 to 2035 as Chebyshev segments (committed; `pnpm ephemeris`, world.md "Baking again"): fetched only when
                                      something asks for it (world/ephemeris.ts `loadEphemeris`)
docs/sources.md                       every source used or wanted, and what each is good for
src/
  types.ts                            the barrel: every type a flight's data has, gathered from types/ (and Confidence, Measure)
  types/flight.ts                     Flight, SitedFlight, Spec, Motor, TimelineEvent, FlightCheck
  types/model.ts                      ModelDef, Part, Move, Runs, Drive, Action, Command, ViewDef, the cabin (CabinDef) and its mechanisms
  types/site.ts                       SiteDef, the place it is in (PlaceDef), what stands round it (SiteAround), its region (RegionDef, RegionSurface, LaterWork)
  types/weather.ts                    DayWeather: the wind, each layer of cloud, the visibility, the weather beyond the station
  types/sim.ts                        what the simulator flies from: Trajectory, Body, MassPart, Thruster, ShedBody, ChuteDef, Limits, Curve
  measure.ts                          Confidence and Measure, and doc, derived, estimated: a figure with how far it can be trusted (imports nothing)
  util/math.ts                        smoothstep (GLSL's order), ease (smootherstep), clamp, lerp
  util/dom.ts                         esc, and `$(root, selector)`: an element the page's own markup must have, or an error naming it
  util/scope.ts                       what one owner hangs on the page (listeners, observers, timers, frames), let go of at once: a flight's page and its panels
  util/keys.ts                        every key as data (`KEYS`: pressed as, does, where); `is`/`which` for the listeners, caps and words for the legends; isTyping
  util/env.ts                         scripted, unattended, reducedMotion: what the page is being run by and asked for
  app/enter.ts                        the way in: front.ts for an address that names nothing, the Lineup for `#lineup`, main.ts for a flight
  app/debug.ts                        the debug handle, `window.sr`: what each page puts on it (a flight's, the vehicle-only, the front page, the Lineup), typed, installed in one place
  app/main.ts                         a flight's page: the stages it keeps, a session for the flight on show, the next opened on them with no reload
  app/session.ts                      the session of a flight with a site: the panels, the clock, the sound, the deck, the gallery, wired to the stage; `dispose`
  app/front.ts  app/home.ts           the front page: the list over its own picture, going into a flight under it, the words making way; and the way back out to it
  app/front/view.ts                   the front page's view as numbers: the instant, the lens, the camera's path, the sky from the Moon (pure, tested)
  app/front/scene.ts                  its scene: a renderer of its own, drawn from the eye, only when the picture changes, let go whole when a flight arrives
  app/front/earth.ts                  the Earth from the Moon (the globe's maps small, the day's cloud, the air)
  app/front/front.css                 the front page's looks
  app/lineup.ts                       the Lineup's page (`#lineup`): every vehicle side by side; what the address says, what is chosen, what stands in the row, its keys, its show
  app/lineup/row.ts                   its arithmetic on the flights' data and the history: the row, the programmes' sections, the timeline, the key figures, where
                                      each stands, which level of detail each is granted, the show's card, what a gallery's History tab is told, what of a
                                      vehicle is its spacecraft alone (pure, tested)
  app/lineup/scene.ts                 its scene: a renderer of its own, the row formed, each vehicle coarsest first and finest where the eye is, the camera's rigs, drawn only when it changes
  app/lineup/merge.ts                 a level joined by paint: its meshes in a few draws, corners in ten bytes, each wearing its paint by number (pure, tested)
  app/lineup/shelf.ts                 every file fetched once, known by its bytes, joined once and shared by every vehicle on it, let go with the last
  app/lineup/stand.ts                 one vehicle of the row: its levels and their fade, its spacecraft alone, its plate, its person, its own shadow drawn once
  app/lineup/hall.ts                  the hall it stands in: the gallery's studio made long, ruled in height, with a tape along the floor
  app/address.ts                      the address bar, the two places a flight is seen in, and what the gallery is given to show
  app/only.ts                         the session of a flight with no site: its gallery alone
  app/curtain.ts                      the curtain shown while something loads: what is coming, a bar that never goes back, the steps; it takes every key while it shows
  app/actions.ts                      on foot: what can be done with the thing being looked at (from flight data)
  app/prefs.ts                        what is remembered between visits
  app/mem.ts                          `?mem`: every GPU allocation the page makes, counted by bytes and by who asked (`srMem.report()`)
  app/demo.ts                         the idle show: the day run round, a tour of the flight, a callout on each thing; given a host, the site's or the gallery's
  ui/ui.ts  ui/style.css              the panels: one class that renders from the flight's data, and the page's looks
  ui/gallery.ts  ui/gallery.css       the gallery: the vehicle alone on a stage of its own, its History tab; the switch between the places
  ui/history.ts  ui/history.css       the history's words as the page writes them, the same on the Lineup's card and in a gallery's History tab: the story, the name, the crew, a programme, a moment
  ui/fold.ts  ui/fold.css  ui/sheet.ts  ui/sheet.css  a place on a phone (the gallery and the launch site alike): the control block docked in the sheet's View pane,
                                      the handle's button, the hint said once; the sheet a finger moves, and what the browser is told to leave alone
  ui/slider.ts                        every slider under a finger: a touch anywhere puts the thumb under it
  ui/wheel.ts                         a radial menu: a few choices round a centre
  ui/timebar.ts  ui/time.css          the clock's control
  ui/callout.ts  ui/callout.css       the idle show's callouts
  ui/title.ts  ui/logo.ts  ui/title.css  the front page's words (the way into the Lineup, the list of flights) and the mark
  ui/lineup.ts  ui/lineup.css         the Lineup's page: the card, the programmes, the timeline's strip and its words, and what is written on the picture
  ui/navball.css  ui/cockpit.css      the navball's and the flight deck's looks
  deck/deck.ts                        the flight deck, one for every flight: its three panels, keys and their buttons, the stick and roll, tucking, the card that ends a flight
  deck/cockpit.ts                     the deck's ballistic kind: a flight on a `trajectory` flown by hand, the live simulator stepped by the clock, the instruments
  deck/orbitdeck.ts                   the deck's orbital kind (`Flight.orbital`): the stages, the events and what the hands could reach, from the record
  deck/flown.ts                       the Flown panel: the simulator's run against the clock, and against the reports' figures; a flight flown by hand over it
  deck/navball.ts                     the navball: attitude against the local horizon, prograde and retrograde, guidance's aim (`ballOf` is the mathematics, pure)
  viewer/dispose.ts                   letting go of a tree's geometries, materials and pictures on the GPU (a flight or a place the stage has left)
  viewer/programs.ts                  the place's number in every program's key: another place or day is built again under its own shaders' text
  viewer/stage.ts                     the stage: one scene of a flight's models in their setting, the camera, the clock; it owns the pieces below and keeps
                                      the one API the page uses (`window.sr.stage`)
  viewer/stage/pipeline.ts            the frame from the scene to the screen: the passes, drawn from the eye, the drawing's resolution, the near plane fitted to what is there
  viewer/stage/cabinview.ts           the view from a seat: which is sat in (the site's on board, the gallery's exhibit), what is looked out of, the lean to it, the way in to a port
  viewer/stage/flightshow.ts          the flight on show: the vehicle where the run has it at the clock's instant, what it sheds carried off, its descent's figures and parachutes, jets, fires and trail
  viewer/stage/framing.ts             what the camera is sent to frame (a view, a part, a place, a window) in what the controls leave clear; framed again while followed, watched once taken
  viewer/stage/picker.ts              what is under the pointer: a part, another model, a window, a place round the pad, any spot; the hierarchies picks want, made in time to spare
  viewer/stage/shadows.ts             the Sun's shadows: the fine map and where it is spent (the section, the gallery's focus, the walker, the vehicle), its maps by size, the far map under it
  viewer/pick.ts                      what a ray meets, through each mesh's bounding volume hierarchy
  viewer/outline.ts                   the line round what is hovered or selected (three's OutlinePass from its mask on)
  viewer/overlay.ts                   what is drawn over the flight that is no part of it (a parachute's lines, the predicted path): drawn last, over the finished frame, under the cloud in front of it
  viewer/backdrops.ts                 the settings: orbit, studio, and a place's ground under its sky, round the flight's pad, on its day
  viewer/scenery/ground.ts            a place's ground as data (`GroundSpec`) laid out round one of its pads on a day (`groundPlace`): the land, its plants,
                                      what stood there that day (`stood`), turned to lie round the pad model
  viewer/scenery/compass.ts           the compass round a pad: a latitude and longitude, or another pad's frame, as metres east and south of it (frames.ts)
  viewer/scenery/places.ts            each place's ground by its name (`GROUNDS`): a new place is a line here
  viewer/scenery/kit.ts               shapes for scenery too far off to be modelled: boxes, bars, drums and lattices in a few paints, one mesh a paint
  viewer/studio.ts                    the studio: a sweep under three designed lights, dark, light or paper; a person and a pole for scale
  viewer/labels.ts                    names on the parts of a thing taken apart: which have come clear, where the labels go
  viewer/land.ts                      any site's ground: cover maps baked from its GLSL, a mesh that follows the eye, thickets as a lifted roof
  viewer/flora.ts                     any site's plants: species built from forms (shrub, fan, palm, flower, rosette), placed by the cover map, near and far forms, wind
  viewer/plantsort.ts                 which plants are drawn in which form: tiles packed once, each layer sorted again on its own margin
  viewer/globemesh.ts                 the globe's mesh, written without allocating, and when it is owed again
  viewer/field.ts                     noise that gives the same answer in JavaScript and GLSL (the ground's height is needed in both)
  viewer/glsl.ts                      GLSL said once: a colour or triple written into shader text (`vec3`, each caller's digits kept), the general noise
  viewer/air.ts                       the air: haze that thins with height (in three's fog chunks), the cumulus field, its shadows on the ground,
                                      the Sun's light under a veil of high cloud
  viewer/day.ts                       a day's weather as it is drawn: a flight's record (DayWeather) turned into the air, the clouds, the map and the light
  viewer/clouds.ts                    the cumulus as a volume: heaped on air.ts's field, their skin worn by finer lumps, lit as cloud is (the Sun's light
                                      marched through them and scattered, the sky above, the ground below), ray-marched at a quarter of the pixels, laid over the frame
  viewer/cloudnoise.ts                the clouds' two tiles of noise as bytes (pinned by digest in tests/)
  viewer/cloudnoise.worker.ts         makes those tiles off the page's thread
  viewer/around.ts                    what stands round a place beyond its own model (`SiteAround`: Site 2's assembly building; the Cape's neighbouring complexes), fetched as scenery at its levels of detail and set on the land
  viewer/lod.ts                       levels of detail: which one each model and each piece of the place is drawn at, and the fade from one to the next
  viewer/shadows.ts                   the Sun's second shadow map: the whole place, coarsely, under the fine one
  viewer/shadowcache.ts               on foot, the fine shadow map kept between steps: only the walker drawn into it again while nothing else has changed
  viewer/quality.ts                   the net under the frame rate: for a weak machine, if chosen: resolution lowered a step only while frames stay under 30 a second, and put back
  viewer/tier.ts                      what the device can hold: the full tier, and the lighter one a phone is given (sizes, what is made only when seen)
  viewer/pictures.ts                  a model's pictures and index lists at the size the tier allows, before anything is sent to the GPU
  viewer/lost.ts                      a WebGL context taken away, or an allocation refused: the loop stopped, a word, the way back in the lighter tier
  viewer/look.ts                      the real and cel-shaded looks, and the ink line
  viewer/laid.ts                      what lies on the ground kept apart in depth at any distance (polygon offset by material name)
  viewer/bloom.ts                     the glow round what is over-bright: sized in CSS pixels, added in the output's pass
  viewer/surface.ts                   what large plain surfaces look like from a metre away: grain by material name
  viewer/bulk.ts                      where a part's bulk is: the middle of its surface, the same however it is cut into meshes (a callout's point)
  viewer/panes.ts                     panes of glass as two meshes each, so three does not look their shader up again twice a draw
  viewer/onfoot/onfoot.ts             being at the place on foot, as the stage has it: the figure walked as, what it aims at, drives, boards and carries, doors and lifts, a fall it goes limp in, the figure posed
  viewer/onfoot/handworks.ts          the functions of a model's parts worked by hand (a tower raised, a jib lowered), held until the script moves the hardware, and their levers
  viewer/onfoot/walk.ts               walking the site on foot: footing, collision, input, the view at the eyes or over the shoulder (the camera put there by camera/foot.ts)
  viewer/onfoot/gait.ts               how a jointed figure moves its limbs: walk, run, stand, jump, from distance and speed
  viewer/onfoot/ragdoll.ts            a figure gone limp after a long fall: points, sticks, and the bones laid along them
  viewer/onfoot/works.ts              things that work when worked: doors (toggles) and lifts, from a part's actions
  viewer/onfoot/drive.ts              driving: a kinematic bicycle model and the vehicle contract's nodes
  viewer/onfoot/carry.ts              what a walking figure has in its hand, by the model's grip contract
  viewer/onfoot/hose.ts               a hose or tether of fixed length hanging between two moving anchors
  viewer/moon.ts                      the Moon as a body (`MoonBody`): its relief at three sizes and colour from its bake, its own light; the front page's, under its camera
  viewer/space.ts                     the sky from above the air (Sun, Moon, stars) and its reflections, the Earth in them at the flight's height; the wear texture
  viewer/explode.ts                   exploded-view motion
  viewer/runs.ts                      what slides or drives stands on what it runs on: wheels on rails or ground, body pitched between them
  world/bodies.ts                     the Sun, Earth, Moon and planets as data: GM, radii, figures, rotation, mean orbits; standard gravity (G0), what falls on each (gravityOn)
  world/time.ts  frames.ts            Julian dates, sidereal time; geodetic, Earth-fixed, inertial and site frames
  world/earthframe.ts                 the frame a flight is flown in (of date, or fixed at liftoff), made once from its liftoff: the Earth's angle in it and every turn between it and the Earth
  world/ephemeris.ts  stars.ts        where the Sun, Moon and planets are (`stateOf`, the sky from a site): DE440 when loaded, Meeus else; the 518 brightest stars
  world/jpl.ts                        the baked DE440 read: each series's Chebyshev segments, positions and velocities in the ICRF
  world/aloft.ts                      a day's column of air (DayWeather.aloft) read at any height, and its hours at any instant
  world/ut1.ts                        UT1 - TAI from the IERS (tools/ut1-bake.mjs): what the Earth's turn is behind atomic time, every 0.05 year since 1956
  world/moon.ts                       the Moon's own frame: its axes at an instant, the librations, the points under the Earth and the Sun
  world/orbit.ts                      orbits: elements to and from state, J2 gravity and its steady rates, a coast, the place below, site to inertial, the Earth's shadow
  world/surface.ts                    the sea as a shape: the ellipsoid (any body's figure) at a site's sea level, radii of curvature, the horizon
  world/region.ts                     a piece of the Earth laid flat: the gnomonic plane a region's map is baked on and read from
  world/relief.ts                     how a height is kept in a byte, for the relief maps and the shaders that read them
  world/clock.ts                      the simulation clock: seconds from a flight's launch, stopped until run; its rates, the coast's when let, and an instant held
  world/sequence.ts                   a slider joined to the clock: keyframes, sliderAt, timeAt
  viewer/globe.ts                     the Earth to scale under the site: coasts from Natural Earth, the land's colours (Blue Marble) and relief and the
                                      sea by its depth (ETOPO), the weather's shadows, the Sun's glint; the air seen from above, drawn on a ball
  viewer/atmosphere.ts                the air as it scatters light, ground to orbit: Rayleigh, haze, ozone, light scattered many times; two tables
                                      made once on the GPU, and the GLSL that walks a ray through it
  viewer/weather.ts  weathermap.ts    the weather round a site on a day as a map (the record where it speaks, estimated elsewhere): cumulus cover,
                                      middle deck, high cloud; the sheets' textures (cloudlets, fibres, a veil); the day and its map as shared uniforms
  viewer/pack.ts  units.ts            one-channel maps packed into one cube and one array texture on the GPU; the texture-unit budget and its check
  viewer/later.ts                     what the first view does not need, fetched once the scene is up
  viewer/heavens.ts  daysky.ts        the Moon, stars and planets drawn; light and sky colours by the Sun's height
  viewer/lamps.ts                     floodlights: every lamp lens a model carries lights the scene after dark
  viewer/origin.ts                    drawing from the eye: the GPU sees only eye-relative positions (a floating origin)
  viewer/ascent.ts                    the flown vehicle in the scene: where the simulator has it, and what it has shed
  viewer/plume.ts                     the engine's fire as data: its place, how hard it burns, the shape the air lets it take, its light on the pad
  viewer/flames.ts                    what a fire looks like by what it burns: its colours, its light, how much it hides (each with its source)
  viewer/fires.ts                     which fires burn when and how hard, an engine's chambers found in its geometry, the jet's edge and where a cluster's jets merge (pure: tests/fires.test.mjs)
  viewer/trail.ts                     the smoke it leaves as data: the trail along the path flown (steam low down, a contrail in the cold), the cloud over the pad at liftoff
  viewer/exhaust.ts                   fire and smoke drawn as volumes (the one thing here meant to look real): marched at a quarter of the pixels, laid over the frame; the smoke's shadow
  viewer/chute.ts                     the parachutes, drawn from Flight.flies.chutes: out, filling, reefed, full, and down on the sea
  viewer/jets.ts                      the attitude jets, seen: a pale cone at each chamber that is open, from the thruster data
  viewer/effects.ts                   what the air does, seen and felt, at the clock's instant: fed by FlightShow.lift, and the camera's shake for the draw
  viewer/entry.ts                     incandescence by black-body colour, the shock layer's glow as a marched volume, the collar of cloud at Mach 1
  viewer/shake.ts                     the camera shaken: engine sound, buffet, load and jolts as levels, band-limited noise in the clock's time
  viewer/cabin.ts                     a model's inside as somewhere to fly from: its needles and lamps read the flight, its controls work, its periscope shows outside
  viewer/gauges.ts                    what an instrument reads and where that puts its needle: scales, counter wheels, attitude from axes (pure, tested)
  viewer/path.ts                      the predicted path, drawn: a ribbon of constant width ahead of the vehicle and the line flown behind, its markers and the ring where it comes down; its switch and figures
  viewer/pathline.ts                  the path's line as numbers: its ribbon's vertices, a prediction eased from the last by instant, the rules that keep it off the vehicle (pure)
  viewer/pathmarks.ts                 where the path's markers go on the page: by rank, off the panels, the vehicle and each other, and staying put; and the chips at the view's edge for those not in view (pure)
  viewer/lookouts.ts                  what can be looked out of from a cabin's seat, from its data: its windows by name, then its periscope
  viewer/fly.ts                       the free camera's flying: heading, pitch, speed by height (`Flyer`)
  viewer/camera/index.ts              the camera: every rig, which is in charge, the handover between them, where the pivot is shown
  viewer/camera/maths.ts              its arithmetic, pure and tested: zoom by proportion, what a zoom may move, easing and coasting by time, framing
  viewer/camera/rig.ts                what a rig is (`Rig`), the rigs there are (`RigId`, `RIGS`), and what one may ask of the world (`World`, `Craft`)
  viewer/camera/orbit.ts              turning about a pivot (`OrbitRig`), and about a vehicle that carries it (`ChaseRig`: level with the horizon, or locked to the vehicle)
  viewer/camera/free.ts  onboard.ts  track.ts   the free camera; first person from a seat; the pad camera that stands still and follows with a long lens
  viewer/camera/foot.ts               the rigs on foot (`eyes`, `shoulder`): the camera put where the walker's view is
  viewer/camera/head.ts               a head in a seat, pure and tested: its limits, the eyes round the neck, the lean to a port or a screen and back
  viewer/camera/input.ts              the hands: mouse, trackpad, fingers and keys in one vocabulary (drag, slide, zoom, twist, pivot here)
  sim/fly.ts  sim/atmosphere.ts       the simulator: a ballistic flight integrated from its plan, whose hardware it finds by role (`ballisticOf`); the 1976 standard air
  sim/vehicle.ts  sim/rigid.ts        the live simulator: the same flight stepped a frame at a time and steered, as a rigid body; quaternions and mass properties
  sim/air.ts                          the air at a point for every simulator: where it is over, its height, the standard air, the motion through it with the day's wind (`airAt`, `blowOf`)
  sim/core/gravity.ts                 gravity as terms: the Earth with J2 (the default), a third body as a point mass, the central body switched
  sim/core/rk4.ts                     the one fixed-step integrator: fourth-order Runge-Kutta for a point and for a rigid body; gravity and push summed
  sim/apparent.ts                     a stage's apparent-velocity integrator: what it senses, its trapezoid, where its sum reaches its setting
  sim/thrust.ts                       one law of thrust for every engine: throttle times vacuum thrust, less exit area times the air's pressure
  sim/forces.ts  sim/shed.ts          the air on any rigid body (axial drag by the leading end, fins, cross-flow), one body made two with its momentum kept; what a vehicle sheds, flown
  sim/descent.ts                      one body of an orbital descent as it comes down (`Descent`): its mass, drag, parachutes and their tearing; flyDown and the path ahead both fly it
  sim/orbital.ts                      a flight into orbit: its record as data (`Flight.orbital`: stages, events, the orbit, the braking burn, the entry) and the coast flown from it (`flyOrbit`)
  sim/staged.ts                       an orbital flight's powered ascent, flown whole: stages burning together and in turn, dropped as the record says, on its steering law
  sim/stagedlive.ts                   the same ascent stepped a tick at a time and steered by hand or by guidance
  sim/staging.ts                      what happens when a hand stages a vehicle: the rules every vehicle is held to, whatever it is
  sim/lever.ts                        an engine's throttle lever as a hand has it: where it stands, and what it asks of the vehicle each tick
  sim/misses.ts                       the recorded misses: where a flown run falls outside a documented check's tolerance, and why
  sim/heating.ts                      the air's heat: stagnation-point heat flux (Sutton and Graves) and each named surface's temperature as a lump
  sim/loads.ts                        what a structure is limited by (q alpha, load factors), and when it gives
  sim/mechanism.ts                    a mechanism on a programme that a hand can take (a periscope and its door): how far out it is at an instant
  sim/autopilot.ts                    what flies it when a hand does not: the control law (`steer`), the sequencer, a whole flight flown live (`flyLive`)
  sim/verdict.ts                      how a flight flown by hand ended, said plainly, and whether it was survivable by the flight's stated limits
  sim/predict.ts                      looking ahead from a state: one propagator for every vehicle (error-controlled, in slices), the path if nothing more is done, its apsides, events, impact or orbit (pure)
  sim/fliers.ts                       the vehicles it flies: a ballistic flight's, an orbital spacecraft alone, a staged stack with its engines stopped; each with its own simulator's forces (pure)
  sim/plan.ts                         what a flight is flown from, one shape for every kind: its craft (bodies, joints, engines on tanks, thrusters, parachutes, limits), events (triggers, actions), attitudes, checks; `problems` says what is wrong with one
  sim/planof.ts                       a plan made from each of today's two shapes (`Trajectory`, `OrbitalFlight`), until the flights' data says its plan itself
  sim/craft.ts                        the one machine a craft is flown by: what is lit, let go and gone, what is out, which events have happened, as its plan's hardware allows
  sound/audio.ts                      what the walk and a driven vehicle are heard as (an interface, silent until something that plays is given), and the board every posed move that names a machine is told to (`machinery`)
  sound/model.ts                      what the flight sounds like, as numbers: levels, filter frequencies, delays and Doppler from the sample and where the ears are; and the works: engines, tyres and machines on the ground (pure, tested)
  sound/engine.ts                     the Web Audio graph those numbers are set on: noise, filters, envelopes, the works' six voices; no recordings
  sound/index.ts                      the joinery: the clock, the scene's run and the camera in; the speaker by the clock, U, the volume
tools/
  build-model.mjs                     runs a flight's model scripts through Blender
  lod-thresholds.mjs                  each model's and piece's own level-of-detail thresholds, kept in model/<name>.lod.json, put into the GLB's extras
  lod-measure.mjs                     the measuring behind lod-thresholds.mjs, in a browser: each model and piece, at each level, against distance
  shot.mjs                            one screenshot of the viewer, for looking at a change
  bench.mjs                           the performance benchmark (`pnpm bench`): frames, load and a soak, with A/B and pixel comparison (rendering.md)
  flicker-test.mjs                    browser check for z-fighting
  flights-test.mjs                    browser check of going flight to flight with no reload: the right flight each time, memory and listeners back to their level, Back and Forward
  frozen-test.mjs                     browser check that a frozen stage draws the same frame twice, both looks
  camera-test.mjs                     browser check of the camera: the sequences that went wrong, then a seeded soak of mixed input
  places-test.mjs                     browser check of going between a flight's places: slow loads, a change of mind, the shows, what both remember
  history-test.mjs                    browser check of Back and Forward between the front page, flights and places, with real clicks; a gallery's History tab and its way to the Lineup
  mem-test.mjs                        browser check of what the page holds on the GPU as a phone (ready, late, on foot, in flight), against a budget
  wheels-test.mjs                     browser check that every slide and drive keeps each wheel on what it runs on, at each site
  walk-test.mjs                       browser check that a site can be walked: on foot with the real W key along the ways a person could have gone (Site 1's), every leg arriving with its feet on the floor
  front-test.mjs                      browser check of the front page: what a bare address shows, going into a flight and back out, what it draws when, what it holds as a phone
  lineup-test.mjs                     browser check of the Lineup: every flight in the row at one scale, the card, the way into a gallery and back, the levels of detail,
                                      draw calls, the spacecraft alone, the gallery's tab kept, going along the row on a phone, the show's card, what it holds as a phone
  around-test.mjs                     browser check that what stands round a site is drawn at the level its size on screen calls for
  deck-test.mjs                       browser check of the flight deck's promises for every flight that can be flown, at a desk, a tablet and a phone
  fires-test.mjs                      browser check that every engine burning on the record's flight has its fire, hung where it should be
  chute-test.mjs                      browser check that a parachute's lines are drawn over the land, the sea, the air and the cloud behind them, from the chase view, at 1280 and 390, in both looks
  path-test.mjs                       browser check of the predicted path's promises: flown live through the flights and by scripted hands, seen from each rig and from far out, measured frozen, on pages run at once
  seat-test.mjs                       browser check of every seat of every flight, sat in from the gallery by the control and by C, at 1280 and 390
  sound-test.mjs                      browser check of what is heard on the ground, read off `sr.sound.voices`: a car driven and got out of, a machine worked by hand, a vehicle on the clock
  front-earth.mjs                     bakes the Earth as the front page sees it: the globe's maps small, and the hour's cloud, sea ice and snow from ERA5
  front-moon.mjs                      bakes the Moon as the front page sees it, from NASA's CGI Moon Kit: colour, relief at three sizes, the finest's cast shadows
  shot.mjs                            one screenshot of the viewer, for looking at a change
  browser.mjs                         the one browser every browser tool launches (Chrome, ANGLE's back end, headless or not, from SR_* in the environment: macOS and Linux), and the page opener, options and checks they share
  bench.mjs                           the performance benchmark (`pnpm bench`): frames, load and a soak, with A/B and pixel comparison (rendering.md)
  globe.mjs                           bakes public/globe/ from Natural Earth's coastlines: distances to the shore on a cube's faces
  globe-region.mjs                    bakes a place's region (PlaceDef.region) round a pad from OpenStreetMap's coast and lakes, as it stood on its date
  globe-surface.mjs                   bakes the globe's relief (ETOPO 2022) and its land's colours (Blue Marble, May), and each place's region's (`region.surface`), finer; needs GDAL
  globe-weather.mjs                   bakes a flight's day's weather map (<region>.<date>.weather.png) from its record, weather.ts, the land map and the relief
  ephemeris-bake.mjs                  bakes public/ephemeris/de440.bin from JPL's DE440 kernel (de440s.bsp): each body refitted and measured against it
  era5.mjs                            ERA5 as the tools read it: the ARCO-ERA5 store, Blosc and LZ4, whole fields and the blocks round a place by range
  era5-aloft.mjs                      bakes each flight's aloft.ts: ERA5's column over its pad at the hour nearest liftoff, and the surface's hours round it
  ut1-bake.mjs                        bakes src/world/ut1.ts from the IERS's EOP C01 series: UT1 - TAI since 1956
  stars.mjs                           bakes the stars (the Bright Star Catalogue: stars.ts and public/sky/stars.bin) and the Milky Way (NASA's map)
  figures.mjs                         the simulators' figures to the last digit, every run the tests fly, against tests/fixtures/figures.json (`pnpm figures`; made on hal9000, not in `pnpm check`)
  png.mjs                             one-channel PNGs written and read without a library (the globe's maps)
  logo.mjs                            writes the mark (src/ui/logo.ts) to docs/logo.svg (README) and public/og.png (link previews): run after changing it
  blender/srlib.py                    shared geometry helpers, clearance check, run()
  blender/fonts/LiberationSans-Bold.ttf  the one typeface models' lettering and panel legends are built in, on any machine (srlib.load_font)
  blender/fonts/LICENSE               its licence: the SIL Open Font License 1.1, as Liberation Fonts 2.1.5 ships it
  blender/sitelib.py                  what any site is built from: walls with openings, stairs, ladders, doors, poles
  blender/figurelib.py                what any crew figure is built from: a body's measures and joints, the trunk and trousers as skins, hands, a head,
                                      the pose; a suit is a garment module on top (crew/mark_iv_suit.py, crew/sk_1.py)
  blender/interiors.py                rooms' insides: what is seen through a site's windows
  blender/vehicles.py                 period road vehicles from parameters, built to be driven
tests/                                node --test: one file per module or promise; layout.test.mjs holds this list to the tracked files
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
road), flies over and turns about it (`Framing.visit`). A figure that has been walked somewhere stays
where it was left.
