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
- **Searched for in November 2026 (issue #16) and still not found**: Lissov's article on this flight in *Novosti
  Kosmonavtiki*, named as the source for the range's times: there is none in 2011 Nos. 8, 9 or 10 nor in 2001 Nos. 8 or 9
  (Marinin's in 2011 No. 8 is the anniversary piece, read); No. 12 of 2011 would not open. RGANTD publishes Titov's
  «Полетное задание» (flight task) as new, but its images are in neither the page nor its captures: it is the best lead
  left for both the lock's code and the burn. **How the code reached him**: the plan of 4 August puts «шифр» among what
  went into his suit's pockets with the pistol and the knife (doc. 190, p. 177, item 5 o: planned, and «шифр» could be a
  radio table); Nosov, who designed the lock's circuits, recalls the code handed to the cosmonaut in an envelope once he
  was in the seat, the lock fitted only on Gagarin's and Titov's ships with a coding unit that could be changed (Tyapchenko,
  «Системы отображения информации космических кораблей «Восток» и «Восход»», 2006: a memoir). No number for this ship.
  **The burn**: nothing beyond Titov's 09:57 and 40 s (below); his 1977 book prints the morning of the 7th's exchanges
  («Коррекция 466 ... Время включения 3 часа 11 минут 19 секунд»; «8 часов 44 минуты, включился «Спуск-1»»), by his own
  clock and not resolved against it.

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
issue #8), its heights over the ball its heights and period imply (6,361.1 km, the ellipsoid under its injection's apsis):
the modules part at 56 km, 7 km at 10:10:06, **472 km short**
(the pilot down at 10:22:02; over the record's old ball, until November 2026, 58 km, 10:10:14, 422 km short and 10:22:10, the
ascent then cut 1.9 km further from the Earth's centre; on the ball's continuum drag in orbit in the mean air, until November 2026: 60 km, 10:10:25, 501 km short, 10:22:21). Flown round from where the ascent left it, the orbit so read crosses the equator northbound every 88.45 minutes,
the published period: at 11:48:45 and 17:42:34, where TASS has 11:48 and 17:42. Read as osculating at the cutoff, as until
November 2026, it went round in 88.66 minutes (11:49:09 and 17:43:46), fell four minutes behind the record's orbit over
seventeen orbits (its node opening the eighteenth at 09:58:55 against 09:54.9) and came down 1,493 km short; that was the
coast's error, which put 09:57 nearer, not the record's vindication. What is left of the miss is where the type's ascent
left the spacecraft and the burn's aim along the line from the Sun (`retro.aim`); it is recorded (tests/staged.test.mjs
`PHASE`), not tuned. The 09:57 run above was flown as osculating and has not been run again.

**The bundle's height at 10:07** (issue #23) is 61 km on the coast and 58 km on the run shown, against the reckoned 80
to 100. It is not the drag. Up to the parting the joined ship flies its free-molecule figure (`SHIP_RAREFIED`, 2.2 on
7.17 m²) bridged by the Knudsen number on its 2.43 m to the ball's continuum curve, at the whole ship's mass; what parts
flies only after the instant measured (the ball on its own figure, the instrument module not at all). Taking away the
free-molecule figure lifts it 3.6 km, the coast's drag until November 2026 2.8 km, and the mean air for the day's lowers
it 1.4 km. At a fixed instant the height belongs to the burn: 9 km for each minute it came later, 11 km lower if pushed
straight against the motion (the line from the Sun is 0.72 against it, 0.26 down and 0.65 across), 14 km higher on
120 m/s in place of the type's 136 (estimated). No instant of the burn meets the height and the landing together (0 along
the track wants it 69 s later, 71 km at 10:07; 90 km wants it 194 s later, 800 km long), and 10:07 is by the clock that
read the command at 09:57: by that clock the parting came 10 minutes after the command, where the run is at 126 km. No
physical correction has been found; the miss stands.

## The two periods by hand

`manual.periods`: 10:00 (the lock on in the shadow, the ship still in twenty seconds, the handle from 10:05, oriented by
10:15, held to five or seven degrees) to 11:00, left pitching; and 17:30 to 17:55 on the seventh orbit, vertical to twenty
degrees, not turned in yaw (doc. 192, pp. 185–187, 190–191). As flown, the flight deck gives the hands the attitude in
those two periods without the lock and the flight stays the record's; the record's drawing turns the ship to its orbital
orientation (the long axis back along the motion) over a minute and leaves it there when the period ends. The gas
bottles' pressures he read (160, 150, 135, 120 atm in the first; 110, 102 in the second) are not simulated: no jets,
no gas. How the lock's code reached him, and what it was, is in no document: the deck's lock takes Vostok 1's, estimated.

## What the run gives

On the type's ascent (tests/staged.test.mjs), then the coast flown on from the state it left the spacecraft in (one state from the pad: docs/agents/simulator.md, "One state"),
then the descent. Tolerances were set before anything was flown.

| Check | Record | Run | Within | Why, if not |
| --- | --- | --- | --- | --- |
| Greatest load, first stage | about 4.5 g (≤ 5, by feel) ± 1 | 4.72 g | yes | |
| Perigee at the last cutoff | 183 km ± 5 | 180.0 km | yes (−3.0 km) | the law's target |
| Apogee at the last cutoff | 244 km ± 10 | 230.4 km | **miss** (−13.6 km) | Block E is cut by the guidance where the orbit reached has the published period, its own integrator's setting not being known (misses.ts `OSCULATING`): what is read here is the osculating orbit at that instant |
| Inclination | 64°56′ ± 0.05° | 64.93° | yes | the law steers to it out of the plane of Vostok 1's aiming azimuth |
| Period at the last cutoff | 88.46 min ± 15 s | 88.25 min | yes (−12.4 s) | the same as the apogee; the orbit the ship is left on has the published period to a tenth of a second |
| Period, node to node, of the orbit begun | 88.46 min ± 2 s | 88.46 | yes | not independent: the published orbit is read as mean elements with this nodal period (issue #8) |
| Apogee as flown round | 244 km ± 5 | 249.0 km | yes | over the ball its heights and period imply |
| Height as the bundle burnt through, 10:07 | 90 km ± 15 (derived) | 54 km | **miss** | not the drag (3.6 km at most): the burn's instant, line and impulse, and Titov's clock (above) |
| Greatest load in the entry | about 10 g ± 2 | 8.38 g | yes | |
| Landing across the track | 0 ± 25 km | −11 km | yes |  |
| Landing along the track | 0 ± 100 km | −477 km | **miss** | PHASE |
| Descent module down | about 10:15 ± 4 min (derived) | 10:15:01 | yes | |
| Titov down | 10:18 ± 2 min | 10:22:02 | **miss** (+242 s) | the type's descent is slower than the record's clocks, as Vostok 1's |

The coast from the estimated injection (tests/orbital.test.mjs): apogee 243 km (holds), across −68 km, along −378 km
(misses), the bundle at 61 km (miss); read as osculating it was 262 km, −154 km, −1,427 km and 81 km.

The along-track figures above are as flown since the integrator's correction of 14 November 2026 (a burn that ends inside a
step delivers its whole impulse: docs/agents/simulator.md), which brought both landings some 17 km shorter. The 09:57 run's
figures (123 km, 10:15:56, 10:27:52, 395 km beyond) and the pilot's own time in the table were worked out before it and
have not been run again: expect each to have moved by a like amount.

## A day in orbit

Seventeen revolutions are flown, not one: the coast runs to six hours past the last thing planned (it ran six hours from
separation, and never reached a burn a day away). The deck's clock says the day of a time past midnight; the record's run
is some 9,000 samples of the coast at ten seconds, the scene's 11,000.
