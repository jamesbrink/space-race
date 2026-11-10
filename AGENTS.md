# Working notes for agents in this repo

SPACE RACE: every crewed spacecraft, modelled to scale in Blender and shown in three.js. Today it
is a viewer with one flight (Freedom 7). The goal is a simulator in which you fly the USA's, the
USSR's and later programmes from the historical record to the present, so **the models and the
numbers have to be right, and where they are not yet right the repo has to say so**.

This file is `AGENTS.md`; `CLAUDE.md` is a symlink to it. Sibling project `../lunar-lift` is the
earlier, single-mission take on the same idea (vanilla JS, toon-shaded, real orbital mechanics).

## Run it

```sh
pnpm install
pnpm dev              # Vite with hot reload, http://localhost:5180
pnpm typecheck        # tsc --noEmit, strict
pnpm build            # typecheck, then a production bundle in dist/
pnpm model:mr-3       # rebuild Freedom 7's GLB from its Blender script
pnpm models           # rebuild every flight's GLB
```

Models need Blender 5.x: `$BLENDER`, then `/Applications/Blender.app`, then `blender` on PATH.
It runs headless (`blender -b -P`); no Blender MCP or GUI is involved. Vite reloads the page when a
GLB under `public/` changes. `node tools/build-model.mjs <id> --preview <dir>` also writes EEVEE
stills, which is the quick way to look at geometry without the browser.

`window.sr` is the debug handle: `sr.stage.pose(azimuthDeg, elevationDeg, distance, targetY)` stops
the drift and places the camera exactly, for screenshots.

## Layout

```
missions/                             the record: one folder per nation, programme, flight
  index.ts                            the list of flights the viewer can show
  <nation>/<programme>/
    README.md                         the programme
    flights/<flight>/
      README.md                       the flight: what happened, timeline, sources
      spacecraft.md                   the ship: every dimension, how sure we are, what is simplified
      flight.ts                       the same facts as typed data (src/types.ts: Flight)
      model/build.py                  the Blender script that builds the spacecraft
public/models/<nation>/<programme>/<flight>.glb     built models (committed)
src/
  types.ts                            Flight, Part, Spec, Motor, Confidence
  main.ts  ui.ts  style.css           the page
  viewer/stage.ts                     renderer, lights, camera, picking, post-processing
  viewer/space.ts                     Earth, stars, Sun; the environment map; the wear texture
  viewer/explode.ts                   exploded-view motion
tools/
  build-model.mjs                     runs a flight's build.py through Blender
  blender/srlib.py                    shared geometry helpers for build.py scripts
```

A flight's id is its path: `usa/mercury/mr-3-freedom-7`. The same three segments locate its folder
under `missions/`, its GLB under `public/models/`, and its `pnpm model:*` argument.

## Rules that keep the numbers honest

- **Every number carries a confidence** (`src/types.ts`): `documented` (a published figure),
  `derived` (computed from documented ones; say how), `estimated` (read off photographs, or chosen
  to look right). Never promote an estimate by rewording it. The simulator will refuse to depend on
  `estimated` values, so the label is load-bearing.
- **One place per number.** A dimension lives in `model/build.py` (inches, as drawn) and is quoted
  in `flight.ts` and `spacecraft.md`. Change all three together; `build.py` prints the model's
  overall height and width on every build, and those two must match `flight.ts`'s `model` block.
- **Model in the source's units.** Mercury drawings are in inches; `build.py` keeps inches and
  multiplies by `IN` once. Soviet hardware will be in millimetres. Do not pre-convert.
- **Model the flight, not the type.** Freedom 7 is spacecraft No. 7: portholes, a bolted hatch, a
  beryllium heat sink. Friendship 7 is a different model with its own folder.
- **Say what is simplified.** Each `spacecraft.md` ends with a list of what the model gets wrong or
  leaves out. Add to it when you cut a corner.

## Adding a flight

1. Create `missions/<nation>/<programme>/flights/<flight>/` with the five files above.
2. In `build.py`, name each top-level node (`srlib.group`) for a part; those names are the `node`
   fields in `flight.ts`. +Z is the nose in Blender and becomes +Y in the viewer.
3. Append the flight to `missions/index.ts` and add a `model:<flight>` script to `package.json`.

## Conventions

- TypeScript strict; no framework. The UI is one class that renders from the flight's data.
- GLB materials are named in Blender (`shingle-rene41`, `tower-red`); the viewer keys on those
  names (`WORN` in `stage.ts`) rather than on mesh names.
- The backdrop is its own scene and camera (`space.ts`): the Earth is drawn at true angular size
  for 187.5 km and never shares depth with the spacecraft.
- Conventional Commits. No AI attribution in commits.
