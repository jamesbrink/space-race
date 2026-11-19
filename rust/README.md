# Space Race, native

The same game as the web build beside it, in Rust: the same models, the same figures and their sources, drawn
and flown by a native engine. It is a proof of concept on a long-running branch. The first flight, Mercury-Redstone
3 (Freedom 7), is the only one here.

## Run it

```sh
pnpm install          # once: the model unpacker runs the web build's own code
pnpm rust:models      # once, and after any model is rebuilt: public/models/*.glb -> rust/assets/models/ (not committed)
pnpm rust:run         # build (release) and open the game; arguments after -- go to it
pnpm rust:check       # format check, clippy with warnings as errors, every test: must pass before a commit
pnpm rust:fmt         # rewrite files in place
```

In the Nix devshell the same are commands (`menu` lists them): `fly` builds and opens the game, unpacking the
models first if they are not there (`fly --at 60`); `fly-dev` is the debug build; `fly-check`; `fly-models`.

Or from `rust/`: `cargo run --release -p space-race -- --help`. One frame to a file, to look at a change:

```sh
cargo run -p space-race -- --shot out.png --pose 200,6,60,14 [--at <seconds>] [--reference]
```

Rust 1.99.1 (`rust-toolchain.toml`; rustup fetches it). Run cargo from `rust/`: the toolchain and the linker
setting are found from there.

## What it stands on

| | | |
|---|---|---|
| Engine | [Bevy](https://bevy.org) 0.20 | macOS and iOS (Metal), Linux and Android (Vulkan), Windows (DX12), the web (WebGPU). Physically based atmosphere, HDR, temporal anti-aliasing, cascaded shadows, glTF. |
| Physics | [Avian](https://github.com/avianphysics/avian) 0.8, in doubles | Rigid bodies in the engine's own ECS, `f64` throughout: the flight goes 500 km down range. |

## Structure

A Cargo workspace of small crates. Dependencies go one way, and `sr-hygiene` fails the build if they do not.

```
crates/
  sr-measure/    a number with its confidence and source                       no engine
  sr-world/      the Earth, a site's frame, time, the Sun, in doubles           no engine
  sr-sim/        thrust, air, drag, guidance, the flight integrated             no engine
  sr-missions/   flights and places as data (the port of missions/**/*.ts)      no engine
  sr-render/     the picture, a module to a thing drawn; knows no flight        Bevy
  sr-game/       the app: stage, rigs, clock, the flight as rigid bodies        Bevy, Avian
  sr-hygiene/    tests only: the rules below
apps/
  space-race/    the binary: reads the command line, opens the game
tools/           node: unpack-models.mjs (Draco off, the pad stood as at liftoff)
assets/          shaders; models/ is made by `pnpm rust:models`
```

`sr-measure <- sr-world <- sr-sim <- sr-missions` mirror `src/measure.ts`, `src/world/`, `src/sim/` and
`missions/`, so a figure and its source port one to one; change both builds together.

## Rules

The repo's rules hold here (`AGENTS.md`): every number carries a confidence and a source; nothing is fitted, and
a miss against the record is written down (`sr-missions`, each flight's `MISSES`, held by a test to what the
simulator makes); positions are doubles drawn from the eye. And for the code:

- `pnpm rust:check` must pass. `.githooks/pre-commit` runs its quick half on any commit that touches `rust/`
  (`git config core.hooksPath .githooks`; the Nix devshell sets it). CI runs it all (`.github/workflows/rust.yml`).
- **No god files.** No source file over 400 lines; a `lib.rs`, `mod.rs` or `main.rs` only declares and wires, 120
  lines at most. A function over 60 lines is a clippy error. Split by what a thing does.
- **One thing a module**, and every file opens with a `//!` line saying what it is for.
- `unsafe` is forbidden. No `unwrap`, `expect`, `panic!`, `todo!`, `dbg!` or `println!` outside tests.
- Clippy's `pedantic` set is on. A lint is switched off only in `Cargo.toml`, with its reason beside it.
- The pure crates never depend on the engine; `sr-render` never depends on a flight.

## What is simplified

- **Models are unpacked, not read in place.** Bevy's glTF loader does not read Draco, and every GLB requires it.
  `tools/unpack-models.mjs` decodes them with the page's own decoder; nothing else is changed.
- **The pad is stood as at liftoff by the unpacker**, by running the web build's own motions
  (`src/viewer/explode.ts`) at liftoff's place on the pad's slider. The native build does not play the morning.
- **The Earth is a sphere** through the site (the engine's atmosphere is one); the web build's is the WGS 84 ellipsoid.
- **The air is the 1976 standard atmosphere, still.** The web build flies each day's ERA5 column and its winds.
- **Gravity has no J2.** The frame turns with the Earth, so Coriolis and centrifugal accelerations are in.
- **The Sun is the Almanac's low-precision formula** (0.01 degrees), not DE440; UTC is taken for UT1.
- **The pilot's standing figure is not shown**: at liftoff he is aboard.
