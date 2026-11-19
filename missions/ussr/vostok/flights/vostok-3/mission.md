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
| 88.5 min | 183 by 251 km, 65° | Nikolayev at the press conference of 21 August 1962, "the initial duration of Vostok 3's circuit" (*Flight International*, 30 August 1962, p. 305); the film *Звёздные братья* draws the same heights | the orbit as announced; its heights are not the determined ones below |
| 88.2 min | 176.7 by 227.6 km, 64°59′ | TASS, as of 12:12 Moscow time on 12 August (*Flight*, 23 August 1962, p. 289) | the orbit a day on, lower and faster by its decay: **a check at that instant**, not an input |
| 88.33 min | 180.7 by 234.6 km, 64.98° | Russian Wikipedia's box, which names no source | **ru.wikipedia, origin unknown, not flown**: not in Siddiqi, the Great Soviet Encyclopedia, TASS or Kamanin; it is what the heights give over the ellipsoid under the apsis, to 0.01 min (below) |
| 88.5 min | 166 by 218 km | NASA NSSDC's catalogue, through English Wikipedia (its own page refused the connection) | the American tracking, at an epoch given before the launch: not used |
| 88.54 min | 180.7 by 234.6 km, 64.98° | derived: the nodal period of the mean orbit whose axis is the heights' mean over the mean Earth, 6,371 km | flown until November 2026 |
| 88.34 min | 180.7 by 234.6 km, 64.98° | derived: the nodal period of the mean orbit whose axis is the heights' mean over the WGS 84 ellipsoid under the apsis, 6,361.1 km under the perigee at 63.05° N (world/meanelements.ts `meanOrbitOf`, no period; `CONVENTION.radius`) | **what is flown** |

**A change of source rule (November 2026).** A load-bearing number is `documented` only with a source that can be
traced, and 88.33 min has none. So the orbit is begun from what a traceable source gives for the initial orbit, the
heights and inclination (Siddiqi, *Challenge to Apollo*, Table IB and p. 356, "nominal"; the Great Soviet Encyclopedia,
«Восток (космический корабль)», the same heights), and no published period: the record leaves `period` out, its axis is
the heights' mean over the ball they are over, and its period is that mean orbit's, **derived**.

**A change of rule for the ball (November 2026).** Until then the heights were taken over the mean Earth, 6,371 km
(estimated), which gave 88.54 min. Heights published with no period, as these are, are now read as heights over the WGS 84
ellipsoid under the apsis the injection puts the perigee at (world/meanelements.ts `CONVENTION.radius`, **assumed**; a
flight that publishes a period is flown on the ball its own heights and period imply, sim/orbital.ts `heightsBall`): it is what the sister flights' own published heights and
periods require, each pair read as nodal giving the ball its heights stand on with no free figure (tests/apsis.test.mjs:
this flight's announced orbit and TASS's of the 12th each give 6,359.5 km; Vostok 2's, 4's and 6's 6,358.6 to 6,364.0;
the ellipsoid under the perigee every Vostok's record injects at, 63.05° N, is 6,361.1 km). Over it Siddiqi's heights give
**88.34 min**. The 88.33 min that was dropped for want of a source turns out to be what these heights imply on this
reading, to a hundredth of a minute; it is still not an input, and nothing here rests on it: the period flown is derived
from the heights. Three independent readings stand near it: the announced
88.5 min, the American tracking's 88.5, and this one from the heights; one unsourced 88.33 stands apart. The record's
checks of a period (at the last cutoff, and node to node of the orbit begun) went with 88.33: with no published period
there is none to hold.

**What each value does to the landing** (weighed on the coast in November 2026, before the drag in orbit was corrected):
88.2 min lands 874 km long, 88.3 min 2,212 km short, 88.33 min 2,861 km short, 88.5 min 4,636 km short. Over 64
revolutions a second a revolution is some 470 km along the track, and no period is known to better than a hundredth of
a minute (300 km): **the landing cannot be held by any period published**, and stays a recorded miss with that
sensitivity whatever it comes to (src/sim/misses.ts). How fast the orbit decayed is the other half: more decay over four
days shortens the period and brings the landing forward along the track. That is an expectation to be tested by the
TASS check at 12:12 on 12 August, not a target, and nothing is tuned to it.

**The landing place** rests on Russian Wikipedia, 48°02′ N 75°45′ E, a published figure of unknown origin (spacefacts.de,
also unsourced, has 48°03′32″ N 75°41′02″ E, 5 km off). Its one traceable source, the Great Soviet Encyclopedia, gives
only "the region of Karkaralinsk, Karaganda oblast", and the printed point lies 154 km south of the town: the latitude and
longitude are `estimated`, and the checks across and along the track hold them to 150 km either way, no tighter than that
region allows. Through them rest the landing ground's height. If a traceable source turns up (the FAI file, a Soviet atlas
of the landings), it replaces them.

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
| The ball the heights are over | 6,361.1 km | assumed | the WGS 84 ellipsoid under the apsis, the perigee where the injection puts it (63.05° N): the sister flights' heights and periods require it (tests/apsis.test.mjs). With no period it sets the axis: over the mean Earth the coast came down 3,124 km further short |
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

Tolerances were set before anything was flown (the record's own commit flew nothing; the TASS check of 12 August with
the source rule of November 2026, before it was flown). The ascent flies the day's air over the pad (ERA5's column at the
hour, `aloft.ts`, and the 1976 standard above it); the coast the joined ship's free-molecule drag in the air of the days'
Sun (world/thermosphere.ts), the descent the standard and calm. On the type's ascent, then the coast flown on from the state
it left the spacecraft in (one state from the pad: docs/agents/simulator.md, "One state"), then the descent:

| Check | Record | Run | Within | Why, if not |
| --- | --- | --- | --- | --- |
| Third stage cut off | 687 s ± 3 | 677.2 s | **miss** (−9.8 s) | cut by the guidance on the orbit flown for this flight, its integrator's setting not being known: the record's stage burned ten seconds longer, on a start or a vehicle that differed |
| Greatest load going up | 6 to 7 g (by feel) ± 1 | 4.71 g | **miss** (−1.79 g) | the type's most, on the first stage; Titov felt no more than five |
| Perigee at the last cutoff | 180.7 km ± 5 | 180.0 km | yes (−0.7 km) | the law's target |
| Apogee at the last cutoff | 234.6 km ± 10 | 218.7 km | **miss** (−15.9 km) | Block E is cut by the guidance where the orbit reached has the published period, its own integrator's setting not being known (misses.ts `OSCULATING`): what is read here is the osculating orbit at that instant |
| Inclination | 64.98° ± 0.05 | 64.98° | yes | on Vostok 1's aiming azimuth |
| Perigee at 12:12 on 12 August (TASS) | 176.7 km ± 5 | 175.5 km | yes | |
| Apogee at 12:12 on 12 August (TASS) | 227.6 km ± 5 | within 5 km | yes | flown on from the ascent's own state |
| Period at 12:12 on 12 August (TASS) | 88.2 min ± 6 s | 88.29 min | yes (+5.1 s) | over the mean Earth, until November 2026: 88.50, +18 s |
| Apogee as flown round | 234.6 km ± 5 | 237.3 km | yes |  |
| Greatest load in the entry | 8 to 9 g ± 2 | 8.64 g | yes | |
| Landing across the track | 0 ± 150 km (the region of Karkaralinsk) | −103 km | yes | over the mean Earth: −626 km |
| Landing along the track | 0 ± 150 km | −1,360 km | **miss** | the period over 64 revolutions and four days of decay (below) |
| Descent module down | 09:39:59 ± 60 s | 09:43:27 | **miss** (+209 s) | it comes down 5.7 minutes before him where the record has twelve |
| Nikolayev down | 09:52 ± 2 min | 09:49:38 | **miss** (−142 s) | the burn is timed from his landing, and from where it now comes he is down in 25.5 minutes, not Vostok 1's 27.9 |

The coast from the estimated injection (tests/orbital.test.mjs): TASS's orbit at 12:12 on the 12th holds in all three
(179.2 by 230.6 km, 88.29 min, 5.3 s long); apogee as flown round 235.5 km (holds), the entry's 8.63 g (holds), and down
1,540 km short and 186 km across (misses).

**Before and after the rule for the ball** (the same drag and air; over the mean Earth, then over the ellipsoid under the
apsis): from where the ascent left it, down 4,501 then 1,059 km short and 626 then 90 km across (which now holds),
Nikolayev 4.8 minutes late then 2.4 early; from the injection, 4,664 then 1,540 km short and 785 then 186 km across;
TASS's orbit of the 12th at 12:12, 175.8 by 235.6 km and 88.50 min then 175.5 by 233.8 km and 88.28 (from the ascent),
179.7 by 231.9 km and 88.50 min then 179.2 by 230.6 km and 88.29 (from the injection), where TASS has 176.7 by 227.6 and
88.2; Vostok 4's nearest approach to it, 1,768 km then 203 km, where TASS has 6.5 km. The period flown a day on is now 5 s
over TASS's rather than 18 s: still the way that says the orbit decays a little too little or began a little low.

**Before and after the source rule** (the same drag and air): on the untraced 88.33 min the ship came down 1,083 km short
and 151 km across, its apogee as flown round 9.7 km under the published, and Nikolayev 102 s early; on the heights' own
88.54 min over the mean Earth it came down 4,664 km short and 785 km across, its apogee within 1 km, and he was 4.8
minutes late (now 88.34 over the ellipsoid: above). The along-
track figure got worse and the apogee better; neither is chosen by: the landing over 64 revolutions cannot be held by
any period known to a hundredth of a minute, and stays a recorded miss with its sensitivity (src/sim/misses.ts,
`PERIOD_64`). TASS's period a day on, 18 s shorter than the one flown there, says the real orbit decayed faster or began
lower than flown: more decay would bring the landing forward along the track. That is to be tested when the drag in
orbit is next corrected, and nothing is tuned to it. The air of August 1962 is flown as Jacchia's 1971 models give it
from the days' 10.7 cm flux and Kp; no measure of that summer's air at these heights was read (King-Hele and Quinn 1965
is the one to read).

## Four days in orbit

The coast runs four days from separation, 64 revolutions and a part, to the burn on the 65th: some 34,000 samples of the
coast at ten seconds. The record's marks in orbit (his sleep at 22:00, Vostok 4's launch below him at 11:02:33 on the 12th,
the ship oriented by hand for it and pitched 73° at 11:03, his waking at 04:40 on the 13th) are marks only: no period by hand
is given, since none has both its ends in the record.
