# Code hygiene

The rules every change follows, so that a fix lands once, for everything, and stays fixed. `pnpm hygiene`
(tools/hygiene.mjs) checks the mechanical ones; the git hooks in `.githooks/` run them before a commit and a push
(`pnpm install` points git at them: `core.hooksPath`); CI runs them in `pnpm check`. `SKIP_HOOKS=1` skips the hooks,
and the commit says why.

## What the hooks hold

| Hook | What it runs |
|---|---|
| pre-commit | Biome on the staged files (lint and format), Ruff on staged Python, `hygiene --staged` |
| commit-msg | Conventional Commits (`type(scope): subject`), and no line attributing the work to an AI |
| pre-push | `hygiene` over the tree, `tsc --noEmit`, the policy tests (names, layout, keys); a `wip/*` branch is let through |

## The mechanical rules (tools/hygiene.mjs)

- **No conflict markers, no scratch files.** A `<<<<<<<` left in a file, or a `tools/_probe.mjs`, `*.orig`, `*.rej`, fails.
- **No `console.log` in `src/`**, no `@ts-ignore` or `@ts-nocheck` anywhere, no `.only` in a test.
- **A TODO names its issue** (`#123`) or is done now.
- **Ratchets** (tools/hygiene-baseline.json): a file in `src/` longer than 1,500 lines, or a lint suppression anywhere, fails
  unless the baseline already holds that file at that size. The baseline only goes down: a sweep that splits a file
  runs `node tools/hygiene.mjs --write` and commits the smaller baseline; nothing raises it.
- Biome owns the rest of the code's form (`biome.jsonc`, recommended set: `noExplicitAny` among them).

## The patterns (judged in review; the mechanical rules cannot see them)

- **One rule, one place.** A behaviour is written once in shared code and every flight, vehicle and phase gets it from
  there. A fix found on one flight is made in the shared code and proved on all of them: its test loops over every
  flight (or one of each vehicle, when the behaviour is the vehicle's), never the one the bug was seen on.
  `tests/names.test.mjs` holds `src/` to naming no flight.
- **Every state the machine can reach is a state it handles.** A run that ends (back on the ground, broken up, parted,
  splashed down) ends everything that belongs to it: its engines out, its steps gone, its keys answered with what is
  left to do (fly it again, leave). The scene, the deck and the simulator read the one state and agree on it.
  A new terminal or degenerate state comes with a test that drives the deck into it by hand (keys mashed, staged early,
  cut at once) on every vehicle.
- **A bug fix carries the test that would have caught it**, run where the bug was seen (node test for the simulator, a
  browser suite for what is drawn), and fails on the code before the fix.
- **One thing per file.** A file does one job a reader can name; past 1,500 lines it is split by job (a deck's phases into
  `src/deck/phases/`, a viewer's parts into modules), not by line count.
- **No dead code, no second copy.** Code nothing calls is removed; code copied from one module to another is moved to one
  place and imported by both.
- **Data is data.** A flight is its records and its models; behaviour that differs between flights differs because their
  data does, never because code asks which flight it is.
- **Names say what a thing is**, in the repo's words (a stage, a joint, a burn), and a function's doc comment says what it
  returns and what it assumes.
- **Nothing is fitted, every figure carries its confidence** (AGENTS.md, "Rules that keep the numbers honest").

## Sweeps

A hygiene sweep works through `tools/hygiene-baseline.json` from the top (the longest files first), splits each by
job with no change in behaviour (`pnpm figures` bit for bit; the browser suites that touch it), and writes the smaller
baseline. Duplicated logic found on the way is moved to one place. Each split is its own pull request.
