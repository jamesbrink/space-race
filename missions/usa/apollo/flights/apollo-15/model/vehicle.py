"""Endeavour and Falcon on SA-510. pnpm model apollo-15 --preview DIR."""

import math
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
    lunar_stack.build(serial=510, csm=112, lm=10, adapter="19")
    return "Apollo 15, SA-510: 363 ft nominal height to the Q-ball"


run(
    "Apollo 15 CSM-112 and LM-10 and SA-510",
    build,
    [
        ("apollo-15-stack.png", (0, 0, 55), 220, dict(azimuth=30, elevation=4, res=(1000, 1600), lens=55)),
        (
            "apollo-15-retros.png",
            saturn_v.radial(210, math.radians(-45), saturn_v.station(135)),
            4.4,
            dict(azimuth=-34, elevation=12, res=(900, 900), lens=52, only=("SIC10_RetroA",)),
        ),
        (
            "apollo-15-sim-bay.png",
            saturn_v.radial(62, math.radians(40), saturn_v.CSM_OFFSET + 194),
            8,
            dict(azimuth=40, elevation=5, res=(1000, 1000), lens=48, only=("SM112_", "SM110_OxygenThree"), hide=("SM112_SIMJettisonPanel",)),
        ),
        (
            "apollo-15-csm.png",
            (0, 0, (saturn_v.CSM_OFFSET + 205) * IN),
            24,
            dict(azimuth=25, elevation=15, res=(1000, 1000), lens=55, only=("CM", "SM", "SPS_", "RCS_", "HGA_")),
        ),
    ],
)
