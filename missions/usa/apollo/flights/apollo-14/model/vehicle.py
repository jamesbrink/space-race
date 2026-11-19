"""CSM-110 and LM-8 on SA-509, Apollo 14: the gallery exhibit, cut open to the cabin and the stages. pnpm model apollo-14 --preview DIR."""

import os
import sys

_root = os.path.dirname(os.path.abspath(__file__))
while not os.path.isdir(os.path.join(_root, "tools", "blender")):
    _root = os.path.dirname(_root)
sys.path.insert(0, os.path.join(_root, "tools", "blender"))
sys.path.insert(0, os.path.join(_root, "missions", "usa", "apollo", "vehicles"))
import lunar_stack  # noqa: E402
import saturn_v  # noqa: E402
from srlib import IN, run  # noqa: E402


def build():
    lunar_stack.build(serial=509, csm=110, lm=8, adapter="17")
    return "Apollo 14, SA-509: 363 ft nominal height to the Q-ball"


run(
    "Apollo 14 CSM-110 and LM-8 and SA-509",
    build,
    [
        ("apollo-14-stack.png", (0, 0, 55), 220, dict(azimuth=30, elevation=4, res=(1000, 1600), lens=55)),
        (
            "apollo-14-pogo.png",
            (17 * IN / 2**0.5, -17 * IN / 2**0.5, saturn_v.station(1664 + 42) * IN),
            4.35,
            dict(azimuth=28, elevation=18, res=(900, 780), lens=50, only=("SII9_Accumulator", "SII9_Oxygen")),
        ),
        (
            "apollo-14-impact-radio.png",
            "IU509_EquipmentMount",
            1.95,
            dict(
                azimuth=156,
                elevation=14,
                res=(1000, 800),
                lens=55,
                only=("IU509_Battery", "IU509_ColdPlate", "IU509_Transponder", "IU509_Power", "IU509_Coaxial"),
            ),
        ),
        (
            "apollo-14-csm.png",
            (0, 0, (saturn_v.CSM_OFFSET + 205) * IN),
            24,
            dict(azimuth=25, elevation=15, res=(1200, 1200), lens=55, only=("CM", "SM_", "SPS_", "RCS_", "HGA_")),
        ),
    ],
)
