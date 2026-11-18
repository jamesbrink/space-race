# The simulator

Part of the agent notes: start at [AGENTS.md](../../AGENTS.md).

`src/sim/` flies a flight from the record, in doubles, with no three.js. `Flight.plan` (sim/plan.ts:
`FlightPlan`, below) is the input: masses, the engines' thrust, specific impulse, exit area and
cutoff, the tilt programme, drag against Mach number, separation, retrofire, the parachutes, each a
`Measure` with its confidence and source, in SI with the source's own units in `source`.
`fly(plan, site, seaLevel)` integrates its plan (`Flight.plan`, below; RK4 at 0.05 s, every step cut to end on the next
event, so one input gives one flight to the last bit; within a step what burns and what is attached are as they are
from the step's start, so a burn that ends on a step's end is pushed through all of it and one that lights there is
not felt in it: every integrator here, batch, live and predicting, keeps that rule, and a live tick that holds a burn's
end inside it is flown in two there) in an Earth-centred frame that does not turn (the flight's,
`world/earthframe.ts` `frameOf`: the inertial frame of date, the Sun's and the published elements', which every simulator,
predictor, deck and view of a run shares; world.md),
under J2 gravity, the day's air (the column over the pad where its flight carries one, the 1976 standard
atmosphere elsewhere: air.ts `skyOf`) and drag through air that turns with the Earth and blows as the day's wind, and
returns samples and `Results`. Attitude is prescribed, not flown: the gyros' tilt going up, heat
shield first coming down. `from` starts it at separation from a given state, so the capsule's half
can be flown from what the report says separation was, whatever the booster did.

`Flight.checks` (types.ts: `FlightCheck`) are the figures the reports give (apogee, range,
speeds and climb angles at separation, loads, event times), each with an `id` that names a field of
`Results` and a `tolerance` **set before the simulator was run**. Nothing is fitted: an input is
never adjusted to bring a check in.

## Separation and recontact

The recorded orbital flight has two states at spacecraft separation. The incoming state finishes the
ascent. The outgoing state starts the published coast at the same place and instant, with its own
velocity. Interpolation on either side uses the velocity for that side. Both the spacecraft and its
detached stage use the outgoing trajectory as their reference. On a live ascent the simulator divides
the joint's relative speed between the two masses. A piece on a rotating vehicle also inherits its
station's velocity and the stack's rotation.

On a hand-flown flight, `sim/contact.ts` sweeps rounded collision shapes between physics samples.
`Sheds.meet` resolves a detached part against the assembly still aboard; `Sheds.siblings` resolves
detached parts against each other. Each impact changes both outgoing trajectories. The flight deck
reports closing speed and absorbed kinetic energy. The contact impulse acts at the point of impact.
An off-centre impulse can exchange spin and translation. A centred impulse on bodies initially
without spin leaves them without spin. The response assumes frictionless, perfectly inelastic normal
contact. The rounded shapes and the moments of inertia inferred from them approximate the hardware.

A sufficiently hard impact can release visible parts. The breakup threshold is a game estimate
shared by all missions. A struck Mercury-Redstone capsule carrying its retropack can lose it through
the same joint as a commanded jettison. Its mass and centre of mass change, and the pack flies and
can collide as a separate body. Other visible fragments are pieces of the model on independent
gravity trajectories. These visual pieces neither transfer simulated mass nor produce secondary
contact impulses. The simulation does not predict material failure or crew injury.
`pnpm test:impact` flies a controlled glancing encounter and a hard encounter through the live
deck and checks the rendered flight going forward and back over the impact.

An orbital replan carries the history up to separation and rebuilds later releases on the new coast.
Nearby bodies use shorter steps. The broad phase also sweeps distant bodies, so a later return can
produce another impact. `tests/contact.test.mjs` checks momentum, absorbed energy, a fast crossing,
a near miss, and leaving and returning. `tests/separation.test.mjs` checks clearance on the historical
runs. `pnpm test:separation` checks detached nodes in the running viewer.

## The core

The rules every simulator, predictor and deck keeps. Each names the one place it lives; a second copy is a bug.

- **One plan for every kind of flight** (`sim/plan.ts`). A `FlightPlan` is `{ kind, craft[], events[], attitude[], gravity?,
  winds?, checks[], record? }`.
  - `Craft`: `bodies`, the `joints` between them, `engines`, `tanks`, `thrusters`, `chutes`, `limits` and the stack's `drag`.
    - A joint carries its `push`, the bodies it lets go (`gone`), what it `covers` and the joints it `holds` (a fairing
      over the spacecraft), any `hot` staging, and the record's mass after it parts (`after`) and of what leaves (`leaves`).
    - An engine draws on tanks and carries a throttle, a gimbal and a number of `starts`. A thruster set does rotation,
      translation or both.
  - `EventDef`: `{ id, label, when: Trigger[], do: Action[], automatic, at?, record?, source, armed? }`.
    - Every trigger in `when` must hold: `time`, `after` another event (+`wait`), `height` going up or down, `speed`
      (space-fixed, or an engine's `apparent` velocity), `g`, a hand's `command`, `falling`.
    - `do` lists the actions, in order: `ignite`, `cut`, `throttle`, `separate`, `deploy`, `release`, `attitude`, `arm`.
    - `at` is the record's instant; `record` names the record's own event at that instant (set on every timed event at one),
      or the one it is where the record gives it no instant of the clock's (the pilot set loose at a height).
    - An event marked `armed: false` waits for an `arm`.
    - `clockAt(plan, event)` is when the clock sets it off: its `time`, or so long after the event it follows, down the chain.
  - `record.marks` are the record's instants that set nothing off. An instant counts as an event's only where the clock sets
    that event off (at a time, or after another), so a stage cut on its velocity leaves its record instant a mark. A mark
    that `lands` a body is that body's landing: a run has its own instant for it.
  - What the record's sequence did is said as events, never as a list of the record's ids in code: a Vostok's braking burn
    is commanded at its instant, lit, cut and the modules parted each so long `after` the one before (the record's
    instants again, to the bit), and the timer that shut the engine down (Vostok 1's) is an event the command `arm`s.
    orbital.ts `coastEvents` finds them by what they do: the coast's burn, its lighting and cut, the command the lighting
    follows, what that command arms, and the parting of the burn's body. The command is set off by its `time`, not by a
    `command` trigger: every trigger of an event must hold, so one that only a hand's command could set off would never be
    set off by the record's pilot. A hand's burn (staged.ts `byHand`) is that chain re-timed instead: commanded and lit at
    its instant, cut by its integrator, the modules parting after, and no timer started.
  - `PlanCheck.when` says where a figure is read: an instant, the most while some bodies are aboard, the most while an
    engine burns.
  - `problems(plan)` says in words what is wrong with a plan. A plan is checked before it is flown.
  - A flight of a kind already flown is a new plan, not new code. tests/plan.test.mjs holds a Gemini shape in it, with
    figures of 1.
- **Each flight that flies carries its plan** (`Flight.plan`), written by its launch vehicle's module from the flight's own
  figures.
  - A Mercury-Redstone's: mercury-redstone.ts `plan(day, checks, body, hw)`, from the flight's `Day` (flight.ts `DAY`) and
    the stack's own figures (`HARDWARE`: the A-7's exit area, the tilt programme, the drag curves, the retrorockets, the
    parachutes). Where the plan wants a figure the record does not give, it is `derived` and says how: the booster's and
    tower's masses at the pad, the retropack's, a vacuum specific impulse. tests/plan.test.mjs holds the plan to the day's
    and the hardware's figures; tests/sim.test.mjs weighs each undocumented one by writing the plan again from a changed copy.
  - A Vostok's: missions/ussr/vostok/vehicles/vostok-plan.ts `vostokPlan`, from its record (the flight's orbital.ts: a `VostokRecord`, vostok-record.ts, which only the Vostok modules read), which says
    the braking burn's command, timer and chain as events of their own; tests/plan.test.mjs holds it to the record's
    figures and instants, and tests that fly a changed record fly `vostokPlan` of it.
  - A Mercury-Atlas's: missions/usa/mercury/vehicles/mercury-atlas-plan.ts `mercuryAtlasPlan`, from its record (the flight's
    orbital.ts: a `MercuryAtlasRecord`). The Atlas is a stage and a half: one tank, on the tank section, drawn on by the
    booster engines on the booster section and by the sustainer (its verniers flown as part of it), the booster section let
    go by a joint of its own after its engines are cut. Its coast's burn is the retropack's three solids as one engine of
    three, spent and not cut (`coastOf`: a solid nothing cuts burns for its `burn`, here the first's lighting to the third's
    burning out), pushing against the motion pitched down by the record's attitude (`Hold.aim.below`) and, where the record
    has it flown off its line, turned in the level by its yaw first (`Hold.aim.yaw`, to the left of the motion: Aurora 7's
    27°, orbital.ts `aimOf`; tests/orbital.test.mjs); the pack goes so
    long after retrofire (the coast's parting), and what comes down is let loose at its drogue's height (`Down.ejection`
    is then a parachute's own event). tests/plan.test.mjs holds it to the record.
  - `EngineDef.flown` is the impulse the record's coast flies.
  - A Gemini-Titan's: missions/usa/gemini/vehicles/gemini-titan-plan.ts `geminiTitanPlan`, from its record (the flight's
    orbital.ts: a `GeminiTitanRecord`). The Titan is two stages on their own loads, the first's two chambers one engine (a
    plan's engine count is its body's units); the second is lit at the first's cutoff with the stages joined (`JointDef.hot`)
    and the first let go a moment after. In orbit the crew's burns are **manoeuvres** (orbital.ts `movesOf`): each automatic
    lighting on the clock of an engine that is neither a stage (no tank) nor the coast's burn (no `flown`), to its next cut,
    pushing its lighting's own impulse (`Action.flown`, the velocity indicator's) evenly over that time, or its chambers'
    thrust over the ship's mass, along the aim held as it lit (`Hold.aim`, `velocity` or the orbit's `normal`, fixed as it
    lights), against it for a pair that pushes toward the tail (`EngineDef.astern`). flyOrbit and the predicted path
    (fliers.ts `spacecraft`) fly them alike, and a check of the orbit at an instant reads what each left. The entry body
    lifts (`AeroDef.lift`, lift over drag against Mach number) while a bank is held (`Hold.bank`, from the event that sets
    it): orbital.ts `liftOf`, square to the motion through the air in the plane of the plumb line, turned about the motion by
    the bank. Mercury's and the Vostoks' plans have neither, and fly what they flew before to the last bit. Given up
    (staged.ts `givenUp`, the hands free) the manoeuvres are too; a hand fires the record's next one along the long axis
    (`movedTo`, its impulse and length the record's; on the deck, Space before the coast's burn).
  - A stage's body, engine, tank and joint are `stage:<i>` in a Vostok's plan; a descent parachute is `<body>/<name>`.
  - `BodyDef` and `TankDef` figures are one unit's; a body of `count` units is `count` times them, as the batch flies it (a dropped stage is `count * (mass - burned)`).
  - Several stages can draw on one tank (staged.ts `Stage.shares`, the tank on its own body, `holder`): it runs dry for all of
    them at once on their summed flows (`schedule`, stagedlive.ts), and a body let go takes what it weighs less what has been
    drawn from any tank on it (`drawnFrom`: an Atlas's booster section leaves empty). A stage on a tank of its own is flown by
    the same arithmetic as before, to the bit.
  - Every simulator, deck and view flies `flight.plan`; a plan changed by a hand is an edit of it.
- **One machine** (`sim/craft.ts`). `CraftState` holds what is lit and out, what is let go and gone, which parachute is out,
  which events have happened and which are armed, and the attitude held. It is never changed in place.
  - `act` does one action if the hardware lets it, and otherwise returns a `Refusal` for the simulator to word: an engine
    starts only `starts.count` times, some only on the ground; a solid cannot be cut or throttled; what is gone cannot act.
  - `due` gives the events whose triggers all hold; `fire` sets one off.
  - `part` parts a joint once the simulator's physics lets it go. Whether what is let go is still pressed on
    (staging.ts `pressed`) is physics, not the machine's. `heldBy` is a joint held on by another.
  - The live staged vehicle's `stages` and `drops` are the machine's state as its forces read them. The live ballistic
    vehicle's `ignited`, `cutoff`, `starts`, `throttle` and `retroAt` are the same, and what has left it is asked of the
    machine (`hasLeft(craft, body)`, the body found by what it is): its engine is lit, throttled
    and cut on the machine (`act`; `burnOut` where it is spent or leaves with the booster), its motors lit by the plan's
    events, each after the first by its own timer (`chainedAt`) at its instant, whatever the switches say.
  - A hand's commands are the plan's actions and events (`Controls.do`, `Controls.events`; `StagedControls.events`).
  - What a run's sample says it is doing is the machine's state, never a phase (fly.ts `Doing`): on its launch vehicle
    (`riding`) and an engine of it burning (`powered`), pulled clear on the escape rocket (`escaping`), the 0.05 g felt
    (`entered`), the parachute out by its plan id (`out`), down (`landed`); `free` is the spacecraft alone with nothing out.
    The predictor starts from the same fields (predict.ts `Start`), and the decks word them, a parachute by its plan label.
- **A record's run is its plan flown by the record's pilot.**
  - `fly` flies the plan: the craft on the machine, every automatic event set off as it comes due (by the clock, or at a
    height coming down). Each instant one is due at, and each solid motor's burning out, ends a step.
    - What burns is what is lit and still aboard, along the attitude held: the tilt programme (`programmeAxis`), or the
      retro attitude.
    - The air meets the stack's drag while the body it stood on is aboard, and the last body's `aero` with its parachutes
      after.
    - The mass is the record's at a parting that gives one (`after`); otherwise it is less what leaves.
  - The orbital batch reads what happens when from the plan's events: staged.ts `sequenceOf` and orbital.ts `coastOf`.
    - `sequenceOf`: each stage lit, cut (at an instant, on a speed, on its apparent velocity) and let go by the joint that
      first lets its body go; the drops; the record's instants by id.
    - `coastOf`: the burn the coast flies, the parting of the body it is on (each at its `clockAt`, chained or not), and
      the height what comes down is let loose at.
    - Its stack and coast are flown from the plan: staged.ts `stagesOf` (each stage an engine that draws on a tank, its body and tank, one unit's figures) and `guidanceOf` (the attitude held by a stated law); orbital.ts `shipOf` (the published orbit, the coast's burn, the body that comes down); descent.ts `downOf` (the bodies with their own air, what sets each loose, their parachutes and the events that put them out, the event that sets the pilot loose). The batch (`ascend`, `steer`, `flyWhole`, `flyOn`, `flyOrbit`, `decay`, `recordSamples`, `held`) takes the plan; its drops are the bodies with no engine and no air of their own, each let go by a joint of its own (`sequenceOf(plan).drops`). The live staged vehicle (`stagedVehicle(plan, …)`) and its fliers (`guided`, `stack`, `apparentBy`) take it too: each stage's engine, body and joint by the ids the plan gives them, its hot staging from the joint below's `hot`, the structure's limits from `Craft.limits`, the steering from the thruster set with an `authority`; a stage with no cut of its own is shut down as it is let go. The ballistic side takes the plan too: `fly`, `flownOnce`, `axisOf`, `dragArea`, `thrustIn`, the live vehicle (`vehicle(plan, …)`), its autopilot and `verdict`, the `ballistic` flier and `predict`, and what is shed (`Sheds`, `shedder`, `recordRelease`: the stack's drag area, the winds and `Craft.sheds`). Each finds its hardware by what it is, once per plan (fly.ts `ballisticOf`): the booster is the first body and its engine the lever's; the separation the joint that lets the booster go; the abort the event a hand's command sets off and the escape rocket the motor it lights; the retrorockets every other solid with a burn, begun by the event that lights the first and chained by their `after` triggers; the tower and pack the bodies of those motors and the joints that let them go; the main parachute the one with `instead`, each parachute's height its deploying event's; masses at the partings their joints' `after`. A live sample's `burning` names each engine by its plan id. Only vostok-plan.ts and the consumers outside src/sim read an orbital record.
  - No code that flies, shows or sounds a flight names a part, a stage or an event id of its data: tests/names.test.mjs
    holds every id of every flight's plan and scene (bodies, joints, engines, tanks, thrusters, parachutes, attitudes,
    events, the record's instants, what drops and fires go by) to never being a literal in src/sim, src/deck, src/sound or
    viewer/{ascent,path,effects,cabin}.ts. A data id is the hardware's or the event's own name (`adapter-clamp`,
    `main-chute`, `retrofire`, `tdu-1`), never a word the code uses for its own ends; the code finds each by what it is.
- **One run for every consumer** (`sim/run.ts` `Run`). What the scene, the sound, the cabin, the effects and the Flown
  panel show of a flight is a `Run`: the record's (`recordOf(flight)`, made once a flight, whichever kind it is: a
  ballistic plan as fly.ts flies it, an orbital one as staged.ts flies it with its samples' own attitude), or a deck's live
  one as it grows. A consumer asks it, not the kind of flight.
  - Every run says the same things: its `frame`; its sample at an instant (`at`); what happened on it (`events`: the plan's
    events by id, each with the record's own event at it, and the record's marks); when each body left (`bodies`, by the
    plan's id); its burns (`fires`, one for each of `flies.fires`); what it gave for each of the record's checks (`results`;
    a run flown by hand gives `held`); its line flown (`track`). `runOf` makes one from its fields.
  - A deck's run grows from its vehicle's machine (`grown`): an event fired, or one the machine shows done (every deed it
    reads there done: the live ballistic vehicle's sequence works the actions itself), at the last of its deeds; never one
    only a command sets off unless it was. tests/flightrun.test.mjs holds the autopilot's to the record's.
  - Nothing outside src/sim and the deck registry (src/deck/decks.ts, which picks a flight's deck by `plan.kind`) asks what
    kind of flight it has: tests/kinds.test.mjs holds that. What a consumer needs of a plan that differs by kind src/sim
    answers for any plan: run.ts `liftoffOf` (the engines lit on the ground, as one), `brakingOf` (the spacecraft's braking
    burn on a run), `partingOf` (what a joint's parting lets go, for a drop's sound), `signalsOf` (when a cabin's signals
    came on), `chuteOf` (which of a run's two parachutes one is), `bearingOf` (the bearing flown); plan.ts `flownByHand`
    (whether a plan can be flown on its deck). A path whose deck predicts its own (`PathSource.predict`) is drawn from it.
- **One body of a descent is one object** (`sim/descent.ts` `Descent`). It holds a body's mass, drag, parachutes and
  their tearing, and its motors, and holds no position: `push`, `events`, `wear`, `heights`, `snapshot`/`restore`.
  - A motor is a solid engine of the plan on the body, lit by an event set off by height once a parachute of the body is
    out (`DownMotor`: a soft-landing rocket fired by its probe); it pushes against the motion through the air while it
    burns, as it was at the step's start. flyDown cuts a step to come down through its height and to end at its burnout;
    the path ahead has both as its instants.
  - A crew that lands in the ship (`DescentCrew.alone` left out) leaves at no height: the event the coast hands over at is
    then the descent's own first (the parachute container's cover), and the verdict holds the landing aboard alone.
  - `flyDown` flies one per body. `DescentFlown.states` keeps each body's snapshot at every change.
  - fliers.ts `descending` flies the same object for the path ahead, handing over to the followed body as it is let loose,
    and begins part-way down from the run's `states`. `spacecraft` with `descend` goes on into it; without it the
    spacecraft stops at the ejection height.
  - tests/descending.test.mjs holds the predicted landings to flyDown's.
- **One frame** (`world/earthframe.ts`). `frameOf(flight)` is the inertial frame of date: the Sun's, the Moon's and the
  published elements'. Every simulator, predictor, deck and view of a run shares it.
  - `toFixed`/`toInertial`/`place`/`up`/`upOver` take an instant. `LIFTOFF` is the liftoff-fixed frame, kept for tests:
    tests/frame.test.mjs holds the two within a millimetre.
  - Level is the ellipsoid's (`up`), never the line to the centre.
- **One body of flight physics.** One function each, which every flier calls:
  - the air at a point: air.ts `airAt` (place, height, the plan's air, the motion through it with the day's wind) in the plan's
    `Sky` (`skyOf`): the day's column over the pad (`FlightPlan.aloft`, the flight's `DayWeather.aloft`) within it, the 1976
    standard scaled to meet it below its ground and above its top (eased to the standard's own by `COLUMN_EASED`, 70 km), the
    record's sounding where it has one, else the column's wind; the standard and the sounding (or calm) for a plan with no
    column, and for everything with `DAY_AIR.on` false. A ballistic flight flies it to its splash; a flight into orbit only
    in its ascent (its coast and descent come down hours later, far from the pad, in the standard air and calm). An ascent's
    steering law turns along the motion over the ground, the programme made for calm air, so the wind sets its angle of attack;
  - drag: air.ts `airDrag`, -1/2 rho |w| w CdA;
  - thrust in air: thrust.ts `nozzleThrust`, n (throttle Fvac - Ae p). A sea-level figure's vacuum one is `vacuumOf`,
    labelled derived;
  - the fixed step: core/rk4.ts `rk4` (a point) and `rk4Body` (a rigid body), and `acceleration`, gravity plus the push.
    The error-controlled step, Dormand and Prince's 5(4) pair, is core/dp45.ts `dp45`, the predictor's and a coast on
    rails', each keeping its own rule for a step's error and size; it takes the same `acceleration`;
  - gravity as terms: core/gravity.ts. The Earth with J2 is the default; a third body is a point mass; the central body
    can be switched; the Moon and Sun are DE440's (derived) when it is loaded before the terms are made
    (world/ephemeris.ts `loadEphemeris`), Meeus's (estimated) otherwise (no flight's plan names a third body yet, so
    nothing waits for DE440);
  - a coast faster than an hour a second: rails.ts. `coast(state, t0, t1, gravity, push)` flies it by an adaptive
    Dormand-Prince 5(4) pair ending exactly on `t1`, the same in one span or in a fast clock's frames; tests/rails.test.mjs
    holds Vostok 1's coast to flyOrbit's within 10 cm and 0.1 mm/s over 3,400 s, in under a hundred steps. `onRails` (nothing
    burning, above `RAILS_FLOOR`, 120 km, nothing asked of the hands) lets the clock go to `COAST_RATES`, and `due` holds it
    at the next of the run's events and the record's instants (orbitdeck.ts `rails`). The orbital deck's coast after the
    parting is a run flown ahead (flyOrbit), so on rails it is played, not flown frame by frame;
  - G0, J2 and P0: world/bodies.ts;
  - the tear rule: loads.ts `tearOf`; the 0.05 g mark: `ENTRY_G`; a parachute's filling: `chuteArea`;
  - the apparent-velocity integrator: apparent.ts; when a load is spent: `spentAt`; one separation, along the joint's
    axis: forces.ts `keptShare`;
  - the predictor's horizons: predict.ts `Horizons`. Its work is resumable in slices (`Predictor.run(budget)`, `Flier.prepare`).
  - Different physics, and kept so: forces.ts `airForces` on a rigid body against a point's drag; flyDown's several canopies
    against a capsule's one; shed.ts `apart`; leaving the pad (vehicle.ts balances every force, stagedlive.ts thrust
    against weight).
- **A refactor moves no figure unexplained.** `pnpm figures` (tools/figures.mjs) flies every run the tests fly and holds 740
  frame-free figures (heights, speeds, times, places, elements), as doubles, against `tests/fixtures/figures.json`.
  - Exact doubles differ between machines. So the capture is made and compared on hal9000 only, and it is not part of
    `pnpm check`. (On a Mac, compare a tree against a capture of its own base: `--write --against <file>`, then `--against <file>`.)
  - "Bit for bit" means all 740 equal to the last bit.
  - A commit that moves any figure says why, proves the cause where it can (e.g. the move gone with the one change undone),
    quotes the `pnpm figures` diff in its body, blesses the capture again on hal9000 (`--write`) in the same commit, and
    restates any README or mission.md figure whose rounding shows the move.
- **A miss is recorded, not hidden.** One table, `src/sim/misses.ts` `MISSES`, by flight (or fixture), run and check. One
  rule holds every run to it: tests/misses.mjs `holdChecks`.
  - A check outside its tolerance must be in the table, with how far out it is (`by`, or `absolute`; give or take
    `slack`) and why.
  - The test fails on a miss nobody recorded, on one that has moved past its slack, on one that has come within
    tolerance, and on one that names no check.
  - Tolerances are set before a run; nothing is fitted.

## Every flight

- **The inputs that are not documented are listed and weighed.** The last test names every
  `assumed`, `derived` and `estimated` input and prints how far a 5 % change in each moves the results; a
  new input that is not documented must be added there. An `assumed` input (the type's or a sister vehicle's
  documented figure, taken for this unit) is flown as a documented one would be, but is weighed, since the unit's own
  may differ. Keep the label honest: the simulator may come to refuse `estimated` inputs, never `assumed` ones.
- **Space-fixed is not Earth-fixed.** Speeds and climb angles come in both (`speed`,
  `groundSpeed`); the reports quote both, and the larger, space-fixed one includes the pad's own
  eastward motion. Say which in any label.
- **Level is the ellipsoid's.** Climb angles, the retro attitude and a landing's vertical speed
  are measured from the geodetic normal (the flight frame's `up`, world/earthframe.ts), not from the line to the Earth's
  centre, which leans a sixth of a degree from it at the Cape.
- **The flight is shown as flown.** `Flight.flies` names the model the run carries off the
  pad and the nodes it sheds on the way (tower, booster, retropack) at their times;
  `viewer/ascent.ts` puts that model where the run has it at the clock's instant (a cubic between
  the run's samples, in the Earth's turning axes, in the site's frame) and points it as the run
  does (the gyros' tilt going up, heat shield first after the turnaround). What it sheds is
  flown (`sim/shed.ts`, `Ascent.shed`, `FlightShow.fall` in stage/flightshow.ts): each thing in `Craft.sheds` is a
  rigid body of its own from the instant it leaves, and the full level's own node is carried by it,
  turned about its own centre of mass, until the clock goes back. It is drawn while within 40 km
  of the eye or the vehicle and flown on to the sea regardless. Before liftoff it stands on
  its pad, whole: the inventory, which the idle show tours; once the record's run has ended it is not in the scene at all
  (ascent.ts `gone`: the booster in the sea, the spacecraft recovered; not back on its pad hours later), and the idle
  show passes over its shots (demo.ts `absent`). A flight flown by hand stays where it came down (`Run.kept`). While an engine burns its fire stands
  under its nozzles (a ballistic flight's one engine under the node `flies.engine` names; every other in `flies.fires`, each by
  the plan's engine it is, `on`, and burning while the run has that engine burn; a cluster's main and steering chambers found in its bells' geometry, viewer/fires.ts), carried by the part that holds
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
  with it or follow it, and the Sun's shadow map goes with it under them (`Shadows.shadeCraft`, stage/shadows.ts). The sky darkens with the
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
  light, so the two agree where they meet. Round the site the coast is finer: a place's
  `region` (types.ts: RegionDef) names the country its flights see, and tools/globe-region.mjs
  bakes it from OpenStreetMap's coastline and larger lakes onto two gnomonic planes
  (world/region.ts): `near`, 160 km square at 39 m a texel, and `wide`, the region (for the
  Cape, Flagler Beach to Miami and out past Abaco to the landing) at 155 m. The globe
  reads them where they cover, each faded in over the map under it by mixing distances, not
  colours, so a shore that two maps put apart moves across the fade and is never doubled. The
  region is dated (`asOf`): each work in `later` (a causeway, a canal) built after it is undone
  along its line, so the Cape's lagoons are 1961's. Where the ground drawn round the pad hands
  over, its shore lines (missions/usa/places/cape-canaveral/scenery.ts) follow the same coastline, so the two agree to tens of
  metres there; change one, change the other, and rebake (`pnpm globe:region`).
- **The air is seen and felt.** `sim/heating.ts` works the heat flux at the stagnation point from a
  sample's height and airspeed and carries each surface in `Craft.heating` (a `Measure` for
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

## Ballistic flights

- **Getting it right is the work.** What each flight misses, by how much and why, is `src/sim/misses.ts`; the
  flight's README ("The flight as flown") states the numbers. An input made better moves them, and the list with it.
- **A launch vehicle's flight data is said once** (`missions/<nation>/<programme>/vehicles/<stack>.ts`: the Mercury-Redstone's
  is mercury-redstone.ts, `plan(day, checks)`): the hardware's figures with their confidence (`HARDWARE`, the stack's rigid body), and each flight its own day
  (`Day`: winds, azimuth, the booster's measured thrust and weights, the spacecraft's weights, its events). A new flight of
  the stack is data; tests/ballistic.mjs finds every flight with a ballistic plan (and its `Day`, `dayOf`), and tests/sim.test.mjs, vehicle, predict,
  turnaround, ascent, verdict, abort, shed, heating, chute and sound hold each as they hold Freedom 7 (its misses in `MISSES`,
  its undocumented inputs listed; Freedom 7's own record figures are held on Freedom 7 alone). Every flight into orbit is
  held likewise by orbital, staged, shed (the strap-ons), chute (the descent's parachutes) and sound.
- **The live simulator is the same flight, steered.** `vehicle(plan, site, seaLevel)`
  (`sim/vehicle.ts`) is stepped by the frame (`step(state, controls, dt)`: whole ticks of 0.01 s,
  the remainder kept, so a flight is the same at any frame rate) and takes `Controls`: the engine's
  lever, pitch, yaw and roll from -1 to 1, and the plan's actions and events as commands (`do`,
  `events`: each event its actions, but for the abort and the motors' sequence, which it does whole;
  it finds its tower, booster, retropack and parachutes in the plan by what they are). To fly.ts's forces it adds the body's turning: thrust turned by the
  vanes, the air's push on nose and fins (so it weathercocks, lifts and damps), the spacecraft's
  jets, a parachute pulling at its attachment, with mass, centre of mass and inertia following the
  propellant down the tanks (`sim/rigid.ts`). What it needs beyond fly.ts's inputs is
  `Craft.rigid`, each figure with its confidence; most are `estimated`, and
  `tests/vehicle.test.mjs` lists them. The body's +X is the nose; on the pad +Z points against
  the azimuth, so positive pitch tips it downrange. `sim/autopilot.ts` is not physics: it returns
  the same `Controls` a hand does (the tilt programme held by `steer`, the one control law; the
  plan's events that the record's clock sets off, each as it comes due on the machine, craft.ts `due`;
  the engine by its lever, lit at the launch and brought to nothing at the record's cutoff) and any
  axis of it can be switched off or overridden, a hand's events added to its own (`blend`), or its
  programme leaned by a pilot's `trim`. It is held
  to fly.ts, not fitted to it: with the air's sideways push off the two agree to 0.05 per cent, and
  with it on the live flight is 0.5 per cent higher at apogee by its lift, which the test states.
  A new force goes in `forces`; a new event goes in the plan, and what the vehicle does with a new kind of action in `command`.
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
  above the air). The cockpit steps them beside the vehicle
  (`Sheds.follow`); the record's are flown from fly.ts's run, lazily, as far as the clock asks. A
  new thing to shed is a `ShedBody` in the flight's data and an `on` in `flies.drops`, the plan's id of the joint that
  lets it go (or of the parachute that pulls it off as it comes out): generic code names no part. Every drag area in
  them today is `estimated`, and says so. Several bodies let go by one joint each have their own `on`, the joint's and a
  name after a slash (`stage:0/B`: the strap-on B, let go by the strap-ons' joint). A body that stood beside the stack and not on its axis says how it left (`ShedBody.apart`, shed.ts `apart`):
  a strap-on starts on its own axis, its +Z away from the stack, with the turn and the speed its swing about the ball
  at its tip gave it (the stage's tail-off, or what it burned at if it was let go burning, through a few degrees); a
  motor with a `station` turns it (the strap-on's oxidizer vent, back and out at 45 degrees from under its cone). So the
  four strap-ons fall back as a cross, each tumbling under the air on its own track, and the core flies exactly as it
  did: what leaves takes only its own mass, as before.
- **The air moves.** `FlightPlan.winds` (types.ts: `Winds`) is the day's sounding over the pad,
  each level's speed and bearing a `Measure`; `blowOf` (air.ts) turns it into the air's motion
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
  stays well inside the limit; hands off, the stack as estimated diverges and breaks up, sooner in
  the day's wind than in still air, so it has to be flown.
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
  descent. Its samples say `escaping` (fly.ts `Doing`); `Tally.abort` has the greatest load. `escape.record` and
  `tests/fixtures/pad-abort` (a trial flown from its own weights off its own leaning launcher:
  `VehicleOptions.elevation`) are what `tests/abort.test.mjs` holds it to, its misses under `abort:<test>`.
- **Manual means manual.** `Controls.automatic: false` switches off the spacecraft's own sequence
  (parachutes by height, the tower after an abort); the cockpit sends it with the sequencer off,
  so then nothing happens that is not commanded, and what follows is the physics: no parachute,
  82 m/s into the sea. `sim/verdict.ts` says how it ended and holds it to `capsule.limits`
  (a landing speed and a load, with their confidence). Nothing rescues the pilot; nothing is scored.
- **What a capsule had that another did not is data, not deck code.** A rate command mode (`rcs.rate`: the deck's Rate
  command switch, autopilot.ts `rateCommand`: the stick asks for a rate and the manual chambers fire full on an axis while
  its rate is more than the deadband from it); an explosive hatch (`flies.hatch`: `Command` 'hatch', Space once down, a
  cabin control's `does`: it leaves as a body of its own, and afloat its opening lets the sea in: below, "In the sea";
  blown in flight the flight flies on as if the cabin were closed and the debrief says what it meant).
- **Turned round, the spacecraft is rolled periscope side down.** `Craft.rigid.capsule.earthward` names the side the
  automatic control keeps toward the Earth from the turnaround until the air is felt (degrees about the long axis from
  the body's +Z); `autopilot` rolls to it with the same law as the other axes. Freedom 7's is 180: the side that lay
  down range on the pad, since the launcher was turned until the vehicle's pitch plane lay on the azimuth and the
  capsule rode feet down range (derived: places/cape-canaveral/lc-5.md, "Which way round the vehicle stood"; tests/launcher.test.mjs
  holds the vehicle's turn in the scene, the pad's and this to one another). tests/turnaround.test.mjs holds it to
  three degrees going up and through the top of the flight, and to ten through the turnaround. With a side named
  the control makes one turn to the whole attitude (`turnBoth`: the long axis to where it is wanted and the keel
  down together), which end for end is a half turn about the plumb line: a yaw, as the record's turnaround was
  ("yawed 180 degrees"), the periscope toward the Earth throughout. A flight
  that names no side still turns the long axis the short way and keeps the roll it had. The scene turns the record's
  own flight round the same way (`viewer/ascent.ts` `place`, `keel`): to the attitude with that side underneath, which
  from how it rode the booster is the yaw. tests/ascent.test.mjs holds both runs to it.

## In the sea

- **A spacecraft down in the sea is a body afloat** (`sim/afloat.ts` `floatOn`, from `Flight.flies.afloat`: types.ts
  `AfloatDef`), floated from its run's landing by `run.ts` `afterwards` (the record's run in `recordOf`, a deck's at its
  landing and again when its hatch is blown) into `Run.afloat`. Its outside a solid of revolution (`Profile`), held up by
  the sea it puts aside and pulled down by its weight and every drop of water in its spaces (`SpaceDef`: each a solid of
  revolution's share, with its openings, `OpeningDef`, each shut until an instant the caller gives by its id or open from
  the first, each on the axis or an arc of the hull, `arc`). It rises and falls, and where it says how (`AfloatDef.heel`,
  `HeelDef`: the centre of what stays aboard, its gyration, its rolling's damping) it heels in the vertical plane of its
  +X (the hatch's; `facing`, its bearing), turning about that centre: the sea it puts aside pushes up through that
  volume's centre, what is aboard (`leaves[].at`, a pilot going to the sill over his last seconds, `through`) and the
  water in it press down at theirs, each worked for the heel by slicing the solid across its axis into discs cut by the
  level plane (`Heeled`: a row a degree, worked as first needed). Water with a surface stands level at once and runs to the
  low side, so a part-flooded body loses its stiffness and lies over; a full space's water turns with it. The sea's slope
  in that plane tips the level all its water stands to (`slant`, sim/sea.ts `tiltAt`). Water goes through an opening as
  through a sharp orifice, band by band and column by column across its arc, on the difference of the sea's pressure and
  the space's; a space's air goes out through any opening not wholly under both the sea and its water, or reaching its top,
  and is trapped and squeezed otherwise (the water then stands where the air presses as the sea does). Its rise and fall and
  its rolling are damped by a share of critical (`heave`, `heel.damping`, estimated) and its motion through the water by
  its drag. A line from above (`HoistDef`: the record's helicopter) pulls at its top once taut, up at its rate toward
  lifting it clear, never more than its capacity, until it is let go. What leaves it (the crew, the hatch) is a mass at an
  instant. It ends `sight` m under, out of sight. RK4 at 0.05 s, every step ending on the instants given. The water in a
  space that can be seen into (`afloat.seen`: the cabin) is drawn where the run has it (viewer/flooding.ts).
- **The sea it floats on is the day's** (`sim/sea.ts`, from `DayWeather.sea`: each train of waves a sine of its
  significant height over 2 root 2, its period and the bearing it comes from, on deep water), one function of the instant
  and the place for the physics and the drawing.
- **A part thrown off with no plan of its own is a loose body** (`sim/loose.ts`, `LooseDef`: the hatch): thrown along its
  outward normal by its impulse over its mass, flown as a point under gravity and the day's air to the sea, and lying
  there fixed to the Earth (`Run.loose`, by drop). Blown afloat it leaves from where the hatch is on the capsule as it
  floats (`afterwards`); blown in flight from the live sample, square to the long axis (`blownAloft`).
- **What came to it is flown on the record's clock** (`Flight.recovery`, types `RecoveryCraft`; viewer/recovery.ts):
  the helicopter's track about where the record's run came down (each point an instant, metres east and north, a height
  and a heading; the record's order of events, its places between them estimated), its rotors at their rates, and its
  line from its hook to the capsule's top, straight while the run's line pulls (`Ascent.pull`), holding the helicopter its
  length over the capsule, and sagging while slack. Only on the record's run: a run flown by hand comes down where
  nobody was waiting. It is drawn, not simulated: the hoist's pull is `afloat.hoist`'s. So is whoever was in the sea
  (`Flight.swimmer`, viewer/swimmer.ts: a figure of the flight's on a track of the record's events, his shoulders over the
  day's drawn surface, posed in the water and on the hoist by his joints) and a craft's rescue hoist that lifts him
  (`RecoveryCraft.hoist`: its boom swung out, its cable to the sea and then to his collar). The figure in the cabin is
  not drawn once the crew is out (`swimmer.seat`, from the run afloat's own instant).
- **Held to the record**: tests/afloat.test.mjs holds the pieces to their arithmetic (Archimedes, a terminal speed, an
  opening filling to the sea's level, a cylinder cut by a tipped plane, a drum lying over to where a weight off its axis is
  balanced, the sea's four sigma, a throw) and Liberty Bell 7's run afloat to `afloat.checks`
  under `MISSES[...].afloat`, and to what the record says in words: the helicopter's 4,000 lbf never had it out, and let
  go it went out of sight within a minute and a half.

## Into orbit

- **An orbital flight has its own record and its own coast.** The flight's orbital.ts (a Vostok's `VostokRecord`,
  missions/ussr/vostok/vehicles/vostok-record.ts) is what its plan is written from: stages and events as the record has them, the orbit as published, the braking burn, the entry body,
  and `checks` with tolerances set first. `flyOrbit` flies from the published orbit (read as mean elements with the kind of period the record says, `orbit.kind`, nodal where none is said: Friendship 7's and Aurora 7's nodal, Sigma 7's and Faith 7's Kepler, Gemini 3's anomalistic, each held to its own figures or a sister's by tests/periods.test.mjs: world.md, "NASA's published orbits"; orbital.ts `publishedOf`) round to the burn (aimed as the record
  says: for Vostok, from the Sun, computed) and a sphere with no lift down to the height the pilot left at, in the flight's
  frame (of date, as every run's) on `world/orbit.ts`'s gravity. `tests/orbital.test.mjs` keeps its misses (src/sim/misses.ts) by the same rule as
  below and prints what each undocumented input is worth. The flight's `mission.md` is the plan. A check can read the orbit at a
  stated instant (vostok-record.ts `OrbitCheck.at`, the plan's `when: { at, reading: 'orbit' }`; ids `<name>.perigee`, `.apogee`,
  `.period`), as a later published orbit gives it: the coast's state then read as mean elements (`meanOf`), the heights over
  the ball the published orbit's are over (orbital.ts `heightsBall`: the WGS 84 ellipsoid under the apsis for a Soviet record, the oblate earth as flown apsides for Gemini 3's, world.md) and the nodal period, off a state stepped to the instant from its step's start, so
  the run is flown as it is without it.
- **The ascent to orbit is flown from the pad** (`sim/staged.ts`), from the plan's stages and steering law: stages
  burning together and in turn (each `count` alike; its throttle of its vacuum thrust less exit area times the air's pressure, the exit area
  derived from the two published thrusts unless given; flow from the vacuum figures; a `throttle` curve where one is
  known; stopped at its cutoff or when its `usable` load is gone), each dropped at its `separation` as what it weighed
  fuelled less what it burned, other drops (a fairing) by mass, drag on `ascent.drag`'s areas and curves. Attitude is a
  **stated law** (the turn's tilt measured between the plumb line in the launch plane and the level square to it, so its
  axis is a unit vector: tests/staged.test.mjs), not a stored programme, because none has been found: `Guidance` (orbital.ts) says it, and `steer`
  solves its three unknowns (launch plane, pitch-over, the linear tangent's rate) for the design conditions at the last
  cutoff (height, climb, inclination), so those three are targets and not checks. `flyWhole` hands the spacecraft at
  separation to `flyOrbit` (`from`), and `flyDown` (orbital.ts) brings each of the plan's descent bodies (a module, a
  pilot) down from the ejection height on its own parachutes, each body one `Descent` (sim/descent.ts: its mass, its
  drag, what it puts out and when, the air's tearing) which the path ahead flies too (fliers.ts `descending`;
  tests/descending.test.mjs holds the predicted landings to flyDown's). `tests/staged.test.mjs` holds the ascent's, the coast's and
  the descent's checks against their misses (src/sim/misses.ts), lists every input that is not documented and prints what each moves, the
  law solved afresh each time. A new orbital flight flies on this with its own data: nothing in staged.ts names a stage. What happens when is read from the plan's events ("The core").
  A stage with `velocity` is cut as its integrator cut it, when its speed (or with `apparent`, the acceleration it has
  sensed since its ignition) reaches the setting (found within the step by the secant, so the instant is smooth in the
  inputs), and its recorded `cutoff` becomes a check (Vostok 1's Block E, on the flight task's apparent velocity). How
  the ascent compares with the record, and why the documents' own staging times for the core cannot be flown on the
  blocks' secondary masses, is in the flight's mission.md ("What the ascent gives", "The 2011 documents").
- **The descent can be given by hand** (orbital.ts `DescentHands`, staged.ts `flyOn`). Its events are the record's data:
  the modules' parting (`entry.separation`), the ejection (`ejection.altitude`), and each body's parachutes; a body other
  than the first (the entry body, which carries the pilot until the ejection and the instrument module until the modules
  part) leaves it at the first of its `with` events. The automatic sequence (the timer, the barometric switches) acts only
  while the sequencer is on (`switched`); what a hand gives (`given`, at the clock's instant) acts whatever it is. flyOrbit
  hands over to flyDown at a hand's first event if that comes before the ejection height, and the modules' parting ends a
  braking burn (the engine is on the instrument module). The entry body flies the coast's drag above the ejection height
  and its own figure below. **The coast's drag** (orbital.ts `orbitDrag`, `ORBIT_DRAG`): in the free-molecule flow of the
  orbit the joined ship's figure (`Craft.rarefied`: Vostok's 2.2, assumed, on the 7.17 m² a ship turning every way shows,
  estimated: vostok-3ka.ts `SHIP_RAREFIED`) until the modules part and the entry body's (`AeroDef.rarefied`) after; in the
  continuum the entry body's curve on its disc, joined or not (no figure for the joined ship's there, nor for the heat that
  burned its cables through on the day); between, bridged by the Knudsen number on the standard's mean free path
  (atmosphere.ts `meanFreePath`, `rarefaction`: Wilmoth, Mitcheltree and Moss 1999, continuum below Kn 0.001,
  free-molecular above 10). In orbit the air is the standard's by the day's Sun (`solarAt`, `SOLAR_AIR`: world/thermosphere.ts,
  Jacchia 1971 on the days flown's 10.7 cm flux and Kp, at the place and instant), in the coast, the predicted path, `decay`
  and the descent's bodies. Every parachute is held
  to the tear rule while out (`strength`, `pull`, `descent.torn`), and fills over its `fills`, so one let out too low does
  not fill; `downVerdict` (sim/verdict.ts) holds the pilot to `descent.crew` (a landing aboard, a landing under his canopy,
  the air's blast and the fastest he can be out in it, each estimated: the heat of the air on a man is not modelled), and
  a flight that stays up to `decay` (the orbit's life in the standard air on the coast's own drag, `orbitDrag`, against
  `supplies.days`). What the crew came down in and on is the flight's data (`Craft.lands`: `on`, the land or the sea of the
  record's landing, and `ship`, 'the descent module', 'the capsule', 'the spacecraft'; verdict.ts `landsOf`), as their words
  are (`DescentCrew.words`), and neither the verdict nor a deck's card has a word of its own for either: a run's landing is
  said as a landing, the record's place in its own phrase (`record.landing.near`) in the sea or near a place on land, and a
  flight that holds its crew to no limits is said down in its ship's name with no verdict on them (tests/verdict.test.mjs).
  Nothing given, it is the record's run to the last bit (tests/descent.test.mjs). On the deck
  (orbitdeck.ts) each event is `descent:<id>` (`can`, `ask`, `Part.commands`, offered on what is let go as well as on the
  vehicle), Space gives the next in the record's order once no burn is to come (before it, the burn itself where a hand
  could fire it: the lock opened, or a spacecraft whose hand controls had no lock, `PlanRecord.manual` without a `code`,
  so a Mercury capsule's Space in orbit is "Fire the retrorockets", the retrofire event's `asked`, and only after it the
  pack's jettison: orbitdeck.ts `burnNext`), and B with the spacecraft alone and no
  burn to come is the descent's sequencer (before the timer's burn it gives that burn up too); each override's label says
  what did it on the day (`descent.automatic`: he could do none of it). The shock layer's glow takes the plan's `Craft.heating` (a `round` body is blunt at any attitude): the flux on the
  documented radius, no surface without its figures. The deck runs on until the last body is down. The smoke is laid no higher than 80 km
  (`TRAIL_TOP` in stage/flightshow.ts): laid round the Earth, its marched volume stalled the page.
- **A staged vehicle is flown live on the same physics** (`sim/stagedlive.ts`, `stagedVehicle`): staged.ts's stages,
  engines, throttle curves, propellant, drops and drag (`stackOf`), air (air.ts `airAt`), gravity and integrator (world/orbit.ts
  `step`), in the same frame, stepped by sim/vehicle.ts's TICK. What it adds is the body's turning, a rigid body whose
  steering gives `ascent.steering.authority` (estimated) about each axis at full throw while an engine aboard burns (no
  inertia, no aerodynamic moment: none read; drag acts along the motion, as in the batch run; its structure held to
  `ascent.limits`, below), and the hands' say over every event (`StagedControls.steps`): nothing happens that is not asked for, a stage let go takes every
  stage below it still on, its propellant and its thrust, once nothing presses it on (below), an engine is started once and stops when cut or dry. The
  record's flight is a pilot (`stagedPilot`): the law's axis held by a critically damped turn (`OMEGA`, chosen) with the
  law's own turning fed forward, the steps at the record's times and a stage with `velocity` cut on its integrator's sum,
  read every tick from switches the deck throws; guidance on, W S A D lean the law as a ballistic deck's trim does. With
  the attitude placed as the law's (`prescribed`, a test's) it is the batch run; steered at the stated acceleration it
  is fast and low at the last cutoff, the loop's lag carried on by the gravity turn and going as the loop's stiffness: a
  recorded miss (src/sim/misses.ts, `live`) held by `tests/stagedlive.test.mjs`, which also holds a stage let go early and an engine cut by hand to their consequences.
  Steered as well as the law steers it, a hand-flown ascent falls short of an orbit as the record's run does: no input
  is changed to bring it in.
- **Staging by hand is physics** (`sim/staging.ts`, the rules every vehicle is held to; the figures are the flight's).
  *Pressed*: two bodies let go of each other part only once the one behind stops pushing the one in front (its thrust
  over its mass against the other's; drag left out, no figure dividing it): a stage, or a spacecraft, let go under
  thrust stays pressed on and pushes on until its push falls (stagedlive.ts `settle`, `loose` and `gone`; vehicle.ts
  `loose`, so Freedom 7's capsule let go at T+100 rides the Redstone to its cutoff and its engine is not cut by it). A
  stage's own separation command shuts its engines where the record has them stop at its separation (the strap-ons'
  integrator command, the core's); what it takes along below it keeps burning. A drop that `covers` the spacecraft (the
  fairing) keeps it in until it has gone. *Hot staging* (`StageRecord.hot`, `hotStage`): an engine lit while the stage it
  stands on is joined fires into its top; only what escapes the joint's open side pushes, by its sine below the level
  (Block E's from the model's estimated geometry), and each second at full thrust is counted against what the top
  stands (`endures`, estimated); past it the tank
  under it fails and the stack breaks up (`Broke`, by `scorch`). *The structure* (`ascent.limits`, by loads.ts's rule,
  as `body.limits` on a ballistic flight): bending (q alpha) and the load along the axis, both
  estimated; past either for half a second or at half again at once, it breaks up. Broken up, every engine stops and
  every stage comes apart, the deck's card says by what figure against which limit and its confidence, and what the
  record says the spacecraft's escape did at that instant (`ascent.aborts`, Molodtsov 2001), which is flown only when it is
asked for (X twice: "What a hand can do").
  *Starts* (`StageRecord.start`): how many and whether only on the pad (the R-7's 32 chambers each lit by a pyrotechnic
  igniter on a wooden stand from the pad); a start asked for that the hardware could not make is refused and said. A
  drop let go in more than its `q` is said, and what its pieces struck is not modelled. What the vehicle made of each
  thing asked is in `StagedState.said`, which the deck says once each; the step that lights a stage hot says so where
  it is offered ("hot staging, as it flew"). tests/stagedlive.test.mjs and tests/vehicle.test.mjs hold each rule.

## What a hand can do

Flown by script against stagedlive.ts and vehicle.ts: the record's law and sequence with one thing done by hand.
Before is what it did ahead of `sim/staging.ts`.

| Vostok 1 (stagedlive.ts) | Allowed | Before | The hardware | Now, and from what |
| --- | --- | --- | --- | --- |
| Light the third stage on the pad | any time | 54.5 kN more for 379 s, with nothing to pay: perigee -2,933 km | jet into the core's top under its deflector | 27 % of its push reaches the stack; the core's top burns through at 5 s and it breaks up (estimated: `hot`) |
| Light it a minute early (240 s) | any time | free extra thrust: perigee -590 km | as above | breaks up at T+245 s, 5.0 s against 5 s (estimated); the card says so |
| Light it a second before the core goes (299 s) | any time | perigee -206 km | hot staging, as planned (start 311.74, the core's main command 312.74) | the same: 1.0 s on the core's top, no harm; said where offered |
| Relight a stage once cut (any, 10 and 12 s) | any time | ignored, said nothing | one-shot pyrotechnics; the first two only from the pad | refused and said (`start`: documented for the first two, estimated for Block E) |
| Cut every engine at T+10 | any time | falls back, lands at 81 m/s | falls back, tumbles | breaks up at 19.5 s falling tail first, q alpha 4.1 kPa rad (estimated limit) |
| Drop the strap-ons at 60 s | any time | thrust and mass leave; it flies on and lands at 1,367 m/s | the separation command shuts them | the same; it breaks up by bending at 131 s as it falls |
| Drop the core with the strap-ons on (60 s) | any time | everything below Block E gone at once, thrust and all | the strap-ons still burning push the lot against Block E | the core shuts, the strap-ons keep it pressed on until they go at 119.5 s (`pressed`) |
| Drop the fairing at max q (60 s) or on the pad | any time | no consequence: 800 kg less carried, perigee -171 km | two hinged halves made to open in thin air | the same flight, and said: 48 kPa against 1 kPa (estimated); where the halves went: not modelled |
| Separate the spacecraft at 60, 140 or 400 s | any time | parted at once, inside the fairing or under thrust | held in by the fairing; pressed on by Block E | held while the fairing is on and while anything pushes; parts at Block E's cutoff, 676.4 s |
| Turn across the wind at max q (hands, 50 s) | any time | no limit: 310 kPa rad, flew on to the ground | breaks up | breaks up at 51.9 s, 151 % of 3.34 kPa rad (estimated) |
| Never stage (sequencer off) | any time | down at 620 s at 263 m/s, 17 g | falls back, breaks up | breaks up by bending at 533 s, coming back down |
| Ask a step twice | any time | heard once | heard once | heard once |
| Braking engine before parting | not offered | | its nozzle in Block E's adapter | not offered: the hot-staging rule would be its case, no figure read |
| An abort, 150 to 730 s (X twice) | on the launch vehicle | not offered ("not simulated") | Molodtsov 2001: to 700 s every engine shut down and the spacecraft separated, its descent module at once, to come down as from orbit; to 730 s the third stage shut down and the whole spacecraft separated | the deck asks the live vehicle to cut every stage burning and let the last go (orbitdeck.ts `abort`, as the mode's `AbortMode.escape` says), so the spacecraft parts as the hardware lets it (held while the fairing covers it, pressed on until the push falls); from 150 to 700 s the modules part as it does, and the module comes down on its own sequence: aborted at 200 s it parts at 87 km, 10.3 g at most, the pilot down at 4.5 m/s. How the module left through the fairing before 154.6 s: not read |
| An abort, to 40 s (X twice) | on the launch vehicle | not offered | Molodtsov: the pilot ejected on a radio command from the ground; the first 15 to 20 s had no satisfactory answer | he is ejected at once from the stack's state (the spacecraft's point up the stack, `StagedVehicle.aboard`) and flown down as the descent flies him from the ball (orbital.ts `flyEjected`: the seat thrown 20 m/s against its motion through the air, its parachute, the main canopy at 4 km falling, the reserve), to the ground under him (`floorAt`); the stack flies on, empty: aborted at 5 s (0.2 km) he is down at 4.5 m/s at T+25 s, at 35 s (3.3 km) at T+742 s. The card holds him to the descent's limits (`ejectedVerdict`). His seat's way out through the fairing's opening (the hatch's bearing round the stack is the model's own), and what the stack did near him: not read |
| An abort, 40 to 150 s (X twice) | on the launch vehicle | not offered | Molodtsov: every engine shut down, the pilot ejected as the falling stack came down through 7 km | every stage burning is cut, and the seat waits for the spacecraft's point to come down through 7 km falling (`StagedVehicle.fell`). Falling as it was left, with no moment of the air on it (none read), the stack turns across the wind and breaks up by bending first: cut at 41 s it breaks at 69.8 s, 7.4 km up; at 60 s at 102.7 s, 16.3 km; at 120 s at 284.4 s, 44.3 km. The seat never fires, and the flight ends at the breakup, which is not modelled; the card says so. With no structure to break (a test's), cut at 60 s it comes down through 7 km at T+140 s at 498 m/s through the air, and he is ejected into 74 kPa |
| An abort with no seats (the Voskhods) | on the launch vehicle | | Kamanin: to 27 s nothing could save the crew; 27 to 44 s the ship cut loose, "difficult but possible"; to 523 s the engines shut down and the ship separated | the first two said and not flown (their modes have no `escape`: the first had no seat, no tower and no suits to fly, the second has no record of how the ship was cut loose); from 44 s as Vostok's from 150 s. A mode that ejects a crew with no `DescentCrew.alone` is refused and said |

| Freedom 7 (vehicle.ts) | Allowed | Before | The hardware | Now, and from what |
| --- | --- | --- | --- | --- |
| Separate under thrust (100 s) | in flight | the Redstone's engine cut by it and the capsule off at once | the booster's push holds the capsule on its adapter | rides on to the cutoff, 141.8 s, and parts then (`pressed`) |
| Tower let go on the pad | any time | not offered, ignored | MR-1's left its pad on both rockets (21 November 1960; Hammack and Heberlig, p. 15: both fire at the clamp ring's release) | it goes on both, 1.5 km up in 5 s, and the stack stands; the rockets start the clock as an abort's do, and lit later the programme and sequence run from the lighting, the programme held to the vertical there (autopilot.ts `since`) |
| Tower let go at max q | in flight | leaves; the flight goes on | as that | the same |
| Retrofire before separation (145 s) | any time | not offered, ignored | the motors on the heat shield, their nozzles into the adapter; no interlock read | they fire, and their push is on the whole stack through the clamp ring: 4.011 m/s in 5 s, their impulse over its mass; spent there, it lands 14.1 km beyond the record's; said. What the jets do to the adapter: not modelled |
| Retropack before separation | not offered, ignored | | it sits inside the adapter (redstone-mrlv.md) | held there until the spacecraft has left it: still not offered |
| Retrofire in the air | once alone | fires; the physics | as that | the same |
| A parachute at every regime | once alone, the tower gone | torn by pressure (13.5 kPa at 101 s) or by pull meeting the air full (main above the air: 35.8 m/s down) | as that | the same (`limits`, estimated) |
| Cut at T+10, relight at 12 | any time; one start | breaks at 17.1 s, the escape rocket pulls it clear, 8.8 m/s under the main | as that | the same |
| Turn across the wind at max q | any time | breaks at 51.5 s, 17.6 degrees off the wind; abort | as that | the same |
| Liberty Bell 7's hatch blown in flight (200 s) | in flight, with the spacecraft alone | it goes and the flight flies on as if closed; down, it floats | 23 lb of hatch made to blow on the water (Results, Hammack); afloat with it gone the capsule filled and sank | it flies off on its own (sim/loose.ts) and the flight flies on as if closed (its 23 lb, 0.8 per cent, left aboard; the open cabin's entry not read); down in the sea the open sill takes the sea at once and it goes under (sim/afloat.ts), and the card says so |

The two kinds no longer differ in what a hand may do for no physical reason: what is said and not flown is what no source
read gives enough of to fly (issue #10).

## The deck

- **Every flight is flown on the one deck** (`src/deck/deck.ts`: its three panels, keys and buttons, stick and roll, tucking,
  notes and card), with a flight kind's code behind it: `cockpit.ts` for a ballistic plan, `orbitdeck.ts` for
  one into orbit (an orbital plan; chosen by its plan's kind, src/deck/decks.ts `DECKS`; `lacks` in address.ts lights Fly for it). What
  differs is data the kind supplies (`DeckSpec`): the middle panel's figures (a flight into orbit shows a ballistic
  flight's five going up and height, speed, apogee, perigee and period once alone), the readings, the systems strip (each
  stage's propellant as a bar, the braking engine, the lock's lamps), the steps Space walks through and the keys beyond the
  deck's own (a throttle's arrows, a lock's digits). G and B are guidance and the sequencer on both, W S A D Q E steer on
  both, Space is the next thing on both.
- **A run flown by hand is never lost by leaving it** (`Deck.leave`, `deck/leaving.ts`; gallery.md has the ways out). Within
  the flight the deck parks it as data (state, run, samples), the clock reset for the site and put back on Resume, which waits
  for a touch. It is also written to the browser's storage (`app/runs.ts`, one run a flight, a second flight's not putting out
  the first) as the deck is left, every five seconds while it is flown (in an idle moment), and as the page is hidden or
  goes: a reload, a closed tab, another flight or the front page loses at most a moment of it. What is written is not the
  run but what was done to it (`deck/tape.ts`): each call into the deck that can change the flight (a command, a key of the
  kind's, a cabin's or a part's order, a mechanism, the throttle's slider, a hand going to the controls, the keys and stick
  held as they change), with the clock's instant, the simulator's tick count and the page's time for the deck's own guards;
  and, where the kind's flight depends on the frames themselves (`Deck.framed`: the orbital deck's attitude turned by hand,
  integrated frame by frame), each frame's instant while it does. A few kilobytes, where the run's samples are megabytes.
  Taken up (Fly, on any later visit) the deck flies it again from the pad through its own code on a clock of its own, with
  nothing told to the page (`clock`, `host`, `watchers` and `now` are the replay's), in slices so the page keeps drawing,
  and checks each entry's tick count and, at the end, the state (`print`, `tape.ts` `pack`, every double as it was): one
  that does not come out the same is not restored at all but said to be unresumable and let go, as is one stamped
  (`stampOf`: the version of what is written, a hash of the simulator's and decks' code made by the build, and a hash of the
  flight's plan, site, day, sheds and mechanisms) by another. Nothing in it is per flight: a kind supplies `byHand`,
  `runOver`, `restore`, `fresh` (which calls `started`), `ticks`, `print`, `switches` and, if its run depends on frames,
  `framed`; its commands go through `command`, `obey`, `worked`, `extraKey` and `setLever`, which the deck writes down.
  tests/resume.test.mjs flies Freedom 7 and Vostok 1 by hand, writes them at several instants (powered, coasting, after a
  staging, the retrorockets or the braking burn, the entry), flies them again from what was written and on beside the run
  never left, to the last bit, on the same machine; tools/deck-test.mjs does it through the decks in a browser. A run that
  has ended is not kept (its result is read as before); `end` drops it, `shelve` (the page letting the flight go) keeps it.
- **The flight can be flown by hand.** Fly it (the button by the clock, or L) takes the flight
  deck (`src/deck/cockpit.ts`): the vehicle on its pad, the clock stopped at liftoff, the view the chase
  camera's, the page out of the way. Space lights the engine and after that sets off the next
  event; the clock runs the flight (stopped, so is the flight; faster, so is the flight, up to
  five seconds of it a frame), and each time it moves the cockpit steps the vehicle up to it.
  With guidance on (G) the autopilot flies the programme and W S A D lean it, three degrees a
  second (the vanes at full throw turn the stack end over end in four seconds); with it off, and
  on the spacecraft alone, the keys are the controls themselves; Q E roll. The sequencer (B)
  sets events off at the record's times. The scene shows it through the same `Ascent`, given the
  live run (`FlightShow.flyRun`, sim/run.ts `Run`), at the clock's instant (the last tick carried on by its own motion for the
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
  comes down meets the surface itself. `FlightShow.flyRun` stands the model whole on its pad before
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
  `under` one (`drops[].on` and `under` the plan's parachutes), and the jets are seen (`viewer/jets.ts`, `Ascent.jets`,
  live runs only). The Flown panel draws the run in amber over the record's as it grows
  (`Flown.fly`). The cockpit reads only the flight's data: a new flight with a `Craft.rigid` and
  `flies` can be flown without being told how.
- **An orbital flight is as flown until it is taken over.** As flown (the default, "As flown: automatic"), the run is the
  record's (`flyWhole`), shown through `Ascent` as a run that carries its own attitude (`recordSamples`, sim/run.ts
  `orbitalRecord`, from the plan); what it drops is flown from the plan's `Craft.sheds`, each released from the outgoing trajectory at the joint's instant. The departing body's velocity is the retained body's less their relative separation speed (`orbitalRelease`), from the joint or the shed body's own push. After a burn by hand the attitude drawn is the hand's: as it was left until the modules part, then turning to lie along the motion through the air. Its pilot had no controls going up, and the deck says
  so where the override is offered (a hand on the keys in the ascent says it in a note). Once the spacecraft is alone the
  code on the lock (its digits) frees the hand controls, as the envelope did: W S A D Q E turn the spacecraft at
  `manual.rate`, the timer's burn is given up, Space fires the braking engine along the long axis (`byHand`), and the rest
  is flown again from that burn. A spacecraft whose hand controls had no lock (`PlanRecord.manual` without a `code`: Mercury's
  fly-by-wire and manual proportional) is the hand's as soon as a key turns it once alone, its coast's burn then Space and
  called by its plan label (`Retrorockets`); a descent event's `asked` is what the deck calls it. Each is an edit of the plan (staged.ts `byHand`, `givenUp`, `partingAt`): the coast's
  events set off at other instants (their `time` triggers; `at`, the record's instant, kept), the burn's impulse and its
  aim, and nothing else. G, B or Space in the ascent (or either switch thrown on the pad) takes the flight over:
  from that instant it is the user's ("Not the record's"), the live staged vehicle (below) is caught up to the record at
  that instant (flown from the pad with its attitude placed as the law's: the two agree to a hundredth of a metre a
  second) and flown on by the switches and the hands, Space sets off the record's steps in turn whenever it is pressed
  (each stage lit, cut, let go; the fairing; the spacecraft parted), and once parted the spacecraft coasts from where that
  ascent left it (`flyOrbit` from `parted`), short of an orbit or not: the handover to the published orbit is the record's
  run's alone. Its hand controls are the user's without the lock. The turning in orbit is a hand's on the attitude, not a
  rigid body's: no jets, no gas, no tumble. The deck predicts the path from every instant of the flight by the one
  propagator (below, "The flight deck has a navball and a predicted path"; orbitdeck.ts `predict`, given to path.ts as the
  source's `predict`): on the launch vehicle, under guidance or by hand, where it goes if the engines stopped now (fliers.ts
  `stack`: what it still carries on the drag of the shape it has, to the ground or once round; "if cut now" beside
  the figures), or, under guidance with the last cutoff to come, where guidance would take it, chosen by the same control
  as a ballistic flight's (To cutoff / Cut now, K: path.ts asks the deck's `guidable`): fliers.ts `guided`, the stated law's
  axis leaned by the trim, the record's steps at their times while the sequencer is on (Block E cut where its integrator's
  sum reaches its setting, found ahead in one sweep, `apparentBy` giving the record's run the sum the live vehicle keeps),
  each stage dry when its load is gone, drawn dashed to the last cutoff, and from the parting the spacecraft as planned,
  round the orbit or down (tests/staged.test.mjs holds where it parts to the batch run); alone, its coast as planned (`spacecraft`: flyOrbit's forces), once round with Ap and Pe,
  or down with the burn, its end, the modules' parting and the entry marked (begun within the burn, the burn goes on
  along the line it lit on, from the run's own state then: `lit`), and from the ejection height on down the descent
  (`descend`: fliers.ts `descending`, the descent module the run on show follows, with what the hands gave) to where it
  lands, its parachutes marked; begun part-way down, each body is as the run had it (flyDown's `states`). Without
  `descend` the spacecraft stops at the ejection height, as flyOrbit does (the cabin's `burnNow` asks for that). The Flown panel holds every check the orbital record sets (staged.ts `held`) against the record's run;
  the deck's card holds the coast's and the descent's against the flight on show, and on the user's own flight the
  ascent's too (`StagedTally`). Sound and shake take the first stages lit at liftoff as one engine (`liftoffEngine`); the
  braking engine is heard when the run on show burns it (its `fires`), as one burn of its length. Every engine burns
  from its own nozzles (`flies.fires`: each strap-on's RD-107 and the core's RD-108 as well as Block E and the braking
  engine), between its stage's instants on the run on show and at its stage's throttle (`Ascent.fireLevels`, the
  arithmetic in viewer/fires.ts, tests/fires.test.mjs): the strap-ons at their intermediate stage before they part and
  gone with them, the core on its steering chambers alone through its final stage; a cabin control's `does` of `code:` and a numeral is a key of the deck's lock, and the
  deck hands the cabin, with each sample, the instants of the record's events on the run on show (`DeckNews`; sim/run.ts
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
- **The Flown panel** (`src/deck/flown.ts`) flies the flight once, after the page has opened, and draws
  height, range, space-fixed speed and load against time with the reports' figures as dashed
  lines, the clock's instant as a cursor (dragging a trace moves the clock), and the checks as a
  table, amber where out of tolerance. It reads the clock; it keeps no time of its own.
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
  the Sun through a window is the scene's own. Each window (`CabinDef.windows`) and the periscope's screen is besides a small light whose colour is what is outside it, looked at through an 8 px picture every few frames while someone is aboard (`Cabin.see`); the lights are there from the load, dark, because a light added later rebuilds every shader. Every thrown control is one mechanism (`CabinDef.controls`: a node whose extras carry `throw`, a turn for each position; `Cabin.throwSwitch`): a click on it from the seat, or its button under the lookouts if it switches something, throws it to its next position and it stays there (none has a key: none is free on the flight deck); what it switches names it as its `control` and is told; one with `does` asks the deck; one that `holds` stands as the deck's state has it while flown. The cabin's own lamps have such a switch (`CabinDef.lighting`: what each position lights, each lamp in its colour and at its share of its strength, `CabinLamp`, and each lamp's tube): the lamps it names come on or go out in a few hundredths of a second, in their colours (Gemini's red, Vostok's dim duty light), their tubes glow so, and every surface the build shaded goes over toward its lamps-out figure by the share of the lamps' strength that is lit, its fill (the sky's tenth, what metal mirrors) taking the lamps' colour as far (rendering.md, "An inside to sit in"), so with them out the cabin is lit by its windows, its periscope's screen and its telelights. A globe with `modes` has its mode on such a switch: in `landing` it turns to where a braking burn fired now would bring the ship down (`burnNow`: the record's burn moved to now and flown down by the one propagator, sim/predict.ts `propagate` on sim/fliers.ts `spacecraft`; worked out every 30 s of the flight, in slices of 1.5 ms a frame, and carried round with the ship between), and its mode's `lamp` is lit. It opens as the model was built (as flown) and is not remembered: nothing else in a cabin is. What is inside and not shell is drawn only when it can be seen (on board, cut open, or within 30 m) and casts a shadow only on board or cut open (`Cabin.seen`): from the chase view it was half the vehicle's triangles behind a closed hull. Nothing in cabin.ts or gauges.ts names a spacecraft.
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
- **The flight deck has a navball and a predicted path.** The path is off until it is asked for (J, or its switch) and is then as it was
  left (`prefs` `pathOn`): a new visitor sees the vehicle and the sky first. Both read what the cockpit shows
  (`Cockpit.listen`: every sample put on the instruments, with the live state, or null when the
  clock has been put back) and nothing else of it. The navball (`src/deck/navball.ts`, I tucks it; it is the deck's left-hand panel, the path's figures beside it) is
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
  the flier's next instant (nothing a flier is changes within a step), each step a rung of a ladder of quarter octaves
  so that two starts a hair apart take the same steps, each height and the ground found by flying the step again to the
  last bit of the instant it crosses them. A prediction moves with its start as the physics does and no more: nothing it
  counts changes, and a figure moves by under a part in 1e9 or smoothly (tests/perturbed.test.mjs, each captured
  prediction from a start six micrometres out either way and in a frame turned a nanoradian; issue #30). The air's two marks are its own and every vehicle's: the first 0.05 g felt
  coming down once nothing burns and no burn is to come (placed between the steps either side of it), and the greatest
  load from there before a parachute (at the vertex through the steps round the most). The
  vehicles: `ballistic` (a ballistic plan's: Freedom 7), `spacecraft` (an orbital spacecraft alone: flyOrbit's
  `shipPush` and `aimOf`), `stack` (a staged launch vehicle with its engines stopped). The differences between them are
  the vehicles': drag curves and areas, what is scheduled, the retrorockets' line (against the motion over the ground)
  against the braking engine's (fixed as it lights), parachutes. Each is a point mass with the attitude its forces need
  prescribed: the Redstone's rigid body (vehicle.ts: its moments, its autopilot's lag behind its programme, under a
  degree) is not stepped, nor the staged vehicle's turning. Freedom 7's prediction: the one gravity (world/orbit.ts) and fly.ts's drag curves (`dragArea`, `chuteArea`, `thrustIn`), and what the sequencer
  will do by itself (`Sequence`, from the live state and the plan, path.ts `sequence`: one rule, the plan's events in its order, each the sequencer sets off on the clock read by what it does, unless what it acts on has left the machine already: separation and its push along the joint's axis, as every simulator parts two bodies (`Sequence.axis`: the programme's under guidance, the axis it has otherwise), the retrorockets as fly.ts fires them,
  the pack, the parachutes at their heights; with the sequencer off, nothing, not even the parachutes, as the live
  simulator has it), until it meets the sea, has gone round (then it is an orbit, with its osculating elements) or
  its horizons say (predict.ts `Horizons`: six hours, once round and 60,000 steps unless a plan says otherwise). Predicted from before separation it is the landing the live simulator then flies, within half
  a per cent (tests/predict.test.mjs). While the engine burns under guidance K chooses between "to cutoff" (thrust
  along `programmeAxis`, the tilt programme with the pilot's trim: attitude prescribed, as fly.ts's is, not the rigid
  body stepped), drawn dashed up to the cutoff, and "cut now"; the choice is a two-way control beside the figures,
  shown only then (K does nothing otherwise, and says nothing it cannot do). On the pad the plan is the only path.
  Besides the path it names what happens on it (`events`: cutoff, tower, separation, retrofire, the pack, the first
  0.05 g after retrofire, the greatest load before a parachute, drogue, main) and returns the path at instants of its
  own, multiples of a power-of-two step its bend allows (`gridStep`), so two predictions of the same flight share their
  points. A prediction is begun at most five times a second and worked in slices of 1.5 ms a frame, for every vehicle (a guided stack's steps ahead swept in the first of them, `Flier.prepare`)
  (`Predictor.run(budget)`, the path put at its own instants in a slice of its own; `sr.path.cost` says what the last
  one took): sliced, not a worker, because a vehicle is closures over its flight's data (a programme's axis, a plan)
  that a worker would have to rebuild for every state. Nothing of it may make one long frame: a path that does not fit its points is laid out again
  in a slice of its own (`sampled`), and a place on the curve is found by halving (pathline.ts `pieceOf`), not from its
  first piece. It is worked out only when it is
  wanted: while a prediction made again from the flight would lie within half a pixel of the curve on show wherever that
  is drawn (its departure from the curve, its place and three times its velocity's over the time ahead: a coast's
  departure grows no faster), the plan unchanged, and a path that comes round still reaching most of the way round,
  that curve is its future and nothing is worked out again (path.ts `holds`); under thrust the flight leaves it within
  a frame or two and it is worked again (on the launch vehicle of a flight into orbit the path is "if cut now" unless the
  guided future is chosen: the deck says which beside its figures); nothing is predicted while the path is off. Whichever deck predicts (the ballistic deck's path.ts itself, the orbital deck's `predict`), path.ts
  is given one `Predictor` and one `Prediction` and knows nothing of which it was. A path that comes down is drawn over
  the ground (each point where it will be over the ground at its own instant); one that goes round is drawn in the
  navball's frame (O), in Orbit as it lies in the frame that does not turn. It is an instrument's line, and lunar-lift's
  (../lunar-lift, js/predictor.js) is its model, with KSP's for what it shows: one clean line from the vehicle to where
  the path ends, always ahead of the vehicle and never behind it (its owner's rule), an orbit most of the way round.
  Its rules are the screen's and the path's own, the same
  for every path (`viewer/pathline.ts`, path.ts's header): the prediction is a curve (its points with their velocities,
  the cubic between them), cut each frame into chords until none strays more than 0.35 px from it as seen from the eye,
  wherever the eye is, at multiples of a power of two seconds so the chords stay put as the clock runs; it starts at the
  instant on the curve nearest the vehicle as drawn, every frame (laid out in the frame it is drawn in, `Stage.beforeDraw`),
  whatever the age of the prediction under it, and is taken onto the vehicle there; an orbit the clock has outrun (hours a second, on rails) before a prediction from where
  the vehicle is can be made is drawn from the same curve whole turns on (pathline.ts `turnsPast`), taken onto the
  vehicle, so at every rate the line starts at it. A path once round comes back to where it began, which is behind the
  vehicle (seen in Orbit, its square end was the line its owner saw behind his ship): the line stops short of that by
  the angle beyond both horizons, the vehicle's and the path's highest point's (pathline.ts `overHorizon`), and 12° more,
  turned round from where the vehicle is now (`sweepOf`, `tailOf`), so nothing near the vehicle sees its end, and goes
  out over the 30° before; one cut off by its horizon of time goes out over its last stretch; only one that meets the
  ground ends there, at its ring. It is a ribbon of constant
  width in pixels (each chord pushed out across its own direction on the screen and mitred to the next, never thinned
  with distance) with a soft core (in the cel look a flat line with an ink edge), drawn over the finished frame (viewer/overlay.ts
  `drawLast`), against the scene's depth and writing none, so the vehicle, the ground and the cabin's walls hide it and
  the smoke behind it does not, and under as much cloud as lies in front of it; the Earth hides it by its ellipsoid
  tested for every pixel, so it ends at the limb to a pixel; it starts a gap from the vehicle (a little more than half
  its length, and 3 px) and comes in over the vehicle's length, or 40 px as seen at the vehicle where that is
  more (lunar-lift's stops), a rule of the screen, the same at every zoom, so it is seen to leave the vehicle and is
  never a hole round it; it is kept off the vehicle's outline on the screen only where it passes in front
  of the vehicle, and each chord is cut at a plane just past the near plane and fades in over the next doubling of the
  distance, so nothing is drawn behind the eye. A new prediction is eased in over 0.3 s from where the line was, instant
  by instant, its end with it, and a prediction made again of the same flight lies on the same curve, so nothing moves.
  The line flown is not the path: from near the vehicle it is not drawn (a line behind the vehicle is read as the way it
  goes, whatever it is drawn in); from 300 km out it comes in, all of it from 1,500 km (the whole flight seen from
  space), a thin cool grey core with no casing or glow at half strength, the last revolution or so (points more than
  6,000 s old let go when a thousand are kept, so a flight of days keeps its points close), its far end coming in from
  nothing, and the path's figures say what it is while it is drawn (Flown). Its markers are glyphs on the line with a name, a figure
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
  leaps it fades out and in again rather than glide across the page. A place in view is one on the window and on no panel,
  wherever that is: one seen between two of the deck's panels, below the clear part, has no chip. A chip is laid against
  the panels as they stand (path.ts reads them again the moment one changes size: a row of the path's own shown, the deck's
  words wrapping, a note), and its pointer stands on its edge toward its place and is aimed at it from there. The layout
  keeps a chip's way round from one frame to the next, so where a chip is depends on where it was; what holds whatever came
  before is the rules, and the path test measures a chip only once it has settled (`chipsSettled`). From the seat there are only the chips, with the
  deck on show. In the real look the line has a thin dark casing under its core, which is what reads against a bright
  sky, cloud and sea, and from inside the vehicle nothing of it within the vehicle's radius is drawn. It is given to
  the stage through `Stage.overlay`, which builds its shaders in `Stage.warm`.

## Orbital docking

The terminal approaches start around a navigation fix from the flight report. Each spacecraft has an independent inertial state, body attitude and principal moments. The capture calculation evaluates velocity at the moving port, including its rotational velocity. Capture draws the rings together and corrects their relative attitude while preserving total linear and angular momentum. At hard dock, forces and torques act about the coupled centre, with the rotated inertia tensors and parallel-axis terms of both vehicles. The throttle remains with the firing body. Opening the joint preserves both outgoing states. Translation provides separation.

Gemini X and XI have chapters for the three measured docked maneuvers. Advancing to one propagates the actual orbit with J2, selects its reported pointing and replays its measured change of speed over the burn. The flight deck shows instantaneous osculating apogee above the equatorial radius. Gemini XI's rotational exercise begins with the strap extended to its documented length and the first measured spin rate. The integrator applies a unilateral impulse at the two attachment points. Slack webbing is drawn straight between the endpoints. The folded strap, its deployment snags, bending and material damping are omitted.

Apollo 9's first encounter carries Spider bolted to the S-IVB. Four forward-firing service module jets back the docked pair away after extraction. The LM-active encounter uses Spider's ascent stage after staging, with the second set of measured masses and inertias. Crew transfer requires a hard dock and is a separate cockpit operation.

### Gemini first rendezvous

In Gemini VIII, IX-A, X, XI and XII the **Orbital rendezvous** chapter starts at the crew's orbital tracking fix. **Coast to maneuver** advances the free spacecraft together through quiet intervals. Each OAMS maneuver uses the mission report's three impulse components and elapsed interval. Gemini IX-A's separation uses an equivalent paired-jet duration. At terminal braking the individual crew valve timings are unavailable. The pilot model uses bounded feedback to approach the reported stand-off, then moves along the target axis at the final closure rate. Capture is decided by the moving ports.

The target normally starts at its independent orbital fix. Propagating that fix alone misses the VIII and IX-A terminal encounters. These chapters reconstruct the target position from the reported terminal range and elevation with zero cross-track displacement, preserve its tracked local velocity components and integrate back to the start. The simulator uses that continuous trajectory throughout the chapter. This gives initial ranges of about 926 and 569 nautical miles respectively, compared with the reports' 1,060 and 570. The X, XI and XII chapters give about 999, 233 and 508 nautical miles. Gemini XI reported 232. These are simulated centre-to-centre ranges. The resulting timing of the final contacts depends on the historical station and closure schedule. Gemini IX-A holds outside its obstructed adapter. Its subsequent rendezvous exercises are outside this chapter.

The primary rendezvous browser run is `pnpm test:docking --primary`. It opens each flight through its Fly deck, advances the coasts and flies the recorded approaches through docking or blocked stand-off.

### Attitude of the Soviet descent sphere

Vostok and Voskhod discard their orbital attitude jets and braking engine with the instrument module. At separation their spherical descent cabin keeps its inertial attitude. A collision can leave it spinning. Its offset centre of mass brings its heavy side into the airflow as drag builds. This display approximation follows the largest entry load reached, starting at the simulator’s 0.05 g entry marker and reaching the stable orientation at one g. It preserves roll about the airflow axis and holds the last supported pose once the sphere comes to rest. The mass offset, damping, individual flights’ oscillations and parachute suspension attitude are unresolved. Cabin, camera, navball and detached parts use the same recorded attitude. The early Soyuz exhibits currently have no Fly deck. [NASA SP-4408, chapter 8](https://www.nasa.gov/wp-content/uploads/static/history/SP-4408pt1.pdf)
