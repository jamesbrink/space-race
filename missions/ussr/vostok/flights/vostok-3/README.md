# Vostok 3

**11 to 15 August 1962 · Andriyan Nikolayev · callsign Сокол (Sokol, "Falcon") · Vostok 3KA No. 5 · Vostok-K 8K72K No. E103-23 · Site 1, Tyuratam**

Four days in orbit, and the first half of the first group flight: [Vostok 4](../vostok-4/README.md)
left the same pad 23 hours 32 minutes later into nearly the same orbit. The first man to undo his
straps and float, the first television from a crewed spacecraft to go out on broadcast, the first
voice between two ships; ending as the two before it had, with the pilot ejecting from the descent
module and landing by parachute. Backup: Valeriy Bykovskiy; reserve for both ships: Boris Volynov.

## What is built, and what is not

| | State |
| --- | --- |
| Spacecraft (3KA No. 5) | **built**: [spacecraft.md](spacecraft.md), [model/vehicle.py](model/vehicle.py). The type's model ([vostok-3ka.md](../../vehicles/vostok-3ka.md)) with what this flight is known to have carried that can be drawn: the two television cameras as the Seliger camera was photographed, and a hand-held film camera |
| Launch vehicle (8K72K No. E103-23) | **built**, as the type ([vostok-8k72k.md](../../vehicles/vostok-8k72k.md)): nothing read says how this vehicle differed from Vostok 1's |
| Pilot in the seat | built: the SK-1 figure ([sk-1.md](../../crew/sk-1.md)), "СССР" on the helmet. His height was not found, so the figure is the one built to Gagarin's |
| Launch site (Site 1 as it stood on 11 August 1962, repaired after the fire of 1 June) | **built**: [model/pad.py](model/pad.py), the site's modules at that date; the morning in [pad.ts](pad.ts). The launching structure is built as it stood in 1961: what the repair changed is not in anything read. What of this morning is built and what not, below ("The morning at the pad") |
| Crew to be walked as | **built**: [model/crew.py](model/crew.py), the SK-1 figure as Gagarin's (Nikolayev's height not found) |
| The day's weather as data | **written**: [weather.ts](weather.ts), clear, from the range forecaster's word and the stations either side on the railway; ERA5's air over the pad ([aloft.ts](aloft.ts)) |
| The flight as data, flown | **written**: [orbital.ts](orbital.ts), [mission.md](mission.md): the ascent on the type's instants but for the two Kamanin heard counted (687 and 720 s), the orbit Siddiqi gives, the burn (its instant derived from the landing), the descent. Fly is lit: the record as flown by default, everything a hand can do on Vostok 1 |
| The cabin | PD-2-3KA board with a moving orbital position indicator. The board type is inferred for this flight from Tyapchenko, fig. 2, and the surviving Vostok 6 cabin. Its outline and instrument positions are estimated from the photograph. The clock and other gauges carry illustrative readings. |

So the flight has all three places: the Gallery; the Launch site on the morning of 11 August 1962; and
Fly, on the shared flight deck (src/deck/orbitdeck.ts), with nothing in its code that is this flight's.

## The morning at the pad

What the record gives of the morning, and so what the launch site shows (the site's record is in
[site-1.md](../../../places/tyuratam/site-1.md), "What stood when"):

- **The times are Kamanin's**, by the range's clock, two hours ahead of Moscow's (derived: the
  liftoff was at 11:30 Moscow time): the State Commission at 07:30 in a new room beside the bunker,
  the bus at 11:30 with Nikolayev and Bykovskiy suited (09:30 Moscow time), the report to Smirnov,
  the lift. No transcript of the exchanges before liftoff and no roster of the pad were read: the
  erector, the trusses and the cable mast are given Vostok 1's intervals before its liftoff,
  **estimated**, and say so. When he was in the seat is ours (09:40, after the lift).
- **What stood**: the launching structure as in 1961 (it burnt on 1 June 1962, when a Zenit-2's
  rocket fell 300 m away and a strap-on was left burning on it, and was repaired: Kamanin, 22 June;
  Siddiqi, p. 355), the bus (that it was the same LAZ-695B is taken: Kamanin had the cosmonauts
  driven that summer in the «Львов»; its place April 1961's). No fillers: neither an account nor
  a photograph of the morning has them.
- **Not built**: the people at the bus (Smirnov, Korolev, Keldysh, Rudenko, Gagarin and Titov,
  "more than a dozen" more; summer dress, which the figures do not have); Korolev's post, a small
  concrete canopy ten metres from the rocket with the means of communication, where Gagarin,
  Smirnov, Barmin, Kirillov and Kamanin stood with him; the new room beside the bunker. Each is
  documented and none is placed or measured: listed for a modelling agent (issue #21).
- **The land is the summer's** (steppe.ts, `SEASONS`), the place round the pad August 1961's: nothing
  later has been looked for.
- **The weather**: [weather.ts](weather.ts): clear, the wind from the north-east at 6 to 7 m/s.

## The flight as flown

[mission.md](mission.md) has every input's argument and each check against the run. In short: the
type's ascent falls short of an orbit as Vostok 1's and 2's do, and its third stage cuts at 676 s
where the bunker waited for 687. The orbit is begun from the heights Siddiqi and the Great Soviet
Encyclopedia give, on the period they give over the WGS 84 ellipsoid under the apsis (88.34 min, derived:
the reading heights published without a period take, which the sister flights' own heights and periods require; the
88.33 printed beside them has no traceable source, and is what this reading gives). It goes round four days
with the entry's load (8.6 g) in, its apogee as published, and comes down **1,059 km short** of the
record's landing and 90 km across it, Nikolayev 2.4 minutes early: over 64 revolutions a second of period
is 470 km, and no period is known to better than a hundredth of a minute. Over the mean Earth, as until
November 2026, it came down 4,501 km short. TASS's orbit a day on is held as a check at 12:12 on the 12th:
its perigee and period hold (the period 5 s long), its apogee does not (6 km), which says the orbit flown
decays a little too little or began a little high. The misses are in src/sim/misses.ts.

## What is simplified

- The ascent's instants but two, its integrator setting, the aiming azimuth and the burn's minute
  are not this flight's (mission.md).
- The launching structure is 1961's; Korolev's post, the room by the bunker and the morning's
  people are not built (issue #21).
- The pilot is the figure built to Gagarin's height in Gagarin's suit; the reserve canopy is not
  drawn, Nikolayev having locked it.

## What happened

All times are Moscow time (UTC+3) unless they say otherwise.

Glenn's three orbits in February 1962 set it going: Ustinov rang Korolev on 17 February and asked
for two ships in a month. A reconnaissance satellite programme needed the same pad and the same
rocket, and on 1 June one of those rockets fell 300 m from the pad with a strap-on left burning on
it. The repairs took until August. Meanwhile the argument was the old one, how long: Korolev wanted
three days for the first ship and had Khrushchev's word for it; Kamanin and the Air Force's doctors
wanted one, to be extended a day at a time, and pointed to Titov's sickness. The paper signed on
26 July said "up to three days". The same meeting told the pilots what they might turn their ships
to look for (the spent third stage, the other ship, the second launch), the nitrogen being worth
two or three hours of orienting. On 27 July leaving and regaining the seat was tried in an airliner
flying arcs of 25 seconds: out in one arc, back in in four or five.

The cosmonauts flew to Tyuratam on 2 August. Ship No. 5 had passed its tests; No. 6 had not, and
the launches set for the 9th and 10th became the 11th and 12th. On the evening of the 9th a
rejected washer was found among the ejection seat's spares, the seat already in the ship had to be
drawn out and checked, and the rocket reached the pad at 21:00, two hours late. On the 10th
Nikolayev sat in the ship for half an hour with Korolev beside him.

On the 11th the State Commission met at the pad at 07:30 (the forecast: an anticyclone, clear, wind
6 to 7 m/s). Nikolayev was at the pad two hours before liftoff and took so long over his cabin
check that Korolev asked why there was no word from him. He reported 26 °C and 50% humidity.
Liftoff was at 11:30, within half a second of the time set three days before. The bunker listened
to the seconds counted to 687, the end of the third stage's burn; at 720 the ship came away and
let out its antennas. The load had reached 6 to 7 g, with the vibration growing toward the end of
the core's burn.

He looked for the spent stage and could not find it. Two hours up the orbit was reported to
Khrushchev; Kozlov on the telephone made Nikolayev a lieutenant colonel and then corrected himself
to major. About four hours up Khrushchev spoke to him and he heard half of it through the noise:
the link to the ground was poor all the first day. Very carefully, he undid the harness; "after
release one is drawn up and forward". He did it four times in the flight, about an hour each,
talked on the radio and filmed while loose, and felt none of what Titov had felt. On the seventh
orbit, some six hours up, Soviet television showed him live. He slept from 22:00 for seven hours.

On the 12th he turned his ship fifteen minutes before Vostok 4's launch, had it pitched 73° at
11:03, looked for the rocket and saw nothing. Popovich was in orbit a few kilometres from him
within a quarter of an hour, and the two were soon talking on short wave. From then the two ships
kept the same day: meals, exercises, sleep.

By his 29th orbit the cabin had gone from 27 °C to 13, and it stayed there; he said he was holding
it low on purpose. For ten orbits of one night the Tral telemetry did not record. On the evening of
the 13th the State Commission argued a fourth day, Kamanin against; asked over the radio, Nikolayev
said he felt excellent and could go on (Kamanin, judging by his voice, thought him tired).
At 07:00 on the 14th it was settled: Vostok 3 down on its 65th orbit, Vostok 4 on its 49th, both on
the morning of the 15th. The wind at the landing ground that day was up to 20 m/s.

The two ships fired their braking engines within six minutes of each other (Siddiqi, p. 360). He felt the braking engine's push and heard it run for 42 seconds. The ball
turned at changing rates in the thick air; he saw smoke, then flame of several colours, heard the
shield crackle, and took 8 to 9 g. He ejected, locked his reserve parachute once the main was
open, and landed at 09:52 on a level patch two metres square in ground strewn with rocks, south of
Karaganda. The antennas of his emergency kit's radio had not been thrown out. The descent module
had landed about twelve minutes before.

The two were flown to Kuybyshev on the 16th, reported to the State Commission that evening, and
were in Red Square on the 18th. At the press conference of 21 August the weight of the ships was
asked for and given as "about five tons".

## Timeline

| Moscow time | T+ | Event | Source |
| --- | --- | --- | --- |
| 11 August, 11:30:00 | 0 | Liftoff | TASS; Keldysh, 21 August; Siddiqi's launch log ("1130"). The second: Kamanin, "held to within 0.5 s" of 11:30 |
| | 687 s | Third stage shuts down: orbit | Kamanin (the count the bunker waited for); Siddiqi p. 356 |
| | 720 s | Ship separates; antennas out | Kamanin, 14 August |
| | | Strap-ons, fairing, core cutoff | **not found for this flight.** Vostok 1's were 119, about 150 and 300 s |
| about 13:30 | 2 h | Orbit worked out and reported to Khrushchev | Kamanin |
| about 15:30 | 4 h | Khrushchev speaks to him, on the fourth orbit | Kamanin's record of his report; Siddiqi p. 357 |
| about 17:30 | 6 h | First live broadcast, on the seventh orbit | Siddiqi p. 357 |
| 22:00 | 10 h 30 | Sleep, for seven hours | Siddiqi p. 357 |
| 12 August, 10:47 | 23 h 17 | Turns the ship to watch for Vostok 4's launch; pitched 73° at 11:03 | Kamanin's record of his report |
| 11:02:33 | 23 h 32 min 33 s | Vostok 4 lifts off | see [Vostok 4](../vostok-4/README.md) for the second |
| 12:12 | | TASS: 176.7 by 227.6 km, 88.2 min, 64°59′ | *Flight International*, 23 August 1962, p. 289 |
| 21:00 | | Sleep | TASS, the same |
| 13 August, 04:40 | | Wakes by himself | Kamanin |
| evening | | State Commission on a fourth day; he agrees | Kamanin, 13 August |
| 14 August, about 04:00 | | Wakes; reports 12 °C, 1.1 atm, 70% humidity | Kamanin, 14 August |
| 07:00 | | Landing set for the 65th orbit, 15 August | Kamanin |
| 15 August, 09:39:59 | 3 d 22 h 9 min 59 s | Descent module lands | Glushko's encyclopedia (1985), p. 66, as Siddiqi gives it (p. 360, note 29) |
| 09:52 | 3 d 22 h 22 min | Nikolayev lands, 48°02′ N 75°45′ E | Siddiqi, Table IB (the duration); the place as Russian Wikipedia prints it. TASS on the day: 09:55 |

The braking burn's minute was not found. Its length is his: 42 seconds, by ear.

## The orbit

| | As printed since | Announced on the day | TASS at 12:12 on 12 August |
| --- | --- | --- | --- |
| Perigee | 180.7 km | 183 km | 176.7 km |
| Apogee | 234.6 km | 251 km | 227.6 km |
| Inclination | 64.98° | 65° | 64°59′ |
| Period | 88.33 min (origin unknown) | 88.5 min | 88.2 min |

"As printed since" is Siddiqi's text (p. 356) and Table IB for the heights and inclination (the
Great Soviet Encyclopedia gives the same heights), and the period Russian Wikipedia prints beside
them, a figure of unknown origin that is not flown (mission.md, "The orbit", has every period found); "announced on the day" is what Nikolayev read out
on 21 August as the initial orbit, and what the film *Звёздные братья* draws on its globe (Апогей
251 км, Перигей 183 км). **No OKB-1 report of this flight has been read.** `flight.ts` and
`orbital.ts` take 180.7, 234.6 and 64.98°, and no published period: the period flown is the one those
heights give over the ellipsoid under the apsis, 88.34 min (derived; 88.54 over the mean Earth), beside the
announced 88.5 and the American tracking's 88.5. TASS's figures of the 12th are held as a check of the orbit at 12:12 that day.

## Where the sources disagree

- **The orbit.** Three sets, above. 88.33 min goes with 180.7 by 234.6 km only over the ellipsoid
  under the apsis (88.34 min, nodal), the ball the sister flights' heights stand on; over a sphere of
  6,371 km those heights give 88.5 min by Kepler's third law, which is the announced figure.
  *Flight* plotted TASS's five sets of elements and found a step in Vostok 3's between 10:00 and
  21:00 on the 12th, and wondered whether the ship had manoeuvred. It could not: the step is in the
  announcements.
- **The landing time.** 09:52 (the duration in Siddiqi's table, 3 d 22 h 22 min; Russian Wikipedia;
  spacefacts.de) or 09:55 (the TASS message of 15 August as *Flight* printed it).
- **The landing place.** 48°02′ N 75°45′ E (Russian Wikipedia's infobox, which in another line has
  42°02′, a slip); 48°03′32″ N 75°41′02″ E (spacefacts.de). The cosmonauts said they landed about
  200 km apart; the two flights' printed places are about 290 km apart, and RussianSpaceWeb has
  Popovich 305 km to the west.
- **How near the ships came.** "About five kilometres" (both pilots, 21 August; Mishin later); 6.5 km
  (TASS, as the encyclopedias repeat it). Siddiqi: "reports differ … from five to six and a half".
- **Whether either saw the other.** TASS on the 12th: Nikolayev "observed the flight of the Vostok 4
  spaceship through the porthole". His own report to the State Commission, as Kamanin wrote it
  down: he looked for the launch and did not see it. Siddiqi: "it seems … neither cosmonaut ever
  spotted the other's spacecraft".
- **The launch vehicle's number.** E103-23 in McDowell's launch log and on spacefacts.de
  ("Ye10323"), with E103-22 for Vostok 4: the higher number flew first. Siddiqi's launch log gives
  no number for either.
- **Whether the 400-line television was new.** Efimov, who built the receivers, says Gagarin's and
  Titov's flights used the 100-line system unchanged and that new cameras and transmitters were made
  "for Vostok 3 and the others". Kotelnikov said on 11 August 1961 that Vostok 2 already carried a
  400-line system beside the old one ([Vostok 2](../vostok-2/README.md)). Both are on record; what
  is not in dispute is that Vostok 3's picture was the first to be broadcast.

## The sky at liftoff

Computed by `src/world` from [site-1.ts](../../../places/tyuratam/site-1.ts) and the launch instant
(08:30:00 UTC), and held to these figures by `tests/world.test.mjs`:

| | Azimuth | Elevation |
| --- | --- | --- |
| Sun | 197.8° | 58.4° |
| Moon | 90.5° | 27.4° below the horizon, 77% lit: waxing, four days before full |

Just past noon by the Sun, which had crossed the south some forty minutes before; 35 °C by
Kamanin's account. The Moon agrees with the record twice: "almost a full moon" over the cosmonauts'
cottage on the evening of the 10th (Kamanin), and Nikolayev's "there was a full Moon during our
flight", bright enough to read his switches by.

## Sources

In order of weight; full entries in [docs/sources.md](../../../../../docs/sources.md), "Vostok 3
and Vostok 4".

1. Kamanin's diary, 13 July to 18 August 1962: the preparation day by day, the launch from the
   bunker, the State Commission's sessions, and his record of both pilots' reports of 16 August.
2. The press conference of 21 August 1962 (Keldysh, Nikolayev, Popovich, Yazdovsky), and the TASS
   reports of 12 to 15 August, as translated in *Flight International*, 23 and 30 August and
   6 September 1962.
3. Siddiqi, *Challenge to Apollo*, pp. 354 to 361, the launch log and Table IB: the serial numbers
   of the ships, the orbit, the masses, the durations.
4. Chertok, *Rockets and People*, vol. 3, pp. 204 to 208: the radio task, the power margin, the
   washer, the control post.
5. Efimov's two articles on the Seliger television system (1996, 2007): the cameras, the rebuild to
   400 lines, the first broadcast, and the photograph the model's cameras are read from.
6. Semenov (ed.), *RKK Energia 1946–1996*, p. 116: the filming programme.
7. The film *Звёздные братья* (1962): the morning at the pad, the helmets, the received television
   pictures.
8. Zak, RussianSpaceWeb, "Joint flight of Vostok-3 and Vostok-4".
