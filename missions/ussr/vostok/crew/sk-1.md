# Vostok pressure suit (SK-1)

The suit the Vostok pilots wore: Zvezda's SK-1 (СК-1), the first spacesuit flown. Model:
[sk_1.py](sk_1.py), imported by each flight's `model/crew.py`. It is built as Yuri Gagarin wore
it on 12 April 1961, standing, visor up, as on the way to the pad. The same script builds him in
the ejection seat's pose (`build_seated`), visor down, for the spacecraft's cabin; see
[In the seat](#in-the-seat).

Vostok 2 seats the same figure for Gherman Titov, who wore the same suit with the same lettering
(*Komsomolskaya Pravda*, 8 August 1961: an orange suit and a helmet lettered СССР). No document
with his height was found, so the stature is Gagarin's and is assumed
([Vostok 2's spacecraft.md](../flights/vostok-2/spacecraft.md)). Vostok 3 and Vostok 4 seat it again for
Andriyan Nikolayev and Pavel Popovich, whose helmets carry the same letters in the film of their
mornings (*Звёздные братья*, 1962); their heights were not found either.

**Who wears it is a parameter** (`Wearer`, and `wear()` before a build): the pilot's stature and
build, and what of the suit differed. The defaults are Gagarin's, and with them every model comes
out as it did before, to the byte. Vostok 5 seats `BYKOVSKY` and Vostok 6 `TERESHKOVA`, in the
SK-2: see [The SK-2, and the suits of June 1963](#the-sk-2-and-the-suits-of-june-1963).

**It is a rescue suit.** The cabin held ordinary air at ordinary pressure; the suit would have
inflated only if the cabin had failed. It was also what he landed in: Vostok's pilot left the
capsule on his ejection seat at 7 km and came down under his own parachute, which is why the
cover is orange.

**No length of the suit has been found in print.** His height and mass are from his service
record. The body under the suit is the shared figure (`tools/blender/figurelib.py`: the same
man the Mercury pilot is built from) carried to his height. The suit's bulk, the helmet and
every fitting are sized by eye from photographs.

## Dimensions and facts

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Pilot's stature | 165 cm | documented | "Рост 165 см, вес 68": his service characteristic of 1960, published by the Russian Ministry of Defence, as quoted by *Komsomolskaya Pravda*, 12 April 2024 (read). 157 cm is widely printed (Wikipedia among others) with no document behind it |
| Pilot's mass | 68 kg | documented | the same |
| Suit mass | 20 kg | documented | K. Thomas, NASA JSC synopsis (2016) of Abramov and Skoog; 23 kg is also printed, perhaps with helmet, gloves and boots |
| Operating pressure | 270 to 300 hPa | documented | the same synopsis; Russian Wikipedia agrees |
| Layers | a rubber bladder inside a restraint layer of lavsan (polyester), under a separate orange cover | documented | the same synopsis; a teaching note of the Memorial Museum of Cosmonautics ("наружную – силовую из ткани лавсан и внутреннюю – герметичную из листовой резины ... защитная верхняя одежда ярко-оранжевого цвета") |
| Cover's cloth | nylon, or lavsan | estimated | the Smithsonian's case label says "bright orange nylon oversuit"; an auction description says lavsan. Not settled |
| Helmet fixed to the suit | | documented | the synopsis ("rigid and irremovable"); the Smithsonian's label |
| Visor | double, closing by itself on loss of pressure | documented | the synopsis |
| "СССР" on the helmet | red, by hand, on the morning of the flight | estimated | told in memoirs and repeated everywhere, with Zvezda's Viktor Davidyants as the painter in some tellings and no name in others (RussianSpaceWeb). Photographs and film of that morning exist both with and without the letters |
| Mirror on a sleeve | | documented | the Smithsonian's label ("mirror sewn into the sleeve to help the cosmonaut locate hard-to-see switches and gauges") |
| Which sleeve | the right | estimated | read off photographs of the Smithsonian's and Zvezda's suits; the Memorial Museum's suit has a window on the left sleeve instead |
| Gloves | leather palms, on metal wrist rings | documented | the Smithsonian's label; the rings are read off its photographs |
| Boots | black laced leather, about to mid-calf | documented | the Smithsonian ("leather laced boots with clips"); colour and height from its photographs |
| Suit ventilated from the bus on the way to the pad | | documented | Gagarin's own account (*Дорога в космос*): "Вентиляционное устройство было подключено к источникам питания, установленным в автобусе". Nothing read says he carried a ventilator, and the model gives him none |
| Standing height, helmet and boots | 1.725 m | estimated | stature + 2.6 cm heel + 3.7 cm from crown to shell top + 1.2 cm of raised visor (1.713 m to the shell) |
| Knee, crotch, hip, shoulder heights | 0.285, 0.47, 0.530, 0.818 of stature, plus the heel | derived | Drillis and Contini's segment proportions, as for the Mercury figure; the crotch ratio is a guess |
| Girths | the shared figure's, times 0.96, let out 1.3 cm on the trunk, 1.1 on the arms, 0.6 on the legs | estimated | a stocky man of 68 kg in a loose cover |
| Breadths (hips, shoulders, stance) | the shared figure's, times 0.97 | estimated | |
| Crotch of the trousers | 4 cm under the body's own | estimated | a looser garment than the Mercury suit |
| Helmet | a ball 30.4 cm across, its centre 2.5 cm ahead of the middle of the head | estimated | photographs |
| Visor opening | 17.2 cm high, about 33 cm round the shell | estimated | photographs: it takes in the whole face and the cap's sides |
| Cover's colour | a strong red-orange (linear RGB 0.83, 0.16, 0.015) | estimated | by eye from the colour photograph in the bus and from the suits at Zvezda and the Smithsonian |
| Lettering | 3.8 cm high, its foot 3.2 cm over the opening, on the crown | estimated | photographs of 12 April and of the suits kept since; no source gives a size |
| Collar ring | 22.8 cm across | estimated | |
| Boots | 26 cm tall, sole 29.0 cm | estimated | the shared boot at 0.93 |
| Hands | the shared hand at 0.915 | estimated | scaled with his height |
| Mirror | 4.1 cm of glass in a 5 cm rim | estimated | photographs |

## The SK-2, and the suits of June 1963

The SK-2 (СК-2) is the SK-1 cut again for a woman. Zvezda made eight in 1962 for the women's group.
What its makers' history says of it, whole (Abramov and Skoog, *Russian Spacesuits*, 2003, p. 58,
read as overlapping snippets of the page, not as the page):

> The SK-2 suit differed from the SK-1 suit mainly in the enclosure cut-out that took into account
> the specific features of a female body. The enclosure featured a decreased shoulder breadth, an
> increased hip girth and a decreased opening in the neck partition. In accordance with the
> decreased shoulder breadth, the restraint system of shoulder joints was modified to retain arm
> mobility. Moreover, the position of the cord that kept the helmet at the front was changed. It
> was moved down from the breast. The gloves were also modified. The thickness of the thermal
> protection layer was decreased and mobility of the thumb improved. The lever for opening the
> respiratory valve and handles on the visor were modified to improve reach and make them handy.
> The required changes were also introduced in the design of the receptacle of the waste
> management system. Final non-female-specific changes were also introduced in the last units of
> the SK-1 suit (used by Bykovsky).

That is very likely what the cord in this model is (`Torso_Cord`, of which the list below says
"what it is was not found"): a cord from the breast that holds the helmet at the front.

No dimension of the SK-2 was found, and no photograph of one on display. What the two figures of
June 1963 have that Gagarin's does not is read off the photographs and film of 14 and 16 June and
off the SK-1 that Zvezda's museum keeps:

| Field of `Wearer` | Gagarin (the default) | Bykovskiy, 14 June 1963 | Tereshkova, 16 June 1963 | Confidence | Basis |
| --- | --- | --- | --- | --- | --- |
| `stature` | 165 cm | 165 cm | 164 cm | documented; **assumed**; **estimated** | Gagarin's service record. Bykovskiy's height was not found: in his suit he weighed 90.7 kg (Kamanin, 7 May 1963), which less the 23 kg the book gives the suit with its kit is Gagarin's 68 kg, so he is the same figure. Tereshkova's was not found either: sole to helmet top is about 5.6 helmet widths in the photograph of her reporting at the pad, as on the 1.65 m figure; good to some 8 cm |
| `breadth`, `girth` | 0.97, 0.96 | the same | 0.93, 0.94 | estimated | a slighter figure; her weight was not found |
| `shoulders`, `hips` | 1, 1 | 1, 1 | 0.95, 1.06 | documented (the direction); **estimated** (the amounts) | "a decreased shoulder breadth, an increased hip girth". The trunk from the waist to the yoke, the armholes and the arms move in; the pelvis and the thighs down to the knee move out; the neck and the shins stay |
| `boot` | 0.93 (a 29 cm sole) | the same | 0.86 (a 26.8 cm sole) | estimated | |
| `glove` | 1 | 1 | 0.94 | documented (thinner); estimated (by how much) | "the thickness of the thermal protection layer was decreased" |
| `gloves` | `cover`: orange cloth, tan palms | `black` leather, tan palms | `black` | estimated | the SK-1 at Zvezda's museum has black leather gloves with tan cuffs, and a colour film still of Tereshkova's parachute exercise in the suit has dark ones. Bykovskiy's were not seen: assumed. **Gagarin's orange gloves are probably wrong too** (below) |
| `valve` | `plain`: a small metal fitting at the right of the collar | `disc-pale` | `disc-black` | estimated | the breathing valve is a disc some 8 cm across hung on the neck piece under the ring at the right front: black-rimmed with a pale slotted cap on her at the hatch and in her television frames; pale on him in the film still of him strapped in. With it, at the right of the ring, an elbow and the stub of a black hose (her photograph at the hatch) |
| `neck` | `grey` | `pale` | `pale` | estimated | the same pictures |
| `mirror` | on the right sleeve | on the right sleeve (**assumed**) | none | documented, by photograph, for her | her right forearm is in plain view as she salutes at the pad and carries nothing |
| Lettering | СССР | СССР | СССР | documented, by photograph | at the pad on both mornings |

Not built, though on record: the lowered cord (the photograph at the hatch shows it lying on her
left chest much as here; its lower end is not seen), the changed shoulder restraint, the valve's
lever, the visor's handles, the changed sanitary fitting, the grey harness over the chest (the
film still of Bykovskiy), the cream tube at the right shoulder, the round bright thing on a dark
band on her left forearm, and the white cloth covers Tereshkova wore over her boots to the pad.

## Nodes

| Node | What it is |
| --- | --- |
| `Helmet` | white shell with the opening's lip and metal frame, the visor's pane in its rim (swung up over the crown; down on the seated figure), pivots at the temples, "СССР" on the crown, the collar ring and the grey neck band under it, the round fitting at the right front of the collar; inside it the padding, the head, the white headset cap and two red-brown microphones on their booms |
| `Torso` | the cover from the waist up with both shoulders (one skin, down to a hem on each upper arm), the front zip between its two facings, a welted pocket on each side of the chest, the loose cord from the collar's seam on his left, the slanting zip on the left of the abdomen, a band of the same cloth at the waist, the hose fitting at the right abdomen with a stub of hose and its connector |
| `Arms` | sleeves from the hem down; the mirror, its rim and its patch on the right forearm |
| `Gloves` | each hand's skin (cuff, palm, fingers, thumb), its leather palm and its wrist ring |
| `Legs` | the trousers from the waist down as one skin, hanging over the boots' tops; the front zip carried on to the crotch; a bellows pocket under a flap with two snaps on each thigh |
| `Boots` | uppers, tongues, soles and heels, laces on hooks |

With a `valve` that is a disc, `Helmet` also has the disc's rim (`Helmet_ValveRim`), its three slots
and the hose's stub (`Helmet_Hose`); without `mirror`, `Arms` is the sleeves alone.

The cover is `suit-orange-cover`; the viewer adds its weave to any material named `suit*`.

## Under his own parachute

The pilot left the seat at about 4 km and came down under his own canopy. For that the standing
figure's skeleton carries one more node, `Harness`, on the joint `Spine`: where a drawn parachute
is made fast (`ChuteDef.at`), midway between the shoulder joints and 9 cm above them (estimated:
about the top of the collar ring, where two risers from the shoulders would meet), its +Z (the
file's +Y) up his back. Its extras carry the pose he hangs in, for the viewer to put the skeleton
in: `hang_joints`, the joints' names in order, comma separated, and `hang`, four numbers for each,
a quaternion (x, y, z, w) in the joint's own axes, which at rest are the file's (+X his left, +Y
up, +Z the way he faces).

| Joint | Swing about its own X | Then about the line he faces along | |
| --- | --- | --- | --- |
| Upper arms | 52° forward | 26° outward | hands up on the front risers |
| Forearms | 100° forward | | |
| Thighs | 10° forward | 3.5° inward | legs together |
| Shins | 18° back | | a little bent, for the landing |
| Feet | 10° | | |

All of it is **estimated**: no photograph of a Vostok pilot under his canopy was found, and the
pose is a parachutist's under a round canopy, by judgement. It was looked at on the skinned figure
(stills, not the viewer). The parachute pack, its harness and its risers are not modelled: the
canopy, lines and riser are the viewer's (`viewer/chute.ts`), from the flight's data.

## Joints

The standing figure is skinned to the joints every crew figure has (`srlib.FIGURE`; the contract
is set out in [the Mercury suit's notes](../../../usa/mercury/crew/mark-iv-suit.md#joints)), with
`Grip.L`/`Grip.R` and `Fingers.L`/`.R` under the hands, so the viewer walks him with the gait it
walks anyone with. He carries nothing.

| Joint | Where (rest pose, cm: his left, his back, up) | Confidence |
| --- | --- | --- |
| `Hips` | 0, 0, 90.0 | derived |
| `Spine` | 0, 0, 97.0 | estimated |
| `Head` | 0, 0, 143.7 | estimated |
| `UpperLeg` | ±9.3, 0, 90.0 | derived (height); estimated (9.3 cm off the centre line) |
| `LowerLeg` | ±11.9, −1.0, 49.6 | derived |
| `Foot` | ±13.1, 0.5, 9.2 | estimated |

The arms' joints are the shared figure's, carried to his size in the same way.

## In the seat

`build_seated(parent, place, prefix)` builds the same figure in the pose the Vostok seat holds him
in: every mesh under the caller's node, named `<prefix>_<Node>_<Mesh>`, no skeleton, the visor
down. The seat frame is the shared one (centimetres: origin midway between the hip joints, head
toward −Y, chest toward +Z, his right toward +X); `vehicles/vostok_3ka.py`'s own seat frame has +Y
toward his head and +X to his left, in millimetres, so `place` is that frame in metres times
`diag(−1, −1, 1)`. `seated_key_points()` gives where his joints, helmet, heels and toes are.

| Joint | Angle | Confidence | Basis |
| --- | --- | --- | --- |
| Thigh from the line of the back | 60° | estimated | read off the seat as `vostok_3ka.py` lays it out for its own plain figure, not from a drawing of the seat |
| Knee | 79° | estimated | the same: shins hanging to the foot board |
| Ankle | toes drawn 12° up | estimated | |
| Elbow | 46°, hinge turned 24° in, forearm turned 30° | estimated | hands resting on the thighs; where his hands were is not known |
| Seat of the suit | rolled 24° under | estimated | |

`seated_key_points()` also gives `eyes`, midway between the irises, from which the spacecraft
makes its seat's view (`Seat_Pilot`). `build_harness` lays the seat's straps on him (unless
`build_seated(harness=False)`): one 44 mm strap over each shoulder, outside the helmet's collar
ring, from the seat's back down the chest to a buckle 27 cm above the hip joints, and a belt across
the lap 7 cm above them, under the forearms, each standing 5.5 mm off the cloth under it. That he
was strapped in is the record (Kamanin's diary, 27 July 1962: «все десять операций по освобождению
от подвесной системы»; the film still of Bykovskiy has a grey harness over the chest); every size
and the run of each strap are **estimated**, and the buckles are plain plates.

**He rides in Vostok 1's seat** (`flights/vostok-1/model/vehicle.py`). The spacecraft's own
checks pass with him in it: nothing of him reaches the cabin's lining, and all of him is inside
the entry hatch's opening on the line of the rails (his soles by 7 mm). His hip joints are 87 mm
in front of the seat frame's origin, so that his back lies on the parachute pack
(`vostok_3ka.PILOT_FORWARD`; estimated).

## What the model gets wrong or leaves out

- **The face is nobody's.** Behind the opening is the shared head: a clean, well-proportioned
  face with restrained features, there so the helmet is not empty. It is **not a likeness of
  Gagarin** and no attempt at one; skin, eye and brow colours are arbitrary. The look of the
  whole viewer is designed, not photographic, and a portrait would be neither.
- **The pressure suit itself is not modelled**, only the cover over it and a grey band at the
  neck. No bladder, no restraint layer, no lacing under the cover.
- **Fittings are read off photographs of museum suits**, which are not all alike and may not be
  his: the front zip, the chest pockets, the slanting zip on the left of the abdomen and the thigh
  pockets are placed and sized by eye from the Zvezda and Smithsonian suits; what the pockets held
  is not known; the gathered waist at the right, the snap-studded panel on the back and the
  white patch on the right upper arm are left out.
- **A cord, not a lacing** (very likely the cord that holds the helmet: see the SK-2's section). One pale cord comes out at the collar's seam on his left and hangs
  loose down the left of the chest toward the closure: the film still in the bus on 12 April
  (Commons, `Юрий Гагарин (Первый рейс к звездам).jpg`), with no eyelets and nothing crossing.
  Museum suits have a cream cord looped from the same seam to the left chest pocket
  (`Russian space suit 2.jpg`), and one ends in a red cap (`Gateway to space 2016, Budapest,
  SK-1 spacesuit 2.jpg`). It is modelled as the still has it (`Torso_Cord`): 21 cm, 4 mm thick,
  cream; all three estimated. What it is (an inflation tube, a pull cord, a lanyard) was not
  found. The cover closes with the central zip and the slanting one at the left hip and has no
  lacing on it in any photograph read; none shows a draw-in band or lacing at the waist either.
- **The waist band is the model's own device.** It lies over the line where the `Torso` node's
  skin ends and the `Legs` node's begins, as the Mercury suit's waist strap does. The cover is
  drawn in at the waist in photographs; a band there was not confirmed.
- **The inflatable collar** for a landing on water (the Smithsonian's label) is left out, and
  not settled. On 12 April nothing lies over the cover at the neck: its plain stand collar closes
  with one dark snap right under the helmet's ring (the still in the bus; the colour portrait
  `Космонавт Юрий Гагарин.jpg`, whose date is not verified). Museum suits shown with the cover
  open have a grey quilted yoke round the neck and upper chest under it, with a strap and buckle
  across (`Replica of Gagarin's spacesuit.jpg`, a replica; `SK 1 space suit (MMA 2011) (3).JPG`,
  which also has a yellowish tube with a red cap under the ring); the Memorial Museum's back view
  shows none. That the yoke is the stowed collar is a guess no caption supports, so nothing is
  built: whatever it is, it is under the cover and out of sight on the flown suit. Looked in and
  found nothing more: the Commons categories for the SK-1, Vostok space suits, the SK-2 and Titov
  in 1961 (empty or irrelevant); an auction lot for a replica (rrauction.com, "missing the
  flotation bladder and hose"); spaceodysseyhub.com's SK-1 page; searches in English and Russian
  for Abramov and Skoog's description. Not reached: zvezda-npp.ru, RussianSpaceWeb's suit pages,
  the TASS and RIA archives, astronautix, the Science Museum's 2015 exhibition, Kaluga.
- **Hoses.** One fitting and a stub of the bundle at the right abdomen, ending in a plain block;
  the real bundle ran to a multi-way connector at the right hip. The hose on the collar's fitting
  is left out. Their colours are estimates.
- **The gloves are probably the wrong colour on Gagarin and the three after him.** The model's
  are the cover's orange with a tan palm. The SK-1 at Zvezda's museum, seen for Vostok 5 and 6, has
  black leather gloves with tan gauntlets, and the two figures of 1963 are given black
  (`gloves="black"`). The first four are left as they were built, so that their models do not
  change under a flight that is not theirs; whoever next rebuilds Vostok 1's crew should look.
- **The gloves' leather is a facing on the palm only**; the insides of the fingers are the
  cover's orange (or, on the figures of 1963, black). No strings from the sleeves (the gloves hung from them until he put them on in
  the cabin: on the walk to the pad his hands were bare, and the model's are gloved).
- **The watch strap on the left forearm** seen on the Smithsonian's suit is left out. There was
  no pressure gauge on the wrist.
- **The visor is one pane in a rim**, swung 92 degrees up over the crown when open, so that its
  rim lies along the brow under the letters, as in the photograph in the bus. How far it really
  went is read off that one picture. Its pivots are plain discs. The second pane, the latch and
  the automatic closing gear are not modelled.
- **The helmet is a plain ball** on a collar ring. The earphones' bulges, any hose or cable on
  it and the communications lead are left out; the microphones are a guess at their shape.
- **Boots** are the shared laced boot in black with a tan sole edge; "with clips" was not seen
  first hand.
- **The body is a mannequin scaled to his height**, not his build. Folds are invented, as on the
  Mercury figure, and show a soft, unpressurised suit.
- **Moved, he is a jointed doll in one skin**, as the Mercury figure is: cloth stretches and
  shears at a joint instead of folding, and the helmet turns with `Head` though the real one was
  fixed to the suit.
- No parachute harness or pack on the standing figure, no survival gear, no mass properties. The seated
  figure's straps are the seat's, estimated, and stop at the seat's back and sides without fittings.

## Sources

Read for the SK-2 and the suits of June 1963 (13 November 2026):

- I. P. Abramov and Å. I. Skoog, *Russian Spacesuits*, Springer-Praxis, 2003, pp. 41 to 44 and 58,
  as search-inside snippets on Google Books (volume f7pZosHqkbEC): each sentence quoted came back in
  two overlapping snippets; no whole page was seen, and Appendix 3's table of the SK-1 and SK-2
  (pp. 321 to 323) could not be recovered. Also from it: the gloves in four layers on quick
  disconnects, "the boots were made of leather … fitted with special buckles", the cover of kapron
  with a flotation collar, "the suit mass amounted to about 23 kg" with its headset, radio and
  survival kit.
- Zak, RussianSpaceWeb, "Tereshkova prepares to fly" and the pages after it: the same passage in
  his words, and the photographs: Tereshkova at the hatch, at the bus, on the gantry and in her
  television frames; Bykovskiy at the pad, strapped in (a colour film still) and in his frames.
- collectSPACE: the colour photograph of Tereshkova reporting at the pad, full length (the height;
  the bare right forearm; the white covers over the boots), and its note on the dove emblem.
- Zvezda's museum on Google Arts & Culture: an SK-1 standing, and another in a Vostok seat: the valve's disc, black gloves with tan gauntlets, black laced boots.


Read for the first model (Gagarin's). Zvezda's own site, Encyclopedia Astronautica and Abramov
and Skoog's *Russian Spacesuits* (Springer-Praxis, 2003), the standard reference, could **not** be
reached then: what is given as theirs in the tables above is at second hand.

- K. Thomas, [*The Russian Space Suits* synopsis](https://ntrs.nasa.gov/api/citations/20160009368/downloads/20160009368.pdf),
  NASA JSC, 2016, after Abramov and Skoog: layers, mass, pressure, the helmet and visor.
- [СК-1 (скафандр)](https://ru.wikipedia.org/wiki/СК-1_(скафандр)), Russian Wikipedia: pressure,
  numbers built, the lettering's story. A fallback, labelled as such above.
- *Komsomolskaya Pravda*, [12 April 2024](https://www.kp.ru/daily/27592.5/4917923/): his service
  characteristic of 1960, published by the Ministry of Defence: height and mass.
- Smithsonian National Air and Space Museum, the SK-1 on loan to it (Gagarin's training suit):
  the case label and photographs, as reproduced at
  [historicspacecraft.com](https://historicspacecraft.com/Photos/Suit/YG_SK-1_NASM2009RK_1.jpg);
  [the museum's own picture](https://airandspace.si.edu/multimedia-gallery/i19961104001ps05-s-1jpg).
- A teaching note of the Memorial Museum of Cosmonautics, Moscow
  ([text](https://museumday.mgpu.ru/uploads/lesson_files/68b728ffa99ad892b8385a39b2b34876_text4teacher2.docx)):
  the layers and the cover.
- Y. Gagarin, *Дорога в космос*, as quoted at
  [burevestn1k.livejournal.com](https://burevestn1k.livejournal.com/11775.html): the blue
  undergarment, the white headset cap, the ventilation from the bus.
- [RussianSpaceWeb, Vostok 1's launch](https://www.russianspaceweb.com/vostok1_launch.html): the
  morning's sequence; that the liftoff film usually shown is of another launch.
- 360.ru, on [the photographs with and without the lettering](https://360.ru/news/obschestvo/fejk-nadpis-sssr-na-shleme-gagarina-nachali-stirat-na-fotografijah/).
- Photographs on Wikimedia Commons: `Юрий Гагарин (12-04-1961).jpg` (in the bus: the letters,
  the cap, the microphones, the collar's fitting), `Гагарин перед полётом.jpg` (at the pad, the
  helmet side on), `Gagarin-skafander.jpg` (a suit at Zvezda, captioned as the flown one),
  `SK 1 space suit (MMA 2011)` (the Memorial Museum's, front and back);
  `Юрий Гагарин (Первый рейс к звездам).jpg` (the film still in the bus: the cord, the collar's
  snap), `Космонавт Юрий Гагарин.jpg`, `Russian space suit 2.jpg`, `Replica of Gagarin's
  spacesuit.jpg`, `Gateway to space 2016, Budapest, SK-1 spacesuit 2.jpg` (the cord and the neck
  on suits kept since).
