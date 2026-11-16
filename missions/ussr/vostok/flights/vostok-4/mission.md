# Vostok 4: the mission as data

The record of the flight is in [README.md](README.md); this is how that record becomes `orbital.ts`, what it rests on
and what the simulator makes of it. The sources are Kamanin's diary for August 1962, Siddiqi's *Challenge to Apollo*
(pp. 355 to 360, Tables IA and IB), Chertok's third volume and the TASS reports as *Flight International* printed them
([docs/sources.md](../../../../../docs/sources.md), "Vostok 3 and Vostok 4"). The record and the plan are written on the
shared Vostok modules: this flight is its figures, nothing of code. [Vostok 3's mission.md](../vostok-3/mission.md) is the
twin of this one; where the two flights are alike the argument is made there once.

## What there is, and what there is not

- **Documented for this flight**: liftoff at 11:02:33 Moscow time (Siddiqi, p. 357 and Table IA; Keldysh on 21 August:
  11:02); the ship's mass, 4,728 kg, and the orbit, 179.8 by 236.7 km at 64.95° (Table IB, p. 357); TASS's elements as of
  12:12 that day, 177.9 by 234.8 km, 88.3 min, 64°57′ (*Flight*, 23 August 1962); the pilot's landing at 2 d 22 h 56 min
  27 s (09:59:00: Table IB) and the module's at 2 d 22 h 44 min (09:46:33, to the minute: Glushko, through Siddiqi, p. 360,
  n. 29); the burn on the 49th orbit (Kamanin, 14 August) within six minutes of Vostok 3's (Siddiqi, p. 360); the reserve
  canopy locked (Popovich's report, Kamanin, 16 August); woken at 04:53 on the 13th (Kamanin); the nearest approach to
  Vostok 3, about 6.5 km (TASS) or about 5 km (both pilots: Siddiqi, p. 358, n. 22).
- **Not found anywhere reached**: anything of the ascent (Kamanin: it «мало чем отличались» from Vostok 3's), so not even the
  third stage's cutoff the bunker counted the day before; the braking burn's minute and its length; the ejection's time
  and height; any load he felt; the lock's code; any time of the morning at the pad.
- **Contradicted**: Kamanin's 11:08 for the liftoff, against his own record of Nikolayev's report (pitched 73° at 11:03,
  looking for the launch) and every other source.

## The ascent: the type's

Every instant of the ascent is Vostok 1's record as it is flown (as Vostok 2's), `estimated` and "NOT this flight's", the
third stage cut on Vostok 1's integrator setting; the target is Vostok 2's planned perigee, 180 km (`assumed`).

## The orbit

Every value of the period found, and where each comes from:

| Period | With | From | What it is |
| --- | --- | --- | --- |
| 88.3 min | 177.9 by 234.8 km, 64°57′ | TASS, as of 12:12 Moscow time on 12 August 1962, an hour and ten minutes after the liftoff (*Flight International*, 23 August 1962, p. 289) | the only period of this ship from a traceable source, determined within its first revolution: **flown** |
| 88.33 min | (Vostok 3's orbit) | Russian Wikipedia's box for «Восток-4», which repeats Vostok 3's orbit | an error |
| 88.39 min | 179.8 by 236.7 km | recorded in this flight's README when it was first written as printed beside Siddiqi's heights; no page read now carries it | origin unknown: not used |

Siddiqi's heights and inclination (Table IB, p. 357; the Great Soviet Encyclopedia gives the same heights) with **TASS's
88.3 min**, chosen before the flight was flown; Siddiqi gives no period. Under the source rule Vostok 3's record now keeps
(its mission.md, "The orbit"), this one stays: the same communique that is a day on for Vostok 3 is seventy minutes after
this ship's launch, its first determination, so it is the initial orbit's period and an input, not a check. Read as mean
elements with a nodal period; `orbit.radius` is not used. As on Vostok 3 before, the period and the heights are not one
determination (the apogee as flown round comes out under the published one).

**The landing place** rests on Russian Wikipedia, 48°09′ N 71°51′ E, a published figure of unknown origin (spacefacts.de,
also unsourced, 48°10′ N 71°53′30″ E). Its one traceable source, the Great Soviet Encyclopedia, gives only "the region of
the settlement of Atasu, Karaganda oblast", and the printed point lies 61 km south of it: the latitude and longitude are
`estimated`, the check across the track holds them to 60 km and the one along it to the 100 km set first, no tighter than
that region allows. Through them rests the landing ground's height. A traceable source, when one turns up, replaces them.

## The braking burn

Derived as Vostok 3's: the pilot's landing at 09:59:00 less Vostok 1's 27.9 minutes from command to landing, 09:31:06 on
15 August; on 3.7 s after (derived), its length Vostok 1's 38.5 s of thrust (`estimated`: Popovich's is not timed), 136 m/s
along the line from the Sun (`estimated`). The modules part the type's ten seconds after; the ejection at the type's 7 km,
the main canopy at 4 km (`assumed`); no reserve. The landing ground is 600 m up (SRTM at the printed places: `derived`).

## Each input that is not documented, and its argument

As Vostok 3's table, but: the third stage's cutoff and the separation are the type's (677.08 and 687.08 s, `estimated`)
and so is `injection.at`; the burn's end is Vostok 1's 38.5 s (`estimated`) where Vostok 3's is its pilot's 42 s by ear
(`derived`); the landing ground is 600 m (`derived`). The tests print what a change in each moves.

## What the run gives

Tolerances were set before anything was flown (the record's own commit flew nothing). The ascent flies the day's air
over the pad (ERA5's column at 08:00 UTC, `aloft.ts`, and the 1976 standard above it); the coast the joined ship's
free-molecule drag in the air of the days' Sun (world/thermosphere.ts), the descent the standard and calm. On the type's
ascent, the published orbit from where it left the ship, then the descent:

| Check | Record | Run | Within | Why, if not |
| --- | --- | --- | --- | --- |
| Perigee at the last cutoff | 179.8 km ± 5 | −246 km | **miss** | the type's ascent falls short, as Vostoks 1 to 3's (149 m/s slow) |
| Apogee at the last cutoff | 236.7 km ± 10 | 180 km | **miss** | the same |
| Inclination | 64.95° ± 0.05 | 64.98° | yes | on Vostok 1's aiming azimuth |
| Period at the last cutoff | 88.3 min ± 15 s | 83.69 min | **miss** | the same as the perigee |
| Period, node to node, of the orbit begun | 88.3 min ± 2 s | 88.30 | yes | not independent |
| Apogee as flown round | 236.7 km ± 5 | 213.2 km | **miss** (−23.5 km) | 88.3 min and the heights are not one determination (11.7 km of it, as on the coast), and where the type's ascent leaves the ship |
| Landing across the track | 0 ± 60 km (the region of Atasu) | +36 km | yes | |
| Landing along the track | 0 ± 100 km | +2,398 km | **miss** | the period over 48 revolutions (Vostok 3's `PERIOD_64`, `PERIOD_48`) |
| Descent module down | 09:46:33 ± 90 s | 09:53:16 | **miss** (+403 s) | down 5.8 minutes before him where the record has twelve, as Vostok 3's |
| Popovich down | 09:59:00 ± 2 min | 09:59:04 | yes | not independent: the burn is derived from it |

The coast from the estimated injection (tests/orbital.test.mjs): apogee 225 km (miss, −11.7 km), down 2,344 km long and
8 km across (across holds; along misses).

**Before and after** (verify-s12's drag and air in orbit, and the day's air on the ascent): the landing along the track
went from 1,070 km long to 2,398 km long (the coast's from 633 to 2,344), worse, by the drag in orbit now flown; across
it holds as before (+36 km against +0.8, and now within 60 km where it was held to 25); the ascent at cutoff is 13 m/s
slower in the day's air (perigee −246 km, was −205); the module 35 s later; Popovich 4 s late where he was 30 s early.

## Beside Vostok 3

The record has the two ships about 6.5 km apart (TASS) or about 5 km (both pilots) early in Vostok 4's flight; the check
(`NEAREST_VOSTOK_3`, set with this record) is 6.5 km ± 1.5, flown in tests/group.test.mjs from both records' coasts put in
one frame by the clock. Flown, the nearest in Vostok 4's first two revolutions is **1,768 km**, as its orbit begins: a recorded
miss (src/sim/misses.ts, Vostok 4's `group`). On Vostok 3's untraced 88.33 min it was 234 km, 47 minutes in. The records
cannot hold kilometres: Vostok 3's place a day on is its period carried round sixteen times, now the one its heights give
(88.54 min), and a hundredth of a minute of it is 75 km; Vostok 4's place at its cutoff is
the type's reckoning, 144 km a degree. That the second launch was timed to put it beside the first is the record; where each
ship was to that precision is in nothing read. Nothing is changed to bring it in.
