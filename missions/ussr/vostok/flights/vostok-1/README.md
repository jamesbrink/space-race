# Vostok 1

**12 April 1961 · Yuri Gagarin · callsign Кедр (Kedr, "Cedar") · Vostok 3KA No. 3 · Vostok-K 8K72K No. E103-16 · Site 1, Tyuratam**

The first human spaceflight: one orbit of the Earth in 106 minutes, flown automatically, ending with
the pilot ejecting from the descent module and landing by parachute near the Volga.

## What is built, and what is not

| | State |
| --- | --- |
| Spacecraft (3KA No. 3, as in orbit) | **built**: [spacecraft.md](spacecraft.md), [model/vehicle.py](model/vehicle.py) |
| Launch vehicle (8K72K: core, four strap-ons, lattice, Block E, fairing) | **built**, every station estimated: [vostok-8k72k.md](../../vehicles/vostok-8k72k.md) |
| Launch site (Site 1) | **first stage built** ([model/pad.py](model/pad.py); [site-1.md](../../sites/site-1.md)): the platform on its pylons, the flame pit to its mapped rim, the launch system's ring with its four supports and four guides, the vehicle hanging in them turned to the launch azimuth; the steppe round it with the tracks that came onto the platform, under the sky of 06:07 UTC. Not yet: the cable mast, the service trusses and the erector, the two tall masts; the supports do not yet fall back at liftoff (site-1.md lists it all) |
| The place round the pad (April 1961) | **built** as the flight's `surroundings` ([site1/model/1961-04.py](../../sites/site1/model/1961-04.py), `pnpm model:site-1`; [site-1.md](../../sites/site-1.md), "The place round the pad"): the command bunker 207 m north with its four periscopes, the storage bunker's three bays, the propellant shed, the gas receivers, five more buildings, the nine positions round the pit's rim, the spoil heap, the cable conduit, the floodlight tower, the double fence with its lights and six towers, and the roads painted on the land. Its plan is the CIA's, off the U-2's photographs of 1957 and 1959, and today's map; every wall, door and colour is estimated, and no inside is modelled |
| Crew (Gagarin in the SK-1, to be walked as) | built ([sk-1.md](../../crew/sk-1.md)): he stands on the platform's deck on the hatch side (where, estimated), and can be walked as there; he rides in the spacecraft's seat |
| The mission as a record and a plan | [mission.md](mission.md); the numbers in [orbital.ts](orbital.ts) (`Flight.orbital`). The coast from the published orbit to 7 km is flown in tests (`flyOrbit`), with its misses recorded; the ascent is not |
| Trajectory, checks, the flight as flown | not written: `flight.ts` has no `trajectory`, `checks` or `flies`, so the clock runs but nothing flies. What was found toward one is in [vostok-8k72k.md](../../vehicles/vostok-8k72k.md), "What a staged trajectory will need" |

So the gallery shows the whole vehicle as it stood on the pad, the spacecraft under its fairing, in
the studio setting with nothing holding it up: to be turned, cut open and taken apart the way it
staged, down to the spacecraft as it was in orbit; and the launch site shows it hanging in the
launch system at Site 1, its tail 6.75 m down in the platform's opening. Everything below is the record that the rest
will be built from.

## The launch vehicle as flown

8K72K No. E103-16: all five engines of the core and the four strap-ons lit on the pad, thirty-two
chambers, at a liftoff mass of 287 t. What each stage did, and when, as far as the sources read
give it ([vostok-8k72k.md](../../vehicles/vostok-8k72k.md) has the stages' figures and what a
simulated ascent will need):

| T+ | Event | How | Source |
| --- | --- | --- | --- |
| 0 | Liftoff on about 4,000 kN | Four RD-107 and the RD-108, burning together | thrust: Energomash's table by way of Brügge; Siddiqi has 409.8 tf |
| about 60 s | 3 to 4 g; pulse 150 | | RussianSpaceWeb, from Gagarin and the medical record |
| 119 s | The four strap-ons separate | Throttled back, ties at the foot let go, each swings out on its tip ball and falls away | Siddiqi p. 277; the manner from Minakov |
| 150 to 156 s | Fairing jettisoned | Two halves | Gagarin: 150; RussianSpaceWeb: 154; Siddiqi's figure: 156 |
| about 300 s | Third stage lights, core cut off and left | Hot staging through the lattice. At about 5.5 km/s | Siddiqi: 300; RussianSpaceWeb: 299 and the speed |
| 676 s | Third stage cutoff: orbit, 181 by 327 km | | Siddiqi p. 277; the orbit from the OKB-1 report |
| 688 s | Spacecraft separates | Pushed off Block E's adapter | OKB-1 report: 09:18:28 |

The orbit's top came out 97 km above the 230 km planned. Zak puts it to the core's engine running
about half a second long; Siddiqi (2015), from the documents published in 2011, to a faulty valve
on the third stage's engine. The OKB-1 report read here does not say.

Not yet in this repo: the pitch programme, the launch azimuth as flown (37.5° east of north is
derived from the orbit), any drag figure, and so any `trajectory`. The vehicle is shown standing;
it does not fly.

## What happened

All times are Moscow time (UTC+3), as every report of the flight gives them.

Gagarin was sealed in at 07:50. One of the hatch's contacts did not show closed, so three engineers
took out all thirty screws, reseated the hatch and put them back, which took most of an hour.
Liftoff was at 09:06:59.7. The four strap-ons left at T+119 s, the fairing about half a minute later
("At second 150 the fairing separated", he reported), the core shut down at T+300 s and the third
stage at T+676 s. The stage burned long: the orbit was 181 by 327 km where 180 by 230 had been
planned. That mattered: the design's answer to a failed braking engine was to wait for the orbit to
decay, on supplies for ten days, and a higher orbit decays more slowly. The spacecraft separated at
09:18:28.

It flew itself. The controls were locked; the code to free them, 1-2-5, was in an envelope on
board. The ship was turned to the Sun for retrofire and the TDU-1 lit at 10:25:04.2. It was shut
down by its timer at 10:25:48.2, not by the integrator that should have measured the impulse: a
valve had not closed (RussianSpaceWeb, from documents published in 2011), the burn came out about a
second and 4 m/s short of the 136 m/s intended, gas went on escaping after the shutdown, and the
ship was left turning. Because the cutoff had come from the timer, the sequencer cancelled the
separation of the modules that should have followed ten to twelve seconds later. Gagarin put the
turning at "about 30 degrees per second, no less"; the report has six, in pitch. The modules parted
at 10:35 by his account, 10:36 by the report, which put it down to the backup system's
temperature sensors. (The older account, in which the lock opened on time and a few cables held the
modules together until they burned through, is Siddiqi's of 2000, written before the report was
published; a wiring harness did hold them for some seconds after the late separation.)

The ball settled heavy side first. He felt "beyond 10g". At about 7,000 m hatch No. 1 was thrown
off and the seat followed. He
came down under an orange canopy beside the Volga, near the village of Smelovka in Saratov oblast,
at 10:53; the empty descent module had landed at 10:48 a kilometre and a half away.

For ten years the Soviet Union said he had landed in his ship, because the rules for a record
required it.

## Timeline

| Moscow time | T+ | Event | Source |
| --- | --- | --- | --- |
| 09:06:59.7 | 0 | Liftoff | Siddiqi, launch log; the OKB-1 report has 09:06:59 |
| | 119 s | Strap-on boosters separate | Siddiqi p. 277 |
| | about 150 s | Fairing jettisoned | Gagarin's report (150 s); Siddiqi's figure has 156 s, RussianSpaceWeb 154 s |
| | 300 s | Core stage cutoff | Siddiqi p. 277 (RussianSpaceWeb: 299 s) |
| | 676 s | Third stage cutoff: orbit | Siddiqi p. 277 |
| 09:18:28 | 688 s | Spacecraft separates | OKB-1 report |
| 10:25:04.2 | 78 min 05 s | Braking engine on | OKB-1 report |
| 10:25:48.2 | 78 min 49 s | Braking engine off, by timer | OKB-1 report: 44.0 s after the command; thrust for about 40 s |
| 10:35 to 10:36 | about 89 min | Modules separate | Gagarin: 10:35; OKB-1 report: 10:36 |
| 10:42 | about 95 min | Hatch No. 1 and the seat leave at about 7 km | RussianSpaceWeb; Gagarin for the height |
| 10:48 | 101 min | Descent module lands | OKB-1 report |
| 10:53 | 106 min | Gagarin lands, 51°16′ N 45°59′ E | OKB-1 report |

The duration long printed, 108 minutes, and the landing time 10:55 come from the announcements of
the day; the report's own times give 106.

## The orbit

| | As flown | Announced by TASS on the day |
| --- | --- | --- |
| Perigee | 181 km | 175 km |
| Apogee | 327 km | 302 km |
| Inclination | 64°57′ (64.95°) | 65°4′ |
| Period | 89.44 min | 89.1 min |

As flown is the OKB-1 report of 3 May 1961. Other figures in print (169 by 315 km; 89.34 min) have
not been traced to a document.

## The sky at liftoff

Computed by `src/world` from [site-1.ts](../../sites/site-1.ts) and the launch instant
(06:06:59.7 UTC), and held to these figures by `tests/world.test.mjs`:

| | Azimuth | Elevation |
| --- | --- | --- |
| Sun | 142.1° | 46.9° |
| Moon | 193.3° | 35.0°, 12% lit: a waning crescent three days before new |

JPL Horizons gives the same Sun and Moon for Baikonur at 06:07 UTC to a hundredth of a degree (the
same test file).

**The weather, as recorded, and as shown.** No observation made at the range that morning has been
read. The weather stations along the railway either side of it reported, in NOAA's Integrated Surface
Database: at Kazalinsk, 97 km west, at 06:00 UTC (seven minutes before liftoff), seven oktas of the
sky covered, no low or middle cloud, the high cloud "dense cirrus, in patches or entangled sheaves",
the wind from 140° at 2.1 m/s, 12.2 °C; at Dzhusaly, 74 km south-east, at 03:00 UTC, the same seven
oktas of the same cloud, calm; at Kzyl-Orda, 214 km south-east, at 06:00, the whole sky under
cirrostratus; visibility 50 km at the last two. [weather.ts](weather.ts) (`Flight.weather`) takes
the first two for the site between them, and the launch site is drawn under that: no cumulus, cirrus
over seven eighths of the sky at 9 km, thin enough that the Sun casts its shadows through it
(estimated: its height and its thickness are not recorded). The site was first drawn under a clear
sky, from a reading of the film; the stations are preferred. It stays an open question until a
report from the range itself is read ([site-1.md](../../sites/site-1.md), "The land").

## Sources

In order of weight; full entries in [docs/sources.md](../../../../../docs/sources.md), "Vostok".

1. OKB-1, *Preliminary report on the results of the launch of the third Vostok-3A satellite-ship*,
   3 May 1961 (signed Korolev, Bushuyev, Tikhonravov). The times, the orbit, the engine's cutoff.
2. Gagarin's report to the State Commission, 13 April 1961, and the questions put to him.
3. Siddiqi, *Challenge to Apollo*, NASA SP-2000-4408: the design, the launch morning, the ascent.
4. Siddiqi, "Declassified documents offer a new perspective on Yuri Gagarin's flight", The Space
   Review, 2015: what the documents changed.
5. RussianSpaceWeb (Zak) on the flight, for the valve and the shortfall.
