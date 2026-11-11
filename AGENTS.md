# Working notes for agents in this repo

SPACE RACE: every crewed spacecraft and its launch vehicle, modelled to scale in Blender and shown
in three.js. Today it is a viewer with one flight (Freedom 7 on its Mercury-Redstone). The goal is a simulator in which you fly the USA's, the
USSR's and later programmes from the historical record to the present, so **the models and the
numbers have to be right, and where they are not yet right the repo has to say so**.

Where it is going: an orbital space programme for our own solar system, with the on-foot presence of
a military simulator and none of the combat: you are a person in a real place as well as a pilot. The Earth to scale (true
continents, detail at the places that matter, not everywhere), the Moon and lunar orbit, the Sun,
the other planets as placeholders at first; sites you can walk and drive round, vehicles you can
board, launch and fly. Build each piece so the next can stand on it: `src/world/` holds the
bodies, frames and ephemeris; a site is a local frame placed on the Earth.

Accuracy is half of it. The other half is **being there**: you should feel the size of the vehicle
and of the place it stands in. A person is 1.8 m tall and a Redstone is fourteen of them; the work
is done when that is felt, not when it is stated. See "Being there" below.

This file is `AGENTS.md`; `CLAUDE.md` is a symlink to it. Sibling project `../lunar-lift` is the
earlier, single-mission take on the same idea (vanilla JS, toon-shaded, real orbital mechanics).

## Run it

```sh
pnpm install
pnpm dev              # Vite with hot reload, http://localhost:5180
pnpm check            # typecheck, lint, format check, tests: must pass before a commit
pnpm test             # node --test: explode motion, and every flight.ts against its GLBs
pnpm lint             # Biome (TS, JS, CSS, JSON) and Ruff (Python)
pnpm format           # rewrite files in place: Biome and Ruff (`nix fmt` does the same, plus Nix)
pnpm typecheck        # tsc --noEmit, strict
pnpm build            # typecheck, then a production bundle in dist/
pnpm model:mr-3       # rebuild Freedom 7's GLBs (vehicle, pad, crew) from their Blender scripts
pnpm models           # rebuild every flight's GLBs
pnpm test:flicker     # needs `pnpm dev` running: z-fighting check in a real browser
```

CI (`.github/workflows/pages.yml`) runs `pnpm check` (so a part whose node is missing from its GLB
fails the build) and builds every push and pull request, and
deploys `main` to GitHub Pages at https://jamesbrink.online/space-race/. Pages serves from a sub-path, so
asset URLs are relative and go through `import.meta.env.BASE_URL`; never write a leading-slash URL
in `flight.ts`. The GLBs are committed, so CI needs no Blender.

Models need Blender 5.x: `$BLENDER`, then `/Applications/Blender.app`, then `blender` on PATH.
It runs headless (`blender -b -P`); no Blender MCP or GUI is involved. Useful flags on
`node tools/build-model.mjs <flight>`: `--only pad` builds one model, `--preview <dir>` also writes
EEVEE stills (the quick way to look at geometry without the browser), `--detail 0.3 --out-dir <dir>`
builds a lower level of detail somewhere else. Blender runs with `--factory-startup`, so no user
add-on or preference reaches a model.

`window.sr` is the debug handle: `sr.show('pad')` switches model; `sr.stage.shot(view, azimuth)`
frames a named view from a direction; `sr.stage.pose(az, el, dist, y)` places the camera exactly;
`sr.stage.setCutaway(true)` opens the cutaway. The address bar's `#<flight id>/<model>` (or just `#vehicle` / `#pad` / `#crew` for the first flight)
selects the model. To look at a change, `node tools/shot.mjs out.png pad "sr.stage.pose(215, 9, 150, 14)"`
takes one screenshot from its own headless browser (`--ui` keeps the panels, `--hover x,y` moves
the mouse first); read the PNG.

### Code quality

- `pnpm check` must pass before a commit. It needs `ruff` on PATH: the Nix devshell provides it
  (and `biome`); the pinned `@biomejs/biome` in `package.json` is the one the scripts run.
- Formatting is the tools' job. Run `pnpm format`; do not hand-align or argue with the result.
- TypeScript, JS, JSON: Biome, configured in `biome.jsonc` (140 columns, single quotes). CSS is
  linted but not formatted, so `style.css` keeps one rule per line. Markdown is left alone.
- Python: Ruff, configured in `pyproject.toml` (150 columns, double quotes). The scripts run inside
  Blender, so `bpy`, `bmesh` and `mathutils` cannot be installed and there is no type checker for
  them. Imports that follow the `sys.path` setup carry `# noqa: E402`; a lambda given a name
  carries `# noqa: E731`.
- A rule is switched off only with a one-line reason beside it in the config. Prefer fixing the
  code.

## Layout

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
  viewer/field.ts                     noise that gives the same answer in JavaScript and GLSL (the ground's height is needed in both)
  viewer/air.ts                       the air: haze that thins with height (in three's fog chunks), cumulus as puffs with flat bases, their shadows
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
  world/clock.ts                      the simulation clock: seconds from a flight's launch, stopped until run
  world/sequence.ts                   a slider joined to the clock: keyframes, sliderAt, timeAt
  viewer/heavens.ts  daysky.ts        the Moon, stars and planets drawn; light and sky colours by the Sun's height
  timebar.ts  time.css                the clock's control
  demo.ts  callout.ts                 the idle show: the day run round, a tour of the flight, a callout on each thing
  viewer/lamps.ts                     floodlights: every lamp lens a model carries lights the scene after dark
  viewer/origin.ts                    drawing from the eye: the GPU sees only eye-relative positions (a floating origin)
  viewer/ascent.ts                    the flown vehicle in the scene: where the simulator has it, and what it has shed
  viewer/plume.ts                     the engine's fire, drawn: tone bands and shock diamonds, opening as the air thins
  viewer/trail.ts                     the trail it leaves, drawn: a ribbon along the path flown, widening and thinning with age
  sim/fly.ts  sim/atmosphere.ts       the simulator: a ballistic flight integrated from Flight.trajectory; the 1976 standard air
  flown.ts                            the Flown panel: the simulator's run against the clock, and against the reports' figures
tools/
  build-model.mjs                     runs a flight's model scripts through Blender
  flicker-test.mjs                    browser check for z-fighting
  shot.mjs                            one screenshot of the viewer, for looking at a change
  logo.mjs                            writes the mark (src/logo.ts) to docs/logo.svg (README) and public/og.png (link previews): run after changing it
  blender/srlib.py                    shared geometry helpers, clearance check, run()
  blender/sitelib.py                  what any site is built from: walls with openings, stairs, ladders, doors, poles
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
the rocket is studied), moving there as hardware would. The view drifts round whatever was last
chosen; taking the camera (a drag, moving or turning it by key) pauses the drift and the next choice
restarts it, unless the user has switched Auto-orbit off. Adjusting the view does not pause it:
zooming, tilting, the slider and the cutaway all leave it turning, and a view framed again as the
slider moves keeps the direction the camera has reached. A view that names parts (`nodes`) frames them wherever they are, so it
follows them as the slider takes the model apart.

**Anything can be gone to.** A click on a part flies to it; on another model, opens its section; on
a window, looks in; on something in the place round the pad (`Flight.surroundings`: a blockhouse, a
road), flies over and turns about it (`Stage.visit`). A figure that has been walked somewhere stays
where it was left.

## Being there

Immersion is a requirement, weighed with accuracy and never traded against it. Judge a change by
standing in it: on foot at eye height beside the thing, and from across the pad.

- **Scale is felt from the ground.** Everything can be walked up to, round and, where the real
  thing allowed, into and up: a structure has its stairs, ladders, doors and lift, and a route on
  foot from the ground to its top. If something can be seen it can be gone to.
- **A body, not a camera.** On foot the view moves as a person does (stride, weight, landing,
  breath) and the figure is animated, carrying what he carried. Motion follows the gait, never a
  timer, and can be reduced or switched off.
- **The place is real.** What stands round the pad is what stood there that day, at its real
  distance and bearing, lit by the Sun where it was. No stand-ins that are there only to fill space:
  either the real thing, labelled with how sure we are, or nothing.
- **Designed, not photographic.** The look is lunar-lift's (../lunar-lift): clean, deliberate
  forms with a strong silhouette, drawn so they read at any distance, then given real shading,
  shadow and surface grain in the real look and flat tones with ink in the cel look. Accuracy is
  in sizes, places, proportions and colours, not in imitating a photograph: no leaf cards, grass
  blades or noise standing in for detail. A tree is a designed crown on a trunk, a shrub a few
  clean masses, a cloud a soft-shaded volume with an edge.
- **Nothing breaks the spell.** No flicker, no clipping through walls or ground, no pops between
  levels of detail or between poses, no object that is a flat box up close. A lower level of detail
  is for distance only.
- **Performance is won without giving up quality.** What is near is drawn at the highest detail
  there is; frames are saved on what is far, hidden or unchanged (levels of detail, drawing only
  what changed, culling), never by making the thing in front of the viewer coarser.
- **The page gets out of the way.** Panels tuck, H clears them, and the world is the full window
  when walking.

## Cutaway and what is inside

The vehicle can be sliced open. A model script lists the meshes that enclose something in
`SHELLS` and calls `srlib.mark_shells`; the viewer clips those (one quadrant, facing the default
camera) and leaves everything else whole. So when you add an interior, build it as its own mesh
and do not list it; when you add skin, list it. A part marked `inside: true` in `flight.ts` opens
the cutaway when selected. Interiors are built only at detail 0.75 and above (`srlib.interior()`),
so a distant level of detail does not carry a pilot and plumbing nobody can see.

## Windows are openings

A window is glass over a hole, with the real thing behind it. `srlib.bore` cuts a round hole
through skins (it divides the faces round the hole and removes those inside; a boolean would treat
a lathe with bulkheads as a solid). Frame the hole with a bezel or sleeve that overlaps its rim.
Name the pane's material `glass...` and the viewer makes it a clear pane. Only where nothing is
modelled behind (a lower level of detail, a distant building) does a dark `window-void` stand in.

## No flicker

Two faces in the same place flicker: the depth buffer cannot tell them apart and picks a
different one per pixel per frame. Three things stop it, and all three must stay true.

- **`srlib.check_clearance` runs on every model build and fails it** if two parallel,
  same-facing faces are under 1 mm apart, printing the two meshes and where. Fix the geometry:
  sink a fitting through the skin (so its hidden face is well inside) or stand it off by more
  than a millimetre. Do not pass `--allow-clashes`. Faces that cross at an angle are fine, and so
  are single-sided faces back to back; double-sided materials are held to the stricter rule, so
  use `double_sided=True` only where both sides are really seen.
- **`Stage.fitDepth` moves the near plane out every frame** so depth resolution stays under a
  third of a millimetre at any distance. Do not give the camera a fixed near plane.
- **Nothing lies close above the terrain.** Depth interpolated across a triangle kilometres long
  is coarse: concrete 6 cm above such terrain flickered. So the terrain is finely divided (`land.ts`:
  half-metre cells near the eye, never more than 64 m), it sits 12 cm below the pad's surface (`GROUND_Y`, and `GROUND` in
  the site's builders: the pads and roads were at grade), and anything standing on the ground goes down past that (`FOOTING`
  in `site.py`). Change the two together and rebuild the pad and the place.

- **Far off, parallel faces need centimetres, not a millimetre.** Seen from 150 m while the
  camera is close to something else, faces under about 5 cm apart fight. Scenery that is looked at
  from across the site (another pad's slab and its joints, a far track's rails) keeps that much
  between parallel faces, or sinks one through the other.

`pnpm test:flicker` checks the result in a real browser: every model, every view, six
directions, looking for patches of pixels that swap when the camera turns 0.005 degrees.
`--shots <dir>` writes a map of any it finds. Run it after changing a model or the renderer.

## Drawn from the eye

The GPU's floats step in 1 mm at 10 km and half a metre at the Earth's radius, so nothing is drawn
where it is (`viewer/origin.ts`). Positions live in doubles in JavaScript, in the scene's frame,
which is fixed to the Earth (today the site's): `position`, `matrixWorld`, a ray's hit, a box, at
every moment the page's code can see them. `Origin.draw` moves the whole scene by minus the eye for
the draw only, so every matrix uploaded is relative to the eye, then puts it back; it also moves
what three keeps in the scene's frame between draws (the cutaway's planes, each shadow's lookup,
a hemisphere light's direction). So:

- Read and write positions as they are; nothing outside the draw needs converting.
- Code that runs during the draw (`onBeforeRender`, a pass) sees eye-relative world matrices: put
  them back with `absolute()`.
- A shader that wants a position in the scene's frame from `modelMatrix` or `cameraPosition` adds
  `uOrigin` (as `surface.ts`'s grain and `air.ts`'s fog do); a position in an object's own frame
  needs nothing. `uOrigin` is declared in three's `common` chunk and given to every built-in
  material, so a shader patch uses it without declaring it (a second declaration will not compile).
- `sr.stage.origin.enabled = false` draws the old way: the two must look the same (checked from
  fixed views, frozen: a few dozen pixels in 640,000 differ, by one level, from rounding).

## Drawing only what changed

`Stage.frame` skips the draw when nothing has changed: the camera has not moved and nothing set
`dirty`. Scenery that moves by itself (surf) is redrawn twelve times a second. So anything new that
changes what is on screen must set `this.dirty = true`, or it will show up late. The shadow map is
likewise drawn on demand (`shadowMap.needsUpdate`): set it when something that casts a shadow moves.

## The world and the sky

`src/world/` is pure TypeScript in doubles with no three.js, and everything in it is tested against
published values (`tests/world.test.mjs`: Meeus's worked examples and JPL Horizons). Read the header
of `frames.ts` before using a frame: it states every convention once. Lengths are metres and angles
radians, except that a place is recorded in degrees as published. A site's frame is the viewer's
and the model's: +Y up, +X on the site's stated bearing, +Z a quarter turn clockwise from it.

Nothing in the sky is placed by hand. A flight's `site` (types.ts: `SiteDef`, defined once in
`missions/<nation>/<programme>/sites/<site>.ts`) and the clock's instant give the Sun, the Moon
with its phase, the planets and the stars (`ephemeris.ts`); `viewer/heavens.ts` draws them and
`viewer/daysky.ts` derives the light's colour and strength, the sky's colours and the exposure
from the Sun's height. Positions, sizes and phase are computed; brightnesses are a model fitted by
eye and say so. Stated accuracy: Sun 0.006 degrees, Moon 0.008, planets 0.01 to 0.13; do not
quote better.

The simulation clock (`world/clock.ts`, `sr.clock`, the time bar under the section switcher)
counts seconds from the flight's launch and is stopped at launch until run. A setting follows it
through `Setting.at(jdUT)`, which returns null unless something on screen changed, so a stopped
clock costs nothing and a running one redraws only as fast as the sky visibly moves. Anything new
that depends on the hour takes its instant from the clock and reports change the same way; it does
not read `flight.launch` or keep its own time.

Light must never step, at any clock rate (the idle show runs the night at 1200 times life).
Everything cheap (the light's strength and colour, exposure, the sky, the fog, the lamps) is set
every frame; of the two things that cost, the shadow map is drawn again whenever the light has
moved a twentieth of a degree, and the reflections are baked at a day's brightness, scaled to the
sky's every frame through `environmentIntensity`, and each new bake is faded in from the last
(`Reflections` in backdrops.ts). Where the Sun hands over to the Moon the one direct light passes
through nothing (daysky.ts), so shadows turn round unseen. Room lights are handed between rooms by
fading. A change to the light is checked by sampling a still view's mean brightness frame by frame
through dusk and dawn at 1200x: it should run one way, without jumps.

A model whose slider tells a sequence of events has a `sequence` (types.ts: `Keyframe`): the
instants, in seconds from launch, at which the slider reads each value, each with confidence and
source. The times are the record; where they fall on the slider is layout. Such a model is on the
clock (`world/sequence.ts`): its slider reads the clock, dragging it stops and moves the clock,
and running the clock plays the events at their own pace. Another section's `with` asks for an
instant (`at`), not a slider position. A slider without a sequence (the vehicle's exploded view)
is not time and is left alone.

## The simulator

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
  does (the gyros' tilt going up, heat shield first after the turnaround). What it sheds falls
  away (`Ascent.shed`, `Stage.fall`): the full level's own node is carried off with the speed it
  had, under gravity, pushed back (the tower on its rocket) and turning slowly, all drawn rather
  than flown, and put back when the clock goes back. Before liftoff and after
  the landing it stands on its pad, whole: the inventory, which the idle show tours. While the engine burns, `viewer/plume.ts` draws
  its fire under the node `flies.engine` names: a designed shape (flat tone bands, shock diamonds
  in thick air, a widening veil as the air thins), sized to read, not measured; `viewer/trail.ts`
  lays the white trail it leaves along the path flown, widening and thinning with age and with
  the air it was laid in. The chase camera (`CAMERA_MODES`: C) turns
  about it and is carried with it, and carries the Sun's shadow map too. The sky darkens with the
  eye's height as the air above it thins (`airAbove` in backdrops.ts: black by 50 km). The site's
  frame is flat: downrange the sea falls away below it (18.6 km by the landing), and from high up
  there is nothing drawn below the horizon. A globe needs the scene's frame to become the
  Earth-centred one (origin.ts already draws from the eye), the Earth drawn to scale under the
  site's local detail, and the vehicle put in it from `fly`'s inertial state without the site's
  frame in between.
- **Getting it right is the work.** Today the powered flight ends 4 % fast, and ten checks miss
  because of it; the capsule flown from the report's separation passes all but one. The flight's
  README ("The flight as flown") states the numbers.

## Two looks

The stage draws in one of two looks (`viewer/look.ts`), switched by the Cel shading button or T
and remembered: `real`, the physically based one every model is built for, and `cel`, the same
scene as a drawing. Nothing is authored twice. `Looks` derives a toon twin from each real material
the first time it is needed (same name, colour, map and shader patches) and swaps meshes between
the two; `InkPass` draws the line from the frame's depth buffer. So anything put in the scene must
be handed to `Looks.add` (models are, in `dress`; a setting's floor and scenery are, in
`applySetting`), and code that changes a real material after it is made (the cutaway) calls
`Looks.sync`. Keep reading materials by name: the twin has the same one.

## Walking

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
  the diagnostics line says so.
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
  Seen from outside, a figure that turns where it stands steps round (`advance`'s `turn`).
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
  meaning down until the legs stop. The wheel offers Climb on a ladder too.
- **Stairs are walked, not hopped.** The floor is sensed under the middle of the body and four
  points round it, so open treads with daylight between them carry it; the feet follow a flight
  as fast as the legs go (`settle`'s `rate`), a step down is as deep as a step up is tall, and
  the eyes lag the risers into a slope. Unit-tested on open-tread flights of 0.2 and 0.25 m
  risers at a walk and a run, both ways, with no frame in the air.
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
  for a placeholder until it has one.
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
- **The orbiting camera's rules are off while walking** (`Stage.stepWalk`): no drift, bounds,
  picking or `fitDepth`. The walker sets its own near plane from the nearest surface (5 cm
  indoors, up to 30 cm in the open) and a wider lens, eased in and out over half a second
  (`Walker.lens`), which the backdrop's camera copies. Views are always framed for the orbiting
  lens (`Stage.lens`).

## Levels of detail

Models are generated, so a lower level of detail is a rebuild, not a remodel:
`blender ... -- --out x.glb --detail 0.3`. `srlib.DETAIL` thins every curve and, under 0.5, drops
fasteners; eight sides or fewer is a shape, not a curve, and is kept. The inventory uses 1.0.
The clearance check runs at every level, and coarser curves sit differently against each other,
so a fitting that clears at 1.0 can land on its neighbour at 0.3.

Every model build writes three files: `<name>.glb`, and `<name>.lod1.glb` and `.lod2.glb` at detail
0.6 and 0.3. The viewer draws whichever suits the model's size on screen (`viewer/lod.ts`): the
thresholds sit where what the coarser level leaves out is under a pixel, so the change cannot be
seen and nothing is cross-faded. A model that is cut open is always drawn in full. The place round the pad (`Flight.surroundings`)
is chosen piece by piece (`Scenery` in lod.ts): each top-level node, a building or the track, at
the level its own size on screen calls for, so the building beside the walker is always the finest;
level 0 is the one picked, walked on, lit and worked, and anything driven is always drawn from it.
When the simulator needs distant LODs, add them to `build-model.mjs` as extra outputs per
script; do not hand-edit geometry for them.

## Rules that keep the numbers honest

- **Every number carries a confidence** (`src/types.ts`): `documented` (a published figure),
  `derived` (computed from documented ones; say how), `estimated` (read off photographs, or chosen
  to look right). Never promote an estimate by rewording it. The simulator will refuse to depend on
  `estimated` values, so the label is load-bearing.
- **One place per number.** A dimension lives in a model script (in the drawing's units) and is
  quoted in `flight.ts` and the hardware's `.md`. Change all three together; each build prints the
  model's overall size, which must match what `flight.ts` says.
- **Model in the source's units.** Mercury drawings are in inches and the pad's in feet; the
  scripts keep those and multiply by `IN` or `FT` once. Soviet hardware will be in millimetres. Do not pre-convert.
- **Model the flight, not the type.** Freedom 7 is spacecraft No. 7: portholes, a latch hatch, a
  beryllium heat sink. Friendship 7 is a different model with its own folder.
- **Cite it.** A `documented` figure names its source: document and section, figure or page.
  `docs/sources.md` is the bibliography, including sources we know of but have not read.
- **Say what is simplified.** Each hardware `.md` ends with a list of what the model gets wrong or
  leaves out. Add to it when you cut a corner.

## A place is built once and dated

A site outlives a flight: Mercury-Redstone 4 flew from the same pad eleven weeks after Freedom 7,
and the Cape round it is the same Cape for a decade of flights. So a site's hardware lives under
`sites/` as modules that know nothing of any flight, and a flight's `model/*.py` only chooses what
stood there on its day and how it was arranged. A later flight adds to the place and replaces what
had changed (a new gantry, a pad rebuilt, a car park paved); it does not copy it. When something
is built that did not stand there for every flight, record when it did (from, until, and how
sure) in the site's `.md`, so the next flight can tell what to keep.

## Adding a flight

1. Create `missions/<nation>/<programme>/flights/<flight>/` with the files above. Hardware that
   other flights will reuse (a booster, a pad, a suit) goes in the programme's `vehicles/`,
   `sites/` or `crew/`, with its own `.md`; the flight's `model/*.py` imports it.
   Record where it flew from: if the site is new, add `sites/<site>.ts` exporting a `SiteDef`
   (latitude and longitude in WGS 84 degrees, height above the ellipsoid, the bearing of the model
   frame's +X, the time zone kept that day, each with its confidence and source), set `site` in
   `flight.ts` from it, and state the computed Sun and Moon in the flight's README.
2. In each model script, name every top-level node (`srlib.group`) for a part; those names are
   the `node` fields in `flight.ts`. +Z is up in Blender and becomes +Y in the viewer.
3. Give each part a `summary`, a `detail` and a few `facts`. Write for someone choosing what to
   look at: what it is, why it is the way it is, one thing they would not have guessed.
4. Append the flight to `missions/index.ts` and add a `model:<flight>` script to `package.json`.
5. Add what you read to `docs/sources.md`.

## Conventions

- TypeScript strict; no framework. The UI is one class that renders from the flight's data.
- GLB materials are named in Blender (`shingle-rene41`, `tower-red`); the viewer keys on those
  names (`WORN` in `stage.ts`) rather than on mesh names.
- A setting's sky is its own scene and camera (`backdrops.ts`), drawn first, so it never shares
  depth with the model. The orbit setting (Earth at true angular size from 187.4 km) is not used
  by Freedom 7 at present, which stands on its pad; it is kept for flights shown in space.
- The page must work on a phone and a tablet: under 960 px wide (or 520 px tall) the data panel
  is a bottom sheet and the model keeps the space above it. Check 1280, 820 and 390 wide after
  changing `style.css`; nothing in the control block may be hidden at any of them.
- Parts leave as the hardware did. A part's `moves` (types.ts: `Move`) are swings, slides and
  drives, each on a named child node and each timed against the model's slider: platforms part,
  a structure rolls on its rails, a jib lowers, a truck folds its legs and drives off with its
  wheels rolling and steering. The model builds each moving piece as its own node with its origin
  on its hinge, in the pose it has at the start of the slider or at the hatch; `lc-5.md` tabulates
  them. Say in the part's text which motions are documented and which are not.
- A site has its own frame (the hatch on +X) and lies at an angle to the compass. Scenery is laid
  out on the compass and turned as one (`COMPASS` in `cape.ts`); the Sun is where it
  was: `src/world` computes it from the flight's `site` and `launch`.
- Every panel tucks away with the same chevron (title card, data panel, camera legend), H clears
  them all, and each of those choices, with Auto-orbit, is remembered between visits (`src/prefs.ts`).
  A new panel gets the same control and a `Pref`.
- C is the camera everywhere: off foot it steps through `CAMERA_MODES` (`viewer/fly.ts`: orbit about
  a subject, a free camera, or the chase camera, which turns about the flown vehicle and goes with it), on foot
  between first and third person. Each mode has its own block in the legend. T is the look.
- The front page (`title.ts`, the mark in `logo.ts`) is what an address that names nothing shows; it
  lies over the scene as it loads. Going in writes `#<flight id>/<model>`, so a refresh or a link
  comes straight back to that section; the Space Race crumb goes back out. V goes on foot as the
  crew from anywhere and back (the key that will board and leave a crew member in the simulator).
- Left alone, the page shows itself (`demo.ts`, the idle show): the clock runs the day round and
  the camera goes from one thing to the next with the panels away and a callout on each
  (`callout.ts`). It plays behind the front page, which gives way to it after half a minute; any
  touch ends it; a reload comes back to it. It reads only the flight's data, so a new flight is
  shown without being told how. Before any of it is seen the scene is warmed (`Stage.warm`): every
  level of detail and both day and lamp-lit shaders are built unseen, then the canvas fades up.
- Shortcuts use only keys every keyboard has: letters, digits, arrows. No Home, End, Page Up or
  function keys (a Mac laptop has none).
- The camera legend (bottom left) lists every key and gesture: keep it in step with the handlers
  in `stage.ts`. The line under it is diagnostics: loop rate, frames drawn, triangles, draw calls,
  and each model's level of detail.
- Selection has one rule: choosing a part flies to it; choosing an `inside` part also opens the
  cutaway, which closes again when the selection moves on unless the user opened it by hand;
  Escape or a click on nothing deselects and returns to the section's first view. With nothing
  selected a click on nothing does nothing: the camera is the user's.
- Views are framed in the part of the canvas the controls leave clear (`Stage.setInset`, fed by
  the UI's measurement), and framed again when the canvas changes shape.
- Small text uses `--faint` at the least, which is 4.5:1 on the glass. Do not go dimmer.
- `main` is protected by a ruleset: push directly, but no force-pushes and no deletion.
- Conventional Commits. No AI attribution in commits.
