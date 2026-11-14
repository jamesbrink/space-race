# Vostok 1

**12 April 1961 · Yuri Gagarin · callsign Кедр (Kedr, "Cedar") · Vostok 3KA No. 3 · Vostok-K 8K72K No. E103-16 · Site 1, Tyuratam**

The first human spaceflight: one orbit of the Earth in 106 minutes, flown automatically, ending with
the pilot ejecting from the descent module and landing by parachute near the Volga.

## What is built, and what is not

| | State |
| --- | --- |
| Spacecraft (3KA No. 3, as in orbit) | **built**: [spacecraft.md](spacecraft.md), [model/vehicle.py](model/vehicle.py) |
| Launch vehicle (8K72K: core, four strap-ons, lattice, Block E, fairing) | **built**, every station estimated: [vostok-8k72k.md](../../vehicles/vostok-8k72k.md) |
| Launch site (Site 1) | **first stage built** ([model/pad.py](model/pad.py); [site-1.md](../../sites/site-1.md)): the platform on its pylons, the flame pit to its mapped rim, the launch system's ring with its four supports and four guides, the vehicle hanging in them turned to the launch azimuth; the steppe round it with the tracks that came onto the platform, under the sky of 06:07 UTC; and what served the rocket that morning, leaving on the pad's slider at the transcript's times: the erector with its stair of fifteen steps and its lift to the hatch (off at 08:35 to 08:37), the two service trusses (lowered from 08:40), the cable mast (away at 09:06); and what was fixed there: the rails laid in the deck (the centre track to the opening's edge, the north and south tracks, the two gantry rails; 1,524 mm, as the gauge then was), the two masts 110 ft tall at the north-east and south-west corners, the small building on the platform, the curved flame deflector under the opening, the pit base with its two trenches and the sump, the road down the pit and the cut in its north rim. The CIA's plan of March 1961 places them; the masts' and the deflector's forms are estimated. Not yet: the supports do not fall back at liftoff, and the land is flat where the real ground fell away north of the tracks (site-1.md lists it all) |
| The place round the pad (April 1961) | **built** as the flight's `surroundings` ([site1/model/1961-04.py](../../sites/site1/model/1961-04.py), `pnpm model:site-1`; [site-1.md](../../sites/site-1.md), "The place round the pad"): the command bunker 207 m north with its four periscopes, the storage bunker's three bays, the propellant shed, the gas receivers, five more buildings, the nine positions round the pit's rim, the spoil heap, the cable conduit, the floodlight tower, the double fence with its lights and six towers, and the roads painted on the land. Its plan is the CIA's, off the U-2's photographs of 1957 and 1959, and today's map; every wall, door and colour is estimated, and no inside is modelled |
| Crew (Gagarin in the SK-1, to be walked as) | built ([sk-1.md](../../crew/sk-1.md)): he stands on the platform's deck on the hatch side (where, estimated), and can be walked as there; he rides in the spacecraft's seat |
| The mission as a record and a plan | [mission.md](mission.md); the numbers in [orbital.ts](orbital.ts) (`Flight.orbital`). The coast from the published orbit to 7 km is flown in tests (`flyOrbit`), with its misses recorded; the ascent is not |
| Trajectory, checks, the flight as flown | the whole flight flown from the pad in tests (`flyWhole`): the ascent comes out 142 m/s fast and its orbit 180 by 844 km, a recorded miss with what owns it ([mission.md](mission.md), section 6). `flight.ts` has no `trajectory`: that is the ballistic shape, and this flight's is `orbital` |

### Against Freedom 7, place by place

Freedom 7 is the one flight that is whole. What this one lacks beside it, from the two flights' data and from running
both (November 2026), and whose work each gap is: **data** (in `flight.ts` and the record), **code** (`src/`), or
**modelling** (a Blender script and its GLB).

| Place | What Freedom 7 has | Vostok 1 | Kind |
| --- | --- | --- | --- |
| Gallery | the vehicle to turn, cut open and take apart, its parts read, the crew beside it for scale | the same: 20 parts, 11 views, the cutaway | done |
| Gallery | a cabin to sit in, its instruments read from the run (`ModelDef.cabin`: 27 instruments, 21 lamps, 12 controls, two windows, the periscope's screen) | **done**: the board's clock runs; the Globus turns under its cross with the ship's place; the Vzor shows the Earth in its centre and the horizon in its ring of eight ports, good to orient the ship by for a burn by hand; three of the 24 signal lamps light on the record's events (the rest are not identified and stay dark); four gauges follow Gagarin's readings by the clock, two are held at his constant, three say "not simulated"; the lock, manual orientation, braking engine's button, hand controller and lights are the deck's ([spacecraft.md](spacecraft.md), "The cabin in flight") | done; the Globus's landing-place tumbler needs a node |
| Gallery and site | a seat to board (`ModelDef.seats`), from which the camera rides | **done**: `Seat_Pilot` on the ejection seat, boarded through hatch No. 1; on the flight deck he rides it from the pad to the ejection | done |
| Launch site | the pad's morning on the slider and on the clock, doors and a lift to work (19 keyframes, 9 actions) | the morning on the slider (11 keyframes); the erector's lift (1 action) | done, smaller |
| Launch site | what leaves at liftoff, on the clock | **done**: the four supports swing back and the guides drop at liftoff (`clocked`: [site-1.md](../../sites/site-1.md)) | done |
| Launch site | walking, the crew on foot with V, the lift, the idle show's callouts | all of them work | done |
| Launch site | the vehicle leaves the pad with the clock (`Flight.flies`, `trajectory`) | **done**: it leaves with the clock, on the record flown (`Ascent` for an orbital run), its fire under the core's nozzles until 300 s (Block E's own is not drawn: no node for its nozzle yet) | code and data |
| Fly | lit: the flight deck, navball, predicted path, sound, plume, smoke, shake, heating's glow, the stages dropped as bodies of their own, parachutes, the debrief card, the Flown panel against the checks | **lit**, on the one flight deck every flight has (src/deck.ts; the orbital kind, src/orbitdeck.ts): as flown, the record ridden at up to 3,600 times life, the strap-ons, fairing, core, Block E and instrument module flown away as bodies, the plume and smoke going up, the navball, the path predicted from liftoff (on the launch vehicle, where it goes if the engines stopped now: drawn with the ball's drag, so low down it comes down nearer than drawn); by the lock's code 1-2-5, turning the spacecraft and firing the braking engine, heard, with where he would have come down. Taken over (G, B or Space in the ascent, or a switch thrown on the pad): flown by hand from the pad on the live staged vehicle (src/sim/stagedlive.ts), steered by the keys or by guidance leaned by them, each stage lit, cut and let go by Space whenever it is pressed, and the spacecraft coasting from where that ascent left it, with its hand controls and braking burn the user's without the lock; the deck says the flight is not the record's. Flown as well as the law flies it, the ascent falls short of an orbit as the record's run does (about −200 by 180 km at the cutoff), so a hand-flown Vostok 1 comes down within the first revolution, unless its braking engine is fired forward: its 136 m/s along the motion soon after separation put one flown by hand into a 171 by 201 km orbit, from which, the engine spent, it does not come down. The pilot rides aboard, and the cabin is alive from the seat. The entry's shock layer glows as bright as the computed heat flux on the ball's 1.15 m radius (no surface temperature: the ablator's figures are unread); from 7 km the hatch, the parachute container's cover and the seat with him in it each come down on their own track (orbital.ts `descent`), the module on its three parachutes in turn, the seat on its stabilising parachute, and from 4 km Gagarin in his harness under his main canopy and then his reserve beside the seat falling away: each followed by a right click, the card holding both landings against the record's. Not yet: shake, the descent's events (the modules' parting, the ejection) by hand | code and data |
| Fly | a record flown by the simulator from the pad and held to its checks | **done**: the ascent on a stated law (`sim/staged.ts`), the coast from where it left the spacecraft, both bodies down from 7 km; checks and misses in `tests/staged.test.mjs` ([mission.md](mission.md), section 6) | code and data |

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

Not found: the pitch programme, the launch azimuth as flown, any drag figure, the levels of the
engines' intermediate and final stages of thrust. The ascent is flown on a stated law in their place
([mission.md](mission.md), sections 3 and 6).

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
