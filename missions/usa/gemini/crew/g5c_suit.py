"""The G5C pressure suit, as Frank Borman and James Lovell wore it to the pad for Gemini-Titan 7 (4 December 1965). See
./g5c-suit.md.

"A G5C lightweight pressure suit was developed by the NASA Manned Spacecraft Center for the Gemini VII mission ... It was
made using G4C pressure-suit materials and technology, except that the restraint layer and inner liner were eliminated.
The helmet was soft with an integral visor and no neck ring. When not required, the pressure helmet was unzipped at the
neck and folded up behind the head. An aircraft-type crash helmet was worn inside" (the Gemini VII mission report,
MSC-G-R-66-1, 3.1.2.9.2). So it is the G3C's garment (./g3c_suit.py) with its helmet made a hood: the same form, of the
suit's cloth, its visor sewn in, no pivots and no band, a zip round the neck in place of the ring, and no tie-down on
the chest; the flag on the left sleeve, and the NASA insignia under the name tag on the right breast, where the
photographs of the day have them. The hood went to the pad zipped on, and stayed on through the launch.
"""

from __future__ import annotations

import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from g3c_suit import Garment, Wearer, build  # noqa: E402

__all__ = ["BORMAN", "G5C", "LOVELL", "build"]

# The hood, its visor wider and deeper than the helmet's (S65-60981: brow to chin, most of the front), the flag (NASA
# S65-59932, the two leaving the suiting trailer on 4 December 1965) and the insignia under the name tag on his right
# breast (S65-60981, Lovell on the ramp): documented by photograph, placed by eye. The suit without its restraint layer
# and liner is let out no further than the G4C's.
G5C = Garment(name="G5C", ring="bright", flag=True, hood=True, insignia=(17.6, -21.0), visor=(math.radians(80), 12.6, 10.4))

# Statures: the Gemini 7/6 press kit's crew biographies (NASA release 65-362, pp. 66 and 67), documented: Borman
# "5 feet, 10 inches", Lovell "6 feet". Tags as the photographs read them: "...OVELL JR" (S65-60981); Borman's is taken
# to be lettered as the others' are.
BORMAN = Wearer("F.BORMAN", 177.8, 1.0, 1.0, garment=G5C)
LOVELL = Wearer("J.A.LOVELL JR", 182.9, 0.99, 1.0, garment=G5C)
