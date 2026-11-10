# Mercury pressure suit (Navy Mark IV)

The suit the Mercury pilots wore: B.F. Goodrich's U.S. Navy Mark IV full-pressure suit, reworked
for the capsule. Model: [mark_iv_suit.py](mark_iv_suit.py), imported by each flight's
`model/crew.py`. It is built as Alan Shepard wore it on the walk to the pad for MR-3, 5 May 1961,
with the portable ventilator standing beside him.

**It is a backup, not a spacesuit in the later sense.** The cabin held pressure; the suit would
only have inflated, to 4.6 psi, if the cabin had failed. On MR-3 it never did.

**Every length here is an estimate.** The pilot's height is the commonly given one. The
body under the suit follows textbook segment proportions for that height. The suit's bulk, the
helmet, every fitting and the ventilator are sized by eye from photographs. No drawing of the
suit was found.

## Dimensions and facts

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Pilot's stature | 5 ft 11 in (1.803 m) | estimated | widely given for Shepard, and the selection limit; no primary record read |
| Suit mass | about 20 lb (9 kg) | estimated | NASA's MA-8 fact sheet says "20-pound"; Wikipedia says 22 lb |
| Operating pressure | 4.6 psi (31.7 kPa) | documented | SEDR 104 (suit regulator, 4.6 ± 0.2 psia); *Results of the First U.S. Manned Suborbital Space Flight*. The MR-3 Postlaunch Report (5.3.1) says 5.5 psi; 3.7 psi is the generic Navy Mark IV figure |
| Outer shell | aluminium-coated nylon | documented | Wikipedia; NASA fact sheet ("aluminum-coated nylon-rubber") |
| Oxygen in at the waist, out at the helmet | | documented | NASA fact sheet; Wikipedia gives the helmet's right side |
| Visor seal connector by the left jaw | | documented | Wikipedia |
| Entry zipper diagonally across the chest | | documented | NASA fact sheet |
| Which way the zipper runs (left collar to right waist) | | estimated | memory of photographs; could be mirrored |
| Gloves zipped to the sleeves, no wrist ring (MR-3) | | documented | Wikipedia; rings came with MR-4 |
| Straight middle finger, other fingers curved | | documented | Wikipedia. NASA's sheet says the *left* middle finger only; the model straightens both |
| Biomedical connector flap, right thigh | | documented | Wikipedia. NASA's sheet puts the receptacle "near astronaut's knee" |
| Helmet tie-down strap at the front of the suit | | documented | NASA fact sheet, donning procedure |
| Standing height, helmet and boots | 1.891 m | derived | stature + 2.8 cm heel + 6.0 cm from crown to shell top, both estimated |
| Boot heel | 2.8 cm | estimated | |
| Helmet over the crown | 6.0 cm | estimated | liner, shell and clearance |
| Knee, crotch, hip, shoulder heights | 0.285, 0.47, 0.530, 0.818 of stature, plus the heel | derived | Drillis and Contini's segment proportions, quoted from memory; crotch ratio is a guess |
| Arm and leg lengths, joint positions | | derived | same proportions |
| Suit girths (chest 39 x 28 cm, thigh 19 cm, upper arm 13 cm across) | | estimated | a 1.80 m man plus about 2 cm of suit |
| Shoulder breadth | 0.51 m | estimated | |
| Stance | ankles 27 cm apart | estimated | pose |
| Helmet shell | 26 cm wide, 30 cm deep, 32 cm from neck ring to top | estimated | photographs |
| Neck ring | 25 cm across | estimated | photographs |
| Visor opening | 17.6 cm high, about 26 cm round the shell | estimated | photographs |
| Boots | 27 cm tall, sole 31.2 cm | estimated | |
| Boot colour (aluminised) | | estimated | Wikipedia: Mercury boots were white coated leather first, aluminised later; which MR-3 used was not confirmed |
| Glove | hand 20 cm from wrist to middle fingertip | estimated | |
| Pressure gauge on the left forearm | 4.8 cm across | estimated | position and size from photographs |
| Portable ventilator case | 42 x 16 x 30 cm | estimated | "briefcase-like"; every detail of it is invented to look plausible |
| Ventilator hose | 3 cm across, about 1 m | estimated | |

## Nodes

| Node | What it is |
| --- | --- |
| `Helmet` | white fibreglass shell with earphone bulges, visor and frame, visor pivots, aluminium neck ring, suit outlet low on the right, seal connector by the left jaw |
| `Torso` | shell, entry zipper, helmet tie-down strap, waist strap, two crotch straps, buckles, the waist inlet fitting |
| `Arms` | sleeves, lacing strips on upper arm and forearm, the pressure gauge and its strap on the left forearm |
| `Gloves` | cuff, palm, four fingers and thumb each hand; wrist zipper; restraint strap |
| `Legs` | trousers, lacing strips on thigh and calf, biomedical flap on the right thigh |
| `Boots` | uppers, tongues, soles and heels, laces on hooks |
| `Ventilator` | case, handle, latches, louvres, hose to the waist inlet |

The suit fabric is `suit-aluminized-nylon`; the viewer adds its weave to any material named `suit*`.

## What the model gets wrong or leaves out

- **No face.** The visor is dark glass. The real one was clear.
- **The body is a mannequin**: elliptical tubes with a little muscle shape, not Shepard's build.
- **Hands are simple.** The back of the hand is a squared slab, the fingers and thumb are bent
  tubes. The palms are suit fabric; the real gloves' palm material was not checked.
- **Folds are procedural**: sine creases at the joints, sized to look right, not copied from a photograph.
- **Strap layout is a guess.** NASA's procedure names underarm, shoulder-to-shoulder and
  shoulder-to-side straps, neck zippers, a waist zipper and ankle zippers; none of those is
  modelled. The waist strap and the two crotch straps are there because photographs show
  webbing in that area, not because their routing was traced.
- **Lacing strips** sit on the outside of each limb. Their real number and placement were not checked.
- **The wrist zipper reads as a ring** at a distance. There is no ring on this suit.
- **The helmet is a smooth egg.** No visor latch, no microphone, no communications lead, no
  liner. The visor frame is drawn as aluminium; its real finish was not checked.
- No hose on the helmet outlet, and no seal bottle or its hose on the left-jaw connector.
- No chest mirror (that came after MR-3), no name tag or insignia, no wrist mirrors.
- **Boots**: plain laced boots. The Smithsonian's "with clips" was not seen first hand and is
  only hinted at by the lacing hooks.
- **The ventilator is a silver suitcase with a hose.** He carried it; here it stands on the floor.
- No mass properties.

## Sources

- [Navy Mark IV](https://en.wikipedia.org/wiki/Navy_Mark_IV), Wikipedia: mass, pressure,
  materials, the Mercury changes, the MR-3 and MR-4 differences.
- [Pressure Suits for Project Mercury Astronauts](https://www.nasa.gov/wp-content/uploads/static/history/40thmerc7/pressuresuits.pdf),
  NASA MSC fact sheet for MA-8 (1962): construction and the donning procedure. It describes the
  suit a year and a half after MR-3; details may differ.
- [Smithsonian inspects first US astronaut's capsule, suit 60 years on](https://www.collectspace.com/news/news-050521a-shepard-freedom-7-spacesuit-60th-smithsonian.html),
  collectSPACE: the suit's condition and the rubber neck dam under the ring.
- That Shepard carried a "portable air-conditioning unit" to the gantry is from *Time*'s 1961
  account and AmericaSpace's "briefcase-like" description, **seen only as search-result
  excerpts, not read in full**.
- The Smithsonian's records for the flown suit, helmet and gloves
  ([A19770563000](https://www.airandspace.si.edu/es/collection-objects/pressure-suit-mercury-shepard-mr-3-flown/nasm_A19770563000))
  could not be opened from the build machine. **Not yet checked against this model.**
- Drillis and Contini's body segment proportions (1966), as reproduced in Winter's
  *Biomechanics and Motor Control of Human Movement*: quoted from memory, not checked.
