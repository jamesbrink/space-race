# Vostok 2

**6 to 7 August 1961 · Gherman Titov · callsign Орёл (Oryol, "Eagle") · Vostok 3KA No. 4 · Vostok-K 8K72K No. E103-17 · Site 1, Tyuratam**

The first day in space: seventeen orbits in 25 hours, the first meals and the first sleep in
orbit, the first space sickness, the ship turned by its pilot's hand for the first time, ending as
Vostok 1 had with the pilot ejecting from the descent module and landing by parachute in Saratov
oblast. Backup: Andriyan Nikolayev.

## What is built, and what is not

| | State |
| --- | --- |
| Spacecraft (3KA No. 4) | **built**: [spacecraft.md](spacecraft.md), [model/vehicle.py](model/vehicle.py). The type's model ([vostok-3ka.md](../../vehicles/vostok-3ka.md)) with what this flight is known to have added that can be drawn: the film camera |
| Launch vehicle (8K72K No. E103-17) | **built**, as the type ([vostok-8k72k.md](../../vehicles/vostok-8k72k.md)): nothing read says how this vehicle differed from Vostok 1's |
| Pilot in the seat | built: the SK-1 figure ([sk-1.md](../../crew/sk-1.md)), "СССР" on the helmet. His height was not found, so the figure is the one built to Gagarin's |
| Launch site (Site 1 as it stood on 6 August 1961) | **built**: [model/pad.py](model/pad.py) and the place [1961-08.py](../../sites/site1/model/1961-08.py), the site's modules at that date; the morning in [pad.ts](pad.ts). What changed since April, and what of this morning is built and what not, below ("The morning at the pad") |
| Crew to be walked as | **built**: [model/crew.py](model/crew.py), the SK-1 figure as Gagarin's (Titov's height not found) |
| Trajectory, the orbit as data, the flight as flown | not written. The record below is what was read on the way |

## The morning at the pad

What the record gives of this morning, and so what the launch site shows (the research is
summarised in [site-1.md](../../sites/site-1.md), "What stood when"):

- **The times are the plan's.** Doc 190 of «Первый пилотируемый полёт» (2011), book 2, the
  schedule of 4 August in local time (Moscow's plus two: derived), which Titov's report says the
  day kept to: the drive to the pad, the farewell, the stair and the lift 06:45 to 07:00, in the
  seat 07:00 to 07:40, hatch No. 1 closed 07:40 to 07:55. No transcript of the exchanges before
  liftoff and no roster of the pad were found: the erector, the trusses, the cable mast and the
  fillers are given Vostok 1's intervals before its liftoff, **estimated**, and say so.
- **Liftoff 09:00:00**: the Central Aero Club's act for the record file (book 2, doc 194, p. 221);
  RKK Energia's page of 2011 has 08:59:57.
- **What stood**: the launching structure as in April (CIA PIC/JR-8/61, p. 13: "probably
  unchanged"), the same LAZ-695B stopped about where April's did (the film «Снова к звёздам»;
  its place taken from April's), a filler on the south track at the farewell (RussianSpaceWeb's
  photographs). Site 51, 415 m north, burnt out when an R-9 fell back on it on 3 August
  (Chertok, vol. 3, pp. 131, 187): how it looked afterwards is not recorded, and nothing is built
  there.
- **Not built: the people.** The film has about a hundred on the concrete as the bus stopped and
  forty walking with him to the stair (counted off a 960 px copy: estimated), all in summer dress;
  Smirnov, now the State Commission's chairman, in a white jacket and a straw hat; Korolev and
  Barmin; Nikolayev suited at the bus, the two knocking helmets together. Kamanin and Gagarin
  were abroad. The ground party's figures are dressed for April: summer clothes are new geometry,
  listed for a modelling agent. April's people, car and truck are not shown.
- **The land is the summer's**: the steppe "dried out ... a uniform reddish-gray" by June (Chertok,
  vol. 2, p. 357), the tulips and the spring's green gone (src/viewer/steppe.ts, `SEASONS`).
- **The weather**: [weather.ts](weather.ts), from the stations either side of the range.

## What happened

All times are Moscow time (UTC+3), as every report of the flight gives them.

After Gagarin's one orbit the argument was how long the second flight should be. The doctors and
the Air Force wanted three orbits; Korolev wanted a day, because after the first few orbits the
Earth does not bring the landing ground on the Volga back under the track until it has turned once
round. He had his way. 3KA No. 4 was the only ship ready.

Titov and Nikolayev were woken before dawn on 6 August. Fixing the sensors to Titov took forty
minutes longer than planned. He was at the pad two hours before liftoff, in the orange suit and a
helmet lettered СССР, spoke a few words from the head of the stair, was handed the log book with
its pencil on a string, and went up in the lift. Liftoff was at 09:00 (08:59:57 by
RussianSpaceWeb). The ascent was without incident; by 09:20 the tracking stations and Titov had
confirmed the orbit and TASS was allowed to announce it.

For a few seconds after the third stage shut down he felt he was flying upside down. At 10:00, in
the Earth's shadow, he keyed the lock on the controls and took the ship by hand: twenty seconds
to stop its turning, ten minutes to put it where he wanted it. Over the Soviet Union at the start
of the second orbit he filmed the Earth for about ten minutes with a Konvas newsreel camera, its
exposure meter already broken, and at 10:38 read his report to Khrushchev. He ate lunch from tubes
at about 12:30 with no appetite. From the third or fourth orbit his sinuses felt heavy and his eyes
hurt to move; by the sixth, after supper at 17:00, he was nauseous. He flew the ship by hand again
from 17:30 to 17:55, leaving out a half turn to save nitrogen, and at 18:15, over Moscow, said he
was going to sleep. He was sick before he slept. The ground heard nothing from him through the
orbits that do not cross Soviet stations, and at 02:00 on the 7th he did not answer: he had
overslept, and woke at 02:37. From the twelfth orbit he felt well.

The cabin had gone down to 10 °C: both cooling fans had been switched on at launch by mistake.

On the seventeenth orbit the ship was turned to the Sun by its own system and the braking engine
lit at about 09:57. Ten seconds after it stopped Titov heard the charges that free the straps and
reported the modules apart. Then he saw that his lamps, fed from the instrument module, were still
lit. The plate of the cable mast had not been thrown off: the knife that cuts the cables had cut
the wire carrying the order to it a fraction of a second too soon. The two modules entered the air
tied by the cable bundle, without the turning that had followed Gagarin's burn, until it burned
through at about 10:07. He had left his blinds open and watched.

Hatch No. 1 went at about 7 km and the seat after it; he had turned his head to look at a piece of
lining and struck his nose on the helmet. The reserve canopy came out unasked and wound round the
main. He landed on his back in a ploughed field a few dozen metres from a railway line, seconds
after a train had passed, at 10:18, near Krasny Kut in Saratov oblast. The descent module had come
down some five kilometres away.

At the press conference of 11 August the ejection was admitted, as his own choice of two ways
down; Gagarin was still said to have landed in his ship. The sickness was reported by Yazdovsky in
one sentence and by the newspapers not at all.

The descent module was kept in OKB-1's museum until 1964, when it was used as the test article for
the Voskhod's soft landing and destroyed in a drop from an aircraft at Feodosiya.

## Timeline

| Moscow time | T+ | Event | Source |
| --- | --- | --- | --- |
| 6 August, 09:00:00 | 0 | Liftoff | the record file's act (book 2, doc 194): 06 h 00 min 00 s GMT. RKK Energia's page of 2011 and RussianSpaceWeb: 08:59:57 |
| | | Strap-ons, fairing, core cutoff, orbit, separation | **not found for this flight.** Vostok 1's were 119, about 150, 300, 676 and 688 s |
| 09:20 | 20 min | Orbit confirmed by the tracking stations and by Titov | Chertok, vol. 3, p. 191 |
| 10:00 | 1 h 00 | Manual control on, in the Earth's shadow; oriented by about 10:15 | Titov (Pravda, 12 August; his report of 8 August as RussianSpaceWeb gives it) |
| about 10:25 to 10:38 | | Films the Earth for about ten minutes; report to Khrushchev at 10:38 | RussianSpaceWeb; TASS |
| about 11:00 | 2 h | Manual control off, the ship left turning slowly | RussianSpaceWeb |
| 11:48 | 2 h 48 | Second orbit complete | TASS |
| 12:30 to 13:00 | | Lunch | TASS. RussianSpaceWeb: planned for 12:42 |
| 17:00 | 8 h 00 | Supper | TASS |
| 17:30 to 17:55 | | Manual control, seventh orbit | RussianSpaceWeb |
| 18:15 | 9 h 15 | Over Moscow: good night | TASS |
| 18:30 to 02:00 | | Sleep, by the programme | TASS |
| 7 August, 02:37 | 17 h 37 | Wakes, 35 to 37 minutes late | TASS: 02:37. Titov: 02:35 |
| 05:45 | | Breakfast | TASS |
| about 09:57 | 24 h 57 | Braking engine on, for 40 s (RussianSpaceWeb) or 45 s (Pervushin) | RussianSpaceWeb |
| about 10:07 | 25 h 07 | The cable bundle burns through; the modules part | Titov, as RussianSpaceWeb gives it |
| about 10:11 | 25 h 11 | Descent module lands | see "Where the sources disagree" |
| 10:18 | 25 h 18 | Titov lands, 50°51′ N 47°01′ E | TASS; Titov's report in the record file; Keldysh, 11 August |

## The orbit

| | As printed since | Announced by TASS on the day | US tracking |
| --- | --- | --- | --- |
| Perigee | 183 km | 178 km | 172 km |
| Apogee | 244 km | 257 km | 221 km |
| Inclination | 64.93° | 64°56′ | 64.80° |
| Period | 88.46 min | 88.6 min | 88.40 min |

"As printed since" is Siddiqi's Table IB and RussianSpaceWeb for the heights and inclination, and
the period Russian Wikipedia prints beside them; "US tracking" is Encyclopedia Astronautica's
catalogue entry. The planned orbit was 180 km at perigee, as Vostok 1's (RussianSpaceWeb).
**No OKB-1 report of this flight has been read**, so nothing here has the standing that the report
of 3 May 1961 gives Vostok 1's orbit.

## Where the sources disagree

- **The orbit.** Three sets, above. Siddiqi prints TASS's 178 by 257 km in his text (p. 292) and
  183 by 244 in his table. The period 88.46 min does not go with 183 by 244 km: over a sphere of
  6,371 km those heights give 88.6 min by Kepler's third law, which is TASS's figure. `flight.ts`
  quotes 183, 244, 64.93° and 88.6.
- **The liftoff second.** 08:59:57 is RKK Energia's (its page of 2011, archived 8 September 2011,
  which also has the landing at 10:18) and RussianSpaceWeb's, neither naming a document; the Central Aero Club's act for the record file has «6 часов 00 минут 00 секунд по
  гринвичскому времени» («Первый пилотируемый полёт», 2011, book 2, doc 194, p. 221), and
  `flight.ts` takes it. The Sun is the same to a hundredth of a degree either way.
- **25 hours 11 or 18.** TASS, Keldysh and Titov's own report: more than 17 orbits in 25 h 18 min,
  landing at 10:18. The Great Soviet Encyclopedia, Roscosmos and Siddiqi's text: 25 h 11 min
  (Siddiqi's table has 25 h 18). Russian Wikipedia reads the two as the ship's landing and the
  pilot's, seven minutes apart, and RussianSpaceWeb's table gives the landing as 10:11. Vostok 1's
  two landings were five minutes apart, so the reading is likely; **no document giving the descent
  module's landing time was read.** (Keldysh, in the translation read, says "24 hours and 18
  minutes": a slip.)
- **How many orbits.** "More than 17" (TASS), 17 (Siddiqi), 17.5 (Encyclopedia Astronautica), 18
  (RussianSpaceWeb's table). The landing came early in the eighteenth.
- **The braking burn.** 40 s (RussianSpaceWeb) or 45 s (Pervushin). Neither gives the second it began.
- **What held the modules together.** The cable mast's plate and its bundle of cables (Chertok,
  who found the cause; RussianSpaceWeb; Pervushin). Siddiqi (2000), from Golovanov, has "several
  straps": Titov heard the straps' charges fire, and what he then heard knocking was not they.
- **The launch vehicle's number.** E103-17 in Siddiqi's launch log and in Pervushin. spacefacts.de
  prints "Ye10316", which is Vostok 1's.
- **The landing place.** 50°51′ N 47°01′30″ E (spacefacts.de); the monument at 50.8528° N
  47.0205° E (Russian Wikipedia, from a map). Pervushin: a pea field of the collective farm
  "40 let Oktyabrya", 13 km from Krasny Kut; spacefacts.de: 5 to 10 km north of it.
- **The cabin's temperature.** 10 to 22 °C (Yazdovsky, 11 August); 10 to 25 °C (RussianSpaceWeb,
  from a Soviet account); 18 °C by Titov at 18:15.

## The sky at liftoff

Computed by `src/world` from [site-1.ts](../../sites/site-1.ts) and the launch instant
(06:00:00 UTC), and held to these figures by `tests/world.test.mjs`:

| | Azimuth | Elevation |
| --- | --- | --- |
| Sun | 132.0° | 52.6° |
| Moon | 234.3° | 50.6°, 24% lit: a waning crescent five days before new |

A hot, clear mid-morning ("a hot sun hung over the endless steppe", TASS's correspondent). The
Moon agrees with what Titov saw from orbit: the night side of the Earth was grey, not black, lit
by a Moon "на ущербе", on the wane.

## Sources

In order of weight; full entries in [docs/sources.md](../../../../../docs/sources.md), "Vostok 2".

1. *Pravda*, *Izvestiya* and *Komsomolskaya Pravda*, 7 to 12 August 1961, as translated by JPL
   (Astronautics Information Translation No. 24, "The Flight of Vostok II"): the TASS reports orbit
   by orbit, the press conference (Keldysh, Titov, Yazdovsky, Kotelnikov), the morning at the pad.
2. Titov's report in the FAI record file (two pages, as reproduced): the times, the broadcast
   receiver, the landing.
3. Chertok, *Rockets and People*, vol. 3, pp. 187 to 194: what was changed in the ship, the
   morning, the control post, the cause of the failed separation.
4. Siddiqi, *Challenge to Apollo*, pp. 290 to 295, the launch log and Table IB: the serial
   numbers, the mission's objectives, the television, the orbit.
5. Zak, RussianSpaceWeb, "Vostok-2 mission": Titov's report to the State Commission of 8 August
   1961 at second hand, minute by minute.
6. Pervushin, «Тяжёлый рейс», 2021: quotations from the same report in Russian.
7. Kamanin's diary for 1961, by way of Siddiqi (p. 294, citing *Skrytyi kosmos* p. 84) for the two fans: the diary itself has no entries from 25 May to 14 September 1961 (he was abroad with Gagarin).
