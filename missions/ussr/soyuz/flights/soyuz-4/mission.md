# Soyuz 4: the mission as data

The record of the flight is in [README.md](README.md); this is how that record becomes `orbital.ts`, what it rests on and
what the simulator makes of it. Sources in full: [docs/sources.md](../../../../../docs/sources.md), "Soyuz 4 flown". Times are
Moscow time (UTC+3), and seconds from liftoff at 10:30:00 on 14 January 1969.

## What there is, and what there is not

- **Documented for this flight**:
  - liftoff to the second from Site 31, a day after the first attempt was stopped nine minutes before launch, and the
    touchdown at 09:50:47 on the 17th, 40 km north-west of Karaganda (Afanasyev and Vorontsov in «Мировая пилотируемая
    космонавтика», pp. 88 and 89); 49°58′ N 72°39′ E (Mishin, via Zak); Siddiqi and Kamanin have about 09:53, Kamanin 40 km
    from the aimed point;
  - the ship's 6,625 kg and the orbit 173 by 225.3 km at 51.72° (Siddiqi, Table IB), which is the orbit Mishin's ballistics
    computed for the day's window (88.23 min, via Zak); TASS gave 213 by 224 km and 88.8 min (NASA's chronology), McDowell
    206 by 224 km;
  - Shatalov's correction on the fifth orbit, "about six hours after launch", by hand on the main engine, to 207 by 237 km
    (Siddiqi, p. 670); Mishin, as Zak prints him, has 207.3 by 273 km and 88.7 min, a period that fits 237, not 273;
  - a second correction by hand on the 32nd orbit, the morning of the 16th, to 201 by 253 km (TASS, as Zak gives it);
  - Igla's approach from 10:37 on the 16th, the docking by hand at 11:20, Khrunov and Yeliseyev across outside on the 35th
    orbit, the undocking at 15:54 (Siddiqi; MPK; 4 h 33 min 49 s docked);
  - the braking burn scheduled for 09:10:48 on the 17th, the ion flow found after an anxious few seconds (Mishin via Zak;
    Kamanin), the parting at 09:22:52, the dense air at 09:29:43, the parachute at 09:35:30 (Mishin, via Zak);
  - the type: the 11A511's table, the 7K-OK's modules, engine and landing system (MPK, pp. 81 to 83; Energia; Siddiqi,
    pp. 467 and 472).
- **Not found anywhere reached**:
  - any instant of this vehicle's ascent (it is flown on Soyuz 3's vehicle's, Mishin's for No. 10);
  - where in their orbits the two corrections were made, and how big; Igla's burns of the approach;
  - the ship's load of propellant; the braking burn's length and impulse;
  - the height the parachute system started at; the bank the descent control system flew after the start of the entry.

## Each input, and its argument

| Input | Value | Confidence | Argument |
| --- | --- | --- | --- |
| The blocks, the engines, the tower and fairing | as Soyuz 3's | documented, derived, estimated | the type's (soyuz-11a511-flown.ts) |
| The ascent's instants | Soyuz 3's vehicle's | assumed | none of No. 12's found |
| The separation | 533 s | derived | McDowell: in orbit at 07:38:53 UTC |
| The orbit at insertion | 173 × 225.3 km, 51.72° | documented | Siddiqi's table, read over the WGS 84 ellipsoid under the apsis |
| The ship | 6,625 kg; the type's 1,200 and 2,800 kg modules; 2,625 kg the rest | documented; assumed; derived | Siddiqi |
| The main engine's load | 900 kg | assumed | the most the tanks held, taken as full for the active ship |
| The fifth orbit's correction | 16:30, 13.5 m/s along the motion | estimated; derived | the impulse that takes 173 × 225.3 km to the size of 207 × 237 |
| The 32nd orbit's correction | 09:00 on the 16th, 2.9 m/s along the motion | estimated; derived | the impulse that takes 207 × 237 km to the size of 201 × 253 |
| The braking burn | 09:10:48 on the 17th, 95 m/s, about 150 s, tail first | documented; assumed; derived | the plan's instant; Soyuz 3's impulse, the same type to the same country |
| The parting | 09:22:52 | documented | Mishin |
| The descent module | 2,800 kg, L/D 0.25, held lift up from the parting | assumed; documented; documented, assumed | the type's nominal, three aboard; Christy's account of this entry's start; the rolls after it are not flown |
| The landing system | at 9.5 km; drogue 14 m², main 1,000 m² 17 s after | assumed; documented | the type's (Siddiqi, p. 472); Volynov had 10 km the next day |
| The landing | 49.97° N 72.65° E, on 520 m; the burn timed for the place | documented; estimated; documented | Mishin's point; Kamanin's 40 km from the aim |

## What the run gives

From the pad, on the day's air: the strap-ons go at 44.4 km and 1,973 m/s, the greatest dynamic pressure is 37.6 kPa at
65 s, the load 4.0 g on the strap-ons, 2.3 on the core and 3.3 on Block I. Block I is cut on the orbit at 531.1 s with 88 kg
left, level at 173.0 km: 173.0 by 212.4 km osculating, 51.72°.

The fifth orbit's correction, one push along the motion near the perigee, leaves 173.6 by 266.6 km, 88.57 min: the size
of Siddiqi's 207 by 237 and Mishin's 88.7 min, not its shape. The 32nd orbit's leaves 179.1 by 253.3 km, where TASS has 201
by 253. The braking burn, timed for the landing place, is lit 668 s before the record's 09:10:48; the entry's greatest load
is 3.0 g with the lift held up; on the ground at 09:38:45, 1.8 km along and 109 km across the track from the record's point,
at 3.4 m/s on the soft-landing engines, three aboard.

## Against the record

The misses are recorded in src/sim/misses.ts, each with its reason: the perigee and apogee after the fifth orbit's
correction and the perigee after the 32nd's (each flown as one push at an estimated instant: the size is the record's, the
shape is not), the landing across the track (109 km from the pad, 84 from the published orbit, against 40) and the
touchdown's instant (722 s early, as the burn). Nothing was adjusted to bring a check in.

## What is simplified

- The rendezvous and docking with Soyuz 5 are not flown: Soyuz 5 is not in the plan. Igla's approach, the station-keeping
  at 40 m, the docking, the four and a half hours docked, the transfer outside and the undocking are told, not flown, and
  the docked pair's mass and drag are not.
- Each correction is one push along the motion at an estimated instant, of the impulse the change in the orbit's size
  takes.
- Khrunov and Yeliseyev's mass is not added to the descent module (the type's nominal 2,800 kg is taken), and their suits,
  left in the orbital module, are not added to it.
- The descent control system's rolls are not flown: the lift is held up from the parting.
- The braking burn's impulse is Soyuz 3's.
