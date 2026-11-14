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
- **It knows no flight.** The engine is the trajectory's thrust, specific impulse and exit area; the
  events are the run's own times, `Flight.flies.drops` by their `on`, and the retrorockets'
  `fires`; the vehicle is where `viewer/ascent.ts` puts it, the ears where the scene was last
  drawn from (`uOrigin`), riding when the camera is the chase camera.
- **Sound follows the clock, late.** What is heard at the clock's instant left the vehicle distance
  over the speed of sound earlier (`heardAt`), so the roar trails the flame, an event sounds when
  the heard instant passes it, and Doppler is how fast that instant runs. Stopped, the flight is
  silent and the place is not; above twice life it is a low bed without events (`gate`,
  `FASTEST`); a jump plays nothing it passed over. Nothing is scheduled against wall time.
- **What is physics and what is not.** The path is physics: inverse-square, the air's absorption
  (ISO 9613-2, highs first), the delay, Doppler, the ground's reflection, and nothing airborne
  where there is no air (`carries`), so in space only what the structure carries to someone
  riding is left. The source levels are rules of thumb (half a per cent of the jet's power as
  sound; 0.006 of the dynamic pressure on the skin), the losses into the cabin are guesses, and
  every timbre is a synthesised impression: all `estimated`, and said so at the top of both files.
  A loudspeaker cannot do 140 dB and surf together, so levels are compressed two decibels to one
  (`loudness`): exact in `spl`, squeezed in what is heard.
- **The place's bed is the site's** (`SiteDef.quiet`: wind, surf, a far hum, and the water round a
  spacecraft that has come down; `PLACE`, a site by the sea, where it gives none): the same anywhere
  on the site's ground and fading with height, and the surf is no louder toward the beach. A site
  inland has no surf and no sea: Tyuratam's was the Cape's until November 2026, and its surf was
  heard as a rocket before any engine was lit.
- **Measured, since an agent cannot hear.** `sr.sound.meter()` gives the output's level, peak and
  spectral centroid; the last stage is a soft clip that cannot pass full scale. After changing a
  level, measure at the pad, liftoff, max q, apogee, entry and under the main, from the pad view
  and the chase camera.
