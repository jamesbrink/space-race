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

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from g3c_suit import Garment, Wearer, build  # noqa: E402

__all__ = ["G4C", "G4C_OUTSIDE", "MCDIVITT", "WHITE", "build"]

# Bare aluminium at the neck, where the G3C's ring was anodised blue: NASA S65-29643 (McDivitt) and S65-29645 (White),
# both in the suiting trailer on 3 June 1965. The flag on the left upper arm: S65-29643. Estimated in size and place.
# The visor's arm is thinner than the G3C's under its pivot's boss: on a taller man's helmet the two lay within a millimetre.
G4C = Garment(name="G4C", ring="bright", flag=True, visor_arm=(0.32, 0.3))
# The pilot's, for going outside: "A cover layer for thermal and micrometeoroid protection" (GIV, 3.1.2.9.2), "a cover
# layer of high temperature nylon and layers of aluminized mylar and felt", white, 3 3/4 lb (NASA release 65-158, the
# Gemini 4 press kit, p. 81). How much it let the suit out is not given: half a centimetre over the trunk, a little less
# over the limbs, estimated from his look beside the command pilot in S65-29645 and S65-29643.
G4C_OUTSIDE = Garment(name="G4C, with the cover for going outside", ring="bright", flag=True, cover=(0.5, 0.4, 0.4), visor_arm=(0.32, 0.3))

# Statures: the press kit's crew biographies (release 65-158, pp. 83 and 84), documented: McDivitt "5 ft. 11 in.",
# White "6 ft.". Names as lettered on the tags: "J.A.McDIVITT" (NASA S65-27487), "E.H.WHITE II" (S65-29645). The
# command pilot's single cover layer "for anti-snag protection" (GIV, 3.1.2.9.2) is one layer of cloth and is not let out.
MCDIVITT = Wearer("J.A.McDIVITT", 180.3, 0.99, 1.0, garment=G4C)
WHITE = Wearer("E.H.WHITE II", 182.9, 1.0, 1.0, garment=G4C_OUTSIDE)
