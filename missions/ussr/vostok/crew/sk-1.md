# Vostok pressure suit (SK-1)

The suit the Vostok pilots wore: Zvezda's SK-1 (СК-1), the first spacesuit flown. Model:
[sk_1.py](sk_1.py), imported by each flight's `model/crew.py`. It is built as Yuri Gagarin wore
it on 12 April 1961, standing, visor up, as on the way to the pad. The same script builds him in
the ejection seat's pose (`build_seated`), visor down, for the spacecraft's cabin; see
[In the seat](#in-the-seat).

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
| Standing height, helmet and boots | 1.713 m | estimated | stature + 2.6 cm heel + 3.7 cm from crown to shell top |
| Knee, crotch, hip, shoulder heights | 0.285, 0.47, 0.530, 0.818 of stature, plus the heel | derived | Drillis and Contini's segment proportions, as for the Mercury figure; the crotch ratio is a guess |
| Girths | the shared figure's, times 0.96, let out 1.3 cm on the trunk, 1.1 on the arms, 0.6 on the legs | estimated | a stocky man of 68 kg in a loose cover |
| Breadths (hips, shoulders, stance) | the shared figure's, times 0.97 | estimated | |
| Crotch of the trousers | 4 cm under the body's own | estimated | a looser garment than the Mercury suit |
| Helmet | a ball 30.4 cm across, its centre 2.5 cm ahead of the middle of the head | estimated | photographs |
| Visor opening | 17.2 cm high, about 28 cm round the shell | estimated | photographs |
| Lettering | 2.7 cm high, its foot 2.3 cm over the opening | estimated | photographs of 12 April; no source gives a size |
| Collar ring | 22.8 cm across | estimated | |
| Boots | 26 cm tall, sole 29.0 cm | estimated | the shared boot at 0.93 |
| Hands | the shared hand at 0.915 | estimated | scaled with his height |
| Mirror | 4.1 cm of glass in a 5 cm rim | estimated | photographs |

## Nodes

| Node | What it is |
| --- | --- |
| `Helmet` | white shell with the opening's lip and metal frame, pivots at the temples, "СССР" on the brow, the collar ring and the grey neck band under it, a hose fitting at the right front of the collar; inside it the padding, the head, the white headset cap and two microphones. The seated figure also has the visor's pane, down |
| `Torso` | the cover from the waist up with both shoulders (one skin, down to a hem on each upper arm), the front closure's flap, a band of the same cloth at the waist, the hose fitting at the right abdomen with a stub of hose and its connector |
| `Arms` | sleeves from the hem down; the mirror, its rim and its patch on the right forearm |
| `Gloves` | each hand's skin (cuff, palm, fingers, thumb) and its wrist ring |
| `Legs` | the trousers from the waist down as one skin; a flapped pocket with two snaps on each thigh |
| `Boots` | uppers, tongues, soles and heels, laces on hooks |

The cover is `suit-orange-cover`; the viewer adds its weave to any material named `suit*`.

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
  his: the front closure is a plain flap (photographs show a zip from neck to crotch and a second,
  diagonal one on the left abdomen; neither is modelled below the waist or at all); the thigh
  pockets' size and what they held are guesses; the small chest pockets and the snap-studded panel
  on the back are left out.
- **The waist band is the model's own device.** It lies over the line where the `Torso` node's
  skin ends and the `Legs` node's begins, as the Mercury suit's waist strap does. The cover is
  drawn in at the waist in photographs; a band there was not confirmed.
- **The inflatable collar** for a landing on water (the Smithsonian's label) is left out: its
  shape when stowed was not made out in any photograph read.
- **Hoses.** One fitting and a stub of the bundle at the right abdomen, ending in a plain block;
  the real bundle ran to a multi-way connector at the right hip. The hose on the collar's fitting
  is left out. Their colours are estimates.
- **The gloves are one colour**, the cover's orange; the real palms were leather. No strings
  from the sleeves (the gloves hung from them until he put them on in the cabin: on the walk to
  the pad his hands were bare, and the model's are gloved).
- **The watch strap on the left forearm** seen on the Smithsonian's suit is left out. There was
  no pressure gauge on the wrist.
- **The visor, up, is simply absent**: the real one swung up between the shell and its padding.
  Its pivots are plain discs. The second pane, the latch and the automatic closing gear are not
  modelled.
- **The helmet is a plain ball** on a collar ring. The earphones' bulges, any hose or cable on
  it and the communications lead are left out; the microphones are a guess at their shape.
- **Boots** are the shared laced boot in black with a tan sole edge; "with clips" was not seen
  first hand. The trouser legs are drawn in above the boots' tops and go inside them; in the
  photographs they blouse over the tops.
- **The body is a mannequin scaled to his height**, not his build. Folds are invented, as on the
  Mercury figure, and show a soft, unpressurised suit.
- **Moved, he is a jointed doll in one skin**, as the Mercury figure is: cloth stretches and
  shears at a joint instead of folding, and the helmet turns with `Head` though the real one was
  fixed to the suit.
- No parachute harness, no survival gear, no mass properties.

## Sources

Read for this model. Zvezda's own site, Encyclopedia Astronautica and Abramov and Skoog's
*Russian Spacesuits* (Springer-Praxis, 2003), the standard reference, could **not** be reached:
what is given as theirs is at second hand.

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
  `SK 1 space suit (MMA 2011)` (the Memorial Museum's, front and back).
