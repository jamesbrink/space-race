# The world and the sky

Part of the agent notes: start at [AGENTS.md](../../AGENTS.md).

`src/world/` is pure TypeScript in doubles with no three.js, and everything in it is tested against
published values (`tests/world.test.mjs`: Meeus's worked examples and JPL Horizons; `tests/orbit.test.mjs`: Vallado's
examples and published orbits, for `orbit.ts`; the Earth's shadow there is held to geometry only, no published case having been found). Read the header
of `frames.ts` before using a frame: it states every convention once. Lengths are metres and angles
radians, except that a place is recorded in degrees as published. A site's frame is the viewer's
and the model's: +Y up, +X on the site's stated bearing, +Z a quarter turn clockwise from it.

A flight is flown in one frame, made once from its liftoff (`world/earthframe.ts`: `EarthFrame`, `frameOf(flight)`):
Earth-centred, not turning, with the Earth's angle in it at every instant (the sidereal time at liftoff and the steady rate
from there). Every simulator, the predictor, the decks and everything in the viewer that shows a run go between space and
the Earth through it (`toFixed`, `toInertial`, `place`, `up`), and what is of date (the Sun, published elements) comes in
through `fromDate`, so no two of them can take the Earth's angle differently. Two frames are offered: the inertial frame of
date, and that frame turned back about the pole to the Earth's axes at liftoff; gravity with J2, the air and the ground are
symmetric about the pole, so a flight is the same flight in either to rounding (tests/frame.test.mjs).

Time and the Earth's turn (`time.ts`, `frames.ts`; the header of each states it once). An instant is UTC, as a launch is
recorded. TT is made from it by the leap seconds (`taiMinusUtc`: SOFA's table, with UTC's steps and rate offsets of 1960
to 1971), so it is exact from 1960; JPL's ephemerides want TDB, TT to 1.7 ms (`barycentricTime`). UT1, the Earth's
turn, is UTC plus the IERS's measured UT1 - UTC (`universalTime`: EOP C01's UT1 - TAI every 0.05 year since 1956, baked
by `pnpm ut1` into `ut1.ts`, interpolated, plus TAI - UTC), within 4 ms of the IERS's daily series since 1962: 0.06
arcseconds of turn, 2 m at the equator. Before 1960 an instant is taken to be UT1 already; after the table's end its last
UT1 - TAI is held, drifting a millisecond or two a day. It moves no body's place (a second of TT is a kilometre of the
Moon; a second of UT1 is nothing of it), only where the ground is under the sky. The Earth's orientation is the
IAU's of 2006: the frame bias and the IAU 2006 precession (`icrfToDate`), the IAU 2000B nutation, and sidereal time from
the Earth rotation angle, to a milliarcsecond (2 m at the Moon), each held to SOFA's own test values. A flight is flown in
the frame of date at its liftoff (below), which turns against the ICRF by about an arcsecond in a week.

Bodies are general (`bodies.ts`). Each has its GM, its two radii, its pole and turn, and for the Moon and Mars its prime
meridian (`meridian`, IAU WGCCRE 2015: W = W0 + rate d, the periodic terms left out); `figureOf(body)` is the figure
frames.ts's geodetic functions and surface.ts work on when handed one (the Earth's is WGS 84's exactly and is the
default, so nothing on the Earth moves; the Moon is a sphere of 1737.4 km, Mars an ellipsoid of 3396.19 by 3376.20 km).
A site names the body it stands on (`SiteDef.body`, an id: `bodyOf`, the Earth unless given), and what falls there falls
by `gravityOn(body)`: standard gravity on the Earth, as everything on foot has fallen by, and GM / a^2 - w^2 a elsewhere
(the Moon 1.624, Mars 3.696: NASA's fact sheets give 1.62 and 3.69). On foot the walker, the limp body, what is carried
and the hose fall by it (walking.md), as the host says (`OnFootHost.gravity`): the stage says
`gravityOn(bodyOf(flight.site?.body))` (G0 on every site today, all being on the Earth).
Where the viewer takes the Earth as a sphere (the sky's three models, the clouds' shell, the horizon's dip, the sound's
sea falling away) it is one sphere, `EARTH_SPHERE` (the mean radius to the kilometre, 6,371 km); a point placed on the
Earth is placed on WGS 84, never on that sphere.

Nothing in the sky is placed by hand. A flight's `site` (types.ts: `SiteDef`, defined once in
`missions/<nation>/places/<place>/<site>.ts`) and the clock's instant give the Sun, the Moon
with its phase, the planets and the stars (`ephemeris.ts`); `viewer/heavens.ts` draws them and
`viewer/daysky.ts` derives the light's colour and strength, the sky's colours and the exposure
from the Sun's height. Positions, sizes and phase are computed; brightnesses are a model fitted by
eye and say so.

Two ephemerides answer, and each answer says which (`ephemerisOf`, `stateOf(...).source`). JPL's DE440 is baked
for 1957 to 2035 (`pnpm ephemeris`: tools/ephemeris-bake.mjs reads JPL's de440s.bsp and refits each body as Chebyshev
segments, measured against the kernel at points it did not fit; public/ephemeris/de440.bin, 0.9 MB; `world/jpl.ts`
reads it). It is fetched only when something asks, and a test hands it in (`useEphemeris`). Who asks: whatever makes a
flight's gravity terms with the Moon or the Sun in them, and any flight that leaves low Earth orbit, awaits
`loadEphemeris()` before it makes them (the terms take DE440 only if it is loaded then, and say `estimated` otherwise:
core/gravity.ts); nothing on the ground needs it. Once it is here the sky answers from it too, since the step is under a
third of a pixel (below). Then `stateOf(body, jdTT, centre)` gives a position and velocity in the ICRF, geometric, from the
Earth's centre or any body's or the solar system's barycentre; `toDate` turns one into the frame of date, and
`sunPosition`, `moonPosition` and `planetPosition` (what the sky and everything else asks) answer from it, apparent to
first order. Fitted accuracy against DE440: the Moon 6 m and 0.08 mm/s, the Earth-Moon barycentre 35 m, the Sun 0.4 km,
the planets 0.3 to 5 km. Against Horizons (DE441) the Moon's state at Apollo 8's and 11's translunar injection and lunar
orbit insertion is within 3.2 m and 0.012 mm/s, and the Sun and the Moon from five places within 0.2 arcseconds (5 at
J2000, which is UT1 - UTC) and 130 m of range (tests/ephemeris.test.mjs). Otherwise, before 1957, after 2035 or before
the file arrives, Meeus's series answer, labelled `Meeus` and `estimated`: the Sun to 0.01 degrees, the Moon 0.017 and
40 km, the planets 0.01 to 0.13 (mean elements), measured over the whole span; do not quote better.

The sky does not step when DE440 arrives. Over 1957 to 2035 the two agree to 0.0096 degrees for the Sun and 0.0162 for
the Moon (the test holds them to 0.01 and 0.017): a fifth and a third of the 0.05 degrees the light must move before the
shadows are drawn again, a third of a pixel at a 50 degree field on 1080 lines, and a change of light on any face of
under 2e-4, a twentieth of a level of 255. And nothing is redrawn for it: `Setting.at` asks the sky again only when the
clock moves, and the next answer is the new ephemeris's.

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

The Moon has a face (`world/moon.ts`): `moonAxes` is its own frame at an instant (+Z its north pole, +X the mean
direction of the Earth, as its maps are drawn), from Cassini's laws and Meeus's librations (chapter 53), and
`fromMoon` is where the Earth and the Sun stand over it, with the Earth's phase. Against Horizons at four dates from
1961 to 2024 the points of the Moon under the Earth and under the Sun are within 0.03 degrees (900 m of ground): do
not quote better. Heights on the Moon are above the sphere of 1,737,400 m.

The front page's sky is the same sky, from the Moon (`app/front/view.ts`, pure and tested: tests/front.test.mjs). Its
instant is data (`INSTANT`: Vostok 1's liftoff, as that flight records it) and everything follows from it: `skyAt`
gives the Earth, how it is turned, the Sun and the stars in the Moon's frame, which is that scene's. At the instant
the Earth is 88.7 % lit seen from the Moon and 1.985 degrees across; the point of the Earth under the Moon is 7.3 S
52.5 E and under the Sun 8.6 N 88.5 E; the point of the Moon under the Earth is 1.50 E 0.95 N and under the Sun
139.17 W 1.16 S. Its clock is its own, a minute of the world a second (`PACE`), running on from the instant for as
long as the page is open, and stopped at the instant for anyone who has asked for less motion. The camera's path is
a design and says so (`PATH`, every figure estimated): where the camera is follows from two numbers only, its height
over the Moon and how far the Earth's centre stands over the Moon's limb (`cameraFor`), so nothing in it is placed
by hand against a sky that moves.

The simulation clock (`world/clock.ts`, `sr.clock`, the time bar under the section switcher)
counts seconds from the flight's launch and is stopped at launch until run. A setting follows it
through `Setting.at(jdUT)`, which returns null unless something on screen changed, so a stopped
clock costs nothing and a running one redraws only as fast as the sky visibly moves. Anything new
that depends on the hour takes its instant from the clock and reports change the same way; it does
not read `flight.launch` or keep its own time.

Faster than an hour a second. `RATES` (1 to 3600, the time bar's) is what the clock steps through unless something lets
it go further: `clock.allow(100_000)` opens `COAST_RATES` (10,000 and 100,000: Apollo 11's 73 hours from injection to
the Moon in 2.6 s), and `clock.allow(3600)` or a reset closes them; `setRate` is held to `fastest`. At those rates a frame
is 170 s to half an hour of the world, so nothing may integrate the frame's span as one step: what is flown is flown on
rails, and the clock is told the next instant that must not be skipped (`clock.hold(t)`: a frame that would cross it
stops on it, and the rate goes back to 1, still running). On the ground they are not for offering: at 100,000x the day
passes in under a second. What the simulator must provide for a coast on rails (src/sim, not here; the note for whoever
builds it):

- `coast(state, t0, t1, gravity): state`: the adaptive propagator (sim/predict.ts `propagate`, a quiet flier: nothing
  burning, nothing scheduled) from `state` at `t0` to exactly `t1`, in the flight's frame, with the flight's gravity terms
  (core/gravity.ts, the Moon and the Sun from DE440: `loadEphemeris` resolved first). Called once a frame with the clock's
  span, however long; it steps by its own error, not by the frame, so 1,667 s in one frame at 100,000x costs a few dozen
  steps (it is a step of seconds to minutes in cislunar space), and it must end on `t1`, not past it.
- `due(t): number`: the next instant from `t` that must be lived at real time or flown in fixed steps (a burn's start, a
  separation, the Moon's sphere of influence if the central body is to switch, an entry interface), handed to
  `clock.hold`; NaN when there is none.
- `onRails(t): boolean`: whether the vehicle may be coasted now (no engine burning, no pilot input pending, above the
  air); while it is false the clock must not be allowed past 3600 (`clock.allow(3600)`), and the live fixed-step
  simulation goes on as it does now.
- Back off rails the state is handed to the live simulation as it stands at the clock's instant, so the hand-over is in
  place and velocity exactly where the coast left it.

Light must never step, at any clock rate (the idle show runs the night at 1200 times life).
Everything cheap (the light's strength and colour, exposure, the sky, the fog, the lamps) is set
every frame; of the two things that cost, the shadow map is drawn again whenever the light has
moved a twentieth of a degree, and the reflections are baked at a day's brightness, scaled to the
sky's every frame through `environmentIntensity`, and each new bake is faded in from the last
(`Reflections` in backdrops.ts). Where the Sun hands over to the Moon the one direct light passes
through nothing (daysky.ts), so shadows turn round unseen. Room lights are handed between rooms by
fading. A change to the light is checked by sampling a still view's mean brightness frame by frame
through dusk and dawn at 1200x: it should run one way, without jumps.

The weather over a site is its flight's own day (`Flight.weather`, types.ts: `DayWeather`; the rules are in
[rendering.md](rendering.md), "The weather is a day's"). Where the record has high cloud over the site the
light is that day's: the Sun's through it, the sky's with what the veil gives back, the haze and horizon
whiter, the veil itself lit by the Sun at its own height. Each is a smooth rule of the Sun's height (day.ts:
`veilShade`) worked out with the light in `Setting.at`, so it is held to the same check. Under 21 July's
veil, sampled each minute of the clock from 03:58 to liftoff on a frozen stage, in both looks, from the pad,
from 3 km and from 150 km: the sky runs one way in every view; the most any third of a view changes in a
minute is 9 levels of 255 (the sky toward the sunrise at 05:24 EST, as the veil catches the Sun a quarter of
an hour before it rises on the ground); what falls is only the ground under a cumulus's shadow as the Sun
climbs (3 levels a minute at most, 7 in the cel look's flat tones). The veil and the deck are lit from the
Sun's own direction, not the scene's one light's: that light is the Moon by night and points nowhere when
neither is up, and a veil lit by it had its glow in the wrong place until sunrise and then stepped.

The air aloft. A day's weather has its column (`DayWeather.aloft`: each level's pressure, height, temperature and wind,
each a Measure) and the surface's hours round liftoff (`DayWeather.hours`: wind, temperature, pressure). A sounding the
record has goes there `documented`; where none has been read, ERA5's at the hour nearest liftoff stands in, `derived`
(`pnpm era5:aloft`: tools/era5-aloft.mjs bakes `aloft.ts` beside each flight's weather.ts, the ground and the 37
pressure levels to 1 hPa, some 48 km, between the four quarter-degree cells round the pad, read by HTTP range from the
ARCO-ERA5 copy through tools/era5.mjs, which the front page's tools/front-earth.mjs shares). `world/aloft.ts` reads a
column at any height (`aloftAt`: temperature straight in geopotential height between levels, pressure on the power law
that meets both levels, which gives the 1976 standard back from its own layer bases to 1e-9; dry density; the wind in
its east and north parts) and the hours at any instant (`hourAt`); outside a column it answers nothing. Each column's
layers hold to the hypsometric equation within 2 per cent (tests/aloft.test.mjs).

What the simulator is to read (src/sim, not here; the note for whoever does it): the air at a height above the sea is
`aloftAt(flight.weather.aloft, height)` where that answers, and the 1976 standard's (`atmosphere`) where it does not
(below the column's ground, above its top, a flight with no weather), the run saying which (a figure that leans on the
column is `derived`, on the standard `estimated`). So that nothing steps at the top, the standard above it is scaled by
the column's density over the standard's at the top, the ratio easing to 1 by 70 km. The wind aloft is the record's own
sounding where it has one (`FlightPlan.winds`, sim/air.ts `blowOf`: `documented`), else the column's (`aloftAt(...).wind`),
else calm; at the pad, the hour's surface wind (`hourAt(flight.weather.hours, liftoff)`). Nothing is fitted to it: a
flight that misses more under ERA5's air than under the standard's says so in its MISSES.

What src/sim is still to do with the air, the ephemeris and the fast clock is tracked as GitHub issue #31.

Baking again. Each bake fetches its source once into a cache under ~/.cache/space-race (never committed; `--cache` moves
it), with a generic client name, and is deterministic, so a bake of the same source changes nothing:

- `pnpm ephemeris` (tools/ephemeris-bake.mjs): JPL's de440s.bsp, 31 MB, from ssd.jpl.nasa.gov, into `ephemeris/`;
  writes public/ephemeris/de440.bin (896 kB) and prints each series's fit, which the file's header keeps
  (tests/jpl.test.mjs holds them to the targets). `--check` fits and reports without writing; `--try id:days:degree`
  tries another segment length and degree. A longer span or another body is a change to its PLAN.
- `pnpm ut1` (tools/ut1-bake.mjs): the IERS's EOP C01 series, 330 kB, from hpiers.obspm.fr, into `eop/`; writes
  src/world/ut1.ts (8.7 kB). Run it now and then to carry UT1 past the table's last value (2026.80 when last baked).
  Should the IERS have revised a value under a flown date, it turns the Earth's angle at that liftoff, and `pnpm
  figures` moves (the predictor's figures at rounding, a Sun-aimed retrofire's landing by as much as the turn): run it
  on hal9000 and bless the fixture in the same commit.
- `pnpm era5:aloft [<flight id> ...]` (tools/era5-aloft.mjs): ERA5 from the ARCO-ERA5 copy on storage.googleapis.com,
  some 40 MB a flight read by HTTP range a Blosc block at a time (a whole pressure-level field is 85 MB an hour), into
  `era5/`; writes each flight's aloft.ts beside its weather.ts. A new flight's weather.ts imports it (`aloft`, `hours`).

A model whose slider tells a sequence of events has a `sequence` (types.ts: `Keyframe`): the
instants, in seconds from launch, at which the slider reads each value, each with confidence and
source. The times are the record; where they fall on the slider is layout. Such a model is on the
clock (`world/sequence.ts`): its slider reads the clock, dragging it stops and moves the clock,
and running the clock plays the events at their own pace. Another section's `with` asks for an
instant (`at`), not a slider position. A slider without a sequence (the vehicle's exploded view)
is not time and is left alone.
