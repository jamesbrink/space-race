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

On the type's ascent in the day's air over the pad (ERA5, `aloft`), then the published orbit from where it left the
spacecraft (the handover the scene shows), then the descent; and the coast from the estimated injection. The coast flies
the ship's free-molecular drag in the thermosphere of the days' own Sun (Jacchia 1971 on 13 to 19 June 1963's indices).
Tolerances were set before anything was flown (the commit that added them flew nothing); TASS's orbit four days on was
added as a check after the physics agent's probe of that instant had been seen, and says so.

| Check | Record | Run | Within | Why, if not |
| --- | --- | --- | --- | --- |
| Perigee at the last cutoff | 174.7 km ± 5 | −238.0 km | **miss** (−413 km) | the type's ascent falls short of an orbit, as Vostok 1's and 2's (`SHORT_V5`) |
| Apogee at the last cutoff | 222.1 km ± 10 | 181.0 km | **miss** (−41 km) | the same: level at the 181 km asked for, and slow |
| Inclination | 64.96° ± 0.05 | 64.975° | yes | |
| Period at the last cutoff | 88.27 min ± 15 s | 83.74 min | **miss** (−272 s) | the same |
| Period, node to node, of the orbit begun | 88.27 min ± 2 s | 88.27 | yes | not independent |
| Apogee as flown round, from the injection | 222.1 km ± 5 | 220.8 km | yes | |
| Apogee as flown round, from the ascent's handover | 222.1 km ± 5 | 213.2 km | **miss** (−8.9 km) | begun 4 km lower, where the type's ascent left the ship |
| TASS, 15:00 on 18 June: perigee (coast; shown) | 159 km ± 5 | 163.3; 170.6 km | yes; **miss** (+11.6 km) | the shown run begun lower drags less at perigee |
| TASS, 15:00 on 18 June: apogee (coast; shown) | 193 km ± 5 | 197.4; 194.8 km | yes; yes | |
| TASS, 15:00 on 18 June: period (coast; shown) | 87.8 min ± 6 s | 87.91; 87.95 min | **miss** (+6.4 s); **miss** (+9.2 s) | below |
| Landing across the track (coast; shown) | 0 ± 25 km | −253; −263 km | **miss** | below |
| Landing along the track (coast; shown) | 0 ± 100 km | −3,314; −3,853 km | **miss** | below |
| Bykovskiy down | 14:06 ± 3 min | 14:03:52 | yes | not independent: the burn is timed from it |
| Descent module down | 13:58 ± 5 min (derived) | 13:57:51 | yes | |

The descent comes down at 22° N 40° E, in Arabia: what the descent itself gives (its times, 0.25 km between the ball and
the pilot) is the type's, flown from wherever the coast left it.

## Five days in the air

Eighty-one revolutions are flown: RK4 at 10 s above 150 km, J2, the thermosphere of the days' Sun, the ship's
free-molecular drag. The deck's clock goes up to an hour a second; faster than that the coast is flown on rails (world.md).

| | Run now | Run before (1976 mean air, the ball's continuum drag) | Record |
| --- | --- | --- | --- |
| 15:00, 18 June (T+96 h) | 163.3 × 197.4 km, 87.91 min | 174.7 to 222.5 km over the sea, 88.17 min | TASS: 159 × 193 km, 87.8 min |
| Landing | 3,314 km short, 253 km across | 5,647 km short, 1,263 km across | 53°24′ N 67°37′ E |

**The earlier reading is superseded.** Before, the coast flew the ball's disc at its continuum coefficient (Cd·A/m 8.1e-4
m²/kg) in the 1976 mean air with its table's last slope carried on above 200 km, and the orbit fell a quarter as fast as
TASS's; the checks of November 2026 (issue #15) found the coefficient, the area and the table, and the physics agent
corrected them: the ship's free-molecular drag on its own area, the 1976 table's upper rows, and the thermosphere of the
days' indices. With them the orbit at T+96 h is TASS's to 4 km in both heights.

**What is left is a tenth of a minute.** At T+96 h the run goes round in 87.91 min where TASS has 87.8, a miss of 6.4 s
against its tolerance, and that slowness carried round the last days is the landing's miss. As diagnoses, not inputs:

- the published period 0.05 min shorter (88.22 for 88.27) brings the landing to 86 km beyond the record's, and 0.05 min
  longer puts it 4,984 km short. The period is published to a hundredth of a minute (TASS, 22:12 on 14 June), so a
  twentieth is not its rounding; read as anomalistic or Keplerian rather than nodal, the nodal period flown would be
  longer still (88.277 or 88.308 min), the wrong way;
- the burn a minute later lands 408 km nearer, five minutes later 2,501 km (the burn's instant is derived from the pilot's
  landing: mission.md, "The braking burn").

What owns the rest (the drag area, the thermosphere's model on the day, the burn's derived minute) is not established.
Nothing is adjusted.

## What is simplified

- The ascent is Vostok 1's, not this flight's; the third stage's shortfall on the day is not flown.
- The thermosphere is Jacchia 1971 on the days' indices; the ship's drag area is the physics agent's, not measured.
- The hatches leave with the seat at 6,500 m, not 500 m before it.
- What made the ball tumble before the modules parted, and when they parted, is not flown: they part ten seconds after
  the burn.
