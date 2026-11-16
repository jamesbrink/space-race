# Vostok 2: the mission as data

The record of the flight is in [README.md](README.md); this is how that record becomes `orbital.ts`, what it rests on
and what the simulator makes of it. The research behind it (every figure with its page and quotation) is in the
working notes of November 2026; the documents are «Первый пилотируемый полёт» (2011), book 2, docs 175 and 184 to 194.

## What there is, and what there is not

- **Documented for this flight**: liftoff (the FAI act, doc. 194: 06:00:00 UTC), the ship's mass (4,731 kg, the act of
  weighing), the orbit the Coordination-Computing Centre determined (183 by 244 km, 64°56′, 88.46 min: doc. 194, p. 224),
  the programme (doc. 187), Titov's report and answers (docs 192, 193: his two periods by hand, the burn as he timed it,
  the burn-through, the load, the reserve canopy), the pilot's landing (07:18 UTC at 50°51′ N 47°01.5′ E: doc. 194).
- **Not found anywhere reached**: a cyclogram, a flight task or a range report of the ascent (Marinin, *Novosti
  Kosmonavtiki* 2011 No. 8, written from the same documents, has none either), so **no ascent instant of this flight**,
  nor its third stage's integrator setting; the braking burn's instant (see below); the ejection's time and height; the
  descent module's landing; the lock's code.

## The ascent: the type's, not this flight's

Every instant of the ascent is Vostok 1's record as it is flown (strap-ons at 119.5 s, the core's final stage from 290 to
300 s, the third stage lit at 300 s and cut on Vostok 1's integrator setting of 2,283.52 m/s), each labelled `estimated`
and "NOT this flight's" in `orbital.ts`. What Titov felt stands beside each (loads from 30 to 40 s, not over five; the
third stage lit some ten seconds after the second left; separation about ten seconds after the cutoff). The aiming
azimuth is Vostok 1's, for a plane a minute of arc steeper. So the ascent's checks hold the type, flown on this flight's
target (the planned 180 km perigee: doc. 184) against this flight's orbit, and its misses are of the same class as
Vostok 1's (tests/staged.test.mjs).

## The braking burn

Titov gives one time: «В 9 час. 57 мин. прошла третья команда. Двигатель запустился» (doc. 192, p. 196; "about 9.57" in
his answers, p. 205), the engine 40 s by ear, the modules apart at 10:07. **09:57 cannot be the burn.** The documented
orbit, TASS's equator crossings (the second orbit ended 11:48, the seventh began 17:42) and his own two Globus fixes on
the thirteenth orbit (02:40 at 30° N 140° E, 02:43 at 40° N 152° E) all put the ascending node that opens the eighteenth
orbit at 09:54 to 09:55 on 7 August, so at 09:57 the ship was at 7 to 11° N, twelve minutes short of the landing latitude.

The burn is flown at **09:51:00 (derived)**, two ways and neither from the landing place:

- Vostok 1's burn began 70.7° of arc before its landing latitude; the same arc before **the programme's landing
  latitude, 51° N** («с посадкой в начале 18 витка на территорию СССР на 51° с. ш.»: doc. 194, p. 227) on the record's
  orbit's eighteenth revolution is 09:51 to 09:52 (the record research's track.py);
- the pilot's landing at 10:18 (the FAI act) less Vostok 1's 27.9 minutes from the command to the pilot on the ground
  (10:25:04 to 10:53) is 09:50.

Nothing else is moved. The landing along the track is not wholly independent of it (the programme's latitude), and is
marked so; across the track, the burn-through's height and the entry's load are.

Flown once at Titov's 09:57 on the same record, as the evidence: the modules part at 123 km at 10:07 (against the 80 to
100 km the entry then implies), 7 km at 10:15:56, the pilot down at 10:27:52 over 53.83° N 50.28° E, 395 km beyond the
record's landing. Flown at 09:51, the published orbit read as mean elements with a nodal period (world/meanelements.ts,
issue #8): the modules part at 56 km, 7 km at 10:10:08 over 48.10° N 43.75° E, **387 km short** (the pilot down at
10:22:04; on the ball's continuum drag in orbit, until November 2026: 60 km, 10:10:25, 501 km short, 10:22:21). Flown round from where the ascent left it, the orbit so read crosses the equator northbound every 88.45 minutes,
the published period: at 11:48:45 and 17:42:34, where TASS has 11:48 and 17:42. Read as osculating at the cutoff, as until
November 2026, it went round in 88.66 minutes (11:49:09 and 17:43:46), fell four minutes behind the record's orbit over
seventeen orbits (its node opening the eighteenth at 09:58:55 against 09:54.9) and came down 1,493 km short; that was the
coast's error, which put 09:57 nearer, not the record's vindication. What is left of the miss is where the type's ascent
left the spacecraft and the burn's aim along the line from the Sun (`retro.aim`); it is recorded (tests/staged.test.mjs
`PHASE`), not tuned. The 09:57 run above was flown as osculating and has not been run again.

## The two periods by hand

`manual.periods`: 10:00 (the lock on in the shadow, the ship still in twenty seconds, the handle from 10:05, oriented by
10:15, held to five or seven degrees) to 11:00, left pitching; and 17:30 to 17:55 on the seventh orbit, vertical to twenty
degrees, not turned in yaw (doc. 192, pp. 185–187, 190–191). As flown, the flight deck gives the hands the attitude in
those two periods without the lock and the flight stays the record's; the record's drawing turns the ship to its orbital
orientation (the long axis back along the motion) over a minute and leaves it there when the period ends. The gas
bottles' pressures he read (160, 150, 135, 120 atm in the first; 110, 102 in the second) are not simulated: no jets,
no gas. How the lock's code reached him, and what it was, is in no document: the deck's lock takes Vostok 1's, estimated.

## What the run gives

On the type's ascent (tests/staged.test.mjs), then the published orbit from where it left the spacecraft (the handover the
scene shows), then the descent. Tolerances were set before anything was flown.

| Check | Record | Run | Within | Why, if not |
| --- | --- | --- | --- | --- |
| Greatest load, first stage | about 4.5 g (≤ 5, by feel) ± 1 | 4.72 g | yes | |
| Perigee at the last cutoff | 183 km ± 5 | −202 km | **miss** | the type's ascent falls short, as Vostok 1's (SHORT) |
| Apogee at the last cutoff | 244 km ± 10 | 180 km | **miss** | the same |
| Inclination | 64°56′ ± 0.05° | 64.98° | yes (0.05) | Vostok 1's aiming azimuth, estimated: 64.99°, a miss, in still standard air; the day's wind turns it 0.01° |
| Period at the last cutoff | 88.46 min ± 15 s | 83.97 min | **miss** | the same as the perigee |
| Period, node to node, of the orbit begun | 88.46 min ± 2 s | 88.46 | yes | not independent: the published orbit is read as mean elements with this nodal period (issue #8) |
| Apogee as flown round | 244 km ± 5 | 245 km | yes | (read as osculating, as until November 2026: 265 km, a miss) |
| Height as the bundle burnt through, 10:07 | 90 km ± 15 (derived) | 56 km | **miss** | not found: the burn's aim the first suspect (as osculating: 79 km, within) |
| Greatest load in the entry | about 10 g ± 2 | 8.36 g | yes | |
| Landing across the track | 0 ± 25 km | −8 km | yes | (as osculating: −95 km, a miss: four minutes early on the coast) |
| Landing along the track | 0 ± 100 km | −387 km | **miss** | PHASE (as osculating: −1,493 km) |
| Descent module down | about 10:15 ± 4 min (derived) | 10:15:09 | yes | |
| Titov down | 10:18 ± 2 min | 10:22:04 | **miss** (+244 s) | the type's descent is slower than the record's clocks, as Vostok 1's |

The coast from the estimated injection (tests/orbital.test.mjs): apogee 243 km (holds), across −65 km, along −345 km
(misses), the bundle at 59 km (miss); read as osculating it was 262 km, −154 km, −1,427 km and 81 km.

The along-track figures above are as flown since the integrator's correction of 14 November 2026 (a burn that ends inside a
step delivers its whole impulse: docs/agents/simulator.md), which brought both landings some 17 km shorter. The 09:57 run's
figures (123 km, 10:15:56, 10:27:52, 395 km beyond) and the pilot's own time in the table were worked out before it and
have not been run again: expect each to have moved by a like amount.

## A day in orbit

Seventeen revolutions are flown, not one: the coast runs to six hours past the last thing planned (it ran six hours from
separation, and never reached a burn a day away). The deck's clock says the day of a time past midnight; the record's run
is some 9,000 samples of the coast at ten seconds, the scene's 11,000.
