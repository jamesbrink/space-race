# Sound

Part of the agent notes: start at [AGENTS.md](../../AGENTS.md).

`src/sound/` gives the flight, the place and the walk sound, with the Web Audio API and no audio
files: `sr.sound`. The speaker in the clock's row (or U) switches it, the volume is with the
clock's other controls, and both are remembered (`soundOff`, and the level `soundVolume`). Nothing
plays until the page has been touched, and a hidden page is suspended.

- **Numbers in one file, nodes in another.** `model.ts` is pure and tested (`tests/sound.test.mjs`):
  `mix(Hearing)` gives every gain, filter frequency, delay and Doppler factor from the run's
  sample, the engine's burn and where the ears are; `score` and `cueShots` give the events.
  `engine.ts` only sets AudioParams to them, so the same code plays live and renders offline
  (`sr.sound.offline(seconds, from, ears, riding)`). A new sound is a number in the model first.
- **It knows no flight.** The engine is the plan's: its thrust, specific impulse and exit area; the
  events are the run's own times, `Flight.flies.drops` by their `on`, and the retrorockets'
  `fires`; the vehicle is where `viewer/ascent.ts` puts it, the ears where the scene was last
  drawn from (`uOrigin`), riding when the camera is the chase camera.
- **Sound follows the clock, late.** What is heard at the clock's instant left the vehicle distance
  over the speed of sound earlier (`heardAt`), so the roar trails the flame, an event sounds when
  the heard instant passes it, and Doppler is how fast that instant runs. Stopped, the flight is
  silent and the place is not; above twice life it is a low bed without events (`gate`,
  `FASTEST`); a jump plays nothing it passed over, and the hardware's catch-up after one (the stretch before
  the new instant replayed at four times life: stage.ts `follow`, `catchingUp`) is seen and not heard: the site's
  machines fade out over 0.15 s as it starts and back in over half a second once it is done, their one-shots unplayed, the
  vehicle being driven heard throughout. Nothing is scheduled against wall time.
- **What is physics and what is not.** The path is physics: inverse-square, the air's absorption
  (ISO 9613-2, highs first), the delay, Doppler, the ground's reflection, and nothing airborne
  where there is no air (`carries`), so in space only what the structure carries to someone
  riding is left. The source levels are rules of thumb (half a per cent of the jet's power as
  sound; 0.006 of the dynamic pressure on the skin), the losses into the cabin are guesses, and
  every timbre is a synthesised impression: all `estimated`, and said so at the top of both files.
  A loudspeaker cannot do 140 dB and surf together, so levels are compressed two decibels to one
  (`loudness`): exact in `spl`, squeezed in what is heard.
- **The place's bed is the place's** (`PlaceDef.quiet`, which every place gives: wind, surf, a far hum at its own mains, `PlaceDef.mains`, 60 Hz at the Cape and 50 at Tyuratam, and the
  water round a spacecraft that has come down): the same anywhere
  on the site's ground and fading with height, and the surf is no louder toward the beach. A site
  inland has no surf and no sea: Tyuratam's was the Cape's until November 2026, and its surf was
  heard as a rocket before any engine was lit.
- **On the ground it is what moves** (`Works` in `model.ts`, the works bus). Every move says what drives it
  (`Move.machine`, a lift's `machine`: motor, winch, hydraulic, rails, locomotive, road, towed, skids, hand, lift,
  door, release, or `none` with why, each with its confidence); whatever poses a move tells `audio.ts`'s
  `machinery` how far along it is, and the sound hears the change: the slider, a hand and the clock alike. Still is
  silent; starting, running and stopping are a kind's own (`MACHINES`). At the wheel the walker makes no footfalls and
  no breath and reports `driving`; the engine is the vehicle's own (`PlaceDef.engines`, by the name its model or its
  move gives: which engine, its idle and its rated speed, each with its confidence, from the makers' manuals or reference works where found; where its gearbox's ratios are published
  (`Engine.gears`: the GAZ-21's and the GAZ-63's, documented) a driven vehicle changes up and its revolutions fall at each change, `gearOf`, the shift
  points estimated, and the rest are heard turning with their speed alone), its tyres on what is under each wheel (`PlaceDef.tread`: the models' material names; on the land, what
  the land is painted as there, a road, an apron, a track's bed, by the name its ground gives it, `GroundSpec.painted`,
  worked from the lines its shader draws, each with its confidence; else the land), a voice for each surface its
  wheels are on, as that surface's share of them. A driven vehicle's wheels are asked of the solids under each hub;
  one the slider or the clock moves is stood on what it runs on by `viewer/runs.ts`, which says what each wheel bears
  on (`Rider.under`). What rolls on jointed rails knocks over each joint, a wagon and Complex 5's structure alike, at
  the spacing its rails say (`Runs.joints`, with its confidence: 39 ft at the Cape, 25 m at Site 1, both estimated). A move with no machine is silent, and `tests/sound.test.mjs` names any at a site. Not done, and not faults: no cab insulation (the engine is heard
  as it is in the open), no Doppler on a passing vehicle and no echo of the ground, which are additions, each wanting a model of its own that no figure here could be put to. Distance,
  absorption and delay are the launch's path; every level and timbre is estimated.
- **What came to the spacecraft is heard** (`Flight.recovery`: Liberty Bell 7's helicopter): from where its track has it at
  the clock's instant (viewer/recovery.ts `craftAt`), on the record's run, while the clock runs at life's pace or near it
  (it is the flight's: stopped or hurried it is silent), a voice of the works for each part (`rotorcraftTimbres`): the main
  rotor's blades passing (their count times its rate, the craft's data), the tail rotor's, and a piston engine's firing
  (cylinders over two times its rate). From the seat (`SoundHost.inside`) it comes through the cabin's wall (`WALLED`, the
  cabin's loss), or through the hatch once it is gone (`OPENED`). It is not replayed after a jump, only put where the
  clock has it, so the hardware's catch-up does not hush it. Levels at a metre and timbres are estimated; no Doppler.
- **Measured, since an agent cannot hear.** `sr.sound.meter()` gives the output's level, peak and
  spectral centroid; the last stage is a soft clip that cannot pass full scale. `sr.sound.voices` is what the works
  play, slot by slot (`pnpm test:sound` reads it while driving, while machines run, and under Liberty Bell 7's helicopter). After changing a
  level, measure at the pad, liftoff, max q, apogee, entry and under the main, from the pad view
  and the chase camera.
