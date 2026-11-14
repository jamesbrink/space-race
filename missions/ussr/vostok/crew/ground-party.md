# The people on the ground

Clothed standing figures for a launch site's scenery: the State Commission, officers, the launch crew, doctors, a
cameraman. Model: [ground_party.py](ground_party.py). Who stood where on a given morning is the site's to say
([../sites/site1/morning.py](../sites/site1/morning.py) for 12 April 1961).

**These are not crew figures.** A crew figure ([sk_1.py](sk_1.py)) is one man at some 110,000 triangles, skinned to
fifteen joints so that the viewer can walk him. A pad on a launch morning has fifty people standing on it. So these
are a second kind of figure on the same body, built to be many: about 2,700 triangles a man at full detail and 1,450
at the far levels, posed once, standing, and not walked. Before these the repo had no standing people at all (the
Cape's pads have none: `lc-5.md`, "There are no people"), so this is the standard, such as it is.

## What a figure is

| Part | How it is made | Confidence |
| --- | --- | --- |
| The body | `figurelib.man()` scaled to a stature and a build: the same landmarks, joints and girths the crew figures stand on (Drillis and Contini's proportions) | derived (the proportions); estimated (each man's stature and build: none is recorded) |
| The face | `figurelib.head_point`: the crew figures' face (brow, sockets, nose, cheekbones, mouth, chin), read at 11 by 11 points; a dark bead in each socket | estimated: a textbook adult's, not a portrait. Nobody here is a likeness |
| Trunk and skirt | one skin over the body's own sections from the waist up, let out by the garment's bulk, and below the waist a skirt to the hem | estimated |
| Arms | a sleeve through the shoulder, the elbow and the wrist, in one of ten stances (`ARMS`); a hand as a mitt with a thumb, a little curled; a hand in a pocket is not drawn | estimated |
| Legs | trousers from under the coat to the shoe, or to a high boot's top | estimated |
| On the head | a peaked cap (band, crown tipped up at the front, peak, badge), a felt hat, a flat cap, a beret, or hair | forms estimated |

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

## What they cost

| | Full detail | Far levels |
| --- | --- | --- |
| A figure | about 2,700 triangles | about 1,450 |
| Vostok 1's pad, 52 people in seven groups | 138,000 triangles, 60 meshes | 75,000 |

## What is wrong or left out

- **They do not move.** A figure is posed once. A group is on the pad until the time the record has it leave, and
  then is not: nobody walks off, gets into the bus or climbs a stair. The viewer's gait (`viewer/gait.ts`) is for the
  figure being walked as, and playing it on scenery needs work in the viewer that has not been done.
- Nobody is a likeness. The faces are one textbook face at a coarse sampling; statures and builds are guesses.
- Hands are mitts with a thumb; fingers are not modelled. A hand in a pocket is left out.
- No medals, ribbons, buttons on cuffs, belts, collar tabs, cap cockades beyond a bead, or insignia of rank on the
  shoulder boards: a marshal's and a lieutenant's boards are the same plain gold.
- Coats do not hang: a skirt is a cone to the hem, and a sleeve bends in one or two rings at the elbow.
- Only men's dress is drawn. The photographs show at least one woman among the doctors.
- The cameraman's camera is a box, a lens and a magazine.
