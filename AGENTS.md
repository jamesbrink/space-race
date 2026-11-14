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
pnpm test             # node --test tests/: the world, both simulators, the gait, the walk, every flight.ts against its GLBs
pnpm lint             # Biome (TS, JS, CSS, JSON) and Ruff (Python)
pnpm format           # rewrite files in place: Biome and Ruff (`nix fmt` does the same, plus Nix)
pnpm typecheck        # tsc --noEmit, strict
pnpm build            # typecheck, then a production bundle in dist/
pnpm model:mr-3       # rebuild Freedom 7's GLBs (vehicle, pad, crew) from their Blender scripts
pnpm model:mr-4       # rebuild Liberty Bell 7's GLBs (vehicle, pad)
pnpm model:ma-6       # rebuild Friendship 7's vehicle: spacecraft No. 13 on Atlas 109-D
pnpm model:ma-7       # rebuild Aurora 7's vehicle: spacecraft No. 18 on Atlas 107-D
pnpm model:ma-8       # rebuild Sigma 7's vehicle: spacecraft No. 16 on Atlas 113-D
pnpm model:ma-9       # rebuild Faith 7's vehicle: spacecraft No. 20 on Atlas 130-D
pnpm model:vostok-2   # rebuild Vostok 2's vehicle
pnpm model:gt-3       # rebuild Gemini-Titan 3's vehicle: spacecraft No. 3 on GLV-3 (a Titan II)
pnpm model:vostok-3   # rebuild Vostok 3's vehicle
pnpm model:vostok-4   # rebuild Vostok 4's vehicle
pnpm model:vostok-5   # rebuild Vostok 5's vehicle
pnpm model:vostok-6   # rebuild Vostok 6's vehicle
pnpm model:voskhod-1  # rebuild Voskhod 1's vehicle: 3KV No. 3 on its 11A57
pnpm model:voskhod-2  # rebuild Voskhod 2's vehicle: 3KD No. 4, the airlock folded under the fairing's blister
pnpm model:lc-5       # rebuild the place round the pad, each of its dated states (the site's own models)
pnpm model:site-1     # rebuild the place round Site 1's pad at Tyuratam
pnpm model:cape       # rebuild the neighbouring launch complexes (sites/cape.md)
pnpm models           # rebuild every flight's GLBs
pnpm globe            # bake public/globe/ again; pnpm globe:region bakes the site's region; pnpm globe:weather each flight's day's weather map
pnpm front:earth      # bake the front page's Earth (public/front/earth.*) from public/globe/ and the hour's cloud; pnpm front:moon its Moon
pnpm preview          # serve the production bundle
pnpm test:flicker     # needs `pnpm dev` running: z-fighting check in a real browser
pnpm bench            # what a frame costs, what the page weighs, how long it takes to open (docs/agents/rendering.md)
pnpm test:camera      # needs `pnpm dev` running: the camera driven with real input, its promises checked every frame
pnpm test:frozen      # needs `pnpm dev` running: a frozen stage draws the same frame twice, in both looks
pnpm test:places      # needs `pnpm dev` running: going between a flight's places with slow loads and real keys
pnpm test:history     # needs `pnpm dev` running: Back and Forward between the front page, flights and places, with real clicks
pnpm test:mem         # needs `pnpm dev` running: what the page holds on the GPU as a phone, against a budget (rendering.md, "Memory")
pnpm test:walk        # needs `pnpm dev` running: Site 1 walked on foot with the real W key, every way a person could have gone (walking.md)
pnpm test:front       # needs `pnpm dev` running: the front page: what it shows, going into a flight and back out, what it draws and holds
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

## Read before you touch

Detail lives in `docs/agents/`. Read the one for what you are about to change; each states its rules once.

| Before touching | Read | The rules in one line |
|---|---|---|
| Any file you cannot place | [layout.md](docs/agents/layout.md) | every file and what it is for; a flight's id is its path under `missions/`, `public/models/` and `pnpm model:*` |
| Models, materials, the renderer, the weather | [rendering.md](docs/agents/rendering.md) | the sky over a site is its flight's own day (`Flight.weather`), never a constant in a place's file; no two parallel faces within 1 mm (`check_clearance` fails the build), never a fixed near plane (`Stage.fitDepth`), positions are doubles drawn from the eye (`uOrigin`), anything that changes the screen sets `dirty`, anything put in the scene goes through `Looks.add`, a lower level of detail is a rebuild and never hand-edited; a change of level fades, never cuts; the Sun has two shadow maps and its depth bias is a length; nothing within the near plane is cut |
| `src/world/`, the sky, the clock | [world.md](docs/agents/world.md) | pure TypeScript in doubles, tested against published values; nothing in the sky is placed by hand; time comes from the clock; light must never step |
| `src/sim/`, the flight deck, flight effects | [simulator.md](docs/agents/simulator.md) | inputs are `Measure`s with confidence; nothing is fitted; a miss against the record is recorded in `MISSES`; the live simulator is the same physics, steered; the scene shows what was flown |
| The camera | [camera.md](docs/agents/camera.md) | one camera, a set of rigs; zoom never surprises; once the user takes the camera only an explicit act moves it |
| On foot: walk, gait, ragdoll, driving, actions | [walking.md](docs/agents/walking.md) | nothing there knows a flight; motion follows the gait and never a timer; a planted foot is planted; loose things tick at a fixed rate; a mission adds a verb as data |
| The gallery, a flight's places, the address bar, the front page | [gallery.md](docs/agents/gallery.md) | every flight has the same three places (Gallery, Launch site, Fly) and opens in its gallery; one it lacks is shown and says why, never hidden; the gallery is a second stage that shares nothing with the site's, which sleeps as it stands; only `address.ts` reads or writes an address; going to another flight or place is a step in the history, anything else rewrites the one it is on; old `#pad` links still land on the site; the front page is no flight's, picks none for the visitor, and holds nothing of a flight nor a flight of it |
| Sound | [sound.md](docs/agents/sound.md) | synthesised, no files; follows the clock; levels and timbres are estimated and say so |

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
  clean masses. The clouds are the exception: in the real look the cumulus are to look as fair-weather
  cumulus photographed (crisp knobbled tops, white toward the Sun, grey-blue flat bases, frayed where
  they are going), still on the record's cover, base and wind; the cel look draws the same field in
  two flat tones with an edge (clouds.ts).
- **Nothing breaks the spell.** No flicker, no clipping through walls or ground, no pops between
  levels of detail or between poses, no object that is a flat box up close. A lower level of detail
  is for distance only.
- **Performance is won without giving up quality.** What is near is drawn at the highest detail
  there is; frames are saved on what is far, hidden or unchanged (levels of detail, drawing only
  what changed, culling), never by making the thing in front of the viewer coarser.
- **The page gets out of the way.** Panels tuck, H clears them, and the world is the full window
  when walking.

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
   `flight.ts` from it, and state the computed Sun and Moon in the flight's README. Record the weather
   it stood under in a `weather.ts` beside `flight.ts` (types.ts: `DayWeather`: each layer of cloud, the
   wind, the visibility, at the station and hour nearest liftoff, each figure with its confidence and
   source), set `weather` from it and bake its map (`pnpm globe:weather`, which lists the flights): the
   site's sky is drawn from it ([rendering.md](docs/agents/rendering.md), "The weather is a day's").
   Without one the flight stands under its site's default sky, which is an estimate.
2. In each model script, name every top-level node (`srlib.group`) for a part; those names are
   the `node` fields in `flight.ts`. +Z is up in Blender and becomes +Y in the viewer.
3. Give each part a `summary`, a `detail` and a few `facts`. Write for someone choosing what to
   look at: what it is, why it is the way it is, one thing they would not have guessed.
4. Append the flight to `missions/index.ts` and add a `model:<flight>` script to `package.json`.
   A flight with only a vehicle (one model, `backdrop: 'studio'`) is complete enough to ship: it
   is in the Gallery, and its Launch site and Fly light up as they are built
   ([gallery.md](docs/agents/gallery.md)).
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
  them. Say in the part's text which motions are documented and which are not. Hardware that moved
  at its own times on a model whose slider takes it apart (the periscope's door) has `clocked`
  moves instead, in seconds from launch: the model is built as it stood at liftoff, the gallery
  shows it so, and the launch site and the flight play them on the clock.
- A site has its own frame (at Complex 5, +X square to the rails on the blockhouse's side) and lies at an angle to the
  compass; a vehicle that was laid on its azimuth by turning its launcher stands turned in it (`rotationY`, worked
  from the azimuth: sites/lc-5.parts.ts `launcherTurn`), and its pad is built turned to match. Scenery is laid
  out on the compass and turned as one (`COMPASS` in `cape.ts`); the Sun is where it
  was: `src/world` computes it from the flight's `site` and `launch`.
- Every panel tucks away with the same chevron (title card, data panel, camera legend), H clears
  them all, and each of those choices, with Auto-orbit, is remembered between visits (`src/prefs.ts`).
  A new panel gets the same control and a `Pref`.
- A switch looks like one: `class="switch"` with `aria-pressed` puts a lamp before its name, lit while it is on. Passing
  notes (`ui.say`, "Find the vehicle") go in the one stack under the clock (`Ui.notes`), never placed by hand; what is
  drawn on the view (the path's labels) lies under the panels and keeps off them (`Ui.panels`).
- The flight deck (`cockpit.ts`, `cockpit.css`) is three panels: the navball and path in the left corner, the primary
  figures and the one action (Space) in the middle, the systems as bars and lamps on the right; its keys fold to one
  line. Every key it shows is also a button that does what the key does (`data-do` a command, `data-hold` a key held
  while pressed, `data-press` the key itself, dispatched); only its panels take the pointer. It tells the stage how
  much of the view it covers (`Ui.covers`).
- C is the camera everywhere: off foot it goes to the next rig there is as things stand ("The camera"), on foot
  between first and third person. Each has its own block in the legend. T is the look.
- The front page (`front.ts`; its words `title.ts`, the mark in `logo.ts`) is what an address that names
  nothing shows, and is no flight's: the list of flights over a picture of its own, the Earth seen from out by
  the Moon at the instant a person first left it, the camera going slowly out (`front/`; gallery.md, "The front
  page"). Left alone, that is the show and nothing else starts; after half a minute its words make way for the
  picture, and come back at a touch. Going in names the flight (`#<flight id>/gallery`; its launch site is
  `#<flight id>/site/<model>`, its flight deck `#<flight id>/fly`), so a refresh or a link comes straight back
  to that place, and brings the flight's page up under the picture, which is let go when the flight is there to
  be seen. The Space Race crumb goes back out by opening the page again at the address that names nothing
  (`home.ts`). V goes on foot as the crew from anywhere and back (the key that will board and leave a crew
  member in the simulator).
- Left alone inside a flight, the page shows that flight (`demo.ts`, the idle show): the clock runs the day
  round and the camera goes from one thing to the next with the panels away and a callout on each
  (`callout.ts`). Any touch ends it; a reload comes back to it. It reads only the flight's data, so a new flight is
  shown without being told how. Before any of a site is seen the scene is warmed (`Stage.warm`): every
  level of detail and both day and lamp-lit shaders are built unseen, then the canvas fades up.
- No key acts under the curtain. While something is loading and its curtain can be seen, `curtain.ts` takes every
  key at the window before any listener hears it (keys with Command, Control or Alt, and releases, pass): a new
  shortcut needs no guard of its own, and must not be given a way round this one.
- Shortcuts use only keys every keyboard has: letters, digits, arrows. No Home, End, Page Up or
  function keys (a Mac laptop has none).
- The legend (bottom left, `legendMarkup` in `ui.ts`: one small table per rig) lists every key and gesture: keep it in step with the handlers
  in `viewer/camera/input.ts` and each rig's `keys`. It is a "? Keys" tab until asked for, then the essentials, with the rest
  behind "More" by purpose; a row wraps and is never cut short. The line under it is diagnostics: loop rate, frames drawn, triangles, draw calls,
  and each model's level of detail.
- Selection has one rule: choosing a part flies to it; choosing an `inside` part also opens the
  cutaway, which closes again when the selection moves on unless the user opened it by hand;
  Escape or a click on nothing deselects and returns to the section's first view. With nothing
  selected a click on nothing does nothing: the camera is the user's.
- Views are framed in the part of the canvas the controls leave clear (`Stage.setInset`, fed by
  the UI's measurement): the camera tips where it stands so the pivot is in the middle of what is
  clear (`aimBelow`), and a view nobody has taken is framed again when the canvas changes shape.
- Small text uses `--faint` at the least, which is 4.5:1 on the glass. Do not go dimmer.
- `main` is protected by a ruleset: push directly, but no force-pushes and no deletion.
- Conventional Commits. No AI attribution in commits.
