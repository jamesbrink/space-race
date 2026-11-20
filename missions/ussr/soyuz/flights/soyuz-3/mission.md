# Soyuz 3: the mission as data

The record of the flight is in [README.md](README.md); this is how that record becomes `orbital.ts`, what it rests on and
what the simulator makes of it. Sources in full: [docs/sources.md](../../../../../docs/sources.md), "Soyuz 3 flown". Times are
Moscow time (UTC+3), and seconds from liftoff at 11:34:18 on 26 October 1968.

## What there is, and what there is not

- **Documented for this flight**:
  - liftoff to the second (Afanasyev and Vorontsov in «Мировая пилотируемая космонавтика», p. 87; McDowell), 11:34:18.4
    as the announcer read it (Mishin's diaries as Zak gives them);
  - the ascent's instants for Vehicle No. 10 (Mishin, via Zak): the strap-ons' command at 118.9 s and their separation at
    119.46 s, the fairing at 153.2 s, Block I lit at 288.46 s, the core's command at 289.71 s and its separation at 290.71 s,
    the aft section at 297.7 s (Zak's own question mark), Block I's cutoff command at 527.67 s. Zak prints them under the
    flight plan: whether they are the planned or the flown instants is not said;
  - the ship's 6,575 kg and its orbit at insertion, 183.5 by 222.2 km at 51.69° (Siddiqi, Table IB, p. 877): TASS's
    205 by 225 km and 88.6 min of the 26th are the plan's 204.3 by 225.0 km and 88.58 min (Mishin);
  - the orbit after the approaches, 179 by 252 km, 88.6 min (TASS, 27 October), and after the correction of the 28th,
    199.4 by 244.2 km, 88.81 min (Mishin; TASS's 199 by 244 km, 88.8 min; Siddiqi, p. 660);
  - what the main engine could still give, 170 m/s on orbit 35 and 160 m/s on 29 October (Mishin's tables), and the
    peroxide the approach burned (Kamanin, 26 and 29 October);
  - the three-second firing after an orbit held in the landing attitude (Kamanin, 29 October);
  - the braking burn from 09:45:05 for 149 s and 95 m/s (Kamanin's plan of the morning; Mishin's record, 09:45:05 to
    09:47:34; TASS's 145 s), the parachute system at 7 km at 10:12:24 (Kamanin) or 10:12:26 (Mishin, calculated), the
    touchdown at 10:25:03, 70 km north of Karaganda, 10 km short of the aim (Kamanin), 50.5° N 72.8° E (McDowell);
  - the type: the 11A511's table (masses, loads, engines, the head block, 157 and 161 s for the tower and the fairing,
    the escape modes: MPK, pp. 82 and 83), the 7K-OK's modules, engine and landing system (MPK, p. 81; RKK Energia's
    history; Siddiqi, pp. 467 and 472).
- **Not found anywhere reached**:
  - the escape tower's instant on this flight;
  - the approach's burns one by one: how many, when, how big (Siddiqi has "at least two orbital corrections");
  - the correction's instant within the 36th orbit, and its impulse but to Mishin's ten metres a second;
  - the parting of the modules (Kamanin: «через несколько минут» after the cutoff);
  - a measured load of the entry, its trim angle, its drag, and the bank the descent control system flew;
  - the soft-landing engines' thrust and burn; the heat shield's and the covers' masses;
  - a weather report from the range on the day (Kamanin gives Soyuz 2's of the 25th).

## Each input, and its argument

| Input | Value | Confidence | Argument |
| --- | --- | --- | --- |
| The blocks' masses and loads | 43.325 t and 39.475 t; 100.24 t and 93.3 t; 25.45 t and 22.70 t | documented | the 11A511's table (MPK, p. 83) |
| The engines | 83.5/101.5 tf at 313 s; 79.3/99.3 tf at 252/315 s; 30.38 tf at 326 s | documented | the same table; its strap-on row's 252 s does not fit its own thrusts on one nozzle, and 257.5 s is derived (Energomash's 8D728 has 257 s) |
| The escape tower and the fairing | 1.0 t and 0.95 t; 149.2 s and 153.2 s | estimated, derived; assumed, documented | the head block less the ship is 1,950 kg (MPK); the tower's share by judgement; its instant the type's four seconds before this flight's fairing |
| The ascent's law, drag, throttles, limits, steering | the 8K72K's | estimated | as every R-7 flight here |
| The orbit at insertion | 183.5 × 222.2 km, 51.69° | documented | Siddiqi's table, read as mean elements over the WGS 84 ellipsoid under the apsis (the heights come without a period: the convention). The flight's own later orbits with their periods imply a ball 4 to 10 km higher (6,371.5 km from TASS's of the 27th): what that would move is printed by tests/orbital.test.mjs ("the heights over the mean Earth") |
| The approach to Soyuz 2 | one burn along the motion at 11:55, 7.5 m/s | estimated; derived | the impulse that grows the orbit's size from the insertion's to TASS's of the 27th; when, not recorded |
| The correction of the 28th | 16:00, 8.1 m/s, along the motion | estimated; derived | the middle of the 36th orbit; Mishin's 170 less 160 m/s less the three-second firing |
| The three-second firing | 07:25 on the 29th, 1.9 m/s, against the motion | estimated; derived | near the end of the revolution held in the landing attitude; 417 kgf for 3 s |
| The main engine | 417 kgf, 278 s, 25 starts, 411 kg | documented; documented (tertiary); documented; derived | MPK, Energia; lpre.de and an engine encyclopedia's entry; MPK; what was left on orbit 35 and what the approach as flown takes |
| The braking burn | 09:45:05 to 09:47:34, 95 m/s, tail first | documented | Kamanin's plan of the day; Mishin's record |
| The parting | 09:56:50 | assumed | Soyuz 1's planned 11 min 45 s from the burn's start (Mishin) |
| The descent module | 2,800 kg, 2.2 m, L/D 0.25, trimmed at 20° | assumed; documented; documented; estimated | the type's (MPK, Siddiqi); the trim is drawn only |
| Its drag | 0.85 to 1.3 on its disc | estimated | a blunt heat shield's, not found for the type |
| The bank | 0 (lift up) from the parting | assumed | Christy's account of Soyuz 4 and 5's guided entry, "zero bank angle, which provides for maximum lift-drag ratio": the computer's later rolls are not flown |
| The landing system | at 7 km; drogue 14 m², main 1,000 m² 17 s after; shield gone with the main | documented; documented; documented; estimated | Kamanin's plan; Energia, MPK, Siddiqi; the shield's 3 km (Siddiqi) is not flown, it goes as the main comes out |
| The soft-landing engines | 73 kN for 0.22 s at 1 m | estimated | worked from the design's 6.5 to 2.5 m/s over the altimeter's metre (Siddiqi; Energia) |
| The landing | 50.5° N 72.8° E, on 500 m | documented; estimated | McDowell, to a tenth of a degree; the ground by judgement |

## What the run gives

From the pad, on the day's air (ERA5 at 09:00 UTC): the strap-ons go at 44.9 km and 1,947 m/s, the greatest dynamic
pressure is 37.6 kPa at 65 s, the load 4.0 g on the strap-ons, 2.3 on the core alone and 3.3 on Block I. Block I is cut on
the orbit reached at 531.5 s, 4 s after the record's command, with 51 kg left of its 22.7 t: the 11A511 as given here
reaches the insertion orbit with nothing to spare. At the cutoff the orbit is 183.5 by 209.3 km osculating (the published
222.2 is a mean apogee), 51.69°, 16.4 degrees of arc round from the pad.

Flown on, the approach as one burn grows the orbit to 184.6 by 235.3 km by 18:50 on the 27th, where TASS has 179 by 252:
its size is the record's, its shape is not, the single burn so far from the perigee raising both apsides. The correction
of the 28th leaves 205.5 by 232.6 km and 88.54 min where Mishin has 199.4 by 244.2 and 88.81. The braking burn is timed
for the landing place (sim/plan.ts `LandingAim`): on the run it is lit 658 s before the record's 09:45:05, the run being
so far along its track ahead of the record's clock after 64 revolutions each a few seconds short. The modules part at
160 km; the entry's greatest load is 3.0 g (the type's "not more than 3 to 4") with the lift held up throughout; at 7 km at
10:03:16 over 49.07° N 73.62° E; on the ground at 10:12:42, 2.5 km along and 170 km across the track from the record's
landing, at 3.4 m/s on the soft-landing engines.

From the published orbit (tests/orbital.test.mjs) the burn is lit 679 s early and it comes down 146 km across the track;
the orbit after the approaches and after the correction is within a kilometre or two of the run from the pad's.

## Against the record

The misses are recorded in src/sim/misses.ts, each with its reason: the apogee after the approaches and after the
correction (the approach flown as one burn, its shape not the record's), the period after the correction (16 s short,
against a tolerance of 15), the landing across the track (the burn lit eleven minutes early, timed for the place, on an
Earth that has turned less) and the touchdown's instant (as early as the burn, less 82 s). Nothing was adjusted to bring a
check in.

## What is simplified

- The rendezvous with Soyuz 2 is not flown: the target is not in the plan, and the approach's burns, Igla's and
  Beregovoy's, are one burn along the motion with the impulse of the change in the orbit's size. The 80 kg of hydrogen
  peroxide the approach thrusters burned is not taken off the ship.
- The main engine's load is what Mishin's tables leave on orbit 35 and what the approach as flown takes, not what was
  loaded. The backup engine (ДКД) and the approach and orientation thrusters are not separate engines; which of the two
  engines Zak's sources name for the correction and the braking burn is not settled.
- The descent control system's rolls, which steered the range, are not flown: the lift is held up from the parting to
  7 km. The trim angle is drawn and not flown (the lift is a ratio).
- The parachute container's cover goes at 7 km and the heat shield as the main parachute comes out, not at 3 km. The
  reserve parachute system is not in the plan.
- The escape tower's own escape before 157 s and the fairing's before 161 s are said and not flown; from 161 s the deck
  flies the modules' parting and a descent as from orbit.
