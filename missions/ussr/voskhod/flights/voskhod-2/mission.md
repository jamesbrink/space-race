# Voskhod 2: the mission as data

The record of the flight is in [README.md](README.md); this is how that record becomes `orbital.ts`, what it rests on and
what the simulator makes of it. Sources in full: [docs/sources.md](../../../../../docs/sources.md), "Voskhod 2". Times are
Moscow time (UTC+3), and seconds from liftoff at 10:00:00 on 18 March 1965.

## What there is, and what there is not

- **Documented for this flight**, most of it in documents of 1965 released for the fiftieth year (roscosmos.ru/28187):
  - liftoff to the second, by stopwatch (the record commissioners' act, as Borisenko prints it);
  - the crew's instants of the ascent, 118, 153, 292 and 523 s (their report, p. 5), which the logbook prints as the
    plan's: they may be the cyclogram's, not measured;
  - the separation at 10:08:48.1, 528.1 s (OKB-1's report of 6 June 1965, Table 1);
  - the orbit asked for, 180 by 470 km (OKB-1, Table 1), and the orbits on the first, ninth and eighteenth revolutions
    to a tenth of a kilometre and a thousandth of a minute (the record's file, Borisenko p. 128);
  - the airlock let out at 10:22:54.3, the outer hatch open from 11:32:31.5, Leonov out at 11:34:51 and back at 11:47:00,
    the hatch closed at 11:48:34.3 (OKB-1, Table 2; the act);
  - the automatic descent's failure on the 16th and 17th orbits, its commands to the tenth of a second (OKB-1, Table 7);
  - the hand orientation from 11:19:00 (the act; the logbook), the burn's commands (ignition 11:36:27.2, main valve
    11:36:29.5, shutdown about 11:37:09 in a gap in the telemetry: OKB-1, Table 7), the engine's mean thrust, 1,575 kgf
    (Table 5), and its "about 39 s" (Belyayev, to the State Commission);
  - the modules parting at 11:50:56.5 on the thermal sensors (OKB-1, p. 11);
  - the landing system at 11:56:08, at 5,000 m and 220 m/s (the act; Borisenko, p. 103), and touchdown at 12:02:17 at
    59°34′03″ N 55°28′00″ E (the act).
- **Not found anywhere reached**:
  - an aiming azimuth, and why the orbit went higher than planned;
  - the airlock's jettison as an instant (planned 134 to 138 min after separation; OKB-1's Fig. 2 marks about 12:15 to
    12:20, read off a plot);
  - the burn's impulse or integrator setting, and how true the ship was held;
  - the descent module's own mass, the parachutes' areas and heights, the soft-landing rocket;
  - the ground's height under the taiga.

## Each input, and its argument

| Input | Value | Confidence | Argument |
| --- | --- | --- | --- |
| The 11A57 | as Voskhod 1's | | vehicles/voskhod-11a57-flown.ts |
| The ascent's instants | 118, 153, 292, 523 s; separation 528.1 s | documented | the crew's report; OKB-1. The first four may be the plan's |
| The launch plane | solved for 65° | | no azimuth was found |
| The cutoff's height | 180 km | documented | the planned perigee (OKB-1, Table 1) |
| The orbit | 173.5 × 497.7 km, 65°, 90.944 min | documented | the record's file, the first orbit; read as mean elements, the heights and period agree only over a ball of 6,363.4 km, on all three of the file's orbits |
| The airlock | 250 kg, shot off at about 12:20 | documented; estimated | Siddiqi, p. 450; OKB-1's plot |
| The burn | 11:36:29.5 to 11:37:09, against the motion, 112 m/s | documented; estimated; derived | OKB-1's commands; Belyayev's aim by eye; the measured 1,575 kgf over 39.5 s on the ship without its airlock |
| The parting | 11:50:56.5 | documented | OKB-1: fourteen minutes after the burn, about 87 km up as flown here |
| The descent | as Voskhod 1's, from the act's 5,000 m | documented; assumed; estimated | the Vostok ball's parachutes; the 3KV's ball |
| The ground | 237 m | estimated | the SRTM's surface, the trees' tops |

## What the run gives

| Check | Record | Run | Within | Why, if not |
| --- | --- | --- | --- | --- |
| Perigee at the last cutoff | 173.5 km ± 5 | −1,116.4 km | **miss** | the ascent falls short of an orbit (`SHORT_VK2`) |
| Apogee at the last cutoff | 497.7 km ± 15 | 180.0 km | **miss** | the same |
| Inclination | 65° ± 0.2 | 65.00° | yes | not independent |
| Period at the last cutoff | 90.944 min ± 15 s | 75.08 min | **miss** | the same |
| Period, node to node, of the orbit begun | 90.944 min ± 2 s | 90.944 | yes | not independent |
| Apogee as flown round (coast; shown) | 497.7 km ± 5 | 497.1; 490.0 km | yes; **miss** | the shown run begins where the ascent left it, low |
| The ninth orbit (coast) | 173.3 × 496.2 km, 90.928 min | within 2 km and 2 s | yes | |
| The eighteenth orbit (coast) | 173.1 × 494.6 km, 90.910 min | within 2 km and 2 s | yes | |
| The ninth and eighteenth orbits (shown) | as above | 7 km high at perigee, 7 low at apogee | **miss** | begun low, as above |
| Landing across the track (coast; shown) | 0 ± 25 km | −85; −47 km | **miss** | below |
| Landing along the track (coast; shown) | 0 ± 100 km | −583; −390 km | **miss** | below |
| Touchdown | 12:02:17 ± 2 min | 12:02:00 | yes | |
| Touchdown speed | 0.2 m/s ± 1 | 2.1 m/s | **miss** | as Voskhod 1's: the rocket and the parachutes are each an estimate |

The orbit decays across the day as the record's file has it: the coast holds the record's own ninth and eighteenth
orbits to 2 km. The landing does not hold: the burn by hand lands the ball 583 km short of the act's point. As
diagnoses, not inputs: a minute later, 138 km short; at the time read up to them, 11:35:44, 904 km short (the record's
own overshoot, by Kamanin's and Chertok's count, was 368 km); the period 0.05 min shorter, 278 km; 100 m/s, 73 km. The
impulse is derived and the aim was by eye. Nothing is adjusted.

## What is simplified

- The airlock is let out over a minute at its recorded instant and drawn out, not inflated; its inner hatch's opening is
  not timed (no telemetry); Leonov outside is not built; it leaves the scene when it is shot off, not flown on, and the
  spin it gave the ship is not flown (attitude in orbit is not flown).
- The burn is held straight against the motion; Belyayev's position out of his couch is not built.
- The couches fired up before the parachute hatch (Belyayev) are not modelled.
- No bus is built at the pad: none is in anything read for this morning. The night's snow is not drawn, and the
  overcast of stratocumulus is drawn as the viewer's low heaps at full cover.
- There is no crew to walk as: the Berkut figure is built only seated.
