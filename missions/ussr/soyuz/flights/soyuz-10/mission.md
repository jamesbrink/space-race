# Soyuz 10: the mission as data

The record of the flight is in [README.md](README.md); this is how that record becomes `orbital.ts`, what it rests on and
what the simulator makes of it. Sources in full: [docs/sources.md](../../../../../docs/sources.md), "Soyuz 10 and 12 flown".
Times are Moscow time (UTC+3), and seconds from liftoff at 02:54:06 on 23 April 1971.

## What there is, and what there is not

- **Documented for this flight**:
  - liftoff to the second (Afanasyev and Vorontsov in «Мировая пилотируемая космонавтика», pp. 226 and 227; McDowell), the
    scrub of the 22nd a minute before ignition, the cable mast that held again on the 23rd (Kamanin; Zak);
  - the ship in orbit at 03:03 (the 1972 yearbook of the Great Soviet Encyclopedia; McDowell's 00:03:00 UTC), its 6,575 kg
    and its orbit at insertion, 209.6 by 248.4 km at 51.6° (Siddiqi, Table IB, p. 877). TASS's first figures (200 by
    224 km, 51.3°, as NASA's chronology prints them) are nearer Salyut's own orbit; McDowell's tracking has 204 by 232 km;
  - the descent module's 2,810 kg (McDowell);
  - the corrections: the automatic one of the 4th orbit failed (MPK; Kamanin), Shatalov's by hand at 13:15 (the yearbook),
    the one at 01:34 on the 24th of 17 s (Chertok, who heard it scheduled and reported), Igla's firings of 13 and 4 s
    braking the approach, and the 13 m/s the main engine still had for it (Chertok, quoting Raushenbakh);
  - Igla's lock at 16 km at about 03:00, the hand-over at 180 to 200 m, the probe in Salyut's cone at 04:47 with the
    collars 90 mm apart, the undocking at 10:17 (MPK; TASS's 5 h 30 min; Chertok has the command through at 08:44);
  - the braking burn at 01:59 on the 25th (TASS, to the minute), the landing at 02:40:00 "in 120 km north-west of
    Karaganda" (TASS; the yearbook; Siddiqi, pp. 774–775), aimed at 80 to 100 km north-west (Kamanin), in the dark, four or five
    minutes before sunrise;
  - the type: the 7K-T's 6,700 kg and three days on its own (MPK, p. 224), the 7K-OK's engine, descent module and landing
    system (MPK, p. 81; RKK Energia; Siddiqi, pp. 467 and 472), and Soyuz 11's planned descent (Kamanin, 30 June 1971: the
    engine on at 01:35:24 for 187 s, the parting at 01:47:28, the parachute from 7 km).
- **Not found anywhere reached**:
  - any instant of this flight's ascent but the spacecraft's separation;
  - the impulse and sense of either correction, and Igla's firings' directions;
  - the braking burn's length and impulse, the parting's instant, the height the parachute system worked at;
  - the landing's latitude and longitude (McDowell has none for this flight); MPK has the place north-east of Karaganda,
    every other source north-west;
  - how the 11A511 was uprated for the 7K-T (MPK, p. 224 says only that it was).

## The launch vehicle: the 7K-T era's 11A511

On the 11A511 as #177 gave it (the type's table of the 7K-OK era, MPK p. 83, with the 8K72K's estimated drag, throttles
and law) neither 7K-T flight reaches orbit: Soyuz 3 itself reaches its 183.5 km with 96 kg left in Block I. The borrowed
estimates were looked at first: no documented figure of the 11A511's own was found to replace one (Encyclopedia Astronautica's
stage table is tertiary and disagrees with MPK's masses; its 6,450 kg to a 200 km orbit agrees with what the vehicle as
modelled carries). So the vehicle the 7K-T flew is a variant (`BLOCK_I_7KT`, `UPRATING_7KT`,
[soyuz-11a511-flown.ts](../../vehicles/soyuz-11a511-flown.ts); [soyuz-11a511.md](../../vehicles/soyuz-11a511.md), "The 7K-T
era"), sized from a documented capability and from no flight's own orbit: the 7K-OK era's vehicle carries 6,534 kg to the
type's planned insertion, 204.3 by 225.0 km (Mishin's plan for Soyuz 3); MPK has it uprated to carry the 7K-T's 6,700 kg;
the 166 kg is taken off Block I (derived; which figure carries it, estimated). Soyuz 3 flies the 7K-OK era's vehicle,
unchanged (tests/soyuz-uprating.test.mjs holds both).

## Each input, and its argument

| Input | Value | Confidence | Argument |
| --- | --- | --- | --- |
| The blocks | MPK's table; Block I 166 kg lighter | documented; derived | the 7K-T era's uprating, above |
| The ascent's instants | strap-ons 119.46 s, Block I 288.46, core 289.71 and 290.71, aft section 297.7; tower 157, fairing 161 | assumed | Soyuz 3's (Mishin, via Zak) for the stages, the type's table's for the tower and the fairing; the table's own 118 and 286 s leave the core a tonne and a half short of Soyuz 3's burn |
| The separation and cutoff | 534 s; 528.7 s | derived; assumed | McDowell's; Soyuz 3's 5.33 s before it |
| The orbit at insertion | 209.6 × 248.4 km, 51.6° | documented | Siddiqi's table, read as Soyuz 3's is |
| The ship | 6,575 kg: descent module 2,810, orbital module 1,200, the instrument module what is left | documented; documented; assumed; derived | Siddiqi; McDowell; the 7K-OK's |
| The correction of 24 April | 01:34, 17 s, 10.7 m/s, along the motion | documented; derived; estimated | Chertok; the engine on the ship; its sense not recorded, the station's own of that revolution was «на разгон» |
| The main engine | 417 kgf, 278 s, 363 kg | documented; derived | the 7K-OK's; the load is what the record has it burn (01:34, Igla's 13 and 4 s, a 187 s braking burn) and Raushenbakh's 13 m/s |
| The braking burn | 01:59, 187 s, 119 m/s, tail first | documented; assumed; derived | TASS; Soyuz 11's planned length; that length on this ship |
| The parting | 12 min 4 s after the burn's start | assumed | Soyuz 11's plan |
| The descent module | L/D 0.25, drag, trim, lift up | as Soyuz 3's | the 7K-OK's |
| The parachute system | 7 km | assumed | the type's in 1971 (Kamanin, 30 June) |
| The landing | 50.56° N 71.91° E, on 500 m | derived; estimated | 120 km at 315° from Karaganda's centre; the ground by judgement |

## What the run gives

From the pad, on the day's air: the strap-ons go at 45.9 km and 1,951 m/s, the greatest dynamic pressure is 37.1 kPa, the
load 4.0 g on the strap-ons and 3.4 on Block I. Block I is cut on the orbit at 531.3 s with 71 kg left: 209.6 by 235.7 km
osculating where the published apogee (a mean) is 248.4, within its check. The correction of 01:34 is flown; the braking
burn is timed for the landing place (sim/plan.ts `LandingAim`) and lit 187 s after the record's 01:59 (182 s from the
published orbit). The entry's greatest load is 3.05 g with the lift held up; 7 km at 02:30; on the ground at 02:39:27,
32 s before the record, 1.3 km along and 112 km across the track from the place worked for it, at 3.4 m/s on the
soft-landing engines. From the published orbit it comes down 89 km across the track.

## Against the record

The misses are recorded in src/sim/misses.ts: the landing across the track, from the pad and from the published orbit (the
burn timed for the place, a few minutes behind the record's clock on an orbit flown with one of its corrections, against a
place worked from words). Nothing was adjusted to bring a check in.

## What is simplified

- The rendezvous and soft docking with Salyut 1 are not flown: the station is not in the plan, and the ship goes round
  alone. Of the approach's firings only the 17 s of 01:34 is flown; the correction by hand of the 23rd and Igla's firings
  have no impulse on any record read. The 5 h 30 min held on the station's cone, the undocking and the flight round the
  station are told as the record's events.
- The approach and orientation thrusters (DPO) and their hydrogen peroxide, 80 kg spent on the approach (Kamanin), are not
  separate engines here.
- The braking burn's length, the parting and the parachute's height are Soyuz 11's planned figures; the descent control
  system's rolls are not flown (the lift is held up).
- The 11A511's uprating for the 7K-T is a size, not a description: what was changed is not known.
