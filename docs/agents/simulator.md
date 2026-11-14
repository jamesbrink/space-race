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
  below and prints what each undocumented input is worth. The flight's `mission.md` is the plan.
- **The ascent to orbit is flown from the pad** (`sim/staged.ts`), from `orbital.stages` and `orbital.ascent`: stages
  burning together and in turn (each `count` alike; vacuum thrust less exit area times the air's pressure, the exit area
  derived from the two published thrusts unless given; flow from the vacuum figures; a `throttle` curve where one is
  known; stopped at its cutoff or when its `usable` load is gone), each dropped at its `separation` as what it weighed
  fuelled less what it burned, other drops (a fairing) by mass, drag on `ascent.drag`'s areas and curves. Attitude is a
  **stated law**, not a stored programme, because none has been found: `Guidance` (orbital.ts) says it, and `steer`
  solves its three unknowns (launch plane, pitch-over, the linear tangent's rate) for the design conditions at the last
  cutoff (height, climb, inclination), so those three are targets and not checks. `flyWhole` hands the spacecraft at
  separation to `flyOrbit` (`from`), and `flyDown` (orbital.ts) brings each of `orbital.descent`'s bodies (a module, a
  pilot) down from the ejection height on its own parachutes. `tests/staged.test.mjs` holds the ascent's, the coast's and
  the descent's checks with their own `MISSES`, lists every input that is not documented and prints what each moves, the
  law solved afresh each time. A new orbital flight flies on this with its own data: nothing in staged.ts names a stage.
  A stage with `velocity` is cut as its integrator cut it, when its speed (or with `apparent`, the acceleration it has
  sensed since its ignition) reaches the setting (found within the step by the secant, so the instant is smooth in the
  inputs), and its recorded `cutoff` becomes a check. Vostok 1's Block E, cut on the flight task's 2,283.52 m/s of
  apparent velocity, stops at 676.35 s with 46 kg aboard against NIIP-5's recorded 677.08 s; the ascent ends 157 m/s
  short of the orbit, and the documents' own staging times for the core cannot be flown on the blocks' secondary masses
  (the flight's mission.md, "What the ascent gives" and "The 2011 documents", says why).
- **Every flight is flown on the one deck** (`src/deck.ts`: its three panels, keys and buttons, stick and roll, tucking,
  notes and card), with a flight kind's code behind it: `cockpit.ts` for a flight on a `trajectory`, `orbitdeck.ts` for
  one into orbit (`orbital.ascent` and no `trajectory`; chosen in main.ts; `lacks` in address.ts lights Fly for it). What
  differs is data the kind supplies (`DeckSpec`): the middle panel's figures (a flight into orbit shows a ballistic
  flight's five going up and height, speed, apogee, perigee and period once alone), the readings, the systems strip (each
  stage's propellant as a bar, the braking engine, the lock's lamps), the steps Space walks through and the keys beyond the
  deck's own (a throttle's arrows, a lock's digits). G and B are guidance and the sequencer on both, W S A D Q E steer on
  both, Space is the next thing on both.
- **An orbital flight is as flown until it is taken over.** As flown (the default, "As flown: automatic"), the run is the
  record's (`flyWhole`), shown through `Ascent` as a run that carries its own attitude (`recordSamples`, ascent.ts
  `orbitalRecord`); what it drops is flown from `orbital.ascent.sheds`, each pushed back off the stack by its share of its `push` (`pushedOff`: the spacecraft's share is not added to the spacecraft's flight). After a burn by hand the attitude drawn is the hand's: as it was left until the modules part, then turning to lie along the motion through the air. Its pilot had no controls going up, and the deck says
  so where the override is offered (a hand on the keys in the ascent says it in a note). Once the spacecraft is alone the
  code on the lock (its digits) frees the hand controls, as the envelope did: W S A D Q E turn the spacecraft at
  `manual.rate`, the timer's burn is given up, Space fires the braking engine along the long axis (`byHand`), and the rest
  is flown again from that burn. G, B or Space in the ascent (or either switch thrown on the pad) takes the flight over:
  from that instant it is the user's ("Not the record's"), the live staged vehicle (below) is caught up to the record at
  that instant (flown from the pad with its attitude placed as the law's: the two agree to a hundredth of a metre a
  second) and flown on by the switches and the hands, Space sets off the record's steps in turn whenever it is pressed
  (each stage lit, cut, let go; the fairing; the spacecraft parted), and once parted the spacecraft coasts from where that
  ascent left it (`flyOrbit` from `parted`), short of an orbit or not: the handover to the published orbit is the record's
  run's alone. Its hand controls are the user's without the lock. The turning in orbit is a hand's on the attitude, not a
  rigid body's: no jets, no gas, no tumble. The deck predicts the path from every instant of the flight by the one
  propagator (below, "The flight deck has a navball and a predicted path"; orbitdeck.ts `predict`, given to path.ts as the
  source's `predict`): on the launch vehicle, under guidance or by hand, where it goes if the engines stopped now (fliers.ts
  `stack`: what it still carries on the drag of the shape it has, to the ground or once round; "Engines stopped now" beside
  the figures); alone, its coast as planned (`spacecraft`: flyOrbit's forces), once round with Ap and Pe, or down to the
  ejection height with the burn, its end, the modules' parting and the entry marked (it stops there whether a burn was
  made or not, as flyOrbit does). The Flown panel holds every check the orbital record sets (staged.ts `held`) against the record's run;
  the deck's card holds the coast's and the descent's against the flight on show, and on the user's own flight the
  ascent's too (`StagedTally`). Sound and shake take the first stages lit at liftoff as one engine (`liftoffEngine`); the
  braking engine is heard when the run on show burns it (its `fires`), as one burn of its length. Every engine burns
  from its own nozzles (`flies.fires`: each strap-on's RD-107 and the core's RD-108 as well as Block E and the braking
  engine), between its stage's instants on the run on show and at its stage's throttle (`Ascent.fireLevels`, the
  arithmetic in viewer/fires.ts, tests/fires.test.mjs): the strap-ons at their intermediate stage before they part and
  gone with them, the core on its steering chambers alone through its final stage; a cabin control's `does` of `code:` and a numeral is a key of the deck's lock, and the
  deck hands the cabin, with each sample, the instants of the record's events on the run on show (`DeckNews`; ascent.ts
  `orbitalEvents`, moved by a burn by hand), the hands' push and whether they have the attitude, so its lamps light on those
  events, its gauges with a `history` follow the record's readings, the manual orientation's switch stands as the hands are
  and the hand controller moves with the keys. Because
  the ascent as recorded falls short of the published orbit, what the record's run shows from separation is the published
  orbit begun where the ascent left the spacecraft (`published`); the tests hold the ascent itself to the record as flown.
  The descent is drawn from the run's own `descent` (staged.ts `descentOf`: flyDown's tracks in the scene's frame, when
  each parachute came out and went): a drop that `rides` the descent's bodies is carried along each body's track in turn
  and turned to hang against its motion through the air; a body's parachute (`ChuteDef.body`) is drawn by chute.ts from
  flyDown's instants and streams against the air of what carries it; a parachute that `replaces` a body's drag can leave
  what was left behind as a body of its own (`leaves`: the seat), and one `instead` of another lets that one go; a figure
  of the flight's `hangs` from its harness under its body's canopy in the pose the figure carries; the run's own body
  turns to hang from where its parachute is made fast (`Ascent.hangsFrom`). How each hangs is drawn; the tracks are
  points. The globe is drawn at the sea's height, not the ground's, so each body's last kilometre is drawn lowered evenly
  by the descent's `ground` until it rests on the drawn surface (staged.ts `settled`); the figures, and the card's height
  of the landing place, are the flight's own.
- **The descent can be given by hand** (orbital.ts `DescentHands`, staged.ts `flyOn`). Its events are the record's data:
  the modules' parting (`entry.separation`), the ejection (`ejection.altitude`), and each body's parachutes; a body other
  than the first (the entry body, which carries the pilot until the ejection and the instrument module until the modules
  part) leaves it at the first of its `with` events. The automatic sequence (the timer, the barometric switches) acts only
  while the sequencer is on (`switched`); what a hand gives (`given`, at the clock's instant) acts whatever it is. flyOrbit
  hands over to flyDown at a hand's first event if that comes before the ejection height, and the modules' parting ends a
  braking burn (the engine is on the instrument module). The entry body flies the coast's drag above the ejection height
  and its own figure below; joined, it is heavier by the instrument module and no draggier (the coast's convention: no
  figure for the joined ship's drag, nor for the heat that burned its cables through on the day). Every parachute is held
  to the tear rule while out (`strength`, `pull`, `descent.torn`), and fills over its `fills`, so one let out too low does
  not fill; `downVerdict` (sim/verdict.ts) holds the pilot to `descent.crew` (a landing aboard, a landing under his canopy,
  the air's blast and the fastest he can be out in it, each estimated: the heat of the air on a man is not modelled), and
  a flight that stays up to `decay` (the orbit's life in the standard air on a free-molecule drag coefficient, against
  `supplies.days`). Nothing given, it is the record's run to the last bit (tests/descent.test.mjs). On the deck
  (orbitdeck.ts) each event is `descent:<id>` (`can`, `ask`, `Part.commands`, offered on what is let go as well as on the
  vehicle), Space gives the next in the record's order once no burn is to come, and B with the spacecraft alone and no
  burn to come is the descent's sequencer (before the timer's burn it gives that burn up too); each override's label says
  what did it on the day (`descent.automatic`: he could do none of it). The shock layer's glow takes `orbital.heating` (a `round` body is blunt at any attitude): the flux on the
  documented radius, no surface without its figures. The deck runs on until the last body is down. The smoke is laid no higher than 80 km
  (`TRAIL_TOP` in stage.ts): laid round the Earth, its marched volume stalled the page.
- **A staged vehicle is flown live on the same physics** (`sim/stagedlive.ts`, `stagedVehicle`): staged.ts's stages,
  engines, throttle curves, propellant, drops and drag (`stackOf`), air (`airAt`), gravity and integrator (world/orbit.ts
  `step`), in the same frame, stepped by sim/vehicle.ts's TICK. What it adds is the body's turning, a rigid body whose
  steering gives `ascent.steering.authority` (estimated) about each axis at full throw while an engine aboard burns (no
  inertia, no aerodynamic moment, no structural limit: none read; drag acts along the motion, as in the batch run), and the
  hands' say over every event (`StagedControls.steps`): nothing happens that is not asked for, a stage let go takes every
  stage below it still on, its propellant and its thrust, an engine is started once and stops when cut or dry. The
  record's flight is a pilot (`stagedPilot`): the law's axis held by a critically damped turn (`OMEGA`, chosen) with the
  law's own turning fed forward, the steps at the record's times and a stage with `velocity` cut on its integrator's sum,
  read every tick from switches the deck throws; guidance on, W S A D lean the law as a ballistic deck's trim does. With
  the attitude placed as the law's (`prescribed`, a test's) it is the batch run to 0.03 m/s and 48 m at the last cutoff;
  steered at the stated acceleration it is 5.6 m/s slow and 0.5 km high there, the pitch-over's lag carried on by the
  gravity turn: a recorded miss in `tests/stagedlive.test.mjs`, which also holds a stage let go early and an engine cut by
  hand to their consequences. Steered as well as the law steers it, a hand-flown ascent falls short of an orbit as the
  record's run does (perigee about -200 km at the cutoff): no input is changed to bring it in.
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
  the landing it stands on its pad, whole: the inventory, which the idle show tours. While an engine burns its fire stands
  under its nozzles (a ballistic flight's one engine under the node `flies.engine` names; every other in `flies.fires`,
  a cluster's main and steering chambers found in its bells' geometry, viewer/fires.ts), carried by the part that holds
  it, so a strap-on's dying fire swings away with it; the fires and their smoke are the one thing here meant to look
  real, not designed: volumes, marched in one pass (`viewer/exhaust.ts`: after the ink, before the
  clouds, at a quarter of the pixels and only in the part of the frame they can be in; nothing
  when no flight shows any). `viewer/plume.ts` says what the fire is (an alcohol and oxygen flame:
  pale, seen through, shock diamonds while there is air to stand them up, opening into a wide faint
  balloon as the air thins) and carries its light, one point light for every fire at once (at their middle, by the area burning: `lightFires`),
  kept in the scene at no strength while the engine is out; `viewer/trail.ts` says what smoke there is: the cloud over the pad at
  liftoff (a puff of steam round the stand, a ring rolled up at the front of the jet thrown out over
  the concrete, a low tan haze of dust: the sizes and how long it hung are read off MR-2, MR-3 and
  MR-4's photographs, and by T+6 the apron is clear but for wisps drifting downwind) and the trail
  along the path flown (steam low down, soon gone; a contrail from 7 to 13 km; nothing above),
  ending where the clock is. The smoke is lit by the Sun through itself, and
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
  Cloud goes on to the limb at every height: the cumulus as the day's weather has them (a map
  for the flight's own day, `viewer/weather.ts`: the flight's record where it speaks, estimated
  elsewhere), a middle deck and the high cloud on their own shells, all casting shadows on the globe. The site's ground (land.ts)
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
  because of it (and an eleventh, the greatest dynamic pressure going up, by the day's tail wind);
  the capsule flown from the report's separation passes all but one. The flight's
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
- **The air moves.** `trajectory.winds` (types.ts: `Winds`) is the day's sounding over the pad,
  each level's speed and bearing a `Measure`; `blowOf` (forces.ts) turns it into the air's motion
  east and north at a height, straight lines between levels in those parts (so a swing through
  north is not a spin through south), the lowest held to the surface, falling evenly to nothing
  from the highest to `calmAbove`. Every flier (fly.ts, vehicle.ts, shed.ts, predict.ts) takes its
  drag and lift from the motion through that air and its speeds over the ground from the motion
  over the ground: `Wind.wind` and `Wind.ground` are different things once there is wind. One
  sounding stands for the whole flight; no gusts. A flight without `winds` is flown in air that
  turns with the Earth and no more, and a test that asks something of the vehicle rather than
  of the day (a static margin, an abort against another day's record) says so and flies still air.
- **The air can break it.** `sim/loads.ts`: the stack's bending load is dynamic pressure times
  angle of attack against `body.limits.qAlpha`; caution from 80 per cent, and over the limit for
  half a second (or at 150 per cent at once) it breaks at `limits.joint`: the engine stops, the
  booster becomes a shed body, and a spacecraft with its escape rocket aboard is pulled clear on
  it. A parachute is held to what it can take for as long as it is out, not only as it is let out:
  in more dynamic pressure than `limits.drogue`/`main` its cloth tears, and where `limits.pull` gives
  one, so do its lines when the pressure times the area it has filled to passes that (a main let out
  above the air and carried full into it goes at 340 Pa); `limits.torn` of its drag area is left, it
  is drawn streaming (`Run.torn`, `chute.ts` `tornMouth`), and the path ahead tears it likewise
  (`predict.ts`). `VehicleState.tore` says when and by which. The limits are `estimated` (no structural figure has been
  read); the constants of consequence are chosen and say so. On the record's programme the load
  peaks at 26 per cent of the limit in the day's wind (10 in still air); hands off from 60 s the
  stack as estimated diverges and breaks up at 80 s in still air, and from the pad in the day's
  wind at 36 s, so it has to be flown.
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
  the body's +Z); `autopilot` rolls to it with the same law as the other axes. Freedom 7's is 180: the side that lay
  down range on the pad, since the launcher was turned until the vehicle's pitch plane lay on the azimuth and the
  capsule rode feet down range (derived: sites/lc-5.md, "Which way round the vehicle stood"; tests/launcher.test.mjs
  holds the vehicle's turn in the scene, the pad's and this to one another). tests/turnaround.test.mjs holds it to
  three degrees going up and through the top of the flight, and to ten through the turnaround. With a side named
  the control makes one turn to the whole attitude (`turnBoth`: the long axis to where it is wanted and the keel
  down together), which end for end is a half turn about the plumb line: a yaw, as the record's turnaround was
  ("yawed 180 degrees"), the periscope toward the Earth throughout. Until November 2026 it turned the long axis the
  short way, pitching over, and then rolled to the side: the same end by a way the record does not have. A flight
  that names no side still turns the long axis the short way and keeps the roll it had. The scene turns the record's
  own flight round the same way (`viewer/ascent.ts` `place`, `keel`): to the attitude with that side underneath, which
  from how it rode the booster is the yaw. Until then it pitched the model over the top and left the pilot head down
  from the turnaround on (the roll needle read 179). tests/ascent.test.mjs holds both runs to it.
- **A right click on the vehicle in flight is the part's own menu** (main.ts `stage.onSpot`): what that part can be told
  to do now, from the flight's data (`Part.commands`, types.ts `Command`: a step `Cockpit.ask` sets off, offered only
  while `Cockpit.can` says the simulator would hear it), and a look at the spot, which is kept in the vehicle's own frame
  and goes with it (`Stage.lookAtCraft`: the chase view aimed there; 0 centres the vehicle again). Off the vehicle
  nothing is offered but, on a stage that has left, to follow it down (camera.md): nobody gets out and walks, and the
  view is not sent to a place the vehicle has left. On a flight into orbit a part's commands are the launch vehicle's
  steps (`step:<ignite|cut|separate>:<stage>`, `step:drop:<id>`: orbitdeck.ts `can` while the step is still to come or
  undone, `ask` taking the flight over as Space does, the live vehicle doing what it does with it at that instant) and the
  braking engine (`retro`, once the hands are free); each label says what the pilot could not do. The Flown panel sets a
  flight flown by hand beside the record's run, check by check ("You": `Run.held`). A mechanism the pilot
  can work (the periscope) is a `Command` on its part too: `work:<its id>`, offered as putting it out or drawing it in
  by where it is headed (below).
  The same menu, and **Y** anywhere, takes the vehicle's skin off and puts it back: the cutaway (`ModelDef.cutaway`,
  `Stage.setCutaway`), which on a pad or in the gallery cuts a quarter of every shell away and on the vehicle in flight
  takes the shells off whole (their materials not drawn; the cut's planes stand in the place and a vehicle that has
  left is not between them), from outside or from the seat. Choosing an `inside` part opens it as it always has.
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
  documented field, with Mercury's reticle on it unless `reticle: false` (a screen whose rulings are the model's); a
  `ring` of ports round it shows a band of angles off the axis on the same cube, the nearer the axis the nearer the
  middle, so the horizon stands evenly in it only with the axis on the Earth's centre (the Vzor). The deck's predicted
  path is not seen through it, and after the vehicle turns with the clock stopped frames are asked for until every face
  is drawn again. A `globe` (the Globus) turns its node so the point under the spacecraft is under its cross and the
  way it goes over the ground runs up the board (gauges.ts `globeTurn`), painted from the globe's land map
  (`CabinHost.earth`). A lamp can show an orbital record's event (`event:<id>`, out at `until`'s); a gauge can follow
  a `history` of readings, each at an instant from liftoff or after an event. Indoors (`CabinDef.within`) the sky's light and reflection are cut to a tenth by an occlusion
  map of one shade, the model's lights fall off with distance, not its square, and are held against the exposure;
  the Sun through a window is the scene's own. Each window (`CabinDef.windows`) and the periscope's screen is besides a small light whose colour is what is outside it, looked at through an 8 px picture every few frames while someone is aboard (`Cabin.see`); the lights are there from the load, dark, because a light added later rebuilds every shader. The cabin's own lamps have their switch (`CabinDef.lighting`: a lever of the model with a turn for each position, what each position lights, and each lamp's tube): a click on it from the seat, or its button under the lookouts, throws it (it has no key: none is free on the flight deck) (`Cabin.light`), the lamps it names come on or go out in a few hundredths of a second, their tubes glow or not, and every surface the build shaded goes over to its lamps-out figure (rendering.md, "An inside to sit in"), so with them out the cabin is lit by its windows, its periscope's screen and its telelights. It opens as the model was built (as flown) and is not remembered: nothing else in a cabin is. What is inside and not shell is drawn only when it can be seen (on board, cut open, or within 30 m) and casts a shadow only on board or cut open (`Cabin.seen`): from the chase view it was half the vehicle's triangles behind a closed hull, twice a frame. Nothing in cabin.ts or gauges.ts names a spacecraft.
- **A mechanism runs to its programme, and a hand can take it** (`ModelDef.mechanisms`, types.ts: `MechanismDef`;
  `sim/mechanism.ts`, pure and tested). A periscope and its door: one motion with one figure, its travel. Its motion
  is the model's own: each node that moves carries it in its extras, written by the script that built the linkage
  (types.ts: `Move`, `run`), and the flight's `clocked` moves say only when it is played, out or back; so wherever
  there is a clock it follows its programme at the record's instants. In a flight flown by hand `Cockpit.work` (its
  control in the cabin, `CabinDef.controls[].works`; its switch among the deck's keys; a `Command` on its part, `work:<id>`,
  in the part's right-click menu; no key, every letter being taken) sends it the other way from
  where it is headed, and `Cockpit.travel` says how far out it is at any instant of that flight: the programme's
  events while the sequencer is on, the hands' commands, and the sequencer's being switched back on (it then goes to
  where the programme has it), each heard in order, a motor running between them. The stage holds the mechanism's
  nodes at that travel (`Stage.setMechanism`: the clocked moves played at the instant that shows it) and gives them
  back to the clock when the deck is left; the cabin's periscope shows the outside only as far as its objective is out
  (`CabinDef.periscope.mechanism`). Nothing of it reaches the physics: no drag or heating figure for a periscope left
  out has been read.
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
  does nothing more. **One propagator for every vehicle** (`propagate`): it is given the vehicle as a `Flier`
  (`sim/fliers.ts`: what pushes it at a state, with its own simulator's force functions; the next instant it has
  scheduled; the height it next acts at coming down; what it does at each, as data: events to mark, a new velocity, an
  end), adds gravity with J2, and steps them all alike: Dormand and Prince's 5(4) pair, each step's error held to a
  millimetre and a hundredth of a millimetre a second, no step turning the motion by more than a degree (so the cubic
  between two steps, which is what is drawn, keeps to the integrator's path within a centimetre), every step ending on
  the flier's next instant (nothing a flier is changes within a step), each height and the ground found on the step's
  cubic and the step flown again to there. The air's two marks are its own and every vehicle's: the first 0.05 g felt
  coming down once nothing burns and no burn is to come, and the greatest load from there before a parachute. The
  vehicles: `ballistic` (a `Trajectory`'s: Freedom 7), `spacecraft` (an orbital spacecraft alone: flyOrbit's
  `shipPush` and `aimOf`), `stack` (a staged launch vehicle with its engines stopped). The differences between them are
  the vehicles': drag curves and areas, what is scheduled, the retrorockets' line (against the motion over the ground)
  against the braking engine's (fixed as it lights), parachutes. Each is a point mass with the attitude its forces need
  prescribed: the Redstone's rigid body (vehicle.ts: its moments, its autopilot's lag behind its programme, under a
  degree) is not stepped, nor the staged vehicle's turning. Freedom 7's prediction: fly.ts's gravity and drag curves (`dragArea`, `chuteArea`, `thrustIn`), and what the sequencer
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
  points. A prediction is begun at most five times a second and worked in slices of 1.5 ms a frame, for every vehicle
  (`Predictor.run(budget)`, the path put at its own instants in a slice of its own; `sr.path.cost` says what the last
  one took): sliced, not a worker, because a vehicle is closures over its flight's data (a programme's axis, a plan)
  that a worker would have to rebuild for every state. On a phone-class processor (Chrome's CPU slowed four times) the
  longest slice, both flights by the record and by hand under thrust, was 2.4 to 4.4 ms in each run but one (19 ms
  once, in Vostok 1's ascent: a pause of the page's, a whole cut-now prediction there taking 1 to 7 ms unslowed), where
  the orbital deck's old predictor took 135 ms in one frame (14 November 2026). It is worked out only when it is
  wanted: while a prediction made again from the flight would lie within half a pixel of the curve on show wherever that
  is drawn (its departure from the curve, its place and three times its velocity's over the time ahead: a coast's
  departure grows no faster), the plan unchanged, and a path that comes round still reaching most of the way round,
  that curve is its future and nothing is worked out again (path.ts `holds`); under thrust the flight leaves it within
  a frame or two and it is worked again (on the launch vehicle of a flight into orbit the path is "if cut now": the
  deck says so beside its figures); nothing is predicted while the path is off. Whichever deck predicts (the ballistic deck's path.ts itself, the orbital deck's `predict`), path.ts
  is given one `Predictor` and one `Prediction` and knows nothing of which it was. A path that comes down is drawn over
  the ground (each point where it will be over the ground at its own instant); one that goes round is drawn in the
  navball's frame (O), in Orbit as it lies in the frame that does not turn. It is an instrument's line, and lunar-lift's
  (../lunar-lift, js/predictor.js) is its model, with KSP's for what it shows: one clean line from the vehicle to where
  the path ends, the whole orbit once round when there is one. Its rules are the screen's and the path's own, the same
  for every path (`viewer/pathline.ts`, path.ts's header): the prediction is a curve (its points with their velocities,
  the cubic between them), cut each frame into chords until none strays more than 0.35 px from it as seen from the eye,
  wherever the eye is, at multiples of a power of two seconds so the chords stay put as the clock runs; it starts at the
  instant on the curve nearest the vehicle as drawn and is taken onto the vehicle there; it is a ribbon of constant
  width in pixels (each chord pushed out across its own direction on the screen and mitred to the next, never thinned
  with distance) with a soft core (in the cel look a flat line with an ink edge), drawn after the solid scene against
  its depth and writing none, so the vehicle, the ground and the cabin's walls hide it; the Earth hides it by a sphere
  (the polar radius) tested for every pixel, so it ends at the limb to a pixel; it starts a gap from the vehicle (half its length and a
  little, or a tenth of the view's height at it) and comes in over 40 px more as seen at the vehicle (lunar-lift's stops), a rule of the screen
  so a short path near a big vehicle is still seen leave it, is kept off the vehicle's outline on the screen only where it passes in front
  of the vehicle, and each chord is cut at a plane just past the near plane and fades in over the next doubling of the
  distance, so nothing is drawn behind the eye. A new prediction is eased in over 0.3 s from where the line was, instant
  by instant, and a prediction made again of the same flight lies on the same curve, so nothing moves. The line flown is
  drawn behind it, paler, the same way. Its markers are glyphs on the line with a name, a figure
  and the time to it (the next apoapsis and periapsis, found in the path itself where its radial speed changes sign
  (predict.ts `apsides`), whatever it is; the events; where it comes down, with a ring on the surface there; one behind
  the Earth is laid on its place, dimmed), laid out together by
  rank, off the panels, the vehicle and each other, keeping their places (`viewer/pathmarks.ts`); not drawn from the
  seat. The few that matter now (the apogee ahead, the next event, where it ends) have besides a chip at the edge of
  the clear part of the view, on the bearing to them, with a pointer, for when their place is off the window, under a
  panel or behind the eye (`layChips`: the bearing of one behind the eye is its place across the line of sight, never
  mirrored through the middle, and it agrees with the one in front where the two meet). A chip keeps off the panels
  (brought in along a corner panel's inner edges), the vehicle, the markers on the line and the other chips; it is
  drawn where it is laid, fades in as the marker on the line fades out and the other way about, and where its place
  leaps it fades out and in again rather than glide across the page. From the seat there are only the chips, with the
  deck on show. In the real look the line has a thin dark casing under its core, which is what reads against a bright
  sky, cloud and sea, and from inside the vehicle nothing of it within the vehicle's radius is drawn. It is given to
  the stage through `Stage.overlay`, which builds its shaders in `Stage.warm`.
