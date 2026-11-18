"""The G4C pressure suit, as the crews from Gemini-Titan 4 (3 June 1965) on wore it to the pad. See ./g4c-suit.md.

The G4C "is similar to that of the G3C suit used on the previous flight" (the Gemini IV mission report, MSC-G-R-65-3,
3.1.2.9.2): a second, pressure-sealing zip outside the first, a thicker visor that could take an overvisor, and for a man
going outside a cover layer against heat and meteoroids. So it is the G3C's garment (./g3c_suit.py) given what the
photographs of the day show to differ and what a cover adds: the neck ring bare metal where the G3C's was blue, the
flag on the left upper arm, and for the pilot who went outside the cloth let out over the cover's layers. What is not
seen from outside (the second zip, the visor's thickness) is not built. Each man is a `g3c_suit.Wearer` naming this
garment, and a flight's model/crew.py builds him with `g3c_suit.build`.
"""

from __future__ import annotations

import os
import sys
from dataclasses import replace

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from g3c_suit import YOUNG, Garment, Wearer, build  # noqa: E402

__all__ = ["ARMSTRONG", "CERNAN", "CONRAD", "COOPER", "G4C", "G4C_AMU", "G4C_OUTSIDE", "MCDIVITT", "SCHIRRA", "SCOTT", "STAFFORD", "WHITE", "build"]

# Bare aluminium at the neck, where the G3C's ring was anodised blue: NASA S65-29643 (McDivitt) and S65-29645 (White),
# both in the suiting trailer on 3 June 1965. The flag on the left upper arm: S65-29643. Estimated in size and place.
# The visor's arm is thinner than the G3C's under its pivot's boss: on a taller man's helmet the two lay within a millimetre.
G4C = Garment(name="G4C", lap_clearance=1.6, ring="bright", flag=True, visor_arm=(0.32, 0.3))
# The pilot's, for going outside: "A cover layer for thermal and micrometeoroid protection" (GIV, 3.1.2.9.2), "a cover
# layer of high temperature nylon and layers of aluminized mylar and felt", white, 3 3/4 lb (NASA release 65-158, the
# Gemini 4 press kit, p. 81). How much it let the suit out is not given: half a centimetre over the trunk, a little less
# over the limbs, estimated from his look beside the command pilot in S65-29645 and S65-29643.
G4C_OUTSIDE = Garment(
    name="G4C, with the cover for going outside", lap_clearance=1.6, ring="bright", flag=True, cover=(0.5, 0.4, 0.4), visor_arm=(0.32, 0.3)
)

# Statures: the press kit's crew biographies (release 65-158, pp. 83 and 84), documented: McDivitt "5 ft. 11 in.",
# White "6 ft.". Names as lettered on the tags: "J.A.McDIVITT" (NASA S65-27487), "E.H.WHITE II" (S65-29645). The
# command pilot's single cover layer "for anti-snag protection" (GIV, 3.1.2.9.2) is one layer of cloth and is not let out.
MCDIVITT = Wearer("J.A.McDIVITT", 180.3, 0.99, 1.0, left=YOUNG.left, right=YOUNG.right, seated=YOUNG.seated, garment=G4C)
WHITE = Wearer("E.H.WHITE II", 182.9, 1.0, 1.0, left=YOUNG.left, right=YOUNG.right, seated=YOUNG.seated, garment=G4C_OUTSIDE)

# Gemini 5: "the same configuration as those used on the Gemini IV mission except that the overvisor and special cover layer
# used for extravehicular activity were not included" (the Gemini V mission report, MSC-G-R-65-4, 3.1.2.9.2). Statures:
# the Gemini 5 press kit's crew biographies (NASA release 65-262, pp. 79 and 81), documented: Cooper "5 ft., 8 in.",
# Conrad "5 ft., 6 in.". Tags as NASA S65-28740 reads them, the two leaving the suiting trailer on 21 August 1965.
COOPER = Wearer(
    "L.G.COOPER",
    172.7,
    0.99,
    1.0,
    left=(0.0, 0.5, 103.0, 38.0, 52.0, 0.15),
    right=(0.5, 11.0, 106.0, 40.0, 52.0, 0.15),
    seated=YOUNG.seated,
    garment=G4C,
)
CONRAD = Wearer("C.CONRAD JR", 167.6, 0.98, 1.0, left=YOUNG.left, right=YOUNG.right, seated=YOUNG.seated, garment=G4C, stand=0.32)

# Gemini 6A: "identical to that worn by the Gemini 5 crew. It is not suitable for extravehicular activity" (NASA release
# 65-362, the Gemini 7/6 press kit, p. 48): the G4C. Statures: the same kit's crew biographies (pp. 71 and 72),
# documented: Schirra "5 feet, 10 inches", Stafford "6 feet". Tags as NASA S65-61916 reads Schirra's; Stafford's is
# taken to be lettered as the others' are.
SCHIRRA = Wearer("W.M.SCHIRRA", 177.8, 1.0, 1.02, garment=G4C)
STAFFORD = Wearer("T.P.STAFFORD", 182.9, 1.01, 1.02, garment=G4C)

# Gemini 8: "The intravehicular suit worn by the command pilot utilized the basic G4C pressure-garment assembly with a
# single-layer, lightweight cover layer. The extravehicular suit worn by the pilot" had a cover for going outside (the
# Gemini VIII mission report, MSC-G-R-66-4, 3.1.2.12.2): G4C and G4C_OUTSIDE. Armstrong's stature is the Gemini 5 press
# kit's, in his biography as a backup pilot (NASA release 65-262, p. 83): "5 ft., 10 1/2 in.", documented. Scott's has
# not been found in any NASA source read: 6 ft, as commonly given, estimated. Tags: "N.A.ARMSTRONG" and "D.R.SCOTT", as
# the others' are lettered (NASA KSC-66C-1851 shows the two at the trailer's door, the tags not legible).
ARMSTRONG = Wearer("N.A.ARMSTRONG", 179.1, 1.0, 1.0, garment=G4C)
SCOTT = Wearer("D.R.SCOTT", 182.9, 1.0, 1.0, garment=G4C_OUTSIDE)

# Gemini 9A: the command pilot's "basically the same as that used on the Gemini VIII mission - a G4C suit with a light
# coverlayer"; the pilot's "included an extravehicular coverlayer ... modified to provide protection to the legs from the
# high-temperature, high-velocity plume impingement" of the manoeuvring unit's thrusters (the Gemini IX-A mission report,
# MSC-G-R-66-6, 3.1.2.12.2): "the second for the leg section beginning at the groin line" (NASA release 66-97, the
# Gemini 9 press kit, pp. 24 to 26), of Chromel-R, a cloth of stainless steel (NASA S66-31019), and on him at the pad
# (S66-32149). Stafford is Gemini 6A's man (above). Cernan's stature has not been found in any NASA source read: 6 ft,
# as commonly given, estimated.
G4C_AMU = Garment(
    name="G4C-32, with the cover for going outside and its legs of Chromel-R",
    ring="bright",
    flag=True,
    cover=(0.5, 0.4, 0.5),
    visor_arm=(0.32, 0.3),
    legs="chromel",
)
CERNAN = Wearer("E.A.CERNAN", 182.9, 1.0, 1.0, garment=G4C_AMU)


# Late Gemini: Young wore the lightweight G4C and Collins wore the EVA cover from Gemini VIII (Gemini X mission report,
# MSC-G-R-66-7, 3.1.2.12.2). The Gemini XI and XII EVA suits were essentially Gemini X's (NASA TN D-6069, "Space Suits").
# Young, Collins, Gordon and Aldrin use their Apollo press kit statures (p. 69 in Apollo 10, pp. 140 and 142 in
# Apollo 11, p. 77 in Apollo 12). Conrad uses his Gemini 5 stature and Lovell his Gemini 7 stature.
YOUNG_10 = Wearer("J.W. YOUNG", 175.3, 0.99, 1.0, garment=G4C, mission_patch=("gt-10", 10.0))
COLLINS = Wearer("M. COLLINS", 180.3, 1.0, 1.0, garment=G4C_OUTSIDE, mission_patch=("gt-10", 10.0))
CONRAD_11 = replace(CONRAD, mission_patch=("gt-11", 7.6))
GORDON = Wearer("R.F. GORDON JR", 170.2, 0.99, 1.0, garment=G4C_OUTSIDE, mission_patch=("gt-11", 7.6), cable_clearance=1.3, stand=0.32)
LOVELL = Wearer("J.A. LOVELL JR", 182.9, 1.0, 1.0, garment=G4C, mission_patch=("gt-12", 8.9), walkout_sign="THE")
ALDRIN = Wearer("E.E. ALDRIN JR", 177.8, 1.0, 1.0, garment=G4C_OUTSIDE, mission_patch=("gt-12", 8.9), walkout_sign="END")
