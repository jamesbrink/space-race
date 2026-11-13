# Site 1, Tyuratam ("Gagarin's Start")

The R-7's first launch complex at NIIP-5, the range later called the Baikonur Cosmodrome: Sputnik,
Vostok 1 and every crewed Vostok left from it. Model: [site_1.py](site_1.py), which puts together
one module per piece in [site1/](site1/); built for a flight by its `model/pad.py` (the pad, with
what stood on it that morning) and by [site1/model/](site1/model/) (the place round it, by date).
Its position on the Earth is [site-1.ts](site-1.ts) (`SiteDef`); the ground round it, its sky and
its air are [src/viewer/tyuratam.ts](../../../../src/viewer/tyuratam.ts) ("The land", below).

**Status.** The first stage is built and opens as Vostok 1's launch site
(`#ussr/vostok/vostok-1/site`): the platform on its pylons, the flame pit to its mapped rim, the
launch system with the rocket hanging in it, the steppe round it with the tracks that came onto
the platform, and the sky of the morning. Still to come, in this order: the supports falling back
at liftoff; the cable mast and the service trusses, and the erector on its track; the two tall
masts; the bunker and the buildings near it; the roads; then the place for later Vostoks. Each
section below says what of it is in the model, and the last lists what is left out.

**Nobody has published a drawing of this place.** Its plan and heights are what the CIA's
photographic interpreters measured off U-2 photographs of 1957 to 1959, the launch system's are a
Soviet technical description of the system as it was later, and the rest is today's map and the
film of the morning. Each figure says which, and how sure it is.

## The site's frame

Origin: the rocket's axis at the platform's deck, the "zero mark" (нулевая отметка) from which
the Soviet description measures every height. Metres in the scene; each figure is kept in the
units of whoever measured it (feet for the CIA, millimetres for the Soviet description, metres off
the map) and multiplied once ([site1/site.py](site1/site.py): `FT`, `MM`).

| Axis | Points | Basis |
| --- | --- | --- |
| +X | due east, 090° true: along the centre track as it comes onto the platform, and out over the flame pit | derived: the centre track's last 60 m run on 090.1° (OpenStreetMap way 37547653); HTA/JR-4/58: the pit "is oriented along a west-east axis" |
| +Y | due north, toward the command bunker | the same |
| Origin | 45.92025° N, 63.34225° E (WGS 84), 78 m above the ellipsoid | position documented: OpenStreetMap way 172571408, the middle of its outline (a few metres); height estimated from SRTM and the EGM96 geoid (below) |

**The launch azimuth is not this bearing.** The platform, the pit and the tracks lie east and west.
The rocket was aimed by turning the launch system's ring in the platform's opening, so the rocket,
its four supports and everything on the ring stand turned. No launch azimuth for Vostok 1 has been
found in anything read; the flight's README derives about 37.5° from the orbit's 64.95° inclination
(sin Az = cos i / cos φ), before the Earth's turning. Which of the rocket's planes lay along it is
not recorded either: booster B's is taken (`site.TURN`, estimated). That choice puts the
spacecraft's hatch at 187.5° round from +X, 7.5° south of due west, facing the erector that came
in along the centre track; the two agree, which is the only check there is.

## Where it is

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Latitude | 45.92025° N | documented | OpenStreetMap way 172571408, «Гагаринский старт»: the middle of its outline, traced from imagery (a few metres). Wikipedia gives 45°55′13″N |
| Longitude | 63.34225° E | documented | as the latitude; Wikipedia gives 63°20′32″E |
| Height above the ellipsoid | 78 m | estimated | SRTM reads 112 m above the geoid at the point; the EGM96 geoid there is -33.7 m (GeographicLib GeoidEval). Good to some ten metres |
| Mean sea level | -34 m | estimated | the same geoid figure |
| Bearing of the frame's +X | 090° | derived | the centre track's bearing onto the platform (above) |
| Clock | Moscow time, UTC+3 | documented | every report of the flight is in Moscow time: liftoff 09:06:59.7 |

No surveyed coordinate has been found in anything read.

## The flame pit's depth: the sources disagree

| Figure | Says | Confidence | Source |
| --- | --- | --- | --- |
| about 43 m (140 ft) | the new cable conduit "connects with the launching structure at a point about 80 feet above the base of the pit or about 60 feet below the top of the launching platform": 80 + 60 ft | derived (two CIA figures summed) | PIC/JR-2/60, "Control Bunker" |
| 45 m; "almost 50 m" | the pit's depth in Russian print | documented, but not traced to a drawing | Russian print as quoted at second hand (the TsKBTM history quoted on the Novosti Kosmonavtiki forum); the originals not seen |
| "fire trough 42 m below" | an eyewitness's figure | documented | Baturin, as quoted |
| 25 m | the SRTM profile through the pit | not used | a 30 m grid smooths a 60 m slot to half its depth |

**43 m is modelled** (`site.PIT_DEPTH`). The CIA's own figure for the depth is redacted in every
copy read.

## The pieces

What stood there on 12 April 1961, and which module builds it. The pad (`pad.glb`) is what the
flight's slider moves; the place (`site1/model/1961-04.glb`) is everything else.

| Node | Module | What | In the model |
| --- | --- | --- | --- |
| Platform | platform.py | the slab on its four pylons, the abutment, the retaining walls, the fence | yes |
| FlamePit | platform.py | the pit's lining and its own ground out to the rim, and a skirt under the land past it | yes |
| LaunchRing | launch_system.py | the turning ring, with `Support_1..4` and `Guide_1..4` | yes |
| (the land) | src/viewer/tyuratam.ts | the steppe, the tracks painted on it, the pit cut out of it | yes |
| (the vehicle) | the flight's vehicle.glb | hung in the supports: `position` and `rotationY` in flight.ts | yes |
| (the cosmonaut) | the flight's crew.glb | on the deck, 14.6 m west of the axis on the hatch side; where he stood is estimated | yes |

In flight.ts the vehicle's origin (the spacecraft's braking nozzle) is 30.53 m above its nozzles'
exits, so it stands at 30.53 - 6.75 = 23.78 m over the deck, turned 52.5° (90 - 37.5) about the
vertical: the numbers live in [site1/site.py](site1/site.py) (`TAIL_Z`, `TURN`) and are quoted there.

## Dimensions

### The platform

| Item | Value | Confidence | Source |
| --- | --- | --- | --- |
| Platform | 135 ft square (41.15 m) | documented (measured off photographs) | PIC/JR-2/60: "revised to 135 feet square"; RussianSpaceWeb: "40 by 40 m" |
| Its thickness | 10 ft | estimated | the front elevation (PIC/JR-2/61 Figure 1) draws it about so; HTA/JR-4/58 thought "at least 50 feet", with working levels below, which the later reports did not repeat |
| Pylons | four, 30 ft wide (east-west) and 10 ft thick, 55 ft apart in each row, 115 ft over the pair | documented (measured) | PIC/JR-2/60 (30 ft wide); PIC/JR-2/61 text and Figure 1 (10 ft thick, 30 and 55 ft, 115 ft) |
| Pylon rows | 57.5 ft north and south of the axis | estimated | Figure 1 draws them under the platform's edges |
| Abutment | 25 ft deep, the platform's west side resting on it at grade | documented (measured) | PIC/JR-2/60: the rail embankment "terminates at an abutment measuring ... by 25 feet" |
| The opening | a dark circle 65 ft across (19.81 m) | documented (measured) | PIC/JR-2/60; PIC/JR-2/61 found it "semi-opaque", perhaps grated |
| Fence | low, wire, set in 15 ft from the edge on the three sides over the pit | documented | PIC/JR-2/61 |
| The north-east corner | extended 10 ft out over the pit, for one of the two masts | documented | HTA/JR-4/58 ("a concrete lip which protrudes 10 feet"); PIC/JR-2/61 |

### The flame pit

| Item | Value | Confidence | Source |
| --- | --- | --- | --- |
| Rim | 880 by 550 ft, pear-shaped, its wide end under the platform | documented (measured) | HTA/JR-4/58; PIC/JR-2/60 |
| Outline | 265 by 184 m (OpenStreetMap way 172441917, `flame_trench`), placed in the frame | derived | the map agrees with the CIA's figures to a few per cent |
| Depth | 43 m under the deck | derived | above |
| Section | a slot between the pylon rows under the platform and 60 ft beyond it, its floor 43 m down; outside it two terraces (the lower 30 m down) up to the rim, each break eased over 3 m either way; the floor rising east to the pit's point, about 1 in 4.5 | estimated | HTA/JR-4/58: "excavated along two terrace levels", a road "from the raised eastern terminus ... to the base of the pit near the foot of the launching structure"; PIC/JR-2/61 Figure 1, front elevation (terraces, retaining walls, pit base) |
| Lining | the west part surfaced "with a crude spray, possibly gunite"; the trench under the platform concrete, blackened | documented (west part); estimated (the rest) | HTA/JR-4/58; the 1957 photograph |

### The launch system

From a Soviet technical description of the R-7 launch system as it was for Soyuz (17P32-6),
later than 1961: a cross-check that the CIA's 65 ft circle agrees with, not a drawing of the 1961
system.

| Item | Value | Confidence | Source |
| --- | --- | --- | --- |
| Rotating ring | 14,920 mm inside, 19,350 mm over its corners | documented (for the later system) | the Soviet description |
| The turning part | 20,352 mm above the zero mark, 6,750 mm below it | documented (for the later system) | the same |
| The rocket's tail | 6.75 m under the deck, level with the foot of the turning part | derived | "about 7 m below" in print; the description's 6,750 |
| Where it hangs | the four supports' heads under the strap-ons' tips, 19,759 mm above the tail (13.01 m above the deck) | derived | the vehicle model ([vostok-8k72k.md](../vehicles/vostok-8k72k.md)) |
| Supports | four trusses between the strap-ons, hinged on the ring, leaning in to the waist, counterweighted to fall back as the rocket rises | documented (that there are four and how they let go) | Siddiqi pp. 273-276; Chertok vol. 2 |
| Their shape, members, platforms, counterweights | as built | estimated | the film of April 1961; the structure as it stands today |
| Guides | four arms at the tail | documented (that there are four); estimated (their shape) | the Soviet description |
| How far a support falls back | 45° | estimated | the film |

How the pit's ground is drawn: a 2 m grid (4 m at the coarsest level of detail), each cell cut
along whichever diagonal lies nearer the true surface at its middle. Past the rim it runs on for
8 m as a skirt 0.25 m under the land, then down into the ground, and the land is cut away 3 m inside
the rim: the rim is a crest, a cell that crosses it is lower than the land by up to a metre or two,
and without the overlap and the skirt a line of sight out of the pit passed under the land's edge to
the sky. The 3 m is inside what the map's outline is good for.

## The land

[src/viewer/tyuratam.ts](../../../../src/viewer/tyuratam.ts): the land's frame is the site's (+X east, -Z north).

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| The ground | a river terrace of the Syr Darya, flat: level within 400 m of the pad, a swell of half a metre beyond | estimated | SRTM reads within a few metres everywhere round the site, below what its 30 m grid can resolve |
| Cover | open steppe: clay and sand, bare between low clumps of wormwood and saltwort, green for a few weeks after the snow | estimated | descriptions and photographs of the place in spring; the film of the morning shows pale, bare ground round the pad |
| Colours | grey-buff clay, silvery grey-green wormwood, a short spring green | estimated | read off photographs, then cleaned as the look asks |
| Plants | wormwood clumps 0.25 to 0.5 m, saltwort 0.15 to 0.3 m, wide apart | estimated | as the cover |
| Made ground | the apron on the platform's landward side (70 m), the tracks' beds, a margin round the rim: graded, nothing growing | estimated | the 1957 photograph shows bare ground round the pad and pit |
| Tracks | the centre track from the west (its last 2.6 km) and the four spurs beside it, onto the platform; ballast, sleepers 0.55 m apart, two rails at the Soviet gauge of 1,520 mm | documented (their lines: OpenStreetMap ways 37547653, 172441851, 172441854, 172441876, 172441879; HTA/JR-4/58 counts five spurs in 1957; the gauge); estimated (the bed's width, the sleepers) | painted on the land, not modelled |
| The sky | clear: no cumulus, no high cloud | estimated | no observation of the morning has been read; the film shows a clear sky |
| Visibility | 60 km, the haze thinning over 1.5 km of height | estimated | not recorded |
| The light | the Sun 142.1° and 46.9° up, the Moon 193.3° and 35.0° up, 12 % lit, at 06:06:59.7 UTC | derived | `src/world` from site-1.ts and the launch instant (the flight's README; tests/world.test.mjs) |
| The land beyond, on the globe | the steppe's own tone, kept round the site until the eye is well up | estimated | as the colours |

The other lines on today's map round the site (the loop to the north, the lines to Site 2 and
beyond, the roads, the buildings to the west and north) are not drawn: when each was built is not
known to us, and much of it is later than 1961.

## Moving parts

Each moving piece is its own node with its origin on its pivot.

| Node | Pivot | Motion | Confidence |
| --- | --- | --- | --- |
| `Support_1..4` | the hinge on its base on the ring, 8.3 m from the axis, 1.6 m up | falls outward 45° at liftoff, 09:06:59.7 | the instant documented; the angle estimated |

## What stood when

| Thing | From | Until | Confidence | Source |
| --- | --- | --- | --- | --- |
| Platform, pit, launch system | 1957 | today | documented | the U-2 photograph of 5 August 1957; the site was in use until 2019 |
| The centre track and the four spurs onto the platform | 1957 | today | documented (five spurs in 1957: HTA/JR-4/58); their lines today's | OpenStreetMap |

## What the model gets wrong or leaves out

- The pit's section is not published: its terraces, slot and floor are drawn from the CIA's front
  elevation, which is itself an interpretation of shadows. The two trenches under the platform, the
  sump at the east end of the pit base and the flame deflector are not modelled.
- The platform is a solid slab: whatever rooms the CIA suspected inside it are not known.
- The launch system is the later system's ring and heights, with trusses drawn from film: the
  members, the platforms and the counterweights are not the real ones.
- Which of the rocket's planes lay along the launch azimuth is chosen (booster B's).
- The supports do not fall back at liftoff: the vehicle does not leave the pad on the site yet (no
  trajectory), and a support that fell while the rocket hung on it would be wrong.
- The counterweights are three stacked iron slabs a side, their number and size estimated (the film shows a dark mass);
  the supports' hinges, pins and the ring's drive are not modelled.
- Not modelled at all, though they stood there that morning or were moved away during it: the cable
  mast (away just before ignition), the service trusses, the erector on the centre track (drawn
  off at 08:35 to 08:37), the two masts 110 ft tall at the north-east and south-west corners, the
  lip's array, the command bunker 200 m north, the storage bunker, the propellant shed, the roads,
  the double fence and its lights, the observation posts round the rim, the spoil heap north-east
  of the pit. Each is in the CIA's reports or the record of the morning (above and docs/sources.md);
  none is built yet.
- The tracks are paint on the land, flat: no rails stand on their sleepers, and they stop at the
  platform's edge (the rails on the deck itself are not modelled).
- The pit's two trenches under the platform, the sump and the road down into the pit from the east
  are not modelled.
