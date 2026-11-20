# Soyuz 1: the mission as data

The record of the flight is in [README.md](README.md); this is how that record becomes `orbital.ts`, what it rests on and
what the simulator makes of it. Sources in full: [docs/sources.md](../../../../../docs/sources.md), "Soyuz 1 flown". Times are
Moscow time (UTC+3), and seconds from liftoff at 03:35:00 on 23 April 1967.

## What there is, and what there is not

- **Documented for this flight**:
  - liftoff to the second, and the moment the descent module struck the ground, 06:22:52 on the 24th, 65 km east of Orsk
    near Karabulak (Afanasyev and Vorontsov in «Мировая пилотируемая космонавтика», pp. 84 and 85; McDowell); three watches
    found at the site had stopped between 06:23:00 and 06:24 (Mishin, via Zak); Spacefacts' point, 51°21′41″ N 59°33′45″ E;
  - the spacecraft in orbit 540 s after liftoff (Kamanin; Chertok has the news reach the ground then; McDowell has it in orbit
    at 530 s);
  - the first orbits, 200.9 by 224.1 km, 51.67°, 88.62 min (Mishin's table, via Zak; TASS's 201 by 224 km, 88.6 min), and a
    later pair of columns, "planned" and "actual", 199.2 by 219.8 km, 51.66°, 88.56 min, which do not say which orbit they
    are of: read here as the orbit after the correction, the period shorter by what a push of its size takes off;
  - the left solar wing folded, caught on the instrument module's insulation, with the backup telemetry antenna on it; the
    45K solar and star sensor fogged; the turn to the Sun failed; 13 to 14 A of charging current where 23 to 25 were needed
    (Kamanin; Mishin; MPK); the batteries good for some 17 orbits, then another orbit or two on the primary and three on the
    backup (Mishin; Chertok);
  - "the passing correction" at 11:14 on the fifth orbit, against the motion, 3.1 to 3.8 m/s, on the main engine and several
    approach and orientation thrusters, Komarov moved to the left seat (Mishin, via Zak; Kamanin's commission decided «провести
    коррекцию орбиты»);
  - the braking burn planned for 02:56:12 on the 17th orbit and inhibited when the ion sensors lost the flow in the shadow;
    the orientation by hand from 04:57, held on the gyroscopes through the shadow, corrected by hand; the burn from 05:57:15 to
    05:59:38.5 by the ground's record, "146 seconds" by Komarov's report (Siddiqi's account of the transcripts; Zak);
  - the plan's parting at 06:09; "Failure-2" at 06:14:09 and an entry flown ballistic (Mishin via Zak; Siddiqi; MPK; Energia);
  - the parachutes: the drogue out, the main's pack held in its container, the reserve put out on the speed check and
    shadowed by the drogue, which stayed fast to the main's pack, and never filled (the commission, as Energia, MPK and Zak give
    it); the main canopy and its moving line found stowed (Mishin); the drogue's emergency release fitted after this flight
    (Energia);
  - the speed at the ground, in which the sources disagree (below);
  - the type: the 11A511's table, the 7K-OK's modules, engine and landing system (MPK, pp. 81 to 83; Energia; Siddiqi,
    pp. 467 and 472), the drogue 14 m², reduced from 18 before the type flew (Energia).
- **Not found anywhere reached**:
  - any instant of this vehicle's ascent (it is flown on Soyuz 3's vehicle's, Mishin's for No. 10);
  - the ship's load of propellant; the braking burn's impulse; when the modules in fact parted;
  - the height the parachute system started at on this flight, and the height the reserve came out at;
  - how much of its drag the fouled reserve had; a crew command of its own for the reserve.

## Each input, and its argument

| Input | Value | Confidence | Argument |
| --- | --- | --- | --- |
| The blocks, the engines, the tower and fairing | as Soyuz 3's | documented, derived, estimated | the type's (soyuz-11a511-flown.ts) |
| The ascent's instants | Soyuz 3's vehicle's (119.46 s, 153.2 s, 288.46 s, 289.71 s, 297.7 s, 527.67 s) | assumed | none of No. 3's found |
| The separation | 540 s | documented | Kamanin; McDowell's 530 s would part the ship before the third stage flown here is cut on the orbit at 531 s |
| The orbit at insertion | 200.9 × 224.1 km, 51.67° | documented | Mishin's first orbits, read over the WGS 84 ellipsoid under the apsis as the convention has it |
| The ship | 6,450 kg; the type's 1,200 and 2,800 kg modules; 2,450 kg the rest | documented; assumed; derived | Siddiqi, McDowell |
| The main engine's load | 900 kg | assumed | the most the tanks held, taken as full |
| The correction | 11:14, 3.45 m/s against the motion | documented; derived | the middle of Mishin's 3.1 to 3.8 m/s, flown on the main engine alone |
| The braking burn | 05:57:15 to 05:59:38.5, 92.7 m/s, tail first | documented; derived | the ground's instants at 417 kgf and 278 s on the ship; Komarov's 146 s would give 94.3 |
| The parting | 06:09 | documented | the plan's instant |
| The entry | ballistic: no bank held, no lift flown | documented | Failure-2 and the ballistic plan (above) |
| The parachute system | at 7 km | assumed | Soyuz 3's day; TASS's statement had the main canopy opening at seven kilometres; the type's description 9.5 km |
| The drogue | 14 m², out with the cover | documented | the type's |
| The main | 1,000 m², 17 s after the drogue: stays in its container | documented | the commission |
| The reserve | 570 m², out at 2 km: fouls on the drogue, a twentieth of its drag | estimated; documented; estimated | the height from the later Soyuz's speed check (Popov), the fouling the commission's, its drag the torn canopy's here |
| The heat shield | kept on | estimated | it goes under the main |
| The landing | 51.36° N 59.56° E, on 330 m; the burn timed for the place | documented; estimated; documented | Spacefacts; the ground by judgement; Kamanin's reserve landing area 50 km east of Orsk |

## The speed at the ground: the sources disagree

- Kamanin, from the site that day: «Корабль ударился о землю со скоростью 35–40 метров в секунду» — the check's figure, 37.5 ± 2.5 m/s.
- Siddiqi (The Space Review, 2017): 40 m/s, 144 km/h.
- Afanasyev and Vorontsov (MPK, p. 85): «с огромной скоростью (более 50 м/с)».
- The flight surgeons Bychkov and Artamoshin, as Zak gives them: 26 to 30 m/s, 200 km/h.

The run comes down at 36.4 m/s. It is not fitted: on the drogue alone (14 m² at 0.75, and the module) it would fall at
58 m/s (tests/parachute-faults.test.mjs gives the main by hand with the sequencer off: 58.5 m/s); the fouled reserve
keeps the twentieth of its drag every torn canopy here keeps (vostok-3ka.ts `TORN`, estimated before this flight was flown),
and comes out at an estimated 2 km. With the reserve keeping nothing it would be the drogue's 58 m/s, near MPK's "over 50";
with a fifth of its drag, about 21.

## What the run gives

From the pad, on the day's air: the strap-ons go at 45.6 km and 1,955 m/s, the greatest dynamic pressure is 38.2 kPa at
67 s, the load 4.0 g on the strap-ons, 2.3 on the core and 3.4 on Block I. Block I is cut on the orbit at 531.0 s, 3 s after
Soyuz 3's command, with 102 kg left: 200.9 by 211.3 km osculating at the cutoff (the published 224.1 is a mean apogee),
51.67°. After the correction: 199.3 by 211.2 km, 88.26 min, where Mishin's later columns have 199.2 by 219.8, 88.56.

The braking burn is timed for the landing place: lit 190 s before the record's 05:57:15. The modules part at 143 km; the
entry is ballistic, its greatest load 8.4 g (Volynov's ballistic entry on Soyuz 5 was 9 g, MPK); the parachute system at
7 km at 06:17:57; the reserve out at 06:19:01 in the drogue's shadow; on the ground at 06:19:42, 0.2 km along and 32 km across
the track from the record's point, at **36.4 m/s**. The soft-landing engines, which wait on the main, never fire. Komarov is
killed when the descent module strikes the ground.

## Against the record

The misses are recorded in src/sim/misses.ts, each with its reason: the period after the correction (88.26 min against
88.56, the heights read over the ellipsoid), the landing 32 km across the track from the pad (30 allowed; 22 km from the
published orbit) and the instant the module struck (190 s early, as the burn). Nothing was adjusted to bring a check in.

## What is simplified

- The folded wing changes nothing flown: the simulator has no electricity and no attitude in orbit. What it cost is in the
  record (the ship's life, `supplies`: some 23 orbits on its batteries, where the type had ten days) and in the entry
  flown ballistic. The ship's drag in the thin air is the type's estimate, its one wing not taken off.
- The two failed attempts at the braking burn, the spin-up attempts and the hand orientation are told, not flown: the burn
  is lit once, at its instant, tail first.
- The correction is flown on the main engine alone; the approach and orientation thrusters' share of it, and their 102 to
  111 kg of peroxide, are not taken.
- The heights the parachute system and the reserve came out at are estimates; the reserve's own cover is not let go in the
  scene. The soft-landing engines' firing on the ground, the fire and the wreck are not shown.
- The descent module's mass is the type's: the equipment Komarov moved into it from the orbital module is not added.
