# The people on the ground

Clothed standing figures for a launch site's scenery: the State Commission, officers, the launch crew, doctors, a
cameraman. Model: [ground_party.py](ground_party.py). Who stood where on a given morning is the site's to say
([../../places/tyuratam/site1/morning.py](../../places/tyuratam/site1/morning.py) for 12 April 1961,
[august.py](../../places/tyuratam/site1/august.py) for 6 August 1961).

**These are not crew figures.** A crew figure ([sk_1.py](sk_1.py)) is one man at some 110,000 triangles, skinned to
fifteen joints so that the viewer can walk him. A pad on a launch morning has fifty people standing on it. So these
are a second kind of figure on the same body, built to be many: about 2,700 triangles a man at full detail and 1,450
at the far levels, posed once, standing; those of a group the viewer walks off are jointed too ("People who walk",
below), on a skeleton of the group's. Before these the repo had no standing people at all (the
Cape's pads have none: `lc-5.md`, "There are no people"), so this is the standard, such as it is.

## What a figure is

| Part | How it is made | Confidence |
| --- | --- | --- |
| The body | `figurelib.man()` scaled to a stature and a build: the same landmarks, joints and girths the crew figures stand on (Drillis and Contini's proportions) | derived (the proportions); estimated (each man's stature and build: none is recorded) |
| The head | a skull rounded over the crown; on it `figurelib.head_point`, the crew figures' face (brow, sockets, nose, cheekbones, mouth, chin), read on rows set at its features (chin, mouth, under the nose, the nose's tip, the eyes, the brow: 12 rows by 16 columns, 9 by 13 at the far level) so that the nose and brow are drawn and not lost between rows; an ear each side; a dark bead in each socket and a dark brow over it (not at the far level) | estimated: a textbook adult's, not a portrait. Nobody here is a likeness |
| Trunk and skirt | one skin over the body's own sections from the waist up, let out by the garment's bulk, and below the waist a skirt to the hem | estimated |
| Arms | a sleeve through the shoulder, the elbow and the wrist, in one of ten stances (`ARMS`); a hand as a mitt with a thumb, a little curled; a hand in a pocket is not drawn | estimated |
| Legs | trousers from under the coat to the shoe, or to a high boot's top | estimated |
| On the head | a peaked cap (band, crown tipped up at the front, peak, badge), a felt hat, a flat cap, a beret, or hair: a cap over the scalp, fuller over the crown and the front, its edge (`HAIRLINE`) high over the brow and the temples, a short sideburn, round the ear and down to the nape; under a hat, close cropped up inside its band | forms estimated (a short back and sides, combed back, as the film's men have it) |

A figure faces -Y in centimetres, as figurelib's do, and is set down on a site in metres (`stand`). A group that stands
and leaves together is a `Party`: one mesh a material, so eight men are a dozen draws. Cloth is named `suit-…` so that
the viewer gives it a cloth's grain.

## What they wear

All of it for 12 April 1961, a mild morning: "a fresh morning wind", and nobody in the film wears a greatcoat.

| Dress | What it is | Confidence | Source |
| --- | --- | --- | --- |
| `marshal()` | an open-collared olive tunic over a shirt and tie, gold shoulder boards, a cap with a red band, red stripes down navy trousers | documented (the tunic, the boards, the cap); estimated (the trousers, which the photograph does not show) | a colour photograph of Marshal Moskalenko with Gagarin and Korolev at the pad (Wikimedia Commons, "Gagarin pered poletom") |
| `general()` | a closed olive tunic, gold boards, a red-banded cap, red-striped trousers | documented | the film «Первый рейс к звёздам» (ЦСДФ 1961), 43:42: a general with red-striped trousers walks at the pilot's side. An air force general's band and stripes were blue: the film's are red, and the film is followed |
| `officer(band)` | a closed tunic, a peaked cap, navy trousers, no greatcoat; the band black (artillery and rocket troops) or blue (aviation) | documented (tunics, caps, no greatcoats); estimated (which arm of service each man was) | the film, 43:33 and 43:42 |
| `overcoat()` | a dark overcoat to the calf, a felt hat | documented for Korolev: "a dark overcoat", "a black velour hat" | Golovanov, *Korolev: fakty i mify*, p. 645; the colour photograph |
| `worker()` | a navy hooded anorak pulled over the head, the hood down, a red armband on the left arm, navy trousers; bare-headed, or in a beret or a flat cap | documented (the anorak, the armband); estimated (the headgear) | the film, 43:33 (two men at the bus) and 44:05 (two at the lift's landing) |
| `medic()` | a white coat to the knee, bare-headed | documented | the film; a colour photograph of the party walking to the stair (RussianSpaceWeb) |
| `jacket()` | a suit jacket, a flat cap, sometimes a red armband | documented for one man in grey with a flat cap and a red armband | the same photograph |
| `raincoat()` | a pale raincoat | documented that one pale coat stands among the dark ones | the film, 43:26, from above |
| A cameraman | an anorak, a hand-held cine camera at the eye | documented (that one walked backward before the party with a camera); estimated (the camera: a Konvas of the kind the newsreel men carried, as a box, a lens and a magazine) | the film, 43:42 |

Colours are read off the colour film and the two colour photographs and cleaned, as the look asks: estimated.

### Summer: 6 August 1961

The film of Vostok 2's morning («Снова к звёздам», Моснаучфильм 1961, 21:04 to 22:24) has nobody in a coat.

| Dress | What it is | Confidence | Source |
| --- | --- | --- | --- |
| `summer_shirt()` | a short-sleeved shirt, open at the neck, tucked into dark trousers at a belt, the forearms bare; white, cream or pale blue (`shirt-white`, `-cream`, `-blue`); bare-headed | documented (white and pale shirtsleeves, dark trousers, for nearly all the civilians); estimated (the pale tones, the belt, bare heads) | the film, 21:45 to 22:20 |
| `summer_shirt("shirt-check")` | the same in a checked shirt, drawn as the check's mid tone: the check is not drawn | documented (one checked shirt) | the film, 21:11 |
| `summer_officer()` | the khaki summer shirt, short-sleeved, a dark tie, a peaked cap with the aviation's blue band, navy trousers; `glasses=True` for the one in dark glasses | documented (khaki summer shirts, ties, air force caps, one in dark glasses); estimated (the trousers' colour, the band's blue); shoulder boards on the shirt not made out, and not drawn | the film, 21:47 to 21:56 |
| `summer_tunic()` | April's closed tunic and peaked cap: one of the few officers in a tunic with shoulder boards | documented | the film, 21:53 |
| `white_jacket()` | a white summer jacket over an open shirt, dark trousers; a pale straw hat and an armband for Smirnov, its colour not known (drawn in the print's pale grey); `coat="shirt-cream"` the pale one Korolev wore on 5 August | documented (Smirnov's, a photograph; Korolev's on the 5th, a photograph); the armband's tone estimated | RussianSpaceWeb, `smirnov_2.jpg`, `korolev_pad_meeting_2.jpg` |
| `suited()` | the SK-1 drawn as these figures are drawn: the orange cover in one piece, black boots, tan gloves, the white helmet open before the face with its visor raised (its lettering not drawn) | documented (that Nikolayev got down suited: Titov, 1973); the colours crew/sk_1.py's; the helmet's form estimated | Titov (1973); sk-1.md |

A short sleeve ends a little above the elbow; the bare arm runs from inside it to the wrist, which ends inside the hand.
A shirt tucked in is the trousers' own seat up to a belt at the waist, wide enough at the hips to hold the legs' tops,
and the shirt from over the belt to the shoulders.

## People who walk

A figure built by `Walkers` instead of `Party` is jointed: the crew's fifteen joints (srlib.FIGURE) and the two halves at
the hips, each named with the man's number after it (`Hips_3`, `UpperArm.L_3`), on one skeleton for the group
(`<group>_People`), each man under a node of his own (`<group>_Person_<n>`, its origin on the ground between his feet,
turned only to the way he faces). The legs and the trunk are weighted as a crew figure's cloth is
(`figurelib.lower_weights`); an arm by which bone's line each point is nearer, eased over a few centimetres across the
elbow; a hand, a foot and the head each to its own joint, the neck between the trunk and the head. A man to be walked is
built standing square (his feet together, no lean); his arms are as built and swing from there. The group is still a
mesh a colour, so forty men are some fifteen draws. The build prints, for each group, its people, how many are jointed,
its triangles and where its middle is, and what the people add to the GPU at that level.

## What they cost

| | Full detail | Far levels |
| --- | --- | --- |
| A figure | about 2,700 triangles | about 1,450 |
| Vostok 1's pad, 52 people in seven groups | 138,000 triangles, 60 meshes | 75,000 |

## What is wrong or left out

- **April's do not move.** A figure built by `Party` is posed once: a group of 12 April is on the pad until the time
  the record has it leave, and then is not. August's (`Walkers`) walk off on the clock, but nobody gets into the bus or
  climbs a stair, and a man walking is the gait's on flat ground (site-1.md, "What the model gets wrong or leaves out").
- Nobody is a likeness. The faces are one textbook face, read on a dozen rows; everyone's hair is one cut in one of three
  tones; statures and builds are guesses. (Until November 2026 the face was read on evenly spaced rows that missed the
  nose, the top of the skull was flat with no hair over it, and the hair was a bowl with a straight fringe.)
- Hands are mitts with a thumb; fingers are not modelled. A hand in a pocket is left out.
- No medals, ribbons, buttons on cuffs, belts, collar tabs, cap cockades beyond a bead, or insignia of rank on the
  shoulder boards: a marshal's and a lieutenant's boards are the same plain gold.
- Coats do not hang: a skirt is a cone to the hem, and a sleeve bends in one or two rings at the elbow.
- Only men's dress is drawn. The photographs show at least one woman among the doctors.
- A checked shirt is its mid tone; the dark glasses have no arms; a shirt's pockets, buttons and creases are not drawn.
- The cameraman's camera is a box, a lens and a magazine.
