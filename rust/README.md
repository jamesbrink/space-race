# Space Race, native

The same game as the web build beside it, in Rust: the same models, the same figures and their sources, drawn
and flown by a native engine. It is a proof of concept on a long-running branch. The first flight, Mercury-Redstone
3 (Freedom 7), is the only one here.

## Run it

```sh
pnpm install          # once: the model unpacker runs the web build's own code
pnpm rust:models:build # rebuild the native Freedom 7 vehicle, pad and May 1961 Cape surroundings from Blender sources (optional)
pnpm rust:models      # unpack rust/models/ where present, public/models/ for the rest, into rust/assets/models/
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
| N | the path ahead: where it is going if nothing more is done, its top marked (off at first) |
| K | the camera's shake (the engine's noise near it, the air's buffet aboard), on and off |
| I | the diagnostics: frames a second, the frame's time, what is in the scene (off at first) |
| F | every figure, or the few that matter |
| / | the keys, or one line saying where they are |
| H | put the panels away |
| M | the sound off, and on |
| - = | quieter, louder |

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

It is heard as well as seen, and there is no audio file anywhere: everything is synthesised from the flight's
state as it is flown (`sr-game/src/sound/`, the web build's rules: docs/agents/sound.md). What is heard left the
vehicle its distance over the speed of sound ago, so from across the pad the roar comes a fifth of a second after
the flame, and from further off later, lower and with its top taken by the air; it thins as the air does, and out
of the air nothing is heard but what the structure carries to the cabin. Each camera is a pair of ears: the pad's
and the tracking camera's stand on the ground, the chase camera's fly beside the vehicle in its wind, and the
onboard camera's are the pilot's, helmet on. A vehicle faster than sound is silent to anyone outside its Mach
cone, and the cone's passing is the boom. Nobody at the pad hears one, as nobody at the Cape did: the vehicle
leaves going away. The chase camera does. Beside the vehicle it simply loses the engine as Mach 1 is passed and
is left with the wind; turned to look up from behind and below, it keeps the engine until the cone closes past it
some seventy-seven seconds up, with a blow; and ridden down, it hears the capsule's own shock as it slows through
Mach 1 and again under the drogue, when the sea has sent it back up. Stopped, the flight is silent and the place
is not; faster than twice life it is a low bed and nothing that happens once is played. `--mute` opens with it
off.

Nobody building this can hear it, so it is measured: `cargo run --release -p sr-game --example hear -- --hear
out.wav --at -4 --keys 0:Space --until 60 --rig pad` flies without a window, as fast as it will go, and writes
what would have been heard, with `out.wav.txt` beside it (each second's level, peak and spectrum, how late the
engine's sound was arriving, and everything that happened once: what, when, how loud, from how far).

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
models/          committed native-tier Draco GLBs for Freedom 7 and its dated surroundings
tools/           node: build-models.mjs (four native sources), unpack-models.mjs (Draco off, the pad stood as at liftoff)
assets/          shaders; models/ is made by `pnpm rust:models`
```

`sr-measure <- sr-world <- sr-sim <- sr-missions` mirror `src/measure.ts`, `src/world/`, `src/sim/` and
`missions/`, so a figure and its source port one to one; change both builds together.

### Hardware surfaces

The native model build bakes colour, packed metallic/roughness and tangent normals in Blender's Python. Its UVs
follow the hull, sheets and rail faces in the construction frame. The pad and neighbouring complexes share
identical finish tiles by URI when unpacked. The packed sources keep every image inside its GLB.
The hardware records in the flight and site directories describe what was read from the photographs and what was estimated.

The oxygen skin carries its dry paint and national lettering in RGB and rime coverage in alpha. Set
`sr_render::materials::Frost::amount` from the flight clock (1 on a fully fuelled pad, 0 after shedding).
The renderer starts at 1 and thins the coating on the still-opaque skin. The shedding schedule belongs to the game.

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
  `tools/unpack-models.mjs` uses the page's decoder, drops the web cabin-shade channel and shares native finish tiles.
- **The pad is stood as at liftoff by the unpacker**, by running the web build's own motions
  (`src/viewer/explode.ts`) at liftoff's place on the pad's slider. The native build does not play the morning.
- **The Earth is a sphere** through the site (the engine's atmosphere is one); the web build's is the WGS 84 ellipsoid.
- **The air is the day's**: ERA5's column over the pad at the hour of liftoff (pressure, temperature and wind at
  38 levels to 49 km, a reanalysis and not a sounding), joined as the web build joins it and eased into the 1976
  standard atmosphere above. The wind is taken as blowing along the site's own east and north everywhere, and
  only the one hour is read: the surface's hours round it are not.
- **Gravity has no J2.** The frame turns with the Earth, so Coriolis and centrifugal accelerations are in.
- **The Sun is the Almanac's low-precision formula** (0.01 degrees), not DE440; UTC is taken for UT1.
- **The pilot's standing figure is not shown**: at liftoff he is aboard.
- **The land near the site is a designed ground** in the repo's palette (`docs/terrain.md`): what grows where
  follows the web build's rules, its roads and clearings are the place's own record, and its scrub stands as
  plants out to 400 m, taller clumps to 1.6 km. Its relief within 2 km of the site (beach, foredune, ridges and
  swales) is estimated, not surveyed, and beyond it the ground is a sphere. Plants stand round the site and round
  the stretch of open beach nearest it; elsewhere they are only painted. They nod in the wind by an estimated amount. The far complexes and the lighthouse are not
  here.
- **The sea is a sum of wave trains, not a simulation**: their slopes add up to Cox and Munk's for the wind. The
  Sun on it is worked apart from the engine's lobe, as Cox and Munk's Gaussian with each pixel's count of flashing
  facets drawn from it, so it sparkles near the eye and is the smooth glint from orbit; how curved a facet is (so
  how dense the sparkle) is estimated. The wind at the surface is taken to be the cumulus's drift, the swell is a
  constant from an assumed bearing, the windrows and the turbid band's width are estimated; lagoon and lake beds
  are one shallow tone; there is no sea ice.
- **A fire's shape is worked, its look is judged** (`docs/exhaust.md` reads it all together). Each motor's fire is
  a marched volume (`plume/`, `plume.wesl`) whose width, shock cells, core and spread in thin air come from its
  chamber and exit pressures by one-dimensional isentropic flow (`plume/jet.rs`: Prandtl and Pack's cell,
  SP-8072's core). How bright it is, its colours, its knots, how its streaks run (the gas passes far faster than
  a frame can follow: what is drawn is a slower beat) and the burning sheet it throws along the launcher are
  estimates, each named with the still it was judged on. The A-7's body is pale and seen through; its first
  knot is white and blooms, as on film. It adds its light to what is behind it and is not dimmed by smoke in
  front of it. The solid motors' chamber and exit pressures and their fires' colour were not found: estimates.
  The tower's jettison rocket is one nozzle, as the model has it (it had three). No heat shimmer. The
  posigrades' fire is drawn; their push is still the plan's single step of speed.
- **The air round the pad is a fluid on a coarse grid** (`fumes/`, `fumes_solve.wesl`): 220 x 50 x 120 m, the
  pad 60 m in from its upwind side, velocity, pressure, dust and vapour in 1.25 m cells,
  one step a frame of the clock's time since the last (longer when the clock runs fast; past about three
  times it falls behind). The jet's strike is fed to it from a ring no smaller than 3 m at no more than 45 m/s, where the
  real sheet is several times faster and a hand's breadth thick; eddies smaller than a cell are a repeating
  block of curl noise, and the picture cuts the fumes' edges with more noise. Nothing solid stands in the flow
  but the ground: the launcher, the vehicle and the gantry do not turn it. Once nothing feeds it the box drifts
  down the wind with what it holds, for five minutes; air near the ground, which the wind moves slower than the
  box, thins out of its upwind side, and the picture fades the fumes toward the box's sides and ceiling so no
  wall is seen. How much dust the apron gives up, how much of the exhaust's water condenses, the first fire's
  billow, the oxygen tank's vent, how long each hangs and how hot the sheet is are estimates set against the
  stills named in `mercury/fires.rs`.
- **The fumes are marched for one pixel in four and their billows are shaped, not solved** (`fumes/pass.rs`,
  `fumes_march.wesl`), on a grid of 1.25 m cells, one solver step a frame: the vapour's outline is the grid's eroded by repeating curl noise of three sizes into crisp
  knobs, and its inside never thicker than 5/m; both are estimates against the stills. The Sun through the fumes
  is marched 8 m and no further, the scattering orders after the first are a gain, the shaded side keeps three
  quarters of the sky's light, the apron's bounce is doubled for a thick billow, and the fire and its sheet light
  them as a point. Their shadow is cast by chance, texel by texel, into the Sun's own shadow maps (a stochastic
  shadow map); it falls on the ground, the models and the fumes, and is as grainy as the engine's shadow filter
  leaves it. No solid thing's shadow falls in the fumes (the march reads no shadow maps). The fire's light casts
  no shadows (each lamp's shadow map was the whole scene drawn again: over the frame's budget). The fumes do not shade the clouds' haze
  nor the fire. Where the temporal anti-aliasing cannot keep up with a fast-changing billow, faint diagonal
  grain from the quarter-rate march shows.
- **The glow coming back in and the collar near Mach 1 are estimates on worked figures** (`shock/`): the shock
  layer's thickness (Billig) and its colour (a black body at the simulator's gas temperature) are worked, how
  much light the gas gives is an upper estimate (no account of a visible glow on a suborbital Mercury entry was
  found); the vapour collar's shape, density and the Mach numbers and heights it is worn at are judged from films
  of other launches. One collar, at the capsule's rim.
- **A burst booster's cloud is forty puffs** (`smoke.rs`, `puff.wesl`), each a marched ball, thrown the same way
  every time; no fire is drawn in it. Frost shed at liftoff is the vapour only: the flecks of ice in the stills
  are not drawn.
- **The clouds are the record's numbers in an estimated shape** (`clouds/`, `clouds*.wesl`): the cover, bases,
  depth, size and wind are the flight's record; how the cumulus are laid out (a steep law of sizes, clumps and
  streets along the wind, a turret's height for its width), the moist air under and round them that makes their
  shadows visible in the air, the sky's light on them, the ground's under them and the gain for the scattering
  orders not marched are estimates, each labelled. Beyond 12 to 40 km the cumulus follow the day's map, and the
  altocumulus beyond 40 to 150 km; the deck's banks are ours. Far off the cumulus are not marched but read as a
  cover, so from orbit they are a soft field and do not show their turrets. The field is scaled by a measured trim
  so that it covers the record's tenth seen from above. They are marched for one pixel in nine and laid on by
  depth; motion vectors are written for them, but the cloud's own working on the clock is not in them. Moist air
  under the bases, denser than the station's visibility allows (an estimate, labelled), carries the clouds' shadows
  and light in the air; distinct shafts are still faint in stills. Crepuscular rays are added on the picture
  (`clouds/rays.rs`): an image-space approximation of in-scattering at scales the march does not resolve, not a
  measurement, its strength by eye. Cloud shadows fall on the land and the sea, not
  yet on the models.
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
- **Every loudness and every timbre is an estimate**, and `sound/figures.rs` lists each with where it came from.
  The engine's sound is half a per cent of its jet's power, peaking at a Strouhal number of 0.02 (NASA SP-8072's
  most probable values; the A-7's own was not found measured). The cabin's wall and the helmet are SP-45's design
  environment (150 dB outside, 130 inside, 110 at the ear). The air on the skin is Robertson's coefficients, with
  our guess at where the flow separates. The boom is Carlson's simplified prediction (NASA TP-1122) asked for what
  it was not made for (a camera sixty metres off, a body slowing through Mach 1), its two atmosphere factors
  taken as one. The cabin's fans, the bolts, the mortar, the wind and the surf are synthesised impressions: no
  recording was measured or used. Levels are squeezed two decibels to one, as the web build's are, since no
  loudspeaker does 150 dB and surf together; the last stage is a limiter that cannot pass full scale.
- **The sound's path is physics through a plain air**: late by distance over the speed of sound, inverse-square,
  Doppler, and nothing through a vacuum; but it goes in straight lines (no refraction and no wind, so no focused
  booms and no shadows), the air takes from it what ISO 9613 says sea-level air at 20 C does the whole way, the
  ground is a flat mirror, and only the crewed body is heard: the spent booster and the tower fall in silence. The
  jets hiss at one strength whatever the stick asks. The place's bed (wind, surf, a far hum) is the web build's
  for the Cape, which is an estimate there too.

## Not here yet

Walking and driving, the gallery, the Lineup and the front page, the map and the predicted path, the pad's
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
