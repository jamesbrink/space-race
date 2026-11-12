# Vostok 1

**12 April 1961 · Yuri Gagarin · callsign Кедр (Kedr, "Cedar") · Vostok 3KA No. 3 · Vostok-K 8K72K No. E103-16 · Site 1, Tyuratam**

The first human spaceflight: one orbit of the Earth in 106 minutes, flown automatically, ending with
the pilot ejecting from the descent module and landing by parachute near the Volga.

## What is built, and what is not

| | State |
| --- | --- |
| Spacecraft (3KA No. 3, as in orbit) | **built**: [spacecraft.md](spacecraft.md), [model/vehicle.py](model/vehicle.py) |
| Launch vehicle (8K72K: core, four strap-ons, lattice, Block E, fairing) | **built**, every station estimated: [vostok-8k72k.md](../../vehicles/vostok-8k72k.md) |
| Launch site (Site 1) | not built; its position only: [site-1.md](../../sites/site-1.md) |
| Crew (Gagarin in the SK-1, to be walked as) | not built; a plain seated figure rides in the spacecraft |
| Trajectory, checks, the flight as flown | not written: `flight.ts` has no `trajectory`, `checks` or `flies`, so the clock runs but nothing flies |

So the viewer shows the whole vehicle as it stood on the pad, the spacecraft under its fairing, in
the studio setting with nothing holding it up: to be turned, cut open and taken apart the way it
staged, down to the spacecraft as it was in orbit. Everything below is the record that the rest
will be built from.

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

A clear mid-morning. JPL Horizons gives the same Sun and Moon for Baikonur at 06:07 UTC to a
hundredth of a degree (the same test file).

## Sources

In order of weight; full entries in [docs/sources.md](../../../../../docs/sources.md), "Vostok".

1. OKB-1, *Preliminary report on the results of the launch of the third Vostok-3A satellite-ship*,
   3 May 1961 (signed Korolev, Bushuyev, Tikhonravov). The times, the orbit, the engine's cutoff.
2. Gagarin's report to the State Commission, 13 April 1961, and the questions put to him.
3. Siddiqi, *Challenge to Apollo*, NASA SP-2000-4408: the design, the launch morning, the ascent.
4. Siddiqi, "Declassified documents offer a new perspective on Yuri Gagarin's flight", The Space
   Review, 2015: what the documents changed.
5. RussianSpaceWeb (Zak) on the flight, for the valve and the shortfall.
