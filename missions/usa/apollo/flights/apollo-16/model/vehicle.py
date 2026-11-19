"""Casper and Orion on SA-511. pnpm model apollo-16 --preview DIR."""

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
    lunar_stack.build(serial=511, csm=113, lm=11, adapter="20")
    return "Apollo 16, SA-511: 363 ft nominal height to the Q-ball"


run(
    "Apollo 16 CSM-113 and LM-11 and SA-511",
    build,
    [
        ("apollo-16-stack.png", (0, 0, 55), 220, dict(azimuth=30, elevation=4, res=(1000, 1600), lens=55)),
        (
            "apollo-16-retros.png",
            saturn_v.radial(210, math.radians(45), saturn_v.station(135)),
            4.4,
            dict(azimuth=58, elevation=12, res=(900, 900), lens=52, only=("SIC11_RetroB",)),
        ),
        (
            "apollo-16-sim-bay.png",
            saturn_v.radial(62, math.radians(40), saturn_v.CSM_OFFSET + 194),
            8,
            dict(azimuth=40, elevation=5, res=(1000, 1000), lens=48, only=("SM113_", "SM110_OxygenThree"), hide=("SM113_SIMJettisonPanel",)),
        ),
        (
            "apollo-16-aps.png",
            saturn_v.radial(138, math.pi / 2, saturn_v.TAPER_TOP + 48),
            3.8,
            dict(azimuth=103, elevation=10, res=(960, 920), lens=52, only=("SIVB511_APS1_",), hide=("SIVB511_APS1_Fairing",)),
        ),
        (
            "apollo-16-yaw-actuator.png",
            (0, 14 * IN, (saturn_v.CSM_OFFSET + 139) * IN),
            0.87,
            dict(azimuth=236, elevation=18, res=(900, 900), lens=52, only=("SM113_Yaw",)),
        ),
        (
            "apollo-16-csm.png",
            (0, 0, (saturn_v.CSM_OFFSET + 205) * IN),
            24,
            dict(azimuth=25, elevation=15, res=(1000, 1000), lens=55, only=("CM", "SM", "SPS_", "RCS_", "HGA_")),
        ),
    ],
)
