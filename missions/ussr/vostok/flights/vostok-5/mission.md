# Vostok 5: the mission as data

The record of the flight is in [README.md](README.md); this is how that record becomes `orbital.ts`, what it rests on
and what the simulator makes of it. Sources in full: [docs/sources.md](../../../../../docs/sources.md), "Vostok 5 and
Vostok 6". Times are Moscow time (UTC+3), and seconds from liftoff at 14:58:58 on 14 June 1963.

## What there is, and what there is not

- **Documented for this flight**: liftoff (Siddiqi, p. 368: "1458 hours, 58 seconds"; McDowell), the ship's 4,720 kg
  (Siddiqi, Table IB), the orbit at the end of the fifth revolution (174.7 by 222.1 km, 64.96°: Siddiqi; TASS at 22:12:
  175 by 222 km, 88.27 min), the pilot's 90.7 kg in his suit (Kamanin, 7 May 1963), the landing on the 82nd orbit
  (Kamanin, 18 June) at 14:06 near Karatal (TASS; spacefacts.de's place), and **his report to the State Commission of 20
  June as Kamanin wrote it down**: the strap-ons hardly noticed, the third stage not felt lighting and heard stopping,
  snowflakes at the separation, the solar orientation seen, the braking engine smooth and 39 s by his count, a fast,
  disorderly rotation until the modules parted, no great loads, the hatch with a loud bang and the seat two seconds
  later, the ball 1.5 to 2 km from him.
- **Not found anywhere reached**: a cyclogram, a flight task or a range report of the ascent, so **no ascent instant of
  this flight**, nor why its third stage left the ship 6 km low at perigee and 13 km at apogee (Siddiqi's
  "less-than-nominal performance by the third stage" has no source); the braking burn's minute; the modules' parting;
  the ejection's time and height; the descent module's landing; the lock's code.

## Each input, and its argument

| Input | Value | Confidence | Argument |
| --- | --- | --- | --- |
| Every ascent instant, the integrator's 2,283.52 m/s, the aiming azimuth | Vostok 1's | assumed | Vostok 1's record, documented for that vehicle, taken for this one: the type's procedure, as Vostok 2's are (estimated there) |
| The last cutoff's target height | 181 km | estimated | TASS's first figures at liftoff, 181 by 235 km, read as the orbit asked for |
| Liftoff mass | 287 t | assumed | the type's |
| The orbit | 174.7 × 222.1 km, 64.96°, 88.27 min | documented | read as mean elements with a nodal period (world/meanelements.ts); the ball they are over (6,369 km, derived by Kepler's law) is not used once the period is |
| The injection's place | 27.5° round, perigee at the cutoff | estimated | Vostok 1's reckoning; flying the ascent replaces it |
| The braking command | 13:38:06 | derived | the pilot's landing at 14:06 less Vostok 1's 27.9 min from command to pilot on the ground (below) |
| The burn | 3.7 s to thrust, then 39 s | derived; documented | Vostok 1's 3.7 s; his 39 s |
| The burn's change of speed | 136 m/s | assumed | the type's integrator setting (Chertok, vol. 3, p. 80) |
| The modules' parting | 10 s after the burn | assumed | the type's sequence, as Vostok 6's report has it two days later; Siddiqi's late parting (no source) is not taken (below) |
| The ejection | 6,500 m | assumed | the type's design in OKB-1's report on Vostok 6 (RGANTD ф. 24, оп. 1, д. 14, л. 27): hatch at 7,000 m, the cosmonaut out at 6,500 m, 220 m/s. His two seconds from the hatch to the seat are those 500 m. The model lets the hatches go with him |
| The pilot and seat | 190.7 kg | derived | his 90.7 kg in his suit (documented) and Vostok 1's 100 kg seat |
| Supplies | 10 days | documented | Kamanin, 28 May: air and oxygen for ten days, for a flight of up to eight |
| The landing ground | 200 m | estimated | not read |

## The braking burn

No minute of it was found. Kamanin has the decision for the 82nd orbit (18 June) and Gagarin's «"Чайка" села — теперь твоя
очередь»; Chertok has the commands for both ships' automatic landing cycles sent "almost simultaneously" and "at 10
o'clock" (vol. 3, p. 223 and the Russian text), which cannot be this ship's burn: it landed four hours after Vostok 6's
pilot. The command is flown at **13:38:06**, the pilot's landing at 14:06 less Vostok 1's 27.9 minutes from the command
to its pilot on the ground (10:25:04 to 10:53). So **the landing along the track and the pilot's time are not
independent of the burn**, and are marked so. An alternative reading is from the record's time, 118 h 56 min 41 s: if it
ends with the pilot leaving the ship, as the commissioner's notebook ends Vostok 3's, he was out at 13:55:39, which with
Vostok 1's 19 minutes from burn to ejection is a burn about 13:36. The two readings are two minutes apart.

## What the run gives

On the type's ascent (tests/staged.test.mjs), then the published orbit from where it left the spacecraft (the handover
the scene shows), then the descent; and the coast from the estimated injection (tests/orbital.test.mjs). Tolerances were
set before anything was flown (the commit that added them flew nothing).

| Check | Record | Run | Within | Why, if not |
| --- | --- | --- | --- | --- |
| Perigee at the last cutoff | 174.7 km ± 5 | −201.6 km | **miss** (−376 km) | the type's ascent falls short of an orbit, as Vostok 1's and 2's (`SHORT_V5`) |
| Apogee at the last cutoff | 222.1 km ± 10 | 181.0 km | **miss** (−41 km) | the same: level at the 181 km asked for, and slow |
| Inclination | 64.96° ± 0.05 | 64.99° | yes | |
| Period at the last cutoff | 88.27 min ± 15 s | 84.10 min | **miss** (−250 s) | the same |
| Period, node to node, of the orbit begun | 88.27 min ± 2 s | 88.27 | yes | not independent: the orbit is read with this nodal period |
| Apogee as flown round, from the injection | 222.1 km ± 5 | 220.8 km | yes | |
| Apogee as flown round, from the ascent's handover | 222.1 km ± 5 | 213.3 km | **miss** (−8.8 km) | begun 3 km lower, where the type's ascent left the ship |
| Landing across the track (coast; shown) | 0 ± 25 km | −1,263; −1,097 km | **miss** | five days in the air: below |
| Landing along the track (coast; shown) | 0 ± 100 km | −5,647; −5,658 km | **miss** | five days in the air: below |
| Bykovskiy down | 14:06 ± 3 min | 14:08:06 | yes | not independent: the burn is timed from it |
| Descent module down | 13:58 ± 5 min (derived) | 14:02:04 | yes | |

The descent comes down at 2.2° S 27.2° E, in the Congo basin: what the descent itself gives (the 14:08 landing, 0.25 km
between the ball and the pilot) is the type's, flown from wherever the coast left it.

## Five days in the air

Eighty-one revolutions are flown, not one: the coast runs to six hours past the last thing planned, from the injection
to the burn 4 d 22 h 39 min later, on RK4 at 10 s above 150 km under J2 and the 1976 standard atmosphere (sim/orbital.ts
`flyOrbit`; no wind, no lift). The deck's clock goes up to an hour a second; faster than that the coast is flown on rails
(world.md, "Faster than an hour a second"). The record's run is some 43,000 samples of the coast at ten seconds.

**The orbit falls about a quarter as fast as the record's, and why is not established.** Reported, not checked: no check
of the orbit at an instant exists yet (issue #15 says what one would hold).

| | Run | Record |
| --- | --- | --- |
| T+7 h (22:12, 14 June) | 178.3 to 228.6 km over the sea, 88.26 min node to node | TASS: 175 × 222 km, 88.27 min |
| T+24 h (15:00, 15 June) | 177.7 to 227.5 km, 88.25 min | TASS: 173 × 219 km, 88.2 min |
| T+96 h (15:00, 18 June) | 174.7 to 222.5 km, 88.17 min | TASS: 159 × 193 km, 87.8 min |
| The orbit's life, from the injection (`decay`) | 10.1 days | Kamanin, 14 June: «до 11 суток»; Chertok: "did not exceed 10 to 11 days"; Kamanin, 18 June: «орбита „Востока-5“ быстро снижается, и полет более 5 суток небезопасен» |

So the ship comes round later each orbit than it did, and at the burn's instant it is over the Southern Ocean at 60° S.

The same coast flown with its drag area two, three, four times as great, **as a diagnosis and not as an input**, has at T+96
h 170.5 to 215.0, 165.1 to 205.7, and 157.5 to 193.2 km and 87.72 min (TASS's), and comes down 5,191, 3,784 and 30 km
short. So the miss is the coast's drag. What in it, checked so far:

- **The drag the coast flies.** Cd 0.92 (the entry curve's continuum value above Mach 6) on the ball's disc alone,
  4.155 m², on the whole ship's 4,720 kg: Cd·A/m 8.1e-4 m²/kg. In free-molecule flow a body has Cd 2.0 to 2.4 on its
  projected area, which for the ship is some 4.6 m² held along the motion and some 6 m² tumbling: 2.0e-3 to 3.1e-3, 2.4
  to 3.8 times the coast's. `decay` uses another figure again: `supplies.rarefied`, 2.0, on the ball's disc, 1.76e-3.
- **The density.** The 1976 table's own rows to 200 km (2.076e-9 kg/m³ at 150, 5.194e-10 at 180, 2.541e-10 at 200);
  above that its last slope carried on, 1.243e-10 at 220 km against the standard's some 1.4e-10, 11 per cent thin, and 18
  per cent at 230. Not a factor of four, and at apogee.
- **The heights flown.** The least radius is 6,542.4 km at 63.1° N, 173.4 km over the 6,369 km ball and 181.3 km over
  the sea there; the lowest point over the sea 178.5 km at 36.9° N. So the perigee flies 4 to 7 km above a published
  174.7 km read as over the ground: some 1.3 times thinner air at perigee.
- **The published orbit is the initial one**: TASS's 175 by 222 km is at 22:12 on the first day, Siddiqi's figures are
  "initial orbital parameters", and TASS's 181 by 235 at liftoff is the orbit asked for.
- **The Sun points the other way.** June 1963 was near the solar minimum, when the air at 160 to 220 km is thinner than
  the 1976 standard's mean, by something like a third to a half. With the standard's air the drag and the heights above
  would account for 3.1 to 5 times the run's decay; with the day's air thinner, 1.6 to 3.4. What is left is not found.

Nothing is adjusted; the misses are recorded (src/sim/misses.ts) at their sizes with the cause not established.

## What is simplified

- The ascent is Vostok 1's, not this flight's; the third stage's shortfall on the day is not flown.
- The coast drags the ball's disc on its continuum coefficient for five days (above); the day's air is not modelled.
- The hatches leave with the seat at 6,500 m, not 500 m before it.
- What made the ball tumble before the modules parted, and when they parted, is not flown: they part ten seconds after
  the burn.
