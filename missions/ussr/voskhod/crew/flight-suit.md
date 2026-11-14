# What Voskhod 1's crew flew in

What [flight_suit.py](flight_suit.py) builds, and how far to trust it. Voskhod 1's three men flew
without pressure suits. The figure is [figurelib](../../../../tools/blender/figurelib.py)'s man,
carried to each man's stature, in a garment module of its own: a wool suit, soft shoes and the
headset's cloth cap. It is built only seated, in a Voskhod couch (`build_seated`), as the cabin's
crew; there is no standing figure to walk as yet.

**Confidence**: *documented* is a published statement; *estimated* was read off photographs, or
chosen to look right.

## What the record says

| Statement | Source |
| --- | --- |
| «В 10:15 подъехал автобус с космонавтами, одетыми в легкие шерстяные костюмы серого цвета, на головах у них были белые шлемофоны.» (the bus came up with the cosmonauts, dressed in light wool suits of a grey colour, white headset caps on their heads) | Kamanin's diary, 12 October 1964 |
| «Трое не в скафандрах, а в легких темного цвета шерстяных костюмах. Поверх — голубые куртки. На голове белые шлемофоны.» (not in pressure suits but in light wool suits of a dark colour; over them, light blue jackets; white headset caps) | TASS's correspondent at the pad (Romanov), *Заря Востока*, 14 October 1964 |
| "The crew were dressed in lightweight, gray woolen trousers and shirts and light blue jackets. Each had a headset with attached earphones and microphones. ... At the top, the crew removed their jackets and boots, donned slippers, and entered the spacecraft" | Siddiqi, *Challenge to Apollo*, p. 423, from Kamanin |
| "In front of the hatchway we took off our jackets and changed the boots for suede slippers." | the crew's own account in English, as carried by Orbital Focus; its Russian original was not found |

Grey or "dark" is the only disagreement. So in the cabin: the wool suit, no jacket, slippers, the cap.

## The figure

| Item | In the model | Confidence | Basis |
| --- | --- | --- | --- |
| Stature | 1.70 m, all three | **estimated** | **no document with the height of any of the three was found.** In the standing portrait taken after the flight their eyes are level to about half a centimetre; in a group photograph of 1 July 1965 Feoktistov's eyes are level with those of Belyayev beside him, who was 170 cm (Kamanin's table of 19 January 1965). Good to some 3 cm. Passengers were to be "from 160 to 175 centimetres" and no more than 90 to 91 cm sitting (Kamanin, 3 April and 20 June 1964) |
| Build | one for all three, a little slighter than figurelib's man | estimated | by eye Komarov was square-shouldered, Feoktistov lean and Yegorov slim; no figure was found, and no difference is built |
| Suit | a pullover with a turned-down collar open in a V, without buttons, and trousers, of one grey wool | estimated | the flight costume kept at the Tsiolkovsky museum, Kaluga (described there as the PK-1, part of the emergency kit, 1962): a charcoal-grey wool pullover with an open collar on a V neck and two welt pockets, and pleated, tapering trousers. **The museum does not say it was this crew's.** A colour photograph taken in a Voskhod cabin (not dated to the flight) shows grey wool tops of that cut |
| Colour | a dark grey, a little blue | estimated | the same |
| Cap | white cloth, close over the head and ears, an opening round the face; an earphone in a round cup at each ear; a chin strap; a microphone at each corner of the mouth on a short boom, orange-brown | documented (white caps, earphones, microphones); estimated (their form) | the photographs in the cabin, all taken from the men's left: a flat white arm from the left earpiece to a disc microphone. **The right side was not seen**, and the second microphone is the Vostok headset's, assumed |
| Hands | bare | documented, by photograph | the cabin photographs |
| Shoes | dark, low, with a pale sole | **estimated** | "slippers", "suede slippers"; no photograph of them was found |
| Pose | lying in the couch: thighs raised 68°, knees at 88°, forearms laid up over the belly, **elbows drawn 30 mm in toward the sides** from where figurelib's standing man holds them (`ELBOWS_IN`) | estimated | the couch's ([voskhod.md](../vehicles/voskhod.md)); the elbows by the fit of three abreast ("The fit" there) |

## What the model gets wrong or leaves out

- **The three figures are one man three times.** Neither their heights nor their builds were found,
  and nothing is built to tell them apart but the couch each lies in.
- **The face is nobody's**: the shared head, as on every figure here.
- **The suit is a museum garment of the right kind**, not one known to be theirs, and it is drawn
  plain: no pockets (they lie under the men's arms and in their laps), no pleats, one flat colour
  under the viewer's weave. Where the pullover hangs over the trousers is drawn as a band at the
  waist.
- **No harness.** The cabin photographs show grey-green and orange straps across the chest.
- **No undergarment with its sensors**, no wristwatch (one shows in the cabin photographs), and
  nothing of the cap's mesh crown or its dark band.
- **The shoes are figurelib's boot cut low**, without laces, under the trouser legs.
- **The hands are figurelib's gloved hand in skin**: four fingers and a thumb, no nails or knuckle
  creases.
- **The blue quilted jackets and the boots** they wore to the lift are not built: they were left at
  the hatch.
