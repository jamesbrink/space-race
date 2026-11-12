# The simulator

Part of the agent notes: start at [AGENTS.md](../../AGENTS.md).

`src/sim/` flies a flight from the record, in doubles, with no three.js. `Flight.trajectory`
(types.ts: `Trajectory`) is the input: masses, the engine's thrust, specific impulse, exit area and
cutoff, the tilt programme, drag against Mach number, separation, retrofire, the parachutes, each a
`Measure` with its confidence and source, in SI with the source's own units in `source`.
`fly(trajectory, site, seaLevel)` integrates it (RK4 at 0.05 s, every step cut to end on the next
event, so one input gives one flight to the last bit) in an Earth-centred frame that does not turn,
under J2 gravity, the 1976 standard atmosphere and drag through air that turns with the Earth, and
returns samples and `Results`. Attitude is prescribed, not flown: the gyros' tilt going up, heat
shield first coming down. `from` starts it at separation from a given state, so the capsule's half
can be flown from what the report says separation was, whatever the booster did.

`Flight.checks` (types.ts: `FlightCheck`) are the figures the reports give (apogee, range,
speeds and climb angles at separation, loads, event times), each with an `id` that names a field of
`Results` and a `tolerance` **set before the simulator was run**. Nothing is fitted: an input is
never adjusted to bring a check in.

- **An orbital flight has its own record and its own coast.** `Flight.orbital` (`sim/orbital.ts`: `OrbitalFlight`) stands
  beside `trajectory`: stages and events as the record has them, the orbit as published, the braking burn, the entry body,
  and `checks` with tolerances set first. `flyOrbit` flies from the published orbit round to the burn (aimed as the record
  says: for Vostok, from the Sun, computed) and a sphere with no lift down to the height the pilot left at, in frames.ts's
  inertial frame of date on `world/orbit.ts`'s gravity. `tests/orbital.test.mjs` keeps its `MISSES` by the same rule as
  below and prints what each undocumented input is worth. The powered ascent is recorded and not flown; a flight with only
  `orbital` is not offered to be flown by hand. The flight's `mission.md` is the plan.
- **A miss is recorded, not hidden.** `tests/sim.test.mjs` flies the whole flight and the capsule's
  half against the checks. A check outside its tolerance must be in `MISSES` with how far out it
  is (`by`, give or take `slack`) and why, naming the input most likely to blame. The test fails
  on a miss nobody recorded, on a recorded miss that has moved past its slack, and on one that has
  come within tolerance (take it off). So the list is the truth either way, and improving an input
  means updating it.
- **The inputs that are not documented are listed and weighed.** The last test names every
  `derived` and `estimated` input and prints how far a 5 % change in each moves the results; a
  new input that is not documented must be added there. Keep the label honest: the simulator
  may come to refuse `estimated` inputs.
- **Space-fixed is not Earth-fixed.** Speeds and climb angles come in both (`speed`,
  `groundSpeed`); the reports quote both, and the larger, space-fixed one includes the pad's own
  eastward motion. Say which in any label.
- **The Flown panel** (`src/flown.ts`) flies the flight once, after the page has opened, and draws
  height, range, space-fixed speed and load against time with the reports' figures as dashed
  lines, the clock's instant as a cursor (dragging a trace moves the clock), and the checks as a
  table, amber where out of tolerance. It reads the clock; it keeps no time of its own.
- **The flight is shown as flown.** `Flight.flies` names the model the trajectory carries off the
  pad and the nodes it sheds on the way (tower, booster, retropack) at their times;
  `viewer/ascent.ts` puts that model where the run has it at the clock's instant (a cubic between
  the run's samples, in the Earth's turning axes, in the site's frame) and points it as the run
  does (the gyros' tilt going up, heat shield first after the turnaround). What it sheds is
  flown (`sim/shed.ts`, `Ascent.shed`, `Stage.fall`): each thing in `trajectory.body.sheds` is a
  rigid body of its own from the instant it leaves, and the full level's own node is carried by it,
  turned about its own centre of mass, until the clock goes back. It is drawn while within 40 km
  of the eye or the vehicle and flown on to the sea regardless. Before liftoff and after
  the landing it stands on its pad, whole: the inventory, which the idle show tours. While the engine burns its fire stands
  under the node `flies.engine` names, and it and its smoke are the one thing here meant to look
  real, not designed: volumes, marched in one pass (`viewer/exhaust.ts`: after the ink, before the
  clouds, at a quarter of the pixels and only in the part of the frame they can be in; nothing
  when no flight shows any). `viewer/plume.ts` says what the fire is (an alcohol and oxygen flame:
  pale, seen through, shock diamonds while there is air to stand them up, opening into a wide faint
  balloon as the air thins) and carries its light, a point light kept in the scene at no strength
  while the engine is out; `viewer/trail.ts` says what smoke there is: the blast over the pad at
  liftoff and the trail along the path flown (steam low down, soon gone; a contrail from 7 to 13
  km; nothing above), ending where the clock is. The smoke is lit by the Sun through itself, and
  shades what three's lights light (`smokeShade`, worked out in the lights chunk as the clouds'
  shadow is, so it has no texels to crawl). All of it moves by the clock's seconds only, and all
  of its sizes and amounts are estimated, from film. In the cel look the same volumes are cut
  into flat tones. The rigs that are about the vehicle (chase, locked, on board, pad: "The camera") go
  with it or follow it, and the Sun's shadow map goes with it under them (`Stage.shadeCraft`). The sky darkens with the
  eye's height as the air above it thins (`airAbove` in backdrops.ts: black by 50 km). Under it
  all is the Earth (`viewer/globe.ts`): the WGS 84 ellipsoid at the site's `seaLevel`, drawn in
  the site's frame, which is exact anywhere (frames.ts), so the vehicle, placed from the run
  where it truly is, comes down on the globe's sea 18.6 km below the pad's level. The globe is a
  mesh made in doubles round the point under the eye and remade as the eye moves (rings spaced
  so each triangle looks the same size, out past the horizon); land, lakes and ice are signed
  distances to the shore on a cube map (tools/globe.mjs, Natural Earth), so the shore is a clean
  line at any height; over it the land has its own colours (NASA's Blue Marble for May) and is
  shaded by its relief under the true Sun, and the sea is coloured by its depth (NOAA's ETOPO
  2022: a bank of pale sand is turquoise, the deep near black), with the Sun's glint on it
  (tools/globe-surface.mjs bakes both; "The Earth from height" in rendering.md). The air seen
  from above (`Globe.air`, a ball round the eye; `viewer/atmosphere.ts`: Rayleigh, haze, ozone
  and light scattered many times) makes the limb, the blue over the Earth and the pale band
  along the horizon, and comes in as the sky (backdrops.ts) and the scene's own haze go out.
  Cloud goes on to the limb at every height: the cumulus as the weather has them (a map,
  `viewer/weather.ts`: estimated, with the record's cover kept at the site), a middle deck and
  cirrus on their own shells, all casting shadows on the globe. The site's ground (land.ts)
  keeps the middle: the globe leaves a hole for it, and across its last kilometre and a
  half, inside its cover maps, the ground bends onto the curve and takes the globe's colours
  (`Land.meet`); from 3 km up all of it takes them, but for its made ground, wholly by 20 km
  (`LIFT` in land.ts), so from height the site is not a square of another tone; so where they overlap
  they are one surface and which one the depth buffer picks cannot be seen. Downrange, up is
  the plumb line where it is, not the site's +Y: the sky's (at the eye) and the orbiting
  camera's (at what it turns about, `World.upAt`), so the horizon there is level. Away from the
  site the globe is lit by the true Sun through the air over each place (`chapman`), so the
  terminator reddens and the night side is dark whatever the site's hour; near it, by the scene's
  light, so the two agree where they meet. Round the site the coast is finer: a site's
  `region` (types.ts: RegionDef) names the country its flights see, and tools/globe-region.mjs
  bakes it from OpenStreetMap's coastline and larger lakes onto two gnomonic planes
  (world/region.ts): `near`, 160 km square at 39 m a texel, and `wide`, the region (for the
  Cape, Flagler Beach to Miami and out past Abaco to the landing) at 155 m. The globe
  reads them where they cover, each faded in over the map under it by mixing distances, not
  colours, so a shore that two maps put apart moves across the fade and is never doubled. The
  region is dated (`asOf`): each work in `later` (a causeway, a canal) built after it is undone
  along its line, so the Cape's lagoons are 1961's. Where the ground drawn round the pad hands
  over, its shore lines (cape1961.ts) follow the same coastline, so the two agree to tens of
  metres there; change one, change the other, and rebake (`pnpm globe:region`).
- **The air is seen and felt.** `sim/heating.ts` works the heat flux at the stagnation point from a
  sample's height and airspeed and carries each surface in `Trajectory.heating` (a `Measure` for
  every figure) through the flight as a lump; nothing is held against it until a measured
  temperature is read, and the flight's README says so. `viewer/effects.ts` shows it at the clock's
  instant, from the run on show, record or live: surfaces glow by black-body colour on the real
  material and its cel twin (nothing under about 800 K), the shock layer's glow is a marched volume
  whose brightness is the heat flux over 250 kW/m2 (`entry.ts`: so a suborbital entry is a faint
  wake), a collar of cloud forms at Mach 1 low down, ice falls from the frosted tank at liftoff;
  which nodes and materials is the flight's (`flies.air`). How each looks is `estimated` and says how
  it is scaled. The camera is shaken (`shake.ts`) by the engine's sound where the eye is (late by
  the distance over the speed of sound, weaker as the air thins) and, for an eye that rides with the
  vehicle, by buffet, load and the jolts of events: a function of the clock's time alone, never
  more than 0.6 degrees and 4 cm, nothing with the clock above three times life, scaled by the
  Motion setting to nothing. It is laid on the camera for the draw only (`Stage.shaker`), so
  nothing else sees it. A new effect of the air goes in `effects.ts` and takes its numbers from
  the sample; it does not keep time or name a flight.
- **Getting it right is the work.** Today the powered flight ends 4 % fast, and ten checks miss
  because of it; the capsule flown from the report's separation passes all but one. The flight's
  README ("The flight as flown") states the numbers.
- **Staging is physics, and so is what is shed.** One force model flies everything
  (`sim/forces.ts`): drag along the body's axis by whichever end leads, falling off as the cosine
  and nothing broadside; each `AeroSurface`'s normal force; and the cross-flow on the body's side
  (`Broadside`), as the sine squared, which is the drag broadside and what damps a tumble. When
  something leaves, `part` makes two bodies of one: both centres of mass where they were on the
  stack, each with the velocity that place had (v + w x r), the push shared by the actual masses,
  so linear and angular momentum are kept to rounding, and the vehicle puts a `Release` in
  `VehicleState.released`. `sim/shed.ts` flies each from there under the same gravity and air (on
  the rockets of its own the data gives it, `ShedBody.motors`, all lit as it leaves: the tower's escape and
  jettison rockets both, as the record has a good flight, and the jettison rocket alone after an abort has
  spent the other: `unless: 'abort'`, `Release.aborted`), to the sea, on the vehicle's tick (five ticks at a time
  above the air): about 10 microseconds a tick each. The cockpit steps them beside the vehicle
  (`Sheds.follow`); the record's are flown from fly.ts's run, lazily, as far as the clock asks. A
  new thing to shed is a `ShedBody` in the flight's data and an `on` in `flies.drops`: generic
  code names no part. Every drag area in them today is `estimated`, and says so.
- **The air can break it.** `sim/loads.ts`: the stack's bending load is dynamic pressure times
  angle of attack against `body.limits.qAlpha`; caution from 80 per cent, and over the limit for
  half a second (or at 150 per cent at once) it breaks at `limits.joint`: the engine stops, the
  booster becomes a shed body, and a spacecraft with its escape rocket aboard is pulled clear on
  it. A parachute let out in more dynamic pressure than `limits.drogue`/`main` tears to
  `limits.torn` of its drag area. The limits are `estimated` (no structural figure has been
  read); the constants of consequence are chosen and say so. On the record's programme the load
  peaks at 10 per cent of the limit; hands off from 60 s the stack as estimated diverges and
  breaks up at 80 s, so the greatest pressure has to be flown through.
- **Level is the ellipsoid's.** Climb angles, the retro attitude and a landing's vertical speed
  are measured from the geodetic normal (`upAt` in forces.ts), not from the line to the Earth's
  centre, which leans a sixth of a degree from it at the Cape.
- **The live simulator is the same flight, steered.** `vehicle(trajectory, site, seaLevel)`
  (`sim/vehicle.ts`) is stepped by the frame (`step(state, controls, dt)`: whole ticks of 0.01 s,
  the remainder kept, so a flight is the same at any frame rate) and takes `Controls`: the engine,
  pitch, yaw and roll from -1 to 1, and the events (tower, separation, retrofire, retropack,
  parachutes) as commands. To fly.ts's forces it adds the body's turning: thrust turned by the
  vanes, the air's push on nose and fins (so it weathercocks, lifts and damps), the spacecraft's
  jets, a parachute pulling at its attachment, with mass, centre of mass and inertia following the
  propellant down the tanks (`sim/rigid.ts`). What it needs beyond fly.ts's inputs is
  `Trajectory.body`, each figure with its confidence; most are `estimated`, and
  `tests/vehicle.test.mjs` lists them. The body's +X is the nose; on the pad +Z points against
  the azimuth, so positive pitch tips it downrange. `sim/autopilot.ts` is not physics: it returns
  the same `Controls` a hand does (the tilt programme held by `steer`, the one control law; the
  record's event times) and any axis of it can be switched off or overridden (`blend`), or its
  programme leaned by a pilot's `trim`. It is held
  to fly.ts, not fitted to it: with the air's sideways push off the two agree to 0.05 per cent, and
  with it on the live flight is 0.5 per cent higher at apogee by its lift, which the test states.
  A new force goes in `forces`, a new event in `command` and `Controls`.
- **Controls are hardware, and run out.** The spacecraft's jets are `body.capsule.rcs`: supplies
  (usable propellant, specific impulse, automatic or manual) and thrusters (place and line of push
  in the body's axes, thrust, supply, the axis and sense that opens each). A chamber is open or
  shut for a whole tick (`RCS_DEAD`, `RCS_HIGH`: under the first nothing opens, under the second the
  axis's small chamber, above it the big one; a manual chamber with a `least` is throttled by the
  hand), pushes at its own nozzle (so it shoves as well as turns), burns thrust over g0 Isp from
  its supply, and a supply that cannot feed a tick's burning feeds nothing. `VehicleState.rcs` and
  every `LiveSample` carry what is left and what is firing. The autopilot works the automatic
  system; an axis a hand has (`Controls.manual`) goes through the manual one. The booster's two
  propellants are separate where the body gives `mixture`: liquids marked `propellant` drain at the
  ratio and the engine stops when either is empty. An engine is what its `body.engine` says
  (liquid or solid, how many starts, a throttle range or none): `Controls.throttle` is 0 to 1 and
  the vehicle allows what the engine does (below a throttle's least it is off; a solid hears
  nothing; no lag, there being no figure for one). Solids (escape, retro) burn out once lit.
- **An abort is flown.** `Controls.abort`, while the tower is aboard: the engine is shut down, the
  spacecraft leaves on `body.escape` (its curve of thrust against time where one has been read, else
  thrust, burn and total impulse; its propellant leaving as it burns) with its tower on as one body
  through `ascentDrag`, the tower goes when the rocket is out and the climb is over. The rocket's
  line passes `escape.offset` from the centre of mass, toward `escape.toward`: a torque, which is
  what carries the spacecraft clear of its booster (it tumbles; nothing steers it until the tower
  has gone). What follows is the flight's `escape.sequence` (retropack dropped at once, parachutes
  by the clock after the tower for an abort begun under its `ceiling`) or, without one, the usual
  descent. Phase `escape`; `Tally.abort` has the greatest load. `escape.record` and
  `tests/fixtures/pad-abort` (a trial flown from its own weights off its own leaning launcher:
  `VehicleOptions.elevation`) are what `tests/abort.test.mjs` holds it to, with its own `MISSES`.
- **Manual means manual.** `Controls.automatic: false` switches off the spacecraft's own sequence
  (parachutes by height, the tower after an abort); the cockpit sends it with the sequencer off,
  so then nothing happens that is not commanded, and what follows is the physics: no parachute,
  82 m/s into the sea. `sim/verdict.ts` says how it ended and holds it to `capsule.limits`
  (a landing speed and a load, with their confidence). Nothing rescues the pilot; nothing is scored.
- **The flight can be flown by hand.** Fly it (the button by the clock, or L) takes the flight
  deck (`src/cockpit.ts`): the vehicle on its pad, the clock stopped at liftoff, the view the chase
  camera's, the page out of the way. Space lights the engine and after that sets off the next
  event; the clock runs the flight (stopped, so is the flight; faster, so is the flight, up to
  five seconds of it a frame), and each time it moves the cockpit steps the vehicle up to it.
  With guidance on (G) the autopilot flies the programme and W S A D lean it, three degrees a
  second (the vanes at full throw turn the stack end over end in four seconds); with it off, and
  on the spacecraft alone, the keys are the controls themselves; Q E roll. The sequencer (B)
  sets events off at the record's times. The scene shows it through the same `Ascent`, given the
  live run (`Stage.flyRun`, ascent.ts `Run`), at the clock's instant (the last tick carried on by its own motion for the
  part of a tick the clock is past it, as what it has shed is flown to that instant): placed by each sample's own attitude, the spacecraft
  turning about its centre of mass (on the record's run too: the model's origin is `flies.datum` up
  the stack and the centre of mass `capsule.centre`, and `tests/ascent.test.mjs` holds the model's
  own landmark to the simulator's), what it sheds leaving when it is let go
  (`Flight.flies.drops[].on`), the plume out when the engine really stops (an engine never lit, in
  an abort off the pad, never shows one: `Run.cutoff` is then -Infinity), and after the landing
  it stays where it came down beside a card of the flight against the reports' figures; the clock
  runs on twelve seconds at life's pace, for the parachute to lie down, and stops. Every tick goes
  through `Cockpit.tick`, which notes it: none is flown unseen. The simulator starts the stack's
  base on the site's origin and the model stands on the launcher's support above it: that height
  is eased out of where the model is drawn over the first five seconds (`Ascent.stood`), so what
  comes down meets the surface itself. `Stage.flyRun` stands the model whole on its pad before
  anything is hung on it again. Put the
  clock back and it shows what was flown; the record's own run is untouched and comes back on
  leaving. An abort is X twice within two seconds (the first press arms it and says so). Under the
  gauges a strip made from the flight's data shows the engine's kind and state ("fixed thrust: no
  throttle"; a lever, arrow keys and Z only for an engine with a range: `sim/lever.ts`, which `tests/lever.test.mjs` drives against a fixture that throttles, Freedom 7's not being one), each tank and each jet
  supply in per cent and kilograms (amber under a fifth, "Empty" when it is), which jets are
  firing and every motor burning; a prompt line gives the cues (0.05 g, the next parachute's
  height) and, sequencer off, what is due in amber. On a touch screen a stick (pitch, yaw: as far
  as it is pushed) and two roll buttons stand above the instruments. The parachutes are drawn
  (`flies.chutes`, `viewer/chute.ts`, by way of `Ascent.chute` and `Run.out`), a drop can leave
  `under` one (`drops[].on: 'main'`), and the jets are seen (`viewer/jets.ts`, `Ascent.jets`,
  live runs only). The Flown panel draws the run in amber over the record's as it grows
  (`Flown.fly`). The cockpit reads only the flight's data: a new flight with a `trajectory.body` and
  `flies` can be flown without being told how.
- **Turned round, the spacecraft is rolled periscope side down.** `trajectory.body.capsule.earthward` names the side the
  automatic control keeps toward the Earth from the turnaround until the air is felt (degrees about the long axis from
  the body's +Z); `autopilot` rolls to it with the same law as the other axes. Freedom 7's is estimated, from the
  model's own bearings, and is listed with the other undocumented inputs (tests/vehicle.test.mjs); tests/turnaround.test.mjs
  holds it to three degrees through the top of the flight. A flight that names no side keeps the roll it had.
- **The cabin is the flight deck too** (`ModelDef.cabin`, types.ts: `CabinDef`; `viewer/cabin.ts`; `viewer/gauges.ts`
  for the arithmetic, tested). The model's own needles, counter wheels and lamps read the run on show at the clock's
  instant: the flight being flown (the cockpit hands every sample over, `cockpit.listen`) or the record's
  (`flownOnce`). A needle's scale is written into its node's extras by the script that drew its face, so the face and
  the reading cannot disagree; the flight's data says only which quantity it shows. Attitude is read off the model
  as the scene has it, by a convention stated in gauges.ts. What is not simulated has no `reads`, stands where its
  face was drawn, and says "not simulated" when pointed at (the test insists). A control with `does` calls
  `Cockpit.ask`: a pull ring sets off its own event, whatever is next in order; 'abort' is the key's, asked twice.
  From the couch the deck's strip is put away (`#ui.panel-only`), P brings it back, and that is remembered
  (`deckAboard`). The periscope's screen shows what its objective sees: a cube map drawn from where the objective
  is, laid along its axis, a face or two a frame and only while someone is aboard, shown through a fisheye of the
  documented field. Indoors (`CabinDef.within`) the sky's light and reflection are cut to a tenth by an occlusion
  map of one shade, the model's lights fall off with distance, not its square, and are held against the exposure;
  the Sun through a window is the scene's own. Each window (`CabinDef.windows`) and the periscope's screen is besides a small light whose colour is what is outside it, looked at through an 8 px picture every few frames while someone is aboard (`Cabin.see`); the lights are there from the load, dark, because a light added later rebuilds every shader. What is inside and not shell is drawn only when it can be seen (on board, cut open, or within 30 m) and casts a shadow only on board or cut open (`Cabin.seen`): from the chase view it was half the vehicle's triangles behind a closed hull, twice a frame. Nothing in cabin.ts or gauges.ts names a spacecraft.
- **The flight deck has a navball and a predicted path.** Both read what the cockpit shows
  (`Cockpit.listen`: every sample put on the instruments, with the live state, or null when the
  clock has been put back) and nothing else of it. The navball (`src/navball.ts`, I tucks it; it is the deck's left-hand panel, the path's figures beside it) is
  the sphere of directions fixed to north, east and down at the place under the vehicle, seen
  from inside along the nose (body +X forward, +Z up, -Y right: sim/vehicle.ts), so the launch
  azimuth is at the bottom of the ball on the pad and W takes the nose toward it. O changes its
  frame, and the path's with it: Surface (velocity through the air that turns with the Earth) or
  Orbit (space-fixed, with radial and normal). `ballOf(r, v, attitude, t, target)` is all of its
  mathematics and is tested; the canvas is redrawn only when the attitude has moved a twentieth
  of a degree, and not at all while tucked. The path (`src/sim/predict.ts`, drawn by
  `viewer/path.ts`, J: M is kept for a map) is where the centre of mass goes from the instant on show if the pilot
  does nothing more: fly.ts's gravity and drag curves (`dragArea`, `chuteArea`, `thrustIn`), and what the sequencer
  will do by itself (`Sequence`, from the live state: separation and its push, the retrorockets as fly.ts fires them,
  the pack, the parachutes at their heights; with the sequencer off, nothing, not even the parachutes, as the live
  simulator has it), until it meets the sea, has gone once round (then it is an orbit, with its osculating elements) or
  six hours have passed. Predicted from before separation it is the landing the live simulator then flies, within half
  a per cent (tests/predict.test.mjs). While the engine burns under guidance K chooses between "to cutoff" (thrust
  along `programmeAxis`, the tilt programme with the pilot's trim: attitude prescribed, as fly.ts's is, not the rigid
  body stepped), drawn dashed up to the cutoff, and "cut now"; the choice is a two-way control beside the figures,
  shown only then (K does nothing otherwise, and says nothing it cannot do). On the pad the plan is the only path.
  Besides the path it names what happens on it (`events`: cutoff, tower, separation, retrofire, the pack, the first
  0.05 g after retrofire, the greatest load before a parachute, drogue, main) and returns the path at instants of its
  own, multiples of a power-of-two step its bend allows (`gridStep`), so two predictions of the same flight share their
  points. A prediction is begun at most five times a second and worked in slices of 1.5 ms a frame
  (`Predictor.run(budget)`; `sr.path.cost` says what the last one took); nothing is predicted while the path is off. A
  path that comes down is drawn over the ground (each point where it will be over the ground at its own instant); one
  that goes round is drawn in the navball's frame (O), in Orbit as it lies in the frame that does not turn, the mesh
  turned back about the Earth's axis as the clock goes on. It is an instrument's line, and lunar-lift's
  (../lunar-lift, js/predictor.js) is its model: a ribbon of constant width in pixels with a soft core (in the cel look a
  flat line with an ink edge), drawn after the solid scene against its depth and writing none, so the vehicle, the
  ground and the cabin's walls hide it and the Earth's bulk hides it beyond the far plane; it starts a gap ahead of the
  vehicle and comes in over three more (lunar-lift's stops), and never within the vehicle's outline on the screen;
  nothing of it nearer the eye than the near plane. Each frame only uniforms change: a new prediction is eased in over
  0.3 s from where the line was, instant by instant (`viewer/pathline.ts`), so a prediction made again of the same flight
  moves nothing. The line flown is drawn behind it, paler. Its markers are glyphs on the line with a name, a figure
  and the time to it (apogee, the events, where it comes down, with a ring on the surface there), laid out together by
  rank, off the panels, the vehicle and each other, keeping their places (`viewer/pathmarks.ts`); not drawn from the
  seat. It is given to the stage through `Stage.overlay`, which builds its shaders in `Stage.warm`.
