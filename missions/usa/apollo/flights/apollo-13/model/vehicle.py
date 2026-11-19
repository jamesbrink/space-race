"""CSM-109 and LM-7 on SA-508, Apollo 13: the gallery exhibit, cut open to the cabin and the stages. pnpm model apollo-13 --preview DIR."""

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
    lunar_stack.build(serial=508, csm=109, lm=7, adapter="16")
    return "Apollo 13, SA-508: 363 ft nominal height to the Q-ball"


run(
    "Apollo 13 CSM-109 and LM-7 and SA-508",
    build,
    [
        ("apollo-13-stack.png", (0, 0, 55), 220, dict(azimuth=30, elevation=4, res=(1000, 1600), lens=55)),
        (
            "apollo-13-impact-radio.png",
            "IU508_EquipmentMount",
            1.95,
            dict(
                azimuth=156,
                elevation=14,
                res=(1000, 800),
                lens=55,
                only=("IU508_Battery", "IU508_ColdPlate", "IU508_Transponder", "IU508_Power", "IU508_Coaxial"),
            ),
        ),
        (
            "apollo-13-csm.png",
            (0, 0, (saturn_v.CSM_OFFSET + 205) * IN),
            24,
            dict(azimuth=25, elevation=15, res=(1200, 1200), lens=55, only=("CM", "SM_", "SPS_", "RCS_", "HGA_")),
        ),
    ],
)
