"""Antares in lunar landing configuration, before touchdown. Same builder as the launch stack."""

import os
import sys

_root = os.path.dirname(os.path.abspath(__file__))
while not os.path.isdir(os.path.join(_root, "tools", "blender")):
    _root = os.path.dirname(_root)
sys.path.insert(0, os.path.join(_root, "tools", "blender"))
sys.path.insert(0, os.path.join(_root, "missions", "usa", "apollo", "vehicles"))
import lunar_module  # noqa: E402
from srlib import run  # noqa: E402


def build():
    lunar_module.build(deployed=True, spacecraft=8)
    return "31 ft deployed span over four footpads; 23 ft 1 in from pad plane to S-band antenna"


run(
    "Apollo 14 · Antares LM-8",
    build,
    [
        ("antares.png", (0, 0, 2.7), 19, dict(azimuth=325, elevation=12, res=(960, 1000), lens=56)),
        (
            "antares-met.png",
            (1.61, -1.61, 2.34),
            2.75,
            dict(
                azimuth=303,
                elevation=9,
                res=(860, 900),
                lens=58,
                only=("LM8_METTubular", "LM8_METFolded", "LM8_METLoad", "LM8_METPneumatic", "LM8_METWheel"),
            ),
        ),
        (
            "antares-science.png",
            (-1.54, 1.54, 2.30),
            3.6,
            dict(
                azimuth=136,
                elevation=13,
                res=(930, 800),
                lens=56,
                only=(
                    "LM8_Central",
                    "LM8_Passive",
                    "LM8_Charged",
                    "LM8_Active",
                    "LM8_Cold",
                    "LM8_Ion",
                    "LM8_RTG",
                    "LM8_Generator",
                    "LM8_FoldedHand",
                    "LM8_SEQFrame",
                ),
            ),
        ),
    ],
)
