# The world and the sky

Part of the agent notes: start at [AGENTS.md](../../AGENTS.md).

`src/world/` is pure TypeScript in doubles with no three.js, and everything in it is tested against
published values (`tests/world.test.mjs`: Meeus's worked examples and JPL Horizons). Read the header
of `frames.ts` before using a frame: it states every convention once. Lengths are metres and angles
radians, except that a place is recorded in degrees as published. A site's frame is the viewer's
and the model's: +Y up, +X on the site's stated bearing, +Z a quarter turn clockwise from it.

Nothing in the sky is placed by hand. A flight's `site` (types.ts: `SiteDef`, defined once in
`missions/<nation>/<programme>/sites/<site>.ts`) and the clock's instant give the Sun, the Moon
with its phase, the planets and the stars (`ephemeris.ts`); `viewer/heavens.ts` draws them and
`viewer/daysky.ts` derives the light's colour and strength, the sky's colours and the exposure
from the Sun's height. Positions, sizes and phase are computed; brightnesses are a model fitted by
eye and say so. Stated accuracy: Sun 0.006 degrees, Moon 0.008, planets 0.01 to 0.13; do not
quote better.

The stars are the whole Bright Star Catalogue (9,096, to magnitude 6.5 and a little past: `pnpm stars`
bakes `public/sky/stars.bin` and the 518 brightest into `stars.ts`, which are in the bundle for the
first frame). Each is carried along its proper motion to the clock's date (`starDirection`), then
turned by precession, nutation and the Earth's rotation (`j2000ToSite`): to 0.012 degrees against
the IAU's own routines at liftoff (tests/world.test.mjs; aberration is what is left out). From
orbit nothing more is done to them: the scene's frame turns with the Earth and the stars do not.
The Milky Way is NASA's map (`public/sky/milkyway.jpg`), in the same frame. Which stars show is
one rule (`daysky.ts`: `starLimit`): the ground's limit for the Sun's height, a magnitude fainter
for each 2.512 times less air above the eye, no further than the eye's own limit. How bright a
star is drawn against another is compressed for a screen and says so (heavens.ts).

The simulation clock (`world/clock.ts`, `sr.clock`, the time bar under the section switcher)
counts seconds from the flight's launch and is stopped at launch until run. A setting follows it
through `Setting.at(jdUT)`, which returns null unless something on screen changed, so a stopped
clock costs nothing and a running one redraws only as fast as the sky visibly moves. Anything new
that depends on the hour takes its instant from the clock and reports change the same way; it does
not read `flight.launch` or keep its own time.

Light must never step, at any clock rate (the idle show runs the night at 1200 times life).
Everything cheap (the light's strength and colour, exposure, the sky, the fog, the lamps) is set
every frame; of the two things that cost, the shadow map is drawn again whenever the light has
moved a twentieth of a degree, and the reflections are baked at a day's brightness, scaled to the
sky's every frame through `environmentIntensity`, and each new bake is faded in from the last
(`Reflections` in backdrops.ts). Where the Sun hands over to the Moon the one direct light passes
through nothing (daysky.ts), so shadows turn round unseen. Room lights are handed between rooms by
fading. A change to the light is checked by sampling a still view's mean brightness frame by frame
through dusk and dawn at 1200x: it should run one way, without jumps.

A model whose slider tells a sequence of events has a `sequence` (types.ts: `Keyframe`): the
instants, in seconds from launch, at which the slider reads each value, each with confidence and
source. The times are the record; where they fall on the slider is layout. Such a model is on the
clock (`world/sequence.ts`): its slider reads the clock, dragging it stops and moves the clock,
and running the clock plays the events at their own pace. Another section's `with` asks for an
instant (`at`), not a slider position. A slider without a sequence (the vehicle's exploded view)
is not time and is left alone.
