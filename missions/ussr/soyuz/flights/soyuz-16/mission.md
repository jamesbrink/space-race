# Soyuz 16: the mission as data

The record of the flight is in [README.md](README.md); this is how that record becomes `orbital.ts`, what it rests on and
what the simulator makes of it. Sources in full: [docs/sources.md](../../../../../docs/sources.md), "Soyuz 16 and T-2 flown".
Times are Moscow time (UTC+3), and seconds from liftoff at 12:40:00 on 2 December 1974.

## What there is, and what there is not

- **Documented for this flight**:
  - liftoff and landing to the second, 12:40:00 on 2 December and 11:03:35 on 8 December, 300 km north of Dzhezkazgan
    (Afanasyev and Vorontsov in «Мировая пилотируемая космонавтика», pp. 265 to 266; McDowell; the 1975 yearbook of the
    Great Soviet Encyclopedia has 11:04); McDowell's point, 50.5° N 68.1° E, and Spacefacts' "30 km southwest of Arkalyk";
  - **the launch vehicle, the 11A511U**: «это был первый запуск пилотируемого корабля с помощью модернизированной РН 11А511У»
    (MPK, p. 265); Siddiqi's Table IA "11A511U"; McDowell's launch log K15000-014. Not the 11A511;
  - the ship's 6,800 kg and its orbit at insertion, 191.7 by 314.8 km at 51.79° (Siddiqi, Table IB, p. 877, which Zak calls
    "a considerably higher apogee than the one planned"); TASS's 194 by 280 km, 89.3 min, 51.8° (NASA's chronology);
    Spacefacts' 184 to 291 km; the type's 6,790 kg (MPK, p. 261); the Czech Academy of Sciences' catalogue 6,680 kg;
  - McDowell's descent module of 2,850 kg; the ship separated at 09:48:48 UTC, 528 s after liftoff;
  - **the corrections on the 4th (MPK) or 5th (the yearbook), 17th and 18th revolutions** to «заданную круговую орбиту высотой
    около 225 км с периодом обращения, равным 88,9 мин, и наклонением 51,8°» (the yearbook; NASA's chronology the same, on
    4 December); McDowell's 218 by 228 km on 4 December;
  - **the docking ring**, an Apollo simulator ring held on the APAS by its latches, «20 kg» (Spacefacts); shot off by its
    pyrotechnic bolts and thrown clear by spring pushers on 7 December, 119 h 20 min into the flight (09:00 UTC: McDowell,
    with a question mark; NASA SP-4209; Zak; MPK, p. 266);
  - the braking burn's length, 188 s (Spacefacts: secondary);
  - the type, 7K-TM (MPK, pp. 261 to 262): APAS in place of the probe, Igla taken out, the solar wings back (7.5 days),
    two crew in Sokol-K suits, the 7K-OK's main engine and descent module.
- **Not found anywhere reached**:
  - any instant of this flight's ascent but the ship's separation, and any of the 11A511U's own;
  - what each of the three corrections did, and when in its revolution; what the first one was for;
  - the braking burn's instant and impulse, the parting's instant, the parachute system's height;
  - the 7K-TM's orbital module's mass, and the docking ring's push;
  - the 11A511U's own blocks' masses, and how much each of its changes gave.

## The launch vehicle: the 11A511U

See [soyuz-11a511.md](../../vehicles/soyuz-11a511.md), "The 11A511U". On the 11A511's blocks (assumed) with its own engines
(the type's table's thrusts, the makers' impulses) the vehicle carries 6,545 kg to the type's own insertion figure, a mean
height of 220 km at 51.6°; the table's Soyuz T of 6,855 kg is 310 kg more. Nothing found replaced an estimate, so the 310 kg
is carried as Block I's own mass (`derived` from the documented capability; the choice of where, `estimated`), sized on no
flight's orbit. On it this ship's Block I is cut on its orbit with 9 kg left.

## Each input, and its argument

| Input | Value | Confidence | Argument |
| --- | --- | --- | --- |
| The ascent's instants | Soyuz 3's for the stages; the tower 123 s; the fairing 161 s; the separation 528 s | assumed; assumed; assumed; derived | the last crewed instants read; the second-generation escape system's (RKK Energia, ch. 6; MPK, p. 264); the 11A511's table; McDowell |
| The orbit at insertion | 191.7 × 314.8 km, 51.79° | documented | Siddiqi's table |
| The ship | 6,800 kg: orbital module 1,200, descent module 2,850, the docking ring 20, the instrument module 2,730 | documented; assumed; documented; derived | Siddiqi; the 7K-OK's; McDowell; Spacefacts; what is left |
| The circle | 9.8 m/s along the motion at the apogee on the 17th revolution (24.7 h), 26.3 m/s against it at the new perigee half a revolution later | estimated; derived | the instants by the perigee put at the cutoff, over the ellipsoid under the apsides; each impulse the one that joins the published orbits, on the vis-viva |
| The first correction (4th or 5th revolution) | not flown | — | its size and purpose are in nothing read |
| The docking ring | 20 kg, let go at 12:00 on 7 December, 0.3 m/s forward | documented; documented; estimated | Spacefacts; McDowell and SP-4209; chosen |
| The main engine | 417 kgf, 278 s, 372 kg | documented; derived | the 7K-OK's; the load what the record has it burn, the circle and a 188 s braking burn |
| The braking burn | 41 min before the touchdown, 188 s, 117 m/s, tail first | assumed; documented; derived | Soyuz 10's interval (TASS, 1971); Spacefacts; the impulse that length gives on this ship |
| The parting | 12 min 4 s after the burn's start | assumed | Soyuz 11's plan |
| The descent module | L/D 0.25, drag, trim, lift up | as Soyuz 3's | the 7K-OK's |
| The parachute system | 7 km | assumed | the type's in 1971 (Kamanin) |
| The landing | 50.5° N 68.1° E, on 330 m | documented; estimated | McDowell; the ground by judgement |

The corrections' impulses are worked over the ellipsoid's radius under the apsides, where the record's heights are read
(orbital.ts `heightsBall`), not over the equator's: sixteen revolutions on, the period on the equator's radius would put the
burns a fifth of a revolution off the apsides.

## What the run gives

From the pad, on the day's air: the greatest dynamic pressure is 42.1 kPa, 3.98 g on the strap-ons, 3.38 on Block I. Block I
is cut on the orbit at 531.9 s with 9 kg left: **191.7 by 301.9 km osculating** (the published apogee a mean, 314.8), within
its check. The two burns of the 17th and 18th revolutions leave **219.5 by 226.0 km, 88.62 min** (the yearbook: about 225 km,
88.9 min); from the published orbit, 220.7 by 224.6 km. The docking ring goes on the fifth day. The braking burn is timed for
the landing place (sim/plan.ts `LandingAim`); the entry's greatest load is 3.0 g with the lift held up; on the ground at 3.4 m/s
**962 s before the record and 161 km across the track** from McDowell's point (136 km from the published orbit).

## Against the record

The misses are recorded in src/sim/misses.ts: the landing across the track, from the pad and from the published orbit, and
the touchdown's instant (the burn timed for the place after six days, against a burn instant the record does not have and a
point McDowell gives to a tenth of a degree). Nothing was adjusted to bring a check in.

### Flown live

With guidance and the sequencer on, the live vehicle breaks up at T+57 in the day's winter jet: five degrees off the air at
40 kPa, its bending load 101 per cent of the R-7's estimated limit (vostok-8k72k.ts `limits.qAlpha`, 3,340 Pa rad); in still
air 9 per cent. Soyuz 4 (98), Soyuz 12 (84) and Soyuz T-2 (74) come near it the same way. Looked for and not found: any load
relief in the R-7's or the 11A511U's control system (its normal and lateral stabilisation held the centre of mass to the
planned trajectory: Startsev, «Ракетно-космическое приборостроение и информационные системы», 2016, vol. 3 no. 1,
pp. 92–97) and any documented bending limit of the type. The ERA5 profile is the hour nearest liftoff (10:00 UTC) over Site 1,
and the angle is taken against the velocity through the air. Recorded as a miss (`aloft`, src/sim/misses.ts), the limit
unchanged. Open: whether the estimate is low or the run's angle through the jet too large.

## What is simplified

- The first correction is not flown; the circle is two burns at the apsides of estimated instants, of the impulses that join
  the published orbits.
- The docking tests are not flown: the ring is let go once, at the emergency undocking's instant; its retractions and
  re-engagements, the latches and the 16 t it was held to the port with are not modelled.
- The braking burn's instant and the parting are Soyuz 10's and Soyuz 11's figures; the descent control system's rolls are
  not flown (the lift is held up).
- The cabin's lowered pressure and raised oxygen, the colour television and the experiments are told, not flown.
- The escape tower flies the first tower's estimated mass; the second-generation escape is not flown.
- The 11A511U is the 11A511's blocks with its own engines and a gain sized on Block I's mass.
