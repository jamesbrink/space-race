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
pnpm check            # typecheck, lint, format check: must pass before a commit
pnpm lint             # Biome (TS, JS, CSS, JSON) and Ruff (Python)
pnpm format           # rewrite files in place: Biome and Ruff (`nix fmt` does the same, plus Nix)
pnpm typecheck        # tsc --noEmit, strict
pnpm build            # typecheck, then a production bundle in dist/
pnpm model:mr-3       # rebuild Freedom 7's GLBs (vehicle, pad, crew) from their Blender scripts
pnpm models           # rebuild every flight's GLBs
pnpm test:flicker     # needs `pnpm dev` running: z-fighting check in a real browser
```

CI (`.github/workflows/pages.yml`) runs `pnpm check` and builds every push and pull request, and
deploys `main` to GitHub Pages at https://jamesbrink.online/space-race/. Pages serves from a sub-path, so
asset URLs are relative and go through `import.meta.env.BASE_URL`; never write a leading-slash URL
in `flight.ts`. The GLBs are committed, so CI needs no Blender.

Models need Blender 5.x: `$BLENDER`, then `/Applications/Blender.app`, then `blender` on PATH.
It runs headless (`blender -b -P`); no Blender MCP or GUI is involved. Useful flags on
`node tools/build-model.mjs <flight>`: `--only pad` builds one model, `--preview <dir>` also writes
EEVEE stills (the quick way to look at geometry without the browser).

`window.sr` is the debug handle: `sr.show('pad')` switches model; `sr.stage.shot(view, azimuth)`
frames a named view from a direction; `sr.stage.pose(az, el, dist, y)` places the camera exactly;
`sr.stage.setCutaway(true)` opens the cutaway. The address bar's `#vehicle` / `#pad` / `#crew`
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
    vehicles/  sites/  crew/          hardware shared by several flights: <name>.py builds it,
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
  viewer/stage.ts                     renderer, camera, picking, post-processing, depth range
  viewer/backdrops.ts                 the three settings: orbit, ground (the Cape), studio
  viewer/cape.ts                      Cape Canaveral: terrain, shore and surf, scrub, landmarks
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
with everything known about each part. A flight's `models` (in `flight.ts`) each have their own
parts, views, slider and setting, and can ask for the others to be shown alongside (the vehicle
stands on its pad; the pilot stands on the hardstand for scale).

## Cutaway and what is inside

The vehicle can be sliced open. A model script lists the meshes that enclose something in
`SHELLS` and calls `srlib.mark_shells`; the viewer clips those (one quadrant, facing the default
camera) and leaves everything else whole. So when you add an interior, build it as its own mesh
and do not list it; when you add skin, list it. A part marked `inside: true` in `flight.ts` opens
the cutaway when selected. Interiors are built only at detail 0.75 and above (`srlib.interior()`),
so a distant level of detail does not carry a pilot and plumbing nobody can see.

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
- **Nothing lies close above the terrain.** The ground setting's terrain is three strips laid
  edge to edge (never overlapping), each two triangles kilometres long. Depth interpolated over
  triangles that size is coarse: concrete 6 cm above them flickered. So the terrain sits 0.45 m
  below the pad's surface (`GROUND_Y`), and anything standing on the ground goes down past that
  (`FOOTING` in `lc_5.py`).

`pnpm test:flicker` checks the result in a real browser: every model, every view, six
directions, looking for patches of pixels that swap when the camera turns 0.005 degrees.
`--shots <dir>` writes a map of any it finds. Run it after changing a model or the renderer.

## Levels of detail

Models are generated, so a lower level of detail is a rebuild, not a remodel:
`blender ... -- --out x.glb --detail 0.3`. `srlib.DETAIL` thins every curve and, under 0.5, drops
fasteners. The inventory uses 1.0. When the simulator needs distant LODs, add them to
`build-model.mjs` as extra outputs per script; do not hand-edit geometry for them.

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
- Selection has one rule: choosing a part flies to it; choosing an `inside` part also opens the
  cutaway, which closes again when the selection moves on unless the user opened it by hand;
  Escape or a click on nothing deselects and returns to the section's first view.
- Small text uses `--faint` at the least, which is 4.5:1 on the glass. Do not go dimmer.
- `main` is protected by a ruleset: push directly, but no force-pushes and no deletion.
- Conventional Commits. No AI attribution in commits.
