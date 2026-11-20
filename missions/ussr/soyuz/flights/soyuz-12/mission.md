# Soyuz 12: the mission as data

The record of the flight is in [README.md](README.md); this is how that record becomes `orbital.ts`, what it rests on and
what the simulator makes of it. Sources in full: [docs/sources.md](../../../../../docs/sources.md), "Soyuz 10 and 12 flown".
Times are Moscow time (UTC+3), and seconds from liftoff at 15:18:16 on 27 September 1973.

## What there is, and what there is not

- **Documented for this flight**:
  - liftoff and landing to the second (Afanasyev and Vorontsov in «Мировая пилотируемая космонавтика», p. 234; McDowell),
    and Mishin's address to the State Commission giving 15:18 (RAN archive, fond 2221);
  - the ship's 6,720 kg and its orbit at insertion, 193 by 248.6 km at 51.61° (Siddiqi, Table IB, p. 877); TASS's 194 by
    249 km («Наука и жизнь», no. 11, 1973), NASA's chronology 180 by 229 km; the type's 6,800 kg (MPK, p. 231; McDowell);
  - McDowell's orbital module of 1,250 kg and descent module of 2,850 kg, the orbital module in orbit from «1973 Sep 29
    0840?» UTC (his question mark) to 21 January 1974: let go in orbit before the burn, not with the instrument module after
    it;
  - the orbit after the manoeuvres of the first day, 326 by 345 km, 91 min, 51.6° (TASS, in the 1974 yearbook of the Great
    Soviet Encyclopedia and NASA's chronology), "within seven hours of launch" (Siddiqi, p. 816), "during the fifth orbit"
    (Zak, whose "more than 15 hours" does not fit it, and whose source has 332.9 by 347.9 km);
  - the parachute system at 7.5 km (the yearbook; «Наука и жизнь»; NASA has 7.6 km), the landing at 14:33:48, 400 km
    south-west of Karaganda, at 47.7° N 68.7° E (McDowell, queried);
  - the type: two crew in Sokol-K suits, no solar wings, batteries for two days (MPK, p. 231; Portree, Mir Hardware Heritage,
    §1.8), and Soyuz 11's planned descent (Kamanin, 30 June 1971).
- **Not found anywhere reached**:
  - any instant of this flight's ascent but the spacecraft's separation; whether the escape tower without its shroud
    (from this flight: Zak) was let go at another instant than the type's 157 s (the earlier 123 s came with Soyuz 19's
    second-generation tower);
  - how many burns raised the orbit, when, and of what impulse;
  - the braking burn's instant, length and impulse, the parting's instant;
  - how the 11A511 was uprated for the 7K-T.

## The launch vehicle: the 7K-T era's 11A511

As for Soyuz 10 ([its mission.md](../soyuz-10/mission.md), "The launch vehicle"): on the 7K-OK era's figures the 6,720 kg ship
does not reach orbit (82 by 193 km, Block I dry); on the 7K-T era's, sized from MPK's 6,700 kg to the type's planned insertion
and from no flight's own orbit, Block I is cut on the orbit with 23 kg left.

## Each input, and its argument

| Input | Value | Confidence | Argument |
| --- | --- | --- | --- |
| The ascent's instants | as Soyuz 10's | assumed | Soyuz 3's for the stages, the type's table's for the tower and the fairing; the separation McDowell's, 533 s |
| The orbit at insertion | 193 × 248.6 km, 51.61° | documented | Siddiqi's table |
| The ship | 6,720 kg: orbital module 1,250, descent module 2,850, the instrument module 2,620 | documented; derived | Siddiqi; McDowell; what is left |
| The raise | 28.0 m/s at the perigee on the fifth revolution (6.07 h), 38.7 m/s at the apogee half a revolution later (6.82 h), along the motion | estimated; derived | the instants by the perigee put at the cutoff; each impulse the one that takes the published orbit before to the published orbit after, on the vis-viva |
| The orbital module | let go at 11:40 on the 29th | documented | McDowell, with his question mark |
| The main engine | 417 kgf, 278 s, 444 kg | documented; derived | the 7K-OK's; the load is what the record has it burn (the raise and a 187 s braking burn) |
| The braking burn | 41 min before the touchdown, 187 s, 148 m/s, tail first | assumed; assumed; derived | Soyuz 10's interval (TASS, 1971); Soyuz 11's planned length; that length on this ship without its orbital module |
| The parting | 12 min 4 s after the burn's start | assumed | Soyuz 11's plan |
| The descent module | L/D 0.25, drag, trim, lift up | as Soyuz 3's | the 7K-OK's |
| The parachute system | 7.5 km | documented | TASS |
| The landing | 47.7° N 68.7° E, on 400 m | documented; estimated | McDowell; the ground by judgement |

## What the run gives

From the pad, on the day's air: the strap-ons go at 45.3 km and 1,960 m/s, the greatest dynamic pressure is 35.5 kPa,
4.0 g on the strap-ons and 3.35 on Block I. Block I is cut on the orbit at 531.8 s with 23 kg left: 193.0 by 235.8 km
osculating (the published apogee a mean, 248.6), within its check. The two burns of the raise leave 326.5 by 342.2 km,
90.9 min (TASS: 326 by 345 km, 91 min); from the published orbit, 324.8 by 343.8 km. The orbital module goes at 11:40 on the
29th. The braking burn is timed for the landing place (sim/plan.ts `LandingAim`) and lit 816 s before the instant taken for
it; the entry's greatest load is 3.05 g with the lift held up; 7 km at 14:14; on the ground at 14:24:17, 571 s before the
record, 1.8 km along and 209 km across the track from McDowell's point, at 3.4 m/s on the soft-landing engines. From the
published orbit it comes down 170 km across the track.

## Against the record

The misses are recorded in src/sim/misses.ts: the landing across the track, from the pad and from the published orbit, and
the touchdown's instant (the burn timed for the place, on an orbit that holds TASS's, against a burn instant the record does
not have and a point McDowell queries). Nothing was adjusted to bring a check in.

## What is simplified

- The raise is two burns at the apsides of estimated instants, of the impulses that join the published orbits; the record
  has neither their number nor their instants.
- No station is approached: the flight was the ferry's first solo test, and its rehearsal of a rendezvous is the raise.
- The braking burn's instant, length and parting are Soyuz 10's and Soyuz 11's figures; the descent control system's rolls
  are not flown (the lift is held up).
- The approach and orientation thrusters (DPO) are not separate engines here; the depressurisation test of the suits, the
  LKSA photography and the faults of the second day are told, not flown.
- The escape tower flies the 7K-OK era's mass and instant: the saving of its missing shroud is not known.
- The 11A511's uprating for the 7K-T is a size, not a description: what was changed is not known.
