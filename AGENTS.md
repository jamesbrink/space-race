# Working notes for agents in this repo

SPACE RACE: every crewed spacecraft and its launch vehicle, modelled to scale in Blender and shown
in three.js. Today it is a viewer with one flight (Freedom 7 on its Mercury-Redstone). The goal is a simulator in which you fly the USA's, the
USSR's and later programmes from the historical record to the present, so **the models and the
numbers have to be right, and where they are not yet right the repo has to say so**.

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
  viewer/cape.ts                      Cape Canaveral: terrain, shore and surf, scrub, landmarks
  viewer/lod.ts                       levels of detail: which one each model is drawn at
  viewer/look.ts                      the real and cel-shaded looks, and the ink line
  viewer/walk.ts                      walking the site on foot: footing, collision, input, the eye camera
  prefs.ts                            what is remembered between visits
  viewer/space.ts                     Earth from apogee, stars; the wear texture
  viewer/explode.ts                   exploded-view motion
tools/
  build-model.mjs                     runs a flight's model scripts through Blender
  flicker-test.mjs                    browser check for z-fighting
  shot.mjs                            one screenshot of the viewer, for looking at a change
  blender/srlib.py                    shared geometry helpers, clearance check, run()
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
  is coarse: concrete 6 cm above such terrain flickered. So the terrain is one finely divided
  grid (`cape.ts`), it sits 0.45 m below the pad's surface (`GROUND_Y`), and anything standing
  on the ground goes down past that (`FOOTING` in `lc_5.py`).

`pnpm test:flicker` checks the result in a real browser: every model, every view, six
directions, looking for patches of pixels that swap when the camera turns 0.005 degrees.
`--shots <dir>` writes a map of any it finds. Run it after changing a model or the renderer.

## Drawing only what changed

`Stage.frame` skips the draw when nothing has changed: the camera has not moved and nothing set
`dirty`. Scenery that moves by itself (surf) is redrawn twelve times a second. So anything new that
changes what is on screen must set `this.dirty = true`, or it will show up late. The shadow map is
likewise drawn on demand (`shadowMap.needsUpdate`): set it when something that casts a shadow moves.

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
it and the camera flies back to that section. First person only: a crew model is a posed figure
with no skeleton, so there is nobody to show walking, and the figure is hidden while you are it.
Nothing in `walk.ts` or its hooks in `stage.ts` knows any one flight: keep it that way.

- **The figure comes from the flight's data.** It starts where the model stands (`position`),
  facing `walker.forward` (the model's own frame) turned by `rotationY`; `walker.eyes` names the
  node whose middle is the eye level, and the top of the model's bounds is its height, so both are
  as good as the model's `.md` says the model is. `walker.radius` is half its width (default 0.26 m).

- **The world is solid as posed.** `Solids` asks each mesh on show (every other model of the
  flight, its surroundings, the setting's scenery; not instanced plants) through its world matrix, with a `three-mesh-bvh`
  hierarchy built per geometry the first time something comes near. Nothing is baked, so a
  platform that has slid or a truck that has driven off is solid where it is this frame.
- **Feet and body are separate.** Rays straight down find the floor: anything up to `STEP`
  (0.3 m) above the feet is stepped onto, further down than that is a fall. A capsule from
  `STEP` above the feet to the top of the head is pushed sideways out of whatever it meets. So
  a model's stairs need risers of 0.3 m or less, and a ladder cannot be climbed. Space (a
  button on a touch screen) is a standing jump: 0.4 m under gravity, from the ground only, and
  the head stops at whatever is over it (`jump`, `bump`).
- **The terrain is a level, not a mesh.** It lies at the height of the setting's floor,
  everywhere, and cannot be fallen through. Where that is below the models' surface (`GROUND_Y`)
  it is so only for the depth buffer's sake, so from down there a riser is measured from y = 0:
  the edge of a pad is not a kerb.
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
seen and nothing is cross-faded. A model that is cut open is always drawn in full.
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

## Adding a flight

1. Create `missions/<nation>/<programme>/flights/<flight>/` with the files above. Hardware that
   other flights will reuse (a booster, a pad, a suit) goes in the programme's `vehicles/`,
   `sites/` or `crew/`, with its own `.md`; the flight's `model/*.py` imports it.
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
  out on the compass and turned as one (`COMPASS` in `cape.ts`); the Sun is placed by its real
  azimuth and elevation for the launch.
- Every panel tucks away with the same chevron (title card, data panel, camera legend), H clears
  them all, and each of those choices, with Auto-orbit, is remembered between visits (`src/prefs.ts`).
  A new panel gets the same control and a `Pref`.
- C is the camera everywhere: off foot it steps through `CAMERA_MODES` (`viewer/fly.ts`: orbit about
  a subject, or a free camera; a chase camera for a vehicle in flight will be a third), on foot
  between first and third person. Each mode has its own block in the legend. T is the look.
- The front page (`title.ts`, the mark in `logo.ts`) is what an address that names nothing shows; it
  lies over the scene as it loads. Going in writes `#<flight id>/<model>`, so a refresh or a link
  comes straight back to that section; the Space Race crumb goes back out. V goes on foot as the
  crew from anywhere and back (the key that will board and leave a crew member in the simulator).
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
