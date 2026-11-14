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

The burn is flown at **09:51:00 (derived)**: Vostok 1's burn began 70.7° of arc before its landing latitude; the same arc
before **the programme's landing latitude, 51° N** («с посадкой в начале 18 витка на территорию СССР на 51° с. ш.»:
doc. 194, p. 227) on this orbit's eighteenth revolution is 09:51 to 09:52. That is one stated derivation from the plan's
latitude, not from the landing place, and nothing else is moved: but the landing along the track is no longer an
independent check, and is marked so; across the track, the pilot's landing time, the burn-through's height and the
entry's load still are.

What 09:57 would give, flown once on the same record: PENDING.

## The two periods by hand

`manual.periods`: 10:00 (the lock on in the shadow, the ship still in twenty seconds, the handle from 10:05, oriented by
10:15, held to five or seven degrees) to 11:00, left pitching; and 17:30 to 17:55 on the seventh orbit, vertical to twenty
degrees, not turned in yaw (doc. 192, pp. 185–187, 190–191). As flown, the flight deck gives the hands the attitude in
those two periods without the lock and the flight stays the record's; the record's drawing turns the ship to its orbital
orientation (the long axis back along the motion) over a minute and leaves it there when the period ends. The gas
bottles' pressures he read (160, 150, 135, 120 atm in the first; 110, 102 in the second) are not simulated: no jets,
no gas. How the lock's code reached him, and what it was, is in no document: the deck's lock takes Vostok 1's, estimated.

## What the run gives

PENDING: the checks table, simulator against the record.
