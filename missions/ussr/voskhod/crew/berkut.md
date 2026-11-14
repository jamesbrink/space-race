# The Berkut suit

What [berkut.py](berkut.py) builds, and how far to trust it. The Berkut ("golden eagle") was made
by Plant No. 918 at Tomilino (Zvezda) for Voskhod 2: the first suit a man went outside in. Both men
wore one. The figure is [figurelib](../../../../tools/blender/figurelib.py)'s man carried to each
man's stature, in a garment module of its own; it is not the Vostok's SK-1 dressed up. It is built
only seated, in a Voskhod couch (`build_seated`), visor down; the pack Leonov wore outside is built
by itself (`build_pack`), because it was put on in orbit.

**Confidence**: *documented* is a published figure or statement; *estimated* was read off
photographs, or chosen to look right.

## Sources, in short

Full entries in [docs/sources.md](../../../../docs/sources.md), "Voskhod".

- **A**: Abramov and Skoog, *Russian Spacesuits*, pp. 60 to 74, as search snippets joined end to
  end; **T**: Thomas's synopsis of the same (NASA, 2016).
- **K**: Kamanin's diary, 19 January 1965 (the two men's heights and masses).
- **L**: Leonov's and Belyayev's reports of March and April 1965.
- **P**: photographs of the two men at the pad on 18 March 1965 (RGANTD, published by Roscosmos).
- **M**: photographs of suits kept at the Memorial Museum of Cosmonautics, Moscow, at Zvezda, at
  Kaluga and at the National Air and Space Museum. Zvezda keeps both flown suits (A, p. 307); the
  others are not identified, and the Smithsonian's is described there as Leonov's training suit.

## What is documented

| Item | Value | Source |
| --- | --- | --- |
| Belyayev | 170 cm, 72 kg | K |
| Leonov | 172 cm, 78.2 kg | K |
| Suit mass | 20 kg | T; Siddiqi p. 450 |
| Pack | KP-55, 21.5 kg; three 2-litre bottles of oxygen at 22 MPa; 45 minutes | A p. 66; T. Siddiqi has 25 kg; Zak prints "KP-22" once |
| Pressure | 400 hPa, and 270 hPa at a second setting | A pp. 62 and 77; T; L |
| Layers | "a restraint layer made of high-strength nylon-type fabric, two pressure bladders (primary and back-up) made of sheet rubber and an inner nylon liner with an internal ventilation system" | A p. 68 |
| Cover | "special outer clothing made up of multilayer screen vacuum thermal insulation"; white | A p. 68; P; M |
| Helmet | "easy-disconnect non-turning helmet, which incorporated a metal casque and a movable visor", with a light filter inside worked by a handle | A p. 68. Leonov left the filter open "some 30 millimetres" |
| Umbilical | 7 m: a shock absorber, a steel rope, an emergency oxygen hose, cables | A pp. 68 and 69. The furthest he went was 5.35 m |
| On the forearms | a pressure gauge, a mirror | L: «по манометру скафандра», «через зеркало посмотрел» |
| Belyayev's suit | "of the same design", fed from the ship by a hose | A p. 69 |
| Still camera | an F-21 on Leonov's suit, its release torn off in the hatch | L. Not modelled: where it sat was not found |

## The figure

| Item | In the model | Confidence | Basis |
| --- | --- | --- | --- |
| Stature | 170 and 172 cm | documented | K |
| Build | Belyayev a little slighter, Leonov a little fuller than figurelib's man carried to their heights | estimated | from their masses |
| Bulk | the cover stands 9 to 16 mm further off the body than a close suit | estimated | P, M |
| Helmet | a white ball 312 mm across; a visor opening 156° wide round it in a pale frame, on a pivot at each temple; "СССР" in red on the brow, 36 mm tall | estimated (every size); documented by photograph (white, the wide visor, the lettering on both helmets that morning) | P; M. The lettering reads dark in the photographs of the day, which are black and white, and red on the suits kept |
| Neck | a dark metal ring with a latch in front, over a knitted collar | estimated | M; P |
| Cover | white, with a closure down the front and a band at the waist | estimated | P; M |
| Gloves | the cover's white, black leather palms, on metal wrist rings | estimated | M (white backs, black palms). P: pale. One colour photograph of training shows orange gloves |
| Boots | white, laced, to mid-calf | documented by photograph, for Belyayev | P: Belyayev at the pad. **What Leonov had on his feet at the pad was not made out**; Zvezda's cover for his suit ends in cloth bootees |
| Gauge and mirror | a round gauge on the back of the right forearm, a framed mirror on the left | estimated | P shows a ringed pocket on the right forearm and a framed window on the left, on both men |
| Hose | a fitting at the belly on his right and the first of a hose in a white braid | estimated | P: each man carried a ventilation box to the pad on such a hose |
| Pack | a white slab 330 × 500 × 140 mm with eased edges, a gauge's window near the top of its outer face, two long dimples, two straps | **estimated** | M, two views of the back of a suit, scaled by the shoulders. **No dimension of it was found in print** |
| Pose | lying in the couch: thighs raised 68°, knees at 88°, forearms laid up over the belly | estimated | the couch's ([voskhod.md](../vehicles/voskhod.md)) |

## What the model gets wrong or leaves out

- **The orange stripe is not built.** The cover has a stripe some 3 cm wide down the outside of
  each arm and leg, orange on the suits kept. Laid on the figure's limbs it lay under the cloth's
  own folds everywhere but at the joints, and it was taken out rather than left in pieces.
- **No pockets, no lacing**, none of the three round fittings on the chest of the suit under the
  cover, and no sleeve badge (Belyayev wore a black triangle with a rocket on his left sleeve).
- **The pack's harness is not on the figure**: two grey straps over the shoulders to a round buckle
  on the chest and one down to the crotch, and the small white box at the left collar-bone its
  hoses ran to. Neither man wore the pack in his couch.
- **The helmet is a ball**, with one pane: its light filter, its inner cap's detail and the lever
  of its valve are not drawn. The visor is drawn down on both.
- **The face is nobody's**: the shared head.
- **The gloves are figurelib's hand**, and the boots its laced boot in white.
- **The hose ends in the air**, a hand's breadth from the fitting.
- **Leonov's suit and Belyayev's are one suit in two sizes.** What differed between them for the
  walk (the fittings for the pack and the line, the camera) is not built.
