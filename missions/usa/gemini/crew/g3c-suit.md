# The G3C suit

What [g3c_suit.py](g3c_suit.py) builds, and how far to trust it. The G3C was made by the David
Clark Company for the first crewed Gemini flight; Virgil Grissom and John Young wore one each on
Gemini-Titan 3 (23 March 1965), and both suits are kept by the Smithsonian. The figure is
[figurelib](../../../../tools/blender/figurelib.py)'s man carried to each man's stature, in a
garment module of its own: it is not the Mercury suit recoloured. It is parametrised by wearer
(`Wearer`, `wear`), so a later flight names its own man; the G4C that followed is a different
cover layer on the same suit and would be a module beside this one.

**The two men are modelled and are not yet in their seats.** The crew station is fitted round
them ([gemini-spacecraft.md](../vehicles/gemini-spacecraft.md), "Crew station"); how they sit in it
is under "Seated" below.

**Confidence**: *documented* is a published figure or statement; *derived* is computed from
documented ones; *estimated* was read off photographs, or chosen to look right.

## Sources, in short

Full entries in [docs/sources.md](../../../../docs/sources.md), "Gemini".

- **N**: the National Air and Space Museum's records and photographs of the two flown suits:
  A19680456000 (Grissom's; front, NASM2021-04069) and A19730226000 (Young's; front
  NASM2021-04126, back NASM2021-04127).
- **P**: NASA's photographs. Suiting up on the day: S65-23486 (Grissom), S65-23488 (Young).
  Young in the suit, helmet on, visor up: S65-23485. In spacecraft 3: S65-22665 (Grissom,
  8 March 1965), S65-20605, S65-24719, S65-24721 (through the windows). The walk out:
  S65-20994, KSC-65-4922.
- **S**: SEDR 300 (the Gemini familiarization manual), pp. 3-12 to 3-19: the seat's restraint
  and the personal harness.
- **K**: the Gemini 3 press kit (release 65-81), pp. 33 and 41.

## What is documented

| Item | Value | Source |
| --- | --- | --- |
| The suit | G3C, David Clark; torso, helmet, boots, gloves; outside high-temperature nylon, inside neoprene-coated nylon; connectors anodised aluminium; visor polycarbonate | N |
| Overall, laid flat | about 57 by 27 by 10 in | N |
| Press kit's account | close-fitting; helmet and gloves removable; the gas inlet and outlet at waist level | K |
| Personal harness | "nylon webbing formed into a double figure 8", the two joined by a waist strap and a chest strap, of which only the chest strap adjusts; "a quick disconnect is placed forward and below each shoulder" for the parachute's risers and the inertia reel's straps | S, p. 3-16 |
| Seat's restraint | arm loops, leg straps, stirrups, an elbow restraint (command pilot only), a lap belt with a release near the middle of the lap, a shoulder harness of two straps from an inertia reel behind the backboard | S, pp. 3-12 to 3-14 |
| Who sat where | command pilot left, pilot right | SEDR 300, p. 1-5 |

## The men

| | In the model | Confidence | Basis |
| --- | --- | --- | --- |
| Grissom's stature | 170.2 cm (5 ft 7 in) | **estimated** | as commonly given. No primary record of it was found. Looked for and not there: the press kit's crew pages (release 65-81: neither man's height or weight); NASA's biographical data sheet for him (Johnson Space Center's, opened: none); the NASA History Office's "Mercury Seven Astronaut Biographies", which gives Shepard's, Glenn's and Schirra's heights and weights and not his; the Gemini Midprogram Conference (SP-121) and Summary Conference (SP-138), whose medical papers give no man's stature (SP-138's Table 16-VIII has only weight lost: on Gemini III, 3 lb the command pilot and 3.5 lb the pilot). [The Mercury suit](../../mercury/crew/mark-iv-suit.md) uses the same figure for him |
| Young's stature | 175.3 cm (5 ft 9 in) | **estimated** | "5 feet 9 inches; 165 pounds" is how a search of NASA's biographical data sheet for him returned it. The sheet itself could not be opened (two addresses for it on nasa.gov answered "not found"), so it is not counted as read; the conference papers and the press kit have nothing, as above |
| Build | Grissom a little narrower than figurelib's man at his height, Young a little slighter | estimated | P |
| Faces | the shared head, bare, hair cut short | estimated | nobody's likeness, as on the other flights' figures |

Grissom's thighs and calves were measured for Mercury-Redstone 4 in 1961 (the Mark IV module
uses them). They are not used here, four years on.

## The suit

Every size and place below is read off N and P against the men (a neck ring taken as 24 cm
across) and is **estimated** unless it says otherwise.

| Part | In the model | Confidence | Basis |
| --- | --- | --- | --- |
| Colour | white with a satin sheen | estimated | P: S65-23486 and S65-23488 are white; S65-23485 is silvery under its lights. The suits as kept have yellowed (N) |
| Bulk | 3 to 5 mm over figurelib's close suit | estimated | P |
| Helmet shell | white; 27.6 cm across at its widest, 27.6 cm from the neck ring to its top, 6% deeper fore and aft | estimated | S65-23485, against the face |
| Visor | a clear pane standing 13 mm off the shell, on a pivot at each temple, down; a bright band along its upper edge; a grey seal round the opening | documented by photograph; sizes estimated | S65-23485 (up), S65-23486 and S65-22665 (down) |
| Neck ring | anodised blue, the helmet's half over the suit's, a bright line between, a latch in front; 24.4 cm across inside | documented by photograph (blue); estimated | S65-23485; N |
| In the helmet | an earphone's pad at each ear, a microphone on a boom either side of the mouth | estimated | S65-23486, S65-24719 |
| Tie-down | a steel cable from each side of the neck ring to a bright buckle on the chest, and a blue strap 2.6 cm wide from it down the front | documented by photograph; estimated | N; S65-23485 |
| Name tag | black, lettered white ("V.I. GRISSOM", "J.W. YOUNG"), 9.6 by 2.2 cm, on his right chest | documented by photograph; estimated | N; S65-23486 |
| NASA insignia | the 1959 insignia, 7.6 cm, on his left chest | documented by photograph; estimated | N; S65-23485. The drawing is the Mark IV module's |
| Electrical connector | an oval plate on a blue patch, a round brown insert in it, under the insignia | documented by photograph; estimated | N |
| Gas connectors | two at the waist, each on a round blue patch: anodised red at his right, bare aluminium at his left | documented by photograph; estimated | N; K (waist level) |
| Forearm gauge | a round gauge on a blue patch on the left forearm | documented by photograph; estimated | N; S65-23486 |
| Pressure zip | up the middle of the back to the neck, blue tape either side of brass teeth; a blue strap either side of it from the shoulder to the waist | documented by photograph; estimated | N (back) |
| Pockets | one on each upper arm; one, zipped, with a flap, on each shin | documented by photograph; estimated | N |
| Wrist rings | his right anodised red, his left bare, each with a blue band toward the sleeve | documented by photograph; estimated | N (both suits); S65-23488 |
| Gloves | white all over | estimated | S65-22665. figurelib's hand |
| Boots | white, laced, to the lower calf, a dark red strap round the ankle and one over the instep, a tan sole | documented by photograph; estimated | N. figurelib's laced boot |
| Personal harness | grey webbing 1 3/4 in wide: from each hip up the chest, over the shoulder and down the back; a strap across the chest under the collar, one across the front under the ribs and one across the small of the back; a bright quick disconnect with two dark rollers on each, level with the shoulder joint | documented (S) in what it is; its run estimated from S65-23486 and S65-23488 | the webbing's width is the usual one, not measured |

### Looked for and not built

- **No flag.** The Smithsonian's record lists silk among the materials "(flag)", but neither
  flown suit has one in its photographs, nor has either man in any photograph of the day: each
  upper arm carries a pocket where later crews wore it. None is built.
- **No life vest.** The Smithsonian lists one with the suit. None is to be seen on either man
  in the seat (S65-22665, S65-20605, S65-24719, S65-24721) or suiting up. None is built.

## Seated

`build_seated` carries the figure to a seat by its joints (figurelib's seated pose, with each
arm turned at the shoulder as well as the elbow) and returns where the seat's own restraint has
to run over him: the reel's two straps over the shoulders to the harness's quick disconnects,
the lap belt over the pelvis. [gemini_cabin.py](../vehicles/gemini_cabin.py) lays them, and puts
each seat's node at the man's own eyes, when a flight's script says the men are aboard
(`Fit.crew`; Gemini-Titan 3's `CREW_ABOARD`, which does not say so yet).

**The posture is the launch's**, which is an ejection's: "during seat ejection, the pilot's feet
must be in place" in the stirrups, where each "shoe heel will lock in place" on a short platform
(SEDR 300, pp. 3-12, 3-13), and from the pad to 15,000 ft the seats were the way out. So each man
sits with his heels on the stirrups' platforms and his knees raised: the seat's pan is only some
13 in above the stirrups' platforms and a thigh is longer than that.

| | Grissom | Young | |
| --- | --- | --- | --- |
| Thigh, raised from the plane of his back | 113° | 116° | **estimated**: solved so that his heels come 0.2 in over the platforms; Young's leg is longer and goes to the same stirrups |
| Knee, bent | 120° | 125° | the same |
| Ankle, toes drawn up | 26° | 30° | **estimated**: so that the soles lie along the vessel's floor, which rises with the cone under the toes |
| Knees drawn in | 2° | 2° | **estimated** |
| Left hand | on the abort handle, elbow at his side | on his left thigh | S65-23489 has Grissom's hand on the handle, below his elbow (a simulator, in a silver suit); Young's hands were not found in a photograph: **estimated** |
| Right hand | on his right thigh, toward his lap | on his right thigh | S65-22665 has Grissom's right hand in his lap |
| Visor | down | down | S65-22665, S65-20605, S65-24719, S65-24721 |

The crew station is fitted round the two men so seated, and what room each has is in
[gemini-spacecraft.md](../vehicles/gemini-spacecraft.md), "Crew station": 0.9 in between
Grissom's helmet and the hatch, 0.6 in for Young. Two things about the figure bear on that fit
and are its own. Its seat does not flatten as a sitting man's does, so its sitting height is 0.85
in more than a man's of its stature, and the cabin sets it that far into the seat's cushion. And
its head is upright against the headrest, where every photograph of the day has the man looking
down.

## What the model gets wrong or leaves out

- **The visor is one clear pane**, as the photographs have it, with the face, the earphones'
  pads and the microphones behind it; the viewer draws it with the sky on it, as it does every
  visor.
- **The lap belt is not seen across the lap.** With the thighs raised as the stirrups have them
  the belt lies in the fold of the hips; the cabin builds it from the bucket's sides to that
  fold and no further, and its buckle not at all.
- **The gas hoses are not built.** In the seat each connector carried a hose in a white
  corrugated cover (S65-22665). Where they ran in the cabin was not found.
- **The harness's loops round the thighs are left off** (he is sitting on them), and so is the
  small ring under the left quick disconnect for the survival kit's lanyard. Its run over the
  back is a guess: no photograph of the day shows a man's back.
- **The pressure zip stops at the waist.** On the suit it runs on down to the crotch and up the
  front (the relief zip, in its blue surround). The trousers carry neither.
- **The blue neck dam** inside the ring is not built: the helmet is on.
- **The helmet is a simple form**: no vent or feed port, no visor latch but the block in front,
  one pane.
- **The gloves have no lacing or palm**, the boots no zip down the front, and the suit no thigh
  pockets (each man had them; they differ between the two suits).
- **The watches** each man wore over his left cuff are not built.
- **Cloth**: a few modelled creases at the elbows, the knees and the sides. The real suit
  wrinkles everywhere.
- **The standing figure has no skeleton.** `build_figure` builds it standing (that is how it
  was set beside the Smithsonian's photographs); nothing yet hangs it on joints for the viewer
  to walk, as the Mercury and Vostok figures are.
