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

Siddiqi's heights and inclination (Table IB), with **88.3 min**, TASS's of 12:12 that day, for the period: the only period
of this ship published, determined within its first revolution, chosen before it was flown. Russian Wikipedia's box repeats
Vostok 3's 88.33 for it, and Siddiqi gives none. Read as mean elements with a nodal period; `orbit.radius` is not used.

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

Tolerances were set before anything was flown (the record's own commit flew nothing). On the type's ascent, the published
orbit from where it left the ship, then the descent:

| Check | Record | Run | Within | Why, if not |
| --- | --- | --- | --- | --- |
| Perigee at the last cutoff | 179.8 km ± 5 | −205 km | **miss** | the type's ascent falls short, as Vostok 1's, 2's and 3's (136 m/s slow) |
| Apogee at the last cutoff | 236.7 km ± 10 | 180 km | **miss** | the same |
| Inclination | 64.95° ± 0.05 | 64.99° | yes | on Vostok 1's aiming azimuth |
| Period at the last cutoff | 88.3 min ± 15 s | 84.10 min | **miss** | the same as the perigee |
| Period, node to node, of the orbit begun | 88.3 min ± 2 s | 88.30 | yes | not independent |
| Apogee as flown round | 236.7 km ± 5 | 213.2 km | **miss** (−23.5 km) | 88.3 min and the heights are not one determination (11.6 km of it, as on the coast), and where the type's ascent leaves the ship |
| Landing across the track | 0 ± 25 km | +0.8 km | yes | |
| Landing along the track | 0 ± 100 km | +1,070 km | **miss** | the period over 48 revolutions (Vostok 3's `PERIOD_64`) |
| Descent module down | 09:46:33 ± 90 s | 09:52:41 | **miss** (+368 s) | down 5.8 minutes before him where the record has twelve, as Vostok 3's |
| Popovich down | 09:59:00 ± 2 min | 09:58:30 | yes | not independent: the burn is derived from it |

The coast from the estimated injection (tests/orbital.test.mjs): apogee 225 km (miss, −11.6 km), down 633 km long and 61 km
across (misses).

## Beside Vostok 3

The record has the two ships about 6.5 km apart (TASS) or about 5 km (both pilots) early in Vostok 4's flight; the check
(`NEAREST_VOSTOK_3`, set with this record) is 6.5 km ± 1.5, flown in tests/group.test.mjs from both records' coasts put in
one frame by the clock. Flown, the nearest in Vostok 4's first two revolutions is **234 km**, 47 minutes into its orbit: a
recorded miss (src/sim/misses.ts, Vostok 4's `group`). The records cannot hold kilometres: Vostok 3's place a day on is its
published period carried round sixteen times, and a hundredth of a minute of it is 75 km; Vostok 4's place at its cutoff is
the type's reckoning, 144 km a degree. That the second launch was timed to put it beside the first is the record; where each
ship was to that precision is in nothing read. Nothing is changed to bring it in.
