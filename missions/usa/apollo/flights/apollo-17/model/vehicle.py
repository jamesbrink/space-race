"""America and Challenger on SA-512. pnpm model apollo-17 --preview DIR."""

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
    lunar_stack.build(serial=512, csm=114, lm=12, adapter="21")
    return "Apollo 17, SA-512: 363 ft nominal height to the Q-ball"


run(
    "Apollo 17 CSM-114 and LM-12 and SA-512",
    build,
    [
        ("apollo-17-stack.png", (0, 0, 55), 220, dict(azimuth=30, elevation=4, res=(1000, 1600), lens=55)),
        (
            "apollo-17-retros.png",
            saturn_v.radial(210, math.radians(45), saturn_v.station(135)),
            4.4,
            dict(azimuth=58, elevation=12, res=(900, 900), lens=52, only=("SIC12_RetroB",)),
        ),
        (
            "apollo-17-sim-bay.png",
            saturn_v.radial(62, math.radians(40), saturn_v.CSM_OFFSET + 194),
            8,
            dict(azimuth=40, elevation=5, res=(1000, 1000), lens=48, only=("SM114_", "SM110_OxygenThree"), hide=("SM114_SIMJettisonPanel",)),
        ),
        (
            "apollo-17-aps.png",
            saturn_v.radial(138, math.pi / 2, saturn_v.TAPER_TOP + 48),
            3.8,
            dict(azimuth=103, elevation=10, res=(960, 920), lens=52, only=("SIVB512_APS1_",), hide=("SIVB512_APS1_Fairing",)),
        ),
        (
            "apollo-17-sounder.png",
            saturn_v.radial(62, math.radians(40), saturn_v.CSM_OFFSET + 162),
            3.4,
            dict(azimuth=40, elevation=5, res=(1000, 820), lens=48, only=("SM114_CSAR", "SM114_Recorder", "SM114_UV", "SM114_IR")),
        ),
        (
            "apollo-17-csm.png",
            (0, 0, (saturn_v.CSM_OFFSET + 205) * IN),
            24,
            dict(azimuth=25, elevation=15, res=(1000, 1000), lens=55, only=("CM", "SM", "SPS_", "RCS_", "HGA_")),
        ),
    ],
)
