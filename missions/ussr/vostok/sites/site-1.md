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
the platform, and the sky of the morning. What served the rocket that morning and was taken away
before it left is built too, and leaves on the pad's slider at the transcript's times: the erector
with its lift to the hatch, the two service trusses, the upper cable mast ("What served the
rocket", below). Still to come: the supports falling back at liftoff; the two tall masts; the
bunker and the buildings near it; the roads; then the place for later Vostoks. Each section below
says what of it is in the model, and the last lists what is left out.

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
| ServiceTrusses | service_trusses.py | the two service trusses, `ServiceTruss_North` and `ServiceTruss_South`, with their half-ring platforms and ladders | yes: two of each one's three platforms |
| UpperCableMast | cable_mast.py | the cable mast to the third stage | yes; the two lower cable masts are not |
| Erector | erector.py | the erector on the centre track, with `Erector_Boom` (the platforms, the stair's landing) and `Erector_Lift` | yes: its form estimated |
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

### What served the rocket

Three things stood at the rocket on the morning and were gone when it left. Between them they
reached all of it: the launch system's own two service trusses to the top of the core, where an
R-7's warhead had begun; the erector's boom above that, to the third stage and the spacecraft,
which the trusses of 1957 did not reach; the cable mast to the third stage's plugs. That division
is the record's (the CIA's interpreters, a month before the flight, of a "servicing tower" 60 ft
high: "the boom on the rail car could support servicing platforms for work at levels higher than
the top of the servicing tower"; Ivanovsky from the upper platform: "below me, several more
storeys: the service platforms from which the launch vehicle is being fuelled"; Zak: the lift
"went up along the arm of the transporter erector").

| Item | Value | Confidence | Source |
| --- | --- | --- | --- |
| Service truss (8T119), each | 21,600 mm long, 7,900 mm across, 20,000 mm high, 56 t; raised by hydraulics | documented | TsKBTM's account of the R-7's ground equipment, as quoted by militaryrussia.ru |
| Its make-up | "curved welded beams of truss type, which in their upper part run into one beam of the same section"; a lower, a middle and an upper platform; a hinge on the turning ring | documented | the same |
| Where the two stood | on the north and south sides of the ring, the way between them open east and west | documented | PIC/JR-2/61: "two parallel inner sides ... positioned on the north and south sides of the tower, with the east-west opening between them generally unobstructed" |
| Its head above the deck | 20.9 m (the upper platform's rail): 20,000 mm from a hinge 0.9 m up | derived | the published height, on the model's ring. The CIA measured the "collar" at the tower's top as 60 ft (18.3 m) from shadows, "only approximate": the real ring lay 2 m under the deck (Afanasyev), the model's is at it |
| Its platforms | half rings 1.72 to 3.95 m from the axis, floors at 17.65 and 19.80 m | derived (the outer radius, half the width); estimated (the rest) | the spacing off a photograph of a Vostok on the pad; the upper one a rail's height under the head |
| Its hinge, legs, members, ladders | hinge 8.6 m out and 0.9 m up; legs 2.9 m either side of the support | estimated | a KBOM drawing of the launch position (Afanasyev), a frame of the film of 15 May 1957 |
| How far a truss is lowered | 98°: until its single beam lies about level, 2 m over the deck | estimated | a photograph of a Vostok at ignition, from across the pit: both lie level, north and south, their half rings standing up |
| Upper cable mast, its head | 85 to 95 ft above the platform; 90 ft (27.43 m) taken | documented (the range, measured from a shadow) | PIC/JR-2/61, "Possible Umbilical Mast": base "somewhere within the darkened circular area", ending "in an oblong loop" |
| That there was one upper and two lower | "two lower and one upper cable masts for bringing in the lines" | documented | Afanasyev and Lavrenov, with KBOM's drawing of the launch system |
| Its side, legs, arm, plugs | on the east, over the support there; two lattice legs 2.7 m either side of it; an arm to 1.5 m from the axis at 24.3 m | estimated | a photograph of a Vostok being raised (two slender lattice legs with a head, beyond the tail); the east is the one place neither truss sweeps as it comes down |
| How far it swings | 4° once its plugs are out, 22° as the rocket leaves | estimated | the photograph at ignition (a few degrees off); film of a Vostok leaving (some twenty) |
| Erector (8U213) | hydraulic, on rails; 87.5 t; TsKBTM, built by the Podyomnik works, accepted 1960 | documented | as quoted by militaryrussia.ru |
| The stair to the lift | 15 steps | documented | Ivanovsky: «поднялся на пятнадцать ступеней лестницы, к дверке лифта» |
| Its riser, so the landing | 0.2 m; the lift's door 3.0 m up | estimated | |
| The lift's ride | "two or three minutes" up; "a minute" by another of his tellings | documented | Ivanovsky. The model's car goes at 0.3 m/s: 77 s |
| The upper platform | 26.12 m over the deck: the hatch's middle (27.32 m) at a standing man's chest | estimated | the film: the men at the hatch stand with it at chest height |
| Track gauge | 1,520 mm | documented | the Soviet gauge |
| Everything else of it | a wagon 22.5 m long on six axles; a boom of plate girders with round holes at its foot and a box truss above, 30.5 m over the deck at its head, leaning 14° toward the rocket from a pivot 11.3 m west of the axis; a platform round the third stage at 22.6 m | estimated, and the lean is ours | the photograph of Gagarin at the stair's head (plate girders pierced with large round holes); one of a Vostok being raised (a deep girder with a pierced web and a decked head); one of a Vostok on the pad (the boom from behind, a cluster of platforms at the third stage, a head above the fairing's opening) |

**The erector's lean is not from the record.** The boom has to stand on the same side of the ring
as one of the four supports (the rocket lies on it with two strap-ons either side, so it always
comes up between two of them, where a support is). How the real boom and that support shared the
place is not in anything read. The model stands the boom from a pivot outside the ring and leans
it in over the support to the third stage; seen from behind, as in the one photograph of it
standing at a Vostok, such a lean would not show.

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
| `Erector_Boom` | its trunnion on the wagon's nose, 11.3 m west of the axis, 3.0 m up, its axis across the track | comes away 20° between 08:35 and 08:37; then down to the wagon, 104° in all, as the wagon rides off | the two minutes and that it "leaned over little by little and laid itself down" documented; the angles and how long it took estimated |
| `Erector` (and `Erector_Wheel_1..6`, each on its axle) | | rides 30 m west along the centre track as the boom goes down, then is drawn on to 120 m | that it rode away along the rails and was drawn off by a locomotive documented; how far and how fast estimated |
| `Erector_Lift` | the car's floor, at the stair's landing (under the boom, so it leans with it) | a lift: stops 19.60 and 23.12 m up the boom, each 0.2493 of its height nearer the rocket | the stops' places estimated; worked by hand, not by the slider |
| `ServiceTruss_North`, `ServiceTruss_South` | each on its hinge line on the ring: 8.6 m from the axis, 0.9 m up, 97.5° and 277.5° round from east | lowered outward 98°, beginning at 08:40 (the north one first) | that they were lowered and when it began documented; the angle, the order and how long estimated |
| `UpperCableMast` | its hinge line on the ring: 8.75 m from the axis, 0.7 m up, 7.5° round from east | swings out 4° at 09:06, and on to 22° as the rocket leaves | the minute documented; the angles and the second swing's timing estimated |

The pad's slider is the morning from 07:10, when the transcript begins with the pilot in his
seat, to four seconds after liftoff. At 08:15 the transcript has "they are lowering the service
platforms; all the work on the trusses is finished": what was lowered is not known, the model's
platforms are rigid on their trusses, and nothing moves for it.

## The morning at the pad

Moscow time, from the record of the exchanges between Gagarin (Кедр) and the pad (Заря-1) that
was sent to the Central Committee on 25 April 1961 (*Izvestiya TsK KPSS*, 1991 No. 5), with
Ivanovsky's account where it is his.

| Time | What | Who says |
| --- | --- | --- |
| 07:10 | The first call from the seat | the transcript begins |
| 07:44 | "Now they will close hatch No. 1" | Gagarin |
| 07:58 | One contact did not show closed: the hatch is taken off and put back | Korolev |
| 08:05 | One hour's readiness | Kamanin |
| 08:08 | "The railway cars are leaving now" (the tank cars on the spurs) | Kamanin |
| 08:13 | The hatch's cover is being screwed down | Gagarin |
| 08:15 | "They are lowering the service platforms. All the work on the trusses is finished"; Gagarin feels the rocket sway | Korolev |
| 08:25 | The hatch's seal is checked and holds | Korolev |
| after it | The hatch's crew take the lift down, "a minute" | Ivanovsky |
| 08:35 | "Now they will draw the erector off" | Kamanin |
| 08:37 | "The erector's boom has come away normally" | Kamanin |
| | "From the rocket, along the rails, slowly rides away the tall metal truss with the platforms and the lift ... leaning over little by little, lays itself down on a special wagon, and a motor locomotive draws it off the launch pad" | Ivanovsky |
| 08:40 | The talking point moves to the bunker; "now we are drawing the trusses off" | Korolev |
| 08:45, 08:55, 08:56 | Fifteen, ten and five minutes' readiness | Kamanin |
| 09:02 | One minute's readiness | Korolev |
| 09:03 | "Key to start. The purge is on" | Korolev |
| 09:04, 09:05 | Key to drain; the drain valves have closed | Korolev |
| 09:06 | "The pressurisation is going, the cable mast is away" | Korolev |
| 09:07 | Ignition; preliminary, intermediate, main; liftoff (09:06:59.7 by the launch log) | Korolev |

In his report the next day Gagarin said of it: "Before that I could hear the trusses being drawn
apart. There are soft blows through the rocket's structure. The rocket seemed to sway a little."

## What stood when

| Thing | From | Until | Confidence | Source |
| --- | --- | --- | --- | --- |
| Platform, pit, launch system | 1957 | today | documented | the U-2 photograph of 5 August 1957; the site was in use until 2019 |
| The centre track and the four spurs onto the platform | 1957 | today | documented (five spurs in 1957: HTA/JR-4/58); their lines today's | OpenStreetMap |
| Service trusses 8T119 (the first pair) | 1957 | not known | documented (that they were there from the first launch: the film of 15 May 1957); when the pair with lift columns replaced them is not in anything read | TsKBTM, as quoted by militaryrussia.ru |
| Upper cable mast | 1957 | not known | documented (1957: KBOM's drawing; 1959 to 1960: PIC/JR-2/61; 1961: the transcript) | |
| Erector 8U213, at the rocket with its boom up | with each rocket | drawn off before each launch: 08:35 on 12 April 1961 | documented | Ivanovsky; the transcript. The 8U213 was accepted into service in 1960; an R-7 was stood up by an erector from its first launch in 1957 |

The site's builders ask `sitelib.stood` of each of these, so a state of the place without a
rocket can leave the erector out by its date.

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
- The erector's form is drawn from three photographs, and its boom's lean is ours ("What served
  the rocket"). Not modelled on it: the rams that raised the boom, the cradles the rocket lay in,
  its jacks, whatever folded the platforms before it left (they go down with the boom as they
  stood), the locomotive that drew it off. Its wheels run on the deck's surface, where the rails'
  heads lay flush in the photograph of the morning; off the platform they hang 12 cm over the
  painted track, as everything does that leaves a pad here.
- The lift's car is open to the north at every stop, where its floors are, and has no door.
- The service trusses have two of their three platforms: where the lower one stood against an
  8K72K is not known, and the supports' own head platforms stand where it may have been. What was
  "lowered" at 08:15 is not known and nothing moves for it. Their ladders and landings are ours:
  nothing read shows how men went up them. Whether the pair had been altered for the three-stage
  rocket by 1961 is not known (they "were considerably reworked" before they were replaced).
- The cable mast's side of the ring is chosen, and its plugs stop short of the third stage, whose
  plate is not modelled. Its cables down to the ring are straight runs.
- The two lower cable masts at the rocket's tail (KBOM's drawing shows them under the ring) are
  not built: one small reproduction of that drawing is all that shows them, and not where round
  the ring they were.
- The service cabin (8U216: 16.92 by 19.06 m, 7.785 m high with its platforms down, 144 t, a
  turning ring of platforms under the rocket's tail that was run back into a niche before launch)
  is not built: it lived inside the platform, which is a solid slab here.
- The tank cars that stood on the spurs to fuel the rocket and left at 08:08 are not built.
- Not modelled at all, though they stood there that morning: the two masts 110 ft tall at the
  north-east and south-west corners, the lip's array, the command bunker 200 m north, the storage
  bunker, the propellant shed, the roads, the double fence and its lights, the observation posts
  round the rim, the spoil heap north-east of the pit. Each is in the CIA's reports (above and
  docs/sources.md); none is built yet.
- The tracks are paint on the land, flat: no rails stand on their sleepers, and they stop at the
  platform's edge (the rails on the deck itself are not modelled).
- The pit's two trenches under the platform, the sump and the road down into the pit from the east
  are not modelled.
