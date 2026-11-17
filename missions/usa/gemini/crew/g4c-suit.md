# The G4C suit

What [g4c_suit.py](g4c_suit.py) builds, and how far to trust it. The G4C was David Clark's suit for
the Gemini flights after the first; it "is similar to that of the G3C suit used on the previous
flight" (the Gemini IV mission report, MSC-G-R-65-3, 3.1.2.9.2), and so it is built as the G3C's
garment ([g3c_suit.py](g3c_suit.py), [g3c-suit.md](g3c-suit.md)) given what is seen to differ
(`Garment`): every size and place not named below is the G3C's, and as estimated as it is there.

The figures stand on the deck at Complex 19, each a man the launch site is walked as; none is built
seated, so the flights' seats are empty. A flight names its own men (`Wearer`) here and builds each
with `g3c_suit.build` from its `model/crew.py` and `model/pilot.py`; what is said of their parts in the
viewer is [g4c-suit.parts.ts](g4c-suit.parts.ts).

**Confidence**: *documented* is a published figure or statement; *derived* is computed from
documented ones; *estimated* was read off photographs, or chosen to look right.

## Sources, in short

- **GIV**: the Gemini IV mission report, 3.1.2.9.2 (the suits) and 5.1.10.3 (how they did).
- **K4**: NASA release 65-158, the Gemini 4 press kit: "Gemini Space Suit" (pp. 81 and 82) and the
  crew biographies (pp. 83 to 86).
- **GV**, **K5**: the Gemini V mission report, MSC-G-R-65-4, 3.1.2.9.2; NASA release 65-262, the
  Gemini 5 press kit, "Gemini 5 Suit" (pp. 33 to 35) and the crew biographies (pp. 79 and 81).
- **K7**: NASA release 65-362, the Gemini 7/6 press kit: "Gemini 6 Suit" (p. 48), "identical to that worn
  by the Gemini 5 crew", and the crew biographies (pp. 71 and 72).
- **GVIII**, **GIX**: the Gemini VIII and IX-A mission reports, MSC-G-R-66-4 and -6, 3.1.2.12.2; **K9**: NASA
  release 66-97, the Gemini 9 press kit, "Gemini 9 Suits" (pp. 24 to 26).
- **P**: NASA's photographs of 3 June 1965: S65-29643 (McDivitt in the suiting trailer, helmet on),
  S65-29645 (White being suited); S65-27487 (the two on the ramp at pad 19, undated in its caption:
  neither man has a flag on his sleeve, so it is taken for a rehearsal and used only for the tags).

## What differs from the G3C

| Item | In the model | Confidence | Source |
| --- | --- | --- | --- |
| The suit | "Redundant entrance closures": a pressure-sealing zip outside the old one | documented; not built (it is under the cloth) | GIV, 3.1.2.9.2 |
| The helmet | "modified to accommodate a thicker pressure-sealing visor, and to accept the extravehicular overvisor" | documented; the visor's thickness is not built, and the visor's arm is a little thinner than the G3C's so that it clears its pivot | GIV, 3.1.2.9.2 |
| Neck ring | bare aluminium, polished | documented by photograph | P: S65-29643, S65-29645 (the G3C's was anodised blue) |
| Flag | the fifty-star flag, 8.9 by 5.1 cm, high on the left upper arm above the pocket, its canton forward | documented by photograph; size and place estimated | P: S65-29643. The picture is the capsules' (vehicles/mercury_capsule.py `flag_image`) |
| The command pilot's cover | "A single layer cover layer for anti-snag protection" | documented; one layer of cloth, not let out | GIV, 3.1.2.9.2 |
| Gemini 9A's pilot's legs | "the second [cover layer] for the leg section beginning at the groin line" against the manoeuvring unit's exhaust, of Chromel-R, "a cloth woven from stainless steel fibers"; on him at the pad | documented (K9; GIX; NASA S66-31019, S66-32149); built as the trousers in a dull steel grey (`Garment.legs`) | GIX, 3.1.2.12.2; K9, pp. 24 to 26 |
| The pilot's cover, for going outside | "A cover layer for thermal and micrometeoroid protection", "an integral part of the suit", white, "a cover layer of high temperature nylon and layers of aluminized mylar and felt", about 3 3/4 lb | documented; how far it let the suit out (0.5 cm over the trunk, 0.4 over the limbs) estimated | GIV, 3.1.2.9.2; K4, p. 81 |

## The men

| | Stature in the model | Confidence | Source | Standing, in helmet and boots |
| --- | --- | --- | --- | --- |
| James A. McDivitt, command pilot, Gemini 4 | 180.3 cm, "5 ft. 11 in."; 155 lb | documented | K4, p. 83 | 1.851 m |
| Edward H. White II, pilot, Gemini 4 | 182.9 cm, "6 ft."; 171 lb | documented | K4, p. 84 | 1.874 m |
| L. Gordon Cooper Jr., command pilot, Gemini 5 | 172.7 cm, "5 ft., 8 in."; 155 lb | documented | K5, p. 79 | 1.785 m |
| Charles Conrad Jr., pilot, Gemini 5 | 167.6 cm, "5 ft., 6 In."; 142 lb | documented | K5, p. 81 | 1.740 m |
| Walter M. Schirra Jr., command pilot, Gemini 6A | 177.8 cm, "5 feet, 10 inches"; 170 lb | documented | K7, p. 71 | 1.829 m |
| Thomas P. Stafford, pilot, Gemini 6A; command pilot, Gemini 9A | 182.9 cm, "6 feet"; 175 lb | documented | K7, p. 72 | 1.874 m |
| Neil A. Armstrong, command pilot, Gemini 8 | 179.1 cm, "5 ft., 10 1/2 in."; 168 lb | documented, in August 1965 | K5, p. 83 (his biography as a backup pilot) | 1.841 m |
| David R. Scott, pilot, Gemini 8 | 182.9 cm, 6 ft | **estimated**: as commonly given; not in any NASA source read (the Gemini 8 press kit's biography has none) | | 1.874 m |
| Eugene A. Cernan, pilot, Gemini 9A | 182.9 cm, 6 ft | **estimated**: as commonly given; not in any NASA source read (the Gemini 9 press kit's biography has none) | | 1.874 m |

Their tags are lettered as the photographs read them: "J.A.McDIVITT" (S65-27487), "E.H.WHITE II"
(S65-29645), "L.G.COOPER" and "C.CONRAD JR" (S65-28740). Gemini 5's suits were "of the same configuration as
those used on the Gemini IV mission except that the overvisor and special cover layer used for extravehicular
activity were not included" (GV, 3.1.2.9.2): `G4C`. Conrad, the shortest man here, stands with his cloth let out
2 mm more than the others (`Wearer.stand`): at the coarsest level his boots' tops lay within a millimetre of his
trousers. Their build beside figurelib's man is estimated. The faces are the shared head,
nobody's likeness.

## What the model gets wrong or leaves out

Everything [g3c-suit.md](g3c-suit.md) lists of the G3C's garment, and:

- **What the pilot took outside is not built**: the overvisor, a second visor over the first with
  a tinted one over that (K4, p. 81; "used only by the pilot during extravehicular operation",
  GIV), and the thermal overgloves. Where they rode at liftoff is not said.
- **The second zip and the thicker visor** are not seen from outside and not built.
- **The cover layer is a thickness, not a garment**: no seams, no sleeves to take off (White took
  its sleeves off in orbit: GIV, 5.1.10.3.2).
- **What each man carried to the pad is not built**: the portable ventilator in one hand, its two
  hoses to the suit, and the yellow overshoes (GIV, 7.2.1.7: they went on portable ventilators "from
  the pilot-ready room to the launch complex").
- **The covers of Gemini 8's and 9A's pilots** are White's, a thickness: Scott's "revised material lay-up"
  and Cernan's seven layers of superinsulation are not told apart. Cernan's legs are coloured, not thickened
  further.
- **The flights' emblems** from Gemini 6A on (under the NASA insignia, in NASA S65-61916)
  are not built.
- **Gemini 5's emblem** was approved (*On the Shoulders of Titans*, p. 256), but where it was worn on the
  suits is not in what was read, and S65-28740 does not show it: not built. Nor is the small white label
  lettered in red under Cooper's name tag in the same photograph.
- **Not built seated.** The seats of the flights from Gemini 4 on are empty: seating a man is
  fitting the cabin round him (g3c-suit.md, "Seated"), not done for these men.
