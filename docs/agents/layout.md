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
                                      (mercury-redstone.ts: `plan`, `Day`, `HARDWARE`, `CHUTES`; vostok-8k72k.ts; vostok-3ka.ts, the spacecraft; vostok-plan.ts, a Vostok's plan from its record; vostok-record.ts, the record's shape;
                                      mercury-capsule.ts, the capsule on either launch vehicle: `along`, the azimuths, `THRUST` and `lb`; mercury-afloat.ts, a capsule in the sea (`capsuleAfloat`),
                                      `stackParts`; mercury-atlas.ts, the capsule on its Atlas: `mercuryAtlasStack`, `mercuryAtlasParts`,
                                      `VIEW`, `SPEC`, `ATLAS`, `mercuryAtlasMotors`; mercury-atlas-plan.ts, a Mercury-Atlas's record
                                      (`MercuryAtlasRecord`, its flight's orbital.ts) and the plan written from it (`mercuryAtlasPlan`), the Atlas every
                                      Atlas flight shares (`AtlasRecord`, `atlasPieces`);
                                      mercury-redstone-stack.ts, the capsule on its Redstone on the pad: `mercuryRedstoneStack`,
                                      `mercuryRedstoneParts`, `SPEC`, `mercuryRedstoneMotors` (the A-7's thrust each flight's own, as measured);
                                      gemini-titan.ts, a Gemini on its Titan: `geminiTitanStack` (each part's place, the views), the cabin, the type's
                                      sizes (`SIZE`), engines and thrusters (`THRUST`), each flight giving its words and differences;
                                      gemini-titan-plan.ts, a Gemini-Titan's record (`GeminiTitanRecord`, its flight's orbital.ts) and the
                                      plan written from it (`geminiTitanPlan`: the Titan's two stages hot-staged, the burns in orbit, the
                                      lifting entry); gemini-flies.ts, what its parts do in flight (`geminiFlies`, `geminiCommands`, the chutes);
                                      oams-attitude.ts, the orbit attitude and manoeuvre system's eight attitude chambers and the attitude
                                      control electronics' figures as the attitude is flown with them (`OAMS_ATTITUDE`, `OAMS_ATTITUDE_SET`);
                                      gemini-targets.ts, what a Gemini went up to meet: the Agena's and the ATDA's nodes, figures and motors,
                                      and the heading a target stands under beside its flight's vehicle (`TARGET_GROUP`, `lifted`);
                                      target-flight.ts, target-launches.ts, target-pad.ts, an uncrewed target's flight (`targetFlight`, its
                                      `flies`), its launch's identity and its dated Complex 14 stack; target-plan.ts, a target launch's record
                                      (`TargetRecord`, `targetRecord` from its report's figures, its flight's orbital.ts; `PLANNED_GAATV`) and the
                                      plan written from it (`targetPlan`: the Atlas SLV-3 from mercury-atlas-plan.ts `atlasPieces`, its verniers
                                      alone, the Agena's coast and ascent burn or the ATDA put in orbit by the Atlas, a failed flight's `planned`);
                                      saturn-v-record.ts, saturn-v-plan.ts, saturn-v-flies.ts, a Saturn V flight's record (`SaturnVRecord`, its
                                      flight's orbital.ts), the plan written from it (`saturnVPlan`: the S-IC's five F-1s, the S-II's five J-2s
                                      with its centre cut as flown and its four cut at the record's instant or when the run has spent its propellant
                                      (`siiSpent`), the tower, the S-IVB's parking-orbit burn and its translunar injection on a
                                      law of its own, the coast with the Moon) and what its model sheds and burns (`saturnVFlies`);
                                      saturn-ib-record.ts, saturn-ib-plan.ts, saturn-ib-flies.ts, a Saturn IB flight's record (`SaturnIBRecord`,
                                      its flight's orbital.ts), the plan written from it (`saturnIBPlan`: the S-IB's eight H-1s, the S-IVB's J-2
                                      to the orbit, the tower, the spacecraft parted, its firings in orbit as `Burn`s, the modules parted, the
                                      entry, the Earth landing system to the sea; `CSM_MATING_HEIGHT`) and what its model sheds and burns
                                      (`saturnIBFlies`);
                                      csm-record.ts, csm-plan.ts, the command and service modules as any Apollo record has them (`CsmRecord`,
                                      `Burn`, `EntryRecord`, `ElsRecord`) and their part of the plan, whatever carried them up (`csmBodies`,
                                      `csmJoints`, `csmEngines`, `csmSheds`, `burnEvents`, `modulesParting`, `elsEvents`, `elsChutes`;
                                      `localAim`, `CSM_OUTSIDE`);
                                      apollo-lunar-record.ts, apollo-lunar-plan.ts, a Saturn V flight flown to the Moon and home
                                      (`ApolloLunarRecord`: a Saturn V record and the spacecraft's, its flight's orbital.ts) and the plan written
                                      from it (`apolloLunarPlan`: `saturnVPlan` to the injection, the spacecraft's parting, each firing solved for
                                      what it was for, the modules' parting, the entry, the landing system; the Moon's field and the sphere);
                                      lm-plan.ts, the lunar module as a craft of its own (`lmPlan`: the DPS with its range and full throttle
                                      position, the APS, the staging joint fired into, the legs), from a flight's lm-record.ts (`LmRecord`);
                                      lm-rcs.ts, its sixteen attitude thrusters at R-567's places (`lmRcsChambers`, `lmRcsSet`);
                                      sm-rcs.ts, the service module's reaction control system as the attitude is flown with it (`smRcsChambers`,
                                      the sixteen chambers at their quads; `smRcsSet`, with the SCS's deadbands and minimum impulse; `massRow`);
                                      skylab/vehicles/skylab-plan.ts, what the Skylab visits' plans share: the workshop as a target given by
                                      its orbit (`workshopTarget`, `workshopInPlane`, `WORKSHOP_DRAG_AREA`), the escape from Pad 39B
                                      (`skylabAborts`), the steered entry (`skylabEntry`), the flight scene (`skylabFlies`);
                                      command-module-aero.ts, the Block II command module's trim drag (CM-107's, TN D-6725);
                                      vostok-stack.ts, a Vostok on its 8K72K: `vostokStack`, `vostokParts` (each part's place), the views,
                                      the type's specs (`SPEC`) and engines (`vostokMotors`), `along` and the azimuths;
                                      voskhod-11a57.ts, a Voskhod on its 11A57: `voskhodStack`, `voskhodParts`, `VIEW`, `SPEC`,
                                      `voskhodMotors`, `couch`, on the Vostok's (`ENGINE_WORDS` in each writes the engines' words from their Measures);
                                      voskhod-11a57-flown.ts, the 11A57 as the orbital simulator flies it (`stages11A57`, `ascent11A57`, Block I);
                                      voskhod-ship.ts, the Voskhod as it comes down (the cover, the canopies, the soft-landing rocket, the crew aboard);
                                      voskhod-flies.ts, what a Voskhod flight's parts do in flight; a Voskhod's record is a `VostokRecord`;
                                      vostok-flies.ts, what a Vostok flight's parts do in flight;
                                      soyuz-record.ts, a Soyuz's record (`SoyuzRecord`: an R-7 flight's with its modules,
                                      its main engine, its burns in orbit and a lifting entry); soyuz-plan.ts, its plan (`soyuzPlan`:
                                      vostokPlan's, with the ship's own laid on); soyuz-11a511-flown.ts, the 11A511 as flown (`stages11A511`,
                                      `ascent11A511`: its table's blocks, the escape tower, its stations); soyuz-7kok-flown.ts, the 7K-OK as
                                      flown (the main engine, the descent module's air, its parachutes and soft-landing engines, the crew
                                      aboard); soyuz-7koks-flown.ts, the first station ferry (7K-T Nos. 31 and 32) beyond it, and Soyuz 11's
                                      planned descent; soyuz-7kt-flown.ts, the two-seat ferry (7K-T from No. 34); soyuz-flies.ts, what a
                                      Soyuz flight's parts do in flight, the ship's nodes by model (`ShipNodes`))
    vehicles/cabin.ts                 a programme's seat and cabin (`CabinDef`): its instruments, lamps and controls, for every flight of the type
    vehicles/reference/               source-derived data a vehicle module reads at build time (Apollo's: survey outlines as JSON,
                                      the DSKY's front web and panes as .json.gz), each with its source's hash, and the
                                      rebuild_*.py that wrote it from the source. Not needed to build the viewer or its tests (the GLBs
                                      are committed) and not needed to build a model again: only to remake the data. The rebuild
                                      scripts run outside the devshell, with Python packages it does not have, as each docstring
                                      says: `uv run --with cadquery-ocp==8.0.1.1.0 --with numpy --with scipy --with shapely
                                      rebuild_dsky_front.py <step> <survey.glb>` (it runs Blender itself for the survey);
                                      rebuild_console_apertures.py needs numpy, scipy and shapely; rebuild_dsky_panels.py the standard
                                      library alone. vehicles/reference/README.md says what each file is and where it came from
    vehicles/periscope.ts             Mercury's periscope: its door and objective on the flight's clock (`MechanismDef`, clocked moves)
    crew/<suit>.parts.ts              a suit's parts as flight data (sk-1.parts.ts; g4c-suit.parts.ts, with a Gemini man standing at Complex 19; g5c-suit.parts.ts)
    crew/<suit>_wearers.py            every wearer a suit's module names, built at every level of detail under the clearance check in one
                                      Blender run, nothing exported (sk_1_wearers.py: run it after touching sk_1.py; its header has the command)
  usa/places/moon/                    the Apollo landing sites, each a `LunarSiteDef` (<site>.ts: its `SiteDef` on the Moon, its terrain's products, its descent's heading) and its .md; place.ts the Moon as a place, sites.ts every site and how their ground is baked
  <nation>/places/<place>/            a place on the Earth and every pad in it, shared by every flight from them (cape-canaveral, tyuratam)
    place.ts                          the place (`PlaceDef`): its region (the globe's finer maps), its usual sky, its quiet
    <site>.ts                         a pad on the Earth (`SiteDef`: lc-5.ts, lc-14.ts, lc-19.ts, site-1.ts), each figure with its confidence and source
    <site>.parts.ts                   a pad's parts as flight data, said once for every flight from it, each giving its own
                                      morning (lc-5.parts.ts: `lc5Parts`, `PadDay`; lc-14.parts.ts; site-1.parts.ts; lc-19.parts.ts: `lc19Parts`, `Lc19Day`,
                                      `lc19Pad`, `lc19Vehicle`, the pad's specs)
    <site>.ground.ts                  a pad's own ground where it is the origin (the Cape's ground.ts `PadGround`: lc-14.ground.ts; lc-19.ground.ts:
                                      `LC19_GROUND`): its clearing, roads, what is kept bare, where the land is let down for a pit or a flume
    <site>.md  <site>.py  <package>/  a pad's record and its Blender build, a package of modules (lc5/, lc14/, lc19/, site1/); what stands round it
                                      the same (complexes/: the Cape's neighbouring complexes; site2/: Site 2's assembly building and its yard; ip1/: the measuring point IP-1)
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
      orbital.ts  mission.md          an orbital flight's record as data, which its plan is written from, and the mission's record and plan in words
      weather.ts                      the weather it stood under, as recorded (`Flight.weather`: types.ts DayWeather): its site's sky is drawn from it
      aloft.ts                        the air over its pad and the surface's hours round liftoff, from ERA5 (tools/era5-aloft.mjs; weather.ts hands it on)
      afloat.ts                       (Liberty Bell 7) the capsule in the sea after the landing: its weight afloat, the record's instants to its going down, the helicopter (`flies.afloat`), the hatch thrown off (`flies.hatch`)
      recovery.ts                     (Liberty Bell 7) Hunt Club 1 flown on the record's clock: in, round, over the capsule, its line on it, away (`Flight.recovery`); Hunt Club 3 and its hoist, and Grissom in the sea (`Flight.swimmer`)
      lm.ts                           (a lunar landing) its lunar module's record as data (`LmRecord`: masses, loads, mass properties, probes), which vehicles/lm-plan.ts writes its plan from
      pad.ts                          the pad's morning for a flight that has its own (vostok-2: Site 1 on 6 August 1961; vostok-3 and vostok-4: on 11 and 12 August 1962;
                                      ma-6-friendship-7: Complex 14 on 20 February 1962, with its pilot at the structure's foot; ma-7-aurora-7: on
                                      24 May 1962; ma-8-sigma-7: on 3 October 1962; ma-9-faith-7: on 15 May 1963; gt-3: Complex 19 on 23 March 1965;
                                      gt-4: on 3 June 1965; gt-5: on 21 August 1965; gt-7: on
                                      4 December 1965; gt-6a: on 15 December 1965;
                                      gt-8: on 16 March 1966; gt-9a: on 3 June 1966)
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
                                      moon.wide.jpg, moon.near.jpg, .height.png, .colour.jpg, moon.site.bin (the ground round where the
                                      camera starts, whole), moon.json: tools/front-moon.mjs)
public/lunar/                         each Apollo landing site's ground (<site>.terrain.bin, <site>.descent.bin: tools/lunar-terrain.py) and its finest map for the flight scene's Moon (<site>.moon.json, .near.jpg, .near.height.png, .near.colour.jpg: tools/front-moon.mjs --sites), and the Earth's cloud, sea ice and snow at the hour its LM landed for the lunar setting's sky (<site>.earth.day.jpg, .earth.json: tools/front-earth.mjs --lunar), committed; the whole Moon's maps are the front page's
public/ephemeris/de440.bin            JPL's DE440 for 1957 to 2035 as Chebyshev segments (committed; `pnpm ephemeris`, world.md "Baking again"): fetched only when
                                      something asks for it (world/ephemeris.ts `loadEphemeris`)
docs/ideas.md                         what the simulator lacks to play as a game: not a plan, kept so it is not forgotten
docs/sources.md                       every source used or wanted, and what each is good for
docs/readme/                          the README's pictures (tools/shot.mjs stills as JPEGs, 1400 wide): taken again when what they show changes
src/
  types.ts                            the barrel: every type a flight's data has, gathered from types/ (and Confidence, Measure)
  types/flight.ts                     Flight, SitedFlight, Spec, Motor, TimelineEvent, FlightCheck
  types/model.ts                      ModelDef, Part, Move, Runs, Drive, Action, Command, ViewDef, the cabin (CabinDef) and its mechanisms
  types/site.ts                       SiteDef, the place it is in (PlaceDef), what stands round it (SiteAround), its region (RegionDef, RegionSurface, LaterWork)
  types/weather.ts                    DayWeather: the wind, each layer of cloud, the visibility, the weather beyond the station
  types/sim.ts                        what the simulator flies from: Body (a stack as a rigid body), MassPart, Thruster, ShedBody, ChuteDef, Limits, Curve
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
  app/front/view.ts                   the front page's view as numbers: the instant, the lens, the place the camera starts from, its path (pure, tested); the sky from the Moon is world/moonsky.ts's
  app/surface.ts                      a flight on the Moon's surface as the stage loads it (`lunarStay`): the landing site's SiteDef, the LM, the crew who went out
  app/front/scene.ts                  its scene: a renderer of its own, drawn from the eye, only when the picture changes, let go whole when a flight arrives
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
  ui/rover.ts  ui/rover.css           driving a lunar rover from its gallery, including touch controls and parking
  ui/gallery.ts  ui/gallery.css       the gallery: the vehicle alone on a stage of its own, its History tab; the ways between the places
  ui/history.ts  ui/history.css       the history's words as the page writes them, the same on the Lineup's card and in a gallery's History tab: the story, the name, the crew, a programme, a moment
  ui/fold.ts  ui/fold.css  ui/sheet.ts  ui/sheet.css  a place on a phone (the gallery and the launch site alike): the control block docked in the sheet's View pane,
                                      the handle's button, the hint said once; the sheet a finger moves, and what the browser is told to leave alone
  ui/slider.ts                        every slider under a finger: a touch anywhere puts the thumb under it
  ui/wheel.ts                         a radial menu: a few choices round a centre
  ui/timebar.ts  ui/time.css          the clock's control
  ui/callout.ts  ui/callout.css       the idle show's callouts
  ui/title.ts  ui/logo.ts  ui/title.css  the front page's words (the way into the Lineup, the list of flights) and the mark
  ui/fullscreen.ts                    full screen, in and out, from every page: the small button in the window's top right corner (its looks: fullscreen.css), and `toggleFullscreen` for the front page's switch
  ui/icons.ts  ui/icons.css           the page's small pictures as inline SVG: the icons (a flight's places, the Lineup, walking, the camera), the
                                      nations' flags (`FLAGS`, by the nation's word in an id) and the programmes' emblems (`EMBLEMS`, by programme id)
  ui/lineup.ts  ui/lineup.css         the Lineup's page: the card, the programmes, the timeline's strip and its words, and what is written on the picture
  ui/navball.css  ui/cockpit.css      the navball's and the flight deck's looks
  deck/deck.ts                        the flight deck, one for every flight: its three panels, keys and their buttons, the stick and roll, tucking, the card that ends a flight
  deck/decks.ts                       which deck flies a flight: one for each kind of plan (`DECKS[plan.kind]`, `deckOf`); the decks' shared settings are deck.ts's
  deck/leaving.ts  deck/ask.ts        what an act does to a flight flown by hand (the pure rule: kept wherever the visitor goes, asked about only where it is lost), and the question asked
  deck/tape.ts                        a run flown by hand kept as what was done to the deck and when, flown again exactly on its own clock; its stamp
  app/runs.ts                         the runs flown by hand kept between visits, one a flight, in the browser's storage (and the list the front page marks)
  ui/runmark.ts  ui/runmark.css       the front page's mark on the row of a flight with a run kept
  app/stake.ts                        the one guard on every way out of a flight's page: `guarded`, called by `goHome` and `main.ts`, asks only where a run would be lost
  deck/cockpit.ts                     the deck's ballistic kind: a ballistic plan flown by hand, the live simulator stepped by the clock, the instruments
  deck/orbitdeck.ts                   the deck's orbital kind (an orbital plan): the stages, the events and what the hands could reach, from the plan;
                                      its state, the run, the path and the instruments, with what each phase does in deck/phases/
  deck/phases/phase.ts                the orbital deck's phases: which the flight is in, from the run's state (`phaseOf`), and what each shows (`PHASES`)
  deck/phases/ascent.ts  deck/phases/coast.ts  deck/phases/burn.ts  deck/phases/entry.ts  deck/phases/surface.ts
                                      what the orbital deck does in each phase, as functions of its state: the ascent (the steps, taking over, the
                                      aborts, the parting), the coast (the lock, the hands), a burn (the braking burn, the manoeuvres), entry (the
                                      descent's events by hand), down (the card)
  deck/flown.ts                       the Flown panel: the simulator's run against the clock, and against the reports' figures; a flight flown by hand over it
  deck/fit.ts                         a figure of the deck's middle panel made to fit its cell at every magnitude: fewer decimals, then a larger unit (km, Mm, Gm), never into the next
  deck/navball.ts                     the navball: attitude against the local horizon, prograde and retrograde, guidance's aim (`ballOf` is the mathematics, pure)
  viewer/dispose.ts                   letting go of a tree's geometries, materials and pictures on the GPU (a flight or a place the stage has left)
  viewer/programs.ts                  the place's number in every program's key: another place or day is built again under its own shaders' text
  viewer/stage.ts                     the stage: one scene of a flight's models in their setting, the camera, the clock; it owns the pieces below and keeps
                                      the one API the page uses (`window.sr.stage`)
  viewer/stage/pipeline.ts            the frame from the scene to the screen: the passes, drawn from the eye, the drawing's resolution, the near plane fitted to what is there
  viewer/stage/cabinview.ts           the view from a seat: which is sat in (the site's on board, the gallery's exhibit), what is looked out of, the lean to it, the way in to a port
  viewer/breakup.ts                   draws time-addressed fragments from the flight model following a simulated impact
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
  viewer/swell.ts                     the day's sea where a flight comes down, drawn moving: a square of it laid round the point, by the globe's shading (`Globe.swell`)
  viewer/recovery.ts                  what came to a spacecraft where it came down, flown on the record's clock: a helicopter, its rotors, its line and its hoist (`Flight.recovery`)
  viewer/swimmer.ts                   someone in the sea where it came down, on the record's clock: a figure of the flight's posed in the water, riding the drawn sea, drawn up a hoist (`Flight.swimmer`)
  viewer/flooding.ts                  the sea inside a spacecraft afloat: the water's surface in each space that can be seen into, level as it heels (`afloat.seen`)
  viewer/field.ts                     noise that gives the same answer in JavaScript and GLSL (the ground's height is needed in both)
  viewer/glsl.ts                      GLSL said once: a colour or triple written into shader text (`vec3`, each caller's digits kept), the general noise
  viewer/air.ts                       the air: haze that thins with height (in three's fog chunks), the cumulus field, its shadows on the ground,
                                      the Sun's light under a veil of high cloud
  viewer/day.ts                       a day's weather as it is drawn: a flight's record (DayWeather) turned into the air, the clouds, the map and the light
  viewer/clouds.ts                    the cumulus as a volume: heaped on air.ts's field, their skin worn by finer lumps, lit as cloud is (the Sun's light
                                      marched through them and scattered, the sky above, the ground below), ray-marched at a quarter of the pixels, laid over the frame
  viewer/cloudframe.ts                the frame the clouds are worked out in: the scene's own near the site, rolled after the eye over the Earth once it is
                                      far from it (no plane maps a sphere), with its GLSL; pure arithmetic, held by tests/cloudframe.test.mjs
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
  viewer/onfoot/operate.ts            what a function worked by hand looks like from where it is run, from its moves' data (pure): where it is, will be and can go; how far along it is
  viewer/onfoot/walk.ts               walking the site on foot: footing, collision, input, the view at the eyes or over the shoulder (the camera put there by camera/foot.ts)
  viewer/onfoot/escape.ts             what Escape does on foot (pure): a captured mouse is freed first and the walk goes on, the next Escape leaves
  viewer/onfoot/gait.ts               how a jointed figure moves its limbs: walk, run, stand, jump, from distance and speed
  viewer/onfoot/ragdoll.ts            a figure gone limp after a long fall: points, sticks, and the bones laid along them
  viewer/onfoot/works.ts              things that work when worked: doors (toggles) and lifts, from a part's actions
  viewer/onfoot/drive.ts              driving: a kinematic bicycle model and the vehicle contract's nodes
  viewer/onfoot/carry.ts              what a walking figure has in its hand, by the model's grip contract
  viewer/onfoot/hose.ts               a hose or tether of fixed length hanging between two moving anchors
  viewer/onfoot/going.ts              people walking off a site or onto it (types.ts Going): where each figure is at an instant of the clock, pure
  viewer/onfoot/crowd.ts              a part's people walked on the clock (Part going): each man posed by the gait for the distance he has gone
   viewer/moon.ts                      the Moon as a body (`MoonBody`): its relief at three sizes and colour from its bake, the apron round the site, its own light; the front page's, under its camera, and in its flight mode the flight scene's (rings about the point under the eye, a landing site's finest map and ground, laid over the sky by its alpha)
   viewer/flightmoon.ts                the Moon in a flight's scene (`FlightMoon`): where the flight's gravity has it, turned to its mean-Earth frame, lit by the Sun; the nearest landing site's maps; its up, its eclipse of the Sun, its light round the eye, its place for the map
  viewer/moonground.ts                the Moon's ground below what was measured, made by rule (estimated): the craters under 2 km and the soil's grain, in GLSL and the same sums here; the Moon's light law
  viewer/moonrocks.ts                 the blocks lying round the front page's site: instanced, four levels of detail, each with its shadow laid on the ground
  viewer/lunar/setting.ts             the lunar setting (BackdropKind `moon`): the near ground, the whole Moon past it, the Sun, the Earth and the stars from the site on the clock, the light and the exposure
  viewer/lunar/ground.ts              a landing site's ground near at hand (`LunarNear`: the nested grids as meshes, the soil, the stones), fetched once a page (`lunarGround`); the LM that stood there (`landerAt`)
  viewer/lunar/light.ts               the light on the Moon's ground as numbers: the Sun's disc over the horizon, the exposure (pure, tested)
  viewer/farearth.ts                  the Earth from the Moon (the globe's maps small, the day's cloud, the air): the front page's and the lunar setting's
  viewer/lunar-driving-ground.ts      the rover's gallery scene's ground: the lunar setting with a state of its own, the LM on it, the Sun's shadow round the rover
  viewer/lunar-rover.ts               drives and steers a four-wheel lunar rover over the surveyed ground
  world/lunar-terrain.ts              samples the triangles of the LROC and LOLA terrain under a rover's wheels (`LunarTerrain`); the landing sites and the rovers' by id
  world/lunar-ground.ts               a landing site's ground over the Moon: the descent strip (`DescentStrip`, its file format), the grids and the strip as one (`LandingGround`), by latitude and longitude or in the site's frame
  world/moonsky.ts                    the sky from the Moon at an instant (`skyAt`): the Earth, the Sun, the Earth's and the stars' axes in the Moon's frame (pure, tested by front.test.mjs)
  world/lunar-sites.json              every landing site's position, height, approach and terrain products, and the bake's grids: written by tools/lunar-sites.mjs from missions/usa/places/moon/, never by hand
  world/lunar-rover-sites.json        what each rover's gallery scene shows at its site: its lander, which way it faces, what was unloaded, the second excursion's lighting instant
   viewer/moonsite.ts                  the altimeter's ground round the site, read whole in doubles (`SiteGround`): heights, places, how near the ground comes to the path; and a landing site's (`LandingApron`, from world/lunar-ground.ts) for the flight scene's apron
  viewer/space.ts                     the sky from above the air (Sun, Moon, stars) and its reflections, the Earth in them at the flight's height; the wear texture
  viewer/explode.ts                   exploded-view motion
  viewer/runs.ts                      what slides or drives stands on what it runs on: wheels on rails or ground, body pitched between them
  world/bodies.ts                     the Sun, Earth, Moon and planets as data: GM, radii, figures, rotation, mean orbits; standard gravity (G0), what falls on each (gravityOn)
  world/time.ts  frames.ts            Julian dates, sidereal time; geodetic, Earth-fixed, inertial and site frames
  world/earthframe.ts                 the frame a flight is flown in (of date, or fixed at liftoff), made once from its liftoff: the Earth's angle in it and every turn between it and the Earth
  world/ephemeris.ts  stars.ts        where the Sun, Moon and planets are (`stateOf`, the sky from a site): DE440 when loaded, Meeus else; the 518 brightest stars
  world/jpl.ts                        the baked DE440 read: each series's Chebyshev segments, positions and velocities in the ICRF, and the Moon's orientation (`moonpa`: three Euler angles)
  world/lunargravity.ts               a body's gravity as spherical harmonics (Cunningham's sum), and the Moon's: GRGM900C cut to `LUNAR_DEGREE`, in its principal axes
  world/grgm900c.ts                   the Moon's field's coefficients, written by tools/lunar-gravity-bake.mjs: not edited by hand
  world/aloft.ts                      a day's column of air (DayWeather.aloft) read at any height, and its hours at any instant
  world/thermosphere.ts               the upper air by the Sun's activity: Jacchia 1971's exosphere from the days flown's 10.7 cm flux and Kp (`DAYS`), as a factor on the 1976 standard (`ratioOf`)
  world/ut1.ts                        UT1 - TAI from the IERS (tools/ut1-bake.mjs): what the Earth's turn is behind atomic time, every 0.05 year since 1956
   world/moon.ts                       the Moon's own frame: its axes at an instant, the librations, the points under the Earth and the Sun; its principal axes from the ICRF (`principalAxes`: DE440's, or Meeus's) and its mean-Earth axes, the maps' (`meanEarthAxes`)
  world/orbit.ts                      orbits: elements to and from state, J2 gravity and its steady rates, a coast, the place below, site to inertial, the Earth's shadow
  world/meanelements.ts               mean elements under J2 (Kozai 1959): published heights and period to the osculating state and back, the nodal, anomalistic and Kepler periods
  world/surface.ts                    the sea as a shape: the ellipsoid (any body's figure) at a site's sea level, radii of curvature, the horizon
  world/region.ts                     a piece of the Earth laid flat: the gnomonic plane a region's map is baked on and read from
  world/relief.ts                     how a height is kept in a byte, for the relief maps and the shaders that read them
  world/clock.ts                      the simulation clock: seconds from a flight's launch, stopped until run; its rates, the coast's when let, and an instant held
  world/sequence.ts                   a slider joined to the clock: keyframes, sliderAt, timeAt
  viewer/earth-surface.ts             Earth's shared land, ice, ocean colour, water by depth, and sunlight reflected by waves, from a launch site to the front page
  viewer/globe.ts                     the Earth to scale under the site: coasts from Natural Earth, the land's colours (Blue Marble) and relief and the
                                      sea by its depth (ETOPO), the weather's shadows, the Sun's glint; the air seen from above, drawn on a ball
  viewer/atmosphere.ts                the air as it scatters light, ground to orbit: Rayleigh, haze, ozone, light scattered many times; two tables
                                      made once on the GPU, and the GLSL that walks a ray through it
  viewer/weather.ts  weathermap.ts    the weather round a site on a day as a map (the record where it speaks, estimated elsewhere): cumulus cover,
                                      middle deck, high cloud; the sheets' textures (cloudlets, fibres, a veil); the day and its map as shared uniforms;
                                      and the weather past the map, anywhere on the Earth (`farWeatherAt`: estimated, a cube made in the page)
  viewer/pack.ts  units.ts            one-channel maps packed into one cube and one array texture on the GPU; the texture-unit budget and its check
  viewer/later.ts                     what the first view does not need, fetched once the scene is up
  viewer/heavens.ts  daysky.ts        the Moon, stars and planets drawn; light and sky colours by the Sun's height
  viewer/lamps.ts                     floodlights: every lamp lens a model carries lights the scene after dark; when a pad's are lit
  viewer/eye.ts                       the eye: by night what the lamps in view add, above the air what is lit in view leaves of the stars, each adapted to over the eye's own times
  viewer/origin.ts                    drawing from the eye: the GPU sees only eye-relative positions (a floating origin)
  viewer/ascent.ts                    the flown vehicle in the scene: where the simulator has it, and what it has shed
  viewer/plume.ts                     the engine's fire as data: its place, how hard it burns, the shape the air lets it take (its nozzle's exit, its core's length), its light on the pad
  viewer/flames.ts                    what a fire looks like by what it burns: its colours, its light, how much it hides (each with its source); and a gas jet by what it is (`GASES`)
  viewer/fires.ts                     which fires burn when and how hard, an engine's chambers found in its geometry, the jet's edge and where a cluster's jets merge; how hard a jet that is not a fire blows, and its shape (pure: tests/fires.test.mjs)
  viewer/trail.ts                     the smoke it leaves as data: the trail along the path flown (steam low down, a contrail in the cold), the cloud over the pad at liftoff
  viewer/exhaust.ts                   fire and smoke drawn as volumes (the one thing here meant to look real): marched at a quarter of the pixels, laid over the frame; the smoke's shadow
  viewer/chute.ts                     the parachutes, drawn from Flight.flies.chutes: out, filling, reefed, full, and down on the sea
  viewer/jets.ts                      the attitude jets, seen: a pale cone at each chamber that is open, from the thruster data; and `GasJet`, a vent's or a turbine exhaust's jet (`ModelDef.jets`), marched with the smoke
  viewer/effects.ts                   what the air does, seen and felt, at the clock's instant: fed by FlightShow.lift, and the camera's shake for the draw
  viewer/entry.ts                     incandescence by black-body colour, the shock layer's glow as a marched volume, the collar of cloud at Mach 1
  viewer/shake.ts                     the camera shaken: engine sound, buffet, load and jolts as levels, band-limited noise in the clock's time
  viewer/docking.ts                   the relative spacecraft pose that mates compatible docking rings at their exported plane and clocking datum
  viewer/cabin.ts                     a model's inside as somewhere to fly from: its needles and lamps read the flight, its controls work, its periscope shows outside
  viewer/shade.ts                     a cabin's baked shade read lamp by lamp (`shadeBy`): by the cabin's switch, or as built where no cabin is worked (the Lineup)
  viewer/gauges.ts                    what an instrument reads and where that puts its needle: scales, counter wheels, attitude from axes (pure, tested)
  viewer/path.ts                      the predicted path, drawn: a ribbon a few pixels wide, narrower with depth, ahead of the vehicle and never behind it (an orbit stopped short of coming round), the line flown from far out only, its markers and the ring where it comes down; its switch and figures; and on the map (M) an orbit whole, what the Earth hides faintly, the vehicle's and every other body's marker and line, the Earth's outline; and, with or without a prediction, the record's flight as a dashed line of reference with its events (pathref.ts)
  viewer/pathline.ts                  the path's line as numbers: its ribbon's vertices, a prediction eased from the last by instant and carried with the flight between two, the rules that keep it off the vehicle, how deep in the view a point of it is, how far round a path has gone and where an orbit's line ends short of the vehicle (pure)
  viewer/pathref.ts                   the record's own run as the path's line of reference: a curve of a few thousand points kept by its curvature, its engine events named by what the run does there, its highest points, and how much of it is drawn at an instant (pure)
  viewer/pathmarks.ts                 where the path's markers go on the page: by rank, off the panels, the vehicle and each other, and staying put; and the chips at the view's edge for those not in view (pure)
  viewer/lookouts.ts                  what can be looked out of from a cabin's seat, from its data: its windows by name, then its periscope
  viewer/fly.ts                       the free camera's flying: heading, pitch, speed by height (`Flyer`)
  viewer/camera/index.ts              the camera: every rig, which is in charge, the handover between them, where the pivot is shown
  viewer/camera/maths.ts              its arithmetic, pure and tested: zoom by proportion, what a zoom may move, easing and coasting by time, framing
  viewer/camera/rig.ts                what a rig is (`Rig`), the rigs there are (`RigId`, `RIGS`), and what one may ask of the world (`World`, `Craft`)
  viewer/camera/orbit.ts              turning about a pivot (`OrbitRig`), and about a vehicle that carries it (`ChaseRig`: level with the horizon, or locked to the vehicle)
  viewer/camera/map.ts                the map (`MapRig`): the orbiting view pulled out to the whole path, about the vehicle or the Earth, in the frame that does not turn; what it takes in and what it turns about (`mapFit`, `focusOf`, `mapFrame`, pure)
  viewer/camera/free.ts  onboard.ts  track.ts   the free camera; first person from a seat; the pad camera that stands still and follows with a long lens
  viewer/camera/foot.ts               the rigs on foot (`eyes`, `shoulder`): the collision-limited shoulder boom and the view at the eyes, or watching what is worked by hand
  viewer/camera/watch.ts              watching what is worked by hand, pure and tested: the head turned within a neck's reach, the camera stepped aside and back off the figure
  viewer/camera/head.ts               a head in a seat, pure and tested: its limits, the eyes round the neck, the lean to a port or a screen and back
  viewer/camera/input.ts              the hands: mouse, trackpad, fingers and keys in one vocabulary (drag, slide, zoom, twist, pivot here)
  sim/fly.ts  sim/atmosphere.ts       the simulator: a ballistic flight integrated from its plan, whose hardware it finds by role (`ballisticOf`); the 1976 standard air (its Table I to 1,000 km, `UPPER_ROWS`; its mean free path, `meanFreePath`)
  sim/vehicle.ts  sim/rigid.ts        the live simulator: the same flight stepped a frame at a time and steered, as a rigid body; quaternions and mass properties
  sim/air.ts                          the air at a point for every simulator: where it is over, its height, the plan's air (`skyOf`: the day's column over the pad, the standard outside it, `DAY_AIR`), the motion through it with the day's wind (`airAt`, `blowOf`)
  sim/core/dp45.ts                    the error-controlled integrator's step: Dormand and Prince's 5(4) pair for a point, for the predictor and a coast on rails
  sim/core/gravity.ts                 gravity as terms: the Earth with J2 (the default), a third body as a point mass (and what body it is, for a path that passes it), the central body switched; and as a `Field` every integrator takes (`fieldFor`, `stepIn`): the Moon's whole field and the centre changed at `RSPHERE` for a plan that gives a sphere (`stepAbout`, `recentred`, `centreAt`)
  sim/core/rk4.ts                     the one fixed-step integrator: fourth-order Runge-Kutta for a point and for a rigid body; gravity and push summed
  sim/apparent.ts                     a stage's apparent-velocity integrator: what it senses, its trapezoid, where its sum reaches its setting
  sim/thrust.ts                       one law of thrust for every engine: throttle times vacuum thrust, less exit area times the air's pressure
  sim/afloat.ts                       a body afloat: upright on the day's sea, flooding through its openings, hoisted, going down (`floatOn`, `Solid`)
  sim/sea.ts  sim/loose.ts            the day's waves as a function of the instant and the place; a part thrown off with no plan of its own, flown to the sea
  sim/breakup.ts                     game rule for an impact to release parts
  deck/dockdeck.ts                   terminal approach instruments, capture and spacecraft controls on the flight deck
  app/dockflight.ts  ui/dockflight.css  orbital approach viewer and flight controls
  sim/approach.ts  sim/docking.ts      terminal rendezvous initial state and two-spacecraft docking dynamics
  sim/contact.ts                     swept spacecraft contact and its inelastic impulse
  sim/solids.ts                      what is solid, baked from a model (tools/collision-bake.mjs): a structure's pieces as boxes with where each stands from liftoff on, a vehicle's hulls as spheres; the file's format, a sphere swept against a box, a piece's boxes in a tree
  sim/siteworld.ts                   what stands at a flight's site, placed as the flight places its models and asked in the site's frame at an instant: a swept sphere's first meeting, what a sphere touches, what is under a point, how far inside it a point is; which models have solids (`solidModels`)
  sim/sitecontact.ts                 a body flown by hand against what stands at its site and the land there (`SiteSurfaces`, `Ground`): the vehicle's hull (`SiteContact`) and each shed body's spheres (shed.ts) swept through every tick, the first meeting answered by an impulse on the tick's outcome (contact.ts `strike`, with the surface's drag), what was struck said, a body lying still down where it lies (`Lying`), and the live simulators' floor on the land (`floorOver`)
  sim/forces.ts  sim/shed.ts          the air on any rigid body (axial drag by the leading end, fins, cross-flow), one body made two with its momentum kept; what a vehicle sheds, flown
  sim/descent.ts                      one body of an orbital descent as it comes down (`Descent`): its mass, drag, parachutes and their tearing; flyDown and the path ahead both fly it
  sim/orbital-target.ts               a flight's target, where it is on a run: the stage a spacecraft left in orbit and went back to, flown on its own forces, or another flight's vehicle or a published orbit's craft (`targetAt`)
  sim/pursuit.ts                      manoeuvres made on another craft: the target as an integrated craft (`flownFrom`), a published orbit as a state (`fixState`, `elementsState`), where the target is from the spacecraft (`placeFrom`),
                                      and the guidance that solves a burn on the two as they are (`reach`, `coelliptic`, `stationPush`); a burn solved on the run's own state for
                                      what it is for, an orbit, a pericynthion, an entry, a phasing, a plane, an intercept from an elevation (`solveBurn`, `steeredKind`)
  sim/roster.ts                       the flights there are, by id, for a plan that names another flight as its target (`TargetDef.flight`): missions/index.ts enrols them all, a Gemini target enrols itself
  sim/steering.ts                     the Apollo computer's powered-flight guidance: Lambert's problem (`lambert`), cross-product steering (`thrustLine`, `Steering`: External ΔV
                                      and the Lambert aim point, the 2 s cycle, the cut at four seconds to go), a steered burn flown ahead (`flyBurn`), the impulse that does what is asked (`solveImpulse`)
  sim/launchescape.ts                 tower escape and service-module abort branches from the live state at the pilot’s command
  sim/orbital.ts                      a flight into orbit: the coast flown from its plan (`flyOrbit`), the descent (`flyDown`), the steering law's shape (`Guidance`), the drag of a body in orbit (`orbitDrag`, `ORBIT_DRAG`: free-molecular to continuum)
  sim/staged.ts                       an orbital flight's powered ascent, flown whole: stages burning together and in turn, dropped as the record says, on its steering law
  sim/stagedlive.ts                   the same ascent stepped a tick at a time and steered by hand or by guidance
  sim/staging.ts                      what happens when a hand stages a vehicle: the rules every vehicle is held to, whatever it is
  sim/craftlive.ts                    a spacecraft in orbit flown live: its own engines lit, throttled, cut and lit again by hand, tick by tick, on the coast's forces and the rocket equation; guidance's steering of a burn lit so (`guide`)
  sim/surface.ts                      a lander's legs on a body's ground (`Ground`, `bodyGround` over a landing site's `LandingGround`): crushable struts, the contact probes' lamp, tip-over as the rigid body on its pads, landed and held on the Moon turning with it (`moonFixed`), the jets worked on it (`stepWithJets`)
  sim/attitude.ts                     a spacecraft's attitude in orbit as a rigid body its own jets turn (`ThrusterSet.chambers`, the record's mass properties): Hold its autopilot (deadbands, rate damping, minimum impulse), the keys a rate or the jets direct; stepped so a kept run flies again the same
  sim/lever.ts                        the throttle lever as a hand has it, and every liquid engine's hand range (`handRange`: its own, or the game's where it ran at one thrust)
  sim/misses.ts                       the recorded misses: where a flown run falls outside a documented check's tolerance, and why
  sim/heating.ts                      the air's heat: stagnation-point heat flux (Sutton and Graves) and each named surface's temperature as a lump
  sim/loads.ts                        what a structure is limited by (q alpha, load factors), and when it gives
  sim/mechanism.ts                    a mechanism on a programme that a hand can take (a periscope and its door): how far out it is at an instant
  sim/autopilot.ts                    what flies it when a hand does not: the control law (`steer`), the sequencer, a whole flight flown live (`flyLive`)
  sim/verdict.ts                      how a flight flown by hand ended, said plainly, and whether it was survivable by the flight's stated limits
  sim/predict.ts                      looking ahead from a state: one propagator for every vehicle (error-controlled, in slices), the path if nothing more is done, as far ahead as its own orbit asks, its apsides, events, impact or orbit, the bodies it passes or meets and its leaving the Earth (pure)
  sim/fliers.ts                       the vehicles it flies: a ballistic flight's, an orbital spacecraft alone, a staged stack with its engines stopped; each with its own simulator's forces (pure)
  sim/rails.ts                        a coast on rails for a clock past an hour a second: an adaptive pair ending exactly on an instant (`coast`), the next instant to hold the clock at (`due`), whether it may run on (`onRails`, `offRails`), how fast (`railsRate`), a coast flown as far as asked and the same however asked (`Railway`: the live vehicle's); and a run's quiet coast kept by how fast its motion changes: when a sample is due (`KEPT_TURN`, `passed`), and the stretch between two kept flown again for whatever reads between them (`Railed`, `stretches`)
  sim/warp.ts                         where a warp goes on a coast on rails: a burn's lead-in, what is due, a sphere crossed, an apsis, the air come down to, a time typed (`warpTargets` on a `Track`, `nextWarp`, `warpStop`) (pure)
  sim/run.ts                          a flight's run as the scene, sound, cabin, effects and decks show it (`Run`: its events, bodies, results, line flown; `runOf`, `grown`), the record's for any kind (`recordOf`), an orbital record's (`orbitalFlown`, `orbitalRecord`, `orbitalEvents`), and what differs by kind answered for any plan (`liftoffOf`, `brakingOf`, `partingOf`, `signalsOf`, `chuteOf`, `bearingOf`)
  sim/plan.ts                         what a flight is flown from, one shape for every kind: its craft (bodies, joints, engines on tanks, thrusters, parachutes, limits), events (triggers, actions), attitudes, checks; `problems` says what is wrong with one
  sim/craft.ts                        the one machine a craft is flown by: what is lit, let go and gone, what is out, which events have happened, as its plan's hardware allows
  sound/audio.ts                      what the walk and a driven vehicle are heard as (an interface, silent until something that plays is given), and the board every posed move that names a machine is told to (`machinery`)
  sound/model.ts                      what the flight sounds like, as numbers: levels, filter frequencies, delays and Doppler from the sample and where the ears are; and the works: engines, tyres and machines on the ground (pure, tested)
  sound/engine.ts                     the Web Audio graph those numbers are set on: noise, filters, envelopes, the works' six voices; no recordings
  sound/index.ts                      the joinery: the clock, the scene's run and the camera in; the speaker by the clock, U, the volume
tools/
  build-model.mjs                     runs a flight's model scripts through Blender
  collision-bake.mjs                  bakes each sited flight's solids into its own folder (`public/models/<flight>/<model>.solid.bin`, `pnpm collision`; `--check` says what is stale), in node from the committed GLBs: no Blender
  glb-geometry.mjs                    a GLB's nodes and triangles decoded in node (Draco, by the page's own decoder in public/draco)
  lod-thresholds.mjs                  each model's and piece's own level-of-detail thresholds, kept in model/<name>.lod.json, put into the GLB's extras
  lod-measure.mjs                     the measuring behind lod-thresholds.mjs, in a browser: each model and piece, at each level, against distance
  shot.mjs                            one screenshot of the viewer, for looking at a change
  bench.mjs                           the performance benchmark (`pnpm bench`): frames, load and a soak, with A/B and pixel comparison (rendering.md)
  impact-test.mjs                     browser proof of live impact spin and structural breakup, including rewind
  descent-attitude.mjs                browser check of Soviet sphere attitude under camera and pilot input after module release
  separation-test.mjs                 browser check of the relative motion of released spacecraft parts in the rendered model
  flight-pixels.mjs                   checks the cockpit and chase canvas through adaptive resolution changes during flight
  flicker-test.mjs                    browser check for z-fighting
  spacelight-test.mjs                 browser check that the light on a vehicle above the air holds still frame to frame: the record's flight flown past the cloud, at 8x and 1x from the chase view
  model-eviction-test.mjs             browser check that departed model levels and late loads are released while shared models survive a flight change
  flights-test.mjs                    browser check of going flight to flight with no reload: the right flight each time, memory and listeners back to their level, Back and Forward
  frozen-test.mjs                     browser check that a frozen stage draws the same frame twice, both looks
  studio-test.mjs                     browser check of each gallery view of a cabin's inside, read from the flights (`pnpm test:studio`): it opens the cutaway, and what it is of is on the screen and lit, both looks at 1280, 820 and 390
  camera-test.mjs                     browser check of the camera: the sequences that went wrong (and the map, in and out), then a seeded soak of mixed input
  places-test.mjs                     browser check of going between a flight's places: slow loads, a change of mind, the shows, what both remember
  history-test.mjs                    browser check of Back and Forward between the front page, flights and places, with real clicks; a gallery's History tab and its way to the Lineup
  mem-test.mjs                        browser check of what the page holds on the GPU as a phone (ready, late, on foot, in flight), against a budget
  wheels-test.mjs                     browser check that every slide and drive keeps each wheel on what it runs on, at each site
  soyuz-boarding-test.mjs             browser check that each Soyuz crew member can walk from their start, take the lift and board their assigned couch
  crew-start-test.mjs                 browser check of every walking figure’s starting clearance, sight of the vehicle and route to its foot
  walk-test.mjs                       browser check that a site can be walked: on foot with the real W key along the ways a person could have gone (Site 1's), every leg arriving with its feet on the floor
  operate-test.mjs                    browser check of working something by hand on foot at each site, through the eyes and over the shoulder, at 1280 and 390: it is in view, off the figure, read out, and the view comes back
  front-test.mjs                      browser check of the front page: what a bare address shows, going into a flight and back out, what it draws when, what it holds as a phone
  lineup-test.mjs                     browser check of the Lineup: every flight in the row at one scale, the card, the way into a gallery and back, the levels of detail,
                                      draw calls, the spacecraft alone, the gallery's tab kept, going along the row on a phone, the show's card, what it holds as a phone
  around-test.mjs                     browser check that what stands round a site is drawn at the level its size on screen calls for
  deck-test.mjs                       browser check of the flight deck's promises for every flight that can be flown, at a desk, a tablet and a phone
  fires-test.mjs                      browser check that every engine burning on the record's flight has its fire, hung where it should be
  chute-test.mjs                      browser check that a parachute's lines are drawn over the land, the sea, the air and the cloud behind them, from the chase view, at 1280 and 390, in both looks
  clouds-test.mjs                     browser check that the clouds stand in the air and not round the eye: a camera flown up through each flight's cumulus, deck and high cloud at a vehicle's speed, in both looks; and that from orbit round the Earth, far from the site, they are still clouds and not streaks
  glow-test.mjs                       browser check that the glow of entry is a glow from the chase view at 5, 9 and 20 m and from inside its box: no straight-edged step in what it adds, at 1280 and 390, in both looks
  night-test.mjs                      browser check of the sites by night: stills, the light through dusk and dawn without a jump, and the eye walking off a floodlit apron and back
  winds-test.mjs                      browser check that the wind drawn (the plants, the low cloud's drift, the sea's waves) follows a flight's hours with the clock, and is the record's at liftoff
  path-test.mjs                       browser check of the predicted path's promises: flown live through the flights and by scripted hands, seen from each rig, from far out and in the map, measured frozen, on pages run at once; and on the pad by hand, the record's line with nothing predicted
  lunar-rover-drive-test.mjs           browser check of the lunar rover driving controls and cameras
  lunar-test.mjs                      browser check of the Moon as a place: a flight stood at its landing site, the light through sunrise and the day without a step, frozen frames, the 2.4 m hop, and back to the pad with nothing of the setting held
  seat-test.mjs                       browser check of every seat of every flight, sat in from the gallery by the control and by C, at 1280 and 390
  sheet-test.mjs                      browser check of a phone's sheet under a finger (the gallery, the site, the Lineup at 390 and 820): every line of buttons swiped to reach each, faded only where there is more, the sheet and the page left still
  sound-test.mjs                      browser check of what is heard on the ground, read off `sr.sound.voices`: a car driven and got out of, a machine worked by hand, a vehicle on the clock
  drive-test.mjs                      browser check that every vehicle at every site goes forward a car's length from where it stands, or says what holds it
  front-earth.mjs                     bakes the Earth as the front page sees it: the globe's maps small, and the hour's cloud, sea ice and snow from ERA5; `--lunar` the hour's at each Apollo landing (public/lunar/<site>.earth.*)
  lunar-terrain.py                    bakes each landing site's ground (`pnpm lunar:terrain`): the nested grids from the NAC stereo DTMs and LOLA, the descent strip from SLDEM2015
  lunar-sites.mjs                     writes src/world/lunar-sites.json from the landing sites' modules (`pnpm lunar:sites`)
  front-moon.mjs                      bakes the Moon as the front page sees it, from NASA's CGI Moon Kit: colour, relief at three sizes, the finest's cast shadows, the site's ground whole (`--find-site` lists the places the camera could start from); `--sites` each Apollo landing site's finest map for the flight scene (public/lunar/<site>.moon.json, .near.jpg, .near.height.png, .near.colour.jpg)
  shot.mjs                            one screenshot of the viewer, for looking at a change
  browser.mjs                         the one browser every browser tool launches (Chrome, ANGLE's back end, headless or not, from SR_* in the environment: macOS and Linux), and the page opener, options and checks they share
  bench.mjs                           the performance benchmark (`pnpm bench`): frames, load and a soak, with A/B and pixel comparison (rendering.md)
  globe.mjs                           bakes public/globe/ from Natural Earth's coastlines: distances to the shore on a cube's faces
  globe-region.mjs                    bakes a place's region (PlaceDef.region) round a pad from OpenStreetMap's coast and lakes, as it stood on its date
  globe-surface.mjs                   bakes the globe's relief (ETOPO 2022) and its land's colours (Blue Marble, May), and each place's region's (`region.surface`), finer; needs GDAL
  globe-weather.mjs                   bakes a flight's day's weather map (<region>.<date>.weather.png) from its record, weather.ts, the land map and the relief
  ephemeris-bake.mjs                  bakes public/ephemeris/de440.bin from JPL's DE440 kernel (de440s.bsp): each body refitted and measured against it; and the Moon's orientation from the binary PCK (moon_pa_de440_200625.bpc)
  lunar-gravity-bake.mjs              bakes src/world/grgm900c.ts from GRGM900C at NASA's PDS, cut to a degree, and says what the cut leaves out
  era5.mjs                            ERA5 as the tools read it: the ARCO-ERA5 store, Blosc and LZ4, whole fields and the blocks round a place by range
  era5-aloft.mjs                      bakes each flight's aloft.ts: ERA5's column over its pad at the hour nearest liftoff, and the surface's hours round it
  ut1-bake.mjs                        bakes src/world/ut1.ts from the IERS's EOP C01 series: UT1 - TAI since 1956
  stars.mjs                           bakes the stars (the Bright Star Catalogue: stars.ts and public/sky/stars.bin) and the Milky Way (NASA's map: public/sky/milkyway.jpg its light, milkyway.tint.jpg its colour)
  figures.mjs                         the simulators' figures to the last digit, every run the tests fly, against tests/fixtures/figures.json (`pnpm figures`; made on hal9000, not in `pnpm check`)
  residuals.mjs                       what every flight into orbit misses its record by, as one table: when each stage stopped, the orbit left on, where and when it came down, the step in velocity at the parting, each tracking fix (`node tools/residuals.mjs [flight]`: simulator.md, "One state")
  predictions.mjs                     the predictions the figures capture (`predict:*`), each made again from a start nudged and in a frame turned (tests/predict.test.mjs, #30)
  png.mjs                             one-channel PNGs written and read without a library (the globe's maps)
  logo.mjs                            writes the mark (src/ui/logo.ts) to docs/logo.svg (README) and public/og.png (link previews): run after changing it
  blender/srlib.py                    shared geometry helpers, clearance check, run()
  blender/cabin_shade.py              a cabin's own shadow baked at its vertices: a figure for each lamp alone, one with them out (`bake`)
  blender/fonts/LiberationSans-Bold.ttf  the default face for models' lettering and panel legends, on any machine (srlib.load_font)
  blender/fonts/LiberationSans-Regular.ttf  SA-205's lighter painted lettering, sized from actual capital bounds; a photographic font substitute
  blender/fonts/LICENSE               its licence: the SIL Open Font License 1.1, as Liberation Fonts 2.1.5 ships it
  blender/sitelib.py                  what any site is built from: walls with openings, stairs, ladders, doors, poles
  blender/figurelib.py                what any crew figure is built from: a body's measures and joints, the trunk and trousers as skins, hands, a head,
                                      the pose; a suit is a garment module on top (crew/mark_iv_suit.py, crew/sk_1.py)
  blender/interiors.py                rooms' insides: what is seen through a site's windows
  blender/vehicles.py                 period road vehicles from parameters, built to be driven
tests/                                breakup.test.mjs checks fragment trajectories and restoring detached model nodes
                                      node --test: one file per module or promise; layout.test.mjs holds this list to the tracked files
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

- `src/sim/docking.ts` propagates independently flying spacecraft, their keyed docking ports, the coupled pair and an optional carrier released during extraction. `tests/orbital-docking.test.mjs` checks capture limits, momentum, combined propulsion and extraction.

- `src/sim/transfer.ts` advances Gemini orbital rendezvous from the crew and target navigation fixes.
- `src/sim/dockplan.ts` constructs independent orbital craft from the flight plan schema and measured masses.
- `src/sim/entry.ts` steers a lifting entry to a place (`Hold.entry`): a computer's law (the Apollo command module computer's entry programs, from its flight program's listing), the pilot that rolls the capsule to its commands or to a hand's stick, and the data a plan gives them. `tests/entryguidance.test.mjs` holds it to Apollo 10's return from the Moon and Apollo 11's entry corridor.
- `src/sim/rendezvous.ts` reconstructs the LM terminal phase from radar geometry and RCS maneuvers.
- `src/sim/flyby.ts` propagates the three vehicles during a second target visit.
- `src/sim/tether.ts` applies a tensile impulse at the two spacecraft attachment points.
- `src/viewer/dockjets.ts` binds the orbital RCS mouths and the Agena engine to the shared exhaust renderer.
- `tools/docking.mjs` flies the Apollo and Gemini decks in Chrome, including a saved joint maneuver.

- `tests/onestate.test.mjs` holds every flight into orbit to one state from the pad to the ground (simulator.md, "One state, changed only by what pushes it"): between any two samples of the record's run the velocity changes by gravity and by what the run says was pushing, the only step at one instant is the parting joint's push, the coast begins from the state the ascent left, a last stage cut by its guidance on the orbit leaves the record's period (on changed copies of three flights too), and every flight leaves its pad along its azimuth in the batch run, the samples drawn and the live vehicle.
- `tests/lunarlanding.test.mjs` holds the lunar module (Apollo 11's, lm-plan.ts) and its legs (sim/surface.ts): the descent engine's lever and full throttle position and its flow by setting, the ascent engine fired into the descent stage and Abort Stage's one command, the contact light at the probes' length, the struts' stroke against a touchdown's energy, tip-over past the pads' angle and standing on 12°, a hover held by hand on the throttle, Hold on its jets in the hover, and a landed lunar module held turning with the Moon.
- `tests/attitude.test.mjs` holds the attitude in orbit on its jets (sim/attitude.ts): a chamber's torque against the record's moment of inertia, the gas it burns, a free tumble's momentum and energy, Hold damping a tumble into its deadbands, the keys' rate, steps that do not depend on how often they are asked, and guidance steering and cutting a burn lit by hand.
- `tests/longrun.test.mjs` holds a flight of days to what a phone can hold (issue #173): Gemini VII's record run, fourteen days, and Apollo 8's, six days out to the Moon and home, by how many samples each keeps and how much heap it holds; `tests/rails.test.mjs` holds a coast kept by how fast its motion changes to the one that kept every step, between its samples.
- `tests/lunargravity.test.mjs` holds the Moon's field to the published table and to its potential's gradient, the Moon's axes to the IAU's pole, the two sides of the sphere to the same gravity, and a coast through the sphere (Apollo 8's injection as the run reaches it) to one state across the crossing, to the same coast on rails, and to the Mission Report's pericynthion (a recorded miss).
- `tests/cislunar.test.mjs` checks the path beyond a low orbit: a low orbit predicted to the bit as before, an orbit of more than six hours followed once round, a path that leaves the Earth's sphere, one that meets the Moon and one that passes it, Apollo 10's record predicted on from its injection to the Moon near the record's time (and to the same passing under a sphere's whole field), and the frame a path is drawn in.
- `tests/lunarsetting.test.mjs` holds the light on the Moon's ground to no step (the Sun's disc over the horizon, the exposure), every landing site to its LM's landing instant, the crew who went out to the landing flights' commanders and LM pilots, and the Sun over each site at its landing low in the east (world/moonsky.ts, against the point under it)
- `tests/flightmoon.test.mjs` holds the flight scene's Moon to the flight's own gravity's place for it, its axes to the Moon's frame, the eye's up turned toward it without a step, and its eclipse of the Sun without a step across the shadow's edge
- `tests/pathref.test.mjs` checks the record's line as numbers: the curve against made paths and three flights' records, the events' rule, the window drawn.
- `tests/path-display.test.mjs` checks late display jobs with synthetic results and distinguishes wall-time delay from simulation time.
