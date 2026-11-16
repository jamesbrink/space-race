# Vostok 3: the mission as data

The record of the flight is in [README.md](README.md); this is how that record becomes `orbital.ts`, what it rests on
and what the simulator makes of it. The sources are Kamanin's diary for August 1962, Siddiqi's *Challenge to Apollo*
(pp. 354 to 361, Tables IA and IB), Chertok's third volume and the TASS reports as *Flight International* printed them
([docs/sources.md](../../../../../docs/sources.md), "Vostok 3 and Vostok 4"). The record and the plan are written on the
shared Vostok modules (vehicles/vostok-record.ts, vostok-plan.ts, vostok-8k72k.ts, vostok-3ka.ts): this flight is its
figures, nothing of code.

## What there is, and what there is not

- **Documented for this flight**: liftoff at 11:30:00 Moscow time, held "to within 0.5 s" (Kamanin, 14 August; Siddiqi,
  Table IA: 1130); **the third stage's cutoff at 687 s and the ship's separation at 720 s**, the count the bunker waited for
  (Kamanin, 14 August; Siddiqi, p. 356: "At T+687 seconds"); the ship's mass, 4,722 kg, and the orbit, 180.7 by 234.6 km
  at 64.98° (Siddiqi, Table IB and p. 356, "nominal"); Nikolayev's report to the State Commission of 16 August as Kamanin
  wrote it down (6 to 7 g going up, the ship oriented fifteen minutes before Vostok 4's launch and pitched 73° at 11:03,
  the burn heard for 42 s, 8 to 9 g in the entry, the reserve canopy locked); the pilot's landing at 3 d 22 h 22 min (09:52:
  Table IB) and the module's at 3 d 22 h 9 min 59 s (09:39:59: Glushko's encyclopedia, as Siddiqi gives it, p. 360, n. 29);
  that the burn was on the 65th orbit (Kamanin, 14 August); power for seven days, ten saved (Chertok, vol. 3, p. 205).
- **Published, with no source of its own**: the period, 88.33 min (Russian Wikipedia, beside Siddiqi's heights); the
  landing place, 48°02′ N 75°45′ E (Russian Wikipedia; spacefacts.de has 48°03′32″ N 75°41′02″ E).
- **Not found anywhere reached**: a cyclogram, a flight task or a range report of the ascent, so no other instant of it and
  not its third stage's integrator setting; the braking burn's minute; the ejection's time and height; the code of the
  ship's lock; the launch azimuth.

## The ascent: the type's, but for two instants

Every instant of the ascent but two is Vostok 1's record as it is flown (strap-ons at 119.5 s, the core's final stage from
290 to 300 s, the third stage lit at 300 s and cut on Vostok 1's integrator setting of 2,283.52 m/s), each `estimated`
and "NOT this flight's" in `orbital.ts`. The two that are this flight's are Kamanin's: the third stage's cutoff at 687 s,
which, the stage being cut on its integrator, is a **check** and not an input; and the separation at 720 s, an input. The
target is Vostok 2's planned perigee, 180 km (`assumed`: Siddiqi calls this orbit's 180.7 km nominal); the aiming azimuth
is Vostok 1's (`estimated`).

## The orbit

Over 64 revolutions the period sets where the ship is when the burn comes ("What the run gives"), so it matters more
than any other number in the flight. Every value of it found, and where each comes from:

| Period | With | From | What it is |
| --- | --- | --- | --- |
| 88.5 min | 183 by 251 km, 65° | Nikolayev at the press conference of 21 August 1962, "the initial duration of Vostok 3's circuit" (*Flight International*, 30 August 1962, p. 305); the film *Звёздные братья* draws the same heights | the orbit as announced, a primary source; its heights are not the determined ones below |
| 88.2 min | 176.7 by 227.6 km, 64°59′ | TASS, as of 12:12 Moscow time on 12 August (*Flight*, 23 August 1962, p. 289) | a determination a day into the flight, after a day's decay |
| 88.33 min | 180.7 by 234.6 km, 64.98° | Russian Wikipedia's box, which names no source | **a published figure of unknown origin**: not in Siddiqi (Table IB gives no period), the Great Soviet Encyclopedia (heights only), TASS or Kamanin |
| 88.5 min | 166 by 218 km | NASA NSSDC's catalogue, through English Wikipedia (its own page refused the connection) | the American tracking, at an epoch given before the launch: not used |

No primary source read gives the period with the determined heights, 180.7 by 234.6 km at 64.98° (Siddiqi, Table IB and
p. 356, "nominal"; the Great Soviet Encyclopedia, «Восток (космический корабль)», the same). **The record flies 88.33 min**,
chosen before the flight was flown: the one value printed with the heights it flies, standing as far under what those
heights give over a ball of 6,371 km (88.5 by Kepler's law) as Vostok 2's documented 88.46 does under its own (88.6). Its
`Measure` is `documented` (a published figure) and says it is of unknown origin. Flown, it and those heights are **not**
one determination: the apogee as flown round is 225 km, 9.5 km under the published 234.6 (88.5 min would give 233.5 km).
To fly another value now that the run has been seen would be to choose it by the outcome; the miss says what each would
do instead (src/sim/misses.ts `PERIOD_64`). The orbit is read as mean elements with a nodal period
(world/meanelements.ts); `orbit.radius` is then not used.

**What rests on Russian Wikipedia** (a published figure of unknown origin, each `Measure` saying so): the period, 88.33 min;
the landing place, 48°02′ N 75°45′ E (spacefacts.de, also unsourced, has 48°03′32″ N 75°41′02″ E, 5 km off; the Great
Soviet Encyclopedia says only "the region of Karkaralinsk, Karaganda oblast"); and through the landing place, the landing
ground's height and the checks across and along the track.

## The braking burn

Its minute was not found. The command is **derived** as Vostok 2's second reckoning was: the pilot's landing at 09:52 less
Vostok 1's 27.9 minutes from its command (10:25:04) to its pilot on the ground (10:53), which is 09:24:06 on 15 August. On
at the type's 3.7 s after it, off 42 s later (Nikolayev, by ear: derived), aimed as the type's from the Sun (`estimated`),
136 m/s (the type's integrator setting, `estimated`). The modules part the type's ten seconds after (`estimated`): nothing
read says they held together on this flight, or that they did not. The ejection is the type's barometric 7 km
(`estimated`), the main canopy the type's 4 km (`assumed`). Nikolayev locked his reserve canopy once the main had opened
(Popovich, in his report: "as Nikolayev did"), so the descent has none. The landing ground is 720 m up (SRTM at the two
printed places: `derived`).

## Each input that is not documented, and its argument

| Input | Figure | Confidence | Argument |
| --- | --- | --- | --- |
| Liftoff mass | 287 t | estimated | the type's (Vostok 1's record), E103-23's not found |
| Strap-ons' cutoff and separation, the core's cutoff and separation, the third stage's start, the fairing | 119.5, 119.5, 300, 300, 300, 154.6 s | estimated | Vostok 1's record as flown: no document of this ascent but Kamanin's two instants |
| The strap-ons' and the core's throttling | the type's reading | estimated | vostok-8k72k.ts `strapOnThrottle`, `coreThrottle` |
| Third stage's integrator setting | 2,283.52 m/s | estimated | Vostok 1's flight task: this flight's not published |
| Aiming azimuth | 34°37′59″.2 | estimated | Vostok 1's flight task |
| The law's turn, the vertical rise, the pitch-over, the climb at cutoff | 119.5 s, 15 s, 10 s, level | estimated | the type's (vostok-8k72k.ts) |
| Target height at the last cutoff | 180 km | assumed | Vostok 2's planned perigee (doc. 184 of 1961) |
| `orbit.radius` | 6,371 km | estimated | not used: the period fixes the axis |
| `injection.arc`, `injection.anomaly` | 27.5°, 0 | estimated | Vostok 1's reckoning; flying the ascent replaces them |
| Braking command, on, off | 09:24:06, +3.7 s, +42 s | derived | the pilot's landing less Vostok 1's 27.9 min; the type's 3.7 s; Nikolayev's 42 s |
| The burn's velocity change and aim | 136 m/s, along the line from the Sun | estimated | the type's (Chertok, vol. 3, p. 80; Vostok 2's programme) |
| The modules' parting | ten seconds after the burn | estimated | the type's (vostok-3ka.ts `PARTING`) |
| The descent module's mass; the pilot on his seat; with his pack | 2,272, 188, 131 kg | estimated | as Vostok 1's: Nikolayev's own mass not read |
| The ejection's height | 7 km | estimated | the type's barometric switch (Bobkov; Zak) |
| The main canopy's height | 4 km | assumed | the type's (Bobkov) |
| The landing ground's height | 720 m | derived | SRTM at the printed places |
| The lock's code | 145 | estimated | Vostok 1's |

The tests weigh each: tests/orbital.test.mjs (the coast's) and tests/staged.test.mjs (the ascent's) print what a change
in each moves.

## What the run gives

Tolerances were set before anything was flown (the record's own commit flew nothing). The ascent flies the day's air over
the pad (ERA5's column at the hour, `aloft.ts`, and the 1976 standard above it; the coast and the descent the standard and
calm). On the type's ascent, then the
published orbit from where it left the spacecraft (the handover the scene shows), then the descent:

| Check | Record | Run | Within | Why, if not |
| --- | --- | --- | --- | --- |
| Third stage cut off | 687 s ± 3 | 676.35 s | **miss** (−10.65 s) | cut on Vostok 1's integrator setting, as Vostok 1's was: this flight's setting or start differed |
| Greatest load going up | 6 to 7 g (by feel) ± 1 | 4.71 g | **miss** (−1.78 g) | the type's most, on the first stage; Titov felt no more than five |
| Perigee at the last cutoff | 180.7 km ± 5 | −265 km | **miss** | the type's ascent falls short, as Vostok 1's and 2's (155 m/s slow) |
| Apogee at the last cutoff | 234.6 km ± 10 | 180 km | **miss** | the same |
| Inclination | 64.98° ± 0.05 | 64.98° | yes | on Vostok 1's aiming azimuth |
| Period at the last cutoff | 88.33 min ± 15 s | 83.51 min | **miss** | the same as the perigee |
| Period, node to node, of the orbit begun | 88.33 min ± 2 s | 88.33 | yes | not independent: the orbit is read with it |
| Apogee as flown round | 234.6 km ± 5 | 219.6 km | **miss** (−15.0 km) | 88.33 min and the heights are not one determination; and where the type's ascent leaves the ship |
| Greatest load in the entry | 8 to 9 g ± 2 | 8.64 g | yes | |
| Landing across the track | 0 ± 25 km | −92 km | **miss** | the burn in the wrong place on the orbit (below) |
| Landing along the track | 0 ± 100 km | −916 km | **miss** | the period over 64 revolutions and four days of decay (below) |
| Descent module down | 09:39:59 ± 60 s | 09:44:37 | **miss** (+279 s) | it comes down 5.7 minutes before him where the record has twelve |
| Nikolayev down | 09:52 ± 2 min | 09:50:19 | yes | not independent: the burn is derived from it |

The coast from the estimated injection (tests/orbital.test.mjs): apogee 225 km (miss, −9.7 km), the entry's 8.59 g
(holds), and down 1,083 km short and 151 km across (misses). In the mean standard air it was down 1,576 km long and 16 km
across, and on the ball's continuum drag in orbit, until November 2026, 2,853 km short and 324 km across: four days of the
orbit's decay are worth thousands of kilometres along the track.

**Over 64 revolutions the period is everything.** Where the ship is when the burn comes is the published period carried
round 64 times, and a second a revolution is some 470 km along the track by the landing; the period is given to a hundredth
of a minute, 300 km. Flown on 88.33 min, on the ball's continuum drag in orbit, the
burn came over 30° S and the ship was down 2,853 km short; on TASS's 88.2 min of the next day it would have been 874 km long,
on 88.3 min 2,212 km short, on the announced 88.5 min 4,636 km short (weighed on the coast, November 2026, before the
joined ship's free-molecule drag: with it the record's 88.33 min comes down 1,083 km short in the day's air). No published
period holds the landing over four days. The air of August 1962 is flown as Jacchia's 1971 models give it from the days'
10.7 cm flux and Kp (world/thermosphere.ts: near the solar minimum, 0.55 to 0.9 of the 1976 standard's at 200 km); no
measure of that summer's air at these heights was read (King-Hele and Quinn 1965 is the one to read). Nothing is changed to bring it in (src/sim/misses.ts,
`PERIOD_64`).

## Four days in orbit

The coast runs four days from separation, 64 revolutions and a part, to the burn on the 65th: some 34,000 samples of the
coast at ten seconds. The record's marks in orbit (his sleep at 22:00, Vostok 4's launch below him at 11:02:33 on the 12th,
the ship oriented by hand for it and pitched 73° at 11:03, his waking at 04:40 on the 13th) are marks only: no period by hand
is given, since none has both its ends in the record.
