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
rocket", below). The place round the pad is built as well ("The place round the pad", below). What was fixed on
the deck and in the pit is built: the rails in the deck, the two masts 110 ft tall, the small building,
the flame deflector, the pit base with its two trenches and the sump, the road down the pit and the
cut in its north rim ("The platform", "The flame pit", below). Still to come: the supports falling
back at liftoff; the land's relief; then the place for later Vostoks. Each section below says what of
it is in the model, and the last lists what is left out.

The place round the pad is built as it stood that April (`site1/model/1961-04.py`, `pnpm model:site-1`,
the flight's `surroundings`): the command bunker, the storage bunker, the buildings by the pad, the
positions round the pit's rim, the spoil heap, the cable conduit, the double fence with its lights and
towers, and the roads painted on the land. "The place round the pad", below.

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

**The centre track is on the axis, and the map does not have it there.** The origin is the middle of
the map's outline of the pad, and the map's centre track comes on 3.0 m north of that. The erector
carried the rocket along that track to the axis, so one of the two is out by 3 m (the outline is a
loose rectangle 47.8 by 42.5 m; the track is a line traced along rails). The track is put on the axis
for its last 160 m; everything else from the map stays where the map has it against its outline, so
the pit, the bunker and the buildings may all lie some 3 m north of where they were against the
rocket. Not resolved: the imagery read is 0.8 m a pixel.

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
| Platform | platform.py | the slab on its four pylons, its lip and its cut corner, the abutment, the retaining walls, the fence; in its top, the flangeways beside the rails | yes |
| StairHead (under Platform) | deck.py | the small building on the platform's west side | yes; its door shut |
| DeckRails | deck.py | the rails in the deck: the centre track, the north and south tracks, the short spur, the two gantry rails | yes |
| Masts (`Mast_NE`, `Mast_SW`) | deck.py | the two masts 110 ft tall, each with its head and its ladder | yes: their form estimated |
| FlamePit | platform.py | the pit's lining and its own ground out to the rim, and a skirt under the land past it; the pit base, the two trenches, the sump's face and roof, the road down the floor, the cut in the north rim | yes |
| FlameDeflector | platform.py | the curved chute under the opening | yes: its form off a scale model, its sizes estimated |
| LaunchRing | launch_system.py | the turning ring, with `Support_1..4` and `Guide_1..4` | yes |
| ServiceTrusses | service_trusses.py | the two service trusses, `ServiceTruss_North` and `ServiceTruss_South`, with their half-ring platforms and ladders | yes: two of each one's three platforms |
| UpperCableMast | cable_mast.py | the cable mast to the third stage | yes; the two lower cable masts are not |
| Erector | erector.py | the erector on the centre track, with `Erector_Boom` (the platforms, the stair's landing) and `Erector_Lift` | yes: its form estimated |
| (the land) | src/viewer/tyuratam.ts | the steppe, the tracks and the roads painted on it, the pit cut out of it | yes |
| Tracks | deck.py | the rails where they come up to the platform over the land: the centre track's last 130 m, the others' last 70 m | yes (the place) |
| CommandBunker | bunker.py | the mound over the firing room, its four periscopes, three corner vents, the entrance, the smoking place | yes (the place); the rooms below are not |
| StorageBunker | storage.py | three concrete bays with earth between, their gates, roof vents and aprons | yes (the place); gates shut |
| PropellantShed | buildings.py | the shed over the northern spur's end, open to the north on six supports | yes (the place) |
| CascadeFacility | buildings.py | two banks of nine gas receivers on cradles, their manifold | yes (the place) |
| PumpHouse, WorkShop, SupportBuilding, CheckoutShop, SecurityBuilding | buildings.py | the buildings the U-2's photographs show; doors shut, windows dark | yes (the place) |
| ObservationPosts (`ObservationPost_A` to `_I`) | rim.py | the nine earth-covered positions round the pit, g with its covered way from the road | yes (the place) |
| SpoilHeap | rim.py | the earth from the pit, north-east of it | yes (the place) |
| CableConduit | rim.py | the conduit from the rim to the structure on its piers, and the old tray beside it | yes (the place) |
| FloodlightTower | rim.py | the 60 ft tower west of the platform | yes (the place) |
| OuterFence…, InnerFence… (North, East, South, West), LightPoles…, GuardTowers (`GuardTower_NW` …) | perimeter.py | the double fence, the light poles inside it, six guard towers | yes (the place) |
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
| Its thickness | 10 ft | estimated | the front elevation (PIC/JR-2/61 Figure 1) draws it about so; HTA/JR-4/58 thought "at least 50 feet", with working levels below, which the later reports did not repeat. Zak (RussianSpaceWeb) has the platform as "a giant steel square 40 by 40 meters and three-story high" of sixteen railway bridge trusses: three storeys is more than 10 ft, and is not modelled |
| Pylons | four, 30 ft wide (east-west) and 10 ft thick, 55 ft apart in each row, 115 ft over the four both ways | documented (measured) | PIC/JR-2/60 (30 ft wide; "believed to be 115 feet square"); PIC/JR-2/61 text and Figure 1 (10 ft thick; 30 and 55 ft east to west; 115 ft dimensioned north to south over the rows' outer faces) |
| Pylon rows | their middles 52.5 ft north and south of the axis | derived | half of 115 ft, less half a pylon's 10 ft. (They were first built 5 ft further out, under the platform's edges.) |
| Abutment | 25 ft deep, the platform's west side resting on it at grade | documented (measured) | PIC/JR-2/60: the rail embankment "terminates at an abutment measuring ... by 25 feet" |
| The opening | a dark circle 65 ft across (19.81 m) | documented (measured) | PIC/JR-2/60; PIC/JR-2/61 found it "semi-opaque", perhaps grated |
| Fence | low, wire, set in 15 ft from the edge on the three sides over the pit | documented | PIC/JR-2/61 |
| The north-east corner | extended 10 ft out over the pit, for one of the two masts | documented | HTA/JR-4/58 ("a concrete lip which protrudes 10 feet"); PIC/JR-2/61 |
| The lip's breadth and end | 8 ft along the north edge, its end rounded | estimated | scaled off PIC/JR-2/61 Figure 1 (4.73 px a foot at 500 dpi) |
| The south-east corner | cut off, 10 ft along each edge | estimated | Figure 1 draws it so, and Figure 2 (the perspective); not in the text |
| Small building | "on the west side of the launching platform, about 60 feet northwest of the servicing tower"; perhaps "a covered entryway for a stairway leading below the surface" | documented | PIC/JR-2/61 |
| Its place and size | its middle 60.4 ft west and 25.6 ft north of the axis; 16 by 8.5 ft, 8 ft high | estimated | scaled off Figure 1's plan and front view: its dimensions are redacted |
| Tracks on the platform | "served by four rail spurs": one "centered on the platform" leading "into the blackened launching area", one onto its northern section, one onto its southern, and a fourth between the centre and the southern that "extends onto the platform for only a short distance" | documented | HTA/JR-4/58; PIC/JR-2/61 Figure 1 draws all four |
| The north track's end | "extended 10 feet farther east" between the two coverages | documented | PIC/JR-2/61 (PIC/JR-2/60 had thought it removed) |
| Where each lies | centre: on the axis, to the opening's edge. North: 44.5 ft north, to 49 ft east of the axis. South: 40.6 ft south, to 35.8 ft east. Short spur: 27.3 ft south, ending 4.6 ft onto the abutment | derived | scaled off Figure 1, good to a foot or two. Today's map, measured from its own centre track, has 14.6 m, 13.8 m and 9.4 m (against 13.6, 12.4 and 8.3) and the same ends for the south track and the spur to 3 m |
| Gantry tracks | "a gantry-crane track ... leads from the edge of the launching platform eastward toward the center of the servicing tower"; "the standard-gauge rail line ... passes between the gantry tracks" | documented | HTA/JR-4/58; PIC/JR-2/61 |
| Their separation and length | two rails 23 ft apart, from 11 ft short of the abutment to the opening | estimated | scaled off Figure 1: the figure is redacted. **What rode them is not said in anything read**, and nothing is put on them |
| Gauge | 1,524 mm between the rails' inner faces | documented (the standard) | the Soviet gauge was 5 ft (1,524 mm) until it was made 1,520 mm in 1970; that this track was laid to it is assumed. The CIA calls it "standard-gauge" |
| The rails | heads flush with the concrete | documented (a photograph) | the pilot walking to the rocket, 12 April 1961 (RussianSpaceWeb): rails lying in the deck in the foreground |
| Their section; how they are drawn | a flat-bottomed rail 146 mm high, head 70 mm (a Soviet R-50 was 152 mm, head 70 mm); the head 9 mm proud of the deck, a flangeway 60 mm wide and 45 mm deep on the gauge side of each running rail | estimated | sitelib's section; 9 mm keeps head and concrete apart in depth |
| Masts | "two towers ... one at the northeast and the other at the southwest corner ... 110 feet high and have a large array on top at least 5 feet wide and 10 feet high" | documented (measured off shadows) | HTA/JR-4/58; "no change" in PIC/JR-2/60; 110 ft again on PIC/JR-2/61 Figure 1 |
| Where they stand | the north-east one 4.9 ft past the platform's east edge and 3.9 ft in from its north edge, on the lip; the south-west one its mirror through the axis, which is on the abutment: each 29.4 m from the axis | derived | the first scaled off Figure 1; the second from PIC/JR-2/61: "positioned precisely equidistant from the center of the launching platform", "a line drawn between the two masts passes through the center of the servicing tower" (Figure 1 itself draws the south-west one at the abutment's corner, 5 m further out: a diagram) |
| What they were | "probable collimation towers" (1958); "it is now felt that their function cannot be determined" (1961), neither collimation nor floodlights seeming sound to the interpreters | documented (that it was not known) | HTA/JR-4/58; PIC/JR-2/61 |
| Their form | a slender square lattice 1.2 m across at the foot, a railed head 100 ft up, on it a frame 5 by 10 ft carrying six floodlights turned to the rocket, a rod 4 m above, a ladder up the side toward the slab | estimated | a photograph of the launch of 12 April 1961 (RussianSpaceWeb) has one beside the rocket: a pale, slender lattice with a wider head near its top and a thin rod above it. That the head is floodlights and the rod a lightning rod is our reading; a scale model of the pad as in 1957 has a short lattice with a box on it at each of the same two corners |

### The flame pit

| Item | Value | Confidence | Source |
| --- | --- | --- | --- |
| Rim | 880 by 550 ft, pear-shaped, its wide end under the platform | documented (measured) | HTA/JR-4/58; PIC/JR-2/60 |
| Outline | 265 by 184 m (OpenStreetMap way 172441917, `flame_trench`), placed in the frame | derived | the map agrees with the CIA's figures to a few per cent |
| The cut in the north rim | a tongue some 15 m wide narrowing to 8 m, from the rim to 114 m north of the axis, the old tray and the new conduit leaving the rim beside its mouth | derived | PIC/JR-2/60 Figure 5 (1959), scaled: good to some five metres. Filled today: not on the map. Its depth is the pit's own side slope, 1 in 1 (estimated) |
| Depth | 43 m under the deck | derived | above |
| Section | a slot between retaining walls under the platform and beyond it, its floor 43 m down; outside it two terraces (the lower 30 m down) up to the rim, each break eased over 3 m either way; from the sump the floor rising east to the pit's point, 1 in 4.84 | estimated | HTA/JR-4/58: "excavated along two terrace levels"; PIC/JR-2/61 Figure 1, front elevation (terraces, retaining walls, pit base) |
| Retaining walls | 110 ft apart | documented (measured) | PIC/JR-2/61 Figure 1 dimensions 110 ft across the pit base, both trenches and both shelves. Their thickness is redacted (1 m: estimated) |
| Pit base | 60 ft wide, from the foot of the structure 60 ft east to the sump | documented (measured) | PIC/JR-2/60: what had been called the deflector plate "now appears to be part of the pit base construction. It is 60 feet wide"; Figure 1 |
| Trenches | two, concrete, 60 ft long, "separated by a distance of at least 60 feet", from "the base of the launching structure to the two end compartments" of the sump | documented (measured) | PIC/JR-2/60; they had been "drainage sumps" in 1958 |
| Their width | 17.5 ft: from the pit base's edge to the line of the pylons' inner faces | derived | PIC/JR-2/61: the north-east pylon's south side "appears to nearly coincide with the north side of the northernmost of the two trenches". Figure 1 draws a shelf between each trench and the retaining wall |
| Their depth | 15 ft below the pit base | estimated | redacted; Figure 1's front view draws them about as deep as wide |
| Sump | "underground", at the base of the pit; 75 ft wide; perhaps three compartments; its face toward the structure "rises vertically from the top of the trenches for at least 10 feet"; its roof with an "upward slope from west to east" | documented (measured) | PIC/JR-2/60 ("unidentified concrete structure" in 1958); 110 ft north to south on PIC/JR-2/61 Figure 1 |
| As drawn | 75 ft east to west and as wide as the slot; its face 10 ft high; its roof the floor's own climb; each trench running on into the dark under its face | estimated (the roof's slope is redacted; what was inside is not recorded) | |
| Road into the pit | "a road enters the pit from the raised eastern terminus and leads to the base of the pit near the foot of the launching structure" | documented | HTA/JR-4/58 |
| Its line, width, surface | down the middle of the floor from the road round the pit's tip to the sump's roof; 6 m; rolled gravel | estimated | no drawing shows its line |
| Flame deflector | not seen by the CIA: "possible base of flame deflector" on Figure 1, and "it is probable that a flame deflector is at a higher level than the top of the sump"; at the second pad, under construction in 1959, "a portion of a curved flame deflector plate ... in the center of the launching structure" and "no evidence to indicate it will protrude beyond the front" | documented (that there was one, curved, at the sister pad) | PIC/JR-2/60; PIC/JR-2/61 |
| Its form | a curved chute from the back wall under the opening, down and forward to the pit's floor, between the two sides | documented (a model) | a scale model "of the original R-7 pad in Tyuratam circa 1957", photographed by A. Zak (RussianSpaceWeb, Site 1); which museum is not said |
| As drawn | an arc from the abutment's face 16 m under the deck to the pit base at the platform's east edge, where it lies level: 44.9 m radius; as wide as the slot | estimated (the 16 m, off the model); derived (the radius) | |
| Ladders | one out of each trench, one up the sump's face on the south shelf | estimated | not recorded: the way on foot from the road's end to the pit base |
| Lining | the west part surfaced "with a crude spray, possibly gunite"; the slot concrete, blackened | documented (west part); estimated (the rest) | HTA/JR-4/58; the 1957 photograph |

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
| Track gauge | 1,524 mm | documented (the standard) | the Soviet gauge until 1970 ("The platform", above); the wheels' treads bear on the rails' heads, 9 mm over the deck |
| Everything else of it | a wagon 22.5 m long on six axles; a boom of plate girders with round holes at its foot and a box truss above, 30.5 m over the deck at its head, leaning 14° toward the rocket from a pivot 11.3 m west of the axis; a platform round the third stage at 22.6 m | estimated, and the lean is ours | the photograph of Gagarin at the stair's head (plate girders pierced with large round holes); one of a Vostok being raised (a deep girder with a pierced web and a decked head); one of a Vostok on the pad (the boom from behind, a cluster of platforms at the third stage, a head above the fairing's opening) |

**The erector's lean is not from the record.** The boom has to stand on the same side of the ring
as one of the four supports (the rocket lies on it with two strap-ons either side, so it always
comes up between two of them, where a support is). How the real boom and that support shared the
place is not in anything read. The model stands the boom from a pivot outside the ring and leans
it in over the support to the third stage; seen from behind, as in the one photograph of it
standing at a Vostok, such a lean would not show.

### The place round the pad

Its plan is one drawing and one map. The drawing is **Figure 5 of PIC/JR-2/60** (CIA, February 1960):
a line drawing of "Launch Area A" with a scale bar and a north arrow, from the U-2's photographs of
August 1957 and of a second overflight whose date is redacted in every copy read (written "1959"
throughout this file and the scripts: the U-2 flew over Tyuratam on 9 July 1959, a date set down
from memory and not from anything read here), agreeing with the plan in HTA/JR-4/58. These are the last photographs of the place taken before the
flight; PIC/JR-2/61 (March 1961) measured some of them again. The map is today's (OpenStreetMap and
satellite imagery of the 2020s), on which much of that plan still stands. **Where a thing is on both,
its place is the map's (a few metres) and its size the CIA's; where it is only on the drawing, its
place is scaled off the drawing (1.065 px a foot in the copy read: good to some ten metres).** No
photograph of any of these things from the ground in 1961 has been read: every wall, door, window
and colour is estimated, and what was inside them is not recorded, so doors are built shut and
windows dark. Positions are metres east and north of the rocket's axis.

| Item | Value | Confidence | Source |
| --- | --- | --- | --- |
| Command bunker, where | its middle 3.6 m east, 206.6 m north | documented | OpenStreetMap way 668506431 (`military=bunker`, underground); HTA/JR-4/58: "approximately 600 feet north of the launching platform", "in line with the servicing tower"; Chertok vol. 2 p. 326: "two hundred meters from the launch facility" |
| Its size | 145 by 110 ft, long side north to south | documented (measured) | HTA/JR-4/58; PIC/JR-2/60. The map's outline is 40 by 30 m |
| What shows above ground | "earth-covered"; a bowl dug, the bunker built, "a concrete-encased hill ... built upon it" | documented | HTA/JR-4/58; Chertok vol. 2 p. 326 |
| The mound's height and batter | 3.0 m, 1 in 1.5; faced in slabs 3 m square | estimated | the CIA's figure for its top against the platform is redacted |
| Periscopes | four: "two periscopes in the console room and two in the guest room", "from old submarines" | documented | Chertok vol. 2 p. 330, vol. 3 p. 429 |
| Where they stand | four objects south of the roof's middle | documented (drawn) | PIC/JR-2/60 Figure 5 ("possibly periscopes": HTA/JR-4/58); that the four objects are the four periscopes is our reading |
| Their heads | a tube on an upstand, the window 2 m over the roof, toward the rocket | estimated | |
| Corner vents | three: north-east, south-east, south-west; the north-west one gone by 1959 | documented | HTA/JR-4/58 ("one unidentified object or vent ... at each corner"); PIC/JR-2/60 |
| Entrance | in the north-west corner; some sixty steep steps down; five rooms | documented | PIC/JR-2/60; Chertok vol. 2 pp. 329-330 |
| Its form and facing | a concrete head in the mound's west side, a steel door | estimated | |
| Smoking place | "not far from the entrance" | documented (1957); its form and place estimated | Chertok vol. 2 p. 360 |
| Storage bunker | three bays 35 ft square, two earth fills 35 ft wide between, a roof vent and a drive to each | documented (measured) | PIC/JR-2/60; HTA/JR-4/58 ("approximately 100 feet west of the control bunker") |
| Where | bays' west face 53.75 m west; the middle bay 207.4 m north | documented | OpenStreetMap ways 172571561, 172571527, 172571558: three buildings 11 by 12 m, 21 to 22 m apart |
| Its height, walls, gates | 4.5 m; walls 1 m; gates 3.4 m square, two steel leaves | estimated | the height is redacted; "at some points, walls are estimated to be 10 feet thick" |
| Propellant shed | 105 ft long, open to the north on six equal supports, earth against its east end, a spur into it | documented (measured) | PIC/JR-2/60; PIC/JR-2/61 |
| Where | over the end of the northern spur (39.8 m west, 28.9 m north), along it | documented | OpenStreetMap way 172441879; Figure 5 |
| Its width and height | 9 m; roof 6.5 m | estimated | both redacted |
| Cascade | a plot 55 by 40 ft; two banks of "8 to 10 tanks" each "approximately 40 by [redacted]" | documented (measured) | PIC/JR-2/60; PIC/JR-2/61 |
| Where | its middle 38.6 m west, 23.3 m south: against the abutment's south-west corner | derived | Figure 5 (45 m from the axis); the text says "approximately 135 feet from the servicing tower" (41 m) |
| The vessels | nine a bank, 37 ft long, 0.7 m across, on three cradles | estimated | what they held (the pad's compressed gas) is the interpreters' reading |
| Booster pump house | 40 by 35 ft | documented (measured) | PIC/JR-2/60; placed from Figure 5 (its middle 40.7 m west, 61.5 m north) |
| Work shop | 24 by 35 ft | estimated (scaled off Figure 5; its size is redacted) | HTA/JR-4/58; PIC/JR-2/60 |
| Support building | 70 by 35 ft, 20 ft high | documented (measured) | PIC/JR-2/60 Figure 5 ("70' x 35' x 20' h"), "400 feet northwest of the launching platform"; OpenStreetMap way 172571597 (10 by 22 m) for its place |
| Component check-out shop | a centre section 50 ft long, a south section 35 ft, both ends lower | documented (measured) | PIC/JR-2/60; OpenStreetMap way 172571590 (11.6 by 32.4 m) for its place and width |
| Its heights | centre 7.6 m, ends 4.4 m | estimated | redacted |
| Security building | 75 by 35 ft, "along the fence line near the main rail and road entrances" | documented (measured) | HTA/JR-4/58; OpenStreetMap way 172571623 for its place |
| Observation positions | nine round the pit, facing the structure, "generally heavily earth-covered": six small (a to f), three observation bunkers (g, h, i) | documented | HTA/JR-4/58; "remain unchanged" in PIC/JR-2/60 |
| Where each stands | scaled off Figure 5; those on the north rim set 8 m outside the mapped rim; i set east of the road round the pit's tip | derived | on the south side the drawing's rim lies 10 to 30 m outside the map's, and the positions keep the drawing's places |
| g | on the rim "300 feet south of the launching structure", with "a covered personnel passageway from the road" | documented | HTA/JR-4/58 |
| h | "a long linear bunker ... southeast of the launching structure": 41 m long on the drawing | documented; the length scaled | HTA/JR-4/58; Figure 5 |
| Their forms | concrete, slits toward the structure, earth over the roof and against the ends, a steel door behind | estimated | |
| Spoil heap | "a large pile some 800 feet to the northeast" | documented | HTA/JR-4/58; "spoil bank" on Figure 5; stands today |
| Its outline | Figure 5's, fitted to its extent on today's imagery: 181 to 381 m east, 72 to 292 m north | derived | |
| Its height | 9 m | estimated | SRTM (2000) reads 114 m at its top against 105 to 107 m round it; a 30 m grid rounds a top off |
| Cable conduit | built between 1957 and 1959: out of the pit's edge, two turns, to the structure "about 60 feet below the top of the launching platform", "supported by several small vertical pillars" | documented | PIC/JR-2/60 |
| Its line | (8, 84), (8, 67), (-5, 58), then south to the structure | derived | Figure 5; today's concrete channel on the same slope follows it within a few metres |
| Its section; where it arrives | 2.0 by 2.2 m; its middle arrives 12.5 m under the deck, not the CIA's 18.3 m (60 ft) | estimated | the diameter is redacted; the pit model's terraces (estimated) stand higher there than the CIA's level |
| Old cable tray | straight, "unsupported", "some 200 feet across the open pit" from the north rim to the platform | documented | HTA/JR-4/58; PIC/JR-2/60; Figure 5 |
| Its section | a tube 0.9 m across | estimated | redacted |
| Floodlight tower | 60 ft high, "approximately 400 feet west of the servicing tower" | documented (measured) | HTA/JR-4/58 (as a collimation tower, in line with the pad on 090°/270°); PIC/JR-2/61 ("probably supports floodlights") |
| Its place across the tracks; its form | between the centre track and the spur north of it; a lattice, four floods toward the pad | estimated | |
| Fences | two, 160 ft apart | documented (measured) | HTA/JR-4/58 |
| The outer fence | 1,622 ft north to south; 2,925 ft east to west | documented (measured) | HTA/JR-4/58 and Figure 5 |
| Where it runs | south side 191 m south, east side 435 m east, west side 484 m west, north side 303 m north | derived | its line is on today's imagery (south, east, north) and the map (west: the security building stands on it). North to south agrees with the CIA to 2 m; east to west is 919 m against their 891.5 m: the map is taken |
| Light poles | "just inside the outer fence line ... spaced 120 feet apart" | documented | HTA/JR-4/58 |
| How far inside; their height | 25 ft; 7.5 m | estimated | a dimension on the 1958 drawing read as 25 ft |
| Guard towers | "at the four corners of the installation and at intervals along the outer fence": six on both drawings | documented | HTA/JR-4/58; Figure 5 |
| What fence, pole and tower were | timber posts and seven strands of wire; a timber pole on a concrete stub with an enamel shade; a timber tower | estimated | no close view has been read |
| Roads | the road in from the south-west; the road round the pit and past the bunker; the road from the storage bunker to the propellant shed ("probably the best in the Complex") | documented (their lines) | Figure 5; OpenStreetMap ways 54570611, 172571827, 172441909 |
| Their surface and width | concrete slabs, 6 m | estimated | |

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
| Tracks | the centre track from the west (its last 2.6 km) and the four spurs beside it, onto the platform; ballast, sleepers 0.55 m apart, two rails at the Soviet gauge (1,524 mm in 1961) | documented (their lines: OpenStreetMap ways 37547653, 172441851, 172441854, 172441876, 172441879; HTA/JR-4/58 counts five spurs in 1957; the gauge); estimated (the bed's width, the sleepers); near the platform the centre track is put on the axis and the three beside it brought to the CIA's plan ("The site's frame", "The platform") | painted on the land; where they come up to the platform the rails are modelled (`Tracks`) |
| Roads | the road in from the south-west (its last 2 km), the road round the pit and back past the command bunker, the road from the storage bunker to the propellant shed, and short drives to the storage bays, the check-out shop's gate and the gas receivers; concrete in slabs, 6 m wide | documented (the three roads' lines: PIC/JR-2/60 Figure 5 and OpenStreetMap ways 54570611, 172571827, 172441909); estimated (the drives, the surface, the width; that the way round the pit's east end was a made road and not only the track beside its ditch) | painted on the land, not modelled: they lay flush with it |
| The sky | clear: no cumulus, no high cloud | estimated | no observation of the morning has been read; the film shows a clear sky |
| Visibility | 60 km, the haze thinning over 1.5 km of height | estimated | not recorded |
| The light | the Sun 142.1° and 46.9° up, the Moon 193.3° and 35.0° up, 12 % lit, at 06:06:59.7 UTC | derived | `src/world` from site-1.ts and the launch instant (the flight's README; tests/world.test.mjs) |
| The land beyond, on the globe | the steppe's own tone, kept round the site until the eye is well up | estimated | as the colours |

The other lines on today's map round the site (the railway's loop to the north, the lines to Site 2
and beyond, the roads and buildings that are not on the CIA's drawing of 1959) are not drawn: when
each was built is not known to us, and much of it is later than 1961.

**The land is flat, and the real ground was not.** SRTM reads the platform and the embankment the
tracks came in on some 6 to 8 m above the steppe to the north (113 m on the embankment west of the
pad against 104 to 107 m by the bunker), and the CIA says as much: the track "approaches the
launching structure on a man-made embankment" (its height redacted), and the bunker's top was a
little below the platform's level. The land here is drawn level with the deck, so the bunker and
the buildings north of the tracks stand that much too high against the pad. Recorded, not yet
modelled: it is the land's to put right, and everything on it would follow.

Looked at again when the deck and the pit were built (SRTM on a 30 m grid from 240 m west to 30 m
west of the axis and from 180 m south to 270 m north), and left. What it reads: 113 to 115 m all
along the centre track; 114 to 117 m at 150 to 180 m south of it, so the ground south of the tracks
is at the tracks' level and there is no bank on that side; 110 to 112 m at 30 m north, 104 to 109 m
from 90 m north, 103 to 108 m at 240 to 270 m north. So it is not an embankment with two sides but a
fall of 8 to 10 m to the north, most of it within 100 m of the centre track, and the pit's north rim,
the conduit, the bunker and everything north of the tracks stand on the lower ground. (The grid also
has today's large buildings in it, 118 to 125 m, north-west and south-west of the pad: it is the
ground of 2000, not of 1961.) To build it, the land's height would need that fall, the same in
JavaScript and GLSL, and every module of the place and the pit's own rim, which all stand at one level
(`GROUND`), would need the ground's height where each stands. What is missing to do it honestly: the
bank's line and slope in 1961 (the CIA's height for the embankment is redacted in every copy read,
and no drawing gives its section), and a level for the bunker's roof against the deck.

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
| Rails on the platform: centre track, north and south tracks, short spur, gantry tracks | 1957 | not known (the platform has been rebuilt) | documented for 1957 and 1959; the centre track's flush rails in a photograph of 12 April 1961 | HTA/JR-4/58; PIC/JR-2/61 Figure 1 |
| The north track's last 10 ft | between August 1957 and 1959 | not known | documented | PIC/JR-2/61. Built as in 1959 for every date |
| The two masts 110 ft tall | 1957 | not known | documented for 1957 and 1959; one in a photograph of the launch of 12 April 1961 | HTA/JR-4/58; PIC/JR-2/60; PIC/JR-2/61 |
| Small building on the platform | between August 1957 and 1959 | not known | documented for 1959 (not reported in 1957); assumed for 1961 | PIC/JR-2/61 |
| Flame deflector, pit base, trenches, sump | 1957 | not known | documented for 1957 and 1959 (the deflector itself never seen); assumed for 1961 | HTA/JR-4/58; PIC/JR-2/60; PIC/JR-2/61 |
| Road down into the pit | 1957 | not known | documented for 1957; assumed for 1961 | HTA/JR-4/58 |
| The cut in the pit's north rim | by 1959 | filled by today | documented for 1959; assumed for 1961 | PIC/JR-2/60 Figure 5. Built for every date: whether it was there in 1957 was not checked against the 1958 drawing |
| Service trusses 8T119 (the first pair) | 1957 | not known | documented (that they were there from the first launch: the film of 15 May 1957); when the pair with lift columns replaced them is not in anything read | TsKBTM, as quoted by militaryrussia.ru |
| Upper cable mast | 1957 | not known | documented (1957: KBOM's drawing; 1959 to 1960: PIC/JR-2/61; 1961: the transcript) | |
| Erector 8U213, at the rocket with its boom up | with each rocket | drawn off before each launch: 08:35 on 12 April 1961 | documented | Ivanovsky; the transcript. The 8U213 was accepted into service in 1960; an R-7 was stood up by an erector from its first launch in 1957 |
| Command bunker | 1957 | today | documented | HTA/JR-4/58 (August 1957); Chertok vol. 2 pp. 326-330; OpenStreetMap |
| Its north-west corner vent | 1957 | before 1959 | documented | PIC/JR-2/60: "removed". Not built for any date yet |
| The smoking place by its entrance | June 1957 | not known | estimated | Chertok vol. 2 p. 360; assumed for 1961 |
| Storage bunker of three bays | 1957 | today | documented | HTA/JR-4/58; PIC/JR-2/60; OpenStreetMap |
| Propellant shed, pump house, work shop | 1957 | not known | documented for 1957 and 1959; assumed for 1961 | HTA/JR-4/58; PIC/JR-2/60; the shed again in PIC/JR-2/61 (March 1961), from the same photographs. None is on today's map where the drawing has it |
| Cascade (gas receivers) | between August 1957 and 1959 | not known | documented for 1959; assumed for 1961 | PIC/JR-2/60 ("the physical plant ... has been enlarged to include a probable cascade facility"); no longer "probable" in PIC/JR-2/61 |
| Support building | between August 1957 and 1959 | today | documented | PIC/JR-2/60 ("has been added"); OpenStreetMap |
| Check-out shop, security building | 1957 | today | documented | HTA/JR-4/58; OpenStreetMap |
| Observation positions a to i | 1957 | not known | documented for 1957 and 1959; assumed for 1961 | HTA/JR-4/58; "remain unchanged" in PIC/JR-2/60 |
| Spoil heap | 1957 | today | documented | HTA/JR-4/58; today's imagery; SRTM |
| Cable conduit to the bunker | between August 1957 and 1959 | today (its line) | documented | PIC/JR-2/60 |
| Old cable tray | 1957 | not known | documented for 1957 and 1959; assumed for 1961 | HTA/JR-4/58; PIC/JR-2/60 |
| Floodlight tower 400 ft west | 1957 | not known | documented for 1957 and 1959; assumed for 1961 | HTA/JR-4/58; Figure 5; PIC/JR-2/61 |
| Double fence, light poles, guard towers | 1957 | not known (gone today; the line remains) | documented for 1957 and 1959; assumed for 1961 | HTA/JR-4/58; Figure 5 |
| Roads | 1957 | today | documented | HTA/JR-4/58; Figure 5; OpenStreetMap |

"Assumed for 1961" is the honest state of it: the photographs the CIA's three reports rest on are
the last taken before the flight (the U-2's overflights ended in May 1960), and nothing read shows
these things in 1961 or says they had gone. In the scripts each
is `stood(..., since="1957")` with no end; a later flight that finds one gone gives it an `until`.

The site's builders ask `sitelib.stood` of each of these, so a state of the place without a
rocket can leave the erector out by its date.

## What the model gets wrong or leaves out

- The pit's section is not published: its terraces, slot and floor are drawn from the CIA's front
  elevation, which is itself an interpretation of shadows.
- The flame deflector is a form taken from a photograph of a scale model and sized by eye: its top
  16 m under the deck, its arc, its breadth and its blackened concrete are all ours. What it was
  faced with is not known. The CIA's "possible base of flame deflector", a block 19 ft high between
  the pylons on Figure 1, is not built: the model's chute comes down to the pit base instead.
- The service level under the platform (the niche in the back wall above the deflector, the steel
  galleries either side of it that the scale model shows, whatever the cable conduit ran into) is
  not built: nothing read gives it.
- The trenches' depth, the sump's roof and what was inside the sump are estimated or not recorded:
  the sump is its face and its roof, and each trench ends in the dark under it. The "two objects
  which could be the ends of two sluiceways" at the trenches' west ends are not built. The three
  ladders in the pit are ours.
- The road into the pit is a band of the floor in another material, straight down the middle: its
  real line, width and surface are not recorded, and how vehicles got from it to the pit base past
  the sump's face is not known (a ladder stands there).
- Under the platform the slot's sides are walls up to the slab between the pylons, where the CIA's
  figures show open bays between pylons and the scale model solid sides: not resolved.
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
  stood), the locomotive that drew it off. Its wheels run on the rails' heads all the way: in the deck's
  flangeways on the slab, and on the modelled rails of the centre track to where it is left.
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
- The two masts are a height, an array's size and two places from the CIA, and a silhouette from one
  photograph: the lattice, the six floodlights, the rod and the ladder are ours, and so is the
  reading that they were floodlight masts at all, which the CIA's interpreters doubted. The
  south-west one stands where the text's symmetry puts it, not where Figure 1 draws it.
- The rails stand 9 mm proud of the deck, where the photograph has them flush. The gantry rails have
  no flangeways and nothing rides them: what they were for is not known. No buffer stops, no
  points: none is recorded. The rail's section is not a Soviet one.
- The small building on the platform is a plain concrete box with a shut door in its east end: which
  end the door was in, and the stair the CIA supposed under it, are not recorded.
- The platform's south edge has a small projection at its middle on Figure 1, and the fence's
  corners are cut on it: neither is built. The slab is 10 ft thick, where a Russian account has
  three storeys.
- The place round the pad is a plan with estimated faces. Of every building the plan is the CIA's
  and the walls, doors, windows, roofs and colours are ours; their insides are not recorded, so
  every door is built shut and every window dark. The command bunker's five rooms and its stair of
  sixty steps are not modelled (their plan is not published, and the land is not cut for them), nor
  are the ramps down into the storage bunker's bays: its gates stand at grade.
- The cable conduit meets the structure some 6 m higher than the CIA's "60 feet below the top of the
  launching platform", because the pit model's terraces (estimated) stand higher there; and the
  cut in the pit's north rim that it and the old tray came out beside is the pit's own 1 in 1 slope
  between two edges scaled off Figure 5: its floor, and whatever lay in it, are not recorded.
- The observation positions on the pit's south side stand where Figure 5 has them, 10 to 30 m
  outside the mapped rim; position i is moved east of the road round the pit's tip, since the
  drawing has it where the pit model's floor comes up to the land.
- The fences' gates are gaps between taller posts where the road and the centre track cross them:
  no leaf is modelled, and whether they stood open is not recorded. The wire is drawn only at the
  finest level of detail. The fence's east-west extent is today's map's, 27 m more than the CIA's.
- On the CIA's drawing and not built: the ditches round the pit and the spoil, the drainage basin
  and the "possible fuel burn-off pit" to the west (cuts in the land), the buried water lines and
  cables, the two support buildings south of the tracks (a gable-roofed building and a prefabricated
  store: their sizes are redacted and neither is on today's map), the building outside the fence,
  the vehicles by the check-out shop and the ten rail cars on the spurs (which moved).
- The spoil heap is a smooth mound of one tone: its gullies and the ditches round it are not drawn,
  and the steppe's cover does not grow on it.
- The land is level with the deck, where the real ground north of the tracks lay 6 to 8 m lower
  ("The land", above): the bunker and the buildings stand too high against the pad by that much.
- The tracks are paint on the land, flat, beyond 160 m (the centre track) and 100 m (the others)
  from the axis; nearer, real rails stand on painted sleepers and ballast, and at those distances
  their heads come down to the paint over 10 m, which no rail did. The centre track is moved 3 m
  from where the map has it, and the three beside it by up to 4 m ("The site's frame").
