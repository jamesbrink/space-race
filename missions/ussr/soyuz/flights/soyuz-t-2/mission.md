# Soyuz T-2: the mission as data

The record of the flight is in [README.md](README.md); this is how that record becomes `orbital.ts`, what it rests on and
what the simulator makes of it. Sources in full: [docs/sources.md](../../../../../docs/sources.md), "Soyuz 16 and T-2 flown".
Times are Moscow time (UTC+3), and seconds from liftoff at 17:19:30 on 5 June 1980.

## What there is, and what there is not

- **Documented for this flight**:
  - liftoff and landing to the second, 17:19:30 on 5 June and 15:39:00 on 9 June, 200 km south-east of Dzhezkazgan
    (Afanasyev and Vorontsov in «Мировая пилотируемая космонавтика», pp. 288 to 289; the 1981 yearbook of the Great Soviet
    Encyclopedia); the ship separated at 14:28:18 UTC, 528 s after liftoff (McDowell);
  - the launch vehicle, the 11A511U (McDowell's launch log, Zh15000-196), on which every Soyuz T to T-11 flew (MPK, p. 264);
  - the ship's 6,850 kg (McDowell; the type's table in RKK Energia's history, ch. 6: 6,855 kg; MPK, p. 287: 6.83 to 7.00 t),
    the type's modules (MPK, p. 287: the orbital module 1.1 t, the instrument module 2.75 t, the descent module about 3 t);
  - its orbit at insertion, **202 by 249 km at 51.6°** (Spacefacts; Russian Wikipedia the same, with 88.7 min, unsourced).
    Encyclopedia Astronautica has 195 by 232 km, and 88.7 min fits those heights, not 202 by 249 (89.0 min). No Soviet figure
    was read;
  - **the first day**: tests of the systems, and «на четвертом витке выполнен первый двухимпульсный маневр подъема орбиты»
    (Vasilyev, the crew's instructor, p. 129); the one-day approach, the far approach beginning on the last revolution of the
    day; McDowell's orbit for the ship on 6 June, 262 by 317 km at 51.62°;
  - **the docking**, at 18:58 on 6 June: automatic to 180 m (TASS, in the yearbook and NASA's chronology), the computer's
    request to brake near 200 m confirmed late, the turn, Igla's loss of the station and the approach given up; Malyshev
    backed away, found the station and docked by hand at Salyut 6's aft port, ten minutes before the shadow (Vasilyev,
    pp. 129 to 130; MPK, p. 288);
  - **the return**: undocked early on 9 June (Spacefacts: 09:20 UTC), «Через виток был отделен бытовой отсек» (MPK, p. 288;
    McDowell's orbital module in orbit from «1980 Jun 9 1030?» UTC), then the braking burn and the parting (the yearbook),
    the Argon-16 flying it all and the crew watching;
  - the type (MPK, p. 287; RKK Energia, ch. 6): the 11D426 main engine of 315 kgf sharing its tanks with the approach and
    attitude thrusters, the braking burn after the orbital module goes, a reserve parachute of 590 m², six soft-landing motors,
    4.2 days alone; the second-generation escape tower let go at 123 s.
- **Not found anywhere reached**:
  - any instant of this flight's ascent but the ship's separation, and any of the 11A511U's own;
  - when in the fourth revolution the raise was made, and the impulses of the approach's later burns;
  - Salyut 6's orbit on 6 to 9 June 1980;
  - the braking burn's instant, length and impulse, and the parting's instant; the parachute system's height;
  - the landing's point: only «200 км юго-восточнее Джезказгана»;
  - the 11D426's specific impulse from a primary source (lpre.de's table has 292 s).

## The launch vehicle: the 11A511U

As for Soyuz 16 ([its mission.md](../soyuz-16/mission.md), "The launch vehicle"): the 11A511U's gain is sized on the type's own
table, a Soyuz T of 6,855 kg to a mean height of 220 km, not on this flight. This ship of 6,850 kg is at that capability, and
the orbit given for it, a mean height of 225.5 km, is above it: Block I runs dry with the stage level at 202 km and its
osculating apogee 224.9 km. The miss is recorded, not fitted.

## Each input, and its argument

| Input | Value | Confidence | Argument |
| --- | --- | --- | --- |
| The ascent's instants | Soyuz 3's for the stages; the tower 123 s; the fairing 161 s; the separation 528 s | assumed; documented; assumed; derived | the last crewed instants read; the Soyuz T's escape system (RKK Energia, ch. 6); the 11A511's table; McDowell |
| The orbit at insertion | 202 × 249 km, 51.6° | documented | Spacefacts |
| The ship | 6,850 kg: orbital module 1,100, descent module 3,000, the instrument module 2,750 | documented; documented; derived | McDowell; MPK, p. 287; what is left, which is MPK's 2.75 t |
| The raise | 19.9 m/s at the perigee on the fourth revolution (4.6 h), 17.6 m/s at the apogee half a revolution later, along the motion | estimated; derived | the instants by the perigee put at the cutoff, over the ellipsoid under the apsides; each impulse the one that joins the insertion orbit to McDowell's of 6 June, on the vis-viva |
| The approach, the docking and the docked days | not flown | — | Salyut 6 is not in the plan; the ship waits in the phasing orbit |
| The orbital module | let go at 13:30 on the 9th | documented | McDowell, with his question mark; a revolution after the undocking (MPK) |
| The main engine | 315 kgf, 292 s, 316 kg | documented; documented; derived | MPK, p. 287; lpre.de (tertiary); the load what the record has it burn |
| The braking burn | 41 min before the touchdown, 210 s, 117 m/s, against the motion | assumed; estimated; derived | Soyuz 10's interval (TASS, 1971); Spacefacts' "about 3 to 4 minutes"; that length on this ship without its orbital module |
| The parting | 12 min 4 s after the burn's start | assumed | Soyuz 11's plan |
| The descent module | L/D 0.25, drag, trim, lift up; 3,000 kg | as Soyuz 3's; documented | the 7K-OK's, the Soyuz T keeping its shape (MPK, p. 287); MPK |
| The parachute system | 7 km; the drogue and the main of 1,000 m² | assumed; documented | the type's in 1971 (Kamanin); MPK, p. 287 |
| The landing | 46.5° N 69.6° E, on 350 m | derived; estimated | 200 km south-east of the town (47°47′ N 67°43′ E) on the sphere; the ground by judgement |

## What the run gives

From the pad, on the day's air: the greatest dynamic pressure is 38.1 kPa, 3.98 g on the strap-ons and 3.36 on Block I.
Block I runs dry at 532.0 s with the stage level at 202 km: **202.0 by 224.9 km osculating** against the published 249,
**a miss**. The raise of the fourth revolution leaves **263.2 by 302.9 km** (McDowell: 262 by 317; from the published orbit
it holds, 261.6 by 316.2). The orbital module goes at 13:30 on the 9th. The braking burn is timed for the landing place
(sim/plan.ts `LandingAim`); the entry's greatest load is 3.0 g with the lift held up; on the ground at 3.8 m/s **827 s after
the record and 98 km across the track** from the point worked from the words (187 km from the published orbit).

## Against the record

The misses are recorded in src/sim/misses.ts: the apogee at insertion (the vehicle as sized on its type's own capability does
not put this ship on the orbit given for it, which no Soviet source read confirms), the raised apogee from the pad (from that
lower insertion), the landing across the track, from the pad and from the published orbit, and the touchdown's instant (the
station not flown, the burn timed for a place worked from words). Nothing was adjusted to bring a check in.

## What is simplified

- **The rendezvous and docking with Salyut 6 are not flown**: the station is not in the plan. The fourth revolution's raise
  is flown; the far approach, the semi-automatic close approach given up near 200 m, the docking by hand, the three days
  docked and the undocking are on the record as events, and the ship waits out those days in its phasing orbit.
- The raise is two burns at the apsides of estimated instants, of the impulses that join the published orbits.
- The approach and attitude thrusters (DPO) are not separate engines; the propellant they shared with the main engine is not
  carried, only what the main engine burns.
- The braking burn's instant and length and the parting are Soyuz 10's, Spacefacts' and Soyuz 11's figures; the descent
  control system's steering to the landing place is not flown (the lift is held up).
- The reserve parachute and the second-generation escape are not flown; the escape tower flies the first tower's mass.
- The 11A511U is the 11A511's blocks with its own engines and a gain sized on Block I's mass.
