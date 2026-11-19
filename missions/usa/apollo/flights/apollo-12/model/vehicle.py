"""CSM-108 and LM-6 on SA-507, Apollo 12: the gallery exhibit, cut open to the cabin and the stages. pnpm model apollo-12 --preview DIR."""

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
    lunar_stack.build(serial=507, csm=108, lm=6, adapter="15")
    return "Apollo 12, SA-507: 363 ft nominal height to the Q-ball"


run(
    "Apollo 12 CSM-108 and LM-6 and SA-507",
    build,
    [
        ("apollo-12-stack.png", (0, 0, 55), 220, dict(azimuth=30, elevation=4, res=(1000, 1600), lens=55)),
        (
            "apollo-12-csm.png",
            (0, 0, (saturn_v.CSM_OFFSET + 205) * IN),
            24,
            dict(azimuth=25, elevation=15, res=(1200, 1200), lens=55, only=("CM", "SM_", "SPS_", "RCS_", "HGA_")),
        ),
    ],
)
