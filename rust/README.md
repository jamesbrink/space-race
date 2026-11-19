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

## Fly it

It opens on the pad at T-12 s and the flight is yours: the count runs to zero and holds there until you light the
engine. Nothing is steered for you. The stick works what the vehicle had (the Redstone's jet vanes while its engine
burns and its air rudders while there is air; the capsule's jets anywhere), the air turns whatever is not held
against it, and Space does the next thing the flight needs, when you say: light the engine, let the tower go,
separate, fire the retrorockets, let the retropack go. The parachutes come out by themselves on the way down.

| | |
|---|---|
| W S, A D, Q E | pitch, yaw, roll |
| T | hold the attitude (the stick asks for a rate, and letting go stops the turn) or leave it free |
| Space | the next step of the flight |
| Z, X | the engine on, and off |
| B | abort: the engine is cut and the escape rocket pulls the capsule off the booster |
| G | on the pad: fly it as it was flown, hands off (and back) |
| P | stop the clock, and start it |
| `[` `]` | slower, faster: 1, 2, 4, 8, 16, 32, 64 times (`,` and `.` too) |
| C, or 1 2 3 4 | the camera: pad, tracking (a long lens on the ground), chase, onboard |
| drag, wheel | turn the pad and chase cameras; zoom all of them |
| L | the grade: Film (the game's own) or Reference (straight) |
| K | the camera's shake (the engine's noise near it, the air's buffet aboard), on and off |
| I | the diagnostics: frames a second, the frame's time, what is in the scene |
| H | put the panels away |

It is a rigid body in a physics engine. It stands on its launcher by its own weight, as a Redstone did; cut the
engine low and it falls back and breaks. The readout's Structure is how near it is to what it stands: turn its
nose far off the wind where the air is thick and the booster breaks up and throws the capsule clear, which can
still be ridden down; come back into the air too steeply and the load takes the capsule. Hit anything at more
than 12 m/s and the flight is over. A booster that breaks up with the tower still on fires the escape rocket for
you, as the abort system did; the tower then has to be let go (Space) before the parachutes can come out.

The ball at the foot of the window is the attitude: the sky and the ground as the nose sees them, north marked
red, a yellow ring where the vehicle is going and a green diamond where the record had the nose just then.
Where the record had the nose, and when it did each step, is on the pilot's panel too: flying to it is the game.
When the flight is over the panel is the debrief: your greatest height, range, speed at separation, load and
time, each beside Freedom 7's, and how hard you were on the structure.

`--at <seconds>` opens anywhere in the flight, flown as it was up to there (`--at 150 --rig chase` is the
separation, `--at 620` the main parachute); `--rate 8` opens with the clock running fast; `--bench` prints what a
frame costs once a second. A hand-flown flight can be scripted, to fly it again exactly or to take a frame of it:
`--keys 0:Space,18:W:9,140:X` presses Space as the count ends, holds W for nine seconds from T+18 and presses X at
T+140, and `--shot out.png --until 60` takes the frame when the clock reaches T+60.

The flight is tried without a window too (`flight/trial.rs`, in `cargo test`): it stands on its launcher under
its own weight, climbs as its thrust and mass say when it is lit, breaks up when it falls back, and flown as the
record has it the rigid bodies come down within one per cent of where the simulator's own integrator has them.

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
- **The land near the site is a designed ground** in the repo's palette over the region's shore map. The web
  build's painted relief, roads, plants, the far complexes and the lighthouse are not here.
- **The flame is two shells of light**, bright where they are seen squarely, not a marched volume; it lights the
  pad. The dust it raises is a few dozen soft puffs. Brightness, glare and dust are estimates and say so.
- **The cloud's light is part estimate**: the sky's light on it, the ground's albedo under it and the gain that
  stands for the scattering orders not marched are constants in `clouds.wesl` and `clouds/mod.rs`, each labelled.
  The cover, bases, depth, size and wind are the flight's record. The altocumulus is gathered into banks, which
  is ours. Cloud shadows fall on the land and the sea, not yet on the models.
- **By hand every strength is an estimate**: what the vanes, the rudders and the jets can do, how hard the air
  turns a body toward its trim and damps it, and how a parachute rights the capsule (`flight/attitude.rs`). They
  are angular accelerations, chosen so it handles as the reports describe; none is a measured moment, and the
  jets burn no peroxide. Flown as it was flown (G), the bodies are turned to where the record has them point.
- **The structure's limits are estimates** (`redstone::LIMITS`): bending as dynamic pressure times the angle off
  the wind (the web build's figure), and load in g (ours). No published limit for the Redstone has been found.
  Where the booster parts, and how its pieces are thrown, are ours. The parachutes do not tear.
- **The air's heat is the web build's model** (`sr-sim/src/heat.rs`): Sutton and Graves's flux at the stagnation
  point, and each surface one lump that takes its share and radiates. The shares, the emissivities and the
  limits are judgements and say so; nothing measured on the flight is there to hold them against. A surface past
  its limit takes its body with it.
- **What is solid**: each piece of the vehicle is a cylinder or a cone measured off its model, the land is level
  with the hardstand for 12 km each way round the pad, and the launcher is a drum under the tail. The gantry and
  the rest of the pad are not solid, the pieces of the vehicle do not strike each other, and beyond the land
  everything comes down at sea level. A body resists turning as one solid cylinder of its length would.
- **The propellant by hand** is what the engine passes in its nominal burning time (143.5 s); the web build runs
  the two tanks separately.
- **Parachutes are drawn from their documented diameters**; their lines' length and inflated shape are estimates.
- **Exposure follows height** (a stop less out of the air) rather than what is in view.

## Not here yet

Walking and driving, the gallery, the Lineup and the front page, sound, the map and the predicted path, the pad's
morning played on the clock, every other flight, the cel look, the web and mobile
builds (the engine supports them; none was built).

## What it showed

Measured on an M4 Max (halcyon), release build, the window at 3200 x 1800: **60 frames a second, vsync-capped,
from the count through liftoff** (`--bench`), with the atmosphere raymarched, both cloud layers marched at full
resolution with self-shadowing, temporal anti-aliasing, ambient occlusion, four shadow cascades and bloom all on.

- The engine does the hard parts the web build had to write and then ration: a physically based atmosphere that
  holds from the pad to 187 km, HDR end to end, cascaded shadows, temporal anti-aliasing.
- The same figures, ported with their sources, give the same flight: 200.1 km and 540 km here against 200.3 km
  and 534 km in the web build (the record: 187.4 km and 487.3 km), the miss written down in both.
- The models needed nothing redone: Draco off, materials finished by name.
- What it cost: Bevy has no Draco, so there is an unpack step; its shader language (WESL) reserves many common
  words; the engine's API moves every release.
