# The Cape round Complex 5/6: the neighbouring launch complexes

What a walker from pad 5 can reach: the complexes within about a kilometre, each built from its own
record as clean forms with the silhouette that record gives, at one level of detail. They are
neighbours, not the flight's pad: no interiors (doors shut, windows dark), nothing that moves,
nothing to climb. `cape/<complex>.py` builds each in a frame of its own (feet; the origin on a named
pad; +Y along a stated bearing), `cape_1961.py` puts them in one model
(`public/models/usa/mercury/sites/cape/1961-05.glb`, 265 kB and 28,000 triangles, so it is fetched with the scene), and
`src/viewer/cape1961.ts` stands each where its pad's published coordinates put it. The complexes
further off (1.2 to 9 km) are still stand-ins drawn in cape1961.ts.

Confidence is as everywhere here: **documented** (a published figure, cited), **derived** (worked
from documented ones, and how), **estimated** (scaled off a named photograph, or chosen). Positions
taken from OpenStreetMap are of what survives today, good to a few metres, and are called derived.
`docs/sources.md`, "The Cape", is the bibliography.

Built: Complexes 26, 30, 25, 29 and 17. The rule for each: the permanent structure is built, the vehicle
that came and went is left out, and where a movable tower stood on 5 May 1961 is an estimate and says so.

## Complex 26 (`cape/lc26.py`, node `LC26`)

Frame: origin on pad 26B's centre; +Y along the track to pad 26A, 025° true; +X 115°.

| Thing | Figure | Confidence | Source |
|---|---|---|---|
| Pads | two, 26B at 28.443346° N 80.571204° W, 26A 518 ft from it on 025.0° | derived | OpenStreetMap's two pads; the four pads of 5/6 and 26 lie on one line so that the gantries' tracks join (*A Noble Endeavor* pp. 7-8) |
| Each pad's apron | a concrete square 200 ft on a side, the track through its middle | estimated | 3.3 gantry bases across in the aerial of 23 January 1961 (museum JUNO_II_610123_0019); pad 6's is 200 ft |
| Scale platform | a steel square at the pad's middle over a scale room | documented that there was one (the museum, "LC-26 Launch Pads"); 14 ft square is estimated | |
| Launch stand | a ring table on four legs over a cone, 10 ft across, 5.5 ft high | estimated | museum AFSMM_Complex_26_0004 and _0005; OpenStreetMap maps the displayed Jupiter pedestal at 10 ft |
| Track | two pairs of rails 21 ft apart, each standard gauge, as Complex 5/6's (`lc5/site.py`) | derived: the same track; the blueprint's own gauge reads 22 to 23 ft and is not legible | *A Noble Endeavor*; the gantry's blueprint as photographed at the museum |
| Service structure | one for both pads, self-propelled on the track; built by Noble Co., Oakland, 1957; an A-frame mast of two legs that could be lowered over its base | documented | the museum, "LC-26 Gantry"; Spaceline's fact sheet |
| its height | 111 ft 9 in to the top rail | documented | the museum, from the blueprint ("Missile Service Stand", Corps of Engineers, Jacksonville); *A Noble Endeavor* p. 7: "shorter by about 23 feet" than pad 5's 135 ft |
| its base | 61 by 26 ft | derived: its near twin's, the Complex 4 gantry that went to pad 5 (the museum, "LC-3/4"); OpenStreetMap maps what survives at 60 by 28 ft | |
| its legs | 26 ft apart at the base's deck, 14 ft at the head | estimated | scaled off the blueprint's photograph (about 29 and 14 ft), to a tenth |
| its platforms | 34 ft wide and 14 ft deep; a low one at 22 ft and level I at 45 ft open and railed; II at 51 ft, III at 61 ft and IV at 81 ft enclosed, white, with a band of windows | "five platforms, four adjustable, the top one enclosed": documented (the museum). Width estimated off the blueprint and checked at 33.7 ft against Juno II's 76 ft 8 in (Spaceline's photograph of about 1961); heights estimated off the blueprint to a tenth (a dimension on it that may read "Approx 55'-6\"" would put them 7 % higher: not resolved); depth, and which were enclosed in May 1961, estimated from the photographs of January and February 1961 | |
| its crane | a hammerhead along the track over the mast's head, 58 ft long, the long arm over the pad | that it had one: documented; its length estimated against the base in the aerial | |
| its colours | red steel, white cabins | documented for January 1958 (colour photographs of Explorer 1 in the gantry); the photographs of 1959 to 1961 are black and white and agree in tone | Wikimedia Commons, *Explorer 1 in Gantry* |
| **where it stood on 5 May 1961** | at pad 26B, its base lying back toward Complex 5/6, its platforms closed | **estimated** | see below |
| Blockhouse | its point 399 ft from each pad; the hardened part 47 ft across and 46 ft from the point to its back wall; an annexe 50 ft deep behind | derived | OpenStreetMap way 195709357 (today's outline, later annexes and all); the museum: "a mere 400 feet from the launch pads" |
| its walls and roof | walls 2 ft thick; a roof vaulted from side to side, 5 ft thick at the edges and nearly 8 ft at the crown | documented | the museum, "LC-26 Blockhouse" |
| its height | walls 14 ft, the vault's crown 18 ft 10 in | estimated | Complex 17's blockhouse, of the same pattern, is 18 ft 10 in (HAER FL-8-5 p. 45); no figure found for 26 |
| its viewing ports | one 8.5 ft and one 4.5 ft long in each face of the point, 3.6 ft high, under one hood | estimated | the pattern HAER gives for Complex 17's; 26's firing room B shows two bays side by side. The glass is documented (three segments of fifteen quarter-inch sheets each, about a foot in all) and not built: the ports are dark |
| Cable trenches | one to each pad under steel plates, "4 feet deep by 300 feet long" | documented that they were; drawn straight from the point to each apron's edge (300 ft, which agrees): their true line is estimated | the museum |
| Generator building, each pad | 23 by 17 ft, 123 ft from its pad (26B's on 313°, 26A's on 279°); about 10 ft high | place and plan derived (OpenStreetMap); height estimated (museum IMG_0562) | the museum, "LC-26 Launch Pads" |
| Fuel-truck revetment, each pad | a white wall on three sides, 33 by 21 ft, 137 ft from its pad (265° and 327°); about 10 ft high | place and plan derived; height, and which side is open, estimated from the aerial of January 1961 | the same |
| Deluge monitors, each pad | two, each behind a wall 5 ft high, 16 ft long, 90 ft from the pad (26B: 073° and 253°; 26A: 335° and 156°), striped on the pad's side | the 5 ft: documented; places derived; the monitor itself estimated | the same |

### Where the gantry stood on the day

No source read says. What is known: there was one gantry for the two pads (documented); Juno II
AM-19E flew from 26B on 27 April 1961 and AM-19G from 26B on 24 May (documented: the museum's dated
photograph; the launch table); a tactical Jupiter stood on 26A on 22 April with its own ground
equipment and no gantry (the museum's dated photograph). A vehicle nineteen days from launch would
have been in erection or about to be, so the gantry is stood at 26B, where its next work was, with its
platforms closed. **Estimated**, and so is the way its base lies (as in the aerial of 23 January
1961). No Juno II is modelled: nothing dated puts one on the pad that day. Pad 26A is its apron, its
track and its stand only: the Jupiter of 22 April is no evidence for 5 May. A dated photograph of
either pad in the first week of May 1961, or AM-19G's processing log, would settle it.

### What stood when

| Thing | From | Until | Confidence | Source |
|---|---|---|---|---|
| Pads, track, blockhouse, generator buildings, revetments, monitors' walls | 1957 | standing today | documented | the museum: first launch 28 August 1957; today the museum's grounds |
| Service structure (somewhere on the track) | 1957 | taken down in the museum's time | documented | the museum, "LC-26 Gantry" |
| Service structure at pad 26B, platforms closed | May 1961 | May 1961 | estimated | above |

### What is simplified or left out

- One level: no interiors, no lift, no ladders or stairs (the legs' "safety ladders" and the lifts on
  each leg are on the blueprint), no cables, no lamps. Nobody can go up the gantry or into the
  blockhouse; their doors are shut and their windows dark.
- The gantry's lacing is a designed pattern, not the blueprint's member for member; its office and
  generator on the base are two boxes placed by eye; the trucks are plain.
- The aprons have no joints, painted circle or stains, and the track no sleepers (its ballast is the
  land's: `cape.ts`, TRACKS).
- Left out because nothing gives their place or size: the wooden light poles round each pad
  (documented that there were), the blockhouse's two 18 in ventilation stacks (documented; height not
  found), building 41109 (whether it stood in 1961 is not established), the trailers, trucks and the
  lattice stand seen on 26B's apron in January 1961, and the spur lines east of the track.
- The file is drawn at its full level only: the two coarser levels the build writes beside it are not
  used, and the far shadow map (`viewer/shadows.ts`) does not cover it, so from across the site it
  casts no shadow; on foot beside it, it does.

## Complex 30 (`cape/lc30.py`, node `LC30`)

Frame: origin on pad 30A's centre; +Y to pad 30B, 202° true.

| Thing | Figure | Confidence | Source |
|---|---|---|---|
| The complex | "a two-story blockhouse with an 8′ thick roof, two launch pads with service towers"; accepted by the Army 10 February 1960 | documented | the museum, *Launch Complex 30* |
| Pads | 30B 511 ft from 30A on 202°; each apron about 200 ft square, a paved strip between | derived (OpenStreetMap); the strip's 40 ft width estimated | |
| Which pad was used | 30A only: first launch 25 February 1960, nineteen in 1961 | documented | Spaceline; Wikipedia's launch chart |
| Mobile service tower | one for both pads, on rubber tyres, taken down 14 February 1968 | documented | Spaceline; the museum's storyboard: "mobile service tower built to serve both launch pads" |
| its size and form | 63 ft tall, 26 ft square; four tiers, the first and third closed in white panels with windows, the second dark, a dark hoist house on top with a short beam | estimated | scaled from a man at its foot (taken as 1.75 m) in the museum's photographs of 25 February and 30 June 1960. Its frame's colour is not established (black and white): drawn grey |
| where it stood on the day | at pad 30A | estimated | nothing records it |
| Pedestal and mast at 30A | a ring 5 ft across and 3 ft high; a pole 36 ft | estimated | the photograph of 25 February 1960 |
| Blockhouse | 384 ft from 30A on 256°; drawn 46 ft across and 60 ft long with a 30 ft annexe, walls 22 ft, crown 27 ft | place derived (OpenStreetMap, whose outline, 83 by 116 ft, includes later additions); plan and height estimated ("two-story": 25 to 30 ft) | |

Left out: the ready building and the checkout building east of the pads (in the aerial of April 1965;
not established for 1961), the helicopter apron, and any Pershing or erector-launcher.

## Complexes 25 and 29 (`cape/lc25.py`, nodes `LC25`, `LC29`)

Frames: LC25's origin is pad 25A's centre, +Y to pad 25B, 213° true. LC29's is pad 29A's centre, +Y 203°.

| Thing | Figure | Confidence | Source |
|---|---|---|---|
| Pad 25A | a flat pad, complete December 1957 "with an access stand"; Polaris A1 and A2 through 1961 | documented | the museum, *Launch Complex 25* |
| its apron and stand | 150 ft square; a ring stand 8 ft across and 6 ft high | estimated | no figure for 1961 |
| its closed tower | that one stood by May 1961 | derived | a tall panel-clad tower is behind the missile in the photograph of 9 March 1960 (Wikimedia Commons, A1X-14) |
| the tower's form | white, slab-sided, 58 ft tall and 20 ft square, stepped at the top, cut away at the foot | estimated | Spaceline's colour photograph of about 1963, scaled against a truck. Its posts, girts and door are drawn by eye |
| Pad 25B | the ship motion simulator: a pit 33 ft square and 55 ft deep; first used 14 August 1959, last fired from 2 August 1960, mothballed October 1961 | documented | Spaceline |
| its pit head | a kerb 33 ft square, covered over, under a steel frame 21 ft high | the 33 ft: documented; the cover, the frame and its height: estimated from Spaceline's photograph of about 1959 | |
| Complex 25's blockhouse | 395 ft from 25A on 259°; drawn of the Cape's pattern, 46 by 60 ft, crown 18 ft 10 in | place derived (OpenStreetMap, its outline in a later, reinforced state); the rest estimated | |
| Pad 29A | built 1958-59; one pad with "an access stand"; Polaris A2 from 10 January 1961 | documented | the museum, *Launch Complex 29* |
| its launcher | a ring stand; a white umbilical boom leaning from its foot, 25 ft long | estimated | Wikimedia Commons, Polaris A2X on LC-29A, 1961: the boom is about 0.8 of the missile's length |
| the building behind it | low, white, flat-roofed, drawn 30 by 20 ft and 10 ft high, 70 ft from the pad | that it stood: the same photographs; size and place estimated | |
| Complex 29's blockhouse | 371 ft from 29A on 253°; OpenStreetMap's outline is 93 by 46 ft with a point | place derived; height estimated | |

Left out, and why: Complex 29's own closed tower (first seen about 1963: not established for May 1961);
pad 25A's lattice umbilical tower of 1958 (not seen after the closed tower came); pads 25C and 25D
(1967-68); any Polaris. A lightning mast is drawn beside 29A's pad by eye.

## Complex 17 (`cape/lc17.py`, node `LC17`)

Frame: origin on pad 17B (its launch deck's seaward edge); +Y to pad 17A, 024° true. Each pad faces east.

| Thing | Figure | Confidence | Source |
|---|---|---|---|
| Pads | 17B accepted September 1956, 17A April 1957; in spring 1961 17A flew Thor-Delta and 17B Thor-Able-Star | documented | the museum, *Launch Complex 17* |
| their places | 17A 524 ft from 17B on 024° | derived | OpenStreetMap (HAER: "550 ft") |
| Launcher building, each pad | 50 by 59 ft, 28 ft high, reinforced concrete | documented | HAER FL-8-5 pp. 48-51 (which dates it 1959, though photographs of 1957-58 already show a deck) |
| Launch deck | steel, level with the roof, 50 ft wide, carried 38 ft beyond the east side | documented | the same |
| Flame deflector | steel, 33 ft wide, a parabola in section, throwing the jet east | documented; drawn as three flats | the same |
| Flume | concrete, 230 ft long, to a pond 60 by 130 ft | documented; its 40 ft width and 4 ft walls are estimated, and the pond is not built | the same |
| Service tower, each pad | on rails 58 ft apart, four trucks, rolling 400 ft west over the launcher building; by United States Steel | documented | HAER FL-8-5 pp. 27, 53 |
| **its height in 1961** | **118 ft 10 in** | **derived, and disputed** | HAER gives 133 ft 4 5/16 in from the 1969 handbook, after 14 ft 6 in was added in 1968: 118 ft 10 in before. The museum says 112 ft before the later raise. HAER's is taken, as the one from an engineering record; the difference, 7 ft, is not reconciled |
| its length along the rails | 80 ft | estimated, weakly | the height to width of one face in Spaceline's photograph of 17B, about 1961 |
| its form | an open frame of eight levels, a deck at each; the top deck 1.3 times as wide on raking brackets; a bridge crane on top | estimated | the museum's photographs of 19 January 1961; Spaceline, about 1961 |
| its colour | red | estimated | red in the earliest colour view found (17 May 1963); uniformly dark in January 1961. 17A's top two levels were clad in green fibreglass by 1959 (HAER p. 56), which is not built |
| where each stood on the day | at its pad, over the launcher building | estimated | both stood so on 19 January 1961; nothing dated May was found |
| Umbilical mast | "a simple retractable steel structure" at the deck's south-east corner | documented; its 78 ft above the deck is estimated (Spaceline's photograph of 1959) | HAER |
| Blockhouse | 88 ft 9 in by 43 ft 6 in, 18 ft 10 in to the top of its roof; an annexe 43 by 18 ft and 9 ft 2 in high behind; walls 2 ft | documented | HAER FL-8-5 pp. 45-46 |
| its place and ports | 567 ft from 17B on 323°, its point to the south-east; a port 8 ft 6 in and one 4 ft 6 in long to each firing room | place derived (OpenStreetMap's ruin); ports documented in length, drawn dark and 3.6 ft high | HAER. The earth bank and periscopes are of 1964 and the north wing of 1968: neither is built |

Left out: the pond, the small camera towers and the tank trailers seen in January 1961, and any Thor.

## The neighbours on 21 July 1961

Mercury-Redstone 4 flew eleven weeks after the day this model is dated for. **It is shown the same
model**, and this is why. The viewer has one Cape (`src/viewer/cape1961.ts`: `NEIGHBOURS`, and the far
stand-ins), not one a flight; and nothing found says that anything permanent on these complexes
was built or taken down between 5 May and 21 July. What could have differed is where each movable
tower stood and what vehicle stood on each pad, and for 21 July, as for 5 May, no dated source read
says. So May's places are kept, **assumed unchanged (estimated)**:

| Complex | Round 21 July 1961 | What it would change | Confidence |
|---|---|---|---|
| 26 | 26B flew its last Juno II on 24 May; 26A flew a Jupiter on 5 August. A photograph of 7 July taken up the track from pad 5 (FHSU Project Mercury item 407, LOD 61-6218) shows, through the legs of pad 6's gantry, an A-frame gantry on Complex 26's track with a white vehicle in it | the gantry may have stood at 26A that month, round the Jupiter, and not at 26B. Which pad it is at in the photograph was not measured; where it stood on the 21st is not known | launches documented (Astronautix, *Cape Canaveral LC26A*, *LC26B*); the rest not established |
| 17 | 17A flew Thor-Delta on 12 July (Tiros 3) and 16 August (Explorer 12); 17B flew Thor-Able-Star on 29 June | each tower at its pad, as modelled, is as likely for July as for May | launches documented (Astronautix, *LC17A*, *LC17B*); the towers' places estimated |
| 30, 25, 29 | Pershing and Polaris firings went on through the summer; not looked up by date | nothing known | estimated |
| 12 (a far stand-in) | drawn without a service tower; Ranger 1 left it on an Atlas-Agena on 23 August, so by late July it very probably had one again | a tower 5.5 km away | the launch documented (Astronautix, *LC12*); the tower not established, and not drawn |
| 34 (a far stand-in) | dedicated 5 June; its first Saturn came in August | as drawn | estimated |

A dated photograph of Complex 26 from the third week of July 1961 would settle the one that can be
seen from pad 5. Until then a July state of this model would be May's under another name, and none
is built.

## Ways on foot

The track runs from pad 5 through pad 6 to Complex 26 (documented: *A Noble Endeavor*). To the others a
shell road is drawn (`cape.ts`, TRACKS): from Complex 5/6's gate west to Complex 30; from its
south-west corner to Complex 25 and on to 29; from Complex 26 east-north-east to Complex 17. That each
complex had its road is plain in the aerials of 1959 to 1965. **Their lines here are estimated**: each is
straight from one known place to the next, not traced from a map of 1961.

## Sources known and not read

HAER's drawings for Complex 17 (FL-8-5-A to -G); a legible copy of Complex 26's "Missile Service Stand"
blueprint (on show in its blockhouse); the Corps of Engineers' *History of the Canaveral District
1950-1971*; the *Handbook of ULO Facilities at the Eastern Test Range* (1969). See docs/sources.md.
